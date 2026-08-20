/* ============================================================
   loc_church.js: St. Brigid's of the Assumption, 400 Ridge Rd.
   Built 1904 by Slovak miners.

   This is the Act 3 arena. It has to be a fully legible space
   that the player learns by heart, because in the finale the
   lights go out and they navigate it by memory.

   Orientation: west (the main doors) is -X. East (the sanctuary)
   is +X. North is -Z. The nave runs 34 m; the crossing is 16 m
   across. Nave ceiling 8.5 m.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, T } from './mat.js';
import { SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { makeDoor, makeDoorPair } from './door.js';
import { pew, oilLamp, counter, shelfUnit, clutter, smallProp, chair, bed } from './props.js';
import { signBoard } from './loc_street.js';

export const CHURCH = {
  narthexX: -15.5, naveX: -5, crossX: 6, sanctX: 13,
  sacristyZ: -9.0, towerX: -15.5, towerZ: -6.2,
  sanctuaryY: 0.57, naveH: 8.5, aisleZ: 0
};

export function buildChurch(world, { x = 0, y = 0, z = 0, lit = false } = {}) {
  const C = CHURCH;
  const h = { refs: {}, C };
  const stone = MAT.stone, floorM = MAT.churchfloor;

  // ============================================================ FLOORS
  world.floor(x + C.narthexX, z, 5.4, 9.0, { y, surface: 'stone', mat: floorM });                 // narthex
  world.floor(x + C.naveX, z, 18.0, 9.0, { y, surface: 'stone', mat: floorM });                   // nave
  world.floor(x + C.crossX, z, 6.0, 16.0, { y, surface: 'stone', mat: floorM });                  // crossing + transepts
  world.stairs(x + 10.2, z, 9.0, 1.2, 3, { axis: 'x', y, dir: 1, surface: 'stone', mat: floorM, rise: C.sanctuaryY / 3 });
  world.floor(x + C.sanctX + 0.6, z, 6.4, 9.0, { y: y + C.sanctuaryY, surface: 'stone', mat: floorM }); // sanctuary
  world.floor(x + C.sanctX, z + C.sacristyZ, 6.0, 6.0, { y: y + C.sanctuaryY, surface: 'wood', mat: MAT.wood }); // sacristy
  world.floor(x + C.towerX, z + C.towerZ, 4.0, 4.0, { y, surface: 'stone', mat: floorM });        // tower base

  // ============================================================ WALLS
  const H = C.naveH;
  // north & south nave walls
  world.wall(x + C.naveX, z - 4.5, 18.0, { axis: 'x', h: H, y, thick: 0.6, mat: stone });
  world.wall(x + C.naveX, z + 4.5, 18.0, { axis: 'x', h: H, y, thick: 0.6, mat: stone });
  // narthex
  world.wall(x + C.narthexX, z - 4.5, 5.4, { axis: 'x', h: 5.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.narthexX, z + 4.5, 5.4, { axis: 'x', h: 5.5, y, thick: 0.6, mat: stone });
  // ---- WEST MAIN DOORS (seal 1) ----
  world.wallWithDoor(x + C.narthexX - 2.7, z, 9.0, 0, { axis: 'z', h: 5.5, y, thick: 0.7, mat: stone, dw: 2.0, dh: 3.4 });
  h.refs.westDoors = doorPair(world, x + C.narthexX - 2.6, y, z, 2.0, 3.4, Math.PI / 2, 'westdoor');
  // transept end walls
  world.wall(x + C.crossX, z - 8.0, 6.0, { axis: 'x', h: 6.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.crossX, z + 8.0, 6.0, { axis: 'x', h: 6.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.crossX - 3.0, z - 6.2, 3.6, { axis: 'z', h: 6.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.crossX - 3.0, z + 6.2, 3.6, { axis: 'z', h: 6.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.crossX + 3.0, z - 6.2, 3.6, { axis: 'z', h: 6.5, y, thick: 0.6, mat: stone });
  world.wall(x + C.crossX + 3.0, z + 6.2, 3.6, { axis: 'z', h: 6.5, y, thick: 0.6, mat: stone });
  // sanctuary
  world.wall(x + C.sanctX + 0.6, z - 4.5, 6.4, { axis: 'x', h: 7.0, y, thick: 0.6, mat: stone });
  world.wall(x + C.sanctX + 0.6, z + 4.5, 6.4, { axis: 'x', h: 7.0, y, thick: 0.6, mat: stone });
  world.wall(x + C.sanctX + 3.8, z, 9.0, { axis: 'z', h: 7.0, y, thick: 0.7, mat: stone });  // apse wall
  // ---- EAST SANCTUARY SIDE DOOR (seal 3) ----
  h.refs.sideDoor = singleDoor(world, x + C.sanctX + 0.6, y + C.sanctuaryY, z + 4.4, 0.95, 2.1, 0, 'sidedoor');

  // sacristy walls (north of the sanctuary)
  world.wall(x + C.sanctX, z + C.sacristyZ - 3.0, 6.0, { axis: 'x', h: 3.2, y: y + C.sanctuaryY, thick: 0.5, mat: stone });
  world.wall(x + C.sanctX - 3.0, z + C.sacristyZ, 6.0, { axis: 'z', h: 3.2, y: y + C.sanctuaryY, thick: 0.5, mat: stone });
  world.wall(x + C.sanctX + 3.0, z + C.sacristyZ, 6.0, { axis: 'z', h: 3.2, y: y + C.sanctuaryY, thick: 0.5, mat: stone });
  world.wallWithDoor(x + C.sanctX, z + C.sacristyZ + 3.0, 6.0, 1.6, { axis: 'x', h: 3.2, y: y + C.sanctuaryY, thick: 0.4, mat: stone });
  // ---- NORTH SACRISTY EXTERIOR DOOR (seal 2) ----
  h.refs.sacristyDoor = singleDoor(world, x + C.sanctX - 2.2, y + C.sanctuaryY, z + C.sacristyZ - 2.9, 0.95, 2.1, 0, 'sacdoor');
  world.ceiling(x + C.sanctX, z + C.sacristyZ, 6.0, 6.0, { y: y + C.sanctuaryY + 3.2, mat: MAT.plaster });

  // ============================================================ WINDOWS
  // the west windows of the nave look down Ridge Road. this is the
  // proximity system. the player has to choose to look.
  h.refs.westWindows = [];
  for (let i = 0; i < 5; i++) {
    const wx = x + C.naveX - 7.5 + i * 3.6;
    const w = world.wallWithWindow(wx, z - 4.5, 3.6, 0, {
      axis: 'x', h: H, y, thick: 0.6, mat: stone, ww: 1.5, wh: 3.0, sill: 2.4, glass: false
    });
    // leaded glass, dark, so you can see out
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), new THREE.MeshPhysicalMaterial({
      color: 0x1b2530, roughness: .18, transmission: .55, transparent: true, opacity: .28, side: THREE.DoubleSide
    }));
    gm.position.set(wx, y + 3.9, z - 4.5);
    world.add(gm);
    h.refs.westWindows.push({ x: wx, y: y + 3.9, z: z - 4.5, mesh: gm });
  }
  for (let i = 0; i < 5; i++) {
    const wx = x + C.naveX - 7.5 + i * 3.6;
    world.wallWithWindow(wx, z + 4.5, 3.6, 0, { axis: 'x', h: H, y, thick: 0.6, mat: stone, ww: 1.5, wh: 3.0, sill: 2.4, glass: false });
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.0), new THREE.MeshPhysicalMaterial({
      color: 0x241d18, roughness: .18, transmission: .3, transparent: true, opacity: .4, side: THREE.DoubleSide
    }));
    gm.position.set(wx, y + 3.9, z + 4.5);
    world.add(gm);
  }

  // ============================================================ CEILING
  // barrel vault, cheap: a wide arc of segments
  const vault = new THREE.Mesh(
    new THREE.CylinderGeometry(5.0, 5.0, 18.0, 18, 1, true, Math.PI, Math.PI),
    tiled(MAT.plaster, 18, 12)
  );
  vault.rotation.z = Math.PI / 2;
  vault.position.set(x + C.naveX, y + H - 1.4, z);
  vault.material.side = THREE.DoubleSide;
  world.add(vault);
  // columns down the aisle sides, the thing walks behind these
  h.refs.columns = [];
  for (let i = 0; i < 7; i++) {
    const cx = x + C.naveX - 7.5 + i * 2.6;
    [-1, 1].forEach(s => {
      const col = new THREE.Mesh(CYL(0.34, 0.38, H - 1.2, 10), tiled(MAT.stone, 2.2, H));
      col.position.set(cx, y + (H - 1.2) / 2, z + s * 4.0);
      col.castShadow = true; col.receiveShadow = true;
      world.add(col);
      world.collide(cx, y, z + s * 4.0, 0.76, H, 0.76, 'column');
      h.refs.columns.push(col);
    });
  }

  // ============================================================ NARTHEX
  // poor box, dry holy water stoup, stairs to the bell tower
  const poorBox = new THREE.Mesh(BOX(0.3, 0.9, 0.24), flat(0x3a2a1c, { rough: .7 }));
  poorBox.position.set(x + C.narthexX + 1.8, y + 0.45, z - 3.4);
  world.add(poorBox);
  h.refs.poorBox = poorBox;

  const stoup = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat(0x9a958a, { rough: .55 }));
  bowl.rotation.x = Math.PI; bowl.position.y = 1.02;
  const stem = new THREE.Mesh(CYL(0.07, 0.12, 1.0, 10), flat(0x9a958a, { rough: .55 }));
  stem.position.y = 0.5;
  stoup.add(bowl, stem);
  stoup.position.set(x + C.narthexX + 2.0, y, z + 3.2);
  world.add(stoup);
  h.refs.stoup = stoup;

  // ============================================================ NAVE. PEWS
  // twelve per side.
  h.refs.pews = { left: [], right: [] };
  for (let i = 0; i < 12; i++) {
    const px = x + C.naveX - 7.6 + i * 1.32;
    h.refs.pews.left.push(pew(world, px, y, z - 2.7, 0, 3.2));   // north side
    h.refs.pews.right.push(pew(world, px, y, z + 2.7, 0, 3.2));  // south side
  }
  /** the geometry scare: twelve pews on the left, facing the wrong way. */
  h.turnPews = (side = 'left', wrong = true) => {
    h.refs.pews[side].forEach(p => { p.rotation.y = wrong ? Math.PI : 0; });
  };

  // ============================================================ THE SEVEN LAMPS
  // Lamps 1–7, west to east, down the aisle. These are the health bar.
  h.refs.lamps = [];
  for (let i = 0; i < 7; i++) {
    const lx = x + C.naveX - 7.8 + i * 2.6;
    h.refs.lamps.push(oilLamp(world, lx, y, z + (i % 2 ? 1.55 : -1.55), i));
  }
  h.setLamps = (n, instant = false) => h.refs.lamps.forEach((l, i) => l.set(i < n, instant));
  h.lampsLit = () => h.refs.lamps.filter(l => l.lit).length;

  // ============================================================ TRANSEPTS
  // north: Marian side altar and a rack of votive candles
  const marian = counter(world, x + C.crossX, y, z - 7.4, 2.0, 0.7, 0, { h: 1.0, top: 0x9a958a, body: 0x9a958a });
  const statue = new THREE.Mesh(CYL(0.13, 0.2, 1.1, 10), flat(0xcfd4d8, { rough: .8 }));
  statue.position.set(x + C.crossX, y + 1.55, z - 7.4);
  const head = new THREE.Mesh(SPH(0.11, 10), flat(0xcfd4d8, { rough: .8 }));
  head.position.set(x + C.crossX, y + 2.2, z - 7.4);
  world.add(statue); world.add(head);
  h.refs.marian = statue;

  const votives = new THREE.Group();
  for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 7; c2++) {
    const cup = new THREE.Mesh(CYL(0.032, 0.028, 0.07, 8), flat(0x8C2F26, { rough: .3, transparent: true, opacity: .8 }));
    cup.position.set(-0.55 + c2 * 0.18, 0.9 + r * 0.14, -0.1 + r * 0.09);
    votives.add(cup);
  }
  votives.position.set(x + C.crossX - 1.6, y, z - 7.0);
  world.add(votives);
  h.refs.votives = votives;

  // south: the confessional. the single best jumpscare location in the building.
  h.refs.confessional = confessional(world, x + C.crossX, y, z + 7.2);

  // ============================================================ SANCTUARY
  const altar = new THREE.Mesh(BOX(2.6, 1.0, 1.0), tiled(MAT.stone, 2.6, 1.0));
  altar.position.set(x + C.sanctX + 1.6, y + C.sanctuaryY + 0.5, z);
  altar.castShadow = true; altar.receiveShadow = true;
  world.add(altar);
  world.collide(x + C.sanctX + 1.6, y + C.sanctuaryY, z, 2.7, 1.0, 1.1, 'altar');
  h.refs.altar = altar;
  clutter(world, x + C.sanctX + 1.6, y + C.sanctuaryY + 1.0, z, 2.0, 0.7, { set: 'church', seed: 5, count: 4 });

  const tabernacle = new THREE.Mesh(BOX(0.5, 0.55, 0.4), flat(0xb8a25e, { rough: .3, metal: .7 }));
  tabernacle.position.set(x + C.sanctX + 3.3, y + C.sanctuaryY + 1.3, z);
  world.add(tabernacle);
  h.refs.tabernacle = tabernacle;

  // the baptismal font. dry since the 70s. moved here from the narthex.
  h.refs.font = font(world, x + C.sanctX - 0.4, y + C.sanctuaryY, z - 2.4);

  const crucifix = new THREE.Group();
  const cv = new THREE.Mesh(BOX(0.1, 1.6, 0.08), flat(0x4a3524, { rough: .7 }));
  const ch2 = new THREE.Mesh(BOX(0.9, 0.1, 0.08), flat(0x4a3524, { rough: .7 }));
  ch2.position.y = 0.42; crucifix.add(cv, ch2);
  crucifix.position.set(x + C.sanctX + 3.6, y + C.sanctuaryY + 2.9, z);
  world.add(crucifix);

  // ============================================================ SACRISTY
  const press = shelfUnit(world, x + C.sanctX - 2.4, y + C.sanctuaryY, z + C.sacristyZ, Math.PI / 2, { w: 2.0, h: 2.0, d: 0.5, shelves: 3, books: false, seed: 9 });
  h.refs.vestmentPress = press;
  // vestments
  ['#2f6f4a', '#6b1f2a', '#e8e2d0', '#3a3a6a'].forEach((c2, i) => {
    const v = new THREE.Mesh(BOX(0.05, 1.1, 0.42), flat(parseInt(c2.slice(1), 16), { rough: .92 }));
    v.position.set(x + C.sanctX - 2.15, y + C.sanctuaryY + 1.2, z + C.sacristyZ - 0.7 + i * 0.42);
    world.add(v);
  });
  const safe = new THREE.Mesh(BOX(0.6, 0.7, 0.55), flat(0x2c3033, { rough: .45, metal: .6 }));
  safe.position.set(x + C.sanctX + 2.4, y + C.sanctuaryY + 0.35, z + C.sacristyZ + 1.6);
  world.add(safe);
  world.collide(x + C.sanctX + 2.4, y + C.sanctuaryY, z + C.sacristyZ + 1.6, 0.6, 0.7, 0.6, 'safe');
  h.refs.safe = safe;

  const sacCounter = counter(world, x + C.sanctX + 1.2, y + C.sanctuaryY, z + C.sacristyZ - 2.5, 2.4, 0.6, 0, { top: 0x4a4740, body: 0xa89a80 });
  clutter(world, x + C.sanctX + 1.2, sacCounter.top, z + C.sacristyZ - 2.5, 2.0, 0.5, { set: 'church', seed: 23, count: 7 });
  h.refs.sacCounter = sacCounter;

  // the cracked shaving mirror. the one time you see Jared's face.
  h.refs.shavingMirror = crackedMirror(world, x + C.sanctX + 2.9, y + C.sanctuaryY + 1.5, z + C.sacristyZ - 1.0, -Math.PI / 2);

  // stairs down to the boiler room
  const boilY = y - 2.6;
  world.stairs(x + C.sanctX - 1.6, z + C.sacristyZ + 1.4, 1.1, 3.2, 16, {
    axis: 'z', y: boilY, dir: 1, surface: 'stone', mat: MAT.concrete, rise: (y + C.sanctuaryY - boilY) / 16
  });

  // ============================================================ BOILER ROOM
  // flooded ankle-deep, dark, and the breaker is off.
  const bx = x + C.sanctX - 1.6, bz = z + C.sacristyZ + 4.6;
  world.floor(bx, bz, 5.5, 5.0, { y: boilY, surface: 'water', mat: MAT.concrete });
  world.wall(bx, bz - 2.5, 5.5, { axis: 'x', h: 2.6, y: boilY, thick: 0.4, mat: MAT.concrete });
  world.wall(bx, bz + 2.5, 5.5, { axis: 'x', h: 2.6, y: boilY, thick: 0.4, mat: MAT.concrete });
  world.wall(bx - 2.75, bz, 5.0, { axis: 'z', h: 2.6, y: boilY, thick: 0.4, mat: MAT.concrete });
  world.wall(bx + 2.75, bz, 5.0, { axis: 'z', h: 2.6, y: boilY, thick: 0.4, mat: MAT.concrete });
  world.ceiling(bx, bz, 5.5, 5.0, { y: boilY + 2.6, mat: MAT.concrete });

  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.0), new THREE.MeshPhysicalMaterial({
    color: 0x1a2226, roughness: .08, metalness: .1, transmission: .3, transparent: true, opacity: .72
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(bx, boilY + 0.09, bz);
  world.add(water);
  h.refs.water = water;
  let wt = 0;
  world.tick(dt => { wt += dt; water.position.y = boilY + 0.09 + Math.sin(wt * 0.9) * 0.004; });

  const boiler = new THREE.Mesh(CYL(0.65, 0.65, 1.9, 12), tiled(MAT.rust, 2.0, 1.9));
  boiler.position.set(bx - 1.6, boilY + 0.95, bz - 1.4);
  world.add(boiler);
  world.collide(bx - 1.6, boilY, bz - 1.4, 1.4, 1.9, 1.4, 'boiler');

  // the oil drum
  h.refs.oilDrum = new THREE.Mesh(CYL(0.28, 0.28, 0.86, 14), tiled(MAT.rust, 1.0, 0.86));
  h.refs.oilDrum.position.set(bx + 1.7, boilY + 0.43, bz - 1.5);
  h.refs.oilDrum.castShadow = true;
  world.add(h.refs.oilDrum);

  // the breaker panel
  h.refs.breaker = breakerPanel(world, bx + 2.5, boilY + 1.4, bz + 0.6, -Math.PI / 2);

  // ---- THE COAL CHUTE (seal 4). it is not sealed. ----
  h.refs.chuteInner = new THREE.Mesh(BOX(0.9, 0.7, 0.15), flat(0x2a2724, { rough: .8, metal: .3 }));
  h.refs.chuteInner.position.set(bx, boilY + 1.1, bz - 2.42);
  world.add(h.refs.chuteInner);
  h.refs.boilerRoom = { x: bx, y: boilY, z: bz };

  // ============================================================ BELL TOWER
  h.refs.tower = buildTower(world, x + C.towerX, y, z + C.towerZ);

  // ---- THE COAL CHUTE, from outside ----
  // base of the north wall, in the snow. the only way to it is out the
  // breezeway and around. thirty seconds outside.
  const chuteX = x + C.sanctX - 1.6, chuteZ = z + C.sacristyZ + 7.4;
  const chuteOuter = new THREE.Group();
  const lid = new THREE.Mesh(BOX(1.0, 0.1, 0.8), tiled(MAT.rust, 1.0, 0.8));
  lid.rotation.x = -0.5; lid.position.set(0, 0.35, 0);
  const surround = new THREE.Mesh(BOX(1.3, 0.5, 1.0), tiled(MAT.concrete, 1.3, 0.5));
  surround.position.y = 0.25;
  chuteOuter.add(surround, lid);
  chuteOuter.position.set(chuteX, y, chuteZ);
  world.add(chuteOuter);
  h.refs.chuteOuter = chuteOuter;
  h.refs.chutePos = { x: chuteX, y, z: chuteZ };

  // ============================================================ EXTERIOR
  // ground + snow so the outside run has somewhere to happen
  world.floor(x + 4, z, 60, 46, { y: y - 0.02, surface: 'snow', mat: MAT.snow });
  world.floor(x + C.sanctX, z + C.sacristyZ + 6.0, 14, 8, { y, surface: 'snow', mat: MAT.snow });

  // the breezeway to the rectory
  world.floor(x + C.sanctX, z + C.sacristyZ - 5.0, 2.2, 4.4, { y: y + C.sanctuaryY, surface: 'wood', mat: MAT.wood });
  const bz2 = z + C.sacristyZ - 5.0;
  [-1, 1].forEach(s => {
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(BOX(0.12, 2.3, 0.12), flat(0x4b3524, { rough: .9 }));
      p.position.set(x + C.sanctX + s * 1.05, y + C.sanctuaryY + 1.15, bz2 - 1.8 + i * 1.2);
      world.add(p);
    }
  });
  const bRoof = new THREE.Mesh(BOX(2.6, 0.12, 4.6), flat(0x36302c, { rough: .95 }));
  bRoof.position.set(x + C.sanctX, y + C.sanctuaryY + 2.4, bz2);
  world.add(bRoof);

  // ============================================================ RECTORY
  h.refs.rectory = buildRectory(world, x + C.sanctX, y, z + C.sacristyZ - 10.5);

  // exterior shell of the church, so it reads from outside
  const shellH = 11.0;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(34.5, 0.5, 16.5), flat(0x3a3630, { rough: .95 }));
  shell.position.set(x - 1, y + shellH, z);
  world.add(shell);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5.0, 4), flat(0x2e2b28, { rough: .95 }));
  spire.rotation.y = Math.PI / 4;
  spire.position.set(x + C.towerX, y + 18.5, z + C.towerZ);
  world.add(spire);

  // the clock face. stuck at 3:00 since 1963. locals think it's just broken.
  h.refs.clock = clockFace(world, x + C.towerX - 2.1, y + 14.5, z + C.towerZ, Math.PI / 2);

  // ============================================================ LIGHT
  world.hemi(0x141a22, 0x0a0908, 0.05);
  h.refs.ambient = new THREE.AmbientLight(0x0e1014, 0.35);
  world.add(h.refs.ambient);
  world.scene.background = new THREE.Color(0x080809);
  world.scene.fog = new THREE.FogExp2(0x080809, 0.022);

  if (lit) h.setLamps(7, true);

  h.spawn = { x: x + C.sanctX, z: z + C.sacristyZ - 8.0, yaw: 0 };
  return h;
}

// ============================================================ PIECES
function doorPair(world, x, y, z, w, hh, rot, tag) {
  // The west doors: two leaves of strapped oak in a stone reveal, with
  // the ring pulls Victor is going to salt the foot of.
  const pair = makeDoorPair(world, {
    x, y, z, w, h: hh, facing: rot, thick: 0.09,
    frame: false, panels: true, hardware: 'ring', metal: 0x4a4a48,
    face: 0x6a4a30, kind: 'heavy', tag, full: 1.5,
    label: 'The west doors', dist: 3.2
  });
  pair.pivot = pair.halves[0].pivot;
  return pair;
}

function singleDoor(world, x, y, z, w, hh, rot, tag) {
  // Sanctuary side and sacristy exterior. Both are hung on solid stone
  // walls that already collide, so the leaf does not add another box.
  const d = makeDoor(world, {
    x, y, z, w, h: hh, facing: rot, thick: 0.07,
    frame: false, hardware: 'ring', metal: 0x4a4a48,
    face: 0x6a4a30, kind: 'heavy', tag, collide: false, full: 1.4,
    locked: true, lockedLabel: 'Locked', lockedLine: 'Bolted from the inside. It has been for a while.',
    dist: 2.8
  });
  d.sealed = false;
  return d;
}

/** Two-door wooden confessional. */
function confessional(world, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = tiled(MAT.pew, 2.4, 2.4);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 0.1), m); back.position.set(0, 1.25, -0.5); g.add(back);
  [-1, 1].forEach(s => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.1), m);
    side.position.set(s * 1.3, 1.25, 0.05); g.add(side);
  });
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 1.1), m); mid.position.set(0, 1.25, 0.05); g.add(mid);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.16, 1.3), m); top.position.set(0, 2.55, 0.05); g.add(top);
  const doors = [-1, 1].map(s => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 1.24, 0, 0.58);
    const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.06), m);
    d.position.set(-s * 0.55, 1.1, 0);
    pivot.add(d); g.add(pivot);
    return pivot;
  });
  const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04), flat(0x4a1f24, { rough: .96 }));
  curtain.position.set(0, 1.1, 0.56); g.add(curtain);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, 2.7, 2.6, 1.3, 'confessional');
  return {
    g, doors,
    /** it was closed. */
    open(which = 0, amount = -1.2) { doors[which].rotation.y = amount; },
    close() { doors.forEach(d => d.rotation.y = 0); }
  };
}

function font(world, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const base = new THREE.Mesh(CYL(0.46, 0.55, 0.14, 14), tiled(MAT.stone, 1.0, 0.14)); base.position.y = 0.07; g.add(base);
  const stem = new THREE.Mesh(CYL(0.22, 0.3, 0.72, 12), tiled(MAT.stone, 0.9, 0.72)); stem.position.y = 0.5; g.add(stem);
  const bowl = new THREE.Mesh(CYL(0.5, 0.34, 0.34, 16), tiled(MAT.stone, 1.6, 0.34)); bowl.position.y = 1.03; g.add(bowl);
  const inner = new THREE.Mesh(CYL(0.43, 0.3, 0.3, 16), flat(0x4a463f, { rough: .9 })); inner.position.y = 1.06; g.add(inner);
  const waterM = new THREE.Mesh(CYL(0.42, 0.42, 0.02, 16), new THREE.MeshPhysicalMaterial({
    color: 0x2a3a44, roughness: .04, transmission: .8, transparent: true, opacity: .7
  }));
  waterM.position.y = 1.12; waterM.visible = false; g.add(waterM);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, 1.1, 1.2, 1.1, 'font');
  return { g, water: waterM, filled: false, fill() { waterM.visible = true; this.filled = true; }, pos: { x, y, z } };
}

function breakerPanel(world, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.12), flat(0x5a5f63, { rough: .5, metal: .5 }));
  g.add(box);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.05), flat(0xb02f26, { rough: .4 }));
  lever.position.set(0, -0.1, 0.08); g.add(lever);
  const label = new THREE.Mesh(PLN(0.3, 0.09), labelTex('MAIN. 200A'));
  label.position.set(0, 0.2, 0.065); g.add(label);
  world.add(g);
  return { g, lever, on: false, throwIt() { this.on = true; lever.position.y = 0.1; lever.material = flat(0x2f6f4a, { rough: .4 }); } };
}

function labelTex(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 72;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, 256, 72);
  g.fillStyle = '#1a1a1c'; g.font = 'bold 30px "JetBrains Mono", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 40);
  return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: .8 });
}

function crackedMirror(world, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.03), flat(0x4a3524, { rough: .7 }));
  g.add(frame);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({
    color: 0x8d9aa4, roughness: .09, metalness: .9
  }));
  glass.position.z = 0.018; g.add(glass);
  // the crack
  const c = document.createElement('canvas'); c.width = 128; c.height = 170;
  const cg = c.getContext('2d');
  cg.clearRect(0, 0, 128, 170);
  cg.strokeStyle = 'rgba(220,225,230,.85)'; cg.lineWidth = 1.4;
  let px = 40, py = 0;
  cg.beginPath(); cg.moveTo(px, py);
  for (let i = 0; i < 9; i++) { px += (Math.random() - .4) * 26; py += 19; cg.lineTo(px, py); }
  cg.stroke();
  for (let i = 0; i < 5; i++) {
    cg.beginPath(); cg.moveTo(40 + i * 4, 20 + i * 26);
    cg.lineTo(40 + i * 4 + (Math.random() - .5) * 60, 20 + i * 26 + (Math.random() - .5) * 40);
    cg.stroke();
  }
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(c), transparent: true
  }));
  crack.position.z = 0.021; g.add(crack);
  world.add(g);
  return { g, glass };
}

function clockFace(world, x, y, z, rot) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d8d2c4'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = '#2a2520'; g.lineWidth = 6; g.stroke();
  g.fillStyle = '#2a2520';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2;
    g.fillRect(128 + Math.cos(a) * 104 - 4, 128 + Math.sin(a) * 104 - 4, 8, 8);
  }
  // stuck at 3:00 since 1963
  g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 62, 128); g.stroke();  // hour → 3
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 128 - 92); g.stroke();   // minute → 12
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(c), roughness: .85
  }));
  m.position.set(x, y, z); m.rotation.y = rot;
  world.add(m);
  return m;
}

/* ============================================================
   THE BELL TOWER
   68 steps, four wooden landings, three of them rotten.
   One bell, "Anna", cast 1904.
   ============================================================ */
function buildTower(world, x, y, z) {
  const h = { refs: {}, landings: [], x, y, z };
  const SIDE = 4.0, RISE = 0.19, STEPS = 68;
  const TOP = y + STEPS * RISE;   // 12.92 m

  // shell
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const wx = x + Math.sin(a) * SIDE / 2, wz = z + Math.cos(a) * SIDE / 2;
    world.wall(wx, wz, SIDE, {
      axis: i % 2 ? 'z' : 'x', h: TOP + 4.5, y, thick: 0.5, mat: MAT.stone,
      collide: !(i === 2)   // south side opens onto the narthex
    });
  }
  // the opening to the narthex
  world.collide(x, y, z + SIDE / 2, 1.4, 2.1, 0.5, 'toweropen');
  world.clearCollidersTagged('toweropen');

  // four flights of 17, switchbacking, with a landing between each
  const flights = [
    { axis: 'x', dir: 1, ox: -1.2, oz: -1.2 },
    { axis: 'z', dir: 1, ox: 1.2, oz: -1.2 },
    { axis: 'x', dir: -1, ox: 1.2, oz: 1.2 },
    { axis: 'z', dir: -1, ox: -1.2, oz: 1.2 }
  ];
  let curY = y;
  flights.forEach((f, i) => {
    const n = 17;
    const run = 2.4;
    const cx = x + f.ox, cz = z + f.oz;
    world.stairs(cx, cz, 1.15, run, n, {
      axis: f.axis, y: curY, dir: f.dir, surface: 'rottenwood', mat: MAT.wood, rise: RISE
    });
    curY += n * RISE;
    // landing
    const lx = x + (i % 2 ? f.ox : -f.ox), lz = z + (i % 2 ? -f.oz : f.oz);
    const rotten = i < 3;   // three of them are rotten
    const L = {
      i, y: curY, x: lx, z: lz, rotten,
      /** the gap the player has to solve */
      gap: rotten,
      floor: null, plank: null
    };
    // a landing with a hole in it: two rects with a gap between
    if (rotten) {
      world.floor(lx, lz - 0.62, 1.5, 0.5, { y: curY, surface: 'rottenwood', mat: MAT.wood });
      world.floor(lx, lz + 0.62, 1.5, 0.5, { y: curY, surface: 'rottenwood', mat: MAT.wood });
      // the boards that are still there but shouldn't be trusted
      const b = new THREE.Mesh(BOX(1.5, 0.05, 1.7), tiled(MAT.wood, 1.5, 1.7));
      b.position.set(lx, curY - 0.03, lz);
      b.material = flat(0x3a2e22, { rough: .98 });
      world.add(b);
      L.mesh = b;
      // the plank the player can bridge it with, placed later by the chapter
      L.bridge = () => {
        world.floor(lx, lz, 1.5, 1.0, { y: curY, surface: 'rottenwood', mat: MAT.wood });
        L.gap = false;
      };
    } else {
      world.floor(lx, lz, 1.6, 1.6, { y: curY, surface: 'rottenwood', mat: MAT.wood });
    }
    h.landings.push(L);
  });

  // the bell chamber
  const chamberY = curY;
  world.floor(x, z, SIDE - 0.8, SIDE - 0.8, { y: chamberY, surface: 'rottenwood', mat: MAT.wood });
  // louvred openings, wind comes through here
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const lx = x + Math.sin(a) * (SIDE / 2 - 0.26), lz = z + Math.cos(a) * (SIDE / 2 - 0.26);
    for (let k = 0; k < 6; k++) {
      const lv = new THREE.Mesh(BOX(i % 2 ? 0.06 : 2.4, 0.1, i % 2 ? 2.4 : 0.06), flat(0x3a2e22, { rough: .95 }));
      lv.position.set(lx, chamberY + 0.7 + k * 0.36, lz);
      lv.rotation.x = i % 2 ? 0 : -0.5;
      lv.rotation.z = i % 2 ? 0.5 : 0;
      world.add(lv);
    }
  }

  // ANNA. cast 1904.
  const bellG = new THREE.Group();
  const yoke = new THREE.Mesh(BOX(1.5, 0.2, 0.24), flat(0x3a2e22, { rough: .9 }));
  yoke.position.y = 1.35; bellG.add(yoke);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 22), flat(0x3a2e22, { rough: .9 }));
  wheel.position.set(0.5, 1.35, 0); wheel.rotation.y = Math.PI / 2; bellG.add(wheel);
  const bellShape = new THREE.LatheGeometry([
    new THREE.Vector2(0.02, 1.30), new THREE.Vector2(0.14, 1.24), new THREE.Vector2(0.20, 1.05),
    new THREE.Vector2(0.30, 0.78), new THREE.Vector2(0.46, 0.40), new THREE.Vector2(0.60, 0.12),
    new THREE.Vector2(0.62, 0.02), new THREE.Vector2(0.55, 0.0)
  ], 20);
  const bell = new THREE.Mesh(bellShape, flat(0x6b6250, { rough: .35, metal: .85 }));
  bellG.add(bell);
  const clapper = new THREE.Mesh(SPH(0.09, 8), flat(0x4a4438, { rough: .4, metal: .7 }));
  clapper.position.y = 0.2; bellG.add(clapper);
  bellG.position.set(x, chamberY + 1.0, z);
  bellG.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(bellG);

  // the rope, frozen to the wheel
  const rope = new THREE.Mesh(CYL(0.018, 0.018, chamberY - y - 1.0, 6), flat(0xa89a72, { rough: .98 }));
  rope.position.set(x + 0.5, y + (chamberY - y) / 2, z);
  world.add(rope);

  h.refs.bell = bellG;
  h.refs.bellMesh = bell;
  h.refs.rope = rope;
  h.refs.wheel = wheel;
  h.chamberY = chamberY;
  h.topY = TOP;
  h.swing = (amt) => { bellG.rotation.z = amt; };
  return h;
}

/* ============================================================
   THE RECTORY
   A mattress on the floor and 400 books. And the parish office,
   with the sacramental registers 1904–present in a fireproof
   cabinet, and Victor is wearing the key.
   ============================================================ */
function buildRectory(world, x, y, z) {
  const h = { refs: {} };
  const W = 9, D = 8, H = 2.6;
  world.floor(x, z, W, D, { y, surface: 'lino', mat: MAT.lino });
  world.ceiling(x, z, W, D, { y: y + H });
  world.wall(x, z - D / 2, W, { axis: 'x', h: H + 2.6, y, thick: 0.3, mat: MAT.shingle, inner: MAT.plaster });
  world.wall(x - W / 2, z, D, { axis: 'z', h: H + 2.6, y, thick: 0.3, mat: MAT.shingle, inner: MAT.plaster });
  world.wall(x + W / 2, z, D, { axis: 'z', h: H + 2.6, y, thick: 0.3, mat: MAT.shingle, inner: MAT.plaster });
  world.wallWithDoor(x, z + D / 2, W, 0, { axis: 'x', h: H + 2.6, y, thick: 0.3, mat: MAT.shingle, inner: MAT.plaster });

  // ---- kitchen ----
  const kc = counter(world, x - 2.6, y, z - D / 2 + 0.4, 3.4, 0.6, 0, { top: 0x4a4740, body: 0xbdb5a3 });
  clutter(world, x - 2.6, kc.top, z - D / 2 + 0.4, 3.0, 0.5, { set: 'kitchen', seed: 101 });
  h.refs.kitchenCounter = kc;
  const table = counter(world, x - 2.4, y, z + 0.4, 1.2, 0.8, 0, { h: 0.74, top: 0x6a4a30, body: 0x6a4a30 });
  h.refs.table = table;
  chair(world, x - 3.4, y, z + 0.4, Math.PI / 2);
  chair(world, x - 1.4, y, z + 0.4, -Math.PI / 2);
  clutter(world, x - 2.4, table.top, z + 0.4, 1.0, 0.6, { set: 'desk', seed: 103, count: 6 });

  // the salt lives here
  const salt = smallProp('saltbox', Math.random);
  salt.position.set(x - 3.8, kc.top, z - D / 2 + 0.4);
  world.add(salt);
  h.refs.salt = salt;

  // ---- Victor's room: a mattress on the floor and 400 books ----
  const mattress = new THREE.Mesh(BOX(1.0, 0.18, 1.9), flat(0xe4dfd2, { rough: .96 }));
  mattress.position.set(x + 3.0, y + 0.09, z - 2.0);
  world.add(mattress);
  h.refs.mattress = mattress;
  const blanket = new THREE.Mesh(BOX(1.05, 0.09, 1.3), flat(0x3a4048, { rough: .98 }));
  blanket.position.set(x + 3.0, y + 0.22, z - 1.6);
  world.add(blanket);
  // the books. all of them.
  for (let s = 0; s < 3; s++) {
    shelfUnit(world, x + 4.3, y, z - 3.0 + s * 1.5, -Math.PI / 2, { w: 1.4, h: 2.0, d: 0.26, shelves: 5, seed: 200 + s });
  }
  for (let i = 0; i < 5; i++) {
    const stack = new THREE.Group();
    for (let k = 0; k < 4 + (i % 4); k++) {
      const b = new THREE.Mesh(BOX(0.15, 0.03, 0.21), flat([0xd8d3c8, 0x8f6a4a, 0x3f5b6b, 0xa8543f][k % 4], { rough: .9 }));
      b.position.y = 0.016 + k * 0.032; b.rotation.y = (Math.random() - .5) * 0.2;
      stack.add(b);
    }
    stack.position.set(x + 2.0 + (i % 3) * 0.5, y, z - 3.2 + Math.floor(i / 3) * 0.6);
    world.add(stack);
  }
  // ashtray, lighter, the cut-up milk jug he keeps as a spare collar tab
  const ash = smallProp('ashtray', Math.random);
  ash.position.set(x - 2.4, table.top, z + 0.4);
  world.add(ash);
  const tab = new THREE.Mesh(BOX(0.05, 0.002, 0.03), flat(0xf4f4f0, { rough: .7 }));
  tab.position.set(x - 2.1, table.top + 0.002, z + 0.55);
  world.add(tab);
  h.refs.collarTab = tab;

  // ---- the parish office ----
  const ox = x + 1.0, oz = z + 2.6;
  world.wallWithDoor(ox, oz - 1.4, 6.0, 1.8, { axis: 'x', h: H, y, thick: 0.1, mat: MAT.plaster });
  const deskT = counter(world, ox + 1.2, y, oz + 0.6, 1.4, 0.7, 0, { h: 0.74, top: 0x6a4a30, body: 0x6a4a30 });
  clutter(world, ox + 1.2, deskT.top, oz + 0.6, 1.2, 0.6, { set: 'desk', seed: 107 });
  chair(world, ox + 1.2, y, oz + 1.6, Math.PI);

  // the fireproof cabinet. locked. the key is on Victor's ring.
  const cab = new THREE.Group();
  const body = new THREE.Mesh(BOX(0.8, 1.4, 0.6), flat(0x4a5054, { rough: .5, metal: .55 }));
  body.position.y = 0.7; cab.add(body);
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(BOX(0.74, 0.42, 0.03), flat(0x545a5e, { rough: .45, metal: .5 }));
    d.position.set(0, 0.28 + i * 0.44, 0.31); cab.add(d);
    const hd = new THREE.Mesh(BOX(0.2, 0.03, 0.03), flat(0x9aa0a4, { rough: .3, metal: .7 }));
    hd.position.set(0, 0.28 + i * 0.44, 0.34); cab.add(hd);
  }
  const lock = new THREE.Mesh(CYL(0.02, 0.02, 0.02, 8), flat(0xb8a25e, { rough: .3, metal: .8 }));
  lock.rotation.x = Math.PI / 2; lock.position.set(0.3, 1.3, 0.31); cab.add(lock);
  cab.position.set(ox - 1.6, y, oz + 0.3);
  cab.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(cab);
  world.collide(ox - 1.6, y, oz + 0.3, 0.85, 1.4, 0.65, 'cabinet');
  h.refs.cabinet = cab;
  h.refs.cabinetLock = lock;
  h.refs.office = { x: ox, z: oz };

  // ---- the courtyard pump (for the font) ----
  const px = x - 5.6, pz = z + 1.0;
  const pump = new THREE.Group();
  const stand = new THREE.Mesh(CYL(0.09, 0.12, 1.1, 10), tiled(MAT.rust, 0.4, 1.1)); stand.position.y = 0.55; pump.add(stand);
  const spout = new THREE.Mesh(CYL(0.05, 0.05, 0.35, 8), tiled(MAT.rust, 0.3, 0.35));
  spout.rotation.z = Math.PI / 2; spout.position.set(0.2, 0.95, 0); pump.add(spout);
  const handle = new THREE.Group();
  const hm = new THREE.Mesh(BOX(0.5, 0.05, 0.05), tiled(MAT.rust, 0.5, 0.05));
  hm.position.x = -0.22; handle.add(hm);
  handle.position.set(0, 1.15, 0); pump.add(handle);
  pump.position.set(px, y, pz);
  pump.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(pump);
  world.collide(px, y, pz, 0.3, 1.3, 0.3, 'pump');
  h.refs.pump = { g: pump, handle, primed: false, pos: { x: px, y, z: pz } };

  // a light
  h.refs.light = world.bulb(x - 2.4, y + H - 0.2, z, { color: 0xFFC58A, intensity: 1.6, dist: 8, shadow: true, size: 0.05 });
  h.refs.officeLight = world.bulb(ox + 1.0, y + H - 0.2, oz + 0.6, { color: 0xFFC58A, intensity: 1.2, dist: 5, size: 0.04 });
  h.pos = { x, y, z };
  return h;
}
