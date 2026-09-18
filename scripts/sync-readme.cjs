// Generate the packaged Marketplace README from the GitHub README (single source).
// The Marketplace renders the package's README outside the repository, so relative
// images and links are rewritten to absolute GitHub URLs.
const fs=require('node:fs');
const path=require('node:path');
const REPO='https://github.com/merttalhayener/agent-pet';
const RAW='https://raw.githubusercontent.com/merttalhayener/agent-pet/main/';
const BLOB=REPO+'/blob/main/';
const HEADER='<!-- Generated from ../README.md by scripts/sync-readme.cjs. Edit README.md instead. -->\n';
const relative=url=>!/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(url);
function marketplaceReadme(text){
 return HEADER+text
  .replace(/(<img\b[^>]*\bsrc=")([^"]+)"/g,(m,pre,url)=>relative(url)?pre+RAW+url+'"':m)
  .replace(/(!\[[^\]]*\]\()([^)\s]+)\)/g,(m,pre,url)=>relative(url)?pre+RAW+url+')':m)
  // Images are absolute by now, so any remaining relative target is a link (including badge wrappers).
  .replace(/\]\(([^)\s]+)\)/g,(m,url)=>relative(url)?`](${BLOB+url})`:m);
}
if(require.main===module){
 const root=path.join(__dirname,'..');
 fs.writeFileSync(path.join(root,'src/README.md'),marketplaceReadme(fs.readFileSync(path.join(root,'README.md'),'utf8')));
}
module.exports={marketplaceReadme};
