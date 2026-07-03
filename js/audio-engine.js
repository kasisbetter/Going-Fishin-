// --- WEB AUDIO SYNTHESIZER ENGINE ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

let isAudioInitialized = false;

// Synthesizer helper function to play cozy notes [2]
function playTone(freq, type, duration, vol = 0.1, drop = 0) {
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        if (drop > 0) {
            osc.frequency.exponentialRampToValueAtTime(freq - drop, audioCtx.currentTime + duration);
        }
        
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode); 
        gainNode.connect(audioCtx.destination);
        
        osc.start(); 
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn("Audio feedback suspended by host constraint:", e);
    }
}

// Lowpass white-noise generator for water splashtones [2]
function playNoise(duration, vol = 0.1, filterFreq = 1000) {
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioCtx.createBufferSource(); 
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter(); 
        filter.type = 'lowpass'; 
        filter.frequency.value = filterFreq;
        
        const gainNode = audioCtx.createGain(); 
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime); 
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        noise.connect(filter); 
        filter.connect(gainNode); 
        gainNode.connect(audioCtx.destination);
        
        noise.start();
    } catch (e) {
        console.warn("Ambient generator suspended by host constraint:", e);
    }
}

// Exporting SFX triggers so our gameplay script can activate them [1]
export const sfx = {
    init: () => { 
        try {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        } catch (e) {
            console.warn("AudioContext initialization failed:", e);
        }
    },
    click: () => playTone(600, 'sine', 0.05, 0.05),
    splash: () => playNoise(0.4, 0.25, 800),
    cast: () => playTone(300, 'triangle', 0.15, 0.04, 150),
    bite: () => { 
        playTone(800, 'sine', 0.1, 0.08); 
        setTimeout(() => playTone(1200, 'sine', 0.1, 0.08), 100); 
    },
    catch: () => { 
        playTone(523.25, 'sine', 0.1, 0.08); 
        setTimeout(() => playTone(659.25, 'sine', 0.1, 0.08), 100); 
        setTimeout(() => playTone(783.99, 'sine', 0.2, 0.08), 200); 
    },
    sell: () => { 
        playTone(1200, 'square', 0.1, 0.02); 
        setTimeout(() => playTone(1600, 'square', 0.15, 0.02), 100); 
    },
    error: () => { 
        playTone(200, 'sawtooth', 0.1, 0.05); 
        setTimeout(() => playTone(150, 'sawtooth', 0.2, 0.05), 150); 
    }
};

// Exporting Lofi Chords Generator Loop [1, 2]
export const LofiEngine = {
    ctx: audioCtx, 
    isPlaying: false, 
    bpm: 68,
    nextNoteTime: 0.0, 
    current16thNote: 0, 
    lookahead: 25.0, 
    scheduleAheadTime: 0.1, 
    timerID: null, 
    chordStep: 0,
    
    // Warm sub-bass muffle kick drum
    playKick(time) {
        try {
            const osc = this.ctx.createOscillator(); 
            const gainNode = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(90, time);
            
            osc.frequency.setValueAtTime(60, time); 
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
            
            gainNode.gain.setValueAtTime(0.02, time); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc.start(time); 
            osc.stop(time + 0.3);
        } catch(e) {}
    },
    
    // Warm organic rimshot snare tap
    playSnare(time) {
        try {
            const osc = this.ctx.createOscillator(); 
            const gainNode = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, time);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(175, time);
            
            gainNode.gain.setValueAtTime(0.006, time); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc.start(time); 
            osc.stop(time + 0.15);
        } catch(e) {}
    },
    
    // Beautiful rich Rhodes chord with analog detuning
    playRhodesNote(time, freq, duration) {
        try {
            const osc1 = this.ctx.createOscillator(); 
            const osc2 = this.ctx.createOscillator(); 
            const gainNode = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc1.type = 'triangle';
            osc2.type = 'sine';
            
            osc1.frequency.setValueAtTime(freq - 1.2, time);
            osc2.frequency.setValueAtTime(freq + 1.2, time);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(550, time);
            
            gainNode.gain.setValueAtTime(0, time); 
            gainNode.gain.linearRampToValueAtTime(0.01, time + 0.2);
            gainNode.gain.setTargetAtTime(0.01, time + duration - 0.4, 0.5); 
            gainNode.gain.linearRampToValueAtTime(0, time + duration);
            
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc1.start(time); 
            osc2.start(time);
            osc1.stop(time + duration);
            osc2.stop(time + duration);
        } catch(e) {}
    },

    // Soft floating pentatonic jazz flute / vibraphone soloist
    playJazzSoloNote(time, freq) {
        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, time);

            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.005, time + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start(time);
            osc.stop(time + 0.8);
        } catch(e) {}
    },
    
    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNoteTime += 0.25 * (60.0 / this.bpm);
            
            this.current16thNote++; 
            if (this.current16thNote === 16) {
                this.current16thNote = 0;
            }
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    },
    
    scheduleNote(step, time) {
        // Soft brushed rhythm
        if (step === 0 || step === 10) {
            this.playKick(time);
        }
        if (step === 4 || step === 12) {
            this.playSnare(time);
        }
        
        // Gorgeous detuned Jazz 9th and 13th Voicings
        if (step === 0) {
            const jazzChords = [
                [130.81, 164.81, 196.00, 246.94, 293.66], 
                [110.00, 130.81, 164.81, 196.00, 246.94], 
                [146.83, 174.61, 220.00, 261.63, 329.63], 
                [97.99,  146.83, 246.94, 293.66, 349.23]  
            ];
            
            jazzChords[this.chordStep].forEach(freq => {
                this.playRhodesNote(time, freq, 3.2);
            });
            
            this.chordStep = (this.chordStep + 1) % 4;
        }

        // Generative floating solo on steps 2, 6, 8, 14
        if ([2, 6, 8, 14].includes(step) && Math.random() < 0.45) {
            const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; 
            const randomFreq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
            this.playJazzSoloNote(time, randomFreq);
        }
    },
    
    toggle() {
        if (this.isPlaying) {
            clearTimeout(this.timerID); 
            this.isPlaying = false; 
            document.getElementById('musicBtn').innerHTML = "🔈 Lofi Off";
        } else {
            try {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            } catch(e) {}
            this.nextNoteTime = this.ctx.currentTime + 0.05; 
            this.current16thNote = 0; 
            this.chordStep = 0;
            
            this.scheduler(); 
            this.isPlaying = true;
            
            document.getElementById('musicBtn').innerHTML = "🔊 Lofi On";
        }
    }
};

// Triggers AudioContext bypass on first player screen interaction
export function userInteractiveTrigger() {
    if (isAudioInitialized) return;
    isAudioInitialized = true;
    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch(e) {}
    if (!LofiEngine.isPlaying) {
        LofiEngine.toggle();
    }
}
