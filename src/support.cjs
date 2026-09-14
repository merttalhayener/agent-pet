const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { installedMarketplacePackage } = require('./marketplace-updater.cjs');
const CLIENT = /^client-\d+-[a-f0-9]+\.json$/;
const TABS = new Set(['setup', 'connections', 'diagnostics']);
const AGENTS = [['openai.chatgpt', 'Codex'], ['anthropic.claude-code', 'Claude Code']];
const recent = (at, now, limit) => Number.isFinite(at) && at <= now + 5000 && now - at < limit;
async function readJSON(file) {
  const stat = await fs.stat(file);
  if (stat.size > 1024 * 1024) throw Object.assign(Error('Oversized state file'), { code: 'STATE_TOO_LARGE' });
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
async function readConnections(directory, now = Date.now()) {
  const names = (await fs.readdir(directory).catch(() => [])).filter(name => CLIENT.test(name)).slice(0, 100);
  const rows = await Promise.all(names.map(async id => {
    try {
      const s = await readJSON(path.join(directory, id));
      if (!recent(s.updatedAt, now, 600000)) return null;
      return { id, name: typeof s.workspace?.name === 'string' ? s.workspace.name.slice(0, 200) : 'No workspace',
        version: typeof s.extensionVersion === 'string' ? s.extensionVersion : 'unknown',
        updatedAt: s.updatedAt, connected: recent(s.updatedAt, now, 15000), focused: s.focused === true,
        tracking: s.activity?.trackingDisabled !== true, chats: Array.isArray(s.activity?.threads) ? s.activity.threads.length : 0 };
    } catch { return null; }
  }));
  return rows.filter(Boolean);
}
function diagnosticReport(state) {
  // Explicit allowlist. Never export transcript text, workspace names/paths,
  // client IDs, process arguments, environment variables or raw error messages.
  return { schema: 1, generatedAt: state.generatedAt, extension: state.extension, system: state.system,
    helper: { status: state.helper.status, version: state.helper.version, notifications: state.helper.notifications },
    agents: state.agents, records: state.records, tracking: state.tracking,
    windows: state.windows.map(w => ({ connected: w.connected, current: w.current, version: w.version, tracking: w.tracking, chats: w.chats })),
    errors: state.errors.map(e => ({ at: e.at, code: e.code })) };
}
function createSupportCenter(vscode, context, desktop, getActivity, open) {
  const directory = path.join(context.globalStorageUri.fsPath, 'desktop');
  let panel, timer, disposed = false, busy = false, currentTab = 'setup', onboarding = false;
  const seen = new Map(), errors = [];
  const record = (error, fallback = 'SUPPORT_ERROR') => {
    // Record a small vocabulary of codes, not exception messages or paths.
    const code = ['ENOENT', 'EACCES', 'EPERM', 'STATE_TOO_LARGE'].includes(error?.code) ? error.code : fallback;
    errors.push({ at: Date.now(), code }); if (errors.length > 20) errors.shift();
  };
  async function collect() {
    const now = Date.now();
    const rows = await readConnections(directory, now);
    for (const row of rows) seen.set(row.id, row);
    for (const [id, row] of seen) { if (!recent(row.updatedAt, now, 600000)) seen.delete(id); }
    const present = new Set(rows.map(r => r.id));
    const windows = [...seen.values()].map(w => ({ ...w, connected: present.has(w.id) && recent(w.updatedAt, now, 15000), current: w.id === desktop?.clientId }));
    let health = null;
    try { health = await readJSON(path.join(directory, 'helper-health.json')); }
    catch (error) { if (error.code !== 'ENOENT') record(error, 'HEALTH_READ_ERROR'); }
    const healthy = health && recent(health.updatedAt, now, 5000);
    const installed = await installedMarketplacePackage(context);
    const runningWithoutHealth = !health && await desktop?.hasRunningHelper?.().catch(() => false);
    const helper = { status: healthy ? 'connected' : health ? 'disconnected' : runningWithoutHealth ? 'unknown' : 'notRunning',
      version: typeof health?.version === 'string' ? health.version : 'unknown',
      notifications: healthy && Number.isInteger(health.notifications) ? health.notifications : -1,
      waitingNotifications: healthy && health.waitingNotifications === true,
      petVisible: healthy && health.petVisible === true, panelVisible: healthy && health.panelVisible === true };
    const agents = AGENTS.map(([id, name]) => { const ext = vscode.extensions.getExtension(id); return { name, installed: Boolean(ext), version: ext?.packageJSON?.version || null }; });
    const roots = [path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions'), path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects')];
    const records = await Promise.all(roots.map(async (root, i) => {
      try { await fs.access(root, fs.constants.R_OK); return { agent: agents[i].name, status: 'readable' }; }
      catch (e) { return { agent: agents[i].name, status: e.code === 'ENOENT' ? 'missing' : 'unreadable' }; }
    }));
    return { generatedAt: now, language: health?.language === 'tr' ? 'tr' : 'en', tab: currentTab,
      completed: context.globalState.get('setupCompleted', false),
      extension: { loaded: context.extension.packageJSON.version, installed: installed.version },
      system: { platform: process.platform, arch: process.arch, release: os.release(), vscode: vscode.version || 'unknown', supported: process.platform === 'darwin' && process.arch === 'arm64' && Number(os.release().split('.')[0]) >= 25 },
      helper, agents, records, tracking: getActivity().trackingDisabled !== true,
      workspaceOpen: Boolean(vscode.workspace.workspaceFolders?.length), publishing: Boolean(desktop?.timer) && !desktop?.removed,
      windows, errors: [...(desktop?.errors || []).map(e => ({ at: e.at, code: ['EACCES','ENOENT','EPERM'].includes(e.code) ? e.code : 'HELPER_ERROR' })), ...errors].slice(-20) };
  }
  async function update() {
    if (!panel || disposed) return;
    const target = panel, state = await collect();
    if (panel === target && !disposed) await target.webview.postMessage({ type: 'state', state });
  }
  async function action(message) {
    if (disposed || !message || typeof message !== 'object') return;
    const op = message.action;
    try {
      if (op === 'ready' || op === 'refresh') return await update();
      if (op === 'tab' && TABS.has(message.tab)) { currentTab = message.tab; return await update(); }
      if (op === 'showPet') await open();
      else if (op === 'choosePet') await vscode.commands.executeCommand('codexPet.choose');
      else if (op === 'notifications' && desktop) { await open(); await fs.writeFile(path.join(directory, 'desktop-notifications-request'), ''); }
      else if (op === 'notificationSettings') await vscode.env.openExternal(vscode.Uri.parse('x-apple.systempreferences:com.apple.Notifications-Settings.extension'));
      else if (op === 'codex' || op === 'claude') await vscode.commands.executeCommand('workbench.extensions.search', '@id:' + AGENTS[op === 'codex' ? 0 : 1][0]);
      else if (op === 'openFolder') await vscode.commands.executeCommand('workbench.action.files.openFolder');
      else if (op === 'settings') await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:' + context.extension.id);
      else if (op === 'updates') await vscode.commands.executeCommand('codexPet.checkForUpdates');
      else if (op === 'complete') await context.globalState.update('setupCompleted', true);
      else if (op === 'copy') {
        await vscode.env.clipboard.writeText(JSON.stringify(diagnosticReport(await collect()), null, 2));
        if (panel) await panel.webview.postMessage({ type: 'copied' });
      }
      else return; // No arbitrary commands, URIs or file paths from webview messages.
      await update();
    } catch (error) { record(error); if (panel) await panel.webview.postMessage({ type: 'actionError' }); }
  }
  async function show(tab = 'setup') {
    if (disposed) return;
    currentTab = TABS.has(tab) ? tab : 'setup';
    if (panel) { panel.reveal(undefined, false); return update(); }
    const created = vscode.window.createWebviewPanel('agentPet.support', 'Agent Pet', vscode.ViewColumn.Active, { enableScripts: true, localResourceRoots: [], retainContextWhenHidden: true });
    panel = created;
    created.onDidDispose(() => { if (panel === created) panel = undefined; });
    const nonce = crypto.randomBytes(18).toString('hex');
    const [template, script] = await Promise.all([fs.readFile(path.join(__dirname, 'support.html'), 'utf8'), fs.readFile(path.join(__dirname, 'support-ui.js'), 'utf8')]);
    if (disposed || panel !== created) return;
    created.webview.onDidReceiveMessage(action, null, context.subscriptions);
    created.webview.html = template.replaceAll('__NONCE__', nonce).replace('__SCRIPT__', script);
  }
  async function poll() {
    if (disposed || busy) return; busy = true;
    try {
      const requestFile = path.join(directory, 'desktop-support-request.json');
      const request = await readJSON(requestFile).catch(() => null);
      if (request && request.clientId === desktop?.clientId && recent(request.createdAt, Date.now(), 15000) && TABS.has(request.tab)) {
        await fs.unlink(requestFile); await show(request.tab);
      }
      if (panel?.visible) await update();
    } catch (error) { record(error); } finally { busy = false; }
  }
  async function welcome() {
    if (disposed || onboarding || vscode.window.state?.focused !== true || context.globalState.get('setupWelcomeSeen', false)) return;
    onboarding = true;
    try {
      // A shared exclusive marker prevents duplicate prompts in multiple windows.
      await fs.mkdir(directory, { recursive: true });
      try { await fs.writeFile(path.join(directory, 'setup-welcome-seen'), '', { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code === 'EEXIST') return; throw error; }
      await context.globalState.update('setupWelcomeSeen', true);
      const health = await readJSON(path.join(directory, 'helper-health.json')).catch(() => null);
      const tr = health?.language === 'tr', start = tr ? 'Başlangıç' : 'Get started';
      const choice = await vscode.window.showInformationMessage(tr ? 'Agent Pet: masaüstü arkadaşını kur ve bağlı pencereleri kontrol et.' : 'Agent Pet: set up your companion and check connected windows.', start, tr ? 'Daha sonra' : 'Later');
      if (choice === start && !disposed) await show('setup');
    } catch (error) { record(error); } finally { onboarding = false; }
  }
  return { show, collect, action, start() {
    timer = setInterval(() => void poll(), 2000); timer.unref?.();
    void welcome();
    if (vscode.window.onDidChangeWindowState) context.subscriptions.push(vscode.window.onDidChangeWindowState(() => void welcome()));
  }, dispose() { disposed = true; clearInterval(timer); panel?.dispose(); panel = undefined; } };
}
module.exports = { createSupportCenter, readConnections, diagnosticReport, recent };
