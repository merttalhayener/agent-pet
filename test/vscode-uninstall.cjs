// CLI uninstall + deferred packaged hook contract in isolated VS Code directories.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn,execFile}=require('node:child_process'),run=require('node:util').promisify(execFile);
const {BUNDLE_SUFFIX}=require('../src/helper-lifecycle.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-vscode-uninstall-')),extensions=path.join(root,'extensions'),state=path.join(root,'state');
 const version=require('../src/package.json').version,id='merttalhayener.agent-pet';
 const flags=['--user-data-dir',path.join(root,'user-data'),'--extensions-dir',extensions];
 const code='/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
 let child,timer;
 try{
  await run(code,[...flags,'--install-extension',path.join(__dirname,`../artifacts/agent-pet-marketplace-${version}-darwin-arm64.vsix`),'--force'],{timeout:30000});
  const entry=JSON.parse(await fs.readFile(path.join(extensions,'extensions.json'))).find(e=>e.identifier.id===id);
  assert.equal(entry.version,version);assert.equal(path.basename(entry.relativeLocation),entry.relativeLocation);
  const folder=path.join(extensions,entry.relativeLocation),bundle=path.join(folder,'bin/Agent Pet.app');await fs.mkdir(state);
  const beat=()=>fs.writeFile(path.join(state,'client-test.json'),JSON.stringify({selected:'agent-pet',sleeping:false,selectedAt:0,sleepAt:0,updatedAt:Date.now(),pets:[],activity:{status:'idle',active:0,threads:[]}}));
  await beat();timer=setInterval(()=>beat().catch(()=>{}),1000);
  child=spawn(folder+BUNDLE_SUFFIX,['--state-dir',state,'--self-test','--lifecycle-test'],{stdio:'ignore'});
  await delay(1500);assert.equal(child.exitCode,null);assert.equal(child.signalCode,null);
  const result=await run(code,[...flags,'--uninstall-extension',id,'--force'],{timeout:30000});
  assert.match(result.stdout,/successfully uninstalled/);
  // CLI-only extension management has no running profile watcher. VS Code
  // defers the official hook until application cleanup. Execute that exact
  // packaged hook here to test its deferred contract without opening a GUI.
  assert.equal(JSON.parse(await fs.readFile(path.join(extensions,'extensions.json'))).some(e=>e.identifier.id===id),false);
  await run(process.execPath,[path.join(folder,'uninstall.cjs'),'--type=extension-post-uninstall'],{timeout:5000});
  for(let i=0;i<150;i++){
   const exists=await fs.stat(bundle).then(()=>true,()=>false);
   if(!exists&&(child.exitCode!==null||child.signalCode!==null))break;
   await delay(100);
  }
  await assert.rejects(fs.stat(bundle),{code:'ENOENT'});
  assert.ok(child.exitCode!==null||child.signalCode!==null);
  console.log('PASS: actual CLI uninstall followed by its packaged deferred hook stopped the native app and deleted Agent Pet.app.');
 }finally{
  clearInterval(timer);if(child&&child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
  await delay(200);await fs.rm(root,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
