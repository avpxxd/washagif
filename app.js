// Main Application Orchestrator & UI Interaction for WashaGif

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Canvas & Engines
  const canvasElement = document.getElementById('water-canvas');
  const waterCanvas = new WaterCanvas(canvasElement);
  const audio = window.washerAudio;
  const washer = new WasherMachine(waterCanvas, audio);

  // 2. DOM Elements
  const timerDisplay = document.getElementById('timer-display');
  const cycleProgressBar = document.getElementById('cycle-progress-bar');
  const btnStartPause = document.getElementById('btn-start-pause');
  const btnMute = document.getElementById('btn-mute');

  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('drum-dropzone');
  const washerChassis = document.getElementById('washer-chassis');
  const doorHandle = document.getElementById('door-handle');
  const doorGlass = document.querySelector('.door-glass');
  const doorOpenPrompt = document.getElementById('door-open-prompt');
  let awaitingCollectOpen = false;

  const completionModal = document.getElementById('completion-modal');
  const btnDownloadWashed = document.getElementById('btn-download-washed');
  const btnWashAgain = document.getElementById('btn-wash-again');
  const cleanResultImg = document.getElementById('clean-result-img');

  const triviaTicker = document.getElementById('trivia-ticker');

  // 3. Fun Laundromat Trivia & Tips
  const laundryMemeFacts = [
    "💡 Tip: Never wash a rare Pepe in water above 40°C to preserve pixel borders.",
    "🫧 Suds Report: 99.4% of crusty Reddit compression artifacts are now dissolved.",
    "🧦 Missing Sock Alert: One white gym sock was detected in the digital lint filter.",
    "⚡ RPM Sensor: Spinning at high G-force to squeeze out every drop of moldy JPEG noise.",
    "🧼 Laundromat Etiquette: Please do not leave your GIFs unattended for more than 48 hours.",
    "✨ Chemical Analysis: Active enzyme bleachers are targeting 8-bit color quantization banding.",
    "🌀 Zen Moment: Watching your meme spin in a circle is clinically proven to lower stress.",
    "👕 Fabric Care: Recommended dry cycle: Tumble dry low or hang dry on a high-speed fiber cable.",
    "🔬 Deep Clean: Removing 15 years of repost watermarks, Ifunny tags, and screenshot borders."
  ];
  let factIndex = 0;

  if (triviaTicker) {
    setInterval(() => {
      factIndex = (factIndex + 1) % laundryMemeFacts.length;
      triviaTicker.style.opacity = '0';
      setTimeout(() => {
        triviaTicker.textContent = laundryMemeFacts[factIndex];
        triviaTicker.style.opacity = '1';
      }, 350);
    }, 12000);
  }

  // 4. File Upload & Drag-and-Drop Handlers
  let currentLoadedSrc = 'assets/sample-cat.gif';

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image or GIF file!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentLoadedSrc = e.target.result;
      const gifWrapper = document.getElementById('washing-gif-wrapper');
      if (gifWrapper) gifWrapper.style.visibility = 'visible';

      washer.loadMedia(currentLoadedSrc, file.type === 'image/gif');
      washer.closeDoor();
      audio.playDoorLock(false);
      awaitingCollectOpen = false;
      if (doorOpenPrompt) doorOpenPrompt.classList.remove('visible');
    };
    reader.readAsDataURL(file);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
  }

  // Drag-and-Drop directly onto the washing machine chassis or drum
  const dropTargets = [washerChassis, dropZone].filter(Boolean);

  dropTargets.forEach(target => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      target.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      target.addEventListener(eventName, () => {
        if (washerChassis) washerChassis.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      target.addEventListener(eventName, () => {
        if (washerChassis) washerChassis.classList.remove('drag-active');
      });
    });

    target.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt.files && dt.files.length > 0) {
        handleFile(dt.files[0]);
      }
    });
  });

  // Clicking open dropzone opens file dialog
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Door open action handler
  function handleDoorOpenAction() {
    if (washer.state === 'RUNNING' && washer.isDoorLocked) return;

    if (awaitingCollectOpen) {
      awaitingCollectOpen = false;
      if (doorOpenPrompt) {
        doorOpenPrompt.classList.remove('visible');
      }

      audio.playDialClick();
      // Open the door WITHOUT immediately showing the dropzone prompt
      washer.openDoor(true, false);

      // Execute GIF falling out, down and offscreen!
      executeGifFallOut();
      return;
    }

    // Normal door toggle
    audio.playDialClick();
    if (washer.isDoorOpen) {
      washer.closeDoor();
    } else {
      washer.openDoor();
    }
  }

  function executeGifFallOut() {
    const gifWrapper = document.getElementById('washing-gif-wrapper');
    if (!gifWrapper) return;

    // Capture screen bounding rectangle of the GIF inside drum
    const rect = gifWrapper.getBoundingClientRect();

    // Create falling clone on document body
    const fallingClone = document.createElement('div');
    fallingClone.className = 'falling-laundry-clone';
    fallingClone.style.left = `${rect.left}px`;
    fallingClone.style.top = `${rect.top}px`;
    fallingClone.style.width = `${rect.width}px`;
    fallingClone.style.height = `${rect.height}px`;

    const cloneImg = document.createElement('img');
    cloneImg.src = currentLoadedSrc;
    cloneImg.style.width = '100%';
    cloneImg.style.height = '100%';
    cloneImg.style.objectFit = 'contain';
    cloneImg.style.borderRadius = '12px';
    cloneImg.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.6)';

    fallingClone.appendChild(cloneImg);
    document.body.appendChild(fallingClone);

    // Hide original in drum while falling
    gifWrapper.style.visibility = 'hidden';

    // Wet laundry flop audio
    audio.playDrumThud(420);

    // Animate falling out, down and offscreen!
    requestAnimationFrame(() => {
      fallingClone.classList.add('falling-down-offscreen');
    });

    // Once it has fallen offscreen (~850ms)
    setTimeout(() => {
      fallingClone.remove();

      // Show the drum open prompt saying to insert a GIF!
      if (dropZone) {
        dropZone.classList.add('visible');
      }

      showToast('🧺 GIF fell out clean! Insert a new GIF to wash.');

      // Present completion modal for download
      setTimeout(() => {
        if (cleanResultImg) cleanResultImg.src = currentLoadedSrc;
        if (completionModal) completionModal.classList.add('visible');
      }, 400);
    }, 850);
  }

  // Washer door click handler (handles clicks anywhere on the door)
  const washerDoor = document.getElementById('washer-door');
  if (washerDoor) {
    washerDoor.addEventListener('click', (e) => {
      if (washer.state !== 'RUNNING') {
        e.stopPropagation();
        if (!washer.isDoorOpen) {
          handleDoorOpenAction();
        }
      }
    });
  }

  // Physical door handle toggles door open / closed
  if (doorHandle) {
    doorHandle.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDoorOpenAction();
    });
  }

  // Clicking door glass when idle opens door or prompts file upload
  if (doorGlass) {
    doorGlass.addEventListener('click', (e) => {
      if (washer.state !== 'RUNNING') {
        e.stopPropagation();
        if (!washer.isDoorOpen) {
          handleDoorOpenAction();
        } else if (fileInput) {
          fileInput.click();
        }
      }
    });
  }

  // Clicking the prompt overlay directly opens door
  if (doorOpenPrompt) {
    doorOpenPrompt.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDoorOpenAction();
    });
  }

  // 5. Washer State Callbacks
  function updateStageStack(stage) {
    if (!stage) return;
    const s = stage.toUpperCase();
    let activeKey = '';
    if (s.includes('SENSE')) activeKey = 'sense';
    else if (s.includes('FILL')) activeKey = 'fill';
    else if (s.includes('WASH') || s.includes('DRAIN')) activeKey = 'wash';
    else if (s.includes('RINSE')) activeKey = 'rinse';
    else if (s.includes('SPIN')) activeKey = 'spin';
    else if (s.includes('DONE') || s.includes('FINISH')) activeKey = 'done';

    ['sense', 'fill', 'wash', 'rinse', 'spin', 'done'].forEach(key => {
      const el = document.getElementById(`stage-${key}`);
      if (el) {
        el.classList.toggle('active', key === activeKey);
      }
    });
  }

  washer.onCycleUpdate = (info) => {
    // Format MM:SS for digital timer
    const mins = Math.floor(info.remaining / 60);
    const secs = Math.floor(info.remaining % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    if (timerDisplay) timerDisplay.textContent = timeStr;
    
    if (cycleProgressBar) {
      const pct = ((info.elapsed / info.total) * 100).toFixed(1);
      cycleProgressBar.style.width = `${pct}%`;
    }

    if (info && info.stage) {
      updateStageStack(info.stage);
    }
  };

  washer.onStateChange = (state) => {
    if (!btnStartPause) return;
    if (state === 'RUNNING') {
      btnStartPause.innerHTML = `<span class="icon">⏸</span> PAUSE`;
      btnStartPause.classList.add('running');
    } else if (state === 'PAUSED') {
      btnStartPause.innerHTML = `<span class="icon">▶</span> RESUME`;
      btnStartPause.classList.remove('running');
    } else {
      btnStartPause.innerHTML = `<span class="icon">▶</span> START`;
      btnStartPause.classList.remove('running');
    }
  };

  washer.onCycleComplete = () => {
    updateStageStack('DONE');
    awaitingCollectOpen = true;

    // Show prompt directly on the washer door to open it!
    if (doorOpenPrompt) {
      doorOpenPrompt.classList.add('visible');
    }
  };

  // 6. Start / Pause Control
  if (btnStartPause) {
    btnStartPause.addEventListener('click', () => {
      audio.playButtonBeep(600);
      if (washer.state === 'RUNNING') {
        washer.pause();
      } else {
        washer.start();
      }
    });
  }

  if (btnMute) {
    btnMute.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      btnMute.innerHTML = isMuted ? `<span class="icon">🔇</span> MUTED` : `<span class="icon">🔊</span> SOUND ON`;
      btnMute.classList.toggle('muted', isMuted);
    });
  }

  // 7. Completion Modal Handlers
  if (btnWashAgain) {
    btnWashAgain.addEventListener('click', () => {
      if (completionModal) completionModal.classList.remove('visible');
      const gifWrapper = document.getElementById('washing-gif-wrapper');
      if (gifWrapper) gifWrapper.style.visibility = 'visible';
      washer.resetCycle();
      washer.openDoor(true, true);
      updateStageStack('IDLE');
    });
  }

  if (btnDownloadWashed) {
    btnDownloadWashed.addEventListener('click', () => {
      audio.playButtonBeep(880);
      downloadCleanImage(currentLoadedSrc);
    });
  }

  function downloadCleanImage(src) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 400;
      canvas.height = img.naturalHeight || 400;

      // Draw pristine clean image directly (no added text stamps)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = 'washed-clean-gif.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = src;
  }

  // Toast Notification
  function showToast(msg) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // Load default sample cat on startup and start with door open
  washer.loadMedia(currentLoadedSrc, true);
  washer.openDoor(false);
});
