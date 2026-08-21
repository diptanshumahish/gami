/* ============================================================
   body.js: one body per person, as one skinned mesh.

   The old humanoid was a stack of primitives: a lathe for every bone
   segment, a ball in every joint, ellipsoids for shoes, and the eye
   reads every one of them. A person in a PS2-era game is a single
   continuous skin wrapped over a skeleton, and the clothes are painted
   on it. That is what this is.

     Loft       rings of vertices along a bone, stitched into tubes,
                every vertex carrying bone weights, so an elbow or a
                knee bends the skin instead of rotating a part
     buildBody  the whole body below the neck: trunk, neck, arms,
                hands, legs, feet, as ONE SkinnedMesh with ONE
                material, a painted atlas of whatever they have on
     atlasTex   that atlas: a top (hoodie, work jacket, flannel,
                sweater, barn coat, black shirt), sleeves, trousers,
                skin, shoes, each in its own band of one canvas

   props.js hangs the head, hair and glasses on the bones this returns
   and wraps it in the rig contract the chapters already pose (hips /
   torso / headG / arms[].sh .el .hand .fingers / legs[].hp .kn .ankle).
   life.js uses the same thing at lower detail for the people on the
   pavements, where it is one draw call instead of six boxes.

   Everything is authored with every bone unrotated, arms straight
   down, bound there, and only then posed: the rest pose (arms a little
   out, elbows never locked, old knees a little bent) is applied to the
   bones after the bind, which is what a rig is for.
   ============================================================ */
import * as THREE from 'three';
import { tex, normalOf, T } from './mat.js';

const TAU = Math.PI * 2;
const clamp01 = (t) => t < 0 ? 0 : t > 1 ? 1 : t;

/* superellipse: p = 2 is an ellipse, higher is squarer */
function sup(th, p) {
  const c = Math.cos(th), s = Math.sin(th), e = 2 / p;
  return [Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e];
}

/**
 * A loft: rings of vertices, strips between them, caps on the ends.
 * u runs round the ring with the seam at the back (u = 0.5 is the
 * front, or the top of a horizontal tube); v is whatever the caller
 * says, which is how a ring lands in the right band of the atlas.
 */
export class Loft {
  constructor() {
    this.pos = []; this.uv = []; this.si = []; this.sw = []; this.idx = [];
    this.seams = []; this.nv = 0;
  }
  /**
   * One ring. `c` centre, `a` the half-axis across (x for a vertical
   * tube), `b` the half-axis front/back (z for a vertical tube, up for
   * a foot). `bNeg`/`aNeg` scale the negative halves, so a seat can be
   * deeper than a belly and a sole flatter than an instep. `w` is the
   * bone weighting [[boneIndex, weight], ...].
   */
  ring({ c, a, b, bNeg = 1, aNeg = 1, p = 2, n = 16, v = 0, u0 = 0, u1 = 1, w, rot = 0 }) {
    const i0 = this.nv;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU - Math.PI / 2 + rot;
      let [X, Z] = sup(th, p);
      if (Z < 0) Z *= bNeg;
      if (X < 0) X *= aNeg;
      this.pos.push(c[0] + a[0] * X + b[0] * Z, c[1] + a[1] * X + b[1] * Z, c[2] + a[2] * X + b[2] * Z);
      this.uv.push(u0 + (u1 - u0) * i / n, v);
      this._w(w);
    }
    this.seams.push([i0, i0 + n]);
    this.nv += n + 1;
    return { i0, n, c, w, v, u: (u0 + u1) / 2 };
  }
  _w(w) {
    const idx = [0, 0, 0, 0], wt = [0, 0, 0, 0];
    let tot = 0;
    for (let j = 0; j < Math.min(4, w.length); j++) { idx[j] = w[j][0]; wt[j] = w[j][1]; tot += w[j][1]; }
    this.si.push(idx[0], idx[1], idx[2], idx[3]);
    this.sw.push(wt[0] / (tot || 1), wt[1] / (tot || 1), wt[2] / (tot || 1), wt[3] / (tot || 1));
  }
  _v(i) { const P = this.pos; return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]; }
  /** Stitch two rings. Winding is chosen so the faces point outward. */
  strip(r1, r2) {
    if (r1.n !== r2.n) throw new Error('loft: ring counts differ');
    const n = r1.n;
    // orientation, once per strip: the tangent round ring 1 at its first
    // vertex, crossed with the direction up to ring 2, against the way
    // out from the tube's axis. If ring 1 is nearly a point the tangent
    // is taken off ring 2 instead.
    const A0 = this._v(r1.i0), A1 = this._v(r2.i0);
    let B = this._v(r1.i0 + 1);
    let tx = B[0] - A0[0], ty = B[1] - A0[1], tz = B[2] - A0[2];
    if (Math.hypot(tx, ty, tz) < 1e-7) { B = this._v(r2.i0 + 1); tx = B[0] - A1[0]; ty = B[1] - A1[1]; tz = B[2] - A1[2]; }
    const ux = A1[0] - A0[0], uy = A1[1] - A0[1], uz = A1[2] - A0[2];
    const ox = (A0[0] + A1[0] - r1.c[0] - r2.c[0]) / 2;
    const oy = (A0[1] + A1[1] - r1.c[1] - r2.c[1]) / 2;
    const oz = (A0[2] + A1[2] - r1.c[2] - r2.c[2]) / 2;
    const nx = ty * uz - tz * uy, ny = tz * ux - tx * uz, nz = tx * uy - ty * ux;
    // (a0, a1, b1) has the normal t x u; keep it if that points out
    const keep = nx * ox + ny * oy + nz * oz >= 0;
    for (let i = 0; i < n; i++) {
      const a0 = r1.i0 + i, a1 = a0 + 1, b0 = r2.i0 + i, b1 = b0 + 1;
      if (keep) this.idx.push(a0, a1, b1, a0, b1, b0);
      else this.idx.push(a0, b1, a1, a0, b0, b1);
    }
  }
  /** Run a sequence of rings into a tube. */
  tube(rings) { for (let i = 1; i < rings.length; i++) this.strip(rings[i - 1], rings[i]); return rings; }
  /** Close a ring with a fan. `dir` is the way the cap faces. */
  cap(r, dir) {
    const ci = this.nv;
    this.pos.push(r.c[0], r.c[1], r.c[2]);
    this.uv.push(r.u, r.v);
    this._w(r.w);
    this.nv++;
    // orientation from the first non-degenerate triangle
    let flip = false;
    for (let i = 0; i < r.n; i++) {
      const A = this._v(r.i0 + i), B = this._v(r.i0 + i + 1);
      const ax = A[0] - r.c[0], ay = A[1] - r.c[1], az = A[2] - r.c[2];
      const bx = B[0] - r.c[0], by = B[1] - r.c[1], bz = B[2] - r.c[2];
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-10) continue;
      flip = (nx * dir[0] + ny * dir[1] + nz * dir[2]) < 0;
      break;
    }
    for (let i = 0; i < r.n; i++) {
      const a = r.i0 + i, b = a + 1;
      if (flip) this.idx.push(ci, b, a); else this.idx.push(ci, a, b);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    // the seam: first and last vertex of every ring sit on top of each
    // other with their own normals, so average the pair or every tube
    // has a crease down its back
    const nrm = g.attributes.normal;
    for (const [a, b] of this.seams) {
      const x = nrm.getX(a) + nrm.getX(b), y = nrm.getY(a) + nrm.getY(b), z = nrm.getZ(a) + nrm.getZ(b);
      const l = Math.hypot(x, y, z) || 1;
      nrm.setXYZ(a, x / l, y / l, z / l); nrm.setXYZ(b, x / l, y / l, z / l);
    }
    nrm.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  }
}

/* ============================================================ ATLAS
   Rows of one 512-square canvas. Everything is drawn in 512 space and
   scaled, so the pavement people can have a 256 of the same thing.
   ============================================================ */
const AW = 512;
const BAND = {
  top: [0, 208],       // collar at the top, hem at the bottom
  sleeve: [208, 280],  // shoulder at the top, cuff at the bottom
  pants: [280, 430],   // waistband at the top, hem at the bottom
  skin: [430, 470],
  shoe: [470, 512]     // heel at the top, toe at the bottom
};
const PAD = 3;
/** atlas v for a fraction t (0 top .. 1 bottom) of a band, inset from the edges */
export const bandV = (name, t) => {
  const [y0, y1] = BAND[name];
  return 1 - (y0 + PAD + (y1 - y0 - PAD * 2) * clamp01(t)) / AW;
};

const hex = (c) => '#' + new THREE.Color(c).getHexString();
const mul = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
const rgba = (c, a) => { const k = new THREE.Color(c); return `rgba(${Math.round(k.r * 255)},${Math.round(k.g * 255)},${Math.round(k.b * 255)},${a})`; };

/* ---- brushes. Everything here is deliberately soft and low-contrast:
   a seam is a dark line and a light line a pixel apart, a fold is a
   wide translucent streak, a weave is a thousand faint lines. At the
   texel size a body gets on screen, that is what cloth looks like. */
function weave(c, x, y, w, h, R, col, n, { horiz = true, vert = true, a = 0.10 } = {}) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = 0; i < n; i++) {
    const k = 0.7 + R() * 0.6;
    c.strokeStyle = rgba(mul(col, k), a * (0.5 + R()));
    c.lineWidth = 0.6 + R() * 0.9;
    c.beginPath();
    if (horiz && (R() < 0.5 || !vert)) { const yy = y + R() * h; c.moveTo(x, yy); c.lineTo(x + w, yy + (R() - 0.5) * 2); }
    else { const xx = x + R() * w; c.moveTo(xx, y); c.lineTo(xx + (R() - 0.5) * 2, y + h); }
    c.stroke();
  }
  c.restore();
}
function mottle(c, x, y, w, h, R, col, n, rad, a) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  for (let i = 0; i < n; i++) {
    const k = 0.8 + R() * 0.4, r = rad * (0.5 + R());
    c.fillStyle = rgba(mul(col, k), a * (0.4 + R() * 0.6));
    c.beginPath(); c.ellipse(x + R() * w, y + R() * h, r, r * (0.6 + R() * 0.8), R() * 3, 0, 7); c.fill();
  }
  c.restore();
}
/** a stitched seam: shadow, then the thread beside it */
function seam(c, x0, y0, x1, y1, col, { thread = null, w = 1.4, a = 0.55 } = {}) {
  c.strokeStyle = rgba(mul(col, 0.45), a); c.lineWidth = w;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  const dx = y1 - y0, dy = x0 - x1, l = Math.hypot(dx, dy) || 1;
  c.strokeStyle = rgba(thread ?? mul(col, 1.35), a * 0.7); c.lineWidth = w * 0.6;
  c.beginPath(); c.moveTo(x0 + dx / l * 1.6, y0 + dy / l * 1.6); c.lineTo(x1 + dx / l * 1.6, y1 + dy / l * 1.6); c.stroke();
}
function seamPath(c, pts, col, opts) { for (let i = 1; i < pts.length; i++) seam(c, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, opts); }
/** folds: wide soft streaks, dark on one edge, light on the other */
function folds(c, x, y, w, h, R, col, n, { len = 40, a = 0.10, dir = 0.6 } = {}) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const px = x + R() * w, py = y + R() * h, L = len * (0.5 + R());
    const ang = (R() - 0.5) * dir + Math.PI / 2 * (R() < 0.5 ? 1 : 0);
    const ex = px + Math.cos(ang) * L, ey = py + Math.sin(ang) * L;
    c.lineWidth = 5 + R() * 7;
    c.strokeStyle = rgba(mul(col, 0.55), a * (0.5 + R() * 0.6));
    c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo((px + ex) / 2 + (R() - 0.5) * 10, (py + ey) / 2, ex, ey); c.stroke();
    c.lineWidth = 3 + R() * 4;
    c.strokeStyle = rgba(mul(col, 1.35), a * 0.5 * (0.5 + R() * 0.6));
    c.beginPath(); c.moveTo(px + 4, py - 3); c.quadraticCurveTo((px + ex) / 2 + 4, (py + ey) / 2 - 3, ex + 4, ey - 3); c.stroke();
  }
  c.restore();
}
function grainRect(c, x, y, w, h, R, amt) {
  const img = c.getImageData(x, y, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * amt;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  c.putImageData(img, x, y);
}
function ribbing(c, x, y, w, h, R, col, pitch = 3) {
  for (let xx = x; xx < x + w; xx += pitch) {
    c.fillStyle = rgba(mul(col, 0.72), 0.45); c.fillRect(xx, y, 1, h);
    c.fillStyle = rgba(mul(col, 1.25), 0.30); c.fillRect(xx + 1, y, 1, h);
  }
}
function button(c, x, y, r, col) {
  c.fillStyle = rgba(mul(col, 0.35), 0.6); c.beginPath(); c.arc(x + 0.8, y + 0.8, r, 0, 7); c.fill();
  c.fillStyle = hex(mul(col, 1.15)); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.fillStyle = rgba(mul(col, 0.5), 0.8);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => c.fillRect(x + dx * r * 0.35 - 0.5, y + dy * r * 0.35 - 0.5, 1, 1));
}
function pocket(c, x, y, w, h, col, { flap = 0, round = 4 } = {}) {
  // the pocket is the same cloth, so it is only its edges: a shadow
  // under the lip, a seam round the rest
  c.fillStyle = rgba(mul(col, 0.6), 0.35); c.fillRect(x, y, w, 3);
  seamPath(c, [[x, y], [x, y + h - round], [x + round, y + h], [x + w - round, y + h], [x + w, y + h - round], [x + w, y]], col, { a: 0.45 });
  if (flap) {
    c.fillStyle = rgba(mul(col, 1.06), 0.55); c.fillRect(x - 2, y - 2, w + 4, flap);
    c.fillStyle = rgba(mul(col, 0.5), 0.45); c.fillRect(x - 2, y + flap - 2, w + 4, 2);
    seam(c, x - 2, y + flap - 3, x + w + 2, y + flap - 3, col, { a: 0.4 });
  }
}

/* ---- the bands */
function paintTop(c, R, { style, color, color2 }) {
  const [y0, y1] = BAND.top, h = y1 - y0;
  const [s0, s1] = BAND.sleeve, sh = s1 - s0;
  const col = color;
  const base = (k = 1) => { c.fillStyle = hex(mul(col, k)); c.fillRect(0, y0, AW, h); c.fillRect(0, s0, AW, sh); };
  const CX = AW / 2;
  switch (style) {
    case 'hoodie': {
      base();
      mottle(c, 0, y0, AW, sh + h, R, col, 700, 5, 0.07);           // heathered fleece
      weave(c, 0, y0, AW, sh + h, R, col, 500, { a: 0.05 });
      // the pouch pocket, and its two slanted openings
      c.fillStyle = rgba(mul(col, 1.05), 0.5); c.fillRect(CX - 96, y0 + 118, 192, 78);
      seamPath(c, [[CX - 96, y0 + 118], [CX - 96, y0 + 196], [CX + 96, y0 + 196], [CX + 96, y0 + 118]], col, { a: 0.5 });
      seam(c, CX - 96, y0 + 118, CX - 60, y0 + 150, col, { a: 0.5 });
      seam(c, CX + 96, y0 + 118, CX + 60, y0 + 150, col, { a: 0.5 });
      c.fillStyle = rgba(mul(col, 0.55), 0.4); c.fillRect(CX - 96, y0 + 118, 36, 3); c.fillRect(CX + 60, y0 + 118, 36, 3);
      // the hood, at the back of the neck: a darker mass with a seam up it
      c.fillStyle = rgba(mul(col, 0.78), 0.6); c.fillRect(0, y0, 88, 26); c.fillRect(AW - 88, y0, 88, 26);
      seam(c, 0, y0 + 26, 88, y0 + 20, col); seam(c, AW - 88, y0 + 20, AW, y0 + 26, col);
      // drawstrings
      [-1, 1].forEach(sd => {
        c.strokeStyle = rgba(mul(color2 ?? 0xd8d2c4, 1), 0.8); c.lineWidth = 2.2;
        c.beginPath(); c.moveTo(CX + sd * 16, y0 + 4); c.quadraticCurveTo(CX + sd * (20 + R() * 6), y0 + 40, CX + sd * 14, y0 + 70 + R() * 10); c.stroke();
        c.fillStyle = rgba(0x3a3530, 0.8); c.fillRect(CX + sd * 14 - 2, y0 + 68 + R() * 10, 4, 8);
      });
      // neckline: the kangaroo-ribbed edge
      ribbing(c, 0, y0, AW, 7, R, col);
      ribbing(c, 0, y1 - 14, AW, 14, R, col);       // hem
      ribbing(c, 0, s1 - 16, AW, 16, R, col);       // cuffs
      seam(c, 0, y1 - 15, AW, y1 - 15, col, { a: 0.35 });
      seam(c, 0, s1 - 17, AW, s1 - 17, col, { a: 0.35 });
      // raglan seams over the shoulders of the sleeve
      seam(c, AW * 0.18, s0 + 2, AW * 0.30, s0 + 28, col); seam(c, AW * 0.82, s0 + 2, AW * 0.70, s0 + 28, col);
      folds(c, 0, y0, AW, h, R, col, 14, { len: 50, a: 0.08 });
      folds(c, 0, s0, AW, sh, R, col, 8, { len: 30, a: 0.08 });
      break;
    }
    case 'jacket': {
      // a canvas work jacket, or denim: stiff cloth, a lot of seams
      base();
      weave(c, 0, y0, AW, sh + h, R, col, 1600, { a: 0.09 });
      mottle(c, 0, y0, AW, sh + h, R, col, 300, 10, 0.05);
      // yoke across the back, side seams
      seam(c, 0, y0 + 34, AW * 0.2, y0 + 34, col); seam(c, AW * 0.8, y0 + 34, AW, y0 + 34, col);
      seam(c, AW * 0.23, y0, AW * 0.23, y1, col, { a: 0.4 }); seam(c, AW * 0.77, y0, AW * 0.77, y1, col, { a: 0.4 });
      // the front: a placket with a line of snaps
      c.fillStyle = rgba(mul(col, 1.04), 0.5); c.fillRect(CX - 14, y0, 28, h);
      seam(c, CX - 14, y0, CX - 14, y1, col); seam(c, CX + 14, y0, CX + 14, y1, col);
      c.fillStyle = rgba(mul(col, 0.4), 0.55); c.fillRect(CX - 1, y0 + 8, 2, h - 16);   // the opening
      for (let i = 0; i < 5; i++) button(c, CX + 6, y0 + 26 + i * 38, 3.2, 0x9a9488);
      // chest pockets with flaps, and the bigger patch pockets at the hem
      pocket(c, CX - 108, y0 + 52, 60, 40, col, { flap: 12 });
      pocket(c, CX + 48, y0 + 52, 60, 40, col, { flap: 12 });
      pocket(c, CX - 120, y0 + 136, 70, 54, col);
      pocket(c, CX + 50, y0 + 136, 70, 54, col);
      // the collar band
      c.fillStyle = rgba(mul(col, 0.82), 0.7); c.fillRect(0, y0, AW, 12);
      seam(c, 0, y0 + 12, AW, y0 + 12, col);
      // sleeve: a seam down the back of the arm, a cuff with a button
      seam(c, 4, s0, 4, s1, col, { a: 0.4 });
      c.fillStyle = rgba(mul(col, 0.85), 0.6); c.fillRect(0, s1 - 14, AW, 14);
      seam(c, 0, s1 - 14, AW, s1 - 14, col);
      button(c, CX + 30, s1 - 7, 2.6, 0x9a9488);
      folds(c, 0, y0, AW, h, R, col, 12, { len: 60, a: 0.09 });
      folds(c, 0, s0, AW, sh, R, col, 10, { len: 30, a: 0.10 });
      break;
    }
    case 'flannel': {
      // a plaid shirt: two colours in a grid, the way the cheap ones are
      base();
      const c2 = color2 ?? mul(col, 0.55);
      const P = 34;
      for (let i = 0; i < AW / P + 2; i++) {
        const x = i * P - 6;
        c.fillStyle = rgba(c2, 0.55); c.fillRect(x, y0, 12, sh + h);
        c.fillStyle = rgba(c2, 0.35); c.fillRect(x + 20, y0, 4, sh + h);
      }
      for (let j = 0; j < (sh + h) / P + 2; j++) {
        const y = y0 + j * P - 6;
        c.fillStyle = rgba(c2, 0.5); c.fillRect(0, y, AW, 12);
        c.fillStyle = rgba(c2, 0.3); c.fillRect(0, y + 20, AW, 4);
      }
      weave(c, 0, y0, AW, sh + h, R, col, 900, { a: 0.08 });
      // placket, buttons, a pocket
      c.fillStyle = rgba(mul(col, 1.08), 0.5); c.fillRect(CX - 11, y0, 22, h);
      seam(c, CX - 11, y0, CX - 11, y1, col); seam(c, CX + 11, y0, CX + 11, y1, col);
      for (let i = 0; i < 6; i++) button(c, CX + 3, y0 + 22 + i * 32, 2.6, 0xd9cfb8);
      pocket(c, CX - 96, y0 + 50, 48, 44, col);
      c.fillStyle = rgba(mul(col, 0.85), 0.7); c.fillRect(0, y0, AW, 10);
      seam(c, 0, y0 + 10, AW, y0 + 10, col);
      seam(c, 0, y0 + 34, AW * 0.2, y0 + 34, col); seam(c, AW * 0.8, y0 + 34, AW, y0 + 34, col);
      seam(c, 0, s1 - 12, AW, s1 - 12, col);
      button(c, CX + 26, s1 - 6, 2.4, 0xd9cfb8);
      folds(c, 0, y0, AW, h, R, col, 12, { len: 50, a: 0.08 });
      folds(c, 0, s0, AW, sh, R, col, 8, { len: 30, a: 0.08 });
      break;
    }
    case 'sweater': {
      base(0.96);
      // knit: vertical ribs, and a slightly different rib at the hem,
      // cuffs and neck
      for (let x = 0; x < AW; x += 4) {
        c.fillStyle = rgba(mul(col, 0.74), 0.45); c.fillRect(x, y0, 1.5, sh + h);
        c.fillStyle = rgba(mul(col, 1.22), 0.35); c.fillRect(x + 2, y0, 1, sh + h);
      }
      for (let y = y0; y < s1; y += 3) { c.fillStyle = rgba(mul(col, 0.9), 0.18); c.fillRect(0, y, AW, 1); }
      mottle(c, 0, y0, AW, sh + h, R, col, 400, 6, 0.06);
      ribbing(c, 0, y0, AW, 12, R, col, 2); ribbing(c, 0, y1 - 18, AW, 18, R, col, 2); ribbing(c, 0, s1 - 18, AW, 18, R, col, 2);
      seam(c, 0, y0 + 12, AW, y0 + 12, col, { a: 0.3 });
      // raglan
      seam(c, AW * 0.2, s0 + 2, AW * 0.32, s0 + 30, col, { a: 0.35 }); seam(c, AW * 0.8, s0 + 2, AW * 0.68, s0 + 30, col, { a: 0.35 });
      folds(c, 0, y0, AW, h, R, col, 10, { len: 50, a: 0.07 });
      break;
    }
    case 'coat': {
      // the barn coat: canvas duck, a corduroy collar, a placket with
      // four buttons, flap pockets. Her grandfather's, three sizes up.
      const bc = T.barncoat();
      c.save();
      c.fillStyle = c.createPattern ? c.createPattern(bc.userData.canvas, 'repeat') : hex(col);
      c.fillRect(0, y0, AW, sh + h);
      c.restore();
      // a tint, so the colour can be per coat
      c.fillStyle = rgba(col, 0.32); c.fillRect(0, y0, AW, sh + h);
      weave(c, 0, y0, AW, sh + h, R, col, 700, { a: 0.06 });
      // the front: placket, buttons, the opening
      c.fillStyle = rgba(mul(col, 1.05), 0.5); c.fillRect(CX - 22, y0, 44, h);
      seam(c, CX - 22, y0, CX - 22, y1, col); seam(c, CX + 22, y0, CX + 22, y1, col);
      c.fillStyle = rgba(mul(col, 0.42), 0.6); c.fillRect(CX - 1.5, y0 + 16, 3, h - 20);
      for (let i = 0; i < 4; i++) button(c, CX + 9, y0 + 40 + i * 42, 4.2, 0x5a4a38);
      // lapels: two darker wedges laid back off the neck
      c.fillStyle = rgba(mul(col, 0.8), 0.6);
      c.beginPath(); c.moveTo(CX - 22, y0); c.lineTo(CX - 60, y0); c.lineTo(CX - 24, y0 + 46); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(CX + 22, y0); c.lineTo(CX + 60, y0); c.lineTo(CX + 24, y0 + 46); c.closePath(); c.fill();
      seam(c, CX - 60, y0, CX - 24, y0 + 46, col); seam(c, CX + 60, y0, CX + 24, y0 + 46, col);
      // corduroy collar band
      c.fillStyle = hex(mul(0x5a4a3a, 1)); c.fillRect(0, y0, AW, 14);
      for (let x = 0; x < AW; x += 3) { c.fillStyle = rgba(0x2a2018, 0.5); c.fillRect(x, y0, 1, 14); }
      // pockets with flaps, low, where the hands go
      pocket(c, CX - 140, y0 + 112, 76, 48, col, { flap: 14 });
      pocket(c, CX + 64, y0 + 112, 76, 48, col, { flap: 14 });
      pocket(c, CX - 112, y0 + 36, 44, 30, col, { flap: 10 });
      // side seams and the back vent
      seam(c, AW * 0.24, y0, AW * 0.24, y1, col, { a: 0.4 }); seam(c, AW * 0.76, y0, AW * 0.76, y1, col, { a: 0.4 });
      seam(c, 2, y0 + 110, 2, y1, col, { a: 0.5 });
      // cuffs, turned back
      c.fillStyle = rgba(mul(col, 0.86), 0.7); c.fillRect(0, s1 - 20, AW, 20);
      seam(c, 0, s1 - 20, AW, s1 - 20, col); seam(c, 0, s1 - 3, AW, s1 - 3, col, { a: 0.3 });
      folds(c, 0, y0, AW, h, R, col, 16, { len: 70, a: 0.10 });
      folds(c, 0, s0, AW, sh, R, col, 10, { len: 36, a: 0.10 });
      break;
    }
    case 'shirt':
    default: {
      // a plain shirt: clergy black, or a work shirt in a colour
      base();
      weave(c, 0, y0, AW, sh + h, R, col, 1200, { a: 0.10 });
      c.fillStyle = rgba(mul(col, 1.07), 0.45); c.fillRect(CX - 11, y0, 22, h);
      seam(c, CX - 11, y0, CX - 11, y1, col, { a: 0.4 }); seam(c, CX + 11, y0, CX + 11, y1, col, { a: 0.4 });
      for (let i = 0; i < 6; i++) button(c, CX + 3, y0 + 24 + i * 32, 2.4, mul(col, 1.3));
      c.fillStyle = rgba(mul(col, 0.84), 0.7); c.fillRect(0, y0, AW, 11);
      seam(c, 0, y0 + 11, AW, y0 + 11, col, { a: 0.4 });
      if (color2 !== undefined && color2 !== null) {        // a collar tab
        c.fillStyle = hex(color2); c.fillRect(CX - 9, y0, 18, 8);
      }
      seam(c, 0, y0 + 34, AW * 0.2, y0 + 34, col, { a: 0.4 }); seam(c, AW * 0.8, y0 + 34, AW, y0 + 34, col, { a: 0.4 });
      seam(c, 0, s1 - 12, AW, s1 - 12, col, { a: 0.4 });
      folds(c, 0, y0, AW, h, R, col, 14, { len: 50, a: 0.09 });
      folds(c, 0, s0, AW, sh, R, col, 8, { len: 30, a: 0.09 });
      break;
    }
  }
  // baked shade: the sides of the trunk under the arms, the spine, the
  // hem, the top of the sleeve where it goes into the armpit. Cheap
  // occlusion, and it is most of what makes a tube read as a torso.
  if (c.createLinearGradient) {
    [[AW * 0.17, AW * 0.33], [AW * 0.67, AW * 0.83]].forEach(([x0, x1]) => {
      const gr = c.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.fillRect(x0, y0, x1 - x0, 130);
    });
    const sp = c.createLinearGradient(0, 0, 40, 0);
    sp.addColorStop(0, 'rgba(0,0,0,0.16)'); sp.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sp; c.fillRect(0, y0, 40, h);
    const sp2 = c.createLinearGradient(AW - 40, 0, AW, 0);
    sp2.addColorStop(0, 'rgba(0,0,0,0)'); sp2.addColorStop(1, 'rgba(0,0,0,0.16)');
    c.fillStyle = sp2; c.fillRect(AW - 40, y0, 40, h);
    const hm = c.createLinearGradient(0, y1 - 26, 0, y1);
    hm.addColorStop(0, 'rgba(0,0,0,0)'); hm.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = hm; c.fillRect(0, y1 - 26, AW, 26);
    const ap = c.createLinearGradient(0, s0, 0, s0 + 22);
    ap.addColorStop(0, 'rgba(0,0,0,0.26)'); ap.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = ap; c.fillRect(0, s0, AW, 22);
  }
  grainRect(c, 0, y0, AW, s1 - y0, R, 12);
}

function paintPants(c, R, { style, color }) {
  const [y0, y1] = BAND.pants, h = y1 - y0;
  const col = color, CX = AW / 2;
  c.fillStyle = hex(col); c.fillRect(0, y0, AW, h);
  const L = AW * 0.25, Rr = AW * 0.75;
  if (style === 'jeans') {
    // denim: a twill of fine diagonals, faded where the knees and the
    // thighs rub, seams in ochre thread
    c.save(); c.beginPath(); c.rect(0, y0, AW, h); c.clip();
    for (let i = 0; i < 2600; i++) {
      const x = R() * AW, y = y0 + R() * h;
      c.strokeStyle = rgba(mul(col, 0.6 + R() * 0.9), 0.10 + R() * 0.10); c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y + 3); c.stroke();
    }
    c.restore();
    // fade on the front of the thighs and at the knees
    c.fillStyle = rgba(mix(col, 0xc8c2b4, 0.5), 0.10);
    c.beginPath(); c.ellipse(CX, y0 + 78, 60, 48, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(CX, y0 + 100, 26, 18, 0, 0, 7); c.fill();
    const th = 0xc49a58;
    // outseam and inseam
    seam(c, L, y0 + 14, L, y1, col, { thread: th, a: 0.6 }); seam(c, Rr, y0 + 14, Rr, y1, col, { thread: th, a: 0.6 });
    seam(c, 3, y0 + 14, 3, y1, col, { thread: th, a: 0.45 });
    // the waistband and the belt on it
    c.fillStyle = hex(mul(col, 0.9)); c.fillRect(0, y0, AW, 14);
    seam(c, 0, y0 + 14, AW, y0 + 14, col, { thread: th });
    c.fillStyle = hex(0x3a2c22); c.fillRect(0, y0 + 3, AW, 9);
    c.fillStyle = rgba(0x000000, 0.35); c.fillRect(0, y0 + 10, AW, 2);
    c.fillStyle = hex(0x9a9080); c.fillRect(CX - 7, y0 + 2, 14, 11);
    c.fillStyle = hex(0x3a2c22); c.fillRect(CX - 5, y0 + 4, 10, 7);
    [CX - 60, CX + 60, L - 30, Rr + 30, 60, AW - 60].forEach(x => { c.fillStyle = rgba(mul(col, 0.8), 0.9); c.fillRect(x - 4, y0 + 1, 8, 13); });
    // fly, front pockets, the yoke and the back pockets
    seam(c, CX + 6, y0 + 14, CX + 6, y0 + 52, col, { thread: th, a: 0.5 });
    c.strokeStyle = rgba(mul(col, 0.5), 0.5); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(CX + 6, y0 + 52); c.quadraticCurveTo(CX + 2, y0 + 62, CX - 4, y0 + 58); c.stroke();
    [-1, 1].forEach(sd => {
      c.beginPath(); c.moveTo(CX + sd * 44, y0 + 14); c.quadraticCurveTo(CX + sd * 74, y0 + 30, CX + sd * 84, y0 + 52);
      c.strokeStyle = rgba(mul(col, 0.5), 0.6); c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.moveTo(CX + sd * 46, y0 + 15); c.quadraticCurveTo(CX + sd * 75, y0 + 31, CX + sd * 85, y0 + 52);
      c.strokeStyle = rgba(th, 0.5); c.lineWidth = 0.9; c.stroke();
      const bx = sd > 0 ? AW - 104 : 40;
      seamPath(c, [[bx, y0 + 30], [bx, y0 + 66], [bx + 32, y0 + 74], [bx + 64, y0 + 66], [bx + 64, y0 + 30]], col, { thread: th, a: 0.55 });
      seam(c, bx + 4, y0 + 32, bx + 60, y0 + 32, col, { thread: th, a: 0.5 });
    });
    seam(c, 0, y0 + 26, 110, y0 + 30, col, { thread: th, a: 0.5 }); seam(c, AW - 110, y0 + 30, AW, y0 + 26, col, { thread: th, a: 0.5 });
    // the hem, and the wear at it
    seam(c, 0, y1 - 8, AW, y1 - 8, col, { thread: th, a: 0.5 });
    c.fillStyle = rgba(mix(col, 0xd8d2c4, 0.5), 0.12); c.fillRect(0, y1 - 5, AW, 5);
    folds(c, 0, y0 + 40, AW, h - 40, R, col, 16, { len: 40, a: 0.09, dir: 0.9 });
  } else if (style === 'khaki') {
    weave(c, 0, y0, AW, h, R, col, 1400, { a: 0.08 });
    c.fillStyle = hex(mul(col, 0.9)); c.fillRect(0, y0, AW, 14);
    c.fillStyle = hex(0x4a3a2c); c.fillRect(0, y0 + 3, AW, 9);
    c.fillStyle = hex(0x8a8070); c.fillRect(CX - 6, y0 + 2, 12, 11);
    seam(c, 0, y0 + 14, AW, y0 + 14, col);
    seam(c, L, y0 + 14, L, y1, col, { a: 0.45 }); seam(c, Rr, y0 + 14, Rr, y1, col, { a: 0.45 });
    [-1, 1].forEach(sd => {
      seam(c, CX + sd * 40, y0 + 14, CX + sd * 80, y0 + 54, col, { a: 0.5 });
      pocket(c, sd > 0 ? AW - 100 : 40, y0 + 30, 60, 40, col, { flap: 10 });
      pocket(c, CX + sd * 100 - 34, y0 + 96, 68, 60, col, { flap: 14 });   // cargo, on the outseam
    });
    seam(c, 0, y1 - 10, AW, y1 - 10, col, { a: 0.4 });
    folds(c, 0, y0 + 40, AW, h - 40, R, col, 14, { len: 40, a: 0.09, dir: 0.9 });
  } else {
    // wool trousers, or a skirt's worth of the same: a crease down the
    // front and back, a belt, the hem turned up
    weave(c, 0, y0, AW, h, R, col, 1000, { a: 0.07 });
    mottle(c, 0, y0, AW, h, R, col, 300, 8, 0.05);
    c.fillStyle = hex(mul(col, 0.92)); c.fillRect(0, y0, AW, 14);
    c.fillStyle = hex(0x2a2420); c.fillRect(0, y0 + 3, AW, 9);
    c.fillStyle = hex(0x8a8478); c.fillRect(CX - 6, y0 + 2, 12, 11);
    seam(c, 0, y0 + 14, AW, y0 + 14, col, { a: 0.4 });
    c.strokeStyle = rgba(mul(col, 1.3), 0.35); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(CX, y0 + 40); c.lineTo(CX, y1); c.stroke();
    c.beginPath(); c.moveTo(2, y0 + 40); c.lineTo(2, y1); c.stroke();
    seam(c, L, y0 + 14, L, y1, col, { a: 0.35 }); seam(c, Rr, y0 + 14, Rr, y1, col, { a: 0.35 });
    [-1, 1].forEach(sd => seam(c, CX + sd * 44, y0 + 14, CX + sd * 78, y0 + 58, col, { a: 0.4 }));
    c.fillStyle = rgba(mul(col, 0.85), 0.7); c.fillRect(0, y1 - 12, AW, 12);
    seam(c, 0, y1 - 12, AW, y1 - 12, col, { a: 0.4 });
    folds(c, 0, y0 + 40, AW, h - 40, R, col, 12, { len: 44, a: 0.08, dir: 0.6 });
  }
  if (c.createLinearGradient) {
    const wb = c.createLinearGradient(0, y0, 0, y0 + 40);
    wb.addColorStop(0, 'rgba(0,0,0,0.30)'); wb.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = wb; c.fillRect(0, y0, AW, 40);
    const cr = c.createLinearGradient(0, y0 + 28, 0, y0 + 52);
    cr.addColorStop(0, 'rgba(0,0,0,0)'); cr.addColorStop(0.5, 'rgba(0,0,0,0.14)'); cr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = cr; c.fillRect(0, y0 + 28, AW, 24);
  }
  grainRect(c, 0, y0, AW, h, R, 10);
}

function paintSkin(c, R, { skin }) {
  const [y0, y1] = BAND.skin, h = y1 - y0;
  c.fillStyle = hex(skin); c.fillRect(0, y0, AW, h);
  mottle(c, 0, y0, AW, h, R, skin, 300, 6, 0.08);
  mottle(c, 0, y0, AW, h, R, mix(skin, 0xa05040, 0.4), 80, 5, 0.05);
  // knuckles and the back of the hand sit lower in the band: a touch darker
  c.fillStyle = rgba(mul(skin, 0.8), 0.18); c.fillRect(0, y0 + h * 0.62, AW, h * 0.38);
  // the neck is the top of the band, and it is under the jaw: the face
  // texture paints its own shadow there, and a neck lit brighter than
  // the chin above it is a pale collar of skin
  if (c.createLinearGradient) {
    const nk = c.createLinearGradient(0, y0, 0, y0 + h * 0.5);
    nk.addColorStop(0, 'rgba(0,0,0,0.42)'); nk.addColorStop(0.45, 'rgba(0,0,0,0.26)'); nk.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = nk; c.fillRect(0, y0, AW, h * 0.5);
  }
  grainRect(c, 0, y0, AW, h, R, 8);
}

function paintShoe(c, R, { style, color }) {
  const [y0, y1] = BAND.shoe, h = y1 - y0;
  const col = color, CX = AW / 2;
  c.fillStyle = hex(col); c.fillRect(0, y0, AW, h);
  const soleW = AW * 0.12;
  const soleCol = style === 'sneaker' ? 0xb8b2a4 : 0x1a1816;
  if (style === 'sneaker') {
    mottle(c, 0, y0, AW, h, R, col, 200, 6, 0.06);
    // the toe cap and the side stripe
    c.fillStyle = rgba(mul(col, 0.92), 0.8); c.fillRect(0, y1 - 12, AW, 12);
    seam(c, 0, y1 - 12, AW, y1 - 12, col, { a: 0.5 });
    c.fillStyle = rgba(0x3a4a6a, 0.7); c.fillRect(soleW + 6, y0 + 8, 40, 16); c.fillRect(AW - soleW - 46, y0 + 8, 40, 16);
  } else {
    // leather: a soft sheen down the length, scuffing at the toe
    mottle(c, 0, y0, AW, h, R, col, 300, 8, 0.08);
    c.fillStyle = rgba(mul(col, 1.3), 0.12); c.fillRect(CX - 70, y0, 140, h);
    c.fillStyle = rgba(mix(col, 0x9a8a70, 0.5), 0.15); c.fillRect(0, y1 - 8, AW, 8);
    seam(c, soleW, y1 - 16, AW - soleW, y1 - 16, col, { a: 0.45 });   // toe cap
  }
  // the sole: both sides of the seam, which is the bottom of the tube
  c.fillStyle = hex(soleCol); c.fillRect(0, y0, soleW, h); c.fillRect(AW - soleW, y0, soleW, h);
  c.fillStyle = rgba(mul(soleCol, 1.8), 0.5); c.fillRect(soleW - 3, y0, 3, h); c.fillRect(AW - soleW, y0, 3, h);  // the welt
  // laces, over the instep
  if (style !== 'loafer') {
    c.fillStyle = rgba(mul(col, 0.6), 0.5); c.fillRect(CX - 16, y0 + 4, 32, 18);    // the tongue, in shadow
    c.strokeStyle = rgba(style === 'sneaker' ? 0xe8e2d4 : 0x2a2420, 0.85); c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = y0 + 6 + i * 4.5;
      c.beginPath(); c.moveTo(CX - 14, y); c.lineTo(CX + 14, y + 4.5); c.stroke();
      c.beginPath(); c.moveTo(CX + 14, y); c.lineTo(CX - 14, y + 4.5); c.stroke();
    }
    [-1, 1].forEach(sd => { for (let i = 0; i < 4; i++) { c.fillStyle = rgba(0x6a6050, 0.9); c.fillRect(CX + sd * 15 - 1.5, y0 + 5 + i * 4.5, 3, 3); } });
  }
  grainRect(c, 0, y0, AW, h, R, 10);
}

/**
 * The atlas for one outfit. Cached by what is in it, so the pavement
 * can share a dozen between sixteen people and two identical coats are
 * one texture.
 */
export function atlasTex({ top, pants, skin, shoe, size = 512 }) {
  const key = `atlas|${size}|${top.style}|${top.color}|${top.color2 ?? ''}|${pants.style}|${pants.color}|${skin}|${shoe.style}|${shoe.color}`;
  return tex(key, size, size, (c, w, h, R) => {
    c.save();
    c.scale(w / AW, h / AW);
    paintTop(c, R, top);
    paintPants(c, R, pants);
    paintSkin(c, R, { skin });
    paintShoe(c, R, shoe);
    c.restore();
  }, { metres: 1, aniso: 4 });
}

const MATS = new Map();
export function bodyMat(atlas) {
  if (MATS.has(atlas.uuid)) return MATS.get(atlas.uuid);
  const m = new THREE.MeshStandardMaterial({
    map: atlas, roughness: 0.90, metalness: 0, side: THREE.DoubleSide,
    normalMap: normalOf(atlas, 1.1)
  });
  m.normalScale.set(0.45, 0.45);
  MATS.set(atlas.uuid, m);
  return m;
}

/* ============================================================ THE BODY
   Landmarks for a 1.70 m person, scaled. Crotch at 0.47 of height,
   knee at 0.285, shoulder at 0.82, chin at 0.87. The bone positions are
   the ones the chapters already pose against, so a sitting Recca still
   sits.
   ============================================================ */
/**
 * buildBody(opts) -> { mesh, bones, atlas, s }
 *
 *   height, build, female (0..1), age (0..1)
 *   skin            hex
 *   top             { style, color, color2 }   hoodie|jacket|flannel|sweater|coat|shirt
 *   pants           { style, color }           jeans|trouser|khaki
 *   shoe            { style, color }           boot|shoe|sneaker|loafer
 *   detail          'high' | 'low'             fingers and ring counts
 *
 * bones: hips, torso, chest, neckPivot, headG, arms[2] { sh, el, hand,
 * knuckles, fingers[4], thumb }, legs[2] { hp, kn, ankle }. All
 * THREE.Bone, all at zero rotation; call `rest()` to pose them.
 */
export function buildBody({
  height = 1.7, build = 1.0, female = 0, age = 0, skin = 0xd8b49a,
  top = { style: 'jacket', color: 0x5a6070 },
  pants = { style: 'jeans', color: 0x3a4050 },
  shoe = { style: 'boot', color: 0x2a2420 },
  detail = 'high', atlasSize = 512
} = {}) {
  const s = height / 1.7;
  const fm = female, hi = detail !== 'low';
  const NT = hi ? 18 : 12;        // round the trunk
  const NL = hi ? 12 : 8;         // round a limb
  const NF = 7;                   // round a finger
  const bld = build;
  const coat = top.style === 'coat';

  // ---- skeleton. Authored unrotated; see rest().
  const bones = [];
  const B = (name, parent, x, y, z) => {
    const b = new THREE.Bone(); b.name = name; b.position.set(x * s, y * s, z * s);
    b.userData.i = bones.length; bones.push(b);
    if (parent) parent.add(b);
    // position in the figure's space at bind time, for authoring
    b.userData.p = [x + (parent ? parent.userData.p[0] : 0), y + (parent ? parent.userData.p[1] : 0), z + (parent ? parent.userData.p[2] : 0)];
    return b;
  };
  const hips = B('hips', null, 0, 0.94, 0);
  const torso = B('torso', hips, 0, 0, 0);
  const chest = B('chest', torso, 0, 0.28, 0);
  const neckPivot = B('neckPivot', torso, 0, 0.545, age * 0.03);
  const headG = B('headG', neckPivot, 0, 0, 0);
  const SHX = (0.148 - fm * 0.010) * bld;
  const HPX = (0.082 + fm * 0.006) * bld;
  const arms = [-1, 1].map(sd => {
    const sh = B('sh' + sd, torso, sd * SHX, 0.452, 0);
    const el = B('el' + sd, sh, 0, -0.300, 0);
    const hand = B('hand' + sd, el, 0, -0.250, 0);
    const knuckles = B('kn' + sd, hand, 0, -0.076, 0.001);
    const DZ = [0.0225, 0.0075, -0.0075, -0.0225];
    const fingers = hi ? DZ.map((dz, i) => B(`f${sd}${i}`, knuckles, 0, 0, dz)) : [];
    const thumb = hi ? B('th' + sd, hand, sd * 0.012, -0.028, 0.030) : null;
    return { sh, el, hand, knuckles, fingers, thumb, side: sd };
  });
  const legs = [-1, 1].map(sd => {
    const hp = B('hp' + sd, torso, sd * HPX, -0.040, 0);
    const kn = B('kn' + sd, hp, 0, -0.412, 0);
    const ankle = B('an' + sd, kn, 0, -0.416, 0);
    return { hp, kn, ankle, side: sd };
  });
  const I = (b) => b.userData.i;

  // ---- the skin
  const L = new Loft();
  const P = (x, y, z) => [x * s, y * s, z * s];
  /** a vertical ring at world height y, half-width rx, front/back depth rzF/rzB */
  const V = (y, rx, rzF, rzB, w, v, { p = 2.3, n = NT, cx = 0, cz = 0 } = {}) =>
    L.ring({ c: P(cx, y, cz), a: [rx * s, 0, 0], b: [0, 0, rzF * s], bNeg: rzB / rzF, p, n, v, w });
  /** weight along a chain of [bone, yTop] going down, blending over `bw` at each joint */
  const chainW = (y, chain, bw = 0.05) => {
    for (let k = 0; k < chain.length - 1; k++) {
      const [b0] = chain[k], [b1, yj] = chain[k + 1];
      if (y > yj + bw) return [[I(b0), 1]];            // above the next joint: this bone
      if (y >= yj - bw) {                              // in the joint: both
        const t = (yj + bw - y) / (2 * bw);            // 0 above .. 1 below
        return [[I(b0), 1 - t], [I(b1), t]];
      }
    }
    return [[I(chain[chain.length - 1][0]), 1]];
  };

  // ---- TRUNK. The top (whatever they have on), from hem to collar,
  // then the neck in skin, as one continuous tube so there is no gap to
  // see into at the collar.
  const TOPC = [[torso, 9], [chest, 1.14]];
  const tw = (y) => chainW(y, TOPC, 0.08);
  const bust = fm > 0.15 ? (0.018 + fm * 0.022) : 0;
  const belly = age * 0.022;
  const shW = 1 - fm * 0.07;
  const hipW = 1 + fm * 0.05;
  // [y, rx, rzF, rzB]
  let trunk = [
    [0.905, 0.176 * hipW, 0.126, 0.122],
    [0.96, 0.170 * hipW, 0.120 + belly, 0.120],
    [1.02, 0.152 * (1 - fm * 0.06), 0.110 + belly * 1.4, 0.112],
    [1.08, 0.152, 0.112 + belly, 0.114],
    [1.14, 0.158, 0.116 + belly * 0.5, 0.118],
    [1.20, 0.164 * shW, 0.122 + bust * 0.9, 0.120],
    [1.26, 0.167 * shW, 0.124 + bust, 0.118],
    [1.32, 0.174 * shW, 0.118 + bust * 0.3, 0.112],
    [1.385, 0.204 * shW, 0.104, 0.098],
    [1.415, 0.128 * shW, 0.086, 0.082],
    [1.432, 0.076, 0.068, 0.066],
    [1.442, 0.063, 0.060, 0.059]
  ];
  if (coat) {
    trunk = [
      [0.60, 0.212, 0.156, 0.150], [0.70, 0.200, 0.146, 0.140], [0.80, 0.190, 0.138, 0.132],
      [0.905, 0.184, 0.132, 0.128], [0.96, 0.180, 0.128, 0.126], [1.02, 0.170, 0.122, 0.122],
      [1.08, 0.168, 0.122, 0.124], [1.14, 0.172, 0.126, 0.128], [1.20, 0.176, 0.130 + bust * 0.8, 0.128],
      [1.26, 0.180, 0.132 + bust * 0.9, 0.126], [1.32, 0.186, 0.128, 0.120], [1.385, 0.214, 0.110, 0.104],
      [1.415, 0.136, 0.092, 0.088], [1.432, 0.084, 0.074, 0.072], [1.442, 0.072, 0.066, 0.064]
    ];
  }
  const hemY = trunk[0][0], colY = trunk[trunk.length - 1][0];
  const trunkRings = trunk.map(([y, rx, rzF, rzB]) =>
    V(y, rx * bld, rzF * bld, rzB * bld, tw(y), bandV('top', (colY - y) / (colY - hemY))));
  // the neck: skin, rising into the jaw. Shares the collar ring so the
  // cloth and the skin are one surface.
  const NECK = [[torso, 9], [headG, 1.495]];
  const nw = (y) => chainW(y, NECK, 0.03);
  // the first neck ring sits exactly on the collar ring, so the strip
  // between them (which crosses from the cloth band of the atlas to the
  // skin band) has no height and cannot show the bands in between
  const cT = trunk[trunk.length - 1];
  const neck = [
    [cT[0], cT[1] * bld, cT[2] * bld, cT[3] * bld],
    [1.47, 0.055, 0.052, 0.054], [1.50, 0.054, 0.051, 0.054],
    [1.53, 0.056, 0.051, 0.058], [1.555, 0.060, 0.050, 0.062]
  ].map(([y, rx, rzF, rzB], i) => V(y, rx, rzF, rzB, nw(y), bandV('skin', 0.15 + i * 0.08), { p: 2.1 }));
  L.tube(trunkRings.concat(neck));
  L.cap(neck[neck.length - 1], [0, 1, 0]);
  // the coat has a collar standing off the neck
  if (coat) {
    const cl = [[1.45, 0.082, 0.078, 0.076], [1.49, 0.084, 0.080, 0.078], [1.515, 0.080, 0.076, 0.074]]
      .map(([y, rx, rzF, rzB], i) => V(y, rx * bld, rzF * bld, rzB * bld, tw(y), bandV('top', 0.01 + i * 0.01), { p: 2.2 }));
    L.tube(cl);
    const inner = [[1.515, 0.072, 0.068, 0.066], [1.47, 0.070, 0.066, 0.064]]
      .map(([y, rx, rzF, rzB]) => V(y, rx * bld, rzF * bld, rzB * bld, tw(y), bandV('top', 0.02), { p: 2.2 }));
    L.strip(cl[cl.length - 1], inner[0]); L.strip(inner[0], inner[1]);
  }
  if (top.style === 'hoodie' || top.hood) {
    // the hood, down the back of the neck
    const hd = [[1.33, 0.070, 0.020, 0.040], [1.39, 0.100, 0.030, 0.066], [1.45, 0.096, 0.028, 0.070], [1.50, 0.060, 0.016, 0.040]]
      .map(([y, rx, rzF, rzB], i) => V(y, rx * bld, rzF, rzB, tw(y), bandV('top', 0.02 + i * 0.02), { cz: -0.085 * bld, p: 2.0 }));
    L.tube(hd); L.cap(hd[0], [0, -1, 0]); L.cap(hd[hd.length - 1], [0, 1, 0]);
  }

  // ---- PELVIS, in the trousers. Capped at the crotch; its top is
  // inside the top and never seen.
  const pw = [[I(torso), 1]];
  const seat = 0.010 + fm * 0.016;
  const pelvis = [
    [0.78, 0.124, 0.086, 0.096], [0.84, 0.160 * hipW, 0.110, 0.118 + seat],
    [0.90, 0.168 * hipW, 0.114, 0.124 + seat], [0.96, 0.160, 0.108, 0.112], [1.02, 0.146, 0.100, 0.102]
  ].map(([y, rx, rzF, rzB]) => V(y, rx * bld, rzF * bld, rzB * bld, pw, bandV('pants', (1.02 - y) / (1.02 - 0.78) * 0.26), { p: 2.3 }));
  L.tube(pelvis);
  L.cap(pelvis[0], [0, -1, 0]);

  // ---- LEGS. One tube from inside the pelvis to the trouser hem, the
  // knee bending the skin. The calf sits behind the shin bone.
  const LEGC = (lg) => [[lg.hp, 9], [lg.kn, 0.488], [lg.ankle, 0.072]];
  legs.forEach(lg => {
    const cx = lg.side * HPX;
    const lw = (y) => chainW(y, LEGC(lg), y > 0.3 ? 0.055 : 0.035);
    const rings = [
      [0.88, 0.079, 0.082, 0.090], [0.80, 0.081, 0.085, 0.092], [0.70, 0.077, 0.081, 0.084],
      [0.60, 0.071, 0.073, 0.075], [0.54, 0.065, 0.067, 0.067], [0.488, 0.059, 0.063, 0.059],
      [0.44, 0.057, 0.061, 0.059], [0.36, 0.058, 0.056, 0.067], [0.26, 0.052, 0.050, 0.057],
      [0.16, 0.047, 0.047, 0.049], [0.11, 0.046, 0.046, 0.046]
    ].map(([y, rx, rzF, rzB]) => V(y, rx * (0.9 + bld * 0.1), rzF, rzB, lw(y),
      bandV('pants', 0.26 + (0.78 - y) / (0.78 - 0.11) * 0.74), { p: 2.1, n: NL, cx }));
    L.tube(rings);
    // ---- the shoe: a tube along z, flat underneath, closed both ends,
    // the ankle bone's. The trouser hem hangs over the top of it.
    const aw = [[I(lg.ankle), 1]];
    const SH = [
      [-0.078, 0.046, 0.026, 0.036, 0.044], [-0.050, 0.050, 0.038, 0.050, 0.048],
      [-0.012, 0.052, 0.043, 0.048, 0.050], [0.030, 0.042, 0.046, 0.044, 0.040],
      [0.080, 0.034, 0.048, 0.034, 0.032], [0.130, 0.024, 0.044, 0.024, 0.022],
      [0.168, 0.017, 0.030, 0.013, 0.016]
    ].map(([z, yc, rx, ryUp, ryDn], i) => L.ring({
      c: P(cx + lg.side * 0.004, yc, z), a: [rx * s, 0, 0], b: [0, ryUp * s, 0], bNeg: ryDn / ryUp,
      p: 2.8, n: NL, v: bandV('shoe', i / 6), w: aw, rot: 0
    }));
    L.tube(SH);
    L.cap(SH[0], [0, 0, -1]); L.cap(SH[SH.length - 1], [0, 0, 1]);
  });

  // ---- ARMS. Sleeve from inside the shoulder to the cuff, then the
  // wrist and hand in skin, one tube; the fingers and thumb grow out of
  // the palm as their own small tubes.
  const ARMC = (a) => [[a.sh, 9], [a.el, 1.092], [a.hand, 0.842]];
  arms.forEach(a => {
    const cx = a.side * SHX;
    const aw = (y) => chainW(y, ARMC(a), y > 1.0 ? 0.045 : 0.03);
    const slv = coat ? 1.12 : 1;
    const sleeve = [
      [1.405, 0.030, 0.030, 0.030], [1.375, 0.057, 0.055, 0.055], [1.33, 0.059, 0.057, 0.057],
      [1.27, 0.055, 0.053, 0.053], [1.20, 0.051, 0.050, 0.050], [1.13, 0.049, 0.048, 0.048],
      [1.092, 0.047, 0.049, 0.049], [1.05, 0.047, 0.048, 0.048], [0.99, 0.046, 0.045, 0.045],
      [0.92, 0.041, 0.040, 0.040], [0.866, 0.037, 0.037, 0.037]
    ].map(([y, rx, rzF, rzB]) => V(y, rx * slv * (0.9 + bld * 0.1), rzF * slv, rzB * slv, aw(y),
      bandV('sleeve', (1.405 - y) / (1.405 - 0.866)), { p: 2.1, n: NL, cx }));
    // the hand: thin across, broad front to back, palm toward the thigh
    const hand = [
      [0.866, 0.037 * slv * (0.9 + bld * 0.1), 0.037 * slv, 0.037 * slv],   // on the cuff ring: a zero-height strip
      [0.862, 0.022, 0.030, 0.030], [0.842, 0.020, 0.031, 0.031], [0.815, 0.019, 0.038, 0.036],
      [0.785, 0.017, 0.042, 0.038], [0.768, 0.014, 0.040, 0.036]
    ].map(([y, rx, rzF, rzB], i) => V(y, rx, rzF, rzB, aw(y), bandV('skin', 0.50 + i * 0.07), { p: i ? 2.4 : 2.1, n: NL, cx }));
    L.tube(sleeve.concat(hand));
    L.cap(sleeve[0], [0, 1, 0]);
    if (hi) {
      // the knuckle end of the palm closes on the fingers
      L.cap(hand[hand.length - 1], [0, -1, 0]);
      const DZ = [0.0225, 0.0075, -0.0075, -0.0225];
      const LEN = [0.070, 0.078, 0.072, 0.058];
      a.fingers.forEach((fb, i) => {
        const fx = cx, fz = DZ[i], ky = 0.766;
        const fw = [[I(fb), 1]], hw = [[I(a.hand), 1]];
        const r = 0.0082 * (i === 3 ? 0.88 : 1);
        const F = [
          [ky + 0.012, r * 0.9, hw], [ky - 0.004, r, fw], [ky - LEN[i] * 0.45, r * 0.95, fw],
          [ky - LEN[i] * 0.8, r * 0.85, fw], [ky - LEN[i], r * 0.55, fw]
        ].map(([y, rr, w], k) => L.ring({
          c: P(fx, y, fz), a: [rr * s * 0.92, 0, 0], b: [0, 0, rr * s], p: 2.2, n: NF,
          v: bandV('skin', 0.72 + k * 0.05), w
        }));
        L.tube(F); L.cap(F[F.length - 1], [0, -1, 0]);
      });
      // the thumb, off the front edge of the palm
      const tb = a.thumb.userData.p;
      const tw2 = [[I(a.thumb), 1]], hw = [[I(a.hand), 1]];
      const TH = [
        [0.008, 0.0115, hw], [-0.012, 0.0120, tw2], [-0.036, 0.0110, tw2], [-0.056, 0.0095, tw2], [-0.068, 0.0060, tw2]
      ].map(([dy, rr, w], k) => L.ring({
        c: P(tb[0], tb[1] + dy, tb[2]), a: [rr * s, 0, 0], b: [0, 0, rr * s], p: 2.2, n: NF,
        v: bandV('skin', 0.72 + k * 0.05), w
      }));
      L.tube(TH); L.cap(TH[TH.length - 1], [0, -1, 0]);
    } else {
      // a mitten: the palm runs on down and rounds off
      const hw = [[I(a.hand), 1]];
      const mit = [[0.735, 0.013, 0.040, 0.036], [0.700, 0.011, 0.034, 0.030], [0.680, 0.007, 0.022, 0.020]]
        .map(([y, rx, rzF, rzB], i) => V(y, rx, rzF, rzB, hw, bandV('skin', 0.8 + i * 0.05), { p: 2.4, n: NL, cx }));
      L.strip(hand[hand.length - 1], mit[0]); L.tube(mit); L.cap(mit[mit.length - 1], [0, -1, 0]);
    }
  });

  // ---- the mesh
  const geom = L.build();
  const atlas = atlasTex({ top, pants, skin, shoe, size: atlasSize });
  const mesh = new THREE.SkinnedMesh(geom, bodyMat(atlas));
  mesh.name = 'body';
  // the rest geometry's sphere is the standing figure; a sitting or
  // lying one swings well outside it, so give the culler room
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9 * s, 0), 1.9 * s);
  mesh.frustumCulled = true;

  const g = new THREE.Group();
  g.add(hips);
  g.add(mesh);
  g.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  /** the rest pose: arms off the ribcage, elbows unlocked, old knees bent */
  const rest = () => {
    torso.rotation.x = age * 0.085;
    neckPivot.rotation.x = -age * 0.10;
    arms.forEach(a => {
      a.sh.rotation.set(0.04 + age * 0.10, 0, a.side * (0.078 + age * 0.03));
      a.el.rotation.x = -0.20 - age * 0.30;
      a.knuckles.rotation.set(-0.10, 0, -a.side * 0.12);
      a.fingers.forEach((f, i) => { f.rotation.set(-0.02 + i * 0.02, (i - 1.5) * 0.03, -a.side * (0.10 + i * 0.04)); });
      if (a.thumb) a.thumb.rotation.set(-0.62, a.side * 0.30, a.side * 0.34);
    });
    legs.forEach(l => { l.hp.rotation.x = -age * 0.10; l.ankle.rotation.y = l.side * 0.06; });
  };

  return {
    g, mesh, atlas, s, rest,
    bones: { hips, torso, chest, neckPivot, headG, arms, legs, all: bones },
    // where the head goes: the atlas of the skull sits this far above
    // the neck pivot (props.js puts the skull there)
    neckTop: 1.555 * s
  };
}

/* ---- outfits. What a coal town wears, by who is wearing it. */
export const TOPS = ['hoodie', 'jacket', 'flannel', 'sweater', 'shirt'];
export const PANTS = ['jeans', 'jeans', 'trouser', 'khaki'];
export const SHOES = ['boot', 'shoe', 'sneaker'];
