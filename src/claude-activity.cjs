const fs = require('node:fs/promises');
const path = require('node:path');
const { ActivityMonitor, inWorkspace } = require('./activity.cjs');
const { StringDecoder } = require('node:string_decoder');
const { readSubagents, activeSince, exportAgents, agentLabel, validId, AGENT_ID, RUN_ID, TASK_ID } = require('./subagent-progress.cjs');
const WINDOW = 256 * 1024;
const MAX_LINE = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const clean = text => text.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
const AGENT_TOOLS = new Set(['Agent', 'Task', 'Workflow']);
const textOf = content => typeof content === 'string' ? content : Array.isArray(content) ? content.filter(c => c?.type === 'text').map(c => c.text || '').join(' ') : '';

// Claude reports each background agent or workflow back to the parent with a
// task notification naming the launching call. Only that report retires it;
// the agent stays listed as done until the parent turn ends.
function settleBackground(s, text) {
  if (!s.backgroundTasks?.size) return;
  for (const block of text.split('<task-notification>').slice(1)) {
    const body = block.split('</task-notification>')[0], id = body.match(/<tool-use-id>([^<]{1,128})<\/tool-use-id>/)?.[1];
    if (id && /<status>[a-z_]+<\/status>/.test(body) && s.backgroundTasks.delete(id)) { const agent = s.agents?.get(id); if (agent) agent.done = true; }
  }
}

// Background shells can outlive the work (servers); agents and workflows report back.
function registerLaunch(s, id, launch, at) {
  const workflow = launch.taskType === 'local_workflow' || typeof launch.workflowName === 'string';
  (s.backgroundTasks ||= new Map()).set(id, at);
  while (s.backgroundTasks.size > 64) s.backgroundTasks.delete(s.backgroundTasks.keys().next().value);
  const known = s.agents?.get(id), label = agentLabel(workflow ? launch.workflowName : launch.description) || known?.label;
  const taskId = validId(launch.taskId, TASK_ID), agentId = validId(launch.agentId, AGENT_ID), runId = workflow ? validId(launch.runId, RUN_ID) : undefined;
  // A resumed run reuses its journal and replaces the launch it continues.
  if (runId) for (const [other, agent] of s.agents || []) if (other !== id && agent.runId === runId) { s.agents.delete(other); s.backgroundTasks.delete(other); }
  (s.agents ||= new Map()).set(id, { kind: workflow ? 'workflow' : 'agent', ...(label ? { label } : {}), ...(taskId ? { taskId } : {}), ...(agentId ? { agentId } : {}), ...(runId ? { runId } : {}) });
  while (s.agents.size > 64) s.agents.delete(s.agents.keys().next().value);
}

// Replays only launches, reports and stops from history before the tail, in order.
function recoverRecord(s, r) {
  if (r.isSidechain || (r.sessionId && r.sessionId !== s.sessionId)) return;
  const content = Array.isArray(r.message?.content) ? r.message.content : [], results = r.type === 'user' ? content.filter(c => c?.type === 'tool_result') : [];
  if (results.length === 1 && results[0].tool_use_id && r.toolUseResult?.status === 'async_launched') registerLaunch(s, results[0].tool_use_id, r.toolUseResult, Date.parse(r.timestamp) || 0);
  else if (results.length === 1 && results[0].is_error !== true && /^Successfully stopped task/.test(r.toolUseResult?.message || '')) retireStopped(s, r.toolUseResult.task_id);
  else if (r.type === 'user' && r.origin?.kind === 'task-notification') settleBackground(s, textOf(r.message?.content));
  else if (r.type === 'attachment' && r.attachment?.type === 'queued_command' && r.attachment.commandMode === 'task-notification') settleBackground(s, textOf(r.attachment.prompt));
}

// Claude sends no notification for work it stops itself.
function retireStopped(s, taskId) {
  if (!validId(taskId, TASK_ID)) return;
  for (const [id, agent] of s.agents || []) {
    if (agent.taskId === taskId || agent.agentId === taskId) { s.agents.delete(id); s.backgroundTasks?.delete(id); }
  }
}

function applyClaudeEvent(s, r) {
  if (r.isSidechain || (r.sessionId && r.sessionId !== s.sessionId)) return;
  if (typeof r.cwd === 'string') s.cwd = r.cwd;
  if (typeof r.entrypoint === 'string') s.entrypoint = r.entrypoint;
  const named = r.type === 'custom-title' ? r.customTitle : r.type === 'ai-title' ? r.aiTitle : undefined;
  const priority = r.type === 'custom-title' ? 3 : 2;
  if (typeof named === 'string' && clean(named) && priority >= (s.titlePriority || 0)) { s.title = clean(named); s.titlePriority = priority; }
  const at = Date.parse(r.timestamp);
  if (!Number.isFinite(at)) return;
  // A queued-command attachment carries the submission time, which can be
  // older than the preceding completion. Retain only human delivery IDs until
  // the queue records actual consumption; enqueue/cancel/background reports
  // must never start a turn or retain prompt text.
  if (r.type === 'attachment' && r.attachment?.type === 'queued_command') {
    const a = r.attachment;
    if (a.commandMode === 'task-notification') settleBackground(s, textOf(a.prompt));
    if (a.commandMode === 'prompt' && (a.origin?.kind === 'human' || a.humanTurn === true)) {
      const ids = [a.delivery_id, a.source_uuid].filter(id => typeof id === 'string' && id.length > 0 && id.length <= 128);
      if (ids.length) {
        s.queuedHumanCommands ||= new Map();
        const command = { ids };
        for (const id of ids) s.queuedHumanCommands.set(id, command);
        while (s.queuedHumanCommands.size > 256) s.queuedHumanCommands.delete(s.queuedHumanCommands.keys().next().value);
      }
    }
    return;
  }
  let consumedHuman = false;
  if (r.type === 'queue-operation' && r.operation === 'remove') {
    const command = s.queuedHumanCommands?.get(r.deliveryId) || s.queuedHumanCommands?.get(r.commandUuid);
    if (command) {
      for (const id of command.ids) s.queuedHumanCommands.delete(id);
      consumedHuman = r.reason === 'absorbed_mid_turn';
    }
  }
  // Delayed records from an older turn cannot overwrite a newer start/finish.
  if (at < Math.max(s.changedAt || 0, s.startedAt || 0, s.finishedAt || 0)) return;
  const m = r.message || {}, content = Array.isArray(m.content) ? m.content : [];
  if (r.type === 'assistant' && s.settledMessages?.has(m.id)) return;
  // Finished and foreground subagents end with their turn; background ones wait for their report.
  const settleForeground = (keepDone = false) => {
    for (const [id, agent] of s.agents || []) if (!s.backgroundTasks?.has(id) && !(keepDone && agent.done)) s.agents.delete(id);
  };
  const progress = () => { s.lastEventAt = Math.max(s.lastEventAt || 0, at); s.progressVersion = (s.progressVersion || 0) + 1; };
  const start = () => { s.status = 'running'; s.changedAt = at; s.startedAt = at; s.finishedAt = undefined; s.pendingInputs = {}; s.lastQuestionAt = undefined; s.pendingTools = new Set(); s.pendingStops = new Set(); settleForeground(); };
  const finish = status => {
    if (r.type === 'assistant' && typeof m.id === 'string' && m.id.length <= 128) {
      s.settledMessages ||= new Set(); s.settledMessages.add(m.id);
      while (s.settledMessages.size > 128) s.settledMessages.delete(s.settledMessages.values().next().value);
    }
    s.status = status; s.changedAt = at; s.finishedAt = at; s.pendingInputs = {}; s.lastQuestionAt = undefined; s.pendingTools = new Set(); s.pendingStops = new Set(); settleForeground(); progress();
  };
  if (r.type === 'queue-operation') {
    if (consumedHuman) {
      if (s.status !== 'running') start();
      progress();
    }
    return;
  }
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
      const launch = matched.length === 1 && r.toolUseResult?.status === 'async_launched' ? r.toolUseResult : undefined;
      for (const c of matched) {
        delete s.pendingInputs?.[c.tool_use_id];
        s.pendingTools?.delete(c.tool_use_id);
        if (launch) continue;
        const agent = s.agents?.get(c.tool_use_id);
        if (agent) { agent.done = true; if (matched.length === 1) agent.agentId ||= validId(r.toolUseResult?.agentId, AGENT_ID); }
        if (s.pendingStops?.delete(c.tool_use_id) && matched.length === 1 && c.is_error !== true) retireStopped(s, r.toolUseResult?.task_id);
      }
      if (launch) registerLaunch(s, matched[0].tool_use_id, launch, at);
      progress(); return;
    }
    if (r.isMeta) return;
    const message = textOf(m.content);
    if (!message.trim()) return;
    if (/^\[Request interrupted by user/.test(message)) { finish('idle'); return; }
    if (r.origin?.kind === 'task-notification') {
      settleBackground(s, message);
      // A report into work that is still open continues it; the timer keeps running.
      if (s.status === 'running') { progress(); return; }
    } else if (!s.titlePriority) { s.title = clean(message); s.titlePriority = 1; }
    start(); progress();
  } else if (r.type === 'assistant') {
    if (r.isAbortedMidStream) { finish('idle'); return; }
    s.pendingInputs ||= {};
    const calls = content.filter(c => c.type === 'tool_use');
    if (['end_turn', 'stop_sequence'].includes(m.stop_reason) && !calls.length && !Object.keys(s.pendingInputs).length) {
      if (!s.backgroundTasks?.size) { finish('ready'); return; }
      // Claude resumes this chat itself when its background work reports back.
      s.pendingTools = new Set(); s.pendingStops = new Set(); settleForeground(true); progress(); return;
    }
    // The parent can genuinely resume after an asynchronous subagent report.
    // Publish a newer lifecycle so the panel can supersede its retained finish.
    if (s.status !== 'running') start();
    s.pendingTools ||= new Set();
    for (const c of calls) if (c.id) s.pendingTools.add(c.id);
    for (const c of calls) if (c.id && c.name === 'TaskStop') (s.pendingStops ||= new Set()).add(c.id);
    for (const c of calls) if (c.id && AGENT_TOOLS.has(c.name)) {
      const label = agentLabel(c.name === 'Workflow' ? c.input?.name : c.input?.description);
      (s.agents ||= new Map()).set(c.id, { kind: c.name === 'Workflow' ? 'workflow' : 'agent', ...(label ? { label } : {}) });
      while (s.agents.size > 64) s.agents.delete(s.agents.keys().next().value);
    }
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
    await this.readTranscript(file);
    const s = this.files.get(file);
    // Subagent files grow independently of the parent transcript, and their
    // growth shows that a quiet chat's background work is still live.
    if (s?.status === 'running' && s.agents?.size && this.tracks(s) && await readSubagents(file, s).catch(() => false)) {
      s.liveConfirmed = true; s.lastEventAt = Math.max(s.lastEventAt || 0, Date.now()); s.progressVersion = (s.progressVersion || 0) + 1;
    }
  }
  // Attaching to the tail would forget background work launched earlier in a
  // long chat. Scan the skipped history once for launches still writing files.
  async recoverBackground(handle, file, s, end) {
    const decoder = new StringDecoder('utf8');
    let position = 0, partial = '';
    while (position < end) {
      const buffer = Buffer.alloc(Math.min(4 * WINDOW, end - position));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      position += bytesRead;
      const lines = (partial + decoder.write(buffer.subarray(0, bytesRead))).split('\n'); partial = lines.pop();
      if (partial.length > MAX_LINE) partial = '';
      for (const line of lines) {
        if (!line.includes('async_launched') && !line.includes('<task-notification>') && !line.includes('Successfully stopped task')) continue;
        try { recoverRecord(s, JSON.parse(line)); } catch {}
      }
    }
    const since = Date.now() - 15 * 60 * 1000;
    for (const [id, agent] of s.agents || []) {
      if (agent.done || !s.backgroundTasks?.has(id) || !await activeSince(file, s, agent, since)) { s.agents.delete(id); s.backgroundTasks?.delete(id); }
    }
  }
  async readTranscript(file) {
    const handle = await fs.open(file, 'r');
    try {
      const stat = await handle.stat(); let s = this.files.get(file);
      if (!s || s.offset > stat.size || s.ino !== stat.ino) {
        const sessionId = path.basename(file, '.jsonl');
        if (!UUID.test(sessionId)) return;
        s = { sessionId, id: `claude:${sessionId}`, source: 'vscode', status: 'unknown', offset: 0, ino: stat.ino, partial: '', changedAt: 0, lastEventAt: 0, liveConfirmed: false, initializing: true };
        this.files.set(file, s);
        // Read the beginning for workspace/title metadata, then attach to the tail.
        // Never retain message bodies or tool arguments (beyond short subagent labels).
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
        s.source = s.entrypoint === 'claude-vscode' ? 'vscode' : 'unsupported';
        if (s.offset > 0 && this.tracks(s)) await this.recoverBackground(handle, file, s, s.offset);
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
    const result = super.snapshot(now), states = new Map([...this.files.values()].map(s => [s.id, s]));
    return { ...result, threads: result.threads.map(t => {
      const agents = t.status === 'running' ? exportAgents(states.get(t.id)?.agents || new Map()) : [];
      return { ...t, agent: 'claude', ...(agents.length ? { agents } : {}) };
    }) };
  }
}
module.exports = { ClaudeActivityMonitor, applyClaudeEvent };
