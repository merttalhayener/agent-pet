const crypto = require('node:crypto');
function describeWorkspace(workspace) {
  const folders = workspace.workspaceFolders || [];
  const location = workspace.workspaceFile?.toString() || folders.map(f => f.uri.toString()).sort().join('\n');
  return {
    id: crypto.createHash('sha256').update(location || 'empty-window').digest('hex'),
    name: workspace.name || folders[0]?.name || 'No workspace',
    roots: [...new Set(folders.filter(f => f.uri.scheme === 'file').map(f => f.uri.fsPath))].sort(),
  };
}
module.exports = { describeWorkspace };
