const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {marketplaceReadme}=require('../scripts/sync-readme.cjs');
const root=path.join(__dirname,'..');
test('relative images point to raw GitHub content and relative links to the repository',()=>{
 const out=marketplaceReadme('<img src="docs/media/demo.gif" alt="d">\n![x](docs/a.png) [Usage](docs/usage.md#install-update--remove) [Tr](README.tr.md)');
 assert.match(out,/src="https:\/\/raw\.githubusercontent\.com\/merttalhayener\/agent-pet\/main\/docs\/media\/demo\.gif"/);
 assert.match(out,/!\[x\]\(https:\/\/raw\.githubusercontent\.com\/merttalhayener\/agent-pet\/main\/docs\/a\.png\)/);
 assert.match(out,/\[Usage\]\(https:\/\/github\.com\/merttalhayener\/agent-pet\/blob\/main\/docs\/usage\.md#install-update--remove\)/);
 assert.match(out,/\[Tr\]\(https:\/\/github\.com\/merttalhayener\/agent-pet\/blob\/main\/README\.tr\.md\)/);
});
test('absolute URLs and in-page anchors are left unchanged',()=>{
 const src='[M](https://marketplace.visualstudio.com/x) [![b](https://img.shields.io/b)](LICENSE) [top](#install)';
 const out=marketplaceReadme(src);
 assert.ok(out.includes('[M](https://marketplace.visualstudio.com/x)'));
 assert.ok(out.includes('(https://img.shields.io/b)'));
 assert.ok(out.includes('[top](#install)'));
 assert.ok(out.includes('(https://github.com/merttalhayener/agent-pet/blob/main/LICENSE)'));
});
test('packaged Marketplace README is generated from the GitHub README',()=>{
 const expected=marketplaceReadme(fs.readFileSync(path.join(root,'README.md'),'utf8'));
 assert.equal(fs.readFileSync(path.join(root,'src/README.md'),'utf8'),expected,'Run: node scripts/sync-readme.cjs');
});
