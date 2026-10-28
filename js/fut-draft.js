/* FUT Draft: partida temporal independiente, elecciones bloqueadas y torneo de tres rondas. */
(() => {
  const SAVE_KEY = 'fmc-draft-v5';
  const FORMATIONS = {
    '4-3-3': ['POR','DEF','DEF','DEF','DEF','MED','MED','MED','DEL','DEL','DEL'],
    '4-4-2': ['POR','DEF','DEF','DEF','DEF','MED','MED','MED','MED','DEL','DEL'],
    '3-5-2': ['POR','DEF','DEF','DEF','MED','MED','MED','MED','MED','DEL','DEL']
  };
  const LABELS = {POR:'portero',DEF:'defensa',MED:'centrocampista',DEL:'delantero'};
  const $ = id => document.getElementById(id);
  let draft;
  let busy = false;

  function emptyDraft() {
    return { started:false, formation:null, slots:[], picks:Array(11).fill(null), options:[], activeSlot:0,
      completed:false, round:0, finished:false, rewardPaid:false, history:[] };
  }
  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && Array.isArray(saved.picks) && saved.picks.length === 11) {
        const loaded = { ...emptyDraft(), ...saved, options:Array.isArray(saved.options)?saved.options:[], history:Array.isArray(saved.history)?saved.history:[] };
        if (loaded.formation && FORMATIONS[loaded.formation]) {
          loaded.slots = FORMATIONS[loaded.formation].slice();
          loaded.picks = loaded.picks.map(p => p && Number.isFinite(Number(p.id)) ? p : null);
          loaded.completed = loaded.picks.every(Boolean);
          if (!loaded.completed) loaded.finished = false;
        } else return emptyDraft();
        return loaded;
      }
    } catch (_) {}
    return emptyDraft();
  }
  function saveDraft() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(draft)); } catch (_) {} }
  function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function player(id) { return window.FMC?.getPlayerById(id) || null; }
  function chosenIds() { return draft.picks.filter(Boolean).map(p => Number(p.id)); }
  function average() { const ps=draft.picks.filter(Boolean); return ps.length ? Math.round(ps.reduce((a,p)=>a+(Number(p.rating)||0),0)/ps.length) : 0; }
  function randomInt(min,max) { return Math.floor(Math.random()*(max-min+1))+min; }

  function startNewDraft() {
    if (draft.started && !draft.finished && !window.confirm('¿Empezar una nueva partida? Perderás el Draft actual y su progreso.')) return;
    draft = emptyDraft(); saveDraft(); render();
    $('draftWelcome').hidden = true;
    $('draftFormationPanel').hidden = false;
    $('draftGame').hidden = true;
  }
  function selectFormation(formation) {
    if (!FORMATIONS[formation]) return;
    draft = { ...emptyDraft(), started:true, formation, slots:FORMATIONS[formation].slice() };
    draft.activeSlot = 0;
    makeOptions(0); saveDraft(); render();
    $('draftWelcome').hidden = true; $('draftFormationPanel').hidden = true; $('draftGame').hidden = false;
    $('draftMessage').textContent = `Formación ${formation} elegida. Escoge una carta para ${LABELS[draft.slots[0]]}. Las elecciones quedan bloqueadas.`;
  }
  function makeOptions(slot) {
    draft.activeSlot = slot;
    const used = chosenIds();
    const role = draft.slots[slot];
    draft.options = window.FMC?.getDraftOptions(role, used) || [];
    if (!draft.options.length) $('draftMessage').textContent = `No hay jugadores disponibles para ${LABELS[role] || role}. Comprueba que jugadores_stats_actualizado.txt contiene futbolistas con esa posición y vuelve a iniciar el Draft.`;
  }
  function choosePlayer(id) {
    if (busy || !draft.started || draft.completed || draft.finished) return;
    const slot = draft.activeSlot;
    if (draft.picks[slot]) return;
    const p = player(id);
    if (!p || chosenIds().includes(Number(p.id))) return;
    const expected = draft.slots[slot];
    if (!expected || !draft.options.some(option => Number(option.id) === Number(p.id))) return;
    // Se guarda la elección de forma permanente para esta partida antes de mostrar el siguiente puesto.
    draft.picks[slot] = {id:p.id,name:p.name,pos:p.pos,primaryPosition:p.primaryPosition,rating:p.rating,club:p.club,league:p.league,emoji:p.emoji,flag:p.flag,cardStyle:p.cardStyle};
    const next = draft.picks.findIndex(x => !x);
    if (next < 0) {
      draft.completed = true; draft.options = [];
      $('draftMessage').textContent = '¡Once completo! Ahora puedes simular los cuartos de final.';
    } else {
      makeOptions(next);
      $('draftMessage').textContent = `Jugador confirmado. Elige una carta para el puesto ${next+1} (${LABELS[draft.slots[next]]}). Las elecciones anteriores no se pueden modificar.`;
    }
    saveDraft(); render();
  }
  function renderPitch() {
    const pitch=$('draftPitch'); if(!pitch) return;
    if (!draft.started || !draft.formation) { pitch.innerHTML=''; return; }
    const rows = draft.formation==='4-3-3' ? [[8,9,10],[5,6,7],[1,2,3,4],[0]] :
      draft.formation==='4-4-2' ? [[9,10],[5,6,7,8],[1,2,3,4],[0]] : [[9,10],[4,5,6,7,8],[1,2,3],[0]];
    pitch.innerHTML = rows.map(row=>`<div class="line">${row.map(i=>{
      const p=draft.picks[i]; const role=draft.slots[i]||'—';
      return `<div class="draft-slot ${p?'filled':''}" aria-label="${escapeHTML(role)}"><span class="draft-slot-rating">${p?Number(p.rating)||0:'＋'}</span><span class="draft-slot-name">${p?escapeHTML(p.name):'Por elegir'}</span><span class="draft-slot-pos">${role}</span></div>`;
    }).join('')}</div>`).join('') + '<span class="pitch-label">Las cartas elegidas quedan bloqueadas hasta una nueva partida</span>';
  }
  function renderChoices() {
    const grid=$('draftChoices'); grid.innerHTML='';
    if (!draft.started || !draft.formation) { $('draftChoiceTitle').textContent=''; $('draftChoiceHelp').textContent=''; return; }
    if (draft.completed) { $('draftChoiceTitle').textContent='Plantilla completa'; $('draftChoiceHelp').textContent='Ya no puedes cambiar ninguna carta. Continúa con los partidos.'; return; }
    const slot=draft.activeSlot;
    $('draftChoiceTitle').textContent=`Elige ${LABELS[draft.slots[slot]]} · puesto ${slot+1} de 11`;
    $('draftChoiceHelp').textContent=`Elige una de las ${draft.options.length} opciones. Al pulsar una carta, la elección se bloquea.`;
    if (!draft.options.length) {
      const empty=document.createElement('p'); empty.className='small';
      empty.textContent='No hay opciones para este puesto. Comprueba que el catálogo de jugadores está cargado y empieza una nueva partida.';
      grid.appendChild(empty); return;
    }
    draft.options.forEach(p=>{
      const wrap=document.createElement('div'); wrap.className='draft-choice';
      const btn=document.createElement('button'); btn.type='button'; btn.className='draft-player-option';
      const rating=document.createElement('span'); rating.className='draft-rating'; rating.textContent=Number(p.rating)||0;
      const name=document.createElement('span'); name.className='draft-name'; name.textContent=p.name||'Jugador';
      const pos=document.createElement('span'); pos.className='draft-meta'; pos.textContent=`${p.primaryPosition||p.pos||''} · ${p.league||'Liga sin datos'}`;
      const club=document.createElement('span'); club.className='draft-meta'; club.textContent=p.club||'Club sin datos';
      btn.append(rating,name,pos,club);
      btn.addEventListener('click',()=>{ if(btn.disabled) return; grid.querySelectorAll('button').forEach(b=>b.disabled=true); choosePlayer(p.id); });
      wrap.appendChild(btn); grid.appendChild(wrap);
    });
  }
  function finishTournament(reachedRound, champion = false) {
    if (draft.rewardPaid) return;
    // Primera ronda: 10; eliminación en cuartos: 20; eliminación en semis/final: 30; campeón: 50.
    const reward = reachedRound===0 ? 10 : reachedRound===1 ? 20 : champion ? 50 : 30;
    draft.rewardPaid = true; draft.finished = true; draft.options=[];
    const roundText = reachedRound===0 ? 'Has caído en la primera ronda' : reachedRound===1 ? 'Has caído en cuartos de final' : reachedRound===2 ? 'Has caído en semifinales' : champion ? '¡Has ganado la final y el FUT Draft!' : 'Has llegado a la final, pero no has podido ganarla';
    draft.reward = reward; draft.rewardText = roundText;
    window.FMC?.addDraftReward(reward);
    saveDraft(); render();
  }
  function playNextMatch() {
    if (busy || !draft.completed || draft.finished) return;
    busy=true; const btn=$('draftPlayMatchBtn'); if(btn)btn.disabled=true;
    const round=draft.round; const titles=['Primera ronda','Cuartos de final','Semifinales','Final'];
    const myRating=average();
    // La media influye en la probabilidad, pero nunca garantiza la victoria.
    const winChance=Math.max(0.28,Math.min(0.78,0.5+(myRating-80)*0.012));
    const won=Math.random()<winChance;
    const rivalRating=randomInt(76,95);
    const myGoals=Math.max(0,Math.round((myRating-rivalRating)/13+Math.random()*2+(won?1:0)));
    const rivalGoals=Math.max(0,Math.round((rivalRating-myRating)/13+Math.random()*2+(!won?1:0)));
    const scoreWon=won ? (myGoals<=rivalGoals?`${rivalGoals+1}-${rivalGoals}`:`${myGoals}-${rivalGoals}`) : (myGoals>=rivalGoals?`${myGoals}-${myGoals+1}`:`${myGoals}-${rivalGoals}`);
    const detail={round:titles[round],won,score:scoreWon,rivalRating}; draft.history.push(detail);
    draft.lastMatch=detail;
    if (won && round<3) { draft.round=round+1; saveDraft(); render(); $('draftMatchText').textContent=`¡Victoria ${scoreWon}! Has superado ${titles[round].toLowerCase()} y pasas a ${titles[round+1].toLowerCase()}.`; $('draftRoundTitle').textContent=titles[round+1]; }
    else if (won && round===3) { draft.round=4; saveDraft(); finishTournament(3, true); }
    else { saveDraft(); finishTournament(round); }
    busy=false; if(btn)btn.disabled=false; render();
  }
  function render() {
    if (!draft) draft=loadDraft();
    $('draftStats').hidden=!draft.started;
    $('draftRating').textContent=draft.picks.some(Boolean)?average():'—';
    $('draftPicked').textContent=`${draft.picks.filter(Boolean).length} / 11`;
    $('draftFormationLabel').textContent=draft.formation||'—';
    $('draftWelcome').hidden=!!draft.started;
    $('draftFormationPanel').hidden=!draft.started || !!draft.formation;
    $('draftGame').hidden=!draft.started || !draft.formation;
    $('draftComplete').hidden=!draft.completed;
    $('draftMatchPanel').hidden=!!draft.finished;
    $('draftRewardPanel').hidden=!draft.finished;
    if (draft.completed) $('draftCompleteText').textContent=`Media final: ${average()}. Equipo temporal listo; no se ha añadido ningún jugador a tu club.`;
    if (draft.finished) {
      $('draftRewardTitle').textContent=draft.reward===50?'🏆 ¡Campeones del FUT Draft!':'Torneo terminado';
      $('draftRewardText').textContent=`${draft.rewardText}. Recibes ${draft.reward} monedas. El premio se ha sumado a tu saldo del club una sola vez.`;
    } else if (draft.completed) {
      const titles=['Primera ronda','Cuartos de final','Semifinales','Final'];
      $('draftRoundTitle').textContent=titles[draft.round]||'Torneo terminado';
      if (draft.lastMatch) $('draftMatchText').textContent=`Último resultado: ${draft.lastMatch.round}, ${draft.lastMatch.score}. ${draft.round<3?'Prepara el siguiente partido.':''}`;
    }
    renderPitch(); renderChoices();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    draft=loadDraft();
    // Migración defensiva: una partida antigua no debe dejar puestos editables.
    if (draft.started && !draft.formation) draft=emptyDraft();
    if (draft.started && draft.formation && !draft.completed) makeOptions(Math.max(0, draft.picks.findIndex(x => !x)));
    $('newDraftBtn')?.addEventListener('click',startNewDraft);
    document.querySelectorAll('[data-formation]').forEach(btn=>btn.addEventListener('click',()=>selectFormation(btn.dataset.formation)));
    $('draftPlayMatchBtn')?.addEventListener('click',playNextMatch);
    $('draftAgainBtn')?.addEventListener('click',startNewDraft);
    render();
  });
})();
