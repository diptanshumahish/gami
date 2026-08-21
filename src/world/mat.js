/* ============================================================
   mat.js: every texture in Ashgrove is drawn at runtime on a
   2D canvas, then a normal map is derived from its luminance.
   No image files ship with the game.

   Correct real-world scale is load-bearing for the F2F look, so
   every texture declares its repeat in METRES, not tiles.
   ============================================================ */
import * as THREE from 'three';

const CACHE = new Map();
const NCACHE = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const rnd = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/** Draw once, cache, return a CanvasTexture. `metres` = world size of one tile. */
export function tex(key, w, h, draw, { metres = 1, srgb = true, aniso = 8 } = {}) {
  if (CACHE.has(key)) return CACHE.get(key);
  const c = canvas(w, h);
  draw(c.getContext('2d'), w, h, rnd(hash(key)));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  t.userData.metres = metres;
  t.userData.canvas = c;
  CACHE.set(key, t);
  return t;
}

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Derive a normal map from a colour texture's luminance (sobel). */
export function normalOf(colorTex, strength = 1.6) {
  const key = colorTex.uuid + ':' + strength;
  if (NCACHE.has(key)) return NCACHE.get(key);
  const src = colorTex.userData.canvas;
  const w = Math.min(src.width, 256), h = Math.min(src.height, 256);
  const s = canvas(w, h); s.getContext('2d').drawImage(src, 0, 0, w, h);
  const d = s.getContext('2d').getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
  const out = canvas(w, h);
  const oc = out.getContext('2d');
  const img = oc.createImageData(w, h);
  const at = (x, y) => lum[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
    const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
    let nx = dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    const i = (y * w + x) * 4;
    img.data[i] = (nx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  NCACHE.set(key, t);
  return t;
}

// ---------------------------------------------------------------- helpers
function grain(ctx, w, h, R, amt, alpha = 1) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * amt;
    d[i] = clamp(d[i] + n); d[i + 1] = clamp(d[i + 1] + n); d[i + 2] = clamp(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}
const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

function blotch(ctx, w, h, R, n, color, rMin, rMax, a = 0.05) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = rMin + R() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace(')', `,${a})`).replace('rgb', 'rgba'));
    g.addColorStop(1, color.replace(')', ',0)').replace('rgb', 'rgba'));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

// ============================================================ TEXTURES
export const T = {
  plaster: () => tex('plaster', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#cfc7b8'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 40, 'rgb(180,170,155)', 20, 90, 0.09);
    blotch(c, w, h, R, 14, 'rgb(225,219,206)', 30, 120, 0.10);
    // trowel strokes
    c.globalAlpha = .06;
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = R() > .5 ? '#fff' : '#8e867a'; c.lineWidth = 1 + R() * 5;
      c.beginPath(); const x = R() * w, y = R() * h, a = R() * Math.PI;
      c.moveTo(x, y); c.lineTo(x + Math.cos(a) * (30 + R() * 90), y + Math.sin(a) * (30 + R() * 90)); c.stroke();
    }
    c.globalAlpha = 1; grain(c, w, h, R, 12);
  }, { metres: 2.2 }),

  woodfloor: () => tex('woodfloor', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#4a3524'; c.fillRect(0, 0, w, h);
    const pw = h / 6;
    for (let r = 0; r < 6; r++) {
      const off = (r % 2) * 90;
      for (let x = -90; x < w; x += 170 + R() * 90) {
        const bw = 170 + R() * 90;
        const base = 58 + R() * 34;
        c.fillStyle = `rgb(${base + 26},${base - 4},${base - 22})`;
        c.fillRect(x + off, r * pw, bw - 2, pw - 2);
        // grain lines
        c.globalAlpha = .18;
        for (let g = 0; g < 22; g++) {
          c.strokeStyle = R() > .5 ? '#2c1e12' : '#7d5c3c'; c.lineWidth = .6 + R();
          const y = r * pw + R() * pw;
          c.beginPath(); c.moveTo(x + off, y);
          c.bezierCurveTo(x + off + bw * .3, y + (R() - .5) * 6, x + off + bw * .7, y + (R() - .5) * 6, x + off + bw, y);
          c.stroke();
        }
        c.globalAlpha = 1;
      }
      c.fillStyle = 'rgba(20,12,7,.55)'; c.fillRect(0, r * pw + pw - 2, w, 2);
    }
    blotch(c, w, h, R, 12, 'rgb(30,20,12)', 40, 160, 0.10);
    grain(c, w, h, R, 14);
  }, { metres: 2.4 }),

  lino: () => tex('lino', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#c9c2ad'; c.fillRect(0, 0, w, h);
    const s = w / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = (x + y) % 2 ? '#bdb5a0' : '#cdc7b3';
      c.fillRect(x * s, y * s, s, s);
      c.globalAlpha = .16;
      for (let i = 0; i < 40; i++) { c.fillStyle = R() > .5 ? '#8f8877' : '#e5e0d2'; c.fillRect(x * s + R() * s, y * s + R() * s, 1 + R() * 3, 1 + R() * 2); }
      c.globalAlpha = 1;
    }
    c.strokeStyle = 'rgba(90,84,70,.35)'; c.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    blotch(c, w, h, R, 16, 'rgb(120,110,90)', 20, 70, 0.07);
    grain(c, w, h, R, 8);
  }, { metres: 2.4 }),

  // A lit window seen from across a street: a warm room, a blind pulled
  // to a different height in every flat, and the sash bars that stop it
  // reading as a rectangle of pure orange paint.
  litwindow: () => tex('litwindow', 128, 160, (c, w, h, R) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#4a3320'); gr.addColorStop(0.35, '#c98f4e');
    gr.addColorStop(0.72, '#e8b06a'); gr.addColorStop(1, '#8a5c30');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    // whatever is in the room, blurred to nothing at this distance
    c.globalAlpha = .35;
    for (let i = 0; i < 5; i++) {
      c.fillStyle = R() > .5 ? '#3d2a18' : '#f0cf9a';
      c.fillRect(R() * w, h * (.35 + R() * .5), 8 + R() * 34, 10 + R() * 30);
    }
    c.globalAlpha = 1;
    // the blind, down to somewhere between a third and nothing
    const blind = h * (0.06 + R() * 0.34);
    c.fillStyle = '#6a4a2c'; c.fillRect(0, 0, w, blind);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, blind - 3, w, 3);
    // sash bars
    c.fillStyle = '#241a12';
    c.fillRect(w / 2 - 2, 0, 4, h);
    c.fillRect(0, h * 0.46 - 2, w, 5);
    c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
    c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
    grain(c, w, h, R, 6);
  }, { metres: 1 }),

  carpet: () => tex('carpet', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#6a5c48'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 22000; i++) {
      const v = 70 + R() * 60;
      c.fillStyle = `rgba(${v + 24},${v + 6},${v - 12},.5)`;
      c.fillRect(R() * w, R() * h, 1.4, 1.4);
    }
    grain(c, w, h, R, 16);
  }, { metres: 1.1 }),

  // A brick is 215 mm long and 65 mm tall. The tile is 1.8 m across, so
  // that is 8 bricks a course and 24 courses. It used to be 4 and 10 over
  // 2 m, which put half-metre bricks on every wall in town and is most of
  // what made the exteriors read as a cartoon.
  brick: () => tex('brick', 1024, 1024, (c, w, h, R) => {
    c.fillStyle = '#6a625a'; c.fillRect(0, 0, w, h);      // mortar
    const COURSES = 24, PER = 8;
    const bh = h / COURSES, bw = w / PER;
    const mort = Math.max(1.5, bw * 0.035);
    for (let r = 0; r < COURSES; r++) for (let i = -1; i < PER + 1; i++) {
      const x = i * bw + (r % 2) * bw / 2, y = r * bh;
      const v = 88 + R() * 52;
      c.fillStyle = `rgb(${v},${v * 0.52 + 12},${v * 0.42 + 9})`;
      c.fillRect(x + mort, y + mort, bw - mort * 2, bh - mort * 2);
      // the face of a brick is never one colour
      c.globalAlpha = .12;
      for (let k = 0; k < 7; k++) {
        c.fillStyle = R() > .5 ? '#000' : '#fff';
        c.fillRect(x + mort + R() * (bw - mort * 2), y + mort + R() * (bh - mort * 2), 3, 2);
      }
      c.globalAlpha = 1;
      // the odd spalled or over-fired one
      if (R() > 0.94) {
        c.fillStyle = 'rgba(40,34,30,.5)';
        c.fillRect(x + mort, y + mort, bw - mort * 2, bh - mort * 2);
      }
    }
    blotch(c, w, h, R, 26, 'rgb(30,26,22)', 40, 180, 0.09);
    blotch(c, w, h, R, 10, 'rgb(120,112,104)', 30, 140, 0.06);
    grain(c, w, h, R, 10);
  }, { metres: 1.8 }),

  shingle: () => tex('shingle', 512, 512, (c, w, h, R) => { // asphalt siding, dried-blood
    c.fillStyle = '#4b2a26'; c.fillRect(0, 0, w, h);
    const rh = h / 8;
    for (let r = 0; r < 8; r++) {
      for (let x = 0; x < w; x += w / 6) {
        const v = 62 + R() * 26;
        c.fillStyle = `rgb(${v + 20},${v - 16},${v - 18})`;
        c.fillRect(x + (r % 2) * 20, r * rh, w / 6 - 3, rh - 3);
      }
      c.fillStyle = 'rgba(20,10,9,.5)'; c.fillRect(0, r * rh + rh - 3, w, 3);
    }
    c.globalAlpha = .16;
    for (let i = 0; i < 5000; i++) { c.fillStyle = R() > .5 ? '#000' : '#b09080'; c.fillRect(R() * w, R() * h, 2, 2); }
    c.globalAlpha = 1; grain(c, w, h, R, 14);
  }, { metres: 1.8 }),

  wallpaper: () => tex('wallpaper', 512, 512, (c, w, h, R) => { // Vasko floral
    c.fillStyle = '#d8cdb4'; c.fillRect(0, 0, w, h);
    const flower = (x, y, s, hue) => {
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * Math.PI * 2;
        c.fillStyle = hue;
        c.beginPath(); c.ellipse(x + Math.cos(a) * s * .55, y + Math.sin(a) * s * .55, s * .42, s * .28, a, 0, 7); c.fill();
      }
      c.fillStyle = '#b8964a'; c.beginPath(); c.arc(x, y, s * .22, 0, 7); c.fill();
    };
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const px = x * w / 5 + (y % 2) * w / 10, py = y * h / 5;
      c.strokeStyle = 'rgba(110,120,86,.55)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px, py + 40); c.quadraticCurveTo(px + 20, py + 10, px + 8, py - 20); c.stroke();
      flower(px, py, 22, R() > .5 ? 'rgba(168,96,102,.75)' : 'rgba(152,120,150,.7)');
      flower(px + 34, py + 30, 14, 'rgba(178,150,110,.6)');
    }
    blotch(c, w, h, R, 10, 'rgb(150,140,115)', 40, 140, 0.08);
    grain(c, w, h, R, 9);
  }, { metres: 1.6 }),

  churchstone: () => tex('churchstone', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#8a857a'; c.fillRect(0, 0, w, h);
    const bh = h / 6;
    for (let r = 0; r < 6; r++) {
      let x = -R() * 60;
      while (x < w) {
        const bw = 90 + R() * 110;
        const v = 118 + R() * 34;
        c.fillStyle = `rgb(${v},${v - 4},${v - 14})`;
        c.fillRect(x + 4, r * bh + 4, bw - 8, bh - 8);
        blotch(c, w, h, R, 1, 'rgb(70,66,58)', 10, 40, 0.10);
        x += bw;
      }
    }
    c.globalAlpha = .12;
    for (let i = 0; i < 4000; i++) { c.fillStyle = R() > .5 ? '#000' : '#fff'; c.fillRect(R() * w, R() * h, 2, 2); }
    c.globalAlpha = 1; grain(c, w, h, R, 12);
  }, { metres: 3.0 }),

  churchfloor: () => tex('churchfloor', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#6f6a60'; c.fillRect(0, 0, w, h);
    const s = w / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const dark = (x + y) % 2;
      const v = dark ? 78 + R() * 16 : 128 + R() * 22;
      c.fillStyle = `rgb(${v},${v - 3},${v - 10})`;
      c.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      blotch(c, w, h, R, 2, 'rgb(50,46,40)', 12, 44, 0.09);
    }
    grain(c, w, h, R, 14);
  }, { metres: 2.4 }),

  pewwood: () => tex('pewwood', 256, 512, (c, w, h, R) => {
    c.fillStyle = '#3a2617'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      c.strokeStyle = R() > .5 ? 'rgba(28,17,10,.55)' : 'rgba(112,78,46,.35)';
      c.lineWidth = .8 + R() * 2.4;
      const x = R() * w; c.beginPath(); c.moveTo(x, 0);
      c.bezierCurveTo(x + (R() - .5) * 24, h * .33, x + (R() - .5) * 24, h * .66, x + (R() - .5) * 14, h); c.stroke();
    }
    blotch(c, w, h, R, 8, 'rgb(160,120,70)', 20, 90, 0.07);
    grain(c, w, h, R, 10);
  }, { metres: 1.2 }),

  snow: () => tex('snow', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#c6d2de'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 60, 'rgb(255,255,255)', 20, 110, 0.16);
    blotch(c, w, h, R, 24, 'rgb(150,166,186)', 25, 90, 0.13);
    c.globalAlpha = .3;
    for (let i = 0; i < 9000; i++) { c.fillStyle = '#fff'; c.fillRect(R() * w, R() * h, 1.5, 1.5); }
    c.globalAlpha = 1; grain(c, w, h, R, 7);
  }, { metres: 3.2 }),

  asphalt: () => tex('asphalt', 512, 512, (c, w, h, R) => {
    // Twenty-year-old asphalt is grey, not black. It read as a hole in
    // the world next to the pavement when it was mixed at #26292d.
    c.fillStyle = '#43464a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = 44 + R() * 62;
      c.fillStyle = `rgba(${v},${v + 2},${v + 5},.7)`;
      c.fillRect(R() * w, R() * h, 1.6, 1.6);
    }
    // the aggregate that has come up through the surface
    for (let i = 0; i < 2600; i++) {
      const v = 104 + R() * 52;
      c.fillStyle = `rgba(${v},${v - 3},${v - 9},.5)`;
      c.fillRect(R() * w, R() * h, 2.2, 1.8);
    }
    // cracks
    c.strokeStyle = 'rgba(12,12,14,.85)';
    for (let i = 0; i < 7; i++) {
      c.lineWidth = .8 + R() * 1.6; c.beginPath();
      let x = R() * w, y = R() * h; c.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (R() - .5) * 90; y += (R() - .5) * 90; c.lineTo(x, y); }
      c.stroke();
    }
    blotch(c, w, h, R, 14, 'rgb(30,31,34)', 40, 160, 0.10);
    blotch(c, w, h, R, 9, 'rgb(112,113,116)', 30, 120, 0.07);
    grain(c, w, h, R, 16);
  }, { metres: 4.0 }),

  // Roadside grass, late August: more straw than green, mown once in
  // June. Reads at four metres a tile and dissolves into the fog beyond.
  grass: () => tex('grass', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#6a6b3c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const g = 86 + R() * 60, r = g - 14 + R() * 22, b = 40 + R() * 26;
      c.fillStyle = `rgba(${r},${g},${b},.55)`;
      c.fillRect(R() * w, R() * h, 1.2, 2.5 + R() * 4);
    }
    for (let i = 0; i < 1400; i++) {
      const v = 150 + R() * 60;
      c.fillStyle = `rgba(${v},${v - 20},${v - 80},.35)`;
      c.fillRect(R() * w, R() * h, 1, 3 + R() * 6);
    }
    blotch(c, w, h, R, 12, 'rgb(60,66,34)', 24, 90, 0.18);
    blotch(c, w, h, R, 8, 'rgb(124,118,70)', 20, 70, 0.12);
    grain(c, w, h, R, 22);
  }, { metres: 4.0 }),

  // Dashboard vinyl. Black, matte, and the sun has been at it for nine years.
  vinyl: () => tex('vinyl', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#1d1e21'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const v = 22 + R() * 26;
      c.fillStyle = `rgba(${v},${v},${v + 2},.6)`;
      c.fillRect(R() * w, R() * h, 1.5, 1.5);
    }
    blotch(c, w, h, R, 5, 'rgb(54,52,50)', 14, 40, 0.10);
    grain(c, w, h, R, 10);
  }, { metres: 0.6 }),

  // Trees, as cards. A pine is a dark jagged triangle; a broadleaf is a
  // trunk with a lumpy crown. Painted with alpha and hung on two crossed
  // planes, which is what a tree was on every machine this game is
  // pretending to be, and what it still is at a hundred metres in fog.
  pine: () => tex('pine', 128, 256, (c, w, h, R) => {
    c.clearRect(0, 0, w, h);
    const trunkY = h - 8;
    c.fillStyle = '#2a2119'; c.fillRect(w / 2 - 3, h * 0.62, 6, h * 0.38);
    const tiers = 22;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const y = 10 + t * (h * 0.78);
      const half = 3 + t * (w * 0.44);
      const g = 52 + R() * 30 - t * 14, r = g * 0.7, b = g * 0.72;
      c.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      c.beginPath();
      c.moveTo(w / 2, y - 10);
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        c.lineTo(w / 2 + (u - 0.5) * 2 * half, y + 10 + (k % 2 ? 6 : 0) + R() * 5);
      }
      c.closePath(); c.fill();
    }
    // darker underside, a touch of light on the sunward edge
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(10,14,10,.35)'; c.fillRect(0, 0, w * 0.5, h);
    c.fillStyle = 'rgba(120,130,70,.18)'; c.fillRect(w * 0.6, 0, w * 0.4, h);
    c.globalCompositeOperation = 'source-over';
    grain(c, w, h, R, 26);
  }, { metres: 1, aniso: 4 }),
  broadleaf: () => tex('broadleaf', 192, 256, (c, w, h, R) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#3a2d22'; c.fillRect(w / 2 - 5, h * 0.5, 10, h * 0.5);
    c.fillStyle = '#2e241b';
    [[-1, 0.62], [1, 0.58], [-0.6, 0.5], [0.7, 0.46]].forEach(([d, yy]) => {
      c.beginPath(); c.moveTo(w / 2, h * 0.62); c.lineTo(w / 2 + d * w * 0.28, h * yy); c.lineTo(w / 2 + d * w * 0.30, h * yy + 4); c.lineTo(w / 2 + 2, h * 0.64); c.fill();
    });
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, rad = Math.pow(R(), 0.6) * w * 0.42;
      const x = w / 2 + Math.cos(a) * rad, y = h * 0.34 + Math.sin(a) * rad * 0.78;
      const r = 10 + R() * 22;
      const g = 70 + R() * 50 - (y / h) * 30, rr = g * 0.82, b = g * 0.5;
      c.fillStyle = `rgb(${rr | 0},${g | 0},${b | 0})`;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(12,16,8,.30)'; c.fillRect(0, h * 0.3, w, h);
    c.globalCompositeOperation = 'source-over';
    grain(c, w, h, R, 26);
  }, { metres: 1, aniso: 4 }),

  // Shop awning canvas: two-inch stripes, sun-bleached on the folds and
  // stained along the bottom edge where forty years of rain has run off it.
  awning: () => tex('awning', 256, 256, (c, w, h, R) => {
    const sw = w / 8;
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#cfc7b4' : '#3f6350';
      c.fillRect(i * sw, 0, sw, h);
      c.globalAlpha = .12;
      for (let k = 0; k < 60; k++) {
        c.fillStyle = R() > .5 ? '#000' : '#fff';
        c.fillRect(i * sw + R() * sw, R() * h, 1.5, 2 + R() * 6);
      }
      c.globalAlpha = 1;
    }
    // the run-off stain along the bottom
    const gr = c.createLinearGradient(0, h * 0.72, 0, h);
    gr.addColorStop(0, 'rgba(52,44,34,0)'); gr.addColorStop(1, 'rgba(52,44,34,.45)');
    c.fillStyle = gr; c.fillRect(0, h * 0.72, w, h * 0.28);
    blotch(c, w, h, R, 10, 'rgb(70,62,50)', 12, 44, 0.10);
    grain(c, w, h, R, 8);
  }, { metres: 1.2 }),

  // Pavement, as opposed to concrete-in-general: 1.2 m slabs with joints
  // between them. Sixty metres of untextured concrete is what makes a
  // street read as a grey rectangle you happen to be standing on.
  sidewalk: () => tex('sidewalk', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#8a8880'; c.fillRect(0, 0, w, h);
    const s = w / 2;                       // two 1.2 m slabs across the tile
    for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) {
      const v = 128 + Math.floor(R() * 26);
      c.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
      c.fillRect(gx * s + 3, gy * s + 3, s - 6, s - 6);
      // the brush finish, drawn across the slab
      c.globalAlpha = .06;
      for (let i = 0; i < 90; i++) {
        c.fillStyle = R() > .5 ? '#5e5c56' : '#d2cfc6';
        c.fillRect(gx * s + 4, gy * s + 4 + R() * (s - 8), s - 8, 1);
      }
      c.globalAlpha = 1;
      // one slab in a few is cracked corner to corner
      if (R() > .72) {
        c.strokeStyle = 'rgba(58,56,52,.7)'; c.lineWidth = 1.4;
        c.beginPath();
        let px = gx * s + 6 + R() * (s - 12), py = gy * s + 5;
        c.moveTo(px, py);
        for (let k = 0; k < 5; k++) { px += (R() - .5) * 40; py += (s - 10) / 5; c.lineTo(px, py); }
        c.stroke();
      }
    }
    // the joints
    c.fillStyle = 'rgba(52,50,46,.85)';
    c.fillRect(s - 3, 0, 6, h); c.fillRect(0, s - 3, w, 6);
    c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
    c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3);
    blotch(c, w, h, R, 22, 'rgb(96,94,88)', 18, 70, 0.11);
    blotch(c, w, h, R, 8, 'rgb(150,148,142)', 20, 60, 0.07);
    grain(c, w, h, R, 10);
  }, { metres: 2.4 }),

  concrete: () => tex('concrete', 512, 512, (c, w, h, R) => {
    c.fillStyle = '#8e8d88'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 40, 'rgb(110,108,102)', 20, 110, 0.10);
    blotch(c, w, h, R, 20, 'rgb(180,178,172)', 20, 80, 0.09);
    c.globalAlpha = .2;
    for (let i = 0; i < 7000; i++) { c.fillStyle = R() > .5 ? '#5a5954' : '#c8c6c0'; c.fillRect(R() * w, R() * h, 2, 2); }
    c.globalAlpha = 1; grain(c, w, h, R, 12);
  }, { metres: 3.0 }),

  rust: () => tex('rust', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#4b3a2c'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 50, 'rgb(140,70,30)', 8, 50, 0.22);
    blotch(c, w, h, R, 30, 'rgb(60,50,44)', 10, 60, 0.20);
    grain(c, w, h, R, 26);
  }, { metres: 1.0 }),

  tilefloor: () => tex('tilefloor', 512, 512, (c, w, h, R) => { // laundromat
    const s = w / 6;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const dark = (x + y) % 2;
      const v = dark ? 92 + R() * 12 : 196 + R() * 20;
      c.fillStyle = `rgb(${v},${v + 2},${v - 4})`;
      c.fillRect(x * s, y * s, s, s);
      c.globalAlpha = .1;
      for (let i = 0; i < 30; i++) { c.fillStyle = R() > .5 ? '#000' : '#fff'; c.fillRect(x * s + R() * s, y * s + R() * s, 3, 2); }
      c.globalAlpha = 1;
    }
    c.strokeStyle = 'rgba(60,60,58,.5)';
    for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    grain(c, w, h, R, 8);
  }, { metres: 3.0 }),

  ceiling: () => tex('ceiling', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#d6d2c6'; c.fillRect(0, 0, w, h);
    c.globalAlpha = .3;
    for (let i = 0; i < 4000; i++) { c.fillStyle = R() > .5 ? '#b6b1a4' : '#efece2'; c.beginPath(); c.arc(R() * w, R() * h, .8 + R() * 1.6, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    blotch(c, w, h, R, 6, 'rgb(160,150,120)', 30, 90, 0.10); // water stains
    grain(c, w, h, R, 8);
  }, { metres: 1.2 }),

  metalpainted: () => tex('metalpainted', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#b9bcbe'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 20, 'rgb(140,144,148)', 20, 80, 0.14);
    c.globalAlpha = .15;
    for (let i = 0; i < 400; i++) { c.fillStyle = '#6a5a4a'; c.beginPath(); c.arc(R() * w, R() * h, R() * 2, 0, 7); c.fill(); }
    c.globalAlpha = 1; grain(c, w, h, R, 9);
  }, { metres: 1.4 }),

  quilt: () => tex('quilt', 512, 512, (c, w, h, R) => {
    const cols = ['#8f5f52', '#6a7a5e', '#b6a276', '#5e6675', '#a9857a', '#d9cfae'];
    const s = w / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      c.fillStyle = cols[Math.floor(R() * cols.length)];
      c.fillRect(x * s, y * s, s, s);
      if (R() > .55) { c.fillStyle = cols[Math.floor(R() * cols.length)]; c.beginPath(); c.moveTo(x * s, y * s); c.lineTo(x * s + s, y * s); c.lineTo(x * s, y * s + s); c.fill(); }
    }
    c.strokeStyle = 'rgba(240,236,226,.35)'; c.lineWidth = 1.6; c.setLineDash([4, 4]);
    for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
    c.setLineDash([]);
    grain(c, w, h, R, 14);
  }, { metres: 1.5 }),

  /* ------------------------------------------------------------------
     Street furniture and the things standing on the pavement. These are
     the textures that turn a box on the kerb into a thing somebody
     bolted there in 1971 and has not looked at since. */

  /** Bark. Vertical fissures, ridges catching light, a little lichen.
      v runs up the trunk, u wraps round it. */
  bark: () => tex('bark', 256, 512, (c, w, h, R) => {
    c.fillStyle = '#4a4036'; c.fillRect(0, 0, w, h);
    // ridges: long wandering vertical strokes, lighter
    for (let i = 0; i < 70; i++) {
      const x0 = R() * w, wdt = 3 + R() * 9;
      const v = 78 + R() * 40;
      c.strokeStyle = `rgba(${v},${v - 10},${v - 20},.75)`; c.lineWidth = wdt;
      c.beginPath(); c.moveTo(x0, -10);
      let x = x0;
      for (let y = 0; y <= h + 20; y += 40) { x += (R() - 0.5) * 12; c.lineTo(x, y); }
      c.stroke();
    }
    // fissures: narrow and dark, between the ridges
    for (let i = 0; i < 90; i++) {
      const x0 = R() * w;
      c.strokeStyle = `rgba(18,14,10,${0.5 + R() * 0.4})`; c.lineWidth = 1 + R() * 2.5;
      c.beginPath(); c.moveTo(x0, R() * h * 0.4 - 20);
      let x = x0;
      const len = h * (0.3 + R() * 0.8);
      for (let y = 0; y <= len; y += 30) { x += (R() - 0.5) * 9; c.lineTo(x, y); }
      c.stroke();
    }
    blotch(c, w, h, R, 14, 'rgb(120,130,90)', 8, 28, 0.14);   // lichen
    blotch(c, w, h, R, 20, 'rgb(20,16,12)', 20, 70, 0.18);
    grain(c, w, h, R, 18);
  }, { metres: 1.0, aniso: 4 }),

  /** A clump of leaves on a transparent card. Three or four of these
      crossed at a limb end is a canopy; the alpha edge is what stops it
      being a ball. `season` is summer, autumn or dead. */
  foliage: (season = 'summer') => tex('foliage_' + season, 256, 256, (c, w, h, R) => {
    c.clearRect(0, 0, w, h);
    const PAL = {
      summer: [[58, 74, 40], [70, 88, 46], [46, 60, 34], [84, 98, 52], [38, 50, 30]],
      autumn: [[120, 84, 36], [96, 62, 30], [140, 104, 40], [76, 58, 34], [110, 70, 28]],
      dead:   [[72, 58, 40], [58, 48, 34], [84, 70, 50], [48, 40, 30]]
    }[season];
    const cx = w / 2, cy = h / 2 - 8;
    // the mass, built from overlapping leaf-sized ellipses in a ragged disc
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2, rad = Math.pow(R(), 0.55) * w * 0.40;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.92;
      const rr = 6 + R() * 12;
      const col = PAL[Math.floor(R() * PAL.length)];
      const shade = 1 - (y / h) * 0.35 + (R() - 0.5) * 0.2;   // darker low down
      c.fillStyle = `rgb(${col[0] * shade | 0},${col[1] * shade | 0},${col[2] * shade | 0})`;
      c.beginPath(); c.ellipse(x, y, rr, rr * (0.55 + R() * 0.5), R() * 3, 0, 7); c.fill();
    }
    // a few leaves hanging off the edge on their own, which is the part
    // the eye uses to decide this is foliage and not a cushion
    for (let i = 0; i < 40; i++) {
      const a = R() * Math.PI * 2, rad = w * (0.38 + R() * 0.1);
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad * 0.92;
      const col = PAL[Math.floor(R() * PAL.length)];
      c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      c.beginPath(); c.ellipse(x, y, 5 + R() * 5, 3 + R() * 3, a, 0, 7); c.fill();
    }
    // twigs showing through
    c.strokeStyle = 'rgba(40,30,22,.7)'; c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = R() * Math.PI * 2;
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * w * 0.28); c.stroke();
    }
    grain(c, w, h, R, 16);
  }, { metres: 1, aniso: 4 }),

  /** Bare winter twigs on a card, for the same trees in December. */
  twigs: () => tex('twigs', 256, 256, (c, w, h, R) => {
    c.clearRect(0, 0, w, h);
    const branch = (x, y, a, len, wd, depth) => {
      if (depth > 5 || len < 6) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      c.strokeStyle = `rgba(${40 + R() * 20},${32 + R() * 14},${24 + R() * 10},${0.75 + R() * 0.25})`;
      c.lineWidth = wd;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      const n = 2 + (R() > 0.6 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        branch(x2, y2, a + (R() - 0.5) * 1.4, len * (0.55 + R() * 0.3), wd * 0.68, depth + 1);
      }
    };
    for (let i = 0; i < 5; i++) {
      branch(w / 2 + (R() - 0.5) * 30, h - 4, -Math.PI / 2 + (R() - 0.5) * 1.6, 40 + R() * 30, 4, 0);
    }
    grain(c, w, h, R, 10);
  }, { metres: 1, aniso: 4 }),

  /** The side of a car. Near-white so the paint colour tints it, with
      the road's dirt along the sill, a dust film, and a few chips. */
  carside: () => tex('carside', 256, 128, (c, w, h, R) => {
    c.fillStyle = '#d9d9d9'; c.fillRect(0, 0, w, h);
    // a film of dust, heavier low down
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(150,140,120,0)'); g.addColorStop(0.62, 'rgba(150,140,120,.08)');
    g.addColorStop(0.86, 'rgba(95,85,70,.42)'); g.addColorStop(1, 'rgba(70,62,52,.62)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // splash streaks running up from the sill
    for (let i = 0; i < 60; i++) {
      const x = R() * w, len = 6 + R() * 30;
      c.fillStyle = `rgba(80,70,58,${0.08 + R() * 0.16})`;
      c.fillRect(x, h - len, 1 + R() * 3, len);
    }
    // the highlight along the shoulder of the panel
    c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(0, h * 0.06, w, 3);
    // chips and a rust bloom or two
    for (let i = 0; i < 14; i++) {
      c.fillStyle = R() > 0.5 ? 'rgba(40,36,32,.7)' : 'rgba(130,70,30,.6)';
      c.fillRect(R() * w, h * (0.5 + R() * 0.5), 1 + R() * 3, 1 + R() * 2);
    }
    grain(c, w, h, R, 6);
  }, { metres: 1, aniso: 4 }),

  /** Ribbed galvanised steel, the kind a litter bin is rolled from.
      Vertical ribs, a green-grey paint job, rust where the paint went. */
  steelribbed: () => tex('steelribbed', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#5f6a60'; c.fillRect(0, 0, w, h);
    const rib = 16;
    for (let x = 0; x < w; x += rib) {
      const g = c.createLinearGradient(x, 0, x + rib, 0);
      g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(0.35, 'rgba(255,255,255,.14)');
      g.addColorStop(0.6, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(0,0,0,.40)');
      c.fillStyle = g; c.fillRect(x, 0, rib, h);
    }
    // rust running down from the rim and pooling at the bottom
    for (let i = 0; i < 26; i++) {
      const x = R() * w, len = 10 + R() * 60;
      c.fillStyle = `rgba(130,72,30,${0.15 + R() * 0.3})`;
      c.fillRect(x, 0, 2 + R() * 3, len);
    }
    blotch(c, w, h, R, 18, 'rgb(120,66,28)', 8, 30, 0.28);
    blotch(c, w, h, R, 12, 'rgb(30,32,28)', 10, 40, 0.2);
    c.fillStyle = 'rgba(110,60,26,.35)'; c.fillRect(0, h - 14, w, 14);
    grain(c, w, h, R, 14);
  }, { metres: 1.0, aniso: 4 }),

  /** Painted cast iron and pressed steel: a mailbox, a hydrant, a meter.
      Light base so `color` tints it, with chips, scuffs and a drip or
      two of rust out of every seam. */
  enamel: () => tex('enamel', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#cfd0cc'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 24, 'rgb(160,160,156)', 18, 70, 0.18);
    blotch(c, w, h, R, 10, 'rgb(235,235,230)', 14, 50, 0.12);
    // scuffs: short horizontal scratches
    c.globalAlpha = .25;
    for (let i = 0; i < 120; i++) {
      c.fillStyle = R() > .5 ? '#fff' : '#777';
      c.fillRect(R() * w, R() * h, 3 + R() * 18, 1);
    }
    c.globalAlpha = 1;
    // chips down to primer and rust
    for (let i = 0; i < 40; i++) {
      const x = R() * w, y = R() * h;
      c.fillStyle = R() > 0.4 ? 'rgba(120,64,28,.85)' : 'rgba(70,66,60,.8)';
      c.beginPath(); c.ellipse(x, y, 1 + R() * 3, 1 + R() * 2, R() * 3, 0, 7); c.fill();
      if (R() > 0.6) { c.fillStyle = 'rgba(120,64,28,.3)'; c.fillRect(x - 1, y, 2, 6 + R() * 24); }
    }
    // a dirt film at the bottom edge
    const g = c.createLinearGradient(0, h * 0.7, 0, h);
    g.addColorStop(0, 'rgba(60,54,44,0)'); g.addColorStop(1, 'rgba(60,54,44,.45)');
    c.fillStyle = g; c.fillRect(0, h * 0.7, w, h * 0.3);
    grain(c, w, h, R, 10);
  }, { metres: 1.0, aniso: 4 }),

  /** The front page behind the glass of a newspaper box. */
  newsfront: () => tex('newsfront', 256, 320, (c, w, h, R) => {
    c.fillStyle = '#e4dcc6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1714';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 30px "Playfair Display", serif';
    c.fillText('ASHGROVE HERALD', w / 2, 26);
    c.fillRect(10, 44, w - 20, 2); c.fillRect(10, 48, w - 20, 1);
    c.font = '9px "JetBrains Mono", monospace';
    c.fillText('SUNDAY, AUGUST 24, 2014   ·   75 CENTS', w / 2, 58);
    c.textAlign = 'left';
    c.font = 'bold 22px "Playfair Display", serif';
    c.fillText('COUNCIL DELAYS NO. 9', 12, 84);
    c.fillText('REMEDIATION VOTE', 12, 108);
    // a photo
    c.fillStyle = '#7a7468'; c.fillRect(12, 124, 110, 84);
    c.fillStyle = '#4a463e'; c.fillRect(20, 150, 94, 50);
    c.fillStyle = '#a8a296'; c.fillRect(12, 124, 110, 30);
    // columns of body text
    c.fillStyle = '#3a3632';
    for (let col = 0; col < 2; col++) {
      const x0 = col === 0 ? 130 : 12, y0 = col === 0 ? 124 : 216;
      for (let y = y0; y < h - 8; y += 5) {
        if (col === 0 && y > 208 && y < 216) continue;
        c.fillRect(x0, y, (col === 0 ? 114 : 232) * (0.7 + R() * 0.3), 2);
      }
    }
    // fold crease and sun-yellowing
    c.fillStyle = 'rgba(90,80,60,.25)'; c.fillRect(0, h / 2 - 1, w, 2);
    blotch(c, w, h, R, 8, 'rgb(190,170,120)', 30, 90, 0.18);
    grain(c, w, h, R, 8);
  }, { metres: 1, aniso: 4 }),

  /** A knitted jumper, striped. Light base so a colour tints it. */
  stripes: () => tex('stripes', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#c8c4bc'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) { c.fillStyle = 'rgba(40,44,40,.55)'; c.fillRect(0, y, w, 11); }
    c.globalAlpha = .18;
    for (let y = 0; y < h; y += 2) { c.fillStyle = y % 4 ? '#fff' : '#000'; c.fillRect(0, y, w, 1); }
    c.globalAlpha = 1;
    grain(c, w, h, R, 12);
  }, { metres: 0.5, aniso: 4 }),

  /** A plaid shirt or jacket. Light base, tinted. */
  plaid: () => tex('plaid', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#c9b9a9'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(40,30,30,.35)';
    for (let i = 0; i < w; i += 32) { c.fillRect(i, 0, 12, h); c.fillRect(0, i, w, 12); }
    c.fillStyle = 'rgba(255,255,255,.18)';
    for (let i = 16; i < w; i += 32) { c.fillRect(i, 0, 3, h); c.fillRect(0, i, w, 3); }
    grain(c, w, h, R, 12);
  }, { metres: 0.6, aniso: 4 }),

  /** Denim and worsted: trousers. */
  trouser: () => tex('trouser', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#b8bcc4'; c.fillRect(0, 0, w, h);
    c.globalAlpha = .22;
    for (let i = 0; i < 2600; i++) { c.fillStyle = R() > .5 ? '#fff' : '#222'; c.fillRect(R() * w, R() * h, 1, 2); }
    c.globalAlpha = 1;
    // a seam
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(w / 2 - 1, 0, 2, h);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(w / 2 + 1, 0, 1, h);
    grain(c, w, h, R, 10);
  }, { metres: 0.6, aniso: 4 }),

  /** Pennsylvania Dutch hex rosette. `inverted` is the one under the paint. */
  hexsign: (inverted = false) => tex('hex' + inverted, 512, 512, (c, w, h, R) => {
    const cx = w / 2, cy = h / 2;
    c.fillStyle = inverted ? '#1c1a18' : '#f0ece0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = inverted ? '#7a2018' : '#1d3f7a'; c.lineWidth = 9;
    c.beginPath(); c.arc(cx, cy, 230, 0, 7); c.stroke();
    c.beginPath(); c.arc(cx, cy, 208, 0, 7); c.stroke();
    const pts = inverted ? 9 : 8;
    for (let i = 0; i < pts; i++) {
      const a = i / pts * Math.PI * 2 - Math.PI / 2;
      c.fillStyle = inverted
        ? (i % 2 ? '#8b1f16' : '#3a3430')
        : (i % 2 ? '#d8a33c' : '#2f6fb5');
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, 200, a - Math.PI / pts, a + Math.PI / pts);
      c.closePath(); c.fill();
      c.strokeStyle = inverted ? '#100e0d' : '#f5f2e8'; c.lineWidth = 4; c.stroke();
    }
    c.fillStyle = inverted ? '#0d0c0b' : '#f0ece0';
    c.beginPath(); c.arc(cx, cy, 74, 0, 7); c.fill();
    c.strokeStyle = inverted ? '#8b1f16' : '#1d3f7a'; c.lineWidth = 7; c.stroke();
    if (inverted) {
      c.fillStyle = '#8b1f16'; c.font = 'bold 62px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('12/21', cx, cy + 4);
      c.globalAlpha = .4; blotch(c, w, h, R, 30, 'rgb(0,0,0)', 20, 90, 0.5); c.globalAlpha = 1;
    }
    grain(c, w, h, R, 16);
  }, { metres: 1.2 }),

  staticnoise: () => tex('static', 256, 256, (c, w, h, R) => {
    const img = c.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = R() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { metres: 1 }),

  glass: () => tex('glass', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#0b0f14'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 14, 'rgb(60,80,100)', 10, 50, 0.2);
  }, { metres: 1 }),

  paper: () => tex('paper', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#e9e3d3'; c.fillRect(0, 0, w, h);
    blotch(c, w, h, R, 20, 'rgb(190,180,155)', 20, 80, 0.10);
    grain(c, w, h, R, 10);
  }, { metres: 0.4 }),

  fabricdark: () => tex('fabricdark', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#3b3630'; c.fillRect(0, 0, w, h);
    c.globalAlpha = .25;
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) {
      c.fillStyle = ((x / 3 + y / 3) % 2) ? '#4a443c' : '#2e2a25'; c.fillRect(x, y, 3, 3);
    }
    c.globalAlpha = 1; grain(c, w, h, R, 14);
  }, { metres: 0.9 }),

  /** Recca's barn coat, canvas duck, three sizes too big, her grandfather's. */
  barncoat: () => tex('barncoat', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#7a6746'; c.fillRect(0, 0, w, h);
    c.globalAlpha = .3;
    for (let y = 0; y < h; y += 2) { c.fillStyle = y % 4 ? '#8a7752' : '#6b5a3d'; c.fillRect(0, y, w, 2); }
    c.globalAlpha = 1;
    blotch(c, w, h, R, 26, 'rgb(60,50,34)', 12, 60, 0.16);
    blotch(c, w, h, R, 10, 'rgb(150,136,104)', 14, 50, 0.10);
    grain(c, w, h, R, 16);
  }, { metres: 1.0 }),

  // ---- car / sky (drive) ----------------------------------------------
  /** A cumulus on a transparent card: a shaded flat underside and a lit,
      lumpy top, heavy grain, drawn three ways by seed so a sky of them is
      not the same cloud over and over. Tinted by the sky preset. */
  cloud: (seed = 1) => tex('cloud' + seed, 256, 128, (c, w, h, R) => {
    c.clearRect(0, 0, w, h);
    const puffs = 9 + Math.floor(R() * 6);
    const base = h * 0.62, span = w * (0.30 + R() * 0.14);
    const disc = (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
    // the underside first: a flat dark slab
    for (let i = 0; i < puffs; i++) {
      const x = w / 2 + (R() - 0.5) * span * 2, y = base + (R() - 0.5) * 6;
      disc(x, y, 18 + R() * 26, 8 + R() * 6, 'rgb(150,150,154)');
    }
    // then the tops, lighter and higher toward the middle
    for (let i = 0; i < puffs * 2; i++) {
      const t = R();
      const x = w / 2 + (t - 0.5) * span * 2;
      const lift = (1 - Math.abs(t - 0.5) * 2) * h * 0.34;
      const y = base - lift * (0.4 + R() * 0.6);
      const r = 14 + R() * 22;
      const v = 205 + R() * 40 - (y / h) * 30;
      disc(x, y, r, r * (0.72 + R() * 0.3), `rgb(${v | 0},${v | 0},${(v - 4) | 0})`);
    }
    // a few bright crowns where the sun is on it
    for (let i = 0; i < 5; i++) {
      const x = w / 2 + (R() - 0.5) * span * 1.2, y = base - h * (0.18 + R() * 0.18);
      disc(x, y, 8 + R() * 12, 6 + R() * 8, 'rgb(244,244,246)');
    }
    // soften the lot into a cloud and not a pile of coins
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = 'rgba(255,255,255,.82)'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    grain(c, w, h, R, 34);
  }, { metres: 1, aniso: 2 }),

  /** Pine needles, tileable, for the tiers of a conifer: dark green with
      short strokes in every direction and the odd dead brown one. */
  needles: () => tex('needles', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#1f2a1c'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = R() * w, y = R() * h, a = R() * Math.PI * 2, l = 5 + R() * 9;
      const g = 38 + R() * 46, dead = R() > 0.93;
      c.strokeStyle = dead ? `rgba(${90 + R() * 40},${60 + R() * 20},30,.7)` : `rgba(${g * 0.62 | 0},${g | 0},${g * 0.55 | 0},.75)`;
      c.lineWidth = 1 + R();
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
      // wrap the ones that run off, so it tiles
      if (x + l > w || y + l > h) { c.beginPath(); c.moveTo(x - w, y - h); c.lineTo(x - w + Math.cos(a) * l, y - h + Math.sin(a) * l); c.stroke(); }
    }
    grain(c, w, h, R, 22);
  }, { metres: 0.7, aniso: 4 }),

  /** A steel wheel cover: dull silver, seven slots, a centre cap, road
      dirt round the rim. Drawn once and put on both faces of the wheel. */
  hubcap: () => tex('hubcap', 128, 128, (c, w, h, R) => {
    const cx = w / 2, cy = h / 2;
    c.fillStyle = '#141414'; c.fillRect(0, 0, w, h);               // the tyre face behind it
    c.fillStyle = '#2a2a2c'; c.beginPath(); c.arc(cx, cy, 60, 0, 7); c.fill();
    c.fillStyle = '#9a9a96'; c.beginPath(); c.arc(cx, cy, 46, 0, 7); c.fill();
    c.fillStyle = '#b4b4b0'; c.beginPath(); c.arc(cx, cy, 40, 0, 7); c.fill();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      c.save(); c.translate(cx, cy); c.rotate(a);
      c.fillStyle = '#3a3a3c'; c.beginPath(); c.ellipse(0, -28, 5, 9, 0, 0, 7); c.fill();
      c.restore();
    }
    c.fillStyle = '#c8c8c4'; c.beginPath(); c.arc(cx, cy, 13, 0, 7); c.fill();
    c.fillStyle = '#2b4e8a'; c.beginPath(); c.ellipse(cx, cy, 8, 5, 0, 0, 7); c.fill();   // the blue oval
    // dirt in the slots and round the edge
    for (let i = 0; i < 160; i++) {
      const a = R() * 7, r = 30 + R() * 30;
      c.fillStyle = `rgba(60,52,40,${0.05 + R() * 0.2})`;
      c.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2);
    }
    grain(c, w, h, R, 18);
  }, { metres: 1, aniso: 4 }),

  /** Kraft cardboard with a strip of brown tape and something written on
      it in marker. The boxes in the back of the car. */
  cardboard: () => tex('cardboard', 256, 256, (c, w, h, R) => {
    c.fillStyle = '#9a7a52'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(${120 + R() * 30},${95 + R() * 20},60,.18)`; c.fillRect(0, y, w, 1); }
    blotch(c, w, h, R, 14, 'rgb(70,52,30)', 16, 60, 0.12);
    c.fillStyle = 'rgba(120,78,40,.85)'; c.fillRect(0, h * 0.44, w, 22);       // tape
    c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, h * 0.44 + 2, w, 3);
    c.fillStyle = '#2a241e'; c.font = 'bold 26px "JetBrains Mono", monospace'; c.textAlign = 'left';
    c.fillText(['KITCHEN', 'BOOKS', 'BATH', 'MISC', 'J. HALE'][Math.floor(R() * 5)], 18, h * 0.28);
    c.fillStyle = 'rgba(40,30,20,.5)'; c.fillRect(0, h * 0.72, w, 2);            // the fold
    grain(c, w, h, R, 14);
  }, { metres: 0.8, aniso: 4 }),

  /** Grey seat velour, the kind every American car had in 1993. */
  velour: () => tex('velour', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#5a5c62'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 70 + R() * 50;
      c.fillStyle = `rgba(${v},${v + 2},${v + 8},.5)`;
      c.fillRect(R() * w, R() * h, 1 + R() * 2, 1);
    }
    // the stitched channels
    for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(30,30,36,.55)'; c.fillRect(x, 0, 2, h); }
    grain(c, w, h, R, 14);
  }, { metres: 0.5, aniso: 4 }),

  /** Dark plastic dash grain: the same as vinyl but finer and matte. */
  dashgrain: () => tex('dashgrain', 128, 128, (c, w, h, R) => {
    c.fillStyle = '#3a3836'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const v = 44 + R() * 26;
      c.fillStyle = `rgba(${v},${v - 2},${v - 4},.55)`;
      c.fillRect(R() * w, R() * h, 1, 1);
    }
    grain(c, w, h, R, 10);
  }, { metres: 0.4, aniso: 4 })
};

// ============================================================ MATERIALS
/* ============================================================ FACES
   Flat-shaded primitives will never sell a face. So the face is drawn,
   like every other texture in this game, on a canvas at runtime.

   The map is equirectangular for a sphere built with phiStart = -PI/2,
   which puts the front of the head in the middle column. Vertical is
   theta from the crown, so canvas y maps straight to head height, and
   horizontal distance has to be divided by sin(theta) as you go down
   the face or the chin comes out pinched.

   ============================================================ */
/**
 * Canvas rows for the landmarks, derived rather than eyeballed: a face
 * sits at fractions 0.25 / 0.42 / 0.50 / 0.68 / 0.78 / 1.0 of head height,
 * the sphere runs from the crown (row 0) to under the jaw (row 256), and
 * the chin lands at y = -0.62r. Put them lower than this and the mouth
 * ends up on the underside of the head, in permanent shadow.
 */
const FW = 256;
const row = (frac) => Math.acos(1 - 1.62 * frac) / Math.PI * FW;
const F = {
  hair: row(0.25), brow: row(0.42), eye: row(0.50),
  nose: row(0.68), mouth: row(0.78), chin: row(1.0)
};
export const FACE_W = FW;
export const FACE_ROW = F;
/**
 * Where the hair starts, in canvas rows, as a function of how far round
 * the head you are: `f` is 1 at the face, 0 at the ears, -1 at the nape.
 * The head geometry raises the hair exactly here, so the painted hairline
 * and the volume above it are the same line.
 */
export function hairlineY(f, { long = false, age = 0, female = 0 } = {}) {
  // a man's hairline sits higher, and it goes on rising; a woman's does not
  const base = F.hair - (1 - female) * 11 + age * (female ? 3 : -9);
  const temple = Math.exp(0 - ((f - 0.62) / 0.26) ** 2) * (long ? 3 : 9) * (1.4 - female * 0.5);
  return base + (1 - f) * (long ? 34 : 27) - temple;
}
/** equirect horizontal stretch at canvas row y */
const fx = (y) => 1 / Math.max(0.42, Math.sin(Math.PI * y / FW));

function col(hex, mul = 1, mix = null, t = 0) {
  const c = new THREE.Color(hex).multiplyScalar(mul);
  if (mix !== null) c.lerp(new THREE.Color(mix), t);
  return c;
}
const CSS = (hex, mul = 1, mix = null, t = 0) => '#' + col(hex, mul, mix, t).getHexString();
function RGBA(hex, a, mul = 1) {
  const c = col(hex, mul);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
}
/** soft radial smudge -- the whole trick of a low-res face is soft edges */
function smudge(c, x, y, rx, ry, colour, a) {
  c.save(); c.translate(x, y); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, colour.replace(/[\d.]+\)$/, a + ')'));
  g.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill();
  c.restore();
}

/**
 * One face. `shut` draws the same face with the eyes closed, which is
 * how blinking works: two textures and a swap.
 */
export function faceTex(o = {}, shut = false, gaze = null) {
  const {
    skin = 0xd8b49a, hair = 0x3a2b20, iris = 0x4a3a28, lipCol = 0xa06254,
    stubble = 0, age = 0, brow = 1, id = '', female = 0,
    eyeGap = 1, eyeW = 1, noseW = 1, mouthW = 1, browY = 0, lash = 0, freck = 0
  } = o;
  // Where the iris sits in its own socket, in canvas pixels. The head
  // turns to look at you and the eyes get there first, which is the
  // whole difference between somebody looking at you and a mask aimed
  // at you. See GAZE / _gaze in props.js.
  const gx = gaze ? gaze[0] : 0, gy = gaze ? gaze[1] : 0;
  const key = `face|${skin}|${hair}|${iris}|${lipCol}|${stubble}|${age}|${brow}|${id}|` +
    `${female}|${eyeGap}|${eyeW}|${noseW}|${mouthW}|${browY}|${lash}|${freck}|${shut ? 1 : 0}|${gx}|${gy}`;
  return tex(key, FW, FW, (c, w, h, R) => {
    const CX = w / 2;
    const dk = RGBA(skin, 1, 0.42);        // the shadow colour of this skin
    const lt = CSS(skin, 1, 0xffffff, 0.28);

    // ---- base skin, then the large soft masses: brow, cheeks, jaw
    c.fillStyle = CSS(skin, age ? 0.94 : 1, 0xffffff, age * 0.10);
    c.fillRect(0, 0, w, h);
    // the sides and back of a head are never as lit as the face
    const side = c.createLinearGradient(0, 0, w, 0);
    [0, .18, .5, .82, 1].forEach((p, i) => side.addColorStop(p, RGBA(skin, [0.62, 0.80, 1, 0.80, 0.62][i] * 0.5 + 0.5, [0.62, 0.80, 1, 0.80, 0.62][i])));
    c.fillStyle = side; c.globalAlpha = 0.5; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    smudge(c, CX, F.brow - 4, 62, 26, RGBA(skin, 1, 1.10), 0.5);          // forehead
    smudge(c, CX, F.chin + 40, 74, 30, dk, 0.34);                          // under the jaw
    smudge(c, CX, 10, 90, 34, dk, 0.22);                                   // crown
    [-1, 1].forEach(sd => {
      smudge(c, CX + sd * 40 * fx(F.nose), F.nose - 8, 26, 22, RGBA(0xb2694f, 1), 0.10);  // cheek
      smudge(c, CX + sd * 60 * fx(F.brow), F.brow, 20, 30, dk, 0.20);      // temple
      smudge(c, CX + sd * 54 * fx(F.mouth), F.mouth + 6, 20, 24, dk, 0.15); // jaw side
    });

    // ---- hair. front hairline high, sides lower, nape lowest.
    const hairAt = (x) => hairlineY(Math.cos(2 * Math.PI * (x / w - 0.5)), { long: o.long, age, female });
    c.fillStyle = CSS(hair);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0);
    for (let x = w; x >= 0; x -= 2) c.lineTo(x, hairAt(x) + Math.sin(x * 0.21) * 2.5);
    c.closePath(); c.fill();
    // strands, so it is not a plastic cap
    for (let i = 0; i < 700; i++) {
      const x = R() * w, y0 = hairAt(x), y = R() * (y0 + 6);
      if (y > y0 + 4) continue;
      c.strokeStyle = RGBA(hair, 0.10 + R() * 0.22, 0.5 + R() * 1.4);
      c.lineWidth = 0.6 + R() * 1.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - .5) * 5, y + 6 + R() * 12); c.stroke();
    }
    // feathered hairline
    for (let i = 0; i < 150; i++) {
      const x = R() * w, y0 = hairAt(x);
      c.fillStyle = RGBA(hair, 0.05 + R() * 0.10);
      c.fillRect(x, y0 + R() * 5, 1 + R(), 1 + R() * 2);
    }
    smudge(c, CX, F.hair + 6, 70, 12, dk, 0.30);        // the hair's own shadow on the brow

    // ---- brows
    if (brow) {
      const spread = female ? 3.2 : 5, thick = female ? 1.1 : 1.7;
      [-1, 1].forEach(sd => {
        const bx = CX + sd * 30 * eyeGap * fx(F.brow), by = F.brow - browY - female * 3;
        for (let i = 0; i < (female ? 70 : 95); i++) {
          const t = R();
          const x = bx + sd * (t - 0.5) * 34 * eyeGap;
          const y = by - Math.sin(t * Math.PI) * (female ? 4 : 3) + (R() - .5) * spread + t * 2;
          c.strokeStyle = RGBA(hair, (female ? 0.20 : 0.25) + R() * 0.42, 0.7 + R() * 0.5);
          c.lineWidth = 0.8 + R() * thick;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + sd * (2 + R() * 4), y - 1 + R() * 2); c.stroke();
        }
      });
    }

    // ---- eyes
    [-1, 1].forEach(sd => {
      const ex = CX + sd * 25 * eyeGap * fx(F.eye), ey = F.eye;
      const EW = 12 * eyeW, EH = 8.4 * (0.9 + eyeW * 0.2);
      smudge(c, ex, ey + 1, 19, 14, dk, 0.30);                     // socket
      smudge(c, ex, ey + 9, 15, 7, dk, age * 0.30);                // the bag under it
      if (shut) {
        c.fillStyle = CSS(skin, 0.94);
        c.beginPath(); c.ellipse(ex, ey, 13, 7, 0, 0, 7); c.fill();
        c.strokeStyle = RGBA(skin, 0.85, 0.35); c.lineWidth = 2;
        c.beginPath(); c.moveTo(ex - 12, ey + 1); c.quadraticCurveTo(ex, ey + 4, ex + 12, ey); c.stroke();
      } else {
        // sclera, never white
        c.fillStyle = CSS(0xd9d2c4);
        c.beginPath();
        c.moveTo(ex - EW, ey + 1);
        c.quadraticCurveTo(ex - 2, ey - EH, ex + EW * 0.92, ey - 1);
        c.quadraticCurveTo(ex - 1, ey + EH * 0.85, ex - EW, ey + 1);
        c.fill();
        c.save(); c.clip();
        // The iris rides inside the clip, so an eye turned all the way
        // to one corner is cut by the lid the way a real one is.
        const ix = ex + sd * 1 + gx, iy = ey - 1 + gy;
        c.fillStyle = CSS(iris);
        c.beginPath(); c.arc(ix, iy, 6.2, 0, 7); c.fill();
        c.fillStyle = RGBA(iris, 0.5, 0.55);
        c.beginPath(); c.arc(ix, iy, 6.2, 0, 7); c.lineWidth = 1.6; c.strokeStyle = RGBA(iris, .7, .4); c.stroke();
        c.fillStyle = '#120e0a';
        c.beginPath(); c.arc(ix, iy, 2.7, 0, 7); c.fill();
        // the catchlight does not travel with the eye: it is the window
        // behind the player, and the window does not move
        c.fillStyle = 'rgba(255,255,255,.55)';
        c.beginPath(); c.arc(ex + sd * 1 - 2, ey - 3.4, 1.3, 0, 7); c.fill();
        // the lash line, which is what actually reads at this size
        c.strokeStyle = RGBA(hair, 0.85, 0.6); c.lineWidth = 2.2 + lash * 1.8;
        c.beginPath(); c.moveTo(ex - EW, ey + 1); c.quadraticCurveTo(ex - 2, ey - EH, ex + EW * 0.92, ey - 1); c.stroke();
        c.restore();
        if (lash) {                       // lashes, drawn one at a time
          c.strokeStyle = RGBA(hair, 0.45, 0.5); c.lineWidth = 0.9;
          for (let i = 0; i < 9; i++) {
            const u = i / 8, lx = ex - EW + u * EW * 1.9;
            const ly = ey + 1 - Math.sin(u * Math.PI) * EH * 0.95;
            c.beginPath(); c.moveTo(lx, ly);
            c.lineTo(lx + sd * 1.2, ly - 1.4 - lash * 1.2); c.stroke();
          }
        }
        c.strokeStyle = RGBA(skin, 0.5, 0.7); c.lineWidth = 1;
        c.beginPath(); c.moveTo(ex - 11, ey + 3); c.quadraticCurveTo(ex - 1, ey + 8, ex + 11, ey + 1); c.stroke();
      }
      // lid crease
      c.strokeStyle = RGBA(skin, 0.30, 0.6); c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(ex - 12, ey - 6); c.quadraticCurveTo(ex - 1, ey - 12, ex + 12, ey - 5); c.stroke();
    });

    // ---- nose: a ridge highlight, two shadows, a tip, two nostrils
    smudge(c, CX, F.nose - 26, 8, 28, RGBA(skin, 1, 1.10), 0.30);
    [-1, 1].forEach(sd => {
      smudge(c, CX + sd * 13 * noseW, F.nose - 20, 7 * noseW, 24, dk, 0.16);
      smudge(c, CX + sd * 12 * noseW, F.nose - 2, 7 * noseW, 6, dk, 0.18);
      c.fillStyle = RGBA(skin, 0.40, 0.42);
      c.save(); c.translate(CX + sd * 7.5 * noseW, F.nose - 2); c.rotate(sd * 0.6);
      c.beginPath(); c.ellipse(0, 0, 2.8 * noseW, 1.7, 0, 0, 7); c.fill(); c.restore();
    });
    smudge(c, CX, F.nose + 6, 15, 4, dk, 0.22);                        // under it

    // ---- mouth
    const mw = 17.5 * mouthW * fx(F.mouth);
    const lipH = female ? 1.35 : 1;
    c.fillStyle = RGBA(lipCol, 0.40 - age * 0.12, 1.0);
    c.beginPath();
    c.moveTo(CX - mw, F.mouth);
    c.quadraticCurveTo(CX - mw * 0.5, F.mouth - 7 * lipH, CX, F.mouth - 3.5 * lipH);
    c.quadraticCurveTo(CX + mw * 0.5, F.mouth - 7 * lipH, CX + mw, F.mouth);
    c.quadraticCurveTo(CX, F.mouth + 10 * lipH, CX - mw, F.mouth);
    c.fill();
    smudge(c, CX, F.mouth + 4, mw * 0.75, 4, RGBA(lipCol, 0.5, 1.35), 0.30); // lower lip catches light
    c.strokeStyle = RGBA(lipCol, 0.55, 0.34); c.lineWidth = 2.0;
    c.beginPath();
    c.moveTo(CX - mw, F.mouth);
    c.quadraticCurveTo(CX - mw * 0.45, F.mouth + 2.5, CX, F.mouth + 1);
    c.quadraticCurveTo(CX + mw * 0.45, F.mouth + 2.5, CX + mw, F.mouth); c.stroke();
    [-1, 1].forEach(sd => smudge(c, CX + sd * mw, F.mouth + 1, 5, 4, dk, 0.32));
    smudge(c, CX, F.mouth + 12, 16, 6, dk, 0.20);                       // under the lip
    smudge(c, CX, F.chin - 2, 20, 14, RGBA(skin, 1, 1.10), 0.35);       // chin

    // ---- age: the folds that put forty years on a face
    if (age) {
      [-1, 1].forEach(sd => {
        c.strokeStyle = RGBA(skin, 0.16 * age, 0.62); c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(CX + sd * 10, F.nose + 3);
        c.quadraticCurveTo(CX + sd * 22, F.nose + 10, CX + sd * (mw - 1), F.mouth + 2);
        c.stroke();
        c.strokeStyle = RGBA(skin, 0.18 * age, 0.62); c.lineWidth = 1.1;
        c.beginPath(); c.moveTo(CX + sd * 34, F.eye + 2);
        c.quadraticCurveTo(CX + sd * 41, F.eye + 5, CX + sd * 43, F.eye + 10); c.stroke();
      });
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = RGBA(skin, 0.12 * age, 0.62); c.lineWidth = 1.3;
        const y = F.brow - 14 - i * 8;
        c.beginPath(); c.moveTo(CX - 34, y);
        c.quadraticCurveTo(CX, y - 3.5, CX + 34, y); c.stroke();
      }
    }

    // ---- stubble
    if (stubble) {
      for (let i = 0; i < 2600; i++) {
        const a = R() * Math.PI * 2, rr = Math.sqrt(R());
        const x = CX + Math.cos(a) * rr * 46 * fx(F.mouth);
        const y = F.mouth + 6 + Math.sin(a) * rr * 30;
        if (y < F.nose - 2 && Math.abs(x - CX) < 20) continue;      // not on the nose
        if (Math.hypot((x - CX) / 24, (y - F.mouth) / 9) < 1) continue;  // not on the lips
        c.fillStyle = RGBA(hair, (0.04 + R() * 0.09) * stubble, 1.25);
        c.fillRect(x, y, 1.3, 1.3);
      }
      smudge(c, CX, F.mouth + 14, 40, 22, RGBA(hair, 1, 1.2), 0.05 * stubble);
    }

    // ---- ears, painted where the ear meshes sit (a quarter turn round)
    [-1, 1].forEach(sd => {
      const ax = CX + sd * w * 0.25;
      smudge(c, ax, F.eye + 8, 12, 20, dk, 0.24);
      c.strokeStyle = RGBA(skin, 0.55, 0.45); c.lineWidth = 2;
      c.beginPath(); c.arc(ax, F.eye + 8, 7, sd > 0 ? -1.2 : 2, sd > 0 ? 1.4 : 4.5); c.stroke();
    });

    if (female) {                        // colour in the cheeks and the lip
      [-1, 1].forEach(sd => smudge(c, CX + sd * 36 * fx(F.nose), F.nose - 6, 22, 16,
        RGBA(0xc4736a, 1), 0.12));
    }
    if (freck) {
      for (let i = 0; i < 120 * freck; i++) {
        const a2 = R() * Math.PI * 2, rr = Math.sqrt(R());
        const x = CX + Math.cos(a2) * rr * 34, y = F.nose - 16 + Math.sin(a2) * rr * 12;
        c.fillStyle = RGBA(0x8a5236, 0.07 + R() * 0.10);
        c.fillRect(x, y, 1.1, 1.1);
      }
    }
    grain(c, w, h, R, 9);
  }, { metres: 1, aniso: 4 });
}

/**
 * Hair. Vertical strands, dark at the root, catching light at the tips,
 * with enough variation that a lathe of it does not read as plastic.
 * Maps around a hair shell: u wraps, v runs root to tip.
 */
export function hairTex(color, id = '') {
  return tex(`hair|${color}|${id}`, 256, 256, (c, w, h, R) => {
    c.fillStyle = CSS(color, 0.86); c.fillRect(0, 0, w, h);
    // roots darker, tips lighter
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, RGBA(color, 0.55, 0.42));
    g.addColorStop(0.35, RGBA(color, 0.18, 0.8));
    g.addColorStop(1, RGBA(color, 0.30, 1.35));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = R() * w, y = R() * h * 0.9;
      const len = 30 + R() * 150;
      c.strokeStyle = RGBA(color, 0.05 + R() * 0.30, 0.55 + R() * 1.15);
      c.lineWidth = 0.5 + R() * 2.2;
      c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + (R() - .5) * 8, y + len * 0.4,
        x + (R() - .5) * 12, y + len * 0.7, x + (R() - .5) * 16, y + len);
      c.stroke();
    }
    // a few bright filaments, which is what sells hair at a distance
    for (let i = 0; i < 90; i++) {
      const x = R() * w, y = R() * h * 0.7;
      c.strokeStyle = RGBA(color, 0.10 + R() * 0.22, 1.7 + R() * 0.8);
      c.lineWidth = 0.6 + R();
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + (R() - .5) * 10, y + 40, x + (R() - .5) * 18, y + 70 + R() * 60);
      c.stroke();
    }
    grain(c, w, h, R, 7);
  }, { metres: 1, aniso: 4 });
}

/** Material for a hair shell. Cheap, and it takes the scene's light. */
export function hairMat(color, id = '') {
  const k = `hairmat|${color}|${id}`;
  if (MCACHE.has(k)) return MCACHE.get(k);
  const t = hairTex(color, id);
  const m = new THREE.MeshStandardMaterial({
    map: t, roughness: 0.72, metalness: 0, side: THREE.DoubleSide
  });
  m.normalMap = normalOf(t, 1.4);
  m.normalScale = new THREE.Vector2(0.55, 0.55);
  MCACHE.set(k, m);
  return m;
}

/** The material for a head. Cloned per character so one can blink alone. */
export function faceMat(o = {}) {
  const t = faceTex(o);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.80, metalness: 0 });
  m.normalMap = normalOf(t, 0.9);
  m.normalScale = new THREE.Vector2(0.35, 0.35);
  m.userData.faceOpen = t;
  m.userData.faceShut = faceTex(o, true);
  return m;
}

const MCACHE = new Map();

/**
 * PBR material from a procedural texture.
 * `scale` is in metres of the surface the texture tiles across.
 */
export function mat(name, texFn, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (MCACHE.has(key)) return MCACHE.get(key);
  const t = texFn();
  const m = new THREE.MeshStandardMaterial({
    map: t,
    roughness: opts.roughness ?? 0.86,
    metalness: opts.metalness ?? 0.0,
    color: opts.color ?? 0xffffff,
    side: opts.side ?? THREE.FrontSide,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1
  });
  if (opts.normal !== false) {
    m.normalMap = normalOf(t, opts.normalStrength ?? 1.6);
    m.normalScale = new THREE.Vector2(opts.normalScale ?? 0.7, opts.normalScale ?? 0.7);
  }
  m.userData.metres = t.userData.metres;
  MCACHE.set(key, m);
  return m;
}

/** Clone a material with its own UV repeat, sized in world metres. */
/*
   A tiled surface used to clone its colour and normal maps outright, so
   every wall and every floor in Ashgrove carried its own pair of Texture
   objects. Three shares the underlying GL texture between clones of one
   source, so this was never the VRAM disaster it looks like -- but it is
   a few hundred needless objects per chapter, each with its own entry in
   the renderer's property tables, and each one a distinct texture as far
   as the render-list sort is concerned, which breaks up runs of
   identical material state.

   The only thing that varies between them is `repeat`, so cache on it.
   Nothing in the game mutates a tiled material's map after the fact (the
   one place that animates an offset, the television in props.js, clones
   its own texture and never goes through here), so these are safe to
   share. They are also deliberately never disposed: the cache is bounded
   by the set of distinct surface sizes in the game, and the whole point
   is that the next chapter gets to reuse them.
*/
const TILECACHE = new Map();

function repeated(baseTex, rx, ry) {
  const key = `${baseTex.uuid}|${rx}|${ry}`;
  let t = TILECACHE.get(key);
  if (!t) {
    t = baseTex.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    TILECACHE.set(key, t);
  }
  return t;
}

export function tiled(baseMat, worldW, worldH) {
  const m = baseMat.clone();
  const met = baseMat.userData.metres || 1;
  const rx = Math.max(0.05, worldW / met), ry = Math.max(0.05, worldH / met);
  m.map = repeated(baseMat.map, rx, ry);
  if (baseMat.normalMap) m.normalMap = repeated(baseMat.normalMap, rx, ry);
  return m;
}

/** Flat colour material, used for the cheap props that fill surfaces. */
export function flat(color, { rough = 0.8, metal = 0.0, emissive = 0x000000, ei = 1, transparent = false, opacity = 1, side } = {}) {
  const key = `flat${color}${rough}${metal}${emissive}${ei}${transparent}${opacity}${side}`;
  if (MCACHE.has(key)) return MCACHE.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei,
    transparent, opacity, side: side ?? THREE.FrontSide
  });
  MCACHE.set(key, m);
  return m;
}

export const MAT = {
  get plaster() { return mat('plaster', T.plaster, { roughness: .95 }); },
  get wood() { return mat('woodfloor', T.woodfloor, { roughness: .72 }); },
  get lino() { return mat('lino', T.lino, { roughness: .55 }); },
  get carpet() { return mat('carpet', T.carpet, { roughness: 1.0, normalStrength: 2.4 }); },
  get brick() { return mat('brick', T.brick, { roughness: .95 }); },
  get shingle() { return mat('shingle', T.shingle, { roughness: .93 }); },
  get wallpaper() { return mat('wallpaper', T.wallpaper, { roughness: .92 }); },
  get stone() { return mat('churchstone', T.churchstone, { roughness: .96 }); },
  get churchfloor() { return mat('churchfloor', T.churchfloor, { roughness: .72 }); },
  get pew() { return mat('pewwood', T.pewwood, { roughness: .48 }); },
  get snow() { return mat('snow', T.snow, { roughness: .82 }); },
  get asphalt() { return mat('asphalt', T.asphalt, { roughness: .93 }); },
  get concrete() { return mat('concrete', T.concrete, { roughness: .94 }); },
  get sidewalk() { return mat('sidewalk', T.sidewalk, { roughness: .93 }); },
  get awning() { return mat('awning', T.awning, { roughness: .96 }); },
  get rust() { return mat('rust', T.rust, { roughness: .88, metalness: .35 }); },
  get tile() { return mat('tilefloor', T.tilefloor, { roughness: .38 }); },
  get ceiling() { return mat('ceiling', T.ceiling, { roughness: .98 }); },
  get metal() { return mat('metalpainted', T.metalpainted, { roughness: .42, metalness: .55 }); },
  get quilt() { return mat('quilt', T.quilt, { roughness: .95, normalStrength: 2.0 }); },
  get fabric() { return mat('fabricdark', T.fabricdark, { roughness: .98 }); },
  get coat() { return mat('barncoat', T.barncoat, { roughness: .95 }); },
  get grass() { return mat('grass', T.grass, { roughness: 1.0, normalStrength: 1.0 }); },
  get vinyl() { return mat('vinyl', T.vinyl, { roughness: .82, normalStrength: 0.8 }); },
  get paper() { return mat('paper', T.paper, { roughness: .9 }); },
  get glass() { return new THREE.MeshPhysicalMaterial({ color: 0x8fa6b8, roughness: .06, metalness: 0, transmission: .82, thickness: .02, transparent: true, opacity: .32 }); }
};
