const fs = require('node:fs/promises');
const path = require('node:path');
const { newer } = require('./updater.cjs');

function canReload(vscode, activity) {
  if (!activity || activity.trackingDisabled || !Array.isArray(activity.threads)) return false;
  if (activity.active > 0 || !['idle', 'ready', 'failed'].includes(activity.status)) return false;
  if (activity.threads.some(t => !['ready', 'idle', 'failed'].includes(t.status))) return false;
  if (vscode.workspace.textDocuments.some(d => d.isDirty)) return false;
  if (vscode.workspace.notebookDocuments.some(d => d.isDirty)) return false;
  if (vscode.tasks.taskExecutions.length || vscode.debug.activeDebugSession) return false;
  return true;
}

function createUpdateReload(vscode, context, getActivity, { now = Date.now, delay = 15000 } = {}) {
  const stateFile = path.join(context.globalStorageUri.fsPath, 'updates', 'state.json');
  const current = context.extension.packageJSON.version;
  const tr = (en, tr) => vscode.env.language?.startsWith('tr') ? tr : en;
  let pendingVersion, quietSince, announced;
  let busy = false, disposed = false, reloaded = false, timer;
  let deferred = context.workspaceState.get('agentPet.deferredReloadVersion', '');
  function resetCountdown() { quietSince = undefined; }
  async function tick() {
    if (busy || disposed || reloaded) return;
    busy = true;
    try {
      const state = JSON.parse(await fs.readFile(stateFile, 'utf8').catch(() => '{}'));
      const version = state.installed;
      if (!newer(version, current) || deferred === version) { resetCountdown(); return; }
      if (pendingVersion !== version) { pendingVersion = version; announced = undefined; resetCountdown(); }
      if (!vscode.workspace.getConfiguration('codexPet').get('autoReloadAfterUpdate', true)) { resetCountdown(); return; }
      if (!announced) {
        announced = version;
        void vscode.window.showInformationMessage(tr(
          `Agent Pet ${version} installed. This window will reload automatically after tracked chats finish and unsaved changes are saved.`,
          `Agent Pet ${version} kuruldu. Takip edilen sohbetler bitip kaydedilmemiş değişiklikler kaydedilince bu pencere otomatik yenilenecek.`));
      }
      const activity = await getActivity();
      if (disposed || !canReload(vscode, activity)) { resetCountdown(); return; }
      if (quietSince === undefined) {
        quietSince = now();
        const later = tr('Later', 'Daha sonra');
        void vscode.window.showInformationMessage(tr(
          'Agent Pet update is ready. Reloading this window in 15 seconds.',
          'Agent Pet güncellemesi hazır. Bu pencere 15 saniye sonra yenilenecek.'), later).then(async choice => {
          if (disposed || reloaded || pendingVersion !== version || choice !== later) return;
          deferred = version; resetCountdown();
          await context.workspaceState.update('agentPet.deferredReloadVersion', version);
        }).catch(() => {});
        return;
      }
      if (now() - quietSince < delay) return;
      // Re-read immediately before reloading: a new turn, dirty editor, task or
      // changed preference cancels the countdown rather than interrupting work.
      const latest = await getActivity();
      if (disposed || deferred === version || !vscode.workspace.getConfiguration('codexPet').get('autoReloadAfterUpdate', true) || !canReload(vscode, latest)) { resetCountdown(); return; }
      reloaded = true;
      try { await vscode.commands.executeCommand('workbench.action.reloadWindow'); }
      catch (error) {
        deferred = version; resetCountdown();
        void vscode.window.showErrorMessage(tr(`Agent Pet could not reload this window: ${error.message}`, `Agent Pet bu pencereyi yenileyemedi: ${error.message}`));
      }
    } catch { resetCountdown(); /* A missing or incomplete marker cannot trigger a reload. */ }
    finally { busy = false; }
  }
  return { tick, start() { timer = setInterval(() => void tick(), 2000); timer.unref?.(); }, dispose() { disposed = true; clearInterval(timer); resetCountdown(); } };
}
module.exports = { canReload, createUpdateReload };
