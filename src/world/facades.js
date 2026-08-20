/* ============================================================
   facades.js: the rest of Ashgrove.

   Ridge Road is a street, and a street is two rows of buildings
   with a gap between them. 118 1/2 used to stand on a sixty
   metre slab of pavement facing four detached boxes with six
   squares painted on each of them, and past those boxes there
   was nothing at all: no ground, no roofs, no ridge, no town.
   From the landing at the top of the stair you could see the
   edge of the world.

   Three things live here:

     buildTerrace  -- an attached commercial row, which is what
                     anthracite towns are built out of: party
                     walls, flat roofs, corbelled brick cornices,
                     a shopfront cut out of the bottom of every
                     twenty feet and somebody living over it.

     buildBackdrop -- everything past the block. Ground to the
                     horizon, the street carrying on out of
                     sight, roofs, a treeline, and the two
                     ridges the valley sits between.

     utilityPole   -- poles and the sagging span between them.

   Two rules hold the cost down, and both matter:

   Nothing here casts or receives a shadow. All of it is across
   the street or further, the sun's shadow box is 42 m, and
   doubling the shadow pass to shade a building you cannot walk
   up to is not a trade worth making.

   And everything is merged by material before it is handed to
   the scene. A row of thirteen shopfronts is six hundred boxes;
   merged, the whole far side of Ridge Road is about forty draw
   calls. `mergeByMaterial` is the only reason this file can
   afford to be as detailed as it is.
   ============================================================ */
import * as THREE from 'three';
import { MAT, T, flat, tiled, tex } from './mat.js';
import { BOX, CYL, PLN } from './world.js';

/* mulberry32. The plain LCG this used to be gives nearly the same first
   few draws for nearby seeds, so four cars seeded 491/582/673/764 all
   came out of the paint shop the same colour. */
const rng = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];

/* ================================================================ merge */

/**
 * Collapse a subtree down to one mesh per material, baking each piece's
 * world transform into its vertices.
 *
 * `mesh.userData.uv = [su, sv]` scales that piece's UVs as it goes in,
 * which is what lets ONE brick material tile at the right size across
 * pieces of a dozen different sizes. Without it every wall would need
 * its own `tiled()` clone and the merge would buy nothing.
 *
 * `mesh.userData.noMerge` opts a mesh out, for anything that has to
 * keep moving or keep its own visibility.
 */
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const taken = [];
  root.traverse(o => {
    if (!o.isMesh || o.userData.noMerge) return;
    const g = o.geometry, m = o.material;
    if (Array.isArray(m) || !g?.attributes?.position || !g.attributes.normal || !g.attributes.uv) return;
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
    taken.push(o);
  });
  taken.forEach(o => o.parent?.remove(o));

  const local = new THREE.Matrix4();
  buckets.forEach((list, m) => {
    let vc = 0, ic = 0;
    list.forEach(o => {
      vc += o.geometry.attributes.position.count;
      ic += o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
    });
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
    const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
    let vo = 0, io = 0;
    list.forEach(o => {
      const g = o.geometry.clone();
      local.multiplyMatrices(inv, o.matrixWorld);
      g.applyMatrix4(local);
      const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
      const su = o.userData.uv ? o.userData.uv[0] : 1;
      const sv = o.userData.uv ? o.userData.uv[1] : 1;
      pos.set(p.array, vo * 3);
      nor.set(n.array, vo * 3);
      for (let i = 0; i < t.count; i++) {
        uv[(vo + i) * 2] = t.getX(i) * su;
        uv[(vo + i) * 2 + 1] = t.getY(i) * sv;
      }
      const gi = g.index;
      if (gi) { for (let i = 0; i < gi.count; i++) idx[io + i] = gi.getX(i) + vo; io += gi.count; }
      else { for (let i = 0; i < p.count; i++) idx[io + i] = i + vo; io += p.count; }
      vo += p.count;
      g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = false; mesh.receiveShadow = false;
    root.add(mesh);
  });
  return root;
}

/* ================================================================ glass
   Two kinds, because a window in daylight and a window at night are
   different objects. In daylight you see the sky in it and nothing
   behind it; at night you see the room and nothing in front of it. */
const TX = {
  /** A sash window in daylight: sky at the top, the roof opposite across
      the middle, and the room behind going black at the bottom. */
  dayglass: () => tex('fac_dayglass', 128, 160, (c, w, h, R) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#b6c8d4'); g.addColorStop(0.30, '#94aabc');
    g.addColorStop(0.42, '#63727e'); g.addColorStop(0.55, '#353e46');
    g.addColorStop(1, '#191f25');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // the roofline of whatever is opposite, reflected
    c.fillStyle = 'rgba(48,55,62,.72)';
    let x = -6;
    while (x < w) { const bw = 12 + R() * 26, bh = 14 + R() * 22; c.fillRect(x, h * 0.42 - bh, bw, bh + 40); x += bw + 1; }
    // and the smear of whatever the glazier last wiped it with
    c.globalAlpha = .10;
    for (let i = 0; i < 40; i++) { c.fillStyle = '#fff'; c.fillRect(R() * w, R() * h, 2 + R() * 20, 1); }
    c.globalAlpha = 1;
    c.fillStyle = '#221a14';
    c.fillRect(w / 2 - 2, 0, 4, h); c.fillRect(0, h * 0.46 - 2, w, 5);
    c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
    c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
  }, { metres: 1 }),

  /** Behind a shopfront, after closing: one strip light left on over the
      counter and the shelving going away into the dark at the back. */
  shopnight: () => tex('fac_shopnight', 256, 128, (c, w, h, R) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5a4a32'); g.addColorStop(0.22, '#8a6f45');
    g.addColorStop(0.6, '#4a3a26'); g.addColorStop(1, '#1d1710');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,236,196,.85)'; c.fillRect(w * 0.1, h * 0.08, w * 0.8, 5);
    for (let i = 0; i < 7; i++) {
      const bx = R() * w, bw = 18 + R() * 44, bh = 20 + R() * 52;
      c.fillStyle = `rgba(${28 + R() * 40},${20 + R() * 26},${12 + R() * 16},.7)`;
      c.fillRect(bx, h - bh, bw, bh);
    }
    c.fillStyle = 'rgba(240,206,150,.35)'; c.fillRect(0, h * 0.62, w, 3);
  }, { metres: 1 }),

  /** The same shopfront in daylight, with the street in the glass. */
  shopday: () => tex('fac_shopday', 256, 128, (c, w, h, R) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#a2b6c4'); g.addColorStop(0.34, '#6d7d8a');
    g.addColorStop(0.5, '#3c454d'); g.addColorStop(1, '#20262c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // the row behind the player, reflected, dim and the wrong way up
    c.fillStyle = 'rgba(56,64,72,.6)';
    let x = -8;
    while (x < w) { const bw = 20 + R() * 40; c.fillRect(x, 0, bw, h * (0.20 + R() * 0.18)); x += bw + 2; }
    for (let i = 0; i < 6; i++) {
      c.fillStyle = `rgba(${30 + R() * 26},${26 + R() * 22},${22 + R() * 18},.75)`;
      c.fillRect(R() * w, h * (0.5 + R() * 0.3), 16 + R() * 40, 18 + R() * 40);
    }
  }, { metres: 1 }),

  /** Plywood, for the two units on any main street that are shut. */
  plywood: () => tex('fac_plywood', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#7b6647'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      c.strokeStyle = R() > .5 ? 'rgba(96,78,52,.5)' : 'rgba(150,128,94,.35)';
      c.lineWidth = .8 + R() * 2;
      const y = R() * h;
      c.beginPath(); c.moveTo(0, y);
      c.bezierCurveTo(w * .3, y + (R() - .5) * 14, w * .7, y + (R() - .5) * 14, w, y);
      c.stroke();
    }
    c.fillStyle = 'rgba(40,32,22,.75)'; c.fillRect(0, h / 2 - 2, w, 4);
    c.globalAlpha = .5;
    for (let i = 0; i < 26; i++) { c.fillStyle = '#2a231a'; c.beginPath(); c.arc(R() * w, R() * h, 1.8, 0, 7); c.fill(); }
    c.globalAlpha = 1;
  }, { metres: 1.6 })
};

/* Materials the whole town shares. They are cached for the life of the
   page, never marked `own`, and so survive a chapter change. */
const M = {};
const shared = (k, make) => (M[k] || (M[k] = make()));

const basic = (k, map, color) => shared(k, () => new THREE.MeshBasicMaterial({ map: map(), color }));

/** A wall material that tiles by UV scale instead of by texture repeat,
    so every wall in town can share one of six. */
function bodyMat(i) {
  return shared('body' + i, () => {
    const bs = BODY_STYLES[i];
    const base = bs.mat();
    const m = base.clone();
    m.color.setHex(bs.tint);
    const t = base.map.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
    m.map = t;
    if (base.normalMap) {
      const n = base.normalMap.clone(); n.needsUpdate = true;
      n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1, 1);
      m.normalMap = n;
    }
    m.userData = { metres: base.userData.metres || 1.8 };
    return m;
  });
}

/* ================================================================ signs
   Four kinds, in the order a main street acquires them: painted straight
   onto the brick in 1928, a porcelain panel in 1955, a plastic light box
   in 1974, and a vinyl banner zip-tied over the top of all three. */
export function facadeSign(text, w, h, style = 'panel', seed = 1) {
  const R = rng(seed);
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(64, Math.round(512 * h / w));
  const g = c.getContext('2d');
  const W = c.width, H = c.height;

  const PAL = {
    painted: { bg: '#5d332a', fg: '#e2d3b4', font: 'Playfair Display' },
    panel: { bg: '#17222c', fg: '#e8d9a8', font: 'JetBrains Mono' },
    box: { bg: '#f0e4c8', fg: '#8C2F26', font: 'JetBrains Mono' },
    neon: { bg: '#120e14', fg: '#ff7a4a', font: 'JetBrains Mono' },
    vinyl: { bg: '#c9c2ad', fg: '#2c3f6b', font: 'JetBrains Mono' }
  }[style] || { bg: '#17222c', fg: '#e8d9a8', font: 'JetBrains Mono' };

  g.fillStyle = PAL.bg; g.fillRect(0, 0, W, H);
  if (style === 'painted') {
    // straight onto the brick, and the brick still showing through it
    g.globalAlpha = .18;
    for (let i = 0; i < 60; i++) { g.fillStyle = '#2b1a14'; g.fillRect(R() * W, R() * H, 4 + R() * 30, 2 + R() * 8); }
    g.globalAlpha = 1;
  } else if (style !== 'neon') {
    g.strokeStyle = PAL.fg; g.lineWidth = 5; g.strokeRect(7, 7, W - 14, H - 14);
  }

  g.fillStyle = PAL.fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = Math.round(H * 0.5);
  g.font = `bold ${size}px "${PAL.font}", monospace`;
  while (g.measureText(text).width > W * 0.84 && size > 9) {
    size -= 2; g.font = `bold ${size}px "${PAL.font}", monospace`;
  }
  if (style === 'neon') { g.shadowColor = PAL.fg; g.shadowBlur = 22; }
  g.fillText(text, W / 2, H / 2 + 2);
  g.shadowBlur = 0;

  if (style !== 'vinyl') {
    g.globalAlpha = .22;
    for (let i = 0; i < 24; i++) {
      const x = R() * W, y = R() * H, r = 6 + R() * 40;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(20,16,12,.5)'); rg.addColorStop(1, 'rgba(20,16,12,0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
    map: t, roughness: .85,
    emissive: new THREE.Color(0xffffff), emissiveMap: t, emissiveIntensity: 0.16
  }));
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

/* ================================================================ terrace */

/* Forty-one businesses, because two rows of Ridge Road is fifty
   shopfronts and eighteen names means the same jeweller three times in
   one block. Each carries the sign style it would actually have had:
   a bank gets cut letters on a panel, a bar gets neon, a hardware store
   got its name painted on the brick in 1948 and has never repainted it. */
const NAMES = [
  ['ANTHRACITE', 'painted'], ['KESSLERTON PAWN', 'panel'], ['REXALL DRUG', 'box'],
  ['DOMBROWSKI HDWE', 'painted'], ['LUCKY\'S', 'neon'], ['FIRST KEYSTONE', 'panel'],
  ['ASHGROVE 5 & 10', 'box'], ['SZABO & SONS', 'painted'], ['THE ROW', 'neon'],
  ['MARTA\'S', 'box'], ['V.F.W. 1207', 'panel'], ['FUEL & GO', 'box'],
  ['SHEAR MAGIC', 'vinyl'], ['ASHGROVE TRUST', 'painted'], ['NOVAK MEATS', 'painted'],
  ['THE COAL BIN', 'neon'], ['LAUNDRY', 'box'], ['STANKO REALTY', 'vinyl'],
  ['HURKA BAKERY', 'painted'], ['ODD FELLOWS', 'panel'], ['PENN SHOE REPAIR', 'box'],
  ['BARAN & DAUGHTER', 'panel'], ['THE PALACE', 'neon'], ['LISAK FURNITURE', 'painted'],
  ['UNITED MINE WKRS', 'panel'], ['CUT RATE DRUGS', 'box'], ['SEDLAK TV & RADIO', 'vinyl'],
  ['ROXY', 'neon'], ['DEMKO INSURANCE', 'vinyl'], ['THE CORNER', 'neon'],
  ['PROSSER BROS', 'painted'], ['KEYSTONE SUPPLY', 'panel'], ['GOOD SHEPHERD THRIFT', 'box'],
  ['RUDNIK & CO', 'painted'], ['ASHGROVE OPTICAL', 'vinyl'], ['BLUE COMET DINER', 'neon'],
  ['MILLER PAINT', 'box'], ['SLOVAK HALL', 'panel'], ['KOWAL CLEANERS', 'vinyl'],
  ['HOTEL ASHGROVE', 'painted'], ['B & K APPLIANCE', 'box']
];

/* Ghost signs: the ones painted straight onto a party wall for something
   that stopped existing. Every anthracite town has four of these and one
   of them is always for a mail-order tonic. */
const GHOSTS = ['CHEWING\nTOBACCO', 'ROOMS\n50c', 'DRINK\nMOXIE', 'FEED\n& SEED',
  'BOTTLED\nGAS', 'HOSIERY', 'CIGARS', 'OVERALLS'];

const BODY_STYLES = [
  { mat: () => MAT.brick, tint: 0xffffff },
  { mat: () => MAT.brick, tint: 0x93887a },     // brick that got sandblasted
  { mat: () => MAT.brick, tint: 0xb8a68f },
  { mat: () => MAT.brick, tint: 0x74807a },     // painted green, once
  { mat: () => MAT.plaster, tint: 0xa2967f },   // stuccoed over in the seventies
  { mat: () => MAT.shingle, tint: 0xffffff },   // asphalt siding, dried blood
  { mat: () => MAT.brick, tint: 0x8c5f52 },     // red brick that stayed red
  { mat: () => MAT.brick, tint: 0x6d6a63 },     // painted grey in the eighties
  { mat: () => MAT.plaster, tint: 0xc8bda6 },   // cream stucco, one owner ago
  { mat: () => MAT.shingle, tint: 0x7a8a86 }    // green asphalt siding
];

/* The five things a unit can do with its roofline, which is the single
   biggest thing that tells two buildings apart from across a street.
   `flat` is the ordinary commercial parapet; the rest are what happens
   when a row gets built over sixty years by people who did not consult
   each other.

     flat     parapet and a corbelled cornice
     stepped  the parapet climbs in three steps to a centre panel
     gable    a pitched roof end-on to the street, which is what the
              older, timber-framed half of a row is
     mansard  a false mansard bolted on in 1972, with dormers
     bracket  a deep bracketed cornice on iron corbels, the fancy one   */
const ROOFS = ['flat', 'flat', 'stepped', 'gable', 'mansard', 'bracket', 'flat', 'stepped'];

/* And what it does with its window heads. A row where every opening is
   a rectangle with a lintel over it is a spreadsheet. */
const HEADS = ['flat', 'flat', 'segmental', 'round', 'keystone', 'segmental'];

/**
 * A stretch of row with no shop in it: brick, a coping, and two
 * openings bricked up flush, which is what the narrow bit between two
 * buildings in an anthracite town always turns out to be.
 */
function blindWall(g, W, D, H, style, R) {
  const bm = bodyMat(style);
  const met = bm.userData.metres;
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bm);
  body.userData.uv = [W / met, H / met];
  body.castShadow = false; body.receiveShadow = false;
  body.position.set(0, H / 2, D / 2);
  g.add(body);
  const cop = new THREE.Mesh(BOX(W + 0.12, 0.22, D + 0.12), flat(0x6e6a60, { rough: .9 }));
  cop.castShadow = false; cop.receiveShadow = false;
  cop.position.set(0, H - 0.11, D / 2);
  g.add(cop);
  // the bricked-up openings, a shade off the wall around them
  const bl = flat(0x7a6a5c, { rough: .95 });
  const n = Math.max(1, Math.floor(W / 1.9));
  for (let i = 0; i < n; i++) {
    for (const fy of [1.5, 4.3]) {
      if (fy + 1.4 > H) continue;
      const b = new THREE.Mesh(BOX(Math.min(0.95, W / n - 0.4), 1.3, 0.08), bl);
      b.castShadow = false; b.receiveShadow = false;
      b.position.set(-W / 2 + (i + 0.5) * (W / n), fy, -0.045);
      g.add(b);
    }
  }
}

/** One unit of the row, built with its shopfront facing local -Z. */
function unit(g, u, night) {
  const R = rng(u.seed);
  const { W, H, D } = u;
  const bm = bodyMat(u.style);
  const met = bm.userData.metres;

  // `add` is the only way anything gets into a unit: it kills the shadow
  // flags and, for anything wearing the shared wall material, works out
  // the UV scale that makes the brick come out 215 mm long.
  const add = (m, uvW, uvH) => {
    m.castShadow = false; m.receiveShadow = false;
    if (uvW) m.userData.uv = [uvW / met, uvH / met];
    g.add(m); return m;
  };
  const put = (w, h, d, x, y, z, mat, uv) => {
    const m = add(new THREE.Mesh(BOX(w, h, d), mat), uv ? w : 0, uv ? h : 0);
    m.position.set(x, y, z); return m;
  };

  const trimM = flat(u.trim, { rough: .88 });
  const trimDark = flat(new THREE.Color(u.trim).multiplyScalar(0.72).getHex(), { rough: .9 });
  const darkM = flat(0x1b1e21, { rough: .9 });
  const roofM = flat(0x2b2825, { rough: .96 });
  const metalM = flat(0x8d9094, { rough: .5, metal: .4 });
  const ironM = flat(0x33322e, { rough: .7, metal: .35 });

  // ---- body ----------------------------------------------------------
  add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), bm), W, H).position.set(0, H / 2, D / 2);

  // ---- ground floor: piers, bulkhead, glass, transom -------------------
  const GF = u.gf;
  const pierW = u.fancy ? 0.62 : 0.46;
  [-1, 1].forEach(s => {
    const p = add(new THREE.Mesh(BOX(pierW, GF + 0.3, 0.34), bm), pierW, GF + 0.3);
    p.position.set(s * (W / 2 - pierW / 2), (GF + 0.3) / 2, -0.14);
    // a stone base to the pier on the ones that were built to be looked at
    if (u.fancy) put(pierW + 0.1, 0.9, 0.4, s * (W / 2 - pierW / 2), 0.45, -0.16, trimM);
  });

  const openW = W - pierW * 2 - 0.1;
  const sillY = 0.62, headY = GF - 0.52;
  const bh = put(openW, sillY, 0.16, 0, sillY / 2, -0.05, flat(u.bulkhead, { rough: .7 }));
  const panels = Math.max(2, Math.min(5, Math.round(openW / 1.3)));
  for (let i = 0; i < panels; i++) {
    put(openW / panels - 0.14, sillY - 0.2, 0.03,
      -openW / 2 + (i + 0.5) * (openW / panels), sillY / 2, -0.14, darkM);
  }

  const bays = Math.max(2, Math.min(4, Math.round(openW / 1.6)));
  if (u.shut) {
    // boarded. Every main street in the county has two of these.
    const plyM = shared('ply', () => {
      const m = new THREE.MeshStandardMaterial({ map: TX.plywood(), roughness: .95 });
      m.userData.metres = 1.6;
      return m;
    });
    const pw = add(new THREE.Mesh(PLN(openW, headY - sillY), plyM));
    pw.userData.uv = [openW / 1.6, (headY - sillY) / 1.6];
    pw.position.set(0, (sillY + headY) / 2, -0.055);
    pw.rotation.y = Math.PI;
    const nt = add(new THREE.Mesh(PLN(0.3, 0.42), flat(0xd8d2bc, { rough: .95 })));
    nt.position.set(openW * 0.22, (sillY + headY) / 2, -0.075);
    nt.rotation.y = Math.PI;
  } else {
    const gm = night
      ? (u.lit ? basic('shopOn', TX.shopnight, 0xd9c6a4) : basic('shopOff', TX.shopnight, 0x4e4437))
      : basic('shopDay' + (u.seed % 3), TX.shopday, [0x9aa4ac, 0x848f99, 0xa8b0b6][u.seed % 3]);
    // A recessed entry on some of them: the glass steps back half a metre
    // either side of the door and the two returns catch the light. It is
    // the cheapest thing that stops fifty shopfronts sitting on one plane.
    const rec = u.recessed ? 0.45 : 0;
    const gl = add(new THREE.Mesh(PLN(openW, headY - sillY), gm));
    gl.position.set(0, (sillY + headY) / 2, -0.055);
    gl.rotation.y = Math.PI;
    // mullions: a shopfront is three or four lights wide, never one
    for (let i = 1; i < bays; i++) {
      put(0.07, headY - sillY, 0.1, -openW / 2 + i * (openW / bays), (sillY + headY) / 2, -0.085, trimM);
    }
    // the door, in the bay nearest one end, with its own transom over it
    const dx = (R() > 0.5 ? 1 : -1) * (openW / 2 - openW / bays / 2);
    const dw = openW / bays - 0.14;
    if (rec) {
      // the reveal: two returns and a soffit, set back behind the glass line
      put(dw + 0.5, headY, 0.06, dx, headY / 2, -0.055, flat(u.bulkhead, { rough: .6 }));
      [-1, 1].forEach(s => put(0.06, headY, rec, dx + s * (dw / 2 + 0.22), headY / 2, -0.055 + rec / 2, trimM));
      put(dw + 0.5, 0.08, rec, dx, headY, -0.055 + rec / 2, trimM);
    }
    // the frame is the trim colour; the LEAF is not. A door the same
    // cream as the mullions is a blank panel, and every unit in the row
    // had one standing where its door should be.
    put(dw, headY - 0.06, 0.05, dx, (headY - 0.06) / 2, -0.1 + rec, trimM);
    put(dw - 0.16, headY - 0.16, 0.05, dx, (headY - 0.16) / 2, -0.135 + rec, flat(u.bulkhead, { rough: .55 }));
    const dg = add(new THREE.Mesh(PLN(dw - 0.42, headY - 1.05),
      night ? flat(u.lit ? 0xc9a878 : 0x2a2620, { rough: .3, emissive: u.lit ? 0x7a5228 : 0x000000, ei: .9 })
            : basic('shopDoorDay', TX.shopday, 0x818c94)));
    dg.position.set(dx, headY * 0.63, -0.165 + rec);
    dg.rotation.y = Math.PI;
    put(dw - 0.2, 0.28, 0.03, dx, 0.2, -0.165 + rec, flat(0x8d9094, { rough: .4, metal: .5 }));
  }

  // transom band and the head beam over the whole opening
  const tr = put(openW, 0.44, 0.12, 0, headY + 0.24, -0.065,
    (night && !u.shut) ? flat(u.lit ? 0x7a5f3a : 0x232019, { rough: .4, emissive: u.lit ? 0x4a3418 : 0x000000, ei: .8 })
                       : flat(0x2e3238, { rough: .35, metal: .2 }));
  put(W - 0.2, 0.26, 0.22, 0, GF - 0.06, -0.11, trimM);

  // ---- the sign band, which is what a ground floor is really for -------
  const bd = put(W - 0.5, 0.92, 0.1, 0, GF + 0.54, -0.16, flat(0x232629, { rough: .8 }));
  if (u.name) {
    const sw = Math.min(W - 1.1, u.name.length * 0.30 + 0.7);
    const s = facadeSign(u.name, sw, 0.6, u.signStyle, u.seed + 7);
    // A PlaneGeometry faces +Z. The whole shopfront faces -Z, so every
    // sign on this street was hung facing into its own stockroom and
    // back-face culled out of existence.
    s.rotation.y = Math.PI;
    s.position.set(0, GF + 0.54, -0.26);
    s.material.emissiveIntensity = !night ? 0.05
      : u.signStyle === 'neon' ? 1.5 : u.signStyle === 'painted' ? 0.12 : 0.8;
    g.add(s);
  }

  // an awning on some of them, because a row where every unit is the same
  // depth at eye level reads as one building with lines drawn on it
  if (u.awning && !u.shut) {
    const aw = W - 1.0, proj = 1.15;
    // five awnings, not one. The canvas is the same striped tile, but a
    // row where every awning is the identical green is a row with one
    // awning on it repeated, and the eye picks that up before it picks
    // up anything the geometry is doing.
    const am = shared('awn' + u.awnTint, () => {
      const m = MAT.awning.clone();
      const t = MAT.awning.map.clone(); t.needsUpdate = true;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
      m.map = t; m.normalMap = null;
      m.color = new THREE.Color([0xffffff, 0xb08a72, 0x8fa0b4, 0xc0a86a, 0x9a7d84][u.awnTint]);
      return m;
    });
    const cv = add(new THREE.Mesh(BOX(aw, 0.05, Math.hypot(proj, 0.5)), am));
    cv.userData.uv = [aw / 1.2, 1];
    cv.position.set(0, GF - 0.3, -proj / 2 - 0.06);
    cv.rotation.x = -Math.atan2(0.5, proj);
    const vl = add(new THREE.Mesh(BOX(aw, 0.22, 0.04), am));
    vl.userData.uv = [aw / 1.2, 0.2];
    vl.position.set(0, GF - 0.66, -proj - 0.06);
  } else if (u.canopy && !u.shut) {
    // or a flat metal canopy on two tie rods, which is what the ones that
    // gave up on canvas in 1968 have got
    put(W - 0.8, 0.09, 1.5, 0, GF - 0.34, -0.78, metalM);
    [-1, 1].forEach(s => {
      const rod = add(new THREE.Mesh(CYL(0.016, 0.016, 1.6, 4), ironM));
      rod.position.set(s * (W / 2 - 0.7), GF + 0.12, -0.5);
      rod.rotation.x = 1.02;
      rod.rotation.z = 0.0;
    });
  }

  // ---- upper floors ----------------------------------------------------
  const wbays = u.wbays;
  const bayW = W / wbays;
  const winW = Math.min(u.wide ? 1.35 : 1.05, bayW - 0.85), winH = u.tallWin ? 1.75 : 1.45;
  const headM = flat(new THREE.Color(u.trim).multiplyScalar(1.06).getHex(), { rough: .9 });
  for (let f = 1; f < u.floors; f++) {
    const fy = GF + 0.95 + (f - 1) * u.floorH;
    for (let b = 0; b < wbays; b++) {
      const wx = -W / 2 + (b + 0.5) * bayW;
      const on = night && u.occupied && R() > 0.5;
      // Three lit materials, not one: a row where every lit window is
      // the identical shade of orange reads as a texture, not a street.
      const gm = on ? basic('lit' + (b % 3), T.litwindow, [0xd8c0a0, 0xc9a878, 0xe0cbaa][b % 3])
        : night ? basic('winOff', TX.dayglass, 0x1b2027)
          : basic('winDay', TX.dayglass, 0xa8b4bd);
      const w = add(new THREE.Mesh(PLN(winW, winH), gm));
      w.position.set(wx, fy + winH / 2, -0.055);
      w.rotation.y = Math.PI;
      // the head. A lintel and a sill is the whole difference between a
      // window and a rectangle of paint, and WHICH head it is is the
      // difference between this building and the one next door.
      if (u.head === 'segmental' || u.head === 'round') {
        // an arch, in four voussoir blocks stepped up to the crown
        const rise = u.head === 'round' ? winW * 0.42 : winW * 0.18;
        for (let k = -2; k <= 2; k++) {
          const t = k / 2;
          const bw = winW / 4.4;
          put(bw, 0.20, 0.15, wx + t * winW * 0.40, fy + winH + 0.10 + rise * (1 - t * t),
            -0.075, headM).rotation.z = -t * (u.head === 'round' ? 0.42 : 0.20);
        }
      } else if (u.head === 'keystone') {
        put(winW + 0.34, 0.16, 0.14, wx, fy + winH + 0.08, -0.075, headM);
        put(0.20, 0.30, 0.17, wx, fy + winH + 0.13, -0.09, trimM);
      } else {
        put(winW + 0.34, 0.16, 0.14, wx, fy + winH + 0.08, -0.075, headM);
      }
      put(winW + 0.4, 0.09, 0.2, wx, fy - 0.045, -0.1, trimM);
      // and, on about one in five, the air conditioner that has been in
      // it since 1996 and will be there when the building comes down
      if (R() > 0.82) put(0.56, 0.36, 0.42, wx, fy + 0.18, -0.24, flat(0x9a9d9c, { rough: .6, metal: .2 }));
    }
    // a string course between the floors, which some of them have and
    // some of them do not
    if (u.stringCourse) put(W, 0.14, 0.1, 0, fy - 0.42, -0.055, trimM);
  }

  // an oriel: one bay of the first floor pushed out over the pavement on
  // brackets. One in six or so, and it is worth more than everything else
  // in this function for telling a building apart at fifty metres.
  if (u.oriel && u.floors > 1) {
    const oy = GF + 1.05, ow = Math.min(2.0, W - 1.2), oh = u.floorH * 0.86;
    const ox = (R() - 0.5) * (W - ow - 0.6);
    put(ow, oh, 0.8, ox, oy + oh / 2, -0.46, bm, true);
    put(ow + 0.24, 0.12, 0.94, ox, oy + oh + 0.06, -0.46, trimM);
    put(ow + 0.16, 0.14, 0.9, ox, oy - 0.06, -0.46, trimM);
    const ogm = night ? basic('winOff', TX.dayglass, 0x1b2027) : basic('winDay', TX.dayglass, 0xa8b4bd);
    const ow2 = add(new THREE.Mesh(PLN(ow - 0.3, oh - 0.4), ogm));
    ow2.position.set(ox, oy + oh / 2, -0.87); ow2.rotation.y = Math.PI;
    [-1, 1].forEach(s => {
      const br = add(new THREE.Mesh(BOX(0.12, 0.5, 0.5), trimM));
      br.position.set(ox + s * (ow / 2 - 0.12), oy - 0.28, -0.3);
      br.rotation.x = 0.5;
    });
  }

  // a fire escape, which on a three-storey party-wall row is not optional
  // and which no two of them have in the same place
  if (u.fireEscape && u.floors > 2) {
    const fx = (R() - 0.5) * (W - 2.4);
    for (let f = 1; f < u.floors; f++) {
      const fy = GF + 0.95 + (f - 1) * u.floorH + 0.5;
      put(1.9, 0.05, 0.95, fx, fy, -0.52, ironM);
      put(1.9, 0.9, 0.04, fx, fy + 0.45, -0.98, ironM);
      [-1, 1].forEach(s => put(0.04, 0.9, 0.95, fx + s * 0.95, fy + 0.45, -0.52, ironM));
      if (f < u.floors - 1) {
        const st = add(new THREE.Mesh(BOX(0.7, 0.05, u.floorH * 1.05), ironM));
        st.position.set(fx + 0.6, fy + u.floorH / 2, -0.72);
        st.rotation.x = -Math.atan2(u.floorH, u.floorH * 0.9);
      }
    }
  }

  // a ghost sign, painted onto the brick for something that closed in 1961
  if (u.ghost) {
    const gs = ghostSign(u.ghost, Math.min(W - 1.4, 3.2), 2.2, u.seed + 91);
    gs.rotation.y = Math.PI;
    gs.position.set((R() - 0.5) * 0.8, GF + 2.4, -0.075);
    g.add(gs);
  }

  // ---- roof, and what is on it -----------------------------------------
  const parapetTop = roofline(add, put, u, R, { bm, trimM, trimDark, roofM, metalM, night });
  add(new THREE.Mesh(BOX(W - 0.2, 0.16, D - 0.3), roofM)).position.set(0, H - 0.08, D / 2);
  if (R() > 0.45) {
    const hh = 1.4 + R();
    add(new THREE.Mesh(new THREE.BoxGeometry(0.7, hh, 0.7), bm), 0.7, hh)
      .position.set((R() - 0.5) * W * 0.6, H + hh / 2 - 0.1, D * (0.35 + R() * 0.4));
  }
  if (R() > 0.55) {
    add(new THREE.Mesh(CYL(0.26, 0.3, 0.6, 8), metalM))
      .position.set((R() - 0.5) * W * 0.7, H + 0.28, D * (0.4 + R() * 0.4));
  }
  if (R() > 0.7) {
    const ax = (R() - 0.5) * W * 0.7, az = D * 0.5;
    add(new THREE.Mesh(CYL(0.02, 0.02, 2.4, 4), metalM)).position.set(ax, H + 1.2, az);
    for (let k = 0; k < 4; k++) {
      add(new THREE.Mesh(BOX(0.9 - k * 0.15, 0.02, 0.02), metalM)).position.set(ax, H + 0.7 + k * 0.28, az);
    }
  }
  // a water tank on the tall ones, on four legs
  if (u.floors > 2 && R() > 0.78) {
    const tx = (R() - 0.5) * W * 0.4, tz = D * 0.55;
    add(new THREE.Mesh(CYL(0.85, 0.85, 1.7, 10), flat(0x4a3f33, { rough: .98 })))
      .position.set(tx, parapetTop + 1.5, tz);
    add(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.4, 10), roofM))
      .position.set(tx, parapetTop + 2.55, tz);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
      add(new THREE.Mesh(CYL(0.05, 0.05, 1.3, 4), ironM))
        .position.set(tx + sx * 0.6, parapetTop + 0.05, tz + sz * 0.6));
  }

  // ---- downpipe on one party wall ---------------------------------------
  add(new THREE.Mesh(CYL(0.055, 0.055, H - 0.4, 6), flat(0x4a4038, { rough: .8 })))
    .position.set(W / 2 - 0.16, (H - 0.4) / 2, -0.13);
}

/**
 * What the unit does where it meets the sky. Returns the height of the
 * top of whatever it built, so the roof furniture can stand on it.
 *
 * This is the one thing worth spending geometry on. Two buildings the
 * same width, the same height and the same brick are still two buildings
 * if one of them finishes in a stepped parapet and the other one has a
 * pitched roof end-on to the street. Fifty units that all finish in the
 * same cornice are one building repeated fifty times, and the eye reads
 * that in about a second and a half.
 */
function roofline(add, put, u, R, M) {
  const { W, H, D } = u;
  const { bm, trimM, trimDark, roofM, metalM } = M;

  if (u.roof === 'gable') {
    // a pitched roof end-on to the street: the older, timber half of a row
    const rise = 1.5 + R() * 0.9;
    const tri = new THREE.Shape();
    tri.moveTo(-W / 2, 0); tri.lineTo(W / 2, 0); tri.lineTo(0, rise);
    const face = add(new THREE.Mesh(new THREE.ShapeGeometry(tri), bm));
    face.position.set(0, H - 0.5, -0.06);
    face.rotation.y = Math.PI;
    const slope = Math.hypot(W / 2, rise);
    [-1, 1].forEach(s => {
      const r = add(new THREE.Mesh(BOX(slope, 0.18, D + 0.3), roofM));
      r.rotation.z = -s * Math.atan2(rise, W / 2);
      r.position.set(s * W / 4, H - 0.5 + rise / 2, D / 2 - 0.1);
    });
    // the barge boards, which is the bit you actually see
    [-1, 1].forEach(s => {
      const b = add(new THREE.Mesh(BOX(slope, 0.2, 0.1), trimM));
      b.rotation.z = -s * Math.atan2(rise, W / 2);
      b.position.set(s * W / 4, H - 0.5 + rise / 2 + 0.06, -0.14);
    });
    put(W + 0.2, 0.2, 0.34, 0, H - 0.56, -0.13, trimM);
    return H - 0.5 + rise;
  }

  if (u.roof === 'mansard') {
    // a false mansard bolted over the front in about 1972, with two
    // dormers in it that do not open onto anything
    const mh = 1.5;
    const sh = add(new THREE.Mesh(BOX(W + 0.1, 0.14, mh * 1.5), flat(0x3a2f28, { rough: .98 })));
    sh.position.set(0, H - 0.5 + mh / 2, -mh * 0.42);
    sh.rotation.x = -0.72;
    put(W + 0.16, 0.22, 0.7, 0, H - 1.1, -0.66, trimM);
    put(W + 0.06, 0.2, 0.3, 0, H + 0.32, -0.06, trimM);
    for (let i = 0; i < 2; i++) {
      const dx = (i - 0.5) * W * 0.44;
      put(0.9, 0.8, 0.5, dx, H - 0.36, -0.5, flat(0x3a2f28, { rough: .98 }));
      put(0.55, 0.5, 0.06, dx, H - 0.38, -0.76, flat(0x1b2027, { rough: .3 }));
    }
    return H + 0.42;
  }

  if (u.roof === 'stepped') {
    // a parapet that climbs to a panel in the middle. Two rows of these
    // and a town has a skyline instead of a horizon.
    put(W + 0.12, 0.34, 0.44, 0, H - 0.5, -0.17, trimM);
    put(W + 0.04, 0.5, 0.3, 0, H - 0.1, -0.07, bm, true);
    const steps = [[W * 0.72, 0.5], [W * 0.42, 0.95]];
    steps.forEach(([sw, sy], i) => {
      put(sw, 0.44, 0.32, 0, H + sy, -0.07, bm, true);
      put(sw + 0.14, 0.11, 0.42, 0, H + sy + 0.24, -0.11, trimM);
    });
    put(W * 0.30, 0.36, 0.12, 0, H + 1.36, -0.16, trimDark);
    put(W + 0.16, 0.09, 0.42, 0, H + 0.2, -0.11, flat(0x4c4a46, { rough: .8 }));
    return H + 1.5;
  }

  if (u.roof === 'bracket') {
    // a deep bracketed cornice on iron corbels: the bank, or whatever
    // used to be the bank
    put(W + 0.3, 0.5, 0.75, 0, H - 0.32, -0.32, trimM);
    put(W + 0.16, 0.16, 0.4, 0, H - 0.66, -0.16, trimDark);
    const n = Math.max(3, Math.round(W / 1.1));
    for (let i = 0; i < n; i++) {
      put(0.14, 0.5, 0.6, -W / 2 + (i + 0.5) * (W / n), H - 0.9, -0.26, trimM);
    }
    put(W + 0.04, 0.5, 0.3, 0, H + 0.1, -0.07, bm, true);
    put(W + 0.16, 0.09, 0.42, 0, H + 0.38, -0.11, flat(0x4c4a46, { rough: .8 }));
    return H + 0.42;
  }

  // ---- flat: parapet and a corbelled cornice ----
  put(W + 0.12, 0.34, 0.44, 0, H - 0.5, -0.17, trimM);
  put(W + 0.06, 0.14, 0.28, 0, H - 0.78, -0.1, flat(u.trim, { rough: .95 }));
  put(W + 0.04, 0.62, 0.3, 0, H - 0.03, -0.07, bm, true);
  put(W + 0.16, 0.09, 0.42, 0, H + 0.3, -0.11, flat(0x4c4a46, { rough: .8 }));
  return H + 0.34;
}

/** Whatever used to be painted on the side of the building. */
function ghostSign(text, w, h, seed) {
  const R = rng(seed);
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(64, Math.round(256 * h / w));
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = '#d8cdbb';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n');
  const size = Math.round(c.height / (lines.length + 0.9));
  x.font = `bold ${size}px "Playfair Display", serif`;
  lines.forEach((l, i) => x.fillText(l, c.width / 2, c.height * (i + 0.8) / (lines.length + 0.6)));
  // ninety years of weather takes most of it off again
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    x.fillStyle = `rgba(0,0,0,${0.25 + R() * 0.6})`;
    x.fillRect(R() * c.width, R() * c.height, 2 + R() * 14, 2 + R() * 9);
  }
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({
    map: t, transparent: true, opacity: 0.5, roughness: 1, depthWrite: false
  }));
  m.castShadow = false; m.receiveShadow = false;
  m.userData.noMerge = true;
  return m;
}

/**
 * An attached row. `from`/`to` are along X, the fronts sit on `z`, and
 * `facing` is the way they look: -1 for the far side of Ridge Road,
 * +1 for Jared's own side.
 *
 * `gaps` are stretches of world X the row must not build across. The
 * side yard the exterior stair comes down into is one, and it has to
 * stay a gap or the top of the stair ends up inside a building.
 */
export function buildTerrace(world, {
  x = 0, y = 0, z = 0, from = -44, to = 44, facing = -1,
  depth = 10, night = true, snow = false, seed = 1, gaps = [], lights = 0, nameFrom = 0
} = {}) {
  const R = rng(seed);
  const row = new THREE.Group();
  row.position.set(x, y, z);
  row.rotation.y = facing === -1 ? 0 : Math.PI;
  world.add(row);
  const out = { group: row, units: [], lights: [] };

  // a gap given in world X has to be flipped for the near side, which is
  // built in its own left-to-right and then turned around
  const flip = facing === -1 ? 1 : -1;
  const holes = gaps.map(([a, b]) => flip > 0 ? [a, b] : [-b, -a]).sort((a, b) => a[0] - b[0]);
  const lo = flip > 0 ? from : -to, hi = flip > 0 ? to : -from;

  const runs = [];
  let cur = lo, n = nameFrom, litLeft = lights, runStart = null;
  const closeRun = () => { if (runStart !== null) { runs.push([runStart, cur]); runStart = null; } };

  /* A stretch too narrow for a shopfront. It used to be left as nothing
     at all, which is fine for the yard at 118 1/2, where the gap IS the
     point, but the two shops on the far side are cut into the middle of
     a continuous row and the leftover either side of them came out as a
     four-metre hole with the backdrop showing through it. Fill it with
     the one thing a row is actually made of: a blind party wall. */
  const blank = (a, b) => {
    if (b - a < 0.3) return;
    if (runStart === null) runStart = a;
    const g = new THREE.Group();
    g.position.set((a + b) / 2, 0, 0);
    row.add(g);
    blindWall(g, b - a, depth, 5.8 + R() * 3.4, pick(R, BODY_STYLES.map((_, i) => i)), R);
  };

  while (cur < hi - 3.5) {
    const hole = holes.find(([a, b]) => b > cur && a < cur + 3.5);
    if (hole) {
      const a0 = Math.max(cur, hole[0]);
      if (a0 - cur > 0.3) { blank(cur, a0); cur = a0; }
      closeRun(); cur = hole[1]; continue;
    }
    const nextHole = holes.find(([a]) => a >= cur);
    const room = Math.min(hi, nextHole ? nextHole[0] : hi) - cur;
    if (room < 4.2) {
      if (room > 0.3) { blank(cur, cur + room); cur += room; closeRun(); }
      else { closeRun(); cur += room; }
      continue;
    }
    if (runStart === null) runStart = cur;

    const W = Math.min(room, 4.6 + R() * 6.2);
    // One, two, three or four storeys. It used to be two or three, which
    // over fifty units is a row with two heights in it, and two heights
    // is a pattern the eye finds in about a second.
    const fr = R();
    const floors = fr > 0.86 ? 4 : fr > 0.52 ? 3 : fr > 0.14 ? 2 : 1;
    const gf = 3.4 + R() * 0.9;
    const floorH = 2.75 + R() * 0.65;
    const shut = R() > 0.86;
    const roof = pick(R, ROOFS);
    const [name, style] = NAMES[n % NAMES.length];
    n++;

    const u = {
      W, D: depth, gf, floorH, floors,
      H: gf + 0.95 + (floors - 1) * floorH + 0.55,
      seed: (seed * 977 + n * 131) >>> 0,
      style: Math.floor(R() * BODY_STYLES.length),
      trim: pick(R, [0xbdb5a4, 0xa39b8c, 0x847c72, 0x5f5a52, 0xb3a48a, 0xcfc6b0, 0x6e6a60, 0x9c8b74]),
      bulkhead: pick(R, [0x2f4438, 0x4a2f2a, 0x2c3a48, 0x5a4a32, 0x37383a, 0x1f2f3a, 0x53331f]),
      name: shut ? null : name, signStyle: style,
      shut, occupied: R() > 0.18,
      lit: !shut && litLeft > 0 && R() > 0.4,
      // ---- the character. Every one of these is a coin flip, and it is
      // the COMBINATION that makes fifty shopfronts fifty buildings: two
      // units the same width and height are still different if one has a
      // stepped parapet, round-arched windows and a fire escape and the
      // other has a flat cornice, a bay window and a metal canopy.
      roof,
      head: pick(R, HEADS),
      wbays: Math.max(1, Math.min(4, Math.round(W / (2.0 + R() * 1.3)))),
      wide: R() > 0.7, tallWin: R() > 0.72,
      stringCourse: R() > 0.42,
      fancy: R() > 0.78,
      recessed: R() > 0.55,
      oriel: floors > 1 && roof !== 'gable' && R() > 0.82,
      fireEscape: floors > 2 && R() > 0.55,
      ghost: floors > 1 && R() > 0.84 ? pick(R, GHOSTS) : null,
      awning: false, canopy: false, awnTint: Math.floor(R() * 5) % 5
    };
    // an awning, a metal canopy, or nothing at all, and never both
    const cov = R();
    if (!shut) { if (cov > 0.58) u.awning = true; else if (cov > 0.34) u.canopy = true; }
    if (u.lit) litLeft--;

    const g = new THREE.Group();
    g.position.set(cur + W / 2, 0, 0);
    row.add(g);
    unit(g, u, night);
    out.units.push({ x: (cur + W / 2) * flip, w: W, h: u.H, lit: u.lit, shut });

    // a warm spill on the pavement outside the two or three that are open
    if (night && u.lit) {
      out.lights.push(world.bulb(x + flip * (cur + W / 2), y + 2.2, z + facing * 1.4, {
        color: 0xFFCE97, intensity: 2.4, dist: 9, emissive: false
      }));
    }
    cur += W;
  }
  closeRun();

  // one blade sign hung off the row, because the point of a blade sign is
  // that you can read it from up the street and not only from in front
  if (out.units.length > 2) {
    const b = out.units[Math.floor(out.units.length / 2)];
    const bx = b.x + flip * (b.w / 2 - 0.4);
    const arm = new THREE.Mesh(BOX(0.05, 0.05, 1.2), flat(0x53504a, { rough: .5, metal: .6 }));
    arm.position.set(x + bx, y + 4.5, z + facing * 0.6);
    arm.castShadow = false; world.add(arm);
    [-1, 1].forEach(f => {
      const s = facadeSign('ROOMS', 1.0, 0.44, 'neon', seed + 3);
      s.position.set(x + bx + f * 0.02, y + 4.05, z + facing * 0.78);
      s.rotation.y = f * Math.PI / 2;
      s.material.emissiveIntensity = night ? 1.4 : 0.08;
      world.add(s);
    });
  }

  // Collision follows the RUNS, not the extent. One box across the whole
  // row would have sealed the side yard at 118 1/2 and put the top of the
  // exterior stair inside somebody's second floor.
  runs.forEach(([a, b]) => {
    if (b - a < 0.5) return;
    world.collide(x + (a + b) / 2 * flip, y, z - facing * depth / 2, b - a, 14, depth, 'terrace');
  });

  mergeByMaterial(row);
  return out;
}

/* ================================================================ backdrop */

/** A gable-roofed silhouette. Three boxes and two triangles. */
function gable(parent, x, y, z, w, d, h, rise, mat, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  const body = new THREE.Mesh(BOX(w, h, d), mat);
  body.position.y = h / 2; g.add(body);
  const slope = Math.hypot(w / 2, rise);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(BOX(slope, 0.2, d + 0.5), mat);
    r.rotation.z = -s * Math.atan2(rise, w / 2);
    r.position.set(s * w / 4, h + rise / 2, 0);
    g.add(r);
  }
  for (const s of [-1, 1]) {
    const tri = new THREE.Shape();
    tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), mat);
    m.rotation.y = s > 0 ? 0 : Math.PI;
    m.position.set(0, h, s * d / 2);
    g.add(m);
  }
  parent.add(g);
  return g;
}

/**
 * How far a bearing is from the mouth of the valley.
 *
 * The street runs on `axis`, and the ring is centred on the backdrop
 * origin, which is not quite on the road's centre line: at 96 m an 8 m
 * offset in Z is five degrees, and five degrees at the horizon is the
 * whole width of the gap. So the two exits are worked out from the
 * radius and the offset rather than assumed to be at 0 and PI.
 *
 * Returns 0 in the middle of the gap and 1 well outside it.
 */
function gapWeight(a, radius, axis, offZ, halfW) {
  if (!(halfW > 0)) return 1;
  const t = Math.asin(Math.max(-1, Math.min(1, offZ / radius)));
  const halfA = Math.atan2(halfW, radius);
  const ang = (u) => { let d = Math.abs(a - u) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
  const d = Math.min(ang(axis + t), ang(axis + Math.PI - t));
  const x = (d - halfA) / (halfA * 1.7);
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}

/**
 * A closed band of hillside all the way round the world at `radius`,
 * with a profile that wanders. One BufferGeometry, no lighting, and it
 * is the difference between a valley and a table.
 *
 * `gap` opens the mouth of the valley: the two places the street leaves
 * town, where the profile is pulled down below the ground plane so the
 * road can run out through it. Without it every ridge is a closed wall
 * and Ridge Road stops dead at ninety-six metres against a treeline,
 * which is the single loudest way of saying "this is a set".
 */
function ridgeBand(radius, base, amp, seed, color, segments = 200, gap = null) {
  const R = rng(seed);
  const pos = [], idx = [], hs = [];
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2;
    // Three octaves and a per-segment jitter. Two octaves and 96 segments
    // gave a smooth scalloped band that read as a stage flat; the crest of
    // a wooded ridge at four miles is a saw, not a curve.
    let h = base + amp * (
      0.44
      + 0.30 * Math.sin(a * 3 + seed)
      + 0.15 * Math.sin(a * 7.3 + seed * 2)
      + 0.07 * Math.sin(a * 19.1 + seed * 3)
      + 0.06 * R());
    if (gap) {
      const k = gapWeight(a, radius, gap.axis, gap.offZ, gap.halfW);
      h = -2.2 + (h + 2.2) * k;
    }
    hs.push(h);
  }
  for (let i = 0; i <= segments; i++) {
    const a = i / segments * Math.PI * 2;
    const cx = Math.cos(a) * radius, cz = Math.sin(a) * radius;
    pos.push(cx, -8, cz, cx, hs[i % segments], cz);
  }
  for (let i = 0; i < segments; i++) {
    const k = i * 2;
    idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

/** The timber on the crest of a ridge: one triangle per tree, in a ring. */
function crestTrees(radius, band, count, color, seed, gap = null) {
  const R = rng(seed);
  const pos = [], nor = [], uv = [];
  for (let i = 0; i < count; i++) {
    const a = R() * Math.PI * 2;
    const rad = radius * (0.985 + R() * 0.03);
    // no timber standing in the mouth of the valley, or the gap the ridge
    // was cut for has a wall of pine trees growing across it
    if (gap && gapWeight(a, radius, gap.axis, gap.offZ, gap.halfW) < 0.55) continue;
    const cx = Math.cos(a) * rad, cz = Math.sin(a) * rad;
    // a tangent, so the tree is a flat blade square to the middle
    const tx = -Math.sin(a), tz = Math.cos(a);
    const w = 0.9 + R() * 1.5, h = 3.4 + R() * 4.6;
    const base = band(a) - 1.5;
    pos.push(cx - tx * w, base, cz - tz * w,
             cx + tx * w, base, cz + tz * w,
             cx, base + h, cz);
    for (let k = 0; k < 3; k++) { nor.push(0, 0, 1); uv.push(0, 0); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  m.frustumCulled = false;
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

/* Where Ridge Road goes after it leaves the block. Distances are along
   the street from the origin the backdrop was placed at; `z` is the
   local offset of the carriageway's centre line, because the backdrop
   is hung off the building line and the road is not on it. */
const ROAD = { z: 8.2, half: 6.8, walkA: 4.9, walkB: 2.8, from: 78, to: 240 };

/**
 * Everything past the block: ground to the horizon, the street carrying
 * on out of sight both ways, the rest of the town, a treeline, and the
 * two ridges the valley sits between. Ashgrove is in a notch. You can
 * see the sides of it from every window in it, and until now you could
 * not see anything at all.
 *
 * `axis` is the bearing the street runs on, in radians about Y.
 *
 * Ridge Road used to end at fifty metres. The tarmac stopped, the row
 * stopped, and everything past it was roofs scattered on a bearing that
 * ignored the road entirely, so the view down the street was: kerb,
 * kerb, nothing, treeline. What was needed was not more buildings. It
 * was the ROAD, carrying on: carriageway, kerbs, pavements, centre line,
 * two rows standing on it, three cross streets, poles, and a gap cut in
 * every ridge for it to leave through.
 */
export function buildBackdrop(world, {
  x = 0, y = 0, z = 0, night = true, snow = false, seed = 5, axis = 0,
  road = ROAD, life = true,
  ground = 0x2f3128, ridgeNear = 0x2c3630, ridgeFar = 0x44515c
} = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  world.add(g);
  const out = { group: g };

  // ---- ground to the horizon -------------------------------------------
  // Deliberately not a world.floor: it must never win a footstep query
  // against the pavement, and there is a collider ring long before you
  // could ever reach it.
  const gm = snow ? tiled(MAT.snow, 400, 400) : flat(ground, { rough: 1 });
  if (snow) gm.userData.own = true;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gm);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.06;
  plane.castShadow = false; plane.receiveShadow = false;
  plane.userData.noMerge = true;
  g.add(plane);

  // ---- the street carries on --------------------------------------------
  // Everything from here to the ridge is built in STREET SPACE, inside
  // one yawed group: `u` is metres along Ridge Road from the middle of
  // the block and `v` is metres across it from the centre line, positive
  // towards the far pavement. Doing it any other way is how the old
  // backdrop ended up lining a road it was eight metres off.
  const st = new THREE.Group();
  st.rotation.y = axis;
  g.add(st);
  const put = (m, u, v, yy = 0) => {
    m.position.set(u, yy, road.z + v);
    m.castShadow = false; m.receiveShadow = false;
    st.add(m); return m;
  };
  // a flat rectangle on the road: `len` along the street, `wid` across it
  const slab = (len, wid, u, v, yy, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), mat);
    m.rotation.x = -Math.PI / 2;
    return put(m, u, v, yy);
  };

  const asphaltM = flat(snow ? 0x9aa9b6 : 0x3a3d41, { rough: .97 });
  const walkM = flat(snow ? 0x93a3b0 : 0x6b6c68, { rough: .98 });
  const kerbM = flat(snow ? 0x9fb0bd : 0x76776f, { rough: .95 });
  const lineM = flat(snow ? 0x7d7550 : 0x8a7c46, { rough: .95 });

  for (const dir of [-1, 1]) {
    const u0 = road.from, u1 = road.to, len = u1 - u0, mid = dir * (u0 + len / 2);
    slab(len, road.half * 2, mid, 0, 0.005, asphaltM);
    [-1, 1].forEach(sd => {
      const wk = sd < 0 ? road.walkA : road.walkB;
      slab(len, wk, mid, sd * (road.half + wk / 2), 0.15, walkM);
      slab(len, 0.34, mid, sd * (road.half + 0.17), 0.14, kerbM);
    });
    if (!snow) {
      // the centre line, dashed, carrying the eye out of town. It gives
      // out at a hundred and thirty, by which point the haze has it anyway.
      for (let u = u0 + 2; u < Math.min(u1, 132); u += 5.6) slab(3.0, 0.13, dir * u, 0, 0.012, lineM);
      // and the two lane lines, which is what makes it read as a road with
      // parking down both sides rather than a strip of grey
      const ll = Math.min(len, 92);
      [-1, 1].forEach(sd => slab(ll, 0.1, dir * (u0 + ll / 2), sd * (road.half - 4.1), 0.010, lineM));
    }
  }

  // Cross streets. A main street with no side streets off it is a
  // corridor, and three T-junctions going away at decreasing intervals
  // is most of what tells you how far off the far end is.
  [72, 108, 150].forEach((cu, i) => {
    for (const dir of [-1, 1]) [-1, 1].forEach(sd => {
      slab(9 - i * 1.2, 46, dir * cu, sd * (road.half + 23), 0.006 + i * 0.001, asphaltM);
    });
  });

  const roofM = flat(snow ? 0x3c4650 : 0x24282c, { rough: 1 });
  const wallM = flat(snow ? 0x333b44 : 0x2b2e30, { rough: 1 });
  const warm = shared('farWindow', () => new THREE.MeshBasicMaterial({ color: 0xFFC58A }));
  // The blocks nearest the built row are not silhouettes yet: four brick
  // tones and a cornice, so the seam where the modelled terrace hands over
  // to the backdrop falls somewhere you cannot point at.
  const NEAR_WALL = [flat(0x6d5a4a, { rough: 1 }), flat(0x5e4c42, { rough: 1 }),
                     flat(0x55605a, { rough: 1 }), flat(0x6a6152, { rough: 1 }),
                     flat(0x7a6a58, { rough: 1 }), flat(0x4e4a44, { rough: 1 })];
  const NEAR_TRIM = flat(0x8b8271, { rough: 1 });
  const AWNING = [flat(0x5a3a34, { rough: 1 }), flat(0x2f4438, { rough: 1 }),
                  flat(0x3c4a5c, { rough: 1 }), flat(0x6a5a3a, { rough: 1 })];
  const SHOPFRONT = flat(0x23282d, { rough: .9 });
  const FAR_GLASS = flat(0x2c3742, { rough: .3 });

  // Two rows standing ON the pavement, one each side, marching away and
  // simplifying as they go: brick blocks with cornices and a shopfront
  // band, then flat silhouettes, then houses with ridges behind them.
  for (const dir of [-1, 1]) {
    for (const side of [-1, 1]) {
      for (let lane = 0; lane < 2; lane++) {
        let u = road.from + lane * 7 + R() * 6;
        while (u < 176) {
          const w = 6.5 + R() * 7;
          const D = lane === 0 ? 10 + R() * 4 : 9 + R() * 5;
          const v = side * ((side < 0 ? road.walkA : road.walkB) + road.half + D / 2
            + (lane === 0 ? 0 : 15 + R() * 16));
          const hh = (lane === 0 ? 6.2 : 4.4) + R() * 4;
          const cu = dir * (u + w / 2);
          const near = lane === 0 && u < 98;
          // Nearer the road they are flat-roofed commercial blocks; behind
          // them they are houses, which have ridges. All of it goes away
          // into the haze, but the SHAPES have to be right or the far end
          // of the street reads as a row of shipping containers.
          if (lane === 0 && R() > 0.26) {
            put(new THREE.Mesh(BOX(w, hh, D), near ? NEAR_WALL[Math.floor(R() * 4) & 3] : wallM), cu, v, hh / 2);
            put(new THREE.Mesh(BOX(w + 0.3, 0.42, D + 0.4), near ? NEAR_TRIM : roofM), cu, v, hh - 0.21);
            if (near) {
              // a shopfront and a sign band along the bottom, and a grid
              // of windows over it. A four-storey block with no openings
              // in it is a crate, and eleven crates in a row at sixty
              // metres is the thing that made the far end of Ridge Road
              // look like a rendering of Ridge Road.
              const fv = v - side * (D / 2 + 0.1);
              put(new THREE.Mesh(BOX(w - 0.8, 2.4, 0.24), SHOPFRONT), cu, fv, 1.65);
              put(new THREE.Mesh(BOX(w - 0.5, 0.72, 0.3), NEAR_TRIM), cu, fv, 3.3);
              // an awning on some of them. Looking DOWN a street you see
              // almost none of the shopfronts and all of the things that
              // stick out over the pavement, so the awnings are doing more
              // work here than the glass behind them is.
              if (R() > 0.42) {
                put(new THREE.Mesh(BOX(w - 0.9, 0.06, 1.3), AWNING[Math.floor(R() * 4) & 3]),
                  cu, fv - side * 0.62, 3.0);
                put(new THREE.Mesh(BOX(w - 0.9, 0.28, 0.05), AWNING[Math.floor(R() * 4) & 3]),
                  cu, fv - side * 1.24, 2.86);
              }
              const bays = Math.max(2, Math.round(w / 2.7));
              const floors = Math.max(1, Math.round((hh - 4.2) / 2.9));
              for (let f = 0; f < floors; f++) {
                for (let b = 0; b < bays; b++) {
                  const wx = cu - w / 2 + (b + 0.5) * (w / bays);
                  const wy = 4.9 + f * 2.9;
                  const lit = night && R() > 0.62;
                  const win = new THREE.Mesh(PLN(0.95, 1.4), lit ? warm : FAR_GLASS);
                  put(win, wx, fv - side * 0.06, wy + 0.7);
                  win.rotation.y = side > 0 ? Math.PI : 0;
                  put(new THREE.Mesh(BOX(1.3, 0.12, 0.16), NEAR_TRIM), wx, fv - side * 0.05, wy + 1.48);
                }
              }
            }
          } else {
            const gg = gable(st, cu, 0, road.z + v, w, D * 0.8, hh, 1.5 + R() * 1.2,
              R() > 0.5 ? wallM : roofM, R() > 0.5 ? Math.PI / 2 : 0);
            gg.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
          }
          if (night && R() > 0.45) {
            const lw = new THREE.Mesh(PLN(0.9, 1.1), warm);
            put(lw, cu + (R() - 0.5) * w * 0.5, v - side * (D / 2 + 0.16), 1.9 + (R() > 0.6 ? 3.1 : 0));
            lw.rotation.y = side > 0 ? Math.PI : 0;
          }
          u += w + 1.2 + R() * (lane === 0 ? 5 : 12);
        }
      }
    }
  }

  // Poles down the far side, carrying the span on past the last modelled
  // one. Looking up and finding the wires stop at fifty metres is the
  // same tell as the road stopping at fifty metres.
  const poleM = flat(0x3f382f, { rough: .98 });
  const wireM = flat(0x1b1d20, { rough: .95 });
  const SPAN = 24;
  for (const dir of [-1, 1]) {
    for (let u = road.from + 8; u < 152; u += SPAN) {
      const ph = 9.4 - (u - road.from) * 0.012;
      put(new THREE.Mesh(CYL(0.12, 0.17, ph, 5), poleM), dir * u, road.half + 0.9, ph / 2);
      put(new THREE.Mesh(BOX(0.12, 0.14, 2.4), poleM), dir * u, road.half + 0.9, ph - 0.7);
      if (u + SPAN >= 152) continue;
      // two wires, three segments each, sagging. A catenary is a parabola
      // at this span and nobody has ever told the difference from a pavement.
      for (let k = 0; k < 2; k++) {
        const yy = ph - 0.55 - k * 0.52;
        for (let i = 0; i < 3; i++) {
          const t0 = i / 3, t1 = (i + 1) / 3;
          const y0 = yy - 3.6 * t0 * (1 - t0), y1 = yy - 3.6 * t1 * (1 - t1);
          const dx = SPAN * (t1 - t0), dy = y1 - y0;
          const seg = new THREE.Mesh(CYL(0.022, 0.022, Math.hypot(dx, dy), 4), wireM);
          // the cylinder stands on Y; laying it along the span is one
          // rotation about Z, and the sag is the small correction to it
          seg.rotation.z = -Math.PI / 2 + Math.atan2(dy, dx * dir) * dir;
          put(seg, dir * (u + SPAN * (t0 + t1) / 2), road.half + 0.9, (y0 + y1) / 2);
        }
      }
    }
  }

  // Cars at the kerb, going away. A street with nothing parked on it past
  // the block you can walk on is a street that stops being a street the
  // moment you look at it.
  if (life) {
    for (const dir of [-1, 1]) {
      for (let u = road.from + 6; u < 116; u += 13 + R() * 9) {
        if (R() > 0.72) continue;
        const side = R() > 0.5 ? 1 : -1;
        // carBody builds nose along +Z, and +Z out here is ACROSS the
        // street, so a kerbside car is a quarter turn either way
        carBody(st, dir * u, 0, road.z + side * (road.half - 1.75),
          side > 0 ? -Math.PI / 2 : Math.PI / 2, (seed * 31 + Math.round(u) * 7) >>> 0);
      }
    }
  }

  // Streetlights, the same ones, going away. Four miles and thirty-one of
  // them, and this is the only place you can see that it is true.
  const lampPost = flat(0x35383a, { rough: .8, metal: .3 });
  const lampHead = night
    ? shared('farLamp', () => new THREE.MeshBasicMaterial({ color: 0xFFC58A }))
    : flat(0x6d6a62, { rough: .5 });
  for (const dir of [-1, 1]) {
    for (let u = road.from + 4; u < 140; u += 12) {
      const ph = 7.6 - (u - road.from) * 0.008;
      put(new THREE.Mesh(CYL(0.07, 0.10, ph, 5), lampPost), dir * u, -(road.half + 1.1), ph / 2);
      put(new THREE.Mesh(BOX(0.3, 0.16, 0.62), lampHead), dir * u, -(road.half + 0.35), ph - 0.1);
      put(new THREE.Mesh(BOX(1.5, 0.09, 0.1), lampPost), dir * u, -(road.half + 0.75), ph);
    }
  }

  // ---- the rest of the town ---------------------------------------------
  // Roofs, packed tighter near the road and thinning out up the sides,
  // which is how a valley town is actually laid out: you build on the
  // flat first and then you build on the hill because you have to.
  let litRoofs = 0;
  const corridor = road.half + Math.max(road.walkA, road.walkB) + 30;
  for (let i = 0; i < 34; i++) {
    const a = R() * Math.PI * 2;
    const rad = 46 + Math.pow(R(), 0.7) * 60;
    const px = Math.cos(a) * rad, pz = Math.sin(a) * rad;
    // Keep the street clear FOR ITS WHOLE LENGTH. This used to give up
    // at |x| > 54, which is why a gable-roofed house stood in the middle
    // of Ridge Road sixty metres out and the road appeared to stop dead
    // against it.
    // the point's distance ACROSS the street, in street space
    const acr = px * Math.sin(axis) + pz * Math.cos(axis) - road.z;
    if (Math.abs(acr) < corridor) continue;
    const w = 6 + R() * 5, d = 7 + R() * 4, hh = 4.4 + R() * 2.6;
    const hg = gable(g, px, 0, pz, w, d, hh, 1.6 + R() * 1.0, R() > 0.75 ? wallM : roofM, R() * Math.PI);
    if (night && litRoofs < 12 && R() > 0.45) {
      litRoofs++;
      const lw = new THREE.Mesh(PLN(0.8, 1.0), warm);
      lw.position.set(0, 1.8, d / 2 + 0.06);
      hg.add(lw);
    }
  }

  // The church, at the top of the hill, where Ridge Road ends. Four miles
  // and thirty-one streetlights away, and the only thing in this town you
  // can see from everywhere in it.
  const spire = new THREE.Group();
  spire.position.set(-104, 10, -112);
  g.add(spire);
  const nave = new THREE.Mesh(BOX(9, 9, 16), roofM); nave.position.y = 4.5; spire.add(nave);
  const tower = new THREE.Mesh(BOX(5, 20, 5), roofM); tower.position.set(0, 10, 9); spire.add(tower);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 11, 4), roofM);
  cone.position.set(0, 25.5, 9); cone.rotation.y = Math.PI / 4; spire.add(cone);
  const cross = new THREE.Mesh(BOX(0.3, 2.2, 0.3), roofM);
  cross.position.set(0, 32, 9); spire.add(cross);

  // ---- treeline, then the near ridge, then the far one -------------------
  // Trees in clumps, not a uniform scatter. Woodland does not distribute
  // itself evenly and an even distribution is the single most obvious
  // tell that something was placed by a loop.
  const treeM = flat(snow ? 0x25302c : 0x1d2620, { rough: 1 });
  for (let c = 0; c < 14; c++) {
    const ca2 = R() * Math.PI * 2;
    const crad = 74 + R() * 56;
    const cxp = Math.cos(ca2) * crad, czp = Math.sin(ca2) * crad;
    const n = 3 + Math.floor(R() * 6);
    for (let i = 0; i < n; i++) {
      const tx = cxp + (R() - 0.5) * 22, tz = czp + (R() - 0.5) * 22;
      // and nothing grows in the middle of the carriageway. Two nine-metre
      // spruces used to stand in the road at a hundred metres, dead on the
      // vanishing point, which is precisely where you cannot miss them.
      if (Math.abs(tx * Math.sin(axis) + tz * Math.cos(axis) - road.z) < corridor - 8) continue;
      const t = new THREE.Mesh(new THREE.ConeGeometry(2.0 + R() * 1.8, 9 + R() * 9, 5), treeM);
      t.position.set(tx, 4 + R() * 3, tz);
      t.castShadow = false; t.receiveShadow = false;
      g.add(t);
    }
  }

  mergeByMaterial(g);

  // The ridges go in after the merge: they are one mesh each already and
  // they must stay unlit, so they have no business in a material bucket.
  // Three layers, because atmospheric perspective needs something to be
  // perspective BETWEEN. One band is a cut-out; three is a valley.
  const bandOf = (base, amp, seed) => (a) =>
    base + amp * (0.44 + 0.30 * Math.sin(a * 3 + seed) + 0.15 * Math.sin(a * 7.3 + seed * 2));
  // The mouth of the valley, in metres of half-width, measured off the
  // road's own centre line. Held constant in METRES, so it subtends less
  // and less as the bands get further away: the near ridge stands open
  // and the far one closes over, which is what a valley does.
  const gap = { axis, offZ: road.z, halfW: 21 };
  out.wood = ridgeBand(96, 2, 12, 17, snow ? 0x2f3a42 : 0x222c28, 200, gap);
  out.near = ridgeBand(142, 4, 27, 3, ridgeNear, 200, gap);
  out.far = ridgeBand(190, 8, 44, 9, ridgeFar, 200, { ...gap, halfW: 14 });
  g.add(out.far); g.add(out.near); g.add(out.wood);
  g.add(crestTrees(142, bandOf(4, 27, 3), 420, ridgeNear, 23, gap));
  g.add(crestTrees(96, bandOf(2, 12, 17), 480, snow ? 0x2f3a42 : 0x222c28, 29, gap));
  return out;
}

/**
 * A utility pole with a crossarm, a transformer, and a sagging span to
 * the next one. A street with no wires over it is a rendering; this one
 * is meant to be a place.
 */
export function utilityPole(world, x, y, z, {
  h = 9.2, arm = 2.4, to = null, transformer = false, wires = 2, segs = 4
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  world.add(g);
  const wood = flat(0x4a4038, { rough: .95 });
  const put = (m) => { m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };

  put(new THREE.Mesh(CYL(0.13, 0.17, h, 7), wood)).position.y = h / 2;
  put(new THREE.Mesh(BOX(arm, 0.14, 0.12), wood)).position.y = h - 0.7;
  for (let i = 0; i < 4; i++) {
    put(new THREE.Mesh(CYL(0.05, 0.06, 0.16, 6), flat(0x4e6a5c, { rough: .35 })))
      .position.set(-arm / 2 + 0.25 + i * (arm - 0.5) / 3, h - 0.55, 0);
  }
  if (transformer) {
    put(new THREE.Mesh(CYL(0.32, 0.32, 0.9, 10), flat(0x6f7377, { rough: .6, metal: .35 })))
      .position.set(0.3, h - 2.2, 0);
  }

  if (to) {
    // A catenary is a parabola at this sag and nobody has ever been able
    // to tell the difference from the pavement.
    const wireM = flat(0x15171a, { rough: .9 });
    const dx = to.x - x, dz = to.z - z;
    const span = Math.hypot(dx, dz);
    const sag = Math.min(1.2, span * 0.04);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
    for (let k = 0; k < wires; k++) {
      const yy = h - 0.55 - k * 0.52, ox = -0.6 + k * 1.2;
      for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs;
        a.set(dx * t0 + ox * 0.15, yy - sag * 4 * t0 * (1 - t0), dz * t0);
        b.set(dx * t1 + ox * 0.15, yy - sag * 4 * t1 * (1 - t1), dz * t1);
        const seg = put(new THREE.Mesh(CYL(0.018, 0.018, a.distanceTo(b), 4), wireM));
        seg.position.copy(a).lerp(b, 0.5);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.subVectors(b, a).normalize());
      }
    }
  }
  mergeByMaterial(g);
  return g;
}

/* ================================================================ furniture
   A street is not a road with buildings beside it. It is a road with
   buildings beside it and eighty years of small municipal decisions
   standing on the pavement in between. Ridge Road had a bin, a news box
   and one parked car on eleven metres of concrete, and eleven metres of
   empty concrete is what a car park looks like. */

/**
 * A shade tree in a pavement grate. A street tree is not a green ball on
 * a stick: it is a bare trunk to about head height, a fork, three or four
 * limbs going out and up, and a canopy that is WIDER than it is tall with
 * a ragged underside you can see the sky through.
 *
 * The canopy is built from flattened icosahedra in four tones, darkest
 * underneath, which is the cheapest thing that reads as depth in foliage.
 */
export function streetTree(parent, x, y, z, seed = 1, { winter = false, snow = false } = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = R() * Math.PI * 2;
  parent.add(g);
  const bark = flat(0x453a2f, { rough: .98 });
  const barkDark = flat(0x2e2720, { rough: 1 });
  const LEAF = winter
    ? [0x4a3d2c, 0x3d3327, 0x574733]
    : [0x39442c, 0x424e33, 0x2d3623, 0x4a5639];
  const put = (m) => { m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };

  // the grate, and the ring of granite setts round it
  put(new THREE.Mesh(BOX(1.5, 0.06, 1.5), flat(0x2a2b2d, { rough: .7, metal: .4 }))).position.y = 0.03;
  put(new THREE.Mesh(BOX(1.7, 0.1, 1.7), flat(0x6d6a63, { rough: .95 }))).position.y = 0.02;

  // trunk: three stacked tapers with a slight lean, so it is not a pipe
  const th = 2.5 + R() * 0.8;
  let py = 0, r0 = 0.16 + R() * 0.04;
  const lean = (R() - 0.5) * 0.09;
  for (let i = 0; i < 3; i++) {
    const seg = th / 3, r1 = r0 * 0.82;
    const t = put(new THREE.Mesh(CYL(r1, r0, seg + 0.04, 8), i ? bark : barkDark));
    t.position.set(lean * py * 0.5, py + seg / 2, 0);
    t.rotation.z = -lean;
    py += seg; r0 = r1;
  }

  // the fork: four limbs out and up
  const limbs = 4;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + R() * 0.6;
    const len = 1.5 + R() * 0.9;
    const lb = put(new THREE.Mesh(CYL(0.035, 0.085, len, 6), bark));
    const tilt = 0.55 + R() * 0.3;
    lb.position.set(Math.cos(a) * len * 0.34, th + len * 0.36, Math.sin(a) * len * 0.34);
    lb.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }

  if (!winter) {
    // canopy: wider than tall, flattened, and darkest at the bottom
    const CW = 2.3 + R() * 0.9;
    for (let i = 0; i < 11; i++) {
      const up = i / 11;
      const r = (0.75 + R() * 0.6) * (1 - up * 0.35);
      const c = put(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
        flat(LEAF[up < 0.4 ? (R() > 0.5 ? 2 : 0) : Math.floor(R() * LEAF.length)], { rough: 1 })));
      const a = R() * Math.PI * 2, rad = R() * CW * (1 - up * 0.5);
      c.position.set(Math.cos(a) * rad, th + 0.55 + up * 1.9 + R() * 0.3, Math.sin(a) * rad);
      c.scale.set(1.15, 0.72, 1.15);
      c.rotation.set(R() * 3, R() * 3, R() * 3);
    }
  } else if (snow) {
    for (let i = 0; i < 5; i++) {
      const c = put(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + R() * 0.2, 0), flat(0xc6d2de, { rough: .85 })));
      c.position.set((R() - 0.5) * 2.4, th + 0.9 + R() * 1.4, (R() - 0.5) * 2.4);
      c.scale.y = 0.5;
    }
  }
  mergeByMaterial(g);
  return g;
}

/** A parking meter. Two per space, and every one of them is a 1970s duck. */
export function parkingMeter(parent, x, y, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  parent.add(g);
  const body = flat(0x4a5a52, { rough: .55, metal: .3 });
  const put = (m) => { m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };
  put(new THREE.Mesh(CYL(0.045, 0.055, 1.15, 8), body)).position.y = 0.575;
  put(new THREE.Mesh(BOX(0.17, 0.3, 0.13), body)).position.y = 1.28;
  const face = put(new THREE.Mesh(PLN(0.11, 0.14), flat(0xd8d3c4, { rough: .5 })));
  face.position.set(0, 1.31, 0.068);
  mergeByMaterial(g);
  return g;
}

/** A slatted bench, bolted to the pavement, one slat short. */
export function bench(parent, x, y, z, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  parent.add(g);
  const wood = flat(0x5a4531, { rough: .9 });
  const iron = flat(0x2c2e30, { rough: .6, metal: .4 });
  const put = (m) => { m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };
  for (let i = 0; i < 4; i++) put(new THREE.Mesh(BOX(1.8, 0.05, 0.11), wood)).position.set(0, 0.45, -0.2 + i * 0.13);
  for (let i = 0; i < 3; i++) put(new THREE.Mesh(BOX(1.8, 0.11, 0.05), wood)).position.set(0, 0.62 + i * 0.14, 0.26);
  [-1, 1].forEach(sd => {
    put(new THREE.Mesh(BOX(0.06, 0.45, 0.06), iron)).position.set(sd * 0.8, 0.22, -0.15);
    put(new THREE.Mesh(BOX(0.06, 0.9, 0.06), iron)).position.set(sd * 0.8, 0.45, 0.26);
  });
  mergeByMaterial(g);
  return g;
}

const CAR_PAINT = [0x53687d, 0x8f4c40, 0x53664a, 0xa8a396, 0x3b4046, 0x757c88, 0x8b8672, 0x9a6038];

/* A car is not a big object. It is a LOW one, and every one of these was
   built a foot and a half too tall: the roof came out at 1.77 m, five
   centimetres over the player's eye, so a Ford at the kerb looked over
   the top of the man walking past it. These are the numbers off a tape
   measure, in metres, and everything else in the function is derived
   from them.

   The other half of the problem was the waist. A saloon whose sides run
   from the sill to 1.14 m has no wheel showing and no glass worth the
   name, and a box with a smaller box on it is a skip on castors. The
   beltline goes where a beltline goes, which is just under a metre, and
   the wheel then fills its arch the way a wheel does. */
const CAR_TYPES = {
  sedan:  { L: 4.62, W: 1.79, belt: 0.93, roof: 1.42, cab: 0.44, cabZ: -0.03 },
  wagon:  { L: 4.80, W: 1.80, belt: 0.96, roof: 1.49, cab: 0.54, cabZ: -0.08 },
  coupe:  { L: 4.44, W: 1.77, belt: 0.91, roof: 1.36, cab: 0.38, cabZ: -0.06 },
  pickup: { L: 5.34, W: 1.86, belt: 1.06, roof: 1.72, cab: 0.30, cabZ:  0.11 },
  van:    { L: 4.72, W: 1.85, belt: 1.02, roof: 1.94, cab: 0.62, cabZ: -0.02 }
};
const WHEEL_R = 0.33, GROUND = 0.30;   // top of the sill, and the tyre radius

/**
 * A car. Not a Volvo: the Volvo means something, and eight identical
 * Volvos would mean nothing.
 *
 * Built nose along +Z, so a kerbside car is rotated +-PI/2 and NOT left
 * at zero, which parked the whole street broadside across two lanes.
 *
 * The thing that makes a box read as a car is the greenhouse: a cabin
 * narrower than the body, set in from the sides, with the windscreen and
 * the backlight raked, sitting on a beltline low enough that there is
 * some glass above it and some wheel below it.
 */
export function carBody(parent, x, y, z, rot = 0, seed = 1, {
  type = null, lamps = false
} = {}) {
  const R = rng(seed);
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  parent.add(g);

  const k = R();
  const kind = type || (k > 0.88 ? 'van' : k > 0.74 ? 'pickup' : k > 0.56 ? 'wagon' : k > 0.44 ? 'coupe' : 'sedan');
  const T = CAR_TYPES[kind];
  const L = T.L, W = T.W, belt = T.belt, roofY = T.roof;

  // Metalness with no environment map is BLACK. There is no envmap in this
  // game, so every car painted at metalness 0.5 came out a silhouette with
  // wheels. Car paint here is a clearcoat cheat: low metalness, low
  // roughness, and the colour does the work.
  const col = CAR_PAINT[Math.floor(R() * CAR_PAINT.length)];
  const paint = flat(col, { rough: .34, metal: .08 });
  const shade = flat(new THREE.Color(col).multiplyScalar(0.84).getHex(), { rough: .40, metal: .06 });
  const glassM = flat(0x2b3540, { rough: .12, metal: .0 });
  const trimM = flat(0x26292c, { rough: .85 });
  const chrome = flat(0xb0b5b8, { rough: .35, metal: .12 });
  const put = (m) => { m.castShadow = false; m.receiveShadow = false; g.add(m); return m; };
  const box = (w, h, d, px, py, pz, mat, rx = 0) => {
    const m = put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
    m.position.set(px, py, pz); if (rx) m.rotation.x = rx;
    return m;
  };

  // ---- body: one slab from the sill to the beltline ----
  const bodyH = belt - GROUND;
  box(W, bodyH, L, 0, GROUND + bodyH / 2, 0, paint);
  // the sill under it, tucked in, which is what stops the body reading as
  // a block standing on the road
  box(W - 0.10, 0.14, L - 1.5, 0, GROUND - 0.03, 0, trimM);
  // beltline moulding: one line along the car at the height of the glass
  box(W + 0.015, 0.055, L - 0.36, 0, belt - 0.02, 0, shade);
  // shut lines and a door handle, because a saloon has doors and a slab does not
  [1, -1].forEach(sx => {
    [L * 0.04, -L * 0.24].forEach(dz =>
      box(0.012, bodyH - 0.14, 0.02, sx * (W / 2 + 0.004), GROUND + bodyH / 2, dz, trimM));
    box(0.05, 0.035, 0.13, sx * (W / 2 + 0.02), belt - 0.15, -L * 0.10, chrome);
  });

  // bonnet and boot: a shallow step down from the wings, ahead of and
  // behind the cabin. A flat deck the whole length is a bench.
  const cabD = L * T.cab, cabZ = L * T.cabZ;
  const noseZ = cabZ + cabD / 2 + 0.42, tailZ = cabZ - cabD / 2 - 0.36;
  const noseLen = Math.max(0.5, L / 2 - noseZ + 0.42);
  const tailLen = Math.max(0.4, tailZ + L / 2 - 0.36);
  box(W - 0.13, 0.055, noseLen, 0, belt - 0.035, L / 2 - noseLen / 2 - 0.02, shade);
  if (kind !== 'wagon' && kind !== 'van' && kind !== 'pickup')
    box(W - 0.15, 0.055, tailLen, 0, belt - 0.035, -L / 2 + tailLen / 2 + 0.02, shade);

  // bumpers, and the arch lips the wheels turn inside
  [1, -1].forEach(fz => box(W + 0.02, 0.20, 0.20, 0, GROUND + 0.16, fz * (L / 2 - 0.05), chrome));
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) =>
    box(0.055, 0.34, 1.02, sx * (W / 2 + 0.005), GROUND + 0.14, sz * L * 0.30, trimM));

  // ---- greenhouse ----
  // The rake is COMPUTED, from the corner of the roof down to the cowl.
  // Both screens used to be planks at a hand-picked angle with the sign
  // the wrong way round, so the windscreen leaned back over the roof and
  // every car on Ridge Road had a notch cut out of the front of its cabin.
  const glassH = roofY - belt - 0.06;
  const rake = (dz, run, mat) => {
    const len = Math.hypot(run, glassH);
    // +z is the nose, so the screen at the FRONT falls away towards +z,
    // which is a positive rotation about x, and the one at the back is
    // the mirror of it.
    const sgn = dz > 0 ? 1 : -1;
    box(W - 0.21, 0.075, len + 0.04, 0, belt + glassH / 2 + 0.01,
      cabZ + dz + sgn * run / 2, mat, sgn * Math.atan2(glassH, run));
  };
  box(W - 0.19, glassH, cabD, 0, belt + glassH / 2 + 0.01, cabZ, glassM);
  box(W - 0.27, 0.07, cabD + 0.04, 0, roofY - 0.03, cabZ, paint);            // the roof
  // A, B and C pillars, not one continuous rail: what makes a greenhouse
  // read is the DARK between the uprights, and a rail down each side
  // paints the windows out.
  [1, -1].forEach(sx => {
    [cabD / 2 - 0.05, cabD * (kind === 'coupe' ? 0.06 : 0.10), -cabD / 2 + 0.05].forEach(pz =>
      box(0.075, glassH, 0.10, sx * (W / 2 - 0.10), belt + glassH / 2 + 0.01, cabZ + pz, paint));
    box(0.055, 0.05, cabD + 0.02, sx * (W / 2 - 0.105), roofY - 0.09, cabZ, paint);   // drip rail
  });
  rake(cabD / 2, glassH * 1.15, paint);
  if (kind === 'sedan' || kind === 'coupe') rake(-cabD / 2, glassH * 0.95, paint);
  else if (kind !== 'pickup') box(W - 0.23, glassH - 0.03, 0.07, 0, belt + glassH / 2, cabZ - cabD / 2 - 0.03, glassM);

  if (kind === 'pickup') {
    const bedZ = -L * 0.22, bedD = L * 0.44;
    [1, -1].forEach(sx => box(0.09, 0.40, bedD, sx * (W / 2 - 0.045), belt + 0.20, bedZ, paint));
    box(W - 0.02, 0.40, 0.09, 0, belt + 0.20, bedZ - bedD / 2, paint);
    box(W - 0.22, 0.05, bedD - 0.1, 0, belt + 0.03, bedZ, trimM);
  }
  if (kind === 'wagon' && R() > 0.55) {                 // a roof rack on some of them
    [1, -1].forEach(sx => box(0.05, 0.05, cabD * 0.8, sx * (W / 2 - 0.22), roofY + 0.05, cabZ - 0.1, trimM));
  }

  // ---- wheels: tyre, and a hub you can see is a hub ----
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const wx = sx * (W / 2 - 0.085), wz = sz * L * 0.30;
    const t = put(new THREE.Mesh(CYL(WHEEL_R, WHEEL_R, 0.21, 14), flat(0x131313, { rough: .96 })));
    t.rotation.z = Math.PI / 2; t.position.set(wx, WHEEL_R, wz);
    const hub = put(new THREE.Mesh(CYL(0.185, 0.185, 0.23, 10), chrome));
    hub.rotation.z = Math.PI / 2; hub.position.set(wx, WHEEL_R, wz);
  });

  // ---- lamps, mirrors, plate ----
  const headM = lamps
    ? flat(0xfff0d2, { rough: .12, emissive: 0xffdca8, ei: 1.5 })
    : flat(0xcfcfc6, { rough: .18 });
  const tailM = lamps
    ? flat(0xc4302a, { rough: .3, emissive: 0x8c1410, ei: 1.1 })
    : flat(0x7a2620, { rough: .35 });
  [1, -1].forEach(sx => {
    box(0.38, 0.15, 0.05, sx * 0.56, belt - 0.20, L / 2 + 0.015, headM);
    box(0.22, 0.24, 0.05, sx * 0.62, belt - 0.16, -L / 2 - 0.015, tailM);
    box(0.15, 0.08, 0.05, sx * (W / 2 + 0.045), belt + 0.09, cabZ + cabD / 2 + 0.14, trimM);
  });
  box(W - 0.5, 0.10, 0.04, 0, belt - 0.34, L / 2 + 0.03, trimM);           // grille
  box(0.32, 0.13, 0.03, 0, GROUND + 0.13, -L / 2 - 0.05, flat(0xc9c6ba, { rough: .6 }));

  mergeByMaterial(g);
  g.userData.size = { L, W, H: roofY };
  g.userData.kind = kind;
  return g;
}

/** A car at the kerb, and the collider that goes with it. */
export function parkedCar(parent, x, y, z, rot = 0, seed = 1) {
  return carBody(parent, x, y, z, rot, seed);
}
