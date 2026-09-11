const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { AgentActivityMonitor } = require('./agent-activity.cjs');
const { DesktopBridge } = require('./desktop.cjs');

const PETS = [
  ['codex', 'Codex'], ['dewey', 'Dewey'], ['fireball', 'Fireball'],
  ['hoots', 'Hoots'], ['bsod', 'BSOD'], ['null-signal', 'Null Signal'],
  ['rocky', 'Rocky'], ['seedy', 'Seedy'], ['stacky', 'Stacky']
];

async function activate(context) {
  let selected = context.globalState.get('pet', 'codex');
  const sleeping = context.globalState.get('sleeping', false);
  let selectedAt = context.globalState.get('petSelectedAt', 0);
  const sleepAt = context.globalState.get('petSleepAt', 0);
  let desktop;
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
    desktop = new DesktopBridge(path.join(context.globalStorageUri.fsPath, 'desktop'), path.join(context.extensionPath, 'bin', 'codex-desktop-pet'),
      () => ({ protocolVersion: 4, selected, sleeping, selectedAt, sleepAt, activity, pets }),
      error => { void vscode.window.showErrorMessage(`Could not open the desktop pet: ${error.message}`); });
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
    if (desktop) { await fs.mkdir(desktop.directory, { recursive: true }); await fs.writeFile(path.join(desktop.directory, 'desktop-hidden'), ''); }
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
  monitor.start(); context.subscriptions.push(monitor);
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('codexPet.followActivity')) { monitor.enabled = vscode.workspace.getConfiguration('codexPet').get('followActivity', true); void monitor.tick(); }
  }));
  return { availablePets: pets.map(p => p.id), open, getDiagnostics: () => ({ desktopSupported: Boolean(desktop), activity }) };
}
module.exports = { activate };
