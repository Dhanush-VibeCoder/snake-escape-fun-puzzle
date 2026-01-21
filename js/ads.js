/**
 * Universal Ad System for Snake Escape
 * Supports: CrazyGames, Poki, GameMonetize, and Local Development (Auto-Reward)
 */

window.Ads = (function () {
    let platform = 'local'; // 'crazygames', 'poki', 'gamemonetize', 'local'
    let initialized = false;
    let levelCount = 0;
    const INTERSTITIAL_INTERVAL = 3; // Show ad every 3 levels

    // SDK References (populated on init)
    let pokiSDK = null;
    let crazySDK = null;
    let gameMonetizeSDK = null;

    function init() {
        if (initialized) return;

        // Detect Platform
        const url = window.location.href;

        // 1. Check for Poki SDK
        if (window.PokiSDK) {
            platform = 'poki';
            pokiSDK = window.PokiSDK;
            pokiSDK.init().then(() => {
                console.log("Poki SDK Initialized");
                pokiSDK.gameLoadingFinished();
            }).catch(() => {
                console.log("Poki SDK blocked - Adblock?");
                platform = 'local';
            });
        }
        // 2. Check for CrazyGames SDK v2
        else if (window.CrazyGames && window.CrazyGames.SDK) {
            platform = 'crazygames';
            crazySDK = window.CrazyGames.SDK;
            console.log("CrazyGames SDK v2 Detected");
        }

        console.log(`Ads System Initialized. Platform: ${platform}`);
        initialized = true;
    }

    /**
     * CrazyGames Lifecycle Events
     */
    function gameplayStart() {
        if (platform === 'crazygames' && crazySDK) {
            console.log("CrazyGames: gameplayStart()");
            crazySDK.game.gameplayStart();
        }
    }

    function gameplayStop() {
        if (platform === 'crazygames' && crazySDK) {
            console.log("CrazyGames: gameplayStop()");
            crazySDK.game.gameplayStop();
        }
    }

    function happytime() {
        if (platform === 'crazygames' && crazySDK) {
            console.log("CrazyGames: happytime()");
            crazySDK.game.happytime();
        }
    }

    function showRewarded(onSuccess, onFailure) {
        if (!initialized) init();

        console.log(`Requesting Rewarded Ad (${platform})...`);

        if (platform === 'poki') {
            pokiSDK.rewardedBreak(() => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
            }).then((success) => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                if (success) onSuccess();
                else if (onFailure) onFailure();
            });
        }
        else if (platform === 'crazygames') {
            crazySDK.ad.requestAd('rewarded', {
                adStarted: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
                },
                adFinished: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                    onSuccess();
                },
                adError: (error) => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                    console.warn("CrazyGames Ad Error", error);
                    if (onFailure) onFailure();
                },
                adFinishedEarly: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                    if (onFailure) onFailure();
                }
            });
        }
        else {
            console.log("Dev Mode: Simulating Ad...");
            setTimeout(onSuccess, 1000);
        }
    }

    function showInterstitial() {
        if (!initialized) init();

        levelCount++;
        // Don't show ads for the first 2 levels of a session, 
        // and respect the interval thereafter.
        if (levelCount <= 2 || levelCount % INTERSTITIAL_INTERVAL !== 0) return;

        console.log(`Requesting Interstitial Ad (${platform})...`);
        levelCount = 0;

        if (platform === 'poki') {
            pokiSDK.commercialBreak(() => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
            }).then(() => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
            });
        }
        else if (platform === 'crazygames') {
            crazySDK.ad.requestAd('midgame', {
                adStarted: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
                },
                adFinished: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                },
                adError: () => {
                    if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                }
            });
        }
    }

    return {
        init: init,
        gameplayStart: gameplayStart,
        gameplayStop: gameplayStop,
        happytime: happytime,
        showRewarded: showRewarded,
        showInterstitial: showInterstitial,
        getPlatform: () => platform
    };

})();
