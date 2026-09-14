const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname, '../src/desktop.cjs'),'utf8');
function fixture(old, args, aliveAfterTerm=false) {
 const signals=[];let alive=true;
 const directory='/state with spaces';
 const sandbox={module:{exports:{}},setTimeout:fn=>{fn();},process:{kill:(id,signal)=>{signals.push([id,signal]);if(!alive)throw Object.assign(new Error('gone'),{code:'ESRCH'});if(signal==='SIGTERM'&&!aliveAfterTerm)alive=false;}},require:name=>name==='node:child_process'?{spawn:()=>{},execFile:(cmd,argv,options,cb)=>cb(null,cmd.endsWith('lsof')?'123\n':argv.includes('comm=')?old:args??`${old} --state-dir ${directory}`,'')}:name==='node:util'?{promisify:fn=>(...args)=>new Promise((resolve,reject)=>fn(...args,(e,stdout,stderr)=>e?reject(e):resolve({stdout,stderr})))}:require(name)};
 vm.runInNewContext(source,sandbox);
 return {bridge:new sandbox.module.exports.DesktopBridge(directory,'/extensions/local.codex-pet-panel-0.7.1/bin/codex-desktop-pet',()=>{},()=>{}),signals};
}
test('upgrade terminates only an older helper with exact state arguments',async()=>{
 const f=fixture('/extensions/local.codex-pet-panel-0.7.0/bin/codex-desktop-pet');await f.bridge.upgradeRunningHelper();assert.equal(f.signals[0][1],'SIGTERM');
});
test('upgrade ignores same/newer versions, other roots, and different state',async()=>{
 for(const [old,args] of [['/extensions/local.codex-pet-panel-0.7.1/bin/codex-desktop-pet'],['/extensions/local.codex-pet-panel-0.8.0/bin/codex-desktop-pet'],['/other/local.codex-pet-panel-0.7.0/bin/codex-desktop-pet'],['/extensions/local.codex-pet-panel-0.7.0/bin/codex-desktop-pet','wrong state'],['/extensions/other-0.7.0/bin/codex-desktop-pet']]){const f=fixture(old,args);await f.bridge.upgradeRunningHelper();assert.equal(f.signals.length,0);}
});
test('upgrade reports a helper that fails to exit instead of launching a duplicate',async()=>{
 const f=fixture('/extensions/local.codex-pet-panel-0.7.0/bin/codex-desktop-pet',undefined,true);await assert.rejects(f.bridge.upgradeRunningHelper(),/still closing/);
});

test('bundle upgrades accept legacy and bundled helpers but never a newer bundle',async()=>{
 for (const suffix of ['bin/codex-desktop-pet','bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet']) {
  const f=fixture('/extensions/local.codex-pet-panel-0.9.1/'+suffix);
  f.bridge.executable='/extensions/local.codex-pet-panel-0.10.0/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
  await f.bridge.upgradeRunningHelper();assert.equal(f.signals[0][1],'SIGTERM');
 }
 const f=fixture('/extensions/local.codex-pet-panel-0.10.1/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet');
 f.bridge.executable='/extensions/local.codex-pet-panel-0.10.0/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
 await f.bridge.upgradeRunningHelper();assert.equal(f.signals.length,0);
});

test('bundle relaunched by Notification Center can upgrade using its held state lock',async()=>{
 const old='/extensions/local.codex-pet-panel-0.9.1/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
 const f=fixture(old,old);f.bridge.executable='/extensions/local.codex-pet-panel-0.10.0/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
 await f.bridge.upgradeRunningHelper();assert.equal(f.signals[0][1],'SIGTERM');
});

test('Marketplace helpers accept the platform suffix and legacy migration, rejecting foreign publishers',async()=>{
 for(const identity of ['local.codex-pet-panel-0.10.2','merttalhayener.agent-pet-0.10.3-darwin-arm64','other.agent-pet-0.10.3-darwin-arm64']){
  const f=fixture('/extensions/'+identity+'/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet');
  f.bridge.extensionId='merttalhayener.agent-pet';f.bridge.executable='/extensions/merttalhayener.agent-pet-0.11.0-darwin-arm64/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
  await f.bridge.upgradeRunningHelper();assert.equal(f.signals.some(s=>s[1]==='SIGTERM'),!identity.startsWith('other.'));
 }
});
