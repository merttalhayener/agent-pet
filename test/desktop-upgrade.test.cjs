const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname, '../src/desktop.cjs'),'utf8');
function fixture(old, args, aliveAfterTerm=false) {
 const signals=[];let alive=true;
 const directory='/state with spaces';
 const sandbox={module:{exports:{}},setTimeout:fn=>{fn();},process:{kill:(id,signal)=>{signals.push([id,signal]);if(!alive)throw Object.assign(new Error('gone'),{code:'ESRCH'});if(signal==='SIGTERM'&&!aliveAfterTerm)alive=false;}},require:name=>name==='node:child_process'?{spawn:()=>{},execFile:(cmd,argv,options,cb)=>cb(null,cmd.endsWith('lsof')?'123\n':argv.includes('comm=')?old:args??`${old} --state-dir ${directory}`,'')}:name==='node:util'?{promisify:fn=>(...args)=>new Promise((resolve,reject)=>fn(...args,(e,stdout,stderr)=>e?reject(e):resolve({stdout,stderr})))}:name==='./helper-lifecycle.cjs'?require('../src/helper-lifecycle.cjs'):name==='./uninstall.cjs'?require('../src/uninstall.cjs'):require(name)};
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

function lifecycleFixture({running=true, available=true}={}) {
 const calls=[], files=new Set(['/state/desktop-hidden']);let active=running, candidate='/extensions/merttalhayener.agent-pet-0.11.5/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
 const old='/extensions/merttalhayener.agent-pet-0.11.4/bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet';
 const timers=[]; const sandbox={module:{exports:{}},setTimeout,setInterval:fn=>{timers.push(fn);return {unref(){}};},clearInterval:()=>{},process:{platform:'darwin',pid:99},require:name=>{
  if(name==='node:fs/promises')return {constants:{X_OK:1},access:async p=>{calls.push(['validate',p]);if(!available)throw Error('incomplete installation');},unlink:async p=>{files.delete(p);},writeFile:async p=>{files.add(p);},stat:async p=>{if(files.has(p))return {};throw Error('missing');},mkdir:async()=>{},rename:async()=>{}};
  if(name==='node:child_process')return {execFile(){},spawn:(exe,args)=>{calls.push(['spawn',exe,args]);active=true;return {on(){},unref(){}};}};
  return name==='./helper-lifecycle.cjs'?require('../src/helper-lifecycle.cjs'):name==='./uninstall.cjs'?require('../src/uninstall.cjs'):require(name);
 }};
 vm.runInNewContext(source,sandbox);
 const bridge=new sandbox.module.exports.DesktopBridge('/state',old,()=>({}),e=>calls.push(['error',e.message]),'merttalhayener.agent-pet',async()=>candidate);
 bridge.hasRunningHelper=async()=>active;
 bridge.upgradeRunningHelper=async()=>{if(active&&bridge.executable!==old){calls.push(['stop',old]);active=false;}};
 return {bridge,calls,files,timers,setCandidate:p=>{candidate=p;},old};
}
test('installed update replaces a hidden running panel without showing it or stopping snapshots',async()=>{
 const f=lifecycleFixture();await f.bridge.start();
 assert.deepEqual(f.calls.map(c=>c[0]),['validate','stop','spawn']);
 assert.ok(f.files.has('/state/desktop-hidden'));assert.ok(!f.files.has('/state/desktop-show-request'));
 assert.ok([...f.files].some(p=>p.includes('client-')));
 assert.equal(f.calls[2][1],f.bridge.executable);f.bridge.dispose();
});
test('background handover is serialized across repeated checks and does not reopen a quit app',async()=>{
 const f=lifecycleFixture();let upgraded=false;
 f.bridge.upgradeRunningHelper=async()=>{if(!upgraded){upgraded=true;f.calls.push(['stop']);f.bridge.hasRunningHelper=async()=>f.calls.some(c=>c[0]==='spawn');}};
 await Promise.all([f.bridge.reconcile(false,true),f.bridge.reconcile(false,true)]);
 assert.equal(f.calls.filter(c=>c[0]==='spawn').length,1);
 const quit=lifecycleFixture({running:false});await quit.bridge.reconcile(false,true);assert.deepEqual(quit.calls,[]);
});
test('missing replacement leaves the old helper alive and can be retried',async()=>{
 const f=lifecycleFixture({available:false});await assert.rejects(f.bridge.reconcile(false,true),/incomplete/);
 assert.deepEqual(f.calls.map(c=>c[0]),['validate']);
});
test('same-version and newer running helpers are reused; explicit Show still restores them',async()=>{
 const f=lifecycleFixture();f.setCandidate(f.old);await f.bridge.reconcile(true);
 assert.deepEqual(f.calls.map(c=>c[0]),['validate']);assert.ok(f.files.has('/state/desktop-show-request'));assert.ok(!f.files.has('/state/desktop-hidden'));
 // Another window already replaced the helper. upgradeRunningHelper refuses a downgrade.
 f.bridge.upgradeRunningHelper=async()=>{};await f.bridge.reconcile(false,true);
 assert.equal(f.calls.filter(c=>c[0]==='spawn').length,0);
});
test('poll detects the replacement while the same extension host stays active; disposal stops handover',async()=>{
 const f=lifecycleFixture();f.setCandidate(f.old);await f.bridge.start();assert.equal(f.calls.filter(c=>c[0]==='spawn').length,0);
 f.setCandidate(f.old.replace('0.11.4','0.11.5'));f.timers[1]();await f.bridge.lifecycle;
 assert.equal(f.calls.filter(c=>c[0]==='spawn').length,1);
 f.bridge.dispose();await f.bridge.reconcile(true);assert.equal(f.calls.filter(c=>c[0]==='spawn').length,1);
});

test('a failed replacement launch remains retryable even with Hide all enabled',async()=>{
 const f=lifecycleFixture({running:false});f.bridge.restartPending=true;
 await f.bridge.reconcile(false,true);
 assert.equal(f.calls.filter(c=>c[0]==='spawn').length,1);
 assert.ok(f.files.has('/state/desktop-hidden'));assert.ok(!f.files.has('/state/desktop-show-request'));
 // Once the replacement owns the lock, future explicit quits are respected.
 f.bridge.upgradeRunningHelper=async()=>{};await f.bridge.reconcile(false,true);assert.equal(f.bridge.restartPending,false);
});
