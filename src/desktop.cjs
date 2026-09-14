const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const execFileAsync = require('node:util').promisify(execFile);
const crypto = require('node:crypto');

class DesktopBridge {
  constructor(directory, executable, getSnapshot, reportError, extensionId = 'local.codex-pet-panel', resolveExecutable) {
    this.extensionId = extensionId;
    this.resolveExecutable = resolveExecutable;
    this.lifecycle = Promise.resolve();
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
  // Each window can detect an installed update before its extension host reloads.
  // Serialize local starts; the native state lock arbitrates between windows.
  reconcile(show = false, background = false) {
    this.lifecycle = this.lifecycle.catch(() => {}).then(async () => {
      if (this.disposed) return;
      const running = await this.hasRunningHelper();
      if (background && !running && !this.restartPending) return; // Do not reopen a deliberately quit app.
      if (running) this.restartPending = false;
      const executable = this.resolveExecutable ? await this.resolveExecutable() : this.executable;
      // Validate the replacement exists before closing the working helper.
      await fs.access(executable, fs.constants.X_OK);
      if (this.disposed) return;
      this.executable = executable;
      if (show) {
        await fs.unlink(path.join(this.directory, 'desktop-hidden')).catch(() => {});
        await fs.writeFile(path.join(this.directory, 'desktop-show-request'), '');
      } else if (!running && !this.restartPending && await fs.stat(path.join(this.directory, 'desktop-hidden')).catch(() => null)) return;
      await this.upgradeRunningHelper();
      if (this.disposed || await this.hasRunningHelper()) return;
      this.restartPending = true; // Retry a failed launch after the old helper has exited.
      const child = spawn(this.executable, ['--state-dir', this.directory], { detached: true, stdio: 'ignore' });
      child.on('error', this.reportError); child.unref();
    });
    return this.lifecycle;
  }
  async start(show = false) {
    if (process.platform !== 'darwin' || this.disposed) return;
    await fs.mkdir(this.directory, { recursive: true });
    if (!this.timer) {
      this.timer = setInterval(() => this.write().catch(() => {}), 3000);
      this.updateTimer = setInterval(() => {
        if (this.checkingUpdate) return;
        this.checkingUpdate = true;
        void this.reconcile(false, true).catch(error => {
          // Retry a failed handover, without repeating the same error every poll.
          if (this.updateError !== error.message) { this.updateError = error.message; this.reportError(error); }
        }).finally(() => { this.checkingUpdate = false; });
      }, 5000);
      this.updateTimer.unref?.();
    }
    await this.write();
    await this.reconcile(show);
  }
  dispose() {
    this.disposed = true; clearInterval(this.timer); clearInterval(this.updateTimer);
    void this.pending.catch(() => {}).then(() => fs.unlink(this.file)).catch(() => {});
  }
}
module.exports = { DesktopBridge };
