// VS Code runs this Node hook before physically deleting an uninstalled package.
// Do not delete extension folders, global storage or preferences here: VS Code
// owns those folders, and a newer version/another profile may still use them.
const path = require('node:path');
const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const run = require('node:util').promisify(execFile);
const { BUNDLE_SUFFIX, extensionRoot } = require('./helper-lifecycle.cjs');
const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister';
async function uninstall(root = __dirname) {
  if (process.platform !== 'darwin') return;
  root = path.resolve(root);
  const executable = root + BUNDLE_SUFFIX;
  if (extensionRoot(executable) !== root) return;
  const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  if (`${pkg.publisher}.${pkg.name}` !== 'merttalhayener.agent-pet' ||
      ![`${pkg.publisher}.${pkg.name}-${pkg.version}`, `${pkg.publisher}.${pkg.name}-${pkg.version}-darwin-arm64`].includes(path.basename(root))) return;
  // Match the full executable path; never kill by process name, bundle ID or
  // publisher prefix. In particular, an old cleanup hook must not stop an update.
  const output = (await run('/bin/ps', ['-axo', 'pid=,comm='], { timeout: 1000, maxBuffer: 4 * 1024 * 1024 })).stdout;
  const ids = output.split('\n').map(line => line.match(/^\s*(\d+)\s+(.+)$/))
    .filter(match => match && match[2] === executable).map(match => Number(match[1]));
  await Promise.all(ids.map(async pid => {
    try {
      const current = (await run('/bin/ps', ['-p', String(pid), '-o', 'comm='], { timeout: 1000 })).stdout.trim();
      if (current === executable) process.kill(pid, 'SIGTERM');
    } catch (error) { if (error.code !== 'ESRCH' && error.code !== 1) throw error; }
  }));
  // Remove only this version's Launch Services registration, not the newer app.
  await run(LSREGISTER, ['-u', path.join(root, 'bin/Agent Pet.app')], { timeout: 1500 });
}
if (require.main === module) uninstall().catch(error => { console.error('Agent Pet cleanup:', error.message); process.exitCode = 1; });
module.exports = { uninstall };
