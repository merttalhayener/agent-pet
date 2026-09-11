(() => {
  'use strict';
  const bridge = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : { postMessage() {}, getState() { return null; }, setState() {} };
  const config = JSON.parse(atob(document.body.dataset.config));
  const sprite = document.querySelector('#sprite');
  const pet = document.querySelector('#pet');
  const stage = document.querySelector('#stage');
  const select = document.querySelector('#pet-select');
  const sleep = document.querySelector('#sleep');
  const bubble = document.querySelector('#bubble');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = config.selected, sleeping = config.sleeping;
  let activity = { status: 'idle', active: 0 };
  let animationTimer, reactionTimer, lookTimer, bubbleTimer;
  let dragging = null, moved = false, reacting = false, looking = false;
  let offset = Math.max(-1, Math.min(1, Number(bridge.getState()?.offset) || 0));
  const row = { idle: [0, 6, 720], right: [1, 8, 120], left: [2, 8, 120], waving: [3, 4, 140], jumping: [4, 5, 140], failed: [5, 8, 140], waiting: [6, 6, 160], running: [7, 6, 140], ready: [8, 6, 170] };
  function frame(r, c) { sprite.style.backgroundPosition = `${c / 7 * 100}% ${r / 10 * 100}%`; }
  function animate(name) {
    clearTimeout(animationTimer);
    pet.dataset.animation = name;
    const [r, count, delay] = row[name] || row.idle;
    let index = 0;
    function next() {
      frame(r, index);
      index = (index + 1) % count;
      if (!document.hidden && !reduced.matches && !sleeping) animationTimer = setTimeout(next, delay);
    }
    next();
  }
  function base() {
    if (sleeping) { clearTimeout(animationTimer); pet.dataset.animation = 'sleeping'; frame(0, 5); return; }
    if (!reacting && !looking && !dragging) animate(activity.status);
  }
  function say(text) {
    clearTimeout(bubbleTimer); bubble.textContent = text; bubble.classList.add('show');
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1300);
  }
  function react(name = 'jumping') {
    if (sleeping) return;
    clearTimeout(reactionTimer); clearTimeout(lookTimer); looking = false; reacting = true;
    animate(name); say(name === 'jumping' ? '♡' : '✧');
    reactionTimer = setTimeout(() => { reacting = false; base(); }, 1500);
  }
  function render() {
    const entry = config.pets.find(p => p.id === selected) || config.pets[0];
    if (!entry) { document.querySelector('#error').hidden = false; stage.hidden = true; select.disabled = true; return; }
    sprite.style.backgroundImage = `url("${entry.url}")`;
    select.value = entry.id;
    document.body.classList.toggle('sleeping', sleeping);
    sleep.textContent = sleeping ? '☀' : '☾';
    sleep.title = sleeping ? 'Uyandır' : 'Uyut'; sleep.setAttribute('aria-label', sleep.title); sleep.setAttribute('aria-pressed', String(sleeping));
    const labels = { waiting: 'Yanıtın bekleniyor', idle: 'Yanındayım', running: activity.active > 1 ? `${activity.active} oturum çalışıyor` : 'Codex çalışıyor', ready: 'İş tamamlandı', failed: 'Bir sorun oluştu' };
    document.querySelector('#status-text').textContent = sleeping ? 'Mola zamanı' : (labels[activity.status] || labels.idle);
    document.querySelector('#status').dataset.state = sleeping ? 'idle' : activity.status;
    base();
  }
  for (const entry of config.pets) {
    const option = document.createElement('option'); option.value = entry.id; option.textContent = entry.name; select.append(option);
  }
  select.addEventListener('change', () => { selected = select.value; render(); react('waving'); bridge.postMessage({ type: 'choose', id: selected }); });
  sleep.addEventListener('click', () => {
    sleeping = !sleeping; reacting = false; looking = false; clearTimeout(reactionTimer); clearTimeout(lookTimer); render();
    bridge.postMessage({ type: 'sleep' });
  });
  document.querySelector('#open-codex').addEventListener('click', () => bridge.postMessage({ type: 'openCodex' }));
  pet.addEventListener('click', () => { if (!moved) react(); moved = false; });
  function position() {
    const range = Math.max(0, (stage.clientWidth - pet.clientWidth) / 2 - 6);
    pet.style.left = `${(stage.clientWidth - pet.clientWidth) / 2 + offset * range}px`;
  }
  pet.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    dragging = { x: e.clientX, offset }; moved = false; pet.setPointerCapture(e.pointerId);
  });
  pet.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x;
    if (Math.abs(dx) > 4 && !moved) { moved = true; if (!sleeping) animate(dx > 0 ? 'right' : 'left'); }
    const range = Math.max(1, (stage.clientWidth - pet.clientWidth) / 2 - 6);
    offset = Math.max(-1, Math.min(1, dragging.offset + dx / range)); position();
  });
  function endDrag() { dragging = null; bridge.setState({ offset }); base(); }
  pet.addEventListener('pointerup', endDrag); pet.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointermove', e => {
    if (dragging || reacting || sleeping || reduced.matches || activity.status === 'running') return;
    const box = pet.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2), dy = e.clientY - (box.top + box.height / 2);
    if (Math.hypot(dx, dy) < 12) return;
    clearTimeout(animationTimer); clearTimeout(lookTimer); looking = true;
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const index = Math.round(angle / 22.5) % 16;
    pet.dataset.animation = 'looking'; frame(9 + Math.floor(index / 8), index % 8);
    lookTimer = setTimeout(() => { looking = false; base(); }, 900);
  });
  stage.addEventListener('pointerleave', () => { if (!dragging) { looking = false; clearTimeout(lookTimer); base(); } });
  window.addEventListener('message', event => {
    const next = event.data;
    if (next?.type !== 'state') return;
    selected = next.selected; sleeping = next.sleeping;
    activity = next.activity || { status: 'idle', active: 0 }; render();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(animationTimer); else base(); });
  reduced.addEventListener('change', base);
  new ResizeObserver(position).observe(stage);
  render(); position(); bridge.postMessage({ type: 'ready' });
})();
