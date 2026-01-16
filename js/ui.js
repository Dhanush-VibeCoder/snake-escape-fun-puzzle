
// UI Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const actionButtons = document.getElementById('action-buttons');
const levelDisplay = document.getElementById('level-display');
const movesDisplay = document.getElementById('moves-display');
const movesBadge = document.getElementById('moves-badge');
const gameTitle = document.getElementById('game-title');
const mainBody = document.getElementById('main-body');

// Update UI elements
function updateUI() {
    levelDisplay.innerText = isChallengeLevel ? `CHALLENGE ${currentLevel / 4}` : `LVL ${currentLevel}`;
    movesDisplay.innerText = movesLeft;
    movesBadge.classList.toggle('pulse-red', movesLeft <= (isChallengeLevel ? 2 : 1));
    movesBadge.style.borderColor = isChallengeLevel ? '#f9d423' : '#e94560';
}

// Confetti Canvas
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');

// Handle window resize
function resize() {
    if (!canvas) return;

    // 1. Determine available space (Safe Area)
    // We reserve room for the top UI (Logo/Level/Moves) and some bottom padding
    const topUIHeight = 130;
    const bottomPadding = 40;

    // Available width with a slight side margin
    const availableW = window.innerWidth * 0.94;
    // Available height is the space between top UI and bottom
    const availableH = window.innerHeight - topUIHeight - bottomPadding;

    // 2. Calculate optimal cellSize for the current grid
    // Use target dimensions from logic.js globals
    const targetCellW = availableW / currentGridW;
    const targetCellH = availableH / currentGridH;

    // Pick the smaller one to fit both dimensions
    cellSize = Math.min(targetCellW, targetCellH);

    // Clamp to reasonable limits for a good look
    cellSize = Math.min(cellSize, 85); // Max size for giant screens
    cellSize = Math.max(cellSize, 24); // Min size to stay playable

    // Update snakeWidth proportionally
    // This is used by all drawing logic in logic.js
    snakeWidth = cellSize * 0.7;

    // 3. Set Canvas dimensions (Fit Grid + small shadow/overflow buffer)
    const margin = 10;
    canvas.width = (currentGridW * cellSize) + (margin * 2);
    canvas.height = (currentGridH * cellSize) + (margin * 2);

    // Centering offsets for drawing inside the canvas
    renderOffsetX = margin;
    renderOffsetY = margin;

    // 4. Position the Canvas
    // Since #game-container is flex-centered, the default top is (innerHeight - canvas.height)/2.
    // We want the top to be at least topUIHeight.
    const defaultTop = (window.innerHeight - canvas.height) / 2;
    const neededTop = topUIHeight;

    if (defaultTop < neededTop) {
        const diff = neededTop - defaultTop;
        canvas.style.marginTop = `${diff}px`;
    } else {
        canvas.style.marginTop = '0';
    }

    // 5. Resize Confetti Canvas to full screen
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
}

// Handle user input
function handleInput(e) {
    if (isAnimating || isGameOver) return;
    if (e.type === 'touchstart') e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.clientX || (e.touches && e.touches[0].clientX));
    const clientY = (e.clientY || (e.touches && e.touches[0].clientY));
    const scale = canvas.width / rect.width;
    const x = (clientX - rect.left) * scale - renderOffsetX;
    const y = (clientY - rect.top) * scale - renderOffsetY;

    for (let s of snakes) {
        if (s.isPointInside(x, y)) {
            if (!s.isBlocked(snakes, obstacles)) {
                movesLeft--;
                movesTaken++;
                s.status = 'moving';
                isAnimating = true;
                if (typeof audioManager !== 'undefined') {
                    audioManager.playWhoosh();
                    // Optional: keep the pip if you want a layered sound, 
                    // or replace it. User asked for whoosh, so let's use whoosh.
                }
            } else {
                movesLeft--;
                movesTaken++;
                s.shake();
                if (typeof audioManager !== 'undefined') audioManager.playError();
                if (movesLeft <= 0) checkWinOrLoss();
            }
            updateUI();
            break;
        }
    }
}

// Confetti Logic
const confettiParticles = [];
function createConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: confettiCanvas.width / 2,
            y: confettiCanvas.height / 2,
            vx: (Math.random() - 0.5) * 15, // Wider spread
            vy: (Math.random() - 0.5) * 15 - 8, // Higher up
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            size: Math.random() * 6 + 3,
            life: 150,
            rotation: Math.random() * 360,
            vRotation: (Math.random() - 0.5) * 10
        });
    }
}

function updateConfetti() {
    if (confettiParticles.length > 0) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        confettiParticles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // Gravity
            p.life--;
            p.rotation += p.vRotation;

            confettiCtx.save();
            confettiCtx.translate(p.x, p.y);
            confettiCtx.rotate(p.rotation * Math.PI / 180);
            confettiCtx.fillStyle = p.color;
            confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            confettiCtx.restore();

            if (p.life <= 0) confettiParticles.splice(i, 1);
        });

        if (confettiParticles.length > 0) requestAnimationFrame(updateConfetti);
        else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

// 3D Tilt Logic
// 3D Tilt Logic
function handleTilt(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Limits
    const max = 10;
    const rotateX = ((y - centerY) / centerY) * -max;
    const rotateY = ((x - centerX) / centerX) * max;

    el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
}

function resetTilt(e) {
    e.currentTarget.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
}

function showEndScreen(text, primaryBtnText, primaryFn, isWin, canWatchAd = false, rewards = null) {
    // Clear previous
    messageText.innerHTML = '';
    const oldRewards = messageBox.querySelector('.reward-ui');
    if (oldRewards) oldRewards.remove();
    // Also remove any old icons if re-opening
    const oldIcons = messageBox.querySelectorAll('.flex.justify-center.mb-6');
    oldIcons.forEach(el => el.remove());

    // Animated Text
    const words = text.split(" ");
    words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = "inline-block mr-2";
        word.split("").forEach((char, charIndex) => {
            const span = document.createElement('span');
            span.innerText = char;
            span.className = "inline-block opacity-0 translate-y-4 animate-char-reveal";
            span.style.animationDelay = `${(wordIndex * 0.2) + (charIndex * 0.05)}s`;
            span.style.animationFillMode = "forwards";
            wordSpan.appendChild(span);
        });
        messageText.appendChild(wordSpan);
    });

    if (isWin) {
        messageText.className = isChallengeLevel ? "text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 drop-shadow-sm uppercase tracking-tighter" : "text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-500 drop-shadow-sm uppercase tracking-tighter";

        // Add Win Image
        const winDiv = document.createElement('div');
        winDiv.className = "flex justify-center mb-6";
        winDiv.innerHTML = `
            <div class="w-32 h-32 bg-emerald-500/10 rounded-full flex items-center justify-center ring-2 ring-emerald-500/30 overflow-hidden shadow-lg shadow-emerald-500/20">
                <img src="js/assets/images/win-img.jpg" class="w-full h-full object-cover" alt="Victory">
            </div>
        `;
        messageText.after(winDiv);

        createConfetti();
        updateConfetti();
        messageBox.classList.remove('animate-shake'); // Ensure no shake on win
    } else {
        messageText.className = "text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600 drop-shadow-sm uppercase tracking-tighter";

        // Add Loss Image
        const iconDiv = document.createElement('div');
        iconDiv.className = "flex justify-center mb-6";
        iconDiv.innerHTML = `
            <div class="w-32 h-32 bg-rose-500/10 rounded-full flex items-center justify-center ring-1 ring-rose-500/30 overflow-hidden">
                <img src="js/assets/images/loss-image.png" class="w-full h-full object-cover" alt="Game Over">
            </div>
        `;
        messageText.after(iconDiv);

        messageBox.classList.add('animate-shake');
    }

    // Reward UI
    const rewardContainer = document.createElement('div');
    if (isWin && rewards) {
        // Stars
        const starContainer = document.createElement('div');
        starContainer.className = "flex justify-center gap-3 mb-6";
        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('div');
            star.className = `star w-16 h-16 ${i <= rewards.stars ? 'active' : 'inactive'}`; // Larger stars
            star.style.animationDelay = `${0.5 + (i * 0.2)}s`;
            starContainer.appendChild(star);
        }
        rewardContainer.appendChild(starContainer);

        // XP Bar
        const xpContainer = document.createElement('div');
        xpContainer.className = "w-full max-w-[240px] mx-auto mb-4 bg-slate-900/50 rounded-full h-3 relative overflow-hidden ring-1 ring-white/10 shadow-inner";
        const xpFill = document.createElement('div');
        xpFill.className = "h-full bg-gradient-to-r from-blue-400 to-violet-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(139,92,246,0.5)]";
        xpFill.style.width = "0%";
        setTimeout(() => xpFill.style.width = "100%", 800);
        xpContainer.appendChild(xpFill);
        rewardContainer.appendChild(xpContainer);

        // Rank Title
        const rankText = document.createElement('div');
        rankText.className = "text-center text-xs font-bold text-slate-400 mb-8 uppercase tracking-widest";
        rankText.innerHTML = `Rank: <span class="text-white drop-shadow-md">${playerRank}</span> <span class="text-xs text-emerald-400 ml-2 animate-pulse">+${rewards.xpGained} XP</span>`;
        rewardContainer.appendChild(rankText);
    }

    actionButtons.innerHTML = '';

    rewardContainer.classList.add('reward-ui');
    messageText.after(rewardContainer);

    const mainBtn = document.createElement('button');
    mainBtn.className = isWin ?
        (isChallengeLevel ? "btn btn-gold animate-glow tex-scales tex-glow w-full" : "btn btn-emerald animate-glow tex-scales tex-glow w-full") :
        "btn btn-red tex-scales w-full";
    mainBtn.innerText = primaryBtnText;
    mainBtn.id = "main-action-btn";
    mainBtn.onclick = primaryFn;
    actionButtons.appendChild(mainBtn);

    if (canWatchAd) {
        const adBtn = document.createElement('button');
        adBtn.className = "btn btn-blue animate-glow tex-skin tex-glow w-full mt-6";
        adBtn.innerHTML = "<span>📺 RESCUE (+3 MOVES)</span>";
        adBtn.onclick = () => {
            Ads.showRewarded(() => {
                // Success: grant moves
                movesLeft += 3;
                isGameOver = false;
                messageBox.style.display = 'none';
                updateUI();
                resetTilt({ currentTarget: messageBox });
            }, () => {
                // Failure: maybe show a message?
                console.log("Ad failed or was skipped.");
            });
        };
        actionButtons.appendChild(adBtn);
    }

    // Show and Animate Box
    messageBox.style.display = 'block';
    messageBox.style.opacity = '0';

    // Use scale animation unless standard shake overrides it visually (shake is transform based too)
    // We can combine or just use simple fade in for Game Over + shake

    if (isWin) {
        messageBox.style.transform = 'scale(0.9) translateY(20px)';
        // Force reflow
        void messageBox.offsetWidth;
        messageBox.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        messageBox.style.opacity = '1';
        messageBox.style.transform = 'scale(1) translateY(0)';
    } else {
        // For game over, just fade in effectively, the shake class handles the movement
        messageBox.style.transform = 'scale(1)';
        messageBox.style.transition = 'opacity 0.2s ease-out';
        requestAnimationFrame(() => {
            messageBox.style.opacity = '1';
        });
    }

    // Attach Tilt Events
    if (!isMobileDevice()) {
        messageBox.addEventListener('mousemove', handleTilt);
        messageBox.addEventListener('mouseleave', resetTilt);
    }
}

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
}

// Load privacy policy content
function loadPrivacyPolicy() {
    fetch('privacy-policy.md')
        .then(response => response.text())
        .then(text => {
            document.getElementById('privacy-policy-content').innerHTML = marked.parse(text);
        })
        .catch(error => {
            console.error('Error loading privacy policy:', error);
            document.getElementById('privacy-policy-content').innerHTML = 
                '<p>Could not load privacy policy. Please try again later.</p>';
        });
}

// Show privacy policy
function showPrivacyPolicy() {
    const overlay = document.getElementById('privacy-policy-overlay');
    const content = document.getElementById('privacy-policy-content');
    
    // Load content if not already loaded
    if (!content.hasChildNodes()) {
        loadPrivacyPolicy();
    }
    
    // Show overlay with animation
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        document.querySelector('#privacy-policy-overlay .relative').style.transform = 'scale(1)';
    }, 10);
}

// Hide privacy policy
function hidePrivacyPolicy() {
    const overlay = document.getElementById('privacy-policy-overlay');
    overlay.style.opacity = '0';
    document.querySelector('#privacy-policy-overlay .relative').style.transform = 'scale(0.95)';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
}

// Hide settings overlay
function hideSettings() {
    const settingsOverlay = document.getElementById('settings-overlay');
    settingsOverlay.style.opacity = '0';
    settingsOverlay.querySelector('#settings-card').style.transform = 'scale(0.95)';
    setTimeout(() => {
        settingsOverlay.style.display = 'none';
    }, 300);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Privacy policy button in settings
    const privacyPolicyBtn = document.getElementById('privacy-policy-btn');
    if (privacyPolicyBtn) {
        privacyPolicyBtn.addEventListener('click', () => {
            if (typeof audioManager !== 'undefined') audioManager.playUI();
            hideSettings();
            showPrivacyPolicy();
        });
    }

    // Close privacy policy button
    const closePrivacyPolicyBtn = document.getElementById('close-privacy-policy');
    if (closePrivacyPolicyBtn) {
        closePrivacyPolicyBtn.addEventListener('click', hidePrivacyPolicy);
    }

    // Close when clicking outside content
    const privacyPolicyBg = document.getElementById('privacy-policy-bg');
    if (privacyPolicyBg) {
        privacyPolicyBg.addEventListener('click', hidePrivacyPolicy);
    }
});

window.addEventListener('resize', resize);
canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

const homeScreen = document.getElementById('home-screen');
const homeLevelIndicator = document.getElementById('home-level-indicator');
const playBtn = document.getElementById('play-btn');
const homeBtn = document.getElementById('home-btn');

// New Stat Elements
const homeRank = document.getElementById('home-rank');
const homeXpVal = document.getElementById('home-xp-val');
const homeXpBar = document.getElementById('home-xp-bar');
const homeSnakesTotal = document.getElementById('home-snakes-total');

// Tutorial Elements
const tutorialOverlay = document.getElementById('tutorial-overlay');
const tutorialBtn = document.getElementById('tutorial-btn');
const tutorialCard = document.getElementById('tutorial-card');

function showTutorial() {
    audioManager.playUI();
    tutorialOverlay.classList.remove('hidden');
    // Small delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        tutorialOverlay.classList.remove('opacity-0');
        tutorialCard.classList.remove('scale-95');
        tutorialCard.classList.add('scale-100');
    }, 10);
}

function hideTutorial() {
    tutorialOverlay.classList.add('opacity-0');
    tutorialCard.classList.remove('scale-100');
    tutorialCard.classList.add('scale-95');
    setTimeout(() => {
        tutorialOverlay.classList.add('hidden');
    }, 500);
    localStorage.setItem('snakeEscape_tutorial_seen', 'true');
}

tutorialBtn.addEventListener('click', hideTutorial);

const helpBtn = document.getElementById('help-btn');
if (helpBtn) {
    helpBtn.addEventListener('click', showTutorial);
}

playBtn.addEventListener('click', () => {
    audioManager.init(); // Initialize audio context on user interaction
    audioManager.playUI();

    homeScreen.style.opacity = '0';
    setTimeout(() => {
        homeScreen.style.display = 'none';

        // Show game-screen elements
        const homeBtnEl = document.getElementById('home-btn');
        const helpBtnEl = document.getElementById('help-btn');
        const gameUIOverlay = document.querySelector('.ui-overlay');

        if (homeBtnEl) homeBtnEl.style.display = 'block';
        if (helpBtnEl) helpBtnEl.style.display = 'block';
        if (gameUIOverlay) gameUIOverlay.style.visibility = 'visible';

        // Resume if snakes exist and game isn't over/won
        if (snakes && snakes.length > 0 && !isGameOver && movesLeft > 0) {
            startGameLoop();
        } else {
            // Start fresh level
            initLevel(currentLevel);
            startGameLoop();
        }
    }, 400);
});

homeBtn.addEventListener('click', () => {
    // Pause the game when going to home
    if (typeof stopGameLoop === 'function') stopGameLoop();
    if (typeof audioManager !== 'undefined') audioManager.playScreenShift();
    showHomeScreen();
});

function showHomeScreen() {
    homeScreen.style.display = 'flex';
    homeLevelIndicator.innerText = `LEVEL ${currentLevel}`;

    // Update Stats
    if (homeRank) homeRank.innerText = playerRank;
    if (homeXpVal) homeXpVal.innerText = playerXP.toLocaleString();
    if (homeSnakesTotal) homeSnakesTotal.innerText = totalSnakesRescued;

    // Simple XP Bar visual (just for show, filling based on mod 1000 or similar could be added later)
    // For now, let's just make it full or partial to look alive.
    if (homeXpBar) {
        homeXpBar.style.width = '0%';
        setTimeout(() => homeXpBar.style.width = '60%', 200); // Dummy fill animation
    }

    // Force reflow/opacity for fade in
    setTimeout(() => {
        homeScreen.style.opacity = '1';
    }, 10);

    // Hide game-screen only elements
    const homeBtnEl = document.getElementById('home-btn');
    const helpBtnEl = document.getElementById('help-btn');
    const gameUIOverlay = document.querySelector('.ui-overlay');

    if (homeBtnEl) homeBtnEl.style.display = 'none';
    if (helpBtnEl) helpBtnEl.style.display = 'none';
    if (gameUIOverlay) gameUIOverlay.style.visibility = 'hidden';

    resize();
    updateEconomyUI();
}

// Daily Check-In & Board Gallery Logic
let rewardOverlay, rewardModal, collectRewardBtn, rewardStatusMsg, diamondDisplay, boardGallery;
let shopOverlay, shopModal, shopDiamondDisplay;

function updateEconomyUI() {
    if (!diamondDisplay) diamondDisplay = document.getElementById('diamond-count-display');
    if (!boardGallery) boardGallery = document.getElementById('board-gallery');
    if (!document.getElementById('bg-gallery')) return; // Check if bg gallery exists

    const bgGalleryEl = document.getElementById('bg-gallery');
    if (!collectRewardBtn) collectRewardBtn = document.getElementById('collect-reward-btn');
    if (!rewardStatusMsg) rewardStatusMsg = document.getElementById('reward-status-msg');
    if (!shopDiamondDisplay) shopDiamondDisplay = document.getElementById('shop-diamond-count');

    if (diamondDisplay) diamondDisplay.innerText = Economy.getDiamonds();
    if (shopDiamondDisplay) shopDiamondDisplay.innerText = Economy.getDiamonds();

    // Update Reward Button
    if (Economy.canCheckIn()) {
        collectRewardBtn.classList.remove('opacity-50', 'pointer-events-none');
        rewardStatusMsg.classList.add('hidden');
        collectRewardBtn.querySelector('span').innerText = 'COLLECT 1 💎';
    } else {
        collectRewardBtn.classList.add('opacity-50', 'pointer-events-none');
        rewardStatusMsg.classList.remove('hidden');
        collectRewardBtn.querySelector('span').innerText = 'COLLECTED';
    }

    // Update Board Gallery
    const boards = document.querySelectorAll('.board-card');
    const unlocked = Economy.getUnlockedBoards();
    const selected = Economy.getSelectedBoard();

    boards.forEach(card => {
        const boardId = card.dataset.board;
        card.classList.toggle('active', boardId === selected);

        if (unlocked.includes(boardId)) {
            card.classList.remove('locked');
            const lockOverlay = card.querySelector('.board-lock-overlay');
            if (lockOverlay) lockOverlay.style.display = 'none';
        } else {
            card.classList.add('locked');
        }
    });

    // Update BG Gallery
    const bgs = document.querySelectorAll('.bg-card');
    const unlockedBGs = Economy.getUnlockedBGs();
    const selectedBG = Economy.getSelectedBG();

    bgs.forEach(card => {
        const bgId = card.dataset.bg;
        card.classList.toggle('active', bgId === selectedBG);

        if (unlockedBGs.includes(bgId)) {
            card.classList.remove('locked');
            const lockOverlay = card.querySelector('.bg-lock-overlay');
            if (lockOverlay) lockOverlay.style.display = 'none';
        } else {
            card.classList.add('locked');
        }
    });

    // Update Skin Gallery
    const skins = document.querySelectorAll('.skin-card');
    const unlockedSkins = Economy.getUnlockedSkins();
    const selectedSkin = Economy.getSelectedSkin();

    skins.forEach(card => {
        const skinId = card.dataset.skin;
        card.classList.toggle('active', skinId === selectedSkin);

        if (unlockedSkins.includes(skinId)) {
            card.classList.remove('locked');
            const lockOverlay = card.querySelector('.skin-lock-overlay');
            if (lockOverlay) lockOverlay.style.display = 'none';
        } else {
            card.classList.add('locked');
        }
    });

    applySelectedBackground();
}

function applySelectedBackground() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const selectedBG = Economy.getSelectedBG();
    // Remove all possible bg classes
    container.classList.remove('bg-classic', 'bg-space', 'bg-garden', 'bg-crystal');
    // Add the selected one
    container.classList.add(`bg-${selectedBG}`);
}

function openRewardOverlay() {
    console.log("Opening Reward Overlay...");
    if (!rewardOverlay) rewardOverlay = document.getElementById('reward-overlay');
    if (!rewardModal) rewardModal = document.getElementById('reward-modal');
    if (typeof audioManager !== 'undefined') audioManager.playUI();

    if (rewardOverlay) {
        rewardOverlay.classList.remove('hidden');
        rewardOverlay.style.display = 'flex'; // Ensure flex is applied manually if Tailwind conflicts
        setTimeout(() => {
            rewardOverlay.classList.add('show');
            rewardModal.classList.add('scale-100');
            rewardModal.classList.remove('scale-90');
        }, 10);
    }
    updateEconomyUI();
}
window.openRewardOverlay = openRewardOverlay;

function closeRewardOverlay() {
    if (!rewardOverlay) rewardOverlay = document.getElementById('reward-overlay');
    if (!rewardModal) rewardModal = document.getElementById('reward-modal');
    if (rewardOverlay) rewardOverlay.classList.remove('show');
    if (rewardModal) {
        rewardModal.classList.remove('scale-100');
        rewardModal.classList.add('scale-90');
    }
    setTimeout(() => {
        if (rewardOverlay) {
            rewardOverlay.classList.add('hidden');
            rewardOverlay.style.display = 'none';
        }
    }, 300);
}
window.closeRewardOverlay = closeRewardOverlay;

function openShop() {
    if (!shopOverlay) shopOverlay = document.getElementById('shop-overlay');
    if (!shopModal) shopModal = document.getElementById('shop-modal');
    if (typeof audioManager !== 'undefined') audioManager.playUI();

    if (shopOverlay) {
        shopOverlay.classList.remove('hidden');
        shopOverlay.style.display = 'flex';
        setTimeout(() => {
            shopOverlay.classList.add('show');
            shopModal.classList.add('scale-100');
            shopModal.classList.remove('scale-90');
        }, 10);
    }
    updateEconomyUI();
}
window.openShop = openShop;

function closeShop() {
    if (!shopOverlay) shopOverlay = document.getElementById('shop-overlay');
    if (!shopModal) shopModal = document.getElementById('shop-modal');
    if (shopOverlay) shopOverlay.classList.remove('show');
    if (shopModal) {
        shopModal.classList.remove('scale-100');
        shopModal.classList.add('scale-90');
    }
    setTimeout(() => {
        if (shopOverlay) {
            shopOverlay.classList.add('hidden');
            shopOverlay.style.display = 'none';
        }
    }, 300);
}
window.closeShop = closeShop;

// Attach Economy Event Listeners
function initEconomyUI() {
    const dailyCheckinBtn = document.getElementById('daily-checkin-btn');
    const rewardBg = document.getElementById('reward-bg');
    const collectBtn = document.getElementById('collect-reward-btn');
    const gallery = document.getElementById('board-gallery');

    if (dailyCheckinBtn) dailyCheckinBtn.addEventListener('click', openRewardOverlay);
    if (rewardBg) rewardBg.addEventListener('click', closeRewardOverlay);

    if (collectBtn) {
        collectBtn.addEventListener('click', () => {
            if (Economy.claimDailyReward()) {
                if (typeof audioManager !== 'undefined') audioManager.playWin();
                updateEconomyUI();
                setTimeout(closeRewardOverlay, 800);
            }
        });
    }

    if (gallery) {
        gallery.addEventListener('click', (e) => {
            const card = e.target.closest('.board-card');
            if (!card) return;

            const boardId = card.dataset.board;
            if (Economy.isBoardUnlocked(boardId)) {
                Economy.selectBoard(boardId);
                if (typeof audioManager !== 'undefined') audioManager.playUI();
                updateEconomyUI();
            } else {
                const price = parseInt(card.dataset.price);
                if (Economy.getDiamonds() >= price) {
                    if (confirm(`Unlock ${boardId} board for ${price} diamonds?`)) {
                        if (Economy.unlockBoard(boardId, price)) {
                            if (typeof audioManager !== 'undefined') audioManager.playWin();
                            Economy.selectBoard(boardId);
                            updateEconomyUI();
                        }
                    }
                } else {
                    alert("Not enough diamonds! Come back tomorrow for more.");
                }
            }
        });
    }

    const bgGallery = document.getElementById('bg-gallery');
    if (bgGallery) {
        bgGallery.addEventListener('click', (e) => {
            const card = e.target.closest('.bg-card');
            if (!card) return;

            const bgId = card.dataset.bg;
            if (Economy.isBGUnlocked(bgId)) {
                Economy.selectBG(bgId);
                if (typeof audioManager !== 'undefined') audioManager.playUI();
                updateEconomyUI();
            } else {
                const price = parseInt(card.dataset.price);
                if (Economy.getDiamonds() >= price) {
                    const bgName = card.querySelector('.bg-name').innerText;
                    if (confirm(`Unlock ${bgName} background for ${price} diamonds?`)) {
                        if (Economy.unlockBG(bgId, price)) {
                            if (typeof audioManager !== 'undefined') audioManager.playWin();
                            Economy.selectBG(bgId);
                            updateEconomyUI();
                        }
                    }
                } else {
                    alert("Not enough diamonds! Come back tomorrow for more.");
                }
            }
        });
    }

    const skinGallery = document.getElementById('skin-gallery');
    if (skinGallery) {
        skinGallery.addEventListener('click', (e) => {
            const card = e.target.closest('.skin-card');
            if (!card) return;

            const skinId = card.dataset.skin;
            if (Economy.isSkinUnlocked(skinId)) {
                Economy.selectSkin(skinId);
                if (typeof audioManager !== 'undefined') audioManager.playUI();
                updateEconomyUI();
            } else {
                const price = parseInt(card.dataset.price);
                if (Economy.getDiamonds() >= price) {
                    const skinName = card.querySelector('.skin-name').innerText;
                    if (confirm(`Unlock ${skinName} for ${price} diamonds?`)) {
                        if (Economy.unlockSkin(skinId, price)) {
                            if (typeof audioManager !== 'undefined') audioManager.playWin();
                            Economy.selectSkin(skinId);
                            updateEconomyUI();
                        }
                    }
                } else {
                    alert("Not enough diamonds! Come back tomorrow for more.");
                }
            }
        });
    }
}

// Settings Logic
const settingsBtn = document.getElementById('settings-btn');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsCard = document.getElementById('settings-card');
const closeSettingsBtn = document.getElementById('close-settings');
const toggleSoundBtn = document.getElementById('toggle-sound');
const toggleHapticsBtn = document.getElementById('toggle-haptics');

let hapticsEnabled = true; // Default

function updateToggleUI(btn, state) {
    const knob = btn.querySelector('div');
    if (state) {
        btn.classList.remove('bg-slate-600');
        btn.classList.add('bg-emerald-500');
        knob.style.transform = 'translateX(28px)';
    } else {
        btn.classList.remove('bg-emerald-500');
        btn.classList.add('bg-slate-600');
        knob.style.transform = 'translateX(0)';
    }
}

function openSettings() {
    if (typeof audioManager !== 'undefined') audioManager.playUI();
    settingsOverlay.classList.remove('hidden');
    setTimeout(() => {
        settingsOverlay.classList.remove('opacity-0');
        settingsCard.classList.remove('scale-95');
        settingsCard.classList.add('scale-100');
    }, 10);

    // Sync UI state
    if (typeof audioManager !== 'undefined') {
        updateToggleUI(toggleSoundBtn, !audioManager.isMuted);
    }
    updateToggleUI(toggleHapticsBtn, hapticsEnabled);
}

function closeSettings() {
    if (typeof audioManager !== 'undefined') audioManager.playUI();
    settingsOverlay.classList.add('opacity-0');
    settingsCard.classList.remove('scale-100');
    settingsCard.classList.add('scale-95');
    setTimeout(() => {
        settingsOverlay.classList.add('hidden');
    }, 300);
}

function setupSettings() {
    // Load saved preferences
    const savedSound = localStorage.getItem('snakeEscape_sound');
    const savedHaptics = localStorage.getItem('snakeEscape_haptics');

    if (savedSound !== null && typeof audioManager !== 'undefined') {
        audioManager.isMuted = (savedSound === 'false');
    }
    if (savedHaptics !== null) {
        hapticsEnabled = (savedHaptics === 'true');
    }

    // Attach Listeners
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);

    if (toggleSoundBtn) {
        toggleSoundBtn.addEventListener('click', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.isMuted = !audioManager.isMuted;
                localStorage.setItem('snakeEscape_sound', (!audioManager.isMuted).toString());
                updateToggleUI(toggleSoundBtn, !audioManager.isMuted);
                if (!audioManager.isMuted) audioManager.playUI();
            }
        });
    }

    if (toggleHapticsBtn) {
        toggleHapticsBtn.addEventListener('click', () => {
            hapticsEnabled = !hapticsEnabled;
            localStorage.setItem('snakeEscape_haptics', hapticsEnabled.toString());
            updateToggleUI(toggleHapticsBtn, hapticsEnabled);
            if (hapticsEnabled && navigator.vibrate) navigator.vibrate(20);
        });
    }

    // Quick BG close
    const bg = document.getElementById('settings-bg');
    if (bg) bg.addEventListener('click', closeSettings);
}

// Splash Screen Effects
function initSplashEffects() {
    const particlesContainer = document.getElementById('splash-particles');
    const gridContainer = document.getElementById('magic-grid');

    if (gridContainer) {
        for (let i = 0; i < 36; i++) {
            const cell = document.createElement('div');
            cell.className = 'shimmer-cell';
            cell.style.animationDelay = `${Math.random() * 3}s`;
            gridContainer.appendChild(cell);
        }
    }

    if (particlesContainer) {
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 4 + 2;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${Math.random() * 100}%`;
            p.style.bottom = `-10px`;
            p.style.opacity = Math.random() * 0.5 + 0.2;
            p.style.animationDuration = `${Math.random() * 5 + 5}s`;
            p.style.animationDelay = `${Math.random() * 5}s`;
            particlesContainer.appendChild(p);
        }
    }
}

// Start the game when the window loads
window.onload = async function () {
    const splashScreen = document.getElementById('splash-screen');
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    initSplashEffects();

    const updateProgress = (progress) => {
        const percent = Math.round(progress * 100);
        if (loadingBar) loadingBar.style.width = `${percent}%`;
        const percentageEl = document.getElementById('loading-percentage');
        if (percentageEl) percentageEl.innerText = `${percent}%`;

        if (loadingText) {
            if (progress < 0.25) loadingText.innerText = "Warming up the puzzles...";
            else if (progress < 0.5) loadingText.innerText = "The snake is thinking...";
            else if (progress < 0.75) loadingText.innerText = "Setting magical traps...";
            else if (progress < 1.0) loadingText.innerText = "Polishing the grid...";
            else loadingText.innerText = "Magic world ready!";
        }
    };

    // Show initial tiny progress
    updateProgress(0.05);

    try {
        // Initialize Core Systems
        // 1. Economy (Sync)
        initEconomyUI();
        updateProgress(0.2);

        // 2. Audio (Async)
        if (typeof audioManager !== 'undefined') {
            await audioManager.init((p) => updateProgress(0.2 + (p * 0.6)));
        }

        // 3. Prefetch levels
        updateProgress(0.9);
        preloadLevels(1);

        // 4. Ads
        Ads.init();
        updateProgress(1.0);

        // Give a tiny moment for the "100%" to be visible
        setTimeout(() => {
            if (splashScreen) {
                splashScreen.classList.add('fade-out');
                setTimeout(() => splashScreen.style.display = 'none', 1000);
            }
            showHomeScreen();
            setupSettings();

            // Attach Tilt to Home Stats Card
            const statsCard = document.getElementById('home-stats-card');
            if (statsCard && !isMobileDevice()) {
                statsCard.addEventListener('mousemove', handleTilt);
                statsCard.addEventListener('mouseleave', resetTilt);
            }

            // Check Tutorial
            const tutorialSeen = localStorage.getItem('snakeEscape_tutorial_seen');
            if (!tutorialSeen) {
                setTimeout(showTutorial, 500);
            }
        }, 500);

    } catch (e) {
        console.error("Loading failed", e);
        // Emergency clear
        if (splashScreen) splashScreen.style.display = 'none';
        showHomeScreen();
    }
};
