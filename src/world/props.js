/* ============================================================
   props.js: furniture, small-prop clutter, and people.

   Prop density rule (doc §7): every horizontal surface in an
   interior gets 4–9 small props. That is the entire cozy trick.
   `clutter()` is that rule, implemented once.
   ============================================================ */
import * as THREE from 'three';
import { MAT, flat, mat, T, tiled, faceTex, normalOf, hairMat, hairlineY, FACE_W, FACE_ROW } from './mat.js';
import { SHAPE, BOX, CYL, SPH, PLN, SCALE, geo } from './world.js';
import { buildBody } from './body.js';

/** Capsule: a limb segment with ends, so an elbow reads as an elbow. */
/** A body of revolution from a [radius, height] profile. One mesh, no seams. */
/**
 * Weld a lathe's seam. The first and last column of vertices sit on top
 * of each other but carry their own normals, so the shading breaks along
 * them and every limb gets a hairline crack down its side. Averaging the
 * pair closes it.
 */
/**
 * A lathe profile has to run bottom-to-top or the triangles come out
 * facing inward, and a limb built from a descending profile is inside
 * out: back-face culling drops its near wall, so you see the inside of
 * its far wall instead. It reads as a dark, flat, badly lit tube, and
 * anything tucked inside it -- a joint ball, the next bone -- shows
 * straight through. Every arm and leg in here was built top-down, so
 * every arm and leg was inside out. Sort the profile, keep the shape.
 */
const upward = (pts) => (pts.length > 1 && pts[pts.length - 1][1] < pts[0][1])
  ? pts.slice().reverse() : pts;

function weldLathe(g, rows) {
  const n = g.attributes.normal, cols = n.count / rows;
  const a = 0, b = (cols - 1) * rows;
  for (let j = 0; j < rows; j++) {
    const x = (n.getX(a + j) + n.getX(b + j)) / 2;
    const y = (n.getY(a + j) + n.getY(b + j)) / 2;
    const z = (n.getZ(a + j) + n.getZ(b + j)) / 2;
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a + j, x / l, y / l, z / l);
    n.setXYZ(b + j, x / l, y / l, z / l);
  }
  n.needsUpdate = true;
  return g;
}

const LATHE = (pts, seg = 18) => geo(`l${seg}|${pts.map(p => p.join(',')).join(';')}`,
  () => weldLathe(new THREE.LatheGeometry(
    upward(pts).map(p => new THREE.Vector2(Math.max(0.0001, p[0]), p[1])), seg), pts.length));

const CAP = (r, len, seg = 8) => geo(`k${r}|${len}|${seg}`, () => new THREE.CapsuleGeometry(r, len, 3, seg));

/**
 * A head. A sphere is an egg; this narrows the jaw into a chin, tucks the
 * throat under it, flattens the back, and pushes a nose out of the front.
 * phiStart = -PI/2 puts u=0.5 on the face, which is what the face texture
 * is painted for.
 */
// The face texture's landmarks, as directions on the head sphere. The
// geometry has to agree with the painting: a nose where the nose is drawn,
// a chin where the chin is drawn.
const dirAt = (r, front = 1) => {
  const th = r / FACE_W * Math.PI;
  return new THREE.Vector3(0, Math.cos(th), Math.sin(th) * front).normalize();
};
const NOSE_DIR = dirAt(FACE_ROW.nose - 8);
const CHIN_DIR = dirAt(FACE_ROW.chin - 4);
/** Where a feature drawn at canvas row `r` lands on a head of radius `hr`. */
function headPoint(r, hr) {
  const th = r / FACE_W * Math.PI;
  return { y: Math.cos(th) * hr, z: Math.sin(th) * hr * 0.94 };
}

/**
 * The jaw, as a half-width multiplier down the head.
 *
 * A face is not a cone. It stays nearly as wide as the cheekbone all the
 * way down to the angle of the jaw and only then turns in to the chin,
 * and below the chin it does not continue at all -- it turns under and
 * goes back to the throat. A sphere tapered smoothly from the eye line
 * to its bottom pole, which is what this used to be, gives you an
 * upside-down triangle with a point on the end of it, and the long pale
 * wedge under the chin reads as still more chin.
 *
 * `t` is the sphere's own y: 1 at the crown, 0.19 at the eye line,
 * -0.62 at the chin, -1 at the pole.
 */
const JAW_W = [
  [1.00, 1.000], [0.19, 1.000], [0.02, 0.995], [-0.12, 0.978],
  [-0.26, 0.945], [-0.38, 0.890], [-0.50, 0.800], [-0.62, 0.660],
  [-0.80, 0.470], [-1.00, 0.300]
];
function jawWidth(t) {
  for (let i = 1; i < JAW_W.length; i++) {
    const [t1, w1] = JAW_W[i];
    if (t >= t1) {
      const [t0, w0] = JAW_W[i - 1];
      const u = (t - t1) / (t0 - t1);
      return w1 + (w0 - w1) * u * u * (3 - 2 * u);
    }
  }
  return JAW_W[JAW_W.length - 1][1];
}

function headGeo(r, hl = {}, HS = {}, seg = 34) {
  const { wide = 1, jaw = 1, nose = 1, chin = 1, brow = 1, vol = 1 } = HS;
  const { long = false, age = 0, female = 0 } = hl;
  return geo(`head${r}|${long}|${age}|${female}|${wide}|${jaw}|${nose}|${chin}|${brow}|${vol}|${seg}`, () => {
    const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 24 / 34), -Math.PI / 2, Math.PI * 2);
    const pos = g.attributes.position;
    const v = new THREE.Vector3(), d = new THREE.Vector3();
    const RB = FACE_ROW.brow, RN = FACE_ROW.nose, RM = FACE_ROW.mouth, RC = FACE_ROW.chin;
    const jawTop = Math.cos(FACE_ROW.eye / FACE_W * Math.PI);
    const chinT = Math.cos(FACE_ROW.chin / FACE_W * Math.PI);
    const bump = (x, c, w) => Math.exp(0 - ((x - c) / w) ** 2);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      d.copy(v).normalize();
      const t = d.y;                            // 1 crown .. -1 under the chin
      const hyp = Math.hypot(d.x, d.z);
      const f = hyp < 1e-5 ? 1 : d.z / hyp;     // 1 face, 0 ears, -1 nape
      const phi = Math.atan2(d.x, d.z);         // 0 dead ahead
      const rw = Math.acos(THREE.MathUtils.clamp(t, -1, 1)) / Math.PI * FACE_W;

      // hair, raised along the line the texture paints the hairline
      const lift = THREE.MathUtils.smoothstep(hairlineY(f, hl) - rw, 0, 14);
      v.addScaledVector(d, lift * 0.050 * r * vol);

      v.x *= 0.86 * wide;                       // a head is not as wide as it is deep
      // the jaw, from the profile above. The depth follows the width but
      // not as far at the front, where the chin has to keep some
      // projection, and further at the back, where the jaw runs away
      // under the ear.
      const jwRaw = jawWidth(t);
      const jw = 1 - (1 - jwRaw) * (0.88 + (1 - jaw) * 0.30);
      v.x *= jw;
      if (t < jawTop) v.z *= v.z > 0 ? (0.44 + 0.56 * jw) : (0.12 + 0.88 * jw);
      // the cheekbone. Without it the middle of a face is a tube, and a
      // tube is what makes a head read as a mannequin.
      v.x *= 1 + 0.05 * bump(t, 0.04, 0.15) * (1 - Math.abs(f) * 0.45);
      // The cranium: widest at the parietal, a little flat over the crown,
      // and cut back at the occiput. Standing a sphere up to head height
      // without this just gives you an egg with a point on top.
      const par = bump(t, 0.50, 0.36);
      v.x *= 1 + 0.090 * par;
      v.z *= 1 + 0.050 * par;
      if (t > 0.58) v.y -= r * 0.10 * ((t - 0.58) / 0.42) ** 2;
      if (t > 0.40 && v.z > 0) v.z *= 1 - 0.16 * (t - 0.40);    // flat forehead
      if (v.z < 0) v.z *= 0.88 + 0.10 * Math.max(0, t);          // flatter occiput

      // Stand the face up. On a bare sphere the surface from the eyes to
      // the chin tilts further and further downward, so it takes less and
      // less light and the whole lower half of the face goes dark under
      // any lamp above head height. A real face is close to a vertical
      // plane there, so push it out to the depth it has at the eye line.
      if (v.z > 0 && t < jawTop) {
        const sinT = Math.max(0.30, Math.sqrt(Math.max(0, 1 - t * t)));
        const u = (jawTop - t) / (jawTop - chinT);
        const taper = u <= 1 ? u : Math.max(0, 1 - (u - 1) / 0.55);
        const w2 = Math.max(0, f) ** 2 * taper;
        v.z *= 1 + w2 * (0.985 / sinT - 1);
      }

      if (v.z > 0) {
        const ax = Math.abs(phi);
        // the nose: a bridge from between the brows, and a tip
        if (ax < 0.32 * nose && rw > RB - 8 && rw < RN + 12) {
          const a = 1 - ax / (0.32 * nose), w = a * a * (3 - 2 * a);
          const u = THREE.MathUtils.clamp((rw - (RB - 8)) / ((RN + 12) - (RB - 8)), 0, 1);
          const ridge = Math.sin(Math.PI * u) ** 1.3;
          v.z += r * nose * (0.045 * ridge + 0.085 * bump(rw, RN - 5, 7)) * w;
        }
        // brow ridge, cheekbone, jawline, chin: what a skull shows through
        v.z += r * 0.022 * brow * bump(rw, RB, 9) * bump(phi, 0, 0.55);
        v.z += r * 0.020 * (bump(phi, 0.62, 0.34) + bump(phi, -0.62, 0.34)) * bump(rw, RN - 14, 14);
        v.z += r * 0.026 * chin * bump(rw, RC - 3, 11) * bump(phi, 0, 0.30);
        v.z += r * 0.014 * jaw * bump(rw, RM + 8, 14) * (bump(phi, 0.5, 0.3) + bump(phi, -0.5, 0.3));
      }
      // Under the chin. Everything from here down is the underside of a
      // jaw, so it has to fold back and up toward the throat instead of
      // carrying on to a point a third of a head below the mouth.
      if (t < chinT) {
        const u = Math.min(1, (chinT - t) / (1 + chinT));
        const e = u * u * (3 - 2 * u);
        v.y = r * (chinT + (t - chinT) * (1 - 0.86 * e));
        v.z -= r * 0.64 * e * Math.max(0, f);
        v.z += r * 0.16 * e * Math.max(0, -f);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}


/**
 * A trunk: a turned profile, then bent into a body.
 *
 * A lathe is round and a person is not. The bust and the seat project
 * forward and back but not sideways, the belly goes flat before it goes
 * narrow, and shoulders are a bar that a body of revolution cannot make
 * at all. So the profile is turned and then the vertices are pushed,
 * which costs one pass at build time and saves bolting spheres onto the
 * front of a tube -- and a sphere bolted onto a tube is exactly what
 * reads as shapes clipped together, from every angle except the one it
 * was aimed at.
 *
 *   w, d        half-width and half-depth multipliers
 *   bust        [y, amount, falloff] forward swell
 *   seat        [y, amount] the same behind
 *   shoulder    [y, amount] widen x into an acromion
 *   belly       0..1, flatten the front
 */
function trunkGeo(pts, { w = 1, d = 0.7, bust = null, seat = null, shoulder = null, belly = 0, seg = 26, key = '' } = {}) {
  return geo(`tk${key}|${w}|${d}|${belly}|${seg}|${bust}|${seat}|${shoulder}|` +
    pts.map(p => p.join(',')).join(';'), () => {
    const g = new THREE.LatheGeometry(
      upward(pts).map(p => new THREE.Vector2(Math.max(0.0006, p[0]), p[1])), seg);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    const bump = (x, c, wd) => Math.exp(0 - ((x - c) / wd) ** 2);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.z);
      const f = r < 1e-6 ? 0 : v.z / r;          // 1 front, 0 side, -1 nape
      v.x *= w; v.z *= d;
      if (belly > 0 && v.z > 0) v.z *= 1 - belly * Math.max(0, f) ** 2;
      if (bust && v.z > 0) {
        v.z += bust[1] * bump(v.y, bust[0], bust[2]) * Math.max(0, f) ** 1.5;
      }
      if (seat && v.z < 0) {
        v.z -= seat[1] * bump(v.y, seat[0], 0.075) * Math.max(0, -f) ** 1.3;
      }
      if (shoulder) {
        v.x += (v.x < 0 ? -1 : 1) * shoulder[1] *
          bump(v.y, shoulder[0], 0.060) * (1 - Math.abs(f) ** 3);
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return weldLathe(g, pts.length);
  });
}

/** Darken a hex colour by a factor. */
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

const R = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// ============================================================ SMALL PROPS
const PALETTE = [0xd8d3c8, 0x8f6a4a, 0x3f5b6b, 0xa8543f, 0xd9c078, 0x5b6b52, 0xcfd4d8, 0x6b4a5a];

export function smallProp(kind, rnd = Math.random, tint) {
  const g = new THREE.Group();
  const col = tint ?? PALETTE[Math.floor(rnd() * PALETTE.length)];
  switch (kind) {
    case 'mug': {
      const b = new THREE.Mesh(CYL(0.042, 0.038, 0.095, 12), flat(col, { rough: .35 }));
      b.position.y = 0.0475; g.add(b);
      const h = new THREE.Mesh(SHAPE.Torus(0.03, 0.007, 6, 12, Math.PI * 1.4), flat(col, { rough: .35 }));
      h.position.set(0.05, 0.05, 0); h.rotation.y = Math.PI / 2; g.add(h);
      const l = new THREE.Mesh(CYL(0.036, 0.036, 0.004, 12), flat(0x3a2a1c, { rough: .2 }));
      l.position.y = 0.082; g.add(l);
      break;
    }
    case 'glass': {
      const b = new THREE.Mesh(CYL(0.035, 0.03, 0.11, 12), MAT.glass);
      b.position.y = 0.055; g.add(b); break;
    }
    case 'bottle': {
      const b = new THREE.Mesh(CYL(0.033, 0.033, 0.17, 10), flat(0x2f4a2c, { rough: .12, transparent: true, opacity: .8 }));
      b.position.y = 0.085; g.add(b);
      const n = new THREE.Mesh(CYL(0.012, 0.02, 0.07, 8), flat(0x2f4a2c, { rough: .12 }));
      n.position.y = 0.2; g.add(n); break;
    }
    case 'can': {
      const b = new THREE.Mesh(CYL(0.033, 0.033, 0.122, 12), flat(col, { rough: .3, metal: .5 }));
      b.position.y = 0.061; g.add(b); break;
    }
    case 'book': {
      const w = 0.13 + rnd() * 0.04, h = 0.02 + rnd() * 0.02, d = 0.19 + rnd() * 0.04;
      const b = new THREE.Mesh(BOX(0.001, 0.001, 0.001), flat(col, { rough: .85 }));
      b.geometry = new THREE.BoxGeometry(w, h, d);
      b.position.y = h / 2; g.add(b);
      const p = new THREE.Mesh(SHAPE.Box(w * .94, h * .8, d * .96), flat(0xe6e0cf, { rough: .95 }));
      p.position.y = h / 2; g.add(p); break;
    }
    case 'paper': {
      const p = new THREE.Mesh(PLN(0.21, 0.28), flat(0xe9e3d3, { rough: .96, side: THREE.DoubleSide }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = (rnd() - .5) * .7; p.position.y = 0.002; g.add(p); break;
    }
    case 'envelope': {
      const p = new THREE.Mesh(BOX(0.24, 0.004, 0.11), flat(0xdcd5c2, { rough: .95 }));
      p.position.y = 0.002; p.rotation.y = (rnd() - .5) * .8; g.add(p); break;
    }
    case 'charger': {
      const b = new THREE.Mesh(BOX(0.045, 0.03, 0.045), flat(0xf0f0ee, { rough: .5 }));
      b.position.y = 0.015; g.add(b);
      const cord = new THREE.Mesh(SHAPE.Torus(0.06, 0.004, 5, 14), flat(0xe8e8e6, { rough: .6 }));
      cord.rotation.x = -Math.PI / 2; cord.position.set(0.08, 0.004, 0.02); g.add(cord); break;
    }
    case 'sock': {
      const b = new THREE.Mesh(SPH(0.045, 8), flat(0xd8d5cc, { rough: 1 }));
      b.scale.set(1, .55, 1.3); b.position.y = 0.025; g.add(b); break;
    }
    case 'hairtie': {
      const t = new THREE.Mesh(SHAPE.Torus(0.018, 0.005, 5, 12), flat(0x2b2b30, { rough: .8 }));
      t.rotation.x = -Math.PI / 2; t.position.y = 0.005; g.add(t); break;
    }
    case 'receipt': {
      const p = new THREE.Mesh(PLN(0.06, 0.16), flat(0xf4f2ea, { rough: 1, side: THREE.DoubleSide }));
      p.rotation.x = -Math.PI / 2; p.rotation.z = rnd() * 3; p.position.y = 0.0015; g.add(p); break;
    }
    case 'coin': {
      const c = new THREE.Mesh(CYL(0.011, 0.011, 0.0016, 10), flat(0x9a8f72, { rough: .35, metal: .8 }));
      c.position.y = 0.001; g.add(c); break;
    }
    case 'plate': {
      const c = new THREE.Mesh(CYL(0.1, 0.09, 0.012, 16), flat(0xeae5da, { rough: .25 }));
      c.position.y = 0.006; g.add(c); break;
    }
    case 'candle': {
      const c = new THREE.Mesh(CYL(0.021, 0.023, 0.09, 10), flat(0xe8e2d0, { rough: .8 }));
      c.position.y = 0.045; g.add(c);
      const w = new THREE.Mesh(CYL(0.002, 0.002, 0.012, 4), flat(0x1a1a1a));
      w.position.y = 0.096; g.add(w); break;
    }
    case 'ashtray': {
      const c = new THREE.Mesh(CYL(0.055, 0.05, 0.022, 12), flat(0x8a8580, { rough: .3 }));
      c.position.y = 0.011; g.add(c); break;
    }
    case 'lighter': {
      const b = new THREE.Mesh(BOX(0.024, 0.062, 0.014), flat(0xb03a2e, { rough: .3 }));
      b.position.y = 0.031; g.add(b); break;
    }
    case 'pen': {
      const b = new THREE.Mesh(CYL(0.004, 0.004, 0.13, 6), flat(0x1e2a3a, { rough: .35 }));
      b.rotation.z = Math.PI / 2; b.rotation.y = rnd() * 3; b.position.y = 0.004; g.add(b); break;
    }
    case 'cassette': {
      const b = new THREE.Mesh(BOX(0.062, 0.011, 0.041), flat(0x22242a, { rough: .45 }));
      b.position.y = 0.006; g.add(b);
      const l = new THREE.Mesh(BOX(0.05, 0.001, 0.024), flat(0xd9d4c4, { rough: .9 }));
      l.position.y = 0.0122; g.add(l); break;
    }
    case 'matchbox': {
      const b = new THREE.Mesh(BOX(0.052, 0.016, 0.034), flat(0xc4a15a, { rough: .9 }));
      b.position.y = 0.008; g.add(b); break;
    }
    case 'saltbox': {
      const b = new THREE.Mesh(CYL(0.042, 0.042, 0.13, 12), flat(0x2b5fa8, { rough: .8 }));
      b.position.y = 0.065; g.add(b);
      const t = new THREE.Mesh(CYL(0.043, 0.043, 0.015, 12), flat(0xd8d8d2, { rough: .6 }));
      t.position.y = 0.135; g.add(t); break;
    }
    default: {
      const b = new THREE.Mesh(BOX(0.06, 0.05, 0.06), flat(col));
      b.position.y = 0.025; g.add(b);
    }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

const CLUTTER_SETS = {
  kitchen: ['mug', 'mug', 'glass', 'plate', 'can', 'bottle', 'paper', 'receipt', 'saltbox', 'matchbox'],
  desk: ['book', 'book', 'paper', 'pen', 'mug', 'charger', 'receipt', 'coin', 'cassette'],
  bedside: ['glass', 'book', 'charger', 'hairtie', 'coin', 'paper'],
  living: ['mug', 'book', 'paper', 'envelope', 'ashtray', 'lighter', 'can'],
  church: ['candle', 'book', 'matchbox', 'paper', 'coin'],
  shop: ['can', 'bottle', 'book', 'coin', 'receipt', 'paper'],
  misc: ['paper', 'coin', 'receipt', 'sock', 'hairtie', 'book', 'mug']
};

/** 4–9 small props on a horizontal surface. The cozy trick. */
export function clutter(world, x, y, z, w, d, { set = 'misc', seed = 1, count = null, spread = 0.86 } = {}) {
  const rnd = R(seed * 2654435761);
  const items = CLUTTER_SETS[set] || CLUTTER_SETS.misc;
  const n = count ?? (4 + Math.floor(rnd() * 6));
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = smallProp(items[Math.floor(rnd() * items.length)], rnd);
    p.position.set(x + (rnd() - .5) * w * spread, y, z + (rnd() - .5) * d * spread);
    p.rotation.y = rnd() * Math.PI * 2;
    g.add(p);
  }
  world.add(g);
  return g;
}

// ============================================================ FURNITURE
/**
 * A bed you can walk around.
 *
 * The old one was four stacked boxes: a solid plinth with no legs, a
 * quilt sitting on top like a lid, and nothing on the far side at all,
 * so from anywhere except the foot it read as a crate with a blanket on
 * it. This one has rails, legs, a mattress that overhangs them, bedding
 * that hangs down the sides, a headboard with posts, and a turned-back
 * sheet under the pillows, which is what tells you at a glance which
 * end somebody sleeps at.
 */
export function bed(world, x, y, z, rot = 0, {
  w = 1.0, l = 1.95, quilt = MAT.quilt, made = true, throwOver = false,
  frameCol = 0x4b3524, sheetCol = 0xefeade
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  const woodM = flat(frameCol, { rough: .66 });
  const woodDark = flat(0x3c2a1c, { rough: .7 });

  const RAIL_Y = 0.30, LEG = 0.155;
  // legs, set in from the corners the way a bed frame's are
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(SHAPE.Box(0.07, RAIL_Y, 0.07), woodDark);
    leg.position.set(sx * (w / 2 - 0.05), RAIL_Y / 2, sz * (l / 2 - 0.06));
    g.add(leg);
  });
  // side rails and the foot rail, which is the edge you sit on
  [-1, 1].forEach(s => {
    const r = new THREE.Mesh(SHAPE.Box(0.055, 0.16, l - 0.02), woodM);
    r.position.set(s * (w / 2 - 0.01), RAIL_Y - 0.06, 0);
    g.add(r);
  });
  const footRail = new THREE.Mesh(SHAPE.Box(w + 0.06, 0.30, 0.06), woodM);
  footRail.position.set(0, RAIL_Y - 0.02, l / 2 + 0.02);
  g.add(footRail);
  // the slatted base, visible from the side under the mattress
  const base = new THREE.Mesh(SHAPE.Box(w - 0.09, 0.035, l - 0.08), woodDark);
  base.position.y = RAIL_Y - 0.02; g.add(base);

  // headboard: a panel between two posts
  const head = new THREE.Mesh(SHAPE.Box(w - 0.02, 0.46, 0.045), woodM);
  head.position.set(0, RAIL_Y + 0.32, -l / 2 - 0.03); g.add(head);
  [-1, 1].forEach(s => {
    const p = new THREE.Mesh(SHAPE.Box(0.075, RAIL_Y + 0.62, 0.075), woodDark);
    p.position.set(s * (w / 2 + 0.005), (RAIL_Y + 0.62) / 2, -l / 2 - 0.03);
    g.add(p);
  });

  // mattress, overhanging the rails a little, with a fitted sheet on it
  const MT = 0.185, MY = RAIL_Y + 0.02 + MT / 2;
  const mattress = new THREE.Mesh(SHAPE.Box(w + 0.02, MT, l - 0.02), flat(sheetCol, { rough: .96 }));
  mattress.position.y = MY; g.add(mattress);

  if (made) {
    // The duvet is a slab that stops short of the head, plus a skirt down
    // each side. Bedding that ends flush with the mattress is the single
    // thing that makes a bed look like furniture from a catalogue.
    const qTop = MY + MT / 2, qL = l * 0.74;
    const qMat = tiled(quilt, w, qL);
    const duvet = new THREE.Mesh(SHAPE.Box(w + 0.05, 0.1, qL), qMat);
    duvet.position.set(0, qTop + 0.05, l / 2 - qL / 2 - 0.01);
    g.add(duvet);
    [-1, 1].forEach(s => {
      const skirt = new THREE.Mesh(SHAPE.Box(0.05, 0.19, qL), tiled(quilt, 0.4, 0.19));
      skirt.position.set(s * (w / 2 + 0.025), qTop - 0.05, l / 2 - qL / 2 - 0.01);
      g.add(skirt);
    });
    // the foot of the duvet, tucked over the end
    const footFold = new THREE.Mesh(SHAPE.Box(w + 0.05, 0.2, 0.06), tiled(quilt, w, 0.2));
    footFold.position.set(0, qTop - 0.04, l / 2 - 0.02); g.add(footFold);
    // turned-back top sheet
    const fold = new THREE.Mesh(SHAPE.Box(w + 0.04, 0.055, 0.2), flat(sheetCol, { rough: .96 }));
    fold.position.set(0, qTop + 0.075, l / 2 - qL - 0.06); g.add(fold);

    // pillows: two side by side if the bed is wide enough for two
    const pair = w > 0.9;
    const pw = pair ? Math.min(0.44, w * 0.46) : Math.min(0.46, w * 0.72);
    (pair ? [-1, 1] : [0]).forEach((s, i) => {
      const p = new THREE.Mesh(SHAPE.Box(pw, 0.115, 0.3), flat(sheetCol, { rough: .97 }));
      p.position.set(s * (pw / 2 + 0.02), qTop + 0.06, -l / 2 + 0.24 + i * 0.015);
      p.rotation.y = (i - 0.5) * 0.07;
      g.add(p);
    });
    if (throwOver) {
      const th = new THREE.Mesh(SHAPE.Box(w + 0.07, 0.045, 0.42), flat(0x7a5a44, { rough: .98 }));
      th.position.set(0, qTop + 0.13, l / 2 - 0.34); g.add(th);
      [-1, 1].forEach(s => {
        const hang = new THREE.Mesh(SHAPE.Box(0.045, 0.26, 0.42), flat(0x7a5a44, { rough: .98 }));
        hang.position.set(s * (w / 2 + 0.03), qTop - 0.02, l / 2 - 0.34); g.add(hang);
      });
    }
  } else {
    // unmade: the duvet in a heap, pushed to one side
    const heap = new THREE.Mesh(SHAPE.Box(w * 0.8, 0.22, l * 0.5), tiled(quilt, w, l * 0.5));
    heap.position.set(w * 0.08, MY + MT / 2 + 0.11, l * 0.1);
    heap.rotation.y = 0.06; g.add(heap);
    const p = new THREE.Mesh(SHAPE.Box(Math.min(0.44, w * 0.5), 0.115, 0.3), flat(sheetCol, { rough: .97 }));
    p.position.set(-w * 0.14, MY + MT / 2 + 0.06, -l / 2 + 0.27);
    p.rotation.y = 0.22; g.add(p);
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const across = Math.abs(Math.sin(rot)) > 0.5;
  world.collide(x, y, z, across ? l : w, 0.62, across ? w : l, 'bed');
  return g;
}

export function desk(world, x, y, z, rot = 0, { w = 1.2, d = 0.6, h = 0.74 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const top = new THREE.Mesh(SHAPE.Box(w, 0.04, d), flat(0x6a4a30, { rough: .5 }));
  top.position.y = h; g.add(top);
  [[-w / 2 + .05, -d / 2 + .05], [w / 2 - .05, -d / 2 + .05], [-w / 2 + .05, d / 2 - .05], [w / 2 - .05, d / 2 - .05]].forEach(([lx, lz]) => {
    const l = new THREE.Mesh(BOX(0.05, h, 0.05), flat(0x5a3e28, { rough: .6 }));
    l.position.set(lx, h / 2, lz); g.add(l);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, rot ? d : w, h, rot ? w : d, 'desk');
  return { g, top: y + h + 0.02 };
}

export function chair(world, x, y, z, rot = 0, col = 0x5a3e28) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const s = new THREE.Mesh(BOX(0.42, 0.05, 0.42), flat(col, { rough: .6 })); s.position.y = 0.45; g.add(s);
  const b = new THREE.Mesh(BOX(0.42, 0.5, 0.05), flat(col, { rough: .6 })); b.position.set(0, 0.7, -0.19); g.add(b);
  [[-.18, -.18], [.18, -.18], [-.18, .18], [.18, .18]].forEach(([lx, lz]) => {
    const l = new THREE.Mesh(BOX(0.04, 0.45, 0.04), flat(col, { rough: .6 }));
    l.position.set(lx, 0.225, lz); g.add(l);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g); world.collide(x, y, z, 0.45, 0.5, 0.45, 'chair');
  return g;
}

export function sofa(world, x, y, z, rot = 0, { w = 1.9, plastic = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const m = plastic ? flat(0xa8a49a, { rough: .18 }) : flat(0x6d5a44, { rough: .95 });
  const base = new THREE.Mesh(SHAPE.Box(w, 0.4, 0.85), m); base.position.y = 0.2; g.add(base);
  const cush = new THREE.Mesh(SHAPE.Box(w - 0.2, 0.16, 0.72), m); cush.position.set(0, 0.48, 0.03); g.add(cush);
  const back = new THREE.Mesh(SHAPE.Box(w, 0.55, 0.2), m); back.position.set(0, 0.62, -0.33); g.add(back);
  [-1, 1].forEach(s => { const a = new THREE.Mesh(SHAPE.Box(0.18, 0.32, 0.85), m); a.position.set(s * (w / 2 - 0.09), 0.56, 0); g.add(a); });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const across = Math.abs(Math.sin(rot)) > 0.5;
  world.collide(x, y, z, across ? 0.9 : w, 0.9, across ? w : 0.9, 'sofa');
  return g;
}

export function counter(world, x, y, z, w, d, rot = 0, { h = SCALE.counter, top = 0x3f3a34, body = 0xc9c2b2 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const b = new THREE.Mesh(SHAPE.Box(w, h - 0.04, d), flat(body, { rough: .6 })); b.position.y = (h - 0.04) / 2; g.add(b);
  const t = new THREE.Mesh(SHAPE.Box(w + 0.03, 0.04, d + 0.03), flat(top, { rough: .3 })); t.position.y = h - 0.02; g.add(t);
  const n = Math.max(1, Math.round(w / 0.55));
  for (let i = 0; i < n; i++) {
    const dr = new THREE.Mesh(SHAPE.Box(w / n - 0.03, h * .42, 0.02), flat(body === 0xc9c2b2 ? 0xbdb5a3 : body, { rough: .55 }));
    dr.position.set(-w / 2 + w / n * (i + .5), h * .55, d / 2 + 0.005); g.add(dr);
    const hd = new THREE.Mesh(CYL(0.008, 0.008, w / n * 0.4, 6), flat(0x9aa0a4, { rough: .3, metal: .7 }));
    hd.rotation.z = Math.PI / 2; hd.position.set(-w / 2 + w / n * (i + .5), h * .55, d / 2 + 0.02); g.add(hd);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  world.collide(x, y, z, w * c + d * s, h, d * c + w * s, 'counter');
  return { g, top: y + h + 0.02 };
}

export function fridge(world, x, y, z, rot = 0, { h = 1.42, w = 0.58, d = 0.58, mini = false } = {}) {
  const hh = mini ? 0.85 : h;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const b = new THREE.Mesh(SHAPE.Box(w, hh, d), flat(0xe4e2dc, { rough: .35, metal: .1 }));
  b.position.y = hh / 2; g.add(b);
  const dr = new THREE.Mesh(SHAPE.Box(w - 0.02, hh * .62, 0.02), flat(0xeceae4, { rough: .3 }));
  dr.position.set(0, hh * .32, d / 2 + 0.011); g.add(dr);
  const hn = new THREE.Mesh(BOX(0.03, hh * .4, 0.03), flat(0xb8bcbe, { rough: .25, metal: .7 }));
  hn.position.set(w / 2 - 0.08, hh * .35, d / 2 + 0.04); g.add(hn);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g); world.collide(x, y, z, w, hh, d, 'fridge');
  return { g, top: y + hh, front: d / 2 };
}

export function shelfUnit(world, x, y, z, rot = 0, { w = 0.8, h = 1.6, d = 0.28, shelves = 4, books = true, seed = 3 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const m = flat(0x5b4028, { rough: .7 });
  [-1, 1].forEach(s => { const p = new THREE.Mesh(SHAPE.Box(0.03, h, d), m); p.position.set(s * (w / 2), h / 2, 0); g.add(p); });
  const rnd = R(seed * 7919);
  for (let i = 0; i <= shelves; i++) {
    const sy = i * (h / shelves);
    const sh = new THREE.Mesh(SHAPE.Box(w, 0.025, d), m); sh.position.set(0, sy, 0); g.add(sh);
    if (books && i < shelves) {
      let bx = -w / 2 + 0.04;
      while (bx < w / 2 - 0.06) {
        const bw = 0.018 + rnd() * 0.026, bh = 0.16 + rnd() * 0.07;
        const b = new THREE.Mesh(SHAPE.Box(bw, bh, d * .8), flat(PALETTE[Math.floor(rnd() * PALETTE.length)], { rough: .9 }));
        b.position.set(bx + bw / 2, sy + bh / 2 + 0.013, 0);
        if (rnd() > .9) { b.rotation.z = 0.25; b.position.y -= 0.01; }
        g.add(b); bx += bw + 0.004;
      }
    }
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g); world.collide(x, y, z, rot ? d : w, h, rot ? w : d, 'shelf');
  return g;
}

export function mirror(world, x, y, z, rot = 0, { w = 0.55, h = 1.55, sheeted = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const frame = new THREE.Mesh(SHAPE.Box(w + 0.06, h + 0.06, 0.04), flat(0x4a3524, { rough: .6 }));
  g.add(frame);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x8d9aa4, roughness: 0.06, metalness: 0.92, envMapIntensity: 1 });
  const glass = new THREE.Mesh(SHAPE.Plane(w, h), glassMat);
  glass.position.z = 0.021; g.add(glass);
  let sheet = null;
  if (sheeted) {
    sheet = new THREE.Mesh(SHAPE.Plane(w + 0.14, h + 0.12), flat(0xdad5c8, { rough: 1, side: THREE.DoubleSide }));
    sheet.position.z = 0.035; sheet.rotation.z = 0.02; g.add(sheet);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  return { g, glass, sheet, setSheet(v) { if (sheet) sheet.visible = v; } };
}

export function corkboard(world, x, y, z, rot = 0, { w = 0.9, h = 0.66, pins = 9, seed = 5, photo = true } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const b = new THREE.Mesh(SHAPE.Box(w, h, 0.025), flat(0x9a7a4e, { rough: .95 })); g.add(b);
  const rnd = R(seed * 104729);
  for (let i = 0; i < pins; i++) {
    const pw = 0.07 + rnd() * 0.06, ph = 0.09 + rnd() * 0.05;
    const p = new THREE.Mesh(SHAPE.Plane(pw, ph), flat(photo ? 0xd6cfc0 : 0xf1ede2, { rough: .95 }));
    p.position.set((rnd() - .5) * (w - pw - 0.05), (rnd() - .5) * (h - ph - 0.05), 0.014);
    p.rotation.z = (rnd() - .5) * 0.28; g.add(p);
    const t = new THREE.Mesh(SPH(0.008, 6), flat([0xd0403a, 0x3a6fd0, 0xd0b03a][Math.floor(rnd() * 3)], { rough: .3 }));
    t.position.set(p.position.x, p.position.y + ph / 2 - 0.012, 0.019); g.add(t);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  return g;
}

/**
 * A cardboard box, which is a thing with flaps.
 *
 * The moving boxes in the apartment were plain tan cubes with a label
 * decal on one face, dropped at random angles, and they read as bricks.
 * A box is legible because of its lid: two long flaps meeting down the
 * middle, two short ones under them, a strip of tape over the seam, and
 * the marker on the side. Open, the flaps stand up and there is a hole.
 */
export function cardboardBox(world, x, y, z, rot = 0, {
  w = 0.46, h = 0.38, d = 0.42, label = '', open = false,
  tint = 0xb0966d, collide = true, tag = 'box'
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  const card = flat(tint, { rough: .97 });
  const cardDark = flat(shade(tint, 0.82), { rough: .97 });
  const tape = flat(0xc3b795, { rough: .5 });

  const body = new THREE.Mesh(SHAPE.Box(w, h, d), card);
  body.position.y = h / 2; g.add(body);
  // the inside, so an open box is not a solid block with a lid ajar
  const inner = new THREE.Mesh(SHAPE.Box(w - 0.03, h - 0.03, d - 0.03), flat(shade(tint, 0.5), { rough: 1 }));
  inner.position.y = h / 2 + 0.02; g.add(inner);

  const FT = 0.008;
  /** One flap, hinged on the rim. `ax` folds about X (the long sides). */
  const flap = (ax, sgn, len) => {
    const hinge = new THREE.Group();
    hinge.position.set(ax ? 0 : sgn * (w / 2), h, ax ? sgn * (d / 2) : 0);
    const f = new THREE.Mesh(
      ax ? new THREE.BoxGeometry(w, FT, len) : new THREE.BoxGeometry(len, FT, d),
      cardDark);
    f.position.set(ax ? 0 : -sgn * len / 2, 0, ax ? -sgn * len / 2 : 0);
    f.castShadow = true; f.receiveShadow = true;
    hinge.add(f);
    if (open) {
      const a = 1.15 + (sgn > 0 ? 0.12 : 0);
      if (ax) hinge.rotation.x = sgn * a; else hinge.rotation.z = -sgn * a;
    }
    g.add(hinge);
    return hinge;
  };
  // short flaps first, long ones over them: that is the order they fold
  flap(false, -1, w / 2 - 0.012);
  flap(false, 1, w / 2 - 0.012);
  const lidA = flap(true, -1, d / 2 - 0.008);
  const lidB = flap(true, 1, d / 2 - 0.008);
  if (!open) {
    lidA.position.y += FT; lidB.position.y += FT;
    const t = new THREE.Mesh(SHAPE.Box(0.045, 0.004, d + 0.01), tape);
    t.position.set(0, h + FT * 1.75, 0); g.add(t);
    [-1, 1].forEach(sg => {
      const side = new THREE.Mesh(SHAPE.Box(0.045, 0.05, 0.004), tape);
      side.position.set(0, h - 0.025, sg * (d / 2 + 0.003));
      g.add(side);
    });
  }

  if (label) {
    const lc = document.createElement('canvas'); lc.width = 256; lc.height = 64;
    const c2 = lc.getContext('2d');
    c2.fillStyle = '#' + tint.toString(16).padStart(6, '0');
    c2.fillRect(0, 0, 256, 64);
    c2.fillStyle = '#2a2520';
    c2.font = 'bold 34px "JetBrains Mono", monospace';
    c2.textAlign = 'center';
    c2.fillText(label, 128, 44);
    const lm = new THREE.Mesh(SHAPE.Plane(w * 0.9, w * 0.9 / 4), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(lc), roughness: .97 }));
    lm.position.set(0, h * 0.42, d / 2 + 0.004);
    g.add(lm);
  }

  body.castShadow = body.receiveShadow = true;
  world.add(g);
  if (collide) {
    const c = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
    world.collide(x, y, z, w * c + d * sn, h, d * c + w * sn, tag);
  }
  return { g, body, top: y + h, w, h, d };
}

export function woodStove(world, x, y, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const body = new THREE.Mesh(SHAPE.Box(0.62, 0.72, 0.5), flat(0x2b2724, { rough: .55, metal: .3 }));
  body.position.y = 0.42; g.add(body);
  const legs = [[-.24, -.18], [.24, -.18], [-.24, .18], [.24, .18]];
  legs.forEach(([lx, lz]) => { const l = new THREE.Mesh(BOX(0.05, 0.12, 0.05), flat(0x241f1c)); l.position.set(lx, 0.06, lz); g.add(l); });
  const door = new THREE.Mesh(SHAPE.Box(0.34, 0.3, 0.02), flat(0x1d1a18, { rough: .5, metal: .4 }));
  door.position.set(0, 0.42, 0.255); g.add(door);
  const fire = new THREE.Mesh(SHAPE.Plane(0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xE8722A, transparent: true, opacity: .85 }));
  fire.position.set(0, 0.42, 0.268); g.add(fire);
  const pipe = new THREE.Mesh(CYL(0.08, 0.08, 1.6, 10), flat(0x39332e, { rough: .6, metal: .35 }));
  pipe.position.y = 1.58; g.add(pipe);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g); world.collide(x, y, z, 0.7, 0.85, 0.6, 'stove');
  const light = world.bulb(x, y + 0.42, z + (rot ? 0 : 0.35), { color: 0xE8722A, intensity: 1.1, dist: 4.2, size: 0.02, emissive: false });
  world.tick((dt, ctx) => {
    const t = performance.now() * 0.001;
    light.intensity = 0.9 + Math.sin(t * 6.1) * 0.12 + Math.sin(t * 2.3) * 0.1;
    fire.material.opacity = 0.72 + Math.sin(t * 8.3) * 0.14;
  });
  return g;
}

/** The Wash-Rite bank. `n` machines. Returns handle w/ .running */
export function dryerBank(world, x, y, z, n, rot = 0, { spacing = 0.72 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const doors = [];
  for (let i = 0; i < n; i++) {
    const px = -((n - 1) * spacing) / 2 + i * spacing;
    const body = new THREE.Mesh(SHAPE.Box(0.68, 0.9, 0.66), tiled(MAT.metal, 0.68, 0.9));
    body.position.set(px, 0.45, 0); g.add(body);
    const upper = new THREE.Mesh(SHAPE.Box(0.68, 0.88, 0.66), tiled(MAT.metal, 0.68, 0.88));
    upper.position.set(px, 1.36, 0); g.add(upper);
    [0.45, 1.36].forEach((yy, k) => {
      const ring = new THREE.Mesh(SHAPE.Torus(0.2, 0.028, 8, 20), flat(0xb2b6b8, { rough: .3, metal: .6 }));
      ring.position.set(px, yy, 0.335); g.add(ring);
      const win = new THREE.Mesh(CYL(0.185, 0.185, 0.012, 20), flat(0x14171a, { rough: .1, metal: .1 }));
      win.rotation.x = Math.PI / 2; win.position.set(px, yy, 0.332); g.add(win);
      const drum = new THREE.Mesh(CYL(0.16, 0.16, 0.02, 16), flat(0x5a5f63, { rough: .5, metal: .4 }));
      drum.rotation.x = Math.PI / 2; drum.position.set(px, yy, 0.325); g.add(drum);
      doors.push({ ring, win, drum, running: (i + k) % 3 !== 2 });
    });
    const panel = new THREE.Mesh(SHAPE.Box(0.6, 0.1, 0.04), flat(0xd8d4c8, { rough: .5 }));
    panel.position.set(px, 1.83, 0.32); g.add(panel);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  const W = n * spacing;
  world.collide(x, y, z, W * c + 0.7 * s, 1.85, 0.7 * c + W * s, 'dryer');
  const h = {
    g, doors, running: true,
    setRunning(v) { h.running = v; }
  };
  world.tick(dt => {
    if (!h.running) return;
    doors.forEach((d, i) => { if (d.running) d.drum.rotation.z += dt * (0.7 + (i % 3) * 0.12); });
  });
  return h;
}

/** Church pew. Returns the mesh group so it can be turned the wrong way. */
export function pew(world, x, y, z, rot = 0, w = 3.0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const m = tiled(MAT.pew, w, 0.5);
  const seat = new THREE.Mesh(SHAPE.Box(w, 0.06, 0.42), m); seat.position.set(0, 0.45, 0); g.add(seat);
  const back = new THREE.Mesh(SHAPE.Box(w, 0.62, 0.05), m); back.position.set(0, 0.72, -0.2); g.add(back);
  const kneel = new THREE.Mesh(SHAPE.Box(w, 0.05, 0.16), m); kneel.position.set(0, 0.15, 0.3); g.add(kneel);
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(SHAPE.Box(0.07, 1.05, 0.5), m);
    e.position.set(s * (w / 2 - 0.035), 0.52, -0.02); g.add(e);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, Math.abs(Math.cos(rot)) * w + Math.abs(Math.sin(rot)) * 0.6, 1.05,
    Math.abs(Math.cos(rot)) * 0.6 + Math.abs(Math.sin(rot)) * w, 'pew');
  return g;
}

/** One of the seven oil lamps on iron standards. These are the health bar. */
export function oilLamp(world, x, y, z, index) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const base = new THREE.Mesh(CYL(0.13, 0.16, 0.05, 12), flat(0x25211d, { rough: .6, metal: .5 })); base.position.y = 0.025; g.add(base);
  const post = new THREE.Mesh(CYL(0.022, 0.028, 1.28, 8), flat(0x25211d, { rough: .6, metal: .5 })); post.position.y = 0.66; g.add(post);
  const bowl = new THREE.Mesh(SPH(0.085, 12), flat(0xc9a55f, { rough: .25, metal: .3 })); bowl.scale.y = 0.75; bowl.position.y = 1.34; g.add(bowl);
  const chimney = new THREE.Mesh(CYL(0.055, 0.075, 0.24, 12), new THREE.MeshPhysicalMaterial({ color: 0xd8cbb2, roughness: .12, transmission: .7, transparent: true, opacity: .45 }));
  chimney.position.y = 1.5; g.add(chimney);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xD4762E, transparent: true, opacity: 0.95 });
  const flame = new THREE.Mesh(SHAPE.Cone(0.022, 0.085, 8), flameMat);
  flame.position.y = 1.47; g.add(flame);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  world.collide(x, y, z, 0.3, 1.2, 0.3, 'lamp');
  const light = new THREE.PointLight(0xD4762E, 0, 9.5, 1.9);
  light.position.set(x, y + 1.47, z);
  light.castShadow = index < 4;
  if (light.castShadow) { light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.004; light.shadow.camera.far = 10; }
  world.add(light);
  const h = {
    g, light, flame, lit: false, index,
    set(v, instant = false) {
      h.lit = v;
      flame.visible = v;
      if (instant) light.intensity = v ? 2.6 : 0;
      else h._target = v ? 2.6 : 0;
    },
    _target: 0, _gutter: 0,
    gutter(amount = 1) { h._gutter = amount; }
  };
  h.set(false, true);
  world.tick(dt => {
    const t = performance.now() * 0.001;
    light.intensity += (h._target - light.intensity) * Math.min(1, dt * 4);
    if (h.lit) {
      const flick = 1 + Math.sin(t * 9.3 + index) * 0.045 + Math.sin(t * 3.1 + index * 2) * 0.03;
      const g2 = h._gutter > 0 ? (1 - h._gutter * (0.4 + Math.sin(t * 17) * 0.35)) : 1;
      light.intensity = Math.max(0, light.intensity * flick * g2);
      flame.scale.setScalar(flick * (h._gutter > 0 ? 0.6 : 1));
      h._gutter = Math.max(0, h._gutter - dt * 0.25);
    }
  });
  return h;
}

/** Gerald. Taxidermied bird, named by a twenty-year-old. */
export function gerald(world, x, y, z, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const body = new THREE.Mesh(SPH(0.06, 10), flat(0x6b5a44, { rough: .95 }));
  body.scale.set(1, 0.9, 1.5); body.position.y = 0.07; g.add(body);
  const head = new THREE.Mesh(SPH(0.035, 10), flat(0x7a6a50, { rough: .95 }));
  head.position.set(0, 0.125, 0.06); g.add(head);
  const beak = new THREE.Mesh(SHAPE.Cone(0.011, 0.035, 6), flat(0xc8a44a, { rough: .5 }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.122, 0.098); g.add(beak);
  [-1, 1].forEach(s => {
    const e = new THREE.Mesh(SPH(0.006, 6), flat(0x0d0c0b, { rough: .1 }));
    e.position.set(s * 0.019, 0.134, 0.082); g.add(e);
  });
  const tail = new THREE.Mesh(SHAPE.Box(0.04, 0.008, 0.09), flat(0x5b4c39, { rough: .95 }));
  tail.position.set(0, 0.07, -0.11); g.add(tail);
  const perch = new THREE.Mesh(CYL(0.035, 0.04, 0.02, 10), flat(0x4a3524, { rough: .7 }));
  perch.position.y = 0.01; g.add(perch);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  return g;
}

export function recordPlayer(world, x, y, z, rot = 0, { dusty = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const base = new THREE.Mesh(SHAPE.Box(0.42, 0.11, 0.36), flat(0x3f2f22, { rough: .55 }));
  base.position.y = 0.055; g.add(base);
  const platter = new THREE.Mesh(CYL(0.15, 0.15, 0.012, 24), flat(0x2a2a2c, { rough: .35, metal: .3 }));
  platter.position.set(0, 0.117, 0.01); g.add(platter);
  const disc = new THREE.Mesh(CYL(0.145, 0.145, 0.003, 24), flat(dusty ? 0x22201e : 0x121214, { rough: dusty ? .95 : .4 }));
  disc.position.set(0, 0.125, 0.01); g.add(disc);
  const arm = new THREE.Mesh(BOX(0.012, 0.012, 0.2), flat(0xa8acae, { rough: .3, metal: .6 }));
  arm.position.set(0.16, 0.13, -0.02); arm.rotation.y = 0.5; g.add(arm);
  if (dusty) {
    const dust = new THREE.Mesh(PLN(0.42, 0.36), flat(0xb9b2a2, { rough: 1, transparent: true, opacity: .28 }));
    dust.rotation.x = -Math.PI / 2; dust.position.y = 0.133; g.add(dust);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  return g;
}

export function tv(world, x, y, z, rot = 0, { w = 0.62, h = 0.48, staticOn = true } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const body = new THREE.Mesh(SHAPE.Box(w, h, 0.42), flat(0x2a2b2d, { rough: .6 }));
  body.position.y = h / 2; g.add(body);
  const st = T.staticnoise();
  const screenMat = new THREE.MeshBasicMaterial({ map: st.clone(), color: 0xffffff });
  screenMat.map.needsUpdate = true;
  const screen = new THREE.Mesh(SHAPE.Plane(w - 0.09, h - 0.09), screenMat);
  screen.position.set(0, h / 2, 0.212); g.add(screen);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const light = world.bulb(x, y + h / 2, z + 0.5, { color: 0xbfd0dd, intensity: staticOn ? 0.5 : 0, dist: 3.6, emissive: false });
  const h2 = {
    g, screen, screenMat, light, staticOn,
    showImage(canvas) {
      const t = new THREE.CanvasTexture(canvas);
      screenMat.map = t; screenMat.needsUpdate = true;
    },
    setStatic(v) { h2.staticOn = v; light.intensity = v ? 0.5 : 0; }
  };
  let acc = 0;
  world.tick(dt => {
    if (!h2.staticOn) return;
    acc += dt;
    if (acc > 0.05) {
      acc = 0;
      screenMat.map.offset.set(Math.random(), Math.random());
      light.intensity = 0.36 + Math.random() * 0.26;
    }
  });
  return h2;
}

/**
 * Hair as geometry, not as a painted cap. The scalp is still painted --
 * that is what gives a hairline -- and this is everything that leaves the
 * skull: the curtain down the back and sides, the sweeps that frame the
 * face, a knot, a tail. Built as partial lathes with the gap facing
 * forward, so the face is never covered.
 */
const hairBell = (pts, gap, seg = 22) => geo(
  `hb${gap}|${seg}|${pts.map(p => p.join(',')).join(';')}`,
  () => new THREE.LatheGeometry(
    upward(pts).map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])),
    seg, gap / 2, Math.PI * 2 - gap));

/** The complement of a bell: the arc that fills its gap. A fringe. */
const hairArc = (pts, arc, seg = 14) => geo(
  `ha${arc}|${seg}|${pts.map(p => p.join(',')).join(';')}`,
  () => new THREE.LatheGeometry(
    upward(pts).map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])),
    seg, -arc / 2, arc));

/**
 * Hair.
 *
 * Built in world units against the skull the head actually has, not in
 * fractions of a nominal sphere: the head is an egg standing 1.46 times
 * its own width, so hair written in sphere fractions and hung inside the
 * stretched frame comes out forty per cent too long and hangs to the
 * navel. `hr` and `hsy` come from the head that was just built, and the
 * profiles below clear its measured silhouette by five or six
 * millimetres, which is what hair does.
 *
 * Three pieces, and each is doing a job the others cannot:
 *   cap     over the skull, open at the front, down past the ear
 *   fringe  the arc that fills that opening, low enough to cover the
 *           hairline painted on the forehead -- a painted hairline with
 *           no geometry over it is a line drawn on a scalp
 *   length  what hangs, in its own unstretched group
 */
export function hairRig(headG, {
  style = 'short', color = 0x3a2b20, s = 1, id = '',
  hr = 0.0559 * s, hsy = 1.46, hy = 0.076 * s, wide = 1
} = {}) {
  const HM = hairMat(color, id);
  const out = [];
  // everything is measured from the centre of the skull
  const G = new THREE.Group(); G.position.y = hy; headG.add(G);
  const add = (m) => { G.add(m); out.push(m); return m; };
  // the head's own half-height and half-width, so a profile can be
  // written as "just outside the skull" and stay that way if the skull
  // is re-proportioned
  const HH = hr * hsy, HW = hr * 0.86 * wide;
  const P = (pts) => pts.map(([r, y]) => [r * hr, y * HH]);

  const mass = (w, h, d, x, y, z, seg = 12) => {
    const m = new THREE.Mesh(SPH(0.5, seg), HM);
    m.scale.set(w * hr, h * HH, d * hr); m.position.set(x * hr, y * HH, z * hr);
    return add(m);
  };
  /** The shell over the skull. `tail` continues the crown down the back. */
  const cap = (tail, gap, seg = 26) => {
    const m = add(new THREE.Mesh(hairBell(P(CROWN.concat(tail)), gap, seg), HM));
    m.scale.set(0.86 * wide, 1, 1.03);
    return m;
  };
  /** The arc that fills the cap's opening. */
  const fringe = (pts, arc, seg = 16) => {
    const m = add(new THREE.Mesh(hairArc(P(pts), arc, seg), HM));
    m.scale.set(0.88 * wide, 1, 1.02);
    return m;
  };
  // radius, height -- in head radii and head half-heights, so the crown
  // follows the skull whatever size it is
  // closed at the very top: an open lathe leaves a hole at the crown and
  // a double-sided material shows you the inside of the head through it
  const CROWN = [
    [0.03, 1.010], [0.34, 0.945], [0.62, 0.870], [0.82, 0.775],
    [0.96, 0.640], [1.06, 0.450], [1.12, 0.220]
  ];

  if (style === 'short' || style === 'crop') {
    cap([[1.13, 0.000], [1.11, -0.230], [1.03, -0.400], [0.86, -0.500], [0.60, -0.545]], 2.55);
  }

  if (style === 'bun') {
    cap([[1.12, -0.020], [1.09, -0.250], [1.00, -0.420], [0.82, -0.520], [0.55, -0.560]], 2.30, 22);
    const knot = mass(0.90, 0.60, 0.86, 0, -0.06, -1.02, 14);
    knot.rotation.x = 0.2;
    mass(0.32, 0.18, 0.32, 0, -0.34, -0.90, 8);              // the pins under it
  }

  if (style === 'bob') {
    cap([[1.15, 0.000], [1.17, -0.320], [1.16, -0.700], [1.09, -1.000],
      [0.91, -1.180], [0.62, -1.260]], 1.90);
    fringe([[0.06, 1.010], [0.38, 0.935], [0.68, 0.840], [0.88, 0.720],
      [1.02, 0.580], [1.10, 0.430], [1.12, 0.330]], 2.32);
  }

  if (style === 'long' || style === 'wave') {
    // One shell, crown to tips, so there is exactly one pair of cut edges
    // at the front instead of a seam everywhere two pieces meet. The
    // opening is wide -- the hair parts at the temple, not at the
    // cheekbone -- or it covers half the face.
    const gap = 1.80;
    const hang = new THREE.Group(); headG.add(hang);
    hang.position.y = hy; out.push(hang);
    const put = (m) => { hang.add(m); m.castShadow = m.receiveShadow = true; return m; };
    const shell = put(new THREE.Mesh(hairBell([
      // over the skull: closed at the crown, clearing the measured
      // silhouette by five or six millimetres all the way down
      [0.004, 0.140], [0.045, 0.126], [0.076, 0.106], [0.090, 0.086],
      [0.101, 0.054], [0.107, 0.022], [0.109, -0.006],
      // and then it stops being a cap and starts being a length
      [0.111, -0.034], [0.117, -0.092], [0.121, -0.160], [0.121, -0.240],
      [0.115, -0.310], [0.101, -0.370], [0.079, -0.420], [0.049, -0.452],
      [0.018, -0.470], [0.004, -0.478]
    ].map(([r, y]) => [r * s, y * s]), gap, 30), HM));
    shell.scale.set(0.88 * wide, 1, 1.0);

    // The fringe: the arc that fills the opening, wider than it and a
    // little further out, so it laps over the shell's cut edges instead
    // of meeting them. It has to end below the hairline painted on the
    // forehead, or you see the paint; and above the brows, or she has no
    // eyes. There is about two centimetres of room and this is it.
    const fr = put(new THREE.Mesh(hairArc([
      [0.058, 0.120], [0.082, 0.106], [0.096, 0.087],
      [0.105, 0.068], [0.109, 0.058]
    ].map(([r, y]) => [r * s, y * s]), gap + 0.50, 20), HM));
    fr.scale.set(0.92 * wide, 1, 1.0);

    // ...and set a little off square, because a fringe cut dead level all
    // the way round is a helmet. The whole arc tips, so one temple is
    // longer than the other and the line across the brow is not a rule.
    fr.rotation.set(0.05, 0.06, 0.085);

    if (style === 'wave') {
      // loose strands over the shoulders. Four, uneven, at different depths.
      [[-0.086, -0.250, 0.052, -0.14], [0.092, -0.212, 0.046, 0.18],
       [-0.068, -0.316, 0.030, -0.22], [0.076, -0.330, 0.026, 0.10]]
        .forEach(([x, y, z, rz], i) => {
          const st = put(new THREE.Mesh(CAP(0.013 * s, (0.09 + i * 0.02) * s, 8), HM));
          st.position.set(x * s, y * s, z * s); st.rotation.z = rz;
          st.rotation.x = -0.10 - i * 0.03;
        });
    }
  }

  if (style === 'ponytail') {
    cap([[1.13, 0.000], [1.09, -0.240], [0.96, -0.400], [0.72, -0.480]], 1.95, 22);
    const band = mass(0.55, 0.34, 0.53, 0, -0.26, -0.95, 10);
    band.rotation.x = 0.1;
    const tail = new THREE.Mesh(CAP(0.034 * s, 0.16 * s, 10), HM);
    tail.position.set(0, hy - 0.140 * s, -0.108 * s); tail.rotation.x = -0.30;
    headG.add(tail); out.push(tail);
  }

  out.forEach(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return out;
}

// ============================================================ PEOPLE
/**
 * A person. One skinned body from body.js, wearing whatever the outfit
 * says, with the head, hair and glasses hung on its bones here.
 *
 * The rig contract has not changed: hips / torso / headG / jaw /
 * arms[].sh,.el,.hand,.fingers,.thumbG / legs[].hp,.kn,.ankle are the
 * same objects chapters pose, they are just Bones now, and the skin
 * follows them instead of a part rotating against its neighbour.
 *
 * Clothes: `top` may be a colour (legacy) or { style, color, color2 };
 * `topStyle` picks hoodie | jacket | flannel | sweater | shirt | coat
 * for a plain colour. `bottom` + `pantsStyle` (jeans | trouser | khaki),
 * `boots` + `shoeStyle` (boot | shoe | sneaker | loafer). `coat: true`
 * is the barn coat; a colour is a coat in that colour.
 */
export function humanoid({
  height = 1.7, skin = 0xd8b49a, hair = 0x8a6b45, top = 0x5a6070, bottom = 0x2f3540,
  coat = null, boots = 0x3a2f26, build = 1.0, hairLong = true,
  topStyle = null, pantsStyle = 'jeans', shoeStyle = 'boot', top2 = null, hood = false,
  face = null,             // { iris, lipCol, stubble, age, brow } for the painted face
  female = 0,              // 0..1: the whole silhouette, not a swapped texture
  hairStyle = null,        // 'short' | 'crop' | 'bob' | 'bun' | 'long' | 'wave' | 'ponytail'
  head = null,             // { wide, jaw, nose, chin } to stop everyone sharing a skull
  age = 0,                 // 0..1: stoop, softer shoulders, a slower spine
  bun = false,             // hair up, which is most women over sixty here
  glasses = null,          // frame colour, or null
  detail = 'high'          // 'low' for the pavement: fewer rings, a mitten, no ears
} = {}) {
  const s = height / 1.7;
  const M = (c, r = .92) => flat(c, { rough: r });
  const hi = detail !== 'low';
  const fm = female;

  // ---- what they have on
  const topO = (top && typeof top === 'object') ? top
    : coat ? { style: 'coat', color: coat === true ? 0x7a6a52 : coat }
    : { style: topStyle || 'jacket', color: top, color2: top2, hood };
  const pantsO = (bottom && typeof bottom === 'object') ? bottom : { style: pantsStyle, color: bottom };
  const shoeO = (boots && typeof boots === 'object') ? boots : { style: shoeStyle, color: boots };

  const body = buildBody({
    height, build, female, age, skin, top: topO, pants: pantsO, shoe: shoeO,
    detail, atlasSize: hi ? 512 : 256
  });
  const g = body.g;
  const { hips, torso, chest, neckPivot, headG } = body.bones;
  body.rest();

  // The pivot is the atlas, at the base of the skull; the skull sits a
  // head-radius above it. Everything hung on the head -- ears, mouth,
  // glasses -- has to carry the same offset or it floats at the throat.
  const HY = 0.076 * s, HSY = 1.46;

  // ---- head.
  // One deformed sphere with a painted face on it. The sphere is built
  // with phiStart = -PI/2 so the middle column of the texture lands on
  // the front of the skull, and the deformation gives it the two things
  // a sphere does not have: a jaw that narrows to a chin, and a nose.
  // The sphere is sized on the *breadth* of a head and then stood up,
  // because a head is 15 cm across and 22 cm tall and a ball is neither.
  const hr = 0.0905 * s;
  const HS = { wide: 1, jaw: 1, nose: 1, chin: 1, ...(head || {}) };
  const style = hairStyle || (bun ? 'bun' : hairLong ? 'long' : 'short');
  const longHair = style === 'long' || style === 'wave';
  const fo = {
    skin, hair, iris: 0x4a3a28, lipCol: 0xa06254,
    stubble: 0, age: 0, female, ...(face || {}), long: longHair
  };
  // the painted hairline and the geometry that lifts the hair off the
  // skull have to be given the same line, or the hair floats
  const hl = { long: longHair, age: fo.age || 0, female };
  const fOpen = faceTex(fo, false), fShut = faceTex(fo, true);
  const faceM = new THREE.MeshStandardMaterial({
    map: fOpen, roughness: 0.80, metalness: 0,
    normalMap: normalOf(fOpen, 0.9)
  });
  faceM.normalScale.set(0.32, 0.32);
  const skull = new THREE.Mesh(headGeo(hr, hl, HS, hi ? 34 : 20), faceM);
  skull.position.y = HY; skull.scale.y = HSY; headG.add(skull);
  if (hi) {
    [-1, 1].forEach(sd => {
      const ear = new THREE.Mesh(SPH(0.5, 8), M(new THREE.Color(skin).multiplyScalar(0.92).getHex(), .8));
      ear.scale.set(0.085 * hr, 0.40 * hr * HSY, 0.26 * hr);
      ear.position.set(sd * 0.80 * hr * HS.wide, HY + headPoint(FACE_ROW.eye + 14, hr).y * HSY, -0.10 * hr);
      ear.rotation.set(0.12, sd * 0.22, -sd * 0.10); headG.add(ear);
    });
  }

  // the jaw does not hinge -- the head is one mesh. What opens is the
  // mouth: a dark hole that grows. Which is the tell, and it is worse.
  const jaw = new THREE.Group(); jaw.position.y = 0; headG.add(jaw);
  const mp = headPoint(FACE_ROW.mouth, hr);
  const mouthHole = new THREE.Mesh(SPH(0.5, 10), M(0x140a09, .9));
  mouthHole.scale.set(0.032 * s, 0.004 * s, 0.014 * s);
  mouthHole.position.set(0, HY + mp.y * HSY + 0.006 * s, mp.z - 0.002 * s);
  mouthHole.visible = false; jaw.add(mouthHole);

  if (glasses) {
    const ep = headPoint(FACE_ROW.eye, hr);
    const ey = HY + ep.y * HSY;
    const gm = flat(glasses, { rough: .35, metal: .5 });
    [-1, 1].forEach(sd => {
      const rim = new THREE.Mesh(SHAPE.Torus(0.021 * s, 0.0019 * s, 6, 16), gm);
      rim.position.set(sd * 0.028 * s, ey - 0.004 * s, ep.z + 0.010 * s); headG.add(rim);
      const bow = new THREE.Mesh(BOX(0.003 * s, 0.003 * s, 0.09 * s), gm);
      bow.position.set(sd * 0.064 * s, ey, 0.038 * s);
      bow.rotation.y = -sd * 0.26; headG.add(bow);
    });
    const bridge = new THREE.Mesh(BOX(0.016 * s, 0.003 * s, 0.003 * s), gm);
    bridge.position.set(0, ey - 0.002 * s, ep.z + 0.012 * s); headG.add(bridge);
  }

  // ---- hair. The hairline and the hair itself are painted on the head;
  // its volume is in the head geometry. Only what leaves the skull is a
  // mesh: a bun, or length down the back.
  hairRig(headG, {
    style, color: hair, s, id: fo.id || '', hr, hsy: HSY, hy: HY, wide: HS.wide
  });

  // ---- the rig, in the names the chapters use
  const arms = body.bones.arms.map(a => ({
    sh: a.sh, el: a.el, hand: a.hand, knuckles: a.knuckles, fingers: a.fingers, thumbG: a.thumb, side: a.side,
    restX: a.sh.rotation.x, restZ: a.sh.rotation.z, restEl: a.el.rotation.x
  }));
  const legs = body.bones.legs.map(l => ({
    hp: l.hp, kn: l.kn, ankle: l.ankle, boot: null, side: l.side,
    restHp: l.hp.rotation.x, restKn: l.kn.rotation.x
  }));

  g.traverse(o => { if (o.isMesh) { o.castShadow = hi; o.receiveShadow = true; } });
  return {
    g, hips, torso, neckPivot, headG, jaw, arms, legs, chest, skull, body: body.mesh,
    coatMesh: topO.style === 'coat' ? body.mesh : null, scale: s,
    head: { hr, hy: HY, hsy: HSY },
    // `opts` and `gaze` are how the eyes move: Character paints the iris
    // in four more places on demand and swaps the map, the same trick the
    // blink already uses. See GAZE in this file.
    face: { mat: faceM, open: fOpen, shut: fShut, opts: fo, gaze: [fOpen] },
    mouthHole, mouthH0: mouthHole.scale.y, mouthY0: mouthHole.position.y
  };
}


/**
 * Where the iris is painted, in canvas pixels, for each of the five
 * eye positions: level, and the four corners of the socket. Canvas X
 * runs the same way as the head's own +X, so index 1 is the character
 * looking to their own left, which is the same side the head turns to
 * on a positive yaw. Down is further than up because a person looking
 * down closes the lid over it and a person looking up does not.
 */
const GAZE = [[0, 0], [3.4, 0], [-3.4, 0], [0, 2.2], [0, -1.8]];

/**
 * Character controller: idle sway, walk, look-at, and the three
 * ways the thing wearing Recca breaks the illusion (doc §3).
 */
export class Character {
  constructor(world, parts, { name = '', walkSpeed = 1.1 } = {}) {
    this.world = world;
    this.p = parts;
    this.g = parts.g;
    this.name = name;
    this.t = Math.random() * 10;
    this.walkPhase = 0;
    this.moving = false;
    this.speed = walkSpeed;
    this.target = null;
    this.lookAtTarget = null;
    this.lookWeight = 0;
    this.jawOpen = 0;          // tell #1, opens too far when she is about to lie
    this.breathFog = null;
    this.blink = 0;
    this.blinkT = 1 + Math.random() * 4;
    this.blinkK = 0;
    this.jawSm = 0;
    // ---- the eyes. See _gaze.
    this.gx = 0; this.gy = 0;          // where the iris is, -1..1 in each axis
    this.gazeIdx = 0;                  // which painted eye is on the face
    this.sacT = 0.4 + Math.random();   // seconds to the next flick
    this.sacX = 0; this.sacY = 0;      // and where it went
    this.eyes = true;
    this.armPose = [null, null];
    // ---- performance. See setBusy / gesture / speak below.
    this.busyName = null;
    this.busyT = Math.random() * 4;
    this.busyHold = 0;
    this.busyUntil = 0;
    this.busyPrev = null;
    this.gest = null;
    this.speakT = 0;
    this.jawAuto = 0;          // what the acting drives; jawOpen stays manual
    this.headOff = new THREE.Vector3();
    this.headBase = new THREE.Vector2();   // where the look-at wants the head
    this.shoulderLift = 0;
    this.leanIn = 0;
    this.p.chestZ0 = this.p.chest ? this.p.chest.scale.z : 1;
    if (name) CAST.set(name, this);
    world.add(this.g);
    this._tick = world.tick((dt, ctx) => this.update(dt, ctx));
  }

  setPos(x, y, z) { this.g.position.set(x, y, z); return this; }
  face(x, z) { this.g.rotation.y = Math.atan2(x - this.g.position.x, z - this.g.position.z); return this; }
  walkTo(x, z, onArrive) { this.target = new THREE.Vector3(x, this.g.position.y, z); this.onArrive = onArrive; this.moving = true; return this; }
  stop() { this.moving = false; this.target = null; }

  /** Tell #2, her shadow is cast from the wrong direction. */
  wrongShadow(dirAngle = 0.9, len = 2.4) {
    if (this.shadow) return this.shadow;
    const m = new THREE.Mesh(SHAPE.Plane(0.5, len),
      flat(0x000000, { rough: 1, transparent: true, opacity: 0.42 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.012, len / 2);
    const pivot = new THREE.Group();
    pivot.rotation.y = dirAngle;
    pivot.add(m);
    this.g.add(pivot);
    this.shadow = pivot;
    return pivot;
  }

  /** Snow does not land on her shoulders. Ch4. */
  setSnowShed(on) { this.snowShed = on; }

  lookAt(obj) { this.lookAtTarget = obj; }

  /**
   * Pin an arm somewhere the walk cycle is not allowed to argue with.
   * `i` is 0 (left) or 1 (right); pass null to give it back.
   * Angles: `x` shoulder pitch, `z` shoulder out from the body, `el` elbow.
   */
  setArmPose(i, pose) { this.armPose[i] = pose; return this; }

  // ------------------------------------------------------------ acting
  /**
   * What this person is doing with their hands while the scene runs.
   * It keeps running under dialogue, because nobody stops folding a
   * towel to say a sentence, and somebody who freezes solid the moment
   * they start talking is the loudest thing in the room.
   *
   * 'fold' | 'salt' | 'clasp' | 'pockets' | 'write' | 'wipe' |
   * 'wash' | 'sweep' | 'counter' | null
   */
  setBusy(name, sec = 0) {
    if (sec > 0) { this.busyPrev = this.busyName; this.busyUntil = sec; }
    else { this.busyUntil = 0; this.busyPrev = null; }
    this.busyName = name || null;
    return this;
  }
  /** Stop the hands for a moment without forgetting what they were doing. */
  pauseBusy(sec = 1.0) { this.busyHold = Math.max(this.busyHold, sec); return this; }
  /** Put them back to work now, whatever they were told to hold for. */
  resumeBusy(name = null) { this.busyHold = 0; if (name) this.setBusy(name); return this; }

  /**
   * A one-off beat, in the script's own words: smile, laugh, nod, shake,
   * shrug, lookAway, lookDown, still, flinch, cry, reach.
   */
  gesture(name, dur = 0) {
    const D = {
      smile: 1.3, laugh: 1.6, nod: 1.1, shake: 1.0, shrug: 1.0, lookAway: 1.6,
      lookDown: 1.6, still: 1.2, flinch: 0.5, cry: 2.4, reach: 1.4, lean: 2.0
    };
    if (!(name in D)) return this;
    this.gest = { name, t: 0, dur: dur || D[name] };
    if (name === 'still' || name === 'laugh' || name === 'cry' || name === 'reach') {
      this.pauseBusy(this.gest.dur);
    }
    return this;
  }

  /** A line of theirs is on screen: move the mouth for that long. */
  speak(ms) { this.speakT = Math.max(this.speakT, ms / 1000); return this; }

  /** The hand pose for whatever they are busy with, or null. */
  _busyPose(i) {
    // hands that are walking are not folding
    if (!this.busyName || this.busyHold > 0 || this.moving) return null;
    const t = this.busyT, sd = i === 0 ? -1 : 1;
    switch (this.busyName) {
      case 'fold': {
        // a fold is a cycle: lift, bring together, press down, reach for
        // the next one. Four seconds, and the hands disagree by a beat.
        const c = (t * 0.42 + i * 0.06) % 1;
        const lift = Math.sin(c * Math.PI * 2) * 0.5 + 0.5;
        const press = Math.max(0, Math.sin(c * Math.PI * 4));
        // hands over a folding table, which is waist high: an arm folded
        // up at the chest is somebody praying, not somebody working
        return {
          x: -0.34 - lift * 0.26 + press * 0.10,
          z: 0.26 - lift * 0.12,
          el: -1.02 - lift * 0.20 + press * 0.10
        };
      }
      case 'salt': {
        const sw = Math.sin(t * 0.9);
        return i === 1
          ? { x: 0.34 + sw * 0.30, z: 0.16 + Math.max(0, sw) * 0.10, el: -0.62 - sw * 0.22 }
          : null;
      }
      case 'write': {
        const sc = Math.sin(t * 5.5) * 0.04;
        return i === 1 ? { x: -0.72 + sc, z: 0.24, el: -1.45 - sc }
          : { x: -0.55, z: 0.30, el: -1.30 };
      }
      case 'clasp':
        // hands together in front, which is what people do with their
        // hands when they are talking to somebody and holding nothing
        return { x: -0.34 + Math.sin(t * 0.7 + i) * 0.015, z: 0.22, el: -1.05 };
      case 'pockets':
        return { x: 0.10, z: 0.20, el: -0.62 };
      case 'wipe': {
        // a cloth going round a counter, which is what everybody behind
        // one is doing whether the counter needs it or not
        const c = Math.sin(t * 1.9), d2 = Math.cos(t * 1.9);
        return i === 1
          ? { x: -0.62 + d2 * 0.10, z: 0.30 + c * 0.26, el: -1.18 - Math.abs(c) * 0.12 }
          : { x: -0.18, z: 0.16, el: -0.72 };
      }
      case 'wash': {
        // a sponge over the roof of a car: long, slow, both arms, and the
        // shoulders go with it
        const c = Math.sin(t * 1.35);
        return { x: -0.92 + c * 0.22, z: 0.20 + Math.max(0, c) * 0.14, el: -0.58 - Math.abs(c) * 0.20 };
      }
      case 'sweep': {
        const c = Math.sin(t * 1.15);
        return i === 1
          ? { x: -0.46 + c * 0.24, z: 0.22, el: -0.94 - Math.max(0, c) * 0.18 }
          : { x: -0.30 + c * 0.14, z: 0.12, el: -1.22 };
      }
      case 'counter': {
        // both forearms down on a counter, which is a whole personality
        return { x: -0.86, z: 0.14 + i * 0.02, el: -0.88 + Math.sin(t * 0.5 + i) * 0.02 };
      }
      default: return null;
    }
  }

  /** Fold the gesture into head, shoulders and jaw. */
  _acting(dt) {
    const p = this.p;
    this.busyT += dt;
    this.busyHold = Math.max(0, this.busyHold - dt);
    if (this.busyUntil > 0 && (this.busyUntil -= dt) <= 0) {
      this.busyName = this.busyPrev; this.busyPrev = null; this.busyUntil = 0;
    }
    this.headOff.set(0, 0, 0);
    this.shoulderLift = 0;
    this.leanIn = 0;
    this.jawAuto = 0;

    if (this.gest) {
      const g = this.gest;
      g.t += dt;
      const u = Math.min(1, g.t / g.dur);
      // in fast, out slow: a gesture is a thing that happens and then
      // relaxes, not a sine wave
      const env = Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1 - Math.max(0, (u - 0.55) / 0.45) ** 2);
      const w = Math.max(0, env);
      switch (g.name) {
        case 'smile': this.headOff.set(-0.05 * w, 0, 0.07 * w); this.shoulderLift = 0.20 * w; break;
        case 'laugh':
          this.headOff.set(-0.18 * w, Math.sin(g.t * 34) * 0.012 * w, 0.05 * w);
          this.shoulderLift = (0.30 + Math.abs(Math.sin(g.t * 17)) * 0.5) * w;
          this.jawAuto = Math.max(this.jawAuto, (0.35 + Math.sin(g.t * 17) * 0.2) * w);
          break;
        case 'nod': this.headOff.x = Math.sin(g.t * 6.4) * 0.16 * w; break;
        case 'shake': this.headOff.y = Math.sin(g.t * 6.0) * 0.22 * w; break;
        case 'shrug': this.shoulderLift = 1.0 * w; this.headOff.x = -0.06 * w; break;
        case 'lookAway': this.headOff.set(0.04 * w, 0.55 * w, 0); this.lookHold = w; break;
        case 'lookDown': this.headOff.set(0.42 * w, 0.10 * w, 0); this.lookHold = w; break;
        case 'flinch': this.headOff.set(0.10 * w, -0.08 * w, 0); this.shoulderLift = 0.7 * w; break;
        case 'cry':
          this.headOff.set(0.30 * w, 0, 0);
          this.shoulderLift = (0.2 + Math.abs(Math.sin(g.t * 9)) * 0.3) * w;
          break;
        case 'lean': this.leanIn = w; break;
        case 'reach': this.leanIn = 0.5 * w; break;
      }
      if (u >= 1) this.gest = null;
    }

    // the mouth, while a line of theirs is on screen. A face that never
    // opens its mouth through four minutes of dialogue is a mask.
    if (this.speakT > 0) {
      this.speakT -= dt;
      const t = this.t;
      const v = Math.sin(t * 13.7) * 0.5 + Math.sin(t * 21.3) * 0.3 + Math.sin(t * 7.1) * 0.2;
      this.jawAuto = Math.max(this.jawAuto, 0.10 + Math.max(0, v) * 0.30);
      if (this.speakT <= 0) this.speakT = 0;
    }

    if (this.leanIn) p.torso.rotation.x += this.leanIn * 0.10;
  }

  /** Put a prop in a hand and close the fingers on it. */
  hold(i, obj, { curl = 0.9, pose = { x: 0.15, z: 0.10, el: -0.55 } } = {}) {
    const a = this.p.arms[i];
    a.hand.add(obj);
    // Four fingers do not close by the same amount on anything. The
    // index takes the weight, the little finger barely commits, and
    // that stagger is most of what separates a grip from a mitten.
    const STAG = [1.0, 0.94, 0.88, 0.78];
    a.fingers.forEach((f, k) => {
      // the knuckle line runs front to back, so a finger closes on the
      // palm by turning about z, toward the body
      f.rotation.z = -a.side * (0.42 + curl * 0.95 * (STAG[k] ?? 1));
    });
    if (a.thumbG) a.thumbG.rotation.x = -0.55 - curl * 0.40;
    this.setArmPose(i, pose);
    return obj;
  }

  /**
   * The eyes.
   *
   * The head lerps toward whatever it is looking at over about a
   * quarter of a second. Eyes do not: they snap, they arrive first,
   * and they sit at the corner of the socket while the neck catches
   * up. That lag is the single loudest difference between a person
   * looking at you and a mask that has been aimed at you, and it is
   * free here, because the iris is painted and a painted iris can be
   * painted somewhere else.
   *
   * Five faces, drawn on demand and then cached forever: centre, and
   * the four corners of the socket. Between flicks the eyes are never
   * still, because nobody's are, they walk your face while you talk.
   */
  _gaze(dt, wantYaw, wantPitch) {
    const f = this.p.face;
    if (!f) return;
    if (!this.eyes || !f.opts) {
      const want = this.blinkK > 0 ? f.shut : f.open;
      if (f.mat.map !== want) f.mat.map = want;
      return;
    }

    // ---- micro-saccades: the eyes walk between your eyes and your mouth
    this.sacT -= dt;
    if (this.sacT <= 0) {
      this.sacT = 0.55 + Math.random() * 2.1;
      this.sacX = (Math.random() - 0.5) * 0.9;
      this.sacY = (Math.random() - 0.5) * 0.7;
      // and every so often the eyes go somewhere else entirely for a
      // moment, which is a person thinking rather than a camera tracking
      if (Math.random() < 0.22) { this.sacX *= 2.6; this.sacY *= 1.6; }
    }

    let tx, ty;
    const g = this.gest;
    if (g && (g.name === 'lookAway' || g.name === 'lookDown')) {
      // the eyes lead the turn away, they do not strain back toward it
      tx = g.name === 'lookAway' ? Math.sign(this.headOff.y || 1) * 0.85 : 0.2;
      ty = g.name === 'lookDown' ? 0.9 : 0.15;
    } else if (this.lookAtTarget) {
      // whatever the neck has not covered yet, in socket widths
      tx = THREE.MathUtils.clamp((wantYaw - this.headBase.y) / 0.34, -1, 1) + this.sacX * 0.45;
      ty = THREE.MathUtils.clamp((wantPitch - this.headBase.x) / 0.30, -1, 1) + this.sacY * 0.45;
    } else {
      tx = this.sacX; ty = this.sacY;
    }

    // eyes move fast, but not instantly: a flick is about 40 ms
    const k = Math.min(1, dt * 22);
    this.gx += (THREE.MathUtils.clamp(tx, -1.2, 1.2) - this.gx) * k;
    this.gy += (THREE.MathUtils.clamp(ty, -1.2, 1.2) - this.gy) * k;

    // ---- which of the five painted eyes that is.
    // Deadzone, then the dominant axis, so the face never flickers
    // between two maps a frame apart.
    let idx = 0;
    if (Math.abs(this.gx) > 0.30 || Math.abs(this.gy) > 0.34) {
      idx = Math.abs(this.gx) * 1.25 >= Math.abs(this.gy)
        ? (this.gx > 0 ? 1 : 2)
        : (this.gy > 0 ? 3 : 4);
    }
    if (idx !== this.gazeIdx) this.gazeIdx = idx;

    const want = this.blinkK > 0 ? f.shut : this._gazeMap(this.gazeIdx);
    if (f.mat.map !== want) f.mat.map = want;
  }

  /** One of the five faces, painted the first time it is needed. */
  _gazeMap(i) {
    const f = this.p.face;
    if (i === 0 || !f.opts) return f.open;
    if (!f.gaze[i]) f.gaze[i] = faceTex(f.opts, false, GAZE[i]);
    return f.gaze[i];
  }

  update(dt, ctx) {
    this.t += dt;
    const p = this.p;
    this._acting(dt);

    if (this.moving && this.target) {
      const d = this.target.clone().sub(this.g.position);
      d.y = 0;
      const len = d.length();
      if (len < 0.12) {
        this.moving = false; this.target = null;
        this.onArrive?.(); this.onArrive = null;
      } else {
        d.normalize();
        this.g.position.addScaledVector(d, this.speed * dt);
        const want = Math.atan2(d.x, d.z);
        let diff = want - this.g.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.g.rotation.y += diff * Math.min(1, dt * 5);
        this.walkPhase += dt * this.speed * 4.2;
      }
    }

    const w = this.moving ? 1 : 0;
    const idle = 1 - w;
    // standing still is not standing still: breath, and the weight goes
    // from one hip to the other about every four seconds
    const breath = Math.sin(this.t * 1.15) * 0.5 + Math.sin(this.t * 0.43) * 0.5;
    const shift = Math.sin(this.t * 0.31);
    const sway = Math.sin(this.t * 0.9) * 0.012 + Math.sin(this.t * 0.37) * 0.008;
    p.torso.rotation.z = (sway + shift * 0.020) * idle;
    p.torso.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.03 * w
      + breath * 0.006 * idle;
    if (p.chest) p.chest.scale.z = p.chestZ0 * (1 + breath * 0.022 * idle);

    const swing = Math.sin(this.walkPhase);
    p.legs.forEach((l, i) => {
      const sg = i === 0 ? swing : -swing;
      l.hp.rotation.x = l.restHp + sg * 0.62 * w + idle * shift * l.side * 0.02;
      l.kn.rotation.x = l.restKn + Math.max(0, -sg) * 0.7 * w + idle * 0.03;
      if (l.ankle) l.ankle.rotation.x = (-sg * 0.22 + Math.max(0, sg) * 0.10) * w;
    });
    p.arms.forEach((a, i) => {
      const sg = i === 0 ? swing : -swing;
      const po = this.armPose?.[i] ?? this._busyPose(i);
      const k = Math.min(1, dt * 6);
      if (po) {
        a.sh.rotation.x += ((po.x ?? a.restX) - a.sh.rotation.x) * k;
        a.sh.rotation.z += ((po.z ?? a.restZ) - a.sh.rotation.z) * k;
        a.el.rotation.x += ((po.el ?? a.restEl) - a.el.rotation.x) * k;
      } else {
        a.sh.rotation.x = a.restX - sg * 0.36 * w + idle * breath * 0.012;
        a.sh.rotation.z = a.restZ + a.side * 0.03 * w + a.side * this.shoulderLift * 0.16;
        a.el.rotation.x = a.restEl - 0.22 * w - Math.abs(sg) * 0.10 * w;
      }
    });

    // the lids. a person who never blinks is the wrong kind of scary,
    // and Recca not blinking should be a choice, not the default.
    if (p.face && this.blinks !== false) {
      this.blinkT -= dt;
      if (this.blinkT <= 0) { this.blinkT = 2.6 + Math.random() * 4.4; this.blinkK = 0.16; }
      this.blinkK = Math.max(0, this.blinkK - dt);
    }

    // head look-at
    let wantYaw = 0, wantPitch = 0;
    if (this.lookAtTarget) {
      const tp = this.lookAtTarget.isVector3 ? this.lookAtTarget
        : this.lookAtTarget.getWorldPosition(new THREE.Vector3());
      const local = this.g.worldToLocal(tp.clone());
      wantYaw = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.2, 1.2);
      wantPitch = THREE.MathUtils.clamp(
        -Math.atan2(local.y - 1.5 * p.scale, Math.hypot(local.x, local.z)), -0.5, 0.5);
      this.lookWeight = Math.min(1, this.lookWeight + dt * 2.5);
      this.headBase.y += (wantYaw - this.headBase.y) * Math.min(1, dt * 4);
      this.headBase.x += (wantPitch - this.headBase.x) * Math.min(1, dt * 4);
    } else {
      this.headBase.y += (0 - this.headBase.y) * Math.min(1, dt * 2);
      this.headBase.x += (0 - this.headBase.x) * Math.min(1, dt * 2);
    }
    // and then the eyes, which got there first
    this._gaze(dt, wantYaw, wantPitch);
    // A nod, a shake, a glance away, laid over wherever the look-at has
    // put the head. It has to be an overlay on a base the gesture never
    // touches: added straight onto headG.rotation it accumulates every
    // frame against a lerp that only decays a few percent, and one laugh
    // puts her chin on the ceiling.
    p.headG.rotation.x = this.headBase.x + this.headOff.x;
    p.headG.rotation.y = this.headBase.y + this.headOff.y;
    p.headG.rotation.z = this.headOff.z;

    // tell #1: the jaw. The head is one mesh, so what opens is the mouth.
    const jawWant = Math.max(this.jawOpen, this.jawAuto);
    this.jawSm += (jawWant - this.jawSm) * Math.min(1, dt * (this.speakT > 0 ? 14 : 6));
    p.jaw.rotation.x += (this.jawSm * 0.10 - p.jaw.rotation.x) * Math.min(1, dt * 6);
    if (p.mouthHole) {
      p.mouthHole.visible = this.jawSm > 0.02;
      p.mouthHole.scale.y = p.mouthH0 * (1 + this.jawSm * 14);
      p.mouthHole.position.y = p.mouthY0 - this.jawSm * 0.012 * p.scale;
    }
  }

  dispose() {
    this.world.untick(this._tick);
    if (this.name && CAST.get(this.name) === this) CAST.delete(this.name);
    this.g.parent?.remove(this.g);
  }
}

// ============================================================ PERFORMANCE
/**
 * Every named character, by the label the subtitles use. A line arrives
 * as ('RECCA', 'text'), and this is how the text finds the body.
 */
export const CAST = new Map();

/**
 * The scripts have always carried their own stage directions -- "[she
 * smiles]", "[she stops folding, one second, then keeps going]", "[a long
 * pause]" -- and until now they were subtitles and nothing else: she
 * stood dead still through four minutes of dialogue describing things she
 * was supposedly doing. This reads them and moves her.
 *
 * Called for every line the UI shows. `ms` is how long the line is up,
 * which is how long the mouth moves for.
 */
export function performLine(who, text, ms = 0, { style = '' } = {}) {
  const c = CAST.get(who);
  if (!c) return;
  const t = String(text || '').toLowerCase();
  const dir = t.match(/\[[^\]]*\]/g)?.join(' ') || '';
  const has = (...w) => w.some(x => dir.includes(x));

  // a bracketed direction is not spoken, so the mouth only moves for the
  // rest of the line
  const spoken = String(text || '').replace(/\[[^\]]*\]/g, '').trim();
  if (spoken && style !== 'thought' && style !== 'radio') {
    c.speak(ms * (spoken.length / Math.max(1, String(text).length)));
  }

  if (!dir) return;
  if (has('laugh')) c.gesture('laugh', has('once') ? 0.9 : 1.6);
  else if (has('smil', 'likes that', 'means it', 'warmly')) c.gesture('smile');
  if (has('nods', 'nodd')) c.gesture('nod');
  if (has('shakes her head', 'shakes his head')) c.gesture('shake');
  if (has('shrug')) c.gesture('shrug');
  if (has('cry', 'cries', 'crying', 'shaking')) c.gesture('cry');
  if (has('looks away', 'looks at the', 'looks out', 'decides not to')) c.gesture('lookAway');
  if (has('looks at her own hands', 'looks at his own hands', 'looks down', 'looks at her hands')) c.gesture('lookDown');
  if (has('leaning in', 'leans in', 'takes his hand', 'puts her hand out', 'touches')) c.gesture('lean');
  if (has('writes')) c.setBusy('write', 3.4);
  const stops = has('holds still', 'she stops', 'he stops', 'stops folding', 'without any pause');
  if (stops) c.gesture('still', 1.4);
  if (has('pause', 'beat', 'waits', 'a while', 'too long')) {
    c.pauseBusy(has('long', 'four seconds', 'a while') ? 2.6 : 1.2);
  }
  // "[she stops folding, one second, then keeps going]" is one line and
  // both halves of it are true, so the resume must not eat the stop
  if (!stops && has('keeps going', 'still going', 'folds one whole towel')) c.busyHold = 0;
}

/** Recca as she appears. 5'4". Her grandfather's coat, three sizes too big. */
export function makeRecca(world, { coat = true } = {}) {
  const parts = humanoid({
    height: 1.63, skin: 0xe0bda2, hair: 0x7c4a2c,
    top: 0x6b5f52, topStyle: 'sweater', bottom: 0x2c3444, pantsStyle: 'jeans', coat: coat ? true : null,
    boots: 0x4a3b2c, shoeStyle: 'boot', build: 0.92, hairLong: true,
    female: 1, hairStyle: 'wave',
    head: { wide: 0.95, jaw: 0.78, nose: 0.76, chin: 0.94, brow: 0.7 },
    face: {
      iris: 0x556a4a, lipCol: 0xb4706a, eyeW: 1.20, eyeGap: 1.02,
      noseW: 0.76, mouthW: 0.94, browY: 2, lash: 1, freck: 0.7, id: 'recca'
    }
  });
  const c = new Character(world, parts, { name: 'RECCA', walkSpeed: 1.15 });
  c.isRecca = true;
  return c;
}

/** Recca as she is. Same girl. Grey-blue of three months in cold water. */
export function makeReccaDrowned(world) {
  const parts = humanoid({
    height: 1.63, skin: 0x8fa2a8, hair: 0x50412f,
    top: 0x4a4438, bottom: 0x2a3038, coat: true,
    boots: 0x3a2f26, build: 0.92, hairLong: true,
    female: 1, hairStyle: 'long',
    head: { wide: 0.95, jaw: 0.78, nose: 0.76, chin: 0.94, brow: 0.7 },
    face: {
      iris: 0x7a7a70, lipCol: 0x7f7278, eyeW: 1.20, eyeGap: 1.02,
      noseW: 0.76, mouthW: 0.94, lash: 1, age: 0.2, id: 'drowned'
    }
  });
  const c = new Character(world, parts, { name: 'RECCA', walkSpeed: 0.52 });
  c.isRecca = true; c.drowned = true;
  // silt in the hair, mine dust under the fingernails
  parts.headG.traverse(m => { if (m.material?.color?.getHex?.() === 0x6f6350) m.material = flat(0x655a48, { rough: 1 }); });
  return c;
}

/** Fr. Victor Kowal, 24. Transitional deacon, and he will correct you. */
export function makeVictor(world) {
  const parts = humanoid({
    height: 1.79, skin: 0xc9a184, hair: 0x2a231c,
    top: 0x16161a, topStyle: 'shirt', bottom: 0x1e1e22, pantsStyle: 'trouser',
    boots: 0x1a1a1c, shoeStyle: 'shoe', build: 1.02, hairLong: false,
    hood: true,          // hooded sweatshirt under the clergy shirt
    hairStyle: 'crop', head: { wide: 0.97, jaw: 1.12, nose: 1.14, chin: 1.16, brow: 1.2 },
    face: {
      iris: 0x3a2c1e, lipCol: 0x9c6154, stubble: 0.7,
      eyeGap: 0.95, eyeW: 0.94, noseW: 1.10, browY: -2, id: 'victor'
    }
  });
  // the collar tab is missing; there's a strip of cut-up milk jug in his pocket
  const c = new Character(world, parts, { name: 'VICTOR', walkSpeed: 1.35 });
  c.isVictor = true;
  return c;
}

export function makeMarta(world) {
  const parts = humanoid({
    height: 1.58, skin: 0xd6b096, hair: 0x4a3b30,
    top: 0x5c4a5e, topStyle: 'sweater', bottom: 0x33363c, pantsStyle: 'trouser',
    boots: 0x2a2a2c, shoeStyle: 'shoe', build: 1.02, hairLong: false,
    female: 0.9, hairStyle: 'bob',
    head: { wide: 1.0, jaw: 0.86, nose: 0.92, chin: 0.94 },
    face: {
      iris: 0x4a3826, lipCol: 0xa8706a, age: 0.45, eyeW: 1.06,
      eyeGap: 0.98, lash: 0.6, mouthW: 1.0, id: 'marta'
    }
  });
  const c = new Character(world, parts, { name: 'MARTA', walkSpeed: 0.9 });
  // Miraculous Medal
  const medal = new THREE.Mesh(CYL(0.012, 0.012, 0.002, 10), flat(0xc9b071, { rough: .3, metal: .8 }));
  medal.rotation.x = Math.PI / 2; medal.position.set(0, 0.34, 0.105); parts.torso.add(medal);
  return c;
}

export function makeGeneric(world, opts = {}) {
  return new Character(world, humanoid(opts), opts);
}

/** Buttons. Do not put a dog in a horror game unless you mean it. */
export function makeButtons(world, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const M = flat(0x8a7358, { rough: .98 });
  const body = new THREE.Mesh(SHAPE.Box(0.22, 0.24, 0.5), M); body.position.y = 0.36; g.add(body);
  const head = new THREE.Mesh(SHAPE.Box(0.18, 0.18, 0.2), M); head.position.set(0, 0.48, 0.31); g.add(head);
  const snout = new THREE.Mesh(SHAPE.Box(0.09, 0.08, 0.12), flat(0x6d5947, { rough: .98 }));
  snout.position.set(0, 0.45, 0.44); g.add(snout);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(SHAPE.Box(0.05, 0.11, 0.03), flat(0x6d5947, { rough: .98 }));
    ear.position.set(s * 0.07, 0.57, 0.28); ear.rotation.z = s * 0.2; g.add(ear);
  });
  const legs = [];
  [[-.08, .18], [.08, .18], [-.08, -.16], [.08, -.16]].forEach(([lx, lz]) => {
    const l = new THREE.Mesh(SHAPE.Box(0.055, 0.26, 0.06), M);
    l.position.set(lx, 0.13, lz); g.add(l); legs.push(l);
  });
  const tail = new THREE.Group(); tail.position.set(0, 0.44, -0.24); g.add(tail);
  const tm = new THREE.Mesh(SHAPE.Box(0.04, 0.04, 0.2), M); tm.position.z = -0.1; tail.add(tm);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  world.add(g);
  const h = { g, tail, legs, wag: 1, following: false, t: 0 };
  world.tick(dt => {
    h.t += dt;
    tail.rotation.y = Math.sin(h.t * 7) * 0.5 * h.wag;
    g.position.y = y + Math.abs(Math.sin(h.t * 3)) * 0.005;
  });
  return h;
}
