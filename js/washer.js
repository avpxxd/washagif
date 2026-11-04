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

    // GIF transform & grime state
    this.gifWrapper = document.getElementById('washing-gif-wrapper');
    this.gifElement = document.getElementById('washing-gif');
    this.gifGrimeOverlay = document.getElementById('gif-grime-overlay');
    this.drumElement = document.getElementById('inner-drum');
    this.washerChassis = document.getElementById('washer-chassis');

    // 2D Rigid Body Physics Engine for GIF inside drum
    this.physics = new GifPhysics(this);

    this.grimeLevel = 1.0; // 1.0 = dirty, 0.0 = squeaky clean
    this.isDoorOpen = true; // Door starts open on load/reload
    this.isDoorLocked = false;
    this.hasItemLoaded = false;

    // Animation frame loop
    this.lastTimestamp = performance.now();
    this.updateLoop = this.updateLoop.bind(this);
    requestAnimationFrame(this.updateLoop);
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    if (this.onSpeedChange) this.onSpeedChange(multiplier);
  }

  loadMedia(src, isGif = true) {
    this.hasItemLoaded = true;
    if (this.gifWrapper) {
      this.gifWrapper.style.visibility = 'visible';
    }
    if (this.gifElement) {
      this.gifElement.src = src;
      this.gifElement.style.display = 'block';
    }
    this.resetCycle();
    this.setGrimeLevel(1.0);
    if (this.physics && this.gifWrapper) {
      this.gifWrapper.style.transform = this.physics.getTransform();
    }
    if (this.onMediaLoaded) this.onMediaLoaded();
  }

  setGrimeLevel(level) {
    this.grimeLevel = Math.max(0, Math.min(1, level));
    if (this.gifGrimeOverlay) {
      this.gifGrimeOverlay.style.opacity = this.grimeLevel.toString();
    }
    if (this.gifElement) {
      // Filter increases cleanliness (starts with slight blur & sepia/noise, ends crisp)
      const sepia = Math.round(this.grimeLevel * 35);
      const blur = (this.grimeLevel * 1.5).toFixed(1);
      const brightness = (1.2 - this.grimeLevel * 0.35).toFixed(2);
      const contrast = (1.15 - this.grimeLevel * 0.25).toFixed(2);
      this.gifElement.style.filter = `sepia(${sepia}%) blur(${blur}px) brightness(${brightness}) contrast(${contrast})`;
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

      // Audio trigger
      if (this.currentStage !== 'FILL') {
        this.audio.startWaterFill();
      }
      this.setMachineShake('none');
    }
    // STAGE 3: 60s - 180s (120s = 2.0 minutes: Gentle Rocking & Tumble Wash)
    else if (t < 180) {
      stageKey = 'WASH';
      stageName = 'GENTLE ROCK & TUMBLE WASH';
      this.water.isFilling = false;
      this.audio.stopWaterFill();

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

      // Audio
      if (this.currentStage !== 'WASH') {
        this.audio.startTumble(true);
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
      this.audio.stopTumble();

      const drainProgress = (t - 180) / 40;
      targetWater = 0.45 * (1 - drainProgress);
      targetAgitation = 0.2;
      targetFoam = 0.6 * (1 - drainProgress * 0.7);
      this.targetRPM = 20;

      if (this.currentStage !== 'DRAIN') {
        this.audio.startDrain();
      }
      this.setMachineShake('none');
    }
    // STAGE 5: 220s - 245s (25s: Clean Spray Rinse & Pre-Spin Drain)
    else if (t < 245) {
      stageKey = 'RINSE';
      stageName = 'FRESH WATER JET RINSE';

      if (t < 237) {
        // Active jet spray rinse (220s - 237s)
        this.audio.stopDrain();
        this.water.isFilling = true;
        targetWater = 0.15;
        targetAgitation = 0.5;
        targetFoam = 0.15;
        this.water.setClarity(0.85);
        this.targetRPM = (Math.sin(t * 2) > 0) ? 55 : -55;

        if (this.currentStage !== 'RINSE') {
          this.audio.startWaterFill();
        }
      } else {
        // Pre-spin drain & pump out (237s - 245s):
        // Smoothly pumps out all rinse water BEFORE the high-speed centrifuge begins!
        this.water.isFilling = false;
        this.audio.stopWaterFill();
        this.audio.startDrain();

        const drainProgress = (t - 237) / 8;
        targetWater = 0.15 * (1 - drainProgress);
        targetAgitation = 0.2 * (1 - drainProgress);
        targetFoam = 0.1 * (1 - drainProgress);
        this.targetRPM = 35;
      }
      this.setMachineShake('gentle');
    }
    // STAGE 6: 245s - 285s (40s: High-Speed Centrifuge Spin)
    else if (t < 285) {
      stageKey = 'SPIN';
      stageName = 'HIGH-SPEED SPIN (1400 RPM)';
      this.water.isFilling = false;
      this.audio.stopWaterFill();

      targetWater = 0;
      targetAgitation = 0;
      this.water.setFoam(0);

      // Spin acceleration curve up to 1400 RPM
      const spinDuration = 285 - 245; // 40s
      const spinProgress = (t - 245) / spinDuration;

      // Keep drain pump running during initial spin extraction
      if (spinProgress < 0.2) {
        this.audio.startDrain();
      } else {
        this.audio.stopDrain();
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

      if (this.currentStage !== 'SPIN') {
        this.audio.startSpin(1400);
      }
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
      this.audio.stopSpin();
      this.setMachineShake('gentle');
      this.setGrimeLevel(0);
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

    // 2D Rigid Body Physics tumbling
    if (this.physics && this.gifWrapper) {
      const simDt = Math.min(0.04, dt * this.speedMultiplier);
      this.physics.update(
        simDt,
        this.drumAngle,
        this.drumRPM,
        (this.water ? this.water.waterLevel : 0),
        (this.water ? (this.water.waterAgitation || this.water.agitation || 0) : 0)
      );
      this.gifWrapper.style.transform = this.physics.getTransform();
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
    this.audio.playCompletionChime();

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
