const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {BUNDLE_SUFFIX,markedForRemoval}=require('../src/helper-lifecycle.cjs');
const {installedMarketplacePackage}=require('../src/marketplace-updater.cjs');
test('removal requires an exact all-profile tombstone; corrupt/default-profile metadata is not uninstall',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-removal-'));
 const folder='merttalhayener.agent-pet-0.14.1-darwin-arm64',exe=path.join(root,folder)+BUNDLE_SUFFIX;
 try{
  await fs.writeFile(path.join(root,'extensions.json'),'[]');assert.equal(await markedForRemoval(exe),false);
  for(const content of ['{', '{}', JSON.stringify({[folder]:false}), JSON.stringify({[folder+'-other']:true})]){
   await fs.writeFile(path.join(root,'.obsolete'),content);assert.equal(await markedForRemoval(exe),false);
  }
  await fs.writeFile(path.join(root,'.obsolete'),JSON.stringify({[folder]:true}));assert.equal(await markedForRemoval(exe),true);
  assert.equal(await markedForRemoval(path.join(root,'checkout')+BUNDLE_SUFFIX),false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('an obsolete higher version cannot become the update replacement',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-removed-update-')),id='merttalhayener.agent-pet';
 try{
  const folder=id+'-0.14.2';await fs.mkdir(path.join(root,folder));
  await fs.writeFile(path.join(root,folder,'package.json'),JSON.stringify({publisher:'merttalhayener',name:'agent-pet',version:'0.14.2'}));
  await fs.writeFile(path.join(root,'extensions.json'),JSON.stringify([{identifier:{id},version:'0.14.2',relativeLocation:folder}]));
  await fs.writeFile(path.join(root,'.obsolete'),JSON.stringify({[folder]:true}));
  const context={extensionPath:path.join(root,id+'-0.14.1'),extension:{id,packageJSON:{version:'0.14.1'}}};
  assert.equal((await installedMarketplacePackage(context)).version,'0.14.1');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
async function hookFixture({changed=false,platform='darwin',publisher='merttalhayener',redirected=false,unregisterFails=false,alias=false}={}){
 const source=await fs.readFile(path.join(__dirname,'../src/uninstall.cjs'),'utf8');
 const root='/extensions/merttalhayener.agent-pet-0.14.1-darwin-arm64',exe=(alias?'/alias'+root:root)+BUNDLE_SUFFIX,signals=[],calls=[];
 const sandbox={module:{exports:{}},console:{warn(){}},__dirname:root,process:{platform,kill:(...args)=>signals.push(args)},require:name=>{
  if(name==='./helper-lifecycle.cjs')return require('../src/helper-lifecycle.cjs');
  if(name==='node:fs/promises')return {readFile:async()=>JSON.stringify({publisher,name:'agent-pet',version:'0.14.1'}),lstat:async()=>({}),realpath:async p=>redirected&&p.endsWith('.app')?'/another/app':p.replace(/^\/alias/, ''),rm:async(p,options)=>calls.push(['remove',p,options])};
  if(name==='node:child_process')return {execFile(){}};
  if(name==='node:util')return {promisify:()=>async(cmd,args)=>{
   calls.push([cmd,args]);if(cmd.endsWith('/lsregister')&&unregisterFails)throw Error('Launch Services unavailable');if(args[0]==='-axo')return {stdout:`  123 ${exe}\n  124 /extensions/merttalhayener.agent-pet-0.14.2${BUNDLE_SUFFIX}\n  125 /other/merttalhayener.agent-pet-0.14.1-darwin-arm64${BUNDLE_SUFFIX}\n  126 /extensions/other.agent-pet-0.14.1${BUNDLE_SUFFIX}\n`};
   if(args[0]==='-p')return {stdout:changed?'/unrelated/process':exe};
   return {stdout:''};
  }};
  return require(name);
 }};
 vm.runInNewContext(source,sandbox);
 return {hook:()=>sandbox.module.exports.uninstall(root),signals,calls,root};
}
test('uninstall stops only its exact package and unregisters only that bundle, preserving newer/foreign copies',async()=>{
 const f=await hookFixture();await f.hook();assert.deepEqual(f.signals,[[123,'SIGTERM']]);
 const unregister=f.calls.find(([cmd])=>cmd.endsWith('/lsregister'));assert.equal(unregister[1][1],f.root+'/bin/Agent Pet.app');
 assert.equal(f.calls.find(([cmd])=>cmd==='remove')[1],f.root+'/bin/Agent Pet.app');
});
test('uninstall rechecks the PID executable and ignores unsupported platforms and foreign manifests',async()=>{
 for(const options of [{changed:true},{platform:'linux'},{publisher:'other'}]){
  const f=await hookFixture(options);await f.hook();assert.deepEqual(f.signals,[]);
 }
});
test('removed client withdraws its heartbeat without relaunching; a completed update can recover',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-bridge-removal-'));
 const {DesktopBridge}=require('../src/desktop.cjs');
 const id='merttalhayener.agent-pet',old=path.join(root,id+'-0.14.1'),next=path.join(root,id+'-0.14.2'),state=path.join(root,'state');
 let candidate=old+BUNDLE_SUFFIX,upgrades=0;
 const b=new DesktopBridge(state,candidate,()=>({activity:{status:'running'}}),()=>{},id,async()=>candidate);
 b.removeInstalledHelper=async()=>{};
 b.hasRunningHelper=async()=>true;b.upgradeRunningHelper=async()=>{upgrades++;};
 try{
  await fs.mkdir(state);await fs.mkdir(path.dirname(next+BUNDLE_SUFFIX),{recursive:true});await fs.writeFile(next+BUNDLE_SUFFIX,'', {mode:0o755});
  await b.write();await fs.writeFile(path.join(root,'.obsolete'),JSON.stringify({[path.basename(old)]:true}));
  await b.reconcile(false,true);assert.equal(b.removed,true);await assert.rejects(fs.stat(b.file),{code:'ENOENT'});
  await b.write();await assert.rejects(fs.stat(b.file),{code:'ENOENT'});assert.equal(upgrades,0);
  candidate=next+BUNDLE_SUFFIX;await b.reconcile(false,true);assert.equal(b.removed,false);assert.equal(upgrades,1);
  assert.equal(JSON.parse(await fs.readFile(b.file)).activity.status,'running');
 }finally{b.dispose();await new Promise(r=>setTimeout(r,10));await fs.rm(root,{recursive:true,force:true});}
});

test('uninstall refuses a bundle redirected into another installation',async()=>{
 const f=await hookFixture({redirected:true});await assert.rejects(f.hook(),/redirected/);
 assert.deepEqual(f.signals,[]);assert.ok(!f.calls.some(([cmd])=>cmd==='remove'));
});

test('a removed installation is cleaned even when the pet was already quit',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-quit-removal-'));
 const folder='merttalhayener.agent-pet-0.14.2',exe=path.join(root,folder)+BUNDLE_SUFFIX;
 const {DesktopBridge}=require('../src/desktop.cjs');
 const b=new DesktopBridge(root,exe,()=>({}),()=>{},'merttalhayener.agent-pet');let removals=0;
 b.hasRunningHelper=async()=>false;b.removeInstalledHelper=async candidate=>{assert.equal(candidate,exe);removals++;};
 try{
  await fs.writeFile(path.join(root,'.obsolete'),JSON.stringify({[folder]:true}));
  await b.reconcile(false,true);await b.reconcile(false,true);assert.equal(removals,1);assert.equal(b.removed,true);
 }finally{b.dispose();await new Promise(r=>setTimeout(r,10));await fs.rm(root,{recursive:true,force:true});}
});

test('Launch Services failure cannot leave the uninstalled app on disk',async()=>{
 const f=await hookFixture({unregisterFails:true});await f.hook();
 assert.equal(f.calls.find(([cmd])=>cmd==='remove')[1],f.root+'/bin/Agent Pet.app');
});

test('uninstall recognizes filesystem aliases to its own executable',async()=>{
 const f=await hookFixture({alias:true});await f.hook();assert.deepEqual(f.signals,[[123,'SIGTERM']]);
});
