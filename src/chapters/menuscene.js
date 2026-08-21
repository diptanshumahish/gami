/* ============================================================
   menuscene.js: the title plate.

   Ridge Road at night, from the middle of the road outside the
   laundromat, looking down the row toward town. It is the real
   street: the same block loc_street.js builds for Chapter Two,
   with the same brick, the same awning, the same parked cars and
   the same thirty-one lamps going away into the fog. Nothing
   here is a stand-in.

   It used to be a bespoke set of black boxes with warm rectangles
   painted on for windows, held at dusk. It read as cut paper. A
   title plate has to be a photograph of somewhere you are going
   to stand later, so now it is one.

   The streetlights still go out one by one on a ninety-second
   loop, and nobody explains that. It becomes horrifying on the
   second playthrough. (doc §8)
   ============================================================ */
import * as THREE from 'three';
import { buildRidgeBlock } from '../world/loc_street.js';
import { buildSky } from '../world/sky.js';
import { audio } from '../core/audio.js';

const DEG = Math.PI / 180;

/* The held camera. One place, so the shot can be nudged without
   hunting through the build. Standing in the near lane outside the
   laundromat, turned up the row: the brick and the awning take the
   left third, the lamp burns over the middle, and the right third is
   the far row falling into haze, which is the third the type wants. */
export const MENU_SHOT = { x: -5.2, y: 1.62, z: 15, yaw: -68, pitch: 4.5, fov: 58 };

export function buildRidgeRoadMenuScene(world, renderer) {
  const cam = renderer.camera;

  // Night, with the fog thick enough that the row is gone by the third
  // block. Everything past that is the backdrop and the haze.
  const sky = buildSky(world, {
    preset: 'night', camera: cam, fogDensity: 0.011
  });

  // Moonlight: a cool fill just strong enough to read a silhouette
  // through the grain, and nothing else in the frame that is not a
  // lamp, a shopfront or a window.
  world.hemi(0x51709a, 0x181209, 1.15);
  world.sun([0.35, -0.62, -0.70], 0xA9C0E4, 2.2);

  // The block itself. Shops lit, because a dark row at night is a wall.
  // No street life: the plate is a held shot, and a pedestrian walking
  // through the wordmark every forty seconds is a different picture.
  const block = buildRidgeBlock(world, {
    x: 0, y: 0, z: 0,
    night: true, snow: false, winter: false,
    shops: true, shopsOpen: true, life: false
  });
  const lights = block.refs.streetlights;

  // ---------------------------------------------------------- camera
  cam.fov = MENU_SHOT.fov;
  cam.updateProjectionMatrix();
  cam.position.set(MENU_SHOT.x, MENU_SHOT.y, MENU_SHOT.z);
  cam.rotation.order = 'YXZ';
  cam.rotation.set(MENU_SHOT.pitch * DEG, MENU_SHOT.yaw * DEG, 0);
  sky.group.position.copy(cam.position);

  // ---------------------------------------------------------- grade
  const u = renderer.final.uniforms;
  // A menu plate is a photograph, not a shot with a focus pull in it.
  // Depth of field turned the whole row to mush, so it is off here and
  // only here, and the grain comes up to carry the texture instead.
  u.dofOn.value = 0;
  u.grain.value = 0.115;
  u.exposure.value = 1.06;
  u.sat.value = 0.96;
  u.vignette.value = 0.44;

  // ---------------------------------------------------------- the loop
  const N = lights.count;
  const step = 90 / N;
  let t = 0, nextKill = step;
  world.tick((dt) => {
    t += dt;
    if (t > nextKill) {
      nextKill += step;
      if (lights.lit > 0) lights.setLit(lights.lit - 1);
    }
    if (t > 92) { t = 0; nextKill = step; lights.setLit(N); }

    // the shot breathes very slightly. it is not a still.
    cam.position.x = MENU_SHOT.x + Math.sin(t * 0.11) * 0.07;
    cam.position.y = MENU_SHOT.y + Math.sin(t * 0.07) * 0.04;
    sky.group.position.copy(cam.position);
  });

  // the plate is a picture first. If there is no AudioContext to be had,
  // the menu still comes up.
  audio.unlock().then(() => {
    audio.wind(0.18);
    audio.roomTone(0.03, 300);
  }).catch(() => {});

  return { lights, block };
}
