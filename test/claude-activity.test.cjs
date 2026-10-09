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

const pluginCall = (id = 'plugin-call') => assistant('tool_use', [{ type: 'tool_use', id, name: 'mcp__plugin_playwright_playwright__browser_run_code_unsafe', input: {} }]);
const pluginProgress = (extra = {}) => record('progress', { parentToolUseID: 'plugin-call', toolUseID: 'progress-1', data: { type: 'mcp_progress', progress: 1 }, ...extra });
test('plugin progress after reload confirms an unfinished call; silence does not end it', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, user() + pluginCall());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, pluginProgress()); await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].status, 'running');
    assert.equal(monitor.snapshot(Date.now() + 5 * 60000).active, 1);
    await fs.appendFile(file, record('user', { isMeta: true, message: { content: [{ type: 'tool_result', tool_use_id: 'plugin-call', content: 'Synthetic result' }] } }));
    await monitor.tick(); assert.equal(snapshot.active, 1);
    await fs.appendFile(file, assistant('end_turn')); await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'ready');
    await fs.appendFile(file, pluginProgress()); await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'ready', 'Late background progress cannot restart the turn');
  } finally { monitor.dispose(); }
}));
test('unrelated, foreign and sidechain progress cannot confirm a plugin call', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, user() + pluginCall());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick();
    for (const extra of [{ parentToolUseID: 'background-server' }, { sessionId: OTHER }, { isSidechain: true }]) {
      await fs.appendFile(file, pluginProgress(extra)); await monitor.tick();
      assert.equal(snapshot.threads[0].status, 'unknown');
    }
    await fs.appendFile(file, record('user', { message: { content: '[Request interrupted by user]' } }) + pluginProgress());
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'idle');
  } finally { monitor.dispose(); }
}));
test('plugin calls override a contradictory stop reason; metadata results resolve blocking tools', () => {
  const state = { sessionId: ID };
  applyClaudeEvent(state, JSON.parse(user()));
  applyClaudeEvent(state, JSON.parse(assistant('end_turn', [{ type: 'tool_use', id: 'plugin-call', name: 'mcp__sample__run', input: {} }])));
  assert.equal(state.status, 'running');
  applyClaudeEvent(state, JSON.parse(assistant('tool_use', [{ type: 'tool_use', id: 'ask', name: 'AskUserQuestion', input: {} }])));
  assert.ok(state.pendingInputs.ask);
  applyClaudeEvent(state, JSON.parse(record('user', { isMeta: true, message: { content: [{ type: 'tool_result', tool_use_id: 'ask', content: 'Synthetic answer' }] } })));
  assert.equal(Object.keys(state.pendingInputs).length, 0);
  applyClaudeEvent(state, JSON.parse(assistant('end_turn')));
  assert.equal(state.status, 'ready'); assert.equal(state.pendingTools.size, 0);
});
test('ordinary plugin calls and results keep running through reasoning and finish explicitly', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, user());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick();
    for (const event of [pluginCall(), record('user', { message: { content: [{ type: 'tool_result', tool_use_id: 'plugin-call', content: 'Synthetic result' }] } }), assistant(null, [{ type: 'thinking', thinking: 'Synthetic reasoning' }]), pluginCall('second-call')]) {
      await fs.appendFile(file, event); await monitor.tick(); assert.equal(snapshot.active, 1);
    }
    await fs.appendFile(file, assistant('end_turn')); await monitor.tick(); assert.equal(snapshot.active, 0); assert.equal(snapshot.threads[0].status, 'ready');
  } finally { monitor.dispose(); }
}));

const toolResult = (id, extra = {}, at = Date.now()) => record('user', {
  message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Synthetic report' }] }, ...extra
}, at);
const handback = (at = Date.now()) => record('user', {
  isMeta: true, message: { content: '[Subagent hand-back] Synthetic final report' }
}, at);

const queued = (id, at, extra = {}) => record('attachment', {
  attachment: { type: 'queued_command', commandMode: 'prompt', origin: { kind: 'human' },
    source_uuid: id, delivery_id: `delivery-${id}`, timestamp: new Date(at).toISOString(), prompt: 'Private queued prompt', ...extra }
}, at);
const consumed = (id, at, extra = {}) => record('queue-operation', {
  operation: 'remove', reason: 'absorbed_mid_turn', commandUuid: id, deliveryId: `delivery-${id}`, ...extra
}, at);

test('a same-millisecond Claude queue handoff ignores the previous assistant completion replay', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  const done = record('assistant', { message: { id: 'answer-first', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }, at + 1000);
  apply(user(at)); apply(queued('next', at + 500)); apply(done); apply(consumed('next', at + 1000));
  assert.equal(state.status, 'running'); assert.equal(state.startedAt, at + 1000); assert.equal(state.finishedAt, undefined);
  apply(done);
  assert.equal(state.status, 'running'); assert.equal(state.finishedAt, undefined);
  apply(record('assistant', { message: { id: 'answer-second', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Done' }] } }, at + 2000));
  assert.equal(state.status, 'ready'); assert.equal(state.finishedAt, at + 2000);
});

test('a queued human prompt starts at consumption after completion, including a backdated attachment and reload', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + assistant('end_turn', undefined, at + 1000));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'ready');
    // Claude stores the enqueue timestamp on the attachment, then records when
    // it actually consumes it. The old timestamp must not hide this new turn.
    await fs.appendFile(file, queued('next', at + 500)); await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'ready');
    await fs.appendFile(file, consumed('next', at + 2000)); await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].status, 'running');
    assert.equal(snapshot.threads[0].startedAt, at + 2000); assert.equal(snapshot.threads[0].finishedAt, undefined);
    assert.ok(!JSON.stringify([...monitor.files.values()]).includes('Private queued prompt'));
    const reload = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
    try {
      await reload.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
      await fs.appendFile(file, assistant(null, undefined, at + 3000)); await reload.tick();
      assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].startedAt, at + 2000);
    } finally { reload.dispose(); }
    await fs.appendFile(file, assistant('end_turn', undefined, at + 4000)); await monitor.tick();
    const done = snapshot.threads[0];
    await fs.appendFile(file, consumed('next', at + 5000)); await monitor.tick();
    assert.deepEqual(snapshot.threads[0], done, 'A duplicated delivery cannot restart a completed turn');
  } finally { monitor.dispose(); }
}));

test('steering consumption keeps the active timer and foreground tools while enqueueing alone is quiet', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + pluginCall('active-call'));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, record('queue-operation', { operation: 'enqueue', content: 'Private queued prompt' }, at + 500));
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, queued('steer', at + 1000) + consumed('steer', Date.now() + 1)); await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].startedAt, at);
    assert.ok(monitor.files.get(file).pendingTools.has('active-call'));
  } finally { monitor.dispose(); }
}));

test('cancelled, unmatched, foreign and background queue deliveries cannot resurrect completed work', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  apply(user(at)); apply(assistant('end_turn', undefined, at + 100));
  const version = state.progressVersion;
  apply(record('queue-operation', { operation: 'dequeue' }, at + 200));
  apply(queued('cancelled', at + 10)); apply(consumed('cancelled', at + 300, { reason: 'cancelled' }));
  apply(consumed('cancelled', at + 400)); apply(consumed('unmatched', at + 400));
  apply(queued('background', at + 200, { commandMode: 'task-notification', origin: { kind: 'task-notification' } }));
  apply(consumed('background', at + 500));
  for (const extra of [{ sessionId: OTHER }, { isSidechain: true }]) {
    apply(record('attachment', { ...JSON.parse(queued('foreign', at + 1000)), ...extra }, at + 1000));
    apply(consumed('foreign', at + 1001));
  }
  assert.equal(state.status, 'ready'); assert.equal(state.finishedAt, at + 100);
  assert.equal(state.progressVersion, version);
});

test('late subagent results preserve completion, interruption and failure, including after reload', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  const endings = [
    ['ready', assistant('end_turn', undefined, at + 2)],
    ['idle', record('user', { message: { content: '[Request interrupted by user]' } }, at + 2)],
    ['failed', record('result', { is_error: true }, at + 2)]
  ];
  for (const [status, ending] of endings) {
    await fs.writeFile(file, user(at) + assistant('tool_use', [{ type: 'tool_use', id: 'agent', name: 'Agent', input: {} }], at + 1) + ending);
    let snapshot;
    const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
    try {
      await monitor.tick();
      const settled = snapshot.threads[0]; assert.equal(settled.status, status);
      for (const extra of [{}, { isMeta: true }]) {
        await fs.appendFile(file, handback(at + 3) + toolResult('agent', extra, at + 4) + pluginProgress({ parentToolUseID: 'agent' }));
        await monitor.tick();
        assert.deepEqual(snapshot.threads[0], settled, 'Late reports cannot restart a settled turn or change its duration');
        assert.equal(snapshot.active, 0);
      }
      const reload = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
      try { await reload.tick(); assert.deepEqual(snapshot.threads[0], settled); assert.equal(snapshot.active, 0); }
      finally { reload.dispose(); }
    } finally { monitor.dispose(); }
  }
}));

test('only outstanding foreground results confirm activity and each result is consumed once', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, user() + pluginCall());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    const state = monitor.files.get(file);
    const before = state.progressVersion;
    for (const result of [toolResult('background'), toolResult('plugin-call', { sessionId: OTHER }), toolResult('plugin-call', { isSidechain: true }), toolResult(undefined)]) {
      await fs.appendFile(file, result); await monitor.tick();
      assert.equal(snapshot.threads[0].status, 'unknown'); assert.equal(state.progressVersion, before);
      assert.ok(state.pendingTools.has('plugin-call'));
    }
    await fs.appendFile(file, toolResult('plugin-call', { isMeta: true })); await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(state.pendingTools.size, 0);
    const confirmed = state.progressVersion;
    await fs.appendFile(file, toolResult('plugin-call') + pluginProgress()); await monitor.tick();
    assert.equal(state.progressVersion, confirmed, 'Duplicate results and retired-call progress are not fresh activity');
    assert.equal(monitor.snapshot(Date.now() + 3600000).active, 1, 'An actual unfinished turn survives silence');
    await fs.appendFile(file, assistant('end_turn')); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'ready');
  } finally { monitor.dispose(); }
}));

test('results from a previous turn cannot confirm the next turn or dismiss its blocking question', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + pluginCall('previous') + assistant('end_turn') + user());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, toolResult('previous')); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, assistant('tool_use', [{ type: 'tool_use', id: 'ask', name: 'AskUserQuestion', input: {} }]));
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'waiting');
    const waiting = snapshot.threads[0];
    await fs.appendFile(file, toolResult('previous', { isMeta: true })); await monitor.tick(); assert.deepEqual(snapshot.threads[0], waiting);
    await fs.appendFile(file, toolResult('ask', { isMeta: true })); await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].replyPending, false);
    await fs.appendFile(file, assistant('end_turn')); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'ready');
  } finally { monitor.dispose(); }
}));

test('subagent handback alone stays completed; actual parent continuation publishes a newer lifecycle', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + assistant('end_turn', undefined, at + 1));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); const done = snapshot.threads[0];
    await fs.appendFile(file, handback(at + 2)); await monitor.tick(); assert.deepEqual(snapshot.threads[0], done);
    await fs.appendFile(file, assistant(null, [{ type: 'thinking', thinking: 'Synthetic parent continuation' }], at + 3));
    await monitor.tick();
    assert.equal(snapshot.active, 1); assert.equal(snapshot.threads[0].status, 'running');
    assert.ok(snapshot.threads[0].changedAt > done.finishedAt, 'The native panel must see lifecycle evidence newer than its retained completion');
    assert.equal(snapshot.threads[0].startedAt, at + 3); assert.equal(snapshot.threads[0].finishedAt, undefined);
    await fs.appendFile(file, assistant('end_turn', undefined, at + 4)); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'ready');
  } finally { monitor.dispose(); }
}));

test('out-of-order events from an older turn cannot restart completion or finish newer work', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  apply(user(at)); apply(assistant('end_turn', undefined, at + 10));
  for (const event of [user(at + 1), assistant('tool_use', [{ type: 'tool_use', id: 'old', name: 'Agent', input: {} }], at + 2), assistant(null, undefined, at + 3)]) apply(event);
  assert.equal(state.status, 'ready'); assert.equal(state.finishedAt, at + 10);
  apply(user(at + 20));
  apply(assistant('tool_use', [{ type: 'tool_use', id: 'current', name: 'Agent', input: {} }], at + 21));
  const version = state.progressVersion;
  for (const event of [assistant('end_turn', undefined, at + 10), record('result', { subtype: 'success' }, at + 11), record('result', { is_error: true }, at + 12)]) apply(event);
  assert.equal(state.status, 'running'); assert.equal(state.startedAt, at + 20); assert.ok(state.pendingTools.has('current'));
  assert.equal(state.progressVersion, version);
});

test('late timestamps within a turn do not move the last activity backwards', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  for (const event of [user(at), assistant('tool_use', [{ type: 'tool_use', id: 'agent', name: 'Agent', input: {} }], at + 1), record('progress', { parentToolUseID: 'agent' }, at + 10), toolResult('agent', {}, at + 5)]) {
    applyClaudeEvent(state, JSON.parse(event));
  }
  assert.equal(state.lastEventAt, at + 10); assert.equal(state.pendingTools.size, 0); assert.equal(state.status, 'running');
  applyClaudeEvent(state, JSON.parse(assistant('end_turn', undefined, at + 6)));
  assert.equal(state.status, 'ready'); assert.equal(state.lastEventAt, at + 10); assert.equal(state.finishedAt, at + 6);
});

test('a result without recoverable call or completion evidence stays unknown after attaching to a log tail', async () => fixture(async ({ projects, file }) => {
  await fs.writeFile(file, record('attachment', { attachment: { data: 'x'.repeat(1024 * 1024) } }) + toolResult('unknown-call'));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  monitor.setTrackedIds(new Set(['claude:' + ID]));
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown');
    await fs.appendFile(file, toolResult('unknown-call')); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'unknown'); assert.equal(snapshot.active, 0);
    await fs.appendFile(file, assistant('end_turn')); await monitor.tick(); assert.equal(snapshot.threads[0].status, 'ready');
  } finally { monitor.dispose(); }
}));

test('a still-running nested subagent and sidechain events cannot keep a completed parent running', async () => fixture(async ({ projects, dir, file }) => {
  await fs.writeFile(file, user() + assistant('end_turn'));
  const agents = path.join(dir, ID, 'subagents'); await fs.mkdir(agents, { recursive: true });
  const child = path.join(agents, 'agent-background.jsonl'); await fs.writeFile(child, user() + pluginCall());
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads.length, 1); const done = snapshot.threads[0]; assert.equal(done.status, 'ready');
    await fs.appendFile(child, pluginProgress() + pluginCall('child-next'));
    await fs.appendFile(file, record('assistant', { isSidechain: true, message: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'child-next', name: 'Bash', input: {} }] } }) + toolResult('child-next', { isSidechain: true }) + handback());
    monitor.lastDiscovery = 0; await monitor.tick();
    assert.equal(snapshot.threads.length, 1); assert.equal(snapshot.active, 0); assert.deepEqual(snapshot.threads[0], done);
  } finally { monitor.dispose(); }
}));

test('Claude waiting duration starts at the question, survives reload and advances when the oldest is answered', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  const ask = (id, name, timestamp) => assistant('tool_use', [{ type: 'tool_use', id, name, input: {} }], timestamp);
  await fs.writeFile(file, user(at) + ask('first', 'AskUserQuestion', at + 1000));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); assert.equal(snapshot.threads[0].waitingSince, at + 1000); assert.equal(snapshot.threads[0].statusReason, 'awaiting_reply');
    await fs.appendFile(file, ask('second', 'ExitPlanMode', at + 2000)); await monitor.tick();
    assert.equal(snapshot.threads[0].waitingSince, at + 1000); assert.equal(snapshot.threads[0].replyRequestedAt, at + 2000);
    await fs.appendFile(file, ask('first', 'AskUserQuestion', at + 3000)); await monitor.tick();
    assert.equal(snapshot.threads[0].waitingSince, at + 1000); assert.equal(snapshot.threads[0].replyRequestedAt, at + 2000, 'A replayed call must not reset the wait or repeat a notification');
    const reload = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
    try { await reload.tick(); assert.equal(snapshot.threads[0].waitingSince, at + 1000); } finally { reload.dispose(); }
    await fs.appendFile(file, toolResult('first', { isMeta: true }, at + 4000)); await monitor.tick();
    assert.equal(snapshot.threads[0].waitingSince, at + 2000); assert.equal(snapshot.threads[0].status, 'waiting');
    await fs.appendFile(file, toolResult('second', {}, at + 5000)); await monitor.tick();
    assert.equal(snapshot.threads[0].waitingSince, undefined); assert.equal(snapshot.threads[0].statusReason, 'turn_in_progress');
    await fs.appendFile(file, assistant('end_turn', undefined, at + 6000)); await monitor.tick();
    assert.equal(snapshot.threads[0].statusReason, 'turn_completed');
  } finally { monitor.dispose(); }
}));

const launched = (id, toolUseResult, at = Date.now()) => record('user', {
  message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Launched in background' }] }, toolUseResult
}, at);
const notification = (id, at = Date.now(), status = 'completed') => `<task-notification>\n<task-id>task-${id}</task-id>\n<tool-use-id>${id}</tool-use-id>\n<status>${status}</status>\n<summary>Synthetic report</summary>\n</task-notification>`;

test('background agents and workflows keep the parent running until each reports back', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + assistant('tool_use', [
    { type: 'tool_use', id: 'workflow', name: 'Workflow', input: {} }, { type: 'tool_use', id: 'agent', name: 'Agent', input: {} }
  ], at + 1));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick();
    await fs.appendFile(file, launched('workflow', { status: 'async_launched', taskId: 'w1', taskType: 'local_workflow' }, at + 2) +
      launched('agent', { status: 'async_launched', isAsync: true, agentId: 'a1' }, at + 3) + assistant('end_turn', undefined, at + 4));
    await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'running', 'Claude resumes this chat itself when background work reports back');
    assert.equal(snapshot.threads[0].startedAt, at); assert.equal(snapshot.threads[0].finishedAt, undefined);
    assert.equal(monitor.snapshot(Date.now() + 3600000).threads[0].status, 'running', 'Silent background work is not completion');
    await fs.appendFile(file, record('attachment', { attachment: { type: 'queued_command', commandMode: 'task-notification', prompt: notification('agent') } }, at + 5));
    await fs.appendFile(file, record('user', { origin: { kind: 'task-notification' }, message: { content: notification('workflow') } }, at + 6) + assistant('end_turn', undefined, at + 7));
    await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'ready'); assert.equal(snapshot.threads[0].startedAt, at); assert.equal(snapshot.threads[0].finishedAt, at + 7);
  } finally { monitor.dispose(); }
}));

test('one finished background task cannot complete a parent whose other task is still running', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  apply(user(at)); apply(assistant('tool_use', [{ type: 'tool_use', id: 'first', name: 'Agent', input: {} }, { type: 'tool_use', id: 'second', name: 'Agent', input: {} }], at + 1));
  apply(launched('first', { status: 'async_launched', isAsync: true }, at + 2)); apply(launched('second', { status: 'async_launched', isAsync: true }, at + 3));
  apply(assistant('end_turn', undefined, at + 4));
  apply(record('user', { origin: { kind: 'task-notification' }, message: { content: notification('first', at + 5, 'failed') } }, at + 5));
  apply(assistant('end_turn', undefined, at + 6));
  assert.equal(state.status, 'running'); assert.equal(state.startedAt, at);
  apply(record('user', { origin: { kind: 'task-notification' }, message: { content: notification('second', at + 7, 'stopped') } }, at + 7));
  apply(assistant('end_turn', undefined, at + 8));
  assert.equal(state.status, 'ready'); assert.equal(state.finishedAt, at + 8);
});

test('background shells, unrelated notifications and quoted notifications do not hold a turn open', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  apply(user(at)); apply(assistant('tool_use', [{ type: 'tool_use', id: 'server', name: 'Bash', input: {} }], at + 1));
  apply(launched('server', { stdout: '', stderr: '', backgroundTaskId: 'b1' }, at + 2));
  apply(assistant('end_turn', undefined, at + 3));
  assert.equal(state.status, 'ready', 'A long-lived background shell is not agent work');
  apply(user(at + 4)); apply(assistant('tool_use', [{ type: 'tool_use', id: 'agent', name: 'Agent', input: {} }, { type: 'tool_use', id: 'read', name: 'Read', input: {} }], at + 5));
  apply(launched('agent', { status: 'async_launched', isAsync: true }, at + 6));
  apply(record('user', { message: { content: [{ type: 'tool_result', tool_use_id: 'read', content: notification('agent') }] } }, at + 7));
  apply(user(at + 8).replace('Build a sample feature', notification('agent').replace(/\n/g, '\\n')));
  apply(assistant('end_turn', undefined, at + 9));
  assert.equal(state.status, 'running', 'Only Claude task notifications retire a background task');
});

const agentCall = (id, input = {}, name = 'Agent') => ({ type: 'tool_use', id, name, input: { prompt: 'Private agent prompt', ...input } });

test('a running foreground subagent is named until its result arrives', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  await fs.writeFile(file, user(at) + assistant('tool_use', [agentCall('review', { description: 'Review Task 3 (spec + quality)', subagent_type: 'general-purpose' })], at + 1));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick(); await fs.appendFile(file, record('progress', { parentToolUseID: 'review' }, at + 2)); await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'running');
    assert.deepEqual(snapshot.threads[0].agents, [{ kind: 'agent', label: 'Review Task 3 (spec + quality)' }]);
    assert.ok(!JSON.stringify([...monitor.files.values()], (k, v) => v instanceof Map ? [...v] : v).includes('Private agent prompt'));
    await fs.appendFile(file, toolResult('review', { toolUseResult: { status: 'completed', agentType: 'general-purpose' } }, at + 3)); await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'running'); assert.equal(snapshot.threads[0].agents, undefined);
  } finally { monitor.dispose(); }
}));

test('background agents and workflows stay named until each reports back', async () => fixture(async ({ projects, file }) => {
  const at = Date.now() - 10000;
  const batches = [0, 1, 2].map(i => agentCall(`batch-${i}`, { description: `VR allocation check batch ${i}`, run_in_background: true }));
  await fs.writeFile(file, user(at) + assistant('tool_use', [...batches, agentCall('audit', { script: 'Private workflow script' }, 'Workflow')], at + 1));
  let snapshot;
  const monitor = new ClaudeActivityMonitor(projects, () => ['/work/app'], value => { snapshot = value; });
  try {
    await monitor.tick();
    await fs.appendFile(file, [0, 1, 2].map(i => launched(`batch-${i}`, { status: 'async_launched', isAsync: true, description: `VR allocation check batch ${i}`, prompt: 'Private agent prompt' }, at + 2)).join('') +
      launched('audit', { status: 'async_launched', taskType: 'local_workflow', workflowName: 'vh-trace-audit', summary: 'Private summary' }, at + 3) + assistant('end_turn', undefined, at + 4));
    await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'running');
    assert.deepEqual(snapshot.threads[0].agents, [
      { kind: 'agent', label: 'VR allocation check batch 0' }, { kind: 'agent', label: 'VR allocation check batch 1' },
      { kind: 'agent', label: 'VR allocation check batch 2' }, { kind: 'workflow', label: 'vh-trace-audit' }
    ]);
    const retained = JSON.stringify([...monitor.files.values()], (k, v) => v instanceof Map ? [...v] : v);
    for (const secret of ['Private agent prompt', 'Private workflow script', 'Private summary']) assert.ok(!retained.includes(secret), secret);
    await fs.appendFile(file, record('user', { origin: { kind: 'task-notification' }, message: { content: notification('batch-0') + notification('audit') } }, at + 5));
    await monitor.tick();
    assert.deepEqual(snapshot.threads[0].agents.map(a => a.label), ['VR allocation check batch 1', 'VR allocation check batch 2']);
    await fs.appendFile(file, record('user', { origin: { kind: 'task-notification' }, message: { content: notification('batch-1') + notification('batch-2') } }, at + 6) + assistant('end_turn', undefined, at + 7));
    await monitor.tick();
    assert.equal(snapshot.threads[0].status, 'ready'); assert.equal(snapshot.threads[0].agents, undefined);
  } finally { monitor.dispose(); }
}));

test('subagent labels are short plain text; other tools and settled turns list no agents', () => {
  const at = Date.now() - 10000, state = { sessionId: ID };
  const apply = text => applyClaudeEvent(state, JSON.parse(text));
  apply(user(at));
  apply(assistant('tool_use', [agentCall('long', { description: 'Line\none\t' + 'x'.repeat(200) }), agentCall('blank', { description: 42 }, 'Task'), { type: 'tool_use', id: 'shell', name: 'Bash', input: { description: 'List files' } }], at + 1));
  const [long, blank] = [...state.agents.values()];
  assert.equal(state.agents.size, 2); assert.equal(long.label, ('Line one ' + 'x'.repeat(200)).slice(0, 60)); assert.deepEqual(blank, { kind: 'agent' });
  apply(record('user', { message: { content: '[Request interrupted by user]' } }, at + 2));
  assert.equal(state.status, 'idle'); assert.equal(state.agents.size, 0);
  apply(user(at + 3)); apply(assistant('tool_use', [agentCall('next', { description: 'Next agent' })], at + 4)); apply(assistant('end_turn', undefined, at + 5));
  assert.equal(state.status, 'ready'); assert.equal(state.agents.size, 0);
});
