const fs = require('node:fs/promises');
const path = require('node:path');
const { DesktopBridge } = require('./desktop.cjs');
const LEGACY_ID = 'local.codex-pet-panel';

async function prepareMarketplaceMigration(vscode, context) {
  const extensionId = context.extension.id;
  if (extensionId === LEGACY_ID) return true;
  if (vscode.extensions.getExtension(LEGACY_ID)) {
    // Do not register duplicate command IDs or launch a second helper while
    // the separately identified preview is still enabled in this host.
    const replace = 'Replace preview';
    void vscode.window.showInformationMessage('Agent Pet’s preview is still installed. Replace it to enable this version. Your pet preferences will be kept.', replace).then(async choice => {
      if (choice !== replace) return;
      try {
        await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', LEGACY_ID);
        void vscode.window.showInformationMessage('Preview removed. After active chats finish, run Developer: Reload Window in each window to enable Agent Pet.');
      } catch (error) { void vscode.window.showErrorMessage(`Could not replace the Agent Pet preview: ${error.message}`); }
    }).catch(error => vscode.window.showErrorMessage(`Could not prepare preview replacement: ${error.message}`));
    return false;
  }
  if (process.platform !== 'darwin') return true;
  const directory = path.join(context.globalStorageUri.fsPath, 'desktop');
  const oldDirectory = path.join(path.dirname(context.globalStorageUri.fsPath), LEGACY_ID, 'desktop');
  const executable = path.join(context.extensionPath, 'bin', 'Agent Pet.app', 'Contents', 'MacOS', 'codex-desktop-pet');
  const bridge = new DesktopBridge(oldDirectory, executable, () => ({}), () => {}, extensionId);
  await bridge.upgradeRunningHelper();
  if (await bridge.hasRunningHelper()) throw new Error('The preview helper is still running. Close the preview before opening Agent Pet.');
  await fs.mkdir(directory, { recursive: true });
  // Native preferences already use a stable UserDefaults suite. Import only
  // tracked IDs; never copy window routes or preview update-version markers.
  await fs.copyFile(path.join(oldDirectory, 'tracked-threads.json'), path.join(directory, 'tracked-threads.json'), fs.constants.COPYFILE_EXCL).catch(error => {
    if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error;
  });
  return true;
}
module.exports = { prepareMarketplaceMigration, LEGACY_ID };
