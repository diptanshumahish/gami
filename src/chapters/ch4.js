/* ============================================================
   CHAPTER FOUR, "Come Over"
   Dec 21, 11:47 PM – 1:20 AM · 19°F, snow · ~25 min

   Emotion target: dread, then a decision.
   Linear. In the car, on Ridge Road, in the dark, in snow.

   The three scares here are audio, mediated, audio. None of
   them has a sting. The biggest one, the security monitor,    is entirely silent.
   ============================================================ */
import * as THREE from 'three';
import { buildFuelGo } from '../world/loc_town.js';
import { buildVaskoHouse } from '../world/loc_vasko.js';
import { volvo, signBoard } from '../world/loc_street.js';
import { makeGeneric, smallProp } from '../world/props.js';
import { MAT, flat, tiled } from '../world/mat.js';
import { BOX, CYL, SPH, PLN } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { Input, held, hit } from '../core/input.js';
import { convo, J, SAY, objective, objectiveDone, numb } from './util.js';
import { setFlag, flag, addMessage, state } from '../core/state.js';

const FUEL = { x: 400, y: 0, z: 0 };
const VASKO = { x: -400, y: 0, z: 0 };

export const ch4 = {
  id: 'ch4', card: 'CHAPTER FOUR', title: 'Come Over', date: 'December 21, 2014 · 11:47 PM', temp: '19°F, snow',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('winter');
    world.scene.background = new THREE.Color(0x151d29);
    world.scene.fog = new THREE.FogExp2(0x18202c, 0.015);
    world.hemi(0x35465c, 0x0b0a09, 0.55);
    // the thinnest moon in the game. Enough to find a doorway by.
    world.sun([0.3, -0.7, -0.66], 0x8FA6C8, 1.0);

    Phone.setClock('11:47');
    Phone.cameraStage = 3;    // nothing at all in her seat, now

    const fuel = buildFuelGo(world, { ...FUEL, snow: true });
    const vasko = buildVaskoHouse(world, { ...VASKO, state: 'cold' });
    ctx.refs = { fuel, vasko };

    // ------------------------------------------------------------ 1. the drive
    await driveSequence(ctx, {
      label: 'RIDGE ROAD  ·  DOWNHILL',
      length: 62,
      onStart: async () => {
        await convo([
          J('"I\'m home."'),
          J('She sent it at 11:56.'),
          J('It\'s 11:47.')
        ]);
        objective('go to her.', 'go');
      },
      script: [
        { at: 8, fn: async (d) => { radioBeat(ctx, d, 1); } },
        { at: 24, fn: async (d) => { radioBeat(ctx, d, 2); } },
        { at: 42, fn: async (d) => { radioBeat(ctx, d, 3); } },
        { at: 54, fn: async () => { await UI.say('JARED', '[the tank light]', { style: 'thought', dur: 1800 }); } }
      ],
      endAt: 'fuel'
    });

    // ------------------------------------------------------------ 2. the Fuel & Go
    await fuelGoSequence(ctx, fuel);

    // ------------------------------------------------------------ 3. the payphone
    await payphoneSequence(ctx, fuel);

    // ------------------------------------------------------------ 4. the fork
    await forkSequence(ctx);
  }
};

/* ============================================================
   THE DRIVE
   A rail. The car goes forward; the player steers, and at the
   fork the steering is the whole decision.
   ============================================================ */
async function driveSequence(ctx, { label, length, onStart, script = [], endAt, fork = false, speed = 12 }) {
  const { world, player, renderer } = ctx;

  // ---- build a scrolling road ----
  const SEG = 24, N = 9;
  const road = new THREE.Group();
  const segs = [];
  for (let i = 0; i < N; i++) {
    const g = new THREE.Group();
    const surface = new THREE.Mesh(new THREE.PlaneGeometry(9, SEG), tiled(MAT.asphalt, 9, SEG));
    surface.rotation.x = -Math.PI / 2;
    g.add(surface);
    // slush in the wheel tracks
    [-1.4, 1.4].forEach(tx => {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(1.1, SEG), tiled(MAT.snow, 1.1, SEG));
      t.rotation.x = -Math.PI / 2; t.position.set(tx, 0.012, 0);
      g.add(t);
    });
    for (let k = 0; k < 3; k++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 3), flat(0xc8bf9a, { rough: .9 }));
      line.rotation.x = -Math.PI / 2; line.position.set(0, 0.02, -SEG / 2 + 4 + k * 8);
      g.add(line);
    }
    [-1, 1].forEach(s => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, SEG), tiled(MAT.snow, 3, SEG));
      bank.position.set(s * 6.0, 0.2, 0); g.add(bank);
      // trees
      for (let k = 0; k < 4; k++) {
        const tr = new THREE.Mesh(new THREE.ConeGeometry(0.9 + Math.random(), 5 + Math.random() * 4, 6),
          flat(0x1a2a20, { rough: .98 }));
        tr.position.set(s * (9 + Math.random() * 8), 2.6, -SEG / 2 + Math.random() * SEG);
        g.add(tr);
      }
      // a streetlight now and then
      if (i % 2 === (s > 0 ? 0 : 1)) {
        const pole = new THREE.Mesh(CYL(0.08, 0.1, 7, 6), flat(0x2a2b2d, { rough: .8, metal: .3 }));
        pole.position.set(s * 5.6, 3.5, 0); g.add(pole);
        const lamp = new THREE.Mesh(SPH(0.2, 8), new THREE.MeshBasicMaterial({ color: 0xE8A653 }));
        lamp.position.set(s * 4.3, 6.9, 0); g.add(lamp);
        const halo = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({
          color: 0xE8A653, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        halo.position.copy(lamp.position); g.add(halo);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 14), new THREE.MeshBasicMaterial({
          color: 0xE8A653, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false
        }));
        pool.rotation.x = -Math.PI / 2; pool.position.set(s * 4.3, 0.04, 0); g.add(pool);
      }
    });
    g.position.z = -i * SEG;
    road.add(g);
    segs.push(g);
  }
  world.add(road);

  // ---- the car ----
  const car = volvo(world, 0, 0, 0, Math.PI);
  world.clearCollidersTagged('car');
  const dash = new THREE.Group();
  const dashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.32, 0.5), flat(0x1a1c1e, { rough: .7 }));
  dashMesh.position.set(0, 0.98, -1.1); dash.add(dashMesh);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 20), flat(0x22242a, { rough: .6 }));
  wheel.position.set(-0.38, 1.06, -0.62); wheel.rotation.x = 1.1; dash.add(wheel);
  const cluster = new THREE.Mesh(PLN(0.34, 0.16), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
  cluster.position.set(-0.38, 1.13, -0.9); cluster.rotation.x = -0.35; dash.add(cluster);
  // the tank light
  const tankLight = new THREE.Mesh(PLN(0.035, 0.02), new THREE.MeshBasicMaterial({ color: 0xE8A653 }));
  tankLight.position.set(-0.26, 1.10, -0.888); tankLight.rotation.x = -0.35;
  tankLight.visible = false;
  dash.add(tankLight);
  // the radio
  const radioFace = new THREE.Mesh(PLN(0.22, 0.07), new THREE.MeshBasicMaterial({ color: 0x1a3a2a }));
  radioFace.position.set(0.1, 0.95, -0.86); dash.add(radioFace);
  car.add(dash);

  const headA = new THREE.SpotLight(0xfff2dc, 6.5, 46, 0.36, 0.55, 1.2);
  const headB = new THREE.SpotLight(0xfff2dc, 6.5, 46, 0.36, 0.55, 1.2);
  const tgt = new THREE.Object3D(); tgt.position.set(0, -1.4, -30);
  car.add(headA); car.add(headB); car.add(tgt);
  headA.position.set(-0.62, 0.98, -2.2); headB.position.set(0.62, 0.98, -2.2);
  headA.target = tgt; headB.target = tgt;

  // ---- snow ----
  const snow = makeSnow(world, 900);

  // ---- audio ----
  audio.carInterior();
  audio.wind(0.5);
  const radio = audio.radioStatic(0.05);

  // ---- drive ----
  player.canMove = false;
  player.canLook = true;
  player.hasFlashlight = true;
  UI.showHUD(true);

  let travelled = 0, lateral = 0, steer = 0;
  let forkChoice = null;
  const fired = new Set();

  await UI.fadeIn(1600);
  onStart?.();

  const D = { car, road, segs, tankLight, radioFace, radio, snow, lateral: 0 };

  await new Promise(resolve => {
    const t = world.tick(dt => {
      travelled += speed * dt;

      // steering, it barely matters until it is the only thing that matters
      const want = (held('left') ? -1 : 0) + (held('right') ? 1 : 0);
      steer += (want - steer) * Math.min(1, dt * 3.5);
      lateral = THREE.MathUtils.clamp(lateral + steer * dt * 3.2, fork ? -6 : -2.4, fork ? 6 : 2.4);
      D.lateral = lateral;

      car.position.x = lateral;
      car.rotation.y = Math.PI - steer * 0.06;
      car.rotation.z = steer * 0.02;

      // camera rides in the driver's seat
      player.pos.set(lateral - 0.38, 0.72, 0.15);
      player.eye = 0.68;
      ctx.viewmodel?.setVisible(false);
      player.updateCamera(dt);
      renderer.setFocus(14);

      // scroll the road
      segs.forEach(g => {
        g.position.z += speed * dt;
        if (g.position.z > SEG) g.position.z -= SEG * N;
      });
      snow.update(dt, speed);

      if (travelled >= length) {
        world.untick(t);
        forkChoice = lateral < -2 ? 'left' : lateral > 2 ? 'right' : 'straight';
        resolve();
        return;
      }
      script.forEach((s, i) => {
        if (!fired.has(i) && travelled >= s.at) { fired.add(i); s.fn(D); }
      });
      if (travelled > length * 0.82) tankLight.visible = true;
    });
  });

  // tear down
  audio.killLoop('car', 0.9);
  audio.killLoop('radio', 0.6);
  world.root.remove(road);
  world.root.remove(car);
  snow.dispose();
  player.eye = 1.72;
  ctx.viewmodel?.setVisible(null);
  player.canMove = true;
  return forkChoice;
}

/* ============================================================
   THE RADIO
   WKRB, the host reading someone else's letter, and it cuts to
   her voice mid-sentence, then back. He changes the station.
   It happens again.
   ============================================================ */
let radioStage = 0;
async function radioBeat(ctx, D, n) {
  if (n === 1) {
    D.radio && audio.setLoopVol('radio', 0.10);
    await convo([
      SAY('HOST', 'and she says to me, she says, "it was in the hallway, it was in the hallway every night for a month and I never once got up," and I said, ma\'am, I said...', { style: 'radio' })
    ]);
    return;
  }
  if (n === 2) {
    scares.fire('ch4.radio', () => { /* audio only. no sting. */ });
    await convo([
      SAY('HOST', 'you have to understand that these letters, most of them, most of them have a very ordinary explanation, and the ones that d-', { style: 'radio' }),
      SAY('RECCA', 'jared', { style: 'radio' }),
      SAY('HOST', 'on\'t, well, those are the ones we read on a Sunday.', { style: 'radio' })
    ]);
    await wait(600);
    await convo([J('[change the station]')]);
    audio.sfx('click', { vol: .4 });
    return;
  }
  if (n === 3) {
    await convo([
      SAY('HOST', 'an hour from anywhere, is how he put it. An hour from anywhere. And I said, sir, that\'s most of this state...', { style: 'radio' }),
      SAY('RECCA', 'jared where are you', { style: 'radio' }),
      SAY('HOST', 'but he wasn\'t finished, and this is the part I keep coming back to...', { style: 'radio' })
    ]);
    await wait(400);
    await convo([J('[the radio\'s been off for six minutes]')]);
    audio.killLoop('radio', 0.4);
  }
}

/* ============================================================
   THE FUEL & GO
   Marta is not there. A kid is. And behind the counter there is
   a four-camera security monitor.
   ============================================================ */
async function fuelGoSequence(ctx, fuel) {
  const { world, player } = ctx;
  await UI.fadeOut(900);
  await wait(400);

  player.teleport(fuel.x - 2.4, fuel.z + 4.0, 0, Math.PI);
  Phone.setClock('12:31');
  audio.wind(0.45);
  audio.fluorescent([fuel.x, 2.4, fuel.z]);
  audio.roomTone(0.04, 700);

  // the Volvo, on the forecourt, on camera 2
  const car = volvo(world, fuel.x - 2.4, 0, fuel.z + 12, 0);
  ctx.refs.car = car;

  const kid = makeGeneric(world, {
    height: 1.72, skin: 0xd0a888, hair: 0x2a2018, top: 0x2a4a6a, bottom: 0x2f3540,
    build: 0.94, hairLong: false, hairStyle: 'crop',
    head: { wide: 0.94, jaw: 0.90, nose: 0.86, chin: 0.90, brow: 0.8 },
    face: {
      iris: 0x3a2a1e, stubble: 0.25, eyeW: 1.10, eyeGap: 1.0,
      browY: 3, freck: 0.4, id: 'kid'
    }
  });
  kid.setPos(fuel.x + 1.4, 0, fuel.z + 2.4);
  kid.face(fuel.x - 2, fuel.z + 2.4);

  await UI.fadeIn(1400);
  objective('gas. then her.', 'gas');

  await convo([
    J('Marta\'s not on.'),
    SAY('KID', 'Twelve on pump two?'),
    J('...Is Mrs. Vasko working tonight?'),
    SAY('KID', 'Nah, she\'s off. Been off all week.'),
    J('All week.'),
    SAY('KID', 'Family thing, I think? Twelve on two?')
  ]);

  // ---- THE MONITOR ----
  const mon = fuel.refs.monitor;
  mon.setPassenger(true);
  let looked = 0;

  world.interact(mon.g, {
    label: 'The monitor', dist: 2.6,
    use: async () => {
      looked++;
      if (looked === 1) {
        setFlag('sawSecurityMonitor');
        // the game's biggest single scare, and it is entirely silent.
        scares.fire('ch4.monitor', () => { /* no sting. nothing. */ });
        await convo([
          J('Camera two\'s the forecourt.'),
          J('That\'s my car.'),
          J('...'),
          J('There\'s somebody in the passenger seat.')
        ]);
        objective('look at the car', 'look');
        return;
      }
      if (looked >= 2 && ctx._lookedAtCar) {
        mon.setPassenger(false);
        await convo([
          J('[empty]'),
          J('[it\'s empty on the monitor too]'),
          J('...'),
          J('Okay.')
        ]);
        objectiveDone('look');
        objectiveDone('gas');
        ctx._monDone = true;
        return;
      }
      await UI.say('JARED', '[still there]', { style: 'thought', dur: 1800 });
    }
  });

  // the window, free to turn around and look at the car
  const winMark = new THREE.Mesh(PLN(4, 2), new THREE.MeshBasicMaterial({ visible: false }));
  winMark.position.set(fuel.x - 1.0, 1.5, fuel.z + 3.05);
  world.add(winMark);
  world.interact(winMark, {
    label: 'Look at the car', dist: 3.6,
    use: async () => {
      ctx._lookedAtCar = true;
      await convo([
        J('[through the glass]'),
        J('[the interior light\'s off but the forecourt lights are right on top of it]'),
        J('[it\'s empty]'),
        J('[the passenger seat is empty]')
      ]);
      UI.toast('the monitor', 'look again');
    }
  });

  world.interact(kid.g, {
    label: 'The kid', dist: 2.6,
    use: () => UI.say('KID', 'You good, man? You\'ve been looking at that screen for like four minutes.', {})
  });

  // wait for the beat to complete
  await new Promise(res => {
    const t = world.tick(() => { if (ctx._monDone) { world.untick(t); res(); } });
    // if the player refuses to engage, the story moves anyway after a while
    setTimeout(() => { world.untick(t); res(); }, 240000);
  });
  await wait(800);
}

/* ============================================================
   THE PAYPHONE, the clincher
   She picks up. She's warm, sleepy, sweet. And behind her voice,
   unmistakably, is the sound of the Wash-Rite dryers.
   ============================================================ */
async function payphoneSequence(ctx, fuel) {
  const { world, player } = ctx;
  const pp = fuel.refs.payphone;
  objective('call her.', 'call');

  await new Promise(res => {
    world.interact(pp.g, {
      label: 'Payphone', dist: 2.4, once: true,
      use: async () => {
        setFlag('calledFromPayphone');
        audio.sfx('coin', { vol: .5 });
        await wait(500);
        audio.sfx('dialtone', { vol: .35 });
        await wait(1600);
        audio.sfx('ring', { vol: .45 });
        await wait(2000);
        audio.sfx('ring', { vol: .45 });
        await wait(2200);

        // her voice comes through the earpiece, and so does the room she is in.
        const dry = audio.dryers('wrong', null);
        if (audio.ready) audio.bus.dryer.gain.setTargetAtTime(0.55, audio.t, 0.6);

        scares.fire('ch4.dryerphone', () => { /* audio. no sting. */ });

        await convo([
          SAY('RECCA', 'Hi.', { style: 'phone' }),
          J('Hey. Hey, did you sleep?'),
          SAY('RECCA', 'Mm. A bit. It\'s cold.', { style: 'phone' }),
          J('I\'m. I\'m at the Fuel & Go, I\'m getting gas, I\'ll be like ten minutes.'),
          SAY('RECCA', 'Okay.', { style: 'phone' }),
          SAY('RECCA', '[a long, warm, sleepy pause]', { style: 'phone' })
        ]);

        await wait(1200);
        // and behind her voice, the exact ambient loop the player has been
        // hearing for three hours of playtime.
        await convo([
          J('...'),
          J('Rec.'),
          SAY('RECCA', 'Mm?', { style: 'phone' }),
          J('Where are you?'),
          SAY('RECCA', 'I\'m home.', { style: 'phone' }),
          J('...'),
          SAY('RECCA', 'I\'m home. Come over.', { style: 'phone' })
        ]);

        await wait(900);
        await convo([
          J('[the dryers]'),
          J('[I can hear the dryers]'),
          J('[her house is heated by a wood stove and there is not a machine in it]'),
          J('[that is my building]'),
          J('[she is in my apartment]'),
          J('[she has been in my apartment for hours]')
        ]);

        if (audio.ready) audio.bus.dryer.gain.setTargetAtTime(0, audio.t, 1.2);
        objectiveDone('call');
        await wait(1200);
        res();
      }
    });
  });
}

/* ============================================================
   THE TURN
   Ridge Road forks: left to Kesslerton Row, right up the ridge
   to St. Brigid's. The player steers. Going left is possible.
   ============================================================ */
async function forkSequence(ctx) {
  const { world, player, renderer } = ctx;
  await UI.fadeOut(1000);
  await wait(400);

  objective('left is her house. right is the church.', 'fork');
  UI.toast('the fork', 'steer');

  const choice = await driveSequence(ctx, {
    label: 'THE FORK',
    length: 40, fork: true, speed: 11,
    onStart: async () => {
      await convo([
        J('Ridge Road forks at the bottom.'),
        J('Left is Kesslerton Row.'),
        J('Right is the ridge, and the church, and a person I have not spoken to in two years.')
      ]);
    },
    script: [
      { at: 14, fn: async () => { await UI.say('JARED', '[the fork sign]', { style: 'thought', dur: 1500 }); } },
      { at: 26, fn: async () => { await UI.say('JARED', '[steer]', { style: 'thought', dur: 1400 }); } }
    ]
  });

  if (choice === 'left') {
    await kesslertonRowEnding(ctx);
    return;
  }

  // ---- right: up the ridge. four minutes. snow. no talking. ----
  await UI.fadeOut(900);
  // the piece goes with him: from the road to whatever is at the top
  audio.musicScene('dread', { immediate: true });
  audio.setMusicIntensity(0.55);
  await wait(500);
  await UI.titleCard('', 'THE RIDGE', 'December 21 · 1:04 AM', '17°F', { hold: 2400 });

  await driveSequence(ctx, {
    label: 'UP THE RIDGE', length: 46, speed: 9,
    onStart: async () => { },
    script: [
      { at: 30, fn: async () => {
        // he says exactly one thing, to himself.
        await UI.say('JARED', 'He\'s gonna say I told you so.', { style: 'thought', dur: 2600 });
      } }
    ]
  });

  // ---- the rectory door, 1:20 AM ----
  await UI.fadeOut(1200);
  await wait(600);
  setFlag('arrivedAtChurch');
  await ctx.next();
}

/* ============================================================
   ENDING VARIANT, "Kesslerton Row"
   A 90-second scene. No dialogue. The screen goes white.
   ============================================================ */
async function kesslertonRowEnding(ctx) {
  const { world, player, renderer } = ctx;
  const { vasko } = ctx.refs;
  setFlag('droveToKesslertonRow');

  await UI.fadeOut(1200);
  // 9 Kesslerton Row has its own piece, and has had all along.
  audio.musicScene('vasko', { immediate: true });
  audio.setMusicIntensity(0.4);
  await wait(500);
  player.teleport(VASKO.x, VASKO.z + 9.5, 0, Math.PI);
  player.hasFlashlight = true;
  player.setFlashlight(true);
  audio.wind(0.55);
  audio.killLoop('car', 0.5);
  Phone.setClock('1:06');
  renderer.setGrade('winter');

  await UI.fadeIn(2600);

  // the house is dark. all of them are dark. hers is darker.
  vasko.refs.lights.parlourLight.intensity = 0;
  vasko.refs.lights.kitLight.intensity = 0;

  // no dialogue. none.
  await wait(4000);

  const porch = world.trigger(VASKO.x, VASKO.z + 5.6, 4.0, 4.0, {
    once: true,
    onEnter: async () => {
      await wait(1500);
      // the stove is cold. three months of mail on the floor.
      await UI.say('', '[the glass in the door]', { dur: 2400 });
      await wait(1800);
      await UI.say('', '[three months of mail on the floor]', { dur: 3000 });
      await wait(2400);
      await UI.say('', '[he does not go in]', { dur: 2800 });
      await wait(2000);
      // the screen going white
      audio.sting('sub');
      await UI.fadeOut(4200, true);
      await wait(1400);
      await ctx.ending('KR');
    }
  });

  // if they never walk up, the chapter waits. it is patient.
  setTimeout(async () => {
    if (!porch.dead) {
      await UI.fadeOut(3000, true);
      await ctx.ending('KR');
    }
  }, 180000);
}

// ============================================================ SNOW
function makeSnow(world, count = 800) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - .5) * 40;
    pos[i * 3 + 1] = Math.random() * 16;
    pos[i * 3 + 2] = -Math.random() * 60 + 10;
    vel[i] = 0.6 + Math.random() * 1.2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xdfe8f2, size: 0.09, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true
  });
  const pts = new THREE.Points(geo, mat);
  world.add(pts);
  return {
    pts,
    update(dt, forward = 0) {
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] -= vel[i] * dt * 2.2;
        pos[i * 3 + 2] += forward * dt * 0.55;
        pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.6 + i) * dt * 0.4;
        if (pos[i * 3 + 1] < -1) { pos[i * 3 + 1] = 15; }
        if (pos[i * 3 + 2] > 14) { pos[i * 3 + 2] = -55; }
      }
      geo.attributes.position.needsUpdate = true;
    },
    dispose() { world.root.remove(pts); geo.dispose(); mat.dispose(); }
  };
}
export { makeSnow };
export default ch4;
