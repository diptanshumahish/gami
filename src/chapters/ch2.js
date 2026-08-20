/* ============================================================
   CHAPTER TWO, "Small Hours"
   Sept 6 – Oct 12 · 54°F · ~35 min

   Emotion target: falling in love, then the first splinter.
   Five short vignettes, hard-cut, each 5–8 minutes.

   The Sept 22 vignette is the night she actually dies, and the
   player will not know that for three hours. There is no sting
   and no music. Most players will miss the car entirely.
   ============================================================ */
import * as THREE from 'three';
import { buildApartment } from '../world/loc_home.js';
import { buildRidgeBlock, volvo } from '../world/loc_street.js';
import { buildVaskoHouse } from '../world/loc_vasko.js';
import { buildDiner } from '../world/loc_town.js';
import { makeRecca, makeMarta, makeButtons, smallProp, cardboardBox } from '../world/props.js';
import { buildStreetlights } from '../world/streetlights.js';
import { buildSky } from '../world/sky.js';
import { MAT, flat, tiled } from '../world/mat.js';
import { BOX, CYL, SPH, PLN } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares, TYPE } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { convo, J, SAY, objective, objectiveDone, numb, forceLook } from './util.js';
import { setFlag, flag, addMessage, addTape, state } from '../core/state.js';
import { OSTROWSKI_NOTE, WHITEBOARD } from '../content/docs.js';

const APT = { x: 0, y: 3.0, z: 0 };
const VASKO = { x: -80, y: 0, z: 0 };
const DINER = { x: 60, y: 0, z: 0 };

export const ch2 = {
  id: 'ch2', card: 'CHAPTER TWO', title: 'Small Hours', date: 'September 6 – October 12, 2014', temp: '54°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('autumn');
    // Same dome as Chapter One, wound on to the small hours. The moon in
    // it is the same moon the directional light below is coming from.
    ctx.sky = buildSky(world, { preset: 'night', camera: ctx.camera, fogDensity: 0.0095 });
    world.hemi(0x51709a, 0x181209, 1.15);
    // A moon low in the south-west. Without it a hemisphere light alone
    // leaves every vertical surface in town at zero and the street reads
    // as an unlit black rectangle with a sign floating in it.
    world.sun([0.35, -0.62, -0.70], 0xA9C0E4, 2.2);

    // ---- everything gets built once and we hard-cut between it ----
    // Two in the morning. The pavements are empty and they stay empty:
    // the whole point of this chapter is that there is nobody to ask.
    // One car goes past, somewhere, which is what a real town sounds
    // like at two in the morning and is worse than silence.
    const block = buildRidgeBlock(world, {
      x: 0, y: 0, z: 0, night: true,
      life: { walkers: 0, pairs: 0, cars: 1 }
    });
    const apt = buildApartment(world, { x: APT.x, y: APT.y, z: APT.z, boxes: false, lightsOn: false, hall: true });
    apt.refs.mirror.g.visible = true;
    const vasko = buildVaskoHouse(world, { x: VASKO.x, y: VASKO.y, z: VASKO.z, state: 'lived' });
    const diner = buildDiner(world, { x: DINER.x, y: DINER.y, z: DINER.z });

    const recca = makeRecca(world, { coat: true });
    recca.setPos(0, -50, 0);
    ctx.recca = recca;
    Phone.subject = recca;

    const marta = makeMarta(world);
    marta.setPos(0, -50, 0);

    ctx.refs = { block, apt, vasko, diner, recca, marta };

    // The five vignettes, in order, hard cut.
    await vignetteSept6(ctx);
    await vignetteSept19(ctx);
    await vignetteSept22(ctx);
    await vignetteOct2(ctx);
    await vignetteOct12(ctx);

    await UI.fadeOut(2000);
    await wait(600);
    await ctx.next();
  }
};

// ============================================================ SEPT 6
async function vignetteSept6(ctx) {
  const { world, player, refs } = ctx;
  const { block, vasko, recca } = refs;

  await card(ctx, 'September 6', '52°F');
  audio.wind(0.25);
  audio.roomTone(0.03, 400);
  block.refs.aptLight.intensity = 1.2;

  // Ridge Road at night, walking her home.
  player.teleport(VASKO.x + 6, VASKO.z + 12, 0, Math.PI);
  recca.setPos(VASKO.x + 7.4, 0, VASKO.z + 12);
  recca.face(VASKO.x + 7.4, VASKO.z + 6);
  recca.lookAt(ctx.camera);
  await UI.fadeIn(1400);

  objective('walk her home. it is 4 blocks. it takes an hour.', 's6');

  await convo([
    SAY('RECCA', 'Okay but you have to understand, the entire town is four streets and one of them is a hill.'),
    J('It\'s a big hill.'),
    SAY('RECCA', 'It is a BIG hill. Thirty-one streetlights. From the college down to the church.'),
    J('You counted them.'),
    SAY('RECCA', 'Everybody counted them. It\'s what there is.')
  ]);

  // she walks him home. slowly.
  const target = { x: VASKO.x, z: VASKO.z + 5.6 };
  recca.speed = 0.85;
  recca.walkTo(target.x + 1.2, target.z);
  const arrive = world.trigger(VASKO.x, VASKO.z + 6.5, 5, 5, {
    once: true,
    onEnter: async () => {
      recca.stop();
      recca.setPos(VASKO.x + 0.85, 0.16, VASKO.z + 4.9);
      recca.face(VASKO.x - 2, VASKO.z + 4.9);
      recca.lookAt(ctx.camera);
      await convo([
        SAY('RECCA', 'This is me. Nine Kesslerton Row. End unit, which means one extra wall of cold.'),
        J('It\'s nice.'),
        SAY('RECCA', 'It\'s a company house. They built six of them in 1911 and they built them identical so nobody\'d get ideas.'),
        SAY('RECCA', 'Sit for a second. The glider\'s the only good thing my grandfather ever bought.')
      ]);
      await wait(400);
      // the glider
      await convo([
        SAY('RECCA', '[they sit. it creaks.]'),
        SAY('RECCA', 'Cold.'),
        J('Your hands?'),
        SAY('RECCA', 'My hands are always, yeah. Sorry.'),
        J('Give them here.'),
        SAY('RECCA', '[a pause]'),
        SAY('RECCA', 'Huh.')
      ]);
      const k = await UI.choose([
        { text: 'Kiss her.', value: 'kiss' },
        { text: 'Wait.', value: 'wait' }
      ]);
      if (k === 'wait') {
        await convo([
          SAY('RECCA', '[she waits about four seconds]'),
          SAY('RECCA', 'Oh my God.'),
          SAY('RECCA', '[she kisses him]')
        ]);
      } else {
        await convo([SAY('RECCA', '[she was already leaning in]')]);
      }
      await wait(700);
      await convo([
        SAY('RECCA', 'Okay. Go home, Jared Hale. It\'s a hill and it\'s dark.'),
        J('I\'ll text you when I\'m up.'),
        SAY('RECCA', 'You will not, you\'ll fall asleep. Text me tomorrow.'),
        SAY('RECCA', '[she goes in. she waves through the glass, badly.]')
      ]);
      objectiveDone('s6');
      addMessage('me', 'made it up the hill', '12:41 AM');
      addMessage('them', 'liar you took the car', '12:44 AM');
      ctx._advance?.();
    }
  });
  await waitFor(ctx);
  recca.setPos(0, -50, 0);
}

// ============================================================ SEPT 19
async function vignetteSept19(ctx) {
  const { world, player, refs } = ctx;
  const { vasko, recca, marta } = refs;

  await card(ctx, 'September 19', '48°F');
  audio.stoveFire();
  audio.roomTone(0.04, 500);

  player.teleport(VASKO.x, VASKO.z + 7.2, 0, Math.PI);
  recca.setPos(VASKO.x + 1.0, 0, VASKO.z - 1.4);
  recca.face(VASKO.x, VASKO.z + 4);
  marta.setPos(VASKO.x - 1.4, 0, VASKO.z - 3.2);
  marta.face(VASKO.x + 1, VASKO.z - 2.2);
  vasko.refs.lights.parlourLight.intensity = 1.8;
  vasko.refs.lights.kitLight.intensity = 1.6;
  await UI.fadeIn(1400);

  objective('dinner at her mom\'s. take the ring off.', 's19');

  // ---- the ring ----
  // there's an interaction to take it off before meeting Recca's mother.
  const ringMark = new THREE.Mesh(PLN(0.3, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
  ringMark.position.set(VASKO.x, 1.2, VASKO.z + 6.0);
  world.add(ringMark);
  let ringOff = false;
  world.interact(ringMark, {
    label: 'Take the ring off', dist: 3.0, once: true,
    use: async () => {
      ringOff = true;
      setFlag('ringRemovedAtDinner');
      audio.sfx('coin', { vol: .3 });
      await convo([
        J('[the signet ring. a colliery wheel, stamped.]'),
        J('[into the pocket]'),
        J('It\'s not a lie. It\'s just, not a thing to bring to somebody\'s table.')
      ]);
    }
  });

  await convo([
    SAY('RECCA', 'Ma, this is Jared.'),
    SAY('MARTA', 'Jared! Come in, come in, take your shoes off, the floor\'s cold.'),
    J('Thank you for having me.'),
    SAY('MARTA', '[to Recca] He says thank you. Where did you find one that says thank you.')
  ]);
  marta.lookAt(ctx.camera);

  await convo([
    SAY('MARTA', 'Sit. Sit. There\'s pierogi, there\'s more pierogi, and there\'s a thing with cabbage that you don\'t have to eat.'),
    J('I\'ll eat the cabbage.'),
    SAY('MARTA', 'He\'ll eat the cabbage. Recca. Recca, he\'ll eat the cabbage.'),
    SAY('RECCA', 'I heard.')
  ]);

  await convo([
    SAY('MARTA', 'So what do they have you studying up there?'),
    J('Nothing, really. Undeclared.'),
    SAY('MARTA', 'Undeclared! That\'s a rich word for it.'),
    SAY('RECCA', 'Ma.'),
    SAY('MARTA', 'What? It\'s a good word. It means he can still be anything.'),
    SAY('MARTA', '[she says this warmly and she means it, and she has known for eleven days exactly what he is going to be]')
  ]);

  await convo([
    SAY('MARTA', 'Eat, eat. Recca, you\'re not eating.'),
    SAY('RECCA', 'I had something at work.'),
    SAY('MARTA', 'She had something at work.'),
    SAY('RECCA', 'I did!'),
    SAY('MARTA', '[she\'s already wrapping a plate in foil] Take it home then.')
  ]);
  // she pushes it around. she wraps it up. she does not eat.
  await convo([
    J('[she\'s cut the same pierogi into four pieces and moved them to the edge of the plate]'),
    J('[twice]')
  ]);

  const q = await UI.choose([
    { text: 'Ask Marta about the plaque at the Fuel & Go.', value: 'plaque' },
    { text: 'Ask about Recca\'s dad.', value: 'dad' },
    { text: 'Say nothing. Eat the cabbage.', value: 'cabbage' }
  ]);
  if (q === 'plaque') await convo([
    J('There\'s a plaque outside the Fuel & Go.'),
    SAY('MARTA', '[she does not stop moving]'),
    SAY('MARTA', 'There is.'),
    J('It has my, it has a name on it I know.'),
    SAY('MARTA', 'It has nine names on it, sweetheart. Everybody in this town knows one of them.'),
    SAY('MARTA', 'Eat. It\'s getting cold.')
  ]);
  if (q === 'dad') await convo([
    SAY('MARTA', 'Andrej. Ninety-nine. He was forty-two.'),
    J('I\'m sorry.'),
    SAY('MARTA', 'He was a good man who worked at a place that isn\'t there any more. That\'s most of the men here.'),
    SAY('RECCA', '[she doesn\'t look up]'),
    SAY('MARTA', 'Eat.')
  ]);
  if (q === 'cabbage') await convo([
    SAY('MARTA', '[watching him eat the cabbage]'),
    SAY('MARTA', 'Recca. He\'s eating the cabbage.'),
    SAY('RECCA', 'I have eyes, Ma.')
  ]);

  await convo([
    SAY('MARTA', '[at the door, with the foil plate] You come back. Any time. You don\'t call first, you just come.'),
    J('Thank you.'),
    SAY('MARTA', '[she holds his hand in both of hers for a second longer than is comfortable]'),
    SAY('MARTA', 'You\'re good for her.'),
    SAY('MARTA', '[she means it]')
  ]);
  if (!ringOff) {
    await convo([
      J('[she looked at my hand]'),
      J('[she looked at my hand for about a second and a half and then she looked at my face and smiled]')
    ]);
  }
  objectiveDone('s19');
  ctx._advance?.();
  await waitFor(ctx, 100);
  marta.setPos(0, -50, 0);
  recca.setPos(0, -50, 0);
}

// ============================================================ SEPT 22
/**
 * The equinox. She cancels. Jared spends the evening alone.
 * If the player is still at the window at 3:04 AM, a car goes
 * down Ridge Road toward the mine. Nothing else happens. There
 * is no music sting.
 */
async function vignetteSept22(ctx) {
  const { world, player, refs } = ctx;
  const { apt, block } = refs;

  await card(ctx, 'September 22', '46°F');
  apt.startDryers('background');
  audio.roomTone(0.04, 520);
  apt.setLights('evening');

  player.teleport(APT.x - 1.0, APT.z + 0.6, APT.y, -Math.PI / 2);
  Phone.setClock('7:12');
  await UI.fadeIn(1400);

  addMessage('them', 'family thing. love you', '7:04 PM');
  audio.sfx('text', { vol: .5 });
  UI.toast('1 message');

  await convo([
    J('"Family thing."'),
    J('Okay.')
  ]);
  const r = await UI.choose([
    { text: '"ok. tomorrow?"', value: 'ok' },
    { text: '"everything alright?"', value: 'worry' },
    { text: 'Don\'t reply.', value: 'silent' }
  ]);
  if (r === 'ok') { addMessage('me', 'ok. tomorrow?', '7:06 PM'); addMessage('them', 'yes. tomorrow. i promise', '7:06 PM'); }
  if (r === 'worry') { addMessage('me', 'everything alright?', '7:06 PM'); addMessage('them', 'yeah! just my mom being my mom. dont worry', '7:11 PM'); }
  if (r === 'silent') { await convo([J('She\'ll text again.'), J('[she doesn\'t]')]); }

  objective('nothing. it is a tuesday.', 's22');

  // The evening passes. Optional things to do.
  let clockMinutes = 7 * 60 + 12;
  const clockTick = world.tick(dt => {
    clockMinutes += dt * 26;      // the evening goes by
    const hh = Math.floor(clockMinutes / 60) % 24;
    const mm = Math.floor(clockMinutes % 60);
    Phone.setClock(`${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')}`);
  });

  // he can go to bed, which ends the vignette
  const bedMark = new THREE.Mesh(PLN(1.8, 1.1), new THREE.MeshBasicMaterial({ visible: false }));
  bedMark.rotation.x = -Math.PI / 2;
  bedMark.position.set(apt.marks.bed.x, apt.marks.bed.y, apt.marks.bed.z);
  world.add(bedMark);

  let done = false;
  const finish = async (sawIt) => {
    if (done) return; done = true;
    world.untick(clockTick);
    if (sawIt) setFlag('sawEquinoxCar');
    await UI.fadeOut(1600);
    ctx._advance?.();
  };

  world.interact(bedMark, {
    label: 'Sleep', dist: 2.4,
    use: () => finish(false)
  });

  // the window. thirty-one streetlights. and, at 3:04, one car.
  let atWindow = 0;
  world.interact(apt.refs.sill, {
    label: 'Stand at the window', dist: 2.2,
    use: async () => {
      await convo([
        J('Twenty-six. Twenty-seven.'),
        J('...I have counted them four times and I get a different number every time.')
      ]);
    }
  });

  world.tick(dt => {
    if (done) return;
    const d = Math.hypot(player.pos.x - apt.refs.sill.position.x, player.pos.z - apt.refs.sill.position.z);
    if (d < 1.6) atWindow += dt; else atWindow = Math.max(0, atWindow - dt * 2);
    // 3:04 AM
    if (clockMinutes > 27 * 60 + 4 && !ctx._carDone) {
      ctx._carDone = true;
      if (atWindow > 3) runTheCar(ctx, finish);
      else finish(false);
    }
  });

  await waitFor(ctx);
}

/**
 * A car goes down Ridge Road toward the mine. Nothing else
 * happens. There is no music sting. Most players will miss this
 * entirely and the ones who don't will not stop thinking about it.
 */
async function runTheCar(ctx, finish) {
  const { world, refs } = ctx;
  const car = volvo(world, 8, -0.02, 40, 0, {});
  car.children.forEach(c => { if (c.material?.color) c.material = c.material.clone(); });
  world.clearCollidersTagged('car');
  car.position.set(-40, 0, 20.5);
  car.rotation.y = -Math.PI / 2;
  // it is not his car. it is a small brown sedan and it is going about twenty.
  car.scale.set(0.94, 0.9, 0.92);
  car.traverse(o => { if (o.isMesh && o.material.color?.getHex?.() === 0x2f3b46) o.material = flat(0x5a4634, { rough: .4, metal: .4 }); });

  const head1 = new THREE.PointLight(0xfff0d0, 2.0, 14, 1.6);
  const tail = new THREE.PointLight(0x8C2F26, 1.2, 8, 1.6);
  world.add(head1); world.add(tail);

  audio.sfx('engine', { vol: .18, pos: [-40, 0, 20] });

  let t = 0;
  const tick = world.tick(dt => {
    t += dt;
    car.position.x = -40 + t * 9.5;
    head1.position.set(car.position.x + 2.6, 1.0, 20.5);
    tail.position.set(car.position.x - 2.6, 1.1, 20.5);
    if (car.position.x > 46) {
      world.untick(tick);
      world.root.remove(car); world.root.remove(head1); world.root.remove(tail);
      setTimeout(() => finish(true), 2600);
    }
  });

  // no sting. no music. no line. he watches a car.
  await wait(5200);
  await UI.say('JARED', '...', { style: 'thought', dur: 2200 });
}

// ============================================================ OCT 2
async function vignetteOct2(ctx) {
  const { world, player, refs } = ctx;
  const { apt, recca } = refs;

  await card(ctx, 'October 2', '41°F');
  apt.startDryers('background');
  apt.setLights('evening');
  Phone.setClock('6:40');

  player.teleport(APT.x - 0.6, APT.z + 1.0, APT.y, 0);
  recca.setPos(APT.x - 1.2, APT.y, APT.z - 0.9);
  recca.face(APT.x, APT.z + 2);
  recca.lookAt(ctx.camera);
  await UI.fadeIn(1400);

  // half her things
  const boxes = [];
  for (let i = 0; i < 3; i++) {
    const b = cardboardBox(world, APT.x - 1.15 + i * 0.52, APT.y, APT.z + 1.42, 0.06 - i * 0.09, {
      w: 0.4, h: 0.34, d: 0.36, open: i === 1, tint: 0xb6a077
    });
    boxes.push(b.g);
  }
  apt.setWhiteboard(WHITEBOARD[0]);
  objective('she is moving in half her things. the good half.', 'o2');

  await convo([
    SAY('RECCA', 'I\'m not moving in. To be clear. This is not moving in.'),
    J('You brought a lamp.'),
    SAY('RECCA', 'You didn\'t HAVE a lamp. You had one bulb in the ceiling like a man in a police station.'),
    J('It\'s a nice lamp.'),
    SAY('RECCA', 'It\'s my grandmother\'s lamp, so be careful with it, and also this is not moving in.')
  ]);

  world.interact(apt.refs.whiteboard, {
    label: 'Whiteboard', dist: 2.2,
    use: () => UI.say('JARED', '"milk, the good kind not the blue one."', { style: 'thought' })
  });

  await convo([
    SAY('RECCA', 'Also I wrote on your fridge. That\'s permanent now. That\'s a permanent feature of the apartment.'),
    J('[her hand, taking the marker back]'),
    J('Your hands are freezing.'),
    SAY('RECCA', 'It\'s OCTOBER, Jared.'),
    J('They were freezing in August.'),
    SAY('RECCA', '[a beat]'),
    SAY('RECCA', 'They were freezing in August.'),
    SAY('RECCA', '[she laughs] Okay. It\'s a family thing. My mother\'s hands are like this. My grandmother\'s were like this.'),
    SAY('RECCA', 'We are a long line of women you should not let touch the back of your neck.'),
    J('Noted.'),
    SAY('RECCA', '[she immediately touches the back of his neck]')
  ]);

  await wait(600);
  await UI.fadeOut(1600);
  await wait(500);

  // ---------------------------------------------------- 3:02 AM
  // First scare. Quiet on purpose, it teaches the player that
  // the game will not warn them.
  Phone.setClock('3:02');
  apt.setLights('night');
  player.teleport(apt.marks.wake.x, apt.marks.wake.z, APT.y, apt.marks.wake.yaw);
  player.canMove = false;

  // she is sitting on the edge of the bed. upright. facing away.
  // in her coat. wearing boots.
  recca.setPos(apt.marks.bedEdge.x, apt.marks.bedEdge.y, apt.marks.bedEdge.z);
  recca.face(apt.marks.bedEdge.x - 4, apt.marks.bedEdge.z);
  recca.lookAt(null);
  recca.p.legs.forEach(l => { l.hp.rotation.x = -1.5; l.kn.rotation.x = 1.5; });
  recca.p.torso.rotation.z = 0;

  await UI.fadeIn(2200);

  scares.fire('ch2.bedside', () => {
    // no sting, no music. just a static hold.
  });

  await wait(3800);   // hold. just hold.

  await convo([
    J('...Rec?'),
    SAY('RECCA', '[she doesn\'t turn around]'),
    SAY('RECCA', 'I couldn\'t sleep.'),
    J('You\'ve got your boots on.'),
    SAY('RECCA', '[a pause of about four seconds]'),
    SAY('RECCA', 'I was cold.')
  ]);

  const c = await UI.choose([
    { text: '"Come back to bed."', value: 'bed' },
    { text: '"Where were you?"', value: 'where' },
    { text: 'Turn the light on.', value: 'light' }
  ]);
  if (c === 'where') await convo([
    SAY('RECCA', 'Here.'),
    J('Rec...'),
    SAY('RECCA', 'I was here, Jared.'),
    SAY('RECCA', '[she still hasn\'t turned around]')
  ]);
  if (c === 'light') await convo([
    SAY('RECCA', 'Don\'t.'),
    SAY('RECCA', '[quickly, and then more gently] Don\'t, it\'s three in the morning, my eyes.'),
    J('Okay.')
  ]);
  await convo([
    J('Come back to bed.'),
    SAY('RECCA', '[she does]'),
    SAY('RECCA', '[she does not take the boots off]')
  ]);

  await wait(1400);
  recca.p.legs.forEach(l => { l.hp.rotation.x = 0; l.kn.rotation.x = 0; });
  player.canMove = true;
  objectiveDone('o2');
  await UI.fadeOut(1800);
  recca.setPos(0, -50, 0);
  ctx._advance?.();
  await waitFor(ctx, 100);
}

// ============================================================ OCT 12
/** The photo. The player cannot un-see it. */
async function vignetteOct12(ctx) {
  const { world, player, refs } = ctx;
  const { diner, recca } = refs;

  await card(ctx, 'October 12', '38°F');
  audio.roomTone(0.05, 800);
  audio.fluorescent([DINER.x, 2.4, DINER.z]);
  Phone.setClock('9:20');

  const booth = diner.refs.booths[1];
  player.teleport(booth.x, booth.z + 0.95, 0, Math.PI);
  recca.setPos(booth.x, 0.28, booth.z - 0.75);
  recca.face(booth.x, booth.z + 4);
  recca.lookAt(ctx.camera);
  recca.p.legs.forEach(l => { l.hp.rotation.x = -1.5; l.kn.rotation.x = 1.5; });
  await UI.fadeIn(1400);

  objective('take a picture of her. she\'ll hate it.', 'o12');

  await convo([
    SAY('RECCA', 'Dale gives me free coffee because he was at my father\'s funeral, which is a fairly grim reason to get free coffee, but it\'s fifteen years of free coffee so I\'ve made my peace.'),
    J('Fifteen years.'),
    SAY('RECCA', 'Fifteen years. He also gives me the pie. I don\'t eat the pie. I take the pie home.'),
    J('You never eat.'),
    SAY('RECCA', '[without any pause at all] I eat constantly. I\'m eating right now.'),
    J('You\'re holding a fork.'),
    SAY('RECCA', 'That is what eating looks like, Jared.')
  ]);

  // the corkboard, in the background, by the restrooms. nine flyers.
  world.interact(diner.refs.corkboard, {
    label: 'Corkboard', dist: 3.0,
    use: () => UI.say('JARED', 'Missing-persons flyers. Old ones. The tape\'s gone yellow.', { style: 'thought' })
  });

  // ---- the photo ----
  Phone.cameraStage = 1;   // motion blur where she is, while she isn't moving
  Phone.photoCaption = 'the diner. 10/12';
  await convo([
    J('Hold still.'),
    SAY('RECCA', 'Don\'t.'),
    J('Hold still.'),
    SAY('RECCA', '[she holds still and pulls the worst face she owns]')
  ]);

  UI.toast('phone', 'Tab → Camera');
  let shot = null;
  await new Promise(res => {
    Phone.onShot = (s) => { shot = s; Phone.onShot = null; res(); };
    // if they refuse to use the camera for a while, Jared takes it anyway
    setTimeout(() => { if (!shot) { Phone.show('camera'); } }, 22000);
    setTimeout(() => { if (!shot) { shot = Phone.takePhoto(); Phone.onShot = null; res(); } }, 40000);
  });

  setFlag('tookThePhoto');
  await wait(700);
  Phone.show('gallery');
  await wait(1800);

  scares.fire('ch2.photo', () => { /* mediated. it happens on a screen. never in the room. */ });

  await convo([
    J('...'),
    J('Rec. Look at this.'),
    SAY('RECCA', '[she takes the phone. she looks at it for a while.]'),
    SAY('RECCA', 'Your phone\'s junk.'),
    J('Your seat is empty.'),
    SAY('RECCA', 'My seat is BLURRY. There\'s a, that\'s me, that\'s my arm, look, that smear is my arm.'),
    J('You weren\'t moving.'),
    SAY('RECCA', '[she laughs, and it is a completely normal laugh]'),
    SAY('RECCA', 'It\'s a hundred-dollar phone from a gas station, baby. Delete it. It\'s an awful picture of me anyway.')
  ]);

  const d = await UI.choose([
    { text: 'Delete it.', value: 'delete' },
    { text: 'Keep it.', value: 'keep' }
  ]);
  if (d === 'delete') {
    setFlag('deletedThePhoto');
    state.set(s => ({ gallery: s.gallery.filter(g => g.id !== shot?.id) }));
    Phone.render();
    await convo([
      J('[deleted]'),
      SAY('RECCA', 'Thank you.'),
      SAY('RECCA', '[she is still holding his phone]'),
      SAY('RECCA', '[she checks the gallery]')
    ]);
  } else {
    await convo([
      SAY('RECCA', 'Fine. Keep it. Keep the picture of the empty chair, that\'s normal.'),
      J('[she\'s laughing]'),
      J('[she is genuinely laughing]')
    ]);
  }
  Phone.close();
  objectiveDone('o12');
  ctx._advance?.();
  await waitFor(ctx, 100);
}

// ============================================================ helpers
async function card(ctx, date, temp) {
  await UI.fadeOut(900);
  audio.killAllLoops(0.5);
  await wait(300);
  await UI.titleCard('', date, date, temp, { hold: 2200 });
}
function waitFor(ctx, extra = 0) {
  return new Promise(res => { ctx._advance = () => setTimeout(res, extra); });
}

export default ch2;
