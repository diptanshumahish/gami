/* ============================================================
   drive.js: a road, on a rail, that the player drives.

   The car does not move. The road comes at it at whatever speed
   the player is doing: W is the accelerator, S is the brake, A
   and D move the car about in its lane, and nothing happens at
   all until he puts his foot down. Eight segments of two-lane
   state route, thirty metres each, with the verge, the treeline,
   the poles and the wires built into the segment so that when
   it scrolls off the back it goes round to the front and nothing
   on it has to be remembered.

   The look is the one the whole game is held to: low-poly
   geometry with photo-ish textures, trees that are a bark trunk
   and a handful of leaf cards (or three tiers of needles) up
   close and two crossed cards back in the fog, a 1993 Taurus
   dash with a dim lit cluster and his own hands on the wheel,
   and a fog thick enough that the far end of the road is a
   guess. Seen through the grain it is a road at dusk on a
   machine from 2002, which is the point.

   Things that happen beside the road are ACTORS: a sign, a deer,
   a person at the treeline. They are placed a distance ahead and
   carried back past the window at road speed, and they fire as
   they draw level, which is how a script can say "at 140 metres
   there is someone standing by the mailbox" and have it be true
   however the player has driven.
   ============================================================ */
import * as THREE from 'three';
import { signBoard } from '../world/loc_street.js';
import { ford } from '../world/car.js';
import { MAT, T, flat, tiled } from '../world/mat.js';
import { cardMat, cardTree, treeMats, hardwood, pine, brush } from '../world/trees.js';
import { SHAPE, BOX, CYL, SPH, PLN } from '../world/world.js';
import { mergeByMaterial, utilityPole } from '../world/facades.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { held } from '../core/input.js';
import { settings } from '../core/state.js';

const rng = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const SEG = 30, NSEG = 8;
export const ROAD_W = 7.4;
const SEAT_EYE = 1.22;        // a seated driver's eye, metres above the road
const WHEEL_TURN = 1.7;       // radians of rim at full lock on the keys
const LANE = 2.45;            // how far off centre before the shoulder starts
const DITCH = 3.4;            // and how far before the car simply will not go

/* What the roadside is at each hour. The cards are tinted by `tree`,
   the grass by `grassTint`; the far ridges take `hill`. */
export const PALETTES = {
  golden: { tree: 0xcfc8a8, grassTint: 0xe2d7a8, line: 0xd9b24a, edge: 0xe0dccb, hill: [0x4a5a58, 0x56647a, 0x687292], post: 0x6a6158, fence: 0xc8c0aa, shoulder: 0x8a8073 },
  dusk:   { tree: 0x6e7280, grassTint: 0x6e7468, line: 0xa88a46, edge: 0xa39e92, hill: [0x2a3036, 0x313848, 0x3b4258], post: 0x3d3832, fence: 0x77736a, shoulder: 0x514c46 },
  night:  { tree: 0x2e3442, grassTint: 0x2a3028, line: 0x6e5a2c, edge: 0x6a675f, hill: [0x14181c, 0x181c26, 0x1c2030], post: 0x1e1b18, fence: 0x3a3833, shoulder: 0x2a2724 }
};

/* ---------------------------------------------------------------- segment */
/**
 * One thirty-metre piece of road, built from -SEG/2 to +SEG/2 in z, with
 * everything that belongs beside it. Merged down to one mesh per material
 * at the end, so a segment with eighty trees on it is a dozen draw calls.
 */
function buildSegment(P, i, { poles = true, fence = false, seed = 1, forest = 1 } = {}) {
  const R = rng(seed * 131 + i * 17);
  const g = new THREE.Group();

  // the road and the lines on it
  const road = new THREE.Mesh(SHAPE.Plane(ROAD_W, SEG), tiled(MAT.asphalt, ROAD_W, SEG));
  road.material.userData.own = true;
  road.rotation.x = -Math.PI / 2; road.receiveShadow = true; g.add(road);
  const lineM = flat(P.line, { rough: .85 });
  for (let k = 0; k < SEG / 9; k++) {
    const d = new THREE.Mesh(SHAPE.Plane(0.11, 3.2), lineM);
    d.rotation.x = -Math.PI / 2; d.position.set(-0.10, 0.012, -SEG / 2 + 1.6 + k * 9); g.add(d);
  }
  const solid = new THREE.Mesh(SHAPE.Plane(0.11, SEG), lineM);
  solid.rotation.x = -Math.PI / 2; solid.position.set(0.10, 0.012, 0); g.add(solid);
  const edgeM = flat(P.edge, { rough: .85 });
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(SHAPE.Plane(0.10, SEG), edgeM);
    e.rotation.x = -Math.PI / 2; e.position.set(s * (ROAD_W / 2 - 0.25), 0.012, 0); g.add(e);
  });

  // gravel shoulder, then grass falling away into the ditch and up again
  const grassM = tiled(MAT.grass, 24, SEG); grassM.color.setHex(P.grassTint); grassM.userData.own = true;
  [-1, 1].forEach(s => {
    const sh = new THREE.Mesh(SHAPE.Plane(1.4, SEG), tiled(MAT.concrete, 1.4, SEG));
    sh.material.color.setHex(P.shoulder); sh.material.userData.own = true;
    sh.rotation.x = -Math.PI / 2; sh.position.set(s * (ROAD_W / 2 + 0.7), -0.004, 0); g.add(sh);
    const v = new THREE.Mesh(SHAPE.Plane(24, SEG), grassM);
    v.rotation.x = -Math.PI / 2; v.position.set(s * (ROAD_W / 2 + 1.4 + 12), -0.05, 0); v.receiveShadow = true; g.add(v);
    const ditch = new THREE.Mesh(SHAPE.Plane(2.2, SEG), grassM);
    ditch.rotation.x = -Math.PI / 2; ditch.position.set(s * (ROAD_W / 2 + 2.6), -0.32, 0); g.add(ditch);
  });

  // the treeline: hardwoods nearest, pines behind, a gap now and then that
  // is worth more than the trees because it is where the light gets in.
  // The first two rows are built trees; the wall behind is cards.
  const pineM = cardMat('pine', P.tree), leafM = cardMat('broadleaf', P.tree);
  const TM = treeMats(P);
  [-1, 1].forEach(s => {
    const gap = R() < 0.25 ? -SEG / 2 + R() * SEG : null;
    const n = Math.round((6 + R() * 4) * forest);
    for (let k = 0; k < n; k++) {
      const z = -SEG / 2 + R() * SEG;
      if (gap !== null && Math.abs(z - gap) < 7) continue;
      const sc = 0.8 + R() * 0.6;
      hardwood(g, s * (ROAD_W / 2 + 5.5 + R() * 6), z, sc, TM, R);
    }
    const m = Math.round((11 + R() * 5) * forest);
    for (let k = 0; k < m; k++) {
      const z = -SEG / 2 + R() * SEG;
      if (gap !== null && Math.abs(z - gap) < 8) continue;
      const sc = 0.9 + R() * 0.7;
      if (R() < 0.7) pine(g, s * (ROAD_W / 2 + 11 + R() * 11), z, sc, TM, R);
      else hardwood(g, s * (ROAD_W / 2 + 11 + R() * 11), z, sc * 0.9, TM, R);
    }
    // the brush under all of it, so there is no daylight under the crowns
    brush(g, P, R, { x0: s * (ROAD_W / 2 + 5), x1: s * (ROAD_W / 2 + 22), z0: -SEG / 2, z1: SEG / 2, n: Math.round(16 * forest) });
    // a second, thinner rank of cards between the built trees and the wall
    const m2 = Math.round((12 + R() * 6) * forest);
    for (let k = 0; k < m2; k++) {
      const z = -SEG / 2 + R() * SEG;
      const sc = 1.0 + R() * 0.6;
      const isPine = R() < 0.7;
      cardTree(g, s * (ROAD_W / 2 + 18 + R() * 8), z,
        (isPine ? 4.6 : 6.5) * sc, (isPine ? 11.5 : 8.5) * sc, isPine ? pineM : leafM, R);
    }
    // and the wall behind, which the fog takes
    for (let k = 0; k < 9; k++) {
      const sc = 1.3 + R() * 0.6;
      cardTree(g, s * (ROAD_W / 2 + 24 + R() * 14), -SEG / 2 + k * (SEG / 9) + R() * 3, 4.8 * sc, 12 * sc, pineM, R);
      cardTree(g, s * (ROAD_W / 2 + 19 + R() * 10), -SEG / 2 + k * (SEG / 9) + 1.5 + R() * 3, 6.5 * sc, 8.5 * sc, leafM, R);
    }
  });

  // poles up the right-hand side, wires sagging between them
  if (poles) {
    const px = ROAD_W / 2 + 2.8;
    utilityPole({ add: o => g.add(o) }, px, -0.1, SEG / 2, {
      h: 8.6, to: { x: px, z: -SEG / 2 }, wires: 2, segs: 5, transformer: i % 3 === 0
    });
  }
  // a run of split-rail fence where there is a field
  if (fence) {
    const fm = tiled(MAT.wood, 0.4, 0.4); fm.color.setHex(P.fence); fm.userData.own = true;
    const fx = -(ROAD_W / 2 + 4.2);
    for (let k = 0; k < 6; k++) {
      const post = new THREE.Mesh(BOX(0.12, 1.1, 0.12), fm);
      post.position.set(fx, 0.5, -SEG / 2 + 2 + k * 5); g.add(post);
    }
    for (let r = 0; r < 2; r++) {
      const rail = new THREE.Mesh(BOX(0.08, 0.09, 25.4), fm);
      rail.position.set(fx, 0.4 + r * 0.4, -SEG / 2 + 2 + 12.5); g.add(rail);
    }
  }

  mergeByMaterial(g);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  return g;
}

/* ---------------------------------------------------------------- props */
/** A roadside sign on one or two posts. Returns a group at ground level. */
export function roadSign(text, { w = 1.6, h = 0.5, fg = '#f4f0e4', bg = '#1d4a2c', posts = 1, top = 2.1, font = 'JetBrains Mono', P = PALETTES.golden } = {}) {
  const g = new THREE.Group();
  const s = signBoard(text, w, h, fg, bg, font);
  s.material.emissiveIntensity = 0.12;
  s.position.y = top; g.add(s);
  const pm = flat(P.post, { rough: .9, metal: .3 });
  const xs = posts === 2 ? [-w / 2 + 0.12, w / 2 - 0.12] : [0];
  xs.forEach(px => {
    const p = new THREE.Mesh(BOX(0.08, top, 0.08), pm);
    p.position.set(px, top / 2 - 0.02, -0.04); g.add(p);
  });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** A mailbox on a post, the kind with a flag. */
export function mailbox(P = PALETTES.golden) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(BOX(0.09, 1.05, 0.09), flat(P.post, { rough: .9 }));
  post.position.y = 0.52; g.add(post);
  const box = new THREE.Mesh(BOX(0.22, 0.22, 0.48), flat(0x2b2f33, { rough: .5, metal: .4 }));
  box.position.set(0, 1.15, 0); g.add(box);
  const lid = new THREE.Mesh(CYL(0.11, 0.11, 0.48, 8), flat(0x2b2f33, { rough: .5, metal: .4 }));
  lid.rotation.x = Math.PI / 2; lid.position.set(0, 1.26, 0); g.add(lid);
  const flag = new THREE.Mesh(BOX(0.02, 0.14, 0.05), flat(0xb0352a, { rough: .5 }));
  flag.position.set(0.13, 1.2, 0.1); g.add(flag);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/**
 * A white-tailed deer from eleven boxes and two cones. It reads at the
 * distance it is seen from, which is across a windscreen at dusk, and
 * it is never seen from any other.
 */
export function deer() {
  const g = new THREE.Group();
  const hide = flat(0x8a6a46, { rough: .95 }), pale = flat(0xd8cbb4, { rough: .95 }), dark = flat(0x2a2420, { rough: .9 });
  const body = new THREE.Mesh(BOX(0.42, 0.50, 1.05), hide); body.position.set(0, 0.88, 0); g.add(body);
  const belly = new THREE.Mesh(BOX(0.30, 0.16, 0.80), pale); belly.position.set(0, 0.66, 0); g.add(belly);
  const neck = new THREE.Mesh(BOX(0.20, 0.55, 0.22), hide); neck.position.set(0, 1.22, 0.52); neck.rotation.x = -0.45; g.add(neck);
  const head = new THREE.Mesh(BOX(0.18, 0.20, 0.36), hide); head.position.set(0, 1.46, 0.74); g.add(head);
  const nose = new THREE.Mesh(BOX(0.08, 0.07, 0.08), dark); nose.position.set(0, 1.43, 0.94); g.add(nose);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(SHAPE.Cone(0.06, 0.2, 5), hide);
    ear.position.set(s * 0.11, 1.6, 0.66); ear.rotation.z = -s * 0.7; g.add(ear);
  });
  const tail = new THREE.Mesh(BOX(0.08, 0.18, 0.06), pale); tail.position.set(0, 1.0, -0.55); tail.rotation.x = 0.4; g.add(tail);
  const legs = [];
  [[-0.14, 0.38], [0.14, 0.38], [-0.14, -0.40], [0.14, -0.40]].forEach(([x, z]) => {
    const l = new THREE.Mesh(BOX(0.09, 0.66, 0.10), hide); l.position.set(x, 0.33, z); g.add(l); legs.push(l);
    const hoof = new THREE.Mesh(BOX(0.09, 0.06, 0.11), dark); hoof.position.set(x, 0.03, z); g.add(hoof); legs.push(hoof);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.head = head; g.userData.neck = neck; g.userData.legs = legs;
  return g;
}

/* ---------------------------------------------------------------- audio */
function skid(vol = 0.5) {
  if (!audio.ready) return;
  const t = audio.t;
  const out = audio.gain(vol, audio.bus.sfx);
  const n = audio.src(audio.noise.white);
  const bp = audio.filter('bandpass', 1900, 2.2);
  const g = audio.gain(0.0001);
  n.connect(bp).connect(g).connect(out);
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  bp.frequency.exponentialRampToValueAtTime(900, t + 1.1);
  n.start(t); n.stop(t + 1.2);
}

const STATIONS = ['lofi', 'jazzhop', 'late_night', 'talk', 'static', 'off'];

/* ---------------------------------------------------------------- the rail */
/**
 * driveRail(ctx, opts) -> Promise<{ choice, travelled }>
 *
 *   origin     {x, z}: where in the world the rail lives. The car sits at
 *              the origin and the road runs towards -z from it.
 *   palette    'golden' | 'dusk' | 'night', or a PALETTES-shaped object.
 *   length     metres to the end.   maxSpeed   m/s, flat out.
 *   fork       the last stretch widens and the lateral position decides.
 *   headlights on for the dark.     radio   {station, volume, signal} or null.
 *   script     [{ at, fn(D) }], fired by metres travelled.
 *   onStart(D) runs once the fade is up. onTick(D, dt) every frame.
 *
 * `D` is handed to every callback and carries the rail's controls:
 *   D.place(obj, zAhead, x, { onPass, keep })   put a prop beside the road
 *   D.hold(ms)                                  force the brakes on for a while
 *   D.speed, D.travelled, D.lateral              state
 */
export async function driveRail(ctx, {
  origin = { x: 0, z: 0 }, palette = 'golden', length = 120, maxSpeed = 17,
  fork = false, headlights = false, radio = null, dash = true,
  script = [], onStart = null, onTick = null,
  seed = 7, forest = 1, fence = true, poles = true, hills = true, ground = true,
  fadeIn = 1600, hint = true, fuel = 0.22
} = {}) {
  const { world, player, renderer } = ctx;
  const P = typeof palette === 'string' ? (PALETTES[palette] || PALETTES.golden) : palette;
  const O = new THREE.Vector3(origin.x, 0, origin.z);

  // ---- the road ----
  const root = new THREE.Group();
  root.position.copy(O);
  world.add(root);
  const segs = [];
  for (let i = 0; i < NSEG; i++) {
    const g = buildSegment(P, i, { poles, fence: fence && i % 3 === 1, seed, forest });
    g.position.z = SEG / 2 + 6 - i * SEG;      // one behind the bumper, seven ahead of it
    root.add(g); segs.push(g);
  }
  if (ground) {
    const gm = tiled(MAT.grass, 900, 900); gm.color.setHex(P.grassTint); gm.userData.own = true;
    const gp = new THREE.Mesh(SHAPE.Plane(900, 900), gm);
    gp.rotation.x = -Math.PI / 2; gp.position.y = -0.4; gp.receiveShadow = false;
    root.add(gp);
  }
  if (hills) {
    const R = rng(seed + 99);
    for (let i = 0; i < 9; i++) {
      // far enough that the fog has most of them; a ridge line over the
      // treetops, never a shape beside the road
      const a = (i / 9) * Math.PI * 2 + R() * 0.4;
      const d = 230 + R() * 80;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + R() * 30, 1), flat(P.hill[i % 3], { rough: 1 }));
      m.position.set(Math.cos(a) * d, -14 + R() * 5, Math.sin(a) * d);
      m.scale.set(2.4 + R(), 0.30 + R() * 0.15, 1.4 + R() * 0.6);
      m.rotation.y = R() * 3;
      m.castShadow = false; m.receiveShadow = false;
      root.add(m);
    }
  }

  // ---- the car ----
  // One group, the Taurus, nose to +z in its own frame and turned by PI
  // to face down the road, the cabin and all. The seat, the wheel and
  // the shoulders are all in its frame, so they go where it goes. Only
  // the collider the car just registered is dropped, never every 'car'
  // in the world.
  const nCol = world.colliders.length;
  const car = ford(world, O.x, 0, O.z, Math.PI, { interior: true, lights: headlights, boxes: true });
  world.colliders.splice(nCol);
  const refs = dash ? car.userData.refs : null;
  const cab = car;
  let headA = null, headB = null;
  if (headlights) {
    headA = new THREE.SpotLight(0xfff2dc, 7, 52, 0.38, 0.55, 1.2);
    headB = new THREE.SpotLight(0xfff2dc, 7, 52, 0.38, 0.55, 1.2);
    const tgt = new THREE.Object3D(); tgt.position.set(0, -1.4, 40);
    car.add(headA); car.add(headB); car.add(tgt);
    headA.position.set(0.42, 0.62, 2.45); headB.position.set(-0.42, 0.62, 2.45);
    headA.target = tgt; headB.target = tgt;
  }
  // his hands, on the wheel, in the car's frame
  if (refs && ctx.viewmodel) {
    const SH = (sd) => car.localToWorld(new THREE.Vector3(0.38 - sd * 0.19, 0.86, -0.06));
    ctx.viewmodel.setWheel({ wheel: refs.wheel, r: refs.wheelR, shoulder: SH });
  }

  // ---- actors ----
  const actors = [];
  const actorRoot = new THREE.Group(); actorRoot.position.copy(O); world.add(actorRoot);

  // ---- audio ----
  // no score on the road. the radio is the music, if he has it on.
  audio.musicScene('drive');
  audio.carInterior();
  audio.wind(0.25);
  let radioSet = null, stationIx = 0;
  if (radio) {
    radioSet = audio.radio('car', { station: radio.station || 'lofi', volume: radio.volume ?? 0.5, signal: radio.signal ?? 0.8, set: 'table', ...(radio.opts || {}) });
    stationIx = Math.max(0, STATIONS.indexOf(radio.station || 'lofi'));
    refs?.radio.draw(radioSet?.nowPlaying || radio.station);
  }
  // the radio face is a thing on the dash you can reach
  let radioRec = null, stalkRec = null;
  let signal = 0, blinkT = 0, blinkOn = false, signalArmed = false;
  const setSignal = (dir) => {
    signal = dir; blinkT = 0; blinkOn = !!dir; signalArmed = false;
    if (refs) refs.stalkL.rotation.z = dir * 0.20;
    if (dir) audio.sfx('click', { vol: .18 });
  };
  if (refs) {
    radioRec = world.interact(refs.radioFace, {
      label: 'Radio', dist: 1.6,
      use: () => {
        stationIx = (stationIx + 1) % STATIONS.length;
        const st = STATIONS[stationIx];
        if (st === 'off') {
          // the knob, all the way round: off
          radioSet?.power(false);
          audio.sfx('switch', { vol: .32 });
          refs.radio.draw('OFF');
          return;
        }
        if (!radioSet) { radioSet = audio.radio('car', { station: st, volume: 0.45, signal: 0.75, set: 'table' }); }
        const wasOff = !radioSet.on;
        radioSet.tune(st);
        if (wasOff) radioSet.power(true);
        audio.sfx('click', { vol: .35 });
        setTimeout(() => refs.radio.draw(radioSet?.on ? (radioSet.nowPlaying || '') : 'OFF'), 600);
      }
    });
    // the indicator stalk: left, off, right, and it cancels itself after a turn
    stalkRec = world.interact(refs.stalkL, {
      label: () => signal < 0 ? 'Indicator  ◄' : signal > 0 ? 'Indicator  ►' : 'Indicator', dist: 1.4,
      use: () => { setSignal(signal === 0 ? -1 : signal < 0 ? 1 : 0); }
    });
  }

  // ---- seat the player ----
  player.canMove = false;
  player.canLook = true;
  player.carrying = null;
  player.forceLookAt = null;
  ctx.viewmodel?.setVisible(refs ? true : false);
  UI.showHUD(true);

  let travelled = 0, lateral = 0, steer = 0, v = 0;
  let holdUntil = 0, clock = 0, gaugeT = 0, carT = 1, tank = false, maxV = maxSpeed;
  let forkChoice = 'straight';
  const fired = new Set();
  let ending = false;
  const rm = settings().reduceMotion;

  const D = {
    car, cab, root, segs, actors, P, origin: O,
    get speed() { return v; }, get travelled() { return travelled; }, get lateral() { return lateral; },
    setCruise(x) { maxV = x; },
    hold(ms) { holdUntil = Math.max(holdUntil, clock + ms / 1000); },
    tankLight(on) { if (on && !tank) audio.sfx('dashchime', { vol: .45 }); tank = on; },
    signal(dir) { setSignal(dir || 0); },
    get indicating() { return signal; },
    radio: radioSet,
    place(obj, zAhead, x = 9, { onPass = null, keep = 8, yaw = null } = {}) {
      const isChar = !!obj.g;
      const mesh = isChar ? obj.g : obj;
      const a = { obj, mesh, isChar, x, z: -zAhead, onPass, keep, passed: false, dead: false, yaw };
      if (!isChar) actorRoot.add(mesh);
      a.set = (nx, nz) => { a.x = nx; a.z = nz; };
      actors.push(a);
      return a;
    },
    remove(a) {
      a.dead = true;
      if (!a.isChar) actorRoot.remove(a.mesh);
      else a.mesh.position.set(0, -50, 0);
    },
    skid,
    shake(k = 1) { if (!rm) player.shake = Math.max(player.shake, k); },
    end() { ending = true; }
  };

  // The seat tick starts BEFORE the fade, not after it: the player
  // controller is already running, and for as long as this tick is not,
  // the camera stands at eye height on the roof of the car and then
  // drops into the seat as the fade comes up.
  let resolveRail = null;
  const finished = new Promise(resolve => { resolveRail = resolve; });
  {
    const t = world.tick(dt => {
      clock += dt;
      // ---- the pedals. His foot, and nobody else's.
      const gas = held('forward'), brake = held('back');
      const forced = clock < holdUntil || ending || travelled >= length;
      if (forced) v = Math.max(0, v - 7.5 * dt);
      else if (brake) v = Math.max(0, v - 7.5 * dt);
      else if (gas) v = Math.min(maxV, v + (v < 4 ? 3.8 : 2.4) * dt);
      else v = Math.max(0, v - 0.9 * dt);
      travelled += v * dt;

      // ---- the wheel. Nothing happens to it standing still.
      const ws = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
      steer += (ws - steer) * Math.min(1, dt * 3.4);
      const half = fork ? 6 : DITCH;
      lateral = THREE.MathUtils.clamp(lateral + steer * dt * (0.6 + v * 0.16), -half, half);
      // off the tarmac is gravel: the car shakes and it will not keep its speed
      const onShoulder = !fork && Math.abs(lateral) > LANE && v > 0.5;
      if (onShoulder) { if (!rm) player.shake = Math.max(player.shake, 0.22); v = Math.max(0, v - 1.8 * dt); }

      car.position.set(O.x + lateral, 0, O.z);
      car.rotation.y = Math.PI - steer * 0.05;
      car.rotation.z = steer * 0.015 + (brake && v > 1 ? -0.004 : 0);
      car.rotation.x = brake && v > 1 ? 0.012 : 0;
      if (refs) {
        // the rim turns with the keys, and his hands turn with the rim
        refs.wheel.rotation.z = steer * WHEEL_TURN;
        // the indicator: tick, tock, and off again once the wheel comes back
        if (signal) {
          blinkT += dt;
          if (blinkT > 0.42) { blinkT = 0; blinkOn = !blinkOn; audio.sfx('click', { vol: blinkOn ? .10 : .07 }); }
          if (Math.abs(steer) > 0.45) signalArmed = true;
          if (signalArmed && Math.abs(steer) < 0.08) setSignal(0);
        }
        gaugeT += dt;
        if (gaugeT > 0.12) {
          gaugeT = 0;
          refs.gauges.draw({ mph: v * 2.237, fuel, tank, signal, blink: blinkOn, gear: 'D', lights: headlights, brake: brake && v > 0.2 });
        }
      }
      car.updateMatrixWorld(true);

      // ---- the seat. The eye lerps towards standing height inside
      // updateCamera, so the seat height is solved for the value it is
      // about to have rather than set and fought over.
      const eyeNext = player.eye + (1.66 - player.eye) * Math.min(1, dt * 9 || 1);
      player.pos.set(O.x + lateral - 0.38, SEAT_EYE - eyeNext, O.z + 0.15);
      player.updateCamera(dt);
      renderer.setFocus(14);

      // ---- the road comes to you
      if (v > 0) {
        segs.forEach(g => {
          g.position.z += v * dt;
          if (g.position.z > SEG) g.position.z -= SEG * NSEG;
        });
      }
      for (const a of actors) {
        if (a.dead) continue;
        a.z += v * dt;
        if (a.isChar) a.mesh.position.set(O.x + a.x, 0, O.z + a.z);
        else { a.mesh.position.set(a.x, 0, a.z); if (a.yaw !== null) a.mesh.rotation.y = a.yaw; }
        if (!a.passed && a.z > -0.5) { a.passed = true; a.onPass?.(a, D); }
        if (a.z > a.keep + 30) D.remove(a);
      }
      carT += dt;
      if (carT > 0.1) { carT = 0; audio.setCarSpeed(v / maxSpeed, { load: forced || brake ? 0 : gas ? 1 : 0.12 }); }

      onTick?.(D, dt);
      script.forEach((s, i) => {
        if (!fired.has(i) && travelled >= s.at) { fired.add(i); s.fn(D); }
      });

      if ((travelled >= length || ending) && v < 0.05) {
        world.untick(t);
        forkChoice = lateral < -2 ? 'left' : lateral > 2 ? 'right' : 'straight';
        resolveRail();
      }
    });
  }

  await UI.fadeIn(fadeIn);
  if (hint) UI.toast('drive', 'W forward  ·  S brake  ·  A D steer  ·  look at the stalk, E, to indicate');
  onStart?.(D);
  await finished;

  // ---- tear down ----
  audio.killLoop('car', 0.9);
  if (radioSet) audio.killRadio('car');
  if (radioRec) world.removeInteract(radioRec);
  if (stalkRec) world.removeInteract(stalkRec);
  world.root.remove(root);
  world.root.remove(actorRoot);
  world.root.remove(car);
  actors.forEach(a => { if (a.isChar) a.mesh.position.set(0, -50, 0); });
  player.eye = 1.66;
  ctx.viewmodel?.setWheel(null);
  ctx.viewmodel?.setVisible(null);
  player.canMove = true;
  return { choice: forkChoice, travelled };
}

export default driveRail;
