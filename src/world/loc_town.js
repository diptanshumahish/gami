/* ============================================================
   loc_town.js: downtown Ashgrove (four blocks) and the
   burning ground at Kesslerton No. 9.

   Anthracite Diner · Wash-Rite · Kesslerton Pawn & Loan ·
   Ashgrove Fuel & Go · St. Brigid's Cemetery · the college
   library microfilm room.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, T } from './mat.js';
import { SHAPE, SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { makeDoor } from './door.js';
import { counter, chair, sofa, shelfUnit, clutter, smallProp, tv, corkboard } from './props.js';
import { signBoard, volvo } from './loc_street.js';
import { chainlink } from './loc_vasko.js';
import { mergeByMaterial, utilityPole } from './facades.js';
import { treeline } from './trees.js';

const rngOf = (seed) => {
  let q = (seed >>> 0) || 1;
  return () => {
    q = (q + 0x6D2B79F5) >>> 0;
    let t = Math.imul(q ^ (q >>> 15), 1 | q);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ============================================================
   THE ANTHRACITE DINER
   Booth vinyl, a jukebox with four working songs, and a
   corkboard of missing-persons flyers by the restrooms that
   Dale keeps meaning to take down. Nine flyers. Count them.
   ============================================================ */
export function buildDiner(world, { x = 0, y = 0, z = 0 } = {}) {
  const h = { x, y, z, refs: {} };
  const W = 11, D = 8, H = 2.7;
  world.floor(x, z, W, D, { y, surface: 'lino', mat: MAT.tile });
  world.ceiling(x, z, W, D, { y: y + H });
  world.wall(x, z - D / 2, W, { axis: 'x', h: H, y, mat: MAT.plaster });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  // The door is at the east end of the front, not the west. It used to be
  // at -3.5, which is exactly the west edge of the first booth: the leaf
  // swung open into a bench seat and the doorway had 0.6 m of clearance
  // where a person needs 0.56, so walking in was a squeeze and walking in
  // carrying anything was not possible. Nobody had noticed, because until
  // Chapter One nobody arrived at this building on foot.
  const dOpen = world.wallWithDoor(x, z + D / 2, W, 4.3, { axis: 'x', h: H, y, mat: MAT.plaster });
  h.refs.door = makeDoor(world, {
    x: dOpen.ox, y, z: dOpen.oz, facing: 0, hinge: 'left', wallThick: 0.14,
    face: 0x3d4a44, frameCol: 0x9aa0a4, metal: 0x9aa0a4, kind: 'metal',
    tag: 'dinerdoor', hardware: 'bar', glass: 2, panels: false, threshold: true
  });

  // counter + stools
  const c = counter(world, x + 2.6, y, z - 1.2, 5.2, 0.8, 0, { top: 0x6a4a30, body: 0xc4a15a });
  h.refs.counter = c;
  clutter(world, x + 2.6, c.top, z - 1.2, 4.6, 0.6, { set: 'kitchen', seed: 301 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(CYL(0.17, 0.17, 0.08, 12), flat(0x8C2F26, { rough: .4 }));
    s.position.set(x + 0.4 + i * 0.75, y + 0.72, z - 0.5);
    world.add(s);
    const p = new THREE.Mesh(CYL(0.05, 0.06, 0.68, 8), flat(0x9aa0a4, { rough: .3, metal: .7 }));
    p.position.set(x + 0.4 + i * 0.75, y + 0.34, z - 0.5);
    world.add(p);
    world.collide(x + 0.4 + i * 0.75, y, z - 0.5, 0.36, 0.8, 0.36, 'stool');
  }

  // booths along the window
  h.refs.booths = [];
  for (let i = 0; i < 4; i++) {
    const bx = x - W / 2 + 1.4 + i * 2.2;
    const t = counter(world, bx, y, z + 2.6, 1.1, 0.7, 0, { h: 0.74, top: 0xd8cdb4, body: 0x9aa0a4 });
    [-1, 1].forEach(s => {
      const seat = new THREE.Mesh(BOX(1.2, 0.45, 0.5), flat(0x8C2F26, { rough: .35 }));
      seat.position.set(bx, y + 0.28, z + 2.6 + s * 0.72); world.add(seat);
      const back = new THREE.Mesh(BOX(1.2, 0.72, 0.12), flat(0x8C2F26, { rough: .35 }));
      back.position.set(bx, y + 0.62, z + 2.6 + s * 0.98); world.add(back);
      world.collide(bx, y, z + 2.6 + s * 0.85, 1.2, 1.0, 0.6, 'booth');
    });
    clutter(world, bx, t.top, z + 2.6, 0.9, 0.5, { set: 'kitchen', seed: 310 + i, count: 5 });
    h.refs.booths.push({ x: bx, z: z + 2.6, top: t.top });
  }

  // shopfront glazing
  const glassW = new THREE.Mesh(SHAPE.Plane(6.5, 1.7), new THREE.MeshPhysicalMaterial({
    color: 0x22303c, roughness: .06, transmission: .6, transparent: true, opacity: .34, side: THREE.DoubleSide
  }));
  glassW.position.set(x - 1.4, y + 1.45, z + D / 2 - 0.08);
  world.add(glassW);

  // jukebox, four working songs
  const jb = new THREE.Mesh(BOX(0.7, 1.4, 0.5), flat(0x6a2f26, { rough: .35 }));
  jb.position.set(x + W / 2 - 0.6, y + 0.7, z + 2.6); world.add(jb);
  const jbg = new THREE.Mesh(PLN(0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xE8A653 }));
  jbg.position.set(x + W / 2 - 0.95, y + 1.1, z + 2.6); jbg.rotation.y = -Math.PI / 2;
  world.add(jbg);
  world.collide(x + W / 2 - 0.6, y, z + 2.6, 0.7, 1.4, 0.5, 'jukebox');
  h.refs.jukebox = jb;

  // ---- THE CORKBOARD. nine flyers. ----
  const cb = new THREE.Group();
  const board = new THREE.Mesh(BOX(1.5, 1.0, 0.03), flat(0x9a7a4e, { rough: .95 }));
  cb.add(board);
  h.refs.flyers = [];
  for (let i = 0; i < 9; i++) {
    const fx = -0.55 + (i % 3) * 0.55, fy = 0.32 - Math.floor(i / 3) * 0.33;
    const f = new THREE.Mesh(PLN(0.34, 0.28), flat(0xf1ede2, { rough: .96 }));
    f.position.set(fx, fy, 0.018);
    f.rotation.z = (Math.random() - .5) * 0.16;
    // a face-shaped grey rectangle. the photos are all bad photocopies.
    const ph = new THREE.Mesh(PLN(0.11, 0.13), flat(0x8d8d8d, { rough: .95 }));
    ph.position.set(0, -0.01, 0.002); f.add(ph);
    const hd = new THREE.Mesh(PLN(0.3, 0.05), flat(0x2a2520, { rough: .9 }));
    hd.position.set(0, 0.1, 0.002); f.add(hd);
    cb.add(f);
    h.refs.flyers.push(f);
  }
  cb.position.set(x + W / 2 - 0.08, y + 1.55, z - 2.6);
  cb.rotation.y = -Math.PI / 2;
  world.add(cb);
  h.refs.corkboard = cb;

  h.refs.light = world.bulb(x, y + H - 0.2, z, { color: 0xFFC58A, intensity: 2.0, dist: 9, shadow: true, size: 0.05 });
  world.bulb(x - 3, y + H - 0.2, z + 2, { color: 0xE7F2E4, intensity: 1.2, dist: 6, emissive: false });
  h.spawn = { x: x - 3.5, z: z + D / 2 - 1.0, yaw: 0 };
  return h;
}

/* ============================================================
   KESSLERTON PAWN & LOAN
   Glass cases, a shelf of dead people's wedding rings, and a
   copy of The Long Lost Friend for four dollars.
   ============================================================ */
export function buildPawn(world, { x = 0, y = 0, z = 0 } = {}) {
  const h = { x, y, z, refs: {} };
  const W = 8, D = 7, H = 2.7;
  world.floor(x, z, W, D, { y, surface: 'carpet', mat: MAT.carpet });
  world.ceiling(x, z, W, D, { y: y + H });
  world.wall(x, z - D / 2, W, { axis: 'x', h: H, y, mat: MAT.plaster });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  const pOpen = world.wallWithDoor(x, z + D / 2, W, -2.6, { axis: 'x', h: H, y, mat: MAT.plaster });
  h.refs.door = makeDoor(world, {
    x: pOpen.ox, y, z: pOpen.oz, facing: 0, hinge: 'left', wallThick: 0.14,
    face: 0x4a3524, frameCol: 0xd8d2c4, kind: 'wood',
    tag: 'pawndoor', hardware: 'knob', glass: 1, threshold: true
  });

  // glass cases
  h.refs.cases = [];
  for (let i = 0; i < 3; i++) {
    const cx = x - 2.2 + i * 2.2;
    const base = counter(world, cx, y, z - 1.0, 2.0, 0.7, 0, { h: 0.9, top: 0x3f3a34, body: 0x4a3524 });
    const g = new THREE.Mesh(SHAPE.Box(2.0, 0.34, 0.7), new THREE.MeshPhysicalMaterial({
      color: 0xb8c4cc, roughness: .04, transmission: .85, transparent: true, opacity: .22
    }));
    g.position.set(cx, y + 1.07, z - 1.0); world.add(g);
    // dead people's wedding rings
    for (let k = 0; k < 12; k++) {
      const r = new THREE.Mesh(SHAPE.Torus(0.011, 0.003, 5, 12), flat(k % 3 ? 0xc9b071 : 0xc0c4c8, { rough: .2, metal: .9 }));
      r.rotation.x = -Math.PI / 2;
      r.position.set(cx - 0.85 + (k % 6) * 0.34, y + 0.92, z - 1.2 + Math.floor(k / 6) * 0.3);
      world.add(r);
    }
    h.refs.cases.push({ x: cx, z: z - 1.0, top: y + 0.92 });
  }
  shelfUnit(world, x - W / 2 + 0.2, y, z + 1.0, Math.PI / 2, { w: 2.2, h: 1.9, d: 0.3, shelves: 5, seed: 401 });
  shelfUnit(world, x + W / 2 - 0.2, y, z + 1.0, -Math.PI / 2, { w: 2.2, h: 1.9, d: 0.3, shelves: 5, seed: 403 });

  // THE BOOK. four dollars.
  const book = new THREE.Mesh(BOX(0.11, 0.028, 0.17), flat(0x6b5a3c, { rough: .92 }));
  book.position.set(x + 1.9, y + 0.94, z - 1.0);
  book.rotation.y = 0.3;
  book.castShadow = true;
  world.add(book);
  h.refs.hohman = book;

  // and a tape, in the case, for two dollars
  const tape = smallProp('cassette', Math.random);
  tape.position.set(x - 2.4, y + 0.92, z - 1.15);
  world.add(tape);
  h.refs.tape = tape;

  h.refs.light = world.bulb(x, y + H - 0.2, z, { color: 0xE7F2E4, intensity: 1.7, dist: 8, shadow: true, emissive: false });
  h.spawn = { x: x - 2.6, z: z + D / 2 - 1.0, yaw: 0 };
  return h;
}

/* ============================================================
   ASHGROVE FUEL & GO
   Marta's register, and a four-camera security monitor behind
   the counter that matters enormously in Chapter 4.
   ============================================================ */
/**
 * The FUEL & GO sign: the 1990s independent-station look. A teal panel
 * with a red stripe along the foot, 'FUEL' in heavy italic white, the
 * '& GO' in yellow, a hard dark drop shadow under the letters, and the
 * whole thing a little faded. Drawn on a canvas; the face is a system
 * heavy sans because that is what a sign shop in 1994 had.
 */
export function brandSign(w, h, { text = 'FUEL', tail = '& GO', sub = null, bg = '#1a3a4a', stripe = '#b0302a', fg = '#f2ead6', accent = '#e8c23a' } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(64, Math.round(512 * h / w));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = stripe; g.fillRect(0, H * 0.82, W, H * 0.18);
  g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, W, H * 0.08);
  const size = Math.round(H * (sub ? 0.50 : 0.62));
  g.font = `italic 900 ${size}px Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const tw1 = g.measureText(text + ' ').width, tw2 = g.measureText(tail).width;
  let x0 = (W - tw1 - tw2) / 2; const yy = H * (sub ? 0.36 : 0.44);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(text + ' ', x0 + 5, yy + 5); g.fillText(tail, x0 + tw1 + 5, yy + 5);
  g.fillStyle = fg; g.fillText(text + ' ', x0, yy);
  g.fillStyle = accent; g.fillText(tail, x0 + tw1, yy);
  if (sub) {
    g.font = `bold ${Math.round(H * 0.16)}px "JetBrains Mono", monospace`; g.textAlign = 'center';
    g.fillStyle = fg; g.fillText(sub, W / 2, H * 0.70);
  }
  // sun-fade and dirt
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${40 + Math.random() * 30},30,${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(PLN(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .7, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.10 }));
  return m;
}

export function buildFuelGo(world, { x = 0, y = 0, z = 0, snow = false } = {}) {
  const h = { x, y, z, refs: {} };
  const W = 8, D = 6, H = 2.8;
  world.floor(x, z, W, D, { y, surface: 'lino', mat: MAT.tile });
  world.ceiling(x, z, W, D, { y: y + H });
  world.wall(x, z - D / 2, W, { axis: 'x', h: H, y, mat: MAT.plaster });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  const fOpen = world.wallWithDoor(x, z + D / 2, W, -2.4, { axis: 'x', h: H, y, mat: MAT.plaster });
  h.refs.door = makeDoor(world, {
    x: fOpen.ox, y, z: fOpen.oz, facing: 0, hinge: 'left', wallThick: 0.14,
    face: 0x3d4a44, frameCol: 0x9aa0a4, metal: 0x9aa0a4, kind: 'metal',
    tag: 'fueldoor', hardware: 'bar', glass: 2, panels: false, threshold: true
  });

  // the shopfront: a big window beside the door with the lottery and
  // cigarette posters in it, a fascia along the top, a parapet over
  {
    const fz = z + D / 2 + 0.075;
    const glass = new THREE.Mesh(PLN(3.2, 1.6), new THREE.MeshPhysicalMaterial({ color: 0x8fa6b8, roughness: .06, metalness: 0, transmission: .6, transparent: true, opacity: .45 }));
    glass.position.set(x + 1.8, y + 1.5, fz + 0.01); world.add(glass);
    const fr = flat(0x9aa0a4, { rough: .5, metal: .3 });
    [[x + 0.2, y + 1.5, 0.06, 1.64], [x + 3.4, y + 1.5, 0.06, 1.64]].forEach(([fx, fy, fw, fh]) => { const m = new THREE.Mesh(BOX(fw, fh, 0.06), fr); m.position.set(fx, fy, fz + 0.02); world.add(m); });
    [[x + 1.8, y + 0.7], [x + 1.8, y + 2.3]].forEach(([fx, fy]) => { const m = new THREE.Mesh(BOX(3.26, 0.06, 0.06), fr); m.position.set(fx, fy, fz + 0.02); world.add(m); });
    const sill = new THREE.Mesh(BOX(3.4, 0.7, 0.08), MAT.brick); sill.position.set(x + 1.8, y + 0.35, fz); world.add(sill);
    const post1 = signBoard('LOTTERY', 0.6, 0.3, '#f2ead6', '#b0302a'); post1.position.set(x + 0.9, y + 1.85, fz + 0.03); world.add(post1);
    const post2 = signBoard('COLD BEER', 0.7, 0.3, '#e8eef2', '#1d4a8a'); post2.position.set(x + 2.6, y + 1.85, fz + 0.03); world.add(post2);
    const post3 = signBoard('OPEN', 0.5, 0.24, '#ff6a4a', '#1a1512'); post3.position.set(x + 1.8, y + 1.2, fz + 0.03); world.add(post3);
    const fascia = brandSign(W, 0.7, { sub: 'GAS  ·  ICE  ·  LOTTERY  ·  OPEN 6 TO 11' }); fascia.position.set(x, y + H - 0.36, fz + 0.04); world.add(fascia);
    const parapet = new THREE.Mesh(BOX(W + 0.3, 0.5, D + 0.3), flat(0x6a645c, { rough: .9 })); parapet.position.set(x, y + H + 0.2, z); world.add(parapet);
    // and a light over the door, which is the light he reads the plaque by
    world.bulb(x - 2.4, y + H - 0.25, fz + 0.25, { color: 0xFFE0B0, intensity: 1.2, dist: 6, emissive: true });
  }

  const reg = counter(world, x + 1.4, y, z + 1.6, 3.0, 0.8, 0, { top: 0x3f3a34, body: 0xc4bda9 });
  h.refs.register = reg;
  clutter(world, x + 1.4, reg.top, z + 1.6, 2.4, 0.6, { set: 'shop', seed: 501 });

  // aisles
  for (let i = 0; i < 3; i++) {
    shelfUnit(world, x - 2.4 + i * 1.5, y, z - 1.0, 0, { w: 1.2, h: 1.4, d: 0.5, shelves: 4, seed: 510 + i });
  }
  // cooler
  const cool = new THREE.Mesh(BOX(3.0, 2.1, 0.7), flat(0x2a3238, { rough: .3 }));
  cool.position.set(x - 1.5, y + 1.05, z - D / 2 + 0.4); world.add(cool);
  world.collide(x - 1.5, y, z - D / 2 + 0.4, 3.0, 2.1, 0.7, 'cooler');
  const cg = new THREE.Mesh(PLN(2.8, 1.7), new THREE.MeshPhysicalMaterial({
    color: 0xb8c4cc, roughness: .05, transmission: .7, transparent: true, opacity: .3
  }));
  cg.position.set(x - 1.5, y + 1.15, z - D / 2 + 0.76); world.add(cg);
  world.bulb(x - 1.5, y + 1.8, z - D / 2 + 0.5, { color: 0xE7F2E4, intensity: 1.2, dist: 3.5, emissive: false });

  // ---- THE FOUR-CAMERA SECURITY MONITOR ----
  h.refs.monitor = securityMonitor(world, x + 2.9, y + 1.55, z + 2.2, -Math.PI / 2 - 0.35);

  h.refs.light = world.bulb(x, y + H - 0.2, z, { color: 0xE7F2E4, intensity: 2.2, dist: 9, shadow: true, emissive: false });

  // ---- the forecourt ----
  // It is at the edge of town, which is to say it is in the woods: the
  // state route runs past the front, there is grass to the treeline on
  // every other side, poles and wires along the road, and the canopy is
  // the only thing lit for a mile. The apron, the pumps, the island, the
  // ice chest by the door: a gas station, not a box under a slab.
  const FZ = z + D / 2 + 6;                 // the pump island line
  const ground = new THREE.Mesh(PLN(320, 320), tiled(MAT.grass, 320, 320));
  ground.material.color.setHex(snow ? 0x8a8f96 : 0x6e7468); ground.material.userData.own = true;
  if (snow) ground.material = tiled(MAT.snow, 320, 320);
  ground.rotation.x = -Math.PI / 2; ground.position.set(x, y - 0.03, z + 10); ground.receiveShadow = true; world.add(ground);
  world.floor(x, z + D / 2 + 7, 22, 14, { y, surface: snow ? 'slush' : 'concrete', mat: snow ? MAT.snow : MAT.concrete });
  // the approach out to the road, and the road itself, running across
  const apron = new THREE.Mesh(PLN(24, 6), tiled(MAT.asphalt, 24, 6));
  apron.rotation.x = -Math.PI / 2; apron.position.set(x, y + 0.004, z + D / 2 + 17); apron.receiveShadow = true; world.add(apron);
  const road = new THREE.Mesh(PLN(220, 7.4), tiled(MAT.asphalt, 220, 7.4));
  road.rotation.x = -Math.PI / 2; road.position.set(x, y + 0.006, z + D / 2 + 23.4); road.receiveShadow = true; world.add(road);
  const lineM = flat(0xa88a46, { rough: .85 }), edgeM = flat(0xa39e92, { rough: .85 });
  for (let k = -12; k < 12; k++) {
    const d = new THREE.Mesh(PLN(3.2, 0.11), lineM);
    d.rotation.x = -Math.PI / 2; d.position.set(x + k * 9 + 1.6, y + 0.012, z + D / 2 + 23.4); world.add(d);
  }
  [-1, 1].forEach(sd => {
    const e = new THREE.Mesh(PLN(220, 0.10), edgeM);
    e.rotation.x = -Math.PI / 2; e.position.set(x, y + 0.012, z + D / 2 + 23.4 + sd * 3.45); world.add(e);
  });
  // poles along the far side of the road, wires between them
  for (let k = -3; k <= 3; k++) {
    utilityPole(world, x + k * 30 + 7, y - 0.1, z + D / 2 + 29, { h: 8.6, to: { x: x + (k + 1) * 30 + 7, z: z + D / 2 + 29 }, wires: 2, segs: 5, transformer: k === 0 });
  }
  // the treeline, all round
  {
    const tg = new THREE.Group(); world.add(tg);
    const P = { tree: snow ? 0x3a4050 : 0x7a7c74 };
    const R = rngOf(7001);
    treeline(tg, P, R, { x0: x - 95, x1: x + 95, z0: z + D / 2 + 34, z1: z + D / 2 + 46, n: 28, cards: 34, far: 12 });   // across the road
    treeline(tg, P, R, { x0: x - 95, x1: x + 95, z0: z - 34, z1: z - 14, n: 26, cards: 30, far: 14 });                 // behind
    treeline(tg, P, R, { x0: x - 70, x1: x - 18, z0: z - 12, z1: z + D / 2 + 18, n: 14, cards: 16, far: 10 });          // west
    treeline(tg, P, R, { x0: x + 18, x1: x + 70, z0: z - 12, z1: z + D / 2 + 18, n: 14, cards: 16, far: 10 });          // east
    // and the wall behind all of it: cards only, out where the fog has them
    treeline(tg, P, R, { x0: x - 140, x1: x + 140, z0: z + D / 2 + 48, z1: z + D / 2 + 70, n: 0, cards: 70, far: 18 });
    treeline(tg, P, R, { x0: x - 140, x1: x + 140, z0: z - 70, z1: z - 36, n: 0, cards: 60, far: 18 });
    treeline(tg, P, R, { x0: x - 130, x1: x - 72, z0: z - 40, z1: z + 50, n: 0, cards: 40, far: 16 });
    treeline(tg, P, R, { x0: x + 72, x1: x + 130, z0: z - 40, z1: z + 50, n: 0, cards: 40, far: 16 });
    mergeByMaterial(tg);
    // the ridges: the valley's sides, far enough that the fog has most of
    // them and they are a line over the treetops, not a shape in the lot
    const HILL = snow ? [0x1a2028, 0x1e2430, 0x242a38] : [0x2a3036, 0x313848, 0x3b4258];
    // across the road and behind the building only: the drive rail lives
    // three hundred metres west of here and a ridge on that side of the
    // ring sits in the road
    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? 1 : -1;
      const a = side * (Math.PI / 2 + ((i % 6) - 2.5) * 0.28 + (R() - 0.5) * 0.1), d = 250 + R() * 70;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(30 + R() * 34, 1), flat(HILL[i % 3], { rough: 1 }));
      m.position.set(x + Math.cos(a) * d, -12 + R() * 6, z + 10 + Math.sin(a) * d);
      m.scale.set(2.4 + R(), 0.34 + R() * 0.18, 1.4 + R() * 0.6);
      m.rotation.y = R() * 3; m.castShadow = false; m.receiveShadow = false;
      world.add(m);
    }
    tg.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  }

  // the canopy: a slab with a fascia band round it, lights let into the soffit
  const canopy = new THREE.Mesh(BOX(12, 0.5, 8), flat(0xd8d5cc, { rough: .6 }));
  canopy.position.set(x, y + 4.45, z + D / 2 + 6); world.add(canopy);
  const fasciaM = flat(0xd8b33a, { rough: .6 }), bandM = flat(0xb0302a, { rough: .6 });
  [[0, 4.04, 12.1, 0.06], [0, -4.04, 12.1, 0.06], [6.04, 0, 0.06, 8.1], [-6.04, 0, 0.06, 8.1]].forEach(([fx, fz, fw, fd]) => {
    const f = new THREE.Mesh(BOX(fw, 0.56, fd), fasciaM); f.position.set(x + fx, y + 4.45, z + D / 2 + 6 + fz); world.add(f);
    const r = new THREE.Mesh(BOX(fw + 0.01, 0.10, fd + 0.01), bandM); r.position.set(x + fx, y + 4.30, z + D / 2 + 6 + fz); world.add(r);
  });
  [[-5, 3], [5, 3], [-5, 9], [5, 9]].forEach(([px, pz]) => {
    const p = new THREE.Mesh(BOX(0.30, 4.2, 0.30), flat(0xc8c5bc, { rough: .6 }));
    p.position.set(x + px, y + 2.1, z + D / 2 + pz); world.add(p);
    const r = new THREE.Mesh(BOX(0.32, 0.8, 0.32), bandM); r.position.set(x + px, y + 0.4, z + D / 2 + pz); world.add(r);
    world.collide(x + px, y, z + D / 2 + pz, 0.3, 4.2, 0.3, 'canopypost');
  });
  for (let i = 0; i < 4; i++) {
    const lx = x - 4 + i * 2.8;
    world.bulb(lx, y + 4.1, FZ, { color: 0xE7F2E4, intensity: 1.8, dist: 11, emissive: false });
    const lens = new THREE.Mesh(BOX(0.8, 0.04, 0.5), new THREE.MeshBasicMaterial({ color: 0xfaf6e4 }));
    lens.position.set(lx, y + 4.19, FZ); world.add(lens);
  }
  // two pumps on one island between the canopy posts, a car's width apart
  const island = new THREE.Mesh(BOX(1.2, 0.15, 7.2), tiled(MAT.concrete, 1.2, 7.2));
  island.position.set(x, y + 0.075, FZ); world.add(island);
  [-2.4, 2.4].forEach((px, i) => {
    h.refs['pump' + (i + 1)] = fuelPump(world, x + px, y + 0.15, FZ, 0, { n: i + 1 });
    world.collide(x + px, y, FZ, 0.7, 1.9, 1.0, 'pump');
    [-1, 1].forEach(sd => {
      const bol = new THREE.Mesh(CYL(0.09, 0.09, 0.95, 8), fasciaM);
      bol.position.set(x + px, y + 0.6, FZ + sd * 1.6); world.add(bol);
    });
  });
  const s = brandSign(4.0, 0.9); s.position.set(x, y + 5.05, z + D / 2 + 2.0); world.add(s);
  const sBack = brandSign(4.0, 0.9); sBack.position.set(x, y + 5.05, z + D / 2 + 1.98); sBack.rotation.y = Math.PI; world.add(sBack);
  // the price sign out by the road, on two posts
  {
    const ps = signBoard('REGULAR   3.49\nPLUS      3.69\nDIESEL    3.89', 2.0, 1.2, '#f2ead6', '#1a1512');
    ps.position.set(x - 9, y + 3.4, z + D / 2 + 17.5); ps.rotation.y = 0; world.add(ps);
    const pm = flat(0x4a4a48, { rough: .8, metal: .3 });
    [-0.8, 0.8].forEach(px => { const post = new THREE.Mesh(BOX(0.1, 4.0, 0.1), pm); post.position.set(x - 9 + px, y + 2.0, z + D / 2 + 17.45); world.add(post); });
    const top = brandSign(2.0, 0.6); top.position.set(x - 9, y + 4.35, z + D / 2 + 17.5); world.add(top);
    const topB = brandSign(2.0, 0.6); topB.position.set(x - 9, y + 4.35, z + D / 2 + 17.4); topB.rotation.y = Math.PI; world.add(topB);
    const psB = signBoard('REGULAR   3.49\\nPLUS      3.69\\nDIESEL    3.89', 2.0, 1.2, '#f2ead6', '#1a1512'); psB.position.set(x - 9, y + 3.4, z + D / 2 + 17.4); psB.rotation.y = Math.PI; world.add(psB);
  }
  // by the door: the ice chest, the propane cage, a bin, the air hose
  {
    // past the corner, where it does not stand in the doorway
    const ice = new THREE.Mesh(BOX(1.3, 1.0, 0.75), flat(0xe6e4dc, { rough: .5 })); ice.position.set(x - 4.9, y + 0.5, z + D / 2 + 0.55); world.add(ice);
    const lab = signBoard('ICE', 0.8, 0.36, '#e8eef2', '#1d4a8a'); lab.position.set(x - 4.9, y + 0.62, z + D / 2 + 0.94); world.add(lab);
    world.collide(x - 4.9, y, z + D / 2 + 0.55, 1.3, 1.0, 0.75, 'ice');
    const cage = new THREE.Mesh(BOX(1.0, 1.3, 0.6), flat(0x5a5e60, { rough: .6, metal: .4, transparent: true, opacity: .55 })); cage.position.set(x + 3.2, y + 0.65, z + D / 2 + 0.5); world.add(cage);
    for (let k = 0; k < 3; k++) { const tank = new THREE.Mesh(CYL(0.14, 0.14, 0.45, 10), flat(0xd8d2c0, { rough: .5 })); tank.position.set(x + 2.9 + k * 0.3, y + 0.32, z + D / 2 + 0.5); world.add(tank); }
    world.collide(x + 3.2, y, z + D / 2 + 0.5, 1.0, 1.3, 0.6, 'cage');
    const bin = new THREE.Mesh(CYL(0.26, 0.22, 0.8, 10), flat(0x3a4a44, { rough: .7 })); bin.position.set(x + W / 2 - 0.4, y + 0.4, z + D / 2 + 0.6); world.add(bin);
    const air = new THREE.Mesh(BOX(0.36, 1.2, 0.36), flat(0x3060a8, { rough: .5 })); air.position.set(x + 7.5, y + 0.6, z + D / 2 + 3.0); world.add(air);
    const airLab = signBoard('AIR', 0.3, 0.16, '#ffffff', '#3060a8'); airLab.position.set(x + 7.5, y + 1.0, z + D / 2 + 3.19); world.add(airLab);
  }

  // ---- the payphone. this is where he calls her. ----
  h.refs.payphone = payphone(world, x + W / 2 + 0.6, y, z + 2.0, -Math.PI / 2);

  h.spawn = { x: x - 2.4, z: z + D / 2 - 1.0, yaw: 0 };
  return h;
}

/** Four cameras. Camera 2 is the forecourt. */
function securityMonitor(world, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const body = new THREE.Mesh(BOX(0.5, 0.42, 0.4), flat(0x2a2b2d, { rough: .6 }));
  g.add(body);
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 240;
  const tex = new THREE.CanvasTexture(canvas);
  const screen = new THREE.Mesh(PLN(0.42, 0.34), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.z = 0.205; g.add(screen);
  world.add(g);
  world.collide(x, y - 1.55, z, 0.55, 1.8, 0.5, 'monitor');

  const h = {
    g, screen, canvas, tex,
    passenger: false,
    labels: ['CAM 1  FORECOURT N', 'CAM 2  FORECOURT S', 'CAM 3  REGISTER', 'CAM 4  BACK LOT'],
    draw() {
      const c = canvas.getContext('2d');
      c.fillStyle = '#0a0c0d'; c.fillRect(0, 0, 320, 240);
      for (let q = 0; q < 4; q++) {
        const qx = (q % 2) * 160, qy = Math.floor(q / 2) * 120;
        c.save();
        c.beginPath(); c.rect(qx + 1, qy + 1, 158, 118); c.clip();
        // greyscale nothing
        c.fillStyle = ['#1b1e20', '#171a1c', '#202426', '#141618'][q];
        c.fillRect(qx, qy, 160, 120);
        // grain
        for (let i = 0; i < 700; i++) {
          const v = 20 + Math.random() * 60;
          c.fillStyle = `rgba(${v},${v},${v},.5)`;
          c.fillRect(qx + Math.random() * 160, qy + Math.random() * 120, 1.6, 1.6);
        }
        if (q === 1) {
          // the forecourt. and the car.
          c.fillStyle = '#3a4044'; c.fillRect(qx + 8, qy + 78, 144, 40);       // apron
          c.fillStyle = '#2e3438'; c.fillRect(qx + 20, qy + 6, 120, 22);        // canopy
          // the Volvo, side on
          c.fillStyle = '#5a6165'; c.fillRect(qx + 44, qy + 56, 74, 20);
          c.fillRect(qx + 58, qy + 44, 44, 14);
          c.fillStyle = '#14181a'; c.fillRect(qx + 50, qy + 74, 12, 8); c.fillRect(qx + 100, qy + 74, 12, 8);
          // the windows
          c.fillStyle = '#20262a'; c.fillRect(qx + 61, qy + 46, 18, 11);   // driver
          c.fillRect(qx + 82, qy + 46, 18, 11);                            // passenger
          if (h.passenger) {
            // somebody sitting in it. no sting. it is entirely silent.
            c.fillStyle = '#0b0d0e';
            c.beginPath(); c.ellipse(qx + 91, qy + 50, 4.2, 5.0, 0, 0, 7); c.fill();
            c.fillRect(qx + 87, qy + 54, 9, 4);
          }
        }
        c.restore();
        c.strokeStyle = '#2a3034'; c.lineWidth = 1; c.strokeRect(qx + 1, qy + 1, 158, 118);
        c.fillStyle = '#7d8894'; c.font = '9px "JetBrains Mono", monospace';
        c.fillText(h.labels[q], qx + 5, qy + 112);
      }
      tex.needsUpdate = true;
    },
    setPassenger(v) { h.passenger = v; h.draw(); }
  };
  h.draw();
  let acc = 0;
  world.tick(dt => { acc += dt; if (acc > 0.25) { acc = 0; h.draw(); } });
  return h;
}

/**
 * A gas pump, 1990s: a cream cabinet on the island with a red band, a
 * head with the three red LED rows (sale, gallons, price) on both faces,
 * a hose looped down to a holster and a black nozzle in it. The brand
 * lives on the canopy; the pump has a number.
 */
function pumpDisplay(n) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (sale = 0, gal = 0, price = 3.49, on = true) => {
    g.fillStyle = '#2a2824'; g.fillRect(0, 0, 256, 192);
    const row = (yy, label, val) => {
      g.fillStyle = '#0c0a09'; g.fillRect(14, yy, 228, 40);
      g.fillStyle = on ? '#ff3b2a' : '#3a1410'; g.font = 'bold 30px "VCR OSD Mono", "JetBrains Mono", monospace';
      g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(val, 236, yy + 21);
      g.fillStyle = '#d8cfb8'; g.font = '10px "JetBrains Mono", monospace'; g.textAlign = 'left'; g.fillText(label, 18, yy + 34);
    };
    row(10, 'THIS SALE  $', sale.toFixed(2));
    row(62, 'GALLONS', gal.toFixed(3));
    row(114, 'PRICE PER GALLON  $', price.toFixed(2));
    g.fillStyle = '#f2ead6'; g.font = 'bold 12px "JetBrains Mono", monospace'; g.textAlign = 'center';
    g.fillText('REGULAR UNLEADED   87   ·   PUMP ' + n, 128, 176);
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}
export function fuelPump(world, x, y, z, rot = 0, { n = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const cream = flat(0xe2ddd0, { rough: .55 }), red = flat(0xb0302a, { rough: .55 }), black = flat(0x1a1a1c, { rough: .8 });
  const add = (m, px, py, pz, rx = 0, ry = 0, rz = 0) => { m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  add(new THREE.Mesh(BOX(0.56, 0.92, 0.92), cream), 0, 0.46, 0);
  add(new THREE.Mesh(BOX(0.57, 0.10, 0.93), red), 0, 0.98, 0);
  add(new THREE.Mesh(BOX(0.56, 0.54, 0.92), cream), 0, 1.30, 0);
  add(new THREE.Mesh(BOX(0.50, 0.03, 0.86), black), 0, 1.585, 0);      // a thin cap, inset, not a lid
  add(new THREE.Mesh(BOX(0.58, 0.04, 0.94), black), 0, 0.02, 0);       // the plinth
  const disp = pumpDisplay(n);
  [1, -1].forEach(sd => {
    const face = new THREE.Mesh(PLN(0.56, 0.42), new THREE.MeshBasicMaterial({ map: disp.tex }));
    add(face, sd * 0.283, 1.30, 0, 0, sd * Math.PI / 2, 0);
    // the grade button strip under the display and the card slot
    add(new THREE.Mesh(BOX(0.01, 0.06, 0.40), black), sd * 0.285, 1.02, 0);
    for (let k = 0; k < 3; k++) add(new THREE.Mesh(BOX(0.012, 0.04, 0.09), [flat(0x3c8a4a, { rough: .5 }), flat(0x3060a8, { rough: .5 }), red][k]), sd * 0.292, 1.02, -0.13 + k * 0.13);
    // hose: up the side from the top, a loop, and down into the holster
    const hoseM = flat(0x111214, { rough: .9 });
    add(new THREE.Mesh(CYL(0.022, 0.022, 0.40, 7), hoseM), sd * 0.20, 1.40, -0.50, 0.35, 0, 0);
    add(new THREE.Mesh(SHAPE.Torus(0.16, 0.022, 6, 12, Math.PI), hoseM), sd * 0.20, 1.18, -0.52, 0, Math.PI / 2, Math.PI);
    add(new THREE.Mesh(CYL(0.022, 0.022, 0.32, 7), hoseM), sd * 0.20, 1.02, -0.36, 0, 0, 0);
    // the holster and the nozzle in it
    add(new THREE.Mesh(BOX(0.08, 0.18, 0.10), black), sd * 0.31, 0.90, -0.30);
    add(new THREE.Mesh(BOX(0.05, 0.06, 0.20), black), sd * 0.32, 0.84, -0.20, -0.25, 0, 0);
    add(new THREE.Mesh(BOX(0.03, 0.12, 0.05), black), sd * 0.32, 0.78, -0.30);
    // the pump number
    const num = signBoard(String(n), 0.16, 0.16, '#f2ead6', '#b0302a');
    add(num, sd * 0.29, 1.50, 0.30, 0, sd * Math.PI / 2, 0);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  return { g, display: disp };
}

function payphone(world, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const box = new THREE.Mesh(BOX(0.34, 0.62, 0.22), flat(0x2a3a44, { rough: .5, metal: .3 }));
  box.position.y = 1.35; g.add(box);
  const hook = new THREE.Mesh(BOX(0.07, 0.28, 0.09), flat(0x1a1c1e, { rough: .4 }));
  hook.position.set(-0.2, 1.32, 0.03); g.add(hook);
  const cord = new THREE.Mesh(SHAPE.Torus(0.09, 0.011, 5, 14), flat(0x22262a, { rough: .7 }));
  cord.position.set(-0.2, 1.1, 0.03); g.add(cord);
  const keypad = new THREE.Mesh(PLN(0.16, 0.2), flat(0x9aa0a4, { rough: .4 }));
  keypad.position.set(0, 1.35, 0.115); g.add(keypad);
  const pole = new THREE.Mesh(CYL(0.05, 0.05, 1.05, 8), flat(0x5a5f63, { rough: .7, metal: .4 }));
  pole.position.y = 0.52; g.add(pole);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, 0.4, 1.7, 0.3, 'payphone');
  return { g, hook, pos: { x, y, z } };
}

/* ============================================================
   ST. BRIGID'S CEMETERY, chain-link, on the slope
   ============================================================ */
export function buildCemetery(world, { x = 0, y = 0, z = 0, snow = false } = {}) {
  const h = { x, y, z, refs: {} };
  world.floor(x, z, 26, 20, { y, surface: snow ? 'snow' : 'gravel', mat: snow ? MAT.snow : MAT.concrete });
  chainlink(world, x, y, z - 10, 26);
  chainlink(world, x, y, z + 10, 26);
  chainlink(world, x - 13, y, z, 20, Math.PI / 2);
  chainlink(world, x + 13, y, z, 20, Math.PI / 2);

  const R = (() => { let s = 991; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) {
    const sx = x - 10 + c * 2.4 + (R() - .5) * 0.3;
    const sz = z - 7.5 + r * 3.0 + (R() - .5) * 0.4;
    const hh = 0.5 + R() * 0.6;
    const st = new THREE.Mesh(BOX(0.44, hh, 0.14), tiled(MAT.stone, 0.44, hh));
    st.position.set(sx, y + hh / 2, sz);
    st.rotation.y = (R() - .5) * 0.2;
    st.rotation.z = (R() - .5) * 0.06;
    st.castShadow = true; st.receiveShadow = true;
    world.add(st);
    world.collide(sx, y, sz, 0.5, hh, 0.2, 'stone');
  }

  // the Vasko family plot, and a fresh unmarked stone, laid flat
  const plotX = x + 5.2, plotZ = z + 4.0;
  const kerb = new THREE.Mesh(BOX(2.6, 0.12, 3.2), tiled(MAT.stone, 2.6, 3.2));
  kerb.position.set(plotX, y + 0.06, plotZ); world.add(kerb);
  const vaskoStone = new THREE.Mesh(BOX(1.5, 0.9, 0.18), tiled(MAT.stone, 1.5, 0.9));
  vaskoStone.position.set(plotX, y + 0.45, plotZ - 1.5); world.add(vaskoStone);
  const nameLabel = new THREE.Mesh(PLN(1.3, 0.7), engraved(['VASKO', '', 'ANDREJ  1911–1963', 'ANDREJ JR  1943–1999']));
  nameLabel.position.set(plotX, y + 0.48, plotZ - 1.39); world.add(nameLabel);
  h.refs.vaskoStone = vaskoStone;

  const fresh = new THREE.Mesh(BOX(0.9, 0.1, 0.5), tiled(MAT.stone, 0.9, 0.5));
  fresh.position.set(plotX, y + 0.05, plotZ + 0.6);
  fresh.castShadow = true;
  world.add(fresh);
  h.refs.freshStone = fresh;

  // turned earth
  const dirt = new THREE.Mesh(PLN(1.1, 0.7), flat(0x3a2e22, { rough: .99 }));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(plotX, y + 0.012, plotZ + 0.6);
  world.add(dirt);
  h.refs.dirt = dirt;

  // the sexton's spade, leaning on the fence
  const spade = new THREE.Group();
  const handle = new THREE.Mesh(CYL(0.018, 0.018, 1.1, 6), flat(0x8a6b45, { rough: .9 }));
  handle.position.y = 0.55; spade.add(handle);
  const blade = new THREE.Mesh(BOX(0.16, 0.24, 0.02), flat(0x7a7f82, { rough: .4, metal: .6 }));
  blade.position.y = 0.02; spade.add(blade);
  spade.position.set(plotX + 1.8, y, plotZ + 1.2);
  spade.rotation.z = 0.28;
  world.add(spade);
  h.refs.spade = spade;

  h.refs.plot = { x: plotX, z: plotZ };
  h.spawn = { x: x - 8, z: z + 8, yaw: 0 };
  return h;
}

function engraved(lines) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 208;
  const g = c.getContext('2d');
  g.fillStyle = '#7f7a70'; g.fillRect(0, 0, 384, 208);
  g.fillStyle = '#4a463f'; g.textAlign = 'center';
  lines.forEach((l, i) => {
    g.font = i === 0 ? 'bold 42px "EB Garamond", serif' : '22px "EB Garamond", serif';
    g.fillText(l, 192, 50 + i * 42);
  });
  return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: .95 });
}

/* ============================================================
   THE COLLEGE LIBRARY, microfilm room
   ============================================================ */
export function buildLibrary(world, { x = 0, y = 0, z = 0 } = {}) {
  const h = { x, y, z, refs: {} };
  const W = 10, D = 8, H = 2.7;
  world.floor(x, z, W, D, { y, surface: 'carpet', mat: MAT.carpet });
  world.ceiling(x, z, W, D, { y: y + H });
  world.wall(x, z - D / 2, W, { axis: 'x', h: H, y, mat: MAT.plaster });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H, y, mat: MAT.plaster });
  const lOpen = world.wallWithDoor(x, z + D / 2, W, -3.0, { axis: 'x', h: H, y, mat: MAT.plaster });
  h.refs.door = makeDoor(world, {
    x: lOpen.ox, y, z: lOpen.oz, facing: 0, hinge: 'left', wallThick: 0.14,
    face: 0x6a4a30, frameCol: 0xd8d2c4, kind: 'wood',
    tag: 'librarydoor', hardware: 'lever', glass: 1, threshold: true
  });

  for (let i = 0; i < 4; i++) shelfUnit(world, x - 3.6 + i * 2.4, y, z - 2.6, 0, { w: 2.0, h: 2.0, d: 0.32, shelves: 5, seed: 601 + i });

  // microfilm readers
  h.refs.readers = [];
  for (let i = 0; i < 3; i++) {
    const rx = x - 2.2 + i * 2.2;
    const dsk = counter(world, rx, y, z + 2.0, 1.2, 0.7, 0, { h: 0.74, top: 0x6a4a30, body: 0x6a4a30 });
    const machine = new THREE.Mesh(BOX(0.6, 0.55, 0.5), flat(0xd8d5cc, { rough: .5 }));
    machine.position.set(rx, dsk.top + 0.28, z + 1.95); world.add(machine);
    const scr = new THREE.Mesh(PLN(0.46, 0.36), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xd8d5c8 : 0x1a1c1e }));
    scr.position.set(rx, dsk.top + 0.36, z + 1.68); scr.rotation.x = -0.3;
    world.add(scr);
    chair(world, rx, y, z + 3.0, Math.PI);
    if (i === 1) { h.refs.microfilm = machine; h.refs.microfilmScreen = scr; }
    h.refs.readers.push(machine);
  }
  // the return bin, one of the tapes is in here
  const bin = new THREE.Mesh(BOX(0.6, 0.9, 0.5), flat(0x3d4a5a, { rough: .6 }));
  bin.position.set(x + W / 2 - 0.7, y + 0.45, z + 3.0);
  world.add(bin);
  world.collide(x + W / 2 - 0.7, y, z + 3.0, 0.6, 0.9, 0.5, 'bin');
  h.refs.returnBin = bin;

  h.refs.light = world.bulb(x, y + H - 0.2, z, { color: 0xE7F2E4, intensity: 2.0, dist: 10, shadow: true, emissive: false });
  h.spawn = { x: x - 3.0, z: z + D / 2 - 1.0, yaw: 0 };
  return h;
}

/* ============================================================
   THE BURNING GROUND. Kesslerton No. 9, 2 miles up Colliery Rd
   Snow does not settle on the ground above it. Everyone in town
   knows this and nobody talks about it.
   ============================================================ */
export function buildMine(world, { x = 0, y = 0, z = 0, snow = true } = {}) {
  const h = { x, y, z, refs: {}, vents: [] };

  // ground: snow around, bare earth over the seam
  world.floor(x, z, 60, 46, { y, surface: snow ? 'snow' : 'gravel', mat: snow ? MAT.snow : MAT.concrete });
  const bare = new THREE.Mesh(new THREE.PlaneGeometry(26, 18, 12, 8), flat(0x2e2418, { rough: .99 }));
  bare.rotation.x = -Math.PI / 2;
  bare.position.set(x, y + 0.02, z);
  // buckle the ground a little
  const pos = bare.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, (Math.random() - 0.5) * 0.35);
  bare.geometry.computeVertexNormals();
  world.add(bare);
  h.refs.bareEarth = bare;

  // the fence and the signs
  chainlink(world, x, y, z - 12, 30);
  chainlink(world, x, y, z + 12, 30);
  chainlink(world, x - 15, y, z, 24, Math.PI / 2);
  chainlink(world, x + 15, y, z, 24, Math.PI / 2);
  [[-6, -12], [6, -12], [0, 12]].forEach(([sx, sz]) => {
    const s = signBoard('DANGER. SUBSIDENCE', 1.4, 0.4, '#1a1a1a', '#E8A653');
    s.position.set(x + sx, y + 1.4, z + sz + 0.08);
    world.add(s);
  });

  // the collapsed headframe
  const hf = new THREE.Group();
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([lx, lz], i) => {
    const leg = new THREE.Mesh(BOX(0.3, 9 - i * 1.4, 0.3), tiled(MAT.rust, 0.4, 8));
    leg.position.set(lx, (9 - i * 1.4) / 2, lz);
    leg.rotation.z = (lx > 0 ? -1 : 1) * 0.12 + (i === 2 ? 0.5 : 0);
    hf.add(leg);
  });
  const fallen = new THREE.Mesh(BOX(0.5, 7.0, 0.5), tiled(MAT.rust, 0.6, 7));
  fallen.position.set(3.4, 0.9, 1.2); fallen.rotation.z = 1.35; hf.add(fallen);
  const sheave = new THREE.Mesh(SHAPE.Torus(1.5, 0.16, 8, 20), tiled(MAT.rust, 3, 0.3));
  sheave.position.set(0.6, 1.6, -3.4); sheave.rotation.x = 0.4; hf.add(sheave);
  hf.position.set(x - 6, y, z - 4);
  hf.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(hf);
  world.collide(x - 6, y, z - 4, 5, 9, 5, 'headframe');
  h.refs.headframe = hf;

  // ---- THE CAP over Shaft 9, with nine names cast into it ----
  const cap = new THREE.Mesh(CYL(3.0, 3.2, 0.5, 20), tiled(MAT.concrete, 6, 0.5));
  cap.position.set(x + 4, y + 0.25, z + 1);
  cap.receiveShadow = true;
  world.add(cap);
  world.collide(x + 4, y, z + 1, 6.2, 0.5, 6.2, 'cap');
  const plate = new THREE.Mesh(SHAPE.Circle(2.8, 24), namesMaterial());
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(x + 4, y + 0.505, z + 1);
  world.add(plate);
  h.refs.cap = cap;
  h.refs.plate = plate;

  // ---- steam vents from cracks in the ground ----
  const ventPositions = [[-3, 3], [2, -4], [7, 5], [-8, -1], [0, 6], [5, -6]];
  ventPositions.forEach(([vx, vz], i) => {
    const crack = new THREE.Mesh(PLN(0.7 + Math.random(), 0.24), flat(0x120e0a, { rough: 1 }));
    crack.rotation.x = -Math.PI / 2; crack.rotation.z = Math.random() * 3;
    crack.position.set(x + vx, y + 0.03, z + vz);
    world.add(crack);
    const steam = makeSteam(world, x + vx, y, z + vz, 0.9 + Math.random() * 0.7);
    h.vents.push(steam);
    // heat glow
    if (i % 2 === 0) world.bulb(x + vx, y + 0.05, z + vz, { color: 0x8C2F26, intensity: 0.35, dist: 3.2, emissive: false });
  });

  // the road in
  world.floor(x, z + 20, 8, 20, { y, surface: 'asphalt', mat: MAT.asphalt });

  h.spawn = { x, z: z + 16, yaw: Math.PI };
  return h;
}

function namesMaterial() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8e8d88'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) {
    const v = 100 + Math.random() * 70;
    g.fillStyle = `rgba(${v},${v},${v - 4},.4)`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const names = ['ANDREJ VASKO', 'MICHAL PROSSER', 'ŠTEFAN KOWAL', 'JAN HURKA', 'WASYL DEMKO',
    'PETRO BARAN', 'IGNÁC SEDLÁK', 'TOMASZ RUDNIK', 'ONDREJ LISAK'];
  g.fillStyle = '#5a5952'; g.textAlign = 'center';
  g.font = 'bold 26px "EB Garamond", serif';
  g.fillText('KESSLERTON No. 9', 256, 120);
  g.font = '20px "EB Garamond", serif';
  names.forEach((n, i) => g.fillText(n, 256, 168 + i * 28));
  g.font = '16px "EB Garamond", serif';
  g.fillText('13 FEBRUARY 1963', 256, 430);
  return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: .95 });
}

function makeSteam(world, x, y, z, scale = 1) {
  const N = 26;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const life = new Float32Array(N);
  for (let i = 0; i < N; i++) { life[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xb9c7d6, size: 0.9 * scale, transparent: true, opacity: 0.16,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(x, y, z);
  world.add(pts);
  world.tick(dt => {
    for (let i = 0; i < N; i++) {
      life[i] += dt * 0.16;
      if (life[i] > 1) { life[i] = 0; }
      const t = life[i];
      pos[i * 3] = Math.sin(i * 3.1 + t * 2) * 0.5 * t * scale;
      pos[i * 3 + 1] = t * 4.2 * scale;
      pos[i * 3 + 2] = Math.cos(i * 2.3 + t * 2) * 0.5 * t * scale;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}
