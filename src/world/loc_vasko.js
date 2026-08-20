/* ============================================================
   loc_vasko.js: 9 Kesslerton Row.

   End unit of a row of six identical company houses built by
   the colliery in 1911. Two-up two-down, asphalt shingle siding
   the colour of dried blood. Cosy to the point of ache.

   Recca's room is the heart of the whole game. Every object in
   it is interactable and Jared has a line about most of them.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, T } from './mat.js';
import { SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { makeDoor } from './door.js';
import {
  counter, sofa, chair, bed, shelfUnit, woodStove, tv, clutter,
  smallProp, recordPlayer, gerald, corkboard
} from './props.js';
import { signBoard } from './loc_street.js';

/**
 * Ground floor: front door → parlour → kitchen → back door → yard.
 * Stairs off the kitchen → landing → Marta's room (front),
 * Recca's room (back), bathroom.
 *
 * `state`: 'lived' (Ch2) | 'cold' (Ch4, the stove is out,
 * three months of mail on the floor, nobody has slept here)
 */
export function buildVaskoHouse(world, { x = 0, y = 0, z = 0, state = 'lived', interior = true } = {}) {
  const h = { x, y, z, refs: {}, state };
  const W = 6.4, D = 8.0, H = 2.44;
  const UPY = y + 2.72;

  // ---------------------------------------------------------- the row
  // six identical houses. this is the end unit.
  for (let i = 0; i < 6; i++) {
    const px = x + i * 6.6;
    if (i > 0) {
      const shellW = 6.4, shellD = 8.0, shellH = 5.6;
      const b = new THREE.Mesh(new THREE.BoxGeometry(shellW, shellH, shellD), tiled(MAT.shingle, shellW, shellH));
      b.position.set(px, y + shellH / 2, z);
      b.castShadow = true; b.receiveShadow = true;
      world.add(b);
      const roof = roofPrism(shellW + 0.5, 1.5, shellD + 0.5, 0x36302c);
      roof.position.set(px, y + shellH, z); world.add(roof);
      world.collide(px, y, z, shellW, shellH, shellD, 'rowhouse');
      // lit windows
      for (let k = 0; k < 4; k++) {
        const on = ((i * 5 + k) % 3) !== 0 && state === 'lived';
        const win = new THREE.Mesh(PLN(0.8, 1.0), new THREE.MeshBasicMaterial({ color: on ? 0xFFC58A : 0x141a20 }));
        win.position.set(px - 1.6 + (k % 2) * 3.2, y + 1.3 + Math.floor(k / 2) * 2.7, z + shellD / 2 + 0.02);
        world.add(win);
      }
      const porch = new THREE.Mesh(BOX(2.4, 0.16, 1.6), flat(0x4b3524, { rough: .9 }));
      porch.position.set(px, y + 0.08, z + shellD / 2 + 0.8); world.add(porch);
    }
  }

  // ground
  world.floor(x + 16, z + 9, 60, 22, { y, surface: 'concrete', mat: MAT.concrete });

  // street sign
  const s = signBoard('KESSLERTON ROW', 2.2, 0.34, '#e8e8e2', '#2a5f3a');
  s.position.set(x - 5.5, y + 2.3, z + 8);
  world.add(s);
  const pole = new THREE.Mesh(CYL(0.04, 0.04, 2.4, 6), flat(0x5a5f63, { rough: .7, metal: .4 }));
  pole.position.set(x - 5.5, y + 1.2, z + 8); world.add(pole);

  if (!interior) return h;

  // ============================================================ END UNIT
  const shellH = 5.6;
  // exterior walls (we cut the interior into them)
  world.wall(x, z - D / 2, W, { axis: 'x', h: shellH, y, thick: 0.22, mat: MAT.shingle });
  world.wall(x - W / 2, z, D, { axis: 'z', h: shellH, y, thick: 0.22, mat: MAT.shingle });
  world.wall(x + W / 2, z, D, { axis: 'z', h: shellH, y, thick: 0.22, mat: MAT.shingle });
  world.wallWithDoor(x, z + D / 2, W, -1.4, { axis: 'x', h: shellH, y, thick: 0.22, mat: MAT.shingle });
  const roof = roofPrism(W + 0.5, 1.5, D + 0.5, 0x36302c);
  roof.position.set(x, y + shellH, z); world.add(roof);

  // chimney (wood stove)
  const chim = new THREE.Mesh(BOX(0.5, 2.2, 0.5), tiled(MAT.brick, 0.5, 2.2));
  chim.position.set(x - 2.1, y + shellH + 0.8, z - 2.2); world.add(chim);

  // ---------------------------------------------------------- porch + glider
  world.floor(x, z + D / 2 + 0.85, 3.0, 1.8, { y: y + 0.16, surface: 'wood', mat: MAT.wood });
  const porchDeck = new THREE.Mesh(BOX(3.0, 0.16, 1.8), tiled(MAT.wood, 3.0, 1.8));
  porchDeck.position.set(x, y + 0.08, z + D / 2 + 0.85); world.add(porchDeck);
  const porchRoof = new THREE.Mesh(BOX(3.2, 0.12, 2.0), flat(0x36302c, { rough: .95 }));
  porchRoof.position.set(x, y + 2.5, z + D / 2 + 0.85); world.add(porchRoof);
  [-1.4, 1.4].forEach(px => {
    const p = new THREE.Mesh(BOX(0.11, 2.42, 0.11), flat(0xd6cfc0, { rough: .85 }));
    p.position.set(x + px, y + 1.29, z + D / 2 + 1.7); world.add(p);
  });
  // the glider. first kiss, September 6.
  h.refs.glider = glider(world, x + 0.85, y + 0.16, z + D / 2 + 0.9);
  world.stairs(x, z + D / 2 + 2.0, 1.6, 0.6, 2, { axis: 'z', y, dir: 1, surface: 'wood', mat: MAT.wood, rise: 0.08 });

  // The front door. Green paint over green paint, a screen that has not
  // been on it since the eighties, and a bell that still works.
  const frontDoor = makeDoor(world, {
    x: x - 1.4, y, z: z + D / 2 - 0.02, facing: 0, hinge: 'left',
    wallThick: 0.22, face: 0x2f5340, frameCol: 0xd6cfc0, kind: 'wood',
    tag: 'vdoor', label: 'Open', hardware: 'knob', glass: 1, threshold: true
  });
  h.refs.frontDoor = frontDoor.g;
  h.refs.frontDoorway = frontDoor;
  h.openFront = (o, opts) => frontDoor.setOpen(o, opts);

  // ---------------------------------------------------------- parlour
  const parlourZ = z + 1.6;
  world.floor(x, parlourZ, W - 0.44, 4.4, { y, surface: 'carpet', mat: MAT.carpet });
  world.ceiling(x, parlourZ, W - 0.44, 4.4, { y: y + H });
  // interior faces
  ['x', 'z'].forEach(() => {});
  world.wall(x, z + D / 2 - 0.24, W - 0.44, { axis: 'x', h: H, y, thick: 0.02, mat: MAT.wallpaper, collide: false });
  world.wall(x - W / 2 + 0.24, parlourZ, 4.4, { axis: 'z', h: H, y, thick: 0.02, mat: MAT.wallpaper, collide: false });
  world.wall(x + W / 2 - 0.24, parlourZ, 4.4, { axis: 'z', h: H, y, thick: 0.02, mat: MAT.wallpaper, collide: false });

  const stove = woodStove(world, x - 2.1, y, z - 0.2, 0);
  h.refs.stove = stove;
  sofa(world, x + 1.2, y, parlourZ + 1.4, Math.PI, { w: 1.9, plastic: true });
  const tvh = tv(world, x + 1.2, y + 0.5, parlourZ - 1.9, 0, { w: 0.58, h: 0.44 });
  const tvStand = counter(world, x + 1.2, y, parlourZ - 1.9, 0.9, 0.44, 0, { h: 0.5, top: 0x5a3e28, body: 0x6a4a30 });
  h.refs.tv = tvh;
  const cofTable = counter(world, x + 1.2, y, parlourZ + 0.4, 1.0, 0.5, 0, { h: 0.42, top: 0x6a4a30, body: 0x6a4a30 });
  clutter(world, x + 1.2, cofTable.top, parlourZ + 0.4, 0.9, 0.4, { set: 'living', seed: 41 });
  // doilies. there is a doily on every single surface.
  [[x + 1.2, cofTable.top, parlourZ + 0.4], [x - 2.4, y + 0.95, parlourZ + 1.2]].forEach(([dx, dy, dz]) => {
    const d = new THREE.Mesh(CYL(0.18, 0.18, 0.004, 20), flat(0xefeade, { rough: .98 }));
    d.position.set(dx, dy + 0.005, dz); world.add(d);
  });

  // wall of photographs
  corkboard(world, x - W / 2 + 0.27, y + 1.55, parlourZ + 1.0, Math.PI / 2, { w: 0.9, h: 0.66, pins: 8, seed: 61 });

  // ---------------------------------------------------------- kitchen
  const kitZ = z - 2.2;
  world.floor(x, kitZ, W - 0.44, 3.2, { y, surface: 'lino', mat: MAT.lino });
  world.ceiling(x, kitZ, W - 0.44, 3.2, { y: y + H });
  const kc = counter(world, x - 1.2, y, z - D / 2 + 0.55, 3.4, 0.62, 0, { top: 0x4a4740, body: 0xc4bda9 });
  clutter(world, x - 1.2, kc.top, z - D / 2 + 0.55, 3.0, 0.5, { set: 'kitchen', seed: 13 });
  const table = counter(world, x + 1.0, y, kitZ, 1.3, 0.9, 0, { h: 0.74, top: 0xd8cdb4, body: 0x6a4a30 });
  h.refs.table = table;
  clutter(world, x + 1.0, table.top, kitZ, 1.1, 0.7, { set: 'kitchen', seed: 17, count: 5 });
  [[-0.9, 0], [0.9, 0], [0, -0.8], [0, 0.8]].forEach(([cx, cz]) =>
    chair(world, x + 1.0 + cx, y, kitZ + cz, Math.atan2(-cx, -cz)));

  // The back door, on a wall with nothing behind it. Bolted, and it stays
  // bolted; the wall is what stops you, so the leaf carries no collider.
  const backDoor = makeDoor(world, {
    x: x + 2.0, y, z: z - D / 2 + 0.14, facing: Math.PI, hinge: 'left',
    wallThick: 0.12, face: 0x2f5340, frameCol: 0xd6cfc0, kind: 'wood',
    tag: 'vbackdoor', collide: false, hardware: 'knob', glass: 1,
    locked: true, lockedLabel: 'Bolted', lockedLine: 'Bolted, top and bottom. Marta does that at four in the afternoon.'
  });
  h.refs.backDoor = backDoor.g;
  h.refs.backDoorway = backDoor;

  // divider wall parlour/kitchen with a doorway
  world.wallWithDoor(x, z - 0.55, W - 0.44, 1.4, { axis: 'x', h: H, y, thick: 0.12, mat: MAT.wallpaper });

  // ---------------------------------------------------------- stairs
  const stairX = x - W / 2 + 0.75;
  world.stairs(stairX, kitZ - 0.2, 1.0, 3.0, 14, { axis: 'z', y, dir: -1, surface: 'wood', mat: MAT.wood, rise: (UPY - y) / 14 });
  world.floor(stairX, kitZ - 2.0, 1.2, 1.4, { y: UPY, surface: 'wood', mat: MAT.wood });

  // ---------------------------------------------------------- upstairs
  world.floor(x, z, W - 0.44, D - 0.44, { y: UPY, surface: 'wood', mat: MAT.wood, visible: false });
  // landing
  world.floor(x - 1.0, z - 0.4, 2.2, 2.0, { y: UPY, surface: 'wood', mat: MAT.wood });
  world.ceiling(x, z, W - 0.44, D - 0.44, { y: UPY + 2.2 });

  // Marta's room (front)
  const mZ = z + 2.0;
  world.floor(x + 0.6, mZ, 4.4, 3.2, { y: UPY, surface: 'carpet', mat: MAT.carpet });
  world.wallWithDoor(x + 0.6, mZ - 1.6, 4.4, -1.6, { axis: 'x', h: 2.2, y: UPY, thick: 0.1, mat: MAT.wallpaper });
  bed(world, x + 1.4, UPY, mZ + 0.6, 0, { w: 1.35, l: 1.95 });
  counter(world, x - 0.9, UPY, mZ + 0.9, 0.44, 0.4, 0, { h: 0.6, top: 0x5a3e28, body: 0x6a4a30 });
  h.refs.martaRoom = { x: x + 0.6, z: mZ };

  // bathroom
  world.floor(x - 1.9, z - 2.5, 1.7, 2.2, { y: UPY, surface: 'lino', mat: MAT.lino });

  // ============================================================ RECCA'S ROOM
  // 3 m × 3 m under a sloped ceiling. the heart of the whole game.
  const rZ = z - 2.3, rX = x + 1.2;
  world.floor(rX, rZ, 3.0, 3.0, { y: UPY, surface: 'wood', mat: MAT.wood });
  world.wallWithDoor(rX, rZ + 1.55, 3.0, -1.0, { axis: 'x', h: 2.2, y: UPY, thick: 0.1, mat: MAT.wallpaper });
  world.wall(rX + 1.55, rZ, 3.0, { axis: 'z', h: 2.2, y: UPY, thick: 0.1, mat: MAT.wallpaper });
  // the sloped ceiling
  const slope = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.3), tiled(MAT.plaster, 3.0, 2.3));
  slope.position.set(rX, UPY + 1.75, rZ - 0.7);
  slope.rotation.set(-Math.PI / 2 + 0.5, 0, 0);
  world.add(slope);
  world.ceiling(rX, rZ + 0.8, 3.0, 1.4, { y: UPY + 2.2, mat: MAT.plaster });

  // the window, a hex rosette painted on the inner frame, in white,
  // like every window in the house. except this one has been painted over.
  const rwin = world.wallWithWindow(rX, rZ - 1.55, 3.0, 0, {
    axis: 'x', h: 2.2, y: UPY, thick: 0.1, mat: MAT.wallpaper, ww: 0.9, wh: 1.0, sill: 0.85
  });
  h.refs.reccaWindow = rwin;
  const hexPainted = new THREE.Mesh(PLN(0.34, 0.34), new THREE.MeshStandardMaterial({
    map: T.hexsign(false), transparent: true, roughness: .9, opacity: 0
  }));
  hexPainted.position.set(rX + 0.62, UPY + 1.85, rZ - 1.49);
  world.add(hexPainted);
  const paintedOver = new THREE.Mesh(PLN(0.4, 0.4), flat(0xe8e2d4, { rough: .96 }));
  paintedOver.position.set(rX + 0.62, UPY + 1.85, rZ - 1.485);
  world.add(paintedOver);
  h.refs.hexPaintedOver = { over: paintedOver, under: hexPainted };

  // the bed. the quilt has not been moved since September.
  h.refs.reccaBed = bed(world, rX - 0.75, UPY, rZ - 0.2, 0, { w: 0.95, l: 1.9, quilt: MAT.quilt });

  // the shelf of paperbacks
  shelfUnit(world, rX + 1.28, UPY, rZ + 0.4, -Math.PI / 2, { w: 1.1, h: 1.5, d: 0.24, shelves: 4, seed: 71 });
  // the record player
  const rpTable = counter(world, rX + 0.9, UPY, rZ - 1.1, 0.6, 0.45, 0, { h: 0.62, top: 0x5a3e28, body: 0x6a4a30 });
  h.refs.recordPlayer = recordPlayer(world, rX + 0.9, rpTable.top, rZ - 1.1, 0.2, { dusty: state === 'cold' });
  // Gerald, on the windowsill, facing in. (in the epilogue he faces out.)
  h.refs.gerald = gerald(world, rX + 0.0, UPY + 0.9, rZ - 1.42, Math.PI);
  // the corkboard of photos
  h.refs.photos = corkboard(world, rX + 1.44, UPY + 1.5, rZ - 0.6, -Math.PI / 2, { w: 0.8, h: 0.6, pins: 9, seed: 83 });
  // clothes on the floor, a lamp, the small dense clutter of a real room
  clutter(world, rX - 0.7, UPY + 0.62, rZ + 1.0, 0.7, 0.5, { set: 'bedside', seed: 91, count: 6 });
  const lamp = world.bulb(rX + 0.9, UPY + 0.95, rZ - 1.1, {
    color: 0xFFC58A, intensity: state === 'lived' ? 1.3 : 0, dist: 3.4, size: 0.03
  });
  h.refs.reccaLamp = lamp;

  // dust, if nobody has slept here in three months
  if (state === 'cold') {
    const dust = new THREE.Mesh(PLN(3.0, 3.0), flat(0xb9b2a2, { rough: 1, transparent: true, opacity: .10 }));
    dust.rotation.x = -Math.PI / 2; dust.position.set(rX, UPY + 0.02, rZ);
    world.add(dust);
  }

  h.refs.reccaRoom = { x: rX, z: rZ, y: UPY };

  // ---------------------------------------------------------- yard
  world.floor(x, z - D / 2 - 3.5, 7.0, 6.0, { y, surface: 'concrete', mat: MAT.concrete });
  chainlink(world, x, y, z - D / 2 - 6.6, 7.0);
  chainlink(world, x - 3.5, y, z - D / 2 - 3.5, 6.2, Math.PI / 2);
  chainlink(world, x + 3.5, y, z - D / 2 - 3.5, 6.2, Math.PI / 2);
  // a dog run with no dog
  const run = new THREE.Mesh(BOX(1.2, 0.9, 2.4), flat(0x6a6a68, { rough: .9, transparent: true, opacity: .3 }));
  run.position.set(x - 2.2, y + 0.45, z - D / 2 - 3.0);
  world.add(run);
  const bowl = new THREE.Mesh(CYL(0.13, 0.11, 0.06, 12), flat(0x3a6fd0, { rough: .5 }));
  bowl.position.set(x - 2.2, y + 0.03, z - D / 2 - 2.0); world.add(bowl);
  h.refs.dogRun = run;
  h.refs.dogBowl = bowl;

  // ---------------------------------------------------------- lighting/state
  const parlourLight = world.bulb(x, y + H - 0.2, parlourZ, {
    color: 0xFFC58A, intensity: state === 'lived' ? 1.7 : 0, dist: 6.5, shadow: true, size: 0.05
  });
  const kitLight = world.bulb(x, y + H - 0.2, kitZ, {
    color: 0xFFC58A, intensity: state === 'lived' ? 1.6 : 0, dist: 6, size: 0.05
  });
  h.refs.lights = { parlourLight, kitLight, lamp };

  if (state === 'cold') {
    // three months of mail on the floor inside the front door
    const mailG = new THREE.Group();
    for (let i = 0; i < 34; i++) {
      const e = new THREE.Mesh(BOX(0.22 + Math.random() * 0.06, 0.003, 0.11),
        flat([0xdcd5c2, 0xe8e3d4, 0xd0c8b0, 0xf0ece0][i % 4], { rough: .96 }));
      e.position.set(x - 1.4 + (Math.random() - .5) * 1.1, y + 0.004 + i * 0.0022, z + D / 2 - 0.55 - Math.random() * 0.8);
      e.rotation.y = Math.random() * Math.PI;
      mailG.add(e);
    }
    world.add(mailG);
    h.refs.mail = mailG;
    // the stove is cold
    h.refs.stove.traverse(o => { if (o.material?.color?.getHex?.() === 0xE8722A) o.visible = false; });
  }

  h.spawn = { x: x, z: z + D / 2 + 1.2, yaw: Math.PI };
  return h;
}

// ---------------------------------------------------------------- bits
function roofPrism(w, hh, d, color) {
  const g = new THREE.BufferGeometry();
  const hw = w / 2, hd = d / 2;
  const v = new Float32Array([
    -hw, 0, -hd, hw, 0, -hd, 0, hh, -hd,
    -hw, 0, hd, hw, 0, hd, 0, hh, hd,
    -hw, 0, -hd, -hw, 0, hd, 0, hh, hd,
    -hw, 0, -hd, 0, hh, hd, 0, hh, -hd,
    hw, 0, -hd, 0, hh, -hd, 0, hh, hd,
    hw, 0, -hd, 0, hh, hd, hw, 0, hd
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, flat(color, { rough: .96, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function chainlink(world, x, y, z, len, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  const m = flat(0x8a8f92, { rough: .5, metal: .6 });
  const n = Math.ceil(len / 2.4);
  for (let i = 0; i <= n; i++) {
    const p = new THREE.Mesh(CYL(0.02, 0.02, 1.3, 5), m);
    p.position.set(-len / 2 + i * (len / n), 0.65, 0);
    g.add(p);
  }
  const top = new THREE.Mesh(CYL(0.016, 0.016, len, 5), m);
  top.rotation.z = Math.PI / 2; top.position.y = 1.28; g.add(top);
  // the mesh itself, cheaply
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const cg = c.getContext('2d');
  cg.strokeStyle = '#c8ccd0'; cg.lineWidth = 3;
  for (let i = -64; i < 128; i += 12) {
    cg.beginPath(); cg.moveTo(i, 0); cg.lineTo(i + 64, 64); cg.stroke();
    cg.beginPath(); cg.moveTo(i, 64); cg.lineTo(i + 64, 0); cg.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len * 1.6, 1.6);
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.28), new THREE.MeshStandardMaterial({
    map: t, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: .6, metalness: .4
  }));
  fence.position.y = 0.64; g.add(fence);
  world.add(g);
  world.collide(x, y, z, rot ? 0.14 : len, 1.3, rot ? len : 0.14, 'fence');
  return g;
}

function glider(world, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = flat(0x4a6b5a, { rough: .7, metal: .2 });
  const seat = new THREE.Mesh(BOX(1.25, 0.06, 0.5), m); seat.position.y = 0.44; g.add(seat);
  const back = new THREE.Mesh(BOX(1.25, 0.52, 0.05), m); back.position.set(0, 0.7, -0.24); g.add(back);
  [-1, 1].forEach(s => {
    const arm = new THREE.Mesh(BOX(0.05, 0.05, 0.5), m); arm.position.set(s * 0.62, 0.62, 0); g.add(arm);
    const leg = new THREE.Mesh(BOX(0.05, 0.44, 0.05), m); leg.position.set(s * 0.58, 0.22, 0.2); g.add(leg);
    const leg2 = new THREE.Mesh(BOX(0.05, 0.44, 0.05), m); leg2.position.set(s * 0.58, 0.22, -0.2); g.add(leg2);
  });
  const cush = new THREE.Mesh(BOX(1.15, 0.09, 0.45), flat(0xa8543f, { rough: .96 }));
  cush.position.y = 0.5; g.add(cush);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, 1.3, 0.9, 0.6, 'glider');
  // it moves. a little. always.
  let t = 0;
  world.tick(dt => { t += dt; g.rotation.x = Math.sin(t * 0.6) * 0.012; });
  return g;
}
