const { test } = require('node:test');
const assert = require('node:assert/strict');
const { describeWorkspace } = require('../src/workspace.cjs');
const folder = (path, name = 'Project') => ({ name, uri: { toString: () => 'file://' + path } });
test('workspace identity supports single folders, same names and multi-root workspace files', () => {
 const a = describeWorkspace({ workspaceFolders: [folder('/one/project')] });
 const b = describeWorkspace({ workspaceFolders: [folder('/two/project')] });
 assert.equal(a.name, b.name); assert.notEqual(a.id, b.id);
 const workspace = { name: 'Product', workspaceFile: { toString: () => 'file:///Product.code-workspace' }, workspaceFolders: [folder('/one'), folder('/two')] };
 assert.deepEqual(describeWorkspace(workspace), describeWorkspace({ ...workspace, workspaceFolders: [folder('/three')] }));
 assert.equal(describeWorkspace(workspace).name, 'Product');
 const folders = [folder('/one'), folder('/two')];
 assert.equal(describeWorkspace({ workspaceFolders: folders }).id, describeWorkspace({ workspaceFolders: [...folders].reverse() }).id);
 assert.equal(describeWorkspace({}).name, 'No workspace');
});
