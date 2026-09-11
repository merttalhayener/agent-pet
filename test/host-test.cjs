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
    assert.ok(api.availablePets.includes('agent-pet'));
    assert.equal(extension.packageJSON.extensionDependencies, undefined);
    assert.equal(extension.packageJSON.contributes.views, undefined, 'No legacy sidebar view contribution');
    assert.equal(extension.packageJSON.contributes.menus, undefined, 'No obsolete view toolbar');
    assert.equal(api.getDiagnostics().desktopSupported, process.platform === 'darwin');
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('codexPet.open'));
    assert.ok(commands.includes('codexPet.showDesktop'));
    assert.ok(commands.includes('codexPet.choose'));
    assert.ok(commands.includes('codexPet.togglePresentation'));
    await fs.writeFile(report, JSON.stringify({ success: true, pets: api.availablePets, ...api.getDiagnostics() }, null, 2));
    console.log('PASS: actual VS Code activation, desktop commands, local asset discovery and no sidebar contributions.');
  } catch (error) {
    await fs.writeFile(report, JSON.stringify({ success: false, error: String(error) }));
    throw error;
  }
};
