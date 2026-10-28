/* FUT Draft: partida temporal independiente, elecciones bloqueadas y torneo de tres rondas. */
(() => {
  const SAVE_KEY = 'fmc-draft-v2';
  const FORMATIONS = {
    '4-3-3': ['POR','LB','CB','CB','RB','MC','MC','MC','EI','DC','ED'],
    '4-4-2': ['POR','LB','CB','CB','RB','MI','MC','MC','MD','DC','DC'],
    '3-5-2': ['POR','CB','CB','CB','MI','MC','MCD','MC','MD','DC','DC']
  };
  const LABELS = {POR:'Portero',LB:'Lateral izquierdo',CB:'Central',RB:'Lateral derecho',MC:'MC',MCD:'MCD',MCO:'MCO',MI:'MI',MD:'MD',EI:'Extremo izquierdo',ED:'Extremo derecho',DC:'Delantero centro',DEF:'Defensa',MED:'Centrocampista',DEL:'Delantero'};
  const $ = id => document.getElementById(id);
  let draft;
  let busy = false;
  // Tras cargar la página, mostrar siempre la pantalla inicial con un único botón.
  let draftUiStarted = false;

  function emptyDraft() {
    return { started:false, formation:null, slots:[], picks:Array(11).fill(null), options:[], activeSlot:0,
      completed:false, round:0, finished:false, rewardPaid:false, history:[] };
  }
  function loadDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (saved && Array.isArray(saved.picks) && saved.picks.length === 11) {
        return { ...emptyDraft(), ...saved, options:Array.isArray(saved.options)?saved.options:[], history:Array.isArray(saved.history)?saved.history:[] };
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
    draft = emptyDraft();
    draftUiStarted = true;
    saveDraft();
    render();
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
    if (draft.options.length < 5) draft.optionsHint = `Solo hay ${draft.options.length} jugadores disponibles para ${LABELS[role] || role} en la base de datos. No se mostrarán posiciones incorrectas.`;
    else draft.optionsHint = '';
  }
  function choosePlayer(id) {
    if (busy || !draft.started || draft.completed || draft.finished) return;
    const slot = draft.activeSlot;
    if (draft.picks[slot]) return;
    const p = player(id);
    if (!p || chosenIds().includes(Number(p.id))) return;
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
    $('draftChoiceHelp').textContent=draft.optionsHint || `Elige una de las ${draft.options.length} opciones para ${LABELS[draft.slots[slot]] || draft.slots[slot]}. Al pulsar una carta, la elección se bloquea.`;
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
  function finishTournament(reachedRound) {
    if (draft.rewardPaid) return;
    const reward = reachedRound===0 ? 10 : reachedRound===1 ? 15 : reachedRound===2 ? 20 : 25;
    draft.rewardPaid = true; draft.finished = true; draft.options=[];
    const roundText = reachedRound===0 ? 'No has superado los cuartos' : reachedRound===1 ? 'Has ganado los cuartos, pero has caído en semifinales' : reachedRound===2 ? 'Has llegado a la final, pero no has podido ganarla' : '¡Has ganado la final y el FUT Draft!';
    draft.reward = reward; draft.rewardText = roundText;
    window.FMC?.addDraftReward(reward);
    saveDraft(); render();
  }
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function playNextMatch() {
    if (busy || !draft.completed || draft.finished) return;
    busy=true; const btn=$('draftPlayMatchBtn'); if(btn)btn.disabled=true;
    const round=draft.round; const titles=['Cuartos de final','Semifinales','Final'];
    const myRating=average();
    const winChance=Math.max(0.28,Math.min(0.78,0.5+(myRating-80)*0.012));
    const won=Math.random()<winChance;
    const rivalRating=randomInt(76,95);
    let myGoals=randomInt(0,2)+Math.max(0,Math.round((myRating-rivalRating)/18));
    let rivalGoals=randomInt(0,2)+Math.max(0,Math.round((rivalRating-myRating)/18));
    if (won && myGoals<=rivalGoals) myGoals=rivalGoals+1;
    if (!won && rivalGoals<=myGoals) rivalGoals=myGoals+1;
    const score=`${myGoals}-${rivalGoals}`;
    const events=[
      `🏟️ ${titles[round]}: los equipos salen al campo.`,
      `📋 Tu media es ${myRating}; la del rival es ${rivalRating}.`,
      `⚽ Primera parte: ${randomInt(8,42)}' · ${Math.random()<0.5?'ocasión para tu equipo':'el rival busca el gol'}.`,
      `⏱️ Segunda parte: ${randomInt(55,89)}' · ${Math.random()<0.5?'atajada del portero':'ataque peligroso'}.`,
      `🔔 Final del partido: ${score}.`
    ];
    const anim=$('draftMatchAnimation'); if(anim)anim.hidden=false;
    try {
      for (let i=0;i<events.length;i++) {
        if ($('draftMatchText')) $('draftMatchText').textContent=events[i];
        if (anim) {
          const side = i%2===0 ? 'home' : 'away';
          anim.innerHTML=`<div class="draft-match-scene"><span class="draft-team-chip home">TU EQUIPO</span><span class="draft-match-ball ${side}">⚽</span><span class="draft-team-chip away">RIVAL</span></div><div class="draft-match-event">${events[i]}</div>`;
          anim.style.setProperty('--match-progress',`${Math.round((i+1)/events.length*100)}%`);
        }
        await sleep(i===0?450:650);
      }
      const detail={round:titles[round],won,score,rivalRating}; draft.history.push(detail); draft.lastMatch=detail;
      if (won && round<2) {
        draft.round=round+1; saveDraft();
        $('draftMatchText').textContent=`¡Victoria ${score}! Has superado ${titles[round].toLowerCase()} y pasas a ${titles[round+1].toLowerCase()}.`;
        $('draftRoundTitle').textContent=titles[round+1];
      } else if (won && round===2) {
        draft.round=3; saveDraft(); finishTournament(3);
      } else {
        saveDraft(); finishTournament(round);
      }
    } finally {
      busy=false; if(btn)btn.disabled=false; render();
    }
  }
  function render() {
    if (!draft) draft=loadDraft();
    $('draftStats').hidden=!draftUiStarted || !draft.started;
    $('draftRating').textContent=draft.picks.some(Boolean)?average():'—';
    $('draftPicked').textContent=`${draft.picks.filter(Boolean).length} / 11`;
    $('draftFormationLabel').textContent=draft.formation||'—';
    $('draftWelcome').hidden=draftUiStarted;
    $('draftFormationPanel').hidden=!draftUiStarted || !!draft.formation;
    $('draftGame').hidden=!draftUiStarted || !draft.started || !draft.formation;
    $('draftComplete').hidden=!draft.completed;
    $('draftMatchPanel').hidden=!!draft.finished;
    $('draftRewardPanel').hidden=!draft.finished;
    if (draft.completed) $('draftCompleteText').textContent=`Media final: ${average()}. Equipo temporal listo; no se ha añadido ningún jugador a tu club.`;
    if (draft.finished) {
      $('draftRewardTitle').textContent=draft.reward===25?'🏆 ¡Campeones del FUT Draft!':'Torneo terminado';
      $('draftRewardText').textContent=`${draft.rewardText}. Recibes ${draft.reward} monedas. El premio se ha sumado a tu saldo del club una sola vez.`;
    } else if (draft.completed) {
      const titles=['Cuartos de final','Semifinales','Final'];
      $('draftRoundTitle').textContent=titles[draft.round]||'Torneo terminado';
      if (draft.lastMatch) $('draftMatchText').textContent=`Último resultado: ${draft.lastMatch.round}, ${draft.lastMatch.score}. ${draft.round<3?'Prepara el siguiente partido.':''}`;
    }
    renderPitch(); renderChoices();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    draft=loadDraft();
    // No mostramos automáticamente una partida guardada: primero debe pulsarse el botón de nueva partida.
    draftUiStarted=false;
    // Migración defensiva de estados antiguos incompletos.
    if (draft.started && !draft.formation) draft=emptyDraft();
    $('newDraftBtn')?.addEventListener('click',startNewDraft);
    document.querySelectorAll('[data-formation]').forEach(btn=>btn.addEventListener('click',()=>selectFormation(btn.dataset.formation)));
    $('draftPlayMatchBtn')?.addEventListener('click',playNextMatch);
    $('draftAgainBtn')?.addEventListener('click',startNewDraft);
    render();
  });
})();
