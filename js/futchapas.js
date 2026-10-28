(() => {
    // FutChapas: motor de Soccer Stars integrado en Football Manager Cards.
// --- WEB AUDIO API SYNTHESIZER ---
        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.muted = false;
                this.lastBounceAt = 0;
                this.lastPostAt = 0;
            }

            init() {
                if (!this.ctx) {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    if (!AudioContextClass) return false;
                    this.ctx = new AudioContextClass();
                }
                if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
                return !!this.ctx;
            }

            playKick(forceRatio = 0.5) {
                if (this.muted) return;
                if (!this.init() || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100 + forceRatio * 180, now);
                osc.frequency.exponentialRampToValueAtTime(25, now + 0.14);

                gain.gain.setValueAtTime(0.7 * forceRatio, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.14);
            }

            playBounce(impactVelocity = 1) {
                if (this.muted) return;
                const tick = performance.now();
                if (tick - this.lastBounceAt < 65) return;
                this.lastBounceAt = tick;
                if (!this.init() || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                const vol = Math.min(1, Math.max(0.08, impactVelocity / 12));
                osc.type = 'sine';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

                gain.gain.setValueAtTime(0.4 * vol, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.08);
            }

            playPost() {
                if (this.muted) return;
                const tick = performance.now();
                if (tick - this.lastPostAt < 140) return;
                this.lastPostAt = tick;
                if (!this.init() || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(850, now);
                osc.frequency.exponentialRampToValueAtTime(380, now + 0.28);

                gain.gain.setValueAtTime(0.6, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.28);
            }

            playWhistle() {
                if (this.muted) return;
                if (!this.init() || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(2200, now);
                osc.frequency.linearRampToValueAtTime(2600, now + 0.1);
                osc.frequency.linearRampToValueAtTime(2300, now + 0.25);

                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.25);
            }

            playGoal() {
                if (this.muted) return;
                this.init();
                this.playWhistle();

                const now = this.ctx.currentTime;
                [392, 523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + 0.1 + idx * 0.08);

                    gain.gain.setValueAtTime(0.35, now + 0.1 + idx * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + idx * 0.08 + 0.6);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(now + 0.1 + idx * 0.08);
                    osc.stop(now + 0.1 + idx * 0.08 + 0.6);
                });
            }
        }

        const sound = new SoundEngine();

        // --- FORMATIONS & CONSTANTS ---
        const FORMATIONS = {
            '4-4-2': [
                { x: 0.05, y: 0.50, gk: true },
                { x: 0.14, y: 0.18 }, { x: 0.14, y: 0.38 }, { x: 0.14, y: 0.62 }, { x: 0.14, y: 0.82 },
                { x: 0.28, y: 0.18 }, { x: 0.28, y: 0.38 }, { x: 0.28, y: 0.62 }, { x: 0.28, y: 0.82 },
                { x: 0.42, y: 0.35 }, { x: 0.42, y: 0.65 }
            ],
            '4-3-3': [
                { x: 0.05, y: 0.50, gk: true },
                { x: 0.14, y: 0.18 }, { x: 0.14, y: 0.38 }, { x: 0.14, y: 0.62 }, { x: 0.14, y: 0.82 },
                { x: 0.27, y: 0.28 }, { x: 0.27, y: 0.50 }, { x: 0.27, y: 0.72 },
                { x: 0.42, y: 0.20 }, { x: 0.43, y: 0.50 }, { x: 0.42, y: 0.80 }
            ],
            '3-5-2': [
                { x: 0.05, y: 0.50, gk: true },
                { x: 0.14, y: 0.25 }, { x: 0.14, y: 0.50 }, { x: 0.14, y: 0.75 },
                { x: 0.28, y: 0.15 }, { x: 0.28, y: 0.32 }, { x: 0.28, y: 0.50 }, { x: 0.28, y: 0.68 }, { x: 0.28, y: 0.85 },
                { x: 0.42, y: 0.35 }, { x: 0.42, y: 0.65 }
            ],
            '5-3-2': [
                { x: 0.05, y: 0.50, gk: true },
                { x: 0.13, y: 0.14 }, { x: 0.13, y: 0.32 }, { x: 0.13, y: 0.50 }, { x: 0.13, y: 0.68 }, { x: 0.13, y: 0.86 },
                { x: 0.28, y: 0.28 }, { x: 0.28, y: 0.50 }, { x: 0.28, y: 0.72 },
                { x: 0.42, y: 0.38 }, { x: 0.42, y: 0.62 }
            ]
        };

        const FIELD_WIDTH = 1200;
        const FIELD_HEIGHT = 700;
        const CAP_RADIUS = 21;
        const GK_RADIUS = 24;
        const BALL_RADIUS = 13;
        const GOAL_HEIGHT = 200;
        const FRICTION = 0.983;
        const BALL_FRICTION = 0.986;
        const RESTITUTION = 0.84;
        const MAX_PULL_DIST = 115;
        const SHOT_POWER_FACTOR = 0.22;
        const MIN_VELOCITY = 0.08;

        const canvas = document.getElementById('futchapas-pitch');
        const ctx = canvas.getContext('2d');
        canvas.width = FIELD_WIDTH;
        canvas.height = FIELD_HEIGHT;

        let gameMode = 'pve';
        let aiDifficulty = 'hard';
        let matchStarted = false;
        let currentFormation = '4-3-3';
        let currentFormationConfig = FORMATIONS['4-3-3'];
        const MATCH_DURATION_MS = 2 * 60 * 1000;
        let matchEndsAt = Date.now() + MATCH_DURATION_MS;

        let score = { blue: 0, red: 0 };
        let currentTurn = 'blue';
        let gameState = 'AIMING';

        let caps = [];
        let ball = null;
        let blueRoster = [];
        let redRoster = [];

        function makeFormationConfig(rows) {
            if (!Array.isArray(rows) || !rows.length) return FORMATIONS['4-3-3'];
            const validRows = rows.map(row => Array.isArray(row) ? row.filter(i => Number.isInteger(i) && i >= 0 && i < 11) : []).filter(row => row.length);
            if (!validRows.length) return FORMATIONS['4-3-3'];
            const config = Array(11).fill(null);
            validRows.forEach((row, rowIndex) => {
                const x = validRows.length === 1 ? 0.42 : 0.05 + (rowIndex / (validRows.length - 1)) * 0.37;
                row.forEach((slot, playerIndex) => {
                    const y = row.length === 1 ? 0.5 : 0.12 + (playerIndex / (row.length - 1)) * 0.76;
                    config[slot] = { x, y, gk: slot === 0 };
                });
            });
            return config.map((item, index) => item || { x: index === 0 ? 0.05 : 0.28, y: 0.12 + (index / 10) * 0.76, gk: index === 0 });
        }

        function buildFutChapasRosters() {
            const data = window.FMC && typeof window.FMC.getFutChapasData === 'function'
                ? window.FMC.getFutChapasData() : { lineup: [], allPlayers: [], formation: '4-3-3' };
            const pool = Array.isArray(data.allPlayers) ? data.allPlayers.filter(p => p && p.name) : [];
            const genericName = value => /^(portero|defensa|defensor|medio|mediocentro|centrocampista|delantero|jugador|rival|sin jugador)(?:\s*\d+)?$/i.test(String(value || '').trim());
            // core entrega el once ya resuelto como objetos compactos: no hace falta
            // construir mapas ni copiar todo el catálogo de futbolistas aquí.
            const lineup = Array.isArray(data.lineup) ? data.lineup : [];
            const own = Array.from({ length: 11 }, (_, i) => {
                const slot = lineup[i];
                if (!slot) return null;
                if (typeof slot === 'object') return slot;
                return pool.find(p => String(p.id) === String(slot)) || null;
            });
            currentFormation = data.formation || '4-3-3';
            currentFormationConfig = makeFormationConfig(data.formationRows) || FORMATIONS[currentFormation] || FORMATIONS['4-3-3'];
            const formationLabel = document.getElementById('futchapas-club-formation');
            if (formationLabel) formationLabel.textContent = `Formación de Mi club: ${currentFormation}`;
            blueRoster = own.map(player => player && !genericName(player.name) ? String(player.name) : 'Sin jugador');

            const excluded = new Set(own.filter(p => p && !genericName(p.name)).map(p => String(p.name).trim().toLocaleLowerCase('es')));
            // La muestra ya es pequeña y aleatoria. Solo seleccionamos once rivales;
            // nunca barajamos la base de datos completa.
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            const chosen = [];
            const chosenNames = new Set(excluded);
            for (const player of pool) {
                const key = String(player.name).trim().toLocaleLowerCase('es');
                if (!key || chosenNames.has(key) || genericName(player.name)) continue;
                chosenNames.add(key);
                chosen.push(String(player.name));
                if (chosen.length === 11) break;
            }
            redRoster = Array.from({ length: 11 }, (_, i) => chosen[i] || `Rival ${i + 1}`);
            const countEl = document.getElementById('futchapasOwnedCount');
            if (countEl) countEl.textContent = own.filter(p => p && !genericName(p.name)).length;
            return own.filter(p => p && !genericName(p.name)).length;
        }

        let selectedCap = null;
        let dragStart = null;
        let dragCurrent = null;
        let isPointerDown = false;

        const goalTop = (FIELD_HEIGHT - GOAL_HEIGHT) / 2;
        const goalBottom = (FIELD_HEIGHT + GOAL_HEIGHT) / 2;
        const posts = [
            { x: 45, y: goalTop, r: 7 },
            { x: 45, y: goalBottom, r: 7 },
            { x: FIELD_WIDTH - 45, y: goalTop, r: 7 },
            { x: FIELD_WIDTH - 45, y: goalBottom, r: 7 }
        ];

        class Disc {
            constructor(x, y, radius, team, number = null, isGK = false, name = '') {
                this.x = x;
                this.y = y;
                this.vx = 0;
                this.vy = 0;
                this.radius = radius;
                this.team = team;
                this.number = number;
                this.isGK = isGK;
                this.name = name || (team === 'ball' ? 'Balón' : `Jugador ${number || ''}`);
                this.mass = team === 'ball' ? 0.6 : (isGK ? 2.2 : 1.4);
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                const f = this.team === 'ball' ? BALL_FRICTION : FRICTION;
                this.vx *= f;
                this.vy *= f;

                if (Math.hypot(this.vx, this.vy) < MIN_VELOCITY) {
                    this.vx = 0;
                    this.vy = 0;
                }
            }

            isMoving() {
                return Math.hypot(this.vx, this.vy) > 0;
            }
        }

        function initGame() {
            score = { blue: 0, red: 0 };
            matchStarted = true;
            document.getElementById('futchapas-start-screen').classList.remove('is-visible');
            matchEndsAt = Date.now() + MATCH_DURATION_MS;
            
            // Sorteo aleatorio para el saque inicial del partido
            currentTurn = Math.random() < 0.5 ? 'blue' : 'red';
            
            gameState = 'AIMING';
            updateScoreUI();
            resetPositions(null, currentTurn);
            hideWinnerModal();
            sound.playWhistle();

            // Si le toca sacar a la IA al inicio
            if (currentTurn === 'red' && gameMode === 'pve') {
                setTimeout(executeAITurn, 800);
            }
        }

        function resetPositions(scoringTeam = null, assignedTurn = null) {
            caps = [];
            ball = new Disc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, BALL_RADIUS, 'ball');

            const formConfig = currentFormationConfig || FORMATIONS[currentFormation] || FORMATIONS['4-3-3'];

            // Posesión / Turno para el saque de centro
            if (scoringTeam) {
                // El equipo que ENCAJÓ el gol saca de centro
                currentTurn = scoringTeam === 'blue' ? 'red' : 'blue';
            } else if (assignedTurn) {
                currentTurn = assignedTurn;
            }

            // Blue Team (Izquierda)
            formConfig.forEach((pos, idx) => {
                let x = 45 + pos.x * (FIELD_WIDTH - 90);
                let y = pos.y * FIELD_HEIGHT;

                // Si AZUL saca de centro, posicionar un delantero justo en el balón
                if (currentTurn === 'blue' && idx === 10) {
                    x = FIELD_WIDTH / 2 - CAP_RADIUS - 6;
                    y = FIELD_HEIGHT / 2;
                }

                const isGK = pos.gk || false;
                const rad = isGK ? GK_RADIUS : CAP_RADIUS;
                caps.push(new Disc(x, y, rad, 'blue', idx + 1, isGK, blueRoster[idx] || `Jugador ${idx+1}`));
            });

            // Red Team (Derecha)
            formConfig.forEach((pos, idx) => {
                let x = FIELD_WIDTH - (45 + pos.x * (FIELD_WIDTH - 90));
                let y = pos.y * FIELD_HEIGHT;

                // Si ROJO saca de centro, posicionar un delantero justo en el balón
                if (currentTurn === 'red' && idx === 10) {
                    x = FIELD_WIDTH / 2 + CAP_RADIUS + 6;
                    y = FIELD_HEIGHT / 2;
                }

                const isGK = pos.gk || false;
                const rad = isGK ? GK_RADIUS : CAP_RADIUS;
                caps.push(new Disc(x, y, rad, 'red', idx + 1, isGK, redRoster[idx] || `Rival ${idx+1}`));
            });

            updateTurnUI();
            gameState = 'AIMING';
        }

        function updateGoalkeepers() {
            if (gameState !== 'AIMING' && gameState !== 'MOVING') return;

            const areaTop = goalTop - 30;
            const areaBottom = goalBottom + 30;

            const blueGK = caps.find(c => c.team === 'blue' && c.isGK);
            if (blueGK && !blueGK.isMoving()) {
                const targetY = Math.max(areaTop, Math.min(areaBottom, ball.y));
                const targetX = 45 + 35;
                blueGK.y += (targetY - blueGK.y) * 0.08;
                blueGK.x += (targetX - blueGK.x) * 0.08;
            }

            const redGK = caps.find(c => c.team === 'red' && c.isGK);
            if (redGK && !redGK.isMoving()) {
                const targetY = Math.max(areaTop, Math.min(areaBottom, ball.y));
                const targetX = FIELD_WIDTH - 45 - 35;
                redGK.y += (targetY - redGK.y) * 0.08;
                redGK.x += (targetX - redGK.x) * 0.08;
            }
        }

        function handlePhysics() {
            const allDiscs = [...caps, ball];

            updateGoalkeepers();

            allDiscs.forEach(d => d.update());

            for (let i = 0; i < allDiscs.length; i++) {
                for (let j = i + 1; j < allDiscs.length; j++) {
                    const d1 = allDiscs[i];
                    const d2 = allDiscs[j];

                    const dx = d2.x - d1.x;
                    const dy = d2.y - d1.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = d1.radius + d2.radius;

                    if (dist < minDist) {
                        const overlap = minDist - dist;
                        const nx = dx / (dist || 1);
                        const ny = dy / (dist || 1);

                        const mSum = d1.mass + d2.mass;
                        d1.x -= nx * overlap * (d2.mass / mSum);
                        d1.y -= ny * overlap * (d2.mass / mSum);
                        d2.x += nx * overlap * (d1.mass / mSum);
                        d2.y += ny * overlap * (d1.mass / mSum);

                        const kx = d1.vx - d2.vx;
                        const ky = d1.vy - d2.vy;
                        const p = 2 * (nx * kx + ny * ky) / mSum;

                        if (p > 0) {
                            d1.vx -= p * d2.mass * nx * RESTITUTION;
                            d1.vy -= p * d2.mass * ny * RESTITUTION;
                            d2.vx += p * d1.mass * nx * RESTITUTION;
                            d2.vy += p * d1.mass * ny * RESTITUTION;

                            sound.playBounce(Math.hypot(kx, ky));
                        }
                    }
                }
            }

            const leftLimit = 45;
            const rightLimit = FIELD_WIDTH - 45;
            const topLimit = 30;
            const bottomLimit = FIELD_HEIGHT - 30;

            allDiscs.forEach(d => {
                if (d.y - d.radius < topLimit) {
                    d.y = topLimit + d.radius;
                    d.vy *= -RESTITUTION;
                    sound.playBounce(Math.abs(d.vy));
                } else if (d.y + d.radius > bottomLimit) {
                    d.y = bottomLimit - d.radius;
                    d.vy *= -RESTITUTION;
                    sound.playBounce(Math.abs(d.vy));
                }

                const inGoalY = d.y > goalTop && d.y < goalBottom;

                if (d.x - d.radius < leftLimit) {
                    if (inGoalY && d.team === 'ball') {
                        if (d.x < leftLimit - 25) triggerGoal('red');
                    } else {
                        // Las chapas no se quedan dentro de la portería: rebotan hacia el campo.
                        d.x = leftLimit + d.radius;
                        d.vx = -Math.abs(d.vx) * RESTITUTION;
                        if (Math.abs(d.vx) > 0.1) sound.playBounce(Math.abs(d.vx));
                    }
                }

                if (d.x + d.radius > rightLimit) {
                    if (inGoalY && d.team === 'ball') {
                        if (d.x > rightLimit + 25) triggerGoal('blue');
                    } else {
                        d.x = rightLimit - d.radius;
                        d.vx = Math.abs(d.vx) * -RESTITUTION;
                        if (Math.abs(d.vx) > 0.1) sound.playBounce(Math.abs(d.vx));
                    }
                }

                // Seguridad adicional al terminar una jugada: ninguna ficha queda en el área de gol.
                if (d.team !== 'ball' && !d.isMoving() && inGoalY) {
                    if (d.x < 100) { d.x = 100; d.vx = 0; d.vy = 0; }
                    if (d.x > FIELD_WIDTH - 100) { d.x = FIELD_WIDTH - 100; d.vx = 0; d.vy = 0; }
                }

                posts.forEach(post => {
                    const dx = d.x - post.x;
                    const dy = d.y - post.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = d.radius + post.r;

                    if (dist < minDist) {
                        const nx = dx / (dist || 1);
                        const ny = dy / (dist || 1);
                        const overlap = minDist - dist;

                        d.x += nx * overlap;
                        d.y += ny * overlap;

                        const velAngle = Math.atan2(d.vy, d.vx);
                        const normalAngle = Math.atan2(ny, nx);
                        const reflAngle = 2 * normalAngle - velAngle + Math.PI;
                        const speed = Math.hypot(d.vx, d.vy);

                        d.vx = Math.cos(reflAngle) * speed * RESTITUTION;
                        d.vy = Math.sin(reflAngle) * speed * RESTITUTION;

                        sound.playPost();
                    }
                });
            });

            if (gameState === 'MOVING') {
                const isAnythingMoving = allDiscs.some(d => d.isMoving());
                if (!isAnythingMoving) {
                    endTurn();
                }
            }
        }

        function endTurn() {
            if (gameState === 'GOAL_ANIM' || gameState === 'GAMEOVER') return;

            currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
            updateTurnUI();
            gameState = 'AIMING';

            if (currentTurn === 'red' && gameMode === 'pve') {
                setTimeout(executeAITurn, 600);
            }
        }

        function triggerGoal(scoringTeam) {
            if (gameState === 'GOAL_ANIM' || gameState === 'GAMEOVER') return;

            gameState = 'GOAL_ANIM';
            score[scoringTeam]++;
            updateScoreUI();
            sound.playGoal();

            const banner = document.getElementById('futchapas-goal-banner');
            banner.classList.add('is-visible');

            setTimeout(() => {
                banner.classList.remove('is-visible');

                if (Date.now() >= matchEndsAt) {
                    finishMatchByTime();
                } else {
                    // Tras cada gol se reanuda el partido hasta que se cumplan los 2 minutos.
                    resetPositions(scoringTeam);
                    if (currentTurn === 'red' && gameMode === 'pve') setTimeout(executeAITurn, 800);
                }
            }, 2200);
        }

        function finishMatchByTime() {
            if (gameState === 'GAMEOVER') return;
            if (score.blue > score.red) triggerGameOver('blue');
            else if (score.red > score.blue) triggerGameOver('red');
            else triggerGameOver('draw');
        }

        function updateMatchClock() {
            const status = document.getElementById('futchapas-match-status');
            if (!matchStarted || !status || gameState === 'GAMEOVER') return;
            const remaining = Math.max(0, matchEndsAt - Date.now());
            const totalSeconds = Math.ceil(remaining / 1000);
            status.textContent = `Tiempo: ${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')} · Partido de 2 minutos`;
            if (remaining <= 0 && gameState !== 'GOAL_ANIM') finishMatchByTime();
        }

        function triggerGameOver(winner) {
            if (gameState === 'GAMEOVER') return;
            gameState = 'GAMEOVER';
            matchStarted = false;
            const modal = document.getElementById('futchapas-winner-modal');
            const title = document.getElementById('futchapas-winner-title');
            const subtitle = document.getElementById('futchapas-winner-subtitle');

            const isDraw = winner === 'draw';
            const isBlue = winner === 'blue';
            title.textContent = isDraw ? '¡EMPATE!' : (isBlue ? '¡VICTORIA AZUL!' : '¡VICTORIA ROJA!');
            title.className = `font-teko text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r ${
                isDraw ? 'from-slate-300 to-slate-500' : (isBlue ? 'from-cyan-400 to-blue-600' : 'from-rose-400 to-red-600')
            } mb-2`;
            const resultText = isDraw
                ? `Se acabó el tiempo con empate ${score.blue} - ${score.red}.`
                : (isBlue ? `¡Has ganado ${score.blue} - ${score.red}!` : `Has perdido ${score.blue} - ${score.red}.`);
            let reward = 0;
            if (gameMode === 'pve') {
                if (aiDifficulty === 'easy') reward = isBlue ? 50 : (isDraw ? 25 : 10);
                else reward = isBlue ? 80 : (isDraw ? 50 : 10); // Leyenda
            }
            if (reward > 0) {
                if (window.FMC && typeof window.FMC.addCoins === 'function') {
                    const balance = window.FMC.addCoins(reward);
                    subtitle.textContent = `${resultText} Recibes ${reward} monedas. Saldo: ${balance} monedas.`;
                } else {
                    subtitle.textContent = `${resultText} Premio: ${reward} monedas (no se pudo actualizar el saldo del club).`;
                }
            } else {
                subtitle.textContent = `${resultText} En partidas de 2 jugadores no se entregan monedas.`;
            }

            modal.classList.add('is-visible');
        }

        function hideWinnerModal() {
            const modal = document.getElementById('futchapas-winner-modal');
            modal.classList.remove('is-visible');
        }

        // --- ARTIFICIAL INTELLIGENCE (ALTA DIFICULTAD LEYENDA) ---
        function executeAITurn() {
            if (gameState !== 'AIMING' || currentTurn !== 'red') return;

            const redFieldCaps = caps.filter(c => c.team === 'red' && !c.isGK);
            let bestCap = null;
            let bestAngle = 0;
            let bestPower = 0.95;

            const goalTargetLeft = { x: 45, y: FIELD_HEIGHT / 2 };

            if (aiDifficulty === 'easy') {
                bestCap = redFieldCaps[Math.floor(Math.random() * redFieldCaps.length)];
                const angle = Math.atan2(ball.y - bestCap.y, ball.x - bestCap.x) + (Math.random() - 0.5) * 0.7;
                bestAngle = angle;
                bestPower = 0.4 + Math.random() * 0.4;
            } else {
                // LEYENDA (IMPOSIBLE): Calcula tiro perfecto con rebote o impacto directo
                let bestScore = -Infinity;

                redFieldCaps.forEach(cap => {
                    const distCapBall = Math.hypot(ball.x - cap.x, ball.y - cap.y);
                    // Evalúa varios puntos de la portería y elige el tiro más limpio, sin aleatoriedad.
                    for (let n = 0; n < 9; n++) {
                        const targetY = goalTop + 16 + n * ((GOAL_HEIGHT - 32) / (9 - 1));
                        const angleBallToGoal = Math.atan2(targetY - ball.y, 45 - ball.x);
                        const impactX = ball.x - Math.cos(angleBallToGoal) * (CAP_RADIUS + BALL_RADIUS + 2);
                        const impactY = ball.y - Math.sin(angleBallToGoal) * (CAP_RADIUS + BALL_RADIUS + 2);
                        const capToImpactAngle = Math.atan2(impactY - cap.y, impactX - cap.x);
                        const approachError = Math.abs(Math.atan2(Math.sin(capToImpactAngle - angleBallToGoal), Math.cos(capToImpactAngle - angleBallToGoal)));
                        const distanceToImpact = Math.hypot(impactX - cap.x, impactY - cap.y);
                        const targetCentrality = Math.abs(targetY - FIELD_HEIGHT / 2) / (GOAL_HEIGHT / 2);
                        const candidateScore = 2500 - distanceToImpact - approachError * 450 - targetCentrality * 18;
                        if (candidateScore > bestScore) {
                            bestScore = candidateScore;
                            bestCap = cap;
                            bestAngle = capToImpactAngle;
                            bestPower = distanceToImpact > 260 ? 1.0 : 0.98;
                        }
                    }
                });
            }

            if (bestCap) {
                const impulse = MAX_PULL_DIST * bestPower * SHOT_POWER_FACTOR;

                bestCap.vx = Math.cos(bestAngle) * impulse;
                bestCap.vy = Math.sin(bestAngle) * impulse;

                sound.playKick(bestPower);
                gameState = 'MOVING';
            }
        }

        function getCanvasCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            return {
                x: (clientX - rect.left) * (FIELD_WIDTH / rect.width),
                y: (clientY - rect.top) * (FIELD_HEIGHT / rect.height)
            };
        }

        function onPointerDown(e) {
            if (!matchStarted) return;
            if (gameState !== 'AIMING') return;
            if (gameMode === 'pve' && currentTurn === 'red') return;

            const coords = getCanvasCoords(e);

            const clickedCap = caps.find(c => {
                if (c.team !== currentTurn) return false;
                return Math.hypot(c.x - coords.x, c.y - coords.y) <= c.radius + 10;
            });

            if (clickedCap) {
                selectedCap = clickedCap;
                dragStart = coords;
                dragCurrent = coords;
                isPointerDown = true;
            }
        }

        function onPointerMove(e) {
            if (!isPointerDown || !selectedCap) return;
            dragCurrent = getCanvasCoords(e);
        }

        function onPointerUp() {
            if (!isPointerDown || !selectedCap || !dragStart || !dragCurrent) {
                isPointerDown = false;
                selectedCap = null;
                return;
            }

            const dx = dragStart.x - dragCurrent.x;
            const dy = dragStart.y - dragCurrent.y;
            const dist = Math.min(MAX_PULL_DIST, Math.hypot(dx, dy));

            if (dist > 10) {
                const angle = Math.atan2(dy, dx);
                const impulse = dist * SHOT_POWER_FACTOR;

                selectedCap.vx = Math.cos(angle) * impulse;
                selectedCap.vy = Math.sin(angle) * impulse;

                sound.playKick(dist / MAX_PULL_DIST);
                gameState = 'MOVING';
            }

            isPointerDown = false;
            selectedCap = null;
            dragStart = null;
            dragCurrent = null;
        }

        function render() {
            ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

            // Césped
            const numStripes = 12;
            const stripeW = FIELD_WIDTH / numStripes;
            for (let i = 0; i < numStripes; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#10391F' : '#144325';
                ctx.fillRect(i * stripeW, 0, stripeW, FIELD_HEIGHT);
            }

            // Líneas del Campo
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = 4;

            ctx.strokeRect(45, 30, FIELD_WIDTH - 90, FIELD_HEIGHT - 60);

            ctx.beginPath();
            ctx.moveTo(FIELD_WIDTH / 2, 30);
            ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - 30);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 95, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 6, 0, Math.PI * 2);
            ctx.fill();

            const areaH = 290;
            const areaW = 150;
            ctx.strokeRect(45, (FIELD_HEIGHT - areaH) / 2, areaW, areaH);
            ctx.strokeRect(FIELD_WIDTH - 45 - areaW, (FIELD_HEIGHT - areaH) / 2, areaW, areaH);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;

            ctx.fillRect(10, goalTop, 35, GOAL_HEIGHT);
            ctx.strokeRect(10, goalTop, 35, GOAL_HEIGHT);

            ctx.fillRect(FIELD_WIDTH - 45, goalTop, 35, GOAL_HEIGHT);
            ctx.strokeRect(FIELD_WIDTH - 45, goalTop, 35, GOAL_HEIGHT);

            posts.forEach(p => {
                ctx.fillStyle = '#F8FAFC';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#475569';
                ctx.stroke();
            });

            // Apuntado Tirachinas
            if (isPointerDown && selectedCap && dragStart && dragCurrent && gameState === 'AIMING') {
                const dx = dragStart.x - dragCurrent.x;
                const dy = dragStart.y - dragCurrent.y;
                const dist = Math.min(MAX_PULL_DIST, Math.hypot(dx, dy));
                const angle = Math.atan2(dy, dx);

                if (dist > 5) {
                    const powerRatio = dist / MAX_PULL_DIST;
                    const lineLen = dist * 2.6;
                    const targetX = selectedCap.x + Math.cos(angle) * lineLen;
                    const targetY = selectedCap.y + Math.sin(angle) * lineLen;

                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([8, 6]);
                    ctx.moveTo(selectedCap.x, selectedCap.y);
                    ctx.lineTo(targetX, targetY);
                    ctx.strokeStyle = `hsl(${120 - powerRatio * 120}, 100%, 50%)`;
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    ctx.restore();

                    ctx.beginPath();
                    ctx.moveTo(selectedCap.x, selectedCap.y);
                    ctx.lineTo(selectedCap.x - Math.cos(angle) * dist, selectedCap.y - Math.sin(angle) * dist);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
                    ctx.lineWidth = 3.5;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(selectedCap.x, selectedCap.y, selectedCap.radius + 8, 0, Math.PI * 2 * powerRatio);
                    ctx.strokeStyle = `hsl(${120 - powerRatio * 120}, 100%, 50%)`;
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            }

            caps.forEach(cap => drawCap(cap));
            drawBall(ball);
        }

        function drawCap(cap) {
            ctx.save();
            ctx.translate(cap.x, cap.y);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;

            const isBlue = cap.team === 'blue';
            // Relleno sólido en vez de crear 22 gradientes nuevos en cada frame.
            ctx.fillStyle = isBlue
                ? (cap.isGK ? '#0284C7' : '#2563EB')
                : (cap.isGK ? '#EAB308' : '#DC2626');
            ctx.beginPath();
            ctx.arc(0, 0, cap.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = cap.isGK ? '#FEF08A' : 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = cap.isGK ? 3 : 2;
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(0, 0, cap.radius * 0.55, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            if (cap.isGK) {
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧤', 0, 0);
            } else {
                ctx.font = 'bold 12px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cap.number, 0, 1);
            }

            if (gameState === 'AIMING' && cap.team === currentTurn) {
                ctx.strokeStyle = isBlue ? 'rgba(56, 189, 248, 0.45)' : 'rgba(248, 113, 113, 0.45)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, cap.radius + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // Nombre visible debajo de cada chapa (el nombre completo se mantiene en la chapa).
            const fullName = String(cap.name || 'Sin jugador');
            ctx.save();
            const scale = Math.max(0.28, canvas.clientWidth / FIELD_WIDTH || 1);
            const fontSize = Math.max(24, Math.min(34, 10.5 / scale));
            ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (!cap._labelMetrics || cap._labelMetrics.fontSize !== fontSize) {
                cap._labelMetrics = { fontSize, width: Math.min(260, Math.max(120, ctx.measureText(fullName).width + 22)) };
            }
            const labelWidth = cap._labelMetrics.width;
            const labelY = cap.y - cap.radius - fontSize * 0.72;
            const labelHeight = fontSize * 1.22;
            ctx.fillStyle = 'rgba(3, 10, 7, 0.94)';
            ctx.fillRect(cap.x - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight);
            ctx.strokeStyle = cap.team === 'blue' ? '#60a5fa' : '#fb7185';
            ctx.lineWidth = 2;
            ctx.strokeRect(cap.x - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight);
            ctx.fillStyle = cap.team === 'blue' ? '#ffffff' : '#ffffff';
            ctx.fillText(fullName, cap.x, labelY, labelWidth - 12);
            ctx.restore();
        }

        function drawBall(b) {
            ctx.save();
            ctx.translate(b.x, b.y);

            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 3;

            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#1E293B';
            ctx.beginPath();
            ctx.arc(0, 0, b.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
        }

        function updateScoreUI() {
            document.getElementById('futchapas-score-blue').textContent = score.blue;
            document.getElementById('futchapas-score-red').textContent = score.red;
        }

        function updateTurnUI() {
            const indicator = document.getElementById('futchapas-turn-indicator');
            if (currentTurn === 'blue') {
                indicator.textContent = 'TURNO AZUL';
                indicator.className = 'px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold tracking-widest uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-inner animate-pulse';
            } else {
                indicator.textContent = 'TURNO ROJO';
                indicator.className = 'px-3 py-1 rounded-full text-[10px] sm:text-xs font-extrabold tracking-widest uppercase bg-red-500/20 text-red-300 border border-red-500/40 shadow-inner animate-pulse';
            }
        }

        const startDifficulty = document.getElementById('futchapas-start-difficulty');
        gameMode = 'pve';
        const redLabel = document.getElementById('futchapas-label-red-team');
        if (redLabel) redLabel.textContent = 'RIVAL (IA)';
        function startFutChapasMatch() {
            const startButton = document.getElementById('futchapas-btn-start');
            const startScreen = document.getElementById('futchapas-start-screen');
            const status = document.getElementById('futchapas-match-status');
            if (matchStarted) return;
            if (startButton) { startButton.disabled = true; startButton.textContent = 'CARGANDO PARTIDO…'; }
            try {
                aiDifficulty = startDifficulty && startDifficulty.value === 'easy' ? 'easy' : 'hard';
                gameMode = 'pve';
                const loadedCount = buildFutChapasRosters();
                if (loadedCount !== 11) {
                    if (status) status.textContent = `Tu alineación tiene ${loadedCount}/11 jugadores válidos. Completa el once en Mi club antes de comenzar.`;
                    if (startScreen) startScreen.classList.add('is-visible');
                    return;
                }
                currentFormationConfig = currentFormationConfig || FORMATIONS['4-3-3'];
                resetPositions(null, 'blue');
                initGame();
                if (startScreen) startScreen.classList.remove('is-visible');
                if (status) status.textContent = 'Tiempo: 2:00 · Partido de 2 minutos';
                render();
            } catch (err) {
                matchStarted = false;
                if (startScreen) startScreen.classList.add('is-visible');
                if (status) status.textContent = 'No se pudo iniciar. Pulsa para reintentar.';
                console.error('Error al iniciar FutChapas:', err);
            } finally {
                if (startButton) { startButton.disabled = false; startButton.textContent = '▶ COMENZAR NUEVO PARTIDO · 2:00'; }
            }
        }
        window.startFutChapasMatch = startFutChapasMatch;
        document.getElementById('futchapas-btn-start').addEventListener('click', startFutChapasMatch);

        document.getElementById('futchapas-btn-sound').addEventListener('click', () => {
            sound.muted = !sound.muted;
            document.getElementById('futchapas-sound-icon').textContent = sound.muted ? '0' : '🔊';
        });

        document.getElementById('futchapas-btn-reset').addEventListener('click', () => {
            matchStarted = false;
            gameState = 'AIMING';
            hideWinnerModal();
            document.getElementById('futchapas-start-screen').classList.add('is-visible');
            startDifficulty.value = aiDifficulty;
            resetPositions(null, currentTurn);
            render();
        });
        document.getElementById('futchapas-btn-restart-modal').addEventListener('click', () => {
            matchStarted = false;
            gameState = 'AIMING';
            hideWinnerModal();
            document.getElementById('futchapas-start-screen').classList.add('is-visible');
            startDifficulty.value = aiDifficulty;
            resetPositions(null, currentTurn);
            render();
        });

        canvas.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            onPointerDown(e);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            onPointerMove(e);
        }, { passive: false });

        window.addEventListener('touchend', onPointerUp);

        let lastFrameAt = 0;
        let gameLoopRunning = false;
        function gameLoop(timestamp = 0) {
            const futSection = document.getElementById('futchapas');
            const sectionVisible = !!(futSection && futSection.classList.contains('active'));
            if (!sectionVisible) { gameLoopRunning = false; return; }
            // Solo programamos otro frame mientras la pestaña de chapas está visible.
            // Así no consume CPU continuamente mientras se usan otras secciones.
            const frameInterval = matchStarted ? (1000 / 24) : 1000;
            if (timestamp - lastFrameAt >= frameInterval) {
                lastFrameAt = timestamp;
                if (matchStarted) {
                    try {
                        handlePhysics();
                        updateMatchClock();
                    } catch (err) {
                        console.error('Error durante FutChapas:', err);
                        matchStarted = false;
                        const status = document.getElementById('futchapas-match-status');
                        if (status) status.textContent = 'Error del partido. Pulsa Nuevo partido para reintentar.';
                    }
                }
                render();
            }
            requestAnimationFrame(gameLoop);
        }
        function startFutChapasLoop() {
            if (gameLoopRunning) return;
            gameLoopRunning = true;
            lastFrameAt = 0;
            requestAnimationFrame(gameLoop);
        }

        window.FMC = window.FMC || {};
        window.FMC.refreshFutChapasRoster = buildFutChapasRosters;
        window.FMC.startFutChapasLoop = startFutChapasLoop;
        buildFutChapasRosters();
        resetPositions(null, currentTurn);
        render();
        startFutChapasLoop();
})();
