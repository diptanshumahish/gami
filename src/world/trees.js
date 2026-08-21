/* ============================================================
   trees.js: the trees beside every road out of Ashgrove.

   Two kinds of tree and two ways of drawing them. Up close a
   tree is BUILT: a bark trunk with a lean, three or four limbs,
   and a clump of leaf cards crossed at every limb end for a
   hardwood; a trunk and three tiers of needles for a pine. Back
   in the fog a tree is two crossed cards with a painted
   silhouette, which is what it was on every machine this game is
   pretending to be, and what it still is at a hundred metres.

   Everything here adds plain meshes to a group and expects the
   caller to mergeByMaterial() it: a treeline of eighty trees is
   then four draw calls.
   ============================================================ */
import * as THREE from 'three';
import { T, mat } from './mat.js';
import { SHAPE, CYL, PLN } from './world.js';

const CARD = new Map();
/** The card material for a painted tree silhouette, tinted by the hour. */
export function cardMat(kind, tint) {
  const key = kind + '|' + tint;
  if (CARD.has(key)) return CARD.get(key);
  const m = new THREE.MeshStandardMaterial({
    map: T[kind](), color: tint, roughness: 1, metalness: 0,
    alphaTest: 0.45, side: THREE.DoubleSide, transparent: false
  });
  CARD.set(key, m);
  return m;
}

/** Two crossed cards. Cheap, and in fog it is a tree. */
export function cardTree(g, x, z, w, h, mat, R) {
  const yaw = R() * Math.PI;
  for (let k = 0; k < 2; k++) {
    const p = new THREE.Mesh(SHAPE.Plane(w, h), mat);
    p.position.set(x, h / 2 - 0.05, z);
    p.rotation.y = yaw + k * Math.PI / 2;
    g.add(p);
  }
}

const TREEM = new Map();
/** Bark, needles and leaf materials for a tint (a PALETTES entry or {tree}). */
export function treeMats(P) {
  const key = 'tm' + P.tree;
  if (TREEM.has(key)) return TREEM.get(key);
  const bark = mat('bark', T.bark, { roughness: .98, normalStrength: 2.0, normalScale: .8 });
  const needles = mat('needles', T.needles, { color: P.tree, roughness: 1, normalStrength: 1.2 });
  const leaf = new THREE.MeshStandardMaterial({
    map: T.foliage('summer'), color: P.tree, roughness: 1, metalness: 0,
    alphaTest: 0.45, side: THREE.DoubleSide
  });
  const leafDark = new THREE.MeshStandardMaterial({
    map: T.foliage('summer'), color: new THREE.Color(P.tree).multiplyScalar(0.72), roughness: 1, metalness: 0,
    alphaTest: 0.45, side: THREE.DoubleSide
  });
  const M = { bark, needles, leaf, leafDark };
  TREEM.set(key, M);
  return M;
}
const barkMesh = (geo, m, w, h) => { const mesh = new THREE.Mesh(geo, m); mesh.userData.uv = [w / (m.userData.metres || 1), h / (m.userData.metres || 1)]; return mesh; };

/** A hardwood, `sc` metres-ish of scale (1 = a 3 m trunk under a 5 m crown). */
export function hardwood(g, x, z, sc, M, R) {
  const th = 3.0 * sc, lean = (R() - 0.5) * 0.10, yaw = R() * Math.PI * 2;
  const t = barkMesh(CYL(0.11 * sc, 0.17 * sc, th, 7), M.bark, 1.0, th);
  t.position.set(x + lean * th * 0.5, th / 2 - 0.05, z); t.rotation.set(0, yaw, -lean); g.add(t);
  const top = new THREE.Vector3(x + lean * th, th, z);
  const tips = [];
  const limbs = 3 + (R() > 0.5 ? 1 : 0);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + R() * 0.8, len = (1.4 + R() * 0.8) * sc, tilt = 0.55 + R() * 0.3;
    const lb = barkMesh(CYL(0.03 * sc, 0.08 * sc, len, 5), M.bark, 0.4, len);
    lb.position.set(top.x + Math.cos(a) * len * 0.34, top.y + len * 0.36, top.z + Math.sin(a) * len * 0.34);
    lb.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    g.add(lb);
    tips.push(new THREE.Vector3(top.x + Math.cos(a) * len * 0.7, top.y + len * 0.72, top.z + Math.sin(a) * len * 0.7));
  }
  const card = (cx, cy, cz, size, dark, n = 3) => {
    for (let k = 0; k < n; k++) {
      const c = new THREE.Mesh(PLN(size, size), dark ? M.leafDark : M.leaf);
      c.position.set(cx + (R() - 0.5) * 0.4 * sc, cy + (R() - 0.5) * 0.3 * sc, cz + (R() - 0.5) * 0.4 * sc);
      c.rotation.set((R() - 0.5) * 0.5, (k / n) * Math.PI + R() * 0.5, (R() - 0.5) * 0.3);
      g.add(c);
    }
  };
  tips.forEach(p => card(p.x, p.y + 0.3 * sc, p.z, (2.2 + R() * 0.8) * sc, false));
  card(top.x, top.y + 1.5 * sc, top.z, (2.8 + R() * 0.6) * sc, false, 3);
  card(top.x, top.y + 0.5 * sc, top.z, (2.4 + R() * 0.6) * sc, true, 2);
  const crown = new THREE.Mesh(PLN(3.2 * sc, 3.2 * sc), M.leaf);
  crown.position.set(top.x, top.y + 2.2 * sc, top.z); crown.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.4, R() * 3, 0);
  g.add(crown);
}
/** A pine: trunk and three tiers. */
export function pine(g, x, z, sc, M, R) {
  const th = 2.2 * sc;
  const t = barkMesh(CYL(0.07 * sc, 0.15 * sc, th + 0.4, 6), M.bark, 0.8, th);
  t.position.set(x, th / 2, z); t.rotation.y = R() * 3; g.add(t);
  const tiers = [[1.2, 1.75, 3.0], [2.9, 1.35, 2.8], [4.5, 0.95, 2.7]];
  tiers.forEach(([y0, r, h], i) => {
    const c = new THREE.Mesh(SHAPE.Cone(r * sc * (0.9 + R() * 0.2), h * sc, 7), M.needles);
    c.position.set(x + (R() - 0.5) * 0.1, (y0 + h / 2) * sc, z + (R() - 0.5) * 0.1);
    c.rotation.y = R() * 3; c.rotation.z = (R() - 0.5) * 0.06;
    c.userData.uv = [2.2, 2.2];
    g.add(c);
  });
}


/**
 * Undergrowth: low, wide leaf cards along a strip, the brush that closes
 * the gap between the trunks and the ground. Without it a treeline is a
 * row of stilts with the sky showing under the crowns.
 */
export function brush(g, P, R, { x0, x1, z0, z1, n = 20, h = 2.6 }) {
  const leafM = cardMat('broadleaf', P.tree);
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0);
    const sc = 0.7 + R() * 0.8;
    // the card is drawn crown-up; sunk so the trunk part is underground
    // and only the crown shows, which is a bush
    const w = 4.0 * sc, hh = h * sc;
    const yaw = R() * Math.PI;
    for (let k = 0; k < 2; k++) {
      const p = new THREE.Mesh(SHAPE.Plane(w, hh * 1.6), leafM);
      p.position.set(x, hh * 0.8 - hh * 0.55, z);
      p.rotation.y = yaw + k * Math.PI / 2;
      g.add(p);
    }
  }
}

/**
 * A treeline: `n` built trees scattered in a box (x0..x1, z0..z1) with a
 * rank of cards behind them out to `far`. For the edges of a place.
 */
export function treeline(g, P, R, { x0, x1, z0, z1, n = 12, pines = 0.6, cards = 14, far = 12, undergrowth = true }) {
  const M = treeMats(P);
  if (undergrowth && n > 0) brush(g, P, R, { x0, x1, z0, z1, n: Math.round(n * 1.6) });
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), sc = 0.85 + R() * 0.7;
    if (R() < pines) pine(g, x, z, sc, M, R); else hardwood(g, x, z, sc, M, R);
  }
  const pineM = cardMat('pine', P.tree), leafM = cardMat('broadleaf', P.tree);
  const w = x1 - x0, d = z1 - z0;
  for (let i = 0; i < cards; i++) {
    // behind the built trees, pushed outward from the box's centre
    const u = R(), v = R();
    const x = x0 + u * w, z = z0 + v * d;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1;
    const sc = 1.1 + R() * 0.7, isPine = R() < pines;
    cardTree(g, x + dx / l * far, z + dz / l * far, (isPine ? 4.6 : 6.5) * sc, (isPine ? 11.5 : 8.5) * sc, isPine ? pineM : leafM, R);
  }
}
