
// Game State
let currentLevel = 1;
let movesLeft = 0;
let snakes = [];
let obstacles = [];
let particles = []; // logic.js might use this but it is defined here? Logic.js assumes global particles.
let isAnimating = false;
let isGameOver = false;
// isChallengeLevel is in logic.js global.

let animationFrameId = null;
let lastTime = 0;

// Reward System State
let playerXP = 0;
let totalSnakesRescued = 0;
let playerRank = "NOVICE";
let movesTaken = 0;
let initialSnakesCount = 0;
let currentStars = 0;

// Rendering Offsets
let renderOffsetX = 0;
let renderOffsetY = 0;

// Level Buffering System
const levelBuffer = new Map();
let levelWorker = null;

if (window.Worker) {
    levelWorker = new Worker('js/levelWorker.js');
    levelWorker.onmessage = function (e) {
        const data = e.data;
        // Store in buffer
        levelBuffer.set(data.level, data);
        // console.log(`Buffered Level ${data.level}`);
    };
}

function preloadLevels(startLevel) {
    if (!levelWorker) return;
    // Buffer next 2 levels
    for (let i = 1; i <= 3; i++) {
        const lvl = startLevel + i;
        if (!levelBuffer.has(lvl)) {
            levelWorker.postMessage({ cmd: 'generate', level: lvl });
        }
    }
}

// Logic classes are imported via logic.js, so we don't define Particle, Snake, isSolvable, or generateSolvableLevel here.
// However, generateSolvableLevel UPDATE globals in logic.js.
// We must ensure local globals match logic globals for simple access, OR just access them directly.
// Since they are vars in logic.js, they are on window object.

// Loop Control
function stopGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function startGameLoop() {
    stopGameLoop(); // Ensure no duplicates
    lastTime = Date.now(); // Reset time to avoid huge dt
    drawLoop();
}

function initLevel(lvl) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    currentLevel = lvl;
    isAnimating = false;
    isGameOver = false;
    particles = [];
    movesTaken = 0;

    let levelData;

    // Check Buffer
    if (levelBuffer.has(lvl)) {
        // console.log(`Loading Level ${lvl} from Buffer`);
        const buffered = levelBuffer.get(lvl);

        // Rehydrate Snakes
        levelData = {
            snakes: buffered.snakes.map(s => new Snake(s.id, s.cells, s.dirIndex, s.color)),
            obstacles: buffered.obstacles
        };

        // Apply Config from Buffer
        currentGridW = buffered.config.gridW;
        currentGridH = buffered.config.gridH;
        // cellSize and snakeWidth will be recalculated by calculateLayout/resize based on screen size
        // We do NOT trust the buffered static size for rendering, only for logic 'defaults'
        isChallengeLevel = buffered.config.isChallengeLevel;

        // Remove from buffer to save memory? Or keep for retry?
        // Keep for retry is good, but if we retry we typically call initLevel again.
        // Let's keep it.
    } else {
        // Sync Generation (Fallback)
        // console.log(`Generating Level ${lvl} Sync`);
        // generateSolvableLevel is now in logic.js. It assumes globals are set there.
        // It returns {snakes, obstacles, config}.
        const result = generateSolvableLevel(lvl);
        levelData = { snakes: result.snakes, obstacles: result.obstacles };

        // Globals in logic.js are updated by generateSolvableLevel locally so no need to manual set?
        // Wait, logic.js 'var' globals are window scoped.
        // Yes, generateSolvableLevel updates them.
    }

    snakes = levelData.snakes;
    obstacles = levelData.obstacles;
    initialSnakesCount = snakes.length;

    // Trigger Preload for next levels
    preloadLevels(lvl);

    // UI updates that are needed immediately
    const mainBody = document.getElementById('main-body');
    const gameTitle = document.getElementById('game-title');
    const messageBox = document.getElementById('message-box');

    // isChallengeLevel is already set globally by logic.js or buffer apply

    if (isChallengeLevel) {
        if (mainBody) mainBody.classList.add('challenge-mode');
        if (gameTitle) {
            gameTitle.innerText = "CHALLENGE LEVEL";
            gameTitle.className = "text-4xl font-black mb-1 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse";
        }
    } else {
        if (mainBody) mainBody.classList.remove('challenge-mode');
        if (gameTitle) {
            gameTitle.innerText = "SNAKE ESCAPE";
            gameTitle.className = "text-4xl font-black mb-1 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500";
        }
    }

    // Strict Move Limit: Snakes + 2 extra moves
    movesLeft = snakes.length + 2;

    // Debug Display
    if (gameTitle) {
        gameTitle.innerText += ` (S:${snakes.length} M:${movesLeft})`;
    }

    if (typeof updateUI === 'function') updateUI();
    if (messageBox) messageBox.style.display = 'none';
    if (typeof updateUI === 'function') updateUI();
    if (messageBox) messageBox.style.display = 'none';

    // Explicitly call resize to ensure layout is correct before first draw
    resize();
}

// Game Loop and Rendering Logic Below

// Board Configurations
const BOARD_CONFIGS = {
    classic: { bg: 'transparent', grid: 'rgba(255,255,255,0.04)', obstacle: '#475569', obstacleInner: '#64748b' },
    magic: { bg: 'rgba(76, 29, 149, 0.1)', grid: 'rgba(139, 92, 246, 0.15)', obstacle: '#312e81', obstacleInner: '#4338ca' },
    crystal: { bg: 'rgba(8, 145, 178, 0.1)', grid: 'rgba(34, 211, 238, 0.15)', obstacle: '#155e75', obstacleInner: '#0e7490' },
    dark: { bg: 'rgba(15, 23, 42, 0.5)', grid: 'rgba(249, 115, 22, 0.1)', obstacle: '#1e293b', obstacleInner: '#334155' },
    grass: { bg: '#5eb326', cell: '#73cc2c', grid: '#2d4d12', obstacle: '#14532d', obstacleInner: '#166534' }
};

function drawLoop() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const currentBoard = Economy.getSelectedBoard();
    const theme = BOARD_CONFIGS[currentBoard] || BOARD_CONFIGS.classic;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check if particles is array (it's initialized in initLevel)
    if (Array.isArray(particles)) {
        particles.forEach((p, i) => {
            p.update(); p.draw(ctx);
            if (p.alpha <= 0) particles.splice(i, 1);
        });
    }

    ctx.save();
    ctx.translate(renderOffsetX, renderOffsetY);

    // Draw Board Background / Tiles
    if (theme.bg && theme.bg !== 'transparent') {
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, currentGridW * cellSize, currentGridH * cellSize);
    }

    // Draw Individual Cells if variation is needed
    if (currentBoard === 'grass') {
        for (let x = 0; x < currentGridW; x++) {
            for (let y = 0; y < currentGridH; y++) {
                // Checkerboard Logic
                ctx.fillStyle = (x + y) % 2 === 0 ? theme.cell : theme.bg;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                // Add "Mossy" texture details to tiles
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                const dotSize = cellSize * 0.1;
                if ((x * 123 + y * 456) % 5 === 0) {
                    ctx.beginPath();
                    ctx.roundRect(x * cellSize + cellSize * 0.2, y * cellSize + cellSize * 0.2, dotSize * 2, dotSize * 2, 4);
                    ctx.fill();
                }
                if ((x * 456 + y * 789) % 7 === 0) {
                    ctx.beginPath();
                    ctx.roundRect(x * cellSize + cellSize * 0.6, y * cellSize + cellSize * 0.7, dotSize * 3, dotSize * 1.5, 3);
                    ctx.fill();
                }

                // Inner highlight for glass tile effect
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(x * cellSize + 2, y * cellSize + 2, cellSize - 4, cellSize - 4);
            }
        }

        // Draw Corner Foliage
        drawFoliage(ctx, 0, 0, 'top-left');
        drawFoliage(ctx, currentGridW * cellSize, 0, 'top-right');
        drawFoliage(ctx, 0, currentGridH * cellSize, 'bottom-left');
        drawFoliage(ctx, currentGridW * cellSize, currentGridH * cellSize, 'bottom-right');

    } else if (theme.bg && theme.bg !== 'transparent') {
        // Fallback for other themed boards if needed
    }

    // Draw Grid Lines (Soil/Themed lines)
    ctx.strokeStyle = isChallengeLevel ? 'rgba(249, 212, 35, 0.08)' : theme.grid;
    ctx.lineWidth = currentBoard === 'grass' ? 2 : 1;
    for (let x = 0; x <= currentGridW; x++) {
        ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, currentGridH * cellSize); ctx.stroke();
    }
    for (let y = 0; y <= currentGridH; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(currentGridW * cellSize, y * cellSize); ctx.stroke();
    }

    // Draw Obstacles
    obstacles.forEach(obs => {
        const ox = obs.x * cellSize + cellSize * 0.1;
        const oy = obs.y * cellSize + cellSize * 0.1;
        const os = cellSize * 0.8;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'black';
        ctx.fillStyle = theme.obstacle;
        ctx.beginPath();
        // Rounded rect for rock
        ctx.roundRect(ox, oy, os, os, 8);
        ctx.fill();

        // Detail (highlight)
        ctx.fillStyle = theme.obstacleInner;
        ctx.beginPath();
        ctx.roundRect(ox + os * 0.1, oy + os * 0.1, os * 0.8, os * 0.8, 6);
        ctx.fill();
        ctx.restore();
    });

    snakes.forEach(s => s.draw(ctx));

    if (isAnimating) {
        let moving = false;
        snakes.forEach(s => {
            if (s.status === 'moving') {
                s.progress += (cellSize * 0.45);
                if (s.progress > 2000) {
                    s.explode(renderOffsetX, renderOffsetY);
                    if (s.status !== 'gone') {
                        // Sound removed per user request
                    }
                    s.status = 'gone';
                } else moving = true;
            }
        });
        if (!moving) { isAnimating = false; checkWinOrLoss(); }
    }
    ctx.restore();
    animationFrameId = requestAnimationFrame(drawLoop);
}

function drawFoliage(ctx, cx, cy, position) {
    ctx.save();
    ctx.translate(cx, cy);

    // Rotation based on corner
    if (position === 'top-right') ctx.rotate(Math.PI / 2);
    if (position === 'bottom-right') ctx.rotate(Math.PI);
    if (position === 'bottom-left') ctx.rotate(-Math.PI / 2);

    const leafColor = '#166534';
    const leafHighlight = '#22c55e';
    const berryColor = '#a3e635';

    // Draw stylized leaves
    ctx.fillStyle = leafColor;
    ctx.strokeStyle = '#064e3b';
    ctx.lineWidth = 2;

    // Main Leaf 1
    ctx.beginPath();
    ctx.ellipse(20, 20, 30, 15, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Main Leaf 2
    ctx.beginPath();
    ctx.ellipse(15, 45, 25, 12, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Leaf Highlights
    ctx.fillStyle = leafHighlight;
    ctx.beginPath();
    ctx.ellipse(15, 15, 10, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Berries / Nodes (high fidelity detail from reference)
    ctx.fillStyle = berryColor;
    ctx.beginPath(); ctx.arc(10, 10, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(22, 5, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(5, 22, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.restore();
}


// Reward Functions
function calculateRewards() {
    // Star Calculation
    if (movesTaken <= initialSnakesCount) currentStars = 3;
    else if (movesTaken <= initialSnakesCount + 1) currentStars = 2;
    else currentStars = 1;

    // XP Calculation
    let baseXP = currentStars * 100;
    if (isChallengeLevel) baseXP *= 4; // Massive boost for challenge

    playerXP += baseXP;
    totalSnakesRescued += initialSnakesCount;


    // Rank Update
    let newRank = playerRank;
    for (let r of RANK_TITLES) {
        if (totalSnakesRescued >= r.count) newRank = r.title;
    }
    playerRank = newRank;

    saveProgress(); // Save after calculating rewards
    return { stars: currentStars, xpGained: baseXP };
}

function saveProgress() {
    const saveData = {
        currentLevel: currentLevel + 1, // Save the NEXT level as current
        playerXP: playerXP,
        totalSnakesRescued: totalSnakesRescued,
        playerRank: playerRank
    };
    localStorage.setItem('snakeEscape_save', JSON.stringify(saveData));
}

function loadProgress() {
    const saved = localStorage.getItem('snakeEscape_save');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.currentLevel) currentLevel = data.currentLevel;
        if (data.playerXP) playerXP = data.playerXP;
        if (data.totalSnakesRescued) totalSnakesRescued = data.totalSnakesRescued;
        if (data.playerRank) playerRank = data.playerRank;
    }
}

function checkWinOrLoss() {
    if (snakes.every(s => s.status === 'gone')) {
        const rewards = calculateRewards();
        const msg = isChallengeLevel ? "CHALLENGE MASTERED!" : "LEVEL COMPLETE!";
        if (typeof audioManager !== 'undefined') audioManager.playWin();
        showEndScreen(msg, "CONTINUE", () => {
            Ads.showInterstitial();
            initLevel(currentLevel + 1);
            startGameLoop();
        }, true, false, rewards);
    } else if (movesLeft <= 0 && !isAnimating) {
        isGameOver = true;
        const msg = isChallengeLevel ? "CHALLENGE FAILED" : "BLOCKED!";
        if (typeof audioManager !== 'undefined') audioManager.playLose();
        showEndScreen(msg, "RETRY CHALLENGE", () => {
            Ads.showInterstitial();
            initLevel(currentLevel);
            startGameLoop();
        }, false, true, null);
    }
}

// Load progress immediately on startup
loadProgress();
