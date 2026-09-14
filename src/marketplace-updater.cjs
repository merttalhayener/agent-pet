const fs = require('node:fs/promises');
const path = require('node:path');
const { newer } = require('./updater.cjs');

async function installedMarketplaceVersion(context) {
  const current = context.extension.packageJSON.version, id = context.extension.id;
  const root = path.dirname(context.extensionPath);
  try {
    const entries = JSON.parse(await fs.readFile(path.join(root, 'extensions.json'), 'utf8'));
    let version = current;
    for (const entry of entries) {
      if (entry.identifier?.id?.toLowerCase() !== id.toLowerCase() || !newer(entry.version, version)) continue;
      const folder = entry.relativeLocation;
      if (typeof folder !== 'string' || path.basename(folder) !== folder || !folder.startsWith(id + '-')) continue;
      const pkg = JSON.parse(await fs.readFile(path.join(root, folder, 'package.json'), 'utf8'));
      if (`${pkg.publisher}.${pkg.name}` === id && pkg.version === entry.version) version = pkg.version;
    }
    return version;
  } catch { return current; }
}
function createMarketplaceUpdater(vscode, context) {
  let timer, disposed = false, busy = false;
  async function check() {
    if (disposed) return;
    await vscode.commands.executeCommand('workbench.extensions.search', `@id:${context.extension.id}`);
  }
  return { check, start() {
    timer = setInterval(async () => {
      if (disposed || busy) return; busy = true;
      try {
        await fs.unlink(path.join(context.globalStorageUri.fsPath, 'desktop', 'check-update-request'));
        await check();
      } catch { /* No pending menu request. VS Code owns automatic downloads. */ }
      finally { busy = false; }
    }, 2000);
    timer.unref?.();
  }, dispose() { disposed = true; clearInterval(timer); } };
}
module.exports = { createMarketplaceUpdater, installedMarketplaceVersion };
