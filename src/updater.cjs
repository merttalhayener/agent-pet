const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const REPO = 'merttalhayener/agent-pet';
function versionParts(value) { return /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value || '') ? value.replace(/^v/, '').split('.').map(Number) : null; }
function newer(a, b) {
  const av = versionParts(a), bv = versionParts(b);
  if (!av || !bv) return false;
  const i = av.findIndex((n, i) => n !== bv[i]); return i >= 0 && av[i] > bv[i];
}
function selectRelease(releases, current) {
  if (!Array.isArray(releases)) throw new Error('Invalid GitHub release response.');
  return releases.filter(r => !r.draft && newer(r.tag_name, current) && Array.isArray(r.assets) && r.assets.some(a => a.name === `agent-pet-${r.tag_name.replace(/^v/, '')}.vsix`))
    .sort((a, b) => newer(a.tag_name, b.tag_name) ? -1 : 1)[0];
}
async function download(url, limit, fetcher = fetch) {
  const parsed = new URL(url);
  const allowed = parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port &&
    ((parsed.hostname === 'api.github.com' && parsed.pathname === `/repos/${REPO}/releases`) ||
     (parsed.hostname === 'github.com' && parsed.pathname.startsWith(`/${REPO}/releases/download/`)));
  if (!allowed) throw new Error('Untrusted update URL.');
  const response = await fetcher(url, { signal: AbortSignal.timeout(120000), headers: { 'User-Agent': 'Agent-Pet-Updater', Accept: parsed.hostname === 'api.github.com' ? 'application/vnd.github+json' : 'application/octet-stream' } });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Update download is too large.');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length; if (length > limit) throw new Error('Update download is too large.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
async function verifiedPackage(release, fetcher = fetch) {
  const version = release.tag_name.replace(/^v/, '');
  const name = `agent-pet-${version}.vsix`, asset = release.assets.find(a => a.name === name);
  const base = `https://github.com/${REPO}/releases/download/${release.tag_name}/`;
  if (asset?.browser_download_url !== base + name) throw new Error('Unexpected update asset.');
  let digest = /^sha256:[a-f0-9]{64}$/i.test(asset.digest || '') ? asset.digest.slice(7).toLowerCase() : null;
  if (!digest) {
    const sums = release.assets.find(a => a.name === 'SHA256SUMS');
    if (sums?.browser_download_url !== base + 'SHA256SUMS') throw new Error('Release has no SHA-256 checksum.');
    const lines = (await download(sums.browser_download_url, 65536, fetcher)).toString('utf8').split(/\r?\n/);
    const matches = lines.map(line => line.match(/^([a-f0-9]{64})\s+\*?(.+)$/i)).filter(m => m && m[2] === name);
    if (matches.length !== 1) throw new Error('Release checksum is missing or ambiguous.');
    digest = matches[0][1].toLowerCase();
  }
  const data = await download(asset.browser_download_url, 100 * 1024 * 1024, fetcher);
  if (crypto.createHash('sha256').update(data).digest('hex') !== digest) throw new Error('Update checksum verification failed.');
  return { data, name, version };
}
function createUpdater(vscode, context, { fetcher = fetch } = {}) {
  const directory = path.join(context.globalStorageUri.fsPath, 'updates');
  const lock = path.join(directory, 'check.lock'), stateFile = path.join(directory, 'state.json');
  let busy = false, disposed = false;
  async function check(manual = true) {
    if (busy || disposed) return;
    busy = true; let handle, installing = false;
    const tr = (en, tr) => vscode.env.language?.startsWith('tr') ? tr : en;
    try {
      await fs.mkdir(directory, { recursive: true });
      try { handle = await fs.open(lock, 'wx', 0o600); await handle.writeFile(String(process.pid)); }
      catch (e) {
        if (e.code !== 'EEXIST') throw e;
        const pid = Number(await fs.readFile(lock, 'utf8').catch(() => ''));
        if (Number.isSafeInteger(pid) && pid > 0) {
          try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') await fs.unlink(lock).catch(() => {}); }
        }
        if (manual) void vscode.window.showInformationMessage(tr('Agent Pet: another window is checking for updates. Try again shortly.', 'Agent Pet: başka bir pencere güncellemeleri denetliyor. Birazdan tekrar dene.'));
        return;
      }
      const state = JSON.parse(await fs.readFile(stateFile, 'utf8').catch(() => '{}'));
      if (!manual && Date.now() - (state.checkedAt || 0) < 24 * 60 * 60 * 1000) return;
      // Back off failed background requests too; manual checks remain available.
      state.checkedAt = Date.now(); await fs.writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
      const current = context.extension.packageJSON.version;
      const releases = JSON.parse((await download(`https://api.github.com/repos/${REPO}/releases?per_page=100`, 4 * 1024 * 1024, fetcher)).toString('utf8'));
      const latest = selectRelease(releases, newer(state.installed, current) ? state.installed : current);
      if (!latest) { if (manual) void vscode.window.showInformationMessage(tr('Agent Pet is up to date. If you just installed an update, reload each window after its active chats finish.', 'Agent Pet güncel. Yeni güncelleme kurduysan aktif sohbetler bitince her pencereyi yeniden yükle.')); return; }
      const install = tr('Install update', 'Güncellemeyi kur');
      const choice = await vscode.window.showInformationMessage(tr(`Agent Pet ${latest.tag_name} is available${latest.prerelease ? ' (beta)' : ''}.`, `Agent Pet ${latest.tag_name} hazır${latest.prerelease ? ' (beta)' : ''}.`), install);
      if (choice !== install || disposed) return;
      installing = true;
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: tr('Updating Agent Pet…', 'Agent Pet güncelleniyor…') }, async () => {
        const pkg = await verifiedPackage(latest, fetcher);
        const temp = await fs.mkdtemp(path.join(directory, 'install-'));
        try {
          const file = path.join(temp, pkg.name); await fs.writeFile(file, pkg.data, { mode: 0o600 });
          await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(file));
          state.installed = pkg.version; await fs.writeFile(stateFile, JSON.stringify(state), { mode: 0o600 });
        } finally { await fs.rm(temp, { recursive: true, force: true }); }
      });
      void vscode.window.showInformationMessage(tr('Agent Pet updated. When active chats finish, run Developer: Reload Window in each open VS Code window.', 'Agent Pet güncellendi. Aktif sohbetler bitince açık VS Code pencerelerinde Developer: Reload Window çalıştır.'));
    } catch (error) {
      if (manual || installing) void vscode.window.showErrorMessage(`Agent Pet: ${error.message}`);
    } finally {
      if (handle) { await handle.close(); await fs.unlink(lock).catch(() => {}); }
      busy = false;
    }
  }
  let timer;
  function start() {
    timer = setInterval(async () => {
      if (disposed || busy) return;
      const request = path.join(context.globalStorageUri.fsPath, 'desktop', 'check-update-request');
      // Only the window that successfully consumes this request opens the prompt.
      try { await fs.unlink(request); await check(true); return; } catch (error) { if (error.code !== 'ENOENT') return; }
      if (vscode.workspace.getConfiguration('codexPet').get('checkForUpdates', true)) await check(false);
    }, 15000);
    timer.unref?.();
  }
  return { check, start, dispose() { disposed = true; clearInterval(timer); } };
}
module.exports = { createUpdater, selectRelease, newer, verifiedPackage, download };
