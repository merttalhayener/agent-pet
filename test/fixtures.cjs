const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
exports.findPetAssets = async function () {
  if (process.env.CODEX_PET_ASSET_DIR) return process.env.CODEX_PET_ASSET_DIR;
  const extensions = path.join(os.homedir(), '.vscode', 'extensions');
  const installed = (await fs.readdir(extensions)).filter(name => name.startsWith('openai.chatgpt-')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const name of installed) {
    const dir = path.join(extensions, name, 'webview', 'assets');
    if ((await fs.readdir(dir).catch(() => [])).some(file => file.startsWith('codex-spritesheet-'))) return dir;
  }
  throw new Error('Install the Codex VS Code extension, or set CODEX_PET_ASSET_DIR to its webview/assets directory.');
};
