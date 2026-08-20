/* ============================================================
   player.js: capsule controller.

   Walk 2.6 m/s, sprint 4.6 with 7s stamina, crouch 1.3.
   Headbob 1.7 Hz / 0.018 m, disabled under Reduce Motion.
   Eye height 1.66 -- Jared is 5'10", not 6'1". Raycast 2.4 m.
   Hold-to-carry uses a spring so the bucket and the oil can
   have weight, that is the whole point of Chapter 5.
   ============================================================ */
import * as THREE from 'three';
import { Input, held, hit, rawHit } from './input.js';
import { settings } from './state.js';
import { audio } from './audio.js';

const RADIUS = 0.28;
const STEP_UP = 0.42;

export class Player {
  constructor(camera, world) {
    this.cam = camera;
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, 0);   // feet
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.eye = 1.66;
    this.crouching = false;
    this.stamina = 7;
    this.bobPhase = 0;
    this.bobAmt = 0;
    this.stepDist = 0;
    this.surface = 'wood';
    this.frozen = false;         // input does nothing, used deliberately (Ch5 §4)
    this.canMove = true;
    this.canLook = true;
    this.carrying = null;
    this.carryOffset = new THREE.Vector3(0.24, -0.22, -0.55);
    this.headTilt = 0;
    this.shake = 0;
    this.flashlight = null;
    this.flashOn = false;
    this.hasFlashlight = false;
    this.forceLookAt = null;
    this._lookLerp = 0;
    this.extraSpeed = 1;
    this.breathFog = false;
  }

  attachFlashlight(scene) {
    const l = new THREE.SpotLight(0xfff0d8, 0, 16, 0.46, 0.42, 1.4);
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -0.0025;
    l.shadow.camera.near = 0.2; l.shadow.camera.far = 18;
    const tgt = new THREE.Object3D();
    scene.add(l); scene.add(tgt);
    l.target = tgt;
    this.flashlight = l; this.flashTarget = tgt;
  }

  setFlashlight(on) {
    this.flashOn = on && this.hasFlashlight;
    if (this.flashlight) this.flashlight.intensity = this.flashOn ? 2.4 : 0;
  }

  teleport(x, z, y = 0, yaw = 0) {
    this.pos.set(x, y, z);
    this.yaw = yaw; this.pitch = 0;
    this.vel.set(0, 0, 0);
    this.updateCamera(0);
  }

  get eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eye, this.pos.z); }

  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  // ------------------------------------------------------------ collision
  _resolve(next) {
    const w = this.world;
    const top = next.y + (this.crouching ? 1.15 : 1.72);
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of w.colliders) {
        if (top < c.min.y + 0.02 || next.y > c.max.y - 0.02) continue;
        // broad phase against the bound, oriented or not
        if (next.x < c.min.x - RADIUS || next.x > c.max.x + RADIUS ||
            next.z < c.min.z - RADIUS || next.z > c.max.z + RADIUS) continue;
        // step-up: if the collider top is a low ledge we can walk onto, skip
        if (c.max.y - next.y <= STEP_UP && c.max.y - next.y > 0) continue;
        if (c.yaw) { if (this._resolveOriented(next, c)) moved = true; continue; }
        const cx = THREE.MathUtils.clamp(next.x, c.min.x, c.max.x);
        const cz = THREE.MathUtils.clamp(next.z, c.min.z, c.max.z);
        const dx = next.x - cx, dz = next.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          next.x = cx + dx / d * RADIUS;
          next.z = cz + dz / d * RADIUS;
        } else {
          // centre inside the box, push out along the shallowest axis
          const pens = [
            [next.x - c.min.x + RADIUS, -1, 0],
            [c.max.x - next.x + RADIUS, 1, 0],
            [next.z - c.min.z + RADIUS, 0, -1],
            [c.max.z - next.z + RADIUS, 0, 1]
          ].sort((a, b) => a[0] - b[0])[0];
          next.x += pens[1] * pens[0];
          next.z += pens[2] * pens[0];
        }
        moved = true;
      }
      if (!moved) break;
    }
    return next;
  }

  /**
   * Same circle-versus-box resolve, done in the box's own frame so a door
   * leaf standing at 40 degrees pushes you along its face instead of along
   * the world axes. This is the difference between a door you can lean on
   * and a door that is really a square hole in the corridor.
   */
  _resolveOriented(next, c) {
    const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw);
    const rx = next.x - c.cx, rz = next.z - c.cz;
    const lx = rx * cs - rz * sn;
    const lz = rx * sn + rz * cs;
    const qx = THREE.MathUtils.clamp(lx, -c.hw, c.hw);
    const qz = THREE.MathUtils.clamp(lz, -c.hd, c.hd);
    let dx = lx - qx, dz = lz - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= RADIUS * RADIUS) return false;
    let nx, nz;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      nx = qx + dx / d * RADIUS;
      nz = qz + dz / d * RADIUS;
    } else {
      // inside the leaf: out through the nearest face, which for a door
      // is always one of the two big ones
      const pens = [
        [lx + c.hw + RADIUS, -1, 0], [c.hw - lx + RADIUS, 1, 0],
        [lz + c.hd + RADIUS, 0, -1], [c.hd - lz + RADIUS, 0, 1]
      ].sort((a, b) => a[0] - b[0])[0];
      nx = lx + pens[1] * pens[0];
      nz = lz + pens[2] * pens[0];
    }
    next.x = c.cx + nx * cs + nz * sn;
    next.z = c.cz - nx * sn + nz * cs;
    return true;
  }

  // ------------------------------------------------------------ update
  update(dt, ctx) {
    const s = settings();

    // ---- look
    if (this.canLook && !this.frozen && Input.locked) {
      this.yaw -= Input.mouse.dx;
      this.pitch -= Input.mouse.dy;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.45, 1.45);
    }
    if (this.forceLookAt) {
      const d = this.forceLookAt.clone().sub(this.eyePos);
      const wantYaw = Math.atan2(-d.x, -d.z);
      const wantPitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = wantYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const k = Math.min(1, dt * 3.2);
      this.yaw += dy * k;
      this.pitch += (wantPitch - this.pitch) * k;
    }

    // ---- crouch
    if (s.holdToCrouch) this.crouching = held('crouch');
    else if (hit('crouch')) this.crouching = !this.crouching;

    // ---- move
    let speed = 0;
    const wish = new THREE.Vector3();
    if (this.canMove && !this.frozen) {
      const f = this.forward();
      const r = new THREE.Vector3(-f.z, 0, f.x);
      if (held('forward')) wish.add(f);
      if (held('back')) wish.sub(f);
      if (held('right')) wish.add(r);
      if (held('left')) wish.sub(r);
    }
    const wantSprint = (s.holdToSprint ? held('sprint') : this.sprintToggle) && !this.crouching && !this.carrying;
    if (!s.holdToSprint && hit('sprint')) this.sprintToggle = !this.sprintToggle;

    const sprinting = wantSprint && wish.lengthSq() > 0 && this.stamina > 0.1;
    if (sprinting) this.stamina = Math.max(0, this.stamina - dt);
    else this.stamina = Math.min(7, this.stamina + dt * 0.55);

    this.sprinting = sprinting;
    speed = this.crouching ? 1.3 : sprinting ? 4.6 : 2.6;
    if (this.carrying) speed *= this.carrying.heavy ? 0.52 : 0.78;
    speed *= this.extraSpeed;

    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    const accel = 12;
    this.vel.x += (wish.x - this.vel.x) * Math.min(1, dt * accel);
    this.vel.z += (wish.z - this.vel.z) * Math.min(1, dt * accel);
    if (Math.abs(this.vel.x) < 0.001) this.vel.x = 0;
    if (Math.abs(this.vel.z) < 0.001) this.vel.z = 0;

    const next = this.pos.clone();
    next.x += this.vel.x * dt;
    next.z += this.vel.z * dt;
    this._resolve(next);

    // ---- floor
    const f = this.world.floorAt(next.x, next.z, this.pos.y, STEP_UP);
    if (f) {
      next.y += (f.y - next.y) * Math.min(1, dt * 14);
      if (Math.abs(f.y - next.y) < 0.005) next.y = f.y;
      this.surface = f.surface;
    } else {
      // no floor rect here: hold position rather than fall through the world
      next.x = this.pos.x; next.z = this.pos.z;
    }
    this.pos.copy(next);

    // ---- footsteps
    const planar = Math.hypot(this.vel.x, this.vel.z);
    this.stepDist += planar * dt;
    const stride = sprinting ? 1.05 : this.crouching ? 1.1 : 0.78;
    if (this.stepDist > stride && planar > 0.4) {
      this.stepDist = 0;
      audio.step(this.surface, { vol: 0.3, run: sprinting, crouch: this.crouching });
    }

    // ---- headbob
    const targetBob = (planar > 0.35 && s.headbob && !s.reduceMotion) ? Math.min(1, planar / 2.6) : 0;
    this.bobAmt += (targetBob - this.bobAmt) * Math.min(1, dt * 6);
    this.bobPhase += dt * (1.7 * Math.PI * 2) * (planar / 2.6 || 1);

    // ---- shake
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.4);

    this.updateCamera(dt);
    this.world.checkTriggers(this.pos, ctx);
    this._updateCarry(dt);
  }

  updateCamera(dt) {
    const s = settings();
    const eyeH = this.crouching ? 1.12 : 1.66;
    this.eye += (eyeH - this.eye) * Math.min(1, dt * 9 || 1);
    const bobY = Math.sin(this.bobPhase) * 0.018 * this.bobAmt;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.014 * this.bobAmt;
    const shakeX = this.shake > 0 && !s.reduceMotion ? (Math.random() - 0.5) * this.shake * 0.06 : 0;
    const shakeY = this.shake > 0 && !s.reduceMotion ? (Math.random() - 0.5) * this.shake * 0.06 : 0;
    this.cam.position.set(this.pos.x + bobX + shakeX, this.pos.y + this.eye + bobY + shakeY, this.pos.z);
    this.cam.rotation.set(0, 0, 0, 'YXZ');
    this.cam.rotation.order = 'YXZ';
    this.cam.rotation.y = this.yaw;
    this.cam.rotation.x = this.pitch;
    this.cam.rotation.z = this.headTilt + (this.bobAmt * Math.sin(this.bobPhase * 0.5) * 0.006);

    if (this.flashlight) {
      this.flashlight.position.copy(this.cam.position);
      const d = new THREE.Vector3(0, 0, -1).applyQuaternion(this.cam.quaternion);
      this.flashTarget.position.copy(this.cam.position).addScaledVector(d, 6);
    }
  }

  // ------------------------------------------------------------ carry
  pickUp(obj, { heavy = false, offset = null, noSetDown = false } = {}) {
    if (this.carrying) return false;
    this.carrying = { obj, heavy, noSetDown, home: obj.position.clone(), homeRot: obj.rotation.clone() };
    if (offset) this.carryOffset.copy(offset);
    else this.carryOffset.set(heavy ? 0 : 0.22, heavy ? -0.42 : -0.24, heavy ? -0.62 : -0.5);
    obj.userData.carried = true;
    return true;
  }

  drop(returnHome = false) {
    if (!this.carrying) return null;
    const c = this.carrying;
    c.obj.userData.carried = false;
    if (returnHome) { c.obj.position.copy(c.home); c.obj.rotation.copy(c.homeRot); }
    this.carrying = null;
    return c.obj;
  }

  _updateCarry(dt) {
    if (!this.carrying) return;
    const o = this.carrying.obj;
    const want = this.cam.position.clone()
      .add(new THREE.Vector3().copy(this.carryOffset).applyQuaternion(this.cam.quaternion));
    // spring, the weight has to be felt
    const k = this.carrying.heavy ? 7.5 : 16;
    o.position.lerp(want, Math.min(1, dt * k));
    const q = this.cam.quaternion.clone();
    o.quaternion.slerp(q, Math.min(1, dt * (this.carrying.heavy ? 5 : 12)));
    if (this.carrying.heavy) {
      // sway drags the camera a little; it is not comfortable and shouldn't be
      const lag = want.distanceTo(o.position);
      this.headTilt += (THREE.MathUtils.clamp(lag * 0.12, 0, 0.06) - this.headTilt) * Math.min(1, dt * 4);
    }
  }
}
