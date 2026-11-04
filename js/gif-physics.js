// Authentic Clothes Tumbling & Drop Physics with Triangular Wedge Baffles
// Multi-item support (up to 5 clothes/GIFs) + Dynamic mobile-responsive drum sizing

class GifPhysics {
  constructor(washer) {
    this.washer = washer;
    this.drumRadius = 174; // px (dynamically updated from DOM)
    this.gifRadius = 56;   // px (dynamically scaled)
    this.maxRadius = 118;  // px

    // Physical Constants tuned for REALISTIC CLOTHES / LAUNDRY TUMBLING
    this.mass = 1.0;
    this.gravity = 2400;      // px/s^2 (strong downward gravity)
    this.restitution = 0.16;  // Low bounciness! Heavy, soft wet cloth flop on landing
    this.baffleRestitution = 0.12;
    this.wallFriction = 0.32; // Fabric friction on stainless drum
    this.rotationalInertia = 0.5 * this.mass * (this.gifRadius * this.gifRadius);

    // Bodies array (1 to 5 laundry items)
    this.bodies = [];

    // Legacy singular properties for backwards compatibility
    this.x = 0;
    this.y = 95;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.squashX = 1;
    this.squashY = 1;

    // Mouse / Touch Dragging
    this.isDragging = false;
    this.draggedBody = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragHistory = [];

    // Sound cooldown
    this.lastThudTime = 0;

    this.initMouseEvents();
    this.reset();
  }

  updateDrumDimensions(forcedCount = null) {
    const chamber = document.querySelector('.drum-chamber');
    if (chamber) {
      const rect = chamber.getBoundingClientRect();
      if (rect.width > 0) {
        this.drumRadius = rect.width / 2;
        const count = (forcedCount !== null) ? forcedCount : Math.max(1, this.bodies.length);
        this.gifRadius = (count > 1) 
          ? Math.max(26, Math.round(this.drumRadius * 0.24))
          : Math.max(38, Math.round(this.drumRadius * 0.32));
        this.maxRadius = Math.max(30, this.drumRadius - this.gifRadius);
        this.rotationalInertia = 0.5 * this.mass * (this.gifRadius * this.gifRadius);

        for (const b of this.bodies) {
          b.radius = this.gifRadius;
        }
      }
    }
  }

  setBodies(elements) {
    this.bodies = [];
    if (!elements || elements.length === 0) {
      this.syncLegacyProps();
      return;
    }
    const count = elements.length;
    this.updateDrumDimensions(count);

    elements.forEach((el, i) => {
      const staggerX = (i - (count - 1) / 2) * (this.gifRadius * 1.1);
      const staggerY = 70 + (i % 2) * 16;
      this.bodies.push({
        id: i,
        el: el,
        x: staggerX,
        y: staggerY,
        vx: (Math.random() - 0.5) * 30,
        vy: 0,
        angle: (i * 0.35),
        angularVelocity: 0,
        squashX: 1,
        squashY: 1,
        isCentrifugalPinned: false,
        pinnedDrumOffset: (i / count) * Math.PI * 2, // Evenly spaced during 1400 RPM spin!
        floatPhase: i * 1.57,
        radius: this.gifRadius,
        mass: 1.0,
      });
    });

    this.syncLegacyProps();
  }

  reset() {
    if (!this.bodies || this.bodies.length === 0) {
      this.bodies = [];
      this.syncLegacyProps();
      return;
    }
    const count = this.bodies.length;
    this.bodies.forEach((b, i) => {
      b.x = (i - (count - 1) / 2) * (this.gifRadius * 1.1);
      b.y = 70 + (i % 2) * 16;
      b.vx = 0;
      b.vy = 0;
      b.angle = (i * 0.35);
      b.angularVelocity = 0;
      b.squashX = 1;
      b.squashY = 1;
      b.isCentrifugalPinned = false;
      b.pinnedDrumOffset = (i / count) * Math.PI * 2;
    });
    this.isDragging = false;
    this.draggedBody = null;
    this.syncLegacyProps();
  }

  syncLegacyProps() {
    const primary = this.bodies[0];
    if (primary) {
      this.x = primary.x;
      this.y = primary.y;
      this.vx = primary.vx;
      this.vy = primary.vy;
      this.angle = primary.angle;
      this.angularVelocity = primary.angularVelocity;
      this.squashX = primary.squashX;
      this.squashY = primary.squashY;
    }
  }

  initMouseEvents() {
    const chamber = document.querySelector('.drum-chamber');
    if (!chamber) return;

    const onPointerDown = (clientX, clientY) => {
      const rect = chamber.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const pointerX = clientX - centerX;
      const pointerY = clientY - centerY;

      // Find closest body to pointer
      let closest = null;
      let closestDist = Infinity;
      for (const b of this.bodies) {
        const d = Math.hypot(pointerX - b.x, pointerY - b.y);
        if (d < closestDist) {
          closestDist = d;
          closest = b;
        }
      }

      if (closest && closestDist < closest.radius + 35) {
        this.isDragging = true;
        this.draggedBody = closest;
        this.dragOffsetX = closest.x - pointerX;
        this.dragOffsetY = closest.y - pointerY;
        this.dragHistory = [{ x: closest.x, y: closest.y, t: performance.now() }];
        closest.vx = 0;
        closest.vy = 0;
      }
    };

    const onPointerMove = (clientX, clientY) => {
      if (!this.isDragging || !this.draggedBody) return;
      const rect = chamber.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let targetX = (clientX - centerX) + this.dragOffsetX;
      let targetY = (clientY - centerY) + this.dragOffsetY;

      const dist = Math.hypot(targetX, targetY);
      if (dist > this.maxRadius) {
        targetX = (targetX / dist) * this.maxRadius;
        targetY = (targetY / dist) * this.maxRadius;
      }

      this.draggedBody.x = targetX;
      this.draggedBody.y = targetY;

      const now = performance.now();
      this.dragHistory.push({ x: targetX, y: targetY, t: now });
      if (this.dragHistory.length > 5) this.dragHistory.shift();
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (this.draggedBody && this.dragHistory.length >= 2) {
        const first = this.dragHistory[0];
        const last = this.dragHistory[this.dragHistory.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.01) {
          this.draggedBody.vx = Math.max(-1200, Math.min(1200, (last.x - first.x) / dt));
          this.draggedBody.vy = Math.max(-1200, Math.min(1200, (last.y - first.y) / dt));
          this.draggedBody.angularVelocity = (Math.random() - 0.5) * 8;
        }
      }
      this.draggedBody = null;
    };

    chamber.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    chamber.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }

  // Primary Physics Step
  update(dt, drumAngleDeg = 0, drumRPM = 0, waterLevel = 0, waterAgitation = 0) {
    this.updateDrumDimensions();
    if (this.bodies.length === 0) return;

    const absRPM = Math.abs(drumRPM);
    const drumOmega = (drumRPM * 2 * Math.PI) / 60; // rad/s
    const drumAngleRad = (drumAngleDeg * Math.PI) / 180;

    const count = this.bodies.length;
    for (let i = 0; i < count; i++) {
      const b = this.bodies[i];
      if (this.isDragging && this.draggedBody === b) continue;

      // CENTRIFUGAL LOCK MODE (High-speed spin cycle > 180 RPM)
      if (absRPM > 180) {
        if (!b.isCentrifugalPinned) {
          b.isCentrifugalPinned = true;
          b.pinnedDrumOffset = (i / count) * Math.PI * 2;
        }

        const currentAngle = drumAngleRad + b.pinnedDrumOffset;
        b.x = Math.cos(currentAngle) * this.maxRadius;
        b.y = Math.sin(currentAngle) * this.maxRadius;
        b.vx = -drumOmega * b.y;
        b.vy = drumOmega * b.x;
        b.angle = currentAngle + Math.PI / 2;
        b.angularVelocity = drumOmega;

        const stretch = 1 + Math.min(0.22, absRPM / 4500);
        b.squashX = stretch;
        b.squashY = 1 / stretch;
        continue;
      }

      if (b.isCentrifugalPinned) {
        b.isCentrifugalPinned = false;
        b.vx = -drumOmega * b.y * 0.7;
        b.vy = drumOmega * b.x * 0.7;
        b.squashX = 1;
        b.squashY = 1;
      }

      // Sub-stepping for smooth physics & baffle collision
      const subSteps = 6;
      const sdt = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        this.stepBody(b, sdt, drumAngleRad, drumOmega, drumRPM, waterLevel, waterAgitation);
      }

      b.squashX += (1 - b.squashX) * (dt * 10);
      b.squashY += (1 - b.squashY) * (dt * 10);
    }

    // Inter-body soft collision/repulsion
    if (count > 1) {
      this.resolveInterBodyCollisions();
    }

    // Apply transform to DOM elements
    for (const b of this.bodies) {
      if (b.el) {
        b.el.style.transform = `translate(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px) rotate(${b.angle.toFixed(3)}rad) scale(${b.squashX.toFixed(3)}, ${b.squashY.toFixed(3)})`;
      }
    }

    this.syncLegacyProps();
  }

  resolveInterBodyCollisions() {
    const count = this.bodies.length;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const b1 = this.bodies[i];
        const b2 = this.bodies[j];
        if (b1.isCentrifugalPinned || b2.isCentrifugalPinned) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b1.radius + b2.radius;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          b1.x -= nx * overlap * 0.5;
          b1.y -= ny * overlap * 0.5;
          b2.x += nx * overlap * 0.5;
          b2.y += ny * overlap * 0.5;

          const relVx = b2.vx - b1.vx;
          const relVy = b2.vy - b1.vy;
          const normalVel = relVx * nx + relVy * ny;

          if (normalVel < 0) {
            const impulse = -(1 + this.restitution) * normalVel * 0.5;
            b1.vx -= impulse * nx;
            b1.vy -= impulse * ny;
            b2.vx += impulse * nx;
            b2.vy += impulse * ny;
          }
        }
      }
    }
  }

  stepBody(b, dt, drumAngle, drumOmega, drumRPM, waterLevel, waterAgitation) {
    const absRPM = Math.abs(drumRPM);

    // 1. FORCES: GRAVITY
    let fx = 0;
    let fy = this.gravity * b.mass;

    // 2. CENTRIFUGAL PINNING FORCE
    if (absRPM > 260) {
      const spinBlend = Math.min(1.0, (absRPM - 260) / 200);
      const dist = Math.hypot(b.x, b.y) || 1;
      const outwardX = b.x / dist;
      const outwardY = b.y / dist;

      const centrifugalForce = Math.min(26000, (drumOmega * drumOmega * dist) * 0.52);
      fx += outwardX * centrifugalForce * b.mass * spinBlend;
      fy += outwardY * centrifugalForce * b.mass * spinBlend;
    }

    // 3. WATER BUOYANCY & BOBBING
    if (waterLevel > 0.04) {
      const waterHeight = this.drumRadius * 2 * waterLevel;
      const baseSurfaceY = this.drumRadius - waterHeight;

      const now = performance.now() * 0.003;
      const waveAmp = (14 * waterAgitation + 5);
      const waveSurfaceY = baseSurfaceY + Math.sin(now * 3.2 + b.x * 0.035 + b.floatPhase) * waveAmp
                                        + Math.cos(now * 1.6 - b.x * 0.02 + b.floatPhase) * (waveAmp * 0.45);

      const gifBottom = b.y + b.radius;
      const depthInWater = gifBottom - waveSurfaceY;

      if (depthInWater > 0) {
        const submergedFraction = Math.min(1.0, depthInWater / (b.radius * 1.6));
        const buoyancyForce = this.gravity * (1.15 + submergedFraction * 1.65);
        fy -= buoyancyForce * b.mass;

        const targetEquilibriumY = waveSurfaceY + (b.radius * 0.4);
        const bobDisplacement = b.y - targetEquilibriumY;
        const bobSpring = 950 * (bobDisplacement / b.radius);
        fy -= bobSpring * b.mass;

        const waterFlowVx = (drumOmega * 35) + Math.sin(now * 2.8 + b.floatPhase) * (waterAgitation * 200);
        const fluidDragX = 7.0 * submergedFraction;
        fx += (waterFlowVx - b.vx) * fluidDragX * b.mass;

        const fluidDampY = 5.5 * submergedFraction;
        fy -= b.vy * fluidDampY * b.mass;

        const targetWaveTilt = Math.cos(now * 3.2 + b.x * 0.035 + b.floatPhase) * (0.35 * waterAgitation + 0.12)
                             + (b.vx * 0.001);
        const tiltTorque = (targetWaveTilt - b.angle) * (16 * submergedFraction);
        b.angularVelocity += tiltTorque * dt;
        b.angularVelocity *= Math.pow(0.88, dt * 60);
      } else {
        fx -= b.vx * 0.35;
        fy -= b.vy * 0.35;
        b.angularVelocity *= Math.pow(0.97, dt * 60);
      }
    } else {
      fx -= b.vx * 0.35;
      fy -= b.vy * 0.35;
      b.angularVelocity *= Math.pow(0.97, dt * 60);
    }

    // Integrate acceleration
    b.vx += (fx / b.mass) * dt;
    b.vy += (fy / b.mass) * dt;

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.angularVelocity * dt;

    // 4. CIRCULAR DRUM WALL INTERACTION
    const dist = Math.hypot(b.x, b.y);
    if (dist >= this.maxRadius) {
      const nx = -b.x / (dist || 1);
      const ny = -b.y / (dist || 1);

      b.x = -nx * this.maxRadius;
      b.y = -ny * this.maxRadius;

      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        const impactSpeed = Math.abs(vn);
        const normalImpulse = -(1 + this.restitution) * vn;
        b.vx += normalImpulse * nx;
        b.vy += normalImpulse * ny;

        const tx = -ny;
        const ty = nx;
        const wallSpeed = drumOmega * this.drumRadius;
        const relVt = (b.vx * tx + b.vy * ty) - wallSpeed;

        const frictionCoeff = (absRPM > 260) ? 0.75 : this.wallFriction;
        const frictionImpulse = -relVt * frictionCoeff;

        b.vx += frictionImpulse * tx;
        b.vy += frictionImpulse * ty;

        b.angularVelocity += (frictionImpulse * b.radius * 0.4) / this.rotationalInertia;
        b.angularVelocity *= 0.92;

        if (impactSpeed > 90) {
          const squish = Math.min(0.25, impactSpeed / 900);
          b.squashX = 1 + squish;
          b.squashY = 1 - squish;
          this.triggerLaundryThud(impactSpeed);
        }
      }
    }

    // 5. TRIANGULAR BAFFLE COLLISIONS
    this.simulateTriangularBaffles(b, drumAngle, drumOmega, absRPM, dt);
  }

  simulateTriangularBaffles(b, drumAngle, drumOmega, absRPM, dt) {
    if (absRPM < 1) return;

    const topOffset = -Math.PI / 2;
    const baffleAngles = [
      drumAngle + topOffset,
      drumAngle + topOffset + (2 * Math.PI) / 3,
      drumAngle + topOffset + (4 * Math.PI) / 3
    ];

    const rWall = this.drumRadius;
    const rApex = this.drumRadius - Math.min(48, this.drumRadius * 0.28);
    const baseHalfAngle = 0.26;

    for (const bAngle of baffleAngles) {
      const apexX = Math.cos(bAngle) * rApex;
      const apexY = Math.sin(bAngle) * rApex;

      const base1X = Math.cos(bAngle - baseHalfAngle) * rWall;
      const base1Y = Math.sin(bAngle - baseHalfAngle) * rWall;

      const base2X = Math.cos(bAngle + baseHalfAngle) * rWall;
      const base2Y = Math.sin(bAngle + baseHalfAngle) * rWall;

      this.collideWithRampSegment(b, base1X, base1Y, apexX, apexY, drumOmega);
      this.collideWithRampSegment(b, base2X, base2Y, apexX, apexY, drumOmega);
    }
  }

  collideWithRampSegment(b, x1, y1, x2, y2, drumOmega) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLenSq = dx * dx + dy * dy;
    if (segLenSq < 1) return;

    let u = ((b.x - x1) * dx + (b.y - y1) * dy) / segLenSq;
    if (u <= 0.05) return;
    u = Math.min(1, u);

    const qx = x1 + u * dx;
    const qy = y1 + u * dy;

    const distX = b.x - qx;
    const distY = b.y - qy;
    const dist = Math.hypot(distX, distY);
    const colRadius = b.radius;

    if (dist < colRadius && dist > 0.001) {
      const nx = distX / dist;
      const ny = distY / dist;

      const penetration = colRadius - dist;
      b.x += nx * penetration;
      b.y += ny * penetration;

      const baffleVx = -drumOmega * qy;
      const baffleVy = drumOmega * qx;

      const relVx = b.vx - baffleVx;
      const relVy = b.vy - baffleVy;
      const vn = relVx * nx + relVy * ny;

      if (vn < 0) {
        const impact = Math.abs(vn);
        b.vx -= (1 + this.baffleRestitution) * vn * nx;
        b.vy -= (1 + this.baffleRestitution) * vn * ny;

        const segLen = Math.sqrt(segLenSq);
        const tx = dx / segLen;
        const ty = dy / segLen;

        const vt = relVx * tx + relVy * ty;
        const rampSlideFriction = 0.06;
        b.vx -= vt * rampSlideFriction * tx;
        b.vy -= vt * rampSlideFriction * ty;

        b.angularVelocity = drumOmega * 0.65;

        if (impact > 95) {
          this.triggerLaundryThud(impact);
        }
      }
    }
  }

  triggerLaundryThud(impactSpeed) {
    const now = performance.now();
    if (now - this.lastThudTime < 130) return;
    this.lastThudTime = now;

    if (this.washer && this.washer.audio) {
      this.washer.audio.playDrumThud(impactSpeed);
    }

    if (this.washer && this.washer.water && this.washer.water.waterLevel > 0.06) {
      this.washer.water.spawnBubble();
    }
  }

  getTransform() {
    return `translate(${this.x.toFixed(2)}px, ${this.y.toFixed(2)}px) rotate(${this.angle.toFixed(3)}rad) scale(${this.squashX.toFixed(3)}, ${this.squashY.toFixed(3)})`;
  }
}

window.GifPhysics = GifPhysics;
