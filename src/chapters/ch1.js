/* ============================================================
   CHAPTER ONE, "Move-In Weekend"
   Aug 24 · 68°F · ~40 min

   Emotion target: warmth, and one or two things at the edge of
   it that he does not look at twice. This is still a bet, spend
   forty minutes making the player like their life, but it is a
   bet placed on a DAY now and not on a conversation:

     · the drive in, under the last of the sun, through twelve
       miles of Pennsylvania hardwood with the radio on and his
       father texting. A deer. A sign. Somebody at the treeline.
     · the Fuel & Go at the edge of town, at dusk, where a kind
       woman with a medal at her throat makes his change and
       tells him where to go, and there is a plaque outside with
       nine names on it and a four-camera monitor behind the
       counter with his own car on it
     · Ridge Road, with the streetlights just coming on, the
       last box up the outside stair, the landlady on the landing
       salting the step in August
     · the room, the mirror, no quarters, the diner down the hill
       with nine faces on the corkboard, the pawn shop
     · the laundromat, and her, and the three things he has to
       do with his hands while she talks
     · and the night: she comes in, she goes, he texts her back
       too soon, and at 3:04 the radiator knocks and he talks to
       it and it stops, and across the road under the streetlight
       there is somebody looking up at his window until the
       light goes out for half a second and there is not.

   Conversations are short, and they are LOCKED: when somebody in
   Ashgrove is talking to you, you stand there and you listen.

   Two things are planted here and never pointed at:
     · the detergent, which is in his hand the entire time
     · "come in", which he says once and never takes back
   ============================================================ */
import * as THREE from 'three';
import { buildApartment, buildLaundromat } from '../world/loc_home.js';
import { buildRidgeBlock, signBoard, volvo } from '../world/loc_street.js';
import { buildDiner, buildPawn, buildFuelGo } from '../world/loc_town.js';
import { buildSky } from '../world/sky.js';
import { makeRecca, makeMarta, makeGeneric, smallProp, cardboardBox } from '../world/props.js';
import { MAT, flat } from '../world/mat.js';
import { BOX, CYL, SPH, PLN, SHAPE } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { convo, talk, J, SAY, objective, objectiveDone, carryable } from './util.js';
import { driveRail, roadSign, mailbox, deer, PALETTES } from './drive.js';
import { setFlag, addMessage } from '../core/state.js';
import { NINE } from '../content/docs.js';

/* Where Ashgrove is, this evening. The block is at the origin; the two
   shops are dropped into holes in the near row so their doors stand on
   the same building line as the laundromat's. The road in, and the gas
   station at the edge of town, are built far enough out that the street
   never sees them and the fog never has to hide them. */
const APT = { x: 0, y: 3.0, z: 0 };
const DINER = { x: 21, z: 0.5 };
const PAWN = { x: -19, z: 1.0 };
const RAIL = { x: 600, z: 0 };
const FUEL = { x: 900, y: 0, z: 0 };

export const ch1 = {
  id: 'ch1', card: 'CHAPTER ONE', title: 'Move-In Weekend', date: 'August 24, 2014 · 6:38 PM', temp: '68°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('autumn');
    const sky = buildSky(world, { preset: 'golden', camera: ctx.camera, fogDensity: 0.0078 });
    ctx.sky = sky;

    // ---------------------------------------------------------- world
    // Built once, all of it, and the chapter moves him between the
    // pieces with a fade. The sun and the hemisphere are the only two
    // lights that travel with him; everything else belongs to a place.
    const block = buildRidgeBlock(world, {
      x: 0, y: 0, z: 0, night: false,
      life: { walkers: 7, pairs: 2, cars: 3 },
      nearGaps: [
        [DINER.x - 5.8, DINER.x + 5.8],
        [PAWN.x - 4.4, PAWN.x + 4.4]
      ]
    });
    const apt = buildApartment(world, { x: APT.x, y: APT.y, z: APT.z, boxes: false, lightsOn: true, hall: true });
    const laundry = buildLaundromat(world, { x: 0, y: 0, z: 0 });
    const diner = buildDiner(world, { x: DINER.x, y: 0, z: DINER.z });
    const pawn = buildPawn(world, { x: PAWN.x, y: 0, z: PAWN.z });
    rowInfill(world, { x: DINER.x, w: 11.6, name: 'THE ANTHRACITE', body: 0x8a5f4e, trim: 0xd8d2c4, sign: '#E8A653' });
    rowInfill(world, { x: PAWN.x, w: 8.8, name: 'PAWN & LOAN', body: 0x7b7468, trim: 0xbdb5a4, sign: '#d8d2c4' });
    const fuel = buildFuelGo(world, { ...FUEL });

    const hemi = world.hemi(0x9a86a0, 0x5a4a34, 0.95);
    const sun = world.sun([0.84, -0.26, -0.30], 0xF2B46C, 2.4, true, 60);
    // the sun has to be able to follow him out to the road and back
    world.add(sun.target);
    const light = makeLighting({ world, sun, hemi, block, apt, sky });
    ctx.light = light;

    const S = {
      phase: 'drive', deer: false, sawFigure: false, gas: false, paid: false, sawPlaque: false, sawMonitor: false,
      trips: 0, boxes: 0, quarters: 0, mirrorHung: false, detergent: null, mirrorObj: null,
      metOstrowski: false, premet: false, met: false, window: false, fridge: false,
      sawFlyers: false, sawRings: false, feeding: false, loaded: false, ateIt: false,
      sheCameIn: false, textedBack: false, radiatorDone: false, sawWindow: false, slept: false
    };
    ctx.S = S;

    // ============================================================ PEOPLE
    const people = streetPeople(ctx, { diner, pawn });
    ctx.people = people;
    audio.radio('porch', { pos: [-9.4, 2.6, 5.2], station: 'talk', volume: 0.26, signal: 0.72, set: 'table' });

    const recca = makeRecca(world, { coat: false });
    recca.setPos(laundry.x - 0.9, 0, laundry.z + 0.6 - 0.4 - 0.34);
    recca.face(laundry.x - 0.9, laundry.z + 6);
    recca.setBusy('fold');
    ctx.recca = recca;
    const FT = laundry.refs.foldTable;
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(BOX(0.26, 0.08, 0.2), flat([0xd8d3c8, 0x8f6a4a, 0x3f5b6b, 0xa8543f, 0x5b6b52][i], { rough: .98 }));
      t.position.set(laundry.x - 0.85 + i * 0.30, FT.top + 0.04, laundry.z + 0.62);
      t.rotation.y = i * 0.3;
      world.add(t);
    }

    const ost = makeOstrowski(ctx, block);
    const marta = makeMarta(world);
    marta.setPos(FUEL.x + 1.4, 0, FUEL.z + 0.75);
    marta.face(FUEL.x + 1.4, FUEL.z + 6);
    marta.setBusy('counter');

    ctx.refs = { block, apt, laundry, diner, pawn, fuel, recca, ost, marta, people, sun, hemi, light };

    // ============================================================ THE PLACES
    // Everything that can be used is wired now, and the chapter opens and
    // closes it as he gets there. The story is the order he gets there in.
    theFuelGo(ctx, { fuel, marta, S });
    theStreet(ctx, { block, apt, S, ost });
    theRoom(ctx, { apt, S });
    theDiner(ctx, { diner, S });
    thePawn(ctx, { pawn, S });
    theLaundromat(ctx, { laundry, apt, recca, S, block, sun, hemi });

    // ============================================================ THE DAY
    await theDrive(ctx, { S, light });
    await fuelStop(ctx, { fuel, marta, S, light });
    await theDriveIn(ctx, { S, light });
    await arrival(ctx, { block, apt, S, light });
    // ...and from here the player has the street, and the scene picks
    // him up again when he walks into the laundromat with quarters.
  }
};

/* ============================================================
   LIGHT, BY THE HOUR
   One sun and one hemisphere, re-aimed for each place he is in
   and each hour he is in it. The sun's target travels with it,
   because a shadow camera pointed at the origin is no use three
   hundred metres down the road.
   ============================================================ */
function makeLighting({ world, sun, hemi, block, apt, sky }) {
  const aim = (dir, at, { color, i, extent = 42 }) => {
    sun.position.set(at.x - dir[0] * 40, -dir[1] * 40, at.z - dir[2] * 40);
    sun.target.position.set(at.x, 0, at.z);
    sun.color.setHex(color); sun.intensity = i;
    const c = sun.shadow.camera;
    c.left = -extent; c.right = extent; c.top = extent; c.bottom = -extent;
    c.updateProjectionMatrix();
  };
  const lamps = (on, k = 1) => {
    block.refs.aptLight.intensity = on ? 1.4 * k : 0;
    block.refs.signLight.intensity = on ? 1.1 * k : 0.2;
    block.refs.doorLamp.intensity = on ? 1.6 * k : 0;
    block.refs.doorLampGlass.material.color.setHex(on ? 0xFFE9C4 : 0x4a4238);
    block.refs.streetlights?.poles.forEach(p => {
      p.lamp.material.color.setHex(on ? 0xE8A653 : 0x5a5244);
      p.halo.visible = on;
      p.halo.material.opacity = on ? 0.26 * k : 0;
      p.pool.material.opacity = on ? 0.16 * k : 0;
      if (p.pl) p.pl.intensity = on ? 2.4 * k : 0;
    });
    apt.hall.refs.light.intensity = on ? 1.1 : 0.4;
  };
  return {
    /** The road in: low sun in the west, long shadows across the tarmac. */
    golden(at) {
      sky.set('golden', { density: 0.0078 });
      aim([0.84, -0.26, -0.30], at, { color: 0xF2B46C, i: 2.4, extent: 60 });
      hemi.intensity = 1.2; hemi.color.setHex(0x9a86a0); hemi.groundColor.setHex(0x5a4a34);
    },
    /** Twenty minutes on. The sun is gone behind the ridge; the west is still lit. */
    dusk(at, { extent = 42 } = {}) {
      sky.set('dusk', { density: 0.0082 });
      aim([0.72, -0.12, -0.28], at, { color: 0xE09A5A, i: 0.8, extent });
      hemi.intensity = 0.85; hemi.color.setHex(0x54677f); hemi.groundColor.setHex(0x2b241c);
      lamps(true);
    },
    /** Ten at night. Lamps and a moon. */
    night(at) {
      sky.set('night', { density: 0.0095 });
      aim([0.35, -0.62, -0.70], at, { color: 0xA9C0E4, i: 1.6 });
      hemi.intensity = 1.05; hemi.color.setHex(0x51709a); hemi.groundColor.setHex(0x181209);
      lamps(true);
    },
    lamps
  };
}

/* ============================================================
   THE DRIVE
   Twelve miles of two-lane, the last of the sun coming in from
   the left, the radio on. He is not doing anything. That is
   what this is for.
   ============================================================ */
async function theDrive(ctx, { S, light }) {
  const { world, player } = ctx;
  light.golden(RAIL);
  audio.musicScene('outside');
  audio.wind(0.3);
  Phone.setClock('6:38');
  player.teleport(RAIL.x - 0.38, RAIL.z + 0.15, 0.42, 0);
  player.hasFlashlight = false;

  const P = PALETTES.golden;
  let figure = null, theDeer = null;

  const res = await driveRail(ctx, {
    origin: RAIL, palette: 'golden', length: 540, maxSpeed: 17, fuel: 0.16,
    radio: { station: 'lofi', volume: 0.42, signal: 0.72 },
    seed: 11, fence: true, poles: true,
    onStart: async (D) => {
      objective('ashgrove. twelve miles. left at the only light.', 'drive');
      D.place(roadSign('ASHGROVE  12', { w: 1.7, h: 0.42, P }), 60, 5.4, { yaw: 0 });
      D.place(mailbox(P), 96, 4.9);
      await wait(1800);
      await convo([
        J('Twelve miles.'),
        J('There has not been a town for forty.')
      ]);
    },
    script: [
      // his father. he texts like he is paying by the letter.
      { at: 70, fn: async (D) => {
        addMessage('them', 'Did you find it', '6:41 PM', 'DAD');
        audio.sfx('text', { vol: .5 });
        UI.toast('1 message', 'Tab');
      } },
      { at: 120, fn: async (D) => {
        D.place(roadSign('DEER\nCROSSING', { w: 0.9, h: 0.9, fg: '#1a1512', bg: '#e3b13c', posts: 1, top: 2.0, P }), 150, 5.2);
      } },
      { at: 160, fn: async (D) => {
        await convo([J('Dad.')]);
        const r = await UI.choose([
          { text: '"almost. 10 min"', value: 'a' },
          { text: '"yes"', value: 'b' },
          { text: 'Don\'t answer while driving.', value: 'c' }
        ]);
        if (r === 'a') { addMessage('me', 'almost. 10 min', '6:44 PM', 'DAD'); addMessage('them', 'Call your mother when you are in', '6:44 PM', 'DAD'); }
        if (r === 'b') { addMessage('me', 'yes', '6:44 PM', 'DAD'); addMessage('them', 'Good. Call your mother', '6:45 PM', 'DAD'); }
        if (r === 'c') { await convo([J('Later.')]); addMessage('them', 'Jared', '6:52 PM', 'DAD'); }
      } },
      // ---- the deer. it is a deer. it is in the road.
      { at: 210, fn: async (D) => {
        theDeer = deer();
        theDeer.rotation.y = -Math.PI / 2;      // facing across, left to right
        const a = D.place(theDeer, 118, 3.6, { keep: 20 });
        let phase = 0, t = 0;
        const tk = world.tick(dt => {
          if (a.dead) { world.untick(tk); return; }
          t += dt;
          // it waits until the car is close, then goes. they do. Whether
          // he brakes is up to him; it is across before it matters.
          if (phase === 0 && a.z > -58) {
            phase = 1; t = 0;
            S.deer = true;
            UI.say('JARED', '[brake]', { style: 'thought', dur: 1300 });
          }
          if (phase === 1) {
            a.x = 3.6 - t * 3.2;
            theDeer.position.y = Math.abs(Math.sin(t * 9)) * 0.18;
            theDeer.userData.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 9 + (i % 4) * 1.5) * 0.6; });
            if (a.x < -9) { phase = 2; world.untick(tk); setTimeout(() => D.remove(a), 2000); }
          }
        });
        await wait(3400);
        await convo([
          J('...'),
          J('Okay.'),
          J('Okay, that was a deer.')
        ]);
      } },
      // ---- somebody at the treeline
      { at: 300, fn: async (D) => {
        D.place(roadSign('ASHGROVE   4', { w: 1.7, h: 0.42, P }), 70, 5.4);
        figure = makeGeneric(world, {
          height: 1.64, skin: 0xd8bda6, hair: 0x5a3a28, top: 0x6b5f52, bottom: 0x2c3444,
          coat: true, boots: 0x4a3b2c, build: 0.92, hairLong: true, female: 1, hairStyle: 'wave',
          face: { iris: 0x556a4a, lash: 1, id: 'treeline' }
        });
        figure.setPos(0, -50, 0);
        const a = D.place(figure, 150, 10.4, { keep: 12 });
        figure.face(RAIL.x - 4, RAIL.z - 150);
        let noticed = false, passed = false;
        const tk = world.tick(dt => {
          if (a.dead) { world.untick(tk); return; }
          // she stands exactly still and faces the road, and as the car
          // draws level she turns her head to follow it. that is all.
          figure.face(RAIL.x + a.x - 8, RAIL.z + a.z + 30);
          if (a.z > -34 && !noticed) {
            noticed = true;
            figure.lookAt(ctx.camera);
            scares.fire('ch1.roadside', () => { /* nothing. she is standing there. */ });
            S.sawFigure = true;
            convo([
              J('[somebody at the treeline. a coat three sizes too big for them.]'),
              J('[waiting for a ride, maybe. there is no car.]')
            ]);
          }
          if (a.z > 6 && !passed) {
            passed = true;
            figure.lookAt(null);
            setTimeout(() => convo([J('[he checks the mirror]'), J('[nobody]')]), 1800);
          }
        });
      } },
      { at: 420, fn: async (D) => {
        D.place(roadSign('KESSLERTON No. 9\nHISTORIC SITE   2 ►', { w: 2.2, h: 0.66, fg: '#f4f0e4', bg: '#6b4a2c', posts: 2, top: 2.2, P }), 60, 5.6);
        await wait(4000);
        await convo([J('There it is.')]);
      } },
      { at: 480, fn: async (D) => {
        D.tankLight(true);
        await wait(800);
        await convo([
          J('[the tank light]'),
          J('Of course.')
        ]);
        objective('gas.', 'gas');
      } },
      { at: 512, fn: async (D) => {
        D.place(roadSign('FUEL & GO  ½', { w: 1.4, h: 0.42, fg: '#E7F2E4', bg: '#1a3a4a', P }), 30, 5.2);
        D.setCruise(9);
      } }
    ]
  });
  S.phase = 'fuel';
  if (figure) figure.setPos(0, -50, 0);
  objectiveDone('drive');
  await UI.fadeOut(1000);
  await wait(400);
}

/* ============================================================
   THE FUEL & GO
   The first building in Ashgrove, and the last one he will ever
   see on the way out. A woman with a Miraculous Medal at her
   throat makes his change and tells him where to go. Outside
   there is a plaque with nine names on it. He reads it.
   ============================================================ */
function theFuelGo(ctx, { fuel, marta, S }) {
  const { world, player } = ctx;
  const F = FUEL;

  // the Volvo, on the forecourt, beside pump two
  const car = volvo(world, F.x, 0, F.z + 12.4, Math.PI / 2);
  ctx.refs.fuelCar = car;

  // ---- pump two ----
  const pumpProbe = new THREE.Mesh(BOX(0.7, 1.9, 1.0), new THREE.MeshBasicMaterial({ color: 0xE8A653, transparent: true, opacity: 0 }));
  pumpProbe.position.set(F.x + 2.4, 0.95, F.z + 9);
  world.add(pumpProbe);
  const pumpRec = world.interact(pumpProbe, {
    label: () => S.gas ? 'Pump two' : 'Pump gas', dist: 2.4, hold: 2.6, enabled: false, hl: 0xE8A653,
    use: async () => {
      if (S.gas) { UI.say('JARED', 'Twelve on two. Already did this.', { style: 'thought' }); return; }
      S.gas = true;
      // the nozzle off the hook, into the filler, and the pump running:
      // the motor in the island, the fuel in the hose, the gurgle in the neck
      audio.sfx('nozzle', { vol: .55 });
      await wait(700);
      audio.sfx('latch', { vol: .35 });
      audio.fuelPump();
      await convo([J('[twelve dollars, which is about a third of a tank, which is about what he has on him]')]);
      await wait(2600);
      audio.killLoop('pump', 0.4);
      await wait(350);
      audio.sfx('nozzle', { vol: .5 });
      await convo([J('Twelve on two.')]);
      objectiveDone('gas');
      objective('pay inside.', 'pay');
    }
  });

  // ---- the plaque, right of the door ----
  const plaque = new THREE.Group();
  const pl = new THREE.Mesh(BOX(0.62, 0.78, 0.03), flat(0x5a4a2e, { rough: .35, metal: .55 }));
  plaque.add(pl);
  const face = signBoard('KESSLERTON No. 9\nFEB. 11, 1963\n' + NINE.map(n => n.name.toUpperCase()).join('\n') + '\n\nHALE COLLIERY CO. 1964',
    0.56, 0.72, '#d8c58a', '#4a3c24', 'EB Garamond');
  face.position.z = 0.02; plaque.add(face);
  plaque.position.set(F.x - 0.7, 1.5, F.z + 3.09);
  world.add(plaque);
  world.interact(plaque, {
    label: 'The plaque', dist: 2.2,
    use: async () => {
      if (S.sawPlaque) { UI.say('JARED', 'Nine names. Hale Colliery Company, 1964.', { style: 'thought' }); return; }
      S.sawPlaque = true;
      setFlag('sawThePlaque', true);
      await talk(ctx, [
        J('Bronze. Nine names and a date. February, sixty-three.'),
        J('Vasko. Prosser. Kowal. Hurka...'),
        J('[and at the bottom, smaller, in the same letters]'),
        J('"Erected by the Hale Colliery Company."'),
        J('...Okay.')
      ], { focus: plaque, letterbox: false });
    }
  });

  // ---- the monitor. camera 2 is the forecourt. ----
  const mon = fuel.refs.monitor;
  mon.setPassenger(false);
  world.interact(mon.g, {
    label: 'The monitor', dist: 2.4,
    use: async () => {
      S.sawMonitor = true;
      await convo([
        J('Four cameras, one screen. Camera two is the forecourt.'),
        J('That\'s my car. It looks smaller on there.')
      ]);
    }
  });

  // ---- the cooler, the payphone, the rest ----
  world.interact(fuel.refs.payphone.g, {
    label: 'Payphone', dist: 2.0,
    use: () => UI.say('JARED', 'A payphone. An actual payphone, with a cord. Somebody has scratched a name into it.', { style: 'thought' })
  });

  // ---- Marta, at the register ----
  let paidTalking = false;
  world.trigger(F.x + 1.4, F.z + 2.7, 3.2, 1.6, {
    y0: -1, y1: 2.5,
    onEnter: async () => {
      if (S.paid || paidTalking) return;
      if (!S.gas) {
        marta.lookAt(ctx.camera);
        await talk(ctx, [
          SAY('MARTA', 'Pump first, honey. It\'s prepay after six, the sign\'s on the door.'),
          J('Sorry.'),
          SAY('MARTA', 'Don\'t be sorry, be quick, I close at eight.')
        ], { focus: marta });
        marta.lookAt(null);
        return;
      }
      paidTalking = true;
      marta.lookAt(ctx.camera);
      marta.pauseBusy(40);
      await talk(ctx, [
        SAY('MARTA', 'Pump two.'),
        J('Twelve, yeah.'),
        SAY('MARTA', '[she looks at him a half second longer than the register needs]'),
        SAY('MARTA', 'You\'re not from here.'),
        J('Moving in. Ridge Road. Today, actually.'),
        SAY('MARTA', 'The room over the Wash-Rite. Helena\'s.'),
        J('...How does...'),
        SAY('MARTA', '[she smiles, and it is a kind smile] Honey, there\'s eleven hundred of us.'),
        SAY('MARTA', 'Straight on, left at the light. It\'s the only light. You\'ll see the sign.')
      ], { focus: marta });

      const q = await UI.choose([
        { text: '"There\'s a plaque outside. Nine names."', value: 'plaque' },
        { text: '"Thank you."', value: 'thanks' }
      ]);
      if (q === 'plaque') await talk(ctx, [
        SAY('MARTA', '[she does not stop counting the change]'),
        SAY('MARTA', 'Sixty-three. Nine men. The first one\'s my husband\'s father.'),
        J('I\'m sorry.'),
        SAY('MARTA', 'Everybody here is somebody\'s, sweetheart. That\'s what the plaque is for.'),
        SAY('MARTA', '[she touches the medal at her throat without knowing she has]')
      ], { focus: marta });
      else await talk(ctx, [
        SAY('MARTA', 'Mm-hm.')
      ], { focus: marta });

      audio.sfx('coin', { vol: .5 });
      await talk(ctx, [
        SAY('MARTA', '[she slides the change across, and her hand stays on it a second]'),
        SAY('MARTA', '[she looks at his hand on the counter. the ring. then his face.]'),
        SAY('MARTA', 'Welcome to Ashgrove. Go on, you\'ll lose the light.')
      ], { focus: marta });
      marta.lookAt(null);
      marta.resumeBusy('counter');
      S.paid = true;
      objectiveDone('pay');
      objective('back in the car. ridge road, left at the only light.', 'ridge');
      carRec.enabled = true;
      UI.toast('the car', 'walk up to it and press E');
    }
  });

  // ---- back in the car ----
  const carRec = world.interact(car, {
    label: () => S.paid ? 'Drive' : 'The car', dist: 3.2, enabled: false, hl: 0xE8A653,
    use: async () => {
      if (!S.paid) { UI.say('JARED', 'Pay first. That is how that works.', { style: 'thought' }); return; }
      audio.door('car', 'open', { vol: .6 });
      await wait(500);
      audio.door('car', 'close', { vol: .6 });
      S.onDrive?.();
    }
  });
  S.pumpRec = pumpRec; S.carRec = carRec;
}

async function fuelStop(ctx, { fuel, marta, S, light }) {
  const { world, player } = ctx;
  const F = FUEL;
  light.dusk({ x: F.x, z: F.z + 8 }, { extent: 30 });
  audio.musicScene('ch1');
  audio.wind(0.2);
  audio.fluorescent([F.x, 2.4, F.z]);
  audio.roomTone(0.04, 700);
  Phone.setClock('6:56');
  player.teleport(F.x + 1.1, F.z + 10.7, 0, 0);
  S.pumpRec.enabled = true;
  S.carRec.enabled = true;
  await UI.fadeIn(1400);
  await convo([J('[prepay after six. the sign is on the door.]')]);

  // he is not driving off with the tank light on, and not without paying.
  await new Promise(res => { S.onDrive = res; });
  S.onDrive = null;
  S.phase = 'drivein';
  await UI.fadeOut(900);
  await wait(300);
}

/* ============================================================
   THE DRIVE IN
   Four more miles, after the sun. Headlights. The town sign, a
   porch light through the trees, and then the hill.
   ============================================================ */
async function theDriveIn(ctx, { S, light }) {
  const { world, player } = ctx;
  light.dusk(RAIL, { extent: 60 });
  audio.musicScene('outside');
  Phone.setClock('7:04');
  player.teleport(RAIL.x - 0.38, RAIL.z + 0.15, 0.42, 0);
  const P = PALETTES.dusk;

  await driveRail(ctx, {
    origin: RAIL, palette: 'dusk', length: 150, maxSpeed: 15, headlights: true, fuel: 0.55, hint: false,
    radio: { station: 'late_night', volume: 0.34, signal: 0.62 },
    seed: 23, fence: true, poles: true, forest: 0.8,
    onStart: async (D) => {
      D.place(roadSign('ASHGROVE\nEST. 1871  ·  POP. 1,140', { w: 2.2, h: 0.7, fg: '#f4f0e4', bg: '#1d4a2c', posts: 2, top: 2.2, P }), 44, 5.6);
      // a porch light, through the trees, the first lit window in forty miles
      const house = new THREE.Group();
      const body = new THREE.Mesh(BOX(6, 3.2, 5), flat(0x2a2622, { rough: .95 }));
      body.position.y = 1.6; house.add(body);
      const roof = new THREE.Mesh(SHAPE.Cone(5.2, 2.2, 4), flat(0x1c1916, { rough: 1 }));
      roof.position.y = 4.2; roof.rotation.y = Math.PI / 4; house.add(roof);
      const win = new THREE.Mesh(PLN(0.9, 1.1), new THREE.MeshBasicMaterial({ color: 0xFFD79A }));
      win.position.set(-1.2, 1.7, -2.52); win.rotation.y = Math.PI; house.add(win);
      const porch = new THREE.Mesh(SPH(0.06, 6), new THREE.MeshBasicMaterial({ color: 0xFFE9C4 }));
      porch.position.set(1.6, 2.3, -2.6); house.add(porch);
      D.place(house, 96, -22, { yaw: 0.5, keep: 30 });
      await wait(1200);
      await convo([J('Left at the only light.')]);
    },
    script: [
      { at: 40, fn: async () => { await convo([J('"Population eleven hundred and forty."'), J('Forty-one.')]); } },
      { at: 100, fn: async (D) => {
        D.place(roadSign('RIDGE RD  ◄', { w: 1.4, h: 0.42, P }), 40, 5.2);
        await wait(2800);
        await convo([J('[the light. it is red. there is nobody else at it.]')]);
      } },
      { at: 132, fn: async () => { await convo([J('There.')]); } }
    ]
  });
  S.phase = 'street';
  await UI.fadeOut(1200);
  await wait(500);
}

/* ============================================================
   RIDGE ROAD, AT DUSK
   The streetlights have just come on. One box in the back of
   the car, and sixteen steps up the outside stair.
   ============================================================ */
function theStreet(ctx, { block, apt, S, ost }) {
  const { world, player } = ctx;

  // the one box left, on the back seat, which is to say on the pavement
  // behind the tailgate where he has set it down to close the door
  const b = cardboardBox(world, 4.6, 0, 9.25, -0.2, { label: 'KITCHEN', open: false, collide: false, tint: 0xb0966d });
  S.kitchenBox = b.g;
  b.g.visible = false;
  S.kitchenRec = carryable(world, b.g, ctx, { label: 'Pick it up', heavy: true });
  S.kitchenRec.enabled = false;

  // the mark on the floor inside, where it goes
  const drop = new THREE.Mesh(PLN(1.6, 1.6), new THREE.MeshBasicMaterial({ color: 0xE8A653, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  drop.rotation.x = -Math.PI / 2;
  drop.position.set(APT.x - 0.9, APT.y + 0.02, APT.z + 1.15);
  world.add(drop);
  world.interact(drop, {
    label: 'Put it down here', dist: 3.0, hl: 0xE8A653,
    use: async () => {
      if (player.carrying?.obj !== S.kitchenBox) { UI.toast(player.carrying ? 'Not that.' : 'Nothing in your hands.'); return; }
      player.drop();
      audio.sfx('setdown', { vol: .46 }); audio.sfx('cloth', { vol: .22 });
      S.kitchenBox.position.set(APT.x - 1.34, APT.y, APT.z + 1.56);
      S.kitchenBox.rotation.set(0, Math.PI - 0.05, 0);
      S.trips = 1;
      objectiveDone('load');
      await convo([
        J('There. That is the last of it.'),
        J('That is everything I own, in a room, and the room is not full.')
      ]);
      S.startUnpacking?.();
    }
  });

  // ---- Mrs. Ostrowski, on the landing, salting the step. In August. ----
  const LAND = block.refs.landing;
  const saltLine = new THREE.Mesh(BOX(1.7, 0.006, 0.14), flat(0xf0f2f4, { rough: .9 }));
  saltLine.position.set(LAND.x, 3.02, LAND.z + 0.72);
  world.add(saltLine);
  world.interact(saltLine, {
    label: 'Salt', dist: 2.0,
    use: () => UI.say('JARED', 'It goes all the way across the head of the stair. Corner to corner. Not a gap in it.', { style: 'thought' })
  });

  world.trigger(LAND.x - 0.3, LAND.z, 2.8, 2.4, {
    y0: 2.5, y1: 4.5, once: true,
    onEnter: async () => {
      if (S.phase !== 'street') return;
      S.metOstrowski = true;
      ost.lookAt(ctx.camera);
      ost.pauseBusy(30);
      await talk(ctx, [
        SAY('MRS. OSTROWSKI', 'You\'re the one upstairs.'),
        J('Yes, ma\'am. Jared.'),
        SAY('MRS. OSTROWSKI', 'Helena. Downstairs, front.'),
        SAY('MRS. OSTROWSKI', 'The radiator knocks. You talk to it, it stops. I\'m not being funny.'),
        J('Okay.'),
        SAY('MRS. OSTROWSKI', 'Machines are downstairs, quarters. Change machine\'s been dead since Easter. Dolores at the diner does it.'),
        SAY('MRS. OSTROWSKI', 'And don\'t use the third from the end. It eats them.'),
        J('Third from the end.'),
        SAY('MRS. OSTROWSKI', '[she watches him not put the box down]')
      ], { focus: ost });
      await talk(ctx, [
        J('...You\'re salting the step.'),
        SAY('MRS. OSTROWSKI', 'For the ice.'),
        J('It\'s August.'),
        SAY('MRS. OSTROWSKI', '[she keeps going]'),
        SAY('MRS. OSTROWSKI', 'You do it before you need it or you don\'t do it. Go on. You\'ll drop that.')
      ], { focus: ost });
      ost.lookAt(null);
      ost.resumeBusy('salt');
    }
  });

  // The shopfronts opposite are shut and stay shut. One of them is about
  // a family this town is going to turn out to be the middle of.
  const cleaners = block.refs.shops?.cleaners;
  if (cleaners?.refs?.door?.g) {
    world.interact(cleaners.refs.door.g, {
      label: 'Read the notice', dist: 2.4,
      use: () => UI.say('JARED', 'CLOSED. Taped from the inside, and the tape has gone yellow. There is a name on the awning. Kowal.', { style: 'thought' })
    });
  }
}

async function arrival(ctx, { block, apt, S, light }) {
  const { world, player } = ctx;
  light.dusk({ x: 0, z: 8 });
  audio.musicScene('ch1');
  apt.startDryers('comfort');
  audio.roomTone(0.05, 620);
  audio.wind(0.18);
  Phone.setClock('7:14');
  // the town is still out, just, and the game two doors up is still on
  audio.getRadio('porch')?.setVolume(0.30);

  S.kitchenBox.visible = true;
  S.kitchenRec.enabled = true;
  player.teleport(3.0, 11.0, 0, -0.93);
  await UI.fadeIn(1800);
  await wait(600);
  await convo([
    J('...'),
    J('Okay. This is it, then.'),
    J('One box. Sixteen steps.')
  ]);
  objective('the last box. up the outside stair.', 'load');
}

/* ============================================================
   THE ROOM
   Three boxes that came up with the truck and one that did not.
   The mirror is the only thing in here that matters, and it
   matters in December.
   ============================================================ */
function theRoom(ctx, { apt, S }) {
  const { world, player } = ctx;

  const booksBox = cardboardBox(world, APT.x - 1.9, APT.y, APT.z + 1.54, Math.PI + 0.03, { label: 'BOOKS', open: false, collide: true, tint: 0xb6a077 });
  const clothesBox = cardboardBox(world, APT.x - 0.78, APT.y, APT.z + 1.58, Math.PI - 0.13, { label: 'CLOTHES', open: false, collide: true, tint: 0xa98f66 });
  const fragileBox = cardboardBox(world, APT.x - 0.24, APT.y, APT.z + 1.54, Math.PI + 0.08, { label: 'MISC. FRAGILE?', open: false, collide: true, tint: 0xb2986e });

  const LINES = {
    'KITCHEN': [
      J('Three mugs. Who packs three mugs.'),
      J('A flashlight. Dad put a flashlight in the kitchen box.'),
      J('And detergent. Good. That was the one thing I actually needed.')
    ],
    'BOOKS': [J('Books I have not read, moved two hundred miles.'), J('Sorry.')],
    'CLOTHES': [J('Everything in here still smells like the house.'), J('That will wear off.')],
    'MISC. FRAGILE?': [
      J('Bubble wrap, a lamp with no shade, and one thing wrapped in a bath towel.'),
      J('Mirror. My mother\'s. She said the room would look bigger.')
    ]
  };

  const openable = [
    { mesh: booksBox.g, label: 'BOOKS' }, { mesh: clothesBox.g, label: 'CLOTHES' },
    { mesh: fragileBox.g, label: 'MISC. FRAGILE?' }, { mesh: S.kitchenBox, label: 'KITCHEN' }
  ];
  const boxRecs = openable.map(b => world.interact(b.mesh, {
    label: 'Open', once: true, enabled: false,
    use: async () => {
      audio.sfx('paper', { vol: .5 });
      S.boxes++;
      await convo(LINES[b.label]);
      if (b.label === 'KITCHEN') {
        player.hasFlashlight = true;
        UI.toast('flashlight', 'F to toggle');
        // the detergent. it goes in his hand and it stays there.
        const det = new THREE.Mesh(BOX(0.16, 0.26, 0.1), flat(0x2b5fa8, { rough: .55 }));
        det.position.copy(b.mesh.position).add(new THREE.Vector3(0.4, 0.1, 0));
        det.castShadow = true; world.add(det);
        const cap = new THREE.Mesh(CYL(0.045, 0.045, 0.03, 10), flat(0xd8d8d2, { rough: .5 }));
        cap.position.y = 0.145; det.add(cap);
        S.detergent = det;
        carryable(world, det, ctx, { label: 'Take the detergent' });
      }
      if (b.label === 'MISC. FRAGILE?') {
        const m = new THREE.Mesh(BOX(0.5, 1.5, 0.05), flat(0x4a3524, { rough: .6 }));
        const gl = new THREE.Mesh(PLN(0.44, 1.44), new THREE.MeshStandardMaterial({ color: 0x8d9aa4, roughness: .06, metalness: .92 }));
        gl.position.z = 0.028; m.add(gl);
        m.position.set(b.mesh.position.x, APT.y + 0.75, b.mesh.position.z + 0.45);
        m.castShadow = true; world.add(m);
        S.mirrorObj = m;
        carryable(world, m, ctx, { label: 'Pick up the mirror', heavy: true });
        objective('hang the mirror. by the door.', 'mirror');
      }
      checkUnpacked();
    }
  }));
  S.boxRecs = boxRecs;

  const checkUnpacked = async () => {
    const kitchen = boxRecs[3].used, fragile = boxRecs[2].used;
    if (kitchen && fragile && S.mirrorHung && !S.unpacked) {
      S.unpacked = true;
      objectiveDone('unpack');
      await wait(400);
      await convo([J('That is unpacked. Eleven minutes.'), J('Quarters.')]);
      objective('quarters. the diner, down the hill. ask for dolores.', 'quarters');
    }
  };
  S.startUnpacking = () => {
    boxRecs.forEach(r => { r.enabled = true; });
    objective('unpack. the boxes are labelled. mostly.', 'unpack');
  };

  // ---- hanging the mirror ----
  const mark = new THREE.Mesh(PLN(0.56, 1.56), new THREE.MeshBasicMaterial({ color: 0xE8A653, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  mark.position.set(APT.x - 1.9, APT.y + 1.05, APT.z + 2 - 0.14);
  mark.rotation.y = Math.PI;
  world.add(mark);
  world.interact(mark, {
    label: 'Hang it here', dist: 2.6, hl: 0xE8A653,
    use: async () => {
      if (player.carrying?.obj !== S.mirrorObj) { UI.toast('Not carrying it.'); return; }
      player.drop();
      world.root.remove(S.mirrorObj);
      apt.refs.mirror.g.visible = true;
      audio.sfx('wood', { vol: .5 });
      S.mirrorHung = true;
      objectiveDone('mirror');
      await convo([J('There. She was right, it does look bigger.'), J('Don\'t tell her.')]);
      checkUnpacked();
    }
  });

  // ---- the window that sticks ----
  const glass = apt.refs.window?.glass;
  if (glass) {
    world.interact(glass, {
      label: 'Force the window', dist: 2.3, hold: 0.9, once: true, hl: 0xE8A653,
      use: async () => {
        S.window = true;
        audio.sfx('wood', { vol: .55 }); audio.sfx('thud', { vol: .3 });
        audio.wind(0.24);
        audio.getRadio('porch')?.setVolume(0.44);
        await convo([J('[it gives four inches, thinks about it, and goes]'), J('Air. And somebody down the row has the game on.')]);
      }
    });
  }
  world.interact(apt.refs.sill, {
    label: 'Look out', dist: 2.0,
    use: async () => {
      await convo([
        J('Ridge Road. All the way down to town and back up the other side to the church.'),
        J('Thirty-one streetlights, the woman at the gas station said. She counted them.')
      ]);
    }
  });
  let fridgeOn = false;
  world.interact(apt.refs.fridge.g, {
    label: () => fridgeOn ? 'Fridge' : 'Plug in the fridge', dist: 2.2,
    use: async () => {
      if (fridgeOn) { UI.say('JARED', 'Empty. Cold, though. That is half of it.', { style: 'thought' }); return; }
      fridgeOn = true; S.fridge = true;
      audio.sfx('switch', { vol: .5 });
      await wait(300);
      audio.roomTone(0.07, 520);
      await convo([J('[it comes on like something waking up]'), J('That is my fridge.')]);
    }
  });
  world.interact(apt.refs.whiteboard, {
    label: 'Whiteboard', dist: 2.0,
    use: () => UI.say('JARED', 'Blank. It came with the fridge.', { style: 'thought' })
  });
  // the radiator, which is not doing anything yet
  world.interact(apt.refs.radiator, {
    label: () => S.phase === 'night' && !S.radiatorDone ? 'Talk to it' : 'Radiator',
    dist: 2.0, hold: 1.4,
    use: async () => {
      if (S.phase === 'night' && !S.radiatorDone) { await S.talkToRadiator?.(); return; }
      UI.say('JARED', 'Cast iron. Eleven fins. Somebody has painted it four times.', { style: 'thought' });
    }
  });
  // the bed. nothing yet.
  const bedMark = new THREE.Mesh(PLN(1.8, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  bedMark.rotation.x = -Math.PI / 2;
  bedMark.position.set(apt.marks.bed.x, apt.marks.bed.y, apt.marks.bed.z);
  world.add(bedMark);
  S.bedRec = world.interact(bedMark, {
    label: 'Sleep', dist: 2.4, enabled: false,
    use: async () => { await S.sleep?.(); }
  });
  // the light switch by the door
  let lightsMode = 'evening';
  world.interact(apt.refs.lightSwitch, {
    label: () => lightsMode === 'evening' ? 'Lights, lamps only' : 'Lights', dist: 2.0,
    use: () => {
      audio.sfx('switch', { vol: .45 });
      lightsMode = lightsMode === 'evening' ? 'lamps' : 'evening';
      apt.setLights(lightsMode);
    }
  });
}

/* ============================================================
   THE ROW ABOVE THE SHOPS
   `buildDiner` and `buildPawn` are 2.7 m boxes written to be
   walked into off a car park; dropped into a four-storey
   terrace they read as sheds in a gap. This is the brick that
   stands over them.
   ============================================================ */
function rowInfill(world, { x, w, name, body = 0x8a5f4e, trim = 0xd8d2c4, sign = '#E8A653' }) {
  const FRONT = 4.5, DEPTH = 9, GF = 3.3, UPPER = 7.2;
  const midZ = FRONT - DEPTH / 2;
  const brick = MAT.brick.clone();
  brick.color.setHex(body);
  brick.userData.own = true;
  world.solid(x, GF, midZ, w, UPPER, DEPTH, brick, { collide: false, tag: 'rowbody' });
  const fascia = new THREE.Mesh(SHAPE.Box(w, GF - 2.62, 0.34), flat(trim, { rough: .88 }));
  fascia.position.set(x, 2.62 + (GF - 2.62) / 2, FRONT - 0.02);
  fascia.castShadow = true; world.add(fascia);
  const corn = new THREE.Mesh(SHAPE.Box(w + 0.3, 0.34, 0.5), flat(trim, { rough: .9 }));
  corn.position.set(x, GF + UPPER - 0.5, FRONT - 0.1);
  corn.castShadow = true; world.add(corn);
  const roof = new THREE.Mesh(SHAPE.Box(w + 0.1, 0.28, DEPTH + 0.1), flat(0x2b2825, { rough: .96 }));
  roof.position.set(x, GF + UPPER + 0.14, midZ);
  world.add(roof);
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 3; i++) {
      const wx = x + (i - 1) * (w / 3.4);
      const wy = GF + 1.05 + f * 2.85;
      const frame = new THREE.Mesh(SHAPE.Box(1.02, 1.42, 0.12), flat(trim, { rough: .86 }));
      frame.position.set(wx, wy, FRONT - 0.06); world.add(frame);
      const glass = new THREE.Mesh(PLN(0.86, 1.26), new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.10, metalness: 0.1 }));
      glass.position.set(wx, wy, FRONT + 0.02); world.add(glass);
      const cill = new THREE.Mesh(SHAPE.Box(1.16, 0.08, 0.2), flat(trim, { rough: .9 }));
      cill.position.set(wx, wy - 0.74, FRONT + 0.02); world.add(cill);
    }
  }
  const s = signBoard(name, Math.min(w - 1.2, 6.4), 0.52, sign, '#1a1512');
  s.position.set(x, 2.9, FRONT + 0.2);
  world.add(s);
}

/* ============================================================
   PEOPLE ON RIDGE ROAD, AT DUSK
   Fewer than the afternoon had, and real: a lathe torso, a
   painted face, and something to do with their hands.
   ============================================================ */
function makeOstrowski(ctx, block) {
  const { world } = ctx;
  const ost = makeGeneric(world, {
    height: 1.55, skin: 0xd8bda6, hair: 0xd6d2c8, top: 0x7a6b7c, bottom: 0x3a3a40,
    boots: 0x2a2a2c, build: 1.06, hairLong: false,
    female: 0.85, hairStyle: 'bun', age: 0.85, glasses: 0x4a453c,
    head: { wide: 1.02, jaw: 0.88, nose: 1.06, chin: 0.90, brow: 0.8 },
    face: { age: 1, iris: 0x5c5a4e, lipCol: 0x9e716b, eyeW: 0.88, eyeGap: 0.98, noseW: 1.06, mouthW: 0.92, lash: 0.3, id: 'ostrowski' },
    name: 'MRS. OSTROWSKI', walkSpeed: 0.72
  });
  const LAND = block.refs.landing;
  ost.setPos(LAND.x + 0.1, 3.0, LAND.z - 0.45);
  ost.face(LAND.x, LAND.z + 3);
  const saltbox = smallProp('saltbox', Math.random);
  saltbox.rotation.z = -0.25;
  saltbox.position.set(0, -0.055, 0.01);
  ost.hold(1, saltbox, { curl: 1, pose: { x: 0.34, z: 0.16, el: -0.62 } });
  ost.setArmPose(1, null);
  ost.setBusy('salt');
  return ost;
}

function streetPeople(ctx, { diner, pawn }) {
  const { world } = ctx;
  const out = [];
  const dale = makeGeneric(world, {
    height: 1.78, skin: 0xc9a184, hair: 0x6a5a45, top: 0x5f6f62, bottom: 0x3a3630,
    boots: 0x2f2a24, build: 1.12, hairLong: false, hairStyle: 'short', age: 0.35,
    head: { wide: 1.04, jaw: 1.10, nose: 1.08, chin: 1.02 },
    face: { iris: 0x4a4030, stubble: 0.55, age: 0.4, id: 'street_a' }, walkSpeed: 0.9
  });
  dale.setPos(-11.6, 0, 10.4); dale.face(-11.6, 6); dale.setBusy('wash');
  out.push(dale);

  const a = makeGeneric(world, {
    height: 1.62, skin: 0xd0a888, hair: 0x4a3b30, top: 0x8a6a72, bottom: 0x38404c,
    boots: 0x3a2f26, build: 0.98, female: 0.95, hairStyle: 'bob', age: 0.45,
    head: { wide: 1.0, jaw: 0.88, nose: 0.94 }, face: { iris: 0x4a3826, lash: 0.6, age: 0.5, id: 'street_b' }
  });
  a.setPos(diner.x - 3.4, 0, 7.6);
  const b = makeGeneric(world, {
    height: 1.57, skin: 0xd8b49a, hair: 0xcfcac0, top: 0x6f7a6a, bottom: 0x3a3a40,
    boots: 0x2a2a2c, build: 1.04, female: 0.9, hairStyle: 'bun', age: 0.8, glasses: 0x554d40,
    head: { wide: 1.02, jaw: 0.9, nose: 1.02 }, face: { iris: 0x5a5448, age: 0.9, id: 'street_c' }
  });
  b.setPos(diner.x - 2.3, 0, 8.3);
  a.face(b.g.position.x, b.g.position.z); b.face(a.g.position.x, a.g.position.z);
  a.lookAt(b.p.headG); b.lookAt(a.p.headG);
  a.setBusy('clasp'); b.setBusy('clasp');
  out.push(a, b);

  const sweeper = makeGeneric(world, {
    height: 1.71, skin: 0xb08a6e, hair: 0x1f1a16, top: 0x4a5560, bottom: 0x2b2f34,
    boots: 0x3a2f26, build: 1.0, hairStyle: 'crop', age: 0.55,
    head: { wide: 0.98, jaw: 1.04, nose: 1.0 }, face: { iris: 0x3a2c1e, stubble: 0.3, age: 0.6, id: 'street_d' }
  });
  sweeper.setPos(pawn.x + 3.0, 0, 6.4); sweeper.face(pawn.x + 3.0, 9);
  const broom = new THREE.Mesh(CYL(0.016, 0.016, 1.3, 6), flat(0x8a6a44, { rough: .95 }));
  broom.position.set(0, -0.5, 0.05);
  sweeper.hold(1, broom, { curl: 0.85, pose: { x: -0.46, z: 0.22, el: -0.94 } });
  sweeper.setArmPose(1, null); sweeper.setBusy('sweep');
  out.push(sweeper);

  let t = 0;
  world.tick((dt) => {
    t += dt;
    const p = ctx.camera.position;
    [dale, sweeper].forEach((c, i) => {
      const d = c.g.position.distanceTo(p);
      if (d < 5.5 && !c._noticed) {
        c._noticed = true; c.lookAt(ctx.camera); c.gesture('nod', 1.0); c.pauseBusy(1.4);
        setTimeout(() => { c.lookAt(null); }, 2400 + i * 400);
      } else if (d > 9) c._noticed = false;
    });
    if (t > 4.2) {
      t = 0;
      (Math.random() < 0.5 ? a : b).gesture(['nod', 'shrug', 'smile', 'shake'][Math.floor(Math.random() * 4)]);
    }
  });
  return out;
}

/* ============================================================
   THE ANTHRACITE DINER
   Open, and the only reason he is in it is a roll of quarters.
   By the register is a corkboard with nine photocopied faces on
   it, which he reads as a small town being a small town.
   ============================================================ */
function theDiner(ctx, { diner, S }) {
  const { world } = ctx;
  const dolores = makeGeneric(world, {
    height: 1.61, skin: 0xd6b096, hair: 0x8a7a68, top: 0xc4c8c2, bottom: 0x3a3a40,
    boots: 0x2a2a2c, build: 1.08, female: 0.92, hairStyle: 'bun', age: 0.62,
    head: { wide: 1.02, jaw: 0.9, nose: 0.98, chin: 0.96 },
    face: { iris: 0x4a3826, lipCol: 0xa8564e, age: 0.62, eyeW: 1.02, lash: 0.5, id: 'dolores' },
    name: 'DOLORES', walkSpeed: 0.85
  });
  dolores.setPos(diner.x + 2.6, 0, diner.z - 2.0);
  dolores.face(diner.x + 2.6, diner.z + 6);
  dolores.setBusy('wipe');

  const jukeGuy = makeGeneric(world, {
    height: 1.75, skin: 0xd8b49a, hair: 0x3a2b20, top: 0x6a5c4a, bottom: 0x2f3540,
    boots: 0x3a2f26, build: 1.02, hairStyle: 'short', age: 0.25,
    head: { wide: 1.0, jaw: 1.06, nose: 1.02 }, face: { iris: 0x3a2c1e, stubble: 0.4, id: 'juke' }
  });
  jukeGuy.setPos(diner.x + 4.2, 0, diner.z + 2.6);
  jukeGuy.face(diner.x + 6, diner.z + 2.6);
  jukeGuy.setBusy('pockets');
  audio.radio('juke', { pos: [diner.x + 4.9, 1.2, diner.z + 2.6], station: 'jazzhop', volume: 0.34, signal: 0.95, set: 'hifi' });

  world.interact(diner.refs.counter.g, {
    label: () => S.quarters ? 'Counter' : 'Change for a five', dist: 2.6,
    use: async () => {
      if (S.quarters) { await talk(ctx, [SAY('DOLORES', 'You\'re still here.'), J('Leaving.')], { focus: dolores }); return; }
      dolores.lookAt(ctx.camera);
      dolores.pauseBusy(30);
      await talk(ctx, [
        SAY('DOLORES', 'Sit anywhere, hon, it\'s all the same seat.'),
        J('I\'m okay. I need change. For the machines.'),
        SAY('DOLORES', '[she looks at him for exactly as long as it takes]'),
        SAY('DOLORES', 'You\'re the boy above the Wash-Rite.'),
        J('...How does everybody know that.'),
        SAY('DOLORES', 'There was a truck.')
      ], { focus: dolores });
      const pick = await UI.choose([
        { text: '"Mrs. Ostrowski sent me."', value: 'helena' },
        { text: '"Just the change, please."', value: 'plain' }
      ]);
      if (pick === 'helena') await talk(ctx, [
        SAY('DOLORES', 'Helena. How is she.'),
        J('She was salting the step.'),
        SAY('DOLORES', '[laughing] In August.'),
        SAY('DOLORES', 'She did that the year her husband died too. Don\'t say anything, she doesn\'t know she does it.')
      ], { focus: dolores });
      else await talk(ctx, [
        SAY('DOLORES', 'Ten dollars in quarters, then. Five isn\'t enough, you\'ll be back down here in an hour.'),
        J('...Thank you.')
      ], { focus: dolores });
      audio.sfx('coin', { vol: .6 });
      await wait(220);
      audio.sfx('coin', { vol: .5, rate: 1.2 });
      S.quarters = 40;
      UI.toast('a roll of quarters', 'forty of them, in paper');
      objectiveDone('quarters');
      objective('detergent, quarters, downstairs. do a wash.', 'wash');
      await talk(ctx, [
        SAY('DOLORES', 'Third machine from the end eats them.'),
        J('I\'ve been told.'),
        SAY('DOLORES', 'Everybody gets told. Everybody uses it once.')
      ], { focus: dolores });
      dolores.lookAt(null);
      dolores.resumeBusy('wipe');
    }
  });

  world.interact(diner.refs.corkboard, {
    label: 'Corkboard', dist: 2.6,
    use: async () => {
      if (S.sawFlyers) { UI.say('JARED', 'Snowplough guy. Church bake sale. A truck for sale in 2009.', { style: 'thought' }); return; }
      S.sawFlyers = true;
      setFlag('sawTheFlyersInChapterOne', true);
      await talk(ctx, [
        J('Snowplough guy. Church bake sale. A truck for sale in 2009.'),
        J('And faces. Photocopies of faces, going grey. MISSING. MISSING.'),
        J('Nine of them, if you count.'),
        J('...Small towns keep everything. My mother\'s parish still has a flyer up for a dog.')
      ], { focus: diner.refs.corkboard, letterbox: false });
    }
  });
  world.interact(diner.refs.jukebox, {
    label: 'Jukebox', dist: 2.2,
    use: () => UI.say('JARED', 'Four working songs and three hundred that are not. Somebody has been standing here for four minutes.', { style: 'thought' })
  });
}

/* ============================================================
   KESSLERTON PAWN & LOAN
   Optional, and worth it: a tray of other people's wedding
   rings, and a book for four dollars.
   ============================================================ */
function thePawn(ctx, { pawn, S }) {
  const { world } = ctx;
  const ray = makeGeneric(world, {
    height: 1.74, skin: 0xc9a184, hair: 0xcfcac0, top: 0x54505c, bottom: 0x3a3630,
    boots: 0x2a2a2c, build: 1.16, hairStyle: 'short', age: 0.72, glasses: 0x2f2a24,
    head: { wide: 1.06, jaw: 1.08, nose: 1.12, chin: 1.0 },
    face: { iris: 0x4a4030, age: 0.75, stubble: 0.2, id: 'pawnbroker' },
    name: 'THE PAWNBROKER', walkSpeed: 0.7
  });
  ray.setPos(pawn.x + 2.4, 0, pawn.z - 2.2);
  ray.face(pawn.x + 2.4, pawn.z + 6);
  ray.setBusy('counter');

  world.trigger(pawn.x, pawn.z + 1.4, 5.0, 3.0, {
    once: true, y0: -1, y1: 2.5,
    onEnter: async () => {
      ray.lookAt(ctx.camera);
      ray.gesture('nod');
      await talk(ctx, [
        SAY('THE PAWNBROKER', 'Buying or selling.'),
        J('...Looking.'),
        SAY('THE PAWNBROKER', 'Everybody\'s looking. Don\'t breathe on the glass.')
      ], { focus: ray });
      ray.lookAt(null);
    }
  });
  pawn.refs.cases.forEach((c, i) => {
    const probe = new THREE.Mesh(BOX(1.9, 0.4, 0.66), new THREE.MeshBasicMaterial({ color: 0xE8A653, transparent: true, opacity: 0 }));
    probe.position.set(c.x, c.top + 0.14, c.z);
    world.add(probe);
    world.interact(probe, {
      label: 'The case', dist: 2.2,
      use: async () => {
        if (i === 1 && !S.sawRings) {
          S.sawRings = true;
          setFlag('sawTheRings', true);
          await convo([
            J('Rings. Three dozen, on a velvet card, with tickets on.'),
            J('All of them somebody\'s. The worst month of thirty-six people\'s lives, at four dollars a gram.')
          ]);
          return;
        }
        UI.say('JARED', ['A camera, two watches and a saxophone.', 'Rings.', 'Tools. A lot of tools.'][i] || 'Glass.', { style: 'thought' });
      }
    });
  });
  world.interact(pawn.refs.hohman, {
    label: 'The book', dist: 2.2,
    use: () => UI.say('JARED', 'THE LONG LOST FRIEND. Four dollars. Somebody has written in the front of it, in pencil, and then rubbed it out.', { style: 'thought' })
  });
}

/* ============================================================
   THE LAUNDROMAT
   Twelve machines, a TV showing static, and her. Walking in
   with no quarters gets forty seconds and an errand; walking in
   with them gets the chapter.
   ============================================================ */
function theLaundromat(ctx, { laundry, apt, recca, S, block, sun, hemi }) {
  const { world } = ctx;
  laundry.startAmbience();

  let staticWatch = 0;
  world.interact(laundry.refs.tv.screen, {
    label: 'Watch', dist: 3.0,
    use: () => UI.say('JARED', 'Static. It\'s been static since I walked in.', { style: 'thought' })
  });
  world.tick((dt) => {
    if (!ctx.player) return;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
    const to = laundry.refs.tv.screen.getWorldPosition(new THREE.Vector3()).sub(ctx.camera.position);
    const near = to.length() < 5.5;
    to.normalize();
    if (near && camDir.dot(to) > 0.93) staticWatch += dt; else staticWatch = 0;
    if (staticWatch > 90 && !S.staticSeen) { S.staticSeen = true; setFlag('watchedStaticFull'); UI.toast('...'); }
  });
  world.interact(laundry.refs.vending, {
    label: 'Vending', dist: 2.2,
    use: () => UI.say('JARED', 'Detergent, two dollars, sold out. Of course.', { style: 'thought' })
  });

  let meetBusy = false;
  world.trigger(laundry.x - 0.2, laundry.z + 0.6, 3.6, 3.4, {
    y0: -1, y1: 2.5,
    onEnter: async () => {
      if (meetBusy || S.met || S.phase !== 'street') return;
      meetBusy = true;
      try {
        if (!S.quarters) await preMeeting(ctx, { recca, S });
        else { S.met = true; await theMeeting(ctx, { recca, laundry, apt, S, block, sun, hemi }); }
      } finally { meetBusy = false; }
    }
  });
  setupMachines(ctx, { laundry, S, recca });
}

function setupMachines(ctx, { laundry, S, recca }) {
  const { world } = ctx;
  const bank = laundry.refs.dryers[0];
  const doors = bank.doors;
  const BAD = doors.length - 6;
  doors.forEach((d, i) => {
    world.interact(d.win, {
      label: () => S.loaded ? 'It\'s running' : 'Machine', dist: 2.4,
      use: async () => {
        if (S.loaded) { UI.say('JARED', 'Thirty-one minutes.', { style: 'thought' }); return; }
        if (!S.quarters) { UI.say('JARED', 'Quarters. I have no quarters.', { style: 'thought' }); return; }
        if (!S.met) { UI.say('JARED', 'I should say something to her first. That is a normal thing that people do.', { style: 'thought' }); return; }
        if (!S.feeding) { UI.say('JARED', 'Not this one.', { style: 'thought' }); return; }
        if (i === BAD && !S.ateIt) {
          S.ateIt = true; S.quarters -= 2;
          audio.sfx('coin', { vol: .55 });
          await wait(500);
          audio.sfx('coin', { vol: .5, rate: 0.9 });
          await wait(900);
          await talk(ctx, [
            J('...'),
            J('[nothing]'),
            SAY('RECCA', '[from the folding table, without looking up] Third from the end.'),
            J('She told me. The landlady told me. Twice.'),
            SAY('RECCA', '[she is enjoying this a great deal] Everybody uses it once.')
          ], { focus: recca, lock: false, letterbox: false });
          recca.gesture('laugh');
          return;
        }
        if (i === BAD) { UI.say('JARED', 'Absolutely not.', { style: 'thought' }); return; }
        audio.sfx('coin', { vol: .55 });
        await wait(380);
        audio.sfx('coin', { vol: .5, rate: 1.1 });
        await wait(300);
        audio.sfx('switch', { vol: .5 });
        S.loaded = true;
        S.quarters -= 6;
        audio.setLoopVol('dryers', 1.0);
        objectiveDone('wash');
        objectiveDone('putiton');
        await convo([J('[it takes it, and it starts]'), J('Thirty-one minutes.')]);
        S.onLoaded?.();
      }
    });
  });
  laundry.refs.dryers.forEach(b => {
    world.interact(b.g, {
      label: 'Machines', dist: 2.6,
      use: () => UI.say('JARED', S.met ? 'Mine\'s the fourth from the left. Apparently.' : 'Quarters. I have no quarters.', { style: 'thought' })
    });
  });
}

/* ============================================================
   THE SHORT VERSION
   No quarters. Forty seconds, she is completely unbothered, and
   it sends him down the hill.
   ============================================================ */
async function preMeeting(ctx, { recca, S }) {
  S.premet = true;
  recca.lookAt(ctx.camera);
  await talk(ctx, [
    SAY('RECCA', 'You\'re standing in front of the good one.'),
    J('Sorry...'),
    SAY('RECCA', 'No, you\'re fine. It\'s just, that one\'s the good one. Everybody stands in front of the good one.'),
    SAY('RECCA', 'You have a bottle of detergent and no laundry.'),
    J('I have quarters.'),
    SAY('RECCA', '[she looks at his hands]'),
    J('I do not have quarters.'),
    SAY('RECCA', 'Diner. Dolores. Ten dollars\' worth, not five, you\'ll only come back.'),
    SAY('RECCA', 'And then come back, because I\'m here another hour and this is the most interesting thing that has happened today.'),
    J('...Okay.'),
    SAY('RECCA', '[she has already gone back to folding]')
  ], { focus: recca });
  recca.lookAt(null);
  objective('quarters. diner. ask for dolores.', 'quarters');
}

/* ============================================================
   THE SCENE
   One long conversation over the tumble of the dryers, broken
   three times by something he has to physically do. Every
   branch ends with her writing her number on a laundry ticket.
   ============================================================ */
async function theMeeting(ctx, { recca, laundry, apt, S, block, sun, hemi }) {
  const { world, player, camera } = ctx;
  recca.lookAt(camera);
  audio.setLoopVol('dryers', 0.9);

  if (!S.premet) await talk(ctx, [
    SAY('RECCA', 'You\'re standing in front of the good one.'),
    J('Sorry...'),
    SAY('RECCA', 'No, you\'re fine. Everybody stands in front of the good one.')
  ], { focus: recca });
  else await talk(ctx, [
    SAY('RECCA', 'He came back.'),
    J('I came back.'),
    SAY('RECCA', 'With quarters and everything. Look at you.')
  ], { focus: recca });

  await talk(ctx, [
    SAY('RECCA', 'You just moved in upstairs. Nobody comes down the outside stair unless they live at the top of it.'),
    SAY('RECCA', 'Is that your car? The wagon?'),
    J('...Yes.'),
    SAY('RECCA', '[long pause]'),
    SAY('RECCA', 'That is a dad car. You didn\'t buy that. Somebody bought you that and said the word "sensible" while they were doing it.'),
    J('...'),
    SAY('RECCA', 'Oh my God, I got it exactly right, didn\'t I.')
  ], { focus: recca });

  const a2 = await UI.choose([
    { text: '"He said it twice, actually."', value: 'twice' },
    { text: '"It has four-wheel drive."', value: 'defend' },
    { text: 'Say nothing.', value: 'quiet' }
  ]);
  if (a2 === 'twice') await talk(ctx, [
    SAY('RECCA', '[laughing] Twice!'),
    J('Once at the dealership and once in the driveway.'),
    SAY('RECCA', 'That\'s going in the vault.')
  ], { focus: recca });
  if (a2 === 'defend') await talk(ctx, [
    SAY('RECCA', 'Sure it does.'),
    J('It genuinely does.'),
    SAY('RECCA', 'I believe you. I\'m just enjoying that that\'s where you went.')
  ], { focus: recca });
  if (a2 === 'quiet') await talk(ctx, [
    SAY('RECCA', '[she waits]'),
    SAY('RECCA', 'You\'re not going to defend the car at all?'),
    J('There\'s no defence.'),
    SAY('RECCA', '[she likes that] Okay. That\'s worse. That\'s so much worse.')
  ], { focus: recca });

  await talk(ctx, [
    SAY('RECCA', 'Recca, by the way.'),
    J('Jared.'),
    SAY('RECCA', 'Jared. And you go to State, because it\'s August and you\'re twenty and you look like you\'ve never touched a wrench.'),
    J('I have touched a wrench.'),
    SAY('RECCA', 'Touched.')
  ], { focus: recca });

  // ============================================================ ACTION ONE
  recca.lookAt(null);
  S.feeding = true;
  objective('put the wash on. NOT the third from the end.', 'putiton');
  await convo([
    SAY('RECCA', 'Go on, then. Put it on, I\'m not going anywhere.'),
    SAY('RECCA', '[she goes back to folding, and she is absolutely watching]')
  ]);
  if (!S.loaded) await new Promise(res => { S.onLoaded = res; });
  await wait(700);
  recca.lookAt(camera);

  await talk(ctx, [
    SAY('RECCA', 'So what are you here for? And don\'t say "the program," nobody comes here for the program.')
  ], { focus: recca });
  const a3 = await UI.choose([
    { text: '"It was the school that would take me."', value: 'humble' },
    { text: '"I wanted to be somewhere nobody knew me."', value: 'honest' },
    { text: '"I don\'t know yet."', value: 'lost' }
  ]);
  if (a3 === 'humble') await talk(ctx, [
    SAY('RECCA', 'Bull.'),
    J('It\'s partly true.'),
    SAY('RECCA', 'Partly true is how people say "I picked it on purpose and I\'m embarrassed about why."')
  ], { focus: recca });
  if (a3 === 'honest') await talk(ctx, [
    SAY('RECCA', '[she stops folding, one second, then keeps going]'),
    SAY('RECCA', 'Well. You did that. Nobody knows you.'),
    SAY('RECCA', 'Congratulations. It\'s awful. You\'ll hate it by October.')
  ], { focus: recca });
  if (a3 === 'lost') await talk(ctx, [
    SAY('RECCA', 'That\'s the most honest thing anybody\'s said to me in this laundromat.'),
    J('What\'s the second most honest?'),
    SAY('RECCA', 'A guy told me the third machine eats quarters. He was right and it changed my life.')
  ], { focus: recca });

  // ---- the name. three hours from now this matters. ----
  await talk(ctx, [
    SAY('RECCA', 'Jared what?'),
    J('Hale.'),
    SAY('RECCA', '[she stops]'),
    SAY('RECCA', 'Hale. Like the, huh. There\'s a Hale on a plaque outside my mom\'s work.'),
    SAY('RECCA', 'Is that you? Is that your people?')
  ], { focus: recca });
  const truth = await UI.choose([
    { text: '"Nothing. It\'s just a name."', hint: 'A lie, and an easy one.', value: false },
    { text: '"My great-grandfather owned the colliery."', hint: 'The truth.', value: true }
  ]);
  setFlag('toldHerTheTruthAboutName', truth);
  if (truth) await talk(ctx, [
    SAY('RECCA', '[a long pause. she folds one whole towel in it.]'),
    SAY('RECCA', 'Okay.'),
    J('I didn\'t know until I was fifteen. Nobody talks about it.'),
    SAY('RECCA', 'I know how that works. Believe me, I know exactly how that works.'),
    J('Do you want me to go?'),
    SAY('RECCA', 'What? No. God, no. You told me. Everybody says "it\'s just a name," and you didn\'t.'),
    SAY('RECCA', '[she smiles] You\'re still standing in front of the good one, though.')
  ], { focus: recca });
  else await talk(ctx, [
    SAY('RECCA', 'Hm. Sure.'),
    J('It\'s a common name.'),
    SAY('RECCA', 'It\'s not, really.'),
    SAY('RECCA', '[she smiles anyway] It\'s fine. Everybody around here is named after somebody they\'d rather not be.')
  ], { focus: recca });

  // ============================================================ ACTION TWO
  await talk(ctx, [SAY('RECCA', 'Here, hold this a second, I\'ve got two more...')], { focus: recca });
  recca.pauseBusy(30);
  recca.gesture('reach', 2.0);
  const towel = new THREE.Mesh(BOX(0.28, 0.10, 0.22), flat(0xd8d3c8, { rough: .98 }));
  towel.position.set(laundry.x - 0.55, laundry.refs.foldTable.top + 0.30, laundry.z + 0.28);
  world.add(towel);
  UI.toast('she is holding it out');
  await new Promise(res => {
    world.interact(towel, { label: 'Take it', dist: 2.4, once: true, hl: 0xE8A653, use: () => { res(); } });
  });
  audio.sfx('cloth', { vol: .3 });
  world.root.remove(towel);
  recca.resumeBusy('fold');

  await talk(ctx, [
    J('[her hands are freezing]'),
    SAY('RECCA', 'Sorry! Bad circulation. My mom says it\'s a family thing.'),
    J('It\'s ninety degrees.'),
    SAY('RECCA', 'It is ninety degrees and my hands are ice, yes, thank you. It\'s my whole personality.')
  ], { focus: recca });

  // ---- the detergent ----
  await talk(ctx, [
    SAY('RECCA', 'Wait. You didn\'t come down here to do laundry.'),
    J('I literally just did a wash. You watched me.'),
    SAY('RECCA', 'You came down the first time with a bottle of detergent and no basket and no quarters, and you stood there.')
  ], { focus: recca });
  const a4 = await UI.choose([
    { text: '"I forgot the detergent."', hint: 'It is in his hand.', value: 'forgot' },
    { text: '"I came down for the detergent machine."', value: 'machine' },
    { text: '"I just came down."', value: 'true' }
  ]);
  setFlag('detergentInHand', true);
  if (a4 === 'forgot') await talk(ctx, [
    SAY('RECCA', 'You forgot the detergent.'),
    J('I forgot the detergent.'),
    SAY('RECCA', '[she looks at the bottle in his hand for a second too long, and then decides not to say it]'),
    SAY('RECCA', 'Okay.')
  ], { focus: recca });
  if (a4 === 'machine') await talk(ctx, [
    SAY('RECCA', 'It\'s been sold out since June.'),
    J('I noticed that.'),
    SAY('RECCA', 'Mm-hm.')
  ], { focus: recca });
  if (a4 === 'true') await talk(ctx, [
    SAY('RECCA', '[she nods, slowly]'),
    SAY('RECCA', 'Yeah. There\'s not a lot else.')
  ], { focus: recca });

  // ---- the ticket ----
  await talk(ctx, [
    SAY('RECCA', 'Right. Do you have a pen? No. [she\'s already got one]'),
    SAY('RECCA', '[she writes on the back of a laundry ticket and folds it once]'),
    SAY('RECCA', 'That\'s me. Text me and I\'ll tell you which machines are lying to you.'),
    J('Okay.'),
    SAY('RECCA', 'Say "okay" one more time and I\'m taking it back.'),
    J('Okay.'),
    SAY('RECCA', '[she laughs] Get out of my laundromat, Jared Hale.')
  ], { focus: recca });
  recca.gesture('laugh');
  audio.sfx('paper', { vol: .5 });
  UI.toast('laundry ticket', 'a phone number, in green pen');
  objective('text her back. not immediately. wait like an hour.', 'text');
  recca.lookAt(null);
  await wait(600);

  await theThreshold(ctx, { recca, apt, S, block });
}

/* ============================================================
   THE THRESHOLD
   Later. His own door, and her on the wrong side of it. He says
   two words and never takes them back. And then, because it is
   a Sunday and she is not going to just stand there, she comes
   in, and she goes, and it is nothing, and it is the game.
   ============================================================ */
async function theThreshold(ctx, { recca, apt, S, block }) {
  const { world, player, camera } = ctx;
  await UI.fadeOut(1200);
  await wait(400);
  S.phase = 'threshold';

  const doorX = apt.x + 1.9, hallZ = apt.z + 3.175;
  player.teleport(doorX + 0.62, hallZ + 0.42, 3.0, -0.42);
  ctx.light.night({ x: 0, z: 8 });
  ctx.people?.forEach(c => c.setPos(0, -50, 0));
  audio.killRadio('porch');
  audio.killRadio('juke');
  audio.killLoop('fluoro', 0.4);
  Phone.setClock('9:52');
  recca.setPos(doorX - 0.62, 3.0, hallZ + 0.18);
  recca.face(doorX, hallZ - 3);
  recca.lookAt(camera);
  recca.setBusy('clasp');
  audio.setLoopVol('dryers', 0.35);
  audio.wind(0.2);
  apt.setLights('lamps');

  await UI.fadeIn(1600);
  await UI.say('', 'Later.', { style: 'thought', dur: 1600 });

  await talk(ctx, [
    SAY('RECCA', '...and it was TWO HUNDRED DOLLARS. For a book that is IN the library.'),
    J('You didn\'t buy it.'),
    SAY('RECCA', 'I absolutely bought it. That\'s what makes it a good story.'),
    SAY('RECCA', '[she stops at the door]'),
    J('...'),
    SAY('RECCA', '[she doesn\'t come in. she just stands there.]')
  ], { focus: recca });

  const inv = await UI.choose([
    { text: '"Come in."', value: 'in' },
    { text: '"...Do you want to come in?"', value: 'ask' },
    { text: '"Goodnight."', value: 'night' }
  ]);
  if (inv === 'night') {
    await talk(ctx, [
      SAY('RECCA', '[she waits one more second]'),
      SAY('RECCA', 'You know I\'m not going to just walk in, right?'),
      J('Why not?'),
      SAY('RECCA', 'Because you didn\'t ask me to.'),
      J('...Come in.')
    ], { focus: recca });
  } else if (inv === 'ask') {
    await talk(ctx, [
      SAY('RECCA', 'Are you asking me or are you asking the door?'),
      J('...I\'m asking you. Come in.')
    ], { focus: recca });
  } else {
    await talk(ctx, [SAY('RECCA', '[she smiles]'), SAY('RECCA', 'Yeah. Okay.')], { focus: recca });
  }
  setFlag('invitedHerIn', true);
  S.sheCameIn = true;

  // ---- she comes in ----
  audio.door('wood', 'open', { vol: .55 });
  await wait(500);
  await UI.fadeOut(700);
  // the door is open, he is inside, she is inside, and she has walked
  // straight to the window, the way people do in a room they have not
  // seen from the inside before
  player.teleport(apt.x + 0.9, apt.z + 1.2, APT.y, 0.4);
  recca.setPos(apt.refs.sill.position.x - 0.55, APT.y, apt.refs.sill.position.z - 0.75);
  recca.face(apt.refs.sill.position.x, apt.refs.sill.position.z + 4);
  recca.setBusy('clasp');
  recca.lookAt(null);
  await UI.fadeIn(900);
  await wait(600);

  await talk(ctx, [
    SAY('RECCA', '[she looks at the whole room at once, the way you do]'),
    SAY('RECCA', 'You hung a mirror before you hung a curtain.'),
    J('It was my mother\'s.'),
    SAY('RECCA', 'It\'s a good mirror.'),
    SAY('RECCA', '[she does not go near it]')
  ], { focus: recca });
  recca.lookAt(camera);
  await talk(ctx, [
    SAY('RECCA', '[at the window] You can see the whole hill from here. All the way up to the church.'),
    J('Four miles.'),
    SAY('RECCA', 'Thirty-one streetlights. Don\'t count them, it\'s a trap, you\'ll do it every night.'),
    J('The woman at the gas station said thirty-one.'),
    SAY('RECCA', '[a beat]'),
    SAY('RECCA', 'That\'s my mom.'),
    J('...Oh.'),
    SAY('RECCA', 'Yeah. Small. I told you. [she smiles] Did she feed you?'),
    J('She gave me directions.'),
    SAY('RECCA', 'Then she liked you. If she didn\'t like you she\'d have fed you.')
  ], { focus: recca });
  await talk(ctx, [
    SAY('RECCA', 'Okay. Okay, I\'m going. It\'s late and you\'re holding a bottle of detergent in your own apartment.'),
    J('...I am.'),
    SAY('RECCA', 'Night, Jared Hale.'),
    J('Night.')
  ], { focus: recca });
  recca.lookAt(null);
  recca.speed = 0.9;
  recca.walkTo(apt.x + 1.9, apt.z + 2.6, () => {
    audio.door('wood', 'close', { vol: .5 });
    recca.setPos(0, -50, 0);
  });
  await wait(2600);
  audio.door('wood', 'close', { vol: .5 });
  recca.setPos(0, -50, 0);
  await convo([J('[he hears her on the stair. and then he doesn\'t.]')]);

  await theNight(ctx, { apt, S, block });
}

/* ============================================================
   THE NIGHT
   Nothing happens. He texts her back too soon. He goes to bed.
   At 3:04 the radiator knocks, and he talks to it, and it
   stops, which is funny. And across the road there is somebody
   under the streetlight, looking up, which is not.
   ============================================================ */
async function theNight(ctx, { apt, S, block }) {
  const { world, player, camera } = ctx;
  S.phase = 'evening';
  Phone.setClock('10:31');
  objective('bed. it has been a day.', 'bed');
  S.bedRec.enabled = true;
  UI.toast('F', 'flashlight');

  // the text. she said an hour. it has been thirty-nine minutes.
  setTimeout(async () => {
    if (S.slept) return;
    addMessage('them', 'made it home. the good one really is the 4th from the left. i lied earlier', '10:34 PM');
    audio.sfx('text', { vol: .5 });
    UI.toast('1 message', 'Tab');
    Phone.setClock('10:34');
    await wait(5000);
    if (S.slept) return;
    await convo([J('An hour. She said wait an hour.')]);
    const r = await UI.choose([
      { text: '"4th from the left. noted. thank you for the towel"', value: 'a' },
      { text: '"it has been thirty nine minutes"', value: 'b' },
      { text: 'Don\'t answer yet.', value: 'c' }
    ]);
    S.textedBack = r !== 'c';
    if (r === 'a') { addMessage('me', '4th from the left. noted. thank you for the towel', '10:35 PM'); addMessage('them', 'you are welcome for the towel. go to sleep jared hale', '10:36 PM'); }
    if (r === 'b') { addMessage('me', 'it has been thirty nine minutes', '10:35 PM'); addMessage('them', 'i KNOW. go to sleep', '10:35 PM'); }
    if (r === 'c') { await wait(6000); if (!S.slept) { addMessage('them', 'ok night', '10:58 PM'); audio.sfx('text', { vol: .4 }); } }
  }, 9000);

  // he can wash up, which is the kind of thing this game lets you do
  const basin = apt.bath?.refs?.basin;
  if (basin) {
    world.interact(basin, {
      label: 'Wash up', dist: 2.0, once: true,
      use: async () => {
        audio.sfx('pour', { vol: .4 });
        await convo([J('[the water runs brown for a second and then clear]'), J('[the mirror in the cabinet is cracked, corner to corner. it came like that.]')]);
      }
    });
  }

  // ---- sleep ----
  await new Promise(res => {
    S.sleep = async () => {
      S.slept = true;
      objectiveDone('bed');
      apt.setLights('night');
      await UI.fadeOut(2200);
      await wait(800);
      res();
    };
  });
  S.sleep = null;
  S.bedRec.enabled = false;

  // ============================================================ 3:04 AM
  S.phase = 'night';
  Phone.setClock('3:04');
  audio.musicScene('town');
  audio.setMusicIntensity(0.04);
  audio.setLoopVol('dryers', 0.0);
  audio.wind(0.12);
  ctx.light.night({ x: 0, z: 8 });
  apt.setLights('night');
  player.teleport(apt.marks.wake.x, apt.marks.wake.z, APT.y, apt.marks.wake.yaw + 0.6);
  player.pitch = -0.2;
  player.canMove = false;
  player.setFlashlight(false);
  await UI.fadeIn(3000);
  await wait(2600);

  // ---- the radiator ----
  const radPos = apt.refs.radiator.position.clone();
  const knock = (vol = 1) => {
    audio.sfx('metal', { vol: .9 * vol, pos: radPos.toArray() });
    audio.sfx('thud', { vol: .7 * vol, pos: radPos.toArray() });
  };
  scares.fire('ch1.radiator', () => {
    knock(1.2); setTimeout(() => knock(1.1), 160); setTimeout(() => knock(1.3), 330);
    player.shake = 1.0;
  });
  await wait(900);
  player.canMove = true;
  await convo([J('...')]);
  let knocking = true, kt = 0;
  const ktick = world.tick(dt => {
    if (!knocking) return;
    kt += dt;
    if (kt > 1.9 + Math.random() * 1.4) { kt = 0; knock(0.8); if (Math.random() < 0.4) setTimeout(() => knock(0.6), 140); }
  });
  objective('the radiator. she said talk to it.', 'rad');
  S.talkToRadiator = async () => {
    await convo([J('...Okay.'), J('Okay. I\'m talking to it.'), J('Stop.')]);
    await wait(1200);
    knock(0.9);
    await wait(2200);
    knocking = false; world.untick(ktick);
    S.radiatorDone = true;
    objectiveDone('rad');
    await convo([J('...'), J('Huh.')]);
    await wait(600);
    objective('bed.', 'bed2');
    S.bedRec.enabled = true;
  };
  // if he simply will not go near it, it wears itself out. they do.
  setTimeout(() => { if (!S.radiatorDone) { knocking = false; world.untick(ktick); S.radiatorDone = true; objectiveDone('rad'); objective('bed.', 'bed2'); S.bedRec.enabled = true; } }, 75000);

  // ---- the window. somebody across the road, in front of the shut shop. ----
  const poles = block.refs.streetlights?.poles || [];
  const sill = apt.refs.sill.position;
  // the lamp nearest the window, which is the one whose light she is
  // standing at the edge of, and the one that is going to go out
  let pole = null, best = 1e9;
  const wp = new THREE.Vector3();
  poles.forEach(p => { p.lamp.getWorldPosition(wp); const d = Math.abs(wp.x - sill.x); if (d < best) { best = d; pole = p; } });
  const fx = sill.x + 1.6, fz = 24.2;
  const figure = makeGeneric(world, {
    height: 1.64, skin: 0xd8bda6, hair: 0x5a3a28, top: 0x6b5f52, bottom: 0x2c3444,
    coat: true, boots: 0x4a3b2c, build: 0.92, hairLong: true, female: 1, hairStyle: 'wave',
    face: { iris: 0x556a4a, lash: 1, id: 'streetlight' }
  });
  figure.setPos(fx, 0, fz);
  figure.face(sill.x, sill.z);
  figure.lookAt(new THREE.Vector3(sill.x, APT.y + 1.5, sill.z));
  let seen = 0, gone = false;
  const headPos = new THREE.Vector3();
  const wtick = world.tick(dt => {
    if (gone) return;
    figure.p.headG.getWorldPosition(headPos);
    const to = headPos.clone().sub(camera.position);
    const d = to.length(); to.normalize();
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const near = Math.hypot(player.pos.x - sill.x, player.pos.z - sill.z) < 2.6;
    if (near && d < 45 && camDir.dot(to) > 0.965) seen += dt; else seen = Math.max(0, seen - dt * 0.5);
    if (seen > 2.4) {
      gone = true; world.untick(wtick);
      S.sawWindow = true;
      scares.fire('ch1.window', async () => {
        // the light goes out for half a second. when it comes back there is nobody.
        const off = (v) => { if (!pole) return; pole.lamp.material.color.setHex(v ? 0x5a5244 : 0xE8A653); pole.halo.material.opacity = v ? 0 : 0.26; pole.pool.material.opacity = v ? 0 : 0.16; if (pole.pl) pole.pl.intensity = v ? 0 : 2.4; };
        off(true); await wait(140); off(false); await wait(90); off(true);
        figure.setPos(0, -50, 0);
        await wait(420); off(false);
      });
      (async () => {
        await wait(1500);
        await convo([J('...'), J('[the light]'), J('[nobody. okay. nobody.]')]);
      })();
    }
  });
  // and if he never looks, she is not there to be looked at.
  setTimeout(() => { if (!gone) { gone = true; world.untick(wtick); figure.setPos(0, -50, 0); } }, 150000);

  // ---- and back to bed, and the chapter ends ----
  await new Promise(res => {
    S.sleep = async () => {
      objectiveDone('bed2');
      await UI.fadeOut(2400);
      await wait(800);
      res();
    };
  });
  gone = true; world.untick(wtick);
  await ctx.next();
}

export default ch1;
