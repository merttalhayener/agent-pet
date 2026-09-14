const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const isClaudeTab = tab => typeof tab?.input?.viewType === 'string' && tab.input.viewType.endsWith('claudeVSCodePanel');

function createClaudeNavigation(vscode, getThread, extensionId = 'local.codex-pet-panel') {
  let pending = Promise.resolve();
  async function open(session) {
    const thread = await getThread(`claude:${session}`);
    if (!thread) { void vscode.window.showInformationMessage('This Claude chat is not available in the current workspace. Open its workspace and try again.'); return; }
    const extension = vscode.extensions.getExtension('anthropic.claude-code');
    if (!extension) { void vscode.window.showInformationMessage('Install Claude Code in VS Code to open this chat.'); return; }
    await extension.activate();
    await vscode.workspace.getConfiguration('claudeCode').update('preferredLocation', 'sidebar', vscode.ConfigurationTarget.Global);
    const matches = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab => isClaudeTab(tab) && tab.label === thread.title);
    // Claude prioritizes an existing editor tab even with honor-preferred-location.
    // Migrate only a settled, uniquely identified tab, after the session command
    // reveals that same tab. Never close another editor or interrupt active work.
    if (matches.length === 1 && ['ready', 'idle', 'failed'].includes(thread.status) && !matches[0].isDirty) {
      await vscode.commands.executeCommand('claude-vscode.primaryEditor.open', session);
      const candidate = matches[0];
      for (let i = 0; i < 10 && vscode.window.tabGroups.activeTabGroup.activeTab !== candidate; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (vscode.window.tabGroups.activeTabGroup.activeTab === candidate) {
        const closed = await vscode.window.tabGroups.close(candidate, true);
        if (!closed) { void vscode.window.showInformationMessage('Close this Claude editor tab when ready, then click the pet row again to open it in the sidebar.'); return; }
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        void vscode.window.showInformationMessage('Claude kept this chat in the editor. Close its tab when the turn finishes, then click the pet row again to use the sidebar.');
      }
    } else if (matches.length) {
      void vscode.window.showInformationMessage('Claude is keeping this session in its existing editor tab. When the turn finishes, close that tab and click the pet row again to use the sidebar.');
    }
    await vscode.commands.executeCommand('claude-vscode.editor.open', session, undefined, undefined, undefined, false, { programmatic: 'honor-preferred-location' });
  }
  return {
    handleUri(uri) {
      if (uri.authority !== extensionId || uri.path !== '/claude') return Promise.resolve();
      const params = new URLSearchParams(uri.query);
      const session = params.get('session');
      if (params.getAll('windowId').length > 1 || (params.has('windowId') && !/^\d+$/.test(params.get('windowId')))) return Promise.resolve();
      if (!UUID.test(session || '') || params.getAll('session').length !== 1 || [...params.keys()].some(key => key !== 'session' && key !== 'windowId')) return Promise.resolve();
      pending = pending.catch(() => {}).then(() => open(session)).catch(error => { void vscode.window.showErrorMessage(`Could not open the Claude sidebar: ${error.message}`); });
      return pending;
    }
  };
}
module.exports = { createClaudeNavigation };
