const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { ActivityMonitor } = require('./activity.cjs');
const { DesktopBridge } = require('./desktop.cjs');

const PETS = [
  ['codex', 'Codex'], ['dewey', 'Dewey'], ['fireball', 'Fireball'],
  ['hoots', 'Hoots'], ['bsod', 'BSOD'], ['null-signal', 'Null Signal'],
  ['rocky', 'Rocky'], ['seedy', 'Seedy'], ['stacky', 'Stacky']
];
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function activate(context) {
  const views = new Set();
  const readyViews = new Set();
  let selected = context.globalState.get('pet', 'codex');
  let sleeping = context.globalState.get('sleeping', false);
  let selectedAt = context.globalState.get('petSelectedAt', 0);
  let sleepAt = context.globalState.get('petSleepAt', 0);
  let desktop;
  let activity = { status: 'idle', active: 0 };
  const codex = vscode.extensions.getExtension('openai.chatgpt');
  const assetDir = codex && path.join(codex.extensionPath, 'webview', 'assets');
  const available = await fs.readdir(assetDir || '').catch(() => []);
  const pets = PETS.flatMap(([id, name]) => {
    const file = available.find(f => f.startsWith(`${id}-spritesheet-`) && f.endsWith('.webp'));
    return file ? [{ id, name, file: path.join(assetDir, file) }] : [];
  });
  if (!pets.some(p => p.id === selected)) selected = pets[0]?.id || 'codex';
  function send(view) {
    void view.webview.postMessage({ type: 'state', selected, sleeping, activity });
  }
  function broadcast() { for (const view of views) send(view); if (desktop) void desktop.write().catch(() => {}); }
  async function selectPet(id) {
    selected = id; selectedAt = Date.now();
    await context.globalState.update('pet', selected); await context.globalState.update('petSelectedAt', selectedAt); broadcast();
  }
  async function choose() {
    const pick = await vscode.window.showQuickPick(pets.map(p => ({ label: p.name, id: p.id })), { title: 'Pet seç', placeHolder: 'Codex arkadaşını seç' });
    if (pick) await selectPet(pick.id);
  }
  const provider = {
    async resolveWebviewView(view) {
      views.add(view);
      view.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media'), ...(assetDir ? [vscode.Uri.file(assetDir)] : [])]
      };
      view.onDidDispose(() => { views.delete(view); readyViews.delete(view); }, null, context.subscriptions);
      view.webview.onDidReceiveMessage(async message => {
        if (message?.type === 'ready') { readyViews.add(view); send(view); }
        if (message?.type === 'choose' && pets.some(p => p.id === message.id)) {
          await selectPet(message.id);
        }
        if (message?.type === 'sleep') {
          sleeping = !sleeping; sleepAt = Date.now();
          await context.globalState.update('sleeping', sleeping); await context.globalState.update('petSleepAt', sleepAt); broadcast();
        }
        if (message?.type === 'openCodex') await vscode.commands.executeCommand('chatgpt.openSidebar');
      }, null, context.subscriptions);
      const nonce = crypto.randomBytes(18).toString('base64');
      const uri = name => view.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', name)).toString();
      const data = Buffer.from(JSON.stringify({ pets: pets.map(p => ({ id: p.id, name: p.name, url: view.webview.asWebviewUri(vscode.Uri.file(p.file)).toString() })), selected, sleeping })).toString('base64');
      let html = await fs.readFile(path.join(context.extensionPath, 'media', 'panel.html'), 'utf8');
      const values = { CSP: view.webview.cspSource, NONCE: nonce, STYLE: uri('panel.css'), SCRIPT: uri('panel.js'), DATA: data };
      html = html.replace(/\{\{(CSP|NONCE|STYLE|SCRIPT|DATA)\}\}/g, (_, key) => escape(values[key]));
      view.webview.html = html;
    }
  };
  for (const id of ['codexPet.primary', 'codexPet.secondary']) {
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(id, provider, { webviewOptions: { retainContextWhenHidden: true } }));
  }
  async function open() {
    await vscode.commands.executeCommand('chatgpt.openSidebar');
    const visible = [...views].find(view => view.visible);
    if (visible) visible.show(false);
    else {
      // Secondary sidebar is available on current VS Code; use primary as fallback.
      try { await vscode.commands.executeCommand('codexPet.secondary.focus'); }
      catch { await vscode.commands.executeCommand('codexPet.primary.focus'); }
    }
  }
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.open', open));
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.choose', choose));
  if (process.platform === 'darwin') {
    desktop = new DesktopBridge(path.join(context.globalStorageUri.fsPath, 'desktop'), path.join(context.extensionPath, 'bin', 'codex-desktop-pet'),
      () => ({ protocolVersion: 2, selected, sleeping, selectedAt, sleepAt, activity, pets }),
      error => { void vscode.window.showErrorMessage(`Masaüstü peti açılamadı: ${error.message}`); });
    context.subscriptions.push(desktop);
    if (vscode.workspace.getConfiguration('codexPet').get('desktopEnabled', true)) await desktop.start().catch(error => desktop.reportError(error));
  }
  context.subscriptions.push(vscode.commands.registerCommand('codexPet.showDesktop', async () => {
    if (!desktop) { void vscode.window.showInformationMessage('Masaüstü peti bu sürümde macOS için kullanılabilir.'); return; }
    await desktop.start(true).catch(error => desktop.reportError(error));
  }));
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
  const monitor = new ActivityMonitor(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions'),
    () => vscode.workspace.workspaceFolders?.filter(f => f.uri.scheme === 'file').map(f => f.uri.fsPath) || [],
    next => { if (JSON.stringify(activity) !== JSON.stringify(next)) { activity = next; broadcast(); } });
  monitor.enabled = vscode.workspace.getConfiguration('codexPet').get('followActivity', true);
  monitor.start(); context.subscriptions.push(monitor);
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('codexPet.followActivity')) { monitor.enabled = vscode.workspace.getConfiguration('codexPet').get('followActivity', true); void monitor.tick(); }
  }));
  if (!context.globalState.get('openedOnce', false)) {
    await context.globalState.update('openedOnce', true);
    const timer = setTimeout(() => void open().catch(() => {}), 1200);
    context.subscriptions.push({ dispose: () => clearTimeout(timer) });
  }
  return { availablePets: pets.map(p => p.id), open, getDiagnostics: () => ({ views: views.size, readyViews: readyViews.size, activity }) };
}
module.exports = { activate };
