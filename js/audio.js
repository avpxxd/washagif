// Web Audio Procedural Sound Synthesizer for WashaGif
// Generates authentic washing machine acoustics with zero external audio assets!
// Fully stabilized, click-free, with master limiter and idempotent sound nodes.

class WasherAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.compressor = null;

    // Pre-allocated reusable noise buffers
    this.noiseBuffer1s = null;
    this.noiseBuffer5s = null;

    // Active continuous sound nodes
    this.fillNode = null;
    this.tumbleNode = null;
    this.drainNode = null;
    this.sloshInterval = null;

    // Authentic Spin Cycle Audio (Recorded washing machine MP3)
    this.spinAudio = new Audio('spin-cycle.mp3');
    this.spinAudio.preload = 'auto';
    this.spinAudio.loop = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master Dynamics Compressor (Brickwall Limiter)
    // Prevents clipping, harsh digital distortion, and distortion pops
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.45, this.ctx.currentTime);

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    // Pre-allocate shared noise buffers once to eliminate runtime garbage collection
    this.noiseBuffer1s = this.createNoiseBuffer(1.0);
    this.noiseBuffer5s = this.createNoiseBuffer(5.0);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const t = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(t);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.45, t + 0.05);
    }
    if (this.spinAudio) {
      this.spinAudio.volume = this.isMuted ? 0 : 0.75;
    }
    return this.isMuted;
  }

  // Create white noise buffer
  createNoiseBuffer(seconds = 3) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * seconds);
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

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.02);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.025);

    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    }, 40);
  }

  // Authentic Wet Clothes / Laundry Flop Sound when falling to drum bottom
  playDrumThud(impactSpeed = 200) {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const intensity = Math.min(1.0, Math.max(0.15, impactSpeed / 450));

    // 1. Deep laundry impact thud (sine punch)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(68, now);
    subOsc.frequency.exponentialRampToValueAtTime(24, now + 0.1);

    subGain.gain.setValueAtTime(0.26 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.12);

    // 2. Soft muffled wet cloth impact noise burst
    const noiseBuf = this.noiseBuffer1s || this.createNoiseBuffer(0.5);
    if (noiseBuf) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18 * intensity, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.09);

      setTimeout(() => {
        try {
          subOsc.disconnect(); subGain.disconnect();
          noise.disconnect(); filter.disconnect(); noiseGain.disconnect();
        } catch(e) {}
      }, 150);
    }
  }

  // Button Press Beep
  playButtonBeep(freq = 880, type = 'sine') {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.085);

    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    }, 110);
  }

  // Heavy Solenoid Door Lock ("CLACK-CLACK")
  playDoorLock(locked = true) {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    this._playLockStrike(now, locked ? 220 : 170, 0.35);
    this._playLockStrike(now + 0.06, locked ? 150 : 200, 0.25);
  }

  _playLockStrike(time, baseFreq, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.04);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.048);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);

    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    }, 80);
  }

  // Water Inflow Hiss / Rush
  startWaterFill() {
    if (this.fillNode) return; // Already running
    this.init(); this.resume();
    if (!this.ctx) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer5s || this.createNoiseBuffer(5);
    noise.loop = true;

    // Filter to simulate rushing water pipe
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    this.fillNode = { noise, gain, filter };
  }

  stopWaterFill() {
    if (!this.fillNode || !this.ctx) return;
    const node = this.fillNode;
    this.fillNode = null; // Mark stopped immediately

    try {
      const now = this.ctx.currentTime;
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(node.gain.gain.value, now);
      node.gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      setTimeout(() => {
        try {
          node.noise.stop();
          node.noise.disconnect();
          node.filter.disconnect();
          node.gain.disconnect();
        } catch(e) {}
      }, 350);
    } catch (e) {
      try { node.noise.stop(); node.noise.disconnect(); } catch(err) {}
    }
  }

  // Tumble Motor Hum & Water Sloshes
  startTumble(isGentle = true) {
    if (this.tumbleNode) return; // Already running
    this.init(); this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Motor low hum
    const motorOsc = this.ctx.createOscillator();
    const motorGain = this.ctx.createGain();
    motorOsc.type = 'sine';
    motorOsc.frequency.setValueAtTime(55, now);

    // Motor electrical whine
    const whineOsc = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whineOsc.type = 'triangle';
    whineOsc.frequency.setValueAtTime(120, now);

    motorGain.gain.setValueAtTime(0.0001, now);
    motorGain.gain.linearRampToValueAtTime(0.13, now + 0.3);
    whineGain.gain.setValueAtTime(0.0001, now);
    whineGain.gain.linearRampToValueAtTime(0.028, now + 0.3);

    motorOsc.connect(motorGain);
    whineOsc.connect(whineGain);
    motorGain.connect(this.masterGain);
    whineGain.connect(this.masterGain);

    motorOsc.start(now);
    whineOsc.start(now);

    this.tumbleNode = { motorOsc, whineOsc, motorGain, whineGain };

    // Periodic slosh sound
    if (this.sloshInterval) clearInterval(this.sloshInterval);
    this.sloshInterval = setInterval(() => {
      if (Math.random() > 0.35) {
        this.playSlosh();
      }
    }, 3200);
  }

  playSlosh() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer5s || this.createNoiseBuffer(2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(900, now + 0.35);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.95);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 1.0);

    setTimeout(() => {
      try {
        noise.disconnect(); filter.disconnect(); gain.disconnect();
      } catch(e) {}
    }, 1100);
  }

  stopTumble() {
    if (this.sloshInterval) {
      clearInterval(this.sloshInterval);
      this.sloshInterval = null;
    }
    if (!this.tumbleNode || !this.ctx) return;
    const node = this.tumbleNode;
    this.tumbleNode = null; // Mark stopped immediately

    try {
      const now = this.ctx.currentTime;
      node.motorGain.gain.cancelScheduledValues(now);
      node.motorGain.gain.setValueAtTime(node.motorGain.gain.value, now);
      node.motorGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      node.whineGain.gain.cancelScheduledValues(now);
      node.whineGain.gain.setValueAtTime(node.whineGain.gain.value, now);
      node.whineGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      setTimeout(() => {
        try {
          node.motorOsc.stop();
          node.whineOsc.stop();
          node.motorOsc.disconnect();
          node.whineOsc.disconnect();
          node.motorGain.disconnect();
          node.whineGain.disconnect();
        } catch(e) {}
      }, 300);
    } catch(e) {
      try {
        node.motorOsc.stop();
        node.whineOsc.stop();
      } catch(err) {}
    }
  }

  // Drain Impeller Pump & Gurgle
  startDrain() {
    if (this.drainNode) return; // Already running
    this.init(); this.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 60Hz buzzing pump
    const pumpOsc = this.ctx.createOscillator();
    pumpOsc.type = 'sawtooth';
    pumpOsc.frequency.setValueAtTime(60, now);

    const pumpFilter = this.ctx.createBiquadFilter();
    pumpFilter.type = 'lowpass';
    pumpFilter.frequency.setValueAtTime(260, now);

    const pumpGain = this.ctx.createGain();
    pumpGain.gain.setValueAtTime(0.0001, now);
    pumpGain.gain.linearRampToValueAtTime(0.08, now + 0.2);

    pumpOsc.connect(pumpFilter);
    pumpFilter.connect(pumpGain);
    pumpGain.connect(this.masterGain);

    pumpOsc.start(now);

    // Gurgle noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer5s || this.createNoiseBuffer(4);
    noise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(450, now);
    noiseFilter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.09, now + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);

    this.drainNode = { pumpOsc, pumpFilter, pumpGain, noise, noiseFilter, noiseGain };
  }

  stopDrain() {
    if (!this.drainNode || !this.ctx) return;
    const node = this.drainNode;
    this.drainNode = null; // Mark stopped immediately

    try {
      const now = this.ctx.currentTime;
      node.pumpGain.gain.cancelScheduledValues(now);
      node.pumpGain.gain.setValueAtTime(node.pumpGain.gain.value, now);
      node.pumpGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      node.noiseGain.gain.cancelScheduledValues(now);
      node.noiseGain.gain.setValueAtTime(node.noiseGain.gain.value, now);
      node.noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      setTimeout(() => {
        try {
          node.pumpOsc.stop();
          node.noise.stop();
          node.pumpOsc.disconnect();
          node.pumpFilter.disconnect();
          node.pumpGain.disconnect();
          node.noise.disconnect();
          node.noiseFilter.disconnect();
          node.noiseGain.disconnect();
        } catch(e) {}
      }, 300);
    } catch(e) {
      try {
        node.pumpOsc.stop();
        node.noise.stop();
      } catch(err) {}
    }
  }

  // Authentic Spin Cycle Playback using spin cycle.mp3
  // Starts speeding up at 2s, and starts to slow down at 50s!
  startSpin(offset = 0) {
    this.init(); this.resume();
    if (this.spinAudio) {
      this.spinAudio.volume = this.isMuted ? 0 : 0.75;
      if (typeof offset === 'number' && offset >= 0) {
        try {
          this.spinAudio.currentTime = offset;
        } catch(e) {}
      }
      const playPromise = this.spinAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          // Handled gracefully if browser requires user interaction first
        });
      }
    }
  }

  // Keep spin audio playback position synchronized with the washer cycle
  syncSpinTime(elapsedInSpin) {
    if (!this.spinAudio) return;
    if (this.spinAudio.paused) return;
    if (Math.abs(this.spinAudio.currentTime - elapsedInSpin) > 1.2) {
      try {
        this.spinAudio.currentTime = Math.max(0, Math.min(this.spinAudio.duration || 71.4, elapsedInSpin));
      } catch(e) {}
    }
  }

  pauseSpin() {
    if (this.spinAudio) {
      try { this.spinAudio.pause(); } catch(e) {}
    }
  }

  resumeSpin() {
    if (this.spinAudio && !this.isMuted) {
      const playPromise = this.spinAudio.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    }
  }

  updateSpinRPM(rpm) {
    // RPM acoustics are perfectly captured inside the authentic MP3 recording
  }

  stopSpin() {
    if (this.spinAudio) {
      try {
        this.spinAudio.pause();
        this.spinAudio.currentTime = 0;
      } catch(e) {}
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

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.065);

    setTimeout(() => {
      try { osc.disconnect(); gain.disconnect(); } catch(e) {}
    }, 80);
  }

  // Iconic Washing Machine End Melody (Samsung / LG style friendly chime!)
  playEndJingle() {
    this.init(); this.resume();
    if (!this.ctx || this.isMuted) return;

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

    let t = this.ctx.currentTime + 0.05;
    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.d);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + note.d + 0.04);

      const cleanupDelay = (t + note.d + 0.1 - this.ctx.currentTime) * 1000;
      setTimeout(() => {
        try { osc.disconnect(); gain.disconnect(); } catch(e) {}
      }, Math.max(50, cleanupDelay));

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
