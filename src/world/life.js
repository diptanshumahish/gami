/* ============================================================
   life.js: the people on Ridge Road, and the traffic on it.

   Ashgrove was empty. Not atmospherically empty, which is the
   thing the game is actually after -- empty the way a rendering
   is empty: fifty shopfronts with the lights on, four hundred
   windows, nine parked cars and not one living thing between the
   laundromat and the ridge. A street with nobody on it does not
   read as lonely. It reads as unfinished, and the player stops
   believing in the town about four minutes in, which is three
   chapters before they are supposed to.

   So: three things, and all of them are background. None of it
   is interactable, none of it is plot, and none of it ever comes
   closer than the far pavement.

     extra    -- a person, in six boxes and a walk cycle. NOT a
                 `humanoid`: that thing is a lathe torso, a
                 painted face, ten finger joints and a blink
                 timer, and it exists so that Recca can be looked
                 at from forty centimetres. Nobody out here is
                 ever nearer than eleven metres and there are
                 sixteen of them.

     crowd    -- walkers on both pavements and up the street, and
                 pairs of people standing still, talking. The
                 talking is the important one. A figure walking
                 past is set dressing; two figures stopped in the
                 middle of a pavement facing each other, one of
                 them gesturing, is a town.

     traffic  -- a car goes past every so often. Not a stream:
                 this is a dying anthracite town on a Sunday
                 afternoon, and the right number is one car every
                 twenty seconds, sometimes two, and then nothing
                 for a minute.

   The cost rule from facades.js still holds. Nothing here casts
   or receives a shadow, and everything that can be merged has
   been. What CANNOT be merged is the six pieces of each figure
   that have to keep moving, which is the whole budget: sixteen
   people is ninety-six draw calls and that is the number the
   count of them was chosen from.
   ============================================================ */
import * as THREE from 'three';
import { flat } from './mat.js';
import { BOX, CYL } from './world.js';
import { carBody } from './facades.js';
import { audio } from '../core/audio.js';

const rng = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];

/* What people in a coal town wear in August and what they wear in
   February. Muted, and none of it is black: a row of black coats at
   sixty metres is a row of holes in the pavement. */
const COAT = [0x4a4f56, 0x5c4a3c, 0x3f4a42, 0x6a5c4a, 0x54505c, 0x7a6a58,
  0x455260, 0x6b4a44, 0x3e453c, 0x5f5548];
const LEGS = [0x2f3540, 0x3a3630, 0x2b2f34, 0x44403a, 0x353c46, 0x4a443c];
const SKIN = [0xd8b49a, 0xc9a184, 0xe0bda2, 0xb08a6e, 0xd0a888, 0x9a7355];
const HAIR = [0x3a2b20, 0x1f1a16, 0x6a5a45, 0x8a7a68, 0xcfcac0, 0x4a3b30];
const HATS = [0x2b2f34, 0x5a4a38, 0x6a2f26, 0x3f4a42];

/**
 * A person, in six boxes.
 *
 * The six are not arbitrary. Two legs and two arms is what a walk
 * cycle needs; a torso is what the swing hangs off; a head is what
 * makes it a person rather than a coat. Everything else -- hands,
 * feet, a face, a neck -- is invisible past about eight metres and
 * costs a draw call each, so none of it is here.
 *
 * Built facing +Z, standing on y = 0, and it is the caller's job to
 * put it somewhere and turn it round.
 */
export function extra(parent, seed = 1, { winter = false } = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  parent.add(g);

  const h = 1.56 + R() * 0.28;               // 5'1" to 6'1", which is a street
  const s = h / 1.72;
  const build = 0.9 + R() * 0.3;
  const coatCol = pick(R, COAT);
  const coatM = flat(coatCol, { rough: .96 });
  const legM = flat(pick(R, LEGS), { rough: .96 });
  const skinM = flat(pick(R, SKIN), { rough: .78 });
  const hairM = flat(pick(R, HAIR), { rough: .95 });
  const put = (m, px, py, pz, parent2) => {
    m.castShadow = false; m.receiveShadow = false;
    m.position.set(px, py, pz);
    (parent2 || g).add(m); return m;
  };

  // ---- legs, on hip pivots ----
  const legs = [-1, 1].map(sd => {
    const hip = new THREE.Group();
    hip.position.set(sd * 0.10 * s * build, 0.86 * s, 0);
    g.add(hip);
    const leg = new THREE.Mesh(BOX(0.15 * s * build, 0.86 * s, 0.18 * s), legM);
    put(leg, 0, -0.43 * s, 0, hip);
    return { hip, side: sd };
  });

  // ---- trunk: a coat, and shoulders slightly wider than the waist ----
  const torso = new THREE.Group();
  torso.position.y = 0.86 * s;
  g.add(torso);
  const coatH = (winter ? 0.62 : 0.52) * s;
  const darker = (f) => flat(new THREE.Color(coatCol).multiplyScalar(f).getHex(), { rough: .96 });
  put(new THREE.Mesh(BOX(0.44 * s * build, coatH, 0.26 * s), coatM), 0, coatH / 2 - 0.02 * s, 0, torso);
  // the yoke across the shoulders, a shade darker, which is the only
  // thing at this budget that says which way round the person is
  put(new THREE.Mesh(BOX(0.47 * s * build, 0.10 * s, 0.27 * s), darker(0.86)),
    0, coatH - 0.02 * s, 0, torso);

  // ---- head. One box for the skull, one thinner one for the hair,
  // and on about a third of them a hat, which at this distance is the
  // only thing that makes two people in grey coats two people. ----
  const headG = new THREE.Group();
  headG.position.y = coatH + 0.14 * s;
  torso.add(headG);
  put(new THREE.Mesh(BOX(0.17 * s, 0.22 * s, 0.19 * s), skinM), 0, 0, 0, headG);
  put(new THREE.Mesh(BOX(0.185 * s, 0.11 * s, 0.20 * s), hairM), 0, 0.07 * s, -0.01 * s, headG);
  if (R() > 0.66) {
    const hatM = flat(pick(R, HATS), { rough: .95 });
    put(new THREE.Mesh(CYL(0.10 * s, 0.11 * s, 0.11 * s, 8), hatM), 0, 0.16 * s, 0, headG);
    put(new THREE.Mesh(BOX(0.26 * s, 0.02 * s, 0.24 * s), hatM), 0, 0.11 * s, 0.02 * s, headG);
  }

  // ---- arms, on shoulder pivots ----
  // The sleeves are a shade off the coat. Painted the same colour they
  // vanish into the torso and the figure walks with its hands in its
  // pockets whether it wants to or not.
  const sleeveM = darker(0.92);
  const arms = [-1, 1].map(sd => {
    const sh = new THREE.Group();
    sh.position.set(sd * 0.26 * s * build, coatH - 0.07 * s, 0);
    torso.add(sh);
    const arm = new THREE.Mesh(BOX(0.115 * s, 0.58 * s, 0.135 * s), sleeveM);
    put(arm, 0, -0.29 * s, 0, sh);
    return { sh, side: sd };
  });

  // a bag, on some of them. It is one box and it changes the silhouette
  // more than the hat does.
  if (R() > 0.72) {
    const bag = new THREE.Mesh(BOX(0.18 * s, 0.24 * s, 0.11 * s), flat(pick(R, LEGS), { rough: .98 }));
    put(bag, 0.30 * s * build, -0.46 * s, 0.02 * s, arms[1].sh);
  }

  return {
    g, torso, headG, legs, arms, scale: s,
    speed: 0.95 + R() * 0.4,
    phase: R() * 6.283,
    seed
  };
}

/**
 * One walker, doing a there-and-back along a stretch of pavement, with
 * pauses. `x0`/`x1` are the ends of the beat, `z` is the pavement.
 *
 * They turn round at the ends instead of being teleported. A figure
 * that pops out of existence at one end of a street and back into it at
 * the other is the loudest thing on the screen the one time the player
 * happens to be looking at that end of the street, and they will be,
 * because it moved.
 */
function walker(world, parent, seed, { x0, x1, z, y = 0, winter, jitter = 0 }) {
  const R = rng(seed ^ 0x9e37);
  const p = extra(parent, seed, { winter });
  const zz = z + (R() - 0.5) * jitter;
  let dir = R() > 0.5 ? 1 : -1;
  let x = x0 + R() * (x1 - x0);
  let pause = R() * 12;
  p.g.position.set(x, y, zz);
  p.g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  // A person is a thing you cannot walk through, so the collider goes
  // with them. It is rewritten in place every frame, which is what the
  // doors already do while they swing.
  const box = world.collide(x, y, zz, 0.62, 1.78, 0.62, 'person');

  world.tick((dt, ctx) => {
    // and they stop rather than walk into you. Without this, a walker
    // and the player meeting on a two-metre pavement is the walker
    // shoving the player sideways into the road, every time, forever.
    let yield_ = false;
    const cam = ctx?.camera;
    if (cam) {
      const dx = cam.position.x - x, dz = cam.position.z - zz;
      yield_ = dx * dx + dz * dz < 3.24 && dx * dir > -0.3;
    }
    const moving = pause <= 0 && !yield_;
    p.phase += dt * (moving ? p.speed * 4.6 : 0);
    if (pause > 0) {
      pause -= dt;
    } else if (moving) {
      x += dir * p.speed * dt;
      if (x > x1) { x = x1; dir = -1; pause = 1.5 + R() * 9; }
      else if (x < x0) { x = x0; dir = 1; pause = 1.5 + R() * 9; }
      else if (R() < dt * 0.03) pause = 2 + R() * 7;      // stopped to look at something
      p.g.position.x = x;
      world.moveCollider(box, x, y, zz, 0.62, 1.78, 0.62);
    }
    const want = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    let d = want - p.g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    p.g.rotation.y += d * Math.min(1, dt * 4);
    animate(p, moving ? 1 : 0, dt);
  });
  return p;
}

/**
 * The walk, and the standing still.
 *
 * `w` is 0 for stopped and 1 for walking. Standing still is not
 * standing still: it is a breath, and the weight going from one hip to
 * the other about every four seconds. A figure that holds one pose for
 * nine seconds while the player watches it is a mannequin, and a
 * mannequin on a pavement in a horror game is a promise the rest of the
 * scene is not going to keep.
 */
function animate(p, w, dt) {
  const swing = Math.sin(p.phase);
  const idle = 1 - w;
  p.legs.forEach((l, i) => {
    const sg = i === 0 ? swing : -swing;
    // 34 degrees each way is a stride nobody has ever walked at. This is
    // somebody going to the hardware store, not a speed-walker.
    l.hip.rotation.x = sg * 0.38 * w;
  });
  p.arms.forEach((a, i) => {
    if (a.hold) {
      a.sh.rotation.x += (a.hold.x - a.sh.rotation.x) * Math.min(1, dt * 5);
      a.sh.rotation.z += ((a.hold.z || 0) - a.sh.rotation.z) * Math.min(1, dt * 5);
      return;
    }
    const sg = i === 0 ? swing : -swing;
    a.sh.rotation.x = -sg * 0.30 * w;
    a.sh.rotation.z = a.side * (0.05 + 0.03 * w);
  });
  if (p.baseY0 === undefined) p.baseY0 = p.torso.position.y;
  p.torso.position.y = p.baseY0 + Math.abs(swing) * 0.028 * p.scale * w;
  p.bob = (p.bob || 0) + dt;
  p.torso.rotation.z = Math.sin(p.bob * 0.9) * 0.012 * idle + Math.sin(p.bob * 0.31) * 0.02 * idle;
}

/**
 * Two people who have stopped to talk, which is the single cheapest
 * thing in this file and the one that does the most.
 *
 * They stand about eighty centimetres apart, squared up but not
 * square-on, because nobody talks to anybody face to face at that
 * range. One of them is speaking: their head moves, and their near
 * hand comes up and goes down again. The other one nods. They swap
 * over every eight to fourteen seconds, and there is a gap in the
 * middle where neither of them is doing anything, which is what makes
 * it read as a conversation rather than as two loops.
 */
function chat(world, parent, seed, { x, z, y = 0, facing = 0, winter }) {
  const R = rng(seed ^ 0x51ed);
  const gap = 0.78 + R() * 0.24;
  const a = extra(parent, seed, { winter });
  const b = extra(parent, seed ^ 0x2f5b, { winter });
  const ang = facing + (R() - 0.5) * 0.5;
  const ox = Math.cos(ang) * gap / 2, oz = Math.sin(ang) * gap / 2;
  a.g.position.set(x - ox, y, z - oz);
  b.g.position.set(x + ox, y, z + oz);
  // turned towards each other, and then about fifteen degrees off it,
  // which is where two people who know each other actually stand
  a.g.rotation.y = Math.atan2(2 * ox, 2 * oz) + (R() - 0.5) * 0.45;
  b.g.rotation.y = Math.atan2(-2 * ox, -2 * oz) + (R() - 0.5) * 0.45;

  let t = R() * 6, speaker = R() > 0.5 ? a : b, turn = 6 + R() * 7;
  world.tick(dt => {
    t += dt;
    if (t > turn) {
      t = 0; turn = 5 + R() * 9;
      // a gap where neither of them says anything, about one turn in four
      speaker = R() < 0.22 ? null : (speaker === a ? b : a);
    }
    [a, b].forEach(p => {
      p.phase += dt * 0.9;
      animate(p, 0, dt);
      const talking = p === speaker;
      // the head: a talker's moves in small irregular arcs, a listener's
      // nods on the beat and then holds
      const tg = talking
        ? Math.sin(t * 2.3) * 0.11 + Math.sin(t * 5.1) * 0.05
        : Math.sin(t * 1.1) * 0.03;
      p.headG.rotation.y += (tg - p.headG.rotation.y) * Math.min(1, dt * 6);
      const nod = talking ? Math.sin(t * 3.7) * 0.05
        : (Math.sin(t * 1.9) > 0.75 ? 0.16 : 0);
      p.headG.rotation.x += (nod - p.headG.rotation.x) * Math.min(1, dt * 7);
      // the near hand, on the talker only, and only some of the time.
      // The pose objects are made once and written into: allocating two
      // of them per person per frame is twelve objects a frame for the
      // length of a chapter, and the collector will find every one.
      const up = talking && Math.sin(t * 1.35 + p.seed) > 0.35;
      const hold = p.arms[1].hold || (p.arms[1].hold = { x: 0, z: 0 });
      hold.x = up ? -0.85 - Math.sin(t * 4.1) * 0.22 : 0;
      hold.z = up ? -0.30 : 0.08;
      const rest = p.arms[0].hold || (p.arms[0].hold = { x: 0, z: 0.06 });
      rest.x = 0; rest.z = 0.06;
    });
  });
  // two people standing on a pavement are two things you cannot walk
  // through. They do not move, so one box does it.
  world.collide(x, y, z, 1.0 + Math.abs(ox), 1.8, 1.0 + Math.abs(oz), 'people');
  return { a, b };
}

/**
 * A car goes past.
 *
 * One body, re-used: it drives the length of the street, parks itself
 * out in the haze, waits somewhere between twelve and fifty seconds and
 * comes back the other way. Three of these is a street with traffic on
 * it; six is a city, and Ashgrove is not one.
 *
 * The collider tracks it, so a car crossing in front of you is a thing
 * you have to wait for. Getting shoved by one would be better still,
 * but the player controller resolves against static boxes and teaching
 * it about moving ones for the sake of a background car is not a trade
 * worth making.
 */
function runner(world, parent, seed, { z0, z1, x0, x1, y = 0, night, sound }) {
  const R = rng(seed ^ 0x77c1);
  const g = carBody(parent, 0, y, 0, 0, seed, { lamps: night });
  const L = g.userData.size.L;
  g.visible = false;

  // a collider that follows it. `world.collide` hands back the record it
  // made and `moveCollider` rewrites it in place, which is what the doors
  // already do every frame while they swing. Writing min/max directly
  // would leave cx/hw/y0 behind and the resolver reads those, not the box.
  const W = g.userData.size.W;
  const box = world.collide(0, -900, 0, W + 0.2, 1.5, L + 0.2, 'traffic');

  let wait = 3 + R() * 22, dir = 1, x = 0, speed = 10, heard = false;
  const park = () => {
    g.visible = false;
    world.moveCollider(box, 0, -1000, 0, 0.1, 0.1, 0.1);
  };
  park();

  world.tick((dt, ctx) => {
    if (!g.visible) {
      wait -= dt;
      if (wait > 0) return;
      dir = R() > 0.5 ? 1 : -1;
      x = dir > 0 ? x0 - L : x1 + L;
      g.position.set(x, y, dir > 0 ? z0 : z1);
      // carBody is built nose along +Z, and the street runs on X
      g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      speed = 8.5 + R() * 5.0;
      g.visible = true;
      heard = false;
      return;
    }
    x += dir * speed * dt;
    g.position.x = x;
    if ((dir > 0 && x > x1 + L) || (dir < 0 && x < x0 - L)) {
      park(); wait = 12 + R() * 38; return;
    }
    world.moveCollider(box, x, y, g.position.z, L + 0.2, 1.5, W + 0.2);
    // and it is audible when it is near enough to be. One engine note as
    // it comes level with you, not a loop: a looping engine on a street
    // with one car on it is a generator.
    if (sound && !heard && ctx?.camera) {
      const d = Math.abs(x - ctx.camera.position.x);
      if (d < 14) {
        heard = true;
        audio.sfx('engine', { vol: 0.10 + Math.random() * 0.05 });
      }
    }
  });
  return g;
}

/**
 * Everything above, put on Ridge Road.
 *
 * `run` is how far along Ridge Road any of it is allowed to be, which
 * is the length of the modelled street: a walker out past the end of
 * the built pavement is a person walking on the backdrop.
 */
export function buildStreetLife(world, {
  x = 0, y = 0, nearWalk = 6.9, farWalk = 24.4, roadZ = 16.2,
  run = 75, night = false, winter = false, seed = 7,
  walkers = 9, pairs = 3, cars = 3, sound = true
} = {}) {
  const R = rng(seed);
  const group = new THREE.Group();
  world.add(group);
  const out = { group, walkers: [], pairs: [], cars: [] };

  // ---- the far pavement, which is where most of them are. It is across
  // the road, so they can be anywhere along it.
  //
  // Each of them gets a SHORT beat of thirty-odd metres rather than the
  // run of the whole street, and the beats are spread evenly along it.
  // Nine people sharing a hundred and fifty metres of pavement, each
  // free to be anywhere on it, spend most of their time bunched at one
  // end of the town with nobody in front of the laundromat at all. ----
  const beat = 15;
  // The stretch of near pavement that has to stay clear: the shopfront,
  // the laundromat door and the foot of the stair. Somebody standing
  // still in the middle of it is somebody standing in the doorway the
  // player has to use nine times in Chapter One.
  const KEEP = [x - 10, x + 13];
  for (let i = 0; i < walkers; i++) {
    const far = i % 3 !== 2;
    const z = far ? farWalk : nearWalk;
    const t = walkers < 2 ? 0.5 : i / (walkers - 1);
    let c = x + (t - 0.5) * 2 * (run - beat) * 0.92;
    if (!far) {
      // push a near-side beat clear of the doorway, whichever way is nearer
      const lo = c - beat, hi = c + beat;
      if (hi > KEEP[0] && lo < KEEP[1]) {
        c = (c < (KEEP[0] + KEEP[1]) / 2) ? KEEP[0] - beat - 1 : KEEP[1] + beat + 1;
      }
    }
    out.walkers.push(walker(world, group, (seed * 7919 + i * 613) >>> 0, {
      x0: c - beat, x1: c + beat, z, y, winter, jitter: 0.9
    }));
  }

  // ---- and the ones standing still, talking. Two on the far pavement
  // where they can be seen from the stair, one up the street. ----
  const SPOTS = [
    { x: x + 9.5, z: farWalk + 0.4, facing: 0.2 },
    { x: x - 14.0, z: farWalk - 0.3, facing: -0.4 },
    { x: x + 41.0, z: farWalk + 0.2, facing: 0.9 },
    { x: x - 46.0, z: nearWalk - 0.4, facing: 2.6 }
  ];
  for (let i = 0; i < Math.min(pairs, SPOTS.length); i++) {
    out.pairs.push(chat(world, group, (seed * 104729 + i * 37) >>> 0, {
      ...SPOTS[i], y, winter
    }));
  }

  // ---- people up the street, past the end of the modelled row, where
  // they are four pixels tall and doing all of the work. ----
  for (let i = 0; i < 4; i++) {
    const dir = i % 2 ? 1 : -1;
    const z = i < 2 ? farWalk + 1.2 : nearWalk - 1.2;
    out.walkers.push(walker(world, group, (seed * 31337 + i * 91) >>> 0, {
      x0: x + dir * 70, x1: x + dir * 118, z, y, winter, jitter: 1.4
    }));
  }

  // ---- and the traffic ----
  // the running lanes, inside the parking lanes on both sides
  const laneA = roadZ + 1.9, laneB = roadZ - 1.9;
  for (let i = 0; i < cars; i++) {
    out.cars.push(runner(world, group, (seed * 6151 + i * 271) >>> 0, {
      z0: laneA, z1: laneB, x0: x - run - 24, x1: x + run + 24,
      y, night, sound
    }));
  }
  return out;
}
