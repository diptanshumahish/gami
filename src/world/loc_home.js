/* ============================================================
   loc_home.js: 118½ Ridge Rd, above the Wash-Rite Laundromat,
   and the laundromat under it.

   A 6 m × 4 m room with a 2.2 m bathroom off the north wall, and
   the hall outside its door. The dryers downstairs are audible from
   everywhere in it. That sound is the most important sound in
   the game, so it is built into the room, not into a chapter.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, T } from './mat.js';
import { SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { makeDoor } from './door.js';
import { RIDGE } from './loc_street.js';
import {
  bed, desk, chair, counter, fridge, shelfUnit, mirror, corkboard,
  clutter, smallProp, dryerBank, tv, sofa, recordPlayer, cardboardBox
} from './props.js';
import { audio } from '../core/audio.js';

/* ---------------------------------------------------------------- trim
   Small pieces of carpentry that only this building uses. They are the
   difference between "four planes meeting at a corner" and a room. */

/** A shade with no bulb behind it is the colour of dusty paper. */
const SHADE_OFF = 0x7C7466;

/** A run of skirting board along one wall, between a and b on its axis. */
function skirt(world, { axis = 'x', at, a, b, y, col = 0xd8d2c4, h = 0.115, t = 0.024 }) {
  const len = b - a;
  if (len < 0.06) return null;
  const m = flat(col, { rough: .68 });
  const mesh = new THREE.Mesh(axis === 'x' ? BOX(len, h, t) : BOX(t, h, len), m);
  mesh.position.set(axis === 'x' ? (a + b) / 2 : at, y + h / 2, axis === 'x' ? at : (a + b) / 2);
  mesh.receiveShadow = true;
  return world.add(mesh);
}

/**
 * A rail with posts and balusters, and a collider the height of the rail
 * so the deck has an edge you cannot walk off. The collider sits entirely
 * above the deck, which is what keeps it from being an invisible wall in
 * the middle of the room below.
 */
function railing(world, { axis = 'x', at, a, b, y, h = 0.98, col = 0x6a4a30, tag = 'rail' }) {
  const len = b - a;
  if (len < 0.14) return null;
  const m = flat(col, { rough: .58 });
  const g = new THREE.Group();
  const along = (l, t, ht) => axis === 'x' ? BOX(l, ht, t) : BOX(t, ht, l);
  const put = (geo, u, yy) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(axis === 'x' ? u : at, yy, axis === 'x' ? at : u);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
  };
  put(along(len, 0.075, 0.07), (a + b) / 2, y + h);            // handrail
  put(along(len, 0.05, 0.05), (a + b) / 2, y + h * 0.34);      // bottom rail
  const posts = Math.max(1, Math.round(len / 0.86));
  for (let i = 0; i <= posts; i++) put(along(0.07, 0.07, h), a + len * i / posts, y + h / 2);
  const bal = Math.max(1, Math.round(len / 0.135));
  for (let i = 1; i < bal; i++) {
    const u = a + len * i / bal;
    put(along(0.026, 0.026, h - 0.07), u, y + (h - 0.07) / 2);
  }
  world.add(g);
  const cw = axis === 'x' ? len : 0.1, cd = axis === 'x' ? 0.1 : len;
  world.collide(axis === 'x' ? (a + b) / 2 : at, y, axis === 'x' ? at : (a + b) / 2, cw, h, cd, tag);
  return g;
}

/** A shelf board on brackets. Four of these do more for a room than a sofa. */
function shelf(world, x, y, z, w, d, { col = 0x6a4a30, rot = 0 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const board = new THREE.Mesh(BOX(w, 0.032, d), flat(col, { rough: .58 }));
  board.castShadow = true; board.receiveShadow = true; g.add(board);
  [-1, 1].forEach(s => {
    const br = new THREE.Mesh(BOX(0.026, 0.11, d * 0.7), flat(0x4a4a48, { rough: .5, metal: .5 }));
    br.position.set(s * (w / 2 - 0.12), -0.07, -d * 0.08);
    g.add(br);
  });
  world.add(g);
  return { g, top: y + 0.016 };
}

/**
 * A table lamp that is a lamp: base, stem, shade, and a bulb inside the
 * shade rather than a bare glowing sphere floating in the air. The light
 * is returned with the mesh so a chapter can switch it and have the
 * shade go dark with it.
 */
function tableLamp(world, x, y, z, { shadeCol = 0xE8D9B8, baseCol = 0x3a3733, r = 0.13, hh = 0.42, on = true, dist = 4.2, power = 9, cone = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const base = new THREE.Mesh(CYL(r * 0.62, r * 0.72, 0.035, 14), flat(baseCol, { rough: .45, metal: .35 }));
  base.position.y = 0.018; g.add(base);
  const stem = new THREE.Mesh(CYL(0.014, 0.018, hh - 0.16, 8), flat(baseCol, { rough: .4, metal: .5 }));
  stem.position.y = (hh - 0.16) / 2 + 0.03; g.add(stem);
  const shadeMat = new THREE.MeshBasicMaterial({ color: on ? shadeCol : SHADE_OFF, side: THREE.DoubleSide });
  shadeMat.userData.lit = shadeCol;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, 0.17, 16, 1, true), shadeMat);
  shade.position.y = hh - 0.06; g.add(shade);
  const bulb = new THREE.Mesh(SPH(0.018, 8), new THREE.MeshBasicMaterial({ color: 0xF6DCB4 }));
  bulb.position.y = hh - 0.08; g.add(bulb);
  g.traverse(o => { if (o.isMesh && o !== shade) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  // A lamp on the deck has a floor under it that a point light goes
  // straight through, so the ones up there throw a cone downward instead
  // and stop before they reach it. Cheaper than a second shadow map and
  // it is the shape the light actually is.
  let light;
  if (cone) {
    light = new THREE.SpotLight(0xFFC98F, on ? power : 0, dist, 1.15, 0.75, 1.4);
    light.position.set(x, y + hh - 0.09, z);
    const tgt = new THREE.Object3D();
    tgt.position.set(x, y - 0.4, z);
    world.add(tgt); world.add(light);
    light.target = tgt;
    world.lights.push(light);
  } else {
    light = world.bulb(x, y + hh - 0.07, z, {
      color: 0xFFC98F, intensity: on ? power : 0, dist, size: 0.02, emissive: false
    });
  }
  light.userData.shade = shadeMat;
  light.userData.bulb = bulb;
  world.collide(x, y, z, r * 1.6, hh, r * 1.6, 'lamp');
  return { g, light, shadeMat, top: y + hh };
}

/** The pendant over the living end: cord, cone shade, and the bulb in it. */
function pendant(world, x, y, z, ceilY, { on = true, power = 9.5, dist = 8.5 } = {}) {
  const cordLen = ceilY - y - 0.02;
  const rose = new THREE.Mesh(CYL(0.055, 0.055, 0.03, 10), flat(0xd8d2c4, { rough: .7 }));
  rose.position.set(x, ceilY - 0.015, z); world.add(rose);
  const cord = new THREE.Mesh(CYL(0.006, 0.006, cordLen, 6), flat(0x2a2724, { rough: .8 }));
  cord.position.set(x, y + cordLen / 2 + 0.02, z); world.add(cord);
  const shadeMat = new THREE.MeshBasicMaterial({ color: on ? 0xFAE1B4 : SHADE_OFF, side: THREE.DoubleSide });
  shadeMat.userData.lit = 0xFAE1B4;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 18, 1, true), shadeMat);
  shade.position.set(x, y + 0.07, z);
  world.add(shade);
  const bulb = new THREE.Mesh(SPH(0.022, 10), new THREE.MeshBasicMaterial({ color: 0xF6DCB4 }));
  bulb.position.set(x, y + 0.01, z); world.add(bulb);
  const light = world.bulb(x, y - 0.02, z, {
    color: 0xFFD2A2, intensity: on ? power : 0, dist, shadow: true, size: 0.02, emissive: false
  });
  light.userData.shade = shadeMat;
  light.userData.bulb = bulb;
  return { light, shadeMat, shade, bulb };
}

/**
 * Jared's apartment. Origin is the room centre; the door is south (+Z).
 *
 * It is one room and it is on two levels, because the storey it sits in
 * is 4.16 m tall and nobody who converts a room over a laundromat leaves
 * two metres of air unused:
 *
 *   ground      kitchenette and the table under the deck (north-west),
 *               the living end open to the full height (east), the bed
 *               alcove and its window over Ridge Road (far east), the
 *               stair up the west wall
 *   mezzanine   the deck at 2.16: his desk, the corkboard, the books,
 *               the records, and the chair he actually sits in
 *
 * The old room was 2.44 m flat with one bulb in the middle of it, which
 * is why it read as a corridor with a bed at the end.
 */
export function buildApartment(world, {
  x = 0, z = 0, y = 0, boxes = true, moved = false, winter = false, lightsOn = true,
  hall = false
} = {}) {
  const W = 6, D = 4, H = 4.16;
  const h = { x, y, z, W, D, H, refs: {} };
  const X0 = x - W / 2, X1 = x + W / 2, Z0 = z - D / 2, Z1 = z + D / 2;

  // the deck, and the flight that gets to it
  const LOFT = { x0: x - 2.13, x1: x + 1.25, z0: Z0, z1: z + 0.60, y: y + 2.16, t: 0.20 };
  const STAIR = { x0: X0 + 0.07, w: 0.80, zBot: z + 1.30, zTop: z - 1.60, steps: 11 };
  STAIR.cx = STAIR.x0 + STAIR.w / 2;
  STAIR.x1 = STAIR.x0 + STAIR.w;
  STAIR.run = STAIR.zBot - STAIR.zTop;
  STAIR.rise = (LOFT.y - y) / STAIR.steps;
  h.loft = LOFT; h.stair = STAIR;

  world.floor(x, z, W, D, { y, surface: 'wood', mat: MAT.wood });
  world.ceiling(x, z, W, D, { y: y + H });

  const plaster = MAT.plaster;
  // north wall (kitchenette), with the bathroom door at the east end
  const bathOpening = world.wallWithDoor(x, Z0, W, 2.15, { axis: 'x', h: H, y, mat: plaster, tag: 'wall' });
  // south wall, door + mirror
  const opening = world.wallWithDoor(x, Z1, W, 1.9, { axis: 'x', h: H, y, mat: plaster, tag: 'wall' });
  // west wall, the stair runs up it
  world.wall(X0, z, D, { axis: 'z', h: H, y, mat: plaster });
  // East wall: two short returns with the mouth of the bed alcove between
  // them. The alcove reaches the building's own east wall, which is where
  // the window belongs. It used to sit in this wall, two and a half
  // metres short of the outside, looking into a sealed brick void.
  const ALC = RIDGE.alcoveW, ALC_X0 = X1, ALC_X1 = x + RIDGE.shellX1;
  const ALC_Z = z + RIDGE.alcoveZ, ALC_H = 2.16;
  world.wallWithDoor(ALC_X0, z, D, RIDGE.alcoveZ, {
    axis: 'z', h: H, y, mat: plaster, dw: ALC, dh: ALC_H, tag: 'wall'
  });

  const alcD = ALC_X1 - ALC_X0, alcCx = (ALC_X0 + ALC_X1) / 2;
  world.floor(alcCx, ALC_Z, alcD, ALC, { y, surface: 'wood', mat: MAT.wood });
  world.ceiling(alcCx, ALC_Z, alcD, ALC, { y: y + ALC_H });
  [-1, 1].forEach(sgn => world.wall(alcCx, ALC_Z + sgn * ALC / 2, alcD, {
    axis: 'x', h: ALC_H, y, mat: plaster, tag: 'wall'
  }));
  // THE window. From here you can count the streetlights.
  const win = world.wallWithWindow(ALC_X1, ALC_Z, ALC, 0, {
    axis: 'z', h: ALC_H, y, mat: plaster, ww: 1.35, wh: 1.3, sill: 0.82
  });
  h.refs.window = win;
  h.refs.alcove = { x0: ALC_X0, x1: ALC_X1, z: ALC_Z, w: ALC, h: ALC_H };

  // ---------------------------------------------------------- skirting
  // Every wall meets the floor in a painted board, including inside the
  // alcove. It is 11 cm of geometry and it is most of the reason the
  // room now reads as plastered rather than as six planes.
  const SK = { y, col: 0xE2DACA };
  skirt(world, { ...SK, axis: 'x', at: Z0 + 0.075, a: X0, b: x + 1.55 });
  skirt(world, { ...SK, axis: 'x', at: Z0 + 0.075, a: x + 2.75, b: X1 });
  skirt(world, { ...SK, axis: 'x', at: Z1 - 0.075, a: X0, b: x + 1.30 });
  skirt(world, { ...SK, axis: 'x', at: Z1 - 0.075, a: x + 2.50, b: X1 });
  skirt(world, { ...SK, axis: 'z', at: X0 + 0.075, a: Z0, b: Z1 });
  skirt(world, { ...SK, axis: 'z', at: X1 - 0.075, a: Z0, b: ALC_Z - ALC / 2 });
  skirt(world, { ...SK, axis: 'z', at: X1 - 0.075, a: ALC_Z + ALC / 2, b: Z1 });
  [-1, 1].forEach(s => skirt(world, { ...SK, axis: 'x', at: ALC_Z + s * (ALC / 2 - 0.075), a: ALC_X0, b: ALC_X1 }));
  skirt(world, { ...SK, axis: 'z', at: ALC_X1 - 0.075, a: ALC_Z - ALC / 2, b: ALC_Z - 0.7 });
  skirt(world, { ...SK, axis: 'z', at: ALC_X1 - 0.075, a: ALC_Z + 0.7, b: ALC_Z + ALC / 2 });

  // ---------------------------------------------------------- the mezzanine
  // Joists across the short way, boards on top, one post carrying the
  // outside corner. The deck is a floor rect, so the floor query lifts
  // you onto it and the footsteps up there are boards, not air.
  const deckCx = (LOFT.x0 + LOFT.x1) / 2, deckCz = (LOFT.z0 + LOFT.z1) / 2;
  const deckW = LOFT.x1 - LOFT.x0, deckD = LOFT.z1 - LOFT.z0;
  world.floor(deckCx, deckCz, deckW, deckD, { y: LOFT.y, surface: 'wood', mat: MAT.wood });

  const beamMat = flat(0x5a3f28, { rough: .78 });
  const boards = new THREE.Mesh(BOX(deckW, 0.06, deckD), tiled(MAT.wood, deckW, deckD));
  boards.position.set(deckCx, LOFT.y - 0.03, deckCz);
  boards.castShadow = true; boards.receiveShadow = true;
  world.add(boards);
  const joistN = Math.round(deckW / 0.46);
  for (let i = 0; i <= joistN; i++) {
    const jx = LOFT.x0 + deckW * i / joistN;
    const j = new THREE.Mesh(BOX(0.07, 0.14, deckD), beamMat);
    j.position.set(jx, LOFT.y - 0.13, deckCz);
    j.castShadow = true; j.receiveShadow = true;
    world.add(j);
  }
  // the trimmer along the open edge, and the post under its corner
  const trimmer = new THREE.Mesh(BOX(deckW + 0.04, 0.22, 0.1), beamMat);
  trimmer.position.set(deckCx, LOFT.y - 0.15, LOFT.z1 - 0.05);
  trimmer.castShadow = true; world.add(trimmer);
  const trimmerE = new THREE.Mesh(BOX(0.1, 0.22, deckD), beamMat);
  trimmerE.position.set(LOFT.x1 - 0.05, LOFT.y - 0.15, deckCz);
  trimmerE.castShadow = true; world.add(trimmerE);
  const post = new THREE.Mesh(BOX(0.11, LOFT.y - 0.26, 0.11), beamMat);
  post.position.set(LOFT.x1 - 0.06, y + (LOFT.y - 0.26 - y) / 2, LOFT.z1 - 0.06);
  post.castShadow = true; world.add(post);
  world.collide(LOFT.x1 - 0.06, y, LOFT.z1 - 0.06, 0.13, LOFT.y, 0.13, 'post');
  h.refs.loftPost = post;

  // the flight, and the landing at the top of it
  world.stairs(STAIR.cx, (STAIR.zBot + STAIR.zTop) / 2, STAIR.w, STAIR.run, STAIR.steps, {
    axis: 'z', y, dir: -1, surface: 'wood', mat: MAT.wood, rise: STAIR.rise
  });
  // The head of the flight arrives 0.4 m short of the north wall, so the
  // landing fills that gap and joins the flight to the deck. Without it
  // there is a hole in the floor at the top of the stairs.
  const landD = STAIR.zTop - LOFT.z0;
  world.floor(STAIR.cx, (STAIR.zTop + LOFT.z0) / 2, STAIR.w, landD, { y: LOFT.y, surface: 'wood', mat: MAT.wood });
  const landDeck = new THREE.Mesh(BOX(STAIR.w, 0.06, landD), tiled(MAT.wood, STAIR.w, landD));
  landDeck.position.set(STAIR.cx, LOFT.y - 0.03, (STAIR.zTop + LOFT.z0) / 2);
  landDeck.receiveShadow = true; world.add(landDeck);

  // ---- the carpentry of the flight
  // Everything that rakes with the stair is built off one slope and one
  // rule: a piece laid along +Z has its DOWNHILL end at +Z, so a box gets
  // rotation.x = +slope and a cylinder (which starts life along Y) gets
  // PI/2 + slope. The handrails had PI/2 - slope, which tilted them the
  // other way and hung a second, mirrored flight over the room.
  const slope = Math.atan2(LOFT.y - y, STAIR.run);
  const diag = Math.hypot(STAIR.run, LOFT.y - y);
  const tread = STAIR.run / STAIR.steps;
  const oakM = flat(0x6a4a30, { rough: .6 });
  const oakDark = flat(0x54381f, { rough: .68 });
  /** Height of the nosing line above the apartment floor, at z. */
  const pitchY = (zz) => y + STAIR.rise * (0.5 + (STAIR.zBot - zz) / tread);

  // a string board each side, so the treads are held between two pieces
  // of timber instead of floating out of the plaster
  [STAIR.x1 - 0.03, STAIR.x0 + 0.03].forEach(sx => {
    const str = new THREE.Mesh(BOX(0.05, 0.34, diag + 0.26), oakDark);
    str.position.set(sx, y + (LOFT.y - y) / 2 - 0.09, (STAIR.zBot + STAIR.zTop) / 2);
    str.rotation.x = slope;
    str.castShadow = true; str.receiveShadow = true;
    world.add(str);
  });
  // and a tread board under each step, with a nosing over the riser
  for (let i = 1; i <= STAIR.steps; i++) {
    const sy = y + i * STAIR.rise, sz = STAIR.zBot - (i - 0.5) * tread;
    const brd = new THREE.Mesh(BOX(STAIR.w - 0.07, 0.045, tread + 0.035), flat(0x7a5636, { rough: .5 }));
    brd.position.set(STAIR.cx, sy - 0.023, sz + 0.018);
    brd.castShadow = true; brd.receiveShadow = true;
    world.add(brd);
  }

  // balustrade on the open side, one post per tread. It stops 0.9 m short
  // of the head of the flight: that gap is the way out onto the deck, and
  // the deck's own rail starts again on the far side of it. Carried all
  // the way up, it fenced the top step in and the stair went nowhere.
  const GATE = STAIR.zTop + 0.92;
  const RAIL_H = 0.92;
  let firstZ = null, lastZ = null;
  for (let i = 1; i <= STAIR.steps; i++) {
    const sy = y + i * STAIR.rise;
    const sz = STAIR.zBot - (i - 0.5) * tread;
    if (sz < GATE) continue;
    if (firstZ === null) firstZ = sz;
    lastZ = sz;
    const p = new THREE.Mesh(BOX(0.045, RAIL_H, 0.045), oakM);
    p.position.set(STAIR.x1 - 0.03, sy + RAIL_H / 2, sz);
    p.castShadow = true; world.add(p);
    if (sy - y > 0.8) world.collide(STAIR.x1 - 0.03, sy, sz, 0.1, RAIL_H, tread, 'stairrail');
  }

  /** A rail laid on the pitch line, `up` above it, between two z. */
  const rakingRail = (px, z0, z1, up, r = 0.026) => {
    const len = Math.hypot(z0 - z1, pitchY(z1) - pitchY(z0));
    const rail = new THREE.Mesh(CYL(r, r, len + 0.1, 8), oakM);
    rail.rotation.x = Math.PI / 2 + slope;
    rail.position.set(px, (pitchY(z0) + pitchY(z1)) / 2 + up, (z0 + z1) / 2);
    rail.castShadow = true;
    return world.add(rail);
  };
  if (firstZ !== null) rakingRail(STAIR.x1 - 0.03, firstZ, lastZ, RAIL_H);
  // and one on the wall side, because the wall side is the side he uses
  rakingRail(X0 + 0.13, STAIR.zBot - tread * 0.4, STAIR.zTop + 0.2, 0.9, 0.024);
  // the newel at the bottom, which is where a flight starts
  const newelH = pitchY(STAIR.zBot) + RAIL_H - y + 0.05;
  const newel = new THREE.Mesh(BOX(0.085, newelH, 0.085), oakDark);
  newel.position.set(STAIR.x1 - 0.03, y + newelH / 2, STAIR.zBot + 0.05);
  newel.castShadow = true; world.add(newel);
  const cap = new THREE.Mesh(BOX(0.115, 0.035, 0.115), oakM);
  cap.position.set(STAIR.x1 - 0.03, y + newelH + 0.017, STAIR.zBot + 0.05);
  world.add(cap);

  // the deck's three open edges
  railing(world, { axis: 'x', at: LOFT.z1 - 0.05, a: LOFT.x0, b: LOFT.x1 - 0.05, y: LOFT.y });
  railing(world, { axis: 'z', at: LOFT.x1 - 0.05, a: LOFT.z0 + 0.4, b: LOFT.z1, y: LOFT.y });
  railing(world, { axis: 'z', at: LOFT.x0 + 0.05, a: GATE, b: LOFT.z1, y: LOFT.y });

  // ---------------------------------------------------------- north: kitchen
  // Under the deck, where a kitchen in a room like this goes: 1.96 m of
  // headroom, everything within one step of everything else.
  const kc = counter(world, x - 0.86, y, Z0 + 0.32, 2.5, 0.62, 0, { top: 0x4a4740, body: 0xc4bda9 });
  clutter(world, x - 0.86, kc.top, Z0 + 0.32, 2.2, 0.5, { set: 'kitchen', seed: 7 });
  const splash = new THREE.Mesh(BOX(2.5, 0.44, 0.02), flat(0xcfd6d2, { rough: .28 }));
  splash.position.set(x - 0.86, kc.top + 0.22, Z0 + 0.085);
  splash.receiveShadow = true; world.add(splash);
  const sink = new THREE.Mesh(BOX(0.46, 0.03, 0.36), flat(0xb8bcbe, { rough: .22, metal: .8 }));
  sink.position.set(x - 1.72, kc.top - 0.008, Z0 + 0.34); world.add(sink);
  const tap = new THREE.Mesh(CYL(0.016, 0.016, 0.22, 8), flat(0xb8bcbe, { rough: .25, metal: .85 }));
  tap.position.set(x - 1.72, kc.top + 0.11, Z0 + 0.16); world.add(tap);
  const burner = new THREE.Mesh(CYL(0.11, 0.11, 0.04, 16), flat(0x2a2a2c, { rough: .5, metal: .6 }));
  burner.position.set(x - 0.42, kc.top, Z0 + 0.32);
  world.add(burner);
  h.refs.burner = burner;
  const burner2 = new THREE.Mesh(CYL(0.11, 0.11, 0.04, 16), flat(0x2a2a2c, { rough: .5, metal: .6 }));
  burner2.position.set(x - 0.14, kc.top, Z0 + 0.32); world.add(burner2);

  const fr = fridge(world, x + 0.86, y, Z0 + 0.36, 0, { mini: true });
  h.refs.fridge = fr;

  // the whiteboard. Recca draws on it. the drawings change.
  const wbCanvas = document.createElement('canvas');
  wbCanvas.width = 340; wbCanvas.height = 260;
  const wbTex = new THREE.CanvasTexture(wbCanvas);
  const wb = new THREE.Mesh(PLN(0.34, 0.26), new THREE.MeshStandardMaterial({ map: wbTex, roughness: .35 }));
  wb.position.set(x + 0.86, y + 0.62, Z0 + 0.36 + 0.30);
  world.add(wb);
  h.refs.whiteboard = wb;
  h.setWhiteboard = (html) => {
    const c = wbCanvas.getContext('2d');
    c.fillStyle = '#f7f8f6'; c.fillRect(0, 0, 340, 260);
    c.strokeStyle = '#c8ccd0'; c.lineWidth = 6; c.strokeRect(3, 3, 334, 254);
    c.fillStyle = '#2d63a8';
    c.font = '30px Caveat, cursive';
    c.textAlign = 'center';
    const lines = String(html).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').split('\n');
    lines.forEach((l, i) => c.fillText(l, 170, 70 + i * 38));
    wbTex.needsUpdate = true;
  };
  h.setWhiteboard('');

  // wall cupboards, hung low enough to clear the deck over them
  counter(world, x - 1.5, y + 1.14, Z0 + 0.22, 1.3, 0.32, 0, { h: 0.58, top: 0xc4bda9, body: 0xc4bda9 });
  const rail2 = new THREE.Mesh(CYL(0.01, 0.01, 0.9, 6), flat(0x9aa0a4, { rough: .3, metal: .7 }));
  rail2.rotation.z = Math.PI / 2;
  rail2.position.set(x - 0.2, y + 1.5, Z0 + 0.1); world.add(rail2);
  for (let i = 0; i < 4; i++) {
    const hook = new THREE.Mesh(CYL(0.006, 0.006, 0.05, 5), flat(0x9aa0a4, { rough: .3, metal: .7 }));
    hook.position.set(x - 0.52 + i * 0.22, y + 1.47, Z0 + 0.1); world.add(hook);
    const pan = new THREE.Mesh(CYL(0.075, 0.075, 0.03, 12), flat(0x3a3a3c, { rough: .4, metal: .5 }));
    pan.rotation.x = Math.PI / 2;
    pan.position.set(x - 0.52 + i * 0.22, y + 1.36, Z0 + 0.11); world.add(pan);
  }
  // three mugs
  ['#d8d3c8', '#8f6a4a', '#3f5b6b'].forEach((c2, i) => {
    const m = smallProp('mug', Math.random, parseInt(c2.slice(1), 16));
    m.position.set(x - 1.36 + i * 0.3, kc.top, Z0 + 0.2);
    world.add(m);
  });
  // a bin, and the calendar nobody has turned over
  const bin = new THREE.Mesh(CYL(0.15, 0.13, 0.42, 12), flat(0x4a4f52, { rough: .55, metal: .3 }));
  bin.position.set(x + 0.32, y + 0.21, Z0 + 0.28);
  bin.castShadow = true; world.add(bin);
  const cal = new THREE.Mesh(PLN(0.26, 0.34), flat(0xe9e3d3, { rough: .95 }));
  cal.position.set(x + 0.34, y + 1.42, Z0 + 0.075); world.add(cal);

  // the table he eats at, under the deck
  const tbl = counter(world, x - 0.86, y, z - 0.3, 0.86, 0.76, 0, { h: SCALE.table, top: 0x6a4a30, body: 0x5a3e28 });
  clutter(world, x - 0.86, tbl.top, z - 0.3, 0.66, 0.56, { set: 'living', seed: 19, count: 5 });
  chair(world, x - 0.86, y, z + 0.3, Math.PI);
  chair(world, x - 0.18, y, z - 0.3, -Math.PI / 2);
  h.refs.table = tbl;

  // ---------------------------------------------------------- under the stair
  // The wedge under the flight is the only storage in the flat, so it is
  // where the things live that a person does not want to look at.
  const crate = new THREE.Mesh(BOX(0.5, 0.42, 0.4), flat(0x8a6f4a, { rough: .92 }));
  crate.position.set(STAIR.cx, y + 0.21, z - 1.05);
  crate.castShadow = true; world.add(crate);
  world.collide(STAIR.cx, y, z - 1.05, 0.5, 0.42, 0.4, 'crate');
  const rackA = new THREE.Mesh(BOX(0.62, 0.03, 0.03), flat(0xb8bcbe, { rough: .4, metal: .6 }));
  const dryrack = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const bar = rackA.clone();
    bar.position.set(0, 0.28 + i * 0.13, -0.16 + i * 0.02);
    dryrack.add(bar);
  }
  [-1, 1].forEach(s => {
    const leg = new THREE.Mesh(BOX(0.03, 0.9, 0.03), flat(0xb8bcbe, { rough: .4, metal: .6 }));
    leg.position.set(s * 0.3, 0.45, -0.1); leg.rotation.x = 0.16; dryrack.add(leg);
  });
  const towel2 = new THREE.Mesh(BOX(0.3, 0.34, 0.03), flat(0xd8dcd6, { rough: .98 }));
  towel2.position.set(-0.1, 0.5, -0.06); dryrack.add(towel2);
  dryrack.position.set(STAIR.cx + 0.02, y, z - 0.52);
  dryrack.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(dryrack);
  const basket = new THREE.Mesh(CYL(0.24, 0.2, 0.3, 12), flat(0x2b5fa8, { rough: .85 }));
  basket.position.set(STAIR.cx - 0.02, y + 0.15, z - 0.02);
  basket.castShadow = true; world.add(basket);
  h.refs.basket = basket;

  // ---------------------------------------------------------- the loft
  // Everything he does that is not sleeping or eating happens up here.
  const LY = LOFT.y;
  const dk = desk(world, x - 0.85, LY, LOFT.z0 + 0.42, 0, { w: 1.3, d: 0.62 });
  clutter(world, x - 0.85, dk.top, LOFT.z0 + 0.42, 1.0, 0.46, { set: 'desk', seed: 3, count: 7 });
  chair(world, x - 0.85, LY, LOFT.z0 + 0.94, Math.PI);

  const laptop = new THREE.Group();
  const lb = new THREE.Mesh(BOX(0.33, 0.018, 0.24), flat(0x35383c, { rough: .4 })); lb.position.y = 0.009;
  const ls = new THREE.Mesh(BOX(0.33, 0.22, 0.012), flat(0x2a2c30, { rough: .35 }));
  ls.position.set(0, 0.115, -0.115); ls.rotation.x = -0.18;
  const lg = new THREE.Mesh(PLN(0.30, 0.19), new THREE.MeshBasicMaterial({ color: 0x2e4a68 }));
  lg.position.set(0, 0.116, -0.108); lg.rotation.x = -0.18;
  laptop.add(lb, ls, lg);
  laptop.position.set(x - 1.14, dk.top, LOFT.z0 + 0.42);
  world.add(laptop);
  h.refs.laptop = laptop;

  const printer = new THREE.Mesh(BOX(0.42, 0.18, 0.34), flat(0xd8d5cc, { rough: .55 }));
  printer.position.set(x - 0.44, dk.top + 0.09, LOFT.z0 + 0.36);
  printer.castShadow = true; world.add(printer);
  h.refs.printer = printer;

  corkboard(world, x - 0.95, LY + 1.06, LOFT.z0 + 0.075, 0, { w: 0.9, h: 0.62, pins: 7, seed: 21 });
  shelf(world, x + 0.35, LY + 1.02, LOFT.z0 + 0.2, 0.8, 0.24);
  for (let i = 0; i < 5; i++) {
    const b = smallProp('book', Math.random);
    b.position.set(x + 0.08 + i * 0.14, LY + 1.04, LOFT.z0 + 0.2);
    b.rotation.z = Math.PI / 2; b.rotation.y = Math.PI / 2;
    world.add(b);
  }

  shelfUnit(world, x - 1.55, LY, LOFT.z1 - 0.18, 0, { w: 1.1, h: 1.24, d: 0.26, shelves: 3, seed: 11 });
  const rec = recordPlayer(world, x + 0.66, LY, z - 1.15, -Math.PI / 2);
  h.refs.recordPlayer = rec;
  const crates = new THREE.Mesh(BOX(0.42, 0.34, 0.36), flat(0x8a6f4a, { rough: .9 }));
  crates.position.set(x + 0.98, LY + 0.17, z - 1.06);
  crates.castShadow = true; world.add(crates);
  for (let i = 0; i < 9; i++) {
    const lp = new THREE.Mesh(BOX(0.31, 0.31, 0.006), flat([0x3f5b6b, 0x8f6a4a, 0x5b6b52, 0x6b4a5a][i % 4], { rough: .9 }));
    lp.position.set(x + 0.98, LY + 0.18, z - 1.19 + i * 0.008);
    lp.rotation.x = 0.12; world.add(lp);
  }

  // the chair he actually sits in, and the lamp beside it
  sofa(world, x + 0.42, LY, z + 0.16, Math.PI, { w: 0.98 });
  const loftRug = new THREE.Mesh(PLN(1.5, 1.2), tiled(MAT.carpet, 1.5, 1.2));
  loftRug.rotation.x = -Math.PI / 2;
  loftRug.position.set(x - 0.35, LY + 0.008, z - 0.35);
  loftRug.receiveShadow = true; world.add(loftRug);

  // storage, stacked against the north-east corner where the deck is
  // lowest use. Two of these are still taped shut from August.
  // kept in from the rail: one of these used to hang half its width over
  // the edge of the deck and float above the room
  [[0, 0, 0, false], [0, 0.372, 0, true], [0.34, 0, 0.36, false]].forEach(([bx, by, bz, open], i) => {
    cardboardBox(world, x + 0.6 + bx, LY + by, LOFT.z0 + 0.34 + bz, i * 0.14 - 0.08, {
      w: 0.42, h: 0.36, d: 0.38, open, collide: by === 0, tint: 0xac9268
    });
  });

  // ---------------------------------------------------------- east: the bed
  // Head to the window, which is the whole reason the alcove is here.
  // It used to be a 1.05 m frame with a quilt sitting on top of it like
  // a lid, shoved against the south side with its underside in view.
  const BEDX = ALC_X1 - 1.06, BEDZ = ALC_Z + 0.61;
  const bd = bed(world, BEDX, y, BEDZ, -Math.PI / 2, { w: 1.24, l: 1.94, made: true, throwOver: true });
  h.refs.bed = bd;

  const nightstand = counter(world, ALC_X1 - 0.44, y, ALC_Z - 0.25, 0.44, 0.4, 0, { h: 0.56, top: 0x5a3e28, body: 0x6a4a30 });
  clutter(world, ALC_X1 - 0.44, nightstand.top, ALC_Z - 0.25, 0.34, 0.3, { set: 'bedside', seed: 11, count: 3 });
  h.refs.nightstand = nightstand;

  const bedRug = new THREE.Mesh(PLN(1.5, 0.7), tiled(MAT.carpet, 1.5, 0.7));
  bedRug.rotation.x = -Math.PI / 2;
  bedRug.position.set(ALC_X1 - 1.25, y + 0.008, ALC_Z - 0.86);
  bedRug.receiveShadow = true; world.add(bedRug);

  // a shelf over the bed, which is where the things he reads at 3 AM live
  shelf(world, ALC_X1 - 0.9, y + 1.42, ALC_Z + ALC / 2 - 0.14, 0.9, 0.22, { rot: 0 });
  for (let i = 0; i < 4; i++) {
    const b = smallProp('book', Math.random);
    b.position.set(ALC_X1 - 1.2 + i * 0.16, y + 1.44, ALC_Z + ALC / 2 - 0.16);
    b.rotation.z = Math.PI / 2; b.rotation.y = Math.PI / 2;
    world.add(b);
  }

  // the sill. this is where he stands at 3:04 AM.
  const sill = new THREE.Mesh(BOX(0.24, 0.04, 1.4), flat(0xd8d2c4, { rough: .8 }));
  sill.position.set(ALC_X1 - 0.16, y + 0.84, ALC_Z);
  world.add(sill);
  h.refs.sill = sill;
  // a curtain, pushed to one side, on a pole across the reveal
  const pole = new THREE.Mesh(CYL(0.014, 0.014, 1.7, 8), flat(0x5a3e28, { rough: .6 }));
  pole.position.set(ALC_X1 - 0.11, y + 2.02, ALC_Z); world.add(pole);
  [-1, 1].forEach(sg => {
    const cur = new THREE.Mesh(BOX(0.07, 1.22, 0.34), tiled(MAT.fabric, 0.34, 1.22));
    cur.position.set(ALC_X1 - 0.14, y + 1.4, ALC_Z + sg * 0.82);
    cur.castShadow = true; world.add(cur);
    // the fold that says the curtain is cloth and not a plank
    const fold = new THREE.Mesh(BOX(0.05, 1.16, 0.1), tiled(MAT.fabric, 0.1, 1.16));
    fold.position.set(ALC_X1 - 0.2, y + 1.4, ALC_Z + sg * 0.66);
    fold.castShadow = true; world.add(fold);
  });

  // ---------------------------------------------------------- south: door
  // Hinged at the corner side so it swings back into the open floor, and
  // it decides which way to go from where you are standing when you pull it.
  const door = makeDoor(world, {
    x: opening.ox, y, z: opening.oz, facing: 0, hinge: 'right',
    wallThick: 0.14, face: 0xd6cfc0, kind: 'wood', tag: 'door',
    label: 'Open', threshold: true, hardware: 'knob'
  });
  h.refs.door = door.g;
  h.refs.doorway = door;
  h.openDoor = (open, opts) => door.setOpen(open, opts);

  // coat hooks
  const rail = new THREE.Mesh(BOX(0.7, 0.05, 0.04), flat(0x5a3e28, { rough: .7 }));
  rail.position.set(x - 0.6, y + 1.66, Z1 - 0.09); world.add(rail);
  for (let i = 0; i < 3; i++) {
    const hk = new THREE.Mesh(CYL(0.008, 0.008, 0.07, 6), flat(0x9aa0a4, { rough: .3, metal: .7 }));
    hk.position.set(x - 0.85 + i * 0.25, y + 1.62, Z1 - 0.12);
    hk.rotation.x = 0.5; world.add(hk);
  }
  // his coat lives here. one of the three false scares is this coat.
  const coat = new THREE.Mesh(BOX(0.4, 0.85, 0.14), tiled(MAT.fabric, 0.4, 0.85));
  coat.position.set(x - 0.6, y + 1.2, Z1 - 0.16);
  coat.visible = false;
  world.add(coat);
  h.refs.coat = coat;

  // the mirror Recca hung in Chapter 1
  const mir = mirror(world, x - 1.9, y + 1.05, Z1 - 0.10, Math.PI, { w: 0.5, h: 1.5 });
  mir.g.visible = false;
  h.refs.mirror = mir;

  // doormat, boots, the switch by the door
  const dmat = new THREE.Mesh(PLN(0.72, 0.44), tiled(MAT.carpet, 0.72, 0.44));
  dmat.rotation.x = -Math.PI / 2;
  dmat.position.set(x + 1.9, y + 0.007, Z1 - 0.42);
  dmat.receiveShadow = true; world.add(dmat);
  [-0.1, 0.1].forEach((o, i) => {
    const boot = new THREE.Mesh(BOX(0.11, 0.16, 0.3), flat(0x3a3128, { rough: .85 }));
    boot.position.set(x + 1.36 + o, y + 0.08, Z1 - 0.3 + i * 0.04);
    boot.rotation.y = 0.2 - i * 0.35;
    boot.castShadow = true; world.add(boot);
  });
  const swp = new THREE.Mesh(BOX(0.08, 0.12, 0.014), flat(0xEFEBE0, { rough: .5 }));
  swp.position.set(x + 1.24, y + 1.16, Z1 - 0.077); world.add(swp);
  h.refs.lightSwitch = swp;

  // the radiator that the whole building shares and nobody controls
  const rad = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const fin = new THREE.Mesh(BOX(0.05, 0.58, 0.15), flat(0xE2DACA, { rough: .5, metal: .25 }));
    fin.position.set(i * 0.062 - 0.31, 0.36, 0);
    fin.castShadow = true; rad.add(fin);
  }
  rad.position.set(x + 0.62, y, Z1 - 0.2);
  world.add(rad);
  world.collide(x + 0.62, y, Z1 - 0.2, 0.74, 0.66, 0.22, 'rad');
  h.refs.radiator = rad;

  // a rug in the living end, which is the only floor you see all of
  const rug = new THREE.Mesh(PLN(1.5, 2.1), tiled(MAT.carpet, 1.5, 2.1));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(x + 2.05, y + 0.008, z + 0.1);
  rug.receiveShadow = true; world.add(rug);

  // ---------------------------------------------------------- boxes
  if (boxes) {
    // Stacked along the south wall the way somebody actually puts boxes
    // down, not scattered at random angles across the floor: the run from
    // the door to the foot of the stair goes between them and the table.
    // Turned to face the room, because the marker is on the side you
    // wrote it on when the box was still in the van.
    const SPOTS = [
      { label: 'KITCHEN', px: x - 1.34, pz: Z1 - 0.44, py: 0, rot: Math.PI - 0.05 },
      { label: 'BOOKS', px: x - 0.8, pz: Z1 - 0.42, py: 0, rot: Math.PI + 0.03 },
      { label: 'CLOTHES', px: x - 0.78, pz: Z1 - 0.44, py: 0.396, rot: Math.PI - 0.13 },
      { label: 'MISC. FRAGILE?', px: x - 0.24, pz: Z1 - 0.46, py: 0, rot: Math.PI + 0.08 }
    ];
    h.refs.boxes = SPOTS.map(({ label, px, pz, py, rot }, i) => {
      const b = cardboardBox(world, px, y + py, pz, rot, {
        label, open: false, collide: py === 0,
        tint: [0xb0966d, 0xb6a077, 0xa98f66, 0xb2986e][i]
      });
      // the group, not the body: the interact raycast walks up parents to
      // find it, and a chapter that reads `.position` wants world space
      return { mesh: b.g, label };
    });
  }

  // ---------------------------------------------------------- light
  // Five fittings, every one of them attached to an object you can see.
  // Before this the room was lit by one bare point light in the middle of
  // the ceiling, so the ceiling was the brightest surface in the flat and
  // the floor was black.
  const pend = pendant(world, x + 1.92, y + 2.3, z + 0.1, y + H, { on: lightsOn });
  h.refs.ceilLight = pend.light;
  h.refs.pendant = pend;

  // Under the deck, over the counter, because the kitchen is in a box
  // 1.96 m tall and the pendant cannot see into it. It is a cone aimed at
  // the worktop rather than a bulb sitting against the wall: a point
  // light 40 cm from the plaster lights the bathroom on the other side
  // of it just as brightly, which is most of what "the light leaks"
  // meant. A cone only lights what it is pointed at.
  const strip = new THREE.Mesh(BOX(1.2, 0.03, 0.07), flat(0xE8D8B8, { rough: .6 }));
  strip.position.set(x - 1.5, y + 1.11, Z0 + 0.3);
  world.add(strip);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), flat(0xEFE6D2, { rough: .8, side: THREE.DoubleSide }));
  dome.position.set(x - 1.1, y + 1.93, z - 0.8);
  world.add(dome);
  const kitchenLight = new THREE.SpotLight(0xFFDDB4, lightsOn ? 15 : 0, 3.6, 1.22, 0.85, 1.35);
  kitchenLight.position.set(x - 1.1, y + 1.88, z - 0.8);
  const kitTgt = new THREE.Object3D();
  kitTgt.position.set(x - 1.1, y, z - 0.7);
  world.add(kitTgt); world.add(kitchenLight);
  kitchenLight.target = kitTgt;
  world.lights.push(kitchenLight);
  kitchenLight.userData.bulb = dome;
  h.refs.kitchenLight = kitchenLight;

  // Recca's grandmother's lamp, which is not moving in either
  const floorLampG = new THREE.Group();
  const flBase = new THREE.Mesh(CYL(0.17, 0.19, 0.03, 14), flat(0x3a3733, { rough: .45, metal: .4 }));
  flBase.position.y = 0.015; floorLampG.add(flBase);
  const flStem = new THREE.Mesh(CYL(0.015, 0.019, 1.28, 8), flat(0x3a3733, { rough: .4, metal: .5 }));
  flStem.position.y = 0.66; floorLampG.add(flStem);
  const flShadeMat = new THREE.MeshBasicMaterial({ color: lightsOn ? 0xF6DCAE : SHADE_OFF, side: THREE.DoubleSide });
  flShadeMat.userData.lit = 0xF6DCAE;
  const flShade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.24, 16, 1, true), flShadeMat);
  flShade.position.y = 1.4; floorLampG.add(flShade);
  const flBulb = new THREE.Mesh(SPH(0.02, 8), new THREE.MeshBasicMaterial({ color: 0xF6DCB4 }));
  flBulb.position.y = 1.38; floorLampG.add(flBulb);
  floorLampG.position.set(x + 1.44, y, z - 1.3);
  floorLampG.traverse(o => { if (o.isMesh && o !== flShade) o.castShadow = true; });
  world.add(floorLampG);
  world.collide(x + 1.44, y, z - 1.3, 0.38, 1.5, 0.38, 'lamp');
  const floorLamp = world.bulb(x + 1.44, y + 1.38, z - 1.3, {
    color: 0xFFCE9C, intensity: lightsOn ? 3.2 : 0, dist: 5.0, size: 0.02, emissive: false
  });
  floorLamp.userData.shade = flShadeMat;
  floorLamp.userData.bulb = flBulb;
  h.refs.floorLamp = floorLamp;

  // the desk lamp, up on the deck. It used to be a naked glowing dot on
  // the wall with no lamp under it and no light coming out of it.
  const dl = tableLamp(world, x - 0.3, dk.top, LOFT.z0 + 0.32, { on: lightsOn, power: 8, dist: 1.7, hh: 0.44, cone: true });
  h.refs.desklamp = dl.light;
  h.refs.desklampBody = dl;

  // the bedside lamp, which is the only light on when it matters
  const bl = tableLamp(world, ALC_X1 - 0.44, nightstand.top, ALC_Z - 0.25, {
    on: false, power: 1.4, dist: 2.4, hh: 0.34, r: 0.1, shadeCol: 0xE8CFA8
  });
  h.refs.bedLamp = bl.light;
  h.refs.bedLampBody = bl;

  // the streetlight through the east window
  const streetGlow = world.bulb(x + RIDGE.shellX1 + 1.1, y + 1.75, z + RIDGE.alcoveZ, {
    color: 0xE8A653, intensity: 1.3, dist: 8, emissive: false
  });
  h.refs.streetGlow = streetGlow;

  /**
   * Every fitting in one table. A chapter asks for a mood instead of
   * setting intensities by hand, which is how three chapters ended up
   * disagreeing about how bright this room is.
   */
  const BASE = {
    ceilLight: 9.5, kitchenLight: 15, floorLamp: 3.2, desklamp: 8,
    bedLamp: 2.2, streetGlow: 1.3
  };
  const MODES = {
    // the evening he is in and does not want to be
    evening: { ceilLight: 1, kitchenLight: 1, floorLamp: 1, desklamp: .8, bedLamp: .5, streetGlow: .5 },
    // lamps only, the ceiling off. warmer, lower, and it has corners
    lamps: { ceilLight: 0, kitchenLight: .4, floorLamp: 1, desklamp: 1, bedLamp: 1, streetGlow: .8 },
    // 3 AM: the streetlight, and nothing else
    night: { ceilLight: 0, kitchenLight: 0, floorLamp: 0, desklamp: 0, bedLamp: 0, streetGlow: 1.15 },
    off: { ceilLight: 0, kitchenLight: 0, floorLamp: 0, desklamp: 0, bedLamp: 0, streetGlow: 1 }
  };
  h.setLights = (mode = 'evening') => {
    const m = MODES[mode] || MODES.evening;
    for (const k of Object.keys(BASE)) {
      const l = h.refs[k];
      if (!l) continue;
      l.intensity = BASE[k] * (m[k] ?? 0);
      const lit = l.intensity > 0.001;
      if (l.userData.shade) l.userData.shade.color.setHex(lit ? l.userData.shade.userData.lit : SHADE_OFF);
      if (l.userData.bulb) l.userData.bulb.visible = lit;
      if (l.userData.glow) l.userData.glow.visible = lit;
    }
    h.lightMode = mode;
  };
  h.setLights(lightsOn ? 'evening' : 'night');

  // ---------------------------------------------------------- the dryers
  // constant ambient, from below, always.
  h.startDryers = (mode = 'background') => audio.dryers(mode, [x, y - 1.4, z]);

  // Where the story stands people. They used to be literals in three
  // chapters, computed against a bed that has since moved twice, which
  // is how Recca ended up sitting on the floor two metres short of it.
  h.marks = {
    bed: { x: BEDX, y: y + 0.64, z: BEDZ },             // the sleep prompt
    bedEdge: { x: BEDX - 0.15, y: y + 0.60, z: BEDZ - 0.55 },  // she sits here
    bedFoot: { x: BEDX - 1.16, y, z: BEDZ },
    wake: { x: BEDX - 0.9, z: BEDZ - 0.92, yaw: -Math.PI / 2 },  // he stands, facing it
    doorway: { x: x + 1.9, y, z: Z1 - 0.55 },
    middle: { x: x + 1.9, y, z: z + 0.2 }
  };

  h.bath = buildBathroom(world, { x, y, z, D, opening: bathOpening, lightsOn });
  h.refs.bathDoor = h.bath.refs.door;

  if (hall) h.hall = buildUpstairsHall(world, { x, y, z, lightsOn, aptW: W });

  h.spawn = { x: x + 1.9, z: z + 1.2, yaw: Math.PI };
  return h;
}

/* ============================================================
   The bathroom, 2.2 m square, off the head of the bed.

   A studio with no bathroom in it is not a flat, it is a room,
   and 118 1/2 read as one room for the whole first act. Small,
   low, and full of solids: a cast tub against the north wall,
   a cistern that runs, a basin, and a mirrored cabinet that is
   going to matter later.
   ============================================================ */
function buildBathroom(world, { x, y, z, D, opening, lightsOn = true }) {
  const g = { refs: {} };
  const X0 = x + 0.9, X1 = x + 3.1;
  const Z1 = z - D / 2, Z0 = Z1 - 2.2;
  const cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
  const W = X1 - X0, DD = Z1 - Z0;
  const H = 2.28;                       // lower than the room it opens off

  world.floor(cx, cz, W, DD, { y, surface: 'lino', mat: MAT.lino });
  world.ceiling(cx, cz, W, DD, { y: y + H });
  world.wall(X0, cz, DD, { axis: 'z', h: H, y, thick: 0.12, mat: MAT.plaster, tag: 'bath' });
  world.wall(X1, cz, DD, { axis: 'z', h: H, y, thick: 0.12, mat: MAT.plaster, tag: 'bath' });
  world.wall(cx, Z0, W, { axis: 'x', h: H, y, thick: 0.12, mat: MAT.plaster, tag: 'bath' });

  // half-height tiling, which is what every bathroom in this town has
  const tileBand = new THREE.Mesh(BOX(W - 0.04, 1.18, 0.02), flat(0xcfd6d2, { rough: .3 }));
  tileBand.position.set(cx, y + 0.59, Z0 + 0.07);
  world.add(tileBand);

  const door = makeDoor(world, {
    x: opening.ox, y, z: opening.oz, facing: Math.PI, hinge: 'left',
    wallThick: 0.14, face: 0xd6cfc0, kind: 'wood', tag: 'bathdoor',
    label: 'Open', threshold: true, hardware: 'knob'
  });
  g.refs.door = door;

  // ---- the tub, against the north wall
  const tub = new THREE.Mesh(BOX(1.52, 0.56, 0.72), flat(0xe6e6e0, { rough: .22 }));
  tub.position.set(X0 + 0.82, y + 0.28, Z0 + 0.42);
  tub.castShadow = true; world.add(tub);
  world.collide(X0 + 0.82, y, Z0 + 0.42, 1.52, 0.56, 0.72, 'tub');
  const water = new THREE.Mesh(BOX(1.36, 0.02, 0.58), flat(0xb9c4c4, { rough: .12 }));
  water.position.set(X0 + 0.82, y + 0.5, Z0 + 0.42); world.add(water);
  const spout = new THREE.Mesh(CYL(0.022, 0.022, 0.13, 8), flat(0x9aa0a4, { rough: .3, metal: .8 }));
  spout.rotation.z = Math.PI / 2;
  spout.position.set(X0 + 0.08, y + 0.66, Z0 + 0.42); world.add(spout);
  g.refs.tub = tub;

  // the curtain rail and a curtain pushed to one end
  const rail = new THREE.Mesh(CYL(0.015, 0.015, 1.6, 8), flat(0x9aa0a4, { rough: .35, metal: .7 }));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(X0 + 0.82, y + 1.86, Z0 + 0.76); world.add(rail);
  const curtain = new THREE.Mesh(BOX(0.42, 1.5, 0.05), flat(0xd8dcd6, { rough: .95 }));
  curtain.position.set(X0 + 0.24, y + 1.1, Z0 + 0.76); world.add(curtain);
  g.refs.curtain = curtain;

  // ---- the toilet, east wall
  const pan = new THREE.Mesh(CYL(0.19, 0.16, 0.4, 12), flat(0xe6e6e0, { rough: .2 }));
  pan.position.set(X1 - 0.36, y + 0.2, cz + 0.1); world.add(pan);
  const seat = new THREE.Mesh(CYL(0.21, 0.21, 0.05, 14), flat(0xd8d2c4, { rough: .5 }));
  seat.position.set(X1 - 0.36, y + 0.42, cz + 0.1); world.add(seat);
  const cistern = new THREE.Mesh(BOX(0.18, 0.42, 0.44), flat(0xe6e6e0, { rough: .2 }));
  cistern.position.set(X1 - 0.14, y + 0.66, cz + 0.1); world.add(cistern);
  world.collide(X1 - 0.3, y, cz + 0.1, 0.5, 0.9, 0.5, 'toilet');
  g.refs.toilet = pan;

  // ---- the basin, and the cabinet over it
  const ped = new THREE.Mesh(CYL(0.11, 0.14, 0.66, 10), flat(0xe6e6e0, { rough: .2 }));
  ped.position.set(X1 - 0.34, y + 0.33, Z1 - 0.52); world.add(ped);
  const basin = new THREE.Mesh(BOX(0.44, 0.16, 0.36), flat(0xe6e6e0, { rough: .2 }));
  basin.position.set(X1 - 0.3, y + 0.74, Z1 - 0.52);
  basin.castShadow = true; world.add(basin);
  world.collide(X1 - 0.3, y, Z1 - 0.52, 0.5, 0.86, 0.42, 'basin');
  const tap = new THREE.Mesh(CYL(0.016, 0.016, 0.1, 8), flat(0x9aa0a4, { rough: .3, metal: .8 }));
  tap.position.set(X1 - 0.13, y + 0.87, Z1 - 0.52); world.add(tap);
  g.refs.basin = basin;

  const cab = new THREE.Mesh(BOX(0.14, 0.5, 0.42), flat(0xd8d2c4, { rough: .55 }));
  cab.position.set(X1 - 0.13, y + 1.42, Z1 - 0.52); world.add(cab);
  const cabGlass = new THREE.Mesh(PLN(0.4, 0.46), new THREE.MeshStandardMaterial({
    color: 0x8d9aa4, roughness: 0.06, metalness: 0.92, envMapIntensity: 1
  }));
  cabGlass.position.set(X1 - 0.2, y + 1.42, Z1 - 0.52);
  cabGlass.rotation.y = -Math.PI / 2;
  world.add(cabGlass);
  g.refs.cabinet = cab;
  g.refs.cabinetMirror = cabGlass;

  // ---- towel rail on the door wall, and the pull cord
  const trail = new THREE.Mesh(CYL(0.012, 0.012, 0.5, 8), flat(0x9aa0a4, { rough: .35, metal: .7 }));
  trail.rotation.z = Math.PI / 2;
  trail.position.set(X0 + 0.42, y + 1.24, Z1 - 0.09); world.add(trail);
  const towel = new THREE.Mesh(BOX(0.4, 0.5, 0.05), flat(0x8f6a4a, { rough: .98 }));
  towel.position.set(X0 + 0.42, y + 0.99, Z1 - 0.12); world.add(towel);

  const cord = new THREE.Mesh(CYL(0.004, 0.004, 0.8, 6), flat(0xd8d2c4, { rough: .9 }));
  cord.position.set(X0 + 0.34, y + H - 0.42, Z1 - 0.3); world.add(cord);

  const bulb = world.bulb(cx, y + H - 0.16, cz, {
    color: 0xF6F0DC, intensity: lightsOn ? 1.15 : 0, dist: 4.2, size: 0.035
  });
  const shade = new THREE.Mesh(CYL(0.1, 0.13, 0.1, 10), flat(0xe8e2d2, { rough: .9 }));
  shade.position.set(cx, y + H - 0.12, cz); world.add(shade);
  g.refs.light = bulb;

  g.bounds = { X0, X1, Z0, Z1, y, H };
  return g;
}

/* ============================================================
   The upstairs hall at 118 1/2: the two and a half metres between
   Jared's door and the outside one at the top of the stair.

   It did not exist before. His door opened onto a two-storey drop
   with no floor under it, which the floor query answered by
   refusing to let him step through at all. This is the piece that
   makes the apartment a place you can leave and come back to.
   ============================================================ */
export function buildUpstairsHall(world, { x = 0, y = 3.0, z = 0, lightsOn = true, aptW = 6 } = {}) {
  const g = { refs: {} };
  const H = SCALE.ceil;
  const X0 = x + RIDGE.hallX0, X1 = x + RIDGE.hallX1;
  const cx = (X0 + X1) / 2, len = X1 - X0;
  const cz = z + RIDGE.hallZ, d = RIDGE.hallD;
  const Z0 = cz - d / 2, Z1 = cz + d / 2;

  world.floor(cx, cz, len, d, { y, surface: 'wood', mat: MAT.wood });
  world.ceiling(cx, cz, len, d, { y: y + H });

  // south: the outside wall of the building, lined in plaster
  world.wall(cx, Z1 - 0.07, len, { axis: 'x', h: H, y, thick: 0.14, mat: MAT.plaster, tag: 'hall' });
  // north: the apartment's own south wall closes the middle of this side,
  // but the hall is longer than the apartment is wide, and the ends of it
  // were open onto a three-metre drop into the laundromat. Walking off the
  // landing towards Jared's door put you on the lino downstairs.
  const aptL = x - aptW / 2, aptR = x + aptW / 2;
  [[X0, aptL], [aptR, X1]].forEach(([a, b]) => {
    const seg = b - a;
    if (seg < 0.02) return;
    world.wall(a + seg / 2, Z0 + 0.07, seg, { axis: 'x', h: H, y, thick: 0.14, mat: MAT.plaster, tag: 'hall' });
  });
  // west: 3B, which is locked in every chapter but one
  const bOpen = world.wallWithDoor(X0 + 0.07, cz, d, 0, { axis: 'z', h: H, y, thick: 0.14, mat: MAT.plaster, tag: 'hall' });
  const b3 = makeDoor(world, {
    x: bOpen.ox, y, z: bOpen.oz, facing: Math.PI / 2, hinge: 'left',
    wallThick: 0.14, face: 0x7a4a2e, kind: 'wood', tag: 'door3b',
    label: 'Open', locked: true, lockedLabel: '3B', lockedLine: 'Three B. Somebody used to live in it.',
    hardware: 'knob', threshold: true
  });
  g.refs.door3B = b3;

  // east: the door onto the landing at the top of the stair
  const eOpen = world.wallWithDoor(X1 - 0.07, cz, d, 0, { axis: 'z', h: H, y, thick: 0.14, mat: MAT.plaster, tag: 'hall' });
  const out = makeDoor(world, {
    x: eOpen.ox, y, z: eOpen.oz, facing: Math.PI / 2, hinge: 'left',
    wallThick: 0.14, face: 0x7a4a2e, kind: 'wood', tag: 'doorout',
    label: 'Open', hardware: 'knob', glass: 1, threshold: true
  });
  g.refs.outerDoor = out;
  g.openOuter = (o, opts) => out.setOpen(o, opts);

  // ---------------------------------------------------------- the hall itself
  // a runner, a radiator that knocks, four mailboxes, one bulb
  const runner = new THREE.Mesh(PLN(len - 0.6, 0.9), tiled(MAT.carpet, len - 0.6, 0.9));
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(cx, y + 0.006, cz);
  world.add(runner);

  const rad = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const fin = new THREE.Mesh(BOX(0.05, 0.56, 0.16), flat(0xd8d2c4, { rough: .5, metal: .3 }));
    fin.position.set(i * 0.062 - 0.25, 0.34, 0);
    rad.add(fin);
  }
  rad.position.set(x - 1.6, y, Z1 - 0.24);
  world.add(rad);
  world.collide(x - 1.6, y, Z1 - 0.24, 0.66, 0.64, 0.24, 'rad');
  g.refs.radiator = rad;

  const boxes = new THREE.Mesh(BOX(0.62, 0.44, 0.1), flat(0x3d4a3a, { rough: .55, metal: .4 }));
  boxes.position.set(x + 3.4, y + 1.35, Z1 - 0.2);
  world.add(boxes);
  for (let i = 0; i < 4; i++) {
    const sl = new THREE.Mesh(BOX(0.26, 0.16, 0.02), flat(0x2a2b2d, { rough: .5 }));
    sl.position.set(x + 3.4 - 0.15 + (i % 2) * 0.3, y + 1.45 - Math.floor(i / 2) * 0.19, Z1 - 0.14);
    world.add(sl);
  }
  g.refs.mailboxes = boxes;

  const bulb = world.bulb(x + 1.6, y + H - 0.18, cz, {
    color: 0xFFC58A, intensity: lightsOn ? 1.35 : 0.5, dist: 8, size: 0.045
  });
  g.refs.light = bulb;
  const shade = new THREE.Mesh(CYL(0.13, 0.15, 0.11, 10), flat(0xe8e2d2, { rough: .9 }));
  shade.position.set(x + 1.6, y + H - 0.16, cz); world.add(shade);

  g.bounds = { X0, X1, Z0, Z1, y };
  g.spawn = { x: x + 3.0, z: cz, yaw: -Math.PI / 2 };
  return g;
}

/* ============================================================
   The Wash-Rite. Fluorescent hum, one TV bolted to the ceiling
   showing static, and the reason he goes out for detergent.
   ============================================================ */
export function buildLaundromat(world, { x = 0, y = 0, z = 0 } = {}) {
  // The room now fills the shell it lives in, so the shopfront and the
  // brick opening in front of it are the same wall. It used to stop a
  // metre short, behind a solid brick front with no way in.
  const W = 10.4, D = 8.7, H = 2.7;
  const h = { x, y, z, W, D, H, refs: {} };
  const FZ = z + D / 2;                       // the shopfront line
  const DOOR_X = x + RIDGE.shopDoorX;

  world.floor(x, z, W, D, { y, surface: 'lino', mat: MAT.tile });
  world.ceiling(x, z, W, D, { y: y + H });

  const wallMat = MAT.plaster;
  world.wall(x, z - D / 2, W, { axis: 'x', h: H, y, mat: wallMat });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H, y, mat: wallMat });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H, y, mat: wallMat });

  // ---------------------------------------------------------- shopfront
  // Two solid returns, then the glazed bay, split by the entrance.
  const bayL = x + RIDGE.shopX - RIDGE.shopW / 2;
  const bayR = x + RIDGE.shopX + RIDGE.shopW / 2;
  const rough = SCALE.doorW + SCALE.jamb * 2;
  const retL = bayL - (x - W / 2), retR = (x + W / 2) - bayR;
  if (retL > 0.05) world.wall(x - W / 2 + retL / 2, FZ, retL, { axis: 'x', h: H, y, mat: wallMat });
  if (retR > 0.05) world.wall(x + W / 2 - retR / 2, FZ, retR, { axis: 'x', h: H, y, mat: wallMat });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x22303c, roughness: .06, transmission: .6, transparent: true, opacity: .38, side: THREE.DoubleSide
  });
  const frameMat = flat(0x9aa0a4, { rough: .38, metal: .65 });
  const SILL = 0.34, HEAD = 2.36;
  /** One glazed panel: kickplate, glass, transom, and the mullions round it. */
  const bay = (cx, bw) => {
    if (bw < 0.06) return;
    const kick = new THREE.Mesh(BOX(bw, SILL, 0.1), flat(0x3d4a44, { rough: .6 }));
    kick.position.set(cx, y + SILL / 2, FZ); world.add(kick);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(bw - 0.08, HEAD - SILL - 0.08), glassMat);
    pane.position.set(cx, y + (SILL + HEAD) / 2, FZ); world.add(pane);
    const trans = new THREE.Mesh(BOX(bw, H - HEAD, 0.1), flat(0x3d4a44, { rough: .6 }));
    trans.position.set(cx, y + HEAD + (H - HEAD) / 2, FZ); world.add(trans);
    [-1, 1].forEach(s => {
      const mull = new THREE.Mesh(BOX(0.07, HEAD - SILL, 0.12), frameMat);
      mull.position.set(cx + s * (bw / 2 - 0.035), y + (SILL + HEAD) / 2, FZ); world.add(mull);
    });
    const head = new THREE.Mesh(BOX(bw, 0.07, 0.12), frameMat);
    head.position.set(cx, y + HEAD, FZ); world.add(head);
    world.collide(cx, y, FZ, bw, H, 0.14, 'shopfront');
  };
  const lw = (DOOR_X - rough / 2) - bayL;
  const rw = bayR - (DOOR_X + rough / 2);
  bay(bayL + lw / 2, lw);
  bay(DOOR_X + rough / 2 + rw / 2, rw);
  // the header over the entrance
  const hdr = new THREE.Mesh(BOX(rough, H - (SCALE.door + SCALE.jamb), 0.14), flat(0x3d4a44, { rough: .6 }));
  hdr.position.set(DOOR_X, y + SCALE.door + SCALE.jamb + (H - SCALE.door - SCALE.jamb) / 2, FZ);
  world.add(hdr);

  h.refs.door = makeDoor(world, {
    x: DOOR_X, y, z: FZ, facing: 0, hinge: 'left',
    wallThick: 0.12, face: 0x3d4a44, frameCol: 0x9aa0a4, kind: 'metal',
    tag: 'ldoor', label: 'Open', hardware: 'bar', glass: 2, panels: false,
    threshold: true, metal: 0x9aa0a4
  });
  h.refs.laundryDoor = h.refs.door;

  // machines
  const bankA = dryerBank(world, x, y, z - D / 2 + 0.45, 8, 0);
  const bankB = dryerBank(world, x - W / 2 + 0.45, y, z - 0.6, 5, Math.PI / 2);
  h.refs.dryers = [bankA, bankB];

  // folding table down the middle
  const ft = counter(world, x + 0.4, y, z + 0.6, 3.2, 0.8, 0, { h: 0.88, top: 0xd8d3c4, body: 0xb9b3a4 });
  h.refs.foldTable = ft;
  clutter(world, x + 0.4, ft.top, z + 0.6, 2.6, 0.6, { set: 'misc', seed: 33, count: 5 });

  // plastic chairs along the front
  for (let i = 0; i < 4; i++) chair(world, x + 3.2, y, z - 1.6 + i * 0.7, -Math.PI / 2, 0x8a6f4a);

  // the TV, bolted to the ceiling, showing static
  const tvh = tv(world, x + W / 2 - 0.9, y + 1.95, z + 1.6, -Math.PI / 2 - 0.35, { w: 0.6, h: 0.46 });
  const bracket = new THREE.Mesh(BOX(0.06, 0.5, 0.06), flat(0x2a2b2d, { rough: .6, metal: .4 }));
  bracket.position.set(x + W / 2 - 0.9, y + 2.45, z + 1.6); world.add(bracket);
  h.refs.tv = tvh;

  // change machine + detergent vending
  const vend = new THREE.Mesh(BOX(0.7, 1.7, 0.5), flat(0xb02f26, { rough: .5 }));
  vend.position.set(x - W / 2 + 0.4, y + 0.85, z + 2.2);
  vend.castShadow = true; world.add(vend);
  world.collide(x - W / 2 + 0.4, y, z + 2.2, 0.7, 1.7, 0.5, 'vend');
  const vglass = new THREE.Mesh(PLN(0.5, 0.9), flat(0x14171a, { rough: .1 }));
  vglass.position.set(x - W / 2 + 0.66, y + 1.2, z + 2.2); vglass.rotation.y = Math.PI / 2;
  world.add(vglass);
  h.refs.vending = vend;

  // fluorescent troffers
  const lights = [];
  for (let i = -1; i <= 1; i++) {
    const panel = new THREE.Mesh(BOX(2.2, 0.06, 0.4), new THREE.MeshBasicMaterial({ color: 0xE7F2E4 }));
    panel.position.set(x + i * 2.6, y + H - 0.06, z);
    world.add(panel);
    const l = world.bulb(x + i * 2.6, y + H - 0.2, z, {
      color: 0xE7F2E4, intensity: 2.2, dist: 8.5, shadow: i === 0, size: 0.01, emissive: false
    });
    lights.push({ panel, l });
  }
  h.refs.fluorescents = lights;
  // one of them ticks
  world.tick(() => {
    const t = performance.now() * 0.001;
    const f = Math.sin(t * 31) > 0.985 ? 0.4 : 1;
    lights[2].l.intensity = 2.2 * f;
    lights[2].panel.material.color.setScalar(f > .9 ? 1 : 0.4);
  });

  h.startAmbience = () => {
    audio.fluorescent([x, y + 2.4, z]);
    audio.dryers('comfort', [x, y + 0.9, z - 2.5]);
    audio.roomTone(0.04, 700);
  };

  h.spawn = { x: x + 1.4, z: z + D / 2 - 1.2, yaw: 0 };
  return h;
}
