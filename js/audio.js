// Web Audio Procedural Sound Synthesizer for WashaGif
// Generates authentic washing machine acoustics with zero external audio assets!

class WasherAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    
    // Active sound nodes
    this.fillNode = null;
    this.tumbleNode = null;
    this.drainNode = null;
    this.spinNode = null;
    this.sloshInterval = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.6, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // Helper: create white noise buffer
  createNoiseBuffer(seconds = 3) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Mechanical Dial Click
  playDialClick() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // Authentic Wet Clothes / Laundry Flop Sound when falling to drum bottom
  playDrumThud(impactSpeed = 200) {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const intensity = Math.min(1.0, Math.max(0.18, impactSpeed / 450));

    // 1. Deep laundry impact thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(75, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.12);

    subGain.gain.setValueAtTime(0.32 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.14);

    // 2. Soft muffled wet cloth impact noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Button Press Beep
  playButtonBeep(freq = 880, type = 'sine') {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Heavy Solenoid Door Lock ("CLACK-CLACK")
  playDoorLock(locked = true) {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // First strike
    this._playLockStrike(now, locked ? 240 : 180, 0.4);
    // Second secondary rebound click
    this._playLockStrike(now + 0.06, locked ? 160 : 220, 0.3);
  }

  _playLockStrike(time, baseFreq, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.04);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  // Water Inflow Hiss / Rush
  startWaterFill() {
    this.stopWaterFill();
    this.init(); this.resume();
    if (!this.ctx) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(5);
    noise.loop = true;

    // Filter to simulate rushing water pipe
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    this.fillNode = { noise, gain, filter };
  }

  stopWaterFill() {
    if (this.fillNode && this.ctx) {
      try {
        this.fillNode.gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        setTimeout(() => {
          try { this.fillNode.noise.stop(); } catch(e) {}
          this.fillNode = null;
        }, 600);
      } catch (e) {
        this.fillNode = null;
      }
    }
  }

  // Tumble Motor Hum & Water Sloshes
  startTumble(isGentle = true) {
    this.stopTumble();
    this.init(); this.resume();
    if (!this.ctx) return;

    // Motor low hum
    const motorOsc = this.ctx.createOscillator();
    const motorGain = this.ctx.createGain();
    motorOsc.type = 'sine';
    motorOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    // Motor electrical whine
    const whineOsc = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whineOsc.type = 'triangle';
    whineOsc.frequency.setValueAtTime(120, this.ctx.currentTime);

    motorGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    whineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    motorOsc.connect(motorGain);
    whineOsc.connect(whineGain);
    motorGain.connect(this.masterGain);
    whineGain.connect(this.masterGain);

    motorOsc.start();
    whineOsc.start();

    this.tumbleNode = { motorOsc, whineOsc, motorGain, whineGain };

    // Periodic slosh sound
    this.sloshInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        this.playSlosh();
      }
    }, 2800);
  }

  playSlosh() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(1100, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(250, now + 1.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 1.2);
  }

  stopTumble() {
    if (this.sloshInterval) {
      clearInterval(this.sloshInterval);
      this.sloshInterval = null;
    }
    if (this.tumbleNode && this.ctx) {
      try {
        this.tumbleNode.motorGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        this.tumbleNode.whineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            this.tumbleNode.motorOsc.stop();
            this.tumbleNode.whineOsc.stop();
          } catch(e) {}
          this.tumbleNode = null;
        }, 350);
      } catch(e) {
        this.tumbleNode = null;
      }
    }
  }

  // Drain Impeller Pump & Gurgle
  startDrain() {
    this.stopDrain();
    this.init(); this.resume();
    if (!this.ctx) return;

    // 60Hz buzzing pump
    const pumpOsc = this.ctx.createOscillator();
    pumpOsc.type = 'sawtooth';
    pumpOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

    const pumpFilter = this.ctx.createBiquadFilter();
    pumpFilter.type = 'lowpass';
    pumpFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

    const pumpGain = this.ctx.createGain();
    pumpGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    pumpOsc.connect(pumpFilter);
    pumpFilter.connect(pumpGain);
    pumpGain.connect(this.masterGain);

    pumpOsc.start();

    // Gurgle noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(4);
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(500, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start();

    this.drainNode = { pumpOsc, pumpGain, noise, noiseGain };
  }

  stopDrain() {
    if (this.drainNode && this.ctx) {
      try {
        this.drainNode.pumpGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        this.drainNode.noiseGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        setTimeout(() => {
          try {
            this.drainNode.pumpOsc.stop();
            this.drainNode.noise.stop();
          } catch(e) {}
          this.drainNode = null;
        }, 350);
      } catch(e) {
        this.drainNode = null;
      }
    }
  }

  // High-Speed Spin Turbine
  startSpin(targetRPM = 1400) {
    this.stopSpin();
    this.init(); this.resume();
    if (!this.ctx) return;

    // Turbine pitch sweeps up with RPM
    const turbineOsc = this.ctx.createOscillator();
    turbineOsc.type = 'sawtooth';
    turbineOsc.frequency.setValueAtTime(90, this.ctx.currentTime);

    const turbineFilter = this.ctx.createBiquadFilter();
    turbineFilter.type = 'lowpass';
    turbineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const turbineGain = this.ctx.createGain();
    turbineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    turbineGain.gain.linearRampToValueAtTime(0.24, this.ctx.currentTime + 4);

    turbineOsc.connect(turbineFilter);
    turbineFilter.connect(turbineGain);
    turbineGain.connect(this.masterGain);

    // Deep sub-bass vibration thumping
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(40, this.ctx.currentTime);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    // High velocity air rush
    const airNoise = this.ctx.createBufferSource();
    airNoise.buffer = this.createNoiseBuffer(5);
    airNoise.loop = true;

    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    airFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const airGain = this.ctx.createGain();
    airGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    airGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 4);

    airNoise.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(this.masterGain);

    turbineOsc.start();
    subOsc.start();
    airNoise.start();

    this.spinNode = { turbineOsc, turbineFilter, turbineGain, subOsc, subGain, airNoise, airGain };
  }

  // Dynamically update spin frequency based on current RPM (0 to 1400)
  updateSpinRPM(rpm) {
    if (!this.spinNode || !this.ctx) return;
    const clampedRpm = Math.max(50, Math.min(1400, rpm));
    const targetFreq = 80 + (clampedRpm / 1400) * 580; // 80Hz -> 660Hz
    const targetFilter = 350 + (clampedRpm / 1400) * 1600;

    this.spinNode.turbineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    this.spinNode.turbineFilter.frequency.setTargetAtTime(targetFilter, this.ctx.currentTime, 0.2);
  }

  stopSpin() {
    if (this.spinNode && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.spinNode.turbineGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
        this.spinNode.subGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
        this.spinNode.airGain.gain.linearRampToValueAtTime(0.001, now + 1.5);
        setTimeout(() => {
          try {
            this.spinNode.turbineOsc.stop();
            this.spinNode.subOsc.stop();
            this.spinNode.airNoise.stop();
          } catch(e) {}
          this.spinNode = null;
        }, 1600);
      } catch(e) {
        this.spinNode = null;
      }
    }
  }

  // Pop sound for bubble mini-game
  playBubblePop() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    const pitch = 700 + Math.random() * 400;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.8, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Iconic Washing Machine End Melody (Samsung / LG style friendly chime!)
  playEndJingle() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    // Classic cheerful washer melody notes (frequencies in Hz)
    // C5, E5, G5, C6, G5, A5, G5, E5, D5, C5
    const notes = [
      { f: 523.25, d: 0.16 }, // C5
      { f: 659.25, d: 0.16 }, // E5
      { f: 783.99, d: 0.16 }, // G5
      { f: 1046.50, d: 0.28 }, // C6
      { f: 783.99, d: 0.16 }, // G5
      { f: 880.00, d: 0.20 }, // A5
      { f: 783.99, d: 0.24 }, // G5
      { f: 659.25, d: 0.16 }, // E5
      { f: 587.33, d: 0.20 }, // D5
      { f: 523.25, d: 0.50 }  // C5 (held)
    ];

    let t = this.ctx.currentTime + 0.1;
    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, t);

      // Bell-like strike and decay
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + note.d + 0.05);

      t += note.d + 0.04;
    });
  }

  // Alias for completion chime
  playCompletionChime() {
    this.playEndJingle();
  }

  stopAll() {
    this.stopWaterFill();
    this.stopTumble();
    this.stopDrain();
    this.stopSpin();
  }
}

window.washerAudio = new WasherAudio();
