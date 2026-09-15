const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { ClaudeActivityMonitor, applyClaudeEvent } = require('../src/claude-activity.cjs');
const { AgentActivityMonitor } = require('../src/agent-activity.cjs');
const ID = '44444444-4444-4444-8444-444444444444';
const OTHER = '55555555-5555-4555-8555-555555555555';
const record = (type, extra = {}, at = Date.now()) => JSON.stringify({ type, sessionId: ID, cwd: '/work/app', entrypoint: 'claude-vscode', timestamp: new Date(at).toISOString(), ...extra }) + '\n';
const user = (at = Date.now()) => record('user', { message: { role: 'user', content: 'Build a sample feature' } }, at);
const assistant = (stop_reason, content = [{ type: 'text', text: 'Sample answer' }], at = Date.now()) => record('assistant', { message: { role: 'assistant', stop_reason, content } }, at);
async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-claude-'));
  const projects = path.join(root, 'projects'), dir = path.join(projects, '-work-app'); await fs.mkdir(dir, { recursive: true });
  try { await run({ root, projects, dir, file: path.join(dir, ID + '.jsonl') }); } finally { await fs.rm(root, { recursive: true }); }
}
test('Claude tracks prompt, tool call, answer, explicit completion and a new turn independently', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, user()); let s;
  const m = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { s = value; });
  try {
    await m.tick(); assert.equal(s.threads[0].status, 'unknown');
    await fs.appendFile(file, assistant('tool_use', [{ type: 'tool_use', id: 'ask', name: 'AskUserQuestion', input: { questions: [] } }]));
    await m.tick(); assert.equal(s.threads[0].status, 'waiting');
    const reload = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { s = value; });
    try { await reload.tick(); assert.equal(s.threads[0].status, 'waiting'); } finally { reload.dispose(); }
    await fs.appendFile(file, record('user', { message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'ask', content: 'Answer' }] } }));
    await m.tick(); assert.equal(s.active, 1);
    await fs.appendFile(file, assistant(null)); await m.tick(); assert.equal(s.active, 1, 'A missing stop reason is not completion');
    assert.equal(m.snapshot(Date.now() + 61000).threads[0].status, 'running');
    const done = assistant('end_turn'); await fs.appendFile(file, done.slice(0, 45)); await m.tick(); assert.equal(s.active, 1);
    await fs.appendFile(file, done.slice(45) + record('custom-title', { customTitle: 'Named Claude chat' })); await m.tick();
    assert.equal(s.threads[0].status, 'ready'); assert.equal(s.threads[0].title, 'Named Claude chat'); assert.ok(s.threads[0].finishedAt >= s.threads[0].startedAt);
    await fs.appendFile(file, user() + record('ai-title', { aiTitle: 'Automatic name' })); await m.tick(); assert.equal(s.active, 1); assert.equal(s.threads[0].title, 'Named Claude chat');
    await fs.appendFile(file, record('user', { message: { content: '[Request interrupted by user]' } })); await m.tick(); assert.equal(s.threads[0].status, 'idle');
  } finally { m.dispose(); }
}));
test('Claude excludes CLI-only, other workspaces and subagent files; handles large logs and truncation', async () => fixture(async ({ projects, dir, file }) => {
  await fs.writeFile(file, user() + record('attachment', { attachment: { data: 'x'.repeat(1024 * 1024) } }) + assistant('end_turn'));
  await fs.writeFile(path.join(dir, OTHER + '.jsonl'), record('user', { sessionId: OTHER, cwd: '/work/app-other', message: { content: 'Other' } }));
  await fs.mkdir(path.join(dir, ID, 'subagents'), { recursive: true });
  await fs.writeFile(path.join(dir, ID, 'subagents', 'agent-x.jsonl'), user());
  let s; const m = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { s = value; });
  try {
    await m.tick(); assert.equal(s.threads.length, 1); assert.equal(s.threads[0].status, 'ready');
    await fs.writeFile(file, user()); await m.tick(); assert.equal(s.threads[0].status, 'unknown');
    await fs.appendFile(file, assistant('end_turn')); await m.tick(); assert.equal(s.threads[0].status, 'ready');
    const cli = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { s = value; });
    await fs.writeFile(file, record('user', { entrypoint: 'cli', message: { content: 'CLI' } }));
    try { await cli.tick(); assert.equal(s.threads.length, 0); } finally { cli.dispose(); }
  } finally { m.dispose(); }
}));
test('sidechain and foreign session events cannot change the parent status', () => {
  const s = { sessionId: ID, status: 'running' };
  for (const extra of [{ isSidechain: true }, { sessionId: OTHER }]) applyClaudeEvent(s, { ...JSON.parse(assistant('end_turn')), ...extra });
  assert.equal(s.status, 'running');
});
test('mixed agents keep colliding UUIDs distinct and reconcile old retained completions after restart', async () => fixture(async ({ root, projects, file }) => {
  const old = Date.now() - 3600000;
  const codex = path.join(root, 'sessions'), date = path.join(codex, '2026', '09', '11'); await fs.mkdir(date, { recursive: true });
  const event = type => JSON.stringify({ type: 'event_msg', timestamp: new Date(old).toISOString(), payload: { type } }) + '\n';
  await fs.writeFile(path.join(date, 'rollout.jsonl'), JSON.stringify({ type: 'session_meta', payload: { id: ID, cwd: '/work/app', source: 'vscode' } }) + '\n' + event('task_started') + event('task_complete'));
  await fs.writeFile(file, user(old) + assistant('end_turn', undefined, old + 1000));
  let s; const m = new AgentActivityMonitor(codex, projects, () => ['/work/app'], value => { s = value; }, root);
  try {
    await m.tick(); assert.equal(s.threads.length, 0, 'Do not flood the list with unrelated history');
    await fs.writeFile(path.join(root, 'tracked-threads.json'), JSON.stringify([ID, 'claude:' + ID]));
    await m.tick(); assert.equal(s.threads.length, 2); assert.ok(s.threads.every(t => t.status === 'ready'));
    assert.deepEqual(new Set(s.threads.map(t => t.agent)), new Set(['codex', 'claude']));
    await fs.appendFile(file, user()); await m.tick(); assert.equal(s.active, 1); assert.equal(s.threads.find(t => t.agent === 'codex').status, 'ready');
    m.enabled = false; await m.tick(); assert.equal(s.threads.length, 0); assert.ok(s.trackingDisabled);
  } finally { m.dispose(); }
}));
