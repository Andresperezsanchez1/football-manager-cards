// --- Partido arcade controlable: teclado + controles táctiles ---
const game = {
  canvas:null, ctx:null, view3D:true, running:false, over:false, autoPlay:false, aiActionAt:0, last:0, elapsed:0, duration:90,
  scoreHome:0, scoreAway:0, lastShooter:null, keys:{}, joy:{x:0,y:0,active:false}, sprint:false,
  players:[], opponentSquad:[], opponentClub:"Cádiz CF", controlledIndex:0, possession:null, ball:{x:450,y:260,vx:0,vy:0,vz:0,z:0,r:8}, chargeStarted:0, shotCharge:0, dribbleUntil:0, tackleUntil:0, message:"Pulsa “Empezar partido” para jugar.",
  goalW:190, fieldW:1200, fieldH:720, lastReward:false, keeperClearTo:null, keeperHoldUntil:0
};
function makeFootballer(x,y,team,index){
 const squad=team===0?state.lineup.map(id=>id?getPlayer(id):null):(game.opponentSquad||[]);
 const lp=squad[index]||null;
 const rating=lp?lp.rating:rand(62,82),atk=lp?lp.atk:rand(45,82),def=lp?lp.def:rand(48,84),stam=lp?lp.stam:rand(55,88);
 const isKeeper=lp?lp.pos==="POR":index===0;
 const baseSpeed=isKeeper?72:82+rating*0.36+stam*0.10;
 return {x,y,vx:0,vy:0,team,index,r:isKeeper?17:14,speed:baseSpeed,rating,atk,def,stam,
 acceleration:3.9+rating/29,control:Math.max(0.38,Math.min(0.96,0.42+rating/180+(stam/500))),passSkill:Math.max(0.35,Math.min(0.98,0.34+(lp?lp.atk:atk)/130+rating/360)),
 name:lp?lp.name:(team===0?"Jugador":"Rival"),nickname:lp?((lp.name||"Jugador").split(" ")[0].slice(0,11)):(team===0?"J"+(index+1):"R"+(index+1)),club:lp?lp.club:"",pos:lp?lp.pos:slotRole(index),isKeeper};
}
function getOpponentClubs(){
 const counts=new Map();allPlayers.forEach(p=>{if(p.club)counts.set(p.club,(counts.get(p.club)||0)+1)});
 return [...counts.entries()].filter(([club,count])=>count>=11).map(([club])=>club).sort((a,b)=>a.localeCompare(b,"es"));
}
function populateOpponentSelect(){
 const sel=document.getElementById("opponentClub");if(!sel)return;
 const clubs=getOpponentClubs();const preferred=clubs.includes("Cádiz CF")?"Cádiz CF":clubs[0];
 const current=clubs.includes(sel.value)?sel.value:preferred;
 sel.innerHTML=clubs.map(club=>`<option value="${String(club).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}">${club}</option>`).join("");
 sel.value=current||preferred||"";
}
function buildOpponentSquad(club){
 // Solo usa futbolistas del club seleccionado y los coloca según los puestos reales de la formación.
 const pool=allPlayers.filter(p=>String(p.club||"").trim()===String(club||"").trim()).slice().sort((a,b)=>b.rating-a.rating);
 const formation=FORMATIONS[state.formation]||FORMATIONS["4-3-3"];
 const used=new Set(),picked=[];
 for(const required of formation.slots){
   let player=pool.find(p=>!used.has(p.id)&&canPlayPosition(p,required));
   // Si no existe un jugador de esa posición en el catálogo de ese club, buscar otro de la misma línea.
   if(!player){const line=broadRole(required);player=pool.find(p=>!used.has(p.id)&&broadRole(p.pos)===line)}
   if(player){used.add(player.id);picked.push(player)}else picked.push(null);
 }
 return picked.slice(0,11);
}
function setupFootballGame(){
 game.players=[];
 const availableClubs=getOpponentClubs();
 game.opponentClub=availableClubs.length?availableClubs[rand(0,availableClubs.length-1)]:"Rival FC";
 game.opponentSquad=buildOpponentSquad(game.opponentClub);
 const homeName=document.getElementById("homeTeamName");if(homeName)homeName.textContent="🟢 TU CLUB";
 const awayName=document.getElementById("awayTeamName");if(awayName)awayName.textContent="🔴 "+game.opponentClub;
 const f=FORMATIONS[state.formation]||FORMATIONS["4-3-3"];
 const lineYs=n=>Array.from({length:n},(_,i)=>n===1?360:110+i*(500/(n-1)));
 const home=[[65,360],...lineYs(f.def).map(y=>[235,y]),...lineYs(f.mid).map(y=>[430,y]),...lineYs(f.fw).map(y=>[600,y])];
 const away=[[1135,360],...lineYs(f.def).map(y=>[965,y]),...lineYs(f.mid).map(y=>[770,y]),...lineYs(f.fw).map(y=>[600,y])];
 home.forEach((p,i)=>game.players.push(makeFootballer(p[0],p[1],0,i)));
 away.forEach((p,i)=>game.players.push(makeFootballer(p[0],p[1],1,i)));
 game.ball={x:600,y:360,vx:0,vy:0,vz:0,z:0,r:10};game.controlledIndex=8;game.possession=null;game.keeperClearTo=null;game.keeperHoldUntil=0;
 game.elapsed=0;game.scoreHome=0;game.scoreAway=0;game.over=false;game.lastReward=false;game.lastShooter=null;game.passTarget=null;game.aiActionAt=0;
 game.message="¡Partido listo! Usa los botones de abajo; tienes 11 jugadores y porteros.";
 updateGameHUD();drawFootball();syncFootball3D();
}
function updateGameHUD(){
 const attacking=!!(game.possession&&game.possession.team===0);
 const aLabel=document.getElementById("aActionLabel"),bLabel=document.getElementById("bActionLabel"),cLabel=document.getElementById("cActionLabel");
 if(aLabel)aLabel.textContent=attacking?"CHUTAR":"ENTRADA";if(bLabel)bLabel.textContent=attacking?"PASE":"PRESIÓN";if(cLabel)cLabel.textContent=attacking?"ELEVADO":"CAMBIAR";
  const score=document.getElementById("liveScore"),time=document.getElementById("liveTime"),msg=document.getElementById("liveMessage");
  if(score)score.textContent=game.scoreHome+" - "+game.scoreAway;
  if(time){const left=Math.max(0,game.duration-game.elapsed);time.textContent=String(Math.floor(left/60)).padStart(2,"0")+":"+String(Math.floor(left%60)).padStart(2,"0")}
  if(msg){msg.textContent=game.message;msg.style.display=game.running&&!game.over?"none":"inline";}
  const start=document.getElementById("startGameBtn");
  if(start)start.textContent=game.over?"▶ Jugar otra vez":game.running?"⏸ Partido en marcha":"▶ Empezar partido";
}
function drawFootball(){
  const c=game.canvas;if(!c)return;const ctx=game.ctx,W=game.fieldW,H=game.fieldH;
  ctx.clearRect(0,0,W,H);
  for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#2a8748":"#247640";ctx.fillRect(i*W/10,0,W/10,H)}
  ctx.strokeStyle="#e2f2dc";ctx.lineWidth=3;ctx.strokeRect(22,18,W-44,H-36);
  ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-18);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,95,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,4,0,Math.PI*2);ctx.fillStyle="#e2f2dc";ctx.fill();
  ctx.strokeRect(22,H/2-145,145,290);ctx.strokeRect(W-167,H/2-145,145,290);
  ctx.strokeRect(22,H/2-75,58,150);ctx.strokeRect(W-80,H/2-75,58,150);
  ctx.fillStyle="#f7f7f7";ctx.fillRect(0,H/2-game.goalW/2,22,game.goalW);ctx.fillRect(W-22,H/2-game.goalW/2,22,game.goalW);
  game.players.forEach((p)=>{
    ctx.beginPath();ctx.arc(p.x,p.y,p.r+2,0,Math.PI*2);ctx.fillStyle=p.isKeeper?(p.team===0?"#ffd166":"#72c8ff"):(p.team===0?"#d9f6df":"#ffb7b7");ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.team===0?"#1765e8":"#d83232";ctx.fill();
    if(p.team===0&&p.index===game.controlledIndex){ctx.beginPath();ctx.arc(p.x,p.y,p.r+6,0,Math.PI*2);ctx.strokeStyle="#ffd166";ctx.lineWidth=3;ctx.stroke()}
    ctx.fillStyle="#fff";ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#102016";ctx.strokeText(p.nickname||p.name,p.x,p.y-p.r-9);ctx.fillText(p.nickname||p.name,p.x,p.y-p.r-9);ctx.font="bold 10px system-ui";ctx.fillText(p.isKeeper?"POR":(p.team===0?String(p.index+1):"R"),p.x,p.y+3.5);
  });
  const b=game.ball,ballDrawY=b.y-(b.z||0);ctx.beginPath();ctx.ellipse(b.x,b.y+2,b.r+2,Math.max(3,b.r*.65),0,0,Math.PI*2);ctx.fillStyle=`rgba(0,0,0,${Math.max(.12,.35-(b.z||0)/160)})`;ctx.fill();ctx.beginPath();ctx.arc(b.x,ballDrawY,b.r+Math.min(5,(b.z||0)*.025),0,Math.PI*2);ctx.fillStyle="#123";ctx.fill();ctx.beginPath();ctx.arc(b.x,ballDrawY,b.r,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#222";ctx.lineWidth=1.5;ctx.stroke();if((b.z||0)>5){ctx.beginPath();ctx.moveTo(b.x,ballDrawY+b.r);ctx.lineTo(b.x,b.y);ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=1;ctx.stroke()}
}
function resetAfterGoal(team){
  if(team===0)game.scoreHome++;else game.scoreAway++;
  const scorer=(game.lastShooter&&game.lastShooter.team===team)?game.lastShooter:(nearestPlayerToBall(team));
  game.message=team===0?"¡Gol de tu equipo!":"¡Gol del rival!";
  const toast=document.getElementById("gameToast");
  if(toast){toast.innerHTML=`<div>⚽ GOL MARCADO POR</div><div class="toast-player">${scorer?scorer.name:"Jugador"}</div>`;toast.classList.add("show");clearTimeout(window.__fmcGoalTimer);window.__fmcGoalTimer=setTimeout(()=>toast.classList.remove("show"),1000)}
  game.lastShooter=null;
  game.players.forEach((p)=>{const x=p.isKeeper?(p.team===0?45:1155):(p.team===0?235+(p.index%3)*150:965-(p.index%3)*150);p.x=x;p.y=p.isKeeper?360:100+(p.index*53)%520;p.vx=0;p.vy=0});
  game.ball={x:game.fieldW/2,y:game.fieldH/2,vx:0,vy:0,vz:0,z:0,r:10};game.possession=null;game.keeperClearTo=null;game.controlledIndex=8;game.message="¡Gol! Balón al centro para reanudar el partido.";updateGameHUD();
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function nearestPlayerToBall(team){let best=null,d=Infinity;game.players.filter(p=>p.team===team).forEach(p=>{const dd=dist(p,game.ball);if(dd<d){d=dd;best=p}});return best}
function currentPlayer(){return game.players.find(p=>p.team===0&&p.index===game.controlledIndex)||game.players[0]}
function attachBallTo(p){if(!p)return;game.possession=p;game.ball.z=0;game.ball.vz=0;game.ball.x=p.x+(p.team===0?17:-17);game.ball.y=p.y+4;game.ball.vx=0;game.ball.vy=0}
function actionShoot(charge=0.35){
  if(!game.running||game.over)return;
  const p=currentPlayer(),b=game.ball;
  if(game.possession!==p&&dist(p,b)>40){game.message="Acércate al balón para chutar.";updateGameHUD();return}
  if(game.possession!==p)attachBallTo(p);
  const aimX=(game.joy.x||0),aimY=(game.joy.y||0);
  // DLS-style: stick direction aims the shot; with no stick input, aim toward goal.
  let dx=aimX,dy=aimY;
  if(Math.hypot(dx,dy)<.22){dx= p.team===0?1:-1;dy=(game.fieldH/2-p.y)/(game.fieldH*.58)}
  if(p.team===0&&dx<-.25)dx=Math.max(-.25,dx); if(p.team===1&&dx>.25)dx=Math.min(.25,dx);
  const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  const accuracy=(p.atk||60)*.56+(p.rating||65)*.44,control=p.control||.6;
  const chargeFactor=Math.max(.12,Math.min(1,charge));
  const distanceToGoal=Math.abs((p.team===0?game.fieldW:p.team===1?0:game.fieldW/2)-p.x);
  const error=(Math.random()-.5)*(115-accuracy*.78)*(1+distanceToGoal/1200)*(1.15-control*.35)*(1.1-chargeFactor*.18);
  // Small directional error keeps shots skill-based without making them random.
  const shotX=dx*1000,shotY=dy*1000+error;
  const shotLen=Math.hypot(shotX,shotY)||1;
  const power=(430+(p.atk||60)*2.05+(p.rating||65)*.45)*(0.72+chargeFactor*.43);
  game.lastShooter=p; b.x=p.x+dx*(p.r+9);b.y=p.y+dy*(p.r+9);
  b.vx=shotX/shotLen*power;b.vy=shotY/shotLen*power;
  b.z=chargeFactor>0.72?8+chargeFactor*16:2+chargeFactor*7;
  b.vz=chargeFactor>0.72?65+chargeFactor*105:22+chargeFactor*32;
  b.spin=-dy*dx*42;game.possession=null;game.passTarget=null;
  game.message=chargeFactor>.75?"¡Disparo potente!":"¡Chut! La dirección del joystick guía el disparo.";updateGameHUD();
}
function actionPass(lofted=false){
  if(!game.running||game.over)return;const p=currentPlayer(),b=game.ball;
  if(game.possession!==p&&dist(p,b)>38){game.message="Acércate al balón para pasar.";updateGameHUD();return}
  if(game.possession!==p)attachBallTo(p);
  const stickX=game.joy.x||((game.keys.ArrowRight||game.keys.d?1:0)-(game.keys.ArrowLeft||game.keys.a?1:0));
  const stickY=game.joy.y||((game.keys.ArrowDown||game.keys.s?1:0)-(game.keys.ArrowUp||game.keys.w?1:0));
  const aiming=Math.hypot(stickX,stickY)>.25;
  const opponents=game.players.filter(r=>r.team===1);
  const mates=game.players.filter(q=>q.team===0&&q.index!==p.index&&!q.isKeeper).map(q=>{
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1,forward=dx>0?1:0;
    const openSpace=Math.min(...opponents.map(r=>dist(r,q)).concat([260]));
    const directionScore=aiming?((dx/d)*(stickX/Math.hypot(stickX,stickY))+(dy/d)*(stickY/Math.hypot(stickX,stickY))):((dx/d)*.8+(q.pos==="DEL"?.22:0));
    const score=(aiming?(1-directionScore)*210:0)+d*.48+(forward?-35:105)-Math.min(100,openSpace*.32)+(q.pos==="DEL"&&forward?-24:0)+(openSpace<48?55:0);
    return {q,score,directionScore};
  }).filter(x=>!aiming||x.directionScore>-.05).sort((a,b)=>a.score-b.score);
  const target=mates[0]?.q;if(!target){game.message="No hay un compañero en esa dirección.";updateGameHUD();return}
  const tx=target.x+(target.vx||0)*.28,ty=target.y+(target.vy||0)*.28;
  const dx=tx-p.x,dy=ty-p.y,len=Math.hypot(dx,dy)||1;
  const passSkill=p.passSkill||.6;const passPower=Math.min(lofted?390:470,(lofted?205:265)+passSkill*(lofted?95:130)+Math.min(55,len*.08));
  b.x=p.x+dx/len*(p.r+9);b.y=p.y+dy/len*(p.r+9);b.vx=dx/len*passPower;b.vy=dy/len*passPower;
  b.z=lofted?10:0;b.vz=lofted?150+passSkill*65:0;b.spin=0;game.possession=null;game.controlledIndex=target.index;game.passTarget=target;
  game.message=lofted?`Pase elevado hacia ${target.name}.`:`Pase a ${target.name}.`;updateGameHUD();
}
function actionSteal(){
  if(!game.running||game.over)return;const p=currentPlayer(),owner=game.possession,now=performance.now();
  if(now<(game.tackleUntil||0)){game.message="Recuperándote de la entrada…";updateGameHUD();return}
  game.tackleUntil=now+520;
  const dirX=(game.joy.x||((game.keys.ArrowRight||game.keys.d)?1:((game.keys.ArrowLeft||game.keys.a)?-1:(p.team===0?1:-1))));
  const dirY=(game.joy.y||((game.keys.ArrowDown||game.keys.s)?1:((game.keys.ArrowUp||game.keys.w)?-1:0)));
  const dlen=Math.hypot(dirX,dirY)||1;p.vx+=dirX/dlen*115;p.vy+=dirY/dlen*115;
  if(owner&&owner.team===1&&dist(p,owner)<58){const facing=(game.joy.x||1)*(owner.x-p.x)+(game.joy.y||0)*(owner.y-p.y);const chance=Math.max(.32,Math.min(.91,.24+(p.def||60)/190+(p.rating||65)/330-(owner.control||.6)*.2));if(facing>-8&&Math.random()<chance){game.controlledIndex=p.index;attachBallTo(p);game.message="¡Entrada limpia! Has recuperado el balón."}else{game.message="¡Entrada fallida! El rival ha protegido el balón.";p.vx*=.5;p.vy*=.5}}
  else if(!owner&&dist(p,game.ball)<48){game.controlledIndex=p.index;game.possession=null;attachBallTo(p);game.message="¡Te has anticipado y has recuperado la pelota!"}
  else game.message="Acércate al rival y pulsa ENTRADA (C).";updateGameHUD();
}
function actionDribble(){
  if(!game.running||game.over)return;const p=currentPlayer(),b=game.ball;
  if(game.possession!==p&&dist(p,b)>42){game.message="Acércate al balón para intentar el regate.";updateGameHUD();return}
  if(game.possession!==p)attachBallTo(p);
  const control=p.control||.6,now=performance.now();game.dribbleUntil=now+420;
  const ix=game.joy.x||((game.keys.ArrowRight||game.keys.d?1:0)-(game.keys.ArrowLeft||game.keys.a?1:0))||(p.team===0?1:-1);
  const iy=game.joy.y||((game.keys.ArrowDown||game.keys.s?1:0)-(game.keys.ArrowUp||game.keys.w?1:0));const len=Math.hypot(ix,iy)||1;
  p.vx+=ix/len*(55+control*62);p.vy+=iy/len*(55+control*62);
  const rival=game.players.filter(q=>q.team===1).sort((a,b)=>dist(a,p)-dist(b,p))[0];
  if(rival&&dist(rival,p)<56){const success=Math.max(.35,Math.min(.9,.3+control*.5+(p.rating-rival.rating)/220));if(Math.random()<success){const side=(p.y<rival.y?-1:1);p.vy+=side*(45+control*35);game.message="¡Regate! Has superado la presión del defensor."}else{game.message="El defensa ha leído el regate; protege el balón y cambia de dirección.";p.vx*=.55;p.vy*=.55}}
  game.message=game.message||"¡Regate en marcha!";updateGameHUD();
}
function actionSwitch(){
  if(!game.running||game.over)return;const p=currentPlayer();const next=game.players.filter(q=>q.team===0&&q.index!==p.index).sort((a,b)=>dist(a,game.ball)-dist(b,game.ball))[0];
  if(next){game.controlledIndex=next.index;game.message="Jugador seleccionado: "+next.name;updateGameHUD()}
}
function tickFootball(ts){
 if(!game.running)return;const dt=Math.min(.035,(ts-game.last)/1000||0);game.last=ts;
 if(!game.over){game.elapsed+=dt;if(game.elapsed>=game.duration){game.elapsed=game.duration;finishFootballMatch()}
  if(game.autoPlay){const chaser=nearestPlayerToBall(0);if(chaser)game.controlledIndex=chaser.index;const owner=game.possession;if(owner&&owner.team===0&&owner.x>650&&ts>game.aiActionAt){game.aiActionAt=ts+950;const b=game.ball;game.possession=null;const dx=game.fieldW+20-owner.x,dy=360-owner.y,len=Math.hypot(dx,dy)||1;b.x=owner.x+dx/len*20;b.y=owner.y+dy/len*20;b.vx=dx/len*(560+(owner.atk||65)*2);b.vy=dy/len*(560+(owner.atk||65)*2)*(dy/(Math.abs(dx)+1));game.message="La máquina de tu equipo ha chutado."}}const controlled=currentPlayer(),b=game.ball;let ix=game.autoPlay?((b.x>controlled.x+12)?1:(b.x<controlled.x-12)?-1:0):(game.keys.ArrowRight||game.keys.d?1:0)-(game.keys.ArrowLeft||game.keys.a?1:0)+game.joy.x;let iy=game.autoPlay?((b.y>controlled.y+12)?1:(b.y<controlled.y-12)?-1:0):(game.keys.ArrowDown||game.keys.s?1:0)-(game.keys.ArrowUp||game.keys.w?1:0)+game.joy.y;
  if(game.pressure&&!game.autoPlay&&game.possession&&game.possession.team===1){const dxp=game.possession.x-controlled.x,dyp=game.possession.y-controlled.y,dp=Math.hypot(dxp,dyp)||1;ix=dxp/dp;iy=dyp/dp;}
  if(game.passTarget===controlled&&!game.autoPlay){const manual=Math.hypot(ix,iy);if(manual<0.12){const pdx=b.x-controlled.x,pdy=b.y-controlled.y,plen=Math.hypot(pdx,pdy)||1;ix=pdx/plen;iy=pdy/plen}}
  const mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag}
  const fatigue=Math.max(0.78,1-(game.elapsed/game.duration)*(1-(controlled.stam||70)/150));
  const carrying=game.possession===controlled?0.91:1;
  const speed=controlled.speed*fatigue*carrying*((game.sprint||game.keys.Shift)?1.30:1)*(((game.dribbleUntil||0)>ts) ? 0.91 : 1);
  const targetVx=ix*speed,targetVy=iy*speed,accel=(controlled.acceleration||6)*(game.possession===controlled?0.68:1);
  controlled.vx+=(targetVx-controlled.vx)*Math.min(1,dt*accel);controlled.vy+=(targetVy-controlled.vy)*Math.min(1,dt*accel);
  if(mag<0.05){controlled.vx*=Math.pow(0.91,dt*60);controlled.vy*=Math.pow(0.91,dt*60)}
  controlled.x+=controlled.vx*dt;controlled.y+=controlled.vy*dt;
  game.players.filter(p=>p.team===0&&p!==controlled).forEach(p=>{if(p.isKeeper){p.x=45;{const targetY=Math.max(275,Math.min(445,b.y));const keeperSpeed=145+(p.rating||65)*1.15;p.y+=Math.max(-keeperSpeed*dt,Math.min(keeperSpeed*dt,targetY-p.y));}return}const role=p.pos;let tx=150+(p.index%4)*95,ty=100+(p.index%5)*115;const owner=game.possession;const nearestHome=nearestPlayerToBall(0);if(owner&&owner.team===0){if(role==="DEL"){tx=Math.min(900,Math.max(p.x+35,b.x+95+(p.index%2)*55));ty=Math.max(65,Math.min(655,b.y+(p.index%2?95:-95)))}else{tx=Math.max(150,Math.min(700,b.x-55+(p.index%3)*60));ty=Math.max(65,Math.min(655,b.y+(p.index%2?115:-115)))}}else if(owner&&owner.team===1){if(p===nearestHome){tx=owner.x;ty=owner.y}else{tx=Math.max(120,Math.min(760,150+p.index*48));ty=Math.max(65,Math.min(655,b.y+(p.index%2?145:-145)))} }else{if(p===nearestHome){tx=b.x;ty=b.y}else{tx=Math.max(140,Math.min(740,b.x-115+(p.index%3)*82));ty=Math.max(65,Math.min(655,100+(p.index%5)*125+(b.y-360)*.12))}}const runSpeed=role==="DEL"?1.15:1;p.x+=(tx-p.x)*dt*(p===nearestHome?1.35:.65)*runSpeed;p.y+=(ty-p.y)*dt*(p===nearestHome?1.35:.65)*runSpeed});
  const chaser=nearestPlayerToBall(1);game.players.filter(p=>p.team===1).forEach(p=>{if(p.isKeeper){p.x=1155;{const targetY=Math.max(275,Math.min(445,b.y));const keeperSpeed=145+(p.rating||65)*1.15;p.y+=Math.max(-keeperSpeed*dt,Math.min(keeperSpeed*dt,targetY-p.y));}return}let tx,ty;if(game.possession===p){tx=Math.max(72,p.x-115);ty=360+(360-p.y)*0.20}else if(p===chaser){tx=b.x;ty=b.y}else if(game.possession&&game.possession.team===1){if(p.pos==="DEL"){tx=Math.max(620,Math.min(1090,b.x+105+(p.index%2)*65));ty=Math.max(65,Math.min(655,b.y+(p.index%2?100:-100)))}else{tx=Math.max(660,Math.min(1040,b.x+75));ty=Math.max(65,Math.min(655,110+(p.index%7)*78+(b.y-360)*.15))}}else{tx=Math.max(650,Math.min(1050,b.x+70+(p.index%3)*65));ty=Math.max(65,Math.min(655,110+(p.index%7)*78+(b.y-360)*.2))}const dx=tx-p.x,dy=ty-p.y,len=Math.hypot(dx,dy)||1;const move=p===game.possession?0.84:p===chaser?1.12:0.76;const aiSpeed=p.speed*(0.78+(p.rating||65)/360)*(p.stam?Math.max(.76,p.stam/100):1);p.x+=dx/len*aiSpeed*move*dt;p.y+=dy/len*aiSpeed*move*dt});
  // Player-to-player body contact: separate overlapping players and soften the collision.
  for(let i=0;i<game.players.length;i++)for(let j=i+1;j<game.players.length;j++){
    const a=game.players[i],c=game.players[j],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||.001,minimum=a.r+c.r-2;
    if(d<minimum){const push=(minimum-d)*.52,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;c.x+=nx*push;c.y+=ny*push;
      const closing=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;if(closing>0){a.vx-=nx*closing*.18;a.vy-=ny*closing*.18;c.vx+=nx*closing*.18;c.vy+=ny*closing*.18;}
    }
  }
  if(game.possession){const owner=game.possession;
   if(owner.isKeeper){
    // El portero conserva el balón y busca una salida corta; no lo despeja al medio campo por defecto.
    b.x=owner.x+(owner.team===0?owner.r+7:-(owner.r+7));b.y=owner.y+3;b.vx=0;b.vy=0;b.z=0;b.vz=0;
    if(!game.keeperHoldUntil)game.keeperHoldUntil=ts+850;
    if(ts>=game.keeperHoldUntil){
      const teammates=game.players.filter(p=>p.team===owner.team&&!p.isKeeper);
      const target=teammates.sort((a,c)=>dist(a,owner)-dist(c,owner))[0];
      game.possession=null;game.keeperHoldUntil=0;
      if(target){const dx=target.x-owner.x,dy=target.y-owner.y,len=Math.hypot(dx,dy)||1;b.x=owner.x+(owner.team===0?owner.r:-owner.r);b.y=owner.y;b.vx=dx/len*300;b.vy=dy/len*300;game.message=owner.team===0?"El portero juega en corto hacia un compañero.":"El portero rival juega en corto."}
      else {b.vx=owner.team===0?180:-180;b.vy=0;}
    }
   }else if(owner.team===0){
    game.keeperHoldUntil=0;
    const moveLen=Math.hypot(owner.vx||0,owner.vy||0),control=Math.max(0.4,owner.control||0.65);
    if(owner===controlled&&mag>.1){const m=Math.hypot(ix,iy)||1;b.x=owner.x+ix/m*(17+moveLen*0.035);b.y=owner.y+iy/m*(14+moveLen*0.025)}
    else {b.x=owner.x+(owner.team===0?17:-17)+(owner.vx||0)*0.045;b.y=owner.y+4+(owner.vy||0)*0.035}
    b.vx=owner.vx*(1-control)*0.22;b.vy=owner.vy*(1-control)*0.22;
    const rival=game.players.filter(p=>p.team===1).sort((a,b)=>dist(a,owner)-dist(b,owner))[0];
    if(rival&&dist(rival,owner)<owner.r+rival.r+4){const stealChance=Math.max(0.025,Math.min(.22,(rival.def-owner.control*100+55)/500));if(Math.random()<stealChance){game.possession=rival;game.message="¡El rival te ha quitado el balón! Pulsa C cerca para robarlo."}}
   }else{
    game.keeperHoldUntil=0;
    b.x=owner.x-17+(owner.vx||0)*0.035;b.y=owner.y+4+(owner.vy||0)*0.03;b.vx=0;b.vy=0;
    const home=game.players.filter(p=>p.team===0).sort((a,b)=>dist(a,owner)-dist(b,owner))[0];
    if(home&&dist(home,owner)<home.r+owner.r+5){const stealChance=Math.max(.025,Math.min(.2,(home.def-owner.control*100+55)/500));if(Math.random()<stealChance){game.possession=home;game.controlledIndex=home.index;game.message="¡Has recuperado la pelota!"}}
    if(owner.x<100){game.possession=null;b.x=owner.x-10;b.y=owner.y;b.vx=-(390+(owner.atk||60)*2.4);b.vy=(360-owner.y)*0.48;game.lastShooter=owner;game.message="¡El rival chuta a puerta!"}
   }
  }else{b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.996,dt*60);b.vy*=Math.pow(.996,dt*60);if(b.spin){b.vy+=b.spin*dt;b.spin*=Math.pow(.96,dt*60)}if((b.z||0)>0||b.vz){b.z=Math.max(0,(b.z||0)+b.vz*dt);b.vz-=360*dt;if(b.z<=0){b.z=0;if(Math.abs(b.vz)>32){b.vz=-b.vz*.34;b.vx*=.92;b.vy*=.92}else b.vz=0}}if(game.keeperClearTo!==null&&((b.vx>0&&b.x>=game.keeperClearTo)||(b.vx<0&&b.x<=game.keeperClearTo))){b.x=game.keeperClearTo;b.vx=0;b.vy=0;game.keeperClearTo=null;}if(Math.hypot(b.vx,b.vy)<185){const close=game.players.filter(p=>dist(p,b)<p.r+b.r+17).sort((a,b)=>dist(a,game.ball)-dist(b,game.ball))[0];if(close){const controlChance=(close.control||.6);if(Math.random()<controlChance){game.possession=close;if(close.team===0){game.controlledIndex=close.index;game.message="¡Balón controlado!"}else game.message="El rival controla la pelota.";attachBallTo(close)}else{b.vx*=0.8;b.vy*=0.8}}}}
  if(!game.possession && Math.hypot(b.vx,b.vy)>150){
   for(const player of game.players){const dx=b.x-player.x,dy=b.y-player.y,d=Math.hypot(dx,dy)||1,limit=player.r+b.r+1;if(d<limit){const nx=dx/d,ny=dy/d;b.x=player.x+nx*limit;b.y=player.y+ny*limit;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.35*vn*nx;b.vy-=1.35*vn*ny;}if(d<limit-5&&Math.random()<.16){game.possession=player;if(player.team===0)game.controlledIndex=player.index;attachBallTo(player)}break}}
  }
  if(b.y<b.r+18){b.y=b.r+18;b.vy=Math.abs(b.vy)*.72;b.vx*=.94}if(b.y>game.fieldH-b.r-18){b.y=game.fieldH-b.r-18;b.vy=-Math.abs(b.vy)*.72;b.vx*=.94}
  if(b.x<=22&&Math.abs(b.y-game.fieldH/2)<game.goalW/2){
   const keeper=game.players.find(p=>p.team===0&&p.isKeeper);
   const keeperReach=keeper?keeper.r+b.r+3:0;
   // Solo hay parada si el portero intercepta físicamente el balón; si no lo toca, es gol.
   if(keeper&&Math.hypot(keeper.x-b.x,keeper.y-b.y)<=keeperReach){b.x=keeper.x+keeper.r+b.r+1;b.y=keeper.y;b.vx=Math.max(260,Math.abs(b.vx)*0.58);b.vy=(b.y-game.fieldH/2)*0.45+(Math.random()-.5)*95; b.vz=Math.max(0,b.vz*.25);game.message="¡Tu portero ha despejado el disparo!";}
   else resetAfterGoal(1);
  }else if(b.x>=game.fieldW-22&&Math.abs(b.y-game.fieldH/2)<game.goalW/2){
   const keeper=game.players.find(p=>p.team===1&&p.isKeeper);
   const keeperReach=keeper?keeper.r+b.r+3:0;
   if(keeper&&Math.hypot(keeper.x-b.x,keeper.y-b.y)<=keeperReach){b.x=keeper.x-keeper.r-b.r-1;b.y=keeper.y;b.vx=-Math.max(260,Math.abs(b.vx)*0.58);b.vy=(b.y-game.fieldH/2)*0.45+(Math.random()-.5)*95;b.vz=Math.max(0,b.vz*.25);game.message="¡El portero rival ha despejado el disparo!";}
   else resetAfterGoal(0);
  }else{if(b.x<30){b.x=30;b.vx=Math.abs(b.vx)*.55}if(b.x>game.fieldW-30){b.x=game.fieldW-30;b.vx=-Math.abs(b.vx)*.55}}
  game.players.forEach(p=>{p.x=Math.max(p.isKeeper?(p.team===0?25:game.fieldW-125):35,Math.min(p.isKeeper?(p.team===0?70:game.fieldW-25):game.fieldW-35,p.x));p.y=Math.max(30,Math.min(game.fieldH-30,p.y))});updateGameHUD();
 }drawFootball();syncFootball3D();if(game.running)requestAnimationFrame(tickFootball);
}
function finishFootballMatch(){
  if(game.over)return;game.over=true;game.running=false;
  const won=game.scoreHome>game.scoreAway,draw=game.scoreHome===game.scoreAway;
  state.played++;
  let reward=5, outcome="Derrota";
  if(won){state.wins++;state.coins+=50;reward=50;outcome="¡Victoria!";game.message="¡Victoria! +50 monedas."}
  else if(draw){state.coins+=30;reward=30;outcome="Empate";game.message="Empate. +30 monedas."}
  else{state.coins+=20;reward=20;outcome="Derrota";game.message="Derrota. +20 monedas."}
  const finalScore=`${game.scoreHome} - ${game.scoreAway}`;
  const resultText=`${outcome} · Resultado final: ${finalScore} · +${reward} monedas`;
  const clubMessage=document.getElementById("clubMessage");
  if(clubMessage)clubMessage.textContent=`Último partido: ${resultText}. Ya estás de vuelta en tu club.`;
  save();updateGameHUD();
  const toast=document.getElementById("gameToast");
  if(toast){toast.innerHTML=`<div>🏁 PARTIDO TERMINADO</div><div class="toast-player">${finalScore}</div><div>${outcome} · Has ganado ${reward} monedas</div>`;toast.classList.add("show");clearTimeout(window.__fmcToastTimer);clearTimeout(window.__fmcReturnHomeTimer);window.__fmcReturnHomeTimer=setTimeout(()=>{toast.classList.remove("show");go("club");window.scrollTo({top:0,behavior:"smooth"})},3500)}
}
function startFootballMatch(){
  if(game.running){game.message="El partido está en marcha. ¡Juega!";updateGameHUD();return}
  game.autoPlay=document.getElementById("matchMode")?.value==="ai";
  setupFootballGame();game.running=true;game.last=performance.now();updateGameHUD();requestAnimationFrame(tickFootball);
}

function simulateAIMatch(){
 const mode=document.getElementById("matchMode");if(!mode||mode.value!=="ai"){document.getElementById("matchModeHelp").textContent="Solo puedes simular si has elegido Máquina contra máquina.";return}
 if(game.running){
   const remaining=Math.max(0,game.duration-game.elapsed);
   const my=rating(),rival=rand(68,88);
   const expectedHome=Math.max(0,Math.round(remaining/45*(0.35+(my-rival)/24+Math.random()*1.2)));
   const expectedAway=Math.max(0,Math.round(remaining/45*(0.45+(rival-my)/24+Math.random()*1.2)));
   game.scoreHome+=expectedHome;game.scoreAway+=expectedAway;game.elapsed=game.duration;game.running=false;game.keeperClearTo=null;
   finishFootballMatch();
   const status=document.getElementById("matchModeHelp");if(status)status.textContent=`Simulación completada hasta el final: ${game.scoreHome} - ${game.scoreAway}.`;
   return;
 }
 if(aligned().length<3){document.getElementById("matchModeHelp").textContent="Alinea al menos 3 jugadores antes de jugar.";return}
 const my=rating(),rival=rand(68,88);const myGoals=Math.max(0,Math.round((my-rival)/12+Math.random()*2));const theirGoals=Math.max(0,Math.round((rival-my)/12+Math.random()*2));
 state.played++;let reward,outcome;if(myGoals>theirGoals){state.wins++;state.coins+=50;reward=50;outcome="¡Victoria!"}else if(myGoals===theirGoals){state.coins+=30;reward=30;outcome="Empate"}else{state.coins+=20;reward=20;outcome="Derrota"}
 document.getElementById("liveScore").textContent=`${myGoals} - ${theirGoals}`;document.getElementById("liveTime").textContent="00:00";document.getElementById("liveMessage").textContent=`${outcome} · Partido simulado` ;game.message=`${outcome} · Resultado: ${myGoals} - ${theirGoals}`;game.over=true;game.running=false;
 const status=document.getElementById("matchModeHelp");if(status)status.textContent=`Resultado simulado: ${myGoals} - ${theirGoals}. ${outcome} Has ganado ${reward} monedas.`;const club=document.getElementById("clubMessage");if(club)club.textContent=`Último partido simulado: ${myGoals} - ${theirGoals}. ${outcome} +${reward} monedas.`;save();updateGameHUD();
}
function updateMatchMode(){const ai=document.getElementById("matchMode")?.value==="ai";const sim=document.getElementById("simulateGameBtn");if(sim)sim.style.display=ai?"inline-block":"none";const help=document.getElementById("matchModeHelp");if(help)help.textContent=ai?(game.running?"Partido en marcha: puedes pulsar Simular resultado para saltar directamente al final.":"Puedes ver a las máquinas jugar o pulsar Simular resultado, incluso durante el partido, para ir al final."):"Controlas a tu equipo. La opción de simular no está disponible cuando juegas tú.";const controls=document.querySelector(".game-controls");if(controls)controls.style.display=ai?"none":""}

let fmc3d={renderer:null,scene:null,camera:null,root:null,players:[],ball:null,shadow:null,ready:false,raf:0};
function initFootball3D(){
 const wrap=document.getElementById('football3DWrap'),canvas=document.getElementById('football3DCanvas');if(!wrap||!canvas)return;
 if(!window.THREE){document.getElementById('threeFallback').style.display='grid';return}
 try{
  const T=window.THREE;fmc3d.scene=new T.Scene();fmc3d.scene.background=new T.Color(0x9bc9dc);fmc3d.scene.fog=new T.Fog(0x9bc9dc,22,42);
  fmc3d.camera=new T.PerspectiveCamera(52,2,0.1,100);fmc3d.camera.position.set(0,7.2,5.4);fmc3d.camera.lookAt(0,0,0);
  fmc3d.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});fmc3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));fmc3d.renderer.shadowMap.enabled=true;fmc3d.renderer.shadowMap.type=T.PCFSoftShadowMap;fmc3d.renderer.outputColorSpace=T.SRGBColorSpace;
  fmc3d.scene.add(new T.HemisphereLight(0xe9f7ff,0x315a35,2.35));const sun=new T.DirectionalLight(0xffffff,2.4);sun.position.set(-5,12,7);sun.castShadow=true;fmc3d.scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0x315b36,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.13;ground.receiveShadow=true;fmc3d.scene.add(ground);
  fmc3d.root=new T.Group();fmc3d.scene.add(fmc3d.root);
  const field=new T.Mesh(new T.PlaneGeometry(12,7.2),new T.MeshStandardMaterial({color:0x236d38,roughness:.96}));field.rotation.x=-Math.PI/2;field.receiveShadow=true;fmc3d.root.add(field);
  const stripeMats=[new T.MeshStandardMaterial({color:0x2d8747,roughness:1}),new T.MeshStandardMaterial({color:0x276f3d,roughness:1})];for(let i=0;i<10;i++){const stripe=new T.Mesh(new T.PlaneGeometry(1.2,7.2),stripeMats[i%2]);stripe.rotation.x=-Math.PI/2;stripe.position.set(-5.4+i*1.2,.006,0);fmc3d.root.add(stripe)}
  const lineMat=new T.MeshStandardMaterial({color:0xf0f5e9,roughness:.8});function line(x,z,w,d){const m=new T.Mesh(new T.BoxGeometry(w,.018,d),lineMat);m.position.set(x,.018,z);fmc3d.root.add(m)}
  line(0, -3.53,11.95,.035);line(0,3.53,11.95,.035);line(-5.98,0,.035,7.08);line(5.98,0,.035,7.08);line(0,0,.025,7.08);
  function ring(radius,tube,x,z){const m=new T.Mesh(new T.TorusGeometry(radius,tube,8,64),lineMat);m.rotation.x=Math.PI/2;m.position.set(x,.025,z);fmc3d.root.add(m)}ring(0.95,.018,0,0);
  for(const side of [-1,1]){const x=side*4.95;line(x,0,2.05,3.15);line(side*5.55,0,.85,1.45);const gm=new T.MeshStandardMaterial({color:0xf8fff9,roughness:.45});for(const z of [-.92,.92]){const post=new T.Mesh(new T.CylinderGeometry(.035,.035,.78,8),gm);post.position.set(side*6.02,.39,z);post.castShadow=true;fmc3d.root.add(post)}const cross=new T.Mesh(new T.CylinderGeometry(.035,.035,1.9,8),gm);cross.rotation.x=Math.PI/2;cross.position.set(side*6.02,.77,0);fmc3d.root.add(cross);const netMat=new T.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.27});const net=new T.Mesh(new T.BoxGeometry(.5,.7,1.82),netMat);net.position.set(side*6.26,.37,0);fmc3d.root.add(net);}
  const spotGeo=new T.SphereGeometry(.035,8,6);const spot=new T.Mesh(spotGeo,lineMat);spot.position.set(0,.03,0);fmc3d.root.add(spot);
  const ballGeo=new T.SphereGeometry(.105,20,14);fmc3d.ball=new T.Mesh(ballGeo,new T.MeshStandardMaterial({color:0xffffff,roughness:.45,metalness:.05}));fmc3d.ball.castShadow=true;fmc3d.root.add(fmc3d.ball);
  fmc3d.shadow=new T.Mesh(new T.CircleGeometry(.13,18),new T.MeshBasicMaterial({color:0x06130a,transparent:true,opacity:.34}));fmc3d.shadow.rotation.x=-Math.PI/2;fmc3d.shadow.position.y=.025;fmc3d.root.add(fmc3d.shadow);
  fmc3d.ready=true;resizeFootball3D();syncFootball3D();renderFootball3D();window.addEventListener('resize',resizeFootball3D);
 }catch(e){document.getElementById('threeFallback').style.display='grid';console.warn('3D init error',e)}
}
function make3DPlayer(p){
 const T=window.THREE,g=new T.Group();
 const shirtColor=p.isKeeper?(p.team===0?0xffc928:0x49c8ff):(p.team===0?0x1765e8:0xd83232);
 const shirtMat=new T.MeshStandardMaterial({color:shirtColor,roughness:.68});
 const shortsMat=new T.MeshStandardMaterial({color:p.team===0?0xf4f6f8:0x202329,roughness:.82});
 const skinMat=new T.MeshStandardMaterial({color:0xc9916b,roughness:.9});
 const sockMat=new T.MeshStandardMaterial({color:p.team===0?0xf5f5f5:0xe7e7e7,roughness:.9});
 const shoeMat=new T.MeshStandardMaterial({color:0x101419,roughness:.65});
 const torso=new T.Mesh(new T.CapsuleGeometry(.135,.25,4,8),shirtMat);torso.position.y=.43;torso.castShadow=true;g.add(torso);
 const shorts=new T.Mesh(new T.BoxGeometry(.23,.13,.19),shortsMat);shorts.position.set(0,.235,0);shorts.castShadow=true;g.add(shorts);
 const head=new T.Mesh(new T.SphereGeometry(.087,12,10),skinMat);head.position.y=.69;head.castShadow=true;g.add(head);
 const hair=new T.Mesh(new T.SphereGeometry(.09,10,8,0,Math.PI*2,0,Math.PI*.48),new T.MeshStandardMaterial({color:p.index%3===0?0x30251e:0x17191d,roughness:1}));hair.position.y=.72;hair.castShadow=true;g.add(hair);
 const limbMat=new T.MeshStandardMaterial({color:shirtColor,roughness:.75});
 const arms=[];for(const side of [-1,1]){const arm=new T.Group();arm.position.set(side*.15,.51,0);const upper=new T.Mesh(new T.CylinderGeometry(.035,.045,.2,7),limbMat);upper.position.y=-.09;upper.rotation.z=side*.16;upper.castShadow=true;arm.add(upper);const hand=new T.Mesh(new T.SphereGeometry(.033,7,6),skinMat);hand.position.y=-.2;arm.add(hand);g.add(arm);arms.push(arm)}
 const legs=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.065,.2,0);const thigh=new T.Mesh(new T.CylinderGeometry(.045,.04,.16,7),shortsMat);thigh.position.y=-.055;thigh.castShadow=true;leg.add(thigh);const sock=new T.Mesh(new T.CylinderGeometry(.028,.035,.13,7),sockMat);sock.position.y=-.17;sock.castShadow=true;leg.add(sock);const shoe=new T.Mesh(new T.BoxGeometry(.065,.045,.11),shoeMat);shoe.position.set(0,-.24,-.025);shoe.castShadow=true;leg.add(shoe);g.add(leg);legs.push(leg)}
 const marker=new T.Mesh(new T.TorusGeometry(.22,.022,6,24),new T.MeshBasicMaterial({color:0xffd166}));marker.rotation.x=Math.PI/2;marker.position.y=.035;marker.visible=false;g.add(marker);
 // A small name plate makes it easier to track players during a fast match.
 const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;const lctx=labelCanvas.getContext('2d');lctx.fillStyle='rgba(5,18,12,.72)';lctx.beginPath();lctx.roundRect(4,7,248,50,18);lctx.fill();lctx.fillStyle='#ffffff';lctx.font='bold 27px system-ui';lctx.textAlign='center';lctx.textBaseline='middle';const labelText=String(p.nickname||p.name||(p.team===0?'J':'R')).slice(0,14);lctx.fillText(labelText,128,33);
 const labelTex=new T.CanvasTexture(labelCanvas);labelTex.colorSpace=T.SRGBColorSpace;const label=new T.Sprite(new T.SpriteMaterial({map:labelTex,transparent:true,depthWrite:false}));label.scale.set(.82,.205,1);label.position.y=.99;g.add(label);
 g.userData.marker=marker;g.userData.team=p.team;g.userData.index=p.index;g.userData.legs=legs;g.userData.arms=arms;g.userData.label=label;g.userData.phase=p.index*.9;fmc3d.root.add(g);return g
}
function syncFootball3D(){if(!fmc3d.ready||!window.THREE)return;while(fmc3d.players.length<game.players.length){const p=game.players[fmc3d.players.length];fmc3d.players.push(make3DPlayer(p))}while(fmc3d.players.length>game.players.length){const m=fmc3d.players.pop();fmc3d.root.remove(m)}const now=performance.now()/220;game.players.forEach((p,i)=>{const m=fmc3d.players[i];m.position.set((p.x-game.fieldW/2)/100,0,(p.y-game.fieldH/2)/100);m.userData.marker.visible=p.team===0&&p.index===game.controlledIndex;m.rotation.y=p.team===0?Math.PI/2:-Math.PI/2;const speed=Math.min(1,Math.hypot(p.vx||0,p.vy||0)/100);const swing=Math.sin(now+m.userData.phase)*.58*speed;m.userData.legs.forEach((leg,j)=>{leg.rotation.x=swing*(j===0?1:-1)});m.userData.arms.forEach((arm,j)=>{arm.rotation.x=-swing*(j===0?1:-1)*.55});m.position.y=Math.abs(Math.sin(now*2+m.userData.phase))*.025*speed});const b=game.ball;fmc3d.ball.position.set((b.x-game.fieldW/2)/100,.11+(b.z||0)/100,(b.y-game.fieldH/2)/100);fmc3d.ball.rotation.x+=.08;fmc3d.ball.rotation.z+=.05;fmc3d.shadow.position.set((b.x-game.fieldW/2)/100,.025,(b.y-game.fieldH/2)/100);fmc3d.shadow.scale.setScalar(1+Math.min(1,(b.z||0)/90));}
function resizeFootball3D(){if(!fmc3d.ready)return;const wrap=document.getElementById('football3DWrap');const w=Math.max(320,wrap.clientWidth),h=Math.max(180,wrap.clientHeight);fmc3d.renderer.setSize(w,h,false);fmc3d.camera.aspect=w/h;fmc3d.camera.updateProjectionMatrix()}
function renderFootball3D(){if(!fmc3d.ready)return;syncFootball3D();
 // Cámara tipo retransmisión cercana: sigue al poseedor real, anticipa la dirección del ataque y encuadra el balón.
 if(game.players.length&&fmc3d.camera){
  const b=game.ball;
  let focus=game.possession || currentPlayer() || game.players[8];
  if(!game.possession){const nearest=nearestPlayerToBall(0);if(nearest&&dist(nearest,b)<115)focus=nearest;}
  const px=(focus.x-game.fieldW/2)/100,pz=(focus.y-game.fieldH/2)/100;
  const bx=(b.x-game.fieldW/2)/100,bz=(b.y-game.fieldH/2)/100;
  const attackDir=focus.team===0?1:-1;
  const leadX=Math.max(-1.1,Math.min(1.1,(b.vx||0)/420));
  const targetX=px*.48+bx*.52+attackDir*.30+leadX*.32;
  const targetZ=pz*.43+bz*.57;
  // Distancia corta para que futbolistas y balón se vean grandes; se pierde parte del campo, como en un juego 3D.
  const desiredX=targetX-attackDir*1.0;
  const desiredY=6.6+Math.min(1.0,Math.abs(b.vy||0)/800);
  const desiredZ=targetZ+4.65;
  fmc3d.camera.position.x+=(desiredX-fmc3d.camera.position.x)*.075;
  fmc3d.camera.position.y+=(desiredY-fmc3d.camera.position.y)*.055;
  fmc3d.camera.position.z+=(desiredZ-fmc3d.camera.position.z)*.075;
  fmc3d.camera.lookAt(targetX,0.25,targetZ-.45);
 }
 fmc3d.renderer.render(fmc3d.scene,fmc3d.camera);if(game.view3D)fmc3d.raf=requestAnimationFrame(renderFootball3D)}
function setFootballView(mode){game.view3D=mode==='3d';document.getElementById('football2DWrap').style.display=game.view3D?'none':'block';document.getElementById('football3DWrap').style.display=game.view3D?'block':'none';document.getElementById('view2DBtn').classList.toggle('active',!game.view3D);document.getElementById('view3DBtn').classList.toggle('active',game.view3D);if(game.view3D){if(!fmc3d.ready)initFootball3D();if(fmc3d.ready){resizeFootball3D();cancelAnimationFrame(fmc3d.raf);renderFootball3D()}}else cancelAnimationFrame(fmc3d.raf)}

function initFootballGame(){
  game.canvas=document.getElementById("footballCanvas");if(!game.canvas)return;game.ctx=game.canvas.getContext("2d");
  document.getElementById("view2DBtn")?.addEventListener("click",()=>setFootballView("2d"));document.getElementById("view3DBtn")?.addEventListener("click",()=>setFootballView("3d"));
  document.getElementById("startGameBtn").addEventListener("click",startFootballMatch);
  document.getElementById("matchMode").addEventListener("change",()=>{game.running=false;game.over=false;updateMatchMode();setupFootballGame();updateGameHUD()});
  updateMatchMode();
  document.getElementById("resetGameBtn").addEventListener("click",()=>{game.running=false;setupFootballGame();game.message="Partido reiniciado. Pulsa empezar cuando quieras.";updateGameHUD()});
  const shootBtn=document.getElementById("shootBtn"),passBtn=document.getElementById("passBtn"),cBtn=document.getElementById("stealBtn");
  shootBtn.addEventListener("pointerdown",e=>{e.preventDefault();if(!game.running||game.over)return;if(game.possession&&game.possession.team===0){game.chargeStarted=performance.now();shootBtn.setPointerCapture?.(e.pointerId);shootBtn.classList.add("charging");game.message="Mantén A para cargar el disparo y suelta para chutar.";updateGameHUD()}else actionSteal()});
  const releaseShot=()=>{if(!game.chargeStarted)return;const held=Math.min(1,(performance.now()-game.chargeStarted)/850);game.chargeStarted=0;shootBtn.classList.remove("charging");actionShoot(Math.max(.18,held))};
  ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>shootBtn.addEventListener(ev,releaseShot));
  passBtn.addEventListener("pointerdown",e=>{e.preventDefault();if(!game.running||game.over)return;if(game.possession&&game.possession.team===0)actionPass();else{game.pressure=true;game.message="Presionando al rival…";updateGameHUD()}});
  ["pointerup","pointercancel","pointerleave","lostpointercapture"].forEach(ev=>passBtn.addEventListener(ev,()=>{game.pressure=false}));
  cBtn.addEventListener("pointerdown",e=>{e.preventDefault();if(!game.running||game.over)return;if(game.possession&&game.possession.team===0)actionPass(true);else actionSwitch()});
  document.getElementById("dribbleBtn")?.addEventListener("pointerdown",e=>{e.preventDefault();actionDribble()});
  document.getElementById("switchBtn").addEventListener("pointerdown",e=>{e.preventDefault();actionSwitch()});
  const sprint=document.getElementById("sprintBtn");
  sprint.addEventListener("pointerdown",e=>{e.preventDefault();game.sprint=true});
  ["pointerup","pointercancel","pointerleave"].forEach(ev=>sprint.addEventListener(ev,()=>game.sprint=false));
  window.addEventListener("keydown",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();game.keys[k===" "?"Space":k]=true;if(e.key===" "||e.key==="Spacebar"){if(!game.chargeStarted)game.chargeStarted=performance.now()}if(k==="x"||k==="X")actionPass();if(k==="c"||k==="C")actionSteal();if(k==="v"||k==="V")actionDribble();if(k==="q"||k==="Q")actionSwitch();if(e.key==="Shift")game.sprint=true});
  window.addEventListener("keyup",e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;game.keys[k===" "?"Space":k]=false;if(e.key===" "||e.key==="Spacebar"){const held=game.chargeStarted?Math.min(1,(performance.now()-game.chargeStarted)/850):.35;game.chargeStarted=0;actionShoot(Math.max(.18,held))}if(e.key==="Shift")game.sprint=false});
  const base=document.getElementById("joystickBase"),knob=document.getElementById("joystickKnob");
  function joyMove(e){const rect=base.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=rect.width*.32,len=Math.hypot(dx,dy);if(len>max){dx=dx/len*max;dy=dy/len*max}game.joy.x=dx/max;game.joy.y=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
  base.addEventListener("pointerdown",e=>{e.preventDefault();game.joy.active=true;base.setPointerCapture(e.pointerId);joyMove(e)});
  base.addEventListener("pointermove",e=>{if(game.joy.active)joyMove(e)});
  function joyEnd(){game.joy.active=false;game.joy.x=0;game.joy.y=0;knob.style.transform="translate(0,0)"}
  ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>base.addEventListener(ev,joyEnd));
  setupFootballGame();
}

initFootballGame();
{
 const old=(state.lineup||[]).map(id=>id?getPlayer(id):null).filter(Boolean),used=new Set();
 state.lineup=Array(11).fill(null);
 for(let i=0;i<11;i++){const p=old.find(x=>!used.has(x.id)&&canPlaySlot(x,i));if(p){state.lineup[i]=p.id;used.add(p.id)}}
}
if(!state.market||!state.market.length)refreshMarket();setupRouletteWheel("colorWheel","colorWheelNumbers");setupRouletteWheel("numberWheel","numberWheelNumbers");window.addEventListener("resize",()=>{refreshWheelLabels("colorWheel","colorWheelNumbers");refreshWheelLabels("numberWheel","numberWheelNumbers")});
// API pequeña compartida con módulos externos (por ejemplo FUT Draft).
window.FMC = {
  getDraftOptions(slot, usedIds = []) {
    // FUT Draft pasa códigos de puesto (POR, MC, MCD...), no índices de la alineación.
    // Se filtra por posición natural y nunca se usa una posición alternativa incorrecta.
    const role = String(slot || "").trim().toUpperCase();
    const blocked = new Set(usedIds.map(Number));
    const compatible = {
      POR: ["POR", "GK"],
      LB: ["LB", "LWB"],
      CB: ["CB", "LCB", "RCB", "SW"],
      RB: ["RB", "RWB"],
      MC: ["MC", "CM", "LCM", "RCM"],
      MCD: ["MCD", "CDM", "LDM", "RDM"],
      MCO: ["MCO", "CAM", "LAM", "RAM"],
      MI: ["MI", "LM"],
      MD: ["MD", "RM"],
      EI: ["EI", "LW", "LF"],
      ED: ["ED", "RW", "RF"],
      DC: ["DC", "ST", "CF"]
    };
    const allowed = new Set(compatible[role] || [role]);
    const candidates = state.players.filter(p =>
      !blocked.has(Number(p.id)) &&
      allowed.has(String(p.primaryPosition || p.pos || "").trim().toUpperCase())
    );
    return pickRandom(candidates, Math.min(3, candidates.length)).map(p => ({ ...p }));
  },
  getDraftPositions() { return FORMATIONS["4-3-3"].slots.slice(); },
  getDraftAllPlayers() { return state.players.map(p => ({...p})); },
  getPlayerById(id) { const p = state.players.find(x => Number(x.id) === Number(id)); return p ? {...p} : null; },
  getPositionLabel(position) { return displaySlotPosition(position); },
  getPlayerPosition(player) { return naturalPos(player); },
  getRating(player) { return Number(player.rating) || 0; }
};
render();