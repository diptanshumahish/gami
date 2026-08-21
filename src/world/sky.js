/* ============================================================
   sky.js: the sky over Ashgrove.

   Everything else in this game is drawn on a canvas at runtime
   and so is this: an equirectangular plate painted into a
   1024x512 context and hung on a dome that rides with the
   camera. A flat `scene.background` colour is a wall, not a
   sky, and standing on the landing at 118 1/2 looking south
   used to be twelve hundred pixels of one blue.

   Stops are given as [elevation in degrees, colour], zenith
   last. They are spaced by ELEVATION and not by pixel because
   the camera sits on the horizon: everything above about forty
   degrees is off the top of the frame, so the colour has to be
   crowded into the first twenty or it is never seen.

   The dome is small, rides with the camera and does not test
   depth, so it can never be clipped by the far plane and can
   never occlude anything. It is simply the first thing painted.
   ============================================================ */
import * as THREE from 'three';

import { SHAPE } from './world.js';
import { T } from './mat.js';
const D2R = Math.PI / 180;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const rng = (seed) => {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const smooth = (t) => t * t * (3 - 2 * t);

/* ---------------------------------------------------------------- presets
   Ashgrove is at 41°N in a valley running north-east. The three that
   matter are: the afternoon Jared moves in, the dusk he says "come in",
   and the small hours of every chapter after that.

   `sun`/`moon` `dir` points FROM the world TOWARDS the body, which is the
   negation of the direction you hand `world.sun()`. */
export const SKY_PRESETS = {
  /* Late August, about half past five. Clear, one bank of fair-weather
     cumulus sitting on the ridge, sun still well up in the south-east. */
  afternoon: {
    // Late August, about half past five, and hazy: high cloud most of the
    // way over, the sun a bright patch behind it rather than a disc. This
    // is a valley town in a bad decade, not a postcard, and a clear cobalt
    // sky over it was the wrong film.
    stops: [
      [-90, '#1e2124'], [-25, '#282c30'], [-6, '#5f6a71'], [-1, '#98a2a4'],
      [0, '#b2b8b4'], [2, '#a3adb1'], [5, '#8f9daa'], [10, '#7a8b9c'],
      [18, '#657a8f'], [30, '#556c84'], [50, '#48607a'], [90, '#3e5670']
    ],
    sun: { dir: [0.275, 0.40, 0.45], core: '#f6ecd8', glow: '#c9bda6', halo: 52, disc: 0 },
    clouds: { cover: 0.9, top: 44, lit: '#c6c9c6', shade: '#5e6a76', seed: 11, scale: 1.5 },
    stars: 0,
    fog: 0x8e9aa2, background: 0x7f8d97
  },

  /* Twenty minutes before that: the last of the sun, low in the west,
     coming in under the cloud. This is the sky the drive in happens
     under, and it is the one postcard the game allows itself, because
     the next time he is on a road out of town it will be snowing and
     dark and there will be somebody in the passenger seat. */
  golden: {
    stops: [
      [-90, '#1c1a1e'], [-20, '#2a2428'], [-5, '#6b4f47'], [-1, '#c48a5e'],
      [0, '#f2b36c'], [1.5, '#f4bb74'], [4, '#e49a66'], [8, '#c6765d'],
      [14, '#9c5f66'], [22, '#6e4f6e'], [34, '#4a4470'], [55, '#2f3a66'], [90, '#213054']
    ],
    sun: { dir: [-0.84, 0.16, 0.30], core: '#fff1c8', glow: '#e8945c', halo: 58, disc: 1.6 },
    clouds: { cover: 0.34, top: 24, lit: '#f0b48a', shade: '#6a4a58', seed: 29, scale: 1.35 },
    stars: 0,
    fog: 0xc9a37c, background: 0x8f6e62
  },

  /* An hour and a half later. The sun is behind the ridge, the west is
     still burning and the east has already gone over to night. */
  dusk: {
    stops: [
      [-90, '#141119'], [-16, '#1b1823'], [-3, '#2f2536'], [-0.5, '#6d4145'],
      [0, '#c88a5e'], [1.5, '#d7975f'], [4, '#c4785c'], [9, '#9c5f63'],
      [16, '#6e4b68'], [26, '#463c66'], [45, '#2c2f58'], [90, '#1b2246']
    ],
    sun: { dir: [-0.72, 0.05, 0.28], core: '#ffd7a0', glow: '#c9705a', halo: 44, disc: 0 },
    clouds: { cover: 0.42, top: 26, lit: '#c98d76', shade: '#4a3a50', seed: 23, scale: 1.15 },
    stars: 150,
    fog: 0x3d3550, background: 0x2b2b4a
  },

  /* Small hours, clear, a moon low in the south-west. The blue is a lie
     the camera tells; the eye sees grey. The camera is what we have. */
  night: {
    stops: [
      [-90, '#05060a'], [-14, '#07080d'], [-2, '#131a2a'], [0, '#1c2740'],
      [3, '#1e2b46'], [9, '#18233c'], [22, '#111a2f'], [45, '#0b1226'], [90, '#080d1e']
    ],
    moon: { dir: [-0.35, 0.62, 0.70], size: 1.4, color: '#e9eef6', halo: 26 },
    clouds: { cover: 0.22, top: 22, lit: '#39445c', shade: '#151c2c', seed: 41, scale: 1.3 },
    stars: 460,
    fog: 0x1a2338, background: 0x141d30
  },

  /* November onward. Overcast most nights, and the snow throws the
     sodium light back up into the cloud, so the sky is brighter than
     the ground and there is not a star in it. */
  winterNight: {
    stops: [
      [-90, '#090c10'], [-10, '#0c1014'], [-1, '#222b36'], [0, '#2e3946'],
      [4, '#2a3542'], [14, '#212b37'], [34, '#18212c'], [90, '#121a24']
    ],
    moon: { dir: [0.5, 0.9, 0.45], size: 0, color: '#8fa2b4', halo: 36 },
    clouds: { cover: 0.85, top: 40, lit: '#3a4552', shade: '#1b232e', seed: 67, scale: 1.6 },
    stars: 40,
    fog: 0x2b3542, background: 0x28323e
  },

  /* The main menu plate. Kept exactly as it was drawn. */
  menuDusk: {
    stops: [
      [-90, '#1a151c'], [-12, '#241d28'], [-2, '#4a2f38'], [0, '#fcd9a4'],
      [2, '#f7b984'], [6, '#ec8f6a'], [12, '#cf6a64'], [20, '#a4526a'],
      [34, '#6b3f63'], [55, '#3b2f57'], [90, '#1d2246']
    ],
    stars: 0,
    fog: 0x7d4f53, background: 0x241d28
  }
};

// ---------------------------------------------------------------- painting
function paintStops(g, stops, W, H) {
  const s = stops.map(([e, c]) => [e, hex(c)]);
  for (let r = 0; r < H; r++) {
    const elev = 90 - 180 * r / (H - 1);
    let i = s.length - 1;
    while (i > 0 && s[i][0] > elev) i--;
    const a = s[i], b = s[Math.min(i + 1, s.length - 1)];
    const f = b[0] === a[0] ? 0 : smooth(Math.min(1, Math.max(0, (elev - a[0]) / (b[0] - a[0]))));
    const px = a[1].map((v, k) => Math.round(v + (b[1][k] - v) * f));
    g.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`;
    g.fillRect(0, r, W, 1);
  }
}

/** World direction -> [column, row] on the plate. */
function project(dir, W, H) {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const x = dir[0] / l, y = dir[1] / l, z = dir[2] / l;
  // SphereGeometry's u runs from -X (u=0) through +Z (0.25) to +X (0.5)
  const u = ((Math.atan2(z, -x) / (Math.PI * 2)) % 1 + 1) % 1;
  const elev = Math.asin(Math.max(-1, Math.min(1, y))) / D2R;
  return [u * W, (90 - elev) / 180 * (H - 1), elev];
}

/**
 * A blob, drawn three times so it survives the seam. Radii are given in
 * ROWS; the horizontal one is stretched by 1/cos(elevation) because a
 * degree of azimuth is worth less than a degree of elevation everywhere
 * except the equator, and a cloud that ignores that is an ellipse.
 */
function blob(g, cx, cy, rx, ry, col, alpha, W) {
  const c = hex(col);
  for (const ox of [-W, 0, W]) {
    if (cx + ox < -rx * 2 || cx + ox > W + rx * 2) continue;
    g.save();
    g.translate(cx + ox, cy);
    g.scale(rx, ry);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, rgba(c, alpha));
    gr.addColorStop(0.45, rgba(c, alpha * 0.62));
    gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr;
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  }
}

/** Cumulus: a shaded underside with a lit top sitting slightly proud of it. */
function paintClouds(g, p, W, H) {
  const R = rng(p.seed ?? 7);
  const rowOf = (e) => (90 - e) / 180 * (H - 1);
  const n = Math.round(64 * p.cover);
  for (let i = 0; i < n; i++) {
    // crowded onto the horizon, the way a distant deck actually stacks up
    const el = 0.6 + Math.pow(R(), 1.9) * ((p.top ?? 30) - 0.6);
    const cy = rowOf(el);
    const cx = R() * W;
    const persp = 1 / Math.max(0.30, Math.cos(el * D2R));
    const w = (26 + R() * 64) * (p.scale ?? 1) * persp;
    const hh = w * (0.16 + R() * 0.13) / persp;
    const puffs = 4 + Math.floor(R() * 5);
    for (let k = 0; k < puffs; k++) {
      const ox = (R() - 0.5) * w * 1.5, oy = (R() - 0.5) * hh * 0.7;
      blob(g, cx + ox, cy + oy + hh * 0.42, w * (0.3 + R() * 0.3), hh * (0.5 + R() * 0.4), p.shade, 0.22, W);
    }
    for (let k = 0; k < puffs; k++) {
      const ox = (R() - 0.5) * w * 1.35, oy = (R() - 0.5) * hh * 0.5;
      blob(g, cx + ox, cy + oy - hh * 0.16, w * (0.28 + R() * 0.30), hh * (0.44 + R() * 0.40), p.lit, 0.30, W);
    }
  }
}

function paintBody(g, b, W, H, warmDisc) {
  const [cx, cy, elev] = project(b.dir, W, H);
  const persp = 1 / Math.max(0.3, Math.cos(elev * D2R));
  const rad = (b.halo ?? 30) / 180 * (H - 1);
  const core = hex(b.core ?? b.color ?? '#ffffff');
  const glow = hex(b.glow ?? b.color ?? '#ffffff');
  for (const ox of [-W, 0, W]) {
    g.save();
    g.translate(cx + ox, cy);
    g.scale(rad * persp, rad);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, rgba(core, 0.92));
    gr.addColorStop(0.10, rgba(core, 0.52));
    gr.addColorStop(0.30, rgba(glow, 0.20));
    gr.addColorStop(0.62, rgba(glow, 0.06));
    gr.addColorStop(1, rgba(glow, 0));
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2);
    g.restore();
  }
  if (b.disc > 0) {
    const dr = b.disc / 180 * (H - 1);
    g.save();
    g.translate(cx, cy); g.scale(persp, 1);
    g.fillStyle = warmDisc ? rgba(core, 1) : rgba(core, 0.95);
    g.beginPath(); g.arc(0, 0, dr, 0, 7); g.fill();
    g.restore();
  }
}

function skyTexture(p, W = 1024, H = 512) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  paintStops(g, p.stops, W, H);
  if (p.sun) paintBody(g, p.sun, W, H, true);
  if (p.moon) paintBody(g, { ...p.moon, core: p.moon.color, glow: p.moon.color, disc: p.moon.size }, W, H, false);
  if (p.clouds) paintClouds(g, p.clouds, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------------------------------------------------------------- stars
let DOT = null;
function dotTexture() {
  if (DOT) return DOT;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.28, 'rgba(255,255,255,.65)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  DOT = new THREE.CanvasTexture(c);
  return DOT;
}

/**
 * Stars, on the inside of the dome so they ride with it. Sizes do not
 * attenuate: a star has no angular size, only a brightness, and letting
 * perspective shrink them makes the dome readable as a dome.
 */
function buildStars(n, radius, seed = 5) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let k = 0;
  for (let i = 0; i < n; i++) {
    // rejection-sample the upper hemisphere, thinned towards the horizon
    const el = Math.acos(1 - R());               // 0 at zenith
    const elev = Math.PI / 2 - el;
    if (elev < 0.06 || R() > 0.35 + elev * 0.9) { i--; continue; }
    const az = R() * Math.PI * 2;
    pos[k * 3] = Math.cos(az) * Math.cos(elev) * radius;
    pos[k * 3 + 1] = Math.sin(elev) * radius;
    pos[k * 3 + 2] = Math.sin(az) * Math.cos(elev) * radius;
    // most stars are white; the few that are not are worth the two lines
    const v = 0.45 + Math.pow(R(), 2.2) * 0.55;
    const warm = R() > 0.86;
    col[k * 3] = v * (warm ? 1 : 0.92);
    col[k * 3 + 1] = v * (warm ? 0.86 : 0.94);
    col[k * 3 + 2] = v * (warm ? 0.72 : 1);
    k++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: 2.2, map: dotTexture(), vertexColors: true, transparent: true,
    depthTest: true, depthWrite: false, sizeAttenuation: false,
    blending: THREE.AdditiveBlending, fog: false
  });
  const pts = new THREE.Points(geo, m);
  pts.renderOrder = -999;
  pts.frustumCulled = false;
  return pts;
}

// ---------------------------------------------------------------- public
/**
 * Hang a sky. `preset` is a key of SKY_PRESETS or a preset object.
 * The dome follows whatever camera the tick loop hands it, so it works
 * the same for a walking player and for the fixed menu plate.
 *
 * Returns { dome, stars, set(preset), apply(scene, density) }.
 */
export function buildSky(world, { preset = 'afternoon', radius = 50, camera = null, fog = true, fogDensity = null } = {}) {
  const group = new THREE.Group();
  group.frustumCulled = false;
  world.add(group);

  const mat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide, fog: false, depthTest: false, depthWrite: false
  });
  const dome = new THREE.Mesh(SHAPE.Sphere(radius, 48, 32), mat);
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  group.add(dome);

  // The clouds proper: cards on the dome, in front of the painted haze,
  // so that the sky has things IN it. Sprites, so they face him from the
  // seat and from the landing alike; drawn straight after the dome and
  // before the world (alphaTest, not blending, keeps them in the opaque
  // pass), so a roofline or a tree is always in front of them.
  const cloudG = new THREE.Group(); cloudG.frustumCulled = false; group.add(cloudG);

  const h = { group, dome, stars: null, preset: null, clouds: cloudG };

  h.set = (next, { density = null } = {}) => {
    const p = typeof next === 'string' ? SKY_PRESETS[next] : next;
    if (!p) return h;
    h.preset = p;
    const old = mat.map;
    mat.map = skyTexture(p);
    mat.needsUpdate = true;
    old?.dispose();

    if (h.stars) { group.remove(h.stars); h.stars.geometry.dispose(); h.stars.material.dispose(); h.stars = null; }
    if (p.stars > 0) { h.stars = buildStars(p.stars, radius * 0.94, p.starSeed ?? 5); group.add(h.stars); }

    while (cloudG.children.length) { const c = cloudG.children.pop(); c.material.dispose(); }
    if (p.clouds && p.clouds.cover > 0) {
      const R = rng((p.clouds.seed ?? 7) * 3 + 1);
      const n = Math.max(3, Math.round(p.clouds.cover * 16));
      const dist = radius * 0.88;
      const lit = new THREE.Color(p.clouds.lit);
      for (let i = 0; i < n; i++) {
        const el = (6 + Math.pow(R(), 1.5) * ((p.clouds.top ?? 30) - 6)) * D2R;
        const az = R() * Math.PI * 2;
        const m = new THREE.SpriteMaterial({
          map: T.cloud(1 + (i % 3)), color: lit.clone().multiplyScalar(0.9 + R() * 0.15),
          alphaTest: 0.35, transparent: false, depthTest: false, depthWrite: false, fog: false
        });
        const sp = new THREE.Sprite(m);
        sp.position.set(Math.cos(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.sin(az) * Math.cos(el) * dist);
        const w = (5 + R() * 9) * (p.clouds.scale ?? 1) * (radius / 50);
        sp.scale.set(w, w * 0.5, 1);
        sp.renderOrder = -998;
        sp.frustumCulled = false;
        cloudG.add(sp);
      }
    }

    const scene = world.scene;
    if (scene.background?.isColor) scene.background.setHex(p.background);
    else scene.background = new THREE.Color(p.background);
    if (fog) {
      const d = density ?? fogDensity ?? (scene.fog?.density ?? 0.008);
      if (scene.fog?.isFogExp2) { scene.fog.color.setHex(p.fog); scene.fog.density = d; }
      else scene.fog = new THREE.FogExp2(p.fog, d);
    }
    return h;
  };

  h.set(preset);

  // the dome is a hat, not a place; the clouds on it drift, slowly
  world.tick((dt, ctx) => {
    const cam = ctx?.camera || camera;
    if (cam) group.position.copy(cam.position);
    cloudG.rotation.y += dt * 0.0035;
  });
  if (camera) group.position.copy(camera.position);

  return h;
}
