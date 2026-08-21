/* ============================================================
   Headless walk test.

   The floor query and the collider list are the only two things
   that decide whether a room can be crossed, so this walks a
   route through the apartment the way the player controller
   would and reports the first place it cannot go. It is how the
   mezzanine stair is checked without a browser.
   ============================================================ */
import './dom.js';
import * as THREE from 'three';

const RADIUS = 0.28, STEP_UP = 0.42, EYE = 1.72;

const { World } = await import('../src/world/world.js');
const { buildApartment } = await import('../src/world/loc_home.js');
const { buildRidgeBlock } = await import('../src/world/loc_street.js');
const { buildLaundromat } = await import('../src/world/loc_home.js');
const { buildDiner, buildPawn } = await import('../src/world/loc_town.js');

const scene = new THREE.Scene();
const world = new World(scene);
const apt = buildApartment(world, { x: 0, y: 3.0, z: 0, boxes: true, lightsOn: true, hall: true });

/* Which world the route is being walked in. The apartment and the street
   are built into separate ones so the two halves of this file cannot
   inherit each other's floors. */
let W = world;

/** The controller's own resolve, cut down to what matters here. */
function blocked(px, pz, py) {
  const top = py + EYE;
  for (const c of W.colliders) {
    if (top < c.min.y + 0.02 || py > c.max.y - 0.02) continue;
    if (c.max.y - py <= STEP_UP && c.max.y - py > 0) continue;
    const cx = Math.min(Math.max(px, c.min.x), c.max.x);
    const cz = Math.min(Math.max(pz, c.min.z), c.max.z);
    const dx = px - cx, dz = pz - cz;
    if (dx * dx + dz * dz < RADIUS * RADIUS * 0.7) return c.tag || 'untagged';
  }
  return null;
}

const fails = [];
let y = apt.y;                      // carried between legs: the deck is a floor too
let datum = apt.y;

function walk(name, pts) {
  const y0 = y;
  let last = null;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.05));
    for (let k = 1; k <= n; k++) {
      const t = k / n, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
      const f = W.floorAt(px, pz, y, STEP_UP);
      if (!f) { fails.push([name, `no floor at ${px.toFixed(2)}, ${pz.toFixed(2)} (from y=${y.toFixed(2)})`]); y = y0; return; }
      if (f.y - y > STEP_UP + 0.001) { fails.push([name, `step of ${(f.y - y).toFixed(2)} m at ${px.toFixed(2)}, ${pz.toFixed(2)}`]); y = y0; return; }
      const b = blocked(px, pz, f.y);
      if (b) { fails.push([name, `blocked by "${b}" at ${px.toFixed(2)}, ${pz.toFixed(2)}`]); y = y0; return; }
      y = f.y; last = f;
    }
  }
  console.log(`  \u2713 ${name}  (ends on ${last.surface} at y=${(y - datum).toFixed(2)} above the floor)`);
}

const X = 0, Z = 0;
console.log('apartment, walked in one go');
walk('in at the door', [[X + 1.9, Z + 1.45], [X + 1.9, Z + 0.3]]);
walk('over to the alcove', [[X + 1.9, Z + 0.3], [X + 2.5, Z - 0.3], [X + 3.4, Z - 0.55]]);
walk('down the side of the bed to the window', [[X + 3.4, Z - 0.55], [X + 4.6, Z - 0.85], [X + 4.85, Z - 0.85]]);
walk('back out and round to the kitchen', [[X + 4.85, Z - 0.85], [X + 3.2, Z - 0.6], [X + 1.8, Z - 0.2], [X + 0.5, Z - 0.6], [X - 0.2, Z - 1.05], [X - 1.6, Z - 1.02]]);
walk('past the table to the foot of the stair', [[X - 1.6, Z - 1.02], [X - 1.85, Z + 0.9], [X - 2.5, Z + 1.35]]);
walk('up the stair', [[X - 2.5, Z + 1.35], [X - 2.53, Z - 1.55]]);
walk('off the landing onto the deck', [[X - 2.53, Z - 1.55], [X - 1.95, Z - 1.4], [X - 1.9, Z - 1.0]]);
walk('across the deck to the chair', [[X - 1.9, Z - 1.2], [X - 1.7, Z - 0.45], [X - 0.4, Z - 0.6], [X + 0.6, Z - 0.62]]);
walk('back down again', [[X + 0.6, Z - 0.62], [X - 0.4, Z - 0.6], [X - 1.7, Z - 0.45], [X - 1.9, Z - 1.35], [X - 2.5, Z - 1.5], [X - 2.53, Z + 1.35], [X - 2.0, Z + 1.3]]);
walk('and up to the bathroom door', [[X - 2.0, Z + 1.3], [X + 0.6, Z + 1.15], [X + 1.9, Z + 0.9], [X + 2.15, Z - 1.4]]);

// the deck must not be somewhere you can walk off
console.log('deck edges');
const edge = (name, px, pz) => {
  const b = blocked(px, pz, apt.loft.y);
  console.log(b ? `  ✓ ${name} is fenced (${b})` : `  ✗ ${name} is OPEN`);
  if (!b) fails.push(['deck edge', name]);
};
edge('south edge', X - 0.5, apt.loft.z1 - 0.06);
edge('east edge', apt.loft.x1 - 0.06, Z - 0.6);
edge('stairwell edge', apt.loft.x0 + 0.06, Z + 0.2);

/* ============================================================
   Ridge Road, and the two doors on the far side of it that open.

   The row opposite is one continuous collider except where
   loc_row cuts its two shops into it, so this is the only thing
   that can tell the difference between a door and a hole in a
   wall that happens to have a door drawn on it. It crosses the
   road, goes in at both, and comes out through the back room.
   ============================================================ */
const scene2 = new THREE.Scene();
const street = new World(scene2);
const block = buildRidgeBlock(street, { x: 0, y: 0, z: 0, night: true, life: false, shopsOpen: true });
const shops = block.refs.shops;
W = street; y = 0; datum = 0;

console.log('\nridge road, across the street');
for (const id of ['cleaners', 'realty']) {
  const s = shops[id];
  const dx = s.refs.doorX;
  // the leaf itself is a collider, so it has to be out of the way first
  s.refs.door.setOpen(true, { instant: true, quiet: true });
  const back = (s.frontZ1 + s.inZ1) / 2;
  const aside = id === 'cleaners' ? s.x - 1.6 : s.x + 1.8;   // the back doorway
  const cross = id === 'cleaners' ? -6.0 : 9.6;              // a gap in the parked cars, and Jared's own
  console.log(`  ${s.name}, door at x=${dx.toFixed(2)}`);
  // out of the shop door at 118 1/2, along the near pavement, round the
  // parked cars, over the road, and along the far pavement to the door
  walk(`${id}: along the near pavement and over the road`,
    [[dx, 7.4], [cross, 7.4], [cross, 12.0], [cross, 19.0], [cross, 24.4], [dx, 24.4], [dx, 25.5]]);
  walk(`${id}: in over the threshold`, [[dx, 25.5], [dx, 27.2]]);
  walk(`${id}: down the shop and round the end of the counter`,
    [[dx, 27.2], [dx, 30.8], [aside, 31.6], [aside, s.frontZ1 - 0.45]]);
  walk(`${id}: through into the back room`,
    [[aside, s.frontZ1 - 0.45], [aside, s.frontZ1 + 0.5], [aside + 0.9, back], [aside + 0.9, s.inZ1 - 0.8]]);
  walk(`${id}: and back out onto the pavement`,
    [[aside + 0.9, s.inZ1 - 0.8], [aside + 0.9, back], [aside, s.frontZ1 + 0.5], [aside, s.frontZ1 - 0.45],
     [aside, 31.6], [dx, 30.8], [dx, 27.2], [dx, 25.2], [dx, 24.3]]);
}

// the row either side of them still has to be a wall
console.log('the row is still solid where there is no door');
const solidAt = (name, px) => {
  const b = blocked(px, 26.6, 0);
  console.log(b ? `  ✓ ${name} is solid (${b})` : `  ✗ ${name} is OPEN`);
  if (!b) fails.push(['row', name]);
};
solidAt('west of the cleaners', shops.cleaners.x - shops.cleaners.W / 2 - 2.0);
solidAt('between the two shops', 0);
solidAt('east of the realty', shops.realty.x + shops.realty.W / 2 + 2.0);

/* ============================================================
   Chapter One's route, which is the one the player actually
   walks, and every metre of it is new: the pavement at the foot
   of the outside stair, up sixteen steps, in at the hall door,
   in at his own door, and then back down and east and west to
   the two shopfronts the chapter cuts into the near row.

   A diner behind a terrace with no gap in it is a diner you can
   see the sign of and never reach, and it looks exactly the
   same from the pavement as one you can.
   ============================================================ */
const scene3 = new THREE.Scene();
const town = new World(scene3);
const DINER_X = 21, PAWN_X = -19;
const block1 = buildRidgeBlock(town, {
  x: 0, y: 0, z: 0, night: false, life: false,
  nearGaps: [[DINER_X - 5.8, DINER_X + 5.8], [PAWN_X - 4.4, PAWN_X + 4.4]]
});
const apt1 = buildApartment(town, { x: 0, y: 3.0, z: 0, boxes: false, lightsOn: true, hall: true });
buildLaundromat(town, { x: 0, y: 0, z: 0 });
const diner1 = buildDiner(town, { x: DINER_X, y: 0, z: 0.5 });
const pawn1 = buildPawn(town, { x: PAWN_X, y: 0, z: 1.0 });
W = town; y = 0; datum = 0;

console.log('\nchapter one, the move-in route');
const foot = block1.refs.stairFoot, land = block1.refs.landing;
apt1.hall.refs.outerDoor.setOpen(true, { instant: true, quiet: true });
apt1.refs.doorway.setOpen(true, { instant: true, quiet: true });
diner1.refs.door.setOpen(true, { instant: true, quiet: true });
pawn1.refs.door.setOpen(true, { instant: true, quiet: true });
walk('from the tailgate to the boxes on the pavement',
  [[3.0, 11.0], [3.9, 9.6], [4.6, 9.25]]);
walk('and along to the foot of the stair',
  [[4.6, 9.25], [5.6, 9.2], [foot.x, 9.15], [foot.x, foot.z - 0.2]]);
walk('up the outside stair', [[foot.x, foot.z - 0.2], [land.x, land.z + 0.6]]);
walk('across the landing and in at the hall door',
  [[land.x, land.z + 0.6], [land.x, land.z], [land.x - 1.4, land.z]]);
walk('down the hall to his own door', [[land.x - 1.4, land.z], [1.9, land.z]]);
walk('in at his own door and put the box down', [[1.9, land.z], [1.9, 1.45], [-0.9, 1.15]]);

// and back down, and out, and down the hill to the two open doors
walk('back out and down the stair',
  [[-0.9, 1.15], [1.9, 1.45], [1.9, land.z], [land.x - 1.4, land.z], [land.x, land.z],
   [land.x, land.z + 0.6], [foot.x, foot.z - 0.2], [foot.x, 8.7]]);
// the pavement is walked in front of the furniture, not through it: the
// meters, trees and benches all sit in the two metres nearest the kerb
walk('east along the pavement to the diner door',
  [[foot.x, 8.6], [8.2, 8.9], [10, 6.3], [DINER_X + 4.3, 6.3], [DINER_X + 4.3, 5.2]]);
walk('in at the diner', [[DINER_X + 4.3, 5.2], [DINER_X + 4.3, 3.4], [DINER_X + 4.0, 1.4]]);
walk('along the front of the stools to the register',
  [[DINER_X + 4.0, 1.4], [DINER_X + 2.6, 1.0], [DINER_X - 0.4, 1.0]]);
walk('back out and west, past his own front door, to the pawn shop',
  [[DINER_X - 0.4, 1.0], [DINER_X + 4.0, 1.4], [DINER_X + 4.3, 3.4], [DINER_X + 4.3, 5.2], [DINER_X + 4.3, 7.4],
   [DINER_X + 4.3, 6.3], [10, 6.3], [8.2, 8.9], [foot.x, 9.0], [5.2, 8.9], [5.0, 7.6], [2.0, 6.6],
   [PAWN_X + 2.6, 6.3], [PAWN_X - 2.6, 6.3], [PAWN_X - 2.6, 5.2]]);
walk('in at the pawn shop', [[PAWN_X - 2.6, 5.2], [PAWN_X - 2.6, 3.2], [PAWN_X - 2.6, 1.6]]);
walk('along the glass cases', [[PAWN_X - 2.6, 1.6], [PAWN_X, 1.2], [PAWN_X + 2.4, 1.2]]);

// and the row either side of the two gaps still has to be a wall
console.log('the near row is still solid where there is no shop');
const nearSolid = (name, px) => {
  const b = blocked(px, 4.4, 0);
  console.log(b ? `  ✓ ${name} is solid (${b})` : `  ✗ ${name} is OPEN`);
  if (!b) fails.push(['near row', name]);
};
nearSolid('east of the diner', DINER_X + 8.5);
nearSolid('between the block and the diner', 13.0);
nearSolid('west of the pawn shop', PAWN_X - 7.5);

console.log(fails.length ? `\n${fails.length} FAILURE(S)` : '\nall routes walkable');
fails.forEach(([n, m]) => console.log(`  ✗ ${n}: ${m}`));
if (fails.length) Deno.exit(1);
