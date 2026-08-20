/* ============================================================
   CHAPTER FIVE, "The Ninth Hour"
   1:20 AM – 3:00 AM · ~70 min

   Emotion target: relentless, exhausting, physical.

   Six things have to happen and Victor can't do them, because
   Victor has to hold the rite at the altar without stopping.

   THE PROXIMITY SYSTEM IS DIEGETIC. There is no HUD. Through
   the nave's west windows the player can see Ridge Road: thirty-
   one streetlights, going out one at a time, from the bottom of
   the hill up. That's her, walking. Nothing tells the player to
   look. Once about half are out, they'll check compulsively.

   Anti-frustration (doc §10): there are exactly two fail states
   in this chapter, the bell count and letting all four seals
   break, and both restart the CHORE, not the chapter. The
   clock never kills you: when the last light is reached before
   the work is done, it holds. She is patient. She has time.
   ============================================================ */
import * as THREE from 'three';
import { buildChurch, CHURCH } from '../world/loc_church.js';
import { buildStreetlights, LIGHT_COUNT } from '../world/streetlights.js';
import { makeVictor, makeReccaDrowned, makeButtons, smallProp } from '../world/props.js';
import { MAT, flat, tiled } from '../world/mat.js';
import { BOX, CYL, SPH, PLN, SCALE } from '../world/world.js';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { scares } from '../core/scares.js';
import { Phone } from '../core/phone.js';
import { settings, setFlag, flag, state } from '../core/state.js';
import { convo, J, SAY, objective, objectiveDone, numb, carryable, forceLook } from './util.js';
import { REGISTER_BAPTISM, REGISTER_DEATH, VICTOR_CARDS, HOHMAN } from '../content/docs.js';
import { makeSnow } from './ch4.js';

/** Seconds per streetlight. 31 × 42 ≈ 22 minutes of clock. */
const SECONDS_PER_LIGHT = 42;

export const ch5 = {
  id: 'ch5', card: 'CHAPTER FIVE', title: 'The Ninth Hour', date: 'December 21, 2014 · 1:20 AM', temp: '17°F',
  async build(ctx) {
    const { world, player, renderer } = ctx;
    renderer.setGrade('church');
    Phone.setClock('1:20');
    Phone.subject = null;

    const church = buildChurch(world, { x: 0, y: 0, z: 0, lit: false });
    ctx.church = church;
    const C = CHURCH;

    // ---- Ridge Road, seen through the west windows ----
    const lights = buildStreetlights(world, {
      origin: new THREE.Vector3(-2, -2.0, -34),
      spacing: 5.6, drop: 0.42, count: LIGHT_COUNT, road: true, realLights: 4
    });
    lights.g.rotation.y = 0.18;
    ctx.lights = lights;

    const snow = makeSnow(world, 700);
    world.tick(dt => snow.update(dt, 0));

    // ---- people ----
    const victor = makeVictor(world);
    ctx.victor = victor;
    const her = makeReccaDrowned(world);
    her.setPos(0, -50, 0);
    ctx.her = her;
    her.wrongShadow(1.9, 2.6);          // tell #2: cast from the wrong direction
    her.shadow.visible = false;

    // Buttons, if he was fed nine times, follows Jared into the church.
    let buttons = null;
    if ((state.get().flags.fedButtons || 0) >= 9) {
      buttons = makeButtons(world, C.narthexX + 2, 0, 2.0);
      setFlag('buttonsInChurch');
      ctx.buttons = buttons;
    }

    // ---- ambience ----
    audio.wind(0.6);
    audio.roomTone(0.03, 300);
    audio.waterDrip([C.sanctX - 1.6, -2.5, C.sacristyZ + 4.6], 4200);
    // the whole building is the reverb from here on
    if (audio.ready) { audio.conv.buffer = audio.ir.church; audio.convSend.gain.value = 0.36; }

    player.hasFlashlight = true;
    player.setFlashlight(false);

    // ============================================================ STATE
    const S = ctx.S = {
      bell: 0, bellDone: false,
      lamps: 0, lampsDone: false,
      seals: new Set(), sealsDone: false, sealsBroken: 0,
      register: false, font: false, name: false,
      oilCan: null, bucket: null, hasSalt: false, hasNails: false,
      breakerOn: false, primed: false,
      arrived: false, musicOn: false,
      choresDone: () => S.bellDone && S.lampsDone && S.sealsDone && S.register && S.font
    };

    // ============================================================ THE SIX
    // Everything the player can touch exists before the briefing does,
    // so nothing can be reached before it is real.
    choreBell(ctx, church, S);
    choreLamps(ctx, church, S);
    choreSeals(ctx, church, S);
    choreRegister(ctx, church, victor, S);
    choreFont(ctx, church, S);
    choreName(ctx, church, S);
    setupSacristyMirror(ctx, church);
    setupVictorCards(ctx, church);

    // ============================================================ OPENING
    await openingBeat(ctx, church, victor);

    // ============================================================ THE CLOCK
    // Ridge Road starts going dark only once he knows what he's doing.
    startProximity(ctx, lights, church, S);
  }
};

/* ============================================================
   "You're two years late. Get inside and take your shoes off,
    the floor's wet."
   ============================================================ */
async function openingBeat(ctx, church, victor) {
  const { world, player } = ctx;
  const C = CHURCH;
  const rect = church.refs.rectory;

  player.teleport(rect.pos.x, rect.pos.z + 5.6, 0, Math.PI);
  victor.setPos(rect.pos.x, 0, rect.pos.z + 4.1);
  victor.face(rect.pos.x, rect.pos.z + 9);
  victor.lookAt(ctx.camera);

  await UI.fadeIn(1800);

  await convo([
    SAY('VICTOR', 'You\'re two years late.'),
    SAY('VICTOR', 'Get inside and take your shoes off, the floor\'s wet.'),
    J('Vic...'),
    SAY('VICTOR', 'Shoes.')
  ]);

  await wait(500);
  await convo([
    SAY('VICTOR', '[he is already dressed. he is carrying a can of lamp oil.]'),
    J('You knew.'),
    SAY('VICTOR', 'I\'ve known since the twenty-third of September.'),
    J('September...'),
    SAY('VICTOR', 'I called you four times. You have a phone. It rang.'),
    J('...'),
    SAY('VICTOR', 'I\'m not doing this now. We\'ll do it at seven in the morning if there\'s a seven in the morning. Walk with me.')
  ]);

  // he moves. everything from here is delivered while he is moving.
  victor.speed = 1.5;
  victor.walkTo(C.sanctX, C.sacristyZ - 5.0);
  player.canMove = true;
  objective('do what he says', 'do');

  await convo([
    SAY('VICTOR', 'Rules. Ninety seconds. Don\'t interrupt, I will lose my place and I cannot lose my place tonight.'),
    SAY('VICTOR', 'The thing wearing your girl is bound to a name and a debt. Nine men, 1963, your great-grandfather. You know that part or you wouldn\'t be here.'),
    SAY('VICTOR', 'It cannot come in unless it is invited, or unless the seals fail.'),
    SAY('VICTOR', 'It cannot take you unless you go. Willingly. Out loud.'),
    SAY('VICTOR', 'Those two facts are the entire reason we are not already dead, so hold onto them.')
  ]);

  victor.walkTo(C.sanctX + 0.4, 0);
  await convo([
    SAY('VICTOR', 'We have until three. Three is when the debt comes due, the ninth hour, inverted. It\'s the twenty-first of December, it\'s the longest night, and it\'s the ninth year since the last one, so it\'s all three at once. That is why it is tonight and not any other night.'),
    SAY('VICTOR', 'Six things have to happen before three, and I can\'t do any of them.'),
    J('Why not?'),
    SAY('VICTOR', 'Because I have to hold the rite at that altar without stopping. If I stop, we start over. And there is no time to start over.')
  ]);

  await wait(400);
  await convo([
    SAY('VICTOR', 'One. The bell. Nine strikes. Slow. Four seconds minimum between. If you rush it the count doesn\'t take and we do it again, and I don\'t think we get to do it again.'),
    SAY('VICTOR', 'Two. Seven lamps down the aisle. Oil\'s in the boiler room. Breaker\'s off, so is the light, and it\'s flooded, mind your footing.'),
    SAY('VICTOR', 'Three. Four doors. Salt and iron. West main, sacristy exterior, sanctuary side, and the coal chute. Everybody forgets the coal chute. Don\'t.'),
    SAY('VICTOR', 'Four. The parish register. Office, fireproof cabinet, and, you\'ll have to take the key off my belt while I\'m working. I\'m sorry. Do it fast.'),
    SAY('VICTOR', 'Five. Water in that font. Pump\'s in the courtyard. Prime it, fill the bucket, and do not put it down between there and here.'),
    SAY('VICTOR', 'Six. Her name. Written, in ink, held in the water, and burned. That one\'s last and that one\'s yours.')
  ]);

  objective('1. bell. 9. slow.', 'c1');
  objective('2. seven lamps. oil in the boiler room.', 'c2');
  objective('3. four doors. salt + iron. THE COAL CHUTE.', 'c3');
  objective('4. the register. the key is on his belt.', 'c4');
  objective('5. water. don\'t set the bucket down.', 'c5');
  objective('6. her name. ink, water, match.', 'c6');

  await convo([
    J('Vic. What is she?'),
    SAY('VICTOR', '[he doesn\'t say demon. he never says demon.]'),
    SAY('VICTOR', 'It\'s a debt with a face on. That\'s all. Somebody made it a face so somebody else would say yes to it.'),
    SAY('VICTOR', 'Don\'t look at me like that. Go and ring the bell.'),
    SAY('VICTOR', '[he lights the first candle at the altar and he starts, and he does not look up again]')
  ]);

  victor.setPos(CHURCH.sanctX + 0.4, CHURCH.sanctuaryY, 0);
  victor.face(CHURCH.sanctX + 4, 0);
  victor.lookAt(null);
  startTheRite(ctx, victor);
}

/** He gives instructions like a man reading a repair manual, because
    that is the only way he can keep working. */
function startTheRite(ctx, victor) {
  const { world } = ctx;
  const LINES = [
    'Deus, in adiutorium meum intende.',
    'Domine, ad adiuvandum me festina.',
    'Ab insidiis diaboli, libera nos, Domine.',
    'Ut Ecclesiam tuam secura tibi facias libertate servire.',
    'Terribilis est locus iste.',
    'Non est hic aliud nisi domus Dei.',
    'Et haec porta caeli.',
    'Vade retro. Vade retro. Vade retro.'
  ];
  let i = 0, t = 0;
  world.tick(dt => {
    t += dt;
    if (t < 17) return;
    t = 0;
    // he is a long way off. you hear it as a room, not as a voice.
    UI.say('VICTOR', LINES[i % LINES.length], { dur: 3400 });
    i++;
    // breath, arms, the small physical facts of a man doing something for an hour
    victor.p.arms.forEach((a, k) => { a.sh.rotation.x = -0.9 - (k * 0.05); a.el.rotation.x = -0.5; });
  });
}

/* ============================================================
   THE PROXIMITY SYSTEM
   ============================================================ */
function startProximity(ctx, lights, church, S) {
  const { world, player, renderer } = ctx;
  let t = 0, checked = 0;
  ctx.breathFog = false;

  world.tick(async dt => {
    if (S.arrived) return;
    t += dt;
    if (t >= SECONDS_PER_LIGHT) {
      t = 0;
      // The clock never kills you: it holds at one light until the work
      // is done. She is patient. She has been patient since September.
      if (lights.lit <= 1 && !S.choresDone()) return;
      if (lights.lit > 0) {
        lights.setLit(lights.lit - 1);
        audio.sfx('click', { vol: 0.05 });
      }
      const left = lights.lit;

      // secondary tells, in order
      if (left === 22) {
        // Victor's breath starts fogging. Inside.
        ctx.breathFog = true;
        UI.say('JARED', '[his breath is fogging]', { style: 'thought', dur: 2400 });
      }
      if (left === 16) {
        church.refs.lamps.forEach(l => l.gutter(0.6));
      }
      if (left === 11) {
        // the stuck clock ticks once and stops again.
        audio.sfx('latch', { vol: 0.5 });
        UI.say('JARED', '[the clock in the tower just ticked]', { style: 'thought', dur: 2600 });
      }
      if (left === 7) {
        church.refs.lamps.forEach(l => l.gutter(1.0));
        audio.sting('sub');
      }
      if (left === 4 && !S.musicOn) {
        // 02:41. The piano has been with him all night. Here it stops
        // being company: same instrument, same room, but the piece
        // changes underneath him and does not change back.
        S.musicOn = true;
        Phone.setClock('2:41');
        audio.musicScene('ninth_hour');
        audio.score(0.4);
      }
      if (left === 0 && S.choresDone()) {
        S.arrived = true;
        arrival(ctx, church, S);
      }
    }

    // "if you are near a west window, you can see"
    const nearWindow = church.refs.westWindows.some(w =>
      Math.hypot(player.pos.x - w.x, player.pos.z - w.z) < 4.2);
    if (nearWindow && !ctx._windowHinted) {
      ctx._windowHinted = true;
      UI.say('JARED', '[you can see the whole of Ridge Road from here]', { style: 'thought', dur: 3000 });
    }
  });

  // the west windows are interactable, and all they do is let him count
  church.refs.westWindows.forEach((w, i) => {
    world.interact(w.mesh, {
      label: 'Look down the hill', dist: 4.0,
      use: async () => {
        checked++;
        const n = lights.lit;
        if (n > 24) await UI.say('JARED', `[${n}]`, { style: 'thought', dur: 1600 });
        else if (n > 14) await UI.say('JARED', `[${n} left]`, { style: 'thought', dur: 1800 });
        else if (n > 6) await UI.say('JARED', `[${n}]`, { style: 'thought', dur: 1600 });
        else if (n > 1) await UI.say('JARED', `[${n}]`, { style: 'thought', dur: 1400 });
        else await UI.say('JARED', '[one]', { style: 'thought', dur: 1800 });
        if (checked === 1) {
          await convo([
            J('The streetlights are going out.'),
            J('From the bottom of the hill. One at a time. In order.'),
            J('...'),
            J('It\'s four miles.')
          ]);
        }
      }
    });
  });
}

/* ============================================================
   CHORE 1. THE BELL
   ============================================================ */
function choreBell(ctx, church, S) {
  const { world, player } = ctx;
  const tower = church.refs.tower;

  // the three rotten landings need a route. there is a plank downstairs.
  const plank = new THREE.Mesh(BOX(1.7, 0.06, 0.34), tiled(MAT.wood, 1.7, 0.34));
  plank.position.set(CHURCH.narthexX + 1.4, 0.03, 1.2);
  plank.castShadow = true;
  world.add(plank);
  carryable(world, plank, ctx, { label: 'A plank' });

  const ladder = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const r = new THREE.Mesh(BOX(0.42, 0.04, 0.04), flat(0x6a4a30, { rough: .9 }));
    r.position.y = i * 0.26; ladder.add(r);
  }
  [-0.21, 0.21].forEach(sx => {
    const s = new THREE.Mesh(BOX(0.05, 1.9, 0.05), flat(0x6a4a30, { rough: .9 }));
    s.position.set(sx, 0.85, 0); ladder.add(s);
  });
  ladder.position.set(CHURCH.narthexX + 2.0, 0, -2.6);
  ladder.rotation.z = 0.15;
  world.add(ladder);
  carryable(world, ladder, ctx, { label: 'A ladder' });

  tower.landings.forEach((L, i) => {
    if (!L.rotten) return;
    const mark = new THREE.Mesh(PLN(1.4, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(L.x, L.y + 0.05, L.z);
    world.add(mark);
    world.interact(mark, {
      label: () => player.carrying ? 'Lay it across' : 'The boards are gone through',
      dist: 2.6,
      use: async () => {
        if (!player.carrying) {
          await UI.say('JARED', '[there\'s nothing under this. you can see the last landing through it.]', { style: 'thought', dur: 3000 });
          return;
        }
        const obj = player.drop();
        obj.position.set(L.x, L.y + 0.03, L.z);
        obj.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0);
        obj.scale.set(1, 1, 3.2);
        L.bridge();
        audio.sfx('wood', { vol: .5 });
        UI.toast('bridged', `landing ${i + 1}`);
      }
    });
  });

  // bats
  const bats = [];
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(BOX(0.16, 0.03, 0.07), flat(0x1a1614, { rough: .95 }));
    b.position.set(tower.x + (Math.random() - .5) * 2.4, tower.chamberY + 1.6 + Math.random() * 0.7, tower.z + (Math.random() - .5) * 2.4);
    world.add(b); bats.push(b);
  }
  let batsGone = false;

  // ---- the rope, frozen to the wheel ----
  let freed = false;
  let lastStrike = -99;
  const ropeRec = world.interact(church.refs.tower.refs.rope, {
    label: () => !freed ? 'The rope is frozen to the wheel' : 'Pull',
    dist: 3.0,
    hold: () => 0,
    use: async () => {
      if (S.bellDone) { await UI.say('JARED', '[nine]', { style: 'thought', dur: 1400 }); return; }
      if (!freed) {
        // has to be worked free
        S.ropeWork = (S.ropeWork || 0) + 1;
        audio.sfx('creak', { vol: .4 });
        player.shake = 0.3;
        if (S.ropeWork < 4) { await UI.say('JARED', '[it\'s iced into the wheel]', { style: 'thought', dur: 1500 }); return; }
        freed = true;
        audio.sfx('metal', { vol: .55 });
        await UI.say('JARED', '[free]', { style: 'thought', dur: 1400 });
        if (!batsGone) {
          batsGone = true;
          bats.forEach((b, i) => {
            let t = 0;
            const tk = world.tick(dt => {
              t += dt;
              b.position.y += dt * 2.4;
              b.position.x += Math.sin(t * 9 + i) * dt * 3;
              b.rotation.z = Math.sin(t * 22 + i) * 0.7;
              if (t > 2.2) { world.untick(tk); world.root.remove(b); }
            });
          });
          audio.sfx('paper', { vol: .5 });
          player.shake = 0.6;
        }
        return;
      }

      // ---- the count ----
      const now = performance.now() / 1000;
      const gap = now - lastStrike;
      scares.setChore(true);

      if (S.bell > 0 && gap < 4) {
        // rush it and the count resets. this is one of the two fail
        // states in the chapter, and it restarts the chore, not the chapter.
        S.bell = 0;
        lastStrike = now;
        audio.bell(0.5, [tower.x, tower.chamberY, tower.z]);
        await UI.say('VICTOR', 'Slower. Start again.', { dur: 2600 });
        UI.toast('the count reset', 'four seconds between');
        scares.setChore(false);
        return;
      }

      lastStrike = now;
      S.bell++;
      audio.bell(1, [tower.x, tower.chamberY, tower.z]);
      tower.swing(0.4);
      setTimeout(() => tower.swing(-0.3), 260);
      setTimeout(() => tower.swing(0), 700);
      player.shake = 0.5;
      UI.say('', String(S.bell), { dur: 1400 });

      // strike six: the rope pulls back, hard, from above.
      if (S.bell === 6) {
        scares.fire('ch5.rope', () => { player.shake = 1.8; });
      }
      // strike eight: something in the dark up in the bell chamber says his name.
      if (S.bell === 8) {
        scares.fire('ch5.name', async () => {
          await wait(900);
          await UI.say('RECCA', 'Jared.', { style: 'radio', dur: 2200 });
          await wait(400);
          const answered = await UI.choose([
            { text: 'Answer.', value: true },
            { text: 'Say nothing.', hint: flag('readHohman') ? 'Hohman, p.63.' : '', value: false }
          ]);
          if (answered) {
            // he answers, and the ninth strike is much worse.
            S.answeredInTheDark = true;
            audio.sting('riser');
            await convo([
              J('...I\'m here.'),
              SAY('RECCA', '[it says his name back, in his own voice]', { style: 'radio' })
            ]);
          } else {
            await UI.say('JARED', '[don\'t answer it. answering is consent.]', { style: 'thought', dur: 2600 });
          }
        });
      }

      if (S.bell >= 9) {
        S.bellDone = true;
        scares.setChore(false);
        if (S.answeredInTheDark) {
          audio.sting('hit');
          player.shake = 2.4;
          await convo([
            J('[the ninth one doesn\'t sound like a bell]'),
            J('[it sounds like nine people]')
          ]);
        }
        objectiveDone('c1');
        UI.toast('nine', 'the bell is done');
        await wait(1200);
        await UI.say('VICTOR', 'Good. Lamps. Oil\'s downstairs and the breaker\'s off, mind the water.', { dur: 3600 });
      }
      scares.setChore(false);
    }
  });
}

/* ============================================================
   CHORE 2. SEVEN LAMPS
   ============================================================ */
function choreLamps(ctx, church, S) {
  const { world, player } = ctx;
  const C = CHURCH;
  const boiler = church.refs.boilerRoom;

  // the breaker
  world.interact(church.refs.breaker.g, {
    label: () => S.breakerOn ? 'On' : 'The main breaker', dist: 2.2,
    use: async () => {
      if (S.breakerOn) return;
      S.breakerOn = true;
      church.refs.breaker.throwIt();
      audio.sfx('metal', { vol: .6 });
      const bl = world.bulb(boiler.x, boiler.y + 2.3, boiler.z, {
        color: 0xE7F2E4, intensity: 1.6, dist: 6, emissive: false
      });
      await wait(600);
      // and the coal chute rattles, because something is trying the
      // fourth door already.
      audio.sfx('metal', { vol: .7, pos: [boiler.x, boiler.y + 1.1, boiler.z - 2.4] });
      player.shake = 0.8;
      await UI.say('JARED', '[something just tried the coal chute]', { style: 'thought', dur: 2800 });
    }
  });

  // the oil can
  const can = new THREE.Group();
  const body = new THREE.Mesh(CYL(0.13, 0.13, 0.3, 12), tiled(MAT.rust, 0.5, 0.3));
  const spout = new THREE.Mesh(CYL(0.02, 0.03, 0.22, 8), tiled(MAT.rust, 0.2, 0.22));
  spout.position.set(0.11, 0.2, 0); spout.rotation.z = -0.5;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12), flat(0x3a3630, { rough: .6, metal: .5 }));
  handle.position.y = 0.18; handle.rotation.x = Math.PI / 2;
  can.add(body, spout, handle);
  can.position.set(boiler.x + 1.7, boiler.y + 0.16, boiler.z - 1.5);
  can.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(can);
  S.oilCan = can;
  carryable(world, can, ctx, { label: 'The oil can', heavy: true });

  world.interact(church.refs.oilDrum, {
    label: 'Oil drum', dist: 2.2,
    use: () => UI.say('JARED', 'Lamp oil. Half full. The can\'s on the floor next to it.', { style: 'thought' })
  });

  // the seven lamps
  church.refs.lamps.forEach((lamp, i) => {
    world.interact(lamp.g, {
      label: () => lamp.lit ? `Lamp ${i + 1}` : (player.carrying?.obj === can ? `Fill lamp ${i + 1}` : `Lamp ${i + 1}, dry`),
      dist: 2.4,
      use: async () => {
        if (lamp.lit) return;
        if (player.carrying?.obj !== can) {
          await UI.say('JARED', '[dry. the oil\'s in the boiler room.]', { style: 'thought', dur: 2000 });
          return;
        }
        scares.setChore(true);
        audio.sfx('pour', { vol: .5 });
        await wait(1400);
        audio.sfx('match', { vol: .5 });
        await wait(400);
        lamp.set(true);
        S.lamps++;
        audio.sfx('ignite', { vol: .35 });
        scares.setChore(false);

        // the scare is at the moment of completion, never during the work.
        if (i === 3) {
          // filling lamp 4, the player has their back to the nave.
          scares.fire('ch5.pews', () => {
            church.turnPews('left', true);
          });
          await wait(400);
          await UI.say('JARED', '[...]', { style: 'thought', dur: 2000 });
          await convo([
            J('Vic.'),
            J('Vic, the pews.'),
            SAY('VICTOR', '[he does not stop]'),
            SAY('VICTOR', '[he does not look up]'),
            SAY('VICTOR', '[he does not react to anything, all night, which is its own horror]')
          ]);
        }

        if (S.lamps >= 7) {
          S.lampsDone = true;
          objectiveDone('c2');
          UI.toast('seven', 'the aisle is lit');
          await UI.say('VICTOR', 'Seven. Doors next. Salt\'s on the counter in the kitchen, nails are in the sacristy.', { dur: 4000 });
        }
      }
    });
  });
}

/* ============================================================
   CHORE 3. FOUR SEALS
   ============================================================ */
function choreSeals(ctx, church, S) {
  const { world, player } = ctx;
  const C = CHURCH;
  const rect = church.refs.rectory;

  world.interact(rect.refs.salt, {
    label: 'Salt', dist: 2.2, once: true,
    use: () => { S.hasSalt = true; audio.sfx('salt', { vol: .4 }); UI.toast('salt'); }
  });

  const nails = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const n = new THREE.Mesh(CYL(0.004, 0.004, 0.07, 5), flat(0x4a4438, { rough: .5, metal: .8 }));
    n.rotation.z = Math.PI / 2 + (Math.random() - .5) * 0.6;
    n.position.set((Math.random() - .5) * 0.1, 0.005, (Math.random() - .5) * 0.08);
    nails.add(n);
  }
  nails.position.set(C.sanctX + 1.2, C.sanctuaryY + SCALE.counter + 0.02, C.sacristyZ - 2.5);
  world.add(nails);
  world.interact(nails, {
    label: 'Iron nails', dist: 2.2, once: true,
    use: () => { S.hasNails = true; audio.sfx('metal', { vol: .35 }); UI.toast('iron nails', 'nine of them'); }
  });

  const DOORS = [
    { id: 'west', ref: church.refs.westDoors, label: 'the west doors' },
    { id: 'sacristy', ref: church.refs.sacristyDoor, label: 'the sacristy door' },
    { id: 'side', ref: church.refs.sideDoor, label: 'the sanctuary side door' },
    { id: 'chute', ref: { pos: church.refs.chutePos, g: church.refs.chuteOuter }, label: 'the coal chute', outside: true }
  ];

  DOORS.forEach(d => {
    const mark = new THREE.Mesh(PLN(1.6, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(d.ref.pos.x, d.ref.pos.y + 0.06, d.ref.pos.z + (d.outside ? 0.8 : 0));
    world.add(mark);
    world.interact(mark, {
      label: () => S.seals.has(d.id) ? 'Sealed' : (S.hasSalt && S.hasNails ? `Seal ${d.label}` : 'Salt and iron'),
      dist: 2.8,
      use: async () => {
        if (S.seals.has(d.id)) return;
        if (!S.hasSalt || !S.hasNails) {
          await UI.say('JARED', '[salt from the rectory kitchen. nails from the sacristy.]', { style: 'thought', dur: 2600 });
          return;
        }
        scares.setChore(true);
        audio.sfx('salt', { vol: .5 });
        await wait(700);
        audio.sfx('metal', { vol: .35 });
        // a line of salt and nine nails
        const line = new THREE.Mesh(BOX(d.outside ? 1.2 : 1.7, 0.008, 0.1), flat(0xf0f2f4, { rough: .9 }));
        line.position.copy(mark.position); line.position.y += 0.01;
        world.add(line);
        S.seals.add(d.id);
        scares.setChore(false);
        UI.toast(`sealed, ${S.seals.size}/4`, d.label);

        if (d.id === 'chute') {
          // the way back: the confessional door in the south transept is open.
          // it was closed.
          scares.fire('ch5.confessional', () => {
            church.refs.confessional.open(0, -1.15);
            audio.door('heavy', 'open', { vol: .5, pos: [CHURCH.crossX, 1.2, 7.2] });
          });
        }
        if (S.seals.size >= 4) {
          S.sealsDone = true;
          objectiveDone('c3');
          await UI.say('VICTOR', 'Four. Good. Now come and take my keys off me, and be quick, because I am going to want to stop.', { dur: 4600 });
        }
      }
    });
  });

  // going outside for the chute: thirty seconds of snow, wind, dark
  world.trigger(church.refs.chutePos.x, church.refs.chutePos.z, 8, 8, {
    onEnter: () => {
      audio.setLoopVol('wind', 1.4);
      if (!ctx._outsideOnce) {
        ctx._outsideOnce = true;
        UI.say('JARED', '[thirty seconds. it is thirty seconds around the building.]', { style: 'thought', dur: 3000 });
      }
    },
    onExit: () => audio.setLoopVol('wind', 0.6)
  });

  // ---- the seals under pressure ----
  // If they are not all done, the doors start to go. Losing all four
  // restarts the chore. Nothing else.
  let pressure = 0;
  world.tick(dt => {
    if (S.sealsDone || S.arrived) return;
    if (ctx.lights.lit > 9) return;
    pressure += dt;
    if (pressure > 55) {
      pressure = 0;
      const done = [...S.seals];
      if (!done.length) return;
      const lost = done[Math.floor(Math.random() * done.length)];
      S.seals.delete(lost);
      S.sealsBroken++;
      audio.door('heavy', 'close', { vol: .9 });
      player.shake = 1.2;
      UI.toast('a seal broke', `${S.seals.size}/4`);
      if (S.seals.size === 0 && S.sealsBroken > 2) {
        UI.say('VICTOR', 'They\'re gone. All of them. Do it again, salt, iron, four doors. Go.', { dur: 4000 });
      }
    }
  });
}

/* ============================================================
   CHORE 4. THE REGISTER
   The key is on his belt and he cannot hand it over without
   breaking the rite. It is a quiet, tender, awful thirty seconds.
   ============================================================ */
function choreRegister(ctx, church, victor, S) {
  const { world, player } = ctx;
  const rect = church.refs.rectory;
  let hasKey = false;

  const keyMark = new THREE.Mesh(PLN(0.4, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
  keyMark.position.set(CHURCH.sanctX + 0.4, CHURCH.sanctuaryY + 0.95, 0.35);
  world.add(keyMark);

  world.interact(keyMark, {
    label: () => hasKey ? 'You have his keys' : 'His keys, on his belt', dist: 1.6, hold: hasKey ? 0 : 2.6,
    use: async () => {
      if (hasKey) return;
      hasKey = true;
      scares.setChore(true);
      audio.sfx('metal', { vol: .28 });
      await convo([
        J('[his eyes are shut]'),
        J('[his hands are shaking]'),
        SAY('VICTOR', '[he doesn\'t stop. he doesn\'t open his eyes. his voice doesn\'t change.]'),
        J('[the ring is on the left side of his belt, under the shirt]'),
        J('[it takes about thirty seconds]'),
        J('Sorry.'),
        J('[he says sorry to a door he bumps into. of course he says sorry now.]'),
        SAY('VICTOR', '[still going]')
      ]);
      scares.setChore(false);
      UI.toast('keys');
    }
  });

  world.interact(rect.refs.cabinet, {
    label: () => S.register ? 'The registers' : (hasKey ? 'Unlock the cabinet' : 'Locked, fireproof'),
    dist: 2.4,
    use: async () => {
      if (!hasKey) { await UI.say('JARED', '[the key\'s on his ring, and his ring is on his belt.]', { style: 'thought', dur: 2600 }); return; }
      audio.door('cabinet', 'open', { vol: .7 });
      await wait(500);
      // two things, in this order.
      await UI.openReader(REGISTER_BAPTISM, 'doc-register');
      await wait(400);
      await convo([
        J('Recca Marta Vasko. Baptised the fourth of May, 1994.'),
        J('That\'s her. That\'s her whole name.'),
        J('That\'s what I need.')
      ]);
      if (S.register) return;

      // and then, in a second hand, in the death register.
      await wait(900);
      await UI.say('JARED', '[the next book down is the same size and the wrong colour]', { style: 'thought', dur: 2800 });
      await UI.openReader(REGISTER_DEATH, 'doc-register');

      S.register = true;
      setFlag('sawTheRegister');
      objectiveDone('c4');

      // This is where Jared breaks. He sits down on the office floor with
      // the book in his lap and the player cannot move for forty seconds.
      // Not a cutscene, the input just does nothing.
      player.frozen = true;
      player.canMove = false;
      const targetY = player.pos.y;
      let t = 0;
      const sit = world.tick(dt => {
        t += dt;
        player.eye = Math.max(0.62, 1.72 - t * 1.1);
        player.headTilt = Math.min(0.09, t * 0.05);
        player.updateCamera(dt);
      });
      audio.sfx('breath', { vol: .3 });
      UI.setPrompt(null);
      UI.setCrosshair(false);

      // his breathing is the only sound.
      audio.setLoopVol('score', 0.1);
      for (let i = 0; i < 8; i++) {
        await wait(4200 + Math.random() * 900);
        audio.sfx('breath', { vol: 0.18 + Math.random() * 0.12 });
      }
      world.untick(sit);
      audio.setLoopVol('score', 0.7);
      player.frozen = false;
      player.canMove = true;
      player.headTilt = 0;

      await convo([
        J('The twenty-second of September.'),
        J('Ninety-one days ago.'),
        J('...'),
        J('She had dinner with me on the nineteenth.'),
        J('She had dinner at her mother\'s table on the nineteenth and she didn\'t eat anything, and three days later somebody wrote her name in a book.'),
        J('"Cause: entered."'),
        J('Her mother was there.'),
        J('Her mother held the light.')
      ]);
      await wait(800);
      await UI.say('VICTOR', 'Water. Font. Now, Jared.', { dur: 3000 });
    }
  });
}

/* ============================================================
   CHORE 5. THE FONT
   Prime it, work the handle, fill a bucket, and carry it back
   without setting it down. Something walks parallel to him on
   the far side of the pews the entire way.
   ============================================================ */
function choreFont(ctx, church, S) {
  const { world, player } = ctx;
  const rect = church.refs.rectory;
  const pump = rect.refs.pump;

  const bucket = new THREE.Group();
  const bbody = new THREE.Mesh(CYL(0.16, 0.13, 0.3, 14), tiled(MAT.metal, 0.6, 0.3));
  const bhandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 5, 14, Math.PI), flat(0x8a8f92, { rough: .4, metal: .7 }));
  bhandle.position.y = 0.16;
  const bwater = new THREE.Mesh(CYL(0.145, 0.145, 0.02, 14), new THREE.MeshPhysicalMaterial({
    color: 0x2a3a44, roughness: .04, transmission: .8, transparent: true, opacity: .75
  }));
  bwater.position.y = 0.1; bwater.visible = false;
  bucket.add(bbody, bhandle, bwater);
  bucket.position.set(pump.pos.x + 0.5, pump.pos.y + 0.15, pump.pos.z + 0.4);
  bucket.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(bucket);
  S.bucket = bucket;
  let filled = false;

  world.interact(pump.g, {
    label: () => !pump.primed ? 'Prime the pump' : (filled ? 'Full' : 'Work the handle'),
    dist: 2.2, hold: pump.primed ? 1.6 : 0,
    use: async () => {
      if (!pump.primed) {
        pump.primed = true;
        audio.sfx('metal', { vol: .5 });
        await UI.say('JARED', '[it needs water to make water. there\'s a jug under it, half frozen.]', { style: 'thought', dur: 3000 });
        return;
      }
      if (filled) return;
      if (player.carrying?.obj !== bucket) {
        await UI.say('JARED', '[the bucket]', { style: 'thought', dur: 1400 });
        return;
      }
      scares.setChore(true);
      for (let i = 0; i < 5; i++) {
        pump.handle.rotation.z = 0.5;
        audio.sfx('metal', { vol: .3 });
        await wait(320);
        pump.handle.rotation.z = -0.2;
        await wait(320);
      }
      pump.handle.rotation.z = 0;
      audio.sfx('pour', { vol: .6 });
      await wait(1200);
      bucket.children[2].visible = true;
      filled = true;
      scares.setChore(false);
      UI.toast('full', 'do not set it down');
      startTheWalk(ctx, church, S, bucket);
    }
  });

  carryable(world, bucket, ctx, {
    label: 'The bucket', heavy: true,
    onDrop: () => {
      if (filled && !S.font) {
        bucket.children[2].visible = false;
        filled = false;
        UI.toast('it went over', 'fill it again');
        audio.sfx('splash', { vol: .5 });
      }
    }
  });

  const fontMark = new THREE.Mesh(PLN(1.2, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
  fontMark.rotation.x = -Math.PI / 2;
  fontMark.position.set(church.refs.font.pos.x, church.refs.font.pos.y + 1.2, church.refs.font.pos.z);
  world.add(fontMark);
  world.interact(fontMark, {
    label: () => S.font ? 'The font' : (filled && player.carrying?.obj === bucket ? 'Fill the font' : 'The font, dry since the seventies'),
    dist: 2.4,
    use: async () => {
      if (S.font) return;
      if (!(filled && player.carrying?.obj === bucket)) {
        await UI.say('JARED', '[dry. they moved it in here from the narthex in the seventies and nobody ever filled it again.]', { style: 'thought', dur: 3400 });
        return;
      }
      player.drop();
      world.root.remove(bucket);
      audio.sfx('pour', { vol: .6 });
      await wait(1400);
      church.refs.font.fill();
      S.font = true;
      objectiveDone('c5');
      ctx._walkOff?.();
      UI.toast('water');
      await UI.say('VICTOR', 'Her name. Ink and paper on the credence table. Write it, put it in the water, and burn it at the altar.', { dur: 4600 });
    }
  });
}

/**
 * The walk back. Something walks parallel to him on the far side
 * of the pews the entire way, glimpsed between the columns,
 * never fully seen, always keeping pace.
 *
 * This is entirely audio: a second footstep set, offset 0.4 s,
 * 9 m to the player's left, low-passed until it passes a gap.
 */
function startTheWalk(ctx, church, S, bucket) {
  const { world, player } = ctx;
  let last = 0, acc = 0;
  const shape = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.2, 4, 8), flat(0x000000, { rough: 1 }));
  shape.visible = false;
  world.add(shape);

  const tick = world.tick(dt => {
    if (S.font) return;
    acc += dt;
    const moving = Math.hypot(player.vel.x, player.vel.z) > 0.5;
    // it keeps pace. it does not close.
    const px = player.pos.x, pz = player.pos.z;
    const side = pz > 0 ? -1 : 1;
    shape.position.set(px - 1.6, 0.9, pz + side * 6.2);
    shape.visible = px > CHURCH.naveX - 10 && px < CHURCH.crossX + 4;

    if (moving && acc > 0.62) {
      acc = 0;
      // the low-pass opens up as it passes a gap between the columns
      const nearColumn = Math.abs(((px + 7.5) % 2.6) - 1.3) < 0.5;
      setTimeout(() => audio.parallelStep(shape.position.x, 0.1, shape.position.z, !nearColumn), 400);
    }
  });
  ctx._walkOff = () => { world.untick(tick); world.root.remove(shape); };

  // Contact, 3 of 4, and it does not happen if Mrs. Ostrowski's
  // medal is still in the coat. Nobody will ever tell the player why.
  setTimeout(() => {
    if (S.font) return;
    if (flag('hasBenedictMedal') && flag('medalInCoat')) return;
    scares.fire('ch5.hand', () => {
      player.shake = 1.6;
      UI.say('', '[something takes hold of his wrist and lets go]', { dur: 2400 });
    });
  }, 26000);
}

/* ============================================================
   CHORE 6. THE NAME
   ============================================================ */
function choreName(ctx, church, S) {
  const { world, player } = ctx;
  const C = CHURCH;

  const credence = new THREE.Group();
  const paper = new THREE.Mesh(PLN(0.1, 0.14), flat(0xf0ece0, { rough: .96, side: THREE.DoubleSide }));
  paper.rotation.x = -Math.PI / 2;
  const pen = smallProp('pen', Math.random);
  pen.position.set(0.1, 0, 0.06);
  const matchbox = smallProp('matchbox', Math.random);
  matchbox.position.set(-0.12, 0, 0.04);
  credence.add(paper, pen, matchbox);
  credence.position.set(C.sanctX - 1.2, C.sanctuaryY + 0.92, 1.8);
  world.add(credence);
  const table = new THREE.Mesh(BOX(0.6, 0.9, 0.4), tiled(MAT.pew, 0.6, 0.9));
  table.position.set(C.sanctX - 1.2, C.sanctuaryY + 0.45, 1.8);
  world.add(table);

  let written = false, dipped = false;

  world.interact(credence, {
    label: () => written ? 'The slip of paper' : (S.register ? 'Write her name' : 'Paper, ink'),
    dist: 2.2,
    use: async () => {
      if (!S.register) {
        await UI.say('JARED', '[I don\'t have her whole name. It\'s in the register.]', { style: 'thought', dur: 2800 });
        return;
      }
      if (written) return;
      written = true;
      audio.sfx('paper', { vol: .4 });
      await wait(900);
      await convo([
        J('[R]'),
        J('[E-C-C-A]'),
        J('[M-A-R-T-A]'),
        J('[V-A-S-K-O]'),
        J('[it takes a long time to write nineteen letters]')
      ]);
      // he carries it
      const slip = new THREE.Mesh(PLN(0.1, 0.14), flat(0xf0ece0, { rough: .96, side: THREE.DoubleSide }));
      slip.position.copy(credence.position);
      world.add(slip);
      S.slip = slip;
      player.pickUp(slip, { heavy: false, noSetDown: true });
      audio.sfx('paper', { vol: .28 });
      UI.toast('her name');
    }
  });

  const fontMark2 = new THREE.Mesh(PLN(1.0, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
  fontMark2.rotation.x = -Math.PI / 2;
  fontMark2.position.set(church.refs.font.pos.x, church.refs.font.pos.y + 1.25, church.refs.font.pos.z);
  world.add(fontMark2);
  world.interact(fontMark2, {
    label: () => dipped ? 'Wet' : 'Hold it in the water',
    dist: 2.2,
    use: async () => {
      if (dipped || !written || !S.font) return;
      dipped = true;
      audio.sfx('splash', { vol: .3 });
      await UI.say('JARED', '[the ink runs and doesn\'t come off]', { style: 'thought', dur: 2600 });
      objectiveDone('c6');
      S.name = true;
      UI.toast('ready', 'the altar');
    }
  });

  // the altar, this is where Chapter 6 begins.
  const altarMark = new THREE.Mesh(PLN(1.6, 1.2), new THREE.MeshBasicMaterial({ visible: false }));
  altarMark.rotation.x = -Math.PI / 2;
  altarMark.position.set(C.sanctX + 1.6, C.sanctuaryY + 1.05, 0);
  world.add(altarMark);
  world.interact(altarMark, {
    label: () => S.name ? 'The altar' : 'The altar',
    dist: 2.4,
    use: async () => {
      if (!S.name) {
        await UI.say('JARED', '[not yet]', { style: 'thought', dur: 1400 });
        return;
      }
      if (!S.arrived) {
        await UI.say('VICTOR', 'Not yet. Wait for it. It has to be here to be let go of.', { dur: 3400 });
        return;
      }
    }
  });
}

/* ============================================================
   AND SHE ARRIVES
   ============================================================ */
async function arrival(ctx, church, S) {
  const { world, player } = ctx;
  const C = CHURCH;

  Phone.setClock('3:00');
  scares.setChore(false);
  objectiveDone('do');

  // Every one of the seven lamps goes out at once, west to east, in
  // sequence, taking about four seconds, the player watching the
  // darkness come up the aisle toward them.
  audio.sting('sub');
  for (let i = 0; i < 7; i++) {
    church.refs.lamps[i].set(false);
    audio.sfx('click', { vol: .2 });
    await wait(560);
  }

  await wait(1200);

  // The west doors do not open. The salt holds. She is simply inside.
  const her = ctx.her;
  her.setPos(C.naveX - 8.6, 0, 0);
  her.face(C.sanctX, 0);
  her.shadow.visible = true;
  her.lookAt(ctx.camera);

  // one lamp comes back, badly, so she can be seen. twenty metres away.
  church.refs.lamps[6].set(true);
  church.refs.lamps[6].gutter(0.8);

  audio.setLoopVol('score', 1.0);

  await UI.say('', '[she is standing at the end of the aisle]', { dur: 3400 });
  await wait(1000);
  await convo([
    J('[soaked]'),
    J('[the barn coat. her grandfather\'s coat.]'),
    J('[there is mine silt in her hair]'),
    J('[she is crying]')
  ]);

  // she walks up the aisle. slowly. Victor keeps chanting and does not
  // turn around.
  her.speed = 0.42;
  her.walkTo(C.sanctX - 2.6, 0, () => { });

  if (ctx.buttons) {
    // He does not survive. Do not put a dog in a horror game unless
    // you are prepared for that to be the emotional load-bearing wall.
    setTimeout(async () => {
      const b = ctx.buttons;
      let t = 0;
      const run = world.tick(dt => {
        t += dt;
        b.g.position.x -= dt * 5.0;
        b.wag = 0;
        if (b.g.position.x < her.g.position.x + 1.2) {
          world.untick(run);
          audio.sfx('thud', { vol: .5 });
          b.g.visible = false;
          UI.say('', '[Buttons goes down the aisle at her]', { dur: 2600 });
          setTimeout(() => UI.say('', '[and then he doesn\'t]', { dur: 2600 }), 2800);
        }
      });
    }, 4000);
  }

  await wait(9000);
  her.stop();
  await ctx.goto('ch6');
}

/* ============================================================
   EXTRAS
   ============================================================ */
function setupSacristyMirror(ctx, church) {
  const { world } = ctx;
  // the one time you see Jared, deliberately.
  world.interact(church.refs.shavingMirror.g, {
    label: 'A cracked shaving mirror', dist: 2.0, once: true,
    use: async () => {
      await convo([
        J('[my hands are scraped raw]'),
        J('[the ring\'s gone. I don\'t know when.]'),
        J('[there\'s a burn across my left palm from the lamp]'),
        J('...'),
        J('[and there\'s me]'),
        J('[twenty. tired. somebody\'s son.]')
      ]);
    }
  });
}

function setupVictorCards(ctx, church) {
  const { world } = ctx;
  const rect = church.refs.rectory;
  const cards = new THREE.Mesh(BOX(0.13, 0.03, 0.08), flat(0xf2eee2, { rough: .95 }));
  cards.position.set(rect.pos.x - 2.4, 0.76, rect.pos.z + 0.2);
  world.add(cards);
  world.interact(cards, {
    label: 'Index cards, rubber-banded', dist: 2.0,
    use: () => UI.openReader(VICTOR_CARDS, 'doc-index')
  });

  const book = new THREE.Mesh(BOX(0.11, 0.028, 0.17), flat(0x6b5a3c, { rough: .92 }));
  book.position.set(rect.pos.x + 3.0, 0.24, rect.pos.z - 1.2);
  world.add(book);
  world.interact(book, {
    label: 'The Long Lost Friend', dist: 2.0,
    use: async () => {
      await UI.openReader(HOHMAN, 'doc-hohman');
      setFlag('readHohman');
    }
  });

  // false scare #3: the rectory washer's door swinging.
  const washer = new THREE.Mesh(BOX(0.6, 0.85, 0.6), tiled(MAT.metal, 0.6, 0.85));
  washer.position.set(rect.pos.x - 4.0, 0.42, rect.pos.z + 2.6);
  world.add(washer);
  const wdoor = new THREE.Mesh(CYL(0.2, 0.2, 0.03, 16), flat(0x14171a, { rough: .2 }));
  wdoor.rotation.x = Math.PI / 2;
  wdoor.position.set(rect.pos.x - 4.0, 0.5, rect.pos.z + 2.92);
  world.add(wdoor);
  world.trigger(rect.pos.x - 4.0, rect.pos.z + 4.2, 3, 3, {
    once: true,
    onEnter: () => {
      scares.fire('ch5.dryerdoor', () => {
        let t = 0;
        const tk = world.tick(dt => {
          t += dt;
          wdoor.position.x = rect.pos.x - 4.0 + Math.sin(t * 3) * 0.12 * Math.max(0, 1 - t / 6);
          if (t > 6) world.untick(tk);
        });
        UI.say('JARED', '[the washer door]', { style: 'thought', dur: 2000 });
      });
    }
  });
}

export default ch5;
