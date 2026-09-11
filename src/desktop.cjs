const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');

class DesktopBridge {
  constructor(directory, executable, getSnapshot, reportError) {
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
    const child = spawn(this.executable, ['--state-dir', this.directory], { detached: true, stdio: 'ignore' });
    child.on('error', this.reportError); child.unref();
  }
  dispose() {
    this.disposed = true; clearInterval(this.timer);
    void this.pending.catch(() => {}).then(() => fs.unlink(this.file)).catch(() => {});
  }
}
module.exports = { DesktopBridge };
