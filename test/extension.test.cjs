const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const withCodex of [true, false]) test(`Desktop activation and reopening with Codex installed: ${withCodex}`, async () => {
  const commands = new Map(), starts = [], writes = [], state = new Map(), supportTabs = [];
  let uriHandler;
  const entry = { show() { this.visible = true; }, dispose() {} };
  const context = {
    extension: { id: 'merttalhayener.agent-pet', packageJSON: {version:'0.16.0'} }, extensionPath: '/test/extension', globalStorageUri: { fsPath: '/test/storage' }, subscriptions: [],
    globalState: { get: (k, fallback) => state.has(k) ? state.get(k) : fallback, update: async (k, v) => state.set(k, v) }
  };
  const vscode = {
    StatusBarAlignment: { Right: 2 },
    extensions: { getExtension: () => withCodex ? ({ extensionPath: '/test/codex' }) : undefined },
    window: { registerUriHandler: handler => { uriHandler=handler; return { dispose() {} }; }, createStatusBarItem: () => entry, showQuickPick: async () => ({ id: 'fern' }), registerWebviewViewProvider: () => assert.fail('Legacy view registered') },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return { dispose() {} }; }, executeCommand: () => assert.fail('Unexpected VS Code UI command') },
    workspace: { workspaceFolders: [], getConfiguration: () => ({ get: (key, fallback) => key === 'desktopEnabled' ? false : fallback }), onDidChangeConfiguration: () => ({ dispose() {} }) }
  };
  let snapshot;
  class DesktopBridge {
    constructor(dir, executable, getSnapshot) { this.directory = dir; snapshot = getSnapshot; }
    async start(show) { starts.push(show); }
    async write() {}
  }
  class AgentActivityMonitor { start() {} async tick() {} }
  const dependencies = { vscode, './support.cjs': {createSupportCenter:()=>({start(){},show(tab){supportTabs.push(tab);},dispose(){}})}, './marketplace-migration.cjs': { prepareMarketplaceMigration: async () => true }, './update-reload.cjs': { createUpdateReload: () => ({ start() {}, dispose() {} }) }, './marketplace-updater.cjs': { installedMarketplaceVersion: async () => '0.11.0', createMarketplaceUpdater: () => ({ start() {}, dispose() {}, check: async () => {} }) }, './window-navigation.cjs': { resolveWindowNavigation: async () => ({ codex: 'vscode://openai.chatgpt/local/?windowId=2', claude: 'vscode://local.codex-pet-panel/claude?windowId=2' }) }, './workspace.cjs': require('../src/workspace.cjs'), './claude-navigation.cjs': require('../src/claude-navigation.cjs'), './desktop.cjs': { DesktopBridge }, './agent-activity.cjs': { AgentActivityMonitor }, 'node:fs/promises': { mkdir: async () => {}, writeFile: async file => writes.push(file), readdir: async () => assert.fail('External pet artwork must not be discovered') } };
  const sandbox = { module: { exports: {} }, require: name => dependencies[name] || require(name), process: { platform: 'darwin', env: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/extension.cjs'), 'utf8'), sandbox);
  const api = await sandbox.module.exports.activate(context);
  assert.deepEqual(Array.from(api.availablePets), ['agent-pet','miso','fern']);
  assert.ok(snapshot().pets.every(p => p.file === ''));
  assert.equal(snapshot().selected, 'agent-pet');
  assert.equal(snapshot().protocolVersion, 11);
  for (const command of ['agentPet.getStarted','agentPet.connections','agentPet.diagnostics']) await commands.get(command)();
  await uriHandler.handleUri({authority:'merttalhayener.agent-pet',path:'/support',query:'windowId=42'});
  assert.deepEqual(supportTabs,['setup','connections','diagnostics','connections']);
  assert.equal(snapshot().workspace.name, 'No workspace');
  assert.match(snapshot().workspace.id, /^[a-f0-9]{64}$/);
  assert.ok(entry.visible); assert.equal(entry.command, 'codexPet.showDesktop');
  assert.deepEqual(starts, [], 'Disabled automatic opening is respected');
  await commands.get('codexPet.open')(); await commands.get('codexPet.showDesktop')();
  assert.deepEqual(starts, [true, true]);
  await commands.get('codexPet.hideDesktop')();
  assert.deepEqual(writes, ['/test/storage/desktop/desktop-hide-panel-request']);
  await commands.get('codexPet.choose')();
  assert.equal(snapshot().selected, 'fern');
  assert.equal(state.get('pet'), 'fern');
});
