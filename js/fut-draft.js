/* Módulo independiente FUT Draft. No modifica la colección ni el saldo del club. */
(() => {
  const SAVE_KEY = 'fmc-draft-v1';
  const SLOT_NAMES = ['POR','LI','DFC','DFC','LD','MC','MC','MC','EI','DC','ED'];
  let draft = null;
  const $ = id => document.getElementById(id);

  function safeText(value) { return String(value ?? ''); }
  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && Array.isArray(saved.picks) && saved.picks.length === 11) return saved;
    } catch (_) {}
    return { active:false, picks:Array(11).fill(null), options:[], activeSlot:0, completed:false };
  }
  function saveDraft() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(draft)); } catch (_) {}
  }
  function uniqueUsedIds(exceptSlot = -1) {
    return draft.picks.filter((p,i) => p && i !== exceptSlot).map(p => Number(p.id));
  }
  function playerAt(id) { return window.FMC?.getPlayerById(id) || null; }
  function calcRating() {
    const chosen = draft.picks.filter(Boolean);
    return chosen.length ? Math.round(chosen.reduce((sum,p)=>sum+(Number(p.rating)||0),0)/chosen.length) : 0;
  }
  function beginDraft() {
    draft = { active:true, picks:Array(11).fill(null), options:[], activeSlot:0, completed:false };
    pickOptionsFor(0);
    saveDraft();
    render();
    $('draftMessage').textContent = '¡Nuevo Draft! Elige una de las opciones para el primer puesto. Cada jugador elegido queda bloqueado para los demás puestos.';
  }
  function resetCurrentDraft() {
    if (!draft.active) { beginDraft(); return; }
    if (!window.confirm('¿Quieres reiniciar el Draft actual? Perderás las elecciones de esta plantilla temporal.')) return;
    beginDraft();
  }
  function pickOptionsFor(slot) {
    draft.activeSlot = slot;
    const used = uniqueUsedIds(slot);
    let options = window.FMC?.getDraftOptions(slot, used) || [];
    // En puestos muy específicos puede haber menos de tres jugadores elegibles.
    // No se repite ninguno; si faltan candidatos, se muestra el número disponible.
    draft.options = options;
    if (!options.length) {
      const all = window.FMC?.getDraftAllPlayers() || [];
      const usedSet = new Set(used);
      options = all.filter(p => !usedSet.has(Number(p.id))).sort((a,b)=>(b.rating||0)-(a.rating||0)).slice(0,3);
      draft.options = options;
    }
  }
  function choosePlayer(id) {
    if (!draft.active || draft.completed) return;
    const player = playerAt(id);
    if (!player) return;
    const used = new Set(uniqueUsedIds(draft.activeSlot));
    if (used.has(Number(player.id))) {
      $('draftMessage').textContent = 'Ese jugador ya está elegido en este Draft. Selecciona otra carta.';
      return;
    }
    draft.picks[draft.activeSlot] = player;
    const next = draft.picks.findIndex(p => !p);
    if (next < 0) {
      draft.completed = true;
      draft.options = [];
      $('draftMessage').textContent = '¡Has completado tu plantilla FUT Draft! Estos jugadores solo pertenecen al Draft y no se han añadido a tu club.';
    } else {
      pickOptionsFor(next);
      $('draftMessage').textContent = `Elegiste a ${player.name}. Ahora elige para el puesto ${SLOT_NAMES[next]}.`;
    }
    saveDraft();
    render();
  }
  function renderPitch() {
    const pitch = $('draftPitch');
    if (!pitch) return;
    const rows = [[8,9,10],[5,6,7],[1,2,3,4],[0]];
    pitch.innerHTML = rows.map(row => `<div class="line">${row.map(i => {
      const p = draft.picks[i];
      return `<button type="button" class="draft-slot ${p?'filled':''}" data-draft-slot="${i}" aria-label="${p?'Cambiar':'Elegir'} ${SLOT_NAMES[i]}"><span class="draft-slot-rating">${p ? Number(p.rating)||0 : '＋'}</span><span class="draft-slot-name">${p ? escapeDraft(p.name) : 'Elegir'}</span><span class="draft-slot-pos">${SLOT_NAMES[i]}</span></button>`;
    }).join('')}</div>`).join('') + '<span class="pitch-label">Pulsa un puesto para cambiar su elección</span>';
    pitch.querySelectorAll('[data-draft-slot]').forEach(btn => btn.addEventListener('click', () => {
      if (!draft.active || draft.completed) return;
      const slot = Number(btn.dataset.draftSlot);
      draft.picks[slot] = null;
      draft.completed = false;
      pickOptionsFor(slot);
      saveDraft(); render();
      $('draftMessage').textContent = `Elige una carta para el puesto ${SLOT_NAMES[slot]}. La carta retirada vuelve a estar disponible para este Draft.`;
    }));
  }
  function escapeDraft(value) {
    return safeText(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function renderChoices() {
    const grid = $('draftChoices');
    grid.innerHTML = '';
    if (!draft.active) {
      $('draftChoiceTitle').textContent = 'Empieza un nuevo Draft';
      $('draftChoiceHelp').textContent = 'Se generarán opciones para cada uno de los 11 puestos.';
      return;
    }
    if (draft.completed) {
      $('draftChoiceTitle').textContent = 'Once completado';
      $('draftChoiceHelp').textContent = 'Ya has elegido los 11 jugadores.';
      return;
    }
    const slot = draft.activeSlot;
    $('draftChoiceTitle').textContent = `Elige ${SLOT_NAMES[slot]} · puesto ${slot+1} de 11`;
    $('draftChoiceHelp').textContent = `Opciones disponibles: ${draft.options.length}. Elige una carta para continuar.`;
    draft.options.forEach(p => {
      const wrapper = document.createElement('div'); wrapper.className = 'draft-choice';
      const btn = document.createElement('button'); btn.type = 'button';
      const rating = document.createElement('span'); rating.className = 'draft-rating'; rating.textContent = Number(p.rating)||0;
      const name = document.createElement('span'); name.className = 'draft-name'; name.textContent = safeText(p.name);
      const pos = document.createElement('span'); pos.className = 'draft-meta'; pos.textContent = `${safeText(window.FMC.getPlayerPosition(p))} · ${safeText(p.league || 'Liga sin datos')}`;
      const club = document.createElement('span'); club.className = 'draft-meta'; club.textContent = safeText(p.club || 'Club sin datos');
      btn.append(rating,name,pos,club); btn.addEventListener('click', () => choosePlayer(p.id));
      wrapper.appendChild(btn); grid.appendChild(wrapper);
    });
  }
  function render() {
    if (!draft) draft = loadDraft();
    $('draftRating').textContent = draft.picks.some(Boolean) ? calcRating() : '—';
    $('draftPicked').textContent = `${draft.picks.filter(Boolean).length} / 11`;
    $('draftComplete').hidden = !draft.completed;
    if (draft.completed) $('draftCompleteText').textContent = `Media final: ${calcRating()}. Tu equipo de Draft está completo y separado de tu plantilla principal.`;
    renderPitch(); renderChoices();
  }
  document.addEventListener('DOMContentLoaded', () => {
    draft = loadDraft();
    $('newDraftBtn')?.addEventListener('click', beginDraft);
    $('resetDraftBtn')?.addEventListener('click', resetCurrentDraft);
    $('draftAgainBtn')?.addEventListener('click', beginDraft);
    render();
  });
})();
