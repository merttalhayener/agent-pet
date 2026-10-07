const { EXTENSION_ID } = require('./antigravity-activity.cjs');
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function createAntigravityNavigation(vscode, getThread, extensionId = 'local.codex-pet-panel') {
  let pending = Promise.resolve();
  return { handleUri(uri) {
    if (uri.authority !== extensionId || uri.path !== '/antigravity') return Promise.resolve();
    const query = new URLSearchParams(uri.query), session = query.get('session');
    if (!UUID.test(session || '') || query.getAll('session').length !== 1 || query.getAll('windowId').length > 1 ||
        (query.has('windowId') && !/^\d+$/.test(query.get('windowId'))) || [...query.keys()].some(k => k !== 'session' && k !== 'windowId')) return Promise.resolve();
    pending = pending.catch(() => {}).then(async () => {
      const thread = await getThread(`antigravity:${session}`);
      if (!thread) { void vscode.window.showInformationMessage('This Antigravity chat is not available in the current workspace. Open its workspace and try again.'); return; }
      const extension = vscode.extensions.getExtension(EXTENSION_ID);
      if (!extension) { void vscode.window.showInformationMessage('Install Google Antigravity in VS Code to open this chat.'); return; }
      await extension.activate();
      // This command is provided by the official extension. The path comes only
      // from a locally tracked session, never from a URI supplied by a caller.
      await vscode.commands.executeCommand('antigravity.openConversation', session, thread.cwd);
    }).catch(() => { void vscode.window.showErrorMessage('Could not open the Antigravity chat. Check that Google Antigravity is running in this window.'); });
    return pending;
  } };
}

module.exports = { createAntigravityNavigation };
