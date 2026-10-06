const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { TerminalSessions, createTerminalNavigation, parseProcesses } = require('../src/terminal-sessions.cjs');
const { ClaudeActivityMonitor } = require('../src/claude-activity.cjs');
const { ActivityMonitor } = require('../src/activity.cjs');
const CLAUDE = '66666666-6666-4666-8666-666666666666';
const STALE = '77777777-7777-4777-8777-777777777777';
const CODEX = '01a11042-a1f6-7c93-82f9-99c4ee2efe23';
const STARTED = 'Tue Oct  6 08:09:08 2026';
const ps = (rows) => rows.map(([pid, ppid, comm, started = STARTED]) => `${String(pid).padStart(5)} ${String(ppid).padStart(5)} ${started} ${comm}`).join('\n') + '\n';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-terminal-'));
  const claudeSessions = path.join(root, 'claude', 'sessions'), codexSessions = path.join(root, 'codex', 'sessions');
  await fs.mkdir(claudeSessions, { recursive: true }); await fs.mkdir(path.join(codexSessions, '2026', '09', '01'), { recursive: true });
  try { await run({ root, claudeSessions, codexSessions }); } finally { await fs.rm(root, { recursive: true }); }
}

test('process listings keep command paths with spaces', () => {
  const processes = parseProcesses(ps([[10, 1, '/Applications/Agent Pet.app/Contents/MacOS/codex-desktop-pet']]));
  assert.equal(processes.get(10).comm, '/Applications/Agent Pet.app/Contents/MacOS/codex-desktop-pet');
  assert.equal(processes.get(10).ppid, 1);
  assert.ok(Number.isFinite(processes.get(10).started));
});

test('agents below this window’s terminal shells are owned; others and reused process IDs are not', async () => fixture(async ({ claudeSessions, codexSessions }) => {
  const rollout = path.join(codexSessions, '2026', '09', '01', `rollout-2026-09-01T10-00-00-${CODEX}.jsonl`);
  await fs.writeFile(path.join(claudeSessions, '200.json'), JSON.stringify({ pid: 200, sessionId: CLAUDE, procStart: STARTED, entrypoint: 'cli' }));
  await fs.writeFile(path.join(claudeSessions, '201.json'), JSON.stringify({ pid: 201, sessionId: STALE, procStart: 'Mon Oct  5 08:09:08 2026', entrypoint: 'cli' }));
  await fs.writeFile(path.join(claudeSessions, '900.json'), JSON.stringify({ pid: 900, sessionId: STALE, entrypoint: 'cli' }));
  const first = { name: 'zsh', show() {} }, second = { name: 'bash', show() {} };
  let terminals = [first, Object.assign(second, { processId: Promise.resolve(110) }), { processId: new Promise(() => {}) }];
  first.processId = Promise.resolve(100);
  const calls = [];
  const exec = async (file, args) => {
    calls.push(file);
    if (file === '/bin/ps') return ps([[100, 1, '/bin/zsh'], [110, 1, '/bin/bash'], [200, 100, '/Users/me/.local/share/claude/versions/2.1.291'], [201, 100, 'node'],
      [300, 110, 'node'], [301, 300, '/opt/homebrew/lib/node_modules/@openai/codex/vendor/codex'], [900, 1, 'claude'], [901, 1, 'codex']]);
    assert.deepEqual(args.slice(0, 4), ['-a', '-p', '301', '-d']);
    return `p301\nn${rollout}\nn/tmp/rollout-${STALE}.jsonl\n`;
  };
  const sessions = new TerminalSessions(() => terminals, claudeSessions, codexSessions, exec);
  await sessions.refresh();
  assert.equal(sessions.terminal(`claude:${CLAUDE}`), first);
  assert.equal(sessions.terminal(CODEX), second);
  assert.ok(!sessions.has(`claude:${STALE}`) && !sessions.has(STALE), 'Reused or foreign processes are ignored');
  assert.deepEqual(sessions.files(), [rollout]);
  await sessions.refresh(); assert.equal(calls.length, 2, 'Refreshes are throttled');
  terminals = [second];
  await sessions.refresh(true);
  assert.ok(!sessions.has(`claude:${CLAUDE}`), 'Closing the terminal ends ownership');
  assert.equal(sessions.terminal(CODEX), second, 'An open terminal keeps ownership after its agent exits');
}));

test('Claude CLI chats appear only while an integrated terminal owns them, regardless of folder', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pet-terminal-claude-'));
  try {
    const dir = path.join(root, '-elsewhere'); await fs.mkdir(dir);
    const at = new Date().toISOString();
    await fs.writeFile(path.join(dir, CLAUDE + '.jsonl'), JSON.stringify({ type: 'user', sessionId: CLAUDE, cwd: '/elsewhere', entrypoint: 'cli', timestamp: at, message: { role: 'user', content: 'Fix the build' } }) + '\n'
      + JSON.stringify({ type: 'assistant', sessionId: CLAUDE, cwd: '/elsewhere', entrypoint: 'cli', timestamp: at, message: { role: 'assistant', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }) + '\n');
    const owned = new Set();
    let s; const m = new ClaudeActivityMonitor(root, () => ['/work/app'], value => { s = value; }, { has: id => owned.has(id), files: () => [] });
    try {
      await m.tick(); assert.equal(s.threads.length, 0);
      owned.add(`claude:${CLAUDE}`); await m.tick();
      assert.equal(s.threads.length, 1); assert.equal(s.threads[0].surface, 'terminal'); assert.equal(s.threads[0].status, 'ready'); assert.equal(s.threads[0].agent, 'claude');
      owned.clear(); await m.tick(); assert.equal(s.threads.length, 0);
    } finally { m.dispose(); }
  } finally { await fs.rm(root, { recursive: true }); }
});

test('Codex CLI rollouts outside recent date folders are read from their open terminal', async () => fixture(async ({ codexSessions }) => {
  const rollout = path.join(codexSessions, '2026', '09', '01', `rollout-2026-09-01T10-00-00-${CODEX}.jsonl`);
  const at = new Date().toISOString();
  await fs.writeFile(rollout, JSON.stringify({ type: 'session_meta', payload: { id: CODEX, cwd: '/elsewhere', source: 'cli' } }) + '\n'
    + JSON.stringify({ type: 'event_msg', timestamp: at, payload: { type: 'task_started' } }) + '\n');
  for (const day of ['02', '03', '04', '05']) await fs.mkdir(path.join(codexSessions, '2026', '09', day), { recursive: true });
  let s; const m = new ActivityMonitor(codexSessions, () => ['/work/app'], value => { s = value; }, { has: id => id === CODEX, files: () => [rollout] });
  try {
    await m.tick();
    assert.equal(s.threads.length, 1); assert.equal(s.threads[0].surface, 'terminal'); assert.equal(s.threads[0].status, 'unknown');
    await fs.appendFile(rollout, JSON.stringify({ type: 'event_msg', timestamp: new Date().toISOString(), payload: { type: 'task_complete' } }) + '\n');
    await m.tick(); assert.equal(s.threads[0].status, 'ready');
  } finally { m.dispose(); }
}));

test('terminal links reveal only the owning terminal and reject malformed requests', async () => {
  const shown = [], messages = [];
  const terminal = { show(preserveFocus) { shown.push(preserveFocus); } };
  const sessions = { refreshed: 0, async refresh(force) { assert.equal(force, true); this.refreshed++; }, terminal: id => id === `claude:${CLAUDE}` ? terminal : undefined };
  const vscode = { window: { showInformationMessage: message => messages.push(message) } };
  const navigation = createTerminalNavigation(vscode, sessions, 'merttalhayener.agent-pet');
  const link = query => navigation.handleUri({ authority: 'merttalhayener.agent-pet', path: '/terminal', query });
  await link(`windowId=4&thread=claude:${CLAUDE}`);
  assert.deepEqual(shown, [false]);
  for (const query of [`thread=claude:${CLAUDE}&prompt=x`, `windowId=a&thread=${CODEX}`, 'thread=claude:invalid', `thread=${CODEX}&thread=${CODEX}`]) await link(query);
  await navigation.handleUri({ authority: 'other.extension', path: '/terminal', query: `thread=claude:${CLAUDE}` });
  assert.equal(sessions.refreshed, 1); assert.deepEqual(shown, [false]);
  await link(`thread=${CODEX}`);
  assert.equal(messages.length, 1);
});
