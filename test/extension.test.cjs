const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Open Pet opens only the desktop helper and does not recreate the old sidebar', async () => {
  const commands = new Map(), starts = [], state = new Map();
  const entry = { show() { this.visible = true; }, dispose() {} };
  const context = {
    extensionPath: '/test/extension', globalStorageUri: { fsPath: '/test/storage' }, subscriptions: [],
    globalState: { get: (k, fallback) => state.has(k) ? state.get(k) : fallback, update: async (k, v) => state.set(k, v) }
  };
  const vscode = {
    StatusBarAlignment: { Right: 2 },
    extensions: { getExtension: () => ({ extensionPath: '/test/codex' }) },
    window: { createStatusBarItem: () => entry, showQuickPick: async () => ({ id: 'bsod' }), registerWebviewViewProvider: () => assert.fail('Legacy view registered') },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return { dispose() {} }; }, executeCommand: () => assert.fail('Unexpected VS Code UI command') },
    workspace: { workspaceFolders: [], getConfiguration: () => ({ get: (key, fallback) => key === 'desktopEnabled' ? false : fallback }), onDidChangeConfiguration: () => ({ dispose() {} }) }
  };
  let snapshot;
  class DesktopBridge {
    constructor(dir, executable, getSnapshot) { this.directory = dir; snapshot = getSnapshot; }
    async start(show) { starts.push(show); }
    async write() {}
  }
  class ActivityMonitor { start() {} }
  const dependencies = { vscode, './desktop.cjs': { DesktopBridge }, './activity.cjs': { ActivityMonitor }, 'node:fs/promises': { readdir: async () => ['codex-spritesheet-test.webp', 'bsod-spritesheet-test.webp'] } };
  const sandbox = { module: { exports: {} }, require: name => dependencies[name] || require(name), process: { platform: 'darwin', env: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/extension.cjs'), 'utf8'), sandbox);
  await sandbox.module.exports.activate(context);
  assert.ok(entry.visible); assert.equal(entry.command, 'codexPet.showDesktop');
  assert.deepEqual(starts, [], 'Disabled automatic opening is respected');
  await commands.get('codexPet.open')(); await commands.get('codexPet.showDesktop')();
  assert.deepEqual(starts, [true, true]);
  await commands.get('codexPet.choose')();
  assert.equal(snapshot().selected, 'bsod');
  assert.equal(state.get('pet'), 'bsod');
});
