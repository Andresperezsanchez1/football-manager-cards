(() => {
    // FutChapas: motor de Soccer Stars integrado en Football Manager Cards.
// --- WEB AUDIO API SYNTHESIZER ---
        class SoundEngine {
            constructor() {
                this.ctx = null;
                this.muted = false;
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

            playGoal() {
                if (this.muted) return;
                if (!this.init() || !this.ctx) return;
                const now = this.ctx.currentTime;
                const notes = [523.25, 659.25, 783.99, 1046.5];
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    const start = now + idx * 0.1;
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.35, start);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.22);
                });
            }
        }

        const soundEngine = new SoundEngine();

        // --- MOTOR DE JUEGO FUTCHAPAS ---
        let canvas = null;
        let ctx = null;
        let animId = null;

        const FIELD_WIDTH = 720;
        const FIELD_HEIGHT = 480;
        const GOAL_WIDTH = 140;

        const FRICTION = 0.982;       // Fricción optimizada y fluida
        const BALL_FRICTION = 0.991;
        const CAP_RADIUS = 22;
        const BALL_RADIUS = 13;

        let caps = [];
        let score = { blue: 0, red: 0 };
        let currentTurn = 'blue'; // 'blue' (Usuario) o 'red' (Rival)
        let gameState = 'IDLE'; // 'IDLE', 'AIMING', 'MOVING', 'GOAL'
        let selectedCap = null;
        let dragStart = { x: 0, y: 0 };
        let dragCurrent = { x: 0, y: 0 };

        let blueRoster = ['Jugador 1', 'Jugador 2', 'Jugador 3', 'Jugador 4', 'Portero'];
        let redRoster = ['Rival 1', 'Rival 2', 'Rival 3', 'Rival 4', 'Portero'];

        class Cap {
            constructor(x, y, radius, team, number = null, isGK = false, name = '') {
                this.x = x;
                this.y = y;
                this.startX = x;
                this.startY = y;
                this.radius = radius;
                this.team = team; // 'blue', 'red', 'ball'
                this.number = number;
                this.isGK = isGK;
                this.name = name || (team === 'ball' ? 'Balón' : `Jugador ${number || ''}`);
                this.mass = team === 'ball' ? 0.6 : (isGK ? 2.2 : 1.4);
                this.vx = 0;
                this.vy = 0;
            }

            isMoving() {
                return Math.hypot(this.vx, this.vy) > 0.08;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                const f = this.team === 'ball' ? BALL_FRICTION : FRICTION;
                this.vx *= f;
                this.vy *= f;

                if (Math.hypot(this.vx, this.vy) < 0.08) {
                    this.vx = 0;
                    this.vy = 0;
                }

                // Rebotes con los límites del campo (excluyendo zona de portería)
                const minX = this.radius;
                const maxX = FIELD_WIDTH - this.radius;
                const minY = this.radius;
                const maxY = FIELD_HEIGHT - this.radius;

                const inGoalY = this.y >= (FIELD_HEIGHT / 2 - GOAL_WIDTH / 2) && this.y <= (FIELD_HEIGHT / 2 + GOAL_WIDTH / 2);

                if (this.x < minX) {
                    if (inGoalY && this.team === 'ball') {
                        // Gol de red (entrando por la izquierda)
                        triggerGoal('red');
                        return;
                    }
                    this.x = minX;
                    this.vx *= -0.75;
                    soundEngine.playBounce(Math.hypot(this.vx, this.vy));
                } else if (this.x > maxX) {
                    if (inGoalY && this.team === 'ball') {
                        // Gol de blue (entrando por la derecha)
                        triggerGoal('blue');
                        return;
                    }
                    this.x = maxX;
                    this.vx *= -0.75;
                    soundEngine.playBounce(Math.hypot(this.vx, this.vy));
                }

                if (this.y < minY) {
                    this.y = minY;
                    this.vy *= -0.75;
                    soundEngine.playBounce(Math.hypot(this.vx, this.vy));
                } else if (this.y > maxY) {
                    this.y = maxY;
                    this.vy *= -0.75;
                    soundEngine.playBounce(Math.hypot(this.vx, this.vy));
                }
            }
        }

        function initFutChapasGame() {
            canvas = document.getElementById('futchapasCanvas');
            if (!canvas) return;
            ctx = canvas.getContext('2d');

            // Cargar nombres de tu club si existen en el estado global
            if (typeof state !== 'undefined' && state.starterIds && state.players) {
                const ownStarters = state.starterIds
                    .map(id => state.players.find(p => p.id === id))
                    .filter(Boolean)
                    .slice(0, 5);
                if (ownStarters.length > 0) {
                    blueRoster = ownStarters.map(p => p.name);
                }
            }

            resetPositions();
            
            // Event listeners de control de toque / ratón
            canvas.onpointerdown = handlePointerDown;
            canvas.onpointermove = handlePointerMove;
            canvas.onpointerup = handlePointerUp;

            if (!animId) {
                loop();
            }
        }

        function resetPositions(scoringTeam = null) {
            caps = [];

            // Cargar alineación inicial de chapas (Azules: Usuario, Rojas: Rival)
            // Portero Azul
            caps.appendCap = (c) => caps.push(c);
            caps.push(new Cap(50, FIELD_HEIGHT / 2, CAP_RADIUS, 'blue', 1, true, blueRoster[4] || 'Portero'));
            // Jugadores Campo Azul
            caps.push(new Cap(160, FIELD_HEIGHT * 0.25, CAP_RADIUS, 'blue', 2, false, blueRoster[0] || 'Jugador 1'));
            caps.push(new Cap(160, FIELD_HEIGHT * 0.75, CAP_RADIUS, 'blue', 3, false, blueRoster[1] || 'Jugador 2'));
            caps.push(new Cap(260, FIELD_HEIGHT * 0.38, CAP_RADIUS, 'blue', 4, false, blueRoster[2] || 'Jugador 3'));
            caps.push(new Cap(260, FIELD_HEIGHT * 0.62, CAP_RADIUS, 'blue', 5, false, blueRoster[3] || 'Jugador 4'));

            // Portero Rojo
            caps.push(new Cap(FIELD_WIDTH - 50, FIELD_HEIGHT / 2, CAP_RADIUS, 'red', 1, true, redRoster[4] || 'Portero Rival'));
            // Jugadores Campo Rojo
            caps.push(new Cap(FIELD_WIDTH - 160, FIELD_HEIGHT * 0.25, CAP_RADIUS, 'red', 2, false, redRoster[0] || 'Rival 1'));
            caps.push(new Cap(FIELD_WIDTH - 160, FIELD_HEIGHT * 0.75, CAP_RADIUS, 'red', 3, false, redRoster[1] || 'Rival 2'));
            caps.push(new Cap(FIELD_WIDTH - 260, FIELD_HEIGHT * 0.38, CAP_RADIUS, 'red', 4, false, redRoster[2] || 'Rival 3'));
            caps.push(new Cap(FIELD_WIDTH - 260, FIELD_HEIGHT * 0.62, CAP_RADIUS, 'red', 5, false, redRoster[3] || 'Rival 4'));

            // Balón en el centro
            caps.push(new Cap(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, BALL_RADIUS, 'ball', 0, false, 'Balón'));

            if (scoringTeam) {
                currentTurn = scoringTeam === 'blue' ? 'red' : 'blue';
            } else {
                currentTurn = 'blue';
            }
            gameState = 'IDLE';
            updateUIState();
        }

        function triggerGoal(scoringTeam) {
            score[scoringTeam]++;
            soundEngine.playGoal();
            gameState = 'GOAL';
            
            setTimeout(() => {
                resetPositions(scoringTeam);
            }, 1500);
        }

        function handlePointerDown(e) {
            if (gameState !== 'IDLE' || currentTurn !== 'blue') return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);

            const clicked = caps.find(c => c.team === 'blue' && Math.hypot(c.x - x, c.y - y) <= c.radius + 6);
            if (clicked) {
                selectedCap = clicked;
                gameState = 'AIMING';
                dragStart = { x: clicked.x, y: clicked.y };
                dragCurrent = { x, y };
            }
        }

        function handlePointerMove(e) {
            if (gameState !== 'AIMING' || !selectedCap) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            dragCurrent = { x, y };
        }

        function handlePointerUp(e) {
            if (gameState !== 'AIMING' || !selectedCap) return;
            
            const dx = dragStart.x - dragCurrent.x;
            const dy = dragStart.y - dragCurrent.y;
            const pullDist = Math.hypot(dx, dy);

            if (pullDist > 4) {
                const maxPower = 24;
                const power = Math.min(pullDist / 6, maxPower);
                const angle = Math.atan2(dy, dx);

                selectedCap.vx = Math.cos(angle) * power;
                selectedCap.vy = Math.sin(angle) * power;

                soundEngine.playKick(power / maxPower);
                gameState = 'MOVING';
            } else {
                gameState = 'IDLE';
            }
            selectedCap = null;
        }

        function resolveCollisions() {
            for (let i = 0; i < caps.length; i++) {
                for (let j = i + 1; j < caps.length; j++) {
                    const c1 = caps[i];
                    const c2 = caps[j];

                    const dist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
                    const minDist = c1.radius + c2.radius;

                    if (dist < minDist) {
                        const overlap = minDist - dist;
                        const nx = (c2.x - c1.x) / dist;
                        const ny = (c2.y - c1.y) / dist;

                        const totalMass = c1.mass + c2.mass;
                        c1.x -= nx * overlap * (c2.mass / totalMass);
                        c1.y -= ny * overlap * (c2.mass / totalMass);
                        c2.x += nx * overlap * (c1.mass / totalMass);
                        c2.y += ny * overlap * (c1.mass / totalMass);

                        const kx = c1.vx - c2.vx;
                        const ky = c1.vy - c2.vy;
                        const p = 2 * (nx * kx + ny * ky) / totalMass;

                        c1.vx -= p * c2.mass * nx * 0.9;
                        c1.vy -= p * c2.mass * ny * 0.9;
                        c2.vx += p * c1.mass * nx * 0.9;
                        c2.vy += p * c1.mass * ny * 0.9;

                        soundEngine.playBounce(Math.hypot(kx, ky));
                    }
                }
            }
        }

        function aiTurn() {
            if (currentTurn !== 'red' || gameState !== 'IDLE') return;
            gameState = 'MOVING';

            setTimeout(() => {
                const redCaps = caps.filter(c => c.team === 'red');
                const ball = caps.find(c => c.team === 'ball');
                if (redCaps.length === 0 || !ball) return;

                // Seleccionar chapa rival más cercana al balón o mejor colocada
                let bestCap = redCaps[0];
                let minDst = Infinity;
                redCaps.forEach(rc => {
                    const d = Math.hypot(ball.x - rc.x, ball.y - rc.y);
                    if (d < minDst) {
                        minDst = d;
                        bestCap = rc;
                    }
                });

                const angle = Math.atan2(ball.y - bestCap.y, ball.x - bestCap.x);
                const power = Math.min(16, Math.max(8, minDst / 15));

                bestCap.vx = Math.cos(angle) * power;
                bestCap.vy = Math.sin(angle) * power;
                soundEngine.playKick(0.7);
            }, 600);
        }

        function update() {
            caps.forEach(c => c.update());
            resolveCollisions();

            if (gameState === 'MOVING') {
                const anyMoving = caps.some(c => c.isMoving());
                if (!anyMoving) {
                    if (gameState !== 'GOAL') {
                        currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
                        gameState = 'IDLE';
                        updateUIState();
                        if (currentTurn === 'red') {
                            aiTurn();
                        }
                    }
                }
            }
        }

        function drawField() {
            // Fondo verde campo
            ctx.fillStyle = '#1e5631';
            ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

            // Líneas del campo
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 3;

            // Línea central
            ctx.beginPath();
            ctx.moveTo(FIELD_WIDTH / 2, 0);
            ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
            ctx.stroke();

            // Círculo central
            ctx.beginPath();
            ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 65, 0, Math.PI * 2);
            ctx.stroke();

            // Porterías
            const goalTop = FIELD_HEIGHT / 2 - GOAL_WIDTH / 2;
            ctx.strokeRect(0, goalTop, 25, GOAL_WIDTH);
            ctx.strokeRect(FIELD_WIDTH - 25, goalTop, 25, GOAL_WIDTH);
        }

        function draw() {
            if (!ctx) return;
            ctx.clearRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
            drawField();

            // Dibujar línea de tiro si está apuntando
            if (gameState === 'AIMING' && selectedCap) {
                ctx.save();
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 4;
                ctx.setLineDash([6, 6]);
                ctx.beginPath();
                ctx.moveTo(selectedCap.x, selectedCap.y);
                ctx.lineTo(
                    selectedCap.x + (dragCurrent.x - dragStart.x),
                    selectedCap.y + (dragCurrent.y - dragStart.y)
                );
                ctx.stroke();
                ctx.restore();
            }

            // Dibujar chapas
            caps.forEach(cap => {
                ctx.save();
                ctx.translate(cap.x, cap.y);

                if (cap.team === 'ball') {
                    // Dibujar balón
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, cap.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#333';
                    ctx.stroke();
                } else {
                    // Sombra de chapa
                    ctx.beginPath();
                    ctx.arc(2, 3, cap.radius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    ctx.fill();

                    // Cuerpo de la chapa
                    ctx.beginPath();
                    ctx.arc(0, 0, cap.radius, 0, Math.PI * 2);
                    ctx.fillStyle = cap.team === 'blue' ? '#3b82f6' : '#ef4444';
                    ctx.fill();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = '#ffffff';
                    ctx.stroke();

                    // Nombre del jugador en la chapa
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const shortName = cap.name.split(' ').pop(); // Apellido o nombre corto
                    ctx.fillText(shortName, 0, 0, cap.radius * 1.8);
                }

                ctx.restore();
            });
        }

        function loop() {
            update();
            draw();
            animId = requestAnimationFrame(loop);
        }

        function updateUIState() {
            const scoreBlue = document.getElementById('futchapas-score-blue');
            const scoreRed = document.getElementById('futchapas-score-red');
            const turnIndicator = document.getElementById('futchapas-turn-indicator');

            if (scoreBlue) scoreBlue.innerText = score.blue;
            if (scoreRed) scoreRed.innerText = score.red;
            if (turnIndicator) {
                turnIndicator.innerText = currentTurn === 'blue' ? '🟢 Tu turno (Arrastra tu chapa)' : '🔴 Turno del Rival...';
            }
        }

        function toggleFutChapasSound() {
            soundEngine.muted = !soundEngine.muted;
            alert(soundEngine.muted ? 'Sonido desactivado' : 'Sonido activado');
        }

        // Inicializar al cargar la pestaña o componente
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(initFutChapasGame, 500);
        });
})();
