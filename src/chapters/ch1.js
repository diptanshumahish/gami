/* ============================================================
   CHAPTER ONE, "Move-In Weekend"
   Aug 24 · 68°F · ~25 min

   Emotion target: warmth. No horror at all. This is a bet,    spend twenty-five minutes making the player like their life.

   Two things are planted here and never pointed at:
     · the detergent, which is in his hand the entire time
     · "come in", which he says once and never takes back
   ============================================================ */
import * as THREE from 'three';
import { buildApartment, buildLaundromat } from '../world/loc_home.js';
import { buildRidgeBlock } from '../world/loc_street.js';
import { buildSky } from '../world/sky.js';
import { makeRecca, makeGeneric, smallProp, clutter } from '../world/props.js';
import { MAT, flat, tiled } from '../world/mat.js';
import { BOX, CYL, SPH, PLN, SCALE } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { convo, J, SAY, beat, objective, objectiveDone, carryable, forceLook, numb } from './util.js';
import { setFlag, flag, addMessage } from '../core/state.js';
import { OSTROWSKI_NOTE } from '../content/docs.js';

export const ch1 = {
  id: 'ch1', card: 'CHAPTER ONE', title: 'Move-In Weekend', date: 'August 24, 2014', temp: '68°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('autumn');
    // A real sky, with the sun in it, in the place the sun actually is.
    // This used to be one flat blue-grey colour, which meant the whole of
    // the first twenty-five minutes of the game was played under a wall.
    const sky = buildSky(world, { preset: 'afternoon', camera: ctx.camera, fogDensity: 0.0060 });
    ctx.sky = sky;

    // ---------------------------------------------------------- world
    const block = buildRidgeBlock(world, { x: 0, y: 0, z: 0, night: false });
    const apt = buildApartment(world, { x: 0, y: 3.0, z: 0, boxes: true, lightsOn: true, hall: true });
    const laundry = buildLaundromat(world, { x: 0, y: 0, z: 0 });

    // Late-August afternoon, going to evening. The sun sits low in the
    // south-east so it rakes the front of the building and the stair up
    // the side; it used to be behind the block, which left the whole of
    // Ridge Road lit by nothing but a half-strength hemisphere.
    // These were 1.8 / 4.0, set to fight a post chain that was throwing
    // away a factor of two in the encode. With that fixed they blew the
    // pavement out to pink, so they come back down.
    const hemi = world.hemi(0x8b9aa8, 0x453d31, 1.75);
    const sun = world.sun([-0.275, -0.40, -0.45], 0xE8CBA4, 1.1);
    apt.startDryers('comfort');
    audio.roomTone(0.05, 620);

    const S = { boxes: 0, mirrorHung: false, detergent: null, metOstrowski: false, met: false };

    // ============================================================ APARTMENT
    player.teleport(apt.x + 1.4, apt.z + 1.0, apt.y, Math.PI * 0.9);
    player.hasFlashlight = false;

    await wait(400);
    convo([
      J('...'),
      J('Okay.'),
      J('This is it, then.')
    ]);
    objective('unpack. the boxes are labelled. mostly.', 'unpack');

    // ---- the boxes ----
    const BOX_LINES = {
      'KITCHEN': [
        J('Three mugs. Who packs three mugs.'),
        J('Flashlight. Right. Dad put a flashlight in the kitchen box.'),
        J('And... detergent. Good. That was the one thing I actually needed.')
      ],
      'BOOKS': [
        J('Books I have not read, in a box, moved two hundred miles.'),
        J('Sorry.')
      ],
      'CLOTHES': [
        J('Everything in here still smells like the house.'),
        J('That will wear off.')
      ],
      'MISC. FRAGILE?': [
        J('The question mark is doing a lot of work.'),
        J('Mirror. Hers, my mother\'s. She said the room would look bigger.')
      ]
    };

    apt.refs.boxes.forEach(b => {
      world.interact(b.mesh, {
        label: 'Open', once: true,
        use: async () => {
          audio.sfx('paper', { vol: .5 });
          S.boxes++;
          await convo(BOX_LINES[b.label]);
          if (b.label === 'KITCHEN') {
            player.hasFlashlight = true;
            UI.toast('flashlight', 'F to toggle');
            // the detergent. it goes in his hand and it stays there.
            const det = new THREE.Mesh(BOX(0.16, 0.26, 0.1), flat(0x2b5fa8, { rough: .55 }));
            det.position.copy(b.mesh.position).add(new THREE.Vector3(0.4, 0.1, 0));
            det.castShadow = true;
            world.add(det);
            const cap = new THREE.Mesh(CYL(0.045, 0.045, 0.03, 10), flat(0xd8d8d2, { rough: .5 }));
            cap.position.y = 0.145; det.add(cap);
            S.detergent = det;
            carryable(world, det, ctx, { label: 'Take the detergent' });
            objective('do a wash. you have literally no clean anything.', 'wash');
          }
          if (b.label === 'MISC. FRAGILE?') {
            const m = new THREE.Mesh(BOX(0.5, 1.5, 0.05), flat(0x4a3524, { rough: .6 }));
            const gl = new THREE.Mesh(PLN(0.44, 1.44), new THREE.MeshStandardMaterial({ color: 0x8d9aa4, roughness: .06, metalness: .92 }));
            gl.position.z = 0.028; m.add(gl);
            m.position.set(b.mesh.position.x, apt.y + 0.75, b.mesh.position.z + 0.45);
            m.castShadow = true;
            world.add(m);
            S.mirrorObj = m;
            carryable(world, m, ctx, { label: 'Pick up the mirror' });
            objective('hang the mirror. by the door.', 'mirror');
          }
          if (S.boxes >= 4) objectiveDone('unpack');
        }
      });
    });

    // ---- hanging the mirror ----
    const mark = new THREE.Mesh(PLN(0.56, 1.56), new THREE.MeshBasicMaterial({
      color: 0xE8A653, transparent: true, opacity: 0.0, side: THREE.DoubleSide
    }));
    mark.position.set(apt.x - 1.9, apt.y + 1.05, apt.z + apt.D / 2 - 0.14);
    mark.rotation.y = Math.PI;
    world.add(mark);
    world.interact(mark, {
      label: 'Hang it here', dist: 2.6, hl: 0xE8A653,
      enabled: true,
      use: async () => {
        if (player.carrying?.obj !== S.mirrorObj) { UI.toast('Not carrying it.'); return; }
        player.drop();
        world.root.remove(S.mirrorObj);
        apt.refs.mirror.g.visible = true;
        audio.sfx('wood', { vol: .5 });
        S.mirrorHung = true;
        objectiveDone('mirror');
        await convo([
          J('There.'),
          J('She was right. It does look bigger.'),
          J('Don\'t tell her.')
        ]);
      }
    });

    // ---- the window ----
    world.interact(apt.refs.sill, {
      label: 'Look out', dist: 2.0,
      use: async () => {
        await convo([
          J('Ridge Road. Goes all the way down to town and back up the other side to the church.'),
          J('Four miles, the landlady said. Thirty-one streetlights, apparently. She counted them.'),
          J('That is a thing you can do here.')
        ]);
      }
    });

    // ---- the whiteboard, blank for now ----
    world.interact(apt.refs.whiteboard, {
      label: 'Whiteboard', dist: 2.0,
      use: () => UI.say('JARED', 'Blank. It came with the fridge.', { style: 'thought' })
    });

    // ---- the door out ----
    // The door builds its own prompt now. Behind it there is a hall, and
    // at the end of the hall a stair, and at the bottom of the stair the
    // street. All of which is new; it used to open onto nothing at all.

    // ============================================================ LANDING
    // Mrs. Ostrowski is on the landing, salting her step. In September.
    // When there is no ice.
    const ost = makeGeneric(world, {
      height: 1.55, skin: 0xd8bda6, hair: 0xd6d2c8, top: 0x7a6b7c, bottom: 0x3a3a40,
      boots: 0x2a2a2c, build: 1.06, hairLong: false,
      // seventy-odd, a woman, hair up since 1968, glasses she reads the
      // gas bill through
      female: 0.85, hairStyle: 'bun', age: 0.85, glasses: 0x4a453c,
      head: { wide: 1.02, jaw: 0.88, nose: 1.06, chin: 0.90, brow: 0.8 },
      face: {
        age: 1, iris: 0x5c5a4e, lipCol: 0x9e716b, eyeW: 0.88, eyeGap: 0.98,
        noseW: 1.06, mouthW: 0.92, lash: 0.3, id: 'ostrowski'
      },
      name: 'MRS. OSTROWSKI', walkSpeed: 0.72
    });
    const LAND = block.refs.landing;
    ost.setPos(LAND.x + 0.1, 3.0, LAND.z - 0.45);
    ost.face(LAND.x, LAND.z + 3);
    // the box is in her hand, not floating at her shoulder
    const saltbox = smallProp('saltbox', Math.random);
    saltbox.rotation.z = -0.25;
    saltbox.position.set(0, -0.055, 0.01);
    ost.hold(1, saltbox, { curl: 1, pose: { x: 0.34, z: 0.16, el: -0.62 } });
    // and she is using it: a slow scatter, over and over, at the ice. The
    // activity drives the arm now, so hand the pose back.
    ost.setArmPose(1, null);
    ost.setBusy('salt');

    const saltLine = new THREE.Mesh(BOX(1.7, 0.006, 0.14), flat(0xf0f2f4, { rough: .9 }));
    saltLine.position.set(LAND.x, 3.02, LAND.z + 0.72);
    world.add(saltLine);

    let ostDone = false;
    world.trigger(LAND.x - 0.3, LAND.z, 2.8, 2.4, {
      y0: 2.5, y1: 4.5, once: true,
      onEnter: async () => {
        S.metOstrowski = true;
        ost.lookAt(ctx.camera);
        await convo([
          SAY('MRS. OSTROWSKI', 'You\'re the one upstairs.'),
          J('Yes, ma\'am. Jared.'),
          SAY('MRS. OSTROWSKI', 'Helena. Ostrowski. Downstairs, front. The radiator knocks, you talk to it, it stops. I\'m not being funny, you actually talk to it.'),
          J('Okay.'),
          SAY('MRS. OSTROWSKI', 'Machines are downstairs, they take quarters, the third one eats them. Don\'t use the third one.'),
          J('Thank you.')
        ]);
        // the salt
        await convo([
          J('...You\'re salting the step.'),
          SAY('MRS. OSTROWSKI', 'For the ice.'),
          J('It\'s eighty-eight degrees.'),
          SAY('MRS. OSTROWSKI', '[she keeps going]'),
          SAY('MRS. OSTROWSKI', 'It gets cold here fast, sweetheart. You do it before you need it or you don\'t do it.'),
          J('...Right.'),
          SAY('MRS. OSTROWSKI', 'Go on. You\'ll want the machines before the game lets out.')
        ]);
        ostDone = true;
        ost.lookAt(null);
        objective('detergent → downstairs → wash.', 'wash');
      }
    });

    world.interact(saltLine, {
      label: 'Salt',
      use: () => UI.say('JARED', 'It goes all the way across the head of the stair. Corner to corner. Not a gap in it.', { style: 'thought' })
    });

    // ============================================================ LAUNDROMAT
    laundry.startAmbience();

    // Recca, folding a load.
    // The folding table runs down the middle of the room from z+0.2 to
    // z+1.0, and she used to be set down at z+0.3 -- which is inside it.
    // She stands at the far edge with the table in front of her, facing
    // the door the player comes in by.
    const FT = laundry.refs.foldTable;
    const recca = makeRecca(world, { coat: false });
    recca.setPos(laundry.x - 0.9, 0, laundry.z + 0.6 - 0.4 - 0.34);
    recca.face(laundry.x - 0.9, laundry.z + 6);
    ctx.recca = recca;
    // and she folds, and she keeps folding: through the conversation,
    // through the branches, until the scene takes her hands off it.
    recca.setBusy('fold');

    // laundry on the folding table, in front of her
    for (let i = 0; i < 5; i++) {
      const t = new THREE.Mesh(BOX(0.26, 0.08, 0.2), flat([0xd8d3c8, 0x8f6a4a, 0x3f5b6b, 0xa8543f, 0x5b6b52][i], { rough: .98 }));
      t.position.set(laundry.x - 0.85 + i * 0.30, FT.top + 0.04, laundry.z + 0.62);
      t.rotation.y = i * 0.3;
      world.add(t);
    }

    // the TV. static. 90 uninterrupted seconds does something. not yet.
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
      if (staticWatch > 90 && !S.staticSeen) {
        S.staticSeen = true;
        setFlag('watchedStaticFull');
        UI.toast('...');
      }
    });

    // ---------------------------------------------------------- THE MEETING
    const meetTrigger = world.trigger(laundry.x - 0.2, laundry.z + 0.6, 3.6, 3.4, {
      once: true, y0: -1, y1: 2.5,
      onEnter: async () => {
        S.met = true;
        await theMeeting(ctx, { recca, laundry, apt, S, block, sun, hemi });
      }
    });

    // Interacting with the machines before meeting her nudges it along
    laundry.refs.dryers.forEach(bank => {
      world.interact(bank.g, {
        label: 'Machines', dist: 2.6,
        use: () => UI.say('JARED', S.met ? 'Mine\'s the third from the end.' : 'Quarters. I have no quarters.', { style: 'thought' })
      });
    });

    world.interact(laundry.refs.vending, {
      label: 'Vending', dist: 2.2,
      use: () => UI.say('JARED', 'Detergent, two dollars, sold out. Of course.', { style: 'thought' })
    });

    ctx.S = S;
  }
};

// ============================================================ THE SCENE
/**
 * The whole game is a bet on this working. It is one long
 * conversation over the tumble of the dryers. Every branch ends
 * with her writing her number on the back of a laundry ticket.
 */
async function theMeeting(ctx, { recca, laundry, apt, S, block, sun, hemi }) {
  const { world, player, camera } = ctx;
  recca.lookAt(camera);
  audio.setLoopVol('dryers', 0.9);

  await convo([
    SAY('RECCA', 'You\'re standing in front of the good one.'),
    J('Sorry...'),
    SAY('RECCA', 'No, you\'re fine. It\'s just, that one\'s the good one. Everybody stands in front of the good one.')
  ]);

  const a1 = await UI.choose([
    { text: '"Which one\'s the good one?"', value: 'ask' },
    { text: 'Step out of the way.', value: 'move' },
    { text: '"How can you tell?"', value: 'how' }
  ]);
  if (a1 === 'ask') await convo([
    SAY('RECCA', 'That one. The one you\'re in front of. Keep up.'),
    J('Right.'),
    SAY('RECCA', '[she smiles] It gets hot enough to actually dry a towel. The rest of them just sort of... warm it and hand it back to you disappointed.')
  ]);
  if (a1 === 'move') await convo([
    SAY('RECCA', 'Oh... no, I wasn\'t... you didn\'t have to actually move.'),
    J('You said it was the good one.'),
    SAY('RECCA', 'I did say that. That\'s fair. That\'s on me.')
  ]);
  if (a1 === 'how') await convo([
    SAY('RECCA', 'Twenty-one years of laundry in one building.'),
    J('That\'s a long time in one building.'),
    SAY('RECCA', 'It is a very long time in one building.')
  ]);

  await convo([
    SAY('RECCA', 'You just moved in upstairs.'),
    J('How do you...'),
    SAY('RECCA', 'You came down the outside stair. Nobody comes down the outside stair unless they live at the top of it. Also there was a truck.')
  ]);

  // the car
  await convo([
    SAY('RECCA', 'Is that your car? The wagon?'),
    J('...Yes.'),
    SAY('RECCA', '[long pause]'),
    SAY('RECCA', 'That is a dad car.'),
    J('It\'s sensible.'),
    SAY('RECCA', 'It\'s a dad car. You didn\'t buy that. Somebody bought you that and said the word "sensible" while they were doing it.'),
    J('...'),
    SAY('RECCA', 'Oh my God, I got it exactly right, didn\'t I.')
  ]);

  const a2 = await UI.choose([
    { text: '"He said it twice, actually."', value: 'twice' },
    { text: '"It has four-wheel drive."', value: 'defend' },
    { text: 'Say nothing.', value: 'quiet' }
  ]);
  if (a2 === 'twice') await convo([
    SAY('RECCA', '[laughing] Twice!'),
    J('Once at the dealership and once in the driveway.'),
    SAY('RECCA', 'That\'s the best thing I\'ve heard all month. That\'s going in the vault.')
  ]);
  if (a2 === 'defend') await convo([
    SAY('RECCA', 'Sure it does.'),
    J('It genuinely does.'),
    SAY('RECCA', 'I believe you. I\'m just enjoying that that\'s where you went.')
  ]);
  if (a2 === 'quiet') await convo([
    SAY('RECCA', '[she waits]'),
    SAY('RECCA', 'You\'re not going to defend the car at all?'),
    J('There\'s no defence.'),
    SAY('RECCA', '[she likes that] Okay. Okay, that\'s worse. That\'s so much worse.')
  ]);

  // she folds. she never stops folding.
  await convo([
    SAY('RECCA', 'Recca, by the way.'),
    J('Jared.'),
    SAY('RECCA', 'Jared. Okay. And you go to State, obviously, because it\'s August and you\'re twenty and you look like you\'ve never touched a wrench.'),
    J('I have touched a wrench.'),
    SAY('RECCA', 'Touched.')
  ]);

  await convo([
    SAY('RECCA', 'So what are you here for? And don\'t say "the program," nobody comes here for the program.'),
  ]);
  const a3 = await UI.choose([
    { text: '"It was the school that would take me."', value: 'humble' },
    { text: '"I wanted to be somewhere nobody knew me."', value: 'honest' },
    { text: '"I don\'t know yet."', value: 'lost' }
  ]);
  if (a3 === 'humble') await convo([
    SAY('RECCA', 'Bull.'),
    J('It\'s partly true.'),
    SAY('RECCA', 'Partly true is how people say "I picked it on purpose and I\'m embarrassed about why."')
  ]);
  if (a3 === 'honest') await convo([
    SAY('RECCA', '[she stops folding, one second, then keeps going]'),
    SAY('RECCA', 'Huh.'),
    SAY('RECCA', 'Well. You did that. Nobody knows you.'),
    J('Yeah.'),
    SAY('RECCA', 'Congratulations. It\'s awful. You\'ll hate it by October.')
  ]);
  if (a3 === 'lost') await convo([
    SAY('RECCA', 'That\'s the most honest thing anybody\'s said to me in this laundromat.'),
    J('What\'s the second most honest?'),
    SAY('RECCA', 'A guy told me the third machine eats quarters. He was right and it changed my life.')
  ]);

  // ---- the name. three hours from now this matters. ----
  await convo([
    SAY('RECCA', 'Jared what?'),
    J('Hale.'),
    SAY('RECCA', '[she stops]'),
    SAY('RECCA', 'Hale.'),
    J('...Yeah.'),
    SAY('RECCA', 'Like the, huh. Okay. There\'s a Hale on a plaque outside my mom\'s work.'),
    SAY('RECCA', 'Is that you? Is that your people?')
  ]);

  const truth = await UI.choose([
    { text: '"Nothing. It\'s just a name."', hint: 'A lie, and an easy one.', value: false },
    { text: '"My great-grandfather owned the colliery."', hint: 'The truth.', value: true }
  ]);
  setFlag('toldHerTheTruthAboutName', truth);

  if (truth) {
    await convo([
      SAY('RECCA', '[a long pause. she folds one whole towel in it.]'),
      SAY('RECCA', 'Okay.'),
      J('I\'m. I didn\'t know until I was about fifteen. Nobody talks about it. I only found out because of a photo.'),
      SAY('RECCA', 'I know. I know how that works. Believe me, I know exactly how that works.'),
      J('Do you want me to go?'),
      SAY('RECCA', 'What? No. God, no.'),
      SAY('RECCA', 'You told me. You could have said "it\'s just a name" and I\'d have believed you, because that\'s what everybody says, and you didn\'t.'),
      SAY('RECCA', '[she smiles] You\'re still standing in front of the good one, though.')
    ]);
  } else {
    await convo([
      SAY('RECCA', 'Hm.'),
      SAY('RECCA', 'Sure.'),
      J('It\'s a common name.'),
      SAY('RECCA', 'It\'s not, really.'),
      SAY('RECCA', '[she smiles anyway] It\'s fine. Everybody around here is named after somebody they\'d rather not be.')
    ]);
  }

  // ---- cold hands, planted here, first of many ----
  await convo([
    SAY('RECCA', 'Here, hold this a second, I\'ve got two more...'),
    J('[her hands are freezing]'),
    SAY('RECCA', 'Sorry! Sorry. Bad circulation. My mom says it\'s a family thing.'),
    J('It\'s ninety degrees.'),
    SAY('RECCA', 'It is ninety degrees and my hands are ice, yes, thank you, I\'m aware. It\'s my whole personality.')
  ]);

  // ---- the detergent ----
  const holding = ctx.player.carrying?.obj === ctx.S?.detergent || ctx.player.carrying;
  await convo([
    SAY('RECCA', 'Wait. You didn\'t come down here to do laundry.'),
    J('I did.'),
    SAY('RECCA', 'You have no basket.'),
    J('...'),
    SAY('RECCA', 'You have no quarters, you have no basket, and you\'ve been standing here for twenty minutes.')
  ]);
  const a4 = await UI.choose([
    { text: '"I forgot the detergent."', hint: '', value: 'forgot' },
    { text: '"I came down for the detergent machine."', value: 'machine' },
    { text: '"I just came down."', value: 'true' }
  ]);
  // Whatever he says, the detergent is in his hand. It is in his hand the whole time.
  setFlag('detergentInHand', true);
  if (a4 === 'forgot') await convo([
    SAY('RECCA', 'You forgot the detergent.'),
    J('I forgot the detergent.'),
    SAY('RECCA', '[she looks at him for a second too long, and then decides not to say it]'),
    SAY('RECCA', 'Okay.')
  ]);
  if (a4 === 'machine') await convo([
    SAY('RECCA', 'It\'s been sold out since June.'),
    J('I noticed that.'),
    SAY('RECCA', 'Mm-hm.')
  ]);
  if (a4 === 'true') await convo([
    SAY('RECCA', '[she nods, slowly]'),
    SAY('RECCA', 'Yeah. There\'s not a lot else.')
  ]);

  // ---- the ticket ----
  await convo([
    SAY('RECCA', 'Right. Give me your hand, no, the other, do you have a pen?'),
    J('I don\'t...'),
    SAY('RECCA', '[she\'s already got one]'),
    SAY('RECCA', '[she writes on the back of a laundry ticket and folds it once]'),
    SAY('RECCA', 'There. That\'s me. Text me and I\'ll tell you which machines are lying to you.'),
    J('Okay.'),
    SAY('RECCA', 'Say "okay" one more time and I\'m taking it back.'),
    J('Okay.'),
    SAY('RECCA', '[she laughs] Get out of my laundromat, Jared Hale.')
  ]);

  audio.sfx('paper', { vol: .5 });
  UI.toast('laundry ticket', 'a phone number, in green pen');
  addMessage('them', 'its recca. from the laundromat. the good one is the 4th from the left i lied earlier', '8:41 PM');
  objectiveDone('wash');
  objective('text her back. not immediately. wait like an hour. or forty minutes.', 'text');

  recca.lookAt(null);
  await wait(600);

  // ============================================================ THE THRESHOLD
  // The end of the chapter. He says two words and never takes them back.
  await UI.fadeOut(1200);
  await wait(400);

  // reset the scene to the hall outside his own door, at dusk
  const doorX = apt.x + 1.9, hallZ = apt.z + 3.175;
  ctx.player.teleport(doorX + 0.62, hallZ + 0.42, 3.0, -0.42);
  ctx.renderer.setGrade('autumn');
  // The sun goes down behind the ridge and the practicals take over. It
  // also goes down in the WEST, which is -X here, so it has to be moved
  // and not just dimmed: an hour and a half has passed.
  ctx.sky?.set('dusk', { density: 0.0082 });
  if (sun) {
    sun.intensity = 0.5; sun.color.setHex(0xE09A5A);
    sun.position.set(-30.0, 2.4, 11.6);
  }
  if (hemi) { hemi.intensity = 0.72; hemi.color.setHex(0x54677f); hemi.groundColor.setHex(0x2b241c); }
  block.refs.aptLight.intensity = 1.4;
  block.refs.signLight.intensity = 1.1;
  block.refs.doorLamp.intensity = 1.6;
  block.refs.doorLampGlass.material.color.setHex(0xFFE9C4);
  // and so do the streetlights, and the row across the road
  block.refs.streetlights?.poles.forEach((p, i) => {
    p.lamp.material.color.setHex(0xE8A653);
    p.halo.material.opacity = 0.26;
    p.pool.material.opacity = 0.16;
    if (p.pl) p.pl.intensity = 2.4;
  });
  apt.hall.refs.light.intensity = 1.1;
  recca.setPos(doorX - 0.62, 3.0, hallZ + 0.18);
  recca.face(doorX, hallZ - 3);
  recca.lookAt(camera);
  audio.setLoopVol('dryers', 0.35);
  audio.wind(0.2);

  await UI.fadeIn(1600);
  await UI.say('', 'Later.', { style: 'thought', dur: 1600 });

  await convo([
    SAY('RECCA', 'and it was TWO HUNDRED DOLLARS. For a book. For one book, that I could have read in the library, that is IN the library...'),
    J('You didn\'t buy it.'),
    SAY('RECCA', 'I absolutely bought it. That\'s what makes it a good story.')
  ]);
  await wait(500);
  await convo([
    SAY('RECCA', '[she stops at the door]'),
    J('...'),
    SAY('RECCA', '[she doesn\'t come in. she just stands there.]')
  ]);

  const inv = await UI.choose([
    { text: '"Come in."', value: 'in' },
    { text: '"...Do you want to come in?"', value: 'ask' },
    { text: '"Goodnight."', value: 'night' }
  ]);

  if (inv === 'night') {
    await convo([
      SAY('RECCA', '[she waits one more second]'),
      SAY('RECCA', 'Night, Jared.'),
      J('Night.'),
      SAY('RECCA', '[she goes down the hall, and then down the stair. she doesn\'t look back up.]')
    ]);
    await wait(900);
    // she will get the invitation. she is very patient. it takes eleven days.
    await UI.say('', 'September 6th.', { style: 'thought', dur: 2000 });
    await convo([
      SAY('RECCA', '[she stops at the door again]'),
      SAY('RECCA', 'You know I\'m not going to just walk in, right?'),
      J('Why not?'),
      SAY('RECCA', 'Because you didn\'t ask me to.'),
      J('...Come in.')
    ]);
  } else if (inv === 'ask') {
    await convo([
      SAY('RECCA', 'Are you asking me or are you asking the door?'),
      J('...I\'m asking you. Come in.')
    ]);
  } else {
    await convo([
      SAY('RECCA', '[she smiles]'),
      SAY('RECCA', 'Yeah. Okay.')
    ]);
  }

  setFlag('invitedHerIn', true);
  audio.door('wood', 'open', { vol: .55 });
  await wait(700);
  await UI.fadeOut(1800);
  await wait(900);
  await ctx.next();
}

export default ch1;
