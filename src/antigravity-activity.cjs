const http = require('node:http');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { inWorkspace } = require('./activity.cjs');

const EXTENSION_ID = 'google.google-antigravity';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const METHOD = '/exa.language_server_pb.LanguageServerService/JetboxSubscribeToSummaries';
const MAX_FRAME = 4 * 1024 * 1024;
const clean = value => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
const timestamp = value => {
  if (typeof value !== 'string') return 0;
  const at = Date.parse(value);
  return Number.isFinite(at) && at > 0 ? at : 0;
};

// The official VS Code extension exports the port and CSRF token of this
// window's local backend. Never activate/download an agent merely to observe it.
function antigravityConnection(vscode) {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  if (!extension?.isActive) return undefined;
  const { port, csrfToken } = extension.exports || {};
  if (!Number.isInteger(port) || port < 1 || port > 65535 || typeof csrfToken !== 'string' || !csrfToken || csrfToken.length > 512 || /[\r\n]/.test(csrfToken)) return undefined;
  return { port, csrfToken };
}

// Connect uses five-byte envelope headers even when its payload is JSON.
// Keep a single local subscription, including every initial batch and deletions.
// There are no mutating RPCs, remote hosts, redirects or credentials on disk.
function subscribeSummaries(connection, onMessage, onClose) {
  let stopped = false, buffer = Buffer.alloc(0), response, request, startup;
  const close = notify => {
    if (stopped) return;
    stopped = true; clearTimeout(startup); request?.destroy(); response?.destroy();
    if (notify) onClose();
  };
  request = http.request({ hostname: '127.0.0.1', port: connection.port, path: METHOD, method: 'POST', agent: false,
    headers: { 'content-type': 'application/connect+json', 'connect-protocol-version': '1', 'x-codeium-csrf-token': connection.csrfToken } }, res => {
    response = res;
    if (res.statusCode !== 200 || !/^application\/connect\+json(?:;|$)/i.test(res.headers['content-type'] || '')) { close(true); return; }
    res.on('data', chunk => {
      if (stopped) return;
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 5) {
        const flags = buffer[0], size = buffer.readUInt32BE(1);
        if (size > MAX_FRAME || flags !== 0) { close(true); return; }
        if (buffer.length < size + 5) break;
        const payload = buffer.subarray(5, size + 5); buffer = buffer.subarray(size + 5);
        try {
          const message = JSON.parse(payload.toString('utf8'));
          if (!message || typeof message !== 'object' || Array.isArray(message)) { close(true); return; }
          clearTimeout(startup); onMessage(message);
        } catch { close(true); return; }
      }
      if (buffer.length > MAX_FRAME + 5) close(true);
    });
    res.on('error', () => close(true)); res.on('end', () => close(true)); res.on('close', () => close(true));
  });
  request.on('error', () => close(true));
  startup = setTimeout(() => close(true), 5000); startup.unref?.();
  request.end(Buffer.from([0, 0, 0, 0, 2, 123, 125]));
  return { dispose: () => close(false) };
}

function summaryState(session, summary, roots, previous, now = Date.now()) {
  if (!UUID.test(session) || !summary || typeof summary !== 'object' || Array.isArray(summary) ||
      summary.cloud === true || summary.annotations?.archived === true ||
      summary.trajectoryMetadata?.parentConversationId || summary.trajectoryMetadata?.nestingDepth > 0) return undefined;
  const uris = (Array.isArray(summary.workspaces) ? summary.workspaces : []).map(w => w?.workspaceFolderAbsoluteUri);
  uris.push(...(Array.isArray(summary.trajectoryMetadata?.workspaceUris) ? summary.trajectoryMetadata.workspaceUris : []));
  let cwd;
  for (const uri of uris.slice(0, 32)) {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'file:' || url.hostname || url.search || url.hash) continue;
      const directory = fileURLToPath(url);
      if (inWorkspace(directory, roots)) { cwd = directory; break; }
    } catch {}
  }
  if (!cwd) return undefined;
  const at = timestamp(summary.lastModifiedTime), inputAt = timestamp(summary.lastUserInputTime);
  if (!at || at > now + 5000 || inputAt > now + 5000) return undefined;
  if (previous && (at < previous.lastEventAt || inputAt < (previous.inputAt || 0))) return previous;
  const interrupted = summary.killed === true || summary.interrupted === true;
  const run = summary.status;
  const active = ['CASCADE_RUN_STATUS_RUNNING', 'CASCADE_RUN_STATUS_CANCELING', 'CASCADE_RUN_STATUS_BUSY'].includes(run) || summary.notFullyIdle === true || summary.hasActiveChildren === true;
  if (previous?.finishedAt && active && at <= previous.finishedAt && inputAt <= previous.inputAt) return previous;
  const waiting = interrupted || !active ? [] : (Array.isArray(summary.waitingSteps) ? summary.waitingSteps : []).slice(0, 64)
    .filter(w => w && typeof w === 'object' && !Array.isArray(w) && Number.isInteger(w.stepIndex ?? 0) && (w.stepIndex ?? 0) >= 0);
  const requests = {};
  for (const step of waiting) {
    const key = String(step.stepIndex ?? 0), requested = timestamp(step.step?.metadata?.createdAt);
    const prior = inputAt === previous?.inputAt ? previous?.waitingRequests?.[key] : undefined;
    requests[key] = prior || (requested > 0 && requested <= now + 5000 ? requested : at);
  }
  const requestTimes = Object.values(requests);
  const waitingSince = requestTimes.length ? Math.min(...requestTimes) : undefined;
  const requestedAt = requestTimes.length ? Math.max(...requestTimes, inputAt === previous?.inputAt && previous.replyPending ? previous.replyRequestedAt || 0 : 0) : undefined;
  const status = interrupted ? 'idle' : waiting.length ? 'waiting' : active ? 'running' : run === 'CASCADE_RUN_STATUS_IDLE' ? (inputAt ? 'ready' : 'idle') : 'unknown';
  // Persisted summaries can outlive a crashed execution. On attachment/reconnect,
  // an open turn needs a newer lifecycle/activity update before claiming running.
  const liveConfirmed = waiting.length > 0 || previous?.liveConfirmed === true || Boolean(previous && (at > previous.lastEventAt || inputAt > previous.inputAt || status !== previous.rawStatus));
  let startedAt = inputAt || timestamp(summary.createdTime) || at;
  if (previous?.finishedAt && ['running', 'waiting'].includes(status) && at > previous.finishedAt && startedAt <= previous.finishedAt) startedAt = at;
  else if (previous?.startedAt && (inputAt === previous.inputAt || (!previous.finishedAt && ['running', 'waiting'].includes(previous.rawStatus) && ['running', 'waiting'].includes(status)))) startedAt = previous.startedAt;
  const changedAt = previous && status === previous.rawStatus && startedAt === previous.startedAt && waitingSince === previous.waitingSince ? previous.changedAt : (waiting.length ? waitingSince : at);
  // Jetbox keys identify conversations; trajectoryId identifies their current
  // execution trajectory and can differ from the conversation's routing UUID.
  return { id: `antigravity:${session}`, agent: 'antigravity', cwd,
    title: clean(summary.summary) || `${path.basename(cwd)} · ${session.slice(-6)}`,
    rawStatus: status, status, liveConfirmed, inputAt, waitingRequests: requests,
    replyPending: waiting.length > 0, waitingSince, replyRequestedAt: requestedAt,
    changedAt, lastEventAt: at, startedAt,
    finishedAt: ['ready', 'idle'].includes(status) ? (previous?.rawStatus === status && previous.startedAt === startedAt ? previous.finishedAt : at) : undefined,
    statusReason: interrupted ? 'turn_interrupted' : waiting.length ? 'awaiting_reply' : active ? (run === 'CASCADE_RUN_STATUS_IDLE' ? 'background_tasks_active' : 'turn_in_progress') : inputAt && status === 'ready' ? 'agent_idle' : 'no_turn_evidence' };
}

class AntigravityActivityMonitor {
  constructor(getRoots, onStatus, options = {}) {
    this.getRoots = getRoots; this.onStatus = onStatus;
    this.getConnection = options.getConnection || (() => undefined);
    this.subscribe = options.subscribe || subscribeSummaries;
    this.states = new Map(); this.trackedIds = new Set(); this.seen = new Set(); this._enabled = true; this.retryAt = 0;
  }
  get enabled() { return this._enabled; }
  set enabled(value) { this._enabled = value; if (!value) { this.disconnect(); this.target = undefined; this.retryAt = 0; } }
  setTrackedIds(ids) { this.trackedIds = ids; }
  disconnect() {
    this.generation = (this.generation || 0) + 1;
    this.subscription?.dispose(); this.subscription = undefined; this.connection = undefined; this.connected = false;
    for (const state of this.states.values()) state.liveConfirmed = false;
  }
  dispose() { this.disposed = true; this.disconnect(); this.target = undefined; }
  receive(message) {
    if (this.disposed || !this.enabled) return;
    this.connected = true;
    for (const session of (Array.isArray(message.deletes) ? message.deletes : []).slice(0, 10000)) if (UUID.test(session)) { this.states.delete(`antigravity:${session}`); this.seen.delete(`antigravity:${session}`); }
    if (message.updates && typeof message.updates === 'object' && !Array.isArray(message.updates)) for (const [session, summary] of Object.entries(message.updates).slice(0, 10000)) {
      const id = `antigravity:${session}`, previous = this.states.get(id);
      const state = summaryState(session, summary, this.getRoots(), previous);
      if (state) this.states.set(id, state); else { this.states.delete(id); this.seen.delete(id); }
    }
    // Keep recent/current workspace metadata only; transcript and tool payloads
    // are discarded as soon as each envelope has been reduced.
    if (this.states.size > 1000) for (const id of [...this.states].sort((a, b) => b[1].lastEventAt - a[1].lastEventAt).slice(1000).map(([id]) => id)) { this.states.delete(id); this.seen.delete(id); }
    this.publish();
  }
  publish(now = Date.now()) {
    if (this.disposed) return;
    if (!this.enabled) { this.onStatus({ status: 'idle', active: 0, threads: [], trackingDisabled: true }); return; }
    const threads = [];
    for (const state of this.states.values()) {
      if (!inWorkspace(state.cwd, this.getRoots())) continue;
      if (!this.seen.has(state.id) && !this.trackedIds.has(state.id) && now - state.lastEventAt > (['running', 'waiting', 'unknown'].includes(state.rawStatus) ? 600000 : 90000)) continue;
      this.seen.add(state.id);
      const { rawStatus, liveConfirmed, inputAt, waitingRequests, ...thread } = state;
      if (['running', 'waiting'].includes(rawStatus) && (!this.connected || !liveConfirmed)) {
        thread.status = 'unknown'; thread.statusReason = this.connected ? 'awaiting_activity' : 'source_unavailable';
        thread.replyPending = false; thread.waitingSince = undefined; thread.replyRequestedAt = undefined;
      }
      threads.push(thread);
    }
    threads.sort((a, b) => a.id.localeCompare(b.id));
    const active = threads.filter(t => t.status === 'running').length;
    this.onStatus({ status: threads.some(t => t.status === 'waiting') ? 'waiting' : active ? 'running' : threads.length && threads.every(t => t.status === 'ready') ? 'ready' : 'idle', active, threads });
  }
  async tick() {
    if (this.disposed || this.busy) return;
    this.busy = true;
    try {
      if (!this.enabled) { this.publish(); return; }
      const connection = await this.getConnection();
      if (this.disposed || !this.enabled) return;
      if (!connection) { this.disconnect(); this.target = undefined; this.publish(); return; }
      const rootsKey = [...this.getRoots()].sort().join('\0');
      if (this.target?.port !== connection.port || this.target?.csrfToken !== connection.csrfToken || this.rootsKey !== rootsKey) {
        this.disconnect(); this.retryAt = 0; this.rootsKey = rootsKey; this.target = connection;
      }
      if (!this.subscription && Date.now() >= this.retryAt) {
        this.connection = connection;
        const generation = this.generation = (this.generation || 0) + 1;
        this.subscription = this.subscribe(connection, message => {
          if (this.generation === generation) this.receive(message);
        }, () => {
          if (this.generation !== generation || this.disposed) return;
          this.disconnect(); this.retryAt = Date.now() + 5000; this.publish();
        });
      }
      this.publish();
    } catch { this.disconnect(); this.retryAt = Date.now() + 5000; this.publish(); }
    finally { this.busy = false; }
  }
}

module.exports = { AntigravityActivityMonitor, antigravityConnection, summaryState, subscribeSummaries, EXTENSION_ID };
