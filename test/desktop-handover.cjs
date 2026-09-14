// macOS integration check: node test/desktop-handover.cjs (uses isolated C helpers, not the user’s panel).
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {execFile}=require('node:child_process'),run=require('node:util').promisify(execFile);
const {DesktopBridge}=require('../src/desktop.cjs');
const {installedMarketplacePackage}=require('../src/marketplace-updater.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-real-handover-')),state=path.join(root,'state with spaces'),id='merttalhayener.agent-pet',errors=[],bridges=[],pids=[];
 try{
  await fs.mkdir(state);const source=path.join(root,'helper.c');
  await fs.writeFile(source,'#include <sys/file.h>\n#include <unistd.h>\n#include <fcntl.h>\n#include <stdio.h>\nint main(int argc,char**argv){char p[4096];snprintf(p,sizeof(p),"%s/desktop.lock",argv[2]);int fd=open(p,O_CREAT|O_RDWR,0600);if(flock(fd,LOCK_EX|LOCK_NB))return 0;for(;;)pause();}\n');
  const folders=['0.11.4','0.11.5'].map(v=>path.join(root,id+'-'+v+'-darwin-arm64'));
  const binaries=folders.map(f=>path.join(f,'bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet'));
  for(let i=0;i<2;i++){await fs.mkdir(path.dirname(binaries[i]),{recursive:true});await run('/Library/Developer/CommandLineTools/usr/bin/clang',['-isysroot','/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk',source,'-o',binaries[i]]);await fs.writeFile(path.join(folders[i],'package.json'),JSON.stringify({name:'agent-pet',publisher:'merttalhayener',version:'0.11.'+(4+i)}));}
  const context={extensionPath:folders[0],extension:{id,packageJSON:{version:'0.11.4'}}};
  const resolve=async()=>path.join((await installedMarketplacePackage(context)).extensionPath,'bin/Agent Pet.app/Contents/MacOS/codex-desktop-pet');
  const bridge=new DesktopBridge(state,binaries[0],()=>({activity:{status:'running',threads:[{id:'sample',status:'running'}]}}),e=>errors.push(e),id,resolve);bridges.push(bridge);await bridge.start();
  async function holder(){try{return Number((await run('/usr/sbin/lsof',['-t','--',path.join(state,'desktop.lock')])).stdout.trim());}catch{return 0;}}
  async function waitFor(fn){for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out');}
  let old;await waitFor(async()=>Boolean(old=await holder()));pids.push(old);
  await fs.writeFile(path.join(state,'desktop-hidden'),'');
  await fs.writeFile(path.join(root,'extensions.json'),JSON.stringify([{identifier:{id},version:'0.11.5',relativeLocation:path.basename(folders[1])}]));
  let next;await waitFor(async()=>Boolean((next=await holder())&&next!==old));pids.push(next);
  assert.equal((await run('/bin/ps',['-p',String(next),'-o','comm='])).stdout.trim(),binaries[1]);
  assert.throws(()=>process.kill(old,0));assert.ok(await fs.stat(path.join(state,'desktop-hidden')));
  const data=JSON.parse(await fs.readFile(bridge.file));assert.equal(data.activity.threads[0].status,'running');
  const stale=new DesktopBridge(state,binaries[0],()=>({}),e=>errors.push(e),id);bridges.push(stale);await stale.start();assert.equal(await holder(),next);
  assert.equal(errors.length,0);console.log('PASS: real macOS lock holder upgraded by background poll; old PID exited; new binary owns lock; active snapshot and hidden preference retained; older window did not downgrade.');
 }finally{for(const b of bridges)b.dispose();for(const pid of pids){try{process.kill(pid,'SIGTERM');}catch{}}await new Promise(r=>setTimeout(r,100));await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
