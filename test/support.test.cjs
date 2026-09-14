const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createSupportCenter,readConnections,diagnosticReport,recent}=require('../src/support.cjs');
async function fixture() {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pet-support-')),directory=path.join(root,'desktop');await fs.mkdir(directory);
 const state=new Map(),calls=[],messages=[],context={extensionPath:root,extension:{id:'merttalhayener.agent-pet',packageJSON:{version:'0.16.0'}},globalStorageUri:{fsPath:root},subscriptions:[],globalState:{get:(k,d)=>state.has(k)?state.get(k):d,update:async(k,v)=>state.set(k,v)}};
 const vscode={version:'1.110.0',ViewColumn:{Active:1},extensions:{getExtension:id=>id==='openai.chatgpt'?{packageJSON:{version:'1.0.0'}}:undefined},workspace:{workspaceFolders:[{}]},commands:{executeCommand:async(...a)=>calls.push(a)},env:{clipboard:{writeText:async text=>calls.push(['clipboard',text])},openExternal:async uri=>calls.push(['external',uri])},Uri:{parse:x=>x},window:{state:{focused:true},showInformationMessage:async()=>{calls.push(['welcome']);return 'Later';},createWebviewPanel:()=>{calls.push(['guide']);return {visible:true,reveal(){},dispose(){},onDidDispose(){},webview:{postMessage:async m=>messages.push(m),onDidReceiveMessage(){}}};}}};
 const desktop={directory,clientId:'client-1-abc.json',timer:1,errors:[{at:123,code:'/private/user-secret'}]};
 const support=createSupportCenter(vscode,context,desktop,()=>({trackingDisabled:false}),async()=>calls.push(['open']));
 const snapshot=(at,extra={})=>({updatedAt:at,extensionVersion:'0.16.0',workspace:{name:'Sensitive project',roots:['/Users/private/project']},activity:{threads:[{title:'Secret chat',text:'Never export'}]},...extra});
 return {root,directory,context,state,calls,messages,vscode,desktop,support,snapshot,cleanup:async()=>{support.dispose();await fs.rm(root,{recursive:true,force:true});}};
}
test('connections distinguish fresh, disconnected, expired, malformed and future snapshots',async()=>{
 const f=await fixture(),now=Date.now();try{
  for(const [id,at] of [['1',now],['2',now-20000],['3',now-700000],['4',now+6000]])await fs.writeFile(path.join(f.directory,`client-${id}-abc.json`),JSON.stringify(f.snapshot(at)));
  await fs.writeFile(path.join(f.directory,'client-5-abc.json'),'{');
  const rows=await readConnections(f.directory,now);assert.equal(rows.length,2);assert.equal(rows.find(r=>r.id.startsWith('client-1')).connected,true);assert.equal(rows.find(r=>r.id.startsWith('client-2')).connected,false);
  assert.ok(!JSON.stringify(rows).includes('Secret chat'));assert.equal(recent(Infinity,now,15000),false);
 }finally{await f.cleanup();}
});
test('diagnostics preserve a recently disconnected window and separate helper health from chat tracking',async()=>{
 const f=await fixture();try{
  await fs.writeFile(path.join(f.directory,f.desktop.clientId),JSON.stringify(f.snapshot(Date.now(),{activity:{trackingDisabled:true,threads:[]}})));
  await fs.writeFile(path.join(f.directory,'helper-health.json'),JSON.stringify({updatedAt:Date.now(),version:'0.16.0',notifications:1,language:'tr'}));
  let s=await f.support.collect();assert.equal(s.helper.status,'connected');assert.equal(s.windows[0].tracking,false);assert.equal(s.language,'tr');assert.equal(s.windows[0].current,true);
  await fs.unlink(path.join(f.directory,f.desktop.clientId));s=await f.support.collect();assert.equal(s.windows.length,1);assert.equal(s.windows[0].connected,false);
  await fs.writeFile(path.join(f.directory,'helper-health.json'),JSON.stringify({updatedAt:Date.now()-20000,version:'0.14.2',notifications:2}));s=await f.support.collect();assert.equal(s.helper.status,'disconnected');assert.equal(s.helper.notifications,-1);
  await fs.unlink(path.join(f.directory,'helper-health.json'));assert.equal((await f.support.collect()).helper.status,'notRunning');
  f.desktop.hasRunningHelper=async()=>true;assert.equal((await f.support.collect()).helper.status,'unknown');
 }finally{await f.cleanup();}
});
test('copied report excludes chat text, names, paths, window identifiers and raw exception messages',async()=>{
 const f=await fixture();try{
  await fs.writeFile(path.join(f.directory,f.desktop.clientId),JSON.stringify(f.snapshot(Date.now())));
  await f.support.action({action:'copy'});const report=JSON.parse(f.calls.find(c=>c[0]==='clipboard')[1]);
  for(const forbidden of ['Sensitive project','/Users','Secret chat','Never export','client-1-abc','user-secret'])assert.ok(!JSON.stringify(report).includes(forbidden));
  assert.equal(report.windows[0].chats,1);assert.equal(report.errors[0].code,'HELPER_ERROR');assert.equal(report.agents[1].installed,false);
 }finally{await f.cleanup();}
});
test('support actions whitelist commands, completion persists, and disposal prevents further actions',async()=>{
 const f=await fixture();try{
  await f.support.action({action:'executeCommand',command:'workbench.action.closeWindow'});await f.support.action({action:'openExternal',url:'https://bad.example'});assert.equal(f.calls.length,0);
  await f.support.action({action:'claude'});assert.deepEqual(f.calls[0],['workbench.extensions.search','@id:anthropic.claude-code']);
  await f.support.action({action:'notifications'});assert.ok(await fs.stat(path.join(f.directory,'desktop-notifications-request')));
  await f.support.action({action:'complete'});assert.equal(f.state.get('setupCompleted'),true);
  f.support.dispose();const before=f.calls.length;await f.support.action({action:'showPet'});assert.equal(f.calls.length,before);
 }finally{await f.cleanup();}
});
const settle=()=>new Promise(r=>setTimeout(r,60));
test('guide opens directly once across windows, including users who missed the old notification',async()=>{
 const f=await fixture();let other;try{
  f.state.set('setupWelcomeSeen',true);await fs.writeFile(path.join(f.directory,'setup-welcome-seen'),'');
  other=createSupportCenter(f.vscode,f.context,f.desktop,()=>({}),async()=>{});
  f.support.start();other.start();await settle();assert.equal(f.calls.filter(c=>c[0]==='guide').length,1);assert.equal(f.calls.filter(c=>c[0]==='welcome').length,0);assert.equal(f.state.get('setupAutoOpened'),true);assert.equal(f.state.get('setupCompleted'),undefined);
  f.support.dispose();other.dispose();f.state.delete('setupAutoOpened');
  other=createSupportCenter(f.vscode,f.context,f.desktop,()=>({}),async()=>{});other.start();await settle();assert.equal(f.calls.filter(c=>c[0]==='guide').length,1,'shared marker survives reinstall/reload');
 }finally{other?.dispose();await f.cleanup();}
});
test('completed setup never auto-opens; a background window waits for focus',async()=>{
 const f=await fixture();let focus;try{
  f.state.set('setupCompleted',true);f.support.start();await settle();assert.equal(f.calls.length,0);f.support.dispose();
  f.state.delete('setupCompleted');f.vscode.window.state.focused=false;
  f.vscode.window.onDidChangeWindowState=fn=>{focus=fn;return {dispose(){}};};
  f.support=createSupportCenter(f.vscode,f.context,f.desktop,()=>({}),async()=>{});f.support.start();await settle();assert.equal(f.calls.length,0);
  f.vscode.window.state.focused=true;focus();await settle();assert.equal(f.calls.filter(c=>c[0]==='guide').length,1);
  focus();await settle();assert.equal(f.calls.filter(c=>c[0]==='guide').length,1);f.support.dispose();
 }finally{f.support.dispose();await f.cleanup();}
});
test('failed guide opening releases its claim and retries on focus',async()=>{
 const f=await fixture();let focus;try{
  const create=f.vscode.window.createWebviewPanel;
  f.vscode.window.createWebviewPanel=()=>{throw Error('webview unavailable');};
  f.vscode.window.onDidChangeWindowState=fn=>{focus=fn;return {dispose(){}};};
  f.support.start();await settle();assert.equal(f.state.get('setupAutoOpened'),undefined);await assert.rejects(fs.stat(path.join(f.directory,'setup-auto-opened')),{code:'ENOENT'});
  f.vscode.window.createWebviewPanel=create;focus();await settle();assert.equal(f.state.get('setupAutoOpened'),true);assert.equal(f.calls.filter(c=>c[0]==='guide').length,1);
 }finally{await f.cleanup();}
});

test('closing a webview during its initial file read prevents a late write to the disposed panel',async()=>{
 const f=await fixture();try{
  let onDispose,writes=0;f.vscode.window.createWebviewPanel=()=>({webview:{set html(value){writes++;}},onDidDispose:fn=>{onDispose=fn;}});
  const pending=f.support.show();onDispose();await pending;assert.equal(writes,0);
 }finally{await f.cleanup();}
});
