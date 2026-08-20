/* ============================================================
   loc_row.js: the two doors on the far side of Ridge Road
   that open.

   The row opposite 118 1/2 is fifty shopfronts of painted
   glass. That is the right way to build a street you only ever
   look at. But Chapter Three hands the player a flashlight and
   an open map and then asks them to be paranoid about a town,
   and a town where every door across the road is a texture is
   a town that has told you where the edges are.

   So two of those fifty are real: they have a doorway you can
   walk through, a floor with its own footstep surface, a back
   room, and something in them that was true before Jared got
   here. `buildTerrace` is told to leave a hole where each one
   stands, and these fill the hole.

     KOWAL CLEANERS   shut since September 2011. Victor and
                      Elena's family shop. Nine bags on the
                      rail and a tenth hook with nothing on it.

     STANKO REALTY    shut since 1997, and the electricity is
                      somehow still on. The file room still has
                      the February 1964 conveyances in it, and
                      the nine of them add up to nine dollars.

   Both are dead businesses, and neither is locked, because
   this is a town that stopped locking things some time around
   the second time it emptied out.

   Interiors are built in world space, not in the terrace's
   rotated group, and nothing here is merged: the doors swing
   and the props have to stay pickable.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled, tex } from './mat.js';
import { SCALE, BOX, CYL, PLN } from './world.js';
import { makeDoor } from './door.js';
import { counter, desk, chair, shelfUnit, cardboardBox, clutter } from './props.js';
import { facadeSign } from './facades.js';

/* The block these two stand in, in numbers, because loc_street has to
   agree with them: it cuts the holes and it needs to know where. `x` is
   the offset along Ridge Road from the origin of the block, and `W` is
   the full width of the building including both party walls. */
export const ROW_SHOPS = [
  {
    id: 'cleaners', name: 'KOWAL CLEANERS', signStyle: 'vinyl',
    x: -13.5, W: 9.0, doorAt: 2.75, boarded: true,
    surface: 'lino', floor: 'tile', body: 0x9a9086, trim: 0x6e6a60, bulkhead: 0x2f4438
  },
  {
    id: 'realty', name: 'STANKO REALTY', signStyle: 'panel',
    x: 15.8, W: 8.4, doorAt: -2.5, boarded: false,
    surface: 'carpet', floor: 'carpet', body: 0x8c5f52, trim: 0xbdb5a4, bulkhead: 0x2c3a48
  }
];

/** The stretches of the row that must not be built, in the same local
    X the terrace's own `gaps` are given in. */
export const ROW_GAPS = ROW_SHOPS.map(s => [s.x - s.W / 2, s.x + s.W / 2]);

const GF = 3.5;        // structural first floor: the row's ground storey
const CEIL = 3.05;     // the shop's own ceiling, hung under it
const DEPTH = 11;      // the depth of the far row, which these stand in
const WALL = 0.30;     // party walls, front and back
const FRONT_D = 7.2;   // how deep the shop is before the back room starts

/**
 * Both shops, with their fronts on the building line `z` and their
 * backs eleven metres into it.
 *
 * `locked` is the state the front doors start in. Chapters One and Two
 * leave them locked, because a twenty-five minute move-in weekend does
 * not want the player wandering into a dead dry cleaner's, and Chapter
 * Three opens them.
 */
export function buildRowShops(world, {
  x = 0, y = 0, z = 0, night = true, snow = false, locked = true
} = {}) {
  const out = {};
  ROW_SHOPS.forEach(S => {
    const h = shell(world, S, { x, y, z, night, snow, locked });
    (S.id === 'cleaners' ? cleaners : realty)(world, S, h, { night, snow, open: !locked });
    out[S.id] = h;
  });
  return out;
}

/* ============================================================ the building */

/**
 * Four walls, a floor, a ceiling, a shopfront with a hole in it, and
 * seven metres of brick standing on top of all of it so the thing reads
 * as part of the row rather than a shed dropped into a gap.
 */
function shell(world, S, { x, y, z, night, snow, locked }) {
  const cx = x + S.x, W = S.W;
  const FZ = z, BZ = z + DEPTH;
  const inX0 = cx - W / 2 + WALL, inX1 = cx + W / 2 - WALL;
  const inZ0 = FZ + WALL, inZ1 = BZ - WALL;
  const inW = inX1 - inX0, inD = inZ1 - inZ0;
  const midZ = (FZ + BZ) / 2;
  // The unit's own colour, on the brick itself. It used to be a
  // translucent plane hung over the upper storeys, which tinted three
  // floors and left the piers under them the colour of everybody else's.
  const bodyMat = MAT.brick.clone();
  bodyMat.color.setHex(S.body);
  bodyMat.userData.own = true;

  const h = {
    id: S.id, name: S.name, x: cx, y, z: FZ,
    W, inX0, inX1, inZ0, inZ1, inW, inD,
    frontZ1: inZ0 + FRONT_D,        // where the front room stops
    refs: {}, spawn: null
  };

  // ---------------------------------------------------------- the box
  // Party walls, back wall, and the upper storeys as one solid mass.
  // The mass does not collide: there is nothing up there to stand on,
  // and a collider seven metres up is seven metres of broad phase.
  world.wall(cx - W / 2 + WALL / 2, midZ, DEPTH, { axis: 'z', h: GF, y, thick: WALL, mat: bodyMat, tag: 'rowwall' });
  world.wall(cx + W / 2 - WALL / 2, midZ, DEPTH, { axis: 'z', h: GF, y, thick: WALL, mat: bodyMat, tag: 'rowwall' });
  world.wall(cx, BZ - WALL / 2, W, { axis: 'x', h: GF, y, thick: WALL, mat: bodyMat, tag: 'rowwall' });
  const upperH = 7.3;
  world.solid(cx, y + GF, midZ, W, upperH, DEPTH, bodyMat, { collide: false, tag: 'rowbody' });
  // cornice and parapet, so the roofline is not a cut edge
  const trimM = flat(S.trim, { rough: .9 });
  const corn = new THREE.Mesh(BOX(W + 0.3, 0.34, 0.5), trimM);
  corn.position.set(cx, y + GF + upperH - 0.5, FZ - 0.1);
  corn.castShadow = true; world.add(corn);
  const roof = new THREE.Mesh(BOX(W + 0.1, 0.28, DEPTH + 0.1), flat(0x2b2825, { rough: .96 }));
  roof.position.set(cx, y + GF + upperH + 0.14, midZ);
  world.add(roof);

  // ---------------------------------------------------------- upper windows
  // Two floors of three, with a segmental head, because the row has them
  // and the eye counts openings before it counts anything else.
  for (let f = 0; f < 2; f++) {
    const fy = y + GF + 0.95 + f * 2.9;
    for (let b = 0; b < 3; b++) {
      const wx = cx - W / 2 + (b + 0.5) * (W / 3);
      const pane = new THREE.Mesh(PLN(1.0, 1.55), flat(night ? 0x14181c : 0x2b333a, { rough: .3 }));
      pane.position.set(wx, fy + 0.85, FZ - 0.055);
      pane.rotation.y = Math.PI;
      world.add(pane);
      const sill = new THREE.Mesh(BOX(1.28, 0.1, 0.18), trimM);
      sill.position.set(wx, fy + 0.03, FZ - 0.1); world.add(sill);
      const head = new THREE.Mesh(BOX(1.24, 0.16, 0.14), trimM);
      head.position.set(wx, fy + 1.7, FZ - 0.08); world.add(head);
      // one sash up on the top floor of each, always
      if (f === 1 && b === 1) {
        const up = new THREE.Mesh(BOX(1.0, 0.32, 0.04), flat(0x0d1013, { rough: 1 }));
        up.position.set(wx, fy + 0.24, FZ - 0.07); world.add(up);
      }
    }
  }

  // ---------------------------------------------------------- shopfront
  const pierW = 0.55;
  const openW = W - pierW * 2 - 0.2;
  const sillY = 0.62, headY = GF - 0.62;
  const bays = 4;
  const bayW = openW / bays;
  const doorBay = Math.round((S.doorAt + openW / 2) / bayW - 0.5);
  const doorX = cx - openW / 2 + (doorBay + 0.5) * bayW;
  const gapBay = doorBay === 0 ? 1 : doorBay - 1;      // the bay next to the door
  h.refs.doorX = doorX;

  [-1, 1].forEach(s => {
    world.wall(cx + s * (W / 2 - WALL - pierW / 2), FZ + WALL / 2, pierW,
      { axis: 'x', h: GF, y, thick: WALL, mat: bodyMat, tag: 'rowpier' });
  });
  // the spandrel over the glass, and the beam under it
  world.wall(cx, FZ + WALL / 2, openW + 0.4,
    { axis: 'x', h: GF - headY, y: y + headY, thick: WALL, mat: bodyMat, collide: false, tag: 'rowhead' });
  const beam = new THREE.Mesh(BOX(W - 0.2, 0.28, 0.24), trimM);
  beam.position.set(cx, y + headY + 0.36, FZ - 0.06);
  beam.castShadow = true; world.add(beam);

  const bulkM = flat(S.bulkhead, { rough: .68 });
  const glassM = S.boarded ? null : new THREE.MeshPhysicalMaterial({
    color: 0x2a3540, roughness: .07, metalness: 0, transmission: .58,
    transparent: true, opacity: .38, side: THREE.DoubleSide
  });
  const plyM = flat(0x7b6647, { rough: .96 });

  for (let b = 0; b < bays; b++) {
    const bx = cx - openW / 2 + (b + 0.5) * bayW;
    if (b === doorBay) continue;
    // the stall riser, which is the one part of a shopfront that is
    // always solid and always the darkest thing on the street
    const riser = new THREE.Mesh(BOX(bayW - 0.06, sillY, 0.2), bulkM);
    riser.position.set(bx, y + sillY / 2, FZ + 0.02);
    riser.castShadow = true; world.add(riser);
    if (S.boarded) {
      // Plywood, screwed on from outside in 2011 and never taken off.
      // One board short of covering it, at chest height, in the bay next
      // to the door, which is the whole reason the player ever looks in
      // here from the pavement and the whole reason there is anything to
      // see from inside.
      const bhH = (headY - sillY) / 5;
      const gapBoard = b === gapBay ? 2 : -1;
      for (let k = 0; k < 5; k++) {
        if (k === gapBoard) continue;
        const pl = new THREE.Mesh(BOX(bayW - 0.04, bhH - 0.02, 0.035), plyM);
        pl.position.set(bx, y + sillY + (k + 0.5) * bhH, FZ - 0.055);
        pl.rotation.z = (k % 2 ? 1 : -1) * 0.004;
        pl.castShadow = true; world.add(pl);
      }
      if (gapBoard >= 0) {
        // the torn edge of the board above it, which is the thing you
        // actually put your hands on to look through
        const lip = new THREE.Mesh(BOX(bayW - 0.04, 0.05, 0.06), flat(0x5f4f36, { rough: .96 }));
        lip.position.set(bx, y + sillY + (gapBoard + 1) * bhH - 0.02, FZ - 0.045);
        world.add(lip);
        h.refs.gap = lip;
        h.refs.gapAt = { x: bx, y: y + sillY + (gapBoard + 0.5) * bhH, z: FZ };
      }
    } else {
      const gl = new THREE.Mesh(PLN(bayW - 0.1, headY - sillY), glassM);
      gl.position.set(bx, y + (sillY + headY) / 2, FZ + 0.02);
      world.add(gl);
    }
    // you cannot walk through a shop window
    world.collide(bx, y, FZ + 0.1, bayW, GF, 0.34, 'shopfront');
  }
  // mullions: a shopfront is three or four lights wide, never one. They
  // are built across the whole opening rather than off each bay, because
  // the bay the door is in draws nothing and used to take the mullion
  // beside it with it.
  for (let i = 1; i < bays; i++) {
    const mu = new THREE.Mesh(BOX(0.09, headY, 0.16), trimM);
    mu.position.set(cx - openW / 2 + i * bayW, y + headY / 2, FZ - 0.02);
    mu.castShadow = true;
    world.add(mu);
  }

  // ---------------------------------------------------------- the door
  // A shop door, 2.03 of clear opening in the middle of a bay, with the
  // frame lining the 0.3 m of front wall it is cut through.
  h.refs.door = makeDoor(world, {
    x: doorX, y, z: FZ + WALL / 2, facing: 0, hinge: 'left', wallThick: WALL,
    face: S.bulkhead, frameCol: S.trim, metal: 0x9aa0a4, kind: 'wood',
    glass: 2, panels: false, threshold: true, tag: S.id + 'door',
    locked, lockedLine: 'Locked. Of course it is.',
    label: 'Open', dist: 2.8
  });
  // the reveal each side of it, so the leaf is not floating in a hole
  [-1, 1].forEach(s => {
    const rv = new THREE.Mesh(BOX(0.12, GF, WALL), trimM);
    rv.position.set(doorX + s * (SCALE.doorW / 2 + SCALE.jamb + 0.06), y + GF / 2, FZ + WALL / 2);
    world.add(rv);
    world.collide(doorX + s * (SCALE.doorW / 2 + SCALE.jamb + 0.3), y, FZ + 0.15, 0.5, GF, 0.34, 'shopfront');
  });
  // and the transom over it, which every one of these has
  const tr = new THREE.Mesh(PLN(SCALE.doorW + 0.2, headY - SCALE.door - 0.1),
    flat(night ? 0x191d21 : 0x39424a, { rough: .3, side: THREE.DoubleSide }));
  tr.position.set(doorX, y + SCALE.door + 0.12 + (headY - SCALE.door - 0.1) / 2, FZ + 0.02);
  world.add(tr);

  // ---------------------------------------------------------- signs
  const band = new THREE.Mesh(BOX(W - 0.5, 0.9, 0.1), flat(0x232629, { rough: .82 }));
  band.position.set(cx, y + GF + 0.5, FZ - 0.14);
  world.add(band);
  const sw = Math.min(W - 1.2, S.name.length * 0.30 + 0.7);
  const sign = facadeSign(S.name, sw, 0.58, S.signStyle, S.id === 'cleaners' ? 91 : 64);
  sign.rotation.y = Math.PI;
  sign.position.set(cx, y + GF + 0.5, FZ - 0.24);
  sign.material.emissiveIntensity = night ? 0.10 : 0.05;   // nothing here is lit any more
  world.add(sign);
  h.refs.sign = sign;

  // ---------------------------------------------------------- the ground
  // The shop's own floor, and a threshold strip that reaches out under
  // the door and overlaps the pavement. A seam with no floor rect in it
  // is a doorway you cannot step through: the stair landing at 118 1/2
  // learned that the hard way and so does every door after it.
  const fm = S.floor === 'carpet' ? MAT.carpet : MAT.tile;
  world.floor(cx, (inZ0 + inZ1) / 2, inW, inD, { y, surface: S.surface, mat: fm });
  world.floor(doorX, FZ + 0.16, SCALE.doorW + 0.5, 0.62, { y, surface: S.surface, mat: MAT.concrete });
  world.ceiling(cx, (inZ0 + inZ1) / 2, inW, inD, { y: y + CEIL });

  // The inside faces of the walls, because brick on the inside of a 1930s
  // shop is a loft conversion and this is not one. Three of them: the
  // front is a shopfront, and a plaster plane across it walls up the
  // glass, the door and everything standing in the window.
  const plas = tiled(MAT.plaster, inW, CEIL); plas.userData.own = true;
  face(world, inW, CEIL, cx, y + CEIL / 2, inZ1 - 0.006, Math.PI, plas);
  const plasSide = tiled(MAT.plaster, inD, CEIL); plasSide.userData.own = true;
  face(world, inD, CEIL, inX0 + 0.006, y + CEIL / 2, (inZ0 + inZ1) / 2, Math.PI / 2, plasSide);
  face(world, inD, CEIL, inX1 - 0.006, y + CEIL / 2, (inZ0 + inZ1) / 2, -Math.PI / 2, plasSide);

  // ---------------------------------------------------------- back room
  const partZ = inZ0 + FRONT_D;
  const part = world.wallWithDoor(cx, partZ, inW, S.id === 'cleaners' ? -1.6 : 1.8,
    { axis: 'x', h: CEIL, y, thick: 0.14, mat: MAT.plaster, tag: 'rowpart' });
  h.refs.part = part;
  h.spawn = { x: doorX, z: inZ0 + 1.2, yaw: 0 };
  return h;
}

/** One inside face of a wall. PlaneGeometry looks down +Z at rot 0. */
function face(world, w, hh, x, y, z, rotY, m) {
  const p = new THREE.Mesh(PLN(w, hh), m);
  p.position.set(x, y, z);
  p.rotation.y = rotY;
  p.receiveShadow = true;
  return world.add(p);
}

/* ============================================================ KOWAL CLEANERS
   Shut in September 2011 and never emptied. The counter is still
   there, the rail is still loaded, and the order nobody ever came
   back for is still on the call-back bracket by the register.
   ============================================================ */
function cleaners(world, S, h, { night, open }) {
  const { x: cx, y, inX0, inX1, inZ0, inZ1, frontZ1 } = h;
  const R = h.refs;

  // ---- the counter, across the room, the way a laundry counter is ----
  R.counter = counter(world, cx - 0.6, y, inZ0 + 2.9, 4.6, 0.72, 0,
    { h: 1.02, top: 0x4a4034, body: 0xb8b2a2 });

  // the register: a National, mechanical, and about ninety years old
  const reg = new THREE.Mesh(BOX(0.42, 0.34, 0.36), flat(0x6d5a2f, { rough: .5, metal: .5 }));
  reg.position.set(cx + 1.2, y + 1.19, inZ0 + 2.9);
  reg.castShadow = true; world.add(reg);
  const keys = new THREE.Mesh(BOX(0.34, 0.05, 0.2), flat(0x2a2724, { rough: .6 }));
  keys.position.set(cx + 1.2, y + 1.38, inZ0 + 2.82); world.add(keys);
  R.register = reg;

  // ---- the ticket spike. Paid, tagged, never called for ----
  const spike = new THREE.Group();
  spike.position.set(cx - 2.1, y + 1.03, inZ0 + 2.78);
  const base = new THREE.Mesh(CYL(0.055, 0.06, 0.014, 12), flat(0x8d9094, { rough: .4, metal: .6 }));
  spike.add(base);
  const pin = new THREE.Mesh(CYL(0.004, 0.004, 0.16, 6), flat(0xb8bcbe, { rough: .3, metal: .8 }));
  pin.position.y = 0.08; spike.add(pin);
  for (let i = 0; i < 14; i++) {
    const t = new THREE.Mesh(PLN(0.07, 0.11), flat(0xe4dcc6, { rough: .96, side: THREE.DoubleSide }));
    t.rotation.x = -Math.PI / 2 + (i % 3 - 1) * 0.04;
    t.rotation.z = i * 0.7;
    t.position.y = 0.016 + i * 0.004;
    spike.add(t);
  }
  world.add(spike);
  R.spike = spike;

  // ---- the rail, and what is on it ----------------------------------
  // Nine bags, hung the way a conveyor drops them, and a tenth hook with
  // nothing on it. Nobody in this game ever mentions the number nine.
  //
  // It runs up the WEST wall rather than across the shop. Across the
  // shop is how a conveyor is really hung, and it is also a loaded rail
  // between the player and the only other room in the building.
  const railY = y + 1.98;
  const railX = inX0 + 0.55;
  const railZ0 = inZ0 + 3.8, railLen = 3.4;
  const railZ = railZ0 + railLen / 2;
  const rail = new THREE.Mesh(CYL(0.022, 0.022, railLen, 8), flat(0x9aa0a4, { rough: .35, metal: .7 }));
  rail.rotation.x = Math.PI / 2;
  rail.position.set(railX, railY, railZ);
  rail.castShadow = true; world.add(rail);
  [-1, 1].forEach(s => {
    const br = new THREE.Mesh(BOX(0.05, CEIL - railY + y, 0.05), flat(0x8d9094, { rough: .4, metal: .6 }));
    br.position.set(railX, (railY + y + CEIL) / 2, railZ + s * (railLen / 2 - 0.1));
    world.add(br);
  });
  // and you cannot walk through a loaded rail
  world.collide(railX - 0.25, y, railZ, 1.1, 2.35, railLen + 0.3, 'rail');

  const bagM = flat(0xd6d8d4, { rough: .34, transparent: true, opacity: .88 });
  R.bags = [];
  for (let i = 0; i < 10; i++) {
    const bz = railZ0 + 0.24 + i * 0.32;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 5, 12, Math.PI * 1.5), flat(0xb8bcbe, { rough: .3, metal: .8 }));
    hook.position.set(railX, railY - 0.02, bz);
    world.add(hook);
    if (i === 9) { R.emptyHook = hook; continue; }     // the tenth. nothing on it.
    const g = new THREE.Group();
    g.position.set(railX, railY - 0.08, bz);
    g.rotation.y = (i % 3 - 1) * 0.09;
    const bag = new THREE.Mesh(BOX(0.14, 1.02 + (i % 4) * 0.07, 0.3), bagM);
    bag.position.set(0.06, -0.55, 0); g.add(bag);
    const shoulder = new THREE.Mesh(BOX(0.1, 0.1, 0.26), flat(0xc4c0b4, { rough: .6 }));
    shoulder.position.set(0.06, -0.1, 0); g.add(shoulder);
    const tag = new THREE.Mesh(PLN(0.07, 0.05), flat(0xe4dcc6, { rough: .96, side: THREE.DoubleSide }));
    tag.position.set(0.14, -0.16, 0.02); g.add(tag);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    world.add(g);
    R.bags.push(g);
  }
  // and the one that is not on the rail with the others: on a call-back
  // bracket off the east wall by the counter, which is where a shop puts
  // an order somebody is coming for.
  const bkt = new THREE.Mesh(CYL(0.018, 0.018, 0.8, 6), flat(0x8d9094, { rough: .4, metal: .6 }));
  bkt.rotation.z = Math.PI / 2;
  bkt.position.set(inX1 - 0.4, y + 1.95, inZ0 + 2.55);
  world.add(bkt);
  const own = new THREE.Group();
  own.position.set(inX1 - 0.65, y + 1.9, inZ0 + 2.55);
  const coatBag = new THREE.Mesh(BOX(0.52, 1.24, 0.16), bagM);
  coatBag.position.y = -0.66; own.add(coatBag);
  const coatM = tiled(MAT.coat, 0.46, 1.12); coatM.userData.own = true;
  const coat = new THREE.Mesh(BOX(0.46, 1.12, 0.1), coatM);
  coat.position.y = -0.66; own.add(coat);
  const ticket = new THREE.Mesh(PLN(0.1, 0.14), flat(0xe9e0c8, { rough: .95, side: THREE.DoubleSide }));
  ticket.position.set(0.16, -0.2, 0.1); own.add(ticket);
  const hk = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 5, 12, Math.PI * 1.6), flat(0xb8bcbe, { rough: .3, metal: .8 }));
  hk.rotation.y = Math.PI / 2; own.add(hk);
  own.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(own);
  R.uncollected = own;

  // ---- the press, the sorting table, the boiler pipes ---------------
  const press = new THREE.Group();
  press.position.set(inX1 - 0.5, y, h.frontZ1 - 0.9);
  press.rotation.y = -Math.PI / 2;                 // facing into the room
  const pbody = new THREE.Mesh(BOX(1.05, 0.95, 0.7), flat(0x4a4f52, { rough: .5, metal: .35 }));
  pbody.position.y = 0.48; press.add(pbody);
  const pjaw = new THREE.Mesh(BOX(1.0, 0.14, 0.62), flat(0x6d7276, { rough: .35, metal: .55 }));
  pjaw.position.set(0, 1.06, 0.02); pjaw.rotation.x = -0.22; press.add(pjaw);
  const parm = new THREE.Mesh(CYL(0.022, 0.022, 0.6, 8), flat(0x8d9094, { rough: .4, metal: .6 }));
  parm.position.set(0.42, 1.32, -0.1); parm.rotation.z = 0.5; press.add(parm);
  press.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(press);
  world.collide(inX1 - 0.5, y, h.frontZ1 - 0.9, 0.78, 1.1, 1.1, 'press');
  R.press = press;

  // pipes along the ceiling, because the whole back half of a dry
  // cleaner's is steam and the shop never hid it
  for (let i = 0; i < 2; i++) {
    const pipe = new THREE.Mesh(CYL(0.05, 0.05, inZ1 - inZ0 - 0.4, 8), flat(0x6a5f52, { rough: .8, metal: .3 }));
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(inX0 + 0.5 + i * 0.34, y + CEIL - 0.22, (inZ0 + inZ1) / 2);
    world.add(pipe);
  }

  // ---- the calendar. September 2011. ---------------------------------
  const cal = new THREE.Mesh(PLN(0.5, 0.66), calendarTex());
  cal.position.set(inX1 - 0.02, y + 1.72, inZ0 + 1.4);
  cal.rotation.y = -Math.PI / 2;
  world.add(cal);
  R.calendar = cal;

  // ---- the strip curtain in the back doorway -------------------------
  const partZ = frontZ1;
  const stripM = flat(0xd8d4c6, { rough: .3, transparent: true, opacity: .5 });
  for (let i = 0; i < 9; i++) {
    const st = new THREE.Mesh(BOX(0.13, 1.9, 0.006), stripM);
    st.position.set(cx - 1.6 - 0.56 + i * 0.14, y + 1.0, partZ - 0.09);
    st.rotation.z = (i % 2 ? 1 : -1) * 0.006;
    world.add(st);
  }

  // ---- the salt --------------------------------------------------------
  // A line across the inside of the back threshold, poured from the back
  // room side, and not walked through since. Mrs Ostrowski does the same
  // thing on her own step every night and calls it ice.
  const salt = new THREE.Mesh(BOX(1.15, 0.014, 0.09), flat(0xe8e6de, { rough: .95 }));
  salt.position.set(cx - 1.6, y + 0.007, partZ + 0.14);
  world.add(salt);
  R.salt = salt;

  // ---- the back room ---------------------------------------------------
  // A boiler with a pilot still lit, a chair facing the doorway, and a
  // door frame somebody measured two children against until 2002.
  const boiler = new THREE.Mesh(CYL(0.42, 0.42, 1.5, 14), flat(0x4a423a, { rough: .82, metal: .25 }));
  boiler.position.set(inX1 - 0.9, y + 0.75, inZ1 - 0.9);
  boiler.castShadow = true; world.add(boiler);
  world.collide(inX1 - 0.9, y, inZ1 - 0.9, 0.9, 1.5, 0.9, 'boiler');
  const pilot = world.bulb(inX1 - 0.9, y + 0.34, inZ1 - 1.3, {
    color: 0xE8A653, intensity: open ? 0.55 : 0, dist: 2.6, size: 0.018
  });
  R.pilot = pilot;

  R.backChair = chair(world, cx - 1.6, y, partZ + 1.5, Math.PI, 0x4a3524);
  cardboardBox(world, inX0 + 0.8, y, inZ1 - 1.2, 0.3, { w: 0.5, label: '' });
  cardboardBox(world, inX0 + 1.5, y, inZ1 - 1.0, -0.2, { w: 0.44, label: '' });
  shelfUnit(world, inX0 + 0.35, y, partZ + 1.9, Math.PI / 2, { w: 1.4, h: 1.8, d: 0.3, shelves: 4, seed: 911 });

  // the height marks, on the jamb of the back doorway
  const marks = new THREE.Group();
  marks.position.set(cx - 1.6 + 0.62, y, partZ + 0.09);
  // the casing they are on, which is also the thing big enough to aim at
  const casing = new THREE.Mesh(BOX(0.11, 2.05, 0.03), flat(0xc9c0ae, { rough: .7 }));
  casing.position.set(0, 1.025, -0.006);
  casing.castShadow = true;
  marks.add(casing);
  [[0.86, 0x3a2f24], [0.98, 0x3a2f24], [1.12, 0x3a2f24], [1.24, 0x3a2f24], [1.38, 0x3a2f24], [1.51, 0x3a2f24]]
    .forEach(([my, mc], i) => {
      const m = new THREE.Mesh(BOX(0.1, 0.004, 0.004), flat(mc, { rough: 1 }));
      m.position.set((i % 2) * 0.02, my, 0);
      marks.add(m);
    });
  world.add(marks);
  R.marks = marks;

  // ---- light -----------------------------------------------------------
  // One tube over the counter that has not worked since the shop shut,
  // and the sodium off Ridge Road coming in through the two boards that
  // are missing. It is a room you have to use the flashlight in.
  const tube = new THREE.Mesh(BOX(1.2, 0.07, 0.14), flat(0xb8bcbe, { rough: .5 }));
  tube.position.set(cx, y + CEIL - 0.1, inZ0 + 2.6);
  world.add(tube);
  R.tube = tube;
  R.light = world.bulb(cx, y + CEIL - 0.3, inZ0 + 2.0, {
    color: 0xC3D2E4, intensity: open ? (night ? 0.30 : 0.9) : 0, dist: 7, emissive: false
  });
  // the sliver of street that gets in past the plywood
  R.slit = world.bulb(h.refs.gapAt ? h.refs.gapAt.x : cx, y + 1.5, inZ0 + 0.5, {
    color: 0xE8A653, intensity: open ? (night ? 0.9 : 0.2) : 0, dist: 4.5, emissive: false
  });

  h.look = { x: cx + 1.3, z: inZ0 + 0.9 };     // where the missing boards are
}

/* ============================================================ STANKO REALTY
   Shut in 1997. Two rooms: an office with a desk in it and a file
   room that still has every conveyance the borough ever recorded,
   including nine of them from February 1964 for a dollar each.
   ============================================================ */
function realty(world, S, h, { night, open }) {
  const { x: cx, y, inX0, inX1, inZ0, inZ1, frontZ1 } = h;
  const R = h.refs;

  // ---- the office ------------------------------------------------------
  const d = desk(world, cx + 1.0, y, inZ0 + 2.6, 0, { w: 1.6, d: 0.8, h: 0.75 });
  R.desk = d;
  R.chair = chair(world, cx + 1.0, y, inZ0 + 3.6, Math.PI, 0x4a3524);

  // the typewriter, with a sheet still in it
  const tw = new THREE.Group();
  tw.position.set(cx + 1.35, d.top - 0.02, inZ0 + 2.5);
  const twb = new THREE.Mesh(BOX(0.34, 0.14, 0.3), flat(0x2a2724, { rough: .45, metal: .3 }));
  twb.position.y = 0.07; tw.add(twb);
  const twk = new THREE.Mesh(BOX(0.3, 0.03, 0.12), flat(0x3d3a36, { rough: .5 }));
  twk.position.set(0, 0.15, 0.1); tw.add(twk);
  const sheet = new THREE.Mesh(PLN(0.21, 0.28), flat(0xe9e3d3, { rough: .96, side: THREE.DoubleSide }));
  sheet.position.set(0, 0.28, -0.11); sheet.rotation.x = -0.35; tw.add(sheet);
  tw.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(tw);
  R.typewriter = tw;

  // a banker's lamp that is still on, in an office that closed in 1997
  const lampBase = new THREE.Mesh(CYL(0.07, 0.09, 0.03, 12), flat(0x6d5a2f, { rough: .4, metal: .6 }));
  lampBase.position.set(cx + 0.35, d.top + 0.015, inZ0 + 2.5); world.add(lampBase);
  const lampStem = new THREE.Mesh(CYL(0.012, 0.012, 0.24, 8), flat(0x6d5a2f, { rough: .4, metal: .6 }));
  lampStem.position.set(cx + 0.35, d.top + 0.14, inZ0 + 2.5); world.add(lampStem);
  const shade = new THREE.Mesh(BOX(0.3, 0.09, 0.14), flat(0x1f4a34, { rough: .5 }));
  shade.position.set(cx + 0.35, d.top + 0.28, inZ0 + 2.5); world.add(shade);
  R.lamp = world.bulb(cx + 0.35, d.top + 0.2, inZ0 + 2.5, {
    color: 0xFFC58A, intensity: 2.2, dist: 5.5, emissive: false
  });

  clutter(world, cx + 0.55, d.top, inZ0 + 2.8, 0.7, 0.4, { set: 'desk', seed: 640, count: 4 });

  // two chairs on the customer's side of it, because an office with one
  // chair in it is a study, and this is a place people came to sign things
  chair(world, cx + 0.3, y, inZ0 + 1.75, 0, 0x5a3e28);
  chair(world, cx + 1.7, y, inZ0 + 1.75, 0.14, 0x5a3e28);

  // the ledger, closed, on the corner of the desk where it was left
  const ledger = new THREE.Mesh(BOX(0.26, 0.06, 0.34), flat(0x4a3524, { rough: .8 }));
  ledger.position.set(cx + 1.55, d.top + 0.03, inZ0 + 2.85);
  ledger.rotation.y = 0.14;
  ledger.castShadow = true; world.add(ledger);
  R.ledger = ledger;

  // ---- the plat map, on the side wall ---------------------------------
  const mapFrame = new THREE.Mesh(BOX(0.06, 1.62, 2.32), flat(0x3d3226, { rough: .8 }));
  mapFrame.position.set(inX0 + 0.04, y + 1.72, inZ0 + 3.4);
  world.add(mapFrame);
  const map = new THREE.Mesh(PLN(2.2, 1.5), platTex());
  map.position.set(inX0 + 0.08, y + 1.72, inZ0 + 3.4);
  map.rotation.y = Math.PI / 2;
  world.add(map);
  R.map = map;

  // ---- the window cards ------------------------------------------------
  // A rack in the glass, facing the street, still advertising two things
  // that are not for sale any more.
  const rack = new THREE.Group();
  rack.position.set(cx - 0.4, y + 1.25, inZ0 + 0.24);
  const rail = new THREE.Mesh(BOX(2.0, 0.03, 0.03), flat(0x8d9094, { rough: .4, metal: .6 }));
  rack.add(rail);
  R.cards = [];
  ['118½ RIDGE RD', '9 KESSLERTON ROW', 'THIS UNIT'].forEach((t, i) => {
    const c = new THREE.Mesh(PLN(0.42, 0.56), cardTex(t, i));
    c.position.set(-0.62 + i * 0.62, -0.34, 0.004);
    c.rotation.y = Math.PI;         // it is in the window, facing out
    rack.add(c);
    const back = new THREE.Mesh(PLN(0.42, 0.56), flat(0xd8d2c4, { rough: .95 }));
    back.position.set(-0.62 + i * 0.62, -0.34, -0.004);
    rack.add(back);
    R.cards.push(c);
  });
  world.add(rack);
  R.rack = rack;

  // ---- the clock, stopped ---------------------------------------------
  // At 3:04. Nobody points at it. If the player was standing at the
  // window on the twenty-second of September they already know.
  const clock = new THREE.Group();
  clock.position.set(inX1 - 0.06, y + 2.1, inZ0 + 2.6);
  clock.rotation.y = -Math.PI / 2;
  const rim = new THREE.Mesh(CYL(0.19, 0.19, 0.05, 20), flat(0x3d3226, { rough: .7 }));
  rim.rotation.x = Math.PI / 2; clock.add(rim);
  const dial = new THREE.Mesh(CYL(0.165, 0.165, 0.01, 20), flat(0xe4dfd0, { rough: .8 }));
  dial.rotation.x = Math.PI / 2; dial.position.z = 0.028; clock.add(dial);
  const hand = (len, ang, wdt) => {
    const m = new THREE.Mesh(BOX(wdt, len, 0.006), flat(0x2a2520, { rough: .6 }));
    m.position.set(Math.sin(ang) * len / 2, Math.cos(ang) * len / 2, 0.035);
    m.rotation.z = -ang;
    clock.add(m);
  };
  hand(0.09, Math.PI * 2 * (3.07 / 12), 0.011);      // just past the three
  hand(0.14, Math.PI * 2 * (4 / 60), 0.008);         // and four minutes
  world.add(clock);
  R.clock = clock;

  // ---- the file room ---------------------------------------------------
  const partZ = frontZ1;
  R.cabinets = [];
  for (let i = 0; i < 4; i++) {
    const fx = inX0 + 0.45 + i * 0.62;
    const cab = new THREE.Group();
    cab.position.set(fx, y, inZ1 - 0.55);
    cab.rotation.y = Math.PI;              // drawers face the room, not the wall
    const body = new THREE.Mesh(BOX(0.52, 1.32, 0.68), flat(0x6b6f6a, { rough: .55, metal: .3 }));
    body.position.y = 0.66; cab.add(body);
    for (let k = 0; k < 4; k++) {
      const dr = new THREE.Mesh(BOX(0.46, 0.28, 0.02), flat(0x7b7f7a, { rough: .5, metal: .3 }));
      dr.position.set(0, 0.2 + k * 0.31, 0.35); cab.add(dr);
      const hn = new THREE.Mesh(BOX(0.14, 0.03, 0.03), flat(0xb8bcbe, { rough: .3, metal: .7 }));
      hn.position.set(0, 0.2 + k * 0.31, 0.37); cab.add(hn);
    }
    cab.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    world.add(cab);
    world.collide(fx, y, inZ1 - 0.55, 0.55, 1.35, 0.7, 'cabinet');
    R.cabinets.push(cab);
  }
  // the one drawer somebody left open, with the 1964 book in it
  const drX = inX0 + 0.45 + 2 * 0.62, drZ = inZ1 - 1.15;
  const openDr = new THREE.Mesh(BOX(0.46, 0.28, 0.5), flat(0x7b7f7a, { rough: .5, metal: .3 }));
  openDr.position.set(drX, y + 0.82, drZ);
  openDr.castShadow = true; world.add(openDr);
  world.collide(drX, y + 0.68, drZ, 0.5, 0.3, 0.55, 'drawer');
  const folder = new THREE.Mesh(BOX(0.34, 0.02, 0.4), flat(0xc9b98d, { rough: .92 }));
  folder.position.set(drX, y + 0.98, drZ);
  world.add(folder);
  R.drawer = openDr;
  R.folder = folder;

  // ---- the key board ---------------------------------------------------
  // Nine hooks. Nine keys. And a tenth hook with a tag on it and no key.
  const board = new THREE.Group();
  board.position.set(inX1 - 0.07, y + 1.6, frontZ1 + 0.55);
  board.rotation.y = -Math.PI / 2;
  const bk = new THREE.Mesh(BOX(0.9, 0.66, 0.05), flat(0x4a3524, { rough: .8 }));
  board.add(bk);
  for (let i = 0; i < 10; i++) {
    const kx = -0.36 + (i % 5) * 0.18, ky = 0.16 - Math.floor(i / 5) * 0.3;
    const hook = new THREE.Mesh(CYL(0.005, 0.005, 0.05, 5), flat(0xb8bcbe, { rough: .3, metal: .8 }));
    hook.rotation.x = Math.PI / 2;
    hook.position.set(kx, ky, 0.05); board.add(hook);
    const tag = new THREE.Mesh(PLN(0.1, 0.05), flat(0xe4dcc6, { rough: .95, side: THREE.DoubleSide }));
    tag.position.set(kx, ky - 0.09, 0.05); board.add(tag);
    if (i === 9) continue;                       // the empty one, bottom right
    const key = new THREE.Mesh(BOX(0.012, 0.06, 0.002), flat(0xc9b071, { rough: .35, metal: .8 }));
    key.position.set(kx, ky - 0.03, 0.056); board.add(key);
  }
  world.add(board);
  R.keyboard = board;

  shelfUnit(world, inX1 - 0.35, y, partZ + 2.0, -Math.PI / 2, { w: 1.4, h: 1.7, d: 0.28, shelves: 4, seed: 645 });
  cardboardBox(world, cx + 0.4, y, inZ1 - 1.6, 0.4, { w: 0.5, label: '' });

  // one bare bulb in the file room, on a flex, and it is the only reason
  // anybody would come back here
  // the file room's bare bulb only burns when there is somebody in the
  // building to have turned it on. The lamp in the window burns always:
  // it is the whole reason anybody looks in.
  R.backLight = world.bulb(cx - 0.4, y + CEIL - 0.35, partZ + 1.6, {
    color: 0xFFC58A, intensity: open ? (night ? 1.1 : 1.4) : 0, dist: 5, size: 0.03
  });
  const flex = new THREE.Mesh(CYL(0.004, 0.004, 0.3, 4), flat(0x2a2724, { rough: .8 }));
  flex.position.set(cx - 0.4, y + CEIL - 0.18, partZ + 1.6); world.add(flex);

  h.look = { x: cx - 0.4, z: inZ0 + 0.9 };
}

/* ============================================================ textures */

/** The calendar in the cleaners. September 2011, and one ringed date. */
function calendarTex() {
  return new THREE.MeshStandardMaterial({
    map: tex('row_calendar', 256, 340, (c, w, hh) => {
      c.fillStyle = '#ddd6c4'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#2f4438'; c.fillRect(0, 0, w, 86);
      c.fillStyle = '#e8e4d6';
      c.font = 'bold 30px "JetBrains Mono", monospace';
      c.textAlign = 'center';
      c.fillText('SEPTEMBER', w / 2, 40);
      c.font = '20px "JetBrains Mono", monospace';
      c.fillText('2011', w / 2, 68);
      c.fillStyle = '#6a6152';
      c.font = '13px "JetBrains Mono", monospace';
      'S M T W T F S'.split(' ').forEach((d, i) => c.fillText(d, 22 + i * 35, 112));
      c.fillStyle = '#2a2520';
      c.font = '16px "JetBrains Mono", monospace';
      for (let d = 1; d <= 30; d++) {
        const i = (d + 3) % 7, row = Math.floor((d + 3) / 7);
        c.fillText(String(d), 22 + i * 35, 142 + row * 34);
      }
      // the 22nd, gone round twice in ballpoint
      c.strokeStyle = '#25406b'; c.lineWidth = 2.4;
      const i22 = (22 + 3) % 7, r22 = Math.floor((22 + 3) / 7);
      for (let k = 0; k < 2; k++) {
        c.beginPath();
        c.ellipse(22 + i22 * 35, 137 + r22 * 34, 15 + k, 13 + k, 0.2 + k * 0.3, 0, 7);
        c.stroke();
      }
      // and the years, down the margin, in pencil, in the same hand
      c.fillStyle = '#5a5348';
      c.font = '13px "JetBrains Mono", monospace';
      c.fillText('65 74 83 92 01', w / 2, hh - 46);
      c.fillText('11 . . . . 20', w / 2, hh - 26);
      c.strokeStyle = '#8a8272'; c.lineWidth = 1;
      c.strokeRect(4, 4, w - 8, hh - 8);
    }, { metres: 1 }),
    roughness: .96
  });
}

/**
 * The plat map on the realty wall: Ridge Road, Kesslerton Row, the
 * cemetery, and the No. 9 workings drawn underneath all of it in red,
 * which is a thing a realty office would genuinely have, because the
 * workings are what a mortgage company asks about first.
 */
function platTex() {
  return new THREE.MeshStandardMaterial({
    map: tex('row_plat', 512, 350, (c, w, hh, R) => {
      c.fillStyle = '#e2dcc6'; c.fillRect(0, 0, w, hh);
      // the fold lines, because it lived in a drawer for fifty years
      c.strokeStyle = 'rgba(140,130,105,.5)'; c.lineWidth = 1;
      [w / 3, 2 * w / 3].forEach(fx => { c.beginPath(); c.moveTo(fx, 0); c.lineTo(fx, hh); c.stroke(); });
      // streets
      c.strokeStyle = '#5a5348'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 150); c.lineTo(w, 138); c.stroke();
      c.beginPath(); c.moveTo(90, 0); c.lineTo(104, hh); c.stroke();
      c.beginPath(); c.moveTo(330, 0); c.lineTo(318, hh); c.stroke();
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0, 250); c.lineTo(w, 240); c.stroke();
      // parcels
      c.strokeStyle = '#7a7364'; c.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const px = 12 + (i % 13) * 37, py = i < 13 ? 96 : 158;
        c.strokeRect(px, py, 33, 48);
      }
      // the nine on Kesslerton Row, hatched
      c.strokeStyle = '#8a2f22'; c.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const px = 12 + i * 37, py = 258;
        c.strokeRect(px, py, 33, 46);
        for (let k = 0; k < 6; k++) {
          c.beginPath(); c.moveTo(px, py + k * 8); c.lineTo(px + 33, py + k * 8 - 20); c.stroke();
        }
      }
      // the workings, under the town, in a second colour and a second hand
      c.strokeStyle = 'rgba(150,52,38,.85)'; c.lineWidth = 2.2;
      c.setLineDash([7, 5]);
      c.beginPath();
      c.moveTo(470, 40); c.bezierCurveTo(360, 90, 300, 120, 210, 190);
      c.bezierCurveTo(150, 240, 90, 250, 20, 300);
      c.stroke();
      c.beginPath(); c.moveTo(300, 120); c.lineTo(340, 250); c.stroke();
      c.beginPath(); c.moveTo(210, 190); c.lineTo(150, 320); c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#8a2f22';
      c.font = 'italic 15px "JetBrains Mono", monospace';
      c.fillText('KESSLERTON No. 9 · WORKINGS', 250, 34);
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('SEALED 400 FT LEVEL 2/1963', 300, 118);
      // labels
      c.fillStyle = '#3a352c';
      c.font = '14px "JetBrains Mono", monospace';
      c.fillText('RIDGE ROAD', 14, 144);
      c.fillText('KESSLERTON ROW', 14, 252);
      c.font = '11px "JetBrains Mono", monospace';
      c.fillText('BOROUGH OF ASHGROVE · PLAT · REV. 1964', 14, hh - 12);
      // and the ring somebody put round one parcel on Ridge Road
      c.strokeStyle = '#25406b'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(215, 120, 24, 30, 0, 0, 7); c.stroke();
      c.fillStyle = '#25406b';
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('118½', 190, 88);
      c.strokeStyle = '#8a8272'; c.lineWidth = 2;
      c.strokeRect(3, 3, w - 6, hh - 6);
    }, { metres: 1 }),
    roughness: .95
  });
}

/** One typed listing card in the realty window. */
function cardTex(title, i) {
  const LINES = [
    ['1 BR OVER SHOP', '$340/MO', 'HEAT INCL.', 'INQ. OSTROWSKI'],
    ['4 BR · COMPANY', 'CONVEYED 1964', '$1.00', 'NOT FOR SALE'],
    ['RETAIL · 900 SF', 'FOR LEASE', 'SINCE 09/2011', 'INQ. WITHIN']
  ][i];
  return new THREE.MeshStandardMaterial({
    map: tex('row_card' + i, 200, 268, (c, w, hh) => {
      c.fillStyle = '#efe9d8'; c.fillRect(0, 0, w, hh);
      c.strokeStyle = '#8a8272'; c.lineWidth = 2; c.strokeRect(6, 6, w - 12, hh - 12);
      c.fillStyle = '#3a352c';
      c.textAlign = 'center';
      c.font = 'bold 15px "JetBrains Mono", monospace';
      c.fillText(title, w / 2, 38);
      c.fillStyle = '#c9c2ad'; c.fillRect(20, 52, w - 40, 92);
      c.fillStyle = '#6a6152';
      c.font = '12px "JetBrains Mono", monospace';
      c.fillText('[ PHOTO ]', w / 2, 104);
      c.fillStyle = '#3a352c';
      c.font = '12px "JetBrains Mono", monospace';
      LINES.forEach((l, k) => c.fillText(l, w / 2, 172 + k * 22));
      c.fillStyle = '#8a2f22';
      c.font = 'bold 13px "JetBrains Mono", monospace';
      c.fillText('STANKO REALTY', w / 2, hh - 18);
    }, { metres: 1 }),
    roughness: .95, side: THREE.DoubleSide
  });
}
