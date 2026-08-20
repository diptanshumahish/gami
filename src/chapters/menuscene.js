/* ============================================================
   menuscene.js: the main menu background.

   Ridge Road on the evening Jared moved in. Late August, the sky
   still going over, the birds still up. His house is the one on
   the right with the porch light on.

   Everything on the ground is a silhouette. The plate is a sky
   with some black shapes in front of it, and the only detail
   allowed through is a lit window, because a lit window is the
   only thing in this picture that means anything.

   The streetlights still go out one by one on a ninety-second
   loop, and nobody explains that either. Doing it while there is
   still light in the sky is worse: you can see there is nothing
   wrong with them. (doc §8)
   ============================================================ */
import * as THREE from 'three';
import { buildStreetlights, LIGHT_COUNT } from '../world/streetlights.js';
import { buildSky } from '../world/sky.js';
import { flat } from '../world/mat.js';
import { CYL, BOX } from '../world/world.js';
import { audio } from '../core/audio.js';

/* ---------------------------------------------------------------- birds
   Two swept triangles per bird with a dihedral on them, so a bird is a
   solid that turns rather than a decal that faces you. Unfogged, so
   they stay as crisp against the sky as they would really be. */
function wing(dir) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, 0, 0,
    dir * 1.0, 0.30, -0.06,
    dir * 0.80, -0.06, 0.02
  ]), 3));
  g.computeVertexNormals();
  return g;
}

function buildFlock(world, n = 13) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2a2130, side: THREE.DoubleSide, fog: false
  });
  const left = wing(-1), right = wing(1);
  const birds = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const wl = new THREE.Mesh(left, mat), wr = new THREE.Mesh(right, mat);
    b.add(wl, wr);
    const rank = i * 0.5;                       // a loose skein, trailing back
    b.userData = {
      wl, wr,
      x0: 30 - rank * 3.6 + (i % 3) * 2.4,
      y: 24 + Math.sin(i * 1.7) * 3.0 - rank * 0.36,
      z: -70 - rank * 3.4 - (i % 4) * 6,
      phase: i * 0.9,
      rate: 3.2 + (i % 3) * 0.4
    };
    b.position.set(b.userData.x0, b.userData.y, b.userData.z);
    b.scale.setScalar(0.55 + (i % 3) * 0.06);
    world.add(b);
    birds.push(b);
  }
  return birds;
}

/* ---------------------------------------------------------------- shapes
   One material for every solid on the ground. Silhouette means
   silhouette: no trim, no frames, no second colour. */
const DARK = () => flat(0x171319, { rough: 1 });

function gable(world, x, z, w, h, d, rise, mat) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  world.add(g);
  const body = new THREE.Mesh(BOX(w, h, d), mat);
  body.position.y = h / 2;
  g.add(body);
  const slope = Math.hypot(w / 2, rise);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(BOX(slope, 0.24, d + 0.6), mat);
    r.rotation.z = -s * Math.atan2(rise, w / 2);
    r.position.set(s * w / 4, h + rise / 2, 0);
    g.add(r);
  }
  // the gable end closes the triangle the two slabs leave open
  for (const s of [-1, 1]) {
    const tri = new THREE.Shape();
    tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), mat);
    m.rotation.y = s > 0 ? 0 : Math.PI;
    m.position.set(0, h, s * d / 2);
    g.add(m);
  }
  return g;
}

/* A lit window is a flat warm rectangle and nothing else. No frame:
   a frame at this distance is four bright lines that read as clutter. */
function litWindow(g, x, y, z, ry, w = 0.95, h = 1.3, warm = 0xFFC58A) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: warm, fog: false }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

function jaredsHouse(world, x, z) {
  const mat = DARK();
  const W = 8.0, D = 9.0, H = 6.0, RISE = 2.6;
  const g = gable(world, x, z, W, H, D, RISE, mat);

  // chimney
  const ch = new THREE.Mesh(BOX(0.85, 3.2, 0.85), mat);
  ch.position.set(-W / 2 + 1.6, H + 1.6, -1.6);
  g.add(ch);

  // porch: a flat roof on two thin posts. That is the whole porch.
  const proof = new THREE.Mesh(BOX(W + 0.6, 0.24, 3.0), mat);
  proof.position.set(0, 3.4, D / 2 + 1.4);
  g.add(proof);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(CYL(0.09, 0.09, 3.3, 6), mat);
    p.position.set(s * (W / 2 - 0.4), 1.75, D / 2 + 2.7);
    g.add(p);
  }

  // somebody is in downstairs. The upstairs is still full of boxes.
  litWindow(g, -2.4, 1.7, D / 2 + 0.05, 0, 1.05, 1.4);
  litWindow(g, 2.4, 1.7, D / 2 + 0.05, 0, 1.05, 1.4);
  litWindow(g, W / 2 + 0.05, 1.85, 1.4, Math.PI / 2, 1.0, 1.35);

  // porch light, already on, an hour before it needs to be
  litWindow(g, 0.9, 2.85, D / 2 + 0.13, 0, 0.20, 0.28, 0xFFD9A8);
  world.bulb(x + 0.9, 2.85, z + D / 2 + 1.0,
    { color: 0xFFC58A, intensity: 2.6, dist: 8, emissive: false });
  return g;
}

function neighbours(world) {
  const mat = DARK();
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -20 - i * 11;
    const w = 6.5 + (i % 3) * 1.4, h = 5.2 + (i % 2) * 1.1;
    const g = gable(world, side * 13.5, z, w, h, 7.5, 1.7, mat);
    // one or two windows on the road-facing side, most of them dark
    for (let k = 0; k < 2; k++) {
      if ((i * 5 + k * 3) % 4 > 1) continue;
      litWindow(g, -side * (w / 2 + 0.05), 1.7 + k * 2.4, (k ? -1.6 : 1.6),
        -side * Math.PI / 2, 0.8, 1.1);
    }
  }
}

export function buildRidgeRoadMenuScene(world, renderer) {
  // The same dome the chapters use, on the plate's own palette: warm
  // haze at the bottom of the road so it goes pink and not grey.
  const sky = buildSky(world, { preset: 'menuDusk', camera: renderer.camera, fogDensity: 0.0088 });
  const dome = sky.group;

  // Last light. Low, behind the row and off to the right, so the houses
  // come forward as shapes and not as surfaces.
  world.hemi(0xD98496, 0x1c161c, 0.34);
  world.sun([-0.42, -0.16, 0.72], 0xFFB489, 0.55, false);

  // ground. Flat, because the hill only ever mattered from inside it.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), flat(0x2a2028, { rough: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  world.add(ground);

  const lights = buildStreetlights(world, {
    origin: new THREE.Vector3(0, 0, -6),
    spacing: 6.4, drop: 0, count: LIGHT_COUNT, realLights: 6,
    halos: false
  });

  jaredsHouse(world, 8.6, -7.5);
  neighbours(world);
  const birds = buildFlock(world);

  // camera: close in on the porch, from the middle of the road. The
  // house fills the right third, which is the third the type leaves.
  const cam = renderer.camera;
  cam.position.set(0, 2.15, 8);
  cam.rotation.set(0.105, 0, 0, 'YXZ');
  dome.position.copy(cam.position);

  const u = renderer.final.uniforms;
  // A menu plate is a photograph, not a shot with a focus pull in it.
  // Depth of field turned the whole row to mush, so it is off here and
  // only here, and the grain comes up to carry the texture instead.
  u.dofOn.value = 0;
  u.grain.value = 0.115;
  // lift the plate out of the mud without touching the in-game grade
  u.exposure.value = 1.10;
  u.sat.value = 1.02;
  u.vignette.value = 0.30;

  let t = 0, nextKill = 90 / LIGHT_COUNT;
  world.tick((dt) => {
    t += dt;
    // 90-second loop
    if (t > nextKill) {
      nextKill += 90 / LIGHT_COUNT;
      if (lights.lit > 0) lights.setLit(lights.lit - 1);
    }
    if (t > 92) { t = 0; nextKill = 90 / LIGHT_COUNT; lights.setLit(LIGHT_COUNT); }

    // the flock drifts left across the frame and comes round again
    for (const b of birds) {
      const u = b.userData;
      const x = ((u.x0 - t * 1.7) % 130 + 195) % 130 - 65;
      b.position.set(x, u.y + Math.sin(t * 0.5 + u.phase) * 0.45, u.z);
      const flap = Math.sin(t * u.rate + u.phase);
      u.wl.rotation.z = flap * 0.62;
      u.wr.rotation.z = -flap * 0.62;
    }

    // the shot breathes very slightly. it is not a still.
    cam.position.x = Math.sin(t * 0.11) * 0.09;
    cam.position.y = 2.15 + Math.sin(t * 0.07) * 0.05;
    dome.position.copy(cam.position);
  });

  // the plate is a picture first. If there is no AudioContext to be had,
  // the menu still comes up.
  audio.unlock().then(() => {
    audio.wind(0.22);
    audio.roomTone(0.03, 300);
  }).catch(() => {});

  return { lights };
}
