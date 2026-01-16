/**
 * Universal Ad System for Snake Escape
 * Supports: CrazyGames, Poki, and Local Development (Auto-Reward)
 */

window.Ads = (function () {
    let platform = 'local'; // 'crazygames', 'poki', 'local'
    let initialized = false;
    let levelCount = 0;
    const INTERSTITIAL_INTERVAL = 2; // Show ad every 2 levels

    // SDK References (populated on init)
    let pokiSDK = null;
    let crazySDK = null;

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
                platform = 'local'; // Fallback logic
            });
        }
        // 2. Check for CrazyGames SDK (often loaded as window.CrazyGames.SDK)
        else if (window.CrazyGames && window.CrazyGames.SDK) {
            platform = 'crazygames';
            crazySDK = window.CrazyGames.SDK;
            console.log("CrazyGames SDK Detected");
        }
        // 3. Check URL parameters for forced testing
        else if (url.includes("poki")) {
            console.log("Poki Environment Detected (No SDK found yet)");
        }

        console.log(`Ads System Initialized. Platform: ${platform}`);
        initialized = true;
    }

    /**
     * Show a Rewarded Ad (User creates value exchange)
     * @param {Function} onSuccess - Called when ad completes and reward is granted
     * @param {Function} onFailure - Called if ad fails, closes early, or generic error
     */
    function showRewarded(onSuccess, onFailure) {
        if (!initialized) init();

        console.log(`Requesting Rewarded Ad (${platform})...`);

        if (platform === 'poki') {
            pokiSDK.rewardedBreak(() => {
                // Ad started
                if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
            }).then((success) => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                if (success) {
                    console.log("Poki Ad Success");
                    onSuccess();
                } else {
                    console.log("Poki Ad Failed/Skipped");
                    if (onFailure) onFailure();
                }
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
            // Local / Dev Mode
            console.log("Dev Mode: Simulating Ad...");
            setTimeout(() => {
                const simulateSuccess = true; // Toggle for testing
                if (simulateSuccess) {
                    console.log("Dev Mode: Reward Granted");
                    onSuccess();
                } else {
                    console.log("Dev Mode: Ad Failed");
                    if (onFailure) onFailure();
                }
            }, 1000);
        }
    }

    /**
     * Show an Interstitial Ad (Mid-game break)
     * Frequency capped logic included.
     */
    function showInterstitial() {
        if (!initialized) init();

        levelCount++;
        if (levelCount < INTERSTITIAL_INTERVAL) {
            console.log(`Interstitial Skipped (Level ${levelCount}/${INTERSTITIAL_INTERVAL})`);
            return;
        }

        console.log(`Requesting Interstitial Ad (${platform})...`);
        levelCount = 0; // Reset counter

        if (platform === 'poki') {
            pokiSDK.commercialBreak(() => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.suspend();
            }).then(() => {
                if (typeof audioManager !== 'undefined') audioManager.ctx.resume();
                console.log("Poki Commercial Finished");
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
        else {
            console.log("Dev Mode: Simulating Interstitial (1s delay)");
        }
    }

    // Public API
    return {
        init: init,
        showRewarded: showRewarded,
        showInterstitial: showInterstitial,
        getPlatform: () => platform
    };

})();
