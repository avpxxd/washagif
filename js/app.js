// Main Application Orchestrator & UI Interaction for WashaGif

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Canvas & Engines
  const canvasElement = document.getElementById('water-canvas');
  const waterCanvas = new WaterCanvas(canvasElement);
  const audio = window.washerAudio;
  const washer = new WasherMachine(waterCanvas, audio);
  window.washer = washer;

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
  let completionAutoTimer = null;
  let isFallingOut = false;

  const triviaTicker = document.getElementById('trivia-ticker');

  // 3. Fun Laundromat Trivia & Tips
  const laundryMemeFacts = [
    "Never wash a rare meme in water above 40°C to preserve pixel borders.",
    "99.4% of crusty Reddit compression artifacts are now dissolved.",
    "Missing Sock Alert: One white gym sock was found in the dryer's lint filter.",
    "Laundromat Etiquette: Please do not leave your GIFs unattended for more than 48 hours.",
    "Watching your memes spin in circles is clinically proven to lower stress.",
    "Recommended dry cycle: Tumble dry low or hang dry on a high-speed network cable.",
    "Removing 15 years of repost watermarks, Ifunny tags, and bad screenshot borders."
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

  // 4. File Upload & Drag-and-Drop Handlers (Supports up to 5 images / GIFs)
  let loadedMediaList = [];

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type && f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      alert('Please select valid image or GIF files!');
      return;
    }

    const availableSlots = 5 - loadedMediaList.length;
    if (availableSlots <= 0) {
      showToast('⚠️ Drum is full! Maximum 5 items already loaded.');
      return;
    }

    const filesToLoad = validFiles.slice(0, availableSlots);
    let loadedCount = 0;

    filesToLoad.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadedMediaList.push(e.target.result);
        loadedCount++;

        if (loadedCount === filesToLoad.length) {
          washer.loadMedia(loadedMediaList);
          washer.closeDoor();
          audio.playDoorLock(false);
          awaitingCollectOpen = false;
          if (doorOpenPrompt) doorOpenPrompt.classList.remove('visible');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFiles(e.target.files);
        fileInput.value = '';
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
        handleFiles(dt.files);
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
      clearTimeout(completionAutoTimer);
      awaitingCollectOpen = false;
      if (doorOpenPrompt) {
        doorOpenPrompt.classList.remove('visible');
      }

      audio.playDialClick();
      washer.openDoor(true, false);

      // Execute all GIFs falling out, down and offscreen!
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
    if (isFallingOut) return;
    isFallingOut = true;

    clearTimeout(completionAutoTimer);
    awaitingCollectOpen = false;
    if (doorOpenPrompt) {
      doorOpenPrompt.classList.remove('visible');
    }

    const wrappers = document.querySelectorAll('.washing-gif-wrapper');
    if (!wrappers || wrappers.length === 0) {
      loadedMediaList = [];
      washer.loadMedia([]);
      washer.state = 'IDLE';
      washer.resetCycle();
      washer.openDoor(false, true);
      updateStageStack('IDLE');
      isFallingOut = false;
      return;
    }

    const count = wrappers.length;
    const clones = [];

    wrappers.forEach((wrapper, index) => {
      const rect = wrapper.getBoundingClientRect();
      const clone = document.createElement('div');
      clone.className = 'falling-laundry-clone';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.animationDelay = `${index * 60}ms`;

      const cloneImg = document.createElement('img');
      const innerImg = wrapper.querySelector('img');
      cloneImg.src = loadedMediaList[index] || (innerImg ? innerImg.src : '');
      cloneImg.style.width = '100%';
      cloneImg.style.height = '100%';
      cloneImg.style.objectFit = 'contain';
      cloneImg.style.borderRadius = '12px';
      cloneImg.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.6)';

      clone.appendChild(cloneImg);
      document.body.appendChild(clone);
      clones.push(clone);

      wrapper.style.visibility = 'hidden';
    });

    audio.playDrumThud(450);

    requestAnimationFrame(() => {
      clones.forEach(c => c.classList.add('falling-down-offscreen'));
    });

    setTimeout(() => {
      clones.forEach(c => c.remove());

      // CLEAR OLD MEDIA & RESET MACHINE READY FOR NEXT LOAD
      loadedMediaList = [];
      washer.loadMedia([]);
      washer.state = 'IDLE';
      washer.resetCycle();
      washer.openDoor(false, true); // Keep door open, show drum-dropzone
      updateStageStack('IDLE');
      isFallingOut = false;
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
    else if (s.includes('SPIN') || s.includes('FINISH')) activeKey = 'spin';
    else if (s.includes('DONE')) activeKey = 'done';

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

    // Auto-open door and tumble GIFs out after 1.8 seconds so you can load more
    clearTimeout(completionAutoTimer);
    completionAutoTimer = setTimeout(() => {
      if (awaitingCollectOpen) {
        handleDoorOpenAction();
      }
    }, 1800);
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

  // Start with empty drum and door open
  washer.loadMedia(loadedMediaList);
  washer.openDoor(false);
});
