/* ============================================================
   CHAPTER SIX. Endings
   3:00 AM

   The player has full movement and can back away, but there is
   nowhere to go. Recca talks. It is a long scene, four minutes
  , and it is not a boss fight. It's a breakup.

   Two options. No timer, no QTE, and neither of them ever
   greys out.
   ============================================================ */
import * as THREE from 'three';
import { buildChurch, CHURCH } from '../world/loc_church.js';
import { buildVaskoHouse } from '../world/loc_vasko.js';
import { buildApartment } from '../world/loc_home.js';
import { makeVictor, makeReccaDrowned, makeRecca, gerald, recordPlayer } from '../world/props.js';
import { MAT, flat, tiled } from '../world/mat.js';
import { SHAPE, BOX, CYL, SPH, PLN } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { convo, J, SAY, numb } from './util.js';
import { setFlag, flag, state } from '../core/state.js';

export const ch6 = {
  id: 'ch6', card: '', title: 'The Ninth Hour', date: 'December 21, 2014 · 3:00 AM', temp: '17°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('church');
    Phone.setClock('3:00');
    const C = CHURCH;

    const church = buildChurch(world, { x: 0, y: 0, z: 0, lit: false });
    church.refs.lamps[6].set(true, true);
    church.refs.lamps[6].gutter(0.7);
    church.turnPews('left', true);
    church.refs.confessional.open(0, -1.15);
    church.refs.font.fill();
    ctx.church = church;

    const victor = makeVictor(world);
    victor.setPos(C.sanctX + 0.4, C.sanctuaryY, 0);
    victor.face(C.sanctX + 4, 0);

    const her = makeReccaDrowned(world);
    her.setPos(C.sanctX - 2.8, 0, 0);
    her.face(C.sanctX + 4, 0);
    her.wrongShadow(1.9, 2.6);
    her.lookAt(ctx.camera);
    ctx.her = her;

    player.teleport(C.sanctX - 0.2, 0.0, C.sanctuaryY, -Math.PI / 2);
    player.hasFlashlight = true;
    player.canMove = true;

    audio.wind(0.5);
    audio.roomTone(0.03, 300);
    audio.musicScene('ch6', { immediate: true });
    audio.score(1.0);
    if (audio.ready) audio.conv.buffer = audio.ir.church;

    await UI.fadeIn(2200);

    // ============================================================ THE SCENE
    await theBreakup(ctx, her, victor, church);
  }
};

async function theBreakup(ctx, her, victor, church) {
  const { world, player } = ctx;

  await convo([
    SAY('RECCA', 'Don\'t.'),
    SAY('RECCA', 'Please. Look at me.'),
    SAY('RECCA', 'It\'s me, it\'s still me, I\'m right here.')
  ]);

  await wait(700);

  // tell #1, the jaw opens slightly too far when she is about to lie.
  her.jawOpen = 0.35;
  await convo([
    SAY('RECCA', 'I know what you found. I know what it says.'),
    SAY('RECCA', 'It\'s a book, Jared. It\'s a book in a cabinet, and I\'m standing in front of you.')
  ]);
  her.jawOpen = 0;

  await wait(500);
  await convo([
    SAY('RECCA', 'Do you remember the laundromat?'),
    SAY('RECCA', 'You had detergent in your hand the whole time.'),
    SAY('RECCA', 'The whole time. You were holding it and you told me you forgot it.'),
    J('...'),
    SAY('RECCA', '[she is smiling. it is her real smile.]'),
    SAY('RECCA', 'I knew right then. I knew right then that you were going to be the best thing that ever happened to me and I was going to be the worst thing that ever happened to you.')
  ]);

  await wait(600);
  await convo([
    SAY('RECCA', 'They gave me to it.'),
    SAY('RECCA', 'My mother held the light.'),
    SAY('RECCA', 'That part\'s true. That part\'s all true, and I\'m still here, so what does that tell you about what\'s true.')
  ]);

  // she comes closer. she does not chase. she never chases.
  her.walkTo(CHURCH.sanctX - 1.6, 0);
  await wait(2600);

  await convo([
    SAY('RECCA', 'I\'m so cold.'),
    SAY('RECCA', 'I have been so cold since September.')
  ]);

  await wait(900);

  await convo([
    SAY('RECCA', 'Come with me and it stops. For both of us.'),
    SAY('RECCA', 'Forever, and I mean forever, I\'m not... I\'m not being romantic, I mean the actual word.'),
    SAY('RECCA', 'We would just be. Together.'),
    SAY('RECCA', 'That\'s all it is. That\'s all I\'m asking.')
  ]);

  await wait(700);

  // the optional line, and it guts you.
  if (flag('toldHerTheTruthAboutName')) {
    await convo([
      SAY('RECCA', 'You told me your name in August.'),
      SAY('RECCA', 'You didn\'t have to. You could have said it was just a name and I\'d have gone home and I\'d have told them I couldn\'t get it.'),
      SAY('RECCA', '[a long pause]'),
      SAY('RECCA', 'I did tell them I couldn\'t get it.'),
      SAY('RECCA', 'I told them that for four days.')
    ]);
    await wait(800);
  }

  her.jawOpen = 0.4;
  await convo([
    SAY('RECCA', 'You said your name for me. You said it out loud.'),
    SAY('RECCA', 'You already said yes, baby.'),
    SAY('RECCA', 'You just have to say it one more time so it counts.')
  ]);
  her.jawOpen = 0;

  await wait(1000);
  await UI.say('VICTOR', '[he does not turn around]', { dur: 2400 });

  // ---------------------------------------------------------- the choice
  // No timer. No QTE. Two options that never grey out.
  const hasTapes = state.get().tapes.length >= 12;
  const canTrue = hasTapes && flag('sawTheRegister') && flag('toldHerTheTruthAboutName');

  const opts = [
    { text: '[Say her name and burn it.]', value: 'burn' },
    { text: '[Take her hand.]', value: 'hand' }
  ];
  if (canTrue) {
    opts.unshift({
      text: '[Say her name, her actual name, out loud, first.]',
      hint: 'The way the twelfth tape says you have to.',
      value: 'true'
    });
  }
  const choice = await UI.choose(opts);

  if (choice === 'hand') return endingA(ctx, her);
  if (choice === 'true') return endingC(ctx, her, victor, church);
  return endingB(ctx, her, victor, church, false);
}

/* ============================================================
   ENDING A, "Forever"
   The game respects the choice. It is, in a real sense, the
   merciful one, and it should feel like it was chosen out of
   love and not stupidity.
   ============================================================ */
async function endingA(ctx, her) {
  const { world, player, renderer } = ctx;

  await convo([
    SAY('RECCA', '[she puts her hand out]'),
    J('[he takes it]')
  ]);
  await wait(900);
  await convo([
    J('[her hand is warm]'),
    J('[her hand is warm for the first time since I met her]'),
    SAY('RECCA', '[she smiles, and it\'s her real smile, the one from the laundromat]')
  ]);

  await UI.fadeOut(2600);
  await wait(1200);

  // ---- cut to the apartment. morning light. dryers running downstairs.
  world.dispose();
  const w2 = ctx.world = ctx.game.world = new (world.constructor)(ctx.scene);
  ctx.player.world = w2;
  renderer.setGrade('autumn');
  w2.scene.background = new THREE.Color(0x8fa4bc);
  w2.scene.fog = null;
  w2.hemi(0x9fb4cc, 0x4a3f30, 0.8);
  w2.sun([-0.5, -0.8, -0.4], 0xFFC58A, 0.8);

  const apt = buildApartment(w2, { x: 0, y: 0, z: 0, boxes: false, lightsOn: false });
  apt.refs.mirror.g.visible = true;
  apt.setWhiteboard('♥');
  const recca = makeRecca(w2, { coat: false });
  recca.setPos(2.0, 0.62, -0.2);
  recca.face(-4, -0.2);
  recca.p.legs.forEach(l => { l.hp.rotation.x = -1.5; l.kn.rotation.x = 1.5; });

  ctx.player.teleport(1.4, 0.4, 0, -Math.PI / 2);
  ctx.player.canMove = false;
  ctx.player.canLook = true;
  ctx.player.eye = 0.9;
  // he is lying down. arms do not read as arms from here.
  ctx.viewmodel?.setVisible(false);

  audio.killAllLoops(0.4);
  const dry = audio.dryers('comfort', [0, -1.4, 0]);
  audio.roomTone(0.04, 700);

  await UI.fadeIn(3200);

  // it is perfect for eleven seconds.
  await UI.say('', '', { dur: 200 });
  await wait(11000);

  // and then the room is the wrong way around.
  await UI.blink(300);
  apt.refs.door.position.x *= -1;
  w2.root.rotation.y = Math.PI;
  ctx.player.yaw += Math.PI;
  await wait(3000);

  // and then the light is wrong.
  const bad = new THREE.PointLight(0x8C2F26, 2.4, 12, 1.6);
  bad.position.set(0, 2.0, 0);
  w2.add(bad);
  renderer.setGrade('winter', 0.02);
  let t = 0;
  w2.tick(dt => {
    t += dt;
    renderer.final.uniforms.exposure.value = Math.max(0.25, 1.0 - t * 0.03);
    renderer.final.uniforms.sat.value = Math.max(0.1, 1.0 - t * 0.035);
    renderer.final.uniforms.vignette.value = Math.min(0.95, 0.4 + t * 0.02);
  });
  await wait(5000);

  // and then the dryers are the pumps at Kesslerton No. 9.
  dry?.setMode?.('pumps');
  audio.sting('sub');
  await wait(8000);

  // and the camera does not cut away.
  await wait(9000);

  await UI.fadeOut(6000);
  await wait(1500);
  setFlag('endingA');
  await ctx.ending('A');
}

/* ============================================================
   ENDING B, "The Ninth Hour"
   The loudest ninety seconds in the game, and then it is very,
   very quiet.
   ============================================================ */
async function endingB(ctx, her, victor, church, saidItFirst) {
  const { world, player, renderer } = ctx;
  const C = CHURCH;

  await convo([
    SAY('RECCA', '[her face changes]'),
    SAY('RECCA', '[she is not sad any more]')
  ]);

  // everything at once. this is where the sting belongs and nowhere else.
  audio.sting('riser');
  audio.setLoopVol('score', 1.4);

  // the church PA speaks
  setTimeout(() => UI.say('RECCA', 'JARED.', { style: 'radio', dur: 2600 }), 600);
  // the pews move
  setTimeout(() => {
    church.turnPews('right', true);
    church.refs.pews.left.forEach((p, i) => {
      let t = 0;
      const tk = world.tick(dt => {
        t += dt;
        p.position.z += Math.sin(t * 14 + i) * dt * 2.2;
        p.rotation.y += dt * 1.4;
        if (t > 3) world.untick(tk);
      });
    });
    audio.sfx('wood', { vol: .9 });
    player.shake = 2.2;
  }, 1800);
  // the confessional door opens and something comes out of it
  setTimeout(() => {
    church.refs.confessional.open(1, -1.4);
    audio.door('heavy', 'open', { vol: .9 });
    const thing = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.5, 4, 8), flat(0x050506, { rough: 1 }));
    thing.position.set(C.crossX + 1.2, 1.0, 6.2);
    world.add(thing);
    let t = 0;
    const tk = world.tick(dt => {
      t += dt;
      thing.position.z -= dt * 2.6;
      thing.position.x += dt * 1.2;
      if (t > 4) { world.untick(tk); world.root.remove(thing); }
    });
  }, 3200);
  // the bell rings on its own, nine times, fast
  setTimeout(() => {
    for (let i = 0; i < 9; i++) setTimeout(() => audio.bell(1.1), i * 380);
  }, 4400);

  // he has to physically hold the burning paper over the font while the
  // tower shakes.
  player.shake = 2.0;
  const hold = world.tick(dt => { player.shake = Math.max(player.shake, 1.2); });

  await wait(1200);
  audio.sfx('match', { vol: .7 });

  if (saidItFirst) {
    // Ending C's six seconds happen before this call.
  } else {
    await convo([
      J('Recca Marta Vasko.'),
      SAY('RECCA', '[it screams in her voice and it is not her voice]')
    ]);
  }

  await wait(1000);
  audio.sfx('ignite', { vol: .8 });
  await UI.say('', '[hold it]', { dur: 2200 });

  // hold-to-burn. the only "hold" in the finale, and there is no way to fail it.
  await wait(4200);

  await convo([
    SAY('VICTOR', '[shouting the last of it over the noise]'),
    SAY('VICTOR', 'VADE RETRO. VADE RETRO. IN NOMINE PATRIS ET FILII ET SPIRITUS SANCTI...'),
    SAY('VICTOR', 'GO.')
  ]);

  audio.sting('hit');
  await UI.fadeOut(400, true);
  await wait(180);
  await UI.fadeIn(700);

  world.untick(hold);
  player.shake = 0;

  // and then it is very, very quiet.
  audio.killLoop('score', 2.5);
  audio.killLoop('wind', 3.0);
  her.g.visible = false;

  // there is a wet barn coat on the floor of the aisle, and nothing in it.
  const coat = new THREE.Mesh(SHAPE.Box(0.7, 0.1, 1.1), tiled(MAT.coat, 0.7, 1.1));
  coat.position.set(C.sanctX - 2.0, 0.05, 0);
  coat.rotation.y = 0.3;
  world.add(coat);
  church.refs.lamps.forEach((l, i) => l.set(i < 3));

  await wait(4000);
  await UI.say('', '[a wet barn coat on the floor of the aisle]', { dur: 3400 });
  await wait(2400);
  await UI.say('', '[and nothing in it]', { dur: 3200 });
  await wait(3000);

  // ---- the rectory kitchen, at dawn. one unbroken scene. no cuts, no music.
  await UI.fadeOut(3000);
  await wait(1200);
  await kitchenScene(ctx, church, victor);

  await UI.fadeOut(2200);
  await wait(800);
  await finalShot(ctx);

  setFlag(saidItFirst ? 'endingC' : 'endingB');
  await ctx.ending(saidItFirst ? 'C' : 'B');
}

/* ============================================================
   ENDING C, "Gerald"
   Requires all twelve tapes, the register, and having told her
   the truth about his name in Chapter 1.

   Six seconds. It's her. Really her.
   ============================================================ */
async function endingC(ctx, her, victor, church) {
  const { world, player } = ctx;

  await convo([
    J('[out loud. not written. not thought. not the name it\'s wearing.]'),
    J('...'),
    J('Recca Marta Vasko.')
  ]);

  audio.killLoop('score', 1.2);
  await wait(600);

  // and for about six seconds, it's her.
  her.jawOpen = 0;
  her.drowned = false;
  her.g.traverse(o => {
    if (o.isMesh && o.material?.color) {
      const c = o.material.color.getHex();
      if (c === 0x8fa2a8) { o.material = o.material.clone(); o.material.color.setHex(0xdcb79c); }
    }
  });
  her.shadow.visible = false;
  audio.setLoopVol('wind', 0.1);

  await wait(1400);

  await convo([
    SAY('RECCA', '[she looks at her own hands]'),
    SAY('RECCA', '...Jared?'),
    SAY('RECCA', '[she is confused, and freezing, and she does not know where she is]'),
    SAY('RECCA', 'Why are we, what is this, is this Brigid\'s? It\'s three in the morning.'),
    SAY('RECCA', '[she is shaking]'),
    SAY('RECCA', 'The last thing I remember is a car. On Colliery Road. My mother was...')
  ]);

  await wait(900);

  // she gets one line. she uses it to ask if her mom's okay.
  await UI.say('RECCA', 'Is my mom okay?', { dur: 4200 });

  await wait(2600);
  await UI.say('JARED', '...', { style: 'thought', dur: 2400 });
  await wait(1400);

  const a = await UI.choose([
    { text: '"She\'s okay."', value: 'lie' },
    { text: 'Nothing. There isn\'t time.', value: 'nothing' },
    { text: '"I love you."', value: 'love' }
  ]);
  if (a === 'lie') await UI.say('JARED', 'She\'s okay.', { dur: 2200 });
  if (a === 'love') await UI.say('JARED', 'I love you.', { dur: 2200 });
  if (a === 'nothing') await UI.say('', '[he doesn\'t answer. there are two seconds left and he spends them looking at her.]', { dur: 3600 });

  await wait(1600);
  await UI.say('', '[six seconds]', { dur: 2200 });
  await wait(1200);

  // then he burns it, and she's gone, and it is so much worse and so
  // much better.
  await endingB(ctx, her, victor, church, true);
}

/* ============================================================
   THE KITCHEN
   A single unbroken six-minute scene with no cuts and no music.
   ============================================================ */
async function kitchenScene(ctx, church, victor) {
  const { world, player, renderer } = ctx;
  const rect = church.refs.rectory;
  renderer.setGrade('winter');
  world.scene.background = new THREE.Color(0x5c6b7c);
  world.scene.fog = new THREE.FogExp2(0x66757f, 0.008);
  rect.refs.light.intensity = 0.9;
  world.hemi(0x8fa4bc, 0x3a3226, 0.5);

  player.teleport(rect.pos.x - 1.4, rect.pos.z + 0.4, 0, -Math.PI / 2);
  player.canMove = false;
  player.eye = 1.2;   // sitting

  victor.setPos(rect.pos.x - 3.4, 0, rect.pos.z + 0.4);
  victor.face(rect.pos.x, rect.pos.z + 0.4);
  victor.lookAt(ctx.camera);
  victor.p.legs.forEach(l => { l.hp.rotation.x = -1.5; l.kn.rotation.x = 1.5; });

  audio.killAllLoops(1.5);
  audio.roomTone(0.03, 500);

  await UI.fadeIn(3200);
  await wait(1600);

  await convo([
    SAY('VICTOR', '[instant coffee. he does not apologise for it.]'),
    SAY('VICTOR', 'Nineteen sixty-three. Nine men in the gangway at the four-hundred-foot level. Your great-grandfather gave the order and the company men bricked it and two of them heard them and one of them said he didn\'t.'),
    SAY('VICTOR', 'That\'s not the supernatural part. That\'s just Pennsylvania.'),
    J('...'),
    SAY('VICTOR', 'The supernatural part is what the families did after.')
  ]);

  await convo([
    SAY('VICTOR', 'Nine men died owed something. A debt\'s a real thing, people have believed that for ten thousand years, it\'s older than any church.'),
    SAY('VICTOR', 'Somebody in this parish, in \'64, made an arrangement so the town wouldn\'t go the way the seam went. And it worked. That\'s the horrible bit. It worked. The colliery stayed open eleven more years and there are people alive in this town because of it.'),
    SAY('VICTOR', 'It costs one every nine years. Nineteen to twenty-one. Always local. Always September. Always somebody\'s kid.'),
    J('The flyers.'),
    SAY('VICTOR', 'The flyers.')
  ]);

  await convo([
    SAY('VICTOR', 'And it never clears. A payment buys nine years, it doesn\'t clear the debt.'),
    SAY('VICTOR', 'It clears with a Hale.'),
    SAY('VICTOR', 'That\'s who owed it. That\'s the whole arithmetic. Nine men owed by one man and one family, and that family has been in Philadelphia for fifty years being extremely careful never to come here.'),
    SAY('VICTOR', '[he looks at him]'),
    SAY('VICTOR', 'And then one of them enrolled at Ashgrove State because he wanted to annoy his father.')
  ]);

  await wait(900);

  await convo([
    J('You\'ve been waiting.'),
    SAY('VICTOR', 'Three years.'),
    SAY('VICTOR', 'I dropped out, I went to the seminary, I got myself sent back here as a transitional deacon, which is not a priest, before you say it...'),
    J('I wasn\'t going to say it.'),
    SAY('VICTOR', 'Everybody says it.'),
    SAY('VICTOR', '[a pause]'),
    SAY('VICTOR', 'I came back because Elena worked it out and Elena went to that church on her own, and because I knew they\'d need a Hale eventually, and there was exactly one in Pennsylvania.'),
    SAY('VICTOR', 'So I sat in a town of eleven hundred people for three years and I waited for you to pick up the phone.')
  ]);

  await wait(1200);
  await convo([
    J('I\'m sorry.'),
    SAY('VICTOR', 'I know.'),
    SAY('VICTOR', 'You were twenty and my sister was missing and you didn\'t know what to say, so you said nothing, and then it got too late to say anything, and then it was two years.'),
    SAY('VICTOR', 'That\'s not a monster. That\'s just a person.'),
    SAY('VICTOR', '[he drinks the coffee]'),
    SAY('VICTOR', 'It did cost us four months, though.')
  ]);

  await wait(1400);

  // and the last thing.
  await convo([
    J('Why her?'),
    SAY('VICTOR', '[he puts the cup down]'),
    SAY('VICTOR', 'Because she was closest to you.'),
    SAY('VICTOR', 'That\'s all. That\'s the whole reason. They picked her in the first week of September because you\'d met her in a laundromat in August.'),
    J('...'),
    SAY('VICTOR', 'There\'s one more thing and I\'ve been sitting here for ten minutes deciding whether to tell you, and I\'m going to, because you\'ll find out and it should be from me.')
  ]);

  await wait(1600);

  await convo([
    SAY('VICTOR', 'They came for her on the equinox. The twenty-second.'),
    SAY('VICTOR', 'They\'d had her since the nineteenth.'),
    SAY('VICTOR', 'And the thing they wanted, the only thing they actually needed, was your name. Your whole name, out of her mouth, said freely.'),
    SAY('VICTOR', 'She wouldn\'t give it to them.'),
    SAY('VICTOR', '[a long pause]'),
    SAY('VICTOR', 'Three days, Jared. She held out three days.'),
    SAY('VICTOR', 'That\'s why they had to kill her and wear her. She didn\'t tell them.'),
    SAY('VICTOR', 'She made them come and get it themselves.')
  ]);

  await wait(3200);
  await UI.say('JARED', '...', { style: 'thought', dur: 3400 });
  await wait(2000);

  await convo([
    SAY('VICTOR', 'Drink the coffee. It\'s terrible and it\'s the last thing either of us is going to get for free.'),
    SAY('VICTOR', '[outside, it has started to snow properly]')
  ]);
  await wait(2600);
}

/* ============================================================
   FINAL SHOT
   Jared drives out of Ashgrove at 8 AM. Snow on the ground.
   Snow on the ground everywhere, including over Kesslerton
   No. 9, for the first time in fifty-one years.
   ============================================================ */
async function finalShot(ctx) {
  const { world, renderer, player } = ctx;
  renderer.setGrade('daylight');
  world.scene.background = new THREE.Color(0xdfe7ef);
  world.scene.fog = new THREE.FogExp2(0xe6ecf2, 0.006);

  // a clean plate: the mine, capped, and covered.
  const g = new THREE.Group();
  const ground = new THREE.Mesh(SHAPE.Plane(120, 120), tiled(MAT.snow, 120, 120));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const cap = new THREE.Mesh(CYL(3.0, 3.2, 0.5, 20), tiled(MAT.concrete, 6, 0.5));
  cap.position.set(0, 0.25, 0);
  g.add(cap);
  // covered. for the first time in fifty-one years.
  const capSnow = new THREE.Mesh(CYL(3.05, 3.05, 0.09, 20), tiled(MAT.snow, 6, 0.1));
  capSnow.position.set(0, 0.54, 0);
  g.add(capSnow);
  const fence = new THREE.Mesh(SHAPE.Box(0.08, 1.3, 40), flat(0x8a8f92, { rough: .5, metal: .5 }));
  fence.position.set(-14, 0.65, 0);
  g.add(fence);
  g.position.set(0, -400, 0);
  world.add(g);
  world.hemi(0xdfe7ef, 0xb9c7d6, 1.1);
  world.sun([-0.4, -0.9, 0.5], 0xffffff, 0.9, false);

  const cam = renderer.camera;
  player.canMove = false; player.canLook = false;
  cam.position.set(11, -394, 15);
  cam.rotation.set(-0.12, 0.6, 0, 'YXZ');
  renderer.setFocus(24);

  audio.killAllLoops(2.0);
  audio.wind(0.15);

  let t = 0;
  world.tick(dt => { t += dt; cam.position.x = 11 - t * 0.4; cam.rotation.y = 0.6 - t * 0.006; });

  await UI.fadeIn(4000);
  await wait(3000);
  await UI.say('', '[snow on the ground]', { dur: 3200 });
  await wait(2600);
  await UI.say('', '[snow on the ground everywhere]', { dur: 3400 });
  await wait(2800);
  await UI.say('', '[including over Kesslerton No. 9, for the first time in fifty-one years]', { dur: 4600 });
  await wait(4200);

  // post-credits, for Ending C: Recca's bedroom, daylight, the quilt
  // turned down, the record player dusted, and Gerald facing out.
  if (state.get().tapes.length >= 12 && flag('endingC')) {
    await UI.fadeOut(2600);
    await wait(1400);
    const v = buildVaskoHouse(world, { x: 300, y: -400, z: 0, state: 'lived' });
    const r = v.refs.reccaRoom;
    // the quilt turned down. the record player dusted.
    v.refs.recordPlayer.children.forEach(c => { if (c.material?.opacity === 0.28) c.visible = false; });
    // Gerald, on the windowsill, facing out.
    v.refs.gerald.rotation.y = 0;
    renderer.camera.position.set(r.x - 0.4, r.y + 1.45, r.z + 1.1);
    renderer.camera.rotation.set(-0.08, 0.2, 0, 'YXZ');
    renderer.setFocus(2.2);
    world.hemi(0xdfe7ef, 0xa89a80, 1.0);
    await UI.fadeIn(3600);
    await wait(6500);
    await UI.fadeOut(3600);
    await wait(1200);
  }
}

export default ch6;
