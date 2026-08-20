/* ============================================================
   loc_town.js: downtown Ashgrove (four blocks) and the
   burning ground at Kesslerton No. 9.

   Anthracite Diner · Wash-Rite · Kesslerton Pawn & Loan ·
   Ashgrove Fuel & Go · St. Brigid's Cemetery · the college
   library microfilm room.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, T } from './mat.js';
import { SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { makeDoor } from './door.js';
import { counter, chair, sofa, shelfUnit, clutter, smallProp, tv, corkboard } from './props.js';
import { signBoard, volvo } from './loc_street.js';
import { chainlink } from './loc_vasko.js';

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
  const dOpen = world.wallWithDoor(x, z + D / 2, W, -3.5, { axis: 'x', h: H, y, mat: MAT.plaster });
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
  const glassW = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.7), new THREE.MeshPhysicalMaterial({
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
    const g = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.7), new THREE.MeshPhysicalMaterial({
      color: 0xb8c4cc, roughness: .04, transmission: .85, transparent: true, opacity: .22
    }));
    g.position.set(cx, y + 1.07, z - 1.0); world.add(g);
    // dead people's wedding rings
    for (let k = 0; k < 12; k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 5, 12), flat(k % 3 ? 0xc9b071 : 0xc0c4c8, { rough: .2, metal: .9 }));
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
  world.floor(x, z + D / 2 + 7, 20, 14, { y, surface: snow ? 'slush' : 'concrete', mat: snow ? MAT.snow : MAT.concrete });
  const canopy = new THREE.Mesh(BOX(12, 0.4, 8), flat(0xd8d5cc, { rough: .6 }));
  canopy.position.set(x, y + 4.4, z + D / 2 + 6); world.add(canopy);
  [[-5, 3], [5, 3], [-5, 9], [5, 9]].forEach(([px, pz]) => {
    const p = new THREE.Mesh(BOX(0.28, 4.2, 0.28), flat(0xc8c5bc, { rough: .6 }));
    p.position.set(x + px, y + 2.1, z + D / 2 + pz); world.add(p);
    world.collide(x + px, y, z + D / 2 + pz, 0.3, 4.2, 0.3, 'canopypost');
  });
  [-2.4, 2.4].forEach(px => {
    const pump = new THREE.Mesh(BOX(0.5, 1.7, 0.8), flat(0xd8d5cc, { rough: .5 }));
    pump.position.set(x + px, y + 0.85, z + D / 2 + 6); world.add(pump);
    world.collide(x + px, y, z + D / 2 + 6, 0.6, 1.8, 0.9, 'pump');
    const scr = new THREE.Mesh(PLN(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x1a3a2a }));
    scr.position.set(x + px, y + 1.3, z + D / 2 + 6.42); world.add(scr);
  });
  for (let i = 0; i < 4; i++) {
    world.bulb(x - 4 + i * 2.8, y + 4.1, z + D / 2 + 6, { color: 0xE7F2E4, intensity: 1.8, dist: 11, emissive: false });
  }
  const s = signBoard('FUEL & GO', 3.2, 0.6, '#E7F2E4', '#1a3a4a');
  s.position.set(x, y + 5.0, z + D / 2 + 2.0);
  world.add(s);

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

function payphone(world, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const box = new THREE.Mesh(BOX(0.34, 0.62, 0.22), flat(0x2a3a44, { rough: .5, metal: .3 }));
  box.position.y = 1.35; g.add(box);
  const hook = new THREE.Mesh(BOX(0.07, 0.28, 0.09), flat(0x1a1c1e, { rough: .4 }));
  hook.position.set(-0.2, 1.32, 0.03); g.add(hook);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.011, 5, 14), flat(0x22262a, { rough: .7 }));
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
  const sheave = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 8, 20), tiled(MAT.rust, 3, 0.3));
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
  const plate = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), namesMaterial());
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
