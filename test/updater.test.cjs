const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { selectRelease, verifiedPackage, download, createUpdater } = require('../src/updater.cjs');
const data = Buffer.from('a fixture VSIX'), digest = crypto.createHash('sha256').update(data).digest('hex');
function release(version = '0.10.0') { return { tag_name: 'v' + version, prerelease: true, assets: [{ name: `agent-pet-${version}.vsix`, digest: 'sha256:' + digest, browser_download_url: `https://github.com/merttalhayener/agent-pet/releases/download/v${version}/agent-pet-${version}.vsix` }] }; }
function fakeFetch(releases = [release()], body = data) { return async url => new Response(url.includes('api.github.com') ? JSON.stringify(releases) : body); }
test('updater selects newest beta, ignores drafts, old versions and unrelated assets', () => {
  assert.equal(selectRelease([release('0.9.2'), release(), { ...release('1.0.0'), draft: true }, release('0.9.1')], '0.9.1').tag_name, 'v0.10.0');
  assert.equal(selectRelease([release()], '0.10.0'), undefined);
  assert.equal(selectRelease([{ ...release('99.0.0'), assets: [] }], '0.9.1'), undefined);
});
test('package checksum is required and checked before returning install bytes', async () => {
  assert.deepEqual((await verifiedPackage(release(), fakeFetch())).data, data);
  await assert.rejects(verifiedPackage(release(), fakeFetch([], Buffer.from('modified'))), /checksum verification/);
  const unsigned = release(); delete unsigned.assets[0].digest;
  await assert.rejects(verifiedPackage(unsigned, fakeFetch()), /no SHA-256/);
  unsigned.assets.push({ name: 'SHA256SUMS', browser_download_url: 'https://github.com/merttalhayener/agent-pet/releases/download/v0.10.0/SHA256SUMS' });
  const fetcher = async url => new Response(url.endsWith('SHA256SUMS') ? `${digest}  agent-pet-0.10.0.vsix\n` : data);
  assert.deepEqual((await verifiedPackage(unsigned, fetcher)).data, data);
});
test('downloader rejects foreign URLs and oversized streaming responses', async () => {
  await assert.rejects(download('https://example.com/file', 100, () => assert.fail('network called')), /Untrusted/);
  await assert.rejects(download('https://github.com/merttalhayener/agent-pet/releases/download/v1/file', 3, async () => new Response('large')), /too large/);
  const foreign = release(); foreign.assets[0].browser_download_url = 'https://github.com/other/repo/file';
  await assert.rejects(verifiedPackage(foreign), /Unexpected/);
});
async function fixture(t, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-pet-updater-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const installed = [], messages = [], errors = []; let requests = 0;
  const vscode = { env: { language: 'en' }, ProgressLocation: { Notification: 1 }, Uri: { file: file => ({ fsPath: file }) }, workspace: { getConfiguration: () => ({ get: () => true }) }, window: {
    async showInformationMessage(message, ...choices) { messages.push(message); return options.choose ? options.choose(message, choices) : choices[0]; },
    showErrorMessage(message) { errors.push(message); }, withProgress: async (_, fn) => fn()
  }, commands: { async executeCommand(command, uri) { assert.equal(command, 'workbench.extensions.installExtension'); installed.push(await fs.readFile(uri.fsPath)); } } };
  const context = { globalStorageUri: { fsPath: dir }, extension: { packageJSON: { version: '0.9.1' } } };
  const fetcher = async url => { requests++; return fakeFetch([release()], options.body || data)(url); };
  const updater = createUpdater(vscode, context, { fetcher }); t.after(() => updater.dispose());
  return { updater, installed, messages, errors, dir, vscode, context, fetcher, get requests() { return requests; } };
}
test('installation verifies the VSIX and records the installed version for the separate reload controller', async t => {
  const f = await fixture(t); await f.updater.check();
  assert.deepEqual(f.installed, [data]); assert.equal(f.errors.length, 0);
  assert.ok(f.messages.some(m => m.includes('Windows reload automatically')));
  const other = createUpdater(f.vscode, f.context, { fetcher: f.fetcher }); t.after(() => other.dispose());
  await other.check(); assert.equal(f.installed.length, 1);
  assert.deepEqual((await fs.readdir(path.join(f.dir, 'updates'))).sort(), ['state.json']);
});
test('dismissing an update never downloads VSIX; automatic checks are daily across windows', async t => {
  const f = await fixture(t, { choose: () => undefined }); await f.updater.check(false); await f.updater.check(false);
  assert.equal(f.requests, 1); assert.equal(f.installed.length, 0);
});
test('corrupt automatic update is reported and cannot install', async t => {
  const f = await fixture(t, { body: Buffer.from('broken') }); await f.updater.check(false);
  assert.equal(f.installed.length, 0); assert.match(f.errors[0], /checksum verification/);
});
test('multiple windows cannot offer or install competing updates', async t => {
  let releasePrompt, promptShown;
  const shown = new Promise(resolve => { promptShown = resolve; });
  const f = await fixture(t, { choose: (_, choices) => choices.length ? new Promise(resolve => { releasePrompt = resolve; promptShown(); }) : undefined });
  const first = f.updater.check(); await shown;
  const other = createUpdater(f.vscode, f.context, { fetcher: f.fetcher }); t.after(() => other.dispose());
  await other.check(); assert.equal(f.requests, 1);
  releasePrompt('Install update'); await first; assert.equal(f.installed.length, 1);
});
