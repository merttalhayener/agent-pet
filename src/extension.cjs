const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { AgentActivityMonitor } = require('./agent-activity.cjs');
const { createUpdateReload } = require('./update-reload.cjs');
const { prepareMarketplaceMigration } = require('./marketplace-migration.cjs');
const { createMarketplaceUpdater, installedMarketplaceVersion, installedMarketplacePackage } = require('./marketplace-updater.cjs');
const { DesktopBridge } = require('./desktop.cjs');
const { createClaudeNavigation } = require('./claude-navigation.cjs');

const { describeWorkspace } = require('./workspace.cjs');

const { resolveWindowNavigation } = require('./window-navigation.cjs');

const PETS = [
  ['codex', 'Codex'], ['dewey', 'Dewey'], ['fireball', 'Fireball'],
  ['hoots', 'Hoots'], ['bsod', 'BSOD'], ['null-signal', 'Null Signal'],
  ['rocky', 'Rocky'], ['seedy', 'Seedy'], ['stacky', 'Stacky']
];

async function activate(context) {
  if (!await prepareMarketplaceMigration(vscode, context)) return { migrationRequired: true };
  const extensionId = context.extension.id;
  const updater = createMarketplaceUpdater(vscode, context);
  context.subscriptions.push(updater, vscode.commands.registerCommand('codexPet.checkForUpdates', () => updater.check(true)));
  updater.start();
  let selected = context.globalState.get('pet', 'codex');
  const sleeping = context.globalState.get('sleeping', false);
  let selectedAt = context.globalState.get('petSelectedAt', 0);
  const sleepAt = context.globalState.get('petSleepAt', 0);
  let desktop;
  const navigationLinks = await resolveWindowNavigation(vscode, extensionId).catch(() => undefined);
  let activity = { status: 'idle', active: 0 };
  const codex = vscode.extensions.getExtension('openai.chatgpt');
  const assetDir = codex && path.join(codex.extensionPath, 'webview', 'assets');
  const available = await fs.readdir(assetDir || '').catch(() => []);
  const pets = [{ id: 'agent-pet', name: 'Agent Pet', file: '' }, ...PETS.flatMap(([id, name]) => {
    const file = available.find(f => f.startsWith(`${id}-spritesheet-`) && f.endsWith('.webp'));
    return file ? [{ id, name, file: path.join(assetDir, file) }] : [];
  })];
  if (!pets.some(p => p.id === selected)) { selected = 'agent-pet'; selectedAt = Date.now(); }
  function broadcast() { if (desktop) void desktop.write().catch(() => {}); }
  async function choose() {
    const pick = await vscode.window.showQuickPick(pets.map(p => ({ label: p.name, id: p.id })), { title: 'Choose pet', placeHolder: 'Choose your desktop companion' });
    if (!pick) return;
    selected = pick.id; selectedAt = Date.now();
    await context.globalState.update('pet', selected);
    await context.globalState.update('petSelectedAt', selectedAt);
    broadcast();
  }
  async function open() {
    if (!desktop) { void vscode.window.showInformationMessage('The desktop pet is available on macOS in this release.'); return; }
    await desktop.start(true).catch(error => desktop.reportError(error));
  }
  if (process.platform === 'darwin') {
    desktop = new DesktopBridge(path.join(context.globalStorageUri.fsPath, 'desktop'), path.join(context.extensionPath, 'bin', 'Agent Pet.app', 'Contents', 'MacOS', 'codex-desktop-pet'),
      () => ({ protocolVersion: 9, extensionId, navigation: navigationLinks, workspace: describeWorkspace(vscode.workspace), selected, sleeping, selectedAt, sleepAt, activity, pets }),
      error => { void vscode.window.showErrorMessage(`Could not open the desktop pet: ${error.message}`); }, extensionId, async () => path.join((await installedMarketplacePackage(context)).extensionPath, 'bin', 'Agent Pet.app', 'Contents', 'MacOS', 'codex-desktop-pet'));
    context.subscriptions.push(desktop);
    if (vscode.workspace.getConfiguration('codexPet').get('desktopEnabled', true)) await desktop.start().catch(error => desktop.reportError(error));
  }
  // Keep the original command IDs so existing keybindings continue to work.
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.open', open));
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.showDesktop', open));
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.choose', choose));
  if (desktop) {
    const entry = vscode.window.createStatusBarItem('agentPet.open', vscode.StatusBarAlignment.Right, 10);
    entry.name = 'Agent Pet'; entry.text = '$(smiley) Agent Pet';
    entry.tooltip = 'Open or restore the desktop pet'; entry.command = 'codexPet.showDesktop';
    entry.show(); context.subscriptions.push(entry);
  }
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.hideDesktop', async () => {
    if (desktop) { await fs.mkdir(desktop.directory, { recursive: true }); await fs.writeFile(path.join(desktop.directory, 'desktop-hide-panel-request'), ''); }
  }));
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.togglePresentation', async () => {
    if (!desktop) return;
    await fs.mkdir(desktop.directory, { recursive: true });
    await fs.unlink(path.join(desktop.directory, 'desktop-hidden')).catch(() => {});
    await desktop.start();
    await fs.writeFile(path.join(desktop.directory, 'desktop-presentation-request'), '');
  }));
  const monitor = new AgentActivityMonitor(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions'),
    path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects'),
    () => vscode.workspace.workspaceFolders?.filter(f => f.uri.scheme === 'file').map(f => f.uri.fsPath) || [],
    next => { if (JSON.stringify(activity) !== JSON.stringify(next)) { activity = next; broadcast(); } }, path.join(context.globalStorageUri.fsPath, 'desktop'));
  monitor.enabled = vscode.workspace.getConfiguration('codexPet').get('followActivity', true);
  await monitor.tick(); monitor.start(); context.subscriptions.push(monitor);
  const reload = createUpdateReload(vscode, context, async () => {
    for (let i = 0; monitor.busy && i < 40; i++) await new Promise(resolve => setTimeout(resolve, 50));
    if (monitor.busy || monitor.disposed || monitor.monitors.some(m => !m.enabled || m.busy || m.disposed)) return undefined;
    await monitor.tick();
    return activity;
  }, { getInstalledVersion: () => installedMarketplaceVersion(context) });
  reload.start(); context.subscriptions.push(reload);
  const navigation = createClaudeNavigation(vscode, async id => {
    await monitor.tick();
    const local = activity.threads?.find(thread => thread.id === id);
    if (local) return local;
    // Explicit native workspace assignments may target a window outside the
    // session's original roots. Only accept an assignment to this workspace.
    const routes = JSON.parse(await fs.readFile(path.join(context.globalStorageUri.fsPath, 'desktop', 'workspace-routes.json'), 'utf8').catch(() => '{}'));
    const route = routes[id];
    return route?.workspaceID === describeWorkspace(vscode.workspace).id && typeof route.title === 'string' ? { id, title: route.title, status: 'unknown' } : undefined;
  }, extensionId);
  context.subscriptions.push(vscode.window.registerUriHandler(navigation));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('codexPet.followActivity')) { monitor.enabled = vscode.workspace.getConfiguration('codexPet').get('followActivity', true); void monitor.tick(); }
  }));
  return { availablePets: pets.map(p => p.id), open, getDiagnostics: () => ({ navigation: navigationLinks, workspace: describeWorkspace(vscode.workspace), desktopSupported: Boolean(desktop), activity }) };
}
module.exports = { activate };
