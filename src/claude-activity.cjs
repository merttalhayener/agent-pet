const fs = require('node:fs/promises');
const path = require('node:path');
const { ActivityMonitor, inWorkspace } = require('./activity.cjs');
const WINDOW = 256 * 1024;
const MAX_LINE = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const clean = text => text.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

function applyClaudeEvent(s, r) {
  if (r.isSidechain || (r.sessionId && r.sessionId !== s.sessionId)) return;
  if (typeof r.cwd === 'string') s.cwd = r.cwd;
  if (typeof r.entrypoint === 'string') s.entrypoint = r.entrypoint;
  const named = r.type === 'custom-title' ? r.customTitle : r.type === 'ai-title' ? r.aiTitle : undefined;
  const priority = r.type === 'custom-title' ? 3 : 2;
  if (typeof named === 'string' && clean(named) && priority >= (s.titlePriority || 0)) { s.title = clean(named); s.titlePriority = priority; }
  const at = Date.parse(r.timestamp);
  if (!Number.isFinite(at)) return;
  // Delayed records from an older turn cannot overwrite a newer start/finish.
  if (at < Math.max(s.changedAt || 0, s.startedAt || 0, s.finishedAt || 0)) return;
  const m = r.message || {}, content = Array.isArray(m.content) ? m.content : [];
  const progress = () => { s.lastEventAt = Math.max(s.lastEventAt || 0, at); s.progressVersion = (s.progressVersion || 0) + 1; };
  const start = () => { s.status = 'running'; s.changedAt = at; s.startedAt = at; s.finishedAt = undefined; s.pendingInputs = {}; s.lastQuestionAt = undefined; s.pendingTools = new Set(); };
  const finish = status => { s.status = status; s.changedAt = at; s.finishedAt = at; s.pendingInputs = {}; s.lastQuestionAt = undefined; s.pendingTools = new Set(); progress(); };
  if (r.type === 'progress') {
    // Only progress belonging to an unfinished foreground call confirms activity.
    // Late background-server/subagent updates must not resurrect a finished turn.
    const id = r.parentToolUseID || r.toolUseID;
    if (s.status === 'running' && s.pendingTools?.has(id)) progress();
    return;
  }
  if (r.type === 'user') {
    const results = content.filter(c => c.type === 'tool_result');
    if (results.length) {
      // Background/subagent results (including metadata and duplicate results)
      // are not new turns. Only an outstanding foreground call proves progress.
      const matched = s.status === 'running' ? results.filter(c => c.tool_use_id && s.pendingTools?.has(c.tool_use_id)) : [];
      if (!matched.length) return;
      for (const c of matched) {
        delete s.pendingInputs?.[c.tool_use_id];
        s.pendingTools?.delete(c.tool_use_id);
      }
      progress(); return;
    }
    if (r.isMeta) return;
    const message = typeof m.content === 'string' ? m.content : content.filter(c => c.type === 'text').map(c => c.text || '').join(' ');
    if (!message.trim()) return;
    if (/^\[Request interrupted by user/.test(message)) { finish('idle'); return; }
    if (!s.titlePriority) { s.title = clean(message); s.titlePriority = 1; }
    start(); progress();
  } else if (r.type === 'assistant') {
    if (r.isAbortedMidStream) { finish('idle'); return; }
    s.pendingInputs ||= {};
    const calls = content.filter(c => c.type === 'tool_use');
    if (['end_turn', 'stop_sequence'].includes(m.stop_reason) && !calls.length && !Object.keys(s.pendingInputs).length) { finish('ready'); return; }
    // The parent can genuinely resume after an asynchronous subagent report.
    // Publish a newer lifecycle so the panel can supersede its retained finish.
    if (s.status !== 'running') start();
    s.pendingTools ||= new Set();
    for (const c of calls) if (c.id) s.pendingTools.add(c.id);
    for (const c of calls) if (['AskUserQuestion', 'ExitPlanMode'].includes(c.name) && c.id && !s.pendingInputs[c.id]) {
      s.pendingInputs[c.id] = { requestedAt: at }; s.lastQuestionAt = at;
    }
    s.status = 'running'; s.finishedAt = undefined; progress();
  } else if (r.type === 'result') {
    if (r.is_error === true) finish('failed');
    else if (r.subtype === 'success') finish('ready');
  }
}

class ClaudeActivityMonitor extends ActivityMonitor {
  async discover() {
    const found = [];
    for (const project of await fs.readdir(this.root, { withFileTypes: true }).catch(() => [])) {
      if (!project.isDirectory()) continue;
      const dir = path.join(this.root, project.name);
      for (const name of await fs.readdir(dir).catch(() => [])) {
        if (!name.endsWith('.jsonl') || !UUID.test(name.slice(0, -6))) continue;
        const file = path.join(dir, name), stat = await fs.stat(file).catch(() => null);
        if (stat?.isFile()) found.push({ file, mtime: stat.mtimeMs });
      }
    }
    this.candidates = found.sort((a, b) => b.mtime - a.mtime).slice(0, 128).map(f => f.file);
    for (const f of this.files.keys()) if (!this.candidates.includes(f)) this.files.delete(f);
  }
  consume(s, text) {
    const lines = (s.partial + text).split('\n'); s.partial = lines.pop();
    if (s.partial.length > MAX_LINE) s.partial = '';
    for (const line of lines) { try { applyClaudeEvent(s, JSON.parse(line)); } catch {} }
  }
  async read(file) {
    const handle = await fs.open(file, 'r');
    try {
      const stat = await handle.stat(); let s = this.files.get(file);
      if (!s || s.offset > stat.size || s.ino !== stat.ino) {
        const sessionId = path.basename(file, '.jsonl');
        if (!UUID.test(sessionId)) return;
        s = { sessionId, id: `claude:${sessionId}`, source: 'vscode', status: 'unknown', offset: 0, ino: stat.ino, partial: '', changedAt: 0, lastEventAt: 0, liveConfirmed: false, initializing: true };
        this.files.set(file, s);
        // Read the beginning for workspace/title metadata, then attach to the tail.
        // Never retain message bodies or tool arguments.
        if (stat.size > WINDOW) {
          const head = Buffer.alloc(WINDOW); const { bytesRead } = await handle.read(head, 0, WINDOW, 0);
          for (const line of head.subarray(0, bytesRead).toString('utf8').split('\n')) {
            try {
              const r = JSON.parse(line);
              if (r.isSidechain || (r.sessionId && r.sessionId !== sessionId)) continue;
              if (typeof r.cwd === 'string') s.cwd = r.cwd;
              if (typeof r.entrypoint === 'string') s.entrypoint = r.entrypoint;
              if (r.type === 'ai-title' || r.type === 'custom-title') applyClaudeEvent(s, r);
            } catch {}
          }
        }
        s.offset = Math.max(0, stat.size - WINDOW); s.skipFirst = s.offset > 0;
      }
      if (s.offset === stat.size) return;
      const buffer = Buffer.alloc(Math.min(WINDOW, stat.size - s.offset));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, s.offset); s.offset += bytesRead;
      let text = buffer.subarray(0, bytesRead).toString('utf8');
      if (s.skipFirst) { const at = text.indexOf('\n'); if (at < 0) return; text = text.slice(at + 1); s.skipFirst = false; }
      const before = s.progressVersion || 0; this.consume(s, text);
      if (!s.initializing && (s.progressVersion || 0) > before) s.liveConfirmed = true;
      s.initializing = false;
      // CLI logs appear only when an integrated terminal of this window owns them;
      // otherwise their click destination cannot be guaranteed.
      s.source = s.entrypoint === 'claude-vscode' ? 'vscode' : 'unsupported';
      if (s.title) this.titles.set(s.id, s.title);
    } finally { await handle.close(); }
  }
  snapshot(now = Date.now()) {
    const result = super.snapshot(now);
    return { ...result, threads: result.threads.map(t => ({ ...t, agent: 'claude' })) };
  }
}
module.exports = { ClaudeActivityMonitor, applyClaudeEvent };
