const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const ROLLOUT = /([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.jsonl$/i;
const THREAD = /^(?:claude:)?[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

async function run(file, args) {
  // Claude records procStart as C-locale UTC lstart text; list processes the same way.
  // lsof exits non-zero when one listed process has already exited; keep the rest.
  try { return (await execFileAsync(file, args, { timeout: 1500, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' } })).stdout; }
  catch (error) { return typeof error.stdout === 'string' ? error.stdout : ''; }
}

function parseProcesses(text) {
  const processes = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\w{3} \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4})\s+(.+)$/);
    if (m) processes.set(Number(m[1]), { ppid: Number(m[2]), started: Date.parse(m[3]), comm: m[4].trim() });
  }
  return processes;
}

// Claude Code and Codex CLIs started in this window's integrated terminals belong
// to this window. Ownership comes from the process tree, never from a guessed
// folder, and lasts while that terminal stays open.
class TerminalSessions {
  constructor(getTerminals, claudeSessions, codexSessions, exec = run) {
    this.getTerminals = getTerminals; this.claudeSessions = claudeSessions; this.codexSessions = path.resolve(codexSessions); this.exec = exec;
    this.owners = new Map(); this.rollouts = new Map(); this.refreshedAt = 0;
  }
  has(id) { return this.owners.has(id); }
  terminal(id) { return this.owners.get(id); }
  files() { return [...this.rollouts.values()]; }
  async refresh(force = false) {
    if (!force && Date.now() - this.refreshedAt < 3000) return;
    this.refreshedAt = Date.now();
    const terminals = this.getTerminals();
    const open = new Set(terminals);
    for (const [id, terminal] of this.owners) if (!open.has(terminal)) { this.owners.delete(id); this.rollouts.delete(id); }
    const shells = new Map();
    await Promise.all(terminals.map(async terminal => {
      const pid = await Promise.race([Promise.resolve(terminal.processId).catch(() => undefined), new Promise(resolve => setTimeout(resolve, 1000))]);
      if (Number.isInteger(pid) && pid > 1) shells.set(pid, terminal);
    }));
    if (!shells.size) return;
    const processes = parseProcesses(await this.exec('/bin/ps', ['-A', '-o', 'pid=,ppid=,lstart=,comm=']));
    const ownerOf = pid => {
      for (let current = pid, depth = 0; current > 1 && depth < 64; current = processes.get(current)?.ppid, depth++) {
        if (shells.has(current)) return current === pid ? undefined : shells.get(current);
      }
    };
    for (const name of await fs.readdir(this.claudeSessions).catch(() => [])) {
      const pid = Number(name.match(/^(\d+)\.json$/)?.[1]);
      const terminal = pid && ownerOf(pid);
      if (!terminal) continue;
      try {
        const record = JSON.parse(await fs.readFile(path.join(this.claudeSessions, name), 'utf8'));
        // A crashed session can leave its file behind; reject a reused process ID.
        const started = Date.parse(record.procStart), actual = processes.get(pid).started;
        if (record.pid !== pid || !UUID.test(record.sessionId || '') || (Number.isFinite(started) && Number.isFinite(actual) && Math.abs(started - actual) > 1000)) continue;
        this.owners.set(`claude:${record.sessionId}`, terminal);
      } catch {}
    }
    const codex = [...processes].filter(([pid, p]) => /codex/i.test(path.basename(p.comm)) && ownerOf(pid)).map(([pid]) => pid);
    if (!codex.length) return;
    // Codex keeps its rollout open while the session lives.
    let pid;
    for (const line of (await this.exec('/usr/sbin/lsof', ['-a', '-p', codex.join(','), '-d', '0-9999', '-Fpn'])).split('\n')) {
      if (line[0] === 'p') { pid = Number(line.slice(1)); continue; }
      if (line[0] !== 'n') continue;
      const file = path.resolve(line.slice(1)), id = file.match(ROLLOUT)?.[1];
      if (!id || !file.startsWith(this.codexSessions + path.sep) || !ownerOf(pid)) continue;
      this.owners.set(id, ownerOf(pid)); this.rollouts.set(id, file);
    }
  }
}

function createTerminalNavigation(vscode, terminals, extensionId = 'local.codex-pet-panel') {
  return {
    async handleUri(uri) {
      if (uri.authority !== extensionId || uri.path !== '/terminal') return;
      const params = new URLSearchParams(uri.query);
      if (params.getAll('windowId').length > 1 || (params.has('windowId') && !/^\d+$/.test(params.get('windowId')))) return;
      const thread = params.get('thread');
      if (!THREAD.test(thread || '') || params.getAll('thread').length !== 1 || [...params.keys()].some(key => key !== 'thread' && key !== 'windowId')) return;
      await terminals.refresh(true).catch(() => {});
      const terminal = terminals.terminal(thread);
      if (!terminal) { void vscode.window.showInformationMessage('The terminal running this chat is no longer open in this window.'); return; }
      terminal.show(false);
    }
  };
}

module.exports = { TerminalSessions, createTerminalNavigation, parseProcesses };
