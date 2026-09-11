const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const assert = require('node:assert/strict');
const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
async function main() {
  const dir = path.join(root, 'artifacts', 'native-dashboard-test');
  await fs.mkdir(dir, { recursive: true });
  const pets = [];
  if (!process.argv.includes('--builtin')) {
    const assets = await require('./fixtures.cjs').findPetAssets();
    const files = await fs.readdir(assets);
    for (const id of ['codex', 'dewey', 'fireball', 'hoots', 'bsod', 'null-signal', 'rocky', 'seedy', 'stacky']) pets.push({ id, name: id, file: path.join(assets, files.find(f => f.startsWith(id + '-spritesheet-') && f.endsWith('.webp'))) });
  }
  const now = Date.now();
  const a = { id: '11111111-1111-4111-8111-111111111111', title: 'Build a feature', status: 'running', startedAt: now - 180000, changedAt: now - 1000, lastEventAt: now - 500 };
  const b = { id: (process.argv.includes('--mixed') ? 'claude:' : '') + '22222222-2222-4222-8222-222222222222', title: 'Review changes', status: 'ready', startedAt: now - 120000, finishedAt: now - 200, changedAt: now - 300, lastEventAt: now - 200 };
  const extra = process.argv.includes('--overflow') ? Array.from({ length: 10 }, (_, i) => ({ ...b, id: 'extra-' + i, title: 'Tamamlanan sohbet ' + (i + 1) })) : [];
  pets.unshift({ id: 'agent-pet', name: 'Agent Pet', file: '' });
  const base = { workspace: { id: 'test-workspace', name: 'Website' }, navigation: { codex: 'vscode://openai.chatgpt/local/?windowId=42', claude: 'vscode://local.codex-pet-panel/claude?windowId=42' }, selected: process.argv.includes('--builtin') ? 'agent-pet' : 'bsod', selectedAt: now, sleepAt: now, sleeping: false, pets };
  await fs.writeFile(path.join(dir, 'client-one.json'), JSON.stringify({ ...base, updatedAt: now - 100, activity: { status: 'running', active: 1, threads: [a, b, ...extra] } }));
  // More recent heartbeat but older chat events must not override chat state.
  await fs.writeFile(path.join(dir, 'client-two.json'), JSON.stringify({ ...base, updatedAt: now, activity: { status: 'running', active: 1, threads: [{ ...a, status: 'ready', changedAt: now - 5000, lastEventAt: now - 4000 }, { ...b, status: 'running', startedAt: now - 180000, changedAt: now - 6000, lastEventAt: now - 5000 }] } }));
  const { stdout } = await run(path.join(root, 'src', 'bin', 'codex-desktop-pet'), ['--state-dir', dir, '--self-test', ...(process.argv.includes('--hotkey') ? ['--hotkey-self-test'] : [])], { timeout: 15000 });
  const result = JSON.parse(await fs.readFile(path.join(dir, 'dashboard-test.json'), 'utf8'));
  assert.equal(result.windowCount, 1);
  assert.equal(result.rows.find(w => w.id === '11111111-1111-4111-8111-111111111111').indicator, 'spinner');
  assert.equal(result.rows.find(w => w.id === b.id).indicator, 'check');
  assert.ok(result.visible && (result.spriteLoaded || result.builtinPet) && result.transparent && result.floating && !result.hidesOnDeactivate);
  assert.ok(result.sleepWorks); assert.ok(result.removeKeepsOther); assert.equal(result.restoredCount, 2 + extra.length); assert.equal(result.visibleRows, Math.min(8, 2 + extra.length)); assert.ok(result.scrollReachesLast);
  assert.equal(result.appActive, false);
  if (process.argv.includes('--builtin')) assert.ok(result.builtinPet);
  for (const key of ['workspaceOwnershipWorks','panelOnlyWorks','windowRoutingWorks','workspaceViewWorks','claudeLinkWorks','invalidLinkRejected','languageWorks','reopenWorks','shortcutReopenWorks','collapseWorks','pinWorks','appearanceWorks','snapWorks','snapOffWorks','waitingWorks','durationWorks','completionWorks','presentationWorks','soundAvailable']) assert.ok(result[key], key);
  if (process.argv.includes('--hotkey')) assert.ok(result.hotKeyRegistered);
  assert.ok(result.reopenedChatStaysAfterCompletion); assert.ok(result.dismissedSameTurnStaysHidden);
  assert.ok(result.bottomCornersStay); assert.ok(result.listChangeKeepsCorner); assert.ok(result.refreshDoesNotMoveDrag);
  assert.ok(result.cornerResizeWorks); assert.ok(result.refreshPreservesSize); assert.ok(result.minimumWorks); assert.ok(result.maximumWorks);
  assert.ok(result.rowClickOpensChat); assert.ok(result.dragDoesNotOpen); assert.ok(result.removeDoesNotOpen); assert.ok(result.changedRowDoesNotOpen);
  console.log(stdout);
  console.log('PASS: one floating pet, independent chat indicators, event ordering, row dismissal, restore and sleep.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
