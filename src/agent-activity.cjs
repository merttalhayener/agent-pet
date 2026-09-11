const fs = require('node:fs/promises');
const path = require('node:path');
const { ActivityMonitor } = require('./activity.cjs');
const { ClaudeActivityMonitor } = require('./claude-activity.cjs');
class AgentActivityMonitor {
  constructor(codexRoot, claudeRoot, getRoots, onStatus, directory) {
    this.directory = directory;
    this.statuses = new Map(); this.onStatus = onStatus;
    const update = agent => status => { this.statuses.set(agent, status); this.publish(); };
    this.monitors = [new ActivityMonitor(codexRoot, getRoots, update('codex')), new ClaudeActivityMonitor(claudeRoot, getRoots, update('claude'))];
  }
  set enabled(value) { for (const m of this.monitors) m.enabled = value; }
  start() { void this.tick(); this.timer = setInterval(() => void this.tick(), 1500); }
  dispose() { this.disposed = true; clearInterval(this.timer); for (const m of this.monitors) m.dispose(); }
  async tick() {
    if (this.busy || this.disposed) return; this.busy = true;
    try {
      if (this.directory) {
        try {
          const ids = JSON.parse(await fs.readFile(path.join(this.directory, 'tracked-threads.json'), 'utf8'));
          if (Array.isArray(ids)) for (const m of this.monitors) m.setTrackedIds(new Set(ids.filter(id => typeof id === 'string').slice(0, 10000)));
        } catch {}
      }
      if (!this.disposed) await Promise.all(this.monitors.map(m => m.tick()));
    } finally { this.busy = false; }
  }
  publish() {
    const threads = [...this.statuses].flatMap(([agent, s]) => (s.threads || []).map(t => ({ ...t, agent })));
    const active = threads.filter(t => t.status === 'running').length;
    const status = threads.some(t => t.status === 'waiting') ? 'waiting' : active ? 'running' : threads.some(t => t.status === 'failed') ? 'failed' : threads.length && threads.every(t => t.status === 'ready') ? 'ready' : 'idle';
    this.onStatus({ status, active, threads, trackingDisabled: this.monitors.every(m => !m.enabled) });
  }
}
module.exports = { AgentActivityMonitor };
