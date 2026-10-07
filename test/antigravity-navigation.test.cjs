const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAntigravityNavigation } = require('../src/antigravity-navigation.cjs');
const session = '11111111-1111-4111-8111-111111111111';
function fixture(thread = { cwd: '/project', title: 'Review changes' }) {
  const calls = [], messages = [];
  let installed = true;
  const vscode = { extensions: { getExtension: id => installed && id === 'google.google-antigravity' ? { activate: async () => calls.push(['activate']) } : undefined },
    commands: { executeCommand: async (...args) => calls.push(args) },
    window: { showInformationMessage: message => messages.push(message), showErrorMessage: message => messages.push(message) } };
  const navigation = createAntigravityNavigation(vscode, async id => id === `antigravity:${session}` ? thread : undefined, 'merttalhayener.agent-pet');
  return { calls, messages, navigation, set installed(value) { installed = value; }, uri: query => ({ authority: 'merttalhayener.agent-pet', path: '/antigravity', query }) };
}
test('opens the exact official Antigravity conversation with its locally tracked workspace', async () => {
  const f = fixture(); await f.navigation.handleUri(f.uri(`windowId=42&session=${session}`));
  assert.deepEqual(f.calls, [['activate'], ['antigravity.openConversation', session, '/project']]);
});
test('navigation rejects duplicates, foreign commands, malformed sessions and injected paths', async () => {
  const f = fixture();
  for (const query of [`session=${session}&path=/other`, `session=${session}&session=${session}`, `session=${session}&windowId=1&windowId=2`, `session=${session}&windowId=abc`, 'session=bad']) await f.navigation.handleUri(f.uri(query));
  await f.navigation.handleUri({ ...f.uri(`session=${session}`), authority: 'other' }); assert.equal(f.calls.length, 0);
});
test('missing sessions or agent installation do not open an arbitrary conversation', async () => {
  const f = fixture(null); await f.navigation.handleUri(f.uri(`session=${session}`)); assert.equal(f.calls.length, 0); assert.equal(f.messages.length, 1);
  const missing = fixture(); missing.installed = false; await missing.navigation.handleUri(missing.uri(`session=${session}`)); assert.equal(missing.calls.length, 0); assert.equal(missing.messages.length, 1);
});
