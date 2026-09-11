const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const report = path.join(__dirname, '..', 'artifacts', 'host-test.json');
exports.run = async function () {
  const vscode = require('vscode');
  await fs.mkdir(path.dirname(report), { recursive: true });
  try {
    const extension = vscode.extensions.getExtension('local.codex-pet-panel');
    assert.ok(extension, 'Pet extension discovered');
    const api = await extension.activate();
    assert.equal(api.availablePets.length, 9);
    await vscode.commands.executeCommand('codexPet.open');
    const end = Date.now() + 20000;
    while (api.getDiagnostics().readyViews < 1 && Date.now() < end) await new Promise(r => setTimeout(r, 200));
    assert.ok(api.getDiagnostics().readyViews >= 1, 'Real VS Code webview loaded JS and completed message handshake');
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('codexPet.choose'));
    assert.ok(commands.includes('codexPet.togglePresentation'));
    await fs.writeFile(report, JSON.stringify({ success: true, pets: api.availablePets, ...api.getDiagnostics() }, null, 2));
    console.log('PASS: actual VS Code activation, sidebar resolution, local asset discovery, webview script execution and message bridge.');
  } catch (error) {
    await fs.writeFile(report, JSON.stringify({ success: false, error: String(error) }));
    throw error;
  }
};
