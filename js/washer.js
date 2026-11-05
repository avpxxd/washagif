// Washer State Machine, Physics, and 5-Minute Cycle Controller for WashaGif

class WasherMachine {
  constructor(waterCanvas, audio) {
    this.water = waterCanvas;
    this.audio = audio;

    // Cycle duration: 300 seconds = 5 minutes
    this.totalDuration = 300; 
    this.elapsedSeconds = 0;
    this.speedMultiplier = 1; // Default 1x
    this.state = 'IDLE'; // IDLE, RUNNING, PAUSED, FINISHED
    this.currentStage = 'IDLE';

    // Physics & Drum state
    this.drumAngle = 0; // In degrees
    this.drumRPM = 0;
    this.targetRPM = 0;
    this.tumbleDirection = 1; // 1 = clockwise, -1 = counter-clockwise
    this.tumbleTimer = 0;

    // Drum & Media state (supports up to 5 items)
    this.mediaChamber = document.getElementById('media-chamber');
    this.items = []; // array of { src, isGif, wrapperEl, imgEl, grimeEl }
    this.itemElements = [];
    this.gifWrapper = document.getElementById('washing-gif-wrapper');
    this.gifElement = document.getElementById('washing-gif');
    this.gifGrimeOverlay = document.getElementById('gif-grime-overlay');
    this.drumElement = document.getElementById('inner-drum');
    this.washerChassis = document.getElementById('washer-chassis');

    // 2D Rigid Body Physics Engine for GIFs inside drum
    this.physics = new GifPhysics(this);

    this.grimeLevel = 1.0; // 1.0 = dirty, 0.0 = squeaky clean
    this.isDoorOpen = true; // Door starts open on load/reload
    this.isDoorLocked = false;
    this.hasItemLoaded = false;
    this.preSpinDraining = false;
    this.spinDrainActive = false;

    // Animation frame loop
    this.lastTimestamp = performance.now();
    this.updateLoop = this.updateLoop.bind(this);
    requestAnimationFrame(this.updateLoop);
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    if (this.onSpeedChange) this.onSpeedChange(multiplier);
  }

  // Load single or multiple media items (up to 5)
  loadMedia(srcOrList, isGif = true) {
    if (Array.isArray(srcOrList)) {
      this.items = srcOrList.slice(0, 5).map(item => {
        if (typeof item === 'string') return { src: item, isGif: true };
        return { src: item.src, isGif: item.isGif !== false };
      });
    } else if (srcOrList) {
      this.items = [{ src: srcOrList, isGif }];
    } else {
      this.items = [];
    }
    this.renderItems();
    this.resetCycle();
    this.setGrimeLevel(1.0);
    if (this.onMediaLoaded) this.onMediaLoaded(this.items.length);
  }

  // Add an additional item to the drum (up to 5 max)
  addMedia(src, isGif = true) {
    if (this.items.length >= 5) return false;
    this.items.push({ src, isGif });
    this.renderItems();
    this.resetCycle();
    this.setGrimeLevel(1.0);
    if (this.onMediaLoaded) this.onMediaLoaded(this.items.length);
    return true;
  }

  renderItems() {
    if (!this.mediaChamber) {
      this.mediaChamber = document.getElementById('media-chamber');
      if (!this.mediaChamber) return;
    }
    this.mediaChamber.innerHTML = '';
    this.itemElements = [];

    const isMulti = this.items.length > 1;
    this.items.forEach((item, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = `washing-gif-wrapper ${isMulti ? 'multi-item' : ''}`;
      wrapper.id = `washing-gif-wrapper-${index}`;

      const img = document.createElement('img');
      img.className = 'washing-gif';
      img.src = item.src;
      img.alt = `Laundry item ${index + 1}`;

      const grime = document.createElement('div');
      grime.className = 'gif-grime-overlay';
      grime.innerHTML = `
        <div class="dirt-stain stain-1"></div>
        <div class="dirt-stain stain-2"></div>
        <div class="dirt-stain stain-3"></div>
      `;

      wrapper.appendChild(img);
      wrapper.appendChild(grime);
      this.mediaChamber.appendChild(wrapper);

      item.wrapperEl = wrapper;
      item.imgEl = img;
      item.grimeEl = grime;
      this.itemElements.push(wrapper);
    });

    if (this.physics) {
      this.physics.setBodies(this.itemElements);
    }

    this.hasItemLoaded = this.items.length > 0;
    this.gifWrapper = this.itemElements[0] || null;
    this.gifElement = this.items[0]?.imgEl || null;
    this.gifGrimeOverlay = this.items[0]?.grimeEl || null;
  }

  setGrimeLevel(level) {
    this.grimeLevel = Math.max(0, Math.min(1, level));
    const sepia = Math.round(this.grimeLevel * 35);
    const blur = (this.grimeLevel * 1.5).toFixed(1);
    const brightness = (1.2 - this.grimeLevel * 0.35).toFixed(2);
    const contrast = (1.15 - this.grimeLevel * 0.25).toFixed(2);
    const filter = `sepia(${sepia}%) blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;

    for (const item of this.items) {
      if (item.grimeEl) item.grimeEl.style.opacity = this.grimeLevel.toString();
      if (item.imgEl) item.imgEl.style.filter = filter;
    }
  }

  openDoor(playSound = true, showDropzone = true) {
    if (this.state === 'RUNNING' && this.isDoorLocked) {
      if (playSound) this.audio.playButtonBeep(300, 'sawtooth');
      if (this.onStatusMessage) this.onStatusMessage('Cannot open door while cycle is running!');
      return false;
    }
    this.isDoorOpen = true;
    if (playSound) this.audio.playDoorLock(false);
    const doorElement = document.getElementById('washer-door');
    if (doorElement) doorElement.classList.add('door-open');
    if (showDropzone) {
      const dropzone = document.getElementById('drum-dropzone');
      if (dropzone) dropzone.classList.add('visible');
    }
    if (this.onDoorToggle) this.onDoorToggle(true);
    return true;
  }

  closeDoor(playSound = true) {
    this.isDoorOpen = false;
    if (playSound) this.audio.playDoorLock(false);
    const doorElement = document.getElementById('washer-door');
    if (doorElement) doorElement.classList.remove('door-open');
    const dropzone = document.getElementById('drum-dropzone');
    if (dropzone) dropzone.classList.remove('visible');
    if (this.onDoorToggle) this.onDoorToggle(false);
    return true;
  }

  start() {
    if (!this.hasItemLoaded) {
      this.audio.playButtonBeep(350, 'sawtooth');
      if (this.onStatusMessage) this.onStatusMessage('Please load a GIF or image into the drum first!');
      return;
    }

    if (this.isDoorOpen) {
      this.closeDoor(true);
    }

    if (this.state === 'IDLE' || this.state === 'FINISHED') {
      this.resetCycle();
      this.state = 'RUNNING';
      this.lockDoor(true);
      this.audio.playDoorLock(true);
      if (this.onStateChange) this.onStateChange(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'RUNNING';
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  pause() {
    if (this.state === 'RUNNING') {
      this.state = 'PAUSED';
      this.audio.stopAll();
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  resetCycle() {
    this.state = 'IDLE';
    this.currentStage = 'IDLE';
    this.elapsedSeconds = 0;
    this.drumRPM = 0;
    this.targetRPM = 0;
    this.drumAngle = 0;
    this.preSpinDraining = false;
    this.spinDrainActive = false;
    this.lockDoor(false);
    this.audio.stopAll();

    if (this.physics) {
      this.physics.reset();
      if (this.gifWrapper) {
        this.gifWrapper.style.transform = this.physics.getTransform();
      }
    }

    this.water.setWaterLevel(0);
    this.water.setAgitation(0);
    this.water.setSpin(0);
    this.water.setFoam(0);
    this.water.setClarity(0.2);
    this.water.isFilling = false;

    this.setGrimeLevel(1.0);
    this.setMachineShake('none');

    if (this.onCycleUpdate) {
      this.onCycleUpdate({
        elapsed: 0,
        total: this.totalDuration,
        remaining: this.totalDuration,
        stage: 'IDLE',
        stageName: 'READY TO WASH',
        rpm: 0,
        dirtPercent: 100,
        waterPercent: 0
      });
    }
    if (this.onStateChange) this.onStateChange(this.state);
  }

  lockDoor(locked) {
    this.isDoorLocked = locked;
    const lockLed = document.getElementById('led-door-lock');
    if (lockLed) {
      if (locked) lockLed.classList.add('active');
      else lockLed.classList.remove('active');
    }
  }

  setMachineShake(intensity) {
    if (!this.washerChassis) return;
    this.washerChassis.classList.remove('shake-gentle', 'shake-violent');
    if (intensity === 'gentle') {
      this.washerChassis.classList.add('shake-gentle');
    } else if (intensity === 'violent') {
      this.washerChassis.classList.add('shake-violent');
    }
  }

  updateLoop(timestamp) {
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const dt = Math.min(0.1, rawDt);

    if (this.state === 'RUNNING') {
      // Progress cycle with speed multiplier
      this.elapsedSeconds += dt * this.speedMultiplier;

      if (this.elapsedSeconds >= this.totalDuration) {
        this.elapsedSeconds = this.totalDuration;
        this.completeCycle();
      } else {
        this.updateCycleStages(dt);
      }
    }

    // Update physical drum rotation
    this.updateDrumPhysics(dt);

    requestAnimationFrame(this.updateLoop);
  }

  // 5-Minute Stage Breakdown (Total 300 seconds)
  updateCycleStages(dt) {
    const t = this.elapsedSeconds;
    let stageKey = '';
    let stageName = '';
    let targetWater = 0;
    let targetAgitation = 0;
    let targetSpin = 0;
    let targetFoam = 0;

    // STAGE 1: 0 - 15s (Door Lock & Sensing Load)
    if (t < 15) {
      stageKey = 'SENSING';
      stageName = 'SENSING & WEIGHING LOAD';
      this.targetRPM = (Math.sin(t * 3) > 0) ? 25 : -25;
      targetWater = 0;
      targetAgitation = 0.1;
      this.setMachineShake('none');
    }
    // STAGE 2: 15s - 60s (45s: Water & Detergent Fill)
    else if (t < 60) {
      stageKey = 'FILL';
      stageName = 'FILLING WATER & DETERGENT';
      const fillProgress = (t - 15) / 45;
      targetWater = 0.45 * fillProgress;
      targetAgitation = 0.25;
      targetFoam = fillProgress * 0.4;
      this.targetRPM = (Math.sin(t * 1.5) > 0.3) ? 30 : -30;
      this.water.isFilling = true;
      this.setMachineShake('none');
    }
    // STAGE 3: 60s - 180s (120s = 2.0 minutes: Gentle Rocking & Tumble Wash)
    else if (t < 180) {
      stageKey = 'WASH';
      stageName = 'GENTLE ROCK & TUMBLE WASH';
      this.water.isFilling = false;
      targetWater = 0.45;
      targetAgitation = 0.75;
      targetFoam = 0.8;

      // Rock back and forth every 7 seconds
      const cycleTime = (t - 60) % 14;
      if (cycleTime < 6) {
        this.targetRPM = 42; // Clockwise
      } else if (cycleTime < 7) {
        this.targetRPM = 0; // Pause
      } else if (cycleTime < 13) {
        this.targetRPM = -42; // Counter-clockwise
      } else {
        this.targetRPM = 0; // Pause
      }

      // Grime reduction over tumble wash: 1.0 -> 0.2
      const washProgress = (t - 60) / (180 - 60);
      this.setGrimeLevel(1.0 - (washProgress * 0.8));
      this.water.setClarity(0.2 + washProgress * 0.3);
      this.setMachineShake('gentle');
    }
    // STAGE 4: 180s - 220s (40s: Drain Murky Water)
    else if (t < 220) {
      stageKey = 'DRAIN';
      stageName = 'DRAINING DIRTY WATER';
      const drainProgress = (t - 180) / 40;
      targetWater = 0.45 * (1 - drainProgress);
      targetAgitation = 0.2;
      targetFoam = 0.6 * (1 - drainProgress * 0.7);
      this.targetRPM = 20;
      this.setMachineShake('none');
    }
    // STAGE 5: 220s - 245s (25s: Clean Spray Rinse & Pre-Spin Drain)
    else if (t < 245) {
      stageKey = 'RINSE';
      stageName = 'FRESH WATER JET RINSE';

      if (t < 237) {
        // Active jet spray rinse (220s - 237s)
        this.water.isFilling = true;
        targetWater = 0.15;
        targetAgitation = 0.5;
        targetFoam = 0.15;
        this.water.setClarity(0.85);
        this.targetRPM = (Math.sin(t * 2) > 0) ? 55 : -55;

        if (this.preSpinDraining) {
          this.preSpinDraining = false;
          this.audio.stopDrain();
          this.audio.startWaterFill();
        }
      } else {
        // Pre-spin drain & pump out (237s - 245s)
        this.water.isFilling = false;
        const drainProgress = (t - 237) / 8;
        targetWater = 0.15 * (1 - drainProgress);
        targetAgitation = 0.2 * (1 - drainProgress);
        targetFoam = 0.1 * (1 - drainProgress);
        this.targetRPM = 35;

        if (!this.preSpinDraining) {
          this.preSpinDraining = true;
          this.audio.stopWaterFill();
          this.audio.startDrain();
        }
      }
      this.setMachineShake('gentle');
    }
    // STAGE 6: 245s - 285s (40s: High-Speed Centrifuge Spin)
    else if (t < 285) {
      stageKey = 'SPIN';
      stageName = 'HIGH-SPEED SPIN (1400 RPM)';
      this.water.isFilling = false;
      targetWater = 0;
      targetAgitation = 0;
      this.water.setFoam(0);

      // Spin acceleration curve up to 1400 RPM
      const spinDuration = 285 - 245; // 40s
      const spinProgress = (t - 245) / spinDuration;

      // Drain pump running during initial extraction (first 20% = 8s)
      if (spinProgress < 0.2) {
        if (!this.spinDrainActive) {
          this.spinDrainActive = true;
          this.audio.startDrain();
        }
      } else {
        if (this.spinDrainActive) {
          this.spinDrainActive = false;
          this.audio.stopDrain();
        }
      }

      let currentSpinTarget = 0;
      if (spinProgress < 0.2) {
        // Balance distribution phase
        currentSpinTarget = 150 + (spinProgress / 0.2) * 250; // 150 -> 400
        this.setMachineShake('gentle');
      } else if (spinProgress < 0.8) {
        // Maximum extraction phase (up to 1400 RPM)
        currentSpinTarget = 400 + Math.pow((spinProgress - 0.2) / 0.6, 1.4) * 1000;
        this.setMachineShake('violent');
      } else {
        // High speed hold & initial brake
        currentSpinTarget = 1400 * (1 - (spinProgress - 0.8) / 0.2 * 0.4);
        this.setMachineShake('violent');
      }

      this.targetRPM = currentSpinTarget;
      targetSpin = Math.min(1, currentSpinTarget / 1400);

      this.audio.updateSpinRPM(this.drumRPM);

      // Remove all remaining grime during centrifuge
      this.setGrimeLevel(Math.max(0, 0.2 * (1 - spinProgress * 1.5)));
    }
    // STAGE 7: 285s - 300s (15s: Deceleration & Fluff)
    else {
      stageKey = 'FINISHING';
      stageName = 'DECELERATING & FLUFFING';
      const decelProgress = (t - 285) / 15;
      this.targetRPM = 400 * (1 - decelProgress);
      targetSpin = (1 - decelProgress) * 0.2;
      this.setMachineShake('gentle');
      this.setGrimeLevel(0);
    }

    // AUDIO STAGE TRANSITIONS (Only trigger once when stage changes!)
    if (stageKey !== this.currentStage) {
      if (stageKey === 'SENSING') {
        this.audio.stopAll();
      } else if (stageKey === 'FILL') {
        this.audio.stopAll();
        this.audio.startWaterFill();
      } else if (stageKey === 'WASH') {
        this.audio.stopWaterFill();
        this.audio.startTumble(true);
      } else if (stageKey === 'DRAIN') {
        this.audio.stopTumble();
        this.audio.startDrain();
      } else if (stageKey === 'RINSE') {
        this.audio.stopDrain();
        this.audio.startWaterFill();
        this.preSpinDraining = false;
      } else if (stageKey === 'SPIN') {
        this.audio.stopWaterFill();
        this.audio.startSpin(1400);
        this.spinDrainActive = false;
      } else if (stageKey === 'FINISHING') {
        this.audio.stopSpin();
        this.audio.stopDrain();
      }
    }

    this.currentStage = stageKey;
    this.water.setWaterLevel(targetWater);
    this.water.setAgitation(targetAgitation, (this.drumRPM / 45));
    this.water.setSpin(targetSpin);
    this.water.setFoam(targetFoam);

    // Broadcast cycle status
    const remaining = Math.max(0, this.totalDuration - this.elapsedSeconds);
    if (this.onCycleUpdate) {
      this.onCycleUpdate({
        elapsed: this.elapsedSeconds,
        total: this.totalDuration,
        remaining: remaining,
        stage: stageKey,
        stageName: stageName,
        rpm: Math.round(Math.abs(this.drumRPM)),
        dirtPercent: Math.round(this.grimeLevel * 100),
        waterPercent: Math.round(targetWater * 100)
      });
    }
  }

  // Smooth drum physics and continuous rotation
  updateDrumPhysics(dt) {
    const accelRate = 450; // deg/s^2 equivalent ramp
    if (this.drumRPM < this.targetRPM) {
      this.drumRPM = Math.min(this.targetRPM, this.drumRPM + accelRate * dt * this.speedMultiplier);
    } else if (this.drumRPM > this.targetRPM) {
      this.drumRPM = Math.max(this.targetRPM, this.drumRPM - accelRate * dt * this.speedMultiplier);
    }

    const degPerSec = (this.drumRPM / 60) * 360;
    this.drumAngle += degPerSec * dt * this.speedMultiplier;

    if (this.drumElement) {
      this.drumElement.style.transform = `rotate(${this.drumAngle}deg)`;
    }

    // 2D Rigid Body Physics tumbling for all laundry items
    if (this.physics && this.items.length > 0) {
      const simDt = Math.min(0.04, dt * this.speedMultiplier);
      this.physics.update(
        simDt,
        this.drumAngle,
        this.drumRPM,
        (this.water ? this.water.waterLevel : 0),
        (this.water ? (this.water.waterAgitation || this.water.agitation || 0) : 0)
      );
    }
  }

  completeCycle() {
    this.state = 'FINISHED';
    this.currentStage = 'DONE';
    this.drumRPM = 0;
    this.targetRPM = 0;
    this.lockDoor(false);
    this.setMachineShake('none');
    this.audio.stopAll();
    if (this.audio.playEndJingle) {
      this.audio.playEndJingle();
    } else if (this.audio.playCompletionChime) {
      this.audio.playCompletionChime();
    }

    this.water.setWaterLevel(0);
    this.water.setAgitation(0);
    this.water.setSpin(0);
    this.water.setFoam(0);
    this.water.setClarity(1.0);
    this.setGrimeLevel(0);

    if (this.onCycleUpdate) {
      this.onCycleUpdate({
        elapsed: this.totalDuration,
        total: this.totalDuration,
        remaining: 0,
        stage: 'DONE',
        stageName: 'CYCLE COMPLETE - SQUEAKY CLEAN!',
        rpm: 0,
        dirtPercent: 0,
        waterPercent: 0
      });
    }

    if (this.onCycleComplete) {
      this.onCycleComplete();
    }
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}
