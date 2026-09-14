const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createClaudeNavigation } = require('../src/claude-navigation.cjs');
const ID = '44444444-4444-4444-8444-444444444444';
const uri = query => ({ authority: 'local.codex-pet-panel', path: '/claude', query: query || `session=${ID}` });
function fixture({ status = 'ready', existing = false, dirty = false, extensionId = 'local.codex-pet-panel' } = {}) {
  const calls = [], notifications = []; let location = 'panel';
  const tab = { label: 'Sample Claude chat', input: { viewType: 'mainThreadWebview-anthropic.claude-code-claudeVSCodePanel' }, isDirty: dirty };
  const group = { tabs: existing ? [tab] : [], activeTab: undefined };
  const api = {
    ConfigurationTarget: { Global: 1 }, extensions: { getExtension: () => ({ activate: async () => {} }) },
    workspace: { getConfiguration: () => ({ update: async (key, value) => { assert.equal(key, 'preferredLocation'); location = value; } }) },
    window: { showInformationMessage: async s => notifications.push(s), showErrorMessage: s => assert.fail(s), tabGroups: { all: [group], activeTabGroup: group, close: async candidate => { assert.equal(candidate, tab); assert.notEqual(status, 'running'); assert.equal(dirty, false); group.tabs = []; group.activeTab = undefined; calls.push('close'); return true; } } },
    commands: { executeCommand: async (command, session, ...args) => {
      assert.equal(session, ID); calls.push(command);
      if (command === 'claude-vscode.primaryEditor.open') group.activeTab = tab;
      if (command === 'claude-vscode.editor.open') {
        assert.equal(location, 'sidebar'); assert.deepEqual(args, [undefined, undefined, undefined, false, { programmatic: 'honor-preferred-location' }]);
        calls.push(group.tabs.includes(tab) ? 'existing-editor' : 'sidebar');
      }
    } }
  };
  return { calls, notifications, nav: createClaudeNavigation(api, async id => id === `claude:${ID}` ? { id, title: tab.label, status } : undefined, extensionId) };
}
test('Claude row uses the sidebar-aware command without creating an editor', async () => {
 const f = fixture(); await f.nav.handleUri(uri()); assert.deepEqual(f.calls, ['claude-vscode.editor.open', 'sidebar']);
});
test('settled legacy editor tab is moved to the sidebar', async () => {
 const f = fixture({ existing: true }); await f.nav.handleUri(uri()); assert.deepEqual(f.calls, ['claude-vscode.primaryEditor.open', 'close', 'claude-vscode.editor.open', 'sidebar']);
});
test('active or dirty Claude tabs are never closed', async () => {
 for (const options of [{ existing: true, status: 'running' }, { existing: true, dirty: true }]) {
  const f = fixture(options); await f.nav.handleUri(uri()); assert.ok(!f.calls.includes('close')); assert.equal(f.notifications.length, 1);
 }
});
test('malformed, extra-argument and unknown-session links cannot execute commands', async () => {
 const f = fixture();
 for (const query of ['session=invalid', `session=${ID}&prompt=unexpected`, `session=${ID}&session=${ID}`, 'session=55555555-5555-4555-8555-555555555555']) await f.nav.handleUri(uri(query));
 assert.deepEqual(f.calls, []);
});

test('VS Code window routing parameter is accepted, malformed routing is rejected', async () => {
 const f = fixture(); await f.nav.handleUri(uri(`windowId=42&session=${ID}`));
 assert.equal(f.calls.at(-1), 'sidebar');
 const bad = fixture();
 for (const query of [`session=${ID}&windowId=abc`, `session=${ID}&windowId=42&windowId=99`]) await bad.nav.handleUri(uri(query));
 assert.deepEqual(bad.calls, []);
});

test('Marketplace Claude handler accepts only its own URI authority',async()=>{
 const f=fixture({extensionId:'merttalhayener.agent-pet'});await f.nav.handleUri(uri());assert.deepEqual(f.calls,[]);
 await f.nav.handleUri({...uri(),authority:'merttalhayener.agent-pet'});assert.equal(f.calls.at(-1),'sidebar');
});
