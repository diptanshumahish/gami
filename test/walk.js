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

console.log(fails.length ? `\n${fails.length} FAILURE(S)` : '\nall routes walkable');
fails.forEach(([n, m]) => console.log(`  ✗ ${n}: ${m}`));
if (fails.length) Deno.exit(1);
