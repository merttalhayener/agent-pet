const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const withCodex of [true, false]) test(`Desktop activation and reopening with Codex installed: ${withCodex}`, async () => {
  const commands = new Map(), starts = [], state = new Map();
  const entry = { show() { this.visible = true; }, dispose() {} };
  const context = {
    extensionPath: '/test/extension', globalStorageUri: { fsPath: '/test/storage' }, subscriptions: [],
    globalState: { get: (k, fallback) => state.has(k) ? state.get(k) : fallback, update: async (k, v) => state.set(k, v) }
  };
  const vscode = {
    StatusBarAlignment: { Right: 2 },
    extensions: { getExtension: () => withCodex ? ({ extensionPath: '/test/codex' }) : undefined },
    window: { registerUriHandler: () => ({ dispose() {} }), createStatusBarItem: () => entry, showQuickPick: async () => ({ id: withCodex ? 'bsod' : 'agent-pet' }), registerWebviewViewProvider: () => assert.fail('Legacy view registered') },
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
  const dependencies = { vscode, './update-reload.cjs': { createUpdateReload: () => ({ start() {}, dispose() {} }) }, './updater.cjs': { createUpdater: () => ({ start() {}, dispose() {}, check: async () => {} }) }, './window-navigation.cjs': { resolveWindowNavigation: async () => ({ codex: 'vscode://openai.chatgpt/local/?windowId=2', claude: 'vscode://local.codex-pet-panel/claude?windowId=2' }) }, './workspace.cjs': require('../src/workspace.cjs'), './claude-navigation.cjs': require('../src/claude-navigation.cjs'), './desktop.cjs': { DesktopBridge }, './agent-activity.cjs': { AgentActivityMonitor }, 'node:fs/promises': { readdir: async () => withCodex ? ['codex-spritesheet-test.webp', 'bsod-spritesheet-test.webp'] : [] } };
  const sandbox = { module: { exports: {} }, require: name => dependencies[name] || require(name), process: { platform: 'darwin', env: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/extension.cjs'), 'utf8'), sandbox);
  const api = await sandbox.module.exports.activate(context);
  assert.ok(api.availablePets.includes('agent-pet'));
  if (!withCodex) { assert.equal(snapshot().selected, 'agent-pet'); assert.ok(snapshot().selectedAt > 0); }
  assert.equal(snapshot().workspace.name, 'No workspace');
  assert.match(snapshot().workspace.id, /^[a-f0-9]{64}$/);
  assert.ok(entry.visible); assert.equal(entry.command, 'codexPet.showDesktop');
  assert.deepEqual(starts, [], 'Disabled automatic opening is respected');
  await commands.get('codexPet.open')(); await commands.get('codexPet.showDesktop')();
  assert.deepEqual(starts, [true, true]);
  await commands.get('codexPet.choose')();
  assert.equal(snapshot().selected, withCodex ? 'bsod' : 'agent-pet');
  assert.equal(state.get('pet'), withCodex ? 'bsod' : 'agent-pet');
});
