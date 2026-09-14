const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const execFileAsync = require('node:util').promisify(execFile);
const crypto = require('node:crypto');

class DesktopBridge {
  constructor(directory, executable, getSnapshot, reportError, extensionId = 'local.codex-pet-panel') {
    this.extensionId = extensionId;
    this.directory = directory; this.executable = executable; this.getSnapshot = getSnapshot; this.reportError = reportError;
    this.file = path.join(directory, `client-${process.pid}-${crypto.randomBytes(5).toString('hex')}.json`);
    this.disposed = false;
    this.pending = Promise.resolve();
  }
  write() {
    this.pending = this.pending.catch(() => {}).then(async () => {
      if (this.disposed) return;
      const tmp = this.file + '.tmp';
      await fs.writeFile(tmp, JSON.stringify({ ...this.getSnapshot(), updatedAt: Date.now() }), { mode: 0o600 });
      await fs.rename(tmp, this.file);
    });
    return this.pending;
  }
  async hasRunningHelper() {
    try { return /^\d+(?:\s+\d+)*$/.test((await execFileAsync('/usr/sbin/lsof', ['-t', '--', path.join(this.directory, 'desktop.lock')], { timeout: 1500 })).stdout.trim()); }
    catch { return false; }
  }
  async upgradeRunningHelper() {
    // Reloading an extension leaves its detached helper alive. Identify only the
    // helper holding this user's state-directory lock, never unrelated processes.
    let ids;
    try { ids = (await execFileAsync('/usr/sbin/lsof', ['-t', '--', path.join(this.directory, 'desktop.lock')], { timeout: 1500 })).stdout.trim().split(/\s+/); }
    catch { return; }
    for (const id of ids) {
      if (!/^\d+$/.test(id)) continue;
      let old, args;
      try {
        old = (await execFileAsync('/bin/ps', ['-p', id, '-o', 'comm='], { timeout: 1000 })).stdout.trim();
        args = (await execFileAsync('/bin/ps', ['-p', id, '-o', 'args='], { timeout: 1000 })).stdout.trim();
      } catch { continue; }
      function extensionRoot(executable) {
        const suffix = executable.endsWith('/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet') ? '/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet' : '/bin/codex-desktop-pet';
        return executable.endsWith(suffix) ? executable.slice(0, -suffix.length) : '';
      }
      const extensionDir = extensionRoot(old), newRoot = extensionRoot(this.executable);
      const ownArguments = args === `${old} --state-dir ${this.directory}` || (old.endsWith('/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet') && args === old);
      const parse = root => path.basename(root).match(/^(.+)-(\d+)\.(\d+)\.(\d+)(?:-darwin-arm64)?$/);
      const oldPackage = parse(extensionDir), newPackage = parse(newRoot);
      if (old === this.executable || path.basename(old) !== 'codex-desktop-pet' || !oldPackage || !newPackage ||
          !['local.codex-pet-panel', this.extensionId].includes(oldPackage[1]) || newPackage[1] !== this.extensionId ||
          path.dirname(extensionDir) !== path.dirname(newRoot) || !ownArguments) continue;
      const oldVersion = oldPackage.slice(2).map(Number), newVersion = newPackage.slice(2).map(Number);
      if (!oldVersion || !newVersion) continue;
      const differing = newVersion.findIndex((value, i) => value !== oldVersion[i]);
      if (differing < 0 || newVersion[differing] < oldVersion[differing]) continue;
      try { process.kill(Number(id), 'SIGTERM'); } catch (error) { if (error.code === 'ESRCH') continue; throw error; }
      for (let i = 0; i < 20; i++) {
        try { process.kill(Number(id), 0); } catch { break; }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      try { process.kill(Number(id), 0); } catch (error) { if (error.code === 'ESRCH') continue; throw error; }
      throw new Error('The previous pet is still closing. Try Show Desktop Pet again.');
    }
  }
  async start(show = false) {
    if (process.platform !== 'darwin') return;
    await fs.mkdir(this.directory, { recursive: true });
    if (!this.timer) this.timer = setInterval(() => this.write().catch(() => {}), 3000);
    await this.write();
    if (show) {
      await fs.unlink(path.join(this.directory, 'desktop-hidden')).catch(() => {});
      await fs.writeFile(path.join(this.directory, 'desktop-show-request'), '');
    }
    else if (await fs.stat(path.join(this.directory, 'desktop-hidden')).catch(() => null)) return;
    await fs.chmod(this.executable, 0o755);
    await this.upgradeRunningHelper();
    const child = spawn(this.executable, ['--state-dir', this.directory], { detached: true, stdio: 'ignore' });
    child.on('error', this.reportError); child.unref();
  }
  dispose() {
    this.disposed = true; clearInterval(this.timer);
    void this.pending.catch(() => {}).then(() => fs.unlink(this.file)).catch(() => {});
  }
}
module.exports = { DesktopBridge };
