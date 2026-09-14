const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {installedMarketplaceVersion,createMarketplaceUpdater}=require('../src/marketplace-updater.cjs');
const ID='merttalhayener.agent-pet';
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-market-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const context={extensionPath:path.join(root,ID+'-0.11.0-darwin-arm64'),extension:{id:ID,packageJSON:{version:'0.11.0'}}};
 const folder=ID+'-0.11.1-darwin-arm64';await fs.mkdir(path.join(root,folder));
 await fs.writeFile(path.join(root,folder,'package.json'),JSON.stringify({publisher:'merttalhayener',name:'agent-pet',version:'0.11.1'}));
 const entry={identifier:{id:ID},version:'0.11.1',relativeLocation:folder};
 return {root,context,entry,write:entries=>fs.writeFile(path.join(root,'extensions.json'),JSON.stringify(entries))};
}
test('Marketplace reload uses an indexed package with matching public identity and version',async t=>{
 const f=await fixture(t);await f.write([f.entry]);assert.equal(await installedMarketplaceVersion(f.context),'0.11.1');
 await f.write([]);assert.equal(await installedMarketplaceVersion(f.context),'0.11.0');
});
test('foreign, traversing, mismatched, older and corrupt packages do not trigger reload',async t=>{
 const f=await fixture(t);
 for(const entry of [{...f.entry,identifier:{id:'someone.agent-pet'}},{...f.entry,relativeLocation:'../'+f.entry.relativeLocation},{...f.entry,version:'0.11.2'},{...f.entry,version:'0.10.2'}]){
  await f.write([entry]);assert.equal(await installedMarketplaceVersion(f.context),'0.11.0');
 }
 await f.write([f.entry]);await fs.writeFile(path.join(f.root,f.entry.relativeLocation,'package.json'),'{');assert.equal(await installedMarketplaceVersion(f.context),'0.11.0');
 await fs.writeFile(path.join(f.root,'extensions.json'),'{');assert.equal(await installedMarketplaceVersion(f.context),'0.11.0');
});
test('update command opens only this Marketplace entry and stops on disposal',async()=>{
 const calls=[];const updater=createMarketplaceUpdater({commands:{executeCommand:async(...args)=>calls.push(args)}},{extension:{id:ID}});
 await updater.check();updater.dispose();await updater.check();assert.deepEqual(calls,[['workbench.extensions.search','@id:'+ID]]);
});
async function migrationFixture(t,{legacy=false,choice,alive=false}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-migrate-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const calls=[];const fakeBridge=class {async upgradeRunningHelper(){calls.push('upgrade');}async hasRunningHelper(){return alive;}};
 const module={exports:{}};vm.runInNewContext(await fs.readFile(path.join(__dirname,'../src/marketplace-migration.cjs'),'utf8'),{module,process:{platform:'darwin'},require:n=>n==='./desktop.cjs'?{DesktopBridge:fakeBridge}:require(n)});
 const api={extensions:{getExtension:()=>legacy?{}:undefined},window:{showInformationMessage:async()=>choice,showErrorMessage:async e=>{throw Error(e);}},commands:{executeCommand:async(...a)=>calls.push(a)}};
 const context={extension:{id:ID},extensionPath:'/extensions/'+ID+'-0.11.0-darwin-arm64',globalStorageUri:{fsPath:path.join(root,ID)}};
 return {root,calls,context,run:()=>module.exports.prepareMarketplaceMigration(api,context)};
}
test('enabled preview blocks duplicate activation; removal requires Replace preview',async t=>{
 const f=await migrationFixture(t,{legacy:true});assert.equal(await f.run(),false);assert.deepEqual(f.calls,[]);
 const g=await migrationFixture(t,{legacy:true,choice:'Replace preview'});assert.equal(await g.run(),false);assert.deepEqual(g.calls,[['workbench.extensions.uninstallExtension','local.codex-pet-panel']]);
});
test('migration preserves tracked IDs without copying routes or overwriting newer state',async t=>{
 const f=await migrationFixture(t);const old=path.join(f.root,'local.codex-pet-panel','desktop'),next=path.join(f.context.globalStorageUri.fsPath,'desktop');
 await fs.mkdir(old,{recursive:true});await fs.writeFile(path.join(old,'tracked-threads.json'),'["sample"]');await fs.writeFile(path.join(old,'workspace-routes.json'),'{}');
 assert.equal(await f.run(),true);assert.equal(await fs.readFile(path.join(next,'tracked-threads.json'),'utf8'),'["sample"]');await assert.rejects(fs.access(path.join(next,'workspace-routes.json')));
 await fs.writeFile(path.join(next,'tracked-threads.json'),'["new"]');await f.run();assert.equal(await fs.readFile(path.join(next,'tracked-threads.json'),'utf8'),'["new"]');
});
test('a surviving preview helper blocks new helper activation',async t=>{const f=await migrationFixture(t,{alive:true});await assert.rejects(f.run(),/still running/);});
