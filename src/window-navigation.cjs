// Let VS Code attach its own window routing identity. These links are valid
// only while this window is alive, so publish them in live snapshots, not prefs.
async function resolveWindowNavigation(vscode, extensionId = 'local.codex-pet-panel') {
  const scheme = vscode.env.uriScheme;
  const [codex, claude, terminal, antigravity] = await Promise.all([
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://openai.chatgpt/local/`)),
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://${extensionId}/claude`)),
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://${extensionId}/terminal`)),
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://${extensionId}/antigravity`))
  ]);
  return { codex: codex.toString(true), claude: claude.toString(true), terminal: terminal.toString(true), antigravity: antigravity.toString(true) };
}
module.exports = { resolveWindowNavigation };
