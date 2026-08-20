/* ============================================================
   streetlights.js: Ridge Road has thirty-one streetlights.

   In Chapter 5 they are the proximity system: they go out one
   at a time, from the bottom of the hill up, and that is her,
   walking. Four miles, ninety minutes. There is no HUD. The
   player has to choose to look out the window.

   On the main menu they go out on a ninety-second loop and
   nobody explains why.
   ============================================================ */
import * as THREE from 'three';
import { flat, MAT, tiled } from './mat.js';
import { CYL, SPH, BOX } from './world.js';

export const LIGHT_COUNT = 31;

/* A soft round falloff, drawn once and shared by every halo and every
   pool of light in the game. Both of these used to be flat geometry in a
   flat colour: the halo was a 2.6 m square of uniform amber that did not
   face the camera, so from anywhere but dead in front it was a lit
   PARALLELOGRAM hanging in the sky over the street, and the pool was a
   hard-edged disc stamped on the road. */
let GLOW = null;
function glowTexture() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.18, 'rgba(255,255,255,.62)');
  gr.addColorStop(0.45, 'rgba(255,255,255,.20)');
  gr.addColorStop(0.75, 'rgba(255,255,255,.05)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  GLOW = new THREE.CanvasTexture(c);
  GLOW.colorSpace = THREE.SRGBColorSpace;
  return GLOW;
}

/**
 * Builds the road receding downhill along -Z from `origin`.
 * Returns a handle with .setLit(n), n = how many are still burning,
 * counted from the top of the hill (the church end).
 */
export function buildStreetlights(world, {
  origin = new THREE.Vector3(0, 0, 0),
  spacing = 6.2,
  drop = 0.9,           // metres of descent per light
  count = LIGHT_COUNT,
  road = true,
  realLights = 5,       // how many actually cast PointLight (perf)
  halos = true,         // the soft halo cards. Off for any bright sky:
                        // they are flat squares and they read as squares
  alternate = true,     // poles down both sides, or all down one
  side1 = -1            // which side, when they do not alternate
} = {}) {
  const g = new THREE.Group();
  g.position.copy(origin);
  world.add(g);

  const poles = [];
  const glowMat = () => new THREE.MeshBasicMaterial({ color: 0xE8A653, transparent: true, opacity: 1 });

  for (let i = 0; i < count; i++) {
    const z = -i * spacing;
    const y = -i * drop;
    const side = alternate ? (i % 2 ? 1 : -1) : side1;
    const x = side * 5.2;

    const pole = new THREE.Mesh(CYL(0.075, 0.095, 7.2, 6), flat(0x2a2b2d, { rough: .8, metal: .3 }));
    pole.position.set(x, y + 3.6, z);
    g.add(pole);

    const arm = new THREE.Mesh(BOX(1.5, 0.08, 0.08), flat(0x2a2b2d, { rough: .8, metal: .3 }));
    arm.position.set(x - side * 0.75, y + 7.1, z);
    g.add(arm);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.30, 0.22, 8), flat(0x33353a, { rough: .7, metal: .4 }));
    hood.position.set(x - side * 1.45, y + 7.05, z);
    g.add(hood);

    const lamp = new THREE.Mesh(SPH(0.19, 10), glowMat());
    lamp.position.set(x - side * 1.45, y + 6.88, z);
    g.add(lamp);

    // a soft halo so distant lights still read once the point light is
    // gone. A Sprite, so it faces the camera from every angle, and a
    // radial falloff, so it has no edges to be seen.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: 0xE8A653, transparent: true, opacity: 0.34,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    halo.scale.setScalar(3.2);
    halo.position.copy(lamp.position);
    halo.visible = halos;
    g.add(halo);

    let pl = null;
    if (i < realLights) {
      pl = new THREE.PointLight(0xE8A653, 3.0, 17, 1.7);
      pl.position.copy(lamp.position);
      g.add(pl);
    }
    // pool of light on the road, with a falloff instead of a rim
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 8.4), new THREE.MeshBasicMaterial({
      map: glowTexture(), color: 0xE8A653, transparent: true, opacity: 0.22,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x - side * 1.45, y + 0.03, z);
    g.add(pool);

    poles.push({ lamp, halo, pool, pl, on: true, i, y, z, x });

    if (road) {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(8.4, spacing + 0.1), tiled(MAT.asphalt, 8.4, spacing));
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(0, y + 0.01, z);
      seg.receiveShadow = true;
      g.add(seg);
      if (i % 2 === 0) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, spacing * 0.45), flat(0xc8bf9a, { rough: .9 }));
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, y + 0.02, z);
        g.add(line);
      }
      // shoulder + snowbank
      [-1, 1].forEach(s => {
        const bank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, spacing + 0.1), tiled(MAT.snow, 2.4, spacing));
        bank.position.set(s * 5.4, y + 0.16, z);
        bank.receiveShadow = true;
        g.add(bank);
      });
    }
  }

  const h = {
    g, poles, count,
    lit: count,
    /** n still burning, counted from the TOP of the hill. */
    setLit(n) {
      h.lit = THREE.MathUtils.clamp(Math.round(n), 0, count);
      poles.forEach((p, i) => {
        // index 0 is the top of the hill (nearest the church)
        const on = i < h.lit;
        if (p.on === on) return;
        p.on = on;
        p.lamp.material.opacity = on ? 1 : 0.06;
        p.lamp.material.color.setHex(on ? 0xE8A653 : 0x201c18);
        p.halo.material.opacity = on ? 0.34 : 0;
        p.pool.material.opacity = on ? 0.22 : 0;
        if (p.pl) p.pl.intensity = on ? 3.0 : 0;
      });
    },
    /** put one out, from the bottom of the hill up */
    extinguishOne() { h.setLit(h.lit - 1); return h.lit; },
    /** the flicker-then-die that makes the player look up */
    async killWithFlicker(audio) {
      const idx = h.lit - 1;
      if (idx < 0) return;
      const p = poles[idx];
      for (let k = 0; k < 3; k++) {
        p.lamp.material.opacity = 0.15; p.halo.material.opacity = 0.05;
        if (p.pl) p.pl.intensity = 0.3;
        await new Promise(r => setTimeout(r, 70 + Math.random() * 90));
        p.lamp.material.opacity = 1; p.halo.material.opacity = 0.34;
        if (p.pl) p.pl.intensity = 3;
        await new Promise(r => setTimeout(r, 90 + Math.random() * 120));
      }
      h.setLit(h.lit - 1);
      audio?.sfx('click', { vol: 0.12 });
    }
  };
  // index 0 = top of hill; build order put 0 nearest origin, so that already holds.
  h.setLit(count);
  return h;
}
