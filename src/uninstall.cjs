// VS Code runs this Node hook before physically deleting an uninstalled package.
// Delete only this package's native app; VS Code owns the enclosing extension
// folder. Never remove sibling versions, global storage or preferences.
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
  const bundle = path.join(root, 'bin/Agent Pet.app');
  // Refuse redirected bundles/bin directories so cleanup cannot reach another app.
  const realRoot = await fs.realpath(root);
  try {
    if (await fs.realpath(bundle) !== path.join(realRoot, 'bin/Agent Pet.app')) throw new Error('Refusing redirected app bundle');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Match the full executable path; never kill by process name, bundle ID or
  // publisher prefix. In particular, an old cleanup hook must not stop an update.
  const output = (await run('/bin/ps', ['-axo', 'pid=,comm='], { timeout: 1000, maxBuffer: 4 * 1024 * 1024 })).stdout;
  const realExecutable = realRoot + BUNDLE_SUFFIX;
  const matches = async candidate => candidate === executable || candidate === realExecutable ||
    await fs.realpath(candidate).catch(() => '') === realExecutable;
  const candidates = output.split('\n').map(line => line.match(/^\s*(\d+)\s+(.+)$/))
    .filter(match => match && match[2].endsWith(BUNDLE_SUFFIX));
  await Promise.all(candidates.map(async match => {
    if (!await matches(match[2])) return;
    const pid = Number(match[1]);
    try {
      const current = (await run('/bin/ps', ['-p', String(pid), '-o', 'comm='], { timeout: 1000 })).stdout.trim();
      if (await matches(current)) process.kill(pid, 'SIGTERM');
    } catch (error) { if (error.code !== 'ESRCH' && error.code !== 1) throw error; }
  }));
  // Remove only this version's Launch Services registration, not the newer app.
  const exists = await fs.lstat(bundle).then(() => true, error => {
    if (error.code === 'ENOENT') return false;
    throw error;
  });
  if (exists) {
    try { await run(LSREGISTER, ['-u', bundle], { timeout: 1500 }); }
    catch (error) {
      // The native helper can delete itself concurrently. A stale Launch
      // Services registration must not prevent physical app removal either.
      if (await fs.lstat(bundle).catch(() => null)) console.warn('Agent Pet bundle unregistration:', error.message);
    }
  }
  await fs.rm(bundle, { recursive: true, force: true });
}
if (require.main === module) uninstall().catch(error => { console.error('Agent Pet cleanup:', error.message); process.exitCode = 1; });
module.exports = { uninstall };
