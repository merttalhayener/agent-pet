const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveWindowNavigation } = require('../src/window-navigation.cjs');
test('each window gets its own platform-generated provider routes', async () => {
 const api = id => ({ env: { uriScheme: 'vscode', asExternalUri: async uri => ({ toString: skipEncoding => { assert.equal(skipEncoding, true); return uri + '?windowId=' + id; } }) }, Uri: { parse: s => s } });
 const a = await resolveWindowNavigation(api(42)), b = await resolveWindowNavigation(api(99));
 assert.equal(a.codex, 'vscode://openai.chatgpt/local/?windowId=42');
 assert.equal(b.claude, 'vscode://local.codex-pet-panel/claude?windowId=99');
 assert.notEqual(a.codex, b.codex);
});
