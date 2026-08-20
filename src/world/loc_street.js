/* ============================================================
   loc_street.js: the block of Ridge Road outside 118½, the
   exterior stair, and the façade shells that make Ashgrove read
   as a town without modelling one.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, tiled } from './mat.js';
import { SCALE, BOX, CYL, SPH, PLN } from './world.js';
import { buildStreetlights } from './streetlights.js';
import { buildTerrace, buildBackdrop, utilityPole, streetTree, parkingMeter, bench, parkedCar } from './facades.js';
import { buildStreetLife } from './life.js';
import { makeDoor } from './door.js';
import { buildRowShops, ROW_GAPS } from './loc_row.js';

/**
 * 118 Ridge Rd, in numbers, because three files have to agree about it:
 * the shell, the upstairs hall inside it, and the stair up the side.
 * The hall's outside door and the top of the stair are the same doorway
 * seen from two rooms, so both of them read `hallZ` and `aptY` from here.
 */
export const RIDGE = {
  BW: 11, BD: 9, BH: 7.4,
  aptY: 3.0,                    // apartment floor, hall floor, stair landing
  hallZ: 3.175,                 // centre line of the hall and its outside door
  hallD: 2.35, hallX0: -3.35, hallX1: 5.35,
  landingX: 6.45, landingW: 1.9, landingD: 1.8,
  stairW: 1.3, stairRun: 4.8, stairSteps: 16,
  shopX: -0.8, shopW: 6.8,      // the Wash-Rite shopfront in the front wall
  shopDoorX: -3.0,              // the laundromat entrance, in that shopfront
  shellX1: 5.35,                // inner face of the east shell wall
  alcoveZ: 0, alcoveW: 2.6      // the bed alcove that reaches it, and its window
};

/**
 * The two-storey brick building at 118 Ridge Rd: laundromat at
 * street level, Jared's one room above it, exterior stair up the
 * side with an iron rail that always has a little frost on it.
 *
 * Interior origin convention: the apartment sits at
 * (x, y+3.0, z) and the laundromat at (x, y, z).
 */
export function buildRidgeBlock(world, {
  x = 0, y = 0, z = 0, winter = false, night = true, snow = false, life = true,
  shops = true, shopsOpen = false
} = {}) {
  const h = { refs: {} };
  const groundMat = snow ? MAT.snow : MAT.asphalt;
  const walkSurface = snow ? 'snow' : 'concrete';
  // How far the made ground runs each way before the backdrop takes over.
  // It used to be 60 m, which is exactly as far as you can see down Ridge
  // Road on a clear afternoon, so the road ended in mid-air. Then it was
  // 100, and the row on it was 104 long, and the seam simply moved out to
  // where the haze had not got to it yet. At 150 the modelled street runs
  // out to the point the fog is already doing half the work, and the
  // backdrop takes the rest.
  const RUN = 150, HALF = RUN / 2;

  // ---------------------------------------------------------- ground
  // The pavement starts at the front wall. It used to run six metres back
  // under the building and win the floor query inside the laundromat, so
  // the lino sounded like gravel underfoot.
  // Pavement from the front wall out to the kerb, and the road beyond it.
  // This used to be one 21 m slab of concrete with the asphalt registered
  // 2 cm UNDERNEATH it, so the road was never drawn at all: the street was
  // sixty metres of sidewalk with a kerb lying on top of it.
  // The near pavement used to be 11.6 m deep. That is not a sidewalk, it
  // is a plaza, and standing on it made the buildings read as scenery on
  // the far side of a car park. 5.4 m is a generous main-street walk; the
  // width it gave up goes to the road, which now has room for a parking
  // lane each side and still two lanes down the middle.
  const KERB_Z = z + 9.4;
  const walkD = KERB_Z - (z + 4);
  world.floor(x, z + 4 + walkD / 2, RUN, walkD, { y, surface: walkSurface, mat: snow ? MAT.snow : MAT.sidewalk });
  // and a strip up the east side, for the foot of the stair. It starts at
  // the outside face of the brick: it used to run 0.85 m in under the
  // building and fight the laundromat's own floor for the same pixels.
  // It also stops where the pavement proper begins, instead of lying on
  // top of it for five metres and fighting it for the same pixels.
  const sideX0 = x + RIDGE.BW / 2 + 0.15, sideW = 5.05;
  world.floor(sideX0 + sideW / 2, z + 2.0, sideW, 4.0, { y, surface: walkSurface, mat: snow ? MAT.snow : MAT.sidewalk });
  // the road itself, from the kerb to the far pavement
  const FAR_KERB_Z = z + 23.0;
  const roadD = FAR_KERB_Z - KERB_Z, roadZ = KERB_Z + roadD / 2;
  world.floor(x, roadZ, RUN, roadD, { y, surface: snow ? 'slush' : 'asphalt', mat: snow ? MAT.snow : MAT.asphalt });
  // and the far pavement, under the row across the street. It used to be
  // 1.4 m of concrete with four boxes standing on the edge of it; a
  // sidewalk you cannot stand two people on is a kerb with delusions.
  const FAR_KERB = FAR_KERB_Z, FAR_Z = z + 25.8;
  world.floor(x, (FAR_KERB + FAR_Z) / 2, RUN, FAR_Z - FAR_KERB, { y, surface: walkSurface, mat: snow ? MAT.snow : MAT.sidewalk });
  if (!snow) roadMarkings(world, x, y, z, roadZ, KERB_Z, FAR_KERB_Z, RUN);

  // ---------------------------------------------------------- the building shell
  const BW = 11, BD = 9, BH = 7.4;
  // Build the shell as four walls so the interiors are reachable.
  // The front (south, +Z) carries the Wash-Rite shopfront: two brick
  // piers, a spandrel over the glass, and a hole you can actually walk
  // through. It used to be eleven metres of unbroken brick with a
  // laundromat sealed behind it.
  const shopL = x + RIDGE.shopX - RIDGE.shopW / 2;
  const shopR = x + RIDGE.shopX + RIDGE.shopW / 2;
  const pierL = shopL - (x - BW / 2), pierR = (x + BW / 2) - shopR;
  if (pierL > 0.05) world.wall(x - BW / 2 + pierL / 2, z + BD / 2, pierL, { axis: 'x', h: BH, y, thick: 0.3, mat: MAT.brick, collide: false });
  if (pierR > 0.05) world.wall(x + BW / 2 - pierR / 2, z + BD / 2, pierR, { axis: 'x', h: BH, y, thick: 0.3, mat: MAT.brick, collide: false });
  world.wall(x + RIDGE.shopX, z + BD / 2, RIDGE.shopW, { axis: 'x', h: BH - 2.62, y: y + 2.62, thick: 0.3, mat: MAT.brick, collide: false });
  // the piers are the only part of the front that stops you
  if (pierL > 0.05) world.collide(x - BW / 2 + pierL / 2, y, z + BD / 2, pierL, 3.2, 0.34, 'front');
  if (pierR > 0.05) world.collide(x + BW / 2 - pierR / 2, y, z + BD / 2, pierR, 3.2, 0.34, 'front');
  world.wall(x, z - BD / 2, BW, { axis: 'x', h: BH, y, thick: 0.3, mat: MAT.brick, collide: false });
  world.wall(x - BW / 2, z, BD, { axis: 'z', h: BH, y, thick: 0.3, mat: MAT.brick, collide: false });
  // The east face carries the hall's outside door, three metres up at the
  // top of the stair. It used to be an unbroken slab of brick across that
  // opening: the door swung back onto a brick wall, and because the shell
  // does not collide you then walked through the brick and arrived on the
  // landing. Cut the hole, and the 0.3 m of brick becomes its reveal.
  // It also carries the window at the end of Jared's bed alcove, which
  // looked into a sealed two-metre void before there was a hole here.
  const eastSeg = (cz, len, y0, h2) => {
    if (len < 0.02 || h2 < 0.02) return;
    world.wall(x + BW / 2, cz, len, { axis: 'z', h: h2, y: y0, thick: 0.3, mat: MAT.brick, collide: false });
  };
  const holes = [
    { z0: z + RIDGE.hallZ - 0.67, z1: z + RIDGE.hallZ + 0.67,
      y0: y + RIDGE.aptY - 0.02, y1: y + RIDGE.aptY + 2.20 },        // the hall's outside door
    { z0: z + RIDGE.alcoveZ - 0.82, z1: z + RIDGE.alcoveZ + 0.82,
      y0: y + RIDGE.aptY + 0.72, y1: y + RIDGE.aptY + 2.20 }         // the alcove window
  ].sort((a, b) => a.z0 - b.z0);
  let cursor = z - BD / 2;
  holes.forEach(hl => {
    if (hl.z0 - cursor > 0.02) eastSeg((cursor + hl.z0) / 2, hl.z0 - cursor, y, BH);
    const cz = (hl.z0 + hl.z1) / 2, len = hl.z1 - hl.z0;
    eastSeg(cz, len, y, hl.y0 - y);
    eastSeg(cz, len, hl.y1, y + BH - hl.y1);
    cursor = hl.z1;
  });
  if (z + BD / 2 - cursor > 0.02) eastSeg((cursor + z + BD / 2) / 2, z + BD / 2 - cursor, y, BH);
  // parapet + roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.4, 0.3, BD + 0.4), flat(0x2e2b28, { rough: .95 }));
  roof.position.set(x, y + BH + 0.15, z); world.add(roof);

  // WASH-RITE sign
  const sign = signBoard('WASH-RITE', 3.4, 0.62, '#E7F2E4', '#1a2a1e');
  sign.position.set(x + 1.2, y + 3.35, z + BD / 2 + 0.18);
  world.add(sign);
  // The sign has to light its own brick. At night a moon puts about a
  // seventh as much on a vertical wall as it puts on the pavement, so
  // without this the façade is a black hole with a lit sign floating on it.
  const signLight = world.bulb(x + 1.2, y + 3.72, z + BD / 2 + 0.75, { color: 0xE7F2E4, intensity: night ? 3.6 : 0, dist: 9.5, emissive: false });
  h.refs.signLight = signLight;

  const sign2 = signBoard('118½', 0.6, 0.34, '#2a2520', '#d8d2c4');
  sign2.position.set(x - 4.85, y + 3.1, z + BD / 2 + 0.18);
  world.add(sign2);

  // ---------------------------------------------------------- the entrance
  // Coming out of the Wash-Rite used to put you flat against seven metres
  // of blank brick with nothing in between, which reads as being deposited
  // on the street rather than leaving a building. So: an awning to walk
  // out under, a step to walk down, a mat, and a blade sign at eye level.
  const FZ = z + BD / 2;
  const awnW = RIDGE.shopW + 0.5, awnProj = 1.25;
  const awnBackY = y + 3.02, awnFrontY = y + 2.46;
  const awnMat = tiled(MAT.awning, awnW, 1.4);
  const canopy = new THREE.Mesh(BOX(awnW, 0.05, Math.hypot(awnProj, awnBackY - awnFrontY)), awnMat);
  canopy.position.set(x + RIDGE.shopX, (awnBackY + awnFrontY) / 2, FZ + awnProj / 2 + 0.06);
  canopy.rotation.x = Math.atan2(awnBackY - awnFrontY, awnProj);
  canopy.castShadow = true; canopy.receiveShadow = true;
  world.add(canopy);
  // the valance that hangs off the front edge
  const valance = new THREE.Mesh(BOX(awnW, 0.24, 0.04), awnMat);
  valance.position.set(x + RIDGE.shopX, awnFrontY - 0.12, FZ + awnProj + 0.06);
  valance.castShadow = true; world.add(valance);
  // the struts under it. The ends are open, the way a shop awning's are.
  const awnTilt = Math.atan2(awnBackY - awnFrontY, awnProj);
  [-1, 1].forEach(sgn => {
    const strut = new THREE.Mesh(CYL(0.022, 0.022, awnProj + 0.12, 8), flat(0x53504a, { rough: .5, metal: .6 }));
    strut.rotation.x = Math.PI / 2 - awnTilt;
    strut.position.set(x + RIDGE.shopX + sgn * (awnW / 2 - 0.1), (awnBackY + awnFrontY) / 2 - 0.03, FZ + awnProj / 2 + 0.06);
    world.add(strut);
  });

  // A projecting sign, because the point of one is that you can read it
  // from up the street rather than only from directly in front of the shop.
  // Everything here hangs off WALL_Z, the OUTER face of the shell. Measuring
  // it from FZ instead put half the board inside the brick, and the half
  // that came out the other side hung in the upstairs hall.
  const WALL_Z = FZ + 0.15;
  const bx = x + RIDGE.shopX + RIDGE.shopW / 2 + 0.72;
  const bladeMid = WALL_Z + 0.68;
  const plate = new THREE.Mesh(BOX(0.16, 0.34, 0.05), flat(0x53504a, { rough: .5, metal: .6 }));
  plate.position.set(bx, y + 4.44, WALL_Z + 0.025);
  world.add(plate);
  const bladeArm = new THREE.Mesh(BOX(0.05, 0.05, 1.3), flat(0x53504a, { rough: .5, metal: .6 }));
  bladeArm.position.set(bx, y + 4.46, WALL_Z + 0.65);
  bladeArm.castShadow = true; world.add(bladeArm);
  [bladeMid - 0.5, bladeMid + 0.5].forEach(hz => {
    const hang = new THREE.Mesh(BOX(0.035, 0.2, 0.035), flat(0x53504a, { rough: .5, metal: .6 }));
    hang.position.set(bx, y + 4.34, hz);
    world.add(hang);
  });
  [-1, 1].forEach(face => {
    const b = signBoard('LAUNDRY', 1.15, 0.5, '#E8A653', '#1a1512');
    b.position.set(bx + face * 0.02, y + 3.99, bladeMid);
    b.rotation.y = face * Math.PI / 2;
    b.castShadow = true;
    world.add(b);
  });

  // the step down off the threshold, and the mat on it
  const stoop = new THREE.Mesh(BOX(1.9, 0.1, 0.62), tiled(MAT.concrete, 1.9, 0.62));
  stoop.position.set(x + RIDGE.shopDoorX, y + 0.05, FZ + 0.33);
  stoop.receiveShadow = true; world.add(stoop);
  world.floor(x + RIDGE.shopDoorX, FZ + 0.33, 1.9, 0.62, { y: y + 0.1, surface: walkSurface, mat: MAT.concrete });
  const mat = new THREE.Mesh(BOX(0.86, 0.03, 0.46), flat(0x2a2724, { rough: .98 }));
  mat.position.set(x + RIDGE.shopDoorX, y + 0.115, FZ + 0.34);
  world.add(mat);

  // A bulkhead over the shop door, under the awning. Stepping out of a lit
  // laundromat into an unlit street reads as walking into a hole in the
  // world, and the first thing anybody does after the wash is come out here.
  const dlx = x + RIDGE.shopDoorX, dlz = FZ + 0.16;
  const bulkhead = new THREE.Mesh(BOX(0.34, 0.16, 0.16), flat(0x2f3336, { rough: .6, metal: .3 }));
  bulkhead.position.set(dlx, y + 2.42, dlz);
  world.add(bulkhead);
  const bulkGlass = new THREE.Mesh(BOX(0.26, 0.1, 0.03), new THREE.MeshBasicMaterial({ color: night ? 0xFFE9C4 : 0x2a2622 }));
  bulkGlass.position.set(dlx, y + 2.42, dlz + 0.09);
  world.add(bulkGlass);
  const doorLamp = world.bulb(dlx, y + 2.3, dlz + 0.2, {
    color: 0xFFD9A6, intensity: night ? 2.0 : 0, dist: 6.5, size: 0.03, emissive: false
  });
  h.refs.doorLamp = doorLamp;
  h.refs.doorLampGlass = bulkGlass;

  // ---------------------------------------------------------- exterior stair
  // Up the side of the building, iron rail, always a little frost on it.
  // It used to climb north while its landing sat at the south end, which
  // meant the top of the stair and the door were four metres apart and
  // the apartment could not be left at all.
  const sx = x + RIDGE.landingX;
  const landingY = y + RIDGE.aptY;
  const lz = z + RIDGE.hallZ;
  const landZ1 = lz + RIDGE.landingD / 2;              // the south lip, where the stair starts

  // reaches 0.3 m back past the wall line so it overlaps the hall floor;
  // a seam with no floor rect in it is a doorway you cannot step through
  world.floor(sx - 0.15, lz, RIDGE.landingW + 0.3, RIDGE.landingD, { y: landingY, surface: 'metal', mat: MAT.metal });
  const deck = new THREE.Mesh(BOX(RIDGE.landingW + 0.1, 0.06, RIDGE.landingD + 0.1), flat(0x4a4a48, { rough: .6, metal: .5 }));
  deck.position.set(sx, landingY - 0.03, lz);
  deck.castShadow = true; deck.receiveShadow = true;
  world.add(deck);

  const stairMidZ = landZ1 + RIDGE.stairRun / 2;
  world.stairs(sx, stairMidZ, RIDGE.stairW, RIDGE.stairRun, RIDGE.stairSteps, {
    axis: 'z', y, dir: -1, surface: 'metal', mat: MAT.metal, rise: RIDGE.aptY / RIDGE.stairSteps
  });

  // Stringer under the treads, so the stair has a bottom.
  // The sign here is load-bearing. `world.stairs` is built with dir -1,
  // so the treads climb towards -Z; the stringer and both rails were
  // rotated the other way and climbed towards +Z, which put a second,
  // mirrored stair through the first one and out the front of the
  // building. That X over the side of 118 1/2 was this.
  const stairTilt = Math.atan2(RIDGE.aptY, RIDGE.stairRun);
  [-1, 1].forEach(sd => {
    const st = new THREE.Mesh(BOX(0.07, 0.34, RIDGE.stairRun + 0.4), flat(0x3d3d3b, { rough: .7, metal: .5 }));
    st.position.set(sx + sd * (RIDGE.stairW / 2 + 0.04), y + RIDGE.aptY / 2 - 0.1, stairMidZ);
    st.rotation.x = stairTilt;
    st.castShadow = true; world.add(st);
  });

  const railMat = flat(0x4a4a48, { rough: .55, metal: .6 });
  const railH = 1.02;
  const N = RIDGE.stairSteps;
  [-1, 1].forEach(sd => {
    for (let i = 0; i <= N; i += 2) {
      const t = i / N;
      const pz = landZ1 + t * RIDGE.stairRun;
      const py = y + (1 - t) * RIDGE.aptY;
      const post = new THREE.Mesh(CYL(0.019, 0.019, railH, 5), railMat);
      post.position.set(sx + sd * (RIDGE.stairW / 2 + 0.05), py + railH / 2, pz);
      post.castShadow = true; world.add(post);
    }
    const run = Math.hypot(RIDGE.stairRun, RIDGE.aptY) + 0.1;
    const rail = new THREE.Mesh(BOX(0.05, 0.05, run), railMat);
    rail.position.set(sx + sd * (RIDGE.stairW / 2 + 0.05), y + RIDGE.aptY / 2 + railH, stairMidZ);
    rail.rotation.x = stairTilt;
    rail.castShadow = true; world.add(rail);
    if (sd === 1) {
      // the frost. it is on the outside rail, which is the one you hold.
      const frost = new THREE.Mesh(BOX(0.055, 0.012, run), flat(0xdce8f2, { rough: .55, emissive: 0x223040, ei: .3 }));
      frost.position.copy(rail.position); frost.position.y += 0.032;
      frost.rotation.copy(rail.rotation);
      world.add(frost);
      h.refs.frost = frost;
      h.refs.rail = rail;
    }
    // and the same rail down the outside of the landing. Only the outside:
    // the other side of it is the wall the door is in.
    if (sd === 1) {
      const lr = new THREE.Mesh(BOX(0.05, 0.05, RIDGE.landingD), railMat);
      lr.position.set(sx + RIDGE.landingW / 2 + 0.02, landingY + railH, lz);
      world.add(lr);
      for (let i = 0; i <= 2; i++) {
        const post = new THREE.Mesh(CYL(0.019, 0.019, railH, 5), railMat);
        post.position.set(sx + RIDGE.landingW / 2 + 0.02, landingY + railH / 2, lz - RIDGE.landingD / 2 + i * RIDGE.landingD / 2);
        world.add(post);
      }
    }
  });
  // the landing's north end is closed off
  const endRail = new THREE.Mesh(BOX(RIDGE.landingW, 0.05, 0.05), railMat);
  endRail.position.set(sx, landingY + railH, lz - RIDGE.landingD / 2);
  world.add(endRail);

  // you cannot walk off the side of either the stair or the landing
  world.collide(sx - RIDGE.stairW / 2 - 0.08, y, stairMidZ, 0.1, RIDGE.aptY + 1.2, RIDGE.stairRun, 'stairrail');
  world.collide(sx + RIDGE.stairW / 2 + 0.08, y, stairMidZ, 0.1, RIDGE.aptY + 1.2, RIDGE.stairRun, 'stairrail');
  world.collide(sx + RIDGE.landingW / 2 + 0.05, landingY, lz, 0.1, 1.1, RIDGE.landingD, 'stairrail');
  world.collide(sx, landingY, lz - RIDGE.landingD / 2 - 0.05, RIDGE.landingW, 1.1, 0.1, 'stairrail');

  // the landing IS the top of the stair, and the hall door opens onto it.
  // loc_home builds that door itself, in the hall's east wall.
  h.refs.landing = { x: sx, y: landingY, z: lz };
  h.refs.stairFoot = { x: sx, y, z: landZ1 + RIDGE.stairRun };
  // a position-only stand-in: chapters used to measure the landing scene
  // off the old door mesh and there is no reason to make them stop.
  h.refs.aptDoor = { position: new THREE.Vector3(x + RIDGE.hallX1, landingY, lz) };
  const aptLight = world.bulb(sx - 0.55, landingY + 2.15, lz, { color: 0xFFC58A, intensity: night ? 1.1 : 0, dist: 4.5, size: 0.03 });
  h.refs.aptLight = aptLight;
  const hood = new THREE.Mesh(CYL(0.1, 0.14, 0.09, 8), flat(0x2a2b2d, { rough: .7 }));
  hood.position.set(sx - 0.55, landingY + 2.24, lz); world.add(hood);

  // a number on the jamb, because 118 1/2 is the whole joke of the address
  const numb = signBoard('118½', 0.34, 0.2, '#2a2520', '#d8d2c4');
  numb.position.set(x + RIDGE.hallX1 + 0.1, landingY + 1.75, lz + 0.74);
  numb.rotation.y = Math.PI / 2;
  world.add(numb);

  // ---------------------------------------------------------- the far side
  // The row opposite. It used to be four detached boxes with six squares
  // painted on each, standing on the edge of a kerb with a fifty-metre
  // gap between them and the next thing that existed. An anthracite town
  // is not built out of detached boxes: it is one continuous wall of
  // party-wall brick with a shopfront cut out of the bottom of every
  // twenty feet of it and somebody living over the top.
  // Two of the units in it are not painted glass: loc_row builds a real
  // dry cleaner's and a real realty office in the holes left here, with
  // floors and back rooms and doors that open. The row is told to leave
  // the ground for them rather than the other way round, because the
  // widths it picks are random and their addresses are not.
  h.refs.terrace = buildTerrace(world, {
    x, y, z: FAR_Z, from: -HALF - 1, to: HALF + 1, facing: -1, depth: 11,
    night, snow, seed: 1207, lights: night ? 3 : 0,
    gaps: shops ? ROW_GAPS : []
  });
  if (shops) h.refs.shops = buildRowShops(world, { x, y, z: FAR_Z, night, snow, locked: !shopsOpen });

  // the far kerb, so the row is standing on a street and not on a plane
  const fkerb = new THREE.Mesh(new THREE.BoxGeometry(RUN, 0.14, 0.3), tiled(MAT.concrete, RUN, 0.3));
  fkerb.position.set(x, y + 0.07, FAR_KERB); world.add(fkerb);

  // ---------------------------------------------------------- the near side
  // 118 1/2 has neighbours. It is a mid-block building, not a monument:
  // it shares a party wall with whatever is west of it, and east of it
  // there is the side yard the stair comes down into and then the next
  // row. The gap is where the stair lives and it has to stay a gap.
  h.refs.neighbours = buildTerrace(world, {
    x, y, z: z + BD / 2, from: -HALF - 1, to: HALF + 1, facing: 1, depth: 9,
    night, snow, seed: 883, nameFrom: 6, lights: night ? 2 : 0,
    gaps: [[-BW / 2 - 0.25, RIDGE.landingX + 5.0]]
  });

  // ---------------------------------------------------------- the wires
  // Poles down the far side with the span sagging between them. Looking
  // up from the pavement and seeing nothing at all is the single fastest
  // way to notice a street is a set.
  const poleZ = FAR_KERB - 0.55;
  const POLES = [-72, -48, -24, 0, 24, 48, 72];
  POLES.forEach((px, i) => {
    const nxt = POLES[i + 1];
    utilityPole(world, x + px, y, poleZ, {
      h: 9.4, transformer: i % 2 === 0,
      to: nxt === undefined ? null : { x: x + nxt, z: poleZ }
    });
    world.collide(x + px, y, poleZ, 0.4, 9.4, 0.4, 'pole');
  });

  // ---------------------------------------------------------- the horizon
  // and past all of it: the ground, the rest of the town, the treeline
  // and the two ridges Ashgrove sits in the bottom of.
  // The backdrop is hung off the building line, and the road is not on
  // it, so it is told where the carriageway actually is. It used to
  // guess, which put the far half of Ashgrove eight metres off the road
  // it was lining and let a house stand in the middle of Ridge Road.
  const BACK_Z = z + 8;
  h.refs.backdrop = buildBackdrop(world, {
    x, y, z: BACK_Z, night, snow, seed: 41,
    road: {
      z: roadZ - BACK_Z, half: roadD / 2,
      walkA: KERB_Z - (z + BD / 2), walkB: FAR_Z - FAR_KERB,
      from: HALF + 2, to: 240
    },
    ground: snow ? 0x9fb0bf : 0x2f3128,
    ridgeNear: snow ? 0x39434e : 0x2c3630,
    ridgeFar: snow ? 0x4d5966 : 0x44515c
  });

  // where the player is allowed to be. The far wall is the terrace's
  // own collision now, so crossing the road is a thing you can do.
  world.collide(x, y, z - BD / 2 - 0.3, RUN, 8, 0.6, 'backwall');
  world.collide(x - 34, y, z + 12, 0.6, 10, 46, 'edgeW');
  world.collide(x + 34, y, z + 12, 0.6, 10, 46, 'edgeE');

  // ---------------------------------------------------------- street furniture
  // Ridge Road runs along X here, and so, now, do its streetlights. They
  // used to be built along Z from a point in the middle of the road, which
  // marched four of them straight through the building: one stood in the
  // laundromat and one stood in the back yard.
  const sl = buildStreetlights(world, {
    origin: new THREE.Vector3(x - 66, y, KERB_Z + 4.3), spacing: 12, drop: 0,
    count: 12, road: false, realLights: night ? 4 : 0, halos: night,
    alternate: false, side1: -1
  });
  sl.g.rotation.y = -Math.PI / 2;      // the run recedes along +X
  if (!night) {
    // a sodium lamp in the afternoon is a cold grey lens, not an ember
    sl.poles.forEach(p => {
      p.lamp.material.color.setHex(0x6d6a62);
      p.halo.material.opacity = 0;
      p.pool.material.opacity = 0;
      if (p.pl) p.pl.intensity = 0;
    });
  }
  h.refs.streetlights = sl;

  // kerb
  const kerb = new THREE.Mesh(new THREE.BoxGeometry(RUN, 0.14, 0.3), tiled(MAT.concrete, RUN, 0.3));
  kerb.position.set(x, y + 0.07, KERB_Z); world.add(kerb);

  // parked Volvo wagon. his father called it sensible.
  h.refs.volvo = volvo(world, x + 6.2, y, KERB_Z + 1.75, Math.PI / 2);

  // a hydrant, a bin, a bench, a newspaper box, small-town furniture
  const bin = new THREE.Mesh(CYL(0.28, 0.24, 0.85, 12), flat(0x3d4a3a, { rough: .8 }));
  bin.position.set(x - 5.4, y + 0.42, z + 8.3); bin.castShadow = true; world.add(bin);
  world.collide(x - 5.4, y, z + 8.3, 0.6, 0.9, 0.6, 'bin');

  const box = new THREE.Mesh(BOX(0.42, 1.05, 0.36), flat(0x8C2F26, { rough: .6 }));
  box.position.set(x + 4.2, y + 0.52, z + 8.5); box.castShadow = true; world.add(box);
  world.collide(x + 4.2, y, z + 8.5, 0.45, 1.1, 0.4, 'newsbox');
  h.refs.newsbox = box;

  // ---------------------------------------------------------- furniture
  // Eleven metres of pavement with a bin and a news box on it is not a
  // main street, it is a car park with a shop at one end. Meters, trees,
  // benches, and cars at the kerb both ways, kept clear of the shopfront
  // and of the foot of the stair.
  const furn = new THREE.Group();
  world.add(furn);
  const clearOf = (px) => px > x - 8.2 && px < x + 12.0;      // shop door + stair

  for (let i = -11; i <= 11; i++) {
    const px = x + i * 6.4 + 1.2;
    if (clearOf(px)) continue;
    parkingMeter(furn, px, y, KERB_Z - 0.7, Math.PI);
    world.collide(px, y, KERB_Z - 0.7, 0.26, 1.4, 0.26, 'meter');
  }
  [-25.5, -13.5, 15.5, 27.0].forEach((ox, i) => {
    const px = x + ox;
    streetTree(furn, px, y, KERB_Z - 1.7, 900 + i * 37, { winter, snow });
    world.collide(px, y, KERB_Z - 1.7, 0.8, 3.4, 0.8, 'tree');
  });
  [[-19.0, 0], [21.0, 0]].forEach(([ox, rot], i) => {
    bench(furn, x + ox, y, KERB_Z - 2.0, rot);
    world.collide(x + ox, y, KERB_Z - 2.0, 1.9, 0.95, 0.8, 'bench');
  });
  // the mailbox, which in this town is the one blue thing
  const mbox = new THREE.Mesh(BOX(0.62, 1.15, 0.5), flat(0x27437a, { rough: .55 }));
  mbox.position.set(x - 9.6, y + 0.58, KERB_Z - 0.9); mbox.castShadow = true; world.add(mbox);
  world.collide(x - 9.6, y, KERB_Z - 0.9, 0.66, 1.2, 0.55, 'mailbox');

  // Cars parallel-parked in the bays, which means nose ALONG the street.
  // They were built nose-first and dropped in at rotation zero, which
  // parked every one of them broadside across both lanes.
  [[-23.5, 17], [-12.0, 3106], [14.5, 88041], [25.5, 512]].forEach(([ox, sd]) => {
    parkedCar(furn, x + ox, y, KERB_Z + 1.75, Math.PI / 2, sd);
    world.collide(x + ox, y, KERB_Z + 1.75, 5.4, 1.5, 2.0, 'car');
  });
  [[-17.0, 9271], [1.5, 44], [20.0, 60318]].forEach(([ox, sd]) => {
    parkedCar(furn, x + ox, y, FAR_KERB_Z - 1.75, -Math.PI / 2, sd);
    world.collide(x + ox, y, FAR_KERB_Z - 1.75, 5.4, 1.5, 2.0, 'car');
  });

  if (snow) {
    // snow does not settle everywhere in this town, but here it does
    const drift = new THREE.Mesh(new THREE.BoxGeometry(RUN, 0.18, 1.4), tiled(MAT.snow, RUN, 1.4));
    drift.position.set(x, y + 0.09, KERB_Z - 0.6); world.add(drift);
  }

  // ---------------------------------------------------------- the town
  // People on the pavements, two or three of them stopped and talking,
  // and a car every so often. Chapters that want Ridge Road empty ask
  // for it: after Chapter Three the emptiness is the point, and a man
  // walking his dog past the laundromat at four in the morning would be
  // the wrong kind of company.
  if (life) {
    h.refs.life = buildStreetLife(world, {
      x, y, roadZ,
      nearWalk: KERB_Z - 2.6, farWalk: FAR_KERB_Z + 1.4,
      run: HALF - 4, night, winter,
      seed: 7, walkers: 9, pairs: 3, cars: 3,
      ...(life === true ? {} : life)
    });
  }

  return h;
}

/**
 * What makes a strip of asphalt read as a road rather than a grey
 * rectangle: a worn centre line, a sealed crack down the middle of the
 * lane, tar patches where the town has been at it with a shovel, a
 * manhole, and two gutter drains at the kerb.
 */
function roadMarkings(world, x, y, z, roadZ, kerbZ, farKerbZ, RUN = 100) {
  const lay = (w, d, px, pz, col, rough = 0.9, h = 0.004) => {
    const m = new THREE.Mesh(BOX(w, h, d), flat(col, { rough }));
    m.position.set(px, y + 0.002 + h / 2, pz);
    m.receiveShadow = true;
    world.add(m);
    return m;
  };

  // gutter: the half metre next to each kerb never dries out
  lay(RUN, 0.62, x, kerbZ + 0.46, 0x1b1e21, 0.55, 0.003);
  lay(RUN, 0.62, x, farKerbZ - 0.46, 0x1b1e21, 0.55, 0.003);

  // the parking lane, ticked off in bays that stopped being repainted
  // some time in the Bush administration
  const BAYS = Math.floor(RUN / 2 / 6.4);
  for (let i = -BAYS; i <= BAYS; i++) {
    lay(0.1, 2.3, x + i * 6.4 - 2.0, kerbZ + 1.6, 0xa2966a, 0.95);
    lay(0.1, 2.3, x + i * 6.4 + 1.6, farKerbZ - 1.6, 0xa2966a, 0.95);
  }
  lay(RUN, 0.1, x, kerbZ + 2.75, 0xa2966a, 0.95);
  lay(RUN, 0.1, x, farKerbZ - 2.75, 0xa2966a, 0.95);

  // centre line, dashed, and about forty years past repainting
  const DASH = Math.floor(RUN / 2 / 5.6);
  for (let i = -DASH; i <= DASH; i++) {
    const px = x + i * 5.6;
    lay(3.0, 0.12, px, roadZ, i % 3 === 0 ? 0x6f6438 : 0x8a7c46, 0.95);
  }
  // the crack down the near lane, sealed in tar and then cracked again
  for (let i = -9; i <= 9; i++) lay(4.4, 0.09, x + i * 4.6 + (i % 2) * 0.5, roadZ - 2.1, 0x131517, 0.7);

  // patches, where they dug it up and put it back badly
  [[-13.5, -1.4, 3.4, 2.2], [4.8, 1.9, 2.6, 1.7], [17.0, -2.6, 4.2, 2.0]]
    .forEach(([ox, oz, w, d]) => lay(w, d, x + ox, roadZ + oz, 0x181b1e, 0.86, 0.006));

  // manhole
  const mh = new THREE.Mesh(CYL(0.44, 0.44, 0.02, 18), flat(0x2b2723, { rough: .72, metal: .35 }));
  mh.position.set(x - 6.2, y + 0.012, roadZ + 0.9);
  world.add(mh);

  // two storm drains, set into the kerb line
  [-9.4, 8.2].forEach(ox => {
    const grate = new THREE.Mesh(BOX(0.72, 0.02, 0.34), flat(0x14161a, { rough: .6, metal: .4 }));
    grate.position.set(x + ox, y + 0.014, kerbZ + 0.3);
    world.add(grate);
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(BOX(0.66, 0.03, 0.035), flat(0x3a3d42, { rough: .5, metal: .6 }));
      bar.position.set(x + ox, y + 0.022, kerbZ + 0.18 + i * 0.06);
      world.add(bar);
    }
  });
}

/** Painted sign board. */
export function signBoard(text, w, hh, fg = '#E8A653', bg = '#1a1512', font = 'JetBrains Mono') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(64, Math.round(512 * hh / w));
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, c.width - 12, c.height - 12);
  g.fillStyle = fg;
  g.font = `bold ${Math.round(c.height * 0.46)}px "${font}", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), new THREE.MeshStandardMaterial({
    map: t, roughness: .8, emissive: new THREE.Color(fg), emissiveMap: t, emissiveIntensity: .35
  }));
  return m;
}

/**
 * 2006 Volvo V70. Sensible.
 *
 * A V70 is 4.71 long, 1.80 wide and 1.49 TALL, and this one used to be
 * 1.77 to the roof: taller than the man looking at it, with a beltline
 * at 1.08 and a greenhouse that read as a shed on a plinth. The numbers
 * below are the ones off the brochure, and everything else follows them.
 */
export function volvo(world, x, y, z, rot = 0, { doorsOpen = false } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  // metalness with no envmap renders black; see carBody in facades.js
  const paint = flat(0x53687d, { rough: .3, metal: .08 });
  const shade = flat(0x455767, { rough: .36, metal: .06 });
  const trimM = flat(0x26292c, { rough: .85 });
  const chrome = flat(0xb0b5b8, { rough: .35, metal: .12 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x2b3540, roughness: .1, transmission: .3, transparent: true, opacity: .72 });

  const L = 4.71, W = 1.80, SILL = 0.30, BELT = 0.96, ROOF = 1.49;
  const box = (w, h, d, px, py, pz, mat, rx = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz); if (rx) m.rotation.x = rx;
    g.add(m); return m;
  };

  // body from the sill to the beltline, with the sill tucked under it
  box(W, BELT - SILL, L, 0, (SILL + BELT) / 2, 0, paint);
  box(W - 0.10, 0.14, L - 1.5, 0, SILL - 0.03, 0, trimM);
  box(W + 0.015, 0.055, L - 0.36, 0, BELT - 0.02, 0, shade);
  // the bonnet, a step down from the wings
  box(W - 0.14, 0.055, 1.34, 0, BELT - 0.035, L / 2 - 0.72, shade);
  // shut lines, two doors a side
  [1, -1].forEach(sx => [0.22, -1.06].forEach(dz =>
    box(0.012, BELT - SILL - 0.14, 0.02, sx * (W / 2 + 0.004), (SILL + BELT) / 2, dz, trimM)));

  // the greenhouse: an estate, so the glass runs almost to the tailgate
  const cabD = 2.52, cabZ = -0.30, glassH = ROOF - BELT - 0.06;
  box(W - 0.19, glassH, cabD, 0, BELT + glassH / 2 + 0.01, cabZ, glassM);
  box(W - 0.27, 0.07, cabD + 0.04, 0, ROOF - 0.03, cabZ, paint);
  // A, B, C and D pillars. A rail down each side paints the windows out.
  [1, -1].forEach(sx => {
    [cabD / 2 - 0.05, cabD * 0.16, -cabD * 0.20, -cabD / 2 + 0.05].forEach(pz =>
      box(0.075, glassH, 0.10, sx * (W / 2 - 0.10), BELT + glassH / 2 + 0.01, cabZ + pz, paint));
    box(0.055, 0.05, cabD + 0.02, sx * (W / 2 - 0.105), ROOF - 0.09, cabZ, paint);
  });
  // the windscreen, raked from the corner of the roof down to the cowl.
  // +z is the nose, so it falls away towards +z: a POSITIVE rotation.
  const run = glassH * 1.25, screen = Math.hypot(run, glassH);
  box(W - 0.21, 0.075, screen + 0.04, 0, BELT + glassH / 2 + 0.01,
    cabZ + cabD / 2 + run / 2, paint, Math.atan2(glassH, run));
  box(W - 0.23, glassH - 0.03, 0.07, 0, BELT + glassH / 2, cabZ - cabD / 2 - 0.03, glassM);
  // roof rails, which every one of these has
  [1, -1].forEach(sx => box(0.05, 0.05, cabD * 0.86, sx * (W / 2 - 0.24), ROOF + 0.05, cabZ - 0.08, trimM));

  // bumpers and arch lips
  [1, -1].forEach(fz => box(W + 0.02, 0.20, 0.20, 0, SILL + 0.16, fz * (L / 2 - 0.05), chrome));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) =>
    box(0.055, 0.34, 1.02, sx * (W / 2 + 0.005), SILL + 0.14, sz * L * 0.30, trimM));

  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const wx = sx * (W / 2 - 0.085), wz = sz * L * 0.30;
    const w = new THREE.Mesh(CYL(0.33, 0.33, 0.21, 14), flat(0x141414, { rough: .95 }));
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.33, wz); g.add(w);
    const hub = new THREE.Mesh(CYL(0.185, 0.185, 0.23, 10), chrome);
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, 0.33, wz); g.add(hub);
  });
  [-1, 1].forEach(s => {
    box(0.38, 0.15, 0.05, s * 0.56, BELT - 0.20, L / 2 + 0.015, flat(0xd8d8d0, { rough: .15 }));
    // the tail lamps go UP the D-pillar, which is the one thing about a
    // Volvo estate that is recognisable from behind at two hundred metres
    box(0.16, 0.52, 0.05, s * (W / 2 - 0.12), BELT + 0.12, -L / 2 - 0.01, flat(0x8C2F26, { rough: .3 }));
    box(0.22, 0.20, 0.05, s * 0.60, BELT - 0.22, -L / 2 - 0.015, flat(0x8C2F26, { rough: .3 }));
  });
  box(W - 0.5, 0.10, 0.04, 0, BELT - 0.34, L / 2 + 0.03, trimM);
  box(0.34, 0.14, 0.03, 0, SILL + 0.13, -L / 2 - 0.05, flat(0xc9c6ba, { rough: .6 }));

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const c = Math.abs(Math.cos(rot)), s2 = Math.abs(Math.sin(rot));
  world.collide(x, y, z, (W + 0.1) * c + (L + 0.1) * s2, ROOF, (L + 0.1) * c + (W + 0.1) * s2, 'car');
  return g;
}
