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

/*
   THE LIGHT POOL
   --------------
   Three's forward renderer evaluates EVERY light in the scene for every
   fragment of every lit material. There is no distance or frustum
   culling of light SHADING -- only of shadow map redraws, which is a
   separate thing handled in render.js. A 1.2 metre glint sitting 150
   metres behind you costs a full BRDF evaluation on every pixel you can
   see. Chapter three had 53 point lights strung across 220 metres of
   Ashgrove and was paying for all 53 everywhere.

   The count cannot simply be lowered when the camera moves, because
   NUM_POINT_LIGHTS is a shader define: adding or removing one light
   recompiles every material in the scene and stalls for a visible beat.

   So the scene holds a small FIXED set of real lights, and `bulb()`
   returns a light that is never added to the scene at all. Once a frame
   the pool copies position, colour, intensity, distance and decay from
   the virtual lights that can actually reach the frame into its slots.
   Callers cannot tell the difference: they hold the same PointLight
   object they always did and set `.intensity` on it as usual.
*/
/*
   Sized from measurement, not taste. Standing on 200 sampled walkable
   positions per chapter, looking a random way, and counting the pooled
   lights that had to go unlit despite a significance above SIGNIFICANT:

     pool   chapter 3 lights   views losing a light   worst view
       12         25                63 / 200               8
       14         27                47 / 200               9
       18         31                14 / 200               6
       20         33                 8 / 200               4
       24         37                 4 / 200               3

   Chapter three is the only place the cap binds at all; every other
   chapter has fewer point lights than the cap and is untouched. 20 takes
   the worst chapter from 56 lights per fragment to about 33 while 96% of
   sampled views lose nothing, and what the remaining 4% lose is always
   the least significant light in shot, never the nearest or brightest.

   SIGNIFICANT is the floor below which a light is not worth a slot: a
   bubble whose radius is a small fraction of its distance, dimmed by its
   own intensity. Below it we are talking about a few pixels at the far
   end of the valley.
*/
const POOL_SIZE = 20;
const SIGNIFICANT = 1e-2;
const _lightFrustum = new THREE.Frustum();
const _lightProj = new THREE.Matrix4();
const _lightSphere = new THREE.Sphere();

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
    this.lights = [];         // every light a chapter made, pooled or not
    this.virtual = [];        // the point lights that go through the pool
    this.pool = null;
    this.poolStats = { used: 0, size: 0, starved: 0 };
    this._lframe = 0;
    this.disposables = [];
  }

  // ------------------------------------------------------------ lifecycle
  tick(fn) { this.ticks.push(fn); return fn; }
  untick(fn) { const i = this.ticks.indexOf(fn); if (i >= 0) this.ticks.splice(i, 1); }
  update(dt, ctx) { for (let i = this.ticks.length - 1; i >= 0; i--) this.ticks[i](dt, ctx); }

  dispose() {
    this.root.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach(m => { if (m.userData.own) m.dispose(); });
      }
    });
    this.scene.remove(this.root);
    this.disposables.forEach(f => { try { f(); } catch {} });
    this.colliders.length = this.floors.length = this.interactables.length = 0;
    this.triggers.length = this.ticks.length = this.lights.length = 0;
    this.virtual.length = 0;
    this.pool = null;
    this.poolStats = { used: 0, size: 0, starved: 0 };
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
        const b2 = new THREE.Mesh(SHAPE.Box(axis === 'x' ? bw : thick + .02, bh, axis === 'x' ? thick + .02 : bw), fm);
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
  /**
   * A bulb that casts is a real light in the scene, exactly as it always
   * was: there are only seven of them in the whole game and no more than
   * six are ever in shot at once, so pooling them could only ever lose a
   * shadow. render.js decides which of their maps need redrawing.
   *
   * A bulb that does not cast is POOLED, and the light this returns is
   * not in the scene at all -- see the note above the class. Everything a
   * caller normally does with it (reading and writing `intensity`, moving
   * it, recolouring it, hanging it off `refs` and switching it at a story
   * beat) works exactly as before.
   */
  bulb(x, y, z, { color = 0xFFC58A, intensity = 1.4, dist = 7, shadow = false, size = 0.045, emissive = true, decay = 1.7 } = {}) {
    const l = new THREE.PointLight(color, intensity, dist, decay);
    l.position.set(x, y, z);
    if (shadow) {
      l.castShadow = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -0.0035; l.shadow.camera.far = dist;
      this.add(l);
    } else {
      this.virtual.push(l);
      this._growPool();
    }
    this.lights.push(l);
    if (emissive) {
      const m = new THREE.Mesh(SHAPE.Sphere(size, 8, 6), new THREE.MeshBasicMaterial({ color }));
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

  // ------------------------------------------------------------ light pool
  /**
   * Grow the pool to match what the chapter actually asked for, up to the
   * cap. Called from `bulb()`, so it happens during build() while the
   * screen is still black -- which is where the one-off shader recompile
   * that comes with changing the scene's light count belongs. A menu
   * scene with a single bulb gets a single slot, not twenty-four.
   */
  _growPool() {
    const p = this.pool || (this.pool = { slots: [] });
    const want = Math.min(POOL_SIZE, this.virtual.length);
    while (p.slots.length < want) {
      const l = new THREE.PointLight(0xffffff, 0, 1, 2);
      l.userData.pool = true;
      this.add(l);
      p.slots.push({ light: l, owner: null });
    }
    this.poolStats.size = p.slots.length;
  }

  /**
   * Hand the pool's real lights to whichever virtual lights matter from
   * here. Call once a frame, before the renderer culls shadows.
   */
  updateLights(camera) {
    const p = this.pool;
    if (!p || !camera || !p.slots.length) return;
    const frame = ++this._lframe;

    camera.updateMatrixWorld();
    _lightProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _lightFrustum.setFromProjectionMatrix(_lightProj);
    const eye = camera.position;

    /*
       Score = brightness x the solid angle the lit bubble subtends.
       A point light reaches exactly `distance` metres and no further, so
       (r/d)^2 is proportional to how much of the screen it can possibly
       affect and `intensity` to how hard. Ranking on this keeps the
       glint at your feet and drops the one across the valley, which is
       the right way round; ranking on brightness alone did not.
       Zero means it cannot touch a visible pixel at all -- the influence
       sphere misses the frustum, or the light is off.
    */
    for (const v of this.virtual) {
      let score = 0;
      if (v.visible && v.intensity > 0.001) {
        const r = v.distance > 0 ? v.distance : 0;
        if (r === 0) score = Infinity;                       // no cutoff: always keep
        else {
          _lightSphere.center.copy(v.position);
          _lightSphere.radius = r;
          if (_lightFrustum.intersectsSphere(_lightSphere)) {
            const d = Math.max(0.25, v.position.distanceTo(eye));
            score = v.intensity * (r / d) * (r / d);
          }
        }
      }
      v.userData.score = score;
      v.userData.lframe = frame;
    }

    // A slot is only ever taken from a light that is contributing
    // nothing, so a swap can never be seen: the light being evicted was
    // already dark or already off screen.
    const assigned = new Set();
    for (const s of p.slots) {
      if (s.owner && (s.owner.userData.lframe !== frame || s.owner.userData.score <= 0)) s.owner = null;
      if (s.owner) assigned.add(s.owner);
    }

    const queue = [];
    for (const v of this.virtual) if (v.userData.score > 0 && !assigned.has(v)) queue.push(v);
    queue.sort((a, b) => b.userData.score - a.userData.score);

    for (const s of p.slots) {
      if (s.owner || !queue.length) continue;
      s.owner = queue.shift();
    }

    let used = 0;
    for (const s of p.slots) {
      const L = s.light, o = s.owner;
      if (!o) { L.intensity = 0; continue; }
      used++;
      L.position.copy(o.position);
      L.color.copy(o.color);
      L.intensity = o.intensity;
      L.decay = o.decay;
      L.distance = o.distance;
    }
    this.poolStats.used = used;
    // Only count a light as starved if it was actually worth having. The
    // long tail below SIGNIFICANT is a bubble a few pixels across at the
    // far end of the valley, and losing it is not a thing anyone can see.
    let starved = 0;
    for (const v of queue) if (v.userData.score > SIGNIFICANT) starved++;
    this.poolStats.starved = starved;
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
  if (!GEO.has(key)) {
    const g = make();
    // World.dispose() walks the scene calling geometry.dispose() on
    // everything it finds. Everything in this cache is meant to outlive
    // the chapter that happened to use it first, so it is tagged and
    // skipped there; without the tag, every chapter change threw away
    // the GPU buffers of the whole cache and the next one re-uploaded
    // them.
    g.userData.shared = true;
    GEO.set(key, g);
  }
  return GEO.get(key);
}

/**
 * Cached geometry constructors, one per THREE primitive, keyed on the
 * full argument list.
 *
 * The named helpers below (BOX, CYL, SPH, PLN) only cover the arities
 * the world builders needed early on, so a great deal of the game went
 * on calling `new THREE.BoxGeometry(...)` directly. That is where the
 * duplicates were: chapter three alone was holding 48 separate copies of
 * one 0.075 x 2.18 x 0.022 window mullion, 36 of one small torus, and so
 * on down a long tail -- 1522 geometry objects that were byte-identical
 * to another one already in memory, each with its own GPU buffer and its
 * own vertex array to bind.
 *
 * Only use these where the result goes straight into a mesh and is never
 * touched again. Anything that buckles its own vertices afterwards (the
 * mine's bare earth in loc_town.js) has to keep its own copy.
 */
export const SHAPE = {};
for (const t of ['Box', 'Plane', 'Cylinder', 'Sphere', 'Cone', 'Torus', 'Circle']) {
  const Ctor = THREE[`${t}Geometry`];
  SHAPE[t] = (...a) => geo(`${t}|${a.join('|')}`, () => new Ctor(...a));
}
export const BOX = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const CYL = (r1, r2, h, s = 12) => geo(`c${r1}|${r2}|${h}|${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
export const SPH = (r, s = 12) => geo(`s${r}|${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s / 2)));
export const PLN = (w, h) => geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));
