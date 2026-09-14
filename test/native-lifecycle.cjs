// macOS integration: isolated copies only, never the installed user extension.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {uninstall}=require('../src/uninstall.cjs');
const {BUNDLE_SUFFIX}=require('../src/helper-lifecycle.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-native-lifecycle-')),children=[],timers=[];
 const folders=['0.14.0','0.14.1'].map(v=>path.join(root,'merttalhayener.agent-pet-'+v+'-darwin-arm64'));
 const states=folders.map((_,i)=>path.join(root,'state-'+i));
 function alive(child){return child.exitCode===null&&child.signalCode===null;}
 async function waitExit(child,ms){for(let i=0;i<ms/100;i++){if(!alive(child))return;await delay(100);}throw Error('Helper did not exit');}
 try{
  for(let i=0;i<folders.length;i++){
   await fs.mkdir(path.join(folders[i],'bin'),{recursive:true});await fs.mkdir(states[i]);
   await fs.cp(path.join(__dirname,'../src/bin/Agent Pet.app'),path.join(folders[i],'bin/Agent Pet.app'),{recursive:true});
   await fs.writeFile(path.join(folders[i],'package.json'),JSON.stringify({publisher:'merttalhayener',name:'agent-pet',version:i?'0.14.1':'0.14.0'}));
  }
  const payload=()=>JSON.stringify({selected:'agent-pet',sleeping:false,selectedAt:0,sleepAt:0,updatedAt:Date.now(),pets:[],activity:{status:'idle',active:0,threads:[]}});
  async function heartbeat(state,name){await fs.writeFile(path.join(state,'client-'+name+'.json'),payload());}
  for(const state of states){await heartbeat(state,'one');timers.push(setInterval(()=>heartbeat(state,'one').catch(()=>{}),1000));}
  const launch=i=>{const child=spawn(folders[i]+BUNDLE_SUFFIX,['--state-dir',states[i],'--self-test','--lifecycle-test'],{stdio:'ignore'});children.push(child);return child;};
  const old=launch(0),current=launch(1);await delay(1500);assert.ok(alive(old)&&alive(current));
  // Old installation removed, even if its old host continues writing snapshots.
  await fs.writeFile(path.join(root,'.obsolete'),JSON.stringify({[path.basename(folders[0])]:true}));
  await waitExit(old,15000);assert.ok(alive(current));
  console.log('PASS: obsolete native app exited despite fresh old-host heartbeats; current version stayed alive.');
  await fs.writeFile(path.join(root,'.obsolete'),'{}');const oldAgain=launch(0);await delay(1200);
  await uninstall(folders[0]);await waitExit(oldAgain,3000);assert.ok(alive(current));
  assert.ok(await fs.stat(folders[0]+BUNDLE_SUFFIX)); // Actual file deletion belongs to VS Code.
  console.log('PASS: uninstall hook stopped its own app without affecting the newer native app.');
  clearInterval(timers[0]);await fs.rm(folders[0],{recursive:true});
  await heartbeat(states[1],'two');const second=setInterval(()=>heartbeat(states[1],'two').catch(()=>{}),1000);timers.push(second);
  clearInterval(timers[1]);await fs.unlink(path.join(states[1],'client-one.json'));await delay(2000);assert.ok(alive(current));
  console.log('PASS: removing one window retained the helper for the other window. Testing last-client grace…');
  clearInterval(second);await fs.unlink(path.join(states[1],'client-two.json'));await delay(2000);assert.ok(alive(current));
  // A normal reload reconnects within the grace period.
  await heartbeat(states[1],'reload');await delay(1200);assert.ok(alive(current));await fs.unlink(path.join(states[1],'client-reload.json'));
  await waitExit(current,65000);
  console.log('PASS: a brief reload survived; helper exited normally after the last client disconnected (60-second grace).');
 }finally{
  for(const timer of timers)clearInterval(timer);
  for(const child of children)if(alive(child))child.kill('SIGTERM');
  await delay(200);await fs.rm(root,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
