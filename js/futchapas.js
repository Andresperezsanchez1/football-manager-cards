(() => {
    const FIELD_WIDTH = 1200;
    const FIELD_HEIGHT = 700;
    const CAP_RADIUS = 22;
    const BALL_RADIUS = 12;
    const GOAL_HEIGHT = 200;
    const FRICTION = 0.98;
    const RESTITUTION = 0.85;

    const canvas = document.getElementById('futchapas-pitch');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = FIELD_WIDTH;
    canvas.height = FIELD_HEIGHT;

    let matchStarted = false;
    let score = { blue: 0, red: 0 };
    let currentTurn = 'blue';
    let gameState = 'AIMING'; // 'AIMING', 'MOVING'

    let caps = [];
    let ball = null;
    let selectedCap = null;
    let dragStart = null;
    let dragCurrent = null;
    let isPointerDown = false;

    const goalTop = (FIELD_HEIGHT - GOAL_HEIGHT) / 2;
    const goalBottom = (FIELD_HEIGHT + GOAL_HEIGHT) / 2;

    class Disc {
        constructor(x, y, radius, team, name = '', isGK = false) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.radius = radius;
            this.team = team;
            this.name = name;
            this.isGK = isGK;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= FRICTION;
            this.vy *= FRICTION;

            if (Math.hypot(this.vx, this.vy) < 0.1) {
                this.vx = 0;
                this.vy = 0;
            }
        }

        isMoving() {
            return Math.hypot(this.vx, this.vy) > 0.1;
        }
    }

    function initRosters() {
        let players = [];
        if (window.FMC && typeof window.FMC.getFutChapasData === 'function') {
            const data = window.FMC.getFutChapasData();
            if (data && Array.isArray(data.lineup)) {
                players = data.lineup.map(p => p ? p.name : 'Jugador');
            }
        }
        while (players.length < 11) players.push('Jugador');
        return players.slice(0, 11);
    }

    function startFutChapasMatch() {
        score = { blue: 0, red: 0 };
        matchStarted = true;
        currentTurn = 'blue';
        gameState = 'AIMING';

        document.getElementById('futchapas-start-screen').classList.remove('is-visible');
        document.getElementById('futchapas-score-blue').textContent = '0';
        document.getElementById('futchapas-score-red').textContent = '0';
        document.getElementById('futchapas-turn-indicator').textContent = 'TURNO AZUL';

        const blueNames = initRosters();
        const redNames = Array.from({ length: 11 }, (_, i) => `Rival ${i + 1}`);

        caps = [];
        ball = new Disc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, BALL_RADIUS, 'ball');

        // Posiciones sencillas en formación 4-3-3
        const bluePositions = [
            { x: 80, y: 350, gk: true },
            { x: 200, y: 150 }, { x: 200, y: 280 }, { x: 200, y: 420 }, { x: 200, y: 550 },
            { x: 380, y: 250 }, { x: 350, y: 350 }, { x: 380, y: 450 },
            { x: 520, y: 200 }, { x: 500, y: 350 }, { x: 520, y: 500 }
        ];

        bluePositions.forEach((pos, i) => {
            caps.push(new Disc(pos.x, pos.y, CAP_RADIUS, 'blue', blueNames[i] || `Azul ${i+1}`, pos.gk));
        });

        bluePositions.forEach((pos, i) => {
            caps.push(new Disc(FIELD_WIDTH - pos.x, pos.y, CAP_RADIUS, 'red', redNames[i], pos.gk));
        });

        hideWinnerModal();
    }
    window.startFutChapasMatch = startFutChapasMatch;

    const startBtn = document.getElementById('futchapas-btn-start');
    if (startBtn) startBtn.addEventListener('click', startFutChapasMatch);

    const resetBtn = document.getElementById('futchapas-btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
        matchStarted = false;
        document.getElementById('futchapas-start-screen').classList.add('is-visible');
    });

    const modalBtn = document.getElementById('futchapas-btn-restart-modal');
    if (modalBtn) modalBtn.addEventListener('click', () => {
        matchStarted = false;
        document.getElementById('futchapas-start-screen').classList.add('is-visible');
    });

    function hideWinnerModal() {
        const modal = document.getElementById('futchapas-winner-modal');
        if (modal) modal.classList.remove('is-visible');
    }

    function handlePhysics() {
        const all = [...caps, ball];
        all.forEach(d => d.update());

        // Colisiones entre fichas y balón
        for (let i = 0; i < all.length; i++) {
            for (let j = i + 1; j < all.length; j++) {
                const d1 = all[i];
                const d2 = all[j];
                const dx = d2.x - d1.x;
                const dy = d2.y - d1.y;
                const dist = Math.hypot(dx, dy);
                const minDist = d1.radius + d2.radius;

                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const nx = dx / (dist || 1);
                    const ny = dy / (dist || 1);

                    d1.x -= nx * overlap * 0.5;
                    d1.y -= ny * overlap * 0.5;
                    d2.x += nx * overlap * 0.5;
                    d2.y += ny * overlap * 0.5;

                    const kx = d1.vx - d2.vx;
                    const ky = d1.vy - d2.vy;
                    const p = 2 * (nx * kx + ny * ky) / 2;

                    d1.vx -= p * nx * RESTITUTION;
                    d1.vy -= p * ny * RESTITUTION;
                    d2.vx += p * nx * RESTITUTION;
                    d2.vy += p * ny * RESTITUTION;
                }
            }
        }

        // Rebotes en paredes
        all.forEach(d => {
            if (d.x - d.radius < 40) {
                if (d.y > goalTop && d.y < goalBottom && d.team === 'ball') {
                    if (d.x < 10) triggerGoal(d.x < FIELD_WIDTH / 2 ? 'red' : 'blue');
                } else {
                    d.x = 40 + d.radius;
                    d.vx *= -RESTITUTION;
                }
            }
            if (d.x + d.radius > FIELD_WIDTH - 40) {
                if (d.y > goalTop && d.y < goalBottom && d.team === 'ball') {
                    if (d.x > FIELD_WIDTH - 10) triggerGoal(d.x < FIELD_WIDTH / 2 ? 'red' : 'blue');
                } else {
                    d.x = FIELD_WIDTH - 40 - d.radius;
                    d.vx *= -RESTITUTION;
                }
            }
            if (d.y - d.radius < 30) {
                d.y = 30 + d.radius;
                d.vy *= -RESTITUTION;
            }
            if (d.y + d.radius > FIELD_HEIGHT - 30) {
                d.y = FIELD_HEIGHT - 30 - d.radius;
                d.vy *= -RESTITUTION;
            }
        });

        if (gameState === 'MOVING') {
            if (!all.some(d => d.isMoving())) {
                currentTurn = currentTurn === 'blue' ? 'red' : 'blue';
                document.getElementById('futchapas-turn-indicator').textContent = currentTurn === 'blue' ? 'TURNO AZUL' : 'TURNO ROJO';
                gameState = 'AIMING';

                if (currentTurn === 'red' && matchStarted) {
                    setTimeout(aiPlay, 500);
                }
            }
        }
    }

    function triggerGoal(team) {
        score[team]++;
        document.getElementById('futchapas-score-blue').textContent = score.blue;
        document.getElementById('futchapas-score-red').textContent = score.red;

        if (score[team] >= 3) {
            matchStarted = false;
            const modal = document.getElementById('futchapas-winner-modal');
            document.getElementById('futchapas-winner-title').textContent = team === 'blue' ? '¡VICTORIA!' : '¡DERROTA!';
            document.getElementById('futchapas-winner-subtitle').textContent = `El equipo ${team === 'blue' ? 'Azul' : 'Rojo'} ha ganado el partido.`;
            modal.classList.add('is-visible');
        } else {
            startFutChapasMatch();
        }
    }

    function aiPlay() {
        if (!matchStarted || currentTurn !== 'red') return;
        const redCaps = caps.filter(c => c.team === 'red');
        const randomCap = redCaps[Math.floor(Math.random() * redCaps.length)];
        if (randomCap) {
            const angle = Math.atan2(ball.y - randomCap.y, ball.x - randomCap.x);
            randomCap.vx = Math.cos(angle) * 18;
            randomCap.vy = Math.sin(angle) * 18;
            gameState = 'MOVING';
        }
    }

    // Controles táctiles y de ratón
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (FIELD_WIDTH / rect.width),
            y: (clientY - rect.top) * (FIELD_HEIGHT / rect.height)
        };
    }

    canvas.addEventListener('mousedown', e => {
        if (!matchStarted || gameState !== 'AIMING' || currentTurn === 'red') return;
        const pos = getCoords(e);
        selectedCap = caps.find(c => c.team === currentTurn && Math.hypot(c.x - pos.x, c.y - pos.y) <= c.radius + 10);
        if (selectedCap) {
            dragStart = pos;
            dragCurrent = pos;
            isPointerDown = true;
        }
    });

    window.addEventListener('mousemove', e => {
        if (!isPointerDown) return;
        dragCurrent = getCoords(e);
    });

    window.addEventListener('mouseup', () => {
        if (!isPointerDown || !selectedCap) return;
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        const dist = Math.min(100, Math.hypot(dx, dy));

        if (dist > 5) {
            const angle = Math.atan2(dy, dx);
            selectedCap.vx = Math.cos(angle) * (dist * 0.2);
            selectedCap.vy = Math.sin(angle) * (dist * 0.2);
            gameState = 'MOVING';
        }
        isPointerDown = false;
        selectedCap = null;
    });

    function render() {
        ctx.fillStyle = '#144325';
        ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

        // Líneas campo
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 30, FIELD_WIDTH - 80, FIELD_HEIGHT - 60);
        ctx.beginPath();
        ctx.moveTo(FIELD_WIDTH / 2, 30);
        ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT - 30);
        ctx.stroke();

        // Porterías
        ctx.strokeRect(10, goalTop, 30, GOAL_HEIGHT);
        ctx.strokeRect(FIELD_WIDTH - 40, goalTop, 30, GOAL_HEIGHT);

        // Dibujar chapas
        caps.forEach(c => {
            ctx.fillStyle = c.team === 'blue' ? '#2563EB' : '#DC2626';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Nombre corto en la chapa
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(c.name.split(' ')[0], c.x, c.y);
        });

        // Dibujar balón
        if (ball) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.stroke();
        }

        // Línea de tiro
        if (isPointerDown && selectedCap && dragStart && dragCurrent) {
            ctx.beginPath();
            ctx.moveTo(selectedCap.x, selectedCap.y);
            ctx.lineTo(selectedCap.x + (dragStart.x - dragCurrent.x), selectedCap.y + (dragStart.y - dragCurrent.y));
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
    }

    function loop() {
        requestAnimationFrame(loop);
        const section = document.getElementById('futchapas');
        if (section && section.classList.contains('active') && matchStarted) {
            handlePhysics();
        }
        render();
    }

    loop();
})();
