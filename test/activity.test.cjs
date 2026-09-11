const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ActivityMonitor, inWorkspace } = require('../src/activity.cjs');
const event = (type) => JSON.stringify({ type: 'event_msg', timestamp: new Date().toISOString(), payload: { type } }) + '\n';

test('pending questions survive async acceptance and completion, resolve per answer, and preserve turn duration', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-wait-'));
  const dir = path.join(root, '2026', '09', '11'); await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'rollout.jsonl');
  const record = (type, payload) => JSON.stringify({ type, timestamp: new Date().toISOString(), payload }) + '\n';
  await fs.writeFile(file, record('session_meta', { id: 'waiting-chat', cwd: '/work/app', source: 'vscode' }) + event('task_started'));
  let result;
  const m = new ActivityMonitor(root, () => ['/work/app'], s => { result = s; });
  try {
    await m.tick(); const startedAt = result.threads[0].startedAt; assert.ok(startedAt > 0);
    await fs.appendFile(file, record('response_item', { type: 'function_call', name: 'request_user_input_async', call_id: 'ask-1', arguments: JSON.stringify({ questions: [{}, {}] }) }));
    await m.tick(); assert.equal(result.threads[0].status, 'waiting');
    await fs.appendFile(file, record('response_item', { type: 'function_call_output', call_id: 'ask-1', output: '{"accepted":true}' }) + event('task_complete'));
    await m.tick(); assert.equal(result.threads[0].status, 'waiting'); assert.ok(result.threads[0].finishedAt >= startedAt);
    const restarted = new ActivityMonitor(root, () => ['/work/app'], s => { result = s; });
    try { await restarted.tick(); assert.equal(result.threads[0].status, 'waiting'); } finally { restarted.dispose(); }
    const answer = i => record('event_msg', { type: 'user_message', message: '<send_user_message_question_reply>' + JSON.stringify([{ questionItemId: JSON.stringify(['request_user_input_async', 'ask-1', i]), answer: 'yes' }]) + '</send_user_message_question_reply>' });
    await fs.appendFile(file, answer(0)); await m.tick(); assert.equal(result.threads[0].status, 'waiting');
    await fs.appendFile(file, answer(1)); await m.tick(); assert.equal(result.threads[0].status, 'ready');
    assert.equal(result.threads[0].startedAt, startedAt);
    await fs.appendFile(file, event('task_started') + record('response_item', { type: 'function_call', name: 'exec_command', call_id: 'exec-1', arguments: '{"sandbox_permissions":"require_escalated"}' }));
    await m.tick(); assert.equal(result.threads[0].status, 'running', 'Requesting elevated execution alone does not prove a human approval is pending');
    await fs.appendFile(file, record('response_item', { type: 'function_call', name: 'request_user_input', call_id: 'sync-1', arguments: '{}' }));
    await m.tick(); assert.equal(result.threads[0].status, 'waiting');
    await fs.appendFile(file, record('response_item', { type: 'function_call_output', call_id: 'sync-1', output: '{"answers":{}}' }));
    await m.tick(); assert.equal(result.threads[0].status, 'running');
  } finally { m.dispose(); await fs.rm(root, { recursive: true }); }
});

test('SQLite index discovers active chats from older date folders and supplies their display names', { skip: process.platform !== 'darwin' }, async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-index-'));
  const root = path.join(home, 'sessions');
  const old = path.join(root, '2026', '09', '01', 'rollout.jsonl');
  await fs.mkdir(path.dirname(old), { recursive: true });
  for (const day of ['09', '10', '11']) await fs.mkdir(path.join(root, '2026', '09', day), { recursive: true });
  await fs.writeFile(old, JSON.stringify({ type: 'session_meta', payload: { id: 'old-chat', cwd: '/work/app', source: 'vscode' } }) + '\n' + event('task_started'));
  const run = require('node:util').promisify(require('node:child_process').execFile);
  const quote = value => "'" + value.replaceAll("'", "''") + "'";
  await run('/usr/bin/sqlite3', [path.join(home, 'state_5.sqlite'), `CREATE TABLE threads(id, rollout_path, name, title, source, archived, updated_at); INSERT INTO threads VALUES('old-chat', ${quote(old)}, 'SRS kontrolü', 'Long initial prompt', 'vscode', 0, 1);`]);
  let status;
  const m = new ActivityMonitor(root, () => ['/work/app'], s => { status = s; });
  try {
    await m.tick();
    assert.equal(status.active, 1);
    assert.equal(status.threads[0].title, 'SRS kontrolü');
    await fs.appendFile(old, event('task_complete')); await m.tick();
    assert.equal(status.threads[0].status, 'ready');
  } finally { m.dispose(); await fs.rm(home, { recursive: true }); }
});

test('workspace filtering does not include prefix neighbors', () => {
  assert.equal(inWorkspace('/work/app/sub', ['/work/app']), true);
  assert.equal(inWorkspace('/work/app-other', ['/work/app']), false);
});
test('long active turn, partial append, completion, abort and replacement', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-events-'));
  const dir = path.join(root, '2026', '09', '11'); await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'rollout.jsonl');
  const header = JSON.stringify({ type: 'session_meta', payload: { cwd: '/work/app', source: 'vscode' } }) + '\n';
  const large = JSON.stringify({ type: 'response_item', payload: { content: 'a'.repeat(18 * 1024 * 1024) } }) + '\n';
  await fs.writeFile(file, header + event('task_started') + large + event('token_count'));
  let status;
  const m = new ActivityMonitor(root, () => ['/work/app'], s => { status = s; });
  try {
    await m.tick(); assert.equal(status.status, 'running');
    const complete = event('task_complete');
    await fs.appendFile(file, complete.slice(0, 30)); await m.tick(); assert.equal(status.status, 'running');
    await fs.appendFile(file, complete.slice(30)); await m.tick(); assert.equal(status.status, 'ready');
    await fs.appendFile(file, event('task_started') + event('turn_aborted')); await m.tick(); assert.equal(status.status, 'idle');
    await fs.writeFile(file, header + event('task_started')); await m.tick(); assert.equal(status.status, 'running');
    m.enabled = false; await m.tick(); assert.equal(status.status, 'idle');
  } finally { m.dispose(); await fs.rm(root, { recursive: true }); }
});
test('active work wins over completed work; stale activity never means completed', () => {
  const m = new ActivityMonitor('', () => ['/work/app'], () => {});
  m.files.set('a', { id: 'a', cwd: '/work/app', source: 'vscode', status: 'ready', changedAt: Date.now(), lastEventAt: Date.now() });
  m.files.set('b', { id: 'b', cwd: '/work/app', source: 'vscode', status: 'running', changedAt: Date.now(), lastEventAt: Date.now() });
  assert.equal(m.snapshot().status, 'running');
  m.files.delete('a'); m.seenThreads.clear(); m.files.get('b').lastEventAt = 0;
  assert.equal(m.snapshot().status, 'idle');
  m.dispose();
});

test('two chats keep independent status, deduplicate IDs, and retain completion until closed', () => {
  const m = new ActivityMonitor('', () => ['/work/app'], () => {});
  const now = Date.now();
  const a = { id: 'chat-a', cwd: '/work/app', source: 'vscode', status: 'running', changedAt: now, lastEventAt: now };
  const b = { ...a, id: 'chat-b' };
  m.titles.set('chat-a', 'Pet geliştir'); m.titles.set('chat-b', 'VR oyunu');
  m.files.set('a', a); m.files.set('b', b); m.files.set('a-copy', { ...a });
  let s = m.snapshot(); assert.equal(s.active, 2); assert.equal(s.threads.length, 2);
  assert.equal(s.threads[0].title, 'Pet geliştir');
  b.status = 'ready'; b.changedAt += 1; b.lastEventAt += 1;
  s = m.snapshot(); assert.equal(s.active, 1);
  assert.equal(s.threads.find(t => t.id === 'chat-a').status, 'running');
  assert.equal(s.threads.find(t => t.id === 'chat-b').status, 'ready');
  // Missing/evicted log files must not erase a completed pet.
  m.files.delete('b'); s = m.snapshot(); assert.equal(s.threads.find(t => t.id === 'chat-b').status, 'ready');
  m.files.set('subagent', { ...b, id: 'child', source: { subagent: {} } });
  assert.equal(m.snapshot().threads.length, 2);
  a.status = 'ready'; a.changedAt += 2; a.lastEventAt += 2;
  assert.equal(m.snapshot().active, 0, 'An older duplicate must not keep a completed chat running');
  m.dispose();
});
