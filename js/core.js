/* Catálogo externo: jugadores_stats_actualizado.txt. El TXT es la fuente única de jugadores. */
function loadExternalRoster(){
  const req = new XMLHttpRequest();
  req.open("GET", "./jugadores_stats_actualizado.txt", false);
  try { req.send(null); } catch(e) { throw new Error("No se pudo cargar jugadores_stats_actualizado.txt. Abre el juego desde GitHub Pages o un servidor web."); }
  if(req.status !== 200 && !(req.status === 0 && req.responseText)) throw new Error("No se pudo leer jugadores_stats_actualizado.txt (HTTP "+req.status+").");
  const rows = JSON.parse(req.responseText);
  if(!Array.isArray(rows) || !rows.length) throw new Error("El TXT no contiene una lista válida de jugadores.");
  const posMap={GK:"POR",GKP:"POR",PO:"POR",POR:"POR",GOALKEEPER:"POR",KEEPER:"POR",ST:"DEL",CF:"DEL",LF:"DEL",RF:"DEL",LW:"DEL",RW:"DEL",DEL:"DEL",FW:"DEL",ATT:"DEL",DC:"DEL",SD:"DEL",EI:"DEL",ED:"DEL",LM:"MED",RM:"MED",CM:"MED",LCM:"MED",RCM:"MED",CDM:"MED",LDM:"MED",RDM:"MED",CAM:"MED",LAM:"MED",RAM:"MED",MCO:"MED",MCD:"MED",MC:"MED",MF:"MED",MI:"MED",MD:"MED",MED:"MED",LB:"DEF",RB:"DEF",CB:"DEF",LCB:"DEF",RCB:"DEF",LWB:"DEF",RWB:"DEF",SW:"DEF",LI:"DEF",LD:"DEF",DFC:"DEF",DF:"DEF",DEF:"DEF"};
  return rows.map((r,i)=>{
    const [name,rawPos,rating,club,league,flag,style]=r;
    const pos=posMap[String(rawPos).toUpperCase()]||"MED";
    const rat=Number(rating)||50;
    const atk=pos==="POR"?Math.max(5,Math.round(rat*.12)):Math.max(20,Math.min(99,Math.round(rat+(pos==="DEL"?5:pos==="DEF"?-15:0))));
    const def=pos==="POR"?rat:Math.max(15,Math.min(99,Math.round(rat+(pos==="DEF"?8:pos==="MED"?-2:-18))));
    const stam=Math.max(35,Math.min(99,Math.round(rat+(pos==="MED"?3:pos==="DEF"?1:-2))));
    const emoji=pos==="POR"?"🧤":pos==="DEF"?"🛡️":pos==="MED"?"🎯":"⚽";
    const cardStyle=style==="icon"?"icon":style==="hero"?"hero":style==="gold"?"gold":style==="silver"?"silver":style==="bronze"?"bronze":rat>=90?"elite":rat>=80?"gold":rat>=70?"silver":"bronze";
    return {id:i,name,pos,rating:rat,atk,def,stam,club,league,flag,emoji,cardStyle,owned:false};
  });
}

const allPlayers=loadExternalRoster();

function freshState(){
 const players=allPlayers.map(p=>({...p,owned:false}));
 const state0={coins:1000,wins:0,played:0,resetUses:0,players,market:[],lineup:Array(11).fill(null),formation:"4-3-3"};
 return giveMinimumTeam(state0);
}

function normPlayerName(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")}

function compactStateForStorage(s){return {...s,players:(s.players||[]).map(p=>({id:p.id,name:p.name,owned:!!p.owned,photoUrl:p.photoUrl||null}))}}

function load(){
 try{
  const raw=localStorage.getItem("fmc-save-v2");
  if(raw){
   const s=JSON.parse(raw);
   if(s&&Array.isArray(s.players)&&s.players.length>0){
    const savedByName=new Map();s.players.forEach(p=>{const k=normPlayerName(p.name);if(k&&!savedByName.has(k))savedByName.set(k,p)});
    let nextId=s.players.reduce((max,p)=>Math.max(max,Number(p.id)||0),0)+1;const merged=[],seen=new Set();
    allPlayers.forEach(catalog=>{const k=normPlayerName(catalog.name);if(!k||seen.has(k))return;seen.add(k);const old=savedByName.get(k);if(old){const keepId=old.id,keepOwned=!!old.owned,keepPhoto=old.photoUrl||null;Object.assign(old,catalog,{id:keepId,owned:keepOwned,photoUrl:keepPhoto});merged.push(old)}else merged.push({...catalog,id:nextId++,owned:false})});
    s.players.forEach(old=>{const k=normPlayerName(old.name);if(k&&!seen.has(k)){seen.add(k);merged.push(old)}});s.players=merged;
    giveMinimumTeam(s);localStorage.setItem("fmc-save-v2",JSON.stringify(compactStateForStorage(s)));return s;
   }
  }
 }catch(e){}
 const s=freshState();try{localStorage.setItem("fmc-save-v2",JSON.stringify(compactStateForStorage(s)))}catch(e){}return s;
}

let state=load();
if(!Number.isInteger(state.resetUses))state.resetUses=0;
let editingSlot=0;
if(!state.formation)state.formation="4-3-3";

function save(){try{localStorage.setItem("fmc-save-v2",JSON.stringify(compactStateForStorage(state)))}catch(e){}render()}

function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}

function refreshMarket(){renderMarket()}

function toast(msg){
 const t=document.getElementById("gameToast");if(!t)return;
 t.textContent=msg;t.classList.add("show");
 setTimeout(()=>t.classList.remove("show"),2800);
}

function starterPool(list,pos,need){
 const candidateMap=new Map();
 list.filter(p=>p.pos===pos).forEach(p=>{const k=normPlayerName(p.name);if(k&&!candidateMap.has(k))candidateMap.set(k,p)});
 const arr=Array.from(candidateMap.values());
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}
 return arr.slice(0,need);
}

function giveMinimumTeam(s){
 if(!s.formation)s.formation="4-3-3";
 const shape={"4-3-3":[4,3,3],"4-4-2":[4,4,2],"3-5-2":[3,5,2]}[s.formation]||[4,3,3];
 const roles=["POR",...Array(shape[0]).fill("DEF"),...Array(shape[1]).fill("MED"),...Array(shape[2]).fill("DEL")];
 const valid=s.lineup&&s.lineup.length===11&&s.lineup.every(id=>{const p=s.players.find(x=>x.id===id);return p&&p.owned})&&new Set(s.lineup).size===11;
 if(valid)return s;
 s.lineup=Array(11).fill(null);
 const chosen=[];
 for(const pos of ["POR","DEF","MED","DEL"]){const count=roles.filter(r=>r===pos).length;const existing=s.players.filter(p=>p.owned&&p.pos===pos);const need=Math.max(0,count-existing.length);const extras=starterPool(s.players,pos,need);extras.forEach(p=>{p.owned=true;p.rating=Math.min(70,p.rating);p.price=Math.max(80,(p.rating-48)*18)});chosen.push(...existing,...extras)}
 const byPos={POR:[],DEF:[],MED:[],DEL:[]};chosen.forEach(p=>{if(byPos[p.pos])byPos[p.pos].push(p)});
 roles.forEach((pos,i)=>{const p=byPos[pos].shift();if(p)s.lineup[i]=p.id});
 return s;
}

function resetClub(){
 state=freshState();
 save();
 toast("Tu equipo y tus monedas se han reiniciado.");
}

function getRarityLabel(p){
 if(p.cardStyle==="icon")return"Icono";
 if(p.cardStyle==="hero")return"Héroe";
 if(p.rating>=90)return"Élite";
 if(p.rating>=80)return"Oro";
 if(p.rating>=70)return"Plata";
 return"Bronce";
}

function cardStyleClass(p){
 if(p.cardStyle)return p.cardStyle;
 if(p.rating>=90)return"elite";
 if(p.rating>=80)return"gold";
 if(p.rating>=70)return"silver";
 return"bronze";
}

function openPack(packType){
 const packMap={
  bronze:{cost:150,name:"Sobre Bronce",min:50,max:69},
  silver:{cost:350,name:"Sobre Plata",min:70,max:79},
  gold:{cost:750,name:"Sobre Oro",min:80,max:89},
  icon:{cost:1500,name:"Sobre Élite/Icon",min:90,max:99}
 };
 const pack=packMap[packType];
 if(!pack)return;
 if(state.coins<pack.cost){
  toast("No tienes suficientes monedas para este sobre.");
  return;
 }
 state.coins-=pack.cost;
 const candidates=state.players.filter(p=>!p.owned&&p.rating>=pack.min&&p.rating<=pack.max);
 if(!candidates.length){
  state.coins+=pack.cost;
  toast("No hay más jugadores disponibles en este rango.");
  save();
  return;
 }
 const picked=candidates[Math.floor(Math.random()*candidates.length)];
 picked.owned=true;
 save();
 const resultEl=document.getElementById("packResult");
 if(resultEl){
  resultEl.innerHTML=`<div class="card" style="text-align:center"><h3>¡Te ha tocado a ${picked.name}!</h3><p class="small">${picked.rating} Global · ${picked.pos} · ${picked.club}</p></div>`;
 }
 toast(`¡Has conseguido a ${picked.name}!`);
}

function go(tab){
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
 document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===tab));
 if(tab==="market")renderMarket();
 if(tab==="collection")renderCollection();
 if(tab==="clubplayers")renderClubRoster();
}

document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));

function rating(){
 const starters=state.lineup.map(id=>state.players.find(p=>p.id===id)).filter(Boolean);
 if(!starters.length)return 0;
 return Math.round(starters.reduce((acc,p)=>acc+p.rating,0)/starters.length);
}

const CATALOG_PAGE_SIZE=24;
let marketPage=1,collectionPage=1,clubRosterPage=1;

function setCatalogPage(kind,delta){
 if(kind==="market"){marketPage=Math.max(1,marketPage+delta);renderMarket()}
 else if(kind==="collection"){collectionPage=Math.max(1,collectionPage+delta);renderCollection()}
 else if(kind==="club"){clubRosterPage=Math.max(1,clubRosterPage+delta);renderClubRoster()}
}

function renderCatalogPager(id,page,total,pageSize,kind){
 const el=document.getElementById(id);if(!el)return;
 const maxPage=Math.max(1,Math.ceil(total/pageSize));
 if(maxPage<=1){el.innerHTML="";return}
 el.innerHTML=`<button class="secondary" ${page<=1?"disabled":""} onclick="setCatalogPage('${kind}',-1)">◀ Anterior</button><span>Página ${page} de ${maxPage} (${total} jugadores)</span><button class="secondary" ${page>=maxPage?"disabled":""} onclick="setCatalogPage('${kind}',1)">Siguiente ▶</button>`;
}

function matchesSearchFilter(p,q){
 if(!q)return true;
 return normPlayerName(p.name).includes(q)||normPlayerName(p.club).includes(q)||normPlayerName(p.league).includes(q);
}

function matchesRarityFilter(p,rarity){
 if(rarity==="Todas")return true;
 return getRarityLabel(p)===rarity;
}

function matchesRatingFilter(p,ratingRule){
 if(ratingRule==="Todas")return true;
 if(ratingRule==="under70")return p.rating<70;
 const target=Number(ratingRule);
 return p.rating>=target;
}

function renderClubRoster(){
 const grid=document.getElementById("clubRosterGrid");if(!grid)return;
 const leagueVal=document.getElementById("clubLeagueFilter")?.value||"Todas";
 const posVal=document.getElementById("clubPositionFilter")?.value||"Todas";
 const rarityVal=document.getElementById("clubRarityFilter")?.value||"Todas";
 const ratingVal=document.getElementById("clubRatingFilter")?.value||"Todas";
 const q=normPlayerName(document.getElementById("clubSearch")?.value||"");

 const ownedPlayers=state.players.filter(p=>p.owned);
 const filtered=ownedPlayers.filter(p=>{
  if(leagueVal!=="Todas"&&p.league!==leagueVal)return false;
  if(posVal!=="Todas"&&p.pos!==posVal)return false;
  if(!matchesRarityFilter(p,rarityVal))return false;
  if(!matchesRatingFilter(p,ratingVal))return false;
  if(!matchesSearchFilter(p,q))return false;
  return true;
 });

 const status=document.getElementById("clubRosterStatus");
 if(status)status.textContent=`Tienes ${filtered.length} jugadores en la plantilla.`;

 renderCatalogPager("clubRosterPagination",clubRosterPage,filtered.length,CATALOG_PAGE_SIZE,"club");
 const start=(clubRosterPage-1)*CATALOG_PAGE_SIZE;
 const pageItems=filtered.slice(start,start+CATALOG_PAGE_SIZE);

 grid.innerHTML=pageItems.map(p=>`
  <div class="card" style="text-align:center">
   <div style="font-size:1.4rem;font-weight:bold">${p.rating}</div>
   <div><b>${p.name}</b></div>
   <div class="small">${p.pos} · ${p.club}</div>
  </div>
 `).join("");
}

function renderCollection(){
 const grid=document.getElementById("collectionGrid");if(!grid)return;
 const ownedPlayers=state.players.filter(p=>p.owned);
 renderCatalogPager("collectionPagination",collectionPage,ownedPlayers.length,CATALOG_PAGE_SIZE,"collection");
 const start=(collectionPage-1)*CATALOG_PAGE_SIZE;
 const pageItems=ownedPlayers.slice(start,start+CATALOG_PAGE_SIZE);

 grid.innerHTML=pageItems.map(p=>`
  <div class="card" style="text-align:center">
   <div style="font-size:1.4rem;font-weight:bold">${p.rating}</div>
   <div><b>${p.name}</b></div>
   <div class="small">${p.pos} · ${p.club}</div>
  </div>
 `).join("");
}

function changeFormation(val){
 state.formation=val;
 save();
}

function autoOptimizeTeam(){
 const owned=[...state.players.filter(p=>p.owned)].sort((a,b)=>b.rating-a.rating);
 state.lineup=owned.slice(0,11).map(p=>p.id);
 save();
 toast("Equipo optimizado con tus mejores jugadores.");
}

function editLineupSlot(slot){
 editingSlot=slot;
 renderBenchEditor();
}

function renderBenchEditor(){
 const panel=document.getElementById("lineupBench");if(!panel)return;
 const targetPos=["POR","DEF","DEF","DEF","DEF","MED","MED","MED","DEL","DEL","DEL"][editingSlot]||"MED";
 const available=state.players.filter(p=>p.owned&&!state.lineup.includes(p.id)&&p.pos===targetPos);

 panel.innerHTML=`<b>Cambiar posición ${editingSlot+1} (${targetPos})</b>
 <div style="display:flex;gap:8px;overflow-x:auto;padding:8px 0">
  ${available.map(p=>`<button class="secondary" onclick="swapLineupPlayer(${p.id})">${p.name} (${p.rating})</button>`).join("")}
 </div>`;
}

function swapLineupPlayer(newId){
 state.lineup[editingSlot]=newId;
 save();
}

function renderPitch(){
 const pitch=document.getElementById("pitch");if(!pitch)return;
 const starters=state.lineup.map(id=>state.players.find(p=>p.id===id));
 pitch.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center">
  ${starters.map((p,idx)=>`
   <div class="card" onclick="editLineupSlot(${idx})" style="cursor:pointer;padding:8px">
    <div>${p?p.rating:"—"}</div>
    <div><b>${p?p.name:"Vacío"}</b></div>
    <div class="small">${p?p.pos:""}</div>
   </div>
  `).join("")}
 </div>`;
}

function renderMarket(){
 const grid=document.getElementById("marketGrid");if(!grid)return;
 const available=state.players.filter(p=>!p.owned);
 renderCatalogPager("marketPagination",marketPage,available.length,CATALOG_PAGE_SIZE,"market");
 const start=(marketPage-1)*CATALOG_PAGE_SIZE;
 const pageItems=available.slice(start,start+CATALOG_PAGE_SIZE);

 grid.innerHTML=pageItems.map(p=>`
  <div class="card" style="text-align:center">
   <div><b>${p.name}</b> (${p.rating})</div>
   <div class="small">${p.pos} · ${p.club}</div>
  </div>
 `).join("");
}

function render(){
 const coinsEl=document.getElementById("coinsTop"); if(coinsEl) coinsEl.textContent=state.coins;
 const casinoCoins=document.getElementById("casinoCoins"); if(casinoCoins) casinoCoins.textContent=state.coins;
 const marketCoins=document.getElementById("marketCoins"); if(marketCoins) marketCoins.textContent=state.coins;
 const clubCoins=document.getElementById("clubCoins"); if(clubCoins) clubCoins.textContent=state.coins;
 const collectionCoins=document.getElementById("collectionCoins"); if(collectionCoins) collectionCoins.textContent=state.coins;

 const ownedCount=document.getElementById("ownedCount"); if(ownedCount) ownedCount.textContent=state.players.filter(p=>p.owned).length;
 const collectionCount=document.getElementById("collectionCount"); if(collectionCount) collectionCount.textContent=state.players.filter(p=>p.owned).length;

 const teamRating=document.getElementById("teamRating"); if(teamRating) teamRating.textContent=rating();
 const marketRating=document.getElementById("marketRating"); if(marketRating) marketRating.textContent=rating();

 const wins=document.getElementById("wins"); if(wins) wins.textContent=state.wins;
 const played=document.getElementById("played"); if(played) played.textContent=state.played;

 const progress=document.getElementById("progress"); if(progress) progress.style.width=Math.min(100,state.wins/3*100)+"%";
 const progressText=document.getElementById("progressText"); if(progressText) progressText.textContent=`${Math.min(state.wins,3)} de 3 victorias`;

 renderPitch();

 const activeTab=document.querySelector("nav button.active")?.dataset.tab||"club";
 if(activeTab==="clubplayers")renderClubRoster();
 if(activeTab==="market")renderMarket();
 if(activeTab==="collection")renderCollection();
}

render();

/* --- SISTEMA DE INICIO DE SESIÓN Y MULTI-USUARIO --- */
let currentUser = localStorage.getItem("fmc-current-user") || null;

function getCurrentStorageKey() {
  return currentUser ? `fmc-save-user-${currentUser}` : "fmc-save-v2";
}

save = function() {
  try {
    const key = getCurrentStorageKey();
    localStorage.setItem(key, JSON.stringify(compactStateForStorage(state)));
  } catch(e){}
  if (typeof render === 'function') render();
};

function openAuthModal() {
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'flex';
}

function closeAuthModal() {
  const m = document.getElementById('authModal');
  if (m) m.style.display = 'none';
}

function submitAuth(action) {
  const userEl = document.getElementById('authUsername');
  const passEl = document.getElementById('authPassword');
  if (!userEl || !passEl) return;
  const user = userEl.value.trim();
  const pass = passEl.value.trim();
  
  if (!user || !pass) {
    alert("Ingresa usuario y contraseña.");
    return;
  }
  
  const accounts = JSON.parse(localStorage.getItem("fmc-accounts") || "{}");
  
  if (action === 'register') {
    if (accounts[user]) {
      alert("El usuario ya existe. Intenta iniciar sesión.");
      return;
    }
    accounts[user] = pass;
    localStorage.setItem("fmc-accounts", JSON.stringify(accounts));
    currentUser = user;
    localStorage.setItem("fmc-current-user", user);
    save();
    alert("¡Cuenta creada con éxito!");
  } else if (action === 'login') {
    if (!accounts[user] || accounts[user] !== pass) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }
    currentUser = user;
    localStorage.setItem("fmc-current-user", user);
    const raw = localStorage.getItem(getCurrentStorageKey());
    if (raw) {
      try {
        const loadedState = JSON.parse(raw);
        Object.assign(state, loadedState);
      } catch(e){}
    }
    alert(`¡Bienvenido de nuevo, ${user}!`);
  }
  
  updateAuthUI();
  closeAuthModal();
  if (typeof render === 'function') render();
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem("fmc-current-user");
  updateAuthUI();
  location.reload();
}

function updateAuthUI() {
  const btn = document.getElementById('authBtnHeader');
  if (btn) {
    if (currentUser) {
      btn.innerHTML = `👤 ${currentUser} (Salir)`;
      btn.onclick = logoutUser;
      btn.style.background = "#e11d48";
    } else {
      btn.innerHTML = `👤 Iniciar Sesión`;
      btn.onclick = openAuthModal;
      btn.style.background = "#22c55e";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
});
