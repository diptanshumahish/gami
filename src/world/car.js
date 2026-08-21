/* ============================================================
   car.js: Jared's car. A 1993 Ford Taurus wagon, the colour of
   a filing cabinet, with 140,000 miles on it and a box of books
   on the back seat.

   It is not boxes. The body is a LOFT: eighteen cross-sections
   laid along the length, each one the same ring of fifteen
   points (underbody, sill, the bulge below the belt, the belt,
   the top of the glass, the roof), skinned into one low-poly
   hull with smooth normals. That gives it the things a car has
   and a stack of boxes does not: a low rounded nose, a bonnet
   that rises to the cowl, a windscreen raked at thirty degrees,
   tumblehome on the glass, a long flat wagon roof, wheel arches
   actually cut into the silhouette, and shut lines that are
   grooves in the panel rather than stickers on it. The glass is
   the same loft, the rows above the belt, in another material.

   From the driver's seat the same ring, drawn inside out and a
   few centimetres in, is the door cards, the carpet and the
   headliner, so wherever he looks there is car and not daylight.
   The dash is the 1992 Taurus dash: a deep soft top, a hooded
   binnacle with a 120 mph speedometer and two small gauges, the
   centre stack angled at the driver with a green radio and three
   heater sliders, a column with the indicator stalk on the left
   and the shifter on the right, and a four-spoke wheel with the
   airbag pad. Grey velour seats. Everything low-poly, textured,
   matte, and lit only by what the scene lights it with, which
   is the way it is done in Fears to Fathom.

   Body frame: +z is the nose, +x is the driver's side (left-hand
   drive: facing +z, your left is +x), y up from the road. A car
   facing down a road that runs to -z is rotated by PI.
   ============================================================ */
import * as THREE from 'three';
import { MAT, T, mat, flat, tiled } from './mat.js';
import { SHAPE, BOX, CYL, PLN } from './world.js';
import { mergeByMaterial } from './facades.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------------------------------------------------------------- stations
   One row per cross-section, nose first. `arch` lifts the sill into a
   wheel arch, `glass` says what the segment BEHIND this station is
   glazed with. Widths are half-widths. */
const STATIONS = [
  { z: 2.47, floor: 0.36, sx: 0.70, sy: 0.41, bx: 0.76, by: 0.66, tx: 0.50, ty: 0.70, ry: 0.72, arch: 0, glass: 'none' },
  { z: 2.22, floor: 0.32, sx: 0.82, sy: 0.36, bx: 0.87, by: 0.72, tx: 0.62, ty: 0.78, ry: 0.80, arch: 0, glass: 'none' },
  { z: 1.90, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.89, by: 0.78, tx: 0.68, ty: 0.84, ry: 0.86, arch: 0, glass: 'none' },
  { z: 1.76, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.89, by: 0.80, tx: 0.69, ty: 0.86, ry: 0.88, arch: 0.6, glass: 'none' },
  { z: 1.48, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.83, tx: 0.71, ty: 0.89, ry: 0.91, arch: 1, glass: 'none' },
  { z: 1.21, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.88, tx: 0.72, ty: 0.93, ry: 0.95, arch: 0.6, glass: 'none' },
  { z: 1.05, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.95, tx: 0.74, ty: 0.97, ry: 0.99, arch: 0, glass: 'screen' },
  { z: 0.72, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.67, ty: 1.22, ry: 1.24, arch: 0, glass: 'screen' },
  { z: 0.40, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.63, ty: 1.37, ry: 1.40, arch: 0, glass: 'side' },
  { z: -0.30, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.63, ty: 1.38, ry: 1.41, arch: 0, glass: 'side' },
  { z: -0.79, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.63, ty: 1.38, ry: 1.41, arch: 0, glass: 'side' },
  { z: -0.95, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.63, ty: 1.38, ry: 1.41, arch: 0.6, glass: 'side' },
  { z: -1.21, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.90, by: 0.96, tx: 0.63, ty: 1.38, ry: 1.41, arch: 1, glass: 'side' },
  { z: -1.47, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.89, by: 0.97, tx: 0.63, ty: 1.37, ry: 1.40, arch: 0.6, glass: 'side' },
  { z: -1.63, floor: 0.31, sx: 0.86, sy: 0.32, bx: 0.89, by: 0.97, tx: 0.63, ty: 1.37, ry: 1.40, arch: 0, glass: 'side' },
  { z: -2.10, floor: 0.32, sx: 0.84, sy: 0.34, bx: 0.87, by: 0.98, tx: 0.62, ty: 1.34, ry: 1.37, arch: 0, glass: 'none' },
  { z: -2.47, floor: 0.36, sx: 0.80, sy: 0.40, bx: 0.84, by: 0.98, tx: 0.60, ty: 1.30, ry: 1.32, arch: 0, glass: 'none' }
];
/** Where the panel gaps are: the front door's leading edge, the B pillar,
    the rear door's trailing edge, the tailgate. */
const GROOVES = [1.00, -0.30, -0.74, -2.10];
const GROOVE_W = 0.010, GROOVE_D = 0.012;
export const CAR_L = 4.94, CAR_W = 1.80, CAR_H = 1.41;
export const AXLE_F = 1.48, AXLE_R = -1.21, WHEEL_R = 0.33;

/** A station at any z, interpolated between the two it falls between. */
function stationAt(z) {
  const S = STATIONS;
  if (z >= S[0].z) return { ...S[0] };
  if (z <= S[S.length - 1].z) return { ...S[S.length - 1] };
  for (let i = 0; i < S.length - 1; i++) {
    const a = S[i], b = S[i + 1];
    if (z <= a.z && z >= b.z) {
      const t = (a.z - z) / (a.z - b.z || 1);
      const o = { z, glass: a.glass };
      for (const k of ['floor', 'sx', 'sy', 'bx', 'by', 'tx', 'ty', 'ry', 'arch']) o[k] = lerp(a[k], b[k], t);
      return o;
    }
  }
  return { ...S[0] };
}

/** The full station list with the groove pairs dropped in and sorted. */
function allStations() {
  const out = STATIONS.map(s => ({ ...s, groove: false }));
  GROOVES.forEach(z0 => {
    const a = stationAt(z0 + GROOVE_W), b = stationAt(z0 - GROOVE_W);
    a.groove = true; b.groove = true;
    out.push(a, b);
  });
  out.sort((a, b) => b.z - a.z);
  // a groove station takes the glass of whatever principal station is ahead of it
  for (let i = 1; i < out.length; i++) if (out[i].groove) out[i].glass = out[i - 1].glass;
  return out;
}

/**
 * The half ring for a station, bottom centre to roof centre, eight points.
 * `inset` pulls it in for the interior lining; `floorUp` raises the floor
 * pan (the cabin floor is not the underside of the car).
 */
function halfRing(s, { inset = 0, floorUp = 0 } = {}) {
  const floor = s.floor + s.arch * 0.28 + floorUp;
  const sy = s.sy + s.arch * 0.34;
  const g = s.groove ? GROOVE_D : 0;
  const lowY = lerp(sy, s.by, 0.5);
  const pts = [
    [0, floor],
    [Math.max(0.05, s.sx - 0.06 - inset), floor],
    [s.sx - inset - g, sy],
    [s.bx + 0.025 - inset - g, lowY],
    [s.bx - inset - g, s.by],
    [s.tx - inset * 0.8, s.ty - inset * 0.6],
    [s.tx * 0.55, s.ry - (s.ry - s.ty) * 0.25 - inset],
    [0, s.ry - inset]
  ];
  return pts;
}
/** Fifteen points: the half ring and its mirror, -x last. */
function fullRing(s, o) {
  const h = halfRing(s, o);
  const ring = h.map(p => [p[0], p[1]]);
  for (let i = h.length - 2; i >= 0; i--) ring.push([-h[i][0], h[i][1]]);
  return ring;
}
/** Ring row i (between ring point i and i+1) -> the half-ring row it mirrors. */
const halfRow = (i) => i < 7 ? i : 13 - i;

/** Which material a row of a segment gets, 'paint' | 'glass'. */
function rowKind(glass, hr) {
  if (hr === 4) return (glass === 'side' || glass === 'screen') ? 'glass' : 'paint';
  if (hr === 5 || hr === 6) return glass === 'screen' ? 'glass' : 'paint';
  return 'paint';
}

/**
 * Skin the stations. `pick(glass, hr, st)` returns a bucket name or null
 * to skip the quad; one BufferGeometry per bucket comes back. UVs are in
 * metres: u round the ring, v along the car, except for `sideV`, which
 * maps v to height between sill and belt so a dirt-at-the-sill texture
 * lands where the dirt is.
 */
function loft(stations, { pick, inset = 0, floorUp = 0, sideV = false, zMin = -Infinity, zMax = Infinity } = {}) {
  const rings = stations.map(s => fullRing(s, { inset, floorUp }));
  const out = new Map();
  const bucket = (k) => { if (!out.has(k)) out.set(k, { pos: [], uv: [], idx: [] }); return out.get(k); };
  for (let k = 0; k < stations.length - 1; k++) {
    const a = stations[k], b = stations[k + 1];
    if (a.z > zMax + 1e-6 || b.z < zMin - 1e-6) continue;
    const ra = rings[k], rb = rings[k + 1];
    let arc = 0;
    for (let i = 0; i < ra.length - 1; i++) {
      const hr = halfRow(i);
      const name = pick(a.glass, hr, a, b);
      const segLen = Math.hypot(ra[i + 1][0] - ra[i][0], ra[i + 1][1] - ra[i][1]);
      if (name) {
        const B = bucket(name);
        const base = B.pos.length / 3;
        const p00 = [ra[i][0], ra[i][1], a.z], p01 = [ra[i + 1][0], ra[i + 1][1], a.z];
        const p10 = [rb[i][0], rb[i][1], b.z], p11 = [rb[i + 1][0], rb[i + 1][1], b.z];
        B.pos.push(...p00, ...p01, ...p10, ...p11);
        const vOf = (p, st) => sideV
          ? (hr >= 1 && hr <= 4 ? THREE.MathUtils.clamp((p[1] - (st.sy + st.arch * 0.34)) / Math.max(0.2, st.by - st.sy), 0, 1) : 0.92)
          : p[2];
        const uOf = (p) => sideV ? p[2] * 0.5 : arc;
        B.uv.push(uOf(p00), vOf(p00, a), sideV ? p01[2] * 0.5 : arc + segLen, vOf(p01, a),
          uOf(p10), vOf(p10, b), sideV ? p11[2] * 0.5 : arc + segLen, vOf(p11, b));
        // wound so the outside faces out: ring goes bottom -> up the +x side,
        // stations go nose -> tail
        B.idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
      arc += segLen;
    }
  }
  const geos = new Map();
  out.forEach((B, k) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
    g.setIndex(B.idx);
    g.computeVertexNormals();
    geos.set(k, g);
  });
  return geos;
}

/** A flat cap over a ring: triangles from a centre point. `split` (y) puts
    everything above it in the second bucket. */
function cap(ring, z, { split = null, nose = true } = {}) {
  const B = { paint: { pos: [], uv: [], idx: [] }, glass: { pos: [], uv: [], idx: [] } };
  const cy = split ?? ring.reduce((m, p) => Math.max(m, p[1]), 0) * 0.5;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const glassy = split !== null && a[1] >= split - 0.005 && b[1] >= split - 0.005;
    const k = glassy ? B.glass : B.paint;
    const base = k.pos.length / 3;
    k.pos.push(0, cy, z, a[0], a[1], z, b[0], b[1], z);
    k.uv.push(0.5, 0.5, a[0] * 0.5 + 0.5, a[1] * 0.5, b[0] * 0.5 + 0.5, b[1] * 0.5);
    // the nose faces +z, the tail faces -z
    if (nose) k.idx.push(base, base + 1, base + 2); else k.idx.push(base, base + 2, base + 1);
  }
  const geos = {};
  for (const k of ['paint', 'glass']) {
    if (!B[k].idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B[k].pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B[k].uv, 2));
    g.setIndex(B[k].idx);
    g.computeVertexNormals();
    geos[k] = g;
  }
  return geos;
}

/** A box laid along the line p1 -> p2, w across and d through. */
function bar(parent, p1, p2, w, d, material) {
  const len = p1.distanceTo(p2);
  const m = new THREE.Mesh(BOX(w, len, d), material);
  m.position.copy(p1).add(p2).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V3(0, 1, 0), p2.clone().sub(p1).normalize());
  parent.add(m);
  return m;
}
/** A rounded rectangle, as a Shape centred on the origin. */
function roundedRect(w, h, r) {
  const sh = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  sh.moveTo(x0 + r, y0);
  sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  sh.lineTo(x0 + w, y0 + h - r); sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  sh.lineTo(x0 + r, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  return sh;
}
/** A rounded slab, `d` deep along its local +z, face at local z = d. */
function roundedBox(w, h, d, r = 0.02) {
  return new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 4 });
}
/** A rounded bezel: a rounded rect with a rounded hole, `t` wide, `d` deep. */
function roundedFrame(w, h, d, r, t) {
  const sh = roundedRect(w, h, r);
  const hole = roundedRect(w - 2 * t, h - 2 * t, Math.max(0.004, r - t));
  sh.holes.push(hole);
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 5 });
}
function put(parent, geom, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geom, material);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/* ---------------------------------------------------------------- canvases */
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { c, g, tex };
}

/**
 * The gauge cluster: a 120 mph speedometer, fuel and temperature, the
 * PRNDL, the warning lamps and the two green arrows. White-on-black with
 * orange needles, lit the way a 1993 Ford cluster is lit, which is not
 * very. `draw(state)` repaints; the mesh is MeshBasic so it glows a
 * little in the dark and the bloom finds it.
 */
export function gaugeCluster() {
  const { g, tex } = canvasTex(384, 144);
  const ink = 'rgba(226,222,206,', needle = '#e0602a';
  const draw = ({ mph = 0, fuel = 0.2, temp = 0.45, tank = false, signal = 0, blink = false, gear = 'D', lights = false, brake = false } = {}) => {
    // the face: near-black with a blue-grey cast, darker at the edges
    g.fillStyle = '#0c0e11'; g.fillRect(0, 0, 384, 144);
    const vg = g.createRadialGradient(192, 72, 40, 192, 72, 230);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, 384, 144);
    const dial = (cx, cy, r, from, to, ticks, val, labels, { big = false } = {}) => {
      // the recessed disc and its thin chrome ring
      g.fillStyle = '#0a0c0f'; g.beginPath(); g.arc(cx, cy, r + 9, 0, 7); g.fill();
      g.strokeStyle = 'rgba(160,156,146,.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, r + 9, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r + 7, 0, 7); g.stroke();
      for (let i = 0; i <= ticks; i++) {
        const a = from + (to - from) * i / ticks, major = i % 2 === 0;
        g.lineWidth = major ? 2 : 1;
        g.strokeStyle = ink + (major ? '.88)' : '.5)');
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a) * (r - (major ? 8 : 4)), cy + Math.sin(a) * (r - (major ? 8 : 4)));
        g.stroke();
        if (labels && major) {
          g.fillStyle = ink + '.9)'; g.font = `${big ? 10 : 7}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(labels[i / 2] ?? '', cx + Math.cos(a) * (r - 19), cy + Math.sin(a) * (r - 19));
        }
      }
      const a = from + (to - from) * Math.max(0, Math.min(1, val));
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = big ? 4 : 3;
      g.beginPath(); g.moveTo(cx + 1, cy + 2); g.lineTo(cx + Math.cos(a) * (r - 6) + 1, cy + Math.sin(a) * (r - 6) + 2); g.stroke();
      g.strokeStyle = needle; g.lineWidth = big ? 2.5 : 2;
      g.beginPath(); g.moveTo(cx - Math.cos(a) * 7, cy - Math.sin(a) * 7); g.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); g.stroke();
      g.fillStyle = '#232529'; g.beginPath(); g.arc(cx, cy, big ? 7 : 4.5, 0, 7); g.fill();
      g.fillStyle = '#46484d'; g.beginPath(); g.arc(cx, cy, big ? 3.5 : 2, 0, 7); g.fill();
    };
    dial(112, 78, 54, Math.PI * 0.78, Math.PI * 2.22, 12, mph / 120,
      ['0', '20', '40', '60', '80', '100', '120'], { big: true });
    g.fillStyle = ink + '.55)'; g.font = '7px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MPH', 112, 104);
    // the odometer window under the speedo
    g.fillStyle = '#050506'; g.fillRect(86, 116, 52, 12);
    g.fillStyle = ink + '.85)'; g.font = '9px "JetBrains Mono", monospace'; g.textAlign = 'left';
    g.fillText('14021', 89, 122); g.fillStyle = needle; g.fillText('2', 126, 122);
    // fuel and temp
    dial(262, 84, 24, Math.PI * 1.15, Math.PI * 1.85, 4, fuel, null);
    dial(336, 84, 24, Math.PI * 1.15, Math.PI * 1.85, 4, temp, null);
    g.fillStyle = ink + '.6)'; g.font = '7px "JetBrains Mono", monospace'; g.textAlign = 'center';
    g.fillText('E', 242, 101); g.fillText('F', 282, 101); g.fillText('C', 316, 101); g.fillText('H', 356, 101);
    // the PRNDL, the gear lit
    'P R N D 2 1'.split(' ').forEach((gg, i) => {
      g.fillStyle = gg === gear ? '#e8a850' : ink + '.3)'; g.font = '8px "JetBrains Mono", monospace';
      g.fillText(gg, 244 + i * 20, 124);
    });
    // warning lamps: dark until they are not
    const lamp = (x, y, on, col, txt) => {
      g.fillStyle = on ? col : '#15161a'; g.fillRect(x, y, 22, 9);
      g.fillStyle = on ? '#111' : 'rgba(120,120,124,.35)'; g.font = '6px "JetBrains Mono", monospace'; g.textAlign = 'center';
      g.fillText(txt, x + 11, y + 5);
    };
    lamp(232, 22, tank, '#f0a040', 'FUEL');
    lamp(258, 22, brake, '#d84030', 'BRAKE');
    lamp(284, 22, lights, '#3a8a4a', 'LAMP');
    const arrow = (x, dir, on) => {
      g.fillStyle = on ? '#46d860' : 'rgba(20,30,22,1)';
      g.beginPath();
      g.moveTo(x + dir * 10, 30); g.lineTo(x, 22); g.lineTo(x, 27); g.lineTo(x - dir * 8, 27);
      g.lineTo(x - dir * 8, 33); g.lineTo(x, 33); g.lineTo(x, 38); g.closePath(); g.fill();
    };
    arrow(38, -1, signal < 0 && blink);
    arrow(186, 1, signal > 0 && blink);
    // the glass: a soft diagonal sheen, and dust in the corners
    g.fillStyle = 'rgba(255,255,255,.03)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(384, 0); g.lineTo(384, 14); g.lineTo(0, 40); g.closePath(); g.fill();
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}

/** The radio face: a green vacuum-fluorescent display with the station on it. */
export function radioDisplay() {
  const { g, tex } = canvasTex(192, 48);
  const draw = (text = '') => {
    g.fillStyle = '#071009'; g.fillRect(0, 0, 192, 48);
    g.fillStyle = '#7fe0a0'; g.font = 'bold 20px "VCR OSD Mono", "JetBrains Mono", monospace';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText((text || '- - - -').toUpperCase().slice(0, 12), 10, 24);
    g.fillStyle = 'rgba(127,224,160,.5)'; g.font = '8px "JetBrains Mono", monospace';
    g.fillText('FM  ST', 140, 12);
    tex.needsUpdate = true;
  };
  draw();
  return { tex, draw };
}

/** A panel drawn on a canvas and hung as a plane: the way a radio head,
    a heater panel or a vent is done at this fidelity. `draw(g, W, H)`. */
function panelMat(w, h, draw, { emissive = 0.06 } = {}) {
  const W = Math.round(w * 900), H = Math.round(h * 900);
  const { g, tex } = canvasTex(W, H);
  draw(g, W, H);
  tex.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: .75, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: emissive });
}
const PANEL = {
  /** The head unit: display window, two knobs, six presets, a tape slot. */
  radio: (g, W, H) => {
    g.fillStyle = '#1a1a1c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0a0c0b'; g.fillRect(W * 0.20, H * 0.10, W * 0.60, H * 0.38);          // display window
    g.fillStyle = '#111214'; g.fillRect(W * 0.22, H * 0.56, W * 0.56, H * 0.12);          // the tape slot
    g.fillStyle = '#2a2b2e'; g.fillRect(W * 0.24, H * 0.58, W * 0.52, H * 0.04);
    const knob = (cx, cy, r) => {
      g.fillStyle = '#0c0c0d'; g.beginPath(); g.arc(cx, cy, r + 2, 0, 7); g.fill();
      g.fillStyle = '#3a3b3e'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.fillStyle = '#6a6b6e'; g.beginPath(); g.arc(cx, cy, r * 0.55, 0, 7); g.fill();
      g.strokeStyle = '#d8d2c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - r * 0.3); g.lineTo(cx, cy - r * 0.95); g.stroke();
    };
    knob(W * 0.10, H * 0.34, H * 0.22); knob(W * 0.90, H * 0.34, H * 0.22);
    g.fillStyle = '#c8c2b0'; g.font = `${Math.round(H * 0.09)}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VOL', W * 0.10, H * 0.66); g.fillText('TUNE', W * 0.90, H * 0.66);
    for (let k = 0; k < 6; k++) {
      const bx = W * (0.22 + k * 0.095), by = H * 0.76;
      g.fillStyle = '#2c2d30'; g.fillRect(bx, by, W * 0.075, H * 0.16);
      g.fillStyle = '#0d0d0e'; g.fillRect(bx, by + H * 0.13, W * 0.075, H * 0.03);
      g.fillStyle = '#d8d2c0'; g.fillText(String(k + 1), bx + W * 0.037, by + H * 0.07);
    }
    g.fillStyle = '#2c2d30'; g.fillRect(W * 0.80, H * 0.76, W * 0.08, H * 0.16); g.fillRect(W * 0.12, H * 0.76, W * 0.08, H * 0.16);
    g.fillStyle = '#d8d2c0'; g.fillText('AM', W * 0.16, H * 0.80); g.fillText('FM', W * 0.16, H * 0.88); g.fillText('SEEK', W * 0.84, H * 0.84);
    g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, W, H * 0.08);
  },
  /** Three slider tracks and a fan knob, with the words a 1993 Ford put there. */
  heater: (g, W, H) => {
    g.fillStyle = '#1c1c1e'; g.fillRect(0, 0, W, H);
    const labels = [['OFF', 'MAX A/C', 'VENT', 'FLOOR', 'DEF'], ['COOL', '', '', '', 'WARM'], ['LO', '', '', '', 'HI']];
    for (let r = 0; r < 3; r++) {
      const y = H * (0.22 + r * 0.28);
      g.fillStyle = '#0b0b0c'; g.fillRect(W * 0.08, y - H * 0.035, W * 0.62, H * 0.07);
      g.fillStyle = '#3a3b3e'; g.fillRect(W * (0.08 + [0.18, 0.36, 0.30][r] * 0.62) - W * 0.02, y - H * 0.07, W * 0.04, H * 0.14);
      g.fillStyle = '#d8d2c0'; g.fillRect(W * (0.08 + [0.18, 0.36, 0.30][r] * 0.62) - 1, y - H * 0.05, 2, H * 0.10);
      g.fillStyle = '#a8a294'; g.font = `${Math.round(H * 0.08)}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      labels[r].forEach((t, i) => g.fillText(t, W * (0.08 + i * 0.155), y - H * 0.10));
    }
    g.fillStyle = '#3a3b3e'; g.beginPath(); g.arc(W * 0.86, H * 0.5, H * 0.30, 0, 7); g.fill();
    g.fillStyle = '#0c0c0d'; g.beginPath(); g.arc(W * 0.86, H * 0.5, H * 0.12, 0, 7); g.fill();
    g.fillStyle = '#d8d2c0'; g.fillRect(W * 0.86 - 1, H * 0.5 - H * 0.30, 2, H * 0.14);
    g.font = `${Math.round(H * 0.08)}px "JetBrains Mono", monospace`; g.fillText('FAN', W * 0.86, H * 0.92);
  },
  /** A vent: a bezel and five louvres, the middle one pointed at him. */
  vent: (g, W, H) => {
    g.fillStyle = '#1a1a1c'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#060607'; g.fillRect(W * 0.06, H * 0.10, W * 0.88, H * 0.80);
    for (let k = 0; k < 5; k++) {
      const y = H * (0.18 + k * 0.16);
      g.fillStyle = k === 2 ? '#3e3f42' : '#2a2b2e'; g.fillRect(W * 0.08, y, W * 0.84, H * 0.07);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(W * 0.08, y, W * 0.84, 1);
    }
    g.fillStyle = '#3a3b3e'; g.fillRect(W * 0.46, H * 0.40, W * 0.08, H * 0.22);   // the thumbwheel
  }
};

/** The rear-view mirror: not a mirror. A dark plate with the rear
    window's light in it, which is what it is at a glance. */
function mirrorTex(sky = '#6a7078') {
  const { g, tex } = canvasTex(128, 40);
  g.fillStyle = '#0c0d10'; g.fillRect(0, 0, 128, 40);
  g.fillStyle = sky; g.fillRect(10, 6, 108, 14);
  g.fillStyle = '#1a1c1f'; g.fillRect(10, 20, 108, 14);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 128, 3);
  return tex;
}

/** A Pennsylvania plate. */
function plateTex(text = 'GJR 4411') {
  const { g, tex } = canvasTex(128, 64);
  g.fillStyle = '#e8e2cf'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#1c3a6a'; g.fillRect(0, 0, 128, 12); g.fillRect(0, 52, 128, 12);
  g.fillStyle = '#e8e2cf'; g.font = 'bold 8px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('PENNSYLVANIA', 64, 6);
  g.fillText('KEYSTONE STATE', 64, 58);
  g.fillStyle = '#1c3a6a'; g.font = 'bold 22px "JetBrains Mono", monospace';
  g.fillText(text, 64, 32);
  return tex;
}

/* ---------------------------------------------------------------- the car */
/**
 * ford(world, x, y, z, rot, opts) -> Group, with userData.refs for the
 * movable parts when `interior` is on.
 *
 *   color     the paint.             interior   the car is to be sat in: the
 *   lights    lamps lit.                        glass is see-through alpha and
 *   boxes     the move-in boxes                 refs (wheel, stalks, dials) are
 *             in the back.                      returned in userData.refs
 *   cabin     build the seats and dash at all (default true: a parked car
 *             seen through its windows is not an empty shell)
 *   collide   register the collider (default true)
 */
export function ford(world, x, y, z, rot = 0, {
  color = 0x45564f, interior = false, lights = false, boxes = true, cabin = true, collide = true, plate = 'GJR 4411'
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = rot;
  g.userData.isCar = true;

  // ---- materials. metalness with no envmap renders black; keep it low.
  const paint = mat('carside', T.carside, { color, roughness: .40, metalness: .08, normal: false });
  const paintClean = flat(color, { rough: .38, metal: .08 });
  const trim = flat(0x1e2022, { rough: .88 });
  const rubber = flat(0x141416, { rough: .96 });
  const chrome = flat(0xb0b5b8, { rough: .35, metal: .12 });
  const lampOn = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
  const lampOff = flat(0xd8d8d0, { rough: .15 });
  const tailOn = new THREE.MeshBasicMaterial({ color: 0xe03a2a });
  const tailOff = flat(0x8c2f26, { rough: .3 });
  const amber = flat(0xd8883a, { rough: .3 });
  const glassM = interior
    ? new THREE.MeshStandardMaterial({ color: 0x9fb4c2, roughness: .05, metalness: 0, transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide })
    : new THREE.MeshPhysicalMaterial({ color: 0x2b3540, roughness: .1, transmission: .3, transparent: true, opacity: .74 });

  const stations = allStations();
  const ext = new THREE.Group(); g.add(ext);      // merged at the end

  // ---- the hull
  const hull = loft(stations, { pick: (gl, hr) => rowKind(gl, hr), sideV: true });
  const hullPaint = new THREE.Mesh(hull.get('paint'), paint); ext.add(hullPaint);
  if (hull.get('glass')) { const gm = new THREE.Mesh(hull.get('glass'), glassM); gm.userData.noMerge = true; g.add(gm); }

  // ---- the caps: the face and the tailgate
  const noseRing = fullRing(stations[0]), tailRing = fullRing(stations[stations.length - 1]);
  const nose = cap(noseRing, stations[0].z, { nose: true });
  ext.add(new THREE.Mesh(nose.paint, paintClean));
  const tail = cap(tailRing, stations[stations.length - 1].z, { split: stations[stations.length - 1].by + 0.02, nose: false });
  ext.add(new THREE.Mesh(tail.paint, paintClean));
  if (tail.glass) { const tg = new THREE.Mesh(tail.glass, glassM); tg.userData.noMerge = true; g.add(tg); }

  // ---- pillars, rails, the window surround
  const cowl = stationAt(1.05), roofF = stationAt(0.40), bS = stationAt(-0.30), cS = stationAt(-1.10), dS = stationAt(-2.10);
  [1, -1].forEach(s => {
    bar(ext, V3(s * cowl.bx, cowl.by, 1.05), V3(s * roofF.tx, roofF.ty, 0.40), 0.09, 0.07, paintClean);   // A
    bar(ext, V3(s * bS.bx, bS.by, -0.30), V3(s * bS.tx, bS.ty, -0.30), 0.08, 0.10, trim);                  // B
    bar(ext, V3(s * cS.bx, cS.by, -1.10), V3(s * cS.tx, cS.ty, -1.10), 0.07, 0.08, trim);                  // C
    bar(ext, V3(s * dS.bx, dS.by, -2.10), V3(s * dS.tx, dS.ty, -2.10), 0.10, 0.12, paintClean);            // D
    bar(ext, V3(s * (roofF.tx + 0.01), roofF.ty - 0.01, 0.42), V3(s * (dS.tx + 0.01), dS.ty - 0.01, -2.12), 0.05, 0.05, trim); // cant rail
    bar(ext, V3(s * (cowl.bx + 0.004), cowl.by + 0.01, 1.04), V3(s * (dS.bx + 0.004), dS.by + 0.01, -2.14), 0.02, 0.04, trim); // belt rubber
    // roof rails, because it is a wagon
    bar(ext, V3(s * 0.46, roofF.ry + 0.045, 0.10), V3(s * 0.46, dS.ry + 0.045, -1.95), 0.05, 0.05, trim);
    put(ext, BOX(0.05, 0.06, 0.05), trim, s * 0.46, roofF.ry + 0.02, 0.10);
    put(ext, BOX(0.05, 0.06, 0.05), trim, s * 0.46, dS.ry + 0.02, -1.95);
    // mirrors, on the door at the A pillar base
    put(ext, BOX(0.06, 0.03, 0.05), trim, s * (cowl.bx + 0.03), cowl.by + 0.06, 0.78);
    put(ext, BOX(0.19, 0.11, 0.09), paintClean, s * (cowl.bx + 0.14), cowl.by + 0.10, 0.76);
    put(ext, PLN(0.16, 0.09), flat(0x1a1f24, { rough: .1, metal: .4 }), s * (cowl.bx + 0.14), cowl.by + 0.10, 0.71, 0, Math.PI, 0);
    // door handles
    put(ext, BOX(0.02, 0.03, 0.15), trim, s * (cowl.bx + 0.006), cowl.by - 0.12, 0.34);
    put(ext, BOX(0.02, 0.03, 0.15), trim, s * (bS.bx + 0.006), bS.by - 0.12, -0.46);
    // the arch lips and the dark wheel wells behind the tyres
    [AXLE_F, AXLE_R].forEach(az => {
      put(ext, BOX(0.30, 0.26, 0.86), rubber, s * 0.58, 0.43, az);
    });
  });

  // ---- the face: lamps, grille, bumper, plate
  const nz = stations[0].z;
  [1, -1].forEach(s => {
    put(ext, BOX(0.60, 0.13, 0.04), lights ? lampOn : lampOff, s * 0.42, 0.62, nz + 0.005);
    put(ext, BOX(0.12, 0.13, 0.04), amber, s * 0.78, 0.62, nz - 0.02, 0, s * 0.5, 0);        // the corner lamp
    put(ext, BOX(0.34, 0.22, 0.04), lights ? tailOn : tailOff, s * 0.66, 0.86, -2.47);         // tail lamp
    put(ext, BOX(0.04, 0.22, 0.14), lights ? tailOn : tailOff, s * 0.82, 0.88, -2.40);         // and round the corner
  });
  put(ext, BOX(0.46, 0.07, 0.03), trim, 0, 0.62, nz + 0.01);                                  // the grille slot
  put(ext, BOX(0.08, 0.04, 0.02), flat(0x2b4e8a, { rough: .4 }), 0, 0.62, nz + 0.03);          // the oval
  const bumperM = flat(color, { rough: .5 });
  put(ext, BOX(1.76, 0.24, 0.22), bumperM, 0, 0.46, nz - 0.10);
  put(ext, BOX(1.78, 0.05, 0.02), trim, 0, 0.46, nz + 0.015);                                  // rub strip
  put(ext, BOX(1.76, 0.24, 0.22), bumperM, 0, 0.48, -2.40);
  put(ext, BOX(1.78, 0.05, 0.02), trim, 0, 0.48, -2.52);
  const plateM = new THREE.MeshStandardMaterial({ map: plateTex(plate), roughness: .6 });
  put(ext, PLN(0.30, 0.15), plateM, 0, 0.58, -2.525, 0, Math.PI, 0);
  put(ext, PLN(0.30, 0.15), plateM, 0, 0.40, nz + 0.005);
  // wipers at rest, and the aerial on the passenger wing
  [0.52, -0.16].forEach(wx => {
    const w = put(ext, BOX(0.56, 0.015, 0.03), trim, wx, cowl.by + 0.03, 1.00);
    w.rotation.y = 0.28;
  });
  put(ext, CYL(0.006, 0.006, 0.84, 5), chrome, -0.74, 1.22, 1.62, 0.12, 0, 0);

  // ---- wheels
  const hub = new THREE.MeshStandardMaterial({ map: T.hubcap(), roughness: .5, metalness: .15 });
  [[1, AXLE_F], [-1, AXLE_F], [1, AXLE_R], [-1, AXLE_R]].forEach(([s, az]) => {
    const wx = s * 0.70;
    put(ext, CYL(WHEEL_R, WHEEL_R, 0.21, 16), rubber, wx, WHEEL_R, az, 0, 0, Math.PI / 2);
    const face = put(ext, SHAPE.Circle(0.24, 16), hub, wx + s * 0.106, WHEEL_R, az, 0, s * Math.PI / 2, 0);
    face.userData.noMerge = true;
  });

  // ---- merge the exterior down to a handful of draw calls
  mergeByMaterial(ext);

  const refs = {};
  if (cabin || interior) buildInterior(g, stations, refs, { boxes, paintColor: color });
  g.userData.refs = refs;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  world.add(g);
  if (collide) {
    const c = Math.abs(Math.cos(rot)), s2 = Math.abs(Math.sin(rot));
    world.collide(x, y, z, (CAR_W + 0.1) * c + (CAR_L + 0.1) * s2, CAR_H, (CAR_L + 0.1) * c + (CAR_W + 0.1) * s2, 'car');
  }
  return g;
}

/* ---------------------------------------------------------------- inside */
function buildInterior(g, stations, refs, { boxes, paintColor }) {
  const cab = new THREE.Group(); g.add(cab);
  const fixed = new THREE.Group(); cab.add(fixed);      // merged
  const dashM = mat('dashgrain', T.dashgrain, { roughness: .9, normalStrength: 0.6, emissive: 0x2a2826, emissiveIntensity: 0.10 });
  const vinylM = mat('vinyl', T.vinyl, { color: 0x5a5650, roughness: .86, normalStrength: 0.8 });
  const cardM = mat('vinyl', T.vinyl, { color: 0x4a4742, roughness: .9, normalStrength: 0.8, emissive: 0x2a2826, emissiveIntensity: 0.18 });
  const carpetM = mat('carpet', T.carpet, { color: 0x3a3835, roughness: 1, normalStrength: 2 });
  const linerM = flat(0x8a8884, { rough: 1, emissive: 0x8a8884, ei: 0.09 });
  const velourM = mat('velour', T.velour, { roughness: .98, normalStrength: 0.8 });
  const dark = flat(0x1a1a1c, { rough: .85 });
  const plastic = flat(0x2a2a2c, { rough: .7 });
  const sat = flat(0x35363a, { rough: .55 });
  const rubber = flat(0x141416, { rough: .96 });

  // ---- the lining: the hull again, inside out, a few centimetres in
  const inner = loft(stations, {
    inset: 0.045, floorUp: 0.11, zMin: -2.40, zMax: 1.05,
    pick: (gl, hr) => {
      if (hr <= 1) return 'carpet';
      if (hr <= 3) return 'card';
      if (hr === 4) return (gl === 'side' || gl === 'screen') ? null : 'card';
      return gl === 'screen' ? null : 'liner';
    }
  });
  const inside = (k, m) => { if (!inner.get(k)) return; const mm = new THREE.Mesh(inner.get(k), m.clone()); mm.material.side = THREE.BackSide; fixed.add(mm); };
  inside('carpet', carpetM); inside('card', cardM); inside('liner', linerM);
  // the firewall and the parcel end, so the footwell and the tailgate are closed
  put(fixed, BOX(1.70, 0.66, 0.04), carpetM, 0, 0.74, 1.02);
  put(fixed, BOX(1.60, 0.40, 0.04), cardM, 0, 0.62, -2.38);
  put(fixed, BOX(1.60, 0.04, 0.90), carpetM, 0, 0.46, -1.93);          // cargo floor

  // ---- the dash. Deep soft top to the glass, a face that drops to the knees.
  const D = { top: 0.94, face: 0.60 };
  // The dash is one profile, swept across the car: a thick soft top that
  // runs back under the glass, a rounded front lip, a face, a knee roll
  // and the panel under it. Drawn in (z, y) and extruded along x.
  {
    const pr = new THREE.Shape();
    pr.moveTo(1.06, 0.84);
    pr.lineTo(1.06, 0.93); pr.lineTo(0.70, D.top);
    pr.quadraticCurveTo(D.face, D.top, D.face, 0.88);          // the lip
    pr.lineTo(D.face, 0.70);
    pr.quadraticCurveTo(D.face + 0.01, 0.59, D.face + 0.12, 0.57); // the knee roll
    pr.lineTo(0.84, 0.57); pr.lineTo(0.84, 0.46); pr.lineTo(1.06, 0.46);
    pr.closePath();
    const dg = new THREE.ExtrudeGeometry(pr, { depth: 1.72, bevelEnabled: false, curveSegments: 5 });
    const dm = new THREE.Mesh(dg, dashM); dm.rotation.y = -Math.PI / 2; dm.position.x = 0.86; fixed.add(dm);
  }
  // the binnacle: a curved hood over the cluster, cheeks at its ends, and
  // the cluster under it, high enough to be read OVER the rim of the wheel
  // The binnacle is a soft pod that rises out of the dash top, with a
  // bezel round its face and the dials set back inside it, under a lip:
  // the way a 1993 cluster sits, recessed, not a plate stuck on a box.
  // (the extrusion runs toward the driver after the half turn: the pod's
  // origin is its back face, its front face lands 0.16 nearer the seat)
  const pod = put(fixed, roundedBox(0.48, 0.20, 0.16, 0.07), dashM, 0.38, 1.00, 0.80, 0.16, Math.PI, 0);
  put(fixed, roundedFrame(0.44, 0.17, 0.02, 0.045, 0.014), dark, 0.38, 1.026, 0.634, 0.16, Math.PI, 0);
  const gauges = gaugeCluster();
  const cluster = new THREE.Mesh(PLN(0.415, 0.145), new THREE.MeshStandardMaterial({
    map: gauges.tex, roughness: .35, metalness: 0, emissive: 0xffffff, emissiveMap: gauges.tex, emissiveIntensity: 0.42
  }));
  cluster.position.set(0.38, 1.026, 0.637); cluster.rotation.set(0.16, Math.PI, 0);
  cluster.userData.noMerge = true; cab.add(cluster);
  // the centre stack, turned a little toward the driver
  const stack = new THREE.Group(); stack.position.set(-0.05, 0.74, D.face - 0.04); stack.rotation.y = -0.16; cab.add(stack);
  const sfix = new THREE.Group(); stack.add(sfix);
  put(sfix, roundedBox(0.36, 0.40, 0.04, 0.03), dashM, 0, 0, 0.02, 0, Math.PI, 0);
  // the head unit, the heater panel and the vents are drawn, not built:
  // a stack of boxes reads as a stack of boxes, a printed face reads as
  // the thing. The display is its own little plane over the head's window.
  const radioHead = panelMat(0.30, 0.10, PANEL.radio);
  put(sfix, PLN(0.30, 0.10), radioHead, 0, 0.075, -0.022, 0, Math.PI, 0);
  const radio = radioDisplay();
  const radioFace = new THREE.Mesh(PLN(0.18, 0.036), new THREE.MeshBasicMaterial({ map: radio.tex }));
  radioFace.position.set(0, 0.096, -0.026); radioFace.rotation.y = Math.PI; radioFace.userData.noMerge = true; stack.add(radioFace);
  const heater = panelMat(0.30, 0.09, PANEL.heater);
  put(sfix, PLN(0.30, 0.09), heater, 0, -0.06, -0.022, 0, Math.PI, 0);
  const ventM = panelMat(0.12, 0.07, PANEL.vent);
  put(sfix, PLN(0.12, 0.07), ventM, -0.085, 0.165, -0.022, 0, Math.PI, 0);
  put(sfix, PLN(0.12, 0.07), ventM, 0.085, 0.165, -0.022, 0, Math.PI, 0);
  put(fixed, PLN(0.12, 0.07), ventM, 0.76, 0.86, D.face - 0.062, 0, Math.PI, 0);
  put(fixed, PLN(0.12, 0.07), ventM, -0.76, 0.86, D.face - 0.062, 0, Math.PI, 0);
  // glovebox, a line round it and a latch
  put(fixed, roundedBox(0.48, 0.20, 0.015, 0.025), dashM, -0.50, 0.72, D.face - 0.05, 0, Math.PI, 0);
  put(fixed, roundedBox(0.50, 0.22, 0.004, 0.03), dark, -0.50, 0.72, D.face - 0.058, 0, Math.PI, 0);
  put(fixed, BOX(0.05, 0.02, 0.01), sat, -0.50, 0.80, D.face - 0.075);
  // the hazard switch and the headlamp knob, where Ford put them
  put(fixed, BOX(0.03, 0.02, 0.015), flat(0x8a2a20, { rough: .5 }), 0.16, 0.90, D.face - 0.07);
  put(fixed, CYL(0.014, 0.014, 0.025, 8), sat, 0.66, 0.88, D.face - 0.07, Math.PI / 2, 0, 0);
  // under the cluster: the coin tray and the parking-brake release, so the
  // driver's side of the face is not a blank slab
  put(fixed, roundedBox(0.20, 0.05, 0.01, 0.012), dark, 0.38, 0.80, D.face - 0.045, 0, Math.PI, 0);
  put(fixed, BOX(0.06, 0.025, 0.02), sat, 0.62, 0.72, D.face - 0.07);

  // ---- the column, the stalks, the shifter, the wheel
  const hubP = V3(0.38, 0.80, 0.46);
  const tilt = -0.40;                                   // the wheel leans back at the driver
  const colDir = V3(0, -Math.sin(0.40), Math.cos(0.40));
  bar(fixed, hubP.clone().addScaledVector(colDir, 0.04), hubP.clone().addScaledVector(colDir, 0.34), 0.07, 0.07, dashM);
  bar(fixed, hubP.clone().addScaledVector(colDir, 0.06), hubP.clone().addScaledVector(colDir, 0.24), 0.13, 0.13, dashM).geometry = CYL(0.065, 0.06, 0.18, 12);   // the shroud, round
  // indicator stalk, left of the column; wiper stalk and the shifter on the right
  const stalkL = new THREE.Group(); stalkL.position.set(0.45, 0.76, 0.55); cab.add(stalkL);
  bar(stalkL, V3(0, 0, 0), V3(0.13, -0.01, -0.03), 0.018, 0.018, plastic);
  put(stalkL, BOX(0.03, 0.024, 0.024), plastic, 0.135, -0.01, -0.03);
  refs.stalkL = stalkL;
  const stalkR = new THREE.Group(); stalkR.position.set(0.31, 0.76, 0.55); cab.add(stalkR);
  bar(stalkR, V3(0, 0, 0), V3(-0.12, -0.01, -0.03), 0.016, 0.016, plastic);
  refs.stalkR = stalkR;
  const shifter = new THREE.Group(); shifter.position.set(0.31, 0.81, 0.57); cab.add(shifter);
  bar(shifter, V3(0, 0, 0), V3(-0.16, -0.06, -0.10), 0.018, 0.018, sat);
  put(shifter, SHAPE.Sphere(0.018, 8, 6), plastic, -0.165, -0.062, -0.104);
  refs.shifter = shifter;
  // the wheel: rim, four spokes, the airbag pad
  // the wheel's local +x is the driver's left and its local +z points at the
  // dash; the driver, and the hands, are on the -z side of its plane
  const wheelG = new THREE.Group(); wheelG.position.copy(hubP); wheelG.rotation.x = tilt; cab.add(wheelG);
  const wheel = new THREE.Group(); wheelG.add(wheel);
  const rimM = flat(0x26272b, { rough: .62 });
  wheel.add(new THREE.Mesh(SHAPE.Torus(0.17, 0.019, 10, 30), rimM));
  [[0, 0.17], [Math.PI, 0.17], [-Math.PI * 0.72, 0.17], [-Math.PI * 0.28, 0.17]].forEach(([a, r]) => {
    const sp = new THREE.Mesh(BOX(0.032, r - 0.05, 0.016), rimM);
    sp.position.set(Math.cos(a) * (r * 0.5 + 0.02), Math.sin(a) * (r * 0.5 + 0.02), 0);
    sp.rotation.z = a - Math.PI / 2;
    wheel.add(sp);
  });
  const hubM = new THREE.Mesh(CYL(0.065, 0.068, 0.04, 14), rimM); hubM.rotation.x = Math.PI / 2; wheel.add(hubM);
  const pad = new THREE.Mesh(roundedBox(0.115, 0.08, 0.03, 0.022), flat(0x2d2e32, { rough: .7 })); pad.position.z = -0.015; pad.rotation.y = Math.PI; wheel.add(pad);
  const oval = new THREE.Mesh(PLN(0.034, 0.018), flat(0x2b4e8a, { rough: .4 })); oval.position.z = -0.046; oval.rotation.y = Math.PI; wheel.add(oval);
  refs.wheelG = wheelG; refs.wheel = wheel; refs.wheelR = 0.17; refs.hub = hubP.clone();
  // pedals in the footwell
  put(fixed, BOX(0.06, 0.10, 0.01), rubber, 0.30, 0.50, 0.82, -0.5, 0, 0);
  put(fixed, BOX(0.09, 0.06, 0.01), rubber, 0.45, 0.50, 0.82, -0.5, 0, 0);
  bar(fixed, V3(0.30, 0.54, 0.82), V3(0.30, 0.66, 0.90), 0.012, 0.012, sat);

  // ---- seats: two up front, a bench behind
  const seat = (sx, sz, w, { head = true } = {}) => {
    put(fixed, BOX(w, 0.14, 0.50), velourM, sx, 0.50, sz);
    put(fixed, CYL(0.075, 0.075, w, 10), velourM, sx, 0.52, sz + 0.24, 0, 0, Math.PI / 2);      // the front roll
    put(fixed, BOX(w, 0.62, 0.12), velourM, sx, 0.86, sz - 0.27, -0.18, 0, 0);
    [-1, 1].forEach(b => put(fixed, CYL(0.06, 0.06, 0.58, 8), velourM, sx + b * (w / 2 - 0.04), 0.86, sz - 0.22, -0.18, 0, 0)); // bolsters
    put(fixed, BOX(w + 0.02, 0.06, 0.50), dark, sx, 0.42, sz);             // the base
    if (head) put(fixed, BOX(0.26, 0.16, 0.10), velourM, sx, 1.22, sz - 0.36);
  };
  seat(0.38, -0.10, 0.52); seat(-0.40, -0.10, 0.52);
  seat(0, -1.05, 1.52, { head: false });
  put(fixed, BOX(0.26, 0.22, 0.80), vinylM, 0, 0.44, -0.05);            // the console between the seats
  put(fixed, BOX(0.10, 0.03, 0.14), dark, 0, 0.56, 0.05);                 // the parking brake's slot
  // door cards: armrests, pulls, the window cranks, a speaker grille
  [1, -1].forEach(s => {
    put(fixed, BOX(0.07, 0.06, 0.44), vinylM, s * 0.80, 0.74, 0.30);
    put(fixed, CYL(0.035, 0.035, 0.44, 8), vinylM, s * 0.80, 0.775, 0.30, Math.PI / 2, 0, 0);
    put(fixed, BOX(0.03, 0.03, 0.12), sat, s * 0.83, 0.84, 0.52);
    put(fixed, CYL(0.015, 0.015, 0.05, 8), plastic, s * 0.80, 0.80, 0.08, 0, 0, Math.PI / 2);
    put(fixed, SHAPE.Circle(0.07, 12), dark, s * 0.835, 0.58, 0.72, 0, -s * Math.PI / 2, 0);
    put(fixed, BOX(0.07, 0.06, 0.34), vinylM, s * 0.80, 0.74, -0.75);
  });
  // visors, the mirror, the dome light
  [0.40, -0.40].forEach(vx => put(fixed, BOX(0.38, 0.015, 0.16), flat(0x5e5c58, { rough: .95 }), vx, 1.345, 0.52));
  const mirror = new THREE.Mesh(roundedBox(0.22, 0.065, 0.018, 0.02), new THREE.MeshStandardMaterial({ map: mirrorTex(), roughness: .2, metalness: .3 }));
  mirror.position.set(0, 1.335, 0.44); mirror.rotation.x = 0.12; mirror.userData.noMerge = true; cab.add(mirror);
  put(fixed, CYL(0.008, 0.008, 0.07, 5), dark, 0, 1.36, 0.47, 0.8, 0, 0);
  put(fixed, BOX(0.12, 0.02, 0.08), flat(0xd8d2c0, { rough: .6 }), 0, 1.345, -0.30);
  refs.mirror = mirror;

  // ---- the boxes in the back. he is moving in.
  if (boxes) {
    const cardM2 = mat('cardboard', T.cardboard, { roughness: .95, normalStrength: 0.8 });
    const bx = (w, h, d, px, py, pz, ry) => put(fixed, BOX(w, h, d), cardM2, px, py + h / 2, pz, 0, ry, 0);
    bx(0.44, 0.36, 0.40, 0.30, 0.48, -1.80, 0.08);
    bx(0.40, 0.30, 0.36, -0.32, 0.48, -1.85, -0.12);
    bx(0.36, 0.28, 0.34, 0.28, 0.84, -1.82, -0.05);
    bx(0.50, 0.26, 0.36, -0.05, 0.48, -2.18, 0.02);
    // and one on the back seat, the one he carries up
    bx(0.40, 0.32, 0.36, -0.40, 0.57, -1.02, 0.3);
  }

  mergeByMaterial(fixed);
  refs.gauges = gauges; refs.cluster = cluster; refs.radio = radio; refs.radioFace = radioFace;
  refs.cab = cab;
}

export default ford;
