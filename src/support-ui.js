(() => {
  const vscode = acquireVsCodeApi();
  let state;
  const words = {
    'Your companion, connected.':'Arkadaşınla bağlantıda.', 'Set up Agent Pet and see what is connected.':'Agent Pet’i kur ve bağlantılarını gör.',
    'Get started':'Başlangıç', 'Connections':'Bağlantılar', 'Diagnostics':'Tanılama', 'Connected':'Bağlı', 'Disconnected':'Bağlantı kesildi', 'Pet not running':'Pet çalışmıyor', 'Status unavailable':'Durum bilgisi yok',
    'A few steps, then back to your work.':'Birkaç adım, sonra işine dön.', 'Open a workspace and install an agent':'Çalışma alanı aç ve bir agent kur',
    'Codex and Claude Code are supported. Sign in inside your agent’s own VS Code panel.':'Codex ve Claude Code desteklenir. Agent’ın kendi VS Code panelinde giriş yap.',
    'Installed':'Kurulu', 'Not installed':'Kurulu değil', 'Open folder':'Klasör aç', 'Show your companion':'Masaüstü arkadaşını göster',
    'Choose Byte, Miso or Fern. The pet and chat list can be hidden separately from the paw menu.':'Byte, Miso veya Fern’i seç. Pet ve sohbet listesi pati menüsünden ayrı ayrı gizlenebilir.',
    'Show pet / panel':'Peti / paneli göster', 'Choose pet':'Pet seç', 'Notifications are optional':'Bildirimler isteğe bağlı',
    'Get a macOS alert when a tracked chat waits for your reply. You can enable this later.':'Takip edilen sohbet yanıtını beklediğinde macOS bildirimi al. Bunu daha sonra da açabilirsin.',
    'Enable waiting alerts':'Yanıt bildirimlerini aç', 'Notification settings':'Bildirim ayarları', 'Finish setup':'Kurulumu tamamla', 'Setup complete':'Kurulum tamamlandı',
    'Start a conversation in Codex or Claude Code; its row will appear in the floating panel.':'Codex veya Claude Code’da bir sohbet başlat; satırı masaüstü panelinde görünecek.',
    'Local VS Code sessions only. An installed extension does not confirm that you are signed in.':'Yalnızca yerel VS Code oturumları desteklenir. Eklentinin kurulu olması giriş yapıldığını doğrulamaz.',
    'Window connections':'Pencere bağlantıları', 'These are connections to Agent Pet, independent of whether a chat is running or completed.':'Bunlar Agent Pet bağlantılarıdır; sohbetin çalışması veya tamamlanmasından bağımsızdır.',
    'Connected windows':'Bağlı pencereler', 'Recent disconnections':'Yakın zamandaki kopmalar', 'Tracking':'Takip', 'On':'Açık', 'Off':'Kapalı',
    'Workspace / window':'Çalışma alanı / pencere', 'Connection':'Bağlantı', 'Last seen':'Son bağlantı', 'Chats':'Sohbetler', 'This window':'Bu pencere', 'Focused':'Odakta', 'Window':'Pencere',
    'No window connection yet':'Henüz pencere bağlantısı yok', 'Open the pet in this window to start the connection.':'Bağlantıyı başlatmak için bu pencerede peti aç.',
    'This window is not publishing to the pet. Automatic desktop opening may be off.':'Bu pencere pete veri göndermiyor. Masaüstü otomatik açılışı kapalı olabilir.',
    'Tracking is disabled in this window. Connection health does not imply chat tracking is enabled.':'Bu pencerede takip kapalı. Bağlantının açık olması sohbet takibinin açık olduğu anlamına gelmez.',
    'Settings':'Ayarlar', 'Refresh':'Yenile', 'Loaded extension':'Yüklü pencere sürümü', 'Installed extension':'Diskteki eklenti sürümü', 'Running pet':'Çalışan pet sürümü',
    'A newer extension is installed. This window will use it after a safe reload. Finish active chats first.':'Yeni eklenti sürümü kurulmuş. Bu pencere güvenli bir yenilemeden sonra yeni sürümü kullanacak. Önce aktif sohbetleri bitir.',
    'The running pet differs from the installed extension. Check updates or reopen the pet.':'Çalışan pet ile kurulu eklenti sürümü farklı. Güncellemeleri denetle veya peti yeniden aç.',
    'System':'Sistem', 'Supported':'Destekleniyor', 'Requires Apple Silicon and macOS 26+':'Apple Silicon ve macOS 26+ gerekir',
    'Local agent records':'Yerel agent kayıtları', 'Readable':'Okunabiliyor', 'No local records yet':'Henüz yerel kayıt yok', 'Cannot read records':'Kayıtlar okunamıyor',
    'Recent errors':'Son hatalar', 'No errors recorded in this window.':'Bu pencerede kaydedilmiş hata yok.',
    'Copy diagnostics':'Tanılama raporunu kopyala', 'Check for updates':'Güncellemeleri denetle',
    'The copied report includes versions, connection counts and error codes. It excludes chat text, titles, workspace names and file paths.':'Kopyalanan rapor sürümleri, bağlantı sayılarını ve hata kodlarını içerir. Sohbet metinleri, başlıkları, çalışma alanı adları ve dosya yollarını içermez.',
    'Diagnostics copied.':'Tanılama raporu kopyalandı.', 'Action failed. Check Diagnostics for the error code.':'İşlem başarısız. Hata kodu için Tanılama’ya bak.',
    'Permission not requested':'İzin henüz istenmedi', 'Permission denied':'İzin reddedildi', 'Permission allowed':'İzin verildi', 'Permission unknown':'İzin durumu bilinmiyor',
    'Waiting alerts on':'Yanıt bildirimleri açık', 'Waiting alerts off':'Yanıt bildirimleri kapalı', 'Unknown':'Bilinmiyor', 'No workspace':'Çalışma alanı yok', 'ago':'önce', 's':'sn', 'min':'dk'
  };
  const t = key => state?.language === 'tr' ? words[key] || key : key;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (action, label, primary=false) => `<button data-action="${action}"${primary?' class="primary"':''}>${esc(t(label))}</button>`;
  const badge = (ok, label) => `<span class="${ok?'good':'warn'}">${ok?'●':'○'} ${esc(t(label))}</span>`;
  const metric = (label, value) => `<div class="card"><small>${esc(t(label))}</small><div class="metric">${esc(value)}</div></div>`;
  const age = at => { const seconds=Math.max(0,Math.floor((state.generatedAt-at)/1000));return `${seconds<60?seconds:Math.floor(seconds/60)} ${t(seconds<60?'s':'min')} ${t('ago')}`; };
  const permission = () => t(state.helper.notifications===0?'Permission not requested':state.helper.notifications===1?'Permission denied':[2,3,4].includes(state.helper.notifications)?'Permission allowed':'Permission unknown');
  function render() {
    const active = document.activeElement, focusedAction=active?.dataset?.action;
    document.documentElement.lang=state.language;
    document.getElementById('title').textContent=t('Your companion, connected.');
    document.getElementById('subtitle').textContent=t('Set up Agent Pet and see what is connected.');
    const health=document.getElementById('health');health.textContent=t(state.helper.status==='connected'?'Connected':state.helper.status==='disconnected'?'Disconnected':state.helper.status==='unknown'?'Status unavailable':'Pet not running');health.className='badge '+(state.helper.status==='connected'?'good':'warn');
    for(const [tab,label] of [['setup','Get started'],['connections','Connections'],['diagnostics','Diagnostics']]) {
      const b=document.getElementById('tab-'+tab);b.textContent=t(label);b.setAttribute('aria-selected',String(state.tab===tab));b.tabIndex=state.tab===tab?0:-1;
      document.getElementById(tab).hidden=state.tab!==tab;
    }
    document.getElementById('setup').innerHTML=`<h2>${esc(t('A few steps, then back to your work.'))}</h2><p class="muted">${esc(t('Local VS Code sessions only. An installed extension does not confirm that you are signed in.'))}</p><div class="cards">
      <article class="card step"><span class="number">${state.workspaceOpen&&state.agents.some(a=>a.installed)?'✓':'1'}</span><div><h3>${esc(t('Open a workspace and install an agent'))}</h3><p class="muted">${esc(t('Codex and Claude Code are supported. Sign in inside your agent’s own VS Code panel.'))}</p>${state.agents.map(a=>`<div>${esc(a.name)} · ${badge(a.installed,a.installed?'Installed':'Not installed')}</div>`).join('')}<div class="actions">${button('codex','Codex')}${button('claude','Claude Code')}${!state.workspaceOpen?button('openFolder','Open folder'):''}</div></div></article>
      <article class="card step"><span class="number">${state.helper.status==='connected'?'✓':'2'}</span><div><h3>${esc(t('Show your companion'))}</h3><p class="muted">${esc(t('Choose Byte, Miso or Fern. The pet and chat list can be hidden separately from the paw menu.'))}</p><div class="actions">${button('showPet','Show pet / panel',true)}${button('choosePet','Choose pet')}</div></div></article>
      <article class="card step"><span class="number">${state.helper.waitingNotifications?'✓':'3'}</span><div><h3>${esc(t('Notifications are optional'))}</h3><p class="muted">${esc(t('Get a macOS alert when a tracked chat waits for your reply. You can enable this later.'))}</p><small>${esc(permission())} · ${esc(t(state.helper.waitingNotifications?'Waiting alerts on':'Waiting alerts off'))}</small><div class="actions">${button('notifications','Enable waiting alerts')}${button('notificationSettings','Notification settings')}</div></div></article></div>
      <p>${esc(t('Start a conversation in Codex or Claude Code; its row will appear in the floating panel.'))}</p>${state.completed?badge(true,'Setup complete'):button('complete','Finish setup',true)}`;
    const connected=state.windows.filter(w=>w.connected).length;
    document.getElementById('connections').innerHTML=`<h2>${esc(t('Window connections'))}</h2><p class="muted">${esc(t('These are connections to Agent Pet, independent of whether a chat is running or completed.'))}</p><div class="grid">${metric('Connected windows',connected)}${metric('Recent disconnections',state.windows.length-connected)}${metric('Tracking',t(state.tracking?'On':'Off'))}</div>
      ${!state.publishing?`<div class="note">${esc(t('This window is not publishing to the pet. Automatic desktop opening may be off.'))}</div>`:''}${!state.tracking?`<div class="note">${esc(t('Tracking is disabled in this window. Connection health does not imply chat tracking is enabled.'))}</div>`:''}
      ${state.windows.length?`<div class="table"><table><thead><tr>${['Workspace / window','Connection','Last seen','Chats'].map(x=>`<th>${esc(t(x))}</th>`).join('')}</tr></thead><tbody>${state.windows.map(w=>`<tr><td><strong>${esc(w.name==='No workspace'?t(w.name):w.name)}</strong><br><small>${esc(w.current?t('This window'):t('Window')+' '+w.id.split('-')[1])}${w.focused?' · '+esc(t('Focused')):''} · ${esc(w.version)}</small></td><td>${badge(w.connected,w.connected?'Connected':'Disconnected')}<br><small>${esc(t('Tracking'))}: ${esc(t(w.tracking?'On':'Off'))}</small></td><td>${esc(age(w.updatedAt))}</td><td>${w.chats}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>${esc(t('No window connection yet'))}</h3><p class="muted">${esc(t('Open the pet in this window to start the connection.'))}</p></div>`}<div class="actions">${button('showPet','Show pet / panel',true)}${button('refresh','Refresh')}${button('settings','Settings')}</div>`;
    document.getElementById('diagnostics').innerHTML=`<h2>${esc(t('Diagnostics'))}</h2><div class="grid">${metric('Loaded extension',state.extension.loaded)}${metric('Installed extension',state.extension.installed)}${metric('Running pet',state.helper.status==='connected'?state.helper.version:t(state.helper.status==='notRunning'?'Pet not running':'Status unavailable'))}</div>
      ${state.extension.loaded!==state.extension.installed?`<div class="note">${esc(t('A newer extension is installed. This window will use it after a safe reload. Finish active chats first.'))}</div>`:''}${state.helper.status==='connected'&&state.helper.version!==state.extension.installed?`<div class="note">${esc(t('The running pet differs from the installed extension. Check updates or reopen the pet.'))}</div>`:''}
      <div class="card"><h3>${esc(t('System'))}</h3><p>${esc(state.system.platform)} ${esc(state.system.release)} · ${esc(state.system.arch)} · VS Code ${esc(state.system.vscode)}</p>${badge(state.system.supported,state.system.supported?'Supported':'Requires Apple Silicon and macOS 26+')}<p>${esc(permission())} · ${esc(t(state.helper.waitingNotifications?'Waiting alerts on':'Waiting alerts off'))}</p><h3 class="subheading">${esc(t('Local agent records'))}</h3>${state.records.map(r=>`<p>${esc(r.agent)} · ${esc(t(r.status==='readable'?'Readable':r.status==='missing'?'No local records yet':'Cannot read records'))}</p>`).join('')}<h3 class="subheading">${esc(t('Recent errors'))}</h3>${state.errors.length?state.errors.map(e=>`<p><code>${esc(e.code)}</code> <small>· ${esc(age(e.at))}</small></p>`).join(''):`<p class="muted">${esc(t('No errors recorded in this window.'))}</p>`}</div>
      <div class="actions">${button('copy','Copy diagnostics',true)}${button('refresh','Refresh')}${button('updates','Check for updates')}</div><p class="muted">${esc(t('The copied report includes versions, connection counts and error codes. It excludes chat text, titles, workspace names and file paths.'))}</p>`;
    if(focusedAction) document.querySelector(`section:not([hidden]) button[data-action="${focusedAction}"]`)?.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.tab)vscode.postMessage({action:'tab',tab:b.dataset.tab});else if(b.dataset.action)vscode.postMessage({action:b.dataset.action});});
  document.querySelector('nav').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=['setup','connections','diagnostics'];let i=tabs.indexOf(state?.tab||'setup');i=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;vscode.postMessage({action:'tab',tab:tabs[i]});document.getElementById('tab-'+tabs[i]).focus();event.preventDefault();});
  window.addEventListener('message',event=>{const m=event.data;if(m.type==='state'){state=m.state;render();}else if(m.type==='copied'||m.type==='actionError'){document.getElementById('feedback').textContent=t(m.type==='copied'?'Diagnostics copied.':'Action failed. Check Diagnostics for the error code.');}});
  vscode.postMessage({action:'ready'});
})();
