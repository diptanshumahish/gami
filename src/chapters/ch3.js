/* ============================================================
   CHAPTER THREE, "Nine"
   Oct 20 – Dec 15 · 31°F · ~50 min, up to 90 if explored

   Emotion target: paranoia, and the shame of it.
   The open chapter. Objectives are soft, a list in the phone's
   Notes app that Jared writes himself, in his own bad shorthand.
   Wandering is rewarded, never punished.
   ============================================================ */
import * as THREE from 'three';
import { buildApartment } from '../world/loc_home.js';
import { buildRidgeBlock, signBoard, volvo } from '../world/loc_street.js';
import { buildSky } from '../world/sky.js';
import { buildVaskoHouse } from '../world/loc_vasko.js';
import { buildDiner, buildPawn, buildFuelGo, buildCemetery, buildLibrary, buildMine } from '../world/loc_town.js';
import { makeRecca, makeMarta, makeButtons, makeGeneric, smallProp, clutter } from '../world/props.js';
import { MAT, flat, tiled, T } from '../world/mat.js';
import { BOX, CYL, SPH, PLN } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { convo, J, SAY, objective, objectiveDone, numb, hingedDoor } from './util.js';
import { setFlag, flag, addMessage, addTape, state, bump } from '../core/state.js';
import { TAPES } from '../content/tapes.js';
import {
  SENTINEL_1963, SENTINEL_1963_B, FLYERS, flyerHTML, HOHMAN,
  WHITEBOARD, GRAFFITI_NOTE, NINE,
  CLEANERS_TICKET, REALTY_LEDGER, REALTY_CARD_118
} from '../content/docs.js';

const L = {
  apt: { x: 0, y: 3.0, z: 0 },
  vasko: { x: -80, y: 0, z: 0 },
  diner: { x: 60, y: 0, z: 0 },
  pawn: { x: 60, y: 0, z: 42 },
  fuel: { x: 60, y: 0, z: -48 },
  library: { x: -40, y: 0, z: 62 },
  cemetery: { x: 132, y: 0, z: 0 },
  mine: { x: 0, y: 0, z: -150 },
  barn: { x: -34, y: 0, z: -74 },
  graffiti: { x: -10, y: 0, z: -100 }
};

export const ch3 = {
  id: 'ch3', card: 'CHAPTER THREE', title: 'Nine', date: 'October 20 – December 15, 2014', temp: '31°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('winter');
    // Overcast, and the snow throwing the sodium light back up into the
    // cloud, so the sky is brighter than the ground and has no stars in it.
    ctx.sky = buildSky(world, { preset: 'winterNight', camera: ctx.camera, fogDensity: 0.0095 });
    world.hemi(0x4c637d, 0x14100c, 1.25);
    world.sun([-0.5, -0.9, -0.45], 0xC3D2E4, 2.2);

    // ------------------------------------------------------------ world
    // Nobody. Not one person on Ridge Road, and by this chapter that is
    // load-bearing rather than a saving.
    // The two shops opposite are open in this chapter and only in this
    // chapter. Chapter Three is the one that hands him a flashlight and
    // stops telling him where to go.
    const block = buildRidgeBlock(world, { x: 0, y: 0, z: 0, night: true, snow: true, life: false, shopsOpen: true });
    const apt = buildApartment(world, { x: L.apt.x, y: L.apt.y, z: L.apt.z, boxes: false, lightsOn: true, winter: true, hall: true });
    apt.refs.mirror.g.visible = true;
    const vasko = buildVaskoHouse(world, { ...L.vasko, state: 'lived' });
    const diner = buildDiner(world, L.diner);
    const pawn = buildPawn(world, L.pawn);
    const fuel = buildFuelGo(world, { ...L.fuel, snow: true });
    const library = buildLibrary(world, L.library);
    const cem = buildCemetery(world, { ...L.cemetery, snow: true });
    const mine = buildMine(world, { ...L.mine, snow: true });
    const barn = buildBarn(world, L.barn);
    const graffiti = buildGraffiti(world, L.graffiti);

    const recca = makeRecca(world, { coat: true });
    recca.setPos(0, -50, 0);
    Phone.subject = recca;
    Phone.cameraStage = 2;      // a second silhouette behind her, now
    const marta = makeMarta(world);
    marta.setPos(L.fuel.x + 1.4, 0, L.fuel.z + 2.4);
    marta.face(L.fuel.x - 2, L.fuel.z + 2.4);
    const buttons = makeButtons(world, 4.2, 0, 6.5);

    ctx.refs = { block, apt, vasko, diner, pawn, fuel, library, cem, mine, barn, graffiti, recca, marta, buttons };

    audio.wind(0.4);
    audio.roomTone(0.035, 400);
    apt.startDryers('background');

    // ------------------------------------------------------------ notes
    // he writes these himself, in his own bad shorthand.
    objective('ask her about the ring thing', 'n1');
    objective('library, microfilm. 1963. ask the woman.', 'n2');
    objective('count the flyers at the diner. i counted 9 twice.', 'n3');
    objective('cemetery. the vasko plot.', 'n4');
    objective('the barn on colliery. the white one.', 'n5');

    const S = ctx.S = { found: 0, tapes: 0, escalation: 0 };

    // ------------------------------------------------------------ tapes
    scatterTapes(ctx, L);

    // ------------------------------------------------------------ content
    setupApartment(ctx, apt, recca, S);
    setupLibrary(ctx, library, S);
    setupDiner(ctx, diner, S);
    setupPawn(ctx, pawn, S);
    setupCemetery(ctx, cem, recca, S);
    setupFuelGo(ctx, fuel, marta, S);
    setupBarn(ctx, barn, S);
    setupMine(ctx, mine, S);
    setupGraffiti(ctx, graffiti);
    setupRow(ctx, block.refs.shops, S);
    setupButtons(ctx, buttons, recca, S);
    setupTravel(ctx, L, block);

    // ------------------------------------------------------------ start
    player.teleport(L.apt.x + 1.2, L.apt.z + 1.0, L.apt.y, Math.PI);
    player.hasFlashlight = true;
    Phone.setClock('4:40');

    await wait(300);
    await convo([
      J('October.'),
      J('She asked me to stop wearing the ring. That was three weeks ago and I said okay, because it was a stupid ring, and because she asked nicely.'),
      J('Last week she asked me to stop calling my father.'),
      J('I said okay to that too.')
    ]);
    UI.toast('notes', 'J to open');
  }
};

// ============================================================ APARTMENT
function setupApartment(ctx, apt, recca, S) {
  const { world, player } = ctx;

  // the mirror gets a sheet over it. she says it's the streetlight.
  let sheeted = false;
  const sheet = new THREE.Mesh(PLN(0.66, 1.62), flat(0xdad5c8, { rough: 1, side: THREE.DoubleSide }));
  sheet.position.set(apt.x - 1.9, apt.y + 1.05, apt.z + apt.D / 2 - 0.14);
  sheet.rotation.y = Math.PI;
  sheet.rotation.z = 0.02;
  sheet.visible = false;
  world.add(sheet);

  world.interact(apt.refs.mirror.g, {
    label: () => sheet.visible ? 'The sheet' : 'Mirror', dist: 2.2,
    use: async () => {
      if (!sheet.visible) {
        await convo([J('It\'s a mirror. She hung it.'), J('She hung it in August and she has stopped looking at it.')]);
      } else {
        await convo([
          J('She put a sheet over it on Tuesday.'),
          J('She said it\'s the streetlight, that it comes through the window and bounces and it\'s in her eyes all night.'),
          J('The streetlight is on the other side of the room.'),
          J('I didn\'t say that.')
        ]);
      }
    }
  });

  // the whiteboard drawings change
  let wb = 0;
  apt.setWhiteboard(WHITEBOARD[0]);
  world.interact(apt.refs.whiteboard, {
    label: 'Whiteboard', dist: 2.2,
    use: () => {
      const texts = [
        '"milk, the good kind not the blue one"',
        '"you left the burner on again, r"',
        '"gone to work. there is soup. EAT THE SOUP"',
        'A heart. Just a heart.',
        '"your dad called. i said you were out. you owe me"',
        'A bird. It has too many legs.',
        '...',
        'It\'s been wiped. There\'s marker dust on the floor under it.'
      ];
      UI.say('JARED', texts[Math.min(wb, texts.length - 1)], { style: 'thought' });
    }
  });

  // ---- escalation beat: say your full name out loud ----
  const bedMark = new THREE.Mesh(PLN(1.8, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  bedMark.rotation.x = -Math.PI / 2;
  bedMark.position.set(apt.marks.bed.x, apt.marks.bed.y, apt.marks.bed.z);
  world.add(bedMark);

  world.interact(bedMark, {
    label: 'Sleep', dist: 2.4,
    use: async () => {
      S.escalation++;
      wb = Math.min(wb + 1, 7);
      apt.setWhiteboard(WHITEBOARD[Math.min(wb, WHITEBOARD.length - 1)]);
      await UI.fadeOut(1200);
      await nightBeat(ctx, apt, recca, sheet, S);
      await UI.fadeIn(1600);
    }
  });
}

/** The nights, in order. */
async function nightBeat(ctx, apt, recca, sheet, S) {
  const { world, player } = ctx;
  const n = S.escalation;
  apt.setLights('night');
  Phone.setClock('3:0' + (n % 6));
  player.teleport(apt.marks.wake.x, apt.marks.wake.z, apt.y, apt.marks.wake.yaw);

  if (n === 1) {
    // she asks him to say his own full name out loud "so I can hear it"
    recca.setPos(apt.marks.bedEdge.x, apt.marks.bedEdge.y, apt.marks.bedEdge.z);
    recca.face(apt.marks.bedEdge.x - 4, apt.marks.bedEdge.z);
    recca.lookAt(ctx.camera);
    await UI.fadeIn(1600);
    await convo([
      SAY('RECCA', 'Say your name.'),
      J('...What?'),
      SAY('RECCA', 'Your whole name. Out loud. I want to hear you say it.'),
      J('It\'s three in the morning.'),
      SAY('RECCA', 'Please.')
    ]);
    const c = await UI.choose([
      { text: '"Jared Aldous Hale."', value: 'say' },
      { text: '"No."', value: 'no' },
      { text: '"Why?"', value: 'why' }
    ]);
    if (c === 'why') {
      await convo([
        SAY('RECCA', 'Because I like it.'),
        SAY('RECCA', 'Because nobody says their own name and I want to know what yours sounds like in your mouth.'),
        SAY('RECCA', 'Please, Jared.')
      ]);
    }
    if (c === 'no') {
      await convo([
        SAY('RECCA', '[she doesn\'t argue]'),
        SAY('RECCA', 'Okay.'),
        SAY('RECCA', '[three nights later she asks again, and he says it, because it is a small thing and she is crying]')
      ]);
    }
    setFlag('saidHisFullNameAloud');
    await convo([
      J('Jared Aldous Hale.'),
      SAY('RECCA', '[she says it back, once, very quietly]'),
      SAY('RECCA', 'Thank you.'),
      J('[she writes it down]'),
      J('[on the back of something, in the dark, without looking at it]')
    ]);
    recca.setPos(0, -50, 0);
    objectiveDone('n1');
  }

  else if (n === 2) {
    // the sheet appears
    sheet.visible = true;
    await UI.fadeIn(1600);
    audio.sfx('breath', { vol: .2 });
    await convo([J('...'), J('There\'s a sheet over the mirror.')]);
  }

  else if (n === 3) {
    // the doorway / foot of the bed / gone. then a hand.
    await UI.fadeIn(1600);
    recca.setPos(apt.marks.doorway.x, apt.marks.doorway.y, apt.marks.doorway.z);
    recca.face(apt.x, apt.z);
    recca.lookAt(null);
    scares.fire('ch3.doorway', () => {});
    await wait(2600);
    await UI.say('JARED', '[she\'s standing in the doorway]', { style: 'thought', dur: 2200 });
    // pan away and back
    await wait(400);
    let moved = false;
    const t = world.tick(() => {
      const facing = Math.cos(player.yaw + Math.PI / 2);
      if (!moved && facing > 0.2) {
        moved = true;
        recca.setPos(apt.marks.bedFoot.x, apt.marks.bedFoot.y, apt.marks.bedFoot.z);
        recca.face(apt.marks.bedFoot.x + 2.5, apt.marks.bedFoot.z);
      }
    });
    await wait(3800);
    world.untick(t);
    await UI.say('JARED', '[foot of the bed]', { style: 'thought', dur: 1800 });
    recca.setPos(0, -50, 0);
    await wait(1600);
    await UI.say('JARED', '[gone]', { style: 'thought', dur: 1800 });
    await wait(900);
    // Contact. 1 of 4. Removed entirely under Reduce Jumpscares.
    const fired = scares.fire('ch3.shoulder', () => { player.shake = 1.4; });
    if (fired) {
      await UI.say('', '[a hand on his shoulder]', { dur: 1800 });
      await convo([
        SAY('RECCA', 'It\'s me.'),
        SAY('RECCA', 'It\'s me, baby. It\'s me. Breathe.')
      ]);
    } else {
      await convo([
        SAY('RECCA', '[from behind him, in the dark, without any sound of her having crossed the room]'),
        SAY('RECCA', 'It\'s me.')
      ]);
    }
  }

  else if (n === 4) {
    // false alarm. a coat on a hook.
    await UI.fadeIn(1600);
    ctx.refs.apt.refs.coat.visible = true;
    scares.fire('ch2.coathook', () => {});
    await wait(2400);
    await convo([
      J('[there is somebody standing by the door]'),
      J('...'),
      J('It\'s my coat.'),
      J('It\'s my own coat on a hook.')
    ]);
  }

  else {
    await UI.fadeIn(1600);
    await convo([J('[he doesn\'t sleep much any more]')]);
  }

  apt.setLights('evening');
  Phone.setClock('9:1' + (n % 9));
}

// ============================================================ LIBRARY
function setupLibrary(ctx, library, S) {
  const { world } = ctx;
  world.interact(library.refs.microfilm, {
    label: 'Microfilm. Ashgrove Sentinel', dist: 2.4,
    use: async () => {
      audio.sfx('metal', { vol: .3 });
      await UI.openReader(SENTINEL_1963, 'doc-news');
      if (!flag('sawMicrofilm')) {
        setFlag('sawMicrofilm');
        S.found++;
        objectiveDone('n2');
        await convo([
          J('Nine men.'),
          J('Vasko.'),
          J('Prosser, that\'s Dale. That\'s the diner. He gives me free coffee.'),
          J('Kowal.'),
          J('...Kowal.'),
          J('Victor\'s name is on this.'),
          J('And so is mine. Not my name. The other one. The one that gave the order.')
        ]);
        objective('aldous hale. ask dad. do not ask dad.', 'n6');
        objective('victor. st brigids. you have to go.', 'n7');
      }
      await UI.openReader(SENTINEL_1963_B, 'doc-news');
    }
  });
  world.interact(library.refs.returnBin, {
    label: 'Return bin', dist: 2.0,
    use: () => UI.say('JARED', 'Books, a scarf, and something at the bottom that isn\'t a book.', { style: 'thought' })
  });
}

// ============================================================ DINER
function setupDiner(ctx, diner, S) {
  const { world } = ctx;
  let counted = 0;
  const shot = new Set();

  diner.refs.flyers.forEach((f, i) => {
    world.interact(f, {
      label: 'Flyer', dist: 2.4,
      use: async () => {
        await UI.openReader(flyerHTML(FLYERS[i]), 'doc-flyer');
        if (!shot.has(i)) {
          shot.add(i);
          state.set(s => ({ flyers: [...new Set([...s.flyers, i])] }));
          if (shot.size === 9) {
            setFlag('photographedAllFlyers');
            await convo([
              J('Nine.'),
              J('Sixty-five. Seventy-four. Eighty-three. Ninety-two. Two thousand one.'),
              J('Every nine years.'),
              J('And then four more that don\'t fit, except they do, they\'re the years it didn\'t take.'),
              J('Nineteen, twenty, twenty-one. All of them. All local.'),
              J('Elena Kowal. Two thousand eleven.'),
              J('Victor\'s sister.'),
              J('...'),
              J('There\'s no tenth flyer.'),
              J('There\'s no tenth flyer because nobody reported her.')
            ]);
            objectiveDone('n3');
            S.found++;
            objective('there is no flyer for recca', 'n8');
          }
        }
      }
    });
  });

  // Dale
  const dale = makeGeneric(world, {
    height: 1.76, skin: 0xd0a888, hair: 0xcfcac0, top: 0xe8e4d8, bottom: 0x3a3a40,
    boots: 0x2a2a2c, build: 1.2, hairLong: false, age: 0.5, hairStyle: 'short',
    head: { wide: 1.07, jaw: 1.16, nose: 1.30, chin: 1.0, brow: 1.3 },
    face: {
      age: 0.8, stubble: 0.5, iris: 0x51534a, eyeW: 0.88,
      eyeGap: 1.05, noseW: 1.25, mouthW: 1.06, id: 'dale'
    }
  });
  dale.setPos(diner.x + 2.6, 0, diner.z - 2.0);
  dale.face(diner.x + 2.6, diner.z + 4);
  world.interact(dale.g, {
    label: 'Dale', dist: 2.8,
    use: async () => {
      dale.lookAt(ctx.camera);
      const opts = [
        { text: '"Who are the flyers?"', value: 'flyers' },
        { text: '"Do you know a Kowal?"', value: 'kowal' },
        { text: '"Coffee."', value: 'coffee' }
      ];
      const a = await UI.choose(opts);
      if (a === 'coffee') await convo([
        SAY('DALE', 'On the house.'),
        J('You always say that.'),
        SAY('DALE', 'And I always mean it. Sit anywhere. Not that booth, the vinyl\'s split and it bites.')
      ]);
      if (a === 'flyers') await convo([
        SAY('DALE', '[he doesn\'t look at the board]'),
        SAY('DALE', 'Ahh, those are. I keep meaning to take those down. They\'re old, most of \'em. Some of \'em are older than you.'),
        J('There\'s nine.'),
        SAY('DALE', '[a beat]'),
        SAY('DALE', 'Is there?'),
        SAY('DALE', 'Huh. Well. Small town, long time. You want a refill?')
      ]);
      if (a === 'kowal') await convo([
        SAY('DALE', 'Sure. Wik\'s up at Brigid\'s. Good kid. Smokes too much.'),
        J('And Elena.'),
        SAY('DALE', '[he wipes the same six inches of counter for a while]'),
        SAY('DALE', 'That was a bad year, that one.'),
        J('Dale.'),
        SAY('DALE', 'You know what, I got a fryer going. Take a booth, I\'ll bring you something.')
      ]);
      dale.lookAt(null);
    }
  });
}

// ============================================================ PAWN
function setupPawn(ctx, pawn, S) {
  const { world } = ctx;
  world.interact(pawn.refs.hohman, {
    label: 'The Long Lost Friend, $4', dist: 2.2,
    use: async () => {
      await UI.openReader(HOHMAN, 'doc-hohman');
      if (!flag('readHohman')) {
        setFlag('readHohman');
        S.found++;
        UI.toast('read', 'this changes three things later');
        await convo([
          J('It\'s a real book. It\'s from 1820.'),
          J('Somebody\'s underlined the same line twice, hard enough to go through the paper.'),
          J('"Consent is the whole of the matter."'),
          J('And there\'s a pawn ticket in the back. Two thousand eleven.'),
          J('E. Kowal.')
        ]);
        objective('do not answer if something says your name in the dark', 'n9');
      }
    }
  });
}

// ============================================================ CEMETERY
function setupCemetery(ctx, cem, recca, S) {
  const { world, player } = ctx;
  world.interact(cem.refs.vaskoStone, {
    label: 'Vasko', dist: 2.4,
    use: () => UI.say('JARED', 'Andrej, 1911 to 1963. Andrej Jr., 1943 to 1999. Her grandfather and her father.', { style: 'thought' })
  });

  let dug = 0;
  const stoneRec = world.interact(cem.refs.freshStone, {
    label: () => dug === 0 ? 'A fresh stone. No name on it.' : 'Keep digging', dist: 2.6, hold: dug === 0 ? 0 : 1.2,
    use: async () => {
      if (dug === 0) {
        dug = 1;
        await convo([
          J('It\'s new. The kerb\'s weathered and this is new.'),
          J('It\'s laid flat and there\'s nothing cut into it.'),
          J('The dirt hasn\'t settled.')
        ]);
        objective('the stone has no name on it', 'n10');
        return;
      }
      // he gets about ten centimetres down.
      dug++;
      audio.sfx('thud', { vol: .4 });
      player.shake = 0.4;
      cem.refs.dirt.position.y -= 0.02;
      if (dug === 2) await UI.say('JARED', '[the spade]', { style: 'thought', dur: 1400 });
      if (dug === 3) await UI.say('JARED', '[it\'s frozen about two inches down]', { style: 'thought', dur: 1800 });
      if (dug === 4) await UI.say('JARED', '[ten centimetres. maybe.]', { style: 'thought', dur: 1600 });
      if (dug >= 5) {
        // his phone rings. it's Recca.
        scares.fire('ch3.phonecall', () => { audio.sfx('ring', { vol: .6 }); });
        setFlag('dugAtTheStone');
        S.found++;
        objectiveDone('n10');
        await wait(1400);
        await convo([
          J('[the phone]'),
          J('[it\'s her]'),
          SAY('RECCA', 'Hi.', { style: 'phone' }),
          J('Hey.'),
          SAY('RECCA', 'What are you doing?', { style: 'phone' }),
          J('Nothing. Walking.'),
          SAY('RECCA', 'Walking where?', { style: 'phone' }),
          J('...'),
          SAY('RECCA', 'Jared. Walking where.', { style: 'phone' }),
          J('Ridge Road.'),
          SAY('RECCA', '[a pause of about six seconds]', { style: 'phone' }),
          SAY('RECCA', 'Come home. It\'s freezing.', { style: 'phone' }),
          SAY('RECCA', '[she hangs up]', { style: 'phone' })
        ]);
        world.removeInteract(stoneRec);
      }
    }
  });

  world.interact(cem.refs.spade, {
    label: 'The sexton\'s spade', dist: 2.2, once: true,
    use: () => { dug = Math.max(dug, 1); UI.toast('spade'); UI.say('JARED', 'It\'s not stealing if you put it back.', { style: 'thought' }); }
  });
}

// ============================================================ FUEL & GO
/**
 * Marta's scene. She cries, genuinely, while lying to his face.
 * Every word she says is true and every word is a lie, and Jared
 * believes her because he wants to.
 */
function setupFuelGo(ctx, fuel, marta, S) {
  const { world } = ctx;
  world.interact(marta.g, {
    label: 'Marta', dist: 2.8, once: true,
    use: async () => {
      marta.lookAt(ctx.camera);
      setFlag('confrontedMarta');
      S.found++;
      await convo([
        SAY('MARTA', 'Jared! Sweetheart. You look terrible.'),
        J('Mrs. Vasko...'),
        SAY('MARTA', 'Marta.'),
        J('Marta. Something\'s wrong with Recca.')
      ]);
      await wait(400);
      await convo([
        SAY('MARTA', '[she puts down what she is holding]'),
        SAY('MARTA', 'Sit down.'),
        SAY('MARTA', 'No. There\'s a stool. Sit down, sweetheart.')
      ]);
      const a = await UI.choose([
        { text: '"She doesn\'t eat."', value: 'eat' },
        { text: '"There\'s a stone in your family plot with no name on it."', value: 'stone' },
        { text: '"I think somebody is hurting her."', value: 'hurt' }
      ]);
      if (a === 'eat') await convo([
        SAY('MARTA', 'She\'s never eaten. Not since she was small.'),
        SAY('MARTA', 'You think I don\'t know? You think I haven\'t sat at that table for twenty years?')
      ]);
      if (a === 'stone') await convo([
        SAY('MARTA', '[she goes very still]'),
        SAY('MARTA', 'That\'s for me.'),
        J('...What?'),
        SAY('MARTA', 'You buy them ahead, Jared. That is what people do here. You buy the stone and you cut the name when the time comes because cutting is the expensive part.'),
        SAY('MARTA', 'My mother did the same. It sat there eleven years.')
      ]);
      if (a === 'hurt') await convo([
        SAY('MARTA', '[she laughs, once, and it is not a nice sound]'),
        SAY('MARTA', 'Somebody is hurting her.'),
        SAY('MARTA', 'Yes. Sweetheart. Yes.')
      ]);

      await convo([
        SAY('MARTA', 'She\'s been sick since she was little. Since she was four.'),
        SAY('MARTA', 'It comes and it goes. It goes for years, sometimes. And then it comes back and she is cold and she doesn\'t eat and she says things that aren\'t...'),
        SAY('MARTA', '[she stops]'),
        SAY('MARTA', 'We have managed it. Her father managed it and then I managed it and now she is twenty and I cannot follow her around this town.'),
        J('Why didn\'t she tell me?'),
        SAY('MARTA', '[she starts crying]'),
        SAY('MARTA', 'Because you are the best thing that has ever happened to her.'),
        SAY('MARTA', '[this is completely true]'),
        SAY('MARTA', 'Because in August she came home and she talked about a boy with a stupid car for two hours and I hadn\'t heard her talk like that, ever. Not once. Not in her whole life.'),
        SAY('MARTA', 'And she was not going to tell you what she is, because she thought you would go.')
      ]);
      await wait(600);
      const b = await UI.choose([
        { text: '"I\'m not going anywhere."', value: 'stay' },
        { text: '"That\'s not what this is."', value: 'push' }
      ]);
      if (b === 'push') await convo([
        SAY('MARTA', '[she takes his hand in both of hers]'),
        SAY('MARTA', 'Then what is it, sweetheart? Tell me. Say it out loud and hear how it sounds.'),
        J('...'),
        SAY('MARTA', 'Say it.'),
        J('[I can\'t say it out loud.]'),
        SAY('MARTA', 'No. You can\'t.')
      ]);
      await convo([
        SAY('MARTA', 'Be gentle with her. Be patient. She is going to get better.'),
        SAY('MARTA', '[she wipes her face with the back of her wrist, the way people do when their hands are dirty from work]'),
        SAY('MARTA', 'She is going to be fine.'),
        J('[I believe her]'),
        J('[I believe every word of it, and every word of it is true]')
      ]);
      marta.lookAt(null);
      objective('marta says she\'s been sick since she was 4. believe it.', 'n11');
    }
  });

  // the monitor. nothing on it yet. that is Chapter 4.
  world.interact(fuel.refs.monitor.g, {
    label: 'Security monitor', dist: 2.4,
    use: () => UI.say('JARED', 'Four cameras. Forecourt, forecourt, register, back lot. Nobody\'s watching it.', { style: 'thought' })
  });
}

// ============================================================ BARN
function buildBarn(world, { x, y, z }) {
  const h = { refs: {} };
  const W = 12, D = 9, H = 6.5;
  world.floor(x, z, 40, 34, { y, surface: 'snow', mat: MAT.snow });
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), tiled(MAT.shingle, W, H));
  body.material = tiled(MAT.brick, W, H);
  body.position.set(x, y + H / 2, z);
  body.castShadow = true; body.receiveShadow = true;
  world.add(body);
  world.collide(x, y, z, W, H, D, 'barn');
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.3, D + 0.6), flat(0x2e2b28, { rough: .95 }));
  roof.position.set(x, y + H, z); world.add(roof);

  // the hex sign, painted over. white, thick, sloppy, recent-ish.
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.95, 28), new THREE.MeshStandardMaterial({
    map: T.hexsign(true), roughness: .92
  }));
  under.position.set(x, y + 3.6, z + D / 2 + 0.03);
  world.add(under);
  const over = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), flat(0xe8e4d8, { rough: .97 }));
  over.position.set(x, y + 3.6, z + D / 2 + 0.05);
  world.add(over);
  h.refs.hexUnder = under;
  h.refs.hexOver = over;

  // the neighbours' barns still have theirs, cheerfully
  [[-22, 6], [24, -4]].forEach(([ox, oz], i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 7), tiled(MAT.brick, 9, 5));
    b.position.set(x + ox, y + 2.5, z + oz); world.add(b);
    world.collide(x + ox, y, z + oz, 9, 5, 7, 'barn2');
    const hx = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshStandardMaterial({ map: T.hexsign(false), roughness: .92 }));
    hx.position.set(x + ox, y + 3.0, z + oz + 3.55); world.add(hx);
  });
  h.pos = { x, y, z };
  return h;
}

function setupBarn(ctx, barn, S) {
  const { world } = ctx;
  let scraped = 0;
  world.interact(barn.refs.hexOver, {
    label: () => scraped === 0 ? 'It\'s been painted over' : 'Keep scraping', dist: 2.6, hold: scraped > 0 ? 1.4 : 0,
    use: async () => {
      if (scraped === 0) {
        scraped = 1;
        await convo([
          J('Every barn out here has one. They\'re rosettes. Folk art. Luck, rain, healthy cows.'),
          J('This one\'s been painted over. White. Thick. Recent-ish.')
        ]);
        return;
      }
      scraped++;
      audio.sfx('paper', { vol: .4 });
      barn.refs.hexOver.material.opacity = Math.max(0, 1 - scraped * 0.3);
      barn.refs.hexOver.material.transparent = true;
      if (scraped >= 4) {
        barn.refs.hexOver.visible = false;
        setFlag('scrapedHexSign');
        S.found++;
        objectiveDone('n5');
        await convo([
          J('Nine points.'),
          J('They don\'t have nine points. Eight, six, twelve, four. Never nine. I\'ve been looking at these for two months.'),
          J('And there\'s a date in it. In tar.'),
          J('Twelve twenty-one.'),
          J('That\'s the solstice.')
        ]);
        objective('12/21. the longest night.', 'n12');
      }
    }
  });
}

// ============================================================ MINE
function setupMine(ctx, mine, S) {
  const { world } = ctx;
  world.interact(mine.refs.plate, {
    label: 'Nine names', dist: 3.2,
    use: async () => {
      await convo([
        J('They cast the names into the cap.'),
        ...NINE.slice(0, 3).map(n => J(`${n.name}. ${n.age}.`)),
        J('...'),
        J('Ondrej Lisak. Nineteen.'),
        J('The youngest one was nineteen years old and he was a nipper, which means he opened doors underground for the mules.')
      ]);
      S.found++;
      objective('9 men. 1963. my great-grandfather gave the order.', 'n13');
    }
  });
  world.interact(mine.refs.bareEarth, {
    label: 'The ground', dist: 3.0,
    use: () => UI.say('JARED', 'There\'s a foot of snow on the road and there is none here. Not a flake. It just stops at the fence.', { style: 'thought' })
  });
  world.interact(mine.refs.headframe, {
    label: 'Headframe', dist: 4.0,
    use: () => UI.say('JARED', 'It came down in the eighties. Nobody took it away, they just fenced it.', { style: 'thought' })
  });
}

// ============================================================ GRAFFITI
function buildGraffiti(world, { x, y, z }) {
  const h = { refs: {} };
  world.floor(x, z, 14, 90, { y, surface: 'asphalt', mat: MAT.asphalt });
  // 200 real-looking tags
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#26292d'; g.fillRect(0, 0, 1024, 1024);
  const words = ['CLASS OF 94', 'SHANE + BEV', 'JESUS SAVES', '61 4EVER', 'FLYERS SUCK', 'KEEP OUT',
    'RIP TOMMY', 'ASHGROVE', 'NO. 9', 'BURN', 'TURN BACK', 'HA', 'MOM', '2003', 'WHY'];
  const cols = ['#c8443a', '#3a76c8', '#e8c83a', '#4ac86a', '#e8e8e8', '#c83ac8', '#e8863a'];
  for (let i = 0; i < 200; i++) {
    g.save();
    g.translate(Math.random() * 1024, Math.random() * 1024);
    g.rotate((Math.random() - .5) * 1.2);
    g.globalAlpha = 0.35 + Math.random() * 0.55;
    g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    g.font = `bold ${18 + Math.random() * 44}px "JetBrains Mono", monospace`;
    g.fillText(words[Math.floor(Math.random() * words.length)], 0, 0);
    g.restore();
  }
  // small, in white, near the shoulder, in a hand the player will recognise
  g.save();
  g.globalAlpha = 1; g.fillStyle = '#f4f4f2';
  g.font = '22px "Reenie Beanie", cursive';
  g.fillText('E.K. was here 9/2011', 700, 880);
  g.font = '17px "Reenie Beanie", cursive';
  g.fillText('if you are reading this i was right', 700, 906);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 90), new THREE.MeshStandardMaterial({ map: t, roughness: .93 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(x, y + 0.02, z);
  world.add(road);
  h.refs.road = road;

  const mark = new THREE.Mesh(PLN(2.0, 2.0), new THREE.MeshBasicMaterial({ visible: false }));
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(x + 4.2, y + 0.05, z + 20);
  world.add(mark);
  h.refs.mark = mark;
  h.pos = { x, y, z };
  return h;
}

function setupGraffiti(ctx, graffiti) {
  const { world } = ctx;
  world.interact(graffiti.refs.mark, {
    label: 'Something in white', dist: 2.6, once: true,
    use: async () => {
      setFlag('graffitiEK');
      await UI.openReader(GRAFFITI_NOTE, 'doc-plain');
      await convo([
        J('That\'s the handwriting off the cassette labels.'),
        J('She stood here.')
      ]);
    }
  });
}

// ============================================================ BUTTONS
function setupButtons(ctx, buttons, recca, S) {
  const { world } = ctx;
  const scraps = ['half a sausage', 'the end of a pierogi', 'a french fry', 'the crust', 'bacon', 'cheese',
    'the good half of a sandwich', 'a whole hot dog', 'nothing, he just wanted a hand'];
  world.interact(buttons.g, {
    label: () => `Buttons  (${state.get().flags.fedButtons || 0}/9)`, dist: 2.4,
    use: async () => {
      const n = state.get().flags.fedButtons || 0;
      if (n >= 9) { UI.say('JARED', 'He\'s following me now. That\'s just a thing that happens now.', { style: 'thought' }); return; }
      bump('fedButtons');
      audio.sfx('paper', { vol: .3 });
      buttons.wag = 2.2;
      setTimeout(() => buttons.wag = 1, 2500);
      UI.toast('you gave Buttons ' + scraps[n], `${n + 1}/9`);
      if (n + 1 === 9) {
        await convo([
          J('That\'s nine.'),
          J('[he\'s decided about me]')
        ]);
      }
    }
  });

  // the dog will not go near her, and its owner keeps apologising
  const owner = makeGeneric(world, {
    height: 1.68, skin: 0xcaa286, hair: 0x6a5a4a, top: 0x4a5a6a, bottom: 0x2f3540,
    build: 1.0, hairLong: false, hairStyle: 'short',
    head: { wide: 1.0, jaw: 1.06, nose: 0.90, chin: 1.05 },
    face: {
      stubble: 0.9, age: 0.3, eyeGap: 0.94, eyeW: 0.96,
      mouthW: 1.10, browY: -3, id: 'owner'
    }
  });
  owner.setPos(5.6, 0, 6.5);
  owner.face(4.2, 6.5);
  world.interact(owner.g, {
    label: 'The dog\'s owner', dist: 2.6,
    use: () => UI.say('OWNER', 'Sorry. Sorry, he\'s not like this. He\'s never like this. He\'s a good dog, he\'s just... sorry.', {})
  });
}

// ============================================================ TAPES
function scatterTapes(ctx, L) {
  const { world } = ctx;
  const spots = [
    { t: 0, pos: [L.pawn.x - 2.4, 0.95, L.pawn.z - 1.15] },
    { t: 1, pos: [L.library.x + 4.3, 0.5, L.library.z + 3.0] },
    { t: 2, pos: [L.vasko.x - 2.0, 0.02, L.vasko.z - 5.5] },
    { t: 3, pos: [L.barn.x + 1.4, 0.05, L.barn.z + 4.8] },
    { t: 4, pos: [L.library.x - 2.2, 0.76, L.library.z + 2.3] },
    { t: 5, pos: [L.mine.x - 8, 0.06, L.mine.z - 11.5] },
    { t: 6, pos: [L.apt.x - 2.2, 3.02, L.apt.z + 1.7] },
    { t: 7, pos: [L.diner.x + 5.3, 1.2, L.diner.z - 2.6] },
    { t: 8, pos: [L.graffiti.x - 5.5, 0.06, L.graffiti.z - 12] },
    { t: 9, pos: [L.cemetery.x + 5.2, 0.12, L.cemetery.z + 4.0] },
    { t: 10, pos: [L.fuel.x - 3.4, 0.06, L.fuel.z - 2.2] },
    { t: 11, pos: [L.mine.x + 4.0, 0.55, L.mine.z + 1.0] }
  ];
  spots.forEach(({ t, pos }) => {
    const tape = smallProp('cassette', Math.random);
    tape.position.set(pos[0], pos[1], pos[2]);
    tape.rotation.y = Math.random() * 3;
    world.add(tape);
    // a faint glint so curiosity is rewarded without a waypoint
    const glint = new THREE.PointLight(0xE8A653, 0.22, 1.2, 2);
    glint.position.set(pos[0], pos[1] + 0.1, pos[2]);
    world.add(glint);
    world.interact(tape, {
      label: 'Microcassette', dist: 2.2, once: true,
      use: async () => {
        const T = TAPES[t];
        if (addTape(T.id)) {
          audio.sfx('click', { vol: .4 });
          const n = state.get().tapes.length;
          UI.toast(`tape ${n}/12`, T.label);
          world.root.remove(glint);
          tape.visible = false;
          await UI.openReader(T.html, 'doc-tape');
          if (n === 1) {
            await convo([
              J('Somebody recorded herself.'),
              J('For a year.'),
              J('[the label\'s in ballpoint and the handwriting is small and fast]')
            ]);
            objective('elena kowal. 12 tapes. find them all.', 'ntapes');
          }
          if (n === 12) {
            objectiveDone('ntapes');
            await convo([
              J('Twelve.'),
              J('She had all of it. Two days before, she had all of it.'),
              J('"It has to be said out loud."'),
              J('"Not written. Not thought. Not the name it\'s wearing."')
            ]);
          }
        }
      }
    });
  });
}

// ============================================================ THE ROW OPPOSITE
/**
 * The two doors on the far side of Ridge Road that open.
 *
 * None of this is on the list in his phone and none of it moves the
 * chapter on: `S.found` is deliberately untouched, so a player who
 * turns the whole row over does not skip to the text message ahead of
 * a player who does what he was asked. It is all corroboration, and
 * every piece of it was a matter of public record before Jared arrived.
 */
function setupRow(ctx, shops, S) {
  const { world } = ctx;
  if (!shops) return;

  const once = (mesh, label, lines, { dist = 2.4, read = null, skin = 'doc-plain', note = null, id = null } = {}) =>
    world.interact(mesh, {
      label, dist,
      use: async () => {
        if (read) await UI.openReader(read, skin);
        await convo(lines);
        if (note && id && !flag(id)) { setFlag(id); objective(note, id); }
      }
    });

  // ---------------------------------------------------------- the cleaners
  const cl = shops.cleaners;
  world.trigger(cl.x, cl.inZ0 + 1.6, cl.inW, 3.0, {
    once: true,
    onEnter: () => convo([
      J('Kowal Cleaners.'),
      J('Victor never told me his family had a shop.'),
      J('Victor never told me anything about his family, and I never asked. Which is the same thing.')
    ])
  });

  once(cl.refs.bags[4], 'The rail', [
    J('There is still a load on the rail.'),
    J('Bagged, tagged, and hanging here since whatever day this place shut.'),
    J('[nine of them]'),
    J('And a hook on the end with nothing on it.')
  ], { dist: 2.6 });

  once(cl.refs.uncollected, 'An order, on its own hook', [
    J('In on the twenty-first. Out on the twenty-third.'),
    J('She dropped a coat off and expected to be back for it on the Friday.'),
    J('Canvas. Man\'s forty-four.'),
    J('...'),
    J('Recca\'s is her grandfather\'s. Half this county wears one. That is all that is.'),
    J('And somebody has been back for it five times and left it where it is.'),
    J('September. Every September.')
  ], { dist: 2.4, read: CLEANERS_TICKET, note: 'e.k. dropped a coat here 9/21/11. never came back.', id: 'nrowticket' });

  once(cl.refs.calendar, 'Calendar', [
    J('September 2011. Nobody ever turned it over.'),
    J('The twenty-second has been round twice in biro.'),
    J('And down the margin, in pencil, in the same hand as the cassette labels:'),
    J('[65 74 83 92 01 11]'),
    J('Then four dots, and a twenty.')
  ], { dist: 2.2 });

  once(cl.refs.salt, 'A line of salt', [
    J('There is a line of salt across the back threshold.'),
    J('Poured from the inside. Nobody has walked through it.'),
    J('Mrs. Ostrowski does this on her own step every night. She says it is for the ice.'),
    J('It was eighty degrees the first time I watched her do it.')
  ], { dist: 2.2 });

  once(cl.refs.marks, 'Pencil marks up the frame', [
    J('Two kids, measured up the door casing, with a year against each one.'),
    J('E.K. and W.K.'),
    J('They stop in 2002.')
  ], { dist: 2.2 });

  once(cl.refs.backChair, 'A chair', [
    J('A chair, in an empty back room.'),
    J('Facing the doorway.'),
    J('Not the room. The doorway.')
  ], { dist: 2.4 });

  once(cl.refs.spike, 'The ticket spike', [
    J('A spike full of counterfoils. The top one is the twenty-first.'),
    J('Nobody came in on the twenty-second, and nobody has come in since.')
  ], { dist: 2.2 });

  // The board that is missing out of the plywood. It looks the wrong way
  // on purpose: everything in this chapter looks at the town, and this
  // one looks back at him.
  if (cl.refs.gap) {
    world.interact(cl.refs.gap, {
      label: 'A board is missing', dist: 2.4,
      use: async () => {
        if (flag('nrowlook')) {
          await convo([J('My own front door, from the outside, in the dark. Great.')]);
          return;
        }
        setFlag('nrowlook');
        await convo([
          J('There is a board missing at chest height. You can see the whole street through it.'),
          J('The laundromat. The stair. My window.'),
          J('...'),
          J('The kitchen light is on.'),
          J('I turned everything off. I always turn everything off, because my father always turns everything off.'),
          J('[the kitchen light is on]')
        ]);
      }
    });
  }

  // ---------------------------------------------------------- the realty
  const rt = shops.realty;
  world.trigger(rt.x, rt.inZ0 + 1.6, rt.inW, 3.0, {
    once: true,
    onEnter: () => convo([
      J('Stanko Realty. The door was not even shut properly.'),
      J('There is a lamp on in here.'),
      J('The power is still on in an office that closed before I could read.')
    ])
  });

  once(rt.refs.typewriter, 'A sheet still in the roller', [
    J('"Dear Mr. Stanko, further to our conversation of the ninth, I am not able to"'),
    J('That is where it stops.')
  ], { dist: 2.2 });

  once(rt.refs.map, 'A plat map', [
    J('Every lot in the borough, drawn in 1964.'),
    J('And under all of it, in red, dashed: the workings.'),
    J('They run under Ridge Road. They run under the church.'),
    J('Somebody has put a ring round 118½ in biro.'),
    J('That is my building. That is the room I sleep in.')
  ], { dist: 2.8 });

  once(rt.refs.ledger, 'A record of conveyance', [
    J('February 1964. A year to the week after.'),
    J('Hale Anthracite conveys nine company houses on Kesslerton Row. One to each family.'),
    J('A dollar each.'),
    J('...'),
    J('Nine dollars.'),
    J('He put nine dollars in the subscription at the bank as well. The paper printed it like it was generous.'),
    J('My great-grandfather bought the whole of this town\'s grief for nine dollars and made them sign for it.')
  ], { dist: 2.4, read: REALTY_LEDGER, skin: 'doc-register',
       note: 'hale deeded the 9 families their houses. $1 each. feb 64.', id: 'nrowledger' });

  once(rt.refs.keyboard, 'A key board', [
    J('Nine keys on the board.'),
    J('And a tenth hook with a tag on it and no key.'),
    J('The tag says 118½.')
  ], { dist: 2.4 });

  once(rt.refs.rack, 'The cards in the window', [
    J('My flat is still advertised in the window of a realtor that shut in 1997.'),
    J('So is the unit this office is standing in.'),
    J('And a four-bedroom on Kesslerton Row, conveyed 1964, one dollar, not for sale.'),
    J('Number nine. That is her mother\'s house.')
  ], { dist: 2.4, read: REALTY_CARD_118 });

  once(rt.refs.clock, 'A wall clock', [
    J('Stopped at four minutes past three.')
  ], { dist: 2.4 });
}

// ============================================================ TRAVEL
/**
 * The Volvo. Ashgrove is a hub-and-spoke town; the car is the
 * spoke. No fast-travel menu, you get in and you pick a place
 * off the one thing in the car that works, which is the radio
 * preset buttons he uses as bookmarks.
 */
function setupTravel(ctx, L, block) {
  const { world, player } = ctx;
  const DESTS = [
    { name: '118½ Ridge Rd, home', at: [L.apt.x + 1.2, L.apt.z + 1.0, L.apt.y, Math.PI] },
    { name: '9 Kesslerton Row', at: [L.vasko.x, L.vasko.z + 7.4, 0, Math.PI] },
    { name: 'The Anthracite Diner', at: [L.diner.x - 3.5, L.diner.z + 3.0, 0, Math.PI] },
    { name: 'Kesslerton Pawn & Loan', at: [L.pawn.x - 2.6, L.pawn.z + 2.5, 0, Math.PI] },
    { name: 'Ashgrove Fuel & Go', at: [L.fuel.x - 2.4, L.fuel.z + 2.0, 0, Math.PI] },
    { name: 'Ashgrove State, library', at: [L.library.x - 3.0, L.library.z + 3.0, 0, Math.PI] },
    { name: 'St. Brigid\'s cemetery', at: [L.cemetery.x - 8, L.cemetery.z + 8, 0, 0] },
    { name: 'Colliery Rd, the barn', at: [L.barn.x, L.barn.z + 8, 0, Math.PI] },
    { name: 'Colliery Rd, the old blacktop', at: [L.graffiti.x, L.graffiti.z + 26, 0, Math.PI] },
    { name: 'Kesslerton No. 9', at: [L.mine.x, L.mine.z + 16, 0, Math.PI] }
  ];
  world.interact(block.refs.volvo, {
    label: 'The Volvo', dist: 3.0,
    use: async () => {
      const pick = await UI.choose([
        ...DESTS.map((d, i) => ({ text: d.name, value: i })),
        { text: 'Stay where I am.', value: -1 }
      ]);
      if (pick < 0) return;
      const d = DESTS[pick];
      await UI.fadeOut(900);
      audio.sfx('engine', { vol: .2 });
      await wait(700);
      player.teleport(d.at[0], d.at[1], d.at[2], d.at[3]);
      // the car comes with you. it is that kind of town.
      block.refs.volvo.position.set(d.at[0] + 4.5, d.at[2], d.at[1] + 3.0);
      world.clearCollidersTagged('car');
      world.collide(block.refs.volvo.position.x, d.at[2], block.refs.volvo.position.z, 4.7, 1.7, 1.9, 'car');
      await UI.fadeIn(1100);
    }
  });

  // ---- the end of the chapter: a text at 11:47 PM, December 20 ----
  let ended = false;
  world.tick(async () => {
    if (ended) return;
    const S = ctx.S;
    const enough = S.found >= 5 || state.get().tapes.length >= 8;
    if (!enough) return;
    ended = true;
    await wait(2500);
    Phone.setClock('11:47');
    audio.sfx('text', { vol: .6 });
    addMessage('them', 'jared i cant sleep. please come. i need you. im home.', '11:56 PM');
    UI.toast('1 message', '11:56 PM');
    await wait(1800);
    await convo([
      J('[11:47]'),
      J('[the message says 11:56]'),
      J('...'),
      J('The clock\'s wrong. The clock on this thing has been wrong since I bought it.')
    ]);
    await wait(1200);
    await UI.fadeOut(2000);
    await wait(700);
    await ctx.next();
  });
}

export default ch3;
