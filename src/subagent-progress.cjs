const fs = require('node:fs/promises');
const path = require('node:path');
const { StringDecoder } = require('node:string_decoder');
const WINDOW = 256 * 1024;
const MAX_LINE = 64 * 1024;
const AGENT_ID = /^a[0-9a-f]{16}$/;
const RUN_ID = /^wf_[A-Za-z0-9-]{1,64}$/;
const TASK_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MODEL = /^[A-Za-z0-9.-]{1,64}$/;
const META = /^agent-(a[0-9a-f]{16})\.meta\.json$/;
const validId = (value, pattern) => typeof value === 'string' && pattern.test(value) ? value : undefined;
const clean = text => text.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
// Agents are shown by a short label only; prompts, results and scripts are never retained.
const agentLabel = text => typeof text === 'string' && clean(text).slice(0, 60) || undefined;

// Splits appended text into lines. An overlong line is reported once by its
// beginning, then skipped up to the next newline.
function feed(t, text, onLine) {
  let start = 0;
  for (;;) {
    const end = text.indexOf('\n', start);
    if (end < 0) {
      if (!t.skipping) {
        t.partial += text.slice(start);
        if (t.partial.length > MAX_LINE) { onLine(t.partial.slice(0, 256), true); t.partial = ''; t.skipping = true; }
      }
      return;
    }
    if (t.skipping) t.skipping = false;
    else onLine(t.partial + text.slice(start, end), false);
    t.partial = ''; start = end + 1;
  }
}

// Reads at most one window per call. Agent transcripts attach to their tail;
// journals are read from the start because every start record matters.
async function follow(file, t, fromStart, onLine, onReset = () => {}) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) return null;
  if (t.ino !== stat.ino || stat.size < t.offset) {
    Object.assign(t, { ino: stat.ino, offset: fromStart ? 0 : Math.max(0, stat.size - WINDOW), partial: '', decoder: new StringDecoder('utf8') });
    t.skipping = t.offset > 0; onReset();
  }
  if (t.offset < stat.size) {
    const handle = await fs.open(file, 'r');
    try {
      const buffer = Buffer.alloc(Math.min(WINDOW, stat.size - t.offset));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, t.offset);
      t.offset += bytesRead; feed(t, t.decoder.write(buffer.subarray(0, bytesRead)), onLine);
    } finally { await handle.close(); }
  }
  return stat;
}

// Model and tokens come from the first record of the latest assistant message:
// its context plus output, matching Claude's own agent figures. Streamed
// records of the same message repeat its id. Message content is discarded.
async function followAgent(file, stats = {}) {
  const stat = await follow(file, stats, false, (line, cut) => {
    if (cut || !line.includes('"assistant"')) return;
    try {
      const r = JSON.parse(line), m = r.message, u = m?.usage;
      if (r.type !== 'assistant' || !u || (typeof m.id === 'string' && m.id === stats.messageId)) return;
      stats.messageId = typeof m.id === 'string' ? m.id.slice(0, 128) : undefined;
      const tokens = [u.input_tokens, u.cache_read_input_tokens, u.cache_creation_input_tokens, u.output_tokens].reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
      stats.tokens = tokens; stats.model = validId(m.model, MODEL) || stats.model;
    } catch {}
  });
  if (!stat) return stats;
  if (!stats.startedAt) {
    const meta = await fs.stat(file.replace(/\.jsonl$/, '.meta.json')).catch(() => null);
    stats.startedAt = meta ? meta.birthtimeMs || meta.mtimeMs : stat.birthtimeMs || stat.mtimeMs;
  }
  stats.lastAt = stat.mtimeMs;
  return stats;
}

// The workflow journal names each agent's phase and label. A key that starts
// again (retry or resume) replaces its earlier run.
async function followJournal(file, journal = { runs: new Map(), phases: [] }) {
  await follow(file, journal, true, (line, cut) => {
    let r;
    if (cut) {
      const m = line.match(/^\{"type":"result","key":"([^"\\]{1,200})"/);
      if (!m) return; r = { type: 'result', key: m[1] };
    } else { try { r = JSON.parse(line); } catch { return; } }
    if (typeof r?.key !== 'string' || r.key.length > 200) return;
    if (r.type === 'started') {
      const run = { label: agentLabel(r.label), phase: agentLabel(r.phase), agentId: validId(r.agentId, AGENT_ID), done: false };
      const previous = journal.runs.get(r.key);
      if (previous?.agentId && previous.agentId === run.agentId) run.stats = previous.stats;
      journal.runs.delete(r.key); journal.runs.set(r.key, run);
      while (journal.runs.size > 256) journal.runs.delete(journal.runs.keys().next().value);
      if (run.phase && !journal.phases.includes(run.phase) && journal.phases.length < 16) journal.phases.push(run.phase);
    } else if (r.type === 'result') {
      const run = journal.runs.get(r.key);
      if (run) run.done = true;
    }
  }, () => { journal.runs.clear(); journal.phases = []; });
  return journal;
}

// A foreground agent's id appears only in its result; while it runs, its meta
// file names the launching call. Each meta file is read once.
async function resolveMeta(base, s) {
  const waiting = new Map([...s.agents].filter(([, a]) => a.kind === 'agent' && !a.agentId && !a.done));
  if (!waiting.size) return;
  s.metaSeen ||= new Set();
  for (const name of await fs.readdir(base).catch(() => [])) {
    const id = name.match(META)?.[1];
    if (!id || s.metaSeen.has(name)) continue;
    s.metaSeen.add(name);
    while (s.metaSeen.size > 512) s.metaSeen.delete(s.metaSeen.values().next().value);
    try {
      const file = path.join(base, name), stat = await fs.stat(file);
      if (stat.size > 4096) continue;
      const agent = waiting.get(JSON.parse(await fs.readFile(file, 'utf8')).toolUseId);
      if (agent) agent.agentId = id;
    } catch {}
  }
}

// Every path is derived from validated ids beneath the session's own
// subagents directory, never from paths written in the transcript.
async function readSubagents(file, s, now = Date.now()) {
  const base = path.join(path.dirname(file), s.sessionId, 'subagents');
  if (now - (s.metaScanAt || 0) >= 5000 && [...s.agents.values()].some(a => a.kind === 'agent' && !a.agentId && !a.done)) {
    s.metaScanAt = now; await resolveMeta(base, s);
  }
  let budget = 32;
  for (const a of [...s.agents.values()].reverse()) {
    if (a.kind === 'agent' && a.agentId && budget-- > 0) a.stats = await followAgent(path.join(base, `agent-${a.agentId}.jsonl`), a.stats);
    if (a.kind !== 'workflow' || !a.runId) continue;
    const dir = path.join(base, 'workflows', a.runId);
    a.journal = await followJournal(path.join(dir, 'journal.jsonl'), a.journal);
    for (const run of [...a.journal.runs.values()].reverse()) {
      if (run.agentId && budget-- > 0) run.stats = await followAgent(path.join(dir, `agent-${run.agentId}.jsonl`), run.stats);
    }
  }
}

const exportStats = st => ({
  ...(st?.model ? { model: st.model } : {}), ...(Number.isFinite(st?.tokens) ? { tokens: st.tokens } : {}),
  ...(Number.isFinite(st?.startedAt) ? { startedAt: Math.round(st.startedAt) } : {}), ...(Number.isFinite(st?.lastAt) ? { lastAt: Math.round(st.lastAt) } : {})
});
const exportRun = r => ({ ...(r.label ? { label: r.label } : {}), ...(r.done ? { done: true } : {}), ...exportStats(r.stats) });

// The snapshot carries labels, completion and stats only, never ids or paths.
function exportAgents(agents) {
  return [...agents.values()].slice(-32).map(a => {
    const base = { kind: a.kind, ...(a.label ? { label: a.label } : {}), ...(a.done ? { done: true } : {}) };
    if (a.kind !== 'workflow') return { ...base, ...exportStats(a.stats) };
    const runs = [...(a.journal?.runs.values() || [])];
    if (!runs.length) return base;
    const names = [...a.journal.phases];
    for (const r of runs) if (!names.includes(r.phase)) names.push(r.phase);
    const phases = names.map(name => {
      const list = runs.filter(r => r.phase === name);
      return { ...(name ? { name } : {}), completed: list.filter(r => r.done).length, total: list.length, agents: list.slice(-12).map(exportRun) };
    }).filter(p => p.total);
    return { ...base, completed: runs.filter(r => r.done).length, total: runs.length, phases: phases.slice(-8) };
  });
}

module.exports = { readSubagents, exportAgents, agentLabel, validId, AGENT_ID, RUN_ID, TASK_ID };
