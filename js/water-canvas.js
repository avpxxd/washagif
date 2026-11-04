// Dynamic Canvas Fluid, Suds, Foam, and Glass Water Effects for WashaGif

class WaterCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.width = canvas.width = 440;
    this.height = canvas.height = 440;
    this.radius = this.width / 2;

    // Simulation state
    this.waterLevel = 0; // 0 to 1 (0 = empty, 0.45 = normal wash level)
    this.targetWaterLevel = 0;
    this.waterAgitation = 0; // 0 (still) to 1 (heavy tumble)
    this.spinIntensity = 0; // 0 to 1 (spin speed)
    this.isDraining = false;
    this.isFilling = false;
    this.waterClarity = 0.3; // 0 (murky dirty wash) to 1 (crystal clean)
    this.foamDensity = 0; // 0 to 1
    this.targetFoam = 0;
    this.sprayAlpha = 0;

    // Wave parameters
    this.wavePhase = 0;
    this.waveTilt = 0; // Tilted water surface when drum rocks

    // Particle systems
    this.bubbles = []; // Floating water bubbles
    this.glassFoam = []; // Foam clings to glass
    this.centrifugalDrops = []; // Droplets slinging outward during spin
    this.sparkles = []; // Sparkles at completion

    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && (this.width !== rect.width || this.height !== rect.height)) {
      this.width = this.canvas.width = Math.round(rect.width);
      this.height = this.canvas.height = Math.round(rect.height);
      this.radius = this.width / 2;
    }
  }

  get agitation() {
    return this.waterAgitation;
  }

  setWaterLevel(level) {
    this.targetWaterLevel = Math.max(0, Math.min(0.65, level));
  }

  setAgitation(agitation, tilt = 0) {
    this.waterAgitation = agitation;
    this.waveTilt = tilt;
  }

  setSpin(spin) {
    this.spinIntensity = spin;
  }

  setClarity(clarity) {
    this.waterClarity = clarity;
  }

  setFoam(foam) {
    this.targetFoam = Math.max(0, Math.min(1, foam));
  }

  addSparkleBurst(count = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.radius * 0.7);
      this.sparkles.push({
        x: this.radius + Math.cos(angle) * dist,
        y: this.radius + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.5 - Math.random() * 2,
        size: 3 + Math.random() * 5,
        alpha: 1,
        life: 1,
        color: ['#ffd700', '#00f2fe', '#ffffff', '#ff9a9e'][Math.floor(Math.random() * 4)],
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  // Spawn soap bubbles in water
  spawnBubble() {
    if (this.waterLevel < 0.05) return;
    const waterY = this.height * (1 - this.waterLevel);
    const bubbleY = waterY + Math.random() * (this.height - waterY);
    const bubbleX = this.radius + (Math.random() - 0.5) * (this.radius * 1.4);

    this.bubbles.push({
      x: bubbleX,
      y: bubbleY,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -0.8 - Math.random() * 1.5,
      r: 2 + Math.random() * 6,
      opacity: 0.6 + Math.random() * 0.3,
      wobble: Math.random() * Math.PI * 2
    });
  }

  // Foam clinging to inside glass
  spawnGlassFoam(x, y) {
    if (this.glassFoam.length > 150) return;
    this.glassFoam.push({
      x: x || (this.radius + (Math.random() - 0.5) * (this.radius * 1.5)),
      y: y || (this.height * (1 - this.waterLevel) - Math.random() * 40),
      r: 3 + Math.random() * 8,
      opacity: 0.75,
      slideSpeed: 0.05 + Math.random() * 0.15,
      life: 1.0
    });
  }

  // Centrifugal spray drops during spin cycle
  spawnSpinDrop() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8 * this.spinIntensity;
    this.centrifugalDrops.push({
      x: this.radius + Math.cos(angle) * 15,
      y: this.radius + Math.sin(angle) * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1 + Math.random() * 2.5,
      life: 1
    });
  }

  animate(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.resize();
    this.update(dt);
    this.render();

    requestAnimationFrame(this.animate);
  }

  update(dt) {
    // Water level interpolation
    this.waterLevel += (this.targetWaterLevel - this.waterLevel) * (dt * 1.5);

    // Foam density smooth interpolation
    this.foamDensity += (this.targetFoam - this.foamDensity) * Math.min(1, dt * 2.5);

    // Spray jets alpha smooth interpolation
    const targetSpray = this.isFilling ? 1 : 0;
    this.sprayAlpha += (targetSpray - this.sprayAlpha) * Math.min(1, dt * 4.0);

    // Wave animation phase
    this.wavePhase += (2 + this.waterAgitation * 6) * dt;

    // Bubbles generation based on agitation
    if (this.waterLevel > 0.08 && this.waterAgitation > 0.1) {
      const spawnCount = Math.floor(this.waterAgitation * 3);
      for (let i = 0; i < spawnCount; i++) {
        if (Math.random() < 0.6) this.spawnBubble();
      }
    }

    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y += b.vy;
      b.x += b.vx + Math.sin(b.wobble) * 0.4;
      b.wobble += 0.1;

      const surfaceY = this.height * (1 - this.waterLevel);
      if (b.y <= surfaceY + 5) {
        // Pop or cling to foam at surface
        if (Math.random() < 0.4 && this.foamDensity > 0.1) {
          this.spawnGlassFoam(b.x, surfaceY);
        }
        this.bubbles.splice(i, 1);
      }
    }

    // Update glass foam
    for (let i = this.glassFoam.length - 1; i >= 0; i--) {
      const f = this.glassFoam[i];
      f.y += f.slideSpeed;
      f.life -= dt * 0.08;
      f.opacity = Math.max(0, f.life * 0.75);

      if (f.life <= 0 || f.y > this.height) {
        this.glassFoam.splice(i, 1);
      }
    }

    // Spin cycle drops
    if (this.spinIntensity > 0.1) {
      const spawnRate = Math.floor(this.spinIntensity * 8);
      for (let i = 0; i < spawnRate; i++) {
        this.spawnSpinDrop();
      }
    }

    for (let i = this.centrifugalDrops.length - 1; i >= 0; i--) {
      const d = this.centrifugalDrops[i];
      d.x += d.vx;
      d.y += d.vy;
      d.life -= dt * 2.2;

      // Check distance from center
      const dist = Math.hypot(d.x - this.radius, d.y - this.radius);
      if (dist >= this.radius - 8 || d.life <= 0) {
        this.centrifugalDrops.splice(i, 1);
      }
    }

    // Update sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.rotSpeed;
      s.life -= dt * 0.6;
      s.alpha = Math.max(0, s.life);

      if (s.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Clip to circular porthole glass
    ctx.beginPath();
    ctx.arc(this.radius, this.radius, this.radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // 1. Draw Water
    if (this.waterLevel > 0.01) {
      this.drawWater(ctx);
    }

    // 2. Draw Soap Bubbles in Water
    this.drawBubbles(ctx);

    // 3. Draw Foam and Suds on Glass
    this.drawGlassFoam(ctx);

    // 4. Draw Centrifugal Spin Spray
    if (this.centrifugalDrops.length > 0) {
      this.drawSpinDrops(ctx);
    }

    // 5. Draw Sparkles
    if (this.sparkles.length > 0) {
      this.drawSparkles(ctx);
    }

    // 6. Draw Top Spray Nozzle Jets (smoothly faded)
    if (this.sprayAlpha > 0.01) {
      this.drawSprayJets(ctx, this.sprayAlpha);
    }

    ctx.restore();
  }

  drawWater(ctx) {
    if (this.waterLevel < 0.003) return;
    const fadeAlpha = Math.min(1.0, this.waterLevel / 0.035);

    const surfaceY = this.height * (1 - this.waterLevel);
    const amp = (8 * this.waterAgitation + 2) * fadeAlpha;
    const tiltOffset = this.waveTilt * 30 * fadeAlpha;

    // Color based on clarity: murky wash water -> crystal clear blue
    const r = Math.round(180 - this.waterClarity * 140);
    const g = Math.round(210 - this.waterClarity * 30);
    const b = Math.round(230 + this.waterClarity * 25);
    const waterAlpha = (0.55 + this.waterClarity * 0.15) * fadeAlpha;

    // Water body gradient
    const grad = ctx.createLinearGradient(0, surfaceY - 20, 0, this.height);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${waterAlpha * 0.7})`);
    grad.addColorStop(0.3, `rgba(${r - 20}, ${g}, ${b + 20}, ${waterAlpha})`);
    grad.addColorStop(1, `rgba(${r - 50}, ${g - 20}, ${b + 10}, ${waterAlpha * 1.1})`);

    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, surfaceY - tiltOffset);

    // Sinusoidal wave surface
    const steps = 30;
    const stepWidth = this.width / steps;
    for (let i = 0; i <= steps; i++) {
      const x = i * stepWidth;
      const progress = i / steps; // 0 to 1
      const tilt = (progress - 0.5) * 2 * tiltOffset;
      const wave = Math.sin(this.wavePhase + progress * Math.PI * 3) * amp
                 + Math.cos(this.wavePhase * 1.5 + progress * Math.PI * 2) * (amp * 0.4);
      ctx.lineTo(x, surfaceY + tilt + wave);
    }

    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Foamy water surface crest line
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = i * stepWidth;
      const progress = i / steps;
      const tilt = (progress - 0.5) * 2 * tiltOffset;
      const wave = Math.sin(this.wavePhase + progress * Math.PI * 3) * amp
                 + Math.cos(this.wavePhase * 1.5 + progress * Math.PI * 2) * (amp * 0.4);
      if (i === 0) ctx.moveTo(x, surfaceY + tilt + wave);
      else ctx.lineTo(x, surfaceY + tilt + wave);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + this.foamDensity * 0.5})`;
    ctx.lineWidth = 3 + this.foamDensity * 6;
    ctx.stroke();
  }

  drawBubbles(ctx) {
    ctx.save();
    for (const b of this.bubbles) {
      const grad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.6, 'rgba(210, 240, 255, 0.5)');
      grad.addColorStop(1, 'rgba(160, 210, 255, 0.2)');

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bubble highlight ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGlassFoam(ctx) {
    ctx.save();
    for (const f of this.glassFoam) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity * 0.6})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(240, 250, 255, ${f.opacity * 0.8})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSpinDrops(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.7)';
    ctx.lineWidth = 1.5;
    for (const d of this.centrifugalDrops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.vx * 0.6, d.y - d.vy * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();
    }
    ctx.restore();
  }

  drawSparkles(ctx) {
    ctx.save();
    for (const s of this.sparkles) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);
      ctx.globalAlpha = s.alpha;

      // 4-pointed star
      ctx.fillStyle = s.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(0, -s.size);
        ctx.lineTo(s.size * 0.25, -s.size * 0.25);
        ctx.rotate(Math.PI / 2);
      }
      ctx.closePath();
      ctx.fill();

      // Center bright core
      ctx.beginPath();
      ctx.arc(0, 0, s.size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  drawSprayJets(ctx, alpha = 1) {
    ctx.save();
    // Two top spray jets spraying clean water down onto the glass
    const nozzleLeft = { x: this.radius - 80, y: 30 };
    const nozzleRight = { x: this.radius + 80, y: 30 };

    [nozzleLeft, nozzleRight].forEach(nozzle => {
      for (let i = 0; i < 8; i++) {
        const spread = (Math.random() - 0.5) * 60;
        const length = 120 + Math.random() * 90;
        ctx.beginPath();
        ctx.moveTo(nozzle.x, nozzle.y);
        ctx.lineTo(nozzle.x + spread, nozzle.y + length);
        ctx.strokeStyle = `rgba(225, 245, 255, ${0.45 * alpha})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.stroke();
      }
    });
    ctx.restore();
  }
}

window.WaterCanvas = WaterCanvas;
