class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
        this.buffers = {};
    }

    async init(onProgress) {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            console.log("Audio Initialized");

            // Resume context if suspended
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            // Load high-quality sounds
            const sounds = [
                { name: 'hiss', url: 'js/assets/audios/snake-hissing-moving.mp3' },
                { name: 'pop', url: 'js/assets/audios/bubble-pop-tap.mp3' },
                { name: 'win', url: 'js/assets/audios/snake-win-effect.wav' },
                { name: 'loss', url: 'js/assets/audios/snake-loss.wav' },
                { name: 'blocked', url: 'js/assets/audios/wrong-blocked-path-tap.mp3' },
                { name: 'screenShift', url: 'js/assets/audios/screen-shift-sound-effect.mp3' }
            ];

            let loadedCount = 0;
            await Promise.all(sounds.map(async (sound) => {
                await this.loadSound(sound.name, sound.url);
                loadedCount++;
                if (onProgress) onProgress(loadedCount / sounds.length);
            }));

        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
            console.log(`Sound loaded: ${name}`);
        } catch (e) {
            console.error(`Failed to load sound: ${name}`, e);
        }
    }

    playBuffer(name, vol = 0.2) {
        if (!this.ctx || this.isMuted || !this.buffers[name]) return;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();

        source.buffer = this.buffers[name];
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.ctx || this.isMuted) return;

        // Resume context just in case
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMove() {
        // High pip (Legacy fallback)
        this.playTone(600, 'sine', 0.1, 0.05);
    }

    playScreenShift() {
        if (this.buffers['screenShift']) {
            this.playBuffer('screenShift', 0.4);
        } else {
            // Fallback to whoosh sound if screenShift is not loaded
            this.playWhoosh();
        }
    }

    playWhoosh() {
        if (this.buffers['hiss']) {
            this.playBuffer('hiss', 0.3);
        } else {
            // Fallback to synth whoosh
            if (!this.ctx || this.isMuted) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Rapid frequency sweep for whoosh feel
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
        }
    }

    playBump() {
        if (!this.ctx || this.isMuted) return;
        // Low bonk (frequency slide)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }


    playWin() {
        if (this.buffers['win']) {
            this.playBuffer('win', 0.4);
        } else {
            // Major Arpeggio (Legacy fallback)
            const now = 0;
            setTimeout(() => this.playTone(400, 'triangle', 0.3, 0.1), now);
            setTimeout(() => this.playTone(500, 'triangle', 0.3, 0.1), now + 150);
            setTimeout(() => this.playTone(600, 'triangle', 0.6, 0.1), now + 300);
            setTimeout(() => this.playTone(800, 'triangle', 0.8, 0.1), now + 450);
        }
    }

    playLose() {
        if (this.buffers['loss']) {
            this.playBuffer('loss', 0.4);
        } else {
            // Descending detuned (Legacy fallback)
            setTimeout(() => this.playTone(300, 'sawtooth', 0.4, 0.1), 0);
            setTimeout(() => this.playTone(200, 'sawtooth', 0.6, 0.1), 200);
        }
    }

    playUI() {
        if (this.buffers['pop']) {
            this.playBuffer('pop', 0.25);
        } else {
            // Short tick (Legacy fallback)
            this.playTone(800, 'sine', 0.05, 0.02);
        }
    }

    playError() {
        if (this.buffers['blocked']) {
            this.playBuffer('blocked', 0.4);
        } else {
            // Low buzz (Legacy fallback)
            this.playTone(150, 'sawtooth', 0.2, 0.1);
        }
    }

    playScreenShift() {
        if (this.buffers['screenShift']) {
            this.playBuffer('screenShift', 0.4);
        } else {
            this.playWhoosh();
        }
    }
}

const audioManager = new AudioManager();
