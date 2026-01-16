/**
 * Economy System for Snake Escape
 * Handles diamonds, daily rewards, and unlocked boards.
 */
const Economy = {
    // Storage keys
    KEYS: {
        DIAMONDS: 'snake_escape_diamonds',
        LAST_CHECK_IN: 'snake_escape_last_checkin',
        UNLOCKED_BOARDS: 'snake_escape_unlocked_boards',
        SELECTED_BOARD: 'snake_escape_selected_board',
        UNLOCKED_BGS: 'snake_escape_unlocked_bgs',
        SELECTED_BG: 'snake_escape_selected_bg',
        UNLOCKED_SKINS: 'snake_escape_unlocked_skins',
        SELECTED_SKIN: 'snake_escape_selected_skin'
    },

    // Initial State
    init() {
        if (!localStorage.getItem(this.KEYS.DIAMONDS)) {
            localStorage.setItem(this.KEYS.DIAMONDS, '0');
        }
        if (!localStorage.getItem(this.KEYS.UNLOCKED_BOARDS)) {
            localStorage.setItem(this.KEYS.UNLOCKED_BOARDS, JSON.stringify(['classic']));
        }
        if (!localStorage.getItem(this.KEYS.SELECTED_BOARD)) {
            localStorage.setItem(this.KEYS.SELECTED_BOARD, 'classic');
        }
        if (!localStorage.getItem(this.KEYS.UNLOCKED_BGS)) {
            localStorage.setItem(this.KEYS.UNLOCKED_BGS, JSON.stringify(['classic']));
        }
        if (!localStorage.getItem(this.KEYS.SELECTED_BG)) {
            localStorage.setItem(this.KEYS.SELECTED_BG, 'classic');
        }
        if (!localStorage.getItem(this.KEYS.UNLOCKED_SKINS)) {
            localStorage.setItem(this.KEYS.UNLOCKED_SKINS, JSON.stringify(['classic']));
        }
        if (!localStorage.getItem(this.KEYS.SELECTED_SKIN)) {
            localStorage.setItem(this.KEYS.SELECTED_SKIN, 'classic');
        }
    },

    getDiamonds() {
        return parseInt(localStorage.getItem(this.KEYS.DIAMONDS) || '0');
    },

    addDiamonds(amount) {
        const current = this.getDiamonds();
        localStorage.setItem(this.KEYS.DIAMONDS, (current + amount).toString());
        return current + amount;
    },

    spendDiamonds(amount) {
        const current = this.getDiamonds();
        if (current >= amount) {
            localStorage.setItem(this.KEYS.DIAMONDS, (current - amount).toString());
            return true;
        }
        return false;
    },

    getLastCheckIn() {
        return parseInt(localStorage.getItem(this.KEYS.LAST_CHECK_IN) || '0');
    },

    canCheckIn() {
        const last = this.getLastCheckIn();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        return (now - last) >= oneDay;
    },

    claimDailyReward() {
        if (this.canCheckIn()) {
            this.addDiamonds(1);
            localStorage.setItem(this.KEYS.LAST_CHECK_IN, Date.now().toString());
            return true;
        }
        return false;
    },

    getUnlockedBoards() {
        return JSON.parse(localStorage.getItem(this.KEYS.UNLOCKED_BOARDS) || '["classic"]');
    },

    isBoardUnlocked(boardId) {
        return this.getUnlockedBoards().includes(boardId);
    },

    unlockBoard(boardId, price) {
        if (this.spendDiamonds(price)) {
            const unlocked = this.getUnlockedBoards();
            unlocked.push(boardId);
            localStorage.setItem(this.KEYS.UNLOCKED_BOARDS, JSON.stringify(unlocked));
            return true;
        }
        return false;
    },

    getSelectedBoard() {
        return localStorage.getItem(this.KEYS.SELECTED_BOARD) || 'classic';
    },

    selectBoard(boardId) {
        if (this.isBoardUnlocked(boardId)) {
            localStorage.setItem(this.KEYS.SELECTED_BOARD, boardId);
            return true;
        }
        return false;
    },

    getUnlockedBGs() {
        return JSON.parse(localStorage.getItem(this.KEYS.UNLOCKED_BGS) || '["classic"]');
    },

    isBGUnlocked(bgId) {
        return this.getUnlockedBGs().includes(bgId);
    },

    unlockBG(bgId, price) {
        if (this.spendDiamonds(price)) {
            const unlocked = this.getUnlockedBGs();
            unlocked.push(bgId);
            localStorage.setItem(this.KEYS.UNLOCKED_BGS, JSON.stringify(unlocked));
            return true;
        }
        return false;
    },

    getSelectedBG() {
        return localStorage.getItem(this.KEYS.SELECTED_BG) || 'classic';
    },

    selectBG(bgId) {
        if (this.isBGUnlocked(bgId)) {
            localStorage.setItem(this.KEYS.SELECTED_BG, bgId);
            return true;
        }
        return false;
    },

    getUnlockedSkins() {
        return JSON.parse(localStorage.getItem(this.KEYS.UNLOCKED_SKINS) || '["classic"]');
    },

    isSkinUnlocked(skinId) {
        return this.getUnlockedSkins().includes(skinId);
    },

    unlockSkin(skinId, price) {
        if (this.spendDiamonds(price)) {
            const unlocked = this.getUnlockedSkins();
            unlocked.push(skinId);
            localStorage.setItem(this.KEYS.UNLOCKED_SKINS, JSON.stringify(unlocked));
            return true;
        }
        return false;
    },

    getSelectedSkin() {
        return localStorage.getItem(this.KEYS.SELECTED_SKIN) || 'classic';
    },

    selectSkin(skinId) {
        if (this.isSkinUnlocked(skinId)) {
            localStorage.setItem(this.KEYS.SELECTED_SKIN, skinId);
            return true;
        }
        return false;
    }
};

// Initialize on load
Economy.init();
window.Economy = Economy;
