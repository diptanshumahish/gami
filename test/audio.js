/* ============================================================
   Headless audio test.
   Drives the whole synthesis engine against a strict Web Audio
   stub: every footstep surface, every door kind × action, every
   sfx kind, every ambient loop, and the full score, including a
   scene change between each of the eight pieces.

   The stub does not make sound. It refuses NaN, negative times,
   exponential ramps to zero, connect(undefined), bad node types
   and the other things that throw in a real browser but fail
   silently in a mock.
   ============================================================ */
import './dom.js';
import { install, issues, modulationTargets } from './webaudio_stub.js';

install(globalThis);

const fails = [];
function step(name, fn) {
  const before = issues().length;
  try { fn(); } catch (e) { fails.push(`${name}: ${e && e.stack || e}`); console.log(`  ✗ ${name}`); return; }
  const found = issues().slice(before);
  if (found.length) {
    fails.push(`${name}:\n      ${[...new Set(found)].join('\n      ')}`);
    console.log(`  ✗ ${name}  (${found.length} spec violations)`);
  } else console.log(`  ✓ ${name}`);
}

const { audio } = await import('../src/core/audio.js');
const { AudioEngine } = await import('../src/core/audio.js');
const { PIECE_IDS, SCENES, hz } = await import('../src/core/music.js');
const { STATION_IDS } = await import('../src/core/radio.js');

// pick real stations from the registry, so removing one from the dial
// cannot silently turn these into tests of the fallback
const MUSICAL = STATION_IDS.filter(id => id !== 'static' && id !== 'talk');

/** Push the clock forward and let every scheduler fill its window. */
function run(seconds, stepSize = 0.2) {
  for (let s = 0; s < seconds; s += stepSize) {
    audio.ctx.currentTime += stepSize;
    audio.music?._schedule();
    audio.radios.forEach(r => r._schedule());
  }
}

await audio.unlock();
if (!audio.ready) { console.log('engine did not become ready'); Deno.exit(1); }
console.log('  ✓ unlock');

// the score must not be gated any more
step('music is not gated', () => {
  if (!audio.musicUnlocked) throw new Error('musicUnlocked is false at boot');
  if (audio.bus.music.gain.value <= 0) throw new Error(`music bus is muted at boot (${audio.bus.music.gain.value})`);
});

step('pitch table', () => {
  const cases = [['A4', 440], ['C4', 261.63], ['A1', 55], ['Eb1', 38.89], ['C#6', 1108.73], ['Bb6', 1864.66], ['G#3', 207.65], ['F#2', 92.5]];
  for (const [n, want] of cases) {
    const got = hz(n);
    if (Math.abs(got - want) / want > 0.001) throw new Error(`hz(${n}) = ${got}, want ~${want}`);
  }
});

step('footsteps: 9 surfaces × walk/run/crouch × 40', () => {
  for (const s of Object.keys(AudioEngine.SURFACES)) {
    for (let i = 0; i < 40; i++) {
      audio.step(s, { vol: 0.32 });
      audio.step(s, { vol: 0.32, run: true });
      audio.step(s, { vol: 0.32, crouch: true });
    }
  }
  audio.step('nosuchsurface');            // must fall back, not explode
  audio.parallelStep(3, 0, -4, true);
  audio.parallelStep(3, 0, -4, false);
});

step('doors: 7 kinds × 5 actions × 30', () => {
  const kinds = ['wood', 'heavy', 'metal', 'screen', 'cabinet', 'car', 'fridge'];
  const actions = ['open', 'close', 'latch', 'try', 'knock'];
  for (const k of kinds) for (const a of actions) for (let i = 0; i < 30; i++) {
    audio.door(k, a, { vol: 0.6 });
    audio.door(k, a, { vol: 0.6, pos: [2, 1, -3] });
  }
});

step('doors: unknown kind falls back', () => audio.door('portcullis', 'open'));

step('sfx: every kind × 30', () => {
  const kinds = ['thud','click','latch','doorclose','creak','match','sizzle','paper','pour','salt',
    'glass','metal','coin','dialtone','ring','shutter','text','ringtone','vibrate','wood','splash','ignite','breath','engine',
    'pickup','setdown','cloth','fabric','book','mug','switch','drawer','chair','somethingunknown'];
  for (const k of kinds) for (let i = 0; i < 30; i++) {
    audio.sfx(k, { vol: 0.5 });
    audio.sfx(k, { vol: 0.5, pos: [1, 1, 1], rate: 0.9 });
  }
});

step('bell / stings / voice ticks', () => {
  for (let i = 0; i < 10; i++) { audio.bell(1); audio.bell(0.4, [0, 8, -20]); }
  ['hit', 'riser', 'sub'].forEach(k => audio.sting(k));
  ['JARED', 'RECCA', 'VICTOR', 'HOST', ''].forEach(w => {
    audio.voiceTick(w); audio.voiceTick(w, 'thought'); audio.voiceTick(w, 'radio');
  });
});

step('ambient loops', () => {
  ['comfort', 'background', 'wrong', 'pumps'].forEach(m => audio.dryers(m, [0, 1, 0]));
  audio.roomTone(0.06, 500);
  audio.fluorescent([1, 2, 3]);
  audio.wind(0.5);
  audio.stoveFire();
  audio.waterDrip([0, 2, 0], 3000);
  audio.carInterior();
  audio.radioStatic(0.14);
  audio.killAllLoops(0.2);
});

// ---------------------------------------------------------------- the score
step('score: start', () => { audio.unlockMusic({ instant: true }); if (!audio.music.playing) throw new Error('music did not start'); });

step('score: 8 pieces, 60 s each, on-the-bar changes', () => {
  for (const id of PIECE_IDS) {
    audio.music.setScene(id);
    run(60);
    if (audio.music.pieceBar < 2) throw new Error(`${id}: scheduler produced ${audio.music.pieceBar} bars in 60 s`);
  }
});

step('score: hard scene changes resolve', () => {
  for (const scene of Object.keys(SCENES)) {
    audio.music.setScene(scene, { immediate: true });
    run(6);
    if (audio.music.pending) throw new Error(`immediate change to "${scene}" never completed`);
  }
});

step('score: unknown scene falls back to the theme', () => {
  audio.music.setScene('a scene that does not exist', { immediate: true });
  run(6);
  if (audio.music.piece.title !== 'Old Doll') throw new Error(`fell back to "${audio.music.piece.title}"`);
});

step('score: intensity sweep', () => {
  for (let i = 0; i <= 10; i++) { audio.setMusicIntensity(i / 10); run(8); }
  audio.setMusicIntensity(0.2);
});

step('score: ducking under dialogue', () => {
  for (let i = 0; i < 40; i++) { audio.duckMusic(1.6, 0.45); run(0.6); }
});

step('score: the drone on top of it', () => { audio.score(1.0); run(10); audio.killLoop('score', 0.5); });

step('score: a long unattended run (20 min)', () => run(20 * 60, 0.5));

step('score: stop and restart', () => {
  audio.stopMusic(1);
  if (audio.music.playing) throw new Error('still playing after stop');
  audio.unlockMusic({ instant: true });
  run(20);
  if (!audio.music.playing) throw new Error('did not restart');
});

/* ------------------------------------------------------------------
   The radio. Diegetic, so it is positioned, band-limited and lands
   on the ambience bus, not the music bus.
   ------------------------------------------------------------------ */
step('radio: the dial is real', () => {
  if (MUSICAL.length < 2) throw new Error(`only ${MUSICAL.length} musical station(s) on the dial`);
  for (const id of MUSICAL) {
    const info = audio.stations.find(x => x.id === id);
    if (!info?.call || !info?.name) throw new Error(`station "${id}" has no call sign or title`);
  }
});

step('radio: every station plays', () => {
  const r = audio.radio('test', { pos: [2, 1.4, -3], station: 'standards', signal: 0.9 });
  if (!r) throw new Error('audio.radio() returned nothing');
  for (const id of STATION_IDS) {
    r.tune(id, { sweep: false });
    if (r.stationId !== id) throw new Error(`tune("${id}") landed on "${r.stationId}"`);
    const before = r.bar;
    run(45);
    // the two non-musical stations have no bars to schedule, by design
    const musical = r.station.bars.length > 0;
    if (musical && r.bar - before < 2)
      throw new Error(`${id}: ${r.bar - before} bars in 45 s`);
  }
  audio.killRadio('test');
});

step('radio: knobs, signal and dropouts', () => {
  const r = audio.radio('test', { pos: [0, 1.4, 0], station: MUSICAL[0] });
  for (let i = 0; i <= 10; i++) { r.setSignal(i / 10); r.setVolume(i / 10); run(3); }
  r.setOccluded(true); run(2);
  r.setOccluded(false); run(2);
  r.setPosition([9, 0.9, -14]); run(2);
  r.power(false); run(3);
  r.power(true); run(10);
  r._scheduleDropouts();
  run(20);
  audio.killRadio('test');
  if (audio.getRadio('test')) throw new Error('killRadio left the set in the registry');
});

step('radio: tuning sweeps land on the new station', () => {
  const [from, to] = MUSICAL;
  const r = audio.radio('test', { station: from });
  if (r.stationId !== from) throw new Error(`asked for "${from}", got "${r.stationId}"`);
  r.tune(to);                              // with the sweep
  audio.ctx.currentTime += 0.3; run(2);
  if (r.stationId !== to) throw new Error(`swept to "${r.stationId}" instead of "${to}"`);
  if (!r.nowPlaying || r.nowPlaying === 'static')
    throw new Error(`nowPlaying is "${r.nowPlaying}"`);
  if (r.tune('not a station')) throw new Error('accepted an unknown station');
  audio.killRadio('test');
});

step('radio: several sets at once, and teardown', () => {
  // other things (the dryers) may hold occluders of their own, so
  // measure the delta rather than the absolute count
  const occBefore = (audio._occluders || []).length;
  audio.radio('diner', { pos: [10, 1.4, 0], station: MUSICAL[0] });
  audio.radio('car', { pos: [0, 1.2, 2], station: 'talk', signal: 0.4 });
  audio.radio('upstairs', { pos: [0, 1.6, 0], station: MUSICAL[1], floorOcclusion: true });
  if (audio.radios.size !== 3) throw new Error(`${audio.radios.size} radios registered, expected 3`);
  run(40);
  audio.killRadios();
  if (audio.radios.size) throw new Error('killRadios left sets behind');
  // and the floor-occluded one must have unregistered itself
  const leaked = (audio._occluders || []).length - occBefore;
  if (leaked) throw new Error(`${leaked} radio occluder(s) left after teardown`);
});

/* ------------------------------------------------------------------
   The dryers are downstairs and must stay downstairs.

   `startDryers` puts the machines 1.4 m under the floor of the flat.
   Distance rolloff alone left them bright and present up in the room,
   so they read as being in the room with you rather than under it.
   ------------------------------------------------------------------ */
step('dryers are occluded through the floor', () => {
  audio.killAllLoops(0.05);
  audio.ctx.currentTime += 1;
  audio.dryers('comfort', [0, 1.6, 0]);      // as loc_home.js places them
  const occ = audio._dryerOcc;
  if (!occ) throw new Error('the dryer loop exposed no occlusion handle');

  // a minimal camera: setListener only reads position and quaternion
  class V3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    applyQuaternion() { return this; }
  }
  let eye = 0;
  const cam = {
    position: new V3(), quaternion: {},
    getWorldPosition(v) { v.x = 0; v.y = eye; v.z = 0; return v; }
  };
  const at = (y) => { eye = y; audio.setListener(cam); audio.ctx.currentTime += 0.5; };
  const cutoff = () => occ.lp.frequency.events.at(-1)?.[1] ?? occ.lp.frequency.value;
  const level = () => occ.g.gain.events.at(-1)?.[1] ?? occ.g.gain.value;

  at(1.65);                                   // standing in the laundromat
  if (occ.state !== 'same') throw new Error(`on the machines' floor, state is "${occ.state}"`);
  if (cutoff() < 8000) throw new Error(`downstairs the sound is filtered to ${cutoff()} Hz`);

  at(4.65);                                   // standing in the flat
  if (occ.state !== 'through') throw new Error(`one storey up, state is "${occ.state}"`);
  if (cutoff() > 400) throw new Error(`upstairs the cutoff is ${cutoff()} Hz, the buckles come through`);
  if (level() > 0.5) throw new Error(`upstairs the level is ${level()}, barely attenuated`);

  // hysteresis: partway down the stair must not flip it back and forth
  const flips = [];
  for (const y of [4.65, 3.2, 4.4, 3.4, 4.65, 3.1, 4.2]) { at(y); flips.push(occ.state); }
  if (new Set(flips).size !== 1 || flips[0] !== 'through')
    throw new Error(`mid-stair chatter: ${flips.join(' ')}`);

  at(1.65);
  if (occ.state !== 'same') throw new Error('never came back when the player went down');
  audio.killAllLoops(0.05);
});

/* ------------------------------------------------------------------
   No slow amplitude modulation, anywhere.

   A bed that repeats on a period the ear can hold stops being a room
   and becomes an effect. This has bitten twice: a 0.06 Hz bandpass
   sweep on `wind` (under the menu and all six chapters) and a 0.86 Hz
   gate on the dryer tumble (~59% depth, un-muted bus, four chapters).
   Both read as an inescapable whoosh-whoosh.

   Pitch and time modulation is allowed, that is the instrument's tape
   wow and the reverb's drift, but it is held to depths well below
   what anyone can hear as a sweep.
   ------------------------------------------------------------------ */
step('no audible slow modulation', () => {
  // spin up one of every station first, so the radio's voices are
  // inside the sample too
  STATION_IDS.forEach((id, i) => audio.radio('mod' + i, { pos: [i, 1.4, 0], station: id }));
  run(30);
  const LIMIT = { gain: 0.01, delayTime: 0.001, frequency: 1.0, detune: 12, pan: 0.02 };
  const bad = [];
  for (const osc of audio.ctx.slowOscillators) {
    const rate = osc.frequency.value;
    for (const { param, depth } of modulationTargets(osc)) {
      const kind = param.split('.').pop();
      const limit = LIMIT[kind];
      if (limit === undefined) { bad.push(`${rate} Hz -> ${param} (unrecognised param)`); continue; }
      if (Math.abs(depth) > limit)
        bad.push(`${rate.toFixed(3)} Hz -> ${param}, depth ${depth} exceeds ${limit}`);
    }
  }
  audio.killRadios();
  if (bad.length) throw new Error(`${audio.ctx.slowOscillators.length} slow oscillators, offending routes:\n      ` + bad.join('\n      '));
});

step('settings still apply', () => {
  audio.applySettings();
  if (audio.bus.music.gain.value <= 0) throw new Error('applySettings muted the score');
});

console.log('\n================================================================');
if (fails.length) {
  console.log(`AUDIO TESTS FAILED (${fails.length})\n`);
  fails.forEach(f => console.log('  · ' + f));
  Deno.exit(1);
}
console.log(`ALL AUDIO TESTS PASSED   (${audio.ctx.nodeCount} nodes built)`);
// the ambient loops keep rescheduling themselves with setTimeout, so
// the process will never fall off the event loop on its own
Deno.exit(0);
