/* ============================================================
   world.js: scene assembly, collision, triggers, interactables.

   Collision is boxes, axis-aligned unless a yaw is given; the floor
   is a list of rects with a height, which is what lets the bell
   tower's 68 steps and three rotten landings exist without a
   physics engine.
   Scale rule (doc §7): doors 2.03, counters 0.91,
   ceilings 2.44 residential / 8.5 church nave, eye 1.66.
   ============================================================ */
import * as THREE from 'three';
import { MAT, tiled, flat } from './mat.js';

export const SCALE = {
  // A door here is a 38 inch leaf, not the 34 inch one the game shipped
  // with. Wider reads as "a place somebody actually walks through", and
  // it gives the swing arc room to miss the player.
  door: 2.03, doorW: 0.96, doorThick: 0.052, jamb: 0.075, casing: 0.075,
  counter: 0.91, ceil: 2.44, churchCeil: 8.5,
  eye: 1.66, table: 0.74, seat: 0.45, step: 0.19
};

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.colliders = [];      // {min:Vector3, max:Vector3, tag}
    this.floors = [];         // {x0,x1,z0,z1,y,surface}
    this.interactables = [];  // {mesh, label, dist, use, enabled, hl}
    this.triggers = [];       // {x0,x1,z0,z1,y0,y1,onEnter,onExit,once,inside}
    this.ticks = [];
    this.lights = [];
    this.disposables = [];
  }

  // ------------------------------------------------------------ lifecycle
  tick(fn) { this.ticks.push(fn); return fn; }
  untick(fn) { const i = this.ticks.indexOf(fn); if (i >= 0) this.ticks.splice(i, 1); }
  update(dt, ctx) { for (let i = this.ticks.length - 1; i >= 0; i--) this.ticks[i](dt, ctx); }

  dispose() {
    this.root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (m.userData.own) m.dispose(); });
      }
    });
    this.scene.remove(this.root);
    this.disposables.forEach(f => { try { f(); } catch {} });
    this.colliders.length = this.floors.length = this.interactables.length = 0;
    this.triggers.length = this.ticks.length = this.lights.length = 0;
  }

  add(o) { this.root.add(o); return o; }

  // ------------------------------------------------------------ collision
  /**
   * An axis-aligned box, or, with `yaw`, a box that is allowed to sit at
   * an angle. min/max stay the broad-phase bound in both cases; the
   * player resolves against the oriented box when `yaw` is non-zero.
   * That is the whole reason a door leaf can be half open and still be
   * something you walk into rather than a square hole in the corridor.
   */
  collide(x, y, z, w, h, d, tag = '', yaw = 0) {
    const rec = { tag, yaw: 0, cx: 0, cz: 0, hw: 0, hd: 0, y0: 0, y1: 0, min: new THREE.Vector3(), max: new THREE.Vector3() };
    this.colliders.push(rec);
    return this.moveCollider(rec, x, y, z, w, h, d, yaw);
  }

  /** Rewrite a collider in place. Doors do this every frame while swinging. */
  moveCollider(rec, x, y, z, w, h, d, yaw = 0) {
    const hw = w / 2, hd = d / 2;
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    const ax = yaw ? hw * c + hd * s : hw;
    const az = yaw ? hd * c + hw * s : hd;
    rec.yaw = yaw; rec.cx = x; rec.cz = z; rec.hw = hw; rec.hd = hd;
    rec.y0 = y; rec.y1 = y + h;
    rec.min.set(x - ax, y, z - az);
    rec.max.set(x + ax, y + h, z + az);
    return rec;
  }

  dropCollider(rec) {
    const i = this.colliders.indexOf(rec);
    if (i >= 0) this.colliders.splice(i, 1);
  }
  clearCollidersTagged(tag) {
    for (let i = this.colliders.length - 1; i >= 0; i--) if (this.colliders[i].tag === tag) this.colliders.splice(i, 1);
  }

  /** A floor rect. `surface` drives the footstep material system. */
  floor(x, z, w, d, { y = 0, surface = 'wood', mat = MAT.wood, visible = true, receive = true } = {}) {
    this.floors.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y, surface });
    if (!visible) return null;
    const g = new THREE.PlaneGeometry(w, d);
    const m = mat.map ? tiled(mat, w, d) : mat;
    m.userData.own = true;
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.001, z);
    mesh.receiveShadow = receive;
    return this.add(mesh);
  }

  ceiling(x, z, w, d, { y = SCALE.ceil, mat = MAT.ceiling } = {}) {
    const g = new THREE.PlaneGeometry(w, d);
    const m = mat.map ? tiled(mat, w, d) : mat; m.userData.own = true;
    const mesh = new THREE.Mesh(g, m);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    return this.add(mesh);
  }

  /**
   * A wall segment. `axis` 'x' runs along X, 'z' runs along Z.
   * Thickness 0.14 residential. Registers a collider automatically.
   */
  wall(x, z, len, { axis = 'x', h = SCALE.ceil, y = 0, thick = 0.14, mat = MAT.plaster, inner = null, collide = true, tag = 'wall' } = {}) {
    const w = axis === 'x' ? len : thick;
    const d = axis === 'x' ? thick : len;
    const g = new THREE.BoxGeometry(w, h, d);
    const outer = mat.map ? tiled(mat, axis === 'x' ? len : d, h) : mat;
    let materials = outer;
    if (inner) {
      const im = inner.map ? tiled(inner, len, h) : inner;
      im.userData.own = true;
      materials = axis === 'x'
        ? [outer, outer, outer, outer, im, outer]     // +Z face inner
        : [im, outer, outer, outer, outer, outer];
    }
    if (outer.userData) outer.userData.own = true;
    const mesh = new THREE.Mesh(g, materials);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (collide) this.collide(x, y, z, w, h, d, tag);
    return this.add(mesh);
  }

  /** Wall with a door-shaped hole. Returns the group; the hole is at `at` along the run. */
  wallWithDoor(x, z, len, at, { axis = 'x', h = SCALE.ceil, y = 0, thick = 0.14, mat = MAT.plaster, inner = null, dw = SCALE.doorW + SCALE.jamb * 2, dh = SCALE.door + SCALE.jamb, tag = 'wall' } = {}) {
    const half = len / 2;
    const a = at - dw / 2 + half;   // distance from start
    const b = len - (at + dw / 2 + half);
    const s = axis === 'x' ? -1 : 1;
    const posOf = (offset) => axis === 'x'
      ? [x - half + offset, z]
      : [x, z - half + offset];
    if (a > 0.02) { const [px, pz] = posOf(a / 2); this.wall(px, pz, a, { axis, h, y, thick, mat, inner, tag }); }
    if (b > 0.02) { const [px, pz] = posOf(len - b / 2); this.wall(px, pz, b, { axis, h, y, thick, mat, inner, tag }); }
    if (h > dh + 0.02) {
      const [px, pz] = posOf(a + dw / 2);
      this.wall(px, pz, dw, { axis, h: h - dh, y: y + dh, thick, mat, inner, tag });
    }
    // The centre of the hole, so a leaf can be hung in it without the
    // caller doing the same arithmetic a fourth time and getting it wrong.
    const [ox, oz] = posOf(a + dw / 2);
    return { x, z, ox, oz, y, dw, dh, thick, facing: axis === 'x' ? 0 : Math.PI / 2 };
  }

  /** Wall with a window hole. */
  wallWithWindow(x, z, len, at, { axis = 'x', h = SCALE.ceil, y = 0, thick = 0.14, mat = MAT.plaster, inner = null, ww = 1.1, wh = 1.25, sill = 0.9, glass = true, tag = 'wall' } = {}) {
    const half = len / 2;
    const a = at - ww / 2 + half;
    const b = len - (at + ww / 2 + half);
    const posOf = (o) => axis === 'x' ? [x - half + o, z] : [x, z - half + o];
    if (a > 0.02) { const [px, pz] = posOf(a / 2); this.wall(px, pz, a, { axis, h, y, thick, mat, inner, tag }); }
    if (b > 0.02) { const [px, pz] = posOf(len - b / 2); this.wall(px, pz, b, { axis, h, y, thick, mat, inner, tag }); }
    const [cx, cz] = posOf(a + ww / 2);
    if (sill > 0.02) this.wall(cx, cz, ww, { axis, h: sill, y, thick, mat, inner, tag });
    const top = sill + wh;
    if (h > top + 0.02) this.wall(cx, cz, ww, { axis, h: h - top, y: y + top, thick, mat, inner, tag });
    if (glass) {
      const g = new THREE.PlaneGeometry(ww, wh);
      const m = new THREE.MeshPhysicalMaterial({ color: 0x2a3a48, roughness: 0.08, metalness: 0, transmission: 0.55, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
      const p = new THREE.Mesh(g, m);
      p.position.set(cx, y + sill + wh / 2, cz);
      if (axis === 'z') p.rotation.y = Math.PI / 2;
      this.add(p);
      // frame
      const fm = flat(0xd8d2c4, { rough: .8 });
      const bar = (bw, bh, ox, oy) => {
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? bw : thick + .02, bh, axis === 'x' ? thick + .02 : bw), fm);
        b2.position.set(cx + (axis === 'x' ? ox : 0), y + sill + wh / 2 + oy, cz + (axis === 'z' ? ox : 0));
        this.add(b2);
      };
      bar(ww, .05, 0, wh / 2); bar(ww, .05, 0, -wh / 2);
      bar(.05, wh, ww / 2, 0); bar(.05, wh, -ww / 2, 0);
      bar(ww, .035, 0, 0);
      return { glass: p, cx, cz, y: y + sill + wh / 2 };
    }
    return { cx, cz, y: y + sill + wh / 2 };
  }

  /** Solid box that both renders and blocks. */
  solid(x, y, z, w, h, d, mat = MAT.plaster, { rot = 0, collide = true, cast = true, tag = 'prop' } = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = mat.map && mat.userData?.metres ? tiled(mat, Math.max(w, d), h) : mat;
    if (m.userData) m.userData.own = m !== mat;
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rot;
    mesh.castShadow = cast; mesh.receiveShadow = true;
    if (collide) {
      // AABB approximation for rotated boxes
      const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
      this.collide(x, y, z, w * c + d * s, h, d * c + w * s, tag);
    }
    return this.add(mesh);
  }

  /** Non-colliding decorative mesh helper. */
  deco(geo, mat, x, y, z, rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true; m.receiveShadow = true;
    return this.add(m);
  }

  /** Stairs as N stepped floor rects + collider risers. */
  stairs(x, z, w, run, steps, { axis = 'z', y = 0, dir = 1, surface = 'wood', mat = MAT.wood, rise = SCALE.step } = {}) {
    const stepRun = run / steps;
    for (let i = 0; i < steps; i++) {
      const yy = y + (i + 1) * rise;
      if (axis === 'z') {
        const zz = z + dir * (i * stepRun + stepRun / 2 - run / 2);
        this.floor(x, zz, w, stepRun + 0.01, { y: yy, surface, mat });
        this.solid(x, yy - rise, zz, w, rise, stepRun, mat, { collide: false, cast: false });
      } else {
        const xx = x + dir * (i * stepRun + stepRun / 2 - run / 2);
        this.floor(xx, z, stepRun + 0.01, w, { y: yy, surface, mat });
        this.solid(xx, yy - rise, z, stepRun, rise, w, mat, { collide: false, cast: false });
      }
    }
    return y + steps * rise;
  }

  // ------------------------------------------------------------ interaction
  /**
   * Register an interactable. `use(ctx)` runs on E.
   * `label` may be a function for state-dependent prompts.
   */
  interact(mesh, { label = 'Look', dist = 2.4, use = () => {}, once = false, enabled = true, hl = 0xffe0b0, hold = false, carry = false } = {}) {
    const rec = { mesh, label, dist, use, once, enabled, hl, hold, carry, used: false };
    mesh.userData.interact = rec;
    this.interactables.push(rec);
    return rec;
  }
  removeInteract(rec) {
    const i = this.interactables.indexOf(rec);
    if (i >= 0) this.interactables.splice(i, 1);
    if (rec?.mesh) delete rec.mesh.userData.interact;
  }

  /** Volume trigger in XZ (+ optional Y band). */
  trigger(x, z, w, d, { onEnter, onExit, once = false, y0 = -50, y1 = 50, id } = {}) {
    const t = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0, y1, onEnter, onExit, once, inside: false, dead: false, id };
    this.triggers.push(t);
    return t;
  }
  killTrigger(t) { const i = this.triggers.indexOf(t); if (i >= 0) this.triggers.splice(i, 1); }

  checkTriggers(p, ctx) {
    for (const t of this.triggers) {
      if (t.dead) continue;
      const inside = p.x >= t.x0 && p.x <= t.x1 && p.z >= t.z0 && p.z <= t.z1 && p.y >= t.y0 && p.y <= t.y1;
      if (inside && !t.inside) { t.inside = true; t.onEnter?.(ctx); if (t.once) t.dead = true; }
      else if (!inside && t.inside) { t.inside = false; t.onExit?.(ctx); }
    }
  }

  // ------------------------------------------------------------ floor query
  /** Highest floor at or below y+tolerance. */
  floorAt(x, z, y, tol = 0.65) {
    let best = null;
    for (const f of this.floors) {
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
      // Ties go to the last floor registered. Interiors are always built
      // after the ground they sit on, so this is how a room keeps its own
      // surface instead of inheriting the pavement's.
      if (f.y <= y + tol && (!best || f.y >= best.y)) best = f;
    }
    return best;
  }

  // ------------------------------------------------------------ lights
  bulb(x, y, z, { color = 0xFFC58A, intensity = 1.4, dist = 7, shadow = false, size = 0.045, emissive = true, decay = 1.7 } = {}) {
    const l = new THREE.PointLight(color, intensity, dist, decay);
    l.position.set(x, y, z);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.0035; l.shadow.camera.far = dist; }
    this.add(l); this.lights.push(l);
    if (emissive) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color }));
      m.position.set(x, y, z); this.add(m);
      l.userData.glow = m;
      // A bulb that has been switched off is not a glowing bead hanging in
      // the dark. Chapters set `intensity` directly, so the filament has to
      // follow the light rather than the other way round: the apartment's
      // dead desk lamp was a floating orange dot on the wall for three
      // chapters, and read as light coming from somewhere off-screen.
      m.visible = intensity > 0.001;
      this.tick(() => { m.visible = l.intensity > 0.001; });
    }
    return l;
  }

  hemi(sky = 0x3A4A5C, ground = 0x14100c, i = 0.35) {
    const h = new THREE.HemisphereLight(sky, ground, i);
    this.add(h); return h;
  }

  /**
   * `extent` is the half-width of the shadow box in metres. It has to
   * cover everything you can see lit, because outside the box the depth
   * texture clamps to its edge texel and hands back whatever occluder
   * happened to be on the border: at 22 m the far side of Ridge Road sat
   * in a shadow cast by nothing at all.
   */
  sun(dir = [-1, -1.4, -0.6], color = 0xE8A653, i = 0.6, shadow = true, extent = 42) {
    const d = new THREE.DirectionalLight(color, i);
    d.position.set(-dir[0] * 40, -dir[1] * 40, -dir[2] * 40);
    if (shadow) {
      d.castShadow = true;
      d.shadow.mapSize.set(2048, 2048);
      const c = d.shadow.camera;
      c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
      c.near = 1; c.far = 160;
      d.shadow.bias = -0.0014; d.shadow.normalBias = 0.035;
    }
    this.add(d); return d;
  }
}

// ---------------------------------------------------------------- geometry cache
const GEO = new Map();
export function geo(key, make) {
  if (!GEO.has(key)) GEO.set(key, make());
  return GEO.get(key);
}
export const BOX = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const CYL = (r1, r2, h, s = 12) => geo(`c${r1}|${r2}|${h}|${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
export const SPH = (r, s = 12) => geo(`s${r}|${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s / 2)));
export const PLN = (w, h) => geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
