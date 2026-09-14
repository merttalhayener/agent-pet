const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createUpdateReload } = require('../src/update-reload.cjs');
const idle = () => ({status:'ready',active:0,threads:[{id:'sample',status:'ready'}]});
async function fixture(t, initial = idle()) {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(),'pet-reload-update-'));
 t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'updates','state.json');await fs.mkdir(path.dirname(file));await fs.writeFile(file,JSON.stringify({installed:'0.10.3'}));
 let activity=initial, clock=0, enabled=true, later, reads=0, beforeRead;
 const calls=[], messages=[], state=new Map();
 const vscode={env:{language:'en'},workspace:{textDocuments:[],notebookDocuments:[],getConfiguration:()=>({get:()=>enabled})},tasks:{taskExecutions:[]},debug:{},window:{showInformationMessage:(message,...choices)=>{messages.push(message);return choices.length?new Promise(resolve=>{later=resolve;}):Promise.resolve();},showErrorMessage:message=>messages.push(message)},commands:{executeCommand:async command=>calls.push(command)}};
 const context={globalStorageUri:{fsPath:dir},extension:{packageJSON:{version:'0.10.2'}},workspaceState:{get:(key,fallback)=>state.get(key)??fallback,update:async(key,value)=>state.set(key,value)}};
 const getActivity=async()=>{reads++;if(beforeRead)beforeRead(reads);return activity;};
 const controller=createUpdateReload(vscode,context,getActivity,{now:()=>clock});t.after(()=>controller.dispose());
 return {controller,vscode,context,file,calls,messages,state,getActivity,advance(ms){clock+=ms;},setActivity(a){activity=a;},setEnabled(v){enabled=v;},chooseLater(){later('Later');},beforeRead(fn){beforeRead=fn;},get reads(){return reads;}};
}
test('installed update reloads once after fifteen seconds of confirmed idle',async t=>{
 const f=await fixture(t);await f.controller.tick();assert.equal(f.calls.length,0);
 f.advance(14999);await f.controller.tick();assert.equal(f.calls.length,0);
 f.advance(1);await f.controller.tick();await f.controller.tick();assert.deepEqual(f.calls,['workbench.action.reloadWindow']);
});
test('running, waiting, quiet, unknown and uninitialized tracking postpone reload',async t=>{
 const f=await fixture(t);
 for(const status of ['running','waiting','quiet','unknown']) {
  f.setActivity({status:'idle',active:0,threads:[{status}]});await f.controller.tick();f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0,status);
 }
 for(const activity of [undefined,{...idle(),trackingDisabled:true},{status:'idle'}, {...idle(),active:1}]) {f.setActivity(activity);f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0);}
 f.setActivity(idle());await f.controller.tick();f.advance(15000);await f.controller.tick();assert.equal(f.calls.length,1);
});
test('new activity cancels the countdown and requires a fresh idle interval',async t=>{
 const f=await fixture(t);await f.controller.tick();f.advance(14000);f.setActivity({status:'running',active:1,threads:[{status:'running'}]});await f.controller.tick();
 f.advance(20000);f.setActivity(idle());await f.controller.tick();assert.equal(f.calls.length,0);
 f.advance(15000);await f.controller.tick();assert.equal(f.calls.length,1);
});
test('activity arriving during the final refresh prevents reload',async t=>{
 const f=await fixture(t);await f.controller.tick();f.advance(15000);
 f.beforeRead(n=>{if(n===3)f.setActivity({status:'running',active:1,threads:[{status:'running'}]});});
 await f.controller.tick();assert.equal(f.calls.length,0);
});
test('dirty text, notebooks, tasks and debugging defer reload',async t=>{
 const f=await fixture(t);
 for(const [object,key,value] of [[f.vscode.workspace,'textDocuments',[{isDirty:true}]],[f.vscode.workspace,'notebookDocuments',[{isDirty:true}]],[f.vscode.tasks,'taskExecutions',[{}]],[f.vscode.debug,'activeDebugSession',{}]]) {
  object[key]=value;await f.controller.tick();f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0);object[key]=Array.isArray(value)?[]:undefined;
 }
 await f.controller.tick();f.advance(15000);await f.controller.tick();assert.equal(f.calls.length,1);
});
test('Later is persisted for this workspace and this installed version',async t=>{
 const f=await fixture(t);await f.controller.tick();f.chooseLater();await Promise.resolve();f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0);
 const restarted=createUpdateReload(f.vscode,f.context,f.getActivity,{now:()=>999999});t.after(()=>restarted.dispose());await restarted.tick();await restarted.tick();assert.equal(f.calls.length,0);
 await fs.writeFile(f.file,JSON.stringify({installed:'0.10.4'}));await f.controller.tick();f.advance(15000);await f.controller.tick();assert.equal(f.calls.length,1);
});
test('disabled preference, current version, corrupt marker and disposal cannot reload',async t=>{
 const f=await fixture(t);f.setEnabled(false);await f.controller.tick();f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0);
 f.setEnabled(true);await fs.writeFile(f.file,JSON.stringify({installed:'0.10.2'}));await f.controller.tick();assert.equal(f.calls.length,0);
 await fs.writeFile(f.file,'{');await f.controller.tick();assert.equal(f.calls.length,0);
 await fs.writeFile(f.file,JSON.stringify({installed:'0.10.3'}));await f.controller.tick();f.controller.dispose();f.advance(20000);await f.controller.tick();assert.equal(f.calls.length,0);
});
test('windows sharing an update marker reload independently when their own chats finish',async t=>{
 const f=await fixture(t), running={status:'running',active:1,threads:[{status:'running'}]};let otherActivity=running,time=0;
 const otherCalls=[];const other=createUpdateReload({...f.vscode,commands:{executeCommand:async c=>otherCalls.push(c)}},{...f.context,workspaceState:{get:(_,fallback)=>fallback,update:async()=>{}}},async()=>otherActivity,{now:()=>time});t.after(()=>other.dispose());
 await f.controller.tick();await other.tick();f.advance(15000);time=15000;await f.controller.tick();await other.tick();assert.equal(f.calls.length,1);assert.equal(otherCalls.length,0);
 otherActivity=idle();await other.tick();time=30000;await other.tick();assert.deepEqual(otherCalls,['workbench.action.reloadWindow']);
});
