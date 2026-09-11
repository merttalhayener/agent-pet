// Let VS Code attach its own window routing identity. These links are valid
// only while this window is alive, so publish them in live snapshots, not prefs.
async function resolveWindowNavigation(vscode) {
  const scheme = vscode.env.uriScheme;
  const [codex, claude] = await Promise.all([
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://openai.chatgpt/local/`)),
    vscode.env.asExternalUri(vscode.Uri.parse(`${scheme}://local.codex-pet-panel/claude`))
  ]);
  return { codex: codex.toString(true), claude: claude.toString(true) };
}
module.exports = { resolveWindowNavigation };
