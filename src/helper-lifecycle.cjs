const fs = require('node:fs/promises');
const path = require('node:path');
const BUNDLE_SUFFIX = '/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
function extensionRoot(executable) {
  if (!executable.endsWith(BUNDLE_SUFFIX)) return null;
  const root = executable.slice(0, -BUNDLE_SUFFIX.length);
  return /^(merttalhayener\.agent-pet|local\.codex-pet-panel)-\d+\.\d+\.\d+(?:-darwin-arm64)?$/.test(path.basename(root)) ? root : null;
}
async function markedForRemoval(executable) {
  const root = extensionRoot(executable);
  if (!root) return false; // Development checkouts do not have installation metadata.
  try {
    // VS Code marks a version only after it has been removed from ALL profiles.
    // An absent entry in the default profile's extensions.json is insufficient.
    const removed = JSON.parse(await fs.readFile(path.join(path.dirname(root), '.obsolete'), 'utf8'));
    return removed?.[path.basename(root)] === true;
  } catch { return false; } // Never interpret unreadable/partially written metadata as uninstall.
}
module.exports = { BUNDLE_SUFFIX, extensionRoot, markedForRemoval };
