// Shared Logic (Main Thread & Worker)

// Global Config (Shared)
var currentGridW = 5;
var currentGridH = 5;
var cellSize = 64;
var snakeWidth = 44;
var isChallengeLevel = false;

// Helpers
const DIRS = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 },  // Right
    { x: 0, y: 1 },  // Down
    { x: -1, y: 0 }  // Left
];

const RANK_TITLES = [
    { count: 0, title: "NOVICE" },
    { count: 10, title: "SNAKE CHARMER" },
    { count: 30, title: "PUZZLE SOLVER" },
    { count: 60, title: "SERPENT MASTER" },
    { count: 100, title: "VIPER LEGEND" },
    { count: 200, title: "SNAKE GOD" }
];

// Particle Class with Pooling support
class Particle {
    constructor() {
        this.reset();
    }
    reset() {
        this.active = false;
        this.x = 0; this.y = 0; this.color = '';
        this.vx = 0; this.vy = 0;
        this.alpha = 1;
        this.size = 0;
    }
    init(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12;
        this.alpha = 1;
        this.size = Math.random() * 5 + 2;
        this.active = true;
    }
    update() {
        if (!this.active) return;
        this.x += this.vx; this.y += this.vy;
        this.alpha -= 0.025;
        if (this.alpha <= 0) this.active = false;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

const particlePool = [];
function getParticleFromPool() {
    for (let p of particlePool) {
        if (!p.active) return p;
    }
    const newP = new Particle();
    particlePool.push(newP);
    return newP;
}

// Snake Class
class Snake {
    constructor(id, cells, dirIndex, color) {
        this.id = id;
        this.cells = cells;
        this.dirIndex = dirIndex;
        this.color = color;
        this.status = 'idle';
        this.progress = 0;
        this.shakeOffset = 0;

        // Animations
        this.blinkState = 0;
        this.blinkTimer = Math.random() * 200 + 100;
        this.tongueProgress = 0;
        this.tongueStatus = 'in';
        this.tongueTimer = Math.random() * 300 + 100;
    }

    updateAnimations() {
        if (this.status === 'gone') return;
        this.blinkTimer--;
        if (this.blinkTimer <= 0) {
            this.blinkState = (this.blinkState + 1) % 3;
            this.blinkTimer = this.blinkState === 0 ? Math.random() * 300 + 150 : 6;
        }

        if (this.tongueStatus === 'in') {
            this.tongueTimer--;
            if (this.tongueTimer <= 0) this.tongueStatus = 'extending';
        } else if (this.tongueStatus === 'extending') {
            this.tongueProgress += 0.15;
            if (this.tongueProgress >= 1) { this.tongueProgress = 1; this.tongueStatus = 'retracting'; }
        } else if (this.tongueStatus === 'retracting') {
            this.tongueProgress -= 0.1;
            if (this.tongueProgress <= 0) { this.tongueProgress = 0; this.tongueStatus = 'in'; this.tongueTimer = Math.random() * 400 + 200; }
        }
    }

    getSegmentPos(index) {
        const dx = DIRS[this.dirIndex].x;
        const dy = DIRS[this.dirIndex].y;
        const dist = index * cellSize;
        const currentDistFromStart = this.progress - dist;

        if (currentDistFromStart <= 0) {
            if (index === 0) return { x: this.cells[index].x * cellSize + cellSize / 2, y: this.cells[index].y * cellSize + cellSize / 2, angle: Math.atan2(dy, dx) };
            const pPrev = this.cells[index - 1];
            const pCurr = this.cells[index];
            return { x: pCurr.x * cellSize + cellSize / 2, y: pCurr.y * cellSize + cellSize / 2, angle: Math.atan2(pPrev.y - pCurr.y, pPrev.x - pCurr.x) };
        }

        // Simplified interpolation for shortness, assuming full function logic matches game.js roughly or we copy-paste full logic if critical. 
        // Using the robust logic from game.js is safer.
        let remaining = currentDistFromStart;
        let currentIdx = index;
        while (currentIdx > 0 && remaining > 0) {
            const step = cellSize;
            if (remaining <= step) {
                const p1 = this.cells[currentIdx];
                const p2 = this.cells[currentIdx - 1];
                const ratio = remaining / step;
                return {
                    x: (p1.x + (p2.x - p1.x) * ratio) * cellSize + cellSize / 2,
                    y: (p1.y + (p2.y - p1.y) * ratio) * cellSize + cellSize / 2,
                    angle: Math.atan2(p2.y - p1.y, p2.x - p1.x)
                };
            }
            remaining -= step;
            currentIdx--;
        }
        const headCell = this.cells[0];
        return {
            x: (headCell.x + dx * (remaining / cellSize)) * cellSize + cellSize / 2,
            y: (headCell.y + dy * (remaining / cellSize)) * cellSize + cellSize / 2,
            angle: Math.atan2(dy, dx)
        };
    }

    draw(ctx) {
        if (this.status === 'gone') return;
        this.updateAnimations();

        const selectedSkin = (typeof Economy !== 'undefined') ? Economy.getSelectedSkin() : 'classic';

        ctx.save();

        const isMobile = (typeof isMobileDevice === 'function') ? isMobileDevice() : (window.innerWidth < 768);

        let shadowBlur = isChallengeLevel ? 20 : 12;
        let shadowColor = this.color;

        if (selectedSkin === 'neon') {
            shadowBlur = 25;
            shadowColor = '#22d3ee';
        } else if (selectedSkin === 'gold') {
            shadowBlur = 30;
            shadowColor = 'rgba(251, 191, 36, 0.6)';
        }

        // PERFORMANCE: Disable shadows on mobile
        if (!isMobile) {
            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = shadowColor;
        }

        for (let i = this.cells.length - 1; i >= 0; i--) {
            const pos = this.getSegmentPos(i);
            let wobble = this.status === 'moving' ? Math.sin((this.progress - i * 35) * 0.15) * 10 : 0;
            const perpX = -Math.sin(pos.angle);
            const perpY = Math.cos(pos.angle);
            const cx = pos.x + (this.shakeOffset * Math.abs(DIRS[this.dirIndex].y)) + (perpX * wobble);
            const cy = pos.y + (this.shakeOffset * Math.abs(DIRS[this.dirIndex].y)) + (perpY * wobble);

            const sWidth = (snakeWidth) * (1 - (i / this.cells.length) * 0.25);

            // 1. BELLY LAYER
            let bellyColor = '#fef3c7';
            if (selectedSkin === 'neon') bellyColor = '#ecfeff';
            if (selectedSkin === 'gold') bellyColor = '#fffbeb';

            ctx.fillStyle = bellyColor;
            ctx.beginPath();
            ctx.arc(cx, cy + 3, sWidth * 0.48, 0, Math.PI * 2);
            ctx.fill();

            // 2. MAIN BODY (Performance: Use flat color + single highlight on mobile)
            let color1 = this.color;
            let color2 = this.adjustColor(this.color, -40);

            if (selectedSkin === 'neon') {
                color1 = '#22d3ee';
                color2 = '#0891b2';
                // Shimmer is okay but skip if ultra low perf? Let's keep for now.
                const shim = Math.sin(Date.now() * 0.005 + i * 0.5) * 20;
                color1 = this.adjustColor(color1, shim);
            } else if (selectedSkin === 'gold') {
                color1 = '#fbbf24';
                color2 = '#b45309';
            }

            if (isMobile) {
                ctx.fillStyle = color1;
            } else {
                const bodyGrad = ctx.createRadialGradient(cx - 5, cy - 8, 2, cx, cy, sWidth / 2);
                bodyGrad.addColorStop(0, color1);
                bodyGrad.addColorStop(1, color2);
                ctx.fillStyle = bodyGrad;
            }

            ctx.beginPath();
            ctx.arc(cx, cy, sWidth / 2, 0, Math.PI * 2);
            ctx.fill();

            // 3. SPOTS
            if (i % 2 === 0) {
                ctx.fillStyle = this.adjustColor(color1, -50);
                ctx.globalAlpha = (selectedSkin === 'gold') ? 0.4 : 0.3;
                ctx.beginPath();
                ctx.arc(cx + 6, cy - 4, sWidth * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

            // 4. TOP RIDGE HIGHLIGHT
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, sWidth * 0.4, -Math.PI * 0.8, -Math.PI * 0.2);
            ctx.stroke();

            if (selectedSkin === 'gold' && Math.random() < 0.05) {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(cx + (Math.random() - 0.5) * 20, cy + (Math.random() - 0.5) * 20, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            if (i === 0) this.drawHeadDetails(ctx, cx, cy, pos.angle, selectedSkin);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }

    drawHeadDetails(ctx, cx, cy, angle, skin = 'classic') {
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const headScale = 1.15;

        let headColor = this.color;
        if (skin === 'neon') headColor = '#22d3ee';
        if (skin === 'gold') headColor = '#fbbf24';

        // 1. OVERSIZE HEAD BASE
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(angle);
        const headGrad = ctx.createRadialGradient(-5, -8, 2, 0, 0, (snakeWidth * headScale) / 2);
        headGrad.addColorStop(0, headColor);
        headGrad.addColorStop(1, this.adjustColor(headColor, -30));
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, (snakeWidth * headScale) / 1.8, (snakeWidth * headScale) / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. TONGUE (Timing identical)
        if (this.tongueProgress > 0) {
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
            ctx.beginPath(); ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            const tLen = (snakeWidth * 0.7) * this.tongueProgress;
            ctx.moveTo(snakeWidth * 0.5, 0); ctx.lineTo(snakeWidth * 0.5 + tLen, 0);
            if (this.tongueProgress > 0.5) {
                const forkLen = tLen * 0.3;
                ctx.lineTo(snakeWidth * 0.5 + tLen + forkLen, forkLen);
                ctx.moveTo(snakeWidth * 0.5 + tLen, 0);
                ctx.lineTo(snakeWidth * 0.5 + tLen + forkLen, -forkLen);
            }
            ctx.stroke(); ctx.restore();
        }

        // 3. CUTE EXPRESSIVE EYES
        const eyeDist = snakeWidth * 0.42, eyeSpread = snakeWidth * 0.35;
        const scaleY = this.blinkState === 1 ? 0.1 : (this.blinkState === 2 ? 0.4 : 1);
        [1, -1].forEach(side => {
            const ex = cx + cosA * eyeDist + sinA * eyeSpread * side;
            const ey = cy + sinA * eyeDist - cosA * eyeSpread * side;

            ctx.save(); ctx.translate(ex, ey); ctx.rotate(angle);

            // White part
            ctx.fillStyle = 'white'; ctx.beginPath();
            ctx.ellipse(0, 0, snakeWidth * 0.16, snakeWidth * 0.16 * scaleY, 0, 0, Math.PI * 2); ctx.fill();

            if (this.blinkState === 0) {
                // Pupil (Large & Smart)
                ctx.fillStyle = '#1e293b'; ctx.beginPath();
                ctx.ellipse(2, 0, snakeWidth * 0.1, snakeWidth * 0.1, 0, 0, Math.PI * 2); ctx.fill();

                // Sparkle (Lovable highlight)
                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath();
                ctx.arc(3, -3, snakeWidth * 0.04, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        });
    }

    adjustColor(hex, amt) {
        let num = parseInt(hex.slice(1), 16);
        let r = Math.max(0, Math.min(255, (num >> 16) + amt));
        let g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
        let b = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
        return "#" + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    isPointInside(px, py) {
        if (this.status !== 'idle') return false;
        const radiusSq = Math.pow(snakeWidth / 2 + 5, 2);
        return this.cells.some(cell => {
            const dx = px - (cell.x * cellSize + cellSize / 2);
            const dy = py - (cell.y * cellSize + cellSize / 2);
            return (dx * dx + dy * dy) < radiusSq;
        });
    }

    isBlocked(allSnakes, obstacleList = []) {
        const dx = DIRS[this.dirIndex].x;
        const dy = DIRS[this.dirIndex].y;
        const head = this.cells[0];
        for (let step = 1; step < 20; step++) {
            const tx = head.x + (dx * step);
            const ty = head.y + (dy * step);
            if (tx < 0 || tx >= currentGridW || ty < 0 || ty >= currentGridH) break;
            if (allSnakes.some(other => other.id !== this.id && other.status !== 'gone' && other.cells.some(c => c.x === tx && c.y === ty))) return true;
            if (obstacleList.some(obs => obs.x === tx && obs.y === ty)) return true;
        }
        return false;
    }

    shake() {
        let start = Date.now();
        const animateShake = () => {
            let elapsed = Date.now() - start;
            if (elapsed < 300) {
                this.shakeOffset = Math.sin(elapsed / 15) * 6;
                // In worker, requestAnimationFrame doesn't exist. This method shouldn't be called in worker.
                if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(animateShake);
            } else { this.shakeOffset = 0; }
        };
        animateShake();
    }

    explode(renderOffsetX, renderOffsetY) {
        const pos = this.getSegmentPos(0);
        const isMobile = (typeof isMobileDevice === 'function') ? isMobileDevice() : (window.innerWidth < 768);
        const count = isMobile ? 8 : 15;
        // Assumes particles global array exists
        if (typeof particles !== 'undefined') {
            for (let i = 0; i < count; i++) {
                const p = getParticleFromPool();
                p.init(pos.x + renderOffsetX, pos.y + renderOffsetY, this.color);
                particles.push(p);
            }
        }
    }
}

// Difficulty Profiler (Updated for High Density)
function getDifficultyProfile(lvl) {
    let p = {
        grid: 5,
        minLen: 2, maxLen: 3,
        turnChance: 0.1, // Chance to turn during body generation
        obstacles: 0,
        moveBuffer: 3
    };

    if (lvl <= 5) {
        p.turnChance = 0.05;
        p.moveBuffer = 5;
    } else if (lvl <= 25) {
        p.grid = 6;
        p.minLen = 2; p.maxLen = 4;
        p.turnChance = 0.2;
        p.moveBuffer = 4;
        p.obstacles = Math.floor((lvl - 5) / 5) + 1;
    } else if (lvl <= 50) {
        p.grid = 7;
        p.minLen = 3; p.maxLen = 5;
        p.turnChance = 0.3;
        p.moveBuffer = 3;
        p.obstacles = 3 + Math.floor((lvl - 25) / 10);
    } else if (lvl <= 75) {
        p.grid = 8;
        p.minLen = 3; p.maxLen = 6;
        p.turnChance = 0.4;
        p.moveBuffer = 2;
        p.obstacles = 4 + Math.floor((lvl - 50) / 10);
    } else if (lvl <= 150) {
        p.grid = 10;
        p.minLen = 4; p.maxLen = 8;
        p.turnChance = 0.5;
        p.moveBuffer = 2;
        p.obstacles = 6 + Math.floor((lvl - 75) / 15);
    } else if (lvl <= 300) {
        p.grid = 12;
        p.minLen = 5; p.maxLen = 10;
        p.turnChance = 0.6;
        p.moveBuffer = 1;
        p.obstacles = 8 + Math.floor((lvl - 150) / 20);
    } else if (lvl <= 600) {
        p.grid = 14;
        p.minLen = 6; p.maxLen = 12;
        p.turnChance = 0.7;
        p.moveBuffer = 1;
        p.obstacles = 10 + Math.floor((lvl - 300) / 30);
    } else {
        p.grid = 20;
        p.minLen = 8; p.maxLen = 16;
        p.turnChance = 0.8;
        p.moveBuffer = 1;
        p.obstacles = 15 + Math.floor((lvl - 600) / 50);
    }

    // Cap obstacles
    if (p.obstacles > (p.grid * p.grid) * 0.15) p.obstacles = Math.floor((p.grid * p.grid) * 0.15);

    // Challenge Mode Adjustments
    if (lvl % 4 === 0) {
        p.maxLen += 2;
        p.obstacles += 2;
        p.moveBuffer = 0;
        p.turnChance += 0.1;
    }

    return p;
}

// ----- Graph Theory Solvability Check -----
// Returns TRUE if acyclic and valid (Solvable).
// Returns FALSE if cycle detected or blocked by obstacle.
// ----- Graph Theory Solvability Check -----
// Returns TRUE if acyclic and valid (Solvable).
// Returns FALSE if cycle detected or blocked by obstacle.
function isSolvableGraph(snakes, obstacles) {
    // Optimization: Build a occupancy grid for fast lookup
    const idGrid = Array(currentGridH).fill().map(() => Array(currentGridW).fill(null));
    snakes.forEach(s => {
        s.cells.forEach(c => {
            if (c.y >= 0 && c.y < currentGridH && c.x >= 0 && c.x < currentGridW) {
                idGrid[c.y][c.x] = s.id;
            }
        });
    });

    const adj = new Map();
    snakes.forEach(s => adj.set(s.id, []));

    for (let s of snakes) {
        let dx = DIRS[s.dirIndex].x;
        let dy = DIRS[s.dirIndex].y;
        let cx = s.cells[0].x;
        let cy = s.cells[0].y;

        let blockedBySet = new Set();
        let hitObs = false;

        while (true) {
            cx += dx;
            cy += dy;

            if (cx < 0 || cx >= currentGridW || cy < 0 || cy >= currentGridH) break;

            if (obstacles.some(o => o.x === cx && o.y === cy)) {
                hitObs = true;
                break;
            }

            const blockerId = idGrid[cy][cx];
            if (blockerId !== null && blockerId !== s.id) {
                blockedBySet.add(blockerId);
            }
        }

        if (hitObs) return false;
        blockedBySet.forEach(id => adj.get(s.id).push(id));
    }

    const visited = new Set();
    const recStack = new Set();

    function hasCycle(nodeId) {
        if (recStack.has(nodeId)) return true;
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recStack.add(nodeId);

        const neighbors = adj.get(nodeId) || [];
        for (let neighbor of neighbors) {
            if (hasCycle(neighbor)) return true;
        }

        recStack.delete(nodeId);
        return false;
    }

    for (let s of snakes) {
        if (hasCycle(s.id)) return false;
    }

    return true;
}


function generateSolvableLevel(lvl) {
    const standardColors = ['#00f2fe', '#f9d423', '#f83600', '#00cdac', '#a29bfe', '#e94560', '#74ebd5', '#ff9ff3', '#48dbfb', '#1dd1a1', '#feca57', '#5f27cd'];
    const challengeColors = ['#ffd700', '#ff8c00', '#ffa500', '#ff4500', '#daa520'];

    isChallengeLevel = (lvl % 4 === 0);
    const profile = getDifficultyProfile(lvl);

    currentGridW = profile.grid;
    currentGridH = profile.grid;

    // cellSize and snakeWidth are now managed by the UI/Resize logic
    // but we keep the globals for the worker/generation context.
    // Default values if not set by UI yet.
    if (!cellSize) {
        cellSize = 64;
        snakeWidth = Math.floor(cellSize * 0.7);
    }

    // Obstacles
    let numObstacles = profile.obstacles;

    // We try to generate until we hit a good fill rate
    let bestResult = null;
    let maxFilled = -1;

    for (let attempt = 0; attempt < 25; attempt++) { // Retry whole level if too sparse
        let currentSnakes = [];
        let currentObstacles = [];
        let occupied = new Set();

        // 1. Place Obstacles
        let obsPlaced = 0;
        let obsFails = 0;
        while (obsPlaced < numObstacles && obsFails < 100) {
            const ox = Math.floor(Math.random() * currentGridW);
            const oy = Math.floor(Math.random() * currentGridH);
            if (!occupied.has(`${ox},${oy}`)) {
                occupied.add(`${ox},${oy}`);
                currentObstacles.push({ x: ox, y: oy });
                obsPlaced++;
            } else { obsFails++; }
        }

        // 2. Fill with Snakes
        let fails = 0;
        let consecutiveFails = 0;
        // Target: leave 2-3 empty spots
        const totalCells = currentGridW * currentGridH;
        let snakeIdCounter = 0;

        while (consecutiveFails < 200) {
            if (occupied.size >= totalCells - 3) break; // Full enough

            const hx = Math.floor(Math.random() * currentGridW);
            const hy = Math.floor(Math.random() * currentGridH);

            if (occupied.has(`${hx},${hy}`)) { consecutiveFails++; continue; }

            const moveDir = Math.floor(Math.random() * 4);

            // Fast Check: Raycast just for Rock
            let rdx = DIRS[moveDir].x;
            let rdy = DIRS[moveDir].y;
            let cx = hx, cy = hy;
            let rockHit = false;
            while (cx >= 0 && cx < currentGridW && cy >= 0 && cy < currentGridH) {
                cx += rdx; cy += rdy;
                if (currentObstacles.some(o => o.x === cx && o.y === cy)) { rockHit = true; break; }
            }
            if (rockHit) { consecutiveFails++; continue; }

            // Valid Header. Now grow BODY backwards.
            let len = Math.floor(Math.random() * (profile.maxLen - profile.minLen + 1)) + profile.minLen;
            let cells = [{ x: hx, y: hy }];
            let curX = hx;
            let curY = hy;
            let backDir = (moveDir + 2) % 4;

            let validSnake = true;
            for (let l = 1; l < len; l++) {
                if (Math.random() < profile.turnChance) {
                    backDir = Math.random() > 0.5 ? (backDir + 1) % 4 : (backDir + 3) % 4;
                }
                curX += DIRS[backDir].x;
                curY += DIRS[backDir].y;

                if (curX < 0 || curX >= currentGridW || curY < 0 || curY >= currentGridH || occupied.has(`${curX},${curY}`)) { validSnake = false; break; }
                if (cells.some(c => c.x === curX && c.y === curY)) { validSnake = false; break; }

                cells.push({ x: curX, y: curY });
            }

            if (validSnake) {
                let col = isChallengeLevel ? challengeColors[snakeIdCounter % challengeColors.length] : standardColors[snakeIdCounter % standardColors.length];
                let newSnake = new Snake(snakeIdCounter, cells, moveDir, col);
                currentSnakes.push(newSnake);

                if (isSolvableGraph(currentSnakes, currentObstacles)) {
                    cells.forEach(c => occupied.add(`${c.x},${c.y}`));
                    snakeIdCounter++;
                    consecutiveFails = 0;
                } else {
                    currentSnakes.pop();
                    consecutiveFails++;
                }
            } else { consecutiveFails++; }
        }

        if (occupied.size > maxFilled) {
            maxFilled = occupied.size;
            bestResult = { snakes: currentSnakes, obstacles: currentObstacles };
        }
    }

    if (bestResult) {
        return {
            snakes: bestResult.snakes,
            obstacles: bestResult.obstacles,
            config: {
                gridW: currentGridW, gridH: currentGridH,
                isChallengeLevel: isChallengeLevel,
                moveBuffer: profile.moveBuffer
            }
        };
    }

    return {
        snakes: [new Snake(0, [{ x: 1, y: 1 }, { x: 0, y: 1 }], 1, '#fff')],
        obstacles: [],
        config: { gridW: 5, gridH: 5, cellSize: 64, snakeWidth: 44, isChallengeLevel: false, moveBuffer: 5 }
    };
}

function isSolvable(snakeList, obstacleList = []) {
    return isSolvableGraph(snakeList, obstacleList);
}
