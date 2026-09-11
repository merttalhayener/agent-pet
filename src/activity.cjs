const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

const WINDOW = 256 * 1024;
const MAX_LINE = 2 * 1024 * 1024;
const LIVE_TIMEOUT = 60 * 1000;

function progress(state, at) {
  state.lastEventAt = at || state.lastEventAt || 0;
  state.progressVersion = (state.progressVersion || 0) + 1;
}

function applyEvent(state, record) {
  const at = Date.parse(record.timestamp) || 0;
  if (record.type === 'session_meta') {
    state.id = record.payload?.id || state.id;
    state.cwd = record.payload?.cwd;
    state.source = record.payload?.source;
    return;
  }
  const p = record.payload || {};
  if (record.type === 'response_item') {
    if (p.type !== 'message' || p.role === 'assistant') progress(state, at);
    if (p.type === 'function_call' && /(?:^|\.)request_user_input(?:_async)?$/.test(p.name || '')) {
      state.pendingInputs ||= {};
      let args; try { args = JSON.parse(p.arguments); } catch {}
      state.pendingInputs[p.call_id] = { async: p.name.endsWith('_async'), remaining: Array.from({ length: Math.max(1, args?.questions?.length || 0) }, (_, i) => i) };
      state.lastEventAt = at || state.lastEventAt;
    } else if (p.type === 'function_call_output' && state.pendingInputs?.[p.call_id]) {
      let output; try { output = typeof p.output === 'string' ? JSON.parse(p.output) : p.output; } catch {}
      if (!state.pendingInputs[p.call_id].async || output?.accepted !== true) delete state.pendingInputs[p.call_id];
      state.lastEventAt = at || state.lastEventAt;
    }
    return;
  }
  if (record.type !== 'event_msg') return;
  const type = record.payload?.type;
  const status = {
    task_started: 'running', task_complete: 'ready', task_completed: 'ready',
    turn_aborted: 'idle', task_failed: 'failed'
  }[type];
  // Only explicit lifecycle events change state; silence is never "complete".
  if (type === 'user_message' && typeof p.message === 'string' && p.message.includes('<send_user_message_question_reply>')) {
    try {
      const replies = JSON.parse(p.message.split('<send_user_message_question_reply>')[1].split('</send_user_message_question_reply>')[0]);
      for (const reply of replies) {
        const [, id, index] = JSON.parse(reply.questionItemId);
        const pending = state.pendingInputs?.[id];
        if (pending) { pending.remaining = pending.remaining.filter(i => i !== index); if (!pending.remaining.length) delete state.pendingInputs[id]; }
      }
    } catch { /* Incomplete reply records are ignored. */ }
  }
  if (status) {
    state.status = status; state.changedAt = at;
    if (type === 'task_started') { state.startedAt = at; state.finishedAt = undefined; state.pendingInputs = {}; }
    else { state.finishedAt = at; if (status !== 'ready') state.pendingInputs = {}; }
  }
  if (status || ['token_count', 'agent_message', 'agent_reasoning'].includes(type)) progress(state, at);
}

function inWorkspace(cwd, roots) {
  return typeof cwd === 'string' && roots.some(root => {
    const relative = path.relative(root, cwd);
    return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
  });
}

class ActivityMonitor {
  constructor(root, getRoots, onStatus) {
    this.root = root; this.getRoots = getRoots; this.onStatus = onStatus;
    this.files = new Map(); this.candidates = []; this.lastDiscovery = 0;
    this.enabled = true; this.disposed = false; this.busy = false;
    this.titles = new Map(); this.seenThreads = new Map(); this.trackedIds = new Set();
  }
  setTrackedIds(ids) {
    for (const [file, state] of this.files) {
      if (ids.has(state.id) && !this.trackedIds.has(state.id) && (!state.startedAt || state.status === 'unknown')) this.files.delete(file);
    }
    this.trackedIds = ids;
  }
  start() { void this.tick(); this.timer = setInterval(() => void this.tick(), 1500); }
  dispose() { this.disposed = true; clearInterval(this.timer); this.files.clear(); this.seenThreads.clear(); }
  async dirs(base, count) {
    try { return (await fs.readdir(base, { withFileTypes: true })).filter(e => e.isDirectory() && /^\d+$/.test(e.name)).map(e => e.name).sort().reverse().slice(0, count); }
    catch { return []; }
  }
  async discover() {
    await this.readTitles();
    const result = [];
    const indexed = await this.indexedFiles();
    for (const file of indexed) {
      const stat = await fs.stat(file).catch(() => null);
      if (stat?.isFile()) result.push({ file, mtime: stat.mtimeMs });
    }
    for (const year of await this.dirs(this.root, 2)) {
      const yp = path.join(this.root, year);
      for (const month of await this.dirs(yp, 2)) {
        const mp = path.join(yp, month);
        for (const day of await this.dirs(mp, 3)) {
          const dp = path.join(mp, day);
          for (const name of await fs.readdir(dp).catch(() => [])) {
            if (!name.endsWith('.jsonl')) continue;
            const file = path.join(dp, name);
            const stat = await fs.stat(file).catch(() => null);
            if (stat?.isFile()) result.push({ file, mtime: stat.mtimeMs });
          }
        }
      }
    }
    this.candidates = [...new Set([...indexed, ...result.sort((a, b) => b.mtime - a.mtime).map(e => e.file)])].slice(0, 128);
    const keep = new Set(this.candidates);
    for (const file of this.files.keys()) if (!keep.has(file)) this.files.delete(file);
  }
  async indexedFiles() {
    if (process.platform !== 'darwin') return [];
    try {
      const databases = (await fs.readdir(path.dirname(this.root))).filter(n => /^state_\d+\.sqlite$/.test(n)).sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
      if (!databases.length) return [];
      const database = path.join(path.dirname(this.root), databases[0]);
      const query = "SELECT id, rollout_path, COALESCE(NULLIF(name, ''), substr(title, 1, 160)) AS name FROM threads WHERE source = 'vscode' AND archived = 0 ORDER BY updated_at DESC LIMIT 128;";
      const { stdout } = await execFileAsync('/usr/bin/sqlite3', ['-readonly', '-json', database, query], { timeout: 1500, maxBuffer: 1024 * 1024 });
      return JSON.parse(stdout || '[]').flatMap(record => {
        if (typeof record.name === 'string') this.titles.set(record.id, record.name.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 160));
        if (typeof record.rollout_path !== 'string') return [];
        const file = path.resolve(record.rollout_path);
        return inWorkspace(file, [path.resolve(this.root)]) ? [file] : [];
      });
    } catch { return []; } // Older/missing indexes fall back to date directories.
  }
  async readTitles() {
    let handle;
    try {
      handle = await fs.open(path.join(path.dirname(this.root), 'session_index.jsonl'), 'r');
      const { size } = await handle.stat();
      const start = Math.max(0, size - MAX_LINE);
      const buffer = Buffer.alloc(size - start);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      let text = buffer.subarray(0, bytesRead).toString('utf8');
      if (start > 0) text = text.slice(text.indexOf('\n') + 1);
      for (const line of text.split('\n')) {
        try {
          const record = JSON.parse(line);
          if (typeof record.id === 'string' && typeof record.thread_name === 'string') {
            this.titles.set(record.id, record.thread_name.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, 160));
          }
        } catch {}
      }
    } catch { /* A missing title index is fine; use the workspace and short ID. */ }
    finally { if (handle) await handle.close(); }
  }
  consume(state, text) {
    const lines = (state.partial + text).split('\n');
    state.partial = lines.pop();
    if (state.partial.length > MAX_LINE) state.partial = '';
    for (const line of lines) {
      try { applyEvent(state, JSON.parse(line)); } catch { /* truncated/unrelated record */ }
    }
  }
  async findLifecycle(handle, size, state) {
    let end = size, suffix = '';
    // Search backwards once when attaching to a long-running chat. Parse only
    // lifecycle records, not megabytes of tool output. Subsequent reads are incremental.
    while (end > 0 && size - end < 256 * 1024 * 1024) {
      const start = Math.max(0, end - WINDOW);
      const buffer = Buffer.alloc(end - start);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      const lines = (buffer.subarray(0, bytesRead).toString('utf8') + suffix).split('\n');
      suffix = start > 0 ? lines.shift() : '';
      if (suffix.length > MAX_LINE) suffix = '';
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line.includes('event_msg') || !/"type"\s*:\s*"(?:task_started|task_complete|task_completed|turn_aborted|task_failed)"/.test(line)) continue;
        try {
          const record = JSON.parse(line);
          if (record.type !== 'event_msg' || !['task_started', 'task_complete', 'task_completed', 'turn_aborted', 'task_failed'].includes(record.payload?.type)) continue;
          const lastEventAt = state.lastEventAt;
          if (!state.changedAt) { state.status = { task_started: 'running', task_complete: 'ready', task_completed: 'ready', turn_aborted: 'idle', task_failed: 'failed' }[record.payload.type]; state.changedAt = Date.parse(record.timestamp) || 0; if (state.status !== 'running') state.finishedAt = state.changedAt; }
          state.lastEventAt = Math.max(lastEventAt, Date.parse(record.timestamp) || 0);
          if (record.payload.type === 'task_started') { state.startedAt = Date.parse(record.timestamp) || 0; return; }
        } catch {}
      }
      end = start;
    }
    // Recent activity without a recoverable lifecycle must remain visible, but
    // it must not be labeled completed or falsely claim to be running.
    if (!state.changedAt) state.status = 'unknown';
  }
  async read(file) {
    const handle = await fs.open(file, 'r');
    try {
      const stat = await handle.stat();
      let state = this.files.get(file);
      if (!state || stat.size < state.offset || state.ino !== stat.ino) {
        state = { id: path.basename(file, '.jsonl').match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i)?.[0] || path.basename(file), offset: 0, ino: stat.ino, partial: '', status: 'idle', changedAt: 0, lastEventAt: 0, liveConfirmed: false };
        this.files.set(file, state);
        // Read only the metadata header, then tail recent activity. Never retain messages.
        const header = Buffer.alloc(Math.min(MAX_LINE, stat.size));
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        const newline = header.indexOf(10);
        if (newline >= 0 && newline < bytesRead) {
          try { applyEvent(state, JSON.parse(header.subarray(0, newline).toString('utf8'))); } catch {}
        }
        state.initializing = true;
        state.offset = Math.max(0, stat.size - WINDOW);
        state.skipFirst = state.offset > 0;
      }
      if (state.offset === stat.size) return;
      // Bound each tick, while preserving partial lines across appends.
      const length = Math.min(WINDOW, stat.size - state.offset);
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, state.offset);
      state.offset += bytesRead;
      let text = buffer.subarray(0, bytesRead).toString('utf8');
      if (state.skipFirst) {
        const newline = text.indexOf('\n');
        if (newline < 0) return;
        text = text.slice(newline + 1); state.skipFirst = false;
      }
      const before = state.progressVersion || 0;
      this.consume(state, text);
      // An old task_started record is history, not proof the reloaded host is working.
      if (!state.initializing && (state.progressVersion || 0) > before) state.liveConfirmed = true;
      if (state.initializing && !state.startedAt && state.source === 'vscode' && inWorkspace(state.cwd, this.getRoots()) && (Date.now() - state.lastEventAt < 10 * 60 * 1000 || this.trackedIds.has(state.id))) {
        await this.findLifecycle(handle, stat.size, state);
      }
      state.initializing = false;
    } finally { await handle.close(); }
  }
  snapshot(now = Date.now()) {
    const states = [...this.files.values()].filter(s => s.source === 'vscode' && inWorkspace(s.cwd, this.getRoots()));
    const active = states.filter(s => s.status === 'running' && now - s.lastEventAt < 10 * 60 * 1000);
    for (const s of states) {
      if (!s.id) continue;
      const recentUnknown = s.status === 'unknown' && now - s.lastEventAt < 10 * 60 * 1000;
      if (!this.trackedIds.has(s.id) && !this.seenThreads.has(s.id) && !active.includes(s) && !recentUnknown && (!s.changedAt || now - s.changedAt > 90000)) continue;
      const previous = this.seenThreads.get(s.id);
      if (previous && previous.lastEventAt > s.lastEventAt) continue;
      this.seenThreads.set(s.id, {
        id: s.id, cwd: s.cwd, title: this.titles.get(s.id) || `${path.basename(s.cwd)} · ${s.id.slice(-6)}`,
        status: Object.keys(s.pendingInputs || {}).length ? 'waiting' : s.status === 'running' && s.liveConfirmed === false ? 'unknown' : s.status,
        changedAt: s.changedAt, lastEventAt: s.lastEventAt, startedAt: s.startedAt, finishedAt: s.finishedAt
      });
    }
    const threads = [...this.seenThreads.values()].filter(t => inWorkspace(t.cwd, this.getRoots())).map(t => ({
      ...t, title: this.titles.get(t.id) || t.title,
      status: t.status === 'running' && now - t.lastEventAt >= LIVE_TIMEOUT ? 'unknown' : t.status
    })).sort((a, b) => a.id.localeCompare(b.id));
    const activeCount = threads.filter(t => t.status === 'running').length;
    if (threads.some(t => t.status === 'waiting')) return { status: 'waiting', active: activeCount, threads };
    if (activeCount) return { status: 'running', active: activeCount, threads };
    const latest = states.sort((a, b) => b.changedAt - a.changedAt)[0];
    if (latest && latest.status !== 'running' && now - latest.changedAt < 90000) return { status: latest.status, active: 0, threads };
    return { status: 'idle', active: 0, threads };
  }
  async tick() {
    if (this.busy || this.disposed) return;
    if (!this.enabled) { this.onStatus({ status: 'idle', active: 0, threads: [], trackingDisabled: true }); return; }
    this.busy = true;
    try {
      if (Date.now() - this.lastDiscovery > 5000) { await this.discover(); this.lastDiscovery = Date.now(); }
      for (const file of this.candidates) {
        if (this.disposed) return;
        try { await this.read(file); } catch { this.files.delete(file); }
      }
      if (!this.disposed) this.onStatus(this.snapshot());
    } finally { this.busy = false; }
  }
}
module.exports = { ActivityMonitor, applyEvent, inWorkspace };
