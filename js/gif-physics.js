// Authentic Clothes Tumbling & Drop Physics with Triangular Wedge Baffles
// Features:
// - Triangular baffle collisions (angled ramps on both sides) so GIFs slide off smoothly and never get stuck
// - Lifter scoops clothes up the drum wall
// - Clothes naturally slide up and over the triangular apex, plummeting back to the bottom
// - Soft cloth landing (low restitution, no pinball bouncing)
// - Rolls and settles at the bottom until the next scoop or drum reversal
// - Pins to the outer drum wall ONLY during high-speed spin cycle (1400 RPM)

class GifPhysics {
  constructor(washer) {
    this.washer = washer;
    this.drumRadius = 168; // px
    this.gifRadius = 42;   // px
    this.maxRadius = this.drumRadius - this.gifRadius; // ~126px

    // Position & Velocity (drum center is 0, 0; bottom is +126px)
    this.x = 0;
    this.y = 100;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;

    // Physical Constants tuned for REALISTIC CLOTHES / LAUNDRY TUMBLING
    this.mass = 1.0;
    this.gravity = 2400;      // px/s^2 (strong, clean downward gravity)
    this.restitution = 0.16;  // Low bounciness! Heavy, soft wet cloth flop on landing
    this.baffleRestitution = 0.12;
    this.wallFriction = 0.32; // Fabric friction on stainless drum
    this.rotationalInertia = 0.5 * this.mass * (this.gifRadius * this.gifRadius);

    // Mouse / Touch Dragging
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragHistory = [];

    // Squash & Stretch for soft cloth deformation
    this.squashX = 1;
    this.squashY = 1;

    // Sound cooldown
    this.lastThudTime = 0;

    // Centrifugal Spin-Lock state
    this.isCentrifugalPinned = false;
    this.pinnedDrumOffset = 0;

    this.initMouseEvents();
  }

  reset() {
    this.x = 0;
    this.y = 95;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.angularVelocity = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.isCentrifugalPinned = false;
    this.pinnedDrumOffset = 0;
  }

  initMouseEvents() {
    const chamber = document.getElementById('drum-chamber');
    if (!chamber) return;

    const onPointerDown = (clientX, clientY) => {
      const rect = chamber.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const pointerX = clientX - centerX;
      const pointerY = clientY - centerY;

      const dist = Math.hypot(pointerX - this.x, pointerY - this.y);
      if (dist < this.gifRadius + 30) {
        this.isDragging = true;
        this.dragOffsetX = this.x - pointerX;
        this.dragOffsetY = this.y - pointerY;
        this.dragHistory = [{ x: this.x, y: this.y, t: performance.now() }];
        this.vx = 0;
        this.vy = 0;
      }
    };

    const onPointerMove = (clientX, clientY) => {
      if (!this.isDragging) return;
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

      this.x = targetX;
      this.y = targetY;

      const now = performance.now();
      this.dragHistory.push({ x: this.x, y: this.y, t: now });
      if (this.dragHistory.length > 5) this.dragHistory.shift();
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (this.dragHistory.length >= 2) {
        const first = this.dragHistory[0];
        const last = this.dragHistory[this.dragHistory.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.01) {
          this.vx = Math.max(-1200, Math.min(1200, (last.x - first.x) / dt));
          this.vy = Math.max(-1200, Math.min(1200, (last.y - first.y) / dt));
          this.angularVelocity = (Math.random() - 0.5) * 8;
        }
      }
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
    if (this.isDragging) return;

    const absRPM = Math.abs(drumRPM);
    const drumOmega = (drumRPM * 2 * Math.PI) / 60; // rad/s
    const drumAngleRad = (drumAngleDeg * Math.PI) / 180;

    // CENTRIFUGAL LOCK MODE (High-speed spin cycle > 180 RPM)
    // When the centrifuge spins at high speed, clothes stay pinned to the drum wall
    // and rotate synchronously with the drum, preventing any chaotic baffle collisions or jolting!
    if (absRPM > 180) {
      if (!this.isCentrifugalPinned) {
        this.isCentrifugalPinned = true;
        this.pinnedDrumOffset = Math.atan2(this.y, this.x) - drumAngleRad;
      }

      // Smooth synchronous circular orbit pinned against the wall
      const currentAngle = drumAngleRad + this.pinnedDrumOffset;
      this.x = Math.cos(currentAngle) * this.maxRadius;
      this.y = Math.sin(currentAngle) * this.maxRadius;

      this.vx = -drumOmega * this.y;
      this.vy = drumOmega * this.x;

      this.angle = currentAngle + Math.PI / 2;
      this.angularVelocity = drumOmega;

      // Centrifugal radial stretch
      const stretch = 1 + Math.min(0.22, absRPM / 4500);
      this.squashX = stretch;
      this.squashY = 1 / stretch;
      return;
    }

    // Release from centrifugal lock when decelerating below 180 RPM
    if (this.isCentrifugalPinned) {
      this.isCentrifugalPinned = false;
      this.vx = -drumOmega * this.y * 0.7;
      this.vy = drumOmega * this.x * 0.7;
      this.squashX = 1;
      this.squashY = 1;
    }

    // Sub-stepping for smooth ramp sliding
    const subSteps = 6;
    const sdt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.physicsSubStep(sdt, drumAngleRad, drumOmega, drumRPM, waterLevel, waterAgitation);
    }

    // Recover squash & stretch back to 1.0
    this.squashX += (1 - this.squashX) * (dt * 10);
    this.squashY += (1 - this.squashY) * (dt * 10);
  }

  physicsSubStep(dt, drumAngle, drumOmega, drumRPM, waterLevel, waterAgitation) {
    const absRPM = Math.abs(drumRPM);

    // 1. FORCES: DOWNWARD GRAVITY
    let fx = 0;
    let fy = this.gravity * this.mass;

    // 2. CENTRIFUGAL PINNING (Only kicks in during high-speed spin cycle > 300 RPM)
    if (absRPM > 260) {
      const spinBlend = Math.min(1.0, (absRPM - 260) / 200); // 0 at 260 RPM -> 1.0 at 460+ RPM
      const dist = Math.hypot(this.x, this.y) || 1;
      const outwardX = this.x / dist;
      const outwardY = this.y / dist;

      const centrifugalForce = Math.min(26000, (drumOmega * drumOmega * dist) * 0.52);
      fx += outwardX * centrifugalForce * this.mass * spinBlend;
      fy += outwardY * centrifugalForce * this.mass * spinBlend;
    }

    // 3. WATER BUOYANCY & BOBBING DYNAMICS
    if (waterLevel > 0.04) {
      const waterHeight = this.drumRadius * 2 * waterLevel;
      const baseSurfaceY = this.drumRadius - waterHeight;

      // Realistic sinusoidal water wave sloshing across the drum
      const now = performance.now() * 0.003;
      const waveAmp = (14 * waterAgitation + 5);
      const waveSurfaceY = baseSurfaceY + Math.sin(now * 3.2 + this.x * 0.035) * waveAmp
                                        + Math.cos(now * 1.6 - this.x * 0.02) * (waveAmp * 0.45);

      // GIF immersion depth relative to sloshing wave surface
      const gifBottom = this.y + this.gifRadius;
      const depthInWater = gifBottom - waveSurfaceY;

      if (depthInWater > 0) {
        // Submerged fraction: 0.0 (touching crest) to 1.0 (fully submerged)
        const submergedFraction = Math.min(1.0, depthInWater / (this.gifRadius * 1.6));

        // Buoyant upward force:
        // Exceeds gravity when submerged to lift clothes to float on the surface!
        const buoyancyForce = this.gravity * (1.15 + submergedFraction * 1.65);
        fy -= buoyancyForce * this.mass;

        // Harmonic surface bobbing spring:
        // Laundry floats naturally bobbing around the waterline
        const targetEquilibriumY = waveSurfaceY + (this.gifRadius * 0.4);
        const bobDisplacement = this.y - targetEquilibriumY;
        const bobSpring = 950 * (bobDisplacement / this.gifRadius);
        fy -= bobSpring * this.mass;

        // Sloshing water horizontal flow & surge:
        // As the drum rotates or water agitates, water carries the laundry
        const waterFlowVx = (drumOmega * 40) + Math.sin(now * 2.8) * (waterAgitation * 240);
        const fluidDragX = 7.5 * submergedFraction;
        fx += (waterFlowVx - this.vx) * fluidDragX * this.mass;

        // Fluid damping (viscosity stops unnatural jitter while enabling organic bobbing)
        const fluidDampY = 5.5 * submergedFraction;
        fy -= this.vy * fluidDampY * this.mass;

        // Rotational wave tilt (laundry tilts organically with the water slope)
        const targetWaveTilt = Math.cos(now * 3.2 + this.x * 0.035) * (0.35 * waterAgitation + 0.12)
                             + (this.vx * 0.001);
        const tiltTorque = (targetWaveTilt - this.angle) * (16 * submergedFraction);
        this.angularVelocity += tiltTorque * dt;
        this.angularVelocity *= Math.pow(0.88, dt * 60);
      } else {
        // Air resistance above water
        fx -= this.vx * 0.35;
        fy -= this.vy * 0.35;
        this.angularVelocity *= Math.pow(0.97, dt * 60);
      }
    } else {
      // Dry drum air resistance
      fx -= this.vx * 0.35;
      fy -= this.vy * 0.35;
      this.angularVelocity *= Math.pow(0.97, dt * 60);
    }

    // Integrate acceleration -> velocity
    this.vx += (fx / this.mass) * dt;
    this.vy += (fy / this.mass) * dt;

    // Integrate velocity -> position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle += this.angularVelocity * dt;

    // 4. CIRCULAR DRUM WALL INTERACTION (SLIDING, TUMBLING & SOFT LANDING)
    const dist = Math.hypot(this.x, this.y);
    if (dist >= this.maxRadius) {
      const nx = -this.x / (dist || 1);
      const ny = -this.y / (dist || 1);

      // Clamp position directly onto drum boundary
      this.x = -nx * this.maxRadius;
      this.y = -ny * this.maxRadius;

      // Normal velocity component
      const vn = this.vx * nx + this.vy * ny;

      if (vn < 0) { // Hitting drum wall
        const impactSpeed = Math.abs(vn);

        // SOFT CLOTH IMPACT: Low restitution prevents pinball bouncing!
        const normalImpulse = -(1 + this.restitution) * vn;
        this.vx += normalImpulse * nx;
        this.vy += normalImpulse * ny;

        // Tangential friction along the drum curve
        const tx = -ny;
        const ty = nx;
        const wallSpeed = drumOmega * this.drumRadius;
        const relVt = (this.vx * tx + this.vy * ty) - wallSpeed;

        const frictionCoeff = (absRPM > 260) ? 0.75 : this.wallFriction;
        const frictionImpulse = -relVt * frictionCoeff;

        this.vx += frictionImpulse * tx;
        this.vy += frictionImpulse * ty;

        // Roll spin from sliding along wall
        this.angularVelocity += (frictionImpulse * this.gifRadius * 0.4) / this.rotationalInertia;
        this.angularVelocity *= 0.92;

        if (impactSpeed > 90) {
          const squish = Math.min(0.25, impactSpeed / 900);
          this.squashX = 1 + squish;
          this.squashY = 1 - squish;

          this.triggerLaundryThud(impactSpeed);
        }
      }
    }

    // 5. TRIANGULAR WEDGE BAFFLE COLLISIONS (SLOPED RAMPS: NEVER GETS STUCK!)
    this.simulateTriangularBaffles(drumAngle, drumOmega, absRPM, dt);
  }

  // Simulates the 3 baffles as TRIANGULAR WEDGES with angled ramps on both sides
  // Correctly aligned with visual baffles starting at 12 o'clock (-PI/2)
  simulateTriangularBaffles(drumAngle, drumOmega, absRPM, dt) {
    if (absRPM < 1) return; // Machine stopped

    // Visual baffles are positioned at top (12 o'clock), 4 o'clock, and 8 o'clock.
    // In Cartesian coordinates, 12 o'clock is -PI/2 (-90 degrees).
    const topOffset = -Math.PI / 2;
    const baffleAngles = [
      drumAngle + topOffset,
      drumAngle + topOffset + (2 * Math.PI) / 3,
      drumAngle + topOffset + (4 * Math.PI) / 3
    ];

    const rWall = this.drumRadius;          // 168px
    const rApex = this.drumRadius - 48;     // 120px (height of triangle is 48px)
    const baseHalfAngle = 0.26;             // ~15 degrees half-width on drum wall (~44px base)

    for (const bAngle of baffleAngles) {
      // 1. Apex (Tip pointing inward toward drum center)
      const apexX = Math.cos(bAngle) * rApex;
      const apexY = Math.sin(bAngle) * rApex;

      // 2. Base Left Corner on drum wall
      const base1X = Math.cos(bAngle - baseHalfAngle) * rWall;
      const base1Y = Math.sin(bAngle - baseHalfAngle) * rWall;

      // 3. Base Right Corner on drum wall
      const base2X = Math.cos(bAngle + baseHalfAngle) * rWall;
      const base2Y = Math.sin(bAngle + baseHalfAngle) * rWall;

      // Collide with both sloped sides of the triangle:
      // Side 1: Ramp from Base1 -> Apex
      this.collideWithRampSegment(base1X, base1Y, apexX, apexY, drumOmega);

      // Side 2: Ramp from Base2 -> Apex
      this.collideWithRampSegment(base2X, base2Y, apexX, apexY, drumOmega);
    }
  }

  // Collides GIF with a sloped ramp segment of the triangular baffle
  collideWithRampSegment(x1, y1, x2, y2, drumOmega) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLenSq = dx * dx + dy * dy;
    if (segLenSq < 1) return;

    // Project GIF center onto the ramp segment
    let u = ((this.x - x1) * dx + (this.y - y1) * dy) / segLenSq;
    // When u <= 0.05, the GIF is flush on the drum wall; let the drum wall handle it seamlessly
    if (u <= 0.05) return;
    u = Math.min(1, u);

    // Closest point on the ramp slope
    const qx = x1 + u * dx;
    const qy = y1 + u * dy;

    const distX = this.x - qx;
    const distY = this.y - qy;
    const dist = Math.hypot(distX, distY);
    const colRadius = this.gifRadius; // smooth tangent collision

    if (dist < colRadius && dist > 0.001) {
      // Outward normal pushing GIF away from the ramp slope into the drum
      const nx = distX / dist;
      const ny = distY / dist;

      // Push GIF out along normal (resolves penetration smoothly)
      const penetration = colRadius - dist;
      this.x += nx * penetration;
      this.y += ny * penetration;

      // Velocity of contact point on the rotating baffle
      const baffleVx = -drumOmega * qy;
      const baffleVy = drumOmega * qx;

      // Relative velocity of GIF against the ramp
      const relVx = this.vx - baffleVx;
      const relVy = this.vy - baffleVy;

      // Normal velocity component
      const vn = relVx * nx + relVy * ny;

      if (vn < 0) { // Moving towards ramp face
        const impact = Math.abs(vn);

        // Soft cloth normal reaction (low restitution, no rubber ball bounce)
        this.vx -= (1 + this.baffleRestitution) * vn * nx;
        this.vy -= (1 + this.baffleRestitution) * vn * ny;

        // Tangent along the sloped ramp
        const segLen = Math.sqrt(segLenSq);
        const tx = dx / segLen;
        const ty = dy / segLen;

        // Sloped ramp allows smooth sliding with minimal friction:
        // Gravity naturally accelerates the GIF along the ramp so it slides off the apex!
        const vt = relVx * tx + relVy * ty;
        const rampSlideFriction = 0.06; // Very slippery ramp slope!
        this.vx -= vt * rampSlideFriction * tx;
        this.vy -= vt * rampSlideFriction * ty;

        // Rotation spin from sliding off ramp
        this.angularVelocity = drumOmega * 0.65;

        if (impact > 95) {
          this.triggerLaundryThud(impact);
        }
      }
    }
  }

  triggerLaundryThud(impactSpeed) {
    const now = performance.now();
    if (now - this.lastThudTime < 140) return;
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
