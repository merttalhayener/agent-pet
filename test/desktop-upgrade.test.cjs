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
