/* Does a line of dialogue reach the body that is saying it? */
import './dom.js';
const { World } = await import('../src/world/world.js');
const { makeRecca, performLine, CAST } = await import('../src/world/props.js');
const w = new World({ add(){}, remove(){} });
const r = makeRecca(w, { coat: false });
r.setBusy('fold');
const snap = () => ({
  jaw: r.p.jaw.rotation.x.toFixed(4),
  mouth: r.p.mouthHole.visible,
  headX: r.p.headG.rotation.x.toFixed(3),
  headY: r.p.headG.rotation.y.toFixed(3),
  armX: r.p.arms[0].sh.rotation.x.toFixed(3)
});
const run = (n) => { for (let i = 0; i < n; i++) w.update(1 / 60, {}); };
console.log('registered:', [...CAST.keys()].join(', '));
run(30); console.log('idle folding      ', JSON.stringify(snap()));
performLine('RECCA', 'You\'re standing in front of the good one.', 2600);
run(20);  console.log('mid-line          ', JSON.stringify(snap()));
performLine('RECCA', '[laughing] Twice!', 1800);
run(20);  console.log('laughing          ', JSON.stringify(snap()));
performLine('RECCA', '[she stops folding, one second, then keeps going]', 1500);
run(10);  console.log('stopped folding   ', JSON.stringify(snap()), 'hold=', r.busyHold.toFixed(2));
performLine('RECCA', '[she nods, slowly] Okay.', 1400);
run(14);  console.log('nodding           ', JSON.stringify(snap()));
performLine('JARED', 'thought line', 1200, { style: 'thought' });
performLine('NOBODY', 'unregistered speaker', 1200);
run(200); console.log('settled           ', JSON.stringify(snap()), 'speakT=', r.speakT.toFixed(2));
r.dispose();
console.log('after dispose:', CAST.size, 'in cast');
