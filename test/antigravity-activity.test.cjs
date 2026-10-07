const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { AntigravityActivityMonitor, antigravityConnection, summaryState, subscribeSummaries } = require('../src/antigravity-activity.cjs');

const session = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const id = `antigravity:${session}`, now = Date.now(), iso = at => new Date(at).toISOString();
const summary = (at = now, extra = {}) => ({ trajectoryId: session, summary: 'Review changes', status: 'CASCADE_RUN_STATUS_RUNNING',
  lastModifiedTime: iso(at), lastUserInputTime: iso(now - 5000), createdTime: iso(now - 20000),
  workspaces: [{ workspaceFolderAbsoluteUri: 'file:///project/app' }], ...extra });
const step = (index, at) => ({ stepIndex: index, step: { metadata: { createdAt: iso(at) }, content: 'Do not retain this', toolArgs: { secret: 'Do not retain this' } } });
function fixture() {
  let connection = { port: 12345, csrfToken: 'not-a-real-token' }, roots = ['/project'], current, result;
  const subscriptions = [];
  const monitor = new AntigravityActivityMonitor(() => roots, value => { result = value; }, {
    getConnection: () => connection,
    subscribe: (c, receive, close) => { current = { c, receive, close, disposed: false, dispose() { this.disposed = true; } }; subscriptions.push(current); return current; }
  });
  return { monitor, subscriptions, get result() { return result; }, get current() { return current; }, set connection(value) { connection = value; }, set roots(value) { roots = value; },
    send(value) { current.receive(value); }, row() { return result.threads.find(t => t.id === id); } };
}

test('official API discovery is local, passive and rejects invalid connection metadata', () => {
  let activations = 0;
  const ext = { isActive: false, activate: () => { activations++; }, exports: { port: 1234, csrfToken: 'secret' } };
  const vscode = { extensions: { getExtension: name => { assert.equal(name, 'google.google-antigravity'); return ext; } } };
  assert.equal(antigravityConnection(vscode), undefined); assert.equal(activations, 0);
  ext.isActive = true; assert.deepEqual(antigravityConnection(vscode), { port: 1234, csrfToken: 'secret' });
  for (const port of [0, 65536, -1, '1234', NaN]) { ext.exports.port = port; assert.equal(antigravityConnection(vscode), undefined); }
  ext.exports.port = 1234; ext.exports.csrfToken = 'bad\r\ntoken'; assert.equal(antigravityConnection(vscode), undefined);
});

test('filters foreign workspaces, subagents, archived, cloud and malformed summaries', () => {
  for (const extra of [
    { workspaces: [{ workspaceFolderAbsoluteUri: 'file:///project-other' }] },
    { workspaces: [{ workspaceFolderAbsoluteUri: 'https://example.com/project' }] },
    { workspaces: [{ workspaceFolderAbsoluteUri: 'file://remote/project' }] },
    { workspaces: [{ workspaceFolderAbsoluteUri: 'file:///project?query=x' }] },
    { trajectoryMetadata: { parentConversationId: other } }, { trajectoryMetadata: { nestingDepth: 2 } },
    { annotations: { archived: true } }, { cloud: true },
    { lastModifiedTime: 'invalid' }, { lastModifiedTime: iso(now + 100000) }
  ]) assert.equal(summaryState(session, summary(now, extra), ['/project'], undefined, now), undefined);
  assert.equal(summaryState('bad', summary(), ['/project'], undefined, now), undefined);
  const row = summaryState(session, summary(now, { summary: 'Review\n changes\0', trajectoryMetadata: { workspaceUris: ['file:///project/app'] }, workspaces: [] }), ['/project'], undefined, now);
  assert.equal(row.title, 'Review changes'); assert.equal(row.cwd, '/project/app');
  assert.equal(summaryState(session, summary(now, { trajectoryId: other }), ['/project'], undefined, now).id, id, 'Conversation key and execution trajectory have distinct identities');
});

test('initial stale running state needs new activity; explicit completion stays completed', async () => {
  const f = fixture(); try {
    await f.monitor.tick(); f.send({ updates: { [session]: summary(now - 2000) } });
    assert.equal(f.row().status, 'unknown'); assert.equal(f.row().statusReason, 'awaiting_activity');
    f.send({ updates: { [session]: summary(now - 1000) } }); assert.equal(f.row().status, 'running'); assert.equal(f.result.active, 1);
    f.send({ updates: { [session]: summary(now, { status: 'CASCADE_RUN_STATUS_IDLE' }) } });
    assert.equal(f.row().status, 'ready'); assert.equal(f.row().finishedAt, now);
    f.send({ updates: { [session]: summary(now - 1000, { hasActiveChildren: true }) } }); assert.equal(f.row().status, 'ready');
    f.send({ updates: { [session]: summary(now, { hasActiveChildren: true }) } }); assert.equal(f.row().status, 'ready');
    f.send({ updates: { [other]: { ...summary(), trajectoryId: other, trajectoryMetadata: { parentConversationId: session } } } });
    assert.equal(f.result.threads.length, 1); assert.equal(f.row().status, 'ready');
  } finally { f.monitor.dispose(); }
});

test('waiting time survives duplicate updates and partial answers; replies and completion clear it', async () => {
  const f = fixture(); try {
    await f.monitor.tick(); f.send({ updates: { [session]: summary(now - 3000) } });
    f.send({ updates: { [session]: summary(now - 2000, { waitingSteps: [step(0, now - 2000), step(2, now - 1000)] }) } });
    assert.equal(f.row().status, 'waiting'); assert.equal(f.row().waitingSince, now - 2000); assert.equal(f.row().replyRequestedAt, now - 1000);
    f.send({ updates: { [session]: summary(now - 1000, { waitingSteps: [step(0, now - 2000), step(2, now - 1000)] }) } });
    assert.equal(f.row().waitingSince, now - 2000); assert.equal(f.row().replyRequestedAt, now - 1000);
    f.send({ updates: { [session]: summary(now, { waitingSteps: [step(2, now - 1000)] }) } }); assert.equal(f.row().waitingSince, now - 1000);
    assert.ok(!JSON.stringify(f.result).includes('Do not retain this')); assert.ok(!JSON.stringify(f.result).includes('token'));
    f.send({ updates: { [session]: summary(now + 1) } }); assert.equal(f.row().status, 'running'); assert.equal(f.row().replyPending, false);
    f.send({ updates: { [session]: summary(now + 2, { status: 'CASCADE_RUN_STATUS_IDLE', waitingSteps: [step(2, now - 1000)] }) } });
    assert.equal(f.row().status, 'ready'); assert.equal(f.row().waitingSince, undefined);
  } finally { f.monitor.dispose(); }
});

test('interruption overrides waiting and background work; fully idle is required to finish', () => {
  for (const flag of ['interrupted', 'killed']) {
    const row = summaryState(session, summary(now, { [flag]: true, waitingSteps: [step(1, now)], hasActiveChildren: true }), ['/project'], undefined, now);
    assert.equal(row.status, 'idle'); assert.equal(row.replyPending, false);
  }
  const row = summaryState(session, summary(now, { status: 'CASCADE_RUN_STATUS_IDLE', notFullyIdle: true }), ['/project'], undefined, now);
  assert.equal(row.status, 'running'); assert.equal(row.finishedAt, undefined); assert.equal(row.statusReason, 'background_tasks_active');
  const unknown = summaryState(session, summary(now, { status: 'FUTURE_STATUS' }), ['/project'], undefined, now);
  assert.equal(unknown.status, 'unknown');
});

test('an already outstanding request is visible on attachment and missing timestamps survive partial answers', async () => {
  const f = fixture(); try {
    await f.monitor.tick();
    f.send({ updates: { [session]: summary(now - 2000, { waitingSteps: [{ step: {} }, { stepIndex: 2, step: {} }] }) } });
    assert.equal(f.row().status, 'waiting'); assert.equal(f.row().waitingSince, now - 2000);
    f.send({ updates: { [session]: summary(now - 1000, { waitingSteps: [{ stepIndex: 2, step: {} }] }) } });
    assert.equal(f.row().waitingSince, now - 2000); assert.equal(f.row().replyRequestedAt, now - 2000);
  } finally { f.monitor.dispose(); }
});

test('changing workspace roots replays the subscription and ignores the previous workspace stream', async () => {
  const f = fixture(); try {
    await f.monitor.tick(); f.send({ updates: { [session]: summary(now, { status: 'CASCADE_RUN_STATUS_IDLE' }) } });
    const old = f.current; f.roots = ['/other']; await f.monitor.tick();
    assert.equal(f.subscriptions.length, 2); assert.ok(old.disposed); assert.equal(f.result.threads.length, 0);
    old.receive({ updates: { [session]: summary(now + 1) } }); assert.equal(f.result.threads.length, 0);
    f.send({ updates: { [session]: summary(now + 1, { workspaces: [{ workspaceFolderAbsoluteUri: 'file:///other' }], lastUserInputTime: iso(now + 1) }) } });
    assert.equal(f.row().cwd, '/other');
  } finally { f.monitor.dispose(); }
});

test('a genuine parent resume and a new user turn supersede retained completion', () => {
  const done = summaryState(session, summary(now, { status: 'CASCADE_RUN_STATUS_IDLE' }), ['/project'], undefined, now);
  const resumed = summaryState(session, summary(now + 100), ['/project'], done, now + 100);
  assert.equal(resumed.status, 'running'); assert.equal(resumed.startedAt, now + 100); assert.equal(resumed.changedAt, now + 100); assert.equal(resumed.finishedAt, undefined);
  const next = summaryState(session, summary(now + 200, { lastUserInputTime: iso(now + 150) }), ['/project'], done, now + 200);
  assert.equal(next.startedAt, now + 150);
  assert.equal(summaryState(session, summary(now + 300, { lastUserInputTime: iso(now - 10000) }), ['/project'], next, now + 300), next);
});

test('disconnect and token rotation withdraw evidence and ignore callbacks from old streams', async () => {
  const f = fixture(); try {
    await f.monitor.tick(); f.send({ updates: { [session]: summary(now - 1000) } }); f.send({ updates: { [session]: summary(now) } });
    assert.equal(f.row().status, 'running'); const old = f.current;
    f.connection = undefined; await f.monitor.tick(); assert.equal(f.row().status, 'unknown'); assert.equal(f.row().statusReason, 'source_unavailable'); assert.ok(old.disposed);
    old.receive({ updates: { [session]: summary(now + 1) } }); assert.equal(f.row().statusReason, 'source_unavailable');
    f.connection = { port: 54321, csrfToken: 'rotated' }; await f.monitor.tick(); assert.equal(f.subscriptions.length, 2);
    f.send({ updates: { [session]: summary(now) } }); assert.equal(f.row().status, 'unknown');
    old.close(); assert.equal(f.current.disposed, false);
    f.send({ updates: { [session]: summary(now + 2) } }); assert.equal(f.row().status, 'running');
    f.monitor.enabled = false; await f.monitor.tick(); assert.equal(f.result.threads.length, 0); assert.equal(f.result.trackingDisabled, true);
    assert.ok(f.current.disposed);
  } finally { f.monitor.dispose(); }
});

test('multiple initial batches, deletions and restored tracked history are handled', async () => {
  const f = fixture(); try {
    f.monitor.setTrackedIds(new Set([id])); await f.monitor.tick();
    f.send({ updates: { [session]: summary(now - 1000000, { status: 'CASCADE_RUN_STATUS_IDLE', lastUserInputTime: iso(now - 1010000) }) } });
    assert.equal(f.result.threads.length, 1);
    f.send({ updates: { [other]: { ...summary(now - 1000), trajectoryId: other } } }); assert.equal(f.result.threads.length, 2);
    f.send({ deletes: [session] }); assert.equal(f.result.threads.length, 1); assert.equal(f.monitor.states.has(id), false);
    f.send({ updates: { [other]: { ...summary(), trajectoryId: other, annotations: { archived: true } } } }); assert.equal(f.result.threads.length, 0);
  } finally { f.monitor.dispose(); }
});

test('a closed stream backs off for the same backend but a new token reconnects immediately', async () => {
  const f = fixture(); try {
    await f.monitor.tick(); f.send({ updates: { [session]: summary(now - 1000) } }); f.send({ updates: { [session]: summary(now) } });
    f.current.close(); assert.equal(f.row().status, 'unknown');
    await f.monitor.tick(); await f.monitor.tick(); assert.equal(f.subscriptions.length, 1);
    f.connection = { port: 12345, csrfToken: 'new-token' }; await f.monitor.tick(); assert.equal(f.subscriptions.length, 2);
  } finally { f.monitor.dispose(); }
});

const envelope = value => { const body = Buffer.from(JSON.stringify(value)), header = Buffer.alloc(5); header.writeUInt32BE(body.length, 1); return Buffer.concat([header, body]); };
async function serverFixture(handler) {
  const sockets = new Set(), server = http.createServer(handler);
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { port: server.address().port, close: async () => { for (const s of sockets) s.destroy(); await new Promise(r => server.close(r)); } };
}

test('real Connect transport handles fragmented frames and every batch without retaining credentials', async () => {
  let serverBody, serverPath, token, closeCount = 0;
  const f = await serverFixture((req, res) => {
    serverPath = req.url; token = req.headers['x-codeium-csrf-token'];
    req.on('data', b => { serverBody = b; });
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/connect+json' });
      const a = envelope({}), b = envelope({ updates: { [session]: summary() } });
      res.write(a.subarray(0, 3)); setImmediate(() => { res.write(Buffer.concat([a.subarray(3), b])); });
    });
  });
  let subscription;
  try {
    const messages = [], received = new Promise((resolve, reject) => {
      subscription = subscribeSummaries({ port: f.port, csrfToken: 'local-only' }, m => { messages.push(m); if (messages.length === 2) resolve(); }, () => { closeCount++; reject(Error('Unexpected close')); });
    });
    await received; assert.equal(messages.length, 2); assert.deepEqual(messages[0], {}); assert.equal(messages[1].updates[session].trajectoryId, session);
    assert.equal(serverPath, '/exa.language_server_pb.LanguageServerService/JetboxSubscribeToSummaries');
    assert.equal(token, 'local-only'); assert.deepEqual(serverBody, Buffer.from([0, 0, 0, 0, 2, 123, 125]));
    subscription.dispose(); assert.equal(closeCount, 0);
  } finally { subscription?.dispose(); await f.close(); }
});

for (const kind of ['redirect', 'compressed', 'oversized', 'malformed', 'end', 'disconnect']) test(`Connect ${kind} withdraws availability exactly once`, async () => {
  const f = await serverFixture((req, res) => {
    req.resume(); req.on('end', () => {
      if (kind === 'redirect') { res.writeHead(302, { location: 'https://example.com' }); res.end(); return; }
      res.writeHead(200, { 'content-type': 'application/connect+json' });
      const b = envelope({ updates: {} });
      if (kind === 'compressed') b[0] = 1;
      if (kind === 'oversized') b.writeUInt32BE(5 * 1024 * 1024, 1);
      if (kind === 'malformed') b[5] = 255;
      if (kind === 'end') b[0] = 2;
      if (kind === 'disconnect') { res.end(); return; }
      res.end(b);
    });
  });
  let subscription, closes = 0;
  try {
    await new Promise(resolve => { subscription = subscribeSummaries({ port: f.port, csrfToken: 'local-only' }, () => assert.fail('Unexpected payload'), () => { closes++; resolve(); }); });
    await new Promise(resolve => setImmediate(resolve)); assert.equal(closes, 1);
  } finally { subscription?.dispose(); await f.close(); }
});
