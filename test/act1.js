/* ============================================================
   Chapter One, played.

   smoke.js builds a chapter and stops nine hundred milliseconds
   in, which is enough to catch a world that will not construct
   and nothing else. Chapter One is most of an hour of doing
   things in an order, and the things gate each other: the car
   has to be driven in, the tank filled and paid for before the
   Volvo will leave the forecourt; the box has to be carried up
   before the room unpacks; the meeting will not run the long
   version without quarters; the middle of the scene waits on a
   machine and on a towel; and the night waits on a bed, a
   radiator and the bed again. Every one of those is a promise
   somebody has to settle, and a chapter that deadlocks in the
   middle looks exactly like a chapter that is waiting for the
   player.

   So this plays it. Dialogue is answered instantly and every
   choice takes the first option; the accelerator is held down
   whenever there is a road; everything else is the real
   interactables, the real triggers and the real state.
   ============================================================ */
import './dom.js';
import * as THREE from 'three';

const { World } = await import('../src/world/world.js');
const { UI, wait } = await import('../src/core/ui.js');
const { Phone } = await import('../src/core/phone.js');
const { Input } = await import('../src/core/input.js');
const { ch1 } = await import('../src/chapters/ch1.js');
const { state } = await import('../src/core/state.js');

UI.init();
Phone.init(null);

// ---- the game, with the talking taken out of it -----------------------
const spoken = [];
UI.say = (who, text) => { spoken.push([who, text]); return Promise.resolve(); };
UI.choose = (opts) => { chosen.push(opts[0].text); return Promise.resolve(opts[0].value ?? 0); };
UI.toast = (t, s2) => { toasts.push(t); };
UI.fadeOut = () => Promise.resolve();
UI.fadeIn = () => Promise.resolve();
UI.titleCard = () => Promise.resolve();
UI.letterbox = () => {};
const chosen = [], toasts = [];

const fails = [];
const check = (name, cond, detail = '') => {
  console.log(cond ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ', ' + detail : ''}`);
  if (!cond) fails.push(name);
};

// ---- a player that can carry something and sit in a car --------------
const scene = new THREE.Scene();
const world = new World(scene);
const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 300);
const player = {
  pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, eye: 1.66,
  canMove: true, canLook: true, frozen: false, carrying: null, shake: 0, headTilt: 0,
  hasFlashlight: false, flashOn: false, world, forceLookAt: null,
  teleport(x, z, y = 0, yaw = 0) { this.pos.set(x, y, z); this.yaw = yaw; },
  setFlashlight() {}, updateCamera() {},
  pickUp(obj) { if (this.carrying) return false; this.carrying = { obj }; return true; },
  drop() { const c = this.carrying; this.carrying = null; return c ? c.obj : null; }
};
let finished = false;
const ctx = {
  game: { world }, scene, world, player, camera,
  renderer: {
    camera, scene, setGrade() {}, setFocus() {}, applySettings() {},
    final: { uniforms: { exposure: { value: 1 } } },
    renderer: { getRenderTarget: () => null, setRenderTarget() {}, render() {}, readRenderTargetPixels() {} }
  },
  next: async () => { finished = true; }, goto: async () => {}, ending: async () => {},
  fromSelect: false, resume: false, wantLock: false, refs: {}, S: {}
};

/** One frame of the real loop: ticks, then triggers where the player is. */
function frame() {
  world.update(1 / 60, ctx);
  world.checkTriggers(player.pos, ctx);
}
/** Let the scene breathe: real time has to pass, chapters wait() on it. */
async function pump(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { frame(); await wait(8); }
}
/** Run frames as fast as the runtime allows until `pred`, or give up. */
async function until(pred, maxMs, label) {
  const end = Date.now() + maxMs;
  while (!pred() && Date.now() < end) { frame(); await wait(0); }
  check(label, pred());
}
/** Every interactable that currently resolves to this label. */
const byLabel = (want) => world.interactables.filter(r => {
  if (!r.enabled || (r.once && r.used)) return false;
  const l = typeof r.label === 'function' ? r.label(ctx) : r.label;
  return l === want;
});
/** Press E on the first thing offering that label, and wait for it. */
async function use(want, { required = true } = {}) {
  const [rec] = byLabel(want);
  if (!rec) {
    if (required) fails.push(`nothing offers "${want}"`);
    console.log(`  ✗ nothing offers "${want}"`);
    return false;
  }
  if (rec.once) rec.used = true;
  const r = rec.use(ctx);
  if (r instanceof Promise) await r;
  await pump(40);
  return true;
}
/** Stand somewhere, and let the triggers there fire. */
async function go(x, z, y = 0, ms = 120) {
  player.pos.set(x, y, z);
  await pump(ms);
}
/** His foot on the accelerator, or off it. */
const gas = (on) => { Input.enabled = true; if (on) Input.down.add('KeyW'); else Input.down.delete('KeyW'); };

console.log('chapter one, played through\n');
const built = ch1.build(ctx);
await pump(400);
const S = ctx.S;
const R = ctx.refs;

// ---------------------------------------------------------- the drive
check('the chapter opens on the road', S.phase === 'drive');
await pump(300);
check('the car does not move until he drives it', player.pos.x > 500 && S.phase === 'drive');
gas(true);
await until(() => S.phase === 'fuel', 90000, 'he drove twelve miles to the Fuel & Go');
gas(false);
check('the deer crossed', S.deer);
check('somebody was at the treeline', S.sawFigure);
await pump(300);

// ---------------------------------------------------------- the Fuel & Go
const F = { x: 900, z: 0 };
await go(F.x + 2.4, F.z + 10.6);
await use('Pump gas');
check('twelve on two', S.gas);
await go(F.x - 0.7, F.z + 4.2);
await use('The plaque');
check('he read the nine names', S.sawPlaque);
await go(F.x + 1.4, F.z + 2.7, 0, 200);
await until(() => S.paid, 30000, 'Marta made his change');
await go(F.x + 2.9, F.z + 3.0);
await use('The monitor');
check('and he looked at the monitor', S.sawMonitor);
await go(F.x + 0.5, F.z + 11.2);
await use('Drive');
await pump(300);
check('back on the road', S.phase === 'drivein');
gas(true);
await until(() => S.phase === 'street', 60000, 'he drove in to Ridge Road');
gas(false);
await pump(400);

// ---------------------------------------------------------- the street
await until(() => byLabel('Pick it up').length >= 1, 6000, 'the last box is waiting behind the car');
await go(4.6, 9.2);
await use('Pick it up');
check('the box is in his hands', !!player.carrying);
await go(6.45, 4.0, 0);
await go(6.45, 3.175, 3.0, 260);       // the landing, where the landlady is
check('the landlady stopped him on the landing', S.metOstrowski);
await go(1.9, 3.175, 3.0);
await go(-0.9, 1.15, 3.0);
await use('Put it down here');
check('put down, hands empty', !player.carrying && S.trips === 1);

// ---------------------------------------------------------- the room
await pump(200);
check('the boxes open now, and not before', S.boxRecs.length === 4 && S.boxRecs.every(r => r.enabled));
for (const rec of S.boxRecs) { rec.used = true; await rec.use(ctx); await pump(30); }
check('every box is unpacked', S.boxes === 4, `boxes=${S.boxes}`);
check('the kitchen box had the flashlight in it', player.hasFlashlight);
check('and the detergent', !!S.detergent);
await go(-0.24, 1.6, 3.0);
await use('Pick up the mirror');
await go(-1.9, 1.6, 3.0);
await use('Hang it here');
check('the mirror is on the wall', S.mirrorHung);
await until(() => S.unpacked && state.get().notes.some(n => n.id === 'quarters'), 6000, 'the room is unpacked and he needs quarters');
await go(4.85, -0.85, 3.0);
await use('Force the window');
check('the window went up', S.window);

// ---------------------------------------------------------- downstairs
await go(0, 2.5, 0);
await go(-0.2, 0.6, 0, 400);
check('walking in with no quarters gets the short version', S.premet && !S.met);

// ---------------------------------------------------------- the town
await go(21 + 2.0, 1.0, 0);
await use('Change for a five');
check('Dolores made change', S.quarters > 0, `quarters=${S.quarters}`);
await use('Corkboard');
check('he read the nine flyers and thought nothing of it', S.sawFlyers);
await go(-19, 2.4, 0, 260);
check('the pawnbroker said something', spoken.some(([w]) => w === 'THE PAWNBROKER'));

// ---------------------------------------------------------- the meeting
await go(0, 4.0, 0);
go(-0.2, 0.6, 0, 60);                    // deliberately not awaited: the scene owns the thread

const BANK = R.laundry.refs.dryers[0].doors;
const BAD = BANK.length - 6;
let didBad = false, didGood = false, tookTowel = false, slept = 0, talkedToIt = false;
// The scene is driving. It stops for the player five times: two machines,
// a towel, a bed, a radiator, and the bed again. This is the player.
const deadline = Date.now() + 120000;
while (!finished && Date.now() < deadline) {
  frame();
  await wait(8);
  if (S.feeding && !S.loaded) {
    const rec = (!didBad ? BANK[BAD] : BANK[0]).win.userData.interact;
    if (rec && !didBad) { didBad = true; await rec.use(ctx); }
    else if (rec && !didGood) { didGood = true; await rec.use(ctx); }
  }
  const [towel] = byLabel('Take it');
  if (towel && !tookTowel) { tookTowel = true; towel.used = true; await towel.use(ctx); }
  if (S.phase === 'night' && !S.radiatorDone && !talkedToIt) {
    const [rad] = byLabel('Talk to it');
    if (rad) { talkedToIt = true; await rad.use(ctx); }
  }
  const [bed] = byLabel('Sleep');
  if (bed && S.bedRec.enabled && (slept === 0 && S.phase === 'evening' || slept === 1 && S.radiatorDone)) {
    slept++;
    await bed.use(ctx);
  }
}

check('the meeting ran the long version', S.met);
check('the third machine ate his quarters', S.ateIt);
check('and then a machine took them', S.loaded);
check('he took the towel out of her hands', tookTowel);
check('she wrote her number down', toasts.includes('laundry ticket'));
check('and he said come in', state.get().flags?.invitedHerIn === true);
check('she came in, and she went', S.sheCameIn);
check('he went to bed', slept >= 1);
check('the radiator knocked and he talked to it', S.radiatorDone && talkedToIt);
check('and he went back to bed', slept === 2);
check('the chapter reached the next one', finished);

await Promise.race([built, wait(200)]);
console.log(`\n${spoken.length} lines, ${chosen.length} choices`);
console.log(fails.length ? `${fails.length} FAILURE(S)` : 'CHAPTER ONE PLAYS');
fails.forEach(f => console.log(`  ✗ ${f}`));
if (fails.length) Deno.exit(1);
