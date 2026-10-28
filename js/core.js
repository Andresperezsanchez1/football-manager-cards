/* Catálogo externo: jugadores_stats_actualizado.txt. El TXT es la fuente única de jugadores. */
function loadExternalRoster(){
  const req = new XMLHttpRequest();
  req.open("GET", "./jugadores_stats_actualizado.txt", false);
  try { req.send(null); } catch(e) { throw new Error("No se pudo cargar jugadores_stats_actualizado.txt. Abre el juego desde GitHub Pages o un servidor web."); }
  if(req.status !== 200 && !(req.status === 0 && req.responseText)) throw new Error("No se pudo leer jugadores_stats_actualizado.txt (HTTP "+req.status+").");
  const rows = JSON.parse(req.responseText);
  if(!Array.isArray(rows) || !rows.length) throw new Error("El TXT no contiene una lista válida de jugadores.");
  const posMap={GK:"POR",POR:"POR",ST:"DEL",CF:"DEL",LF:"DEL",RF:"DEL",LW:"DEL",RW:"DEL",LM:"MED",RM:"MED",CM:"MED",LCM:"MED",RCM:"MED",CDM:"MED",LDM:"MED",RDM:"MED",CAM:"MED",LAM:"MED",RAM:"MED",LB:"DEF",RB:"DEF",CB:"DEF",LCB:"DEF",RCB:"DEF",LWB:"DEF",RWB:"DEF",SW:"DEF",DEF:"DEF",DEL:"DEL",MED:"MED"};
  return rows.map((r,i)=>{
    const [name,rawPos,rating,club,league,flag,style]=r;
    const pos=posMap[String(rawPos).toUpperCase()]||"MED";
    const rat=Number(rating)||50;
    const atk=pos==="POR"?Math.max(5,Math.round(rat*.12)):Math.max(20,Math.min(99,Math.round(rat+(pos==="DEL"?5:pos==="DEF"?-15:0))));
    const def=pos==="POR"?rat:Math.max(15,Math.min(99,Math.round(rat+(pos==="DEF"?8:pos==="MED"?-2:-18))));
    const stam=Math.max(35,Math.min(99,Math.round(rat+(pos==="MED"?3:pos==="DEF"?1:-2))));
    const emoji=pos==="POR"?"🧤":pos==="DEF"?"🛡️":pos==="MED"?"🎯":"⚽";
    const cardStyle=style==="icon"?"icon":style==="hero"?"hero":style==="gold"?"gold":style==="silver"?"silver":style==="bronze"?"bronze":rat>=90?"elite":rat>=80?"gold":rat>=70?"silver":"bronze";
    return {id:i+1,name,pos,primaryPosition:String(rawPos||pos).toUpperCase(),rating:rat,atk,def,stam,club,league,emoji,flag:flag||"⚽",cardStyle,price:Math.max(80,(rat-48)*18),owned:false};
  });
}
const allPlayers=loadExternalRoster();
function pickRandom(list,n){const pool=list.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}return pool.slice(0,n)}
let state;

function starterPool(players,pos,n){
 let pool=players.filter(p=>p.pos===pos&&!p.owned&&p.rating<=70);
 if(pool.length<n){const fallback=players.filter(p=>p.pos===pos&&!p.owned&&p.rating>70);pool=pool.concat(fallback)}
 return pickRandom(pool,n);
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
 roles.forEach((pos,i)=>{const p=byPos[pos].shift();if(p){p.rating=Math.min(70,p.rating);p.price=Math.max(80,(p.rating-48)*18);s.lineup[i]=p.id}});
 return s;
}
function freshState(){
 const players=allPlayers.map(p=>({...p,owned:false}));
 const state0={coins:1000,wins:0,played:0,resetUses:0,players,market:[],lineup:Array(11).fill(null),formation:"4-3-3"};
 return giveMinimumTeam(state0);
}
function normPlayerName(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function load(){
 try{
  const raw=localStorage.getItem("fmc-save-v2");
  if(raw){
   const s=JSON.parse(raw);
   if(s&&Array.isArray(s.players)&&s.players.some(p=>p.club)){
    const savedByName=new Map();s.players.forEach(p=>{const k=normPlayerName(p.name);if(k&&!savedByName.has(k))savedByName.set(k,p)});
    let nextId=Math.max(0,...s.players.map(p=>Number(p.id)||0))+1;const merged=[],seen=new Set();
    allPlayers.forEach(catalog=>{const k=normPlayerName(catalog.name);if(!k||seen.has(k))return;seen.add(k);const old=savedByName.get(k);if(old){const keepId=old.id,keepOwned=!!old.owned,keepPhoto=old.photoUrl||null;Object.assign(old,catalog,{id:keepId,owned:keepOwned,photoUrl:keepPhoto});merged.push(old)}else merged.push({...catalog,id:nextId++,owned:false})});
    s.players.forEach(old=>{const k=normPlayerName(old.name);if(k&&!seen.has(k)){seen.add(k);merged.push(old)}});s.players=merged;
    giveMinimumTeam(s);localStorage.setItem("fmc-save-v2",JSON.stringify(s));return s;
   }
  }
 }catch(e){}
 const s=freshState();try{localStorage.setItem("fmc-save-v2",JSON.stringify(s))}catch(e){}return s;
}
state=load();
if(!Number.isInteger(state.resetUses))state.resetUses=0;
let editingSlot=0;
if(!state.formation)state.formation="4-3-3";
function save(){try{localStorage.setItem("fmc-save-v2",JSON.stringify(state))}catch(e){}render()}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function refreshMarket(){renderMarket()}
function showToast(html){const el=document.getElementById("gameToast");el.innerHTML=html;el.classList.add("show");clearTimeout(window.__fmcToastTimer);window.__fmcToastTimer=setTimeout(()=>el.classList.remove("show"),6500)}
const playerNationalities={
 "Kylian Mbappé":["🇫🇷","Francia"],"Vinícius Júnior":["🇧🇷","Brasil"],"Jude Bellingham":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Federico Valverde":["🇺🇾","Uruguay"],"Erling Haaland":["🇳🇴","Noruega"],"Lionel Messi":["🇦🇷","Argentina"],"Cristiano Ronaldo":["🇵🇹","Portugal"],"Neymar Jr":["🇧🇷","Brasil"],"Neymar":["🇧🇷","Brasil"],"Lamine Yamal":["🇪🇸","España"],"Pedri":["🇪🇸","España"],"Gavi":["🇪🇸","España"],"Rodri":["🇪🇸","España"],"Dani Carvajal":["🇪🇸","España"],"Ferran Torres":["🇪🇸","España"],"Antoine Griezmann":["🇫🇷","Francia"],"Ousmane Dembélé":["🇫🇷","Francia"],"Harry Kane":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Mohamed Salah":["🇪🇬","Egipto"],"Virgil van Dijk":["🇳🇱","Países Bajos"],"Kevin De Bruyne":["🇧🇪","Bélgica"],"Robert Lewandowski":["🇵🇱","Polonia"],"Luka Modrić":["🇭🇷","Croacia"],"Son Heung-min":["🇰🇷","Corea del Sur"],"Bukayo Saka":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Cole Palmer":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Phil Foden":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Declan Rice":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Alisson Becker":["🇧🇷","Brasil"],"Thibaut Courtois":["🇧🇪","Bélgica"],"Jan Oblak":["🇸🇮","Eslovenia"],"Marc-André ter Stegen":["🇩🇪","Alemania"],"Manuel Neuer":["🇩🇪","Alemania"],"Emiliano Martínez":["🇦🇷","Argentina"],"Alexia Putellas":["🇪🇸","España"],"Aitana Bonmatí":["🇪🇸","España"],"Sam Kerr":["🇦🇺","Australia"],"Lauren James":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Sophia Smith":["🇺🇸","Estados Unidos"],"Lindsey Horan":["🇺🇸","Estados Unidos"],
 "Antony":["🇧🇷","Brasil"],"Alexander Isak":["🇸🇪","Suecia"],"Bruno Guimarães":["🇧🇷","Brasil"],"Joan García":["🇪🇸","España"],"Sonny Bradley":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Raphinha":["🇧🇷","Brasil"],"João Neves":["🇵🇹","Portugal"],"Vitinha":["🇵🇹","Portugal"],"Achraf Hakimi":["🇲🇦","Marruecos"],"Khvicha Kvaratskhelia":["🇬🇪","Georgia"],"Mason Greenwood":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Pierre-Emile Højbjerg":["🇩🇰","Dinamarca"],"Folarin Balogun":["🇺🇸","Estados Unidos"],"Denis Zakaria":["🇨🇭","Suiza"],
 "Álvaro Lemos":["🇪🇸","España"],"Jonathan Dubasin":["🇪🇸","España"],"Manu Fuster":["🇪🇸","España"],"Sergio Arribas":["🇪🇸","España"],"Luis Suárez":["🇨🇴","Colombia"],"Rubén Alcaraz":["🇪🇸","España"],"Chris Ramos":["🇪🇸","España"],"Íñigo Vicente":["🇪🇸","España"],"Iñigo Vicente":["🇪🇸","España"],"Peque Fernández":["🇪🇸","España"],"Andrés Martín":["🇪🇸","España"],"Álvaro Valles":["🇪🇸","España"],"Alex Palmer":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Jed Wallace":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Josh Maja":["🇳🇬","Nigeria"],"Adam Armstrong":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Flynn Downes":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Jack Clarke":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Sam Morsy":["🇪🇬","Egipto"],"Bobby Thomas":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Haji Wright":["🇺🇸","Estados Unidos"],"Josh Windass":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Barry Bannan":["🏴󠁧󠁢󠁳󠁣󠁴󠁿","Escocia"],"Michael Smith":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],
 "Zlatan Ibrahimović":["🇸🇪","Suecia"],"Ronaldinho":["🇧🇷","Brasil"],"Ronaldo Nazário":["🇧🇷","Brasil"],"Pelé":["🇧🇷","Brasil"],"Diego Maradona":["🇦🇷","Argentina"],"Zinedine Zidane":["🇫🇷","Francia"],"Thierry Henry":["🇫🇷","Francia"],"Paolo Maldini":["🇮🇹","Italia"],"Iker Casillas":["🇪🇸","España"],"Xavi Hernández":["🇪🇸","España"],"Andrés Iniesta":["🇪🇸","España"],"Sergio Ramos":["🇪🇸","España"],"Carles Puyol":["🇪🇸","España"],"David Beckham":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Andrea Pirlo":["🇮🇹","Italia"],"Franco Baresi":["🇮🇹","Italia"],"Lev Yashin":["🇷🇺","Rusia"],"Alessandro Del Piero":["🇮🇹","Italia"],"George Best":["🇬🇧","Irlanda del Norte"],"Eusébio":["🇵🇹","Portugal"],"Johan Cruyff":["🇳🇱","Países Bajos"],"Bobby Charlton":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Lothar Matthäus":["🇩🇪","Alemania"],"Cafu":["🇧🇷","Brasil"],"Roberto Carlos":["🇧🇷","Brasil"],"Didier Drogba":["🇨🇮","Costa de Marfil"],"Wayne Rooney":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Peter Schmeichel":["🇩🇰","Dinamarca"],"Mia Hamm":["🇺🇸","Estados Unidos"],"Marta Vieira da Silva":["🇧🇷","Brasil"],
 "Nicolò Barella":["🇮🇹","Italia"],"Lautaro Martínez":["🇦🇷","Argentina"],"Alessandro Bastoni":["🇮🇹","Italia"],"Mike Maignan":["🇫🇷","Francia"],"Rafael Leão":["🇵🇹","Portugal"],"Christian Pulisic":["🇺🇸","Estados Unidos"],"Kenan Yıldız":["🇹🇷","Turquía"],"Dušan Vlahović":["🇷🇸","Serbia"],"Gleison Bremer":["🇧🇷","Brasil"],"Scott McTominay":["🏴󠁧󠁢󠁳󠁣󠁴󠁿","Escocia"],"Jamal Musiala":["🇩🇪","Alemania"],"Michael Olise":["🇫🇷","Francia"],"Joshua Kimmich":["🇩🇪","Alemania"],"Serhou Guirassy":["🇬🇳","Guinea"],"Nico Schlotterbeck":["🇩🇪","Alemania"],"Gregor Kobel":["🇨🇭","Suiza"],"Xavi Simons":["🇳🇱","Países Bajos"],"Gianluigi Donnarumma":["🇮🇹","Italia"],"Julián Álvarez":["🇦🇷","Argentina"],"William Saliba":["🇫🇷","Francia"],"David Raya":["🇪🇸","España"],"Florian Wirtz":["🇩🇪","Alemania"],"Bruno Fernandes":["🇵🇹","Portugal"],"Enzo Fernández":["🇦🇷","Argentina"],"Moisés Caicedo":["🇪🇨","Ecuador"],"Reece James":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Ollie Watkins":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Morgan Rogers":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"James Maddison":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Joško Gvardiol":["🇭🇷","Croacia"],"Bernardo Silva":["🇵🇹","Portugal"],"Jérémy Doku":["🇧🇪","Bélgica"],"Rúben Dias":["🇵🇹","Portugal"],"Marcus Rashford":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Micky van de Ven":["🇳🇱","Países Bajos"],"Federico Dimarco":["🇮🇹","Italia"],"Hakan Çalhanoğlu":["🇹🇷","Turquía"],"Paulo Dybala":["🇦🇷","Argentina"],"Victor Osimhen":["🇳🇬","Nigeria"],"Takefusa Kubo":["🇯🇵","Japón"],"Mikel Oyarzabal":["🇪🇸","España"],"Yann Sommer":["🇨🇭","Suiza"],"Trent Alexander-Arnold":["🏴󠁧󠁢󠁥󠁮󠁧󠁿","Inglaterra"],"Ibrahima Konaté":["🇫🇷","Francia"],"Dominik Szoboszlai":["🇭🇺","Hungría"],"Martin Ødegaard":["🇳🇴","Noruega"],"Gabriel Magalhães":["🇧🇷","Brasil"],"Kai Havertz":["🇩🇪","Alemania"],"Mikel Merino":["🇪🇸","España"],"Unai Simón":["🇪🇸","España"],"Rodrygo":["🇧🇷","Brasil"],"Endrick":["🇧🇷","Brasil"],"Isco":["🇪🇸","España"],"Álex Baena":["🇪🇸","España"],"Luka Modrić":["🇭🇷","Croacia"],"Frenkie de Jong":["🇳🇱","Países Bajos"],"Ronald Araújo":["🇺🇾","Uruguay"],"Antonio Rüdiger":["🇩🇪","Alemania"],"Eduardo Camavinga":["🇫🇷","Francia"],"Arda Güler":["🇹🇷","Turquía"],"Nico Williams":["🇪🇸","España"],"Dani Olmo":["🇪🇸","España"],"Caroline Graham Hansen":["🇳🇴","Noruega"],"Salma Paralluelo":["🇪🇸","España"],"Lindsey Horan":["🇺🇸","Estados Unidos"]
};
function countryForPlayer(p){const direct=playerNationalities[p.name];if(direct)return direct;const key=normPlayerName(p.name);const matched=Object.keys(playerNationalities).find(n=>normPlayerName(n)===key);if(matched)return playerNationalities[matched];return [p.flag||"🌐","Nacionalidad por verificar"]}
function showPackOpening(p,duplicate,value){
 const overlay=document.createElement("div");overlay.className="pack-opening-overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.innerHTML='<div class="pack-opening-content"><div class="pack-opening-kicker">FOOTBALL MANAGER CARDS</div><h2 class="pack-opening-title">¡REVELANDO JUGADOR!</h2><div class="pack-opening-stage" id="openingStage"><div class="pack-opening-reveal">✨</div><div class="pack-opening-sub">Preparando sobre...</div></div><div class="small" id="openingFooter">Las luces se apagan... ¡prepárate para la revelación!</div></div>';
 document.body.appendChild(overlay);const stage=overlay.querySelector("#openingStage"),footer=overlay.querySelector("#openingFooter"),title=overlay.querySelector(".pack-opening-title");
 const steps=[
  ()=>{title.textContent="¡HA SALIDO UN JUGADOR!";stage.innerHTML='<div class="pack-opening-reveal notranslate" translate="no" style="color:#ffd166">'+escapeHTML(naturalPos(p))+'</div><div class="pack-opening-sub">Posición</div>';},
  ()=>{title.textContent="SU LIGA";stage.innerHTML='<div class="pack-opening-reveal" style="color:#8de8ff">'+escapeHTML(p.league||"Liga por verificar")+'</div><div class="pack-opening-sub">Liga</div>';},
  ()=>{title.textContent="SU EQUIPO";stage.innerHTML='<div class="pack-opening-reveal" style="color:#9dffb8">'+escapeHTML(p.club||"Equipo por verificar")+'</div><div class="pack-opening-sub">Equipo</div>';},
  ()=>{title.textContent=duplicate?"¡CARTA REPETIDA!":"¡TU NUEVA CARTA!";stage.innerHTML='<div class="pack-opening-card">'+cardHTML(p,false,false)+'</div>';footer.textContent=duplicate?'Se ha vendido automáticamente por '+value+' monedas.':'La carta ya está en tu colección.';const av=stage.querySelector(".avatar");if(av)loadCardPhoto(av);
  setTimeout(()=>{overlay.classList.add("closing");setTimeout(()=>overlay.remove(),400)},2200);
  }
 ];let i=0;const run=()=>{steps[i++]();if(i<steps.length)setTimeout(run,800)};setTimeout(run,450);
}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function openPack(kind){
 if(document.querySelector(".pack-opening-overlay"))return;
 const packs={
  bronce:{cost:100,label:"Sobre bronce",weights:[["bajo",.96],["medio",.03],["bueno",.008],["elite",.002]]},
  plata:{cost:250,label:"Sobre plata",weights:[["plataBase",.80],["plataAlta",.17],["plataElite",.027],["plataLeyenda",.003]]},
  oro:{cost:500,label:"Sobre oro",weights:[["oroBase",.75],["oroAlta",.20],["oroElite",.045],["oroLeyenda",.005]]},
  leyenda:{cost:10000,label:"Sobre de iconos o héroes",weights:[["iconoOHeroe",1.0]]}
 };
 const pack=packs[kind];if(!pack)return;
 if(state.coins<pack.cost){document.getElementById("packMessage").textContent=`No tienes monedas suficientes para ese sobre. Tienes ${state.coins} monedas; necesitas ${pack.cost}.`;return}
 if(!window.confirm(`¿Quieres abrir el ${pack.label} por ${pack.cost} monedas?\nTienes ${state.coins} monedas y te quedarán ${state.coins-pack.cost}.`))return;
 state.coins-=pack.cost;
 let candidates=[];
 if(kind==="leyenda"){
  const legendPool=state.players.filter(p=>p.cardStyle==="icon"||p.cardStyle==="hero");
  const unownedLegends=legendPool.filter(p=>!p.owned);
  // El sobre de 10.000 puede entregar un Icono (blanco) o un Héroe (morado claro).
  candidates=unownedLegends.length>0?unownedLegends:legendPool;
 }else{
  const roll=Math.random(),weights=pack.weights;let tier="bajo",sum=0;
  for(const [name,prob] of weights){sum+=prob;if(roll<=sum){tier=name;break}}
  const inTier=p=>(kind==="bronce"
   ?(tier==="bajo"?p.rating<=70:tier==="medio"?p.rating>=71&&p.rating<=80:tier==="bueno"?p.rating>=81&&p.rating<=85:p.rating>=86)
   :kind==="plata"
    ?(tier==="plataBase"?p.rating>=74&&p.rating<=79:tier==="plataAlta"?p.rating>=80&&p.rating<=84:tier==="plataElite"?p.rating>=85&&p.rating<=89:p.rating>=90)
    :(tier==="oroBase"?p.rating>=80&&p.rating<=84:tier==="oroAlta"?p.rating>=85&&p.rating<=89:tier==="oroElite"?p.rating>=90&&p.rating<=94:p.rating>=95));
  const desired=kind==="bronce"?(tier==="bajo"?68:tier==="medio"?76:tier==="bueno"?83:88)
   :kind==="plata"?(tier==="plataBase"?77:tier==="plataAlta"?82:tier==="plataElite"?87:92)
   :(tier==="oroBase"?82:tier==="oroAlta"?87:tier==="oroElite"?92:97);
  const allInTier=state.players.filter(inTier);
  candidates=allInTier.filter(p=>!p.owned);
  if(!candidates.length){
   const unseen=state.players.filter(p=>!p.owned);
   if(unseen.length){
    const closest=Math.min(...unseen.map(p=>Math.abs(p.rating-desired)));
    const near=unseen.filter(p=>Math.abs(p.rating-desired)===closest);
    candidates=near;
   }else{
    candidates=allInTier;
   }
  }
  if(!candidates.length){const eligible=state.players.slice();if(eligible.length){const closest=Math.min(...eligible.map(p=>Math.abs(p.rating-desired)));candidates=eligible.filter(p=>Math.abs(p.rating-desired)===closest)}}
 }
 if(!candidates.length){state.coins+=pack.cost;document.getElementById("packMessage").textContent="No hay jugadores válidos para este sobre. Se te han devuelto las monedas.";render();return}
 const p=candidates[rand(0,candidates.length-1)];
 if(p.owned){
   const value=saleValue(p);
   state.coins+=value;
   document.getElementById("packMessage").innerHTML=`🔁 <b>${p.name}</b> era repetido y se ha vendido automáticamente por <b>${value} monedas</b>. Saldo: <b>${state.coins}</b> monedas.`;
   showPackOpening(p,true,value);
 }else{
   p.owned=true;
   document.getElementById("packMessage").innerHTML=`🎉 Has conseguido a <b>${p.name}</b> (${p.pos}, ${p.club}) · valoración <b>${p.rating}</b>. Saldo: <b>${state.coins}</b> monedas.`;
   showPackOpening(p,false,0);
 }
 save();
}
function getPlayer(id){return state.players.find(p=>p.id===id)}
function aligned(){return state.lineup.map(getPlayer).filter(Boolean)}
function rating(){const a=aligned();return a.length?Math.round(a.reduce((s,p)=>s+p.rating,0)/a.length):0}
function go(tab){document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===tab));if(tab==="casino"){requestAnimationFrame(()=>{refreshWheelLabels("colorWheel","colorWheelNumbers");refreshWheelLabels("numberWheel","numberWheelNumbers")})}}
document.querySelectorAll("nav button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));
function saleValue(p){
 if(p.cardStyle==="icon"||p.cardStyle==="hero")return 9000;
 const r=p.rating;
 if(r<=70)return Math.max(50,Math.min(99,Math.round(50+(r-50)*2)));
 if(r<=75)return 100+(r-71)*25;
 if(r<=80)return 250+(r-76)*25;
 if(r<=85)return 350+(r-81)*25;
 return 500+(r-86)*25;
}
function displayPlayerName(p){
 const raw=String(p?.name||"");
 // Corrige datos antiguos guardados con el nombre traducido para Antony del Real Betis.
 if(raw.trim().toLocaleLowerCase("es")==="antonio" && /betis/i.test(String(p?.club||"")))return "Antony";
 if(raw.trim().toLocaleLowerCase("es")==="antony")return "Antony";
 return raw;
}
function displayPositionCode(pos){return ({POR:"POR",DEL:"DEL",MED:"MC",DEF:"DEF"})[String(pos||"").toUpperCase()]||String(pos||"").toUpperCase()}
function playerRarity(p){const style=String(p?.cardStyle||"").toLowerCase();if(style==="icon")return "Icono";if(style==="hero")return "Héroe";const r=Number(p?.rating)||0;if(r>=90)return "Élite";if(r>=80)return "Oro";if(r>=70)return "Plata";return "Bronce"}
function ratingFilterMatches(p,value){if(!value||value==="Todas")return true;const r=Number(p.rating)||0;if(value==="under70")return r<70;return r>=Number(value)}
function populateLeagueFilter(id,players){const el=document.getElementById(id);if(!el)return;const selected=el.value||"Todas";const leagues=[...new Set(players.map(p=>p.league).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));el.innerHTML='<option value="Todas">Todas las ligas</option>'+leagues.map(l=>`<option value="${escapeHTML(l).replace(/"/g,"&quot;")}">${escapeHTML(l)}</option>`).join("");el.value=leagues.includes(selected)?selected:"Todas"}
function renderCollection(){
 const owned=state.players.filter(p=>p.owned);populateLeagueFilter("collectionLeagueFilter",owned);
 const league=document.getElementById("collectionLeagueFilter")?.value||"Todas",rarity=document.getElementById("collectionRarityFilter")?.value||"Todas",ratingCut=document.getElementById("collectionRatingFilter")?.value||"Todas";
 const filtered=owned.filter(p=>(league==="Todas"||p.league===league)&&(rarity==="Todas"||playerRarity(p)===rarity)&&ratingFilterMatches(p,ratingCut));
 const grid=document.getElementById("collectionGrid");if(grid)grid.innerHTML=filtered.map(p=>cardHTML(p,false,true)).join("")||'<p class="sub">No hay cartas que coincidan con esos filtros.</p>';
 const status=document.getElementById("collectionFilterStatus");if(status)status.textContent=`Mostrando ${filtered.length} de ${owned.length} cartas de tu colección.`;
}
function cardHTML(p,market=false,sellable=false){
 const displayName=displayPlayerName(p);
 const style=p.cardStyle||(p.rating>=90?"elite":p.rating>=80?"gold":p.rating>=70?"silver":"bronze");
 const rare=p.rating>=90?"rare":"";
 const isStarter=state.lineup.includes(p.id);
 const safeName=displayName.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const safeClub=String(p.club||"Equipo sin confirmar").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 return `<article class="card player-card simple-player ${rare} style-${style}">
   <div class="simple-rating" title="Media del jugador">${Number(p.rating)||0}</div>
   <div class="simple-player-name notranslate" translate="no">${safeName}</div>
   <div class="simple-player-detail"><span class="simple-pos notranslate" translate="no">${escapeHTML(naturalPos(p))}</span><span class="simple-league">${escapeHTML(p.league||"Liga por verificar")}</span></div>
   <div class="simple-player-team"><span class="team-label">EQUIPO</span><b>${safeClub}</b></div>
   ${market?`<div class="price">🪙 ${p.price}</div><span class="small">${p.owned?"Ya está en tu colección":"Disponible en el catálogo"}</span>`:sellable?`<div class="simple-player-actions"><button class="secondary" onclick="alignPlayer(${p.id})" ${isStarter?"disabled":""}>${isStarter?"Titular":"Alinear"}</button><button class="gold" onclick="sellPlayer(${p.id})" ${isStarter||state.players.filter(x=>x.owned).length<=11?"disabled":""}>Vender · 🪙 ${saleValue(p)}</button></div>${isStarter?'<span class="small">Sácalo del once para venderlo.</span>':state.players.filter(x=>x.owned).length<=11?'<span class="small">Debes conservar al menos 11 jugadores.</span>':''}`:`<button class="secondary" onclick="alignPlayer(${p.id})">Alinear</button>`}
 </article>`
}
function buyPlayer(id){const p=state.market.find(x=>x.id===id);if(!p||state.coins<p.price)return;state.coins-=p.price;const owned=getPlayer(id);if(owned)owned.owned=true;state.market=state.market.filter(x=>x.id!==id);document.getElementById("clubMessage").textContent=`¡Has fichado a ${p.name}, de ${p.club}!`;save()}
function sellPlayer(id){const p=getPlayer(id);if(!p||!p.owned)return;const ownedCount=state.players.filter(x=>x.owned).length;if(ownedCount<=11){document.getElementById("sellMessage").textContent="No puedes vender más jugadores: necesitas conservar al menos 11 para poder jugar partidos.";document.getElementById("sellMessage").classList.add("error");return}if(state.lineup.includes(id)){document.getElementById("sellMessage").textContent=`No puedes vender a ${p.name} porque está en el once titular. Cámbialo por otro jugador o vacía su puesto primero.`;document.getElementById("sellMessage").classList.add("error");return}const value=saleValue(p);if(!window.confirm(`¿Quieres vender a ${p.name} por ${value} monedas?\n\nPulsa Aceptar para venderlo o Cancelar para conservarlo.`))return;p.owned=false;state.coins+=value;document.getElementById("sellMessage").classList.remove("error");document.getElementById("sellMessage").textContent=`Has vendido a ${p.name} por ${value} monedas. Tu saldo ahora es de ${state.coins} monedas.`;document.getElementById("clubMessage").textContent=`Has vendido a ${p.name} por ${value} monedas.`;save()}
function resetClub(){
 const used=Number.isInteger(state.resetUses)?state.resetUses:0;
 if(used>=3){document.getElementById("resetClubMessage").textContent="Ya has usado los 3 reinicios disponibles.";return}
 const remaining=2-used;
 const answer=window.confirm(`¿Seguro que quieres borrar tu equipo y empezar de nuevo?\n\nPerderás tus jugadores, monedas actuales, victorias y partidos. Empezarás con un nuevo equipo de media baja y 1000 monedas.\n\nEste reinicio consume uno de tus ${3-used} usos disponibles.`);
 if(!answer){document.getElementById("resetClubMessage").textContent="Cancelado. Tu equipo y tus monedas siguen igual.";return}
 const fresh=freshState();fresh.resetUses=used+1;state=fresh;editingSlot=null;save();
 const msg=document.getElementById("clubMessage");if(msg)msg.textContent="Equipo reiniciado. Tienes una nueva plantilla y 1000 monedas.";
 const status=document.getElementById("resetClubMessage");if(status)status.textContent=`Te quedan ${Math.max(0,3-state.resetUses)} reinicios disponibles.`;
 render();go("club");window.scrollTo({top:0,behavior:"smooth"});
}
const FORMATIONS={
 "4-3-3":{def:4,mid:3,fw:3,rows:[1,4,3,3],slots:["POR","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW"]},
 "4-3-3 (4)":{def:4,mid:3,fw:3,rows:[1,4,2,1,3],rowSlots:[[0],[1,2,3,4],[6,7],[5],[8,9,10]],slots:["POR","LB","CB","CB","RB","CAM","CM","CM","LW","ST","RW"]},
 "4-3-3 (2)":{def:4,mid:3,fw:3,rows:[1,4,2,1,3],slots:["POR","LB","CB","CB","RB","CDM","CDM","CM","LW","ST","RW"]},
 "4-2-3-1":{def:4,mid:5,fw:1,rows:[1,4,2,3,1],slots:["POR","LB","CB","CB","RB","CDM","CDM","LM","CAM","RM","ST"]},
 "4-2-3-1 (2)":{def:4,mid:5,fw:1,rows:[1,4,2,3,1],slots:["POR","LB","CB","CB","RB","CDM","CDM","LW","CAM","RW","ST"]},
 "4-4-2":{def:4,mid:4,fw:2,rows:[1,4,4,2],slots:["POR","LB","CB","CB","RB","LM","CM","CM","RM","ST","ST"]},
 "4-4-2 (2)":{def:4,mid:4,fw:2,rows:[1,4,4,2],slots:["POR","LB","CB","CB","RB","LM","CDM","CDM","RM","ST","ST"]},
 "4-1-2-1-2":{def:4,mid:4,fw:2,rows:[1,4,1,2,1,2],slots:["POR","LB","CB","CB","RB","CDM","LM","RM","CAM","ST","ST"]},
 "4-1-2-1-2 (2)":{def:4,mid:4,fw:2,rows:[1,4,1,2,1,2],slots:["POR","LB","CB","CB","RB","CDM","CM","CM","CAM","ST","ST"]},
 "4-3-2-1":{def:4,mid:3,fw:3,rows:[1,4,3,2,1],slots:["POR","LB","CB","CB","RB","CM","CM","CM","CF","CF","ST"]},
 "4-5-1":{def:4,mid:5,fw:1,rows:[1,4,5,1],slots:["POR","LB","CB","CB","RB","LM","CM","CDM","CM","RM","ST"]},
 "4-1-4-1":{def:4,mid:5,fw:1,rows:[1,4,1,4,1],slots:["POR","LB","CB","CB","RB","CDM","LM","CM","CM","RM","ST"]},
 "4-2-2-2":{def:4,mid:4,fw:2,rows:[1,4,2,2,2],slots:["POR","LB","CB","CB","RB","CDM","CDM","CAM","CAM","ST","ST"]},
 "3-4-2-1":{def:3,mid:6,fw:1,rows:[1,3,4,2,1],slots:["POR","CB","CB","CB","LM","CM","CM","RM","CAM","CAM","ST"]},
 "3-4-3":{def:3,mid:4,fw:3,rows:[1,3,4,3],slots:["POR","CB","CB","CB","LM","CM","CM","RM","LW","ST","RW"]},
 "3-5-2":{def:3,mid:5,fw:2,rows:[1,3,5,2],slots:["POR","CB","CB","CB","LM","CDM","CM","CM","RM","ST","ST"]},
 "3-1-4-2":{def:3,mid:5,fw:2,rows:[1,3,1,4,2],slots:["POR","CB","CB","CB","CDM","LM","CM","CM","RM","ST","ST"]},
 "5-3-2":{def:5,mid:3,fw:2,rows:[1,5,3,2],slots:["POR","LWB","CB","CB","CB","RWB","CM","CM","CM","ST","ST"]},
 "5-2-3":{def:5,mid:2,fw:3,rows:[1,5,2,3],slots:["POR","LWB","CB","CB","CB","RWB","CDM","CM","LW","ST","RW"]},
 "5-4-1":{def:5,mid:4,fw:1,rows:[1,5,4,1],slots:["POR","LWB","CB","CB","CB","RWB","LM","CM","CM","RM","ST"]},
 "4-2-4":{def:4,mid:2,fw:4,rows:[1,4,2,4],slots:["POR","LB","CB","CB","RB","CM","CM","LW","ST","ST","RW"]},
 "4-3-1-2":{def:4,mid:4,fw:2,rows:[1,4,3,1,2],slots:["POR","LB","CB","CB","RB","CM","CM","CM","CAM","ST","ST"]},
 "4-1-3-2":{def:4,mid:4,fw:2,rows:[1,4,1,3,2],slots:["POR","LB","CB","CB","RB","CDM","LM","CM","RM","ST","ST"]},
 "4-3-3 (5)":{def:4,mid:3,fw:3,rows:[1,4,3,3],slots:["POR","LB","CB","CB","RB","CM","CM","CM","CF","CF","CF"]}
};
function naturalPos(p){return String(p?.primaryPosition||p?.pos||"").toUpperCase()}
function broadRole(pos){pos=String(pos||"").toUpperCase();if(["POR","GK"].includes(pos))return "POR";if(["LB","RB","CB","LWB","RWB","DEF","LCB","RCB"].includes(pos))return "DEF";if(["ST","CF","LW","RW","DEL","LF","RF"].includes(pos))return "DEL";return "MED"}
function canPlayPosition(p,required){
 const n=naturalPos(p),r=String(required||"").toUpperCase();if(!p)return false;
 if(r==="POR")return ["POR","GK"].includes(n);
 if(["DEF","MED","DEL"].includes(r))return broadRole(n)===r;
 // Compatibilidad por puesto al estilo FIFA: nunca se permite cambiar de banda a lateral contrario ni convertir extremos/medios en laterales.
 const groups={
  LB:["LB","LWB"], RB:["RB","RWB"], CB:["CB","LCB","RCB"], LCB:["LCB","CB"], RCB:["RCB","CB"],
  LWB:["LWB","LB"], RWB:["RWB","RB"],
  LM:["LM","LW"], LW:["LW","LM"], RM:["RM","RW"], RW:["RW","RM"],
  CDM:["CDM","CM"], CM:["CM","CDM","CAM"], CAM:["CAM","CM","CF"],
  CF:["CF","CAM","ST"], ST:["ST","CF"], LF:["LF","LW","CF"], RF:["RF","RW","CF"]
 };
 return (groups[r]||[r]).includes(n);
}
function slotPosition(idx,formation=state.formation){return (FORMATIONS[formation]||FORMATIONS["4-3-3"]).slots[idx]||"CM"}
function displaySlotPosition(pos){return ({CAM:"MCO",CDM:"MCD"})[String(pos||"").toUpperCase()]||String(pos||"").toUpperCase()}
function slotRole(idx,formation=state.formation){return broadRole(slotPosition(idx,formation))}
function canPlaySlot(p,idx,formation=state.formation){return canPlayPosition(p,slotPosition(idx,formation))}
function changeFormation(value){if(!FORMATIONS[value])return;const old=state.lineup.map(id=>id?getPlayer(id):null).filter(Boolean);state.formation=value;state.lineup=Array(11).fill(null);const used=new Set();for(let i=0;i<11;i++){const found=old.find(p=>!used.has(p.id)&&canPlaySlot(p,i,value));if(found){state.lineup[i]=found.id;used.add(found.id)}}editingSlot=null;document.getElementById("clubMessage").textContent=`Formación ${value} seleccionada. Se han recolocado los jugadores en puestos compatibles; los puestos que no se pueden cubrir quedan libres.`;save()}
function alignPlayer(id){if(state.lineup.includes(id)){document.getElementById("clubMessage").textContent="Ese jugador ya está en el once.";return}const p=getPlayer(id);if(!p||!p.owned){document.getElementById("clubMessage").textContent="Primero consigue a ese jugador.";return}const idx=state.lineup.findIndex((x,i)=>x===null&&canPlaySlot(p,i));if(idx<0){document.getElementById("clubMessage").textContent=`No hay hueco libre para ${p.pos}. Libera un puesto de esa posición o cambia la formación.`;return}state.lineup[idx]=id;document.getElementById("clubMessage").textContent=`${p.name} entra en un puesto de ${p.pos}.`;save()}
function removeFromLineup(idx){state.lineup[idx]=null;save()}
function editLineupSlot(slot){editingSlot=slot;renderBenchEditor();const panel=document.getElementById("lineupBench");if(panel)panel.scrollIntoView({behavior:"smooth",block:"nearest"})}
function renderBenchEditor(){const panel=document.getElementById("lineupBench");if(!panel)return;if(editingSlot===null||editingSlot===undefined){panel.innerHTML='<b>Tu once titular</b><p class="small">Pulsa cualquier jugador del campo para cambiarlo. La lista solo mostrará futbolistas de la misma posición.</p>';return}const role=displaySlotPosition(slotPosition(editingSlot)),current=state.lineup[editingSlot]?getPlayer(state.lineup[editingSlot]):null;const options=state.players.filter(p=>p.owned&&canPlaySlot(p,editingSlot)&&(!state.lineup.includes(p.id)||state.lineup[editingSlot]===p.id));panel.innerHTML=`<b>Editar puesto ${editingSlot+1} · ${role}</b><p class="small">${current?`Actualmente: ${current.name}.`:"Puesto libre."} Puedes elegir jugadores que encajen en este puesto.</p><div class="bench-options">${options.map(p=>`<button class="secondary" onclick="putPlayerInSlot(${editingSlot},${p.id})" ${state.lineup[editingSlot]===p.id?"disabled":""}>${p.emoji} ${p.name}<br><small>${naturalPos(p)} · ${p.rating}</small></button>`).join("")||'<span class="small">Aún no tienes otros jugadores de esta posición.</span>'}<button class="secondary" onclick="clearLineupSlot(${editingSlot})">Vaciar puesto</button><button class="secondary" onclick="closeLineupEditor()">Volver al equipo</button></div>`}
function putPlayerInSlot(slot,id){const p=getPlayer(id);if(!p||!p.owned||!canPlaySlot(p,slot))return;const previous=state.lineup.indexOf(id);if(previous>=0)state.lineup[previous]=state.lineup[slot];state.lineup[slot]=id;editingSlot=null;document.getElementById("clubMessage").textContent=`${p.name} está alineado en el puesto ${slot+1}.`;save();document.getElementById("pitch")?.scrollIntoView({behavior:"smooth",block:"center"})}
function closeLineupEditor(){editingSlot=null;renderBenchEditor();document.getElementById("pitch")?.scrollIntoView({behavior:"smooth",block:"center"})}
function clearLineupSlot(slot){state.lineup[slot]=null;editingSlot=null;save();document.getElementById("pitch")?.scrollIntoView({behavior:"smooth",block:"center"})}
function renderPitch(){const pitch=document.getElementById("pitch");const f=FORMATIONS[state.formation]||FORMATIONS["4-3-3"];const rows=[];if(f.rowSlots){f.rowSlots.forEach(row=>rows.push(row.slice()))}else{let offset=0;(f.rows||[1,f.def,f.mid,f.fw]).forEach(count=>{rows.push(Array.from({length:count},(_,i)=>offset+i));offset+=count})}const sel=document.getElementById("formationSelect");if(sel)sel.value=state.formation;pitch.innerHTML=rows.slice().reverse().map(row=>`<div class="line">${row.map(slot=>{const id=state.lineup[slot];const p=id?getPlayer(id):null;const role=displaySlotPosition(slotPosition(slot));if(!p)return `<button class="lineup-card empty" title="Cambiar puesto ${slot+1} · ${role}" onclick="editLineupSlot(${slot})"><span style="font-size:21px">＋</span><span class="lineup-name">Libre</span><span class="lineup-pos">${role}</span></button>`;const style=p.cardStyle||(p.rating>=90?"elite":p.rating>=80?"gold":p.rating>=70?"silver":"bronze");return `<button class="lineup-card style-${style}" title="${escapeHTML(p.name)} · ${role}" onclick="editLineupSlot(${slot})"><span class="lineup-rating">${p.rating}</span><span class="lineup-avatar" data-player-id="${p.id}" data-player-name="${escapeHTML(p.name).replace(/"/g,"&quot;")}">${p.emoji||"⚽"}</span><span class="lineup-name">${escapeHTML(p.name)}</span><span class="lineup-pos">${escapeHTML(naturalPos(p))}</span></button>`}).join("")}</div>`).join("")+`<span class="pitch-label">Pulsa una carta para cambiar al jugador</span>`;renderBenchEditor();loadVisiblePlayerPhotos()}
function playMatch(){const my=rating();if(aligned().length<3){document.getElementById("matchStatus").textContent="Alinea al menos 3 jugadores antes de jugar.";return}const rival=rand(72,88),myGoals=Math.max(0,Math.round((my-rival)/13+rand(0,2))),theirGoals=Math.max(0,Math.round((rival-my)/13+rand(0,2)));state.played++;if(myGoals>theirGoals){state.wins++;state.coins+=50;document.getElementById("matchStatus").textContent="¡Victoria! Has ganado 50 monedas."}else if(myGoals===theirGoals){state.coins+=30;document.getElementById("matchStatus").textContent="Empate. Has ganado 30 monedas."}else{state.coins+=20;document.getElementById("matchStatus").textContent="Derrota. Has ganado 20 monedas por participar."}document.getElementById("score").textContent=`${myGoals} : ${theirGoals}`;document.getElementById("matchLog").innerHTML=[`• Tu valoración: ${my}`,`• Valoración rival: ${rival}`,`• Resultado simulado según la media del once y el azar.`].join("<br>");save()}
function renderMarket(){
 const packs=[["bronce","📦 Sobre bronce",100,"96% de 70 o menos · 3% de 71–80 · 0,8% de 81–85 · 0,2% de 86+"],["plata","🥈 Sobre plata",250,"80% de 74–79 · 17% de 80–84 · 2,7% de 85–89 · 0,3% de 90+ (mínimo 74)"],["oro","🥇 Sobre oro",500,"75% de 80–84 · 20% de 85–89 · 4,5% de 90–94 · 0,5% de 95+ (mínimo 80)"],["leyenda","✨ Sobre de Iconos o Héroes",10000,"Puede salir un Icono/Leyenda (blanco) o un Héroe (morado claro). Si es posible, prioriza cartas que aún no tengas."]];
 const grid=document.getElementById("packGrid");
 if(grid)grid.innerHTML=packs.map(([id,title,cost,desc])=>`<article class="card"><div class="avatar">🎴</div><h3>${title}</h3><p class="small">${desc}</p><div class="price">🪙 ${cost}</div><button onclick="openPack('${id}')" ${state.coins<cost?"disabled":""}>Abrir sobre</button></article>`).join("");
 const leagueEl=document.getElementById("leagueFilter");populateLeagueFilter("leagueFilter",state.players);
 const league=leagueEl?.value||"Todas",pos=document.getElementById("positionFilter")?.value||"Todas",rarity=document.getElementById("marketRarityFilter")?.value||"Todas",ratingCut=document.getElementById("marketRatingFilter")?.value||"Todas",query=(document.getElementById("marketSearch")?.value||"").trim().toLocaleLowerCase("es");
 // El mercado muestra el catálogo completo, incluidos los jugadores que ya tienes.
 const matches=state.players.filter(p=>(league==="Todas"||p.league===league)&&(pos==="Todas"||p.pos===pos)&&(rarity==="Todas"||playerRarity(p)===rarity)&&ratingFilterMatches(p,ratingCut)&&(!query||`${p.name} ${p.club} ${p.league} ${p.pos} ${playerRarity(p)} ${p.rating}`.toLocaleLowerCase("es").includes(query)));
 const status=document.getElementById("marketSearchStatus");if(status)status.textContent=`${matches.length} jugadores en el catálogo con estos filtros. Se incluyen también los que ya tienes en tu colección.`;
 document.getElementById("marketGrid").innerHTML=matches.map(p=>cardHTML(p,true)).join("")||'<p class="sub">No hay jugadores para mostrar con esos filtros.</p>';
}
function casinoBetValue(id){const el=document.getElementById(id);const n=el?Number(el.value):5;return [5,10,15,20].includes(n)?n:5}
function casinoCanBet(bet,resultId){const box=document.getElementById(resultId);if(state.coins<bet){if(box){box.className="casino-result lose";box.textContent=`No tienes suficientes monedas. Necesitas ${bet} y tienes ${state.coins}.`;}return false}return true}
function casinoSetResult(id,html,win){const el=document.getElementById(id);if(!el)return;el.className=`casino-result ${win?'win':'lose'}`;el.innerHTML=html}
const ROULETTE_ORDER=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
function setupRouletteWheel(wheelId,numbersId){const wheel=document.getElementById(wheelId),holder=document.getElementById(numbersId);if(!wheel||!holder||holder.dataset.ready)return;const step=360/ROULETTE_ORDER.length;const stops=[];ROULETTE_ORDER.forEach((n,i)=>{const color=rouletteColor(n);stops.push(`${color==="red"?"#a71924":color==="black"?"#111713":"#08783d"} ${i*step}deg ${(i+1)*step}deg`);const label=document.createElement("span");label.className=`wheel-number ${color}`;label.textContent=n;label.style.transform=`rotate(${i*step}deg) translateY(-${wheel.clientWidth*.365}px) rotate(${-i*step}deg)`;holder.appendChild(label)});wheel.style.background=`conic-gradient(from ${-step/2}deg,${stops.join(",")})`;holder.dataset.ready="1"}
function refreshWheelLabels(wheelId,numbersId){const wheel=document.getElementById(wheelId),holder=document.getElementById(numbersId);if(!wheel||!holder)return;const labels=holder.querySelectorAll(".wheel-number"),step=360/37;labels.forEach((label,i)=>{label.style.transform=`rotate(${i*step}deg) translateY(-${wheel.clientWidth*.365}px) rotate(${-i*step}deg)`})}
function spinWheel(wheelId,numbersId,n){setupRouletteWheel(wheelId,numbersId);refreshWheelLabels(wheelId,numbersId);const wheel=document.getElementById(wheelId);const stage=wheel.closest(".roulette-stage");const index=ROULETTE_ORDER.indexOf(n),step=360/37;const current=((Number(wheel.dataset.rotation)||0)%360+360)%360;const rounds=7+rand(0,2);const target=current+360*rounds+((360-index*step-current%360+720)%360);wheel.classList.add("spinning");stage?.classList.add("spinning");wheel.style.transform=`rotate(${target}deg)`;wheel.dataset.rotation=String(target);return new Promise(resolve=>setTimeout(()=>{wheel.classList.remove("spinning");stage?.classList.remove("spinning");resolve()},5650))}
function setCasinoBusy(ids,busy){ids.forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=busy})}
async function casinoSlots(){const bet=casinoBetValue("slotsBet");if(!casinoCanBet(bet,"slotsResult"))return;if(!window.confirm(`¿Quieres apostar ${bet} monedas en la tragaperras?${"\n"}Saldo actual: ${state.coins} monedas.`))return;setCasinoBusy(["slotsSpinBtn"],true);state.coins-=bet;save();const symbols=["⚽","⭐","🪙","🏆","🔥","💎"];const reels=[0,1,2].map(()=>symbols[rand(0,symbols.length-1)]);const ids=["reel1","reel2","reel3"];const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));ids.forEach(id=>document.getElementById(id).classList.add("spinning"));for(let i=0;i<3;i++){const el=document.getElementById(ids[i]);const end=Date.now()+850+i*480;while(Date.now()<end){el.textContent=symbols[rand(0,symbols.length-1)];await sleep(75)}el.textContent=reels[i];el.classList.remove("spinning");await sleep(180)}let payout=0;if(reels.every(x=>x===reels[0]))payout=bet*5;else if(new Set(reels).size===2)payout=bet*2;state.coins+=payout;const net=payout-bet;casinoSetResult("slotsResult",payout?`🎉 ${reels.join(" ")}<br>Premio: <b>${payout} monedas</b> · ${net>=0?`ganancia neta +${net}`:`balance ${net}`} monedas.`:`${reels.join(" ")}<br>Sin premio. Has perdido ${bet} monedas.`,payout>bet);save();setCasinoBusy(["slotsSpinBtn"],false)}
function rouletteSpin(){return rand(0,36)}
function rouletteColor(n){if(n===0)return "green";return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n)?"red":"black"}
async function casinoRouletteColor(){const bet=casinoBetValue("colorBet");if(bet>20||!casinoCanBet(bet,"colorResult"))return;if(!window.confirm(`¿Quieres apostar ${bet} monedas a ${document.getElementById("rouletteColor").value==="red"?"rojo":"negro"}?\nSaldo actual: ${state.coins} monedas.`))return;setCasinoBusy(["colorSpinBtn","numberSpinBtn"],true);state.coins-=bet;save();const n=rouletteSpin(),color=rouletteColor(n),pick=document.getElementById("rouletteColor").value;await spinWheel("colorWheel","colorWheelNumbers",n);const won=color===pick;const payout=won?bet*2:0;state.coins+=payout;casinoSetResult("colorResult",`Salió <b>${n}</b> (${color==="red"?"🔴 rojo":color==="black"?"⚫ negro":"🟢 verde"}).<br>${won?`¡Has acertado! Recibes ${payout} monedas.`:`No has acertado. Pierdes ${bet} monedas.`}`,won);save();setCasinoBusy(["colorSpinBtn","numberSpinBtn"],false)}
async function casinoRouletteNumber(){const bet=casinoBetValue("numberBet");const input=document.getElementById("rouletteNumber");const pick=Number(input.value);if(!Number.isInteger(pick)||pick<0||pick>36){casinoSetResult("numberResult","Introduce un número entero entre 0 y 36.",false);return}if(!casinoCanBet(bet,"numberResult"))return;if(!window.confirm(`¿Quieres apostar ${bet} monedas al número ${pick}?\nSaldo actual: ${state.coins} monedas.`))return;setCasinoBusy(["numberSpinBtn","colorSpinBtn"],true);state.coins-=bet;save();const n=rouletteSpin();await spinWheel("numberWheel","numberWheelNumbers",n);const won=n===pick;const payout=won?bet*36:0;state.coins+=payout;casinoSetResult("numberResult",`Salió <b>${n}</b> (${rouletteColor(n)}).<br>${won?`¡Número exacto! Recibes ${payout} monedas.`:`No ha salido el ${pick}. Pierdes ${bet} monedas.`}`,won);save();setCasinoBusy(["numberSpinBtn","colorSpinBtn"],false)}
const photoLookupCache=new Map();const photoLookupPending=new Set();
function stripHtml(value){const node=document.createElement("div");node.innerHTML=value||"";return (node.textContent||node.innerText||"").trim()}
function approvedPhotoLicense(info){const license=stripHtml(info?.extmetadata?.LicenseShortName?.value||"").toLowerCase();return license.includes("cc0")||license.includes("cc zero")||license.includes("public domain")||license.includes("pd-")}
async function findLicensedPlayerPhoto(name){if(photoLookupCache.has(name))return photoLookupCache.get(name);try{const parts=name.trim().split(/\s+/).filter(Boolean);const q=`"${name}" football`;const url="https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch="+encodeURIComponent(q)+"&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&format=json&origin=*";const response=await fetch(url);if(!response.ok)throw new Error("Commons no disponible");const data=await response.json();const pages=Object.values(data.query?.pages||{});const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const first=norm(parts[0]||"");const last=norm(parts[parts.length-1]||"");let found=null;for(const page of pages){const info=page.imageinfo?.[0];if(!info||!approvedPhotoLicense(info))continue;const title=norm(page.title);if(!last||!title.includes(last))continue;if(first.length>2&&!title.includes(first)&&!title.includes(first.slice(0,Math.min(5,first.length))))continue;found={url:info.thumburl||info.url,page:info.descriptionurl,license:stripHtml(info.extmetadata?.LicenseShortName?.value||"Public domain/CC0"),artist:stripHtml(info.extmetadata?.Artist?.value||info.extmetadata?.Credit?.value||"")};break}photoLookupCache.set(name,found);return found}catch(e){photoLookupCache.set(name,null);return null}}
async function loadCardPhoto(el){const name=el.dataset.playerName;if(!name||el.dataset.photoDone==="1")return;while(photoLookupPending.has(name)){await new Promise(resolve=>setTimeout(resolve,60));if(!el.isConnected||el.dataset.photoDone==="1")return}photoLookupPending.add(name);let photo=null;try{photo=await findLicensedPlayerPhoto(name)}finally{photoLookupPending.delete(name)}el.dataset.photoDone="1";if(!photo||!el.isConnected)return;el.textContent="";const img=document.createElement("img");img.src=photo.url;img.alt=`Fotografía de ${name}`;img.loading="lazy";img.referrerPolicy="no-referrer";img.onerror=()=>{el.textContent="⚽"};el.appendChild(img)}
function loadVisiblePlayerPhotos(){const els=Array.from(document.querySelectorAll(".player-card .avatar[data-player-name],#pitch .lineup-avatar[data-player-name]")).slice(0,60);let index=0;async function worker(){while(index<els.length){const el=els[index++];await loadCardPhoto(el)}}for(let i=0;i<4;i++)worker()}
function render(){document.getElementById("coinsTop").textContent=state.coins;const casinoCoins=document.getElementById("casinoCoins");if(casinoCoins)casinoCoins.textContent=state.coins;const resetBtn=document.getElementById("resetClubBtn");if(resetBtn){const left=Math.max(0,3-(state.resetUses||0));resetBtn.disabled=left===0;resetBtn.textContent=left?`↻ Reiniciar equipo y monedas (${left} usos disponibles)`:"Reinicios agotados";const rm=document.getElementById("resetClubMessage");if(rm)rm.textContent=left?`Tienes ${left} reinicios disponibles.`:"Ya has usado los 3 reinicios disponibles.";}document.getElementById("marketCoins").textContent=state.coins;document.getElementById("ownedCount").textContent=state.players.filter(p=>p.owned).length;document.getElementById("teamRating").textContent=rating();document.getElementById("marketRating").textContent=rating();document.getElementById("wins").textContent=state.wins;document.getElementById("played").textContent=state.played;document.getElementById("progress").style.width=Math.min(100,state.wins/3*100)+"%";document.getElementById("progressText").textContent=`${Math.min(state.wins,3)} de 3 victorias`;renderPitch();renderMarket();renderCollection();document.getElementById("clubCoins").textContent=state.coins;document.getElementById("collectionCoins").textContent=state.coins;document.getElementById("collectionCount").textContent=state.players.filter(p=>p.owned).length;loadVisiblePlayerPhotos()}



// API pública pequeña para que el módulo FUT Draft use el catálogo sin modificar la colección.
window.FMC = {
  getPlayerById(id) { return state.players.find(p => Number(p.id) === Number(id)) || null; },
  getDraftAllPlayers() { return state.players.map(p => ({ ...p })); },
  getFutChapasData() {
    const owned = state.players.filter(p => p.owned);
    const ownedById = new Map(owned.map(p => [String(p.id), p]));
    const realName = p => p && p.name && !/^(portero|defensa|defensor|medio|mediocentro|centrocampista|delantero|jugador|rival)(?:\s*\d+)?$/i.test(String(p.name).trim());
    const rawLineup = (state.lineup || []).map(slot => {
      if (slot && typeof slot === "object") return ownedById.get(String(slot.id)) || owned.find(p => p.name === slot.name) || slot;
      return slot != null ? (ownedById.get(String(slot)) || ownedById.get(String(Number(slot))) || null) : null;
    });
    // Si un guardado antiguo contiene huecos o nombres genéricos, resolverlos con futbolistas reales del club.
    const used = new Set(rawLineup.filter(realName).map(p => String(p.id)));
    const lineup = rawLineup.map((p, i) => {
      if (realName(p)) return { ...p };
      const slotPos = i === 0 ? "POR" : (i <= 4 ? "DEF" : (state.formation === "4-4-2" ? (i <= 8 ? "MED" : "DEL") : state.formation === "3-5-2" ? (i <= 8 ? "MED" : "DEL") : state.formation === "5-3-2" ? (i <= 8 ? "MED" : "DEL") : (i <= 7 ? "MED" : "DEL")));
      const replacement = owned.find(candidate => realName(candidate) && !used.has(String(candidate.id)) && String(candidate.pos || candidate.primaryPosition || "").toUpperCase() === slotPos)
        || owned.find(candidate => realName(candidate) && !used.has(String(candidate.id)));
      if (replacement) { used.add(String(replacement.id)); return { ...replacement }; }
      return p ? { ...p } : null;
    });
    const all = state.players.map(p => ({ ...p }));
    return { lineup, allPlayers: all, formation: state.formation || "4-3-3" };
  },
  getPlayerPosition(p) { return String(p?.primaryPosition || p?.pos || ''); },
  getDraftOptions(slotPosition, usedIds = []) {
    const used = new Set(usedIds.map(Number));
    const role = String(slotPosition || '').toUpperCase();
    const roleOf = p => { const pos = String(p.primaryPosition || p.pos || '').toUpperCase(); if (['GK','POR'].includes(pos)) return 'POR'; if (['LB','RB','CB','LCB','RCB','LWB','RWB','SW','DEF'].includes(pos)) return 'DEF'; if (['LM','RM','CM','LCM','RCM','CDM','LDM','RDM','CAM','LAM','RAM','MED'].includes(pos)) return 'MED'; return 'DEL'; };
    let pool = state.players.filter(p => !used.has(Number(p.id)) && roleOf(p) === role);
    if (pool.length < 5) pool = state.players.filter(p => !used.has(Number(p.id)));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 5).map(p => ({ ...p }));
  },
  addDraftReward(amount) { state.coins += Math.max(0, Number(amount) || 0); save(); return state.coins; },
  addCoins(amount) { state.coins += Math.max(0, Number(amount) || 0); save(); render(); return state.coins; },
  getCoins() { return state.coins; }
};
