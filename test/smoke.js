/* ============================================================
   Headless smoke test.
   Builds every location and runs every chapter's build() with a
   faked renderer, so world-construction bugs surface without a
   browser. Reports thrown errors with a stack.
   ============================================================ */
import './dom.js';
import * as THREE from 'three';

const errs = [];
const warnOrig = console.warn;
console.warn = (...a) => { /* quiet three's material warnings */ };

async function main() {
  const { World } = await import('../src/world/world.js');
  const mat = await import('../src/world/mat.js');
  const props = await import('../src/world/props.js');
  const home = await import('../src/world/loc_home.js');
  const street = await import('../src/world/loc_street.js');
  const vasko = await import('../src/world/loc_vasko.js');
  const church = await import('../src/world/loc_church.js');
  const town = await import('../src/world/loc_town.js');
  const sl = await import('../src/world/streetlights.js');
  const { CHAPTERS } = await import('../src/chapters/index.js');
  const menuscene = await import('../src/chapters/menuscene.js');
  const { TAPES } = await import('../src/content/tapes.js');
  const docs = await import('../src/content/docs.js');
  const { scares, MANIFEST } = await import('../src/core/scares.js');
  const { UI } = await import('../src/core/ui.js');
  const { Phone } = await import('../src/core/phone.js');
  UI.init();          // binds to the DOM stub so chapters can call it
  Phone.init(null);

  // ---------------------------------------------------------- materials
  step('materials', () => {
    for (const k of Object.keys(mat.MAT)) {
      const m = mat.MAT[k];
      if (!m) throw new Error(`MAT.${k} is ${m}`);
    }
    for (const k of Object.keys(mat.T)) mat.T[k]();
  });

  // ---------------------------------------------------------- locations
  // Every floor names a footstep surface. If it names one the audio
  // engine has never heard of, `step()` silently falls back to wood and
  // you get an indoor footstep outdoors, with no error anywhere.
  const { AudioEngine } = await import('../src/core/audio.js');
  const surfacesUsed = new Map();          // surface -> first place it was seen
  const noteSurfaces = (where, w) =>
    w.floors.forEach(f => { if (f.surface && !surfacesUsed.has(f.surface)) surfacesUsed.set(f.surface, where); });

  const build = (name, fn) => step(name, () => {
    const scene = new THREE.Scene();
    const w = new World(scene);
    const h = fn(w);
    noteSurfaces(name, w);
    const counts = { colliders: w.colliders.length, floors: w.floors.length, interact: w.interactables.length };
    let meshes = 0, tris = 0;
    w.root.traverse(o => {
      if (o.isMesh) {
        meshes++;
        const g = o.geometry;
        if (g?.index) tris += g.index.count / 3;
        else if (g?.attributes?.position) tris += g.attributes.position.count / 3;
      }
    });
    // exercise the tick loop the way the game does
    for (let i = 0; i < 3; i++) w.update(1 / 60, { world: w });
    // exercise floor + collision queries across the space
    for (let i = 0; i < 200; i++) {
      w.floorAt((Math.random() - .5) * 60, (Math.random() - .5) * 60, 0);
    }
    report(name, { ...counts, meshes, tris: Math.round(tris) });
    return h;
  });

  build('loc: apartment', w => home.buildApartment(w, { y: 3 }));
  build('loc: laundromat', w => home.buildLaundromat(w, {}));
  build('loc: ridge block', w => street.buildRidgeBlock(w, {}));
  build('loc: vasko (lived)', w => vasko.buildVaskoHouse(w, { state: 'lived' }));
  build('loc: vasko (cold)', w => vasko.buildVaskoHouse(w, { state: 'cold' }));
  build('loc: church', w => church.buildChurch(w, {}));
  build('loc: diner', w => town.buildDiner(w, {}));
  build('loc: pawn', w => town.buildPawn(w, {}));
  build('loc: fuel & go', w => town.buildFuelGo(w, {}));
  build('loc: cemetery', w => town.buildCemetery(w, {}));
  build('loc: library', w => town.buildLibrary(w, {}));
  build('loc: mine', w => town.buildMine(w, {}));
  build('loc: streetlights', w => sl.buildStreetlights(w, {}));
  // the menu plate is a built scene like any other, so it gets built like one
  build('menu: ridge road at dusk', w => menuscene.buildRidgeRoadMenuScene(w, fakeRenderer()));

  // ---------------------------------------------------------- characters
  step('characters', () => {
    const w = new World(new THREE.Scene());
    const r = props.makeRecca(w);
    const d = props.makeReccaDrowned(w);
    const v = props.makeVictor(w);
    const m = props.makeMarta(w);
    const b = props.makeButtons(w, 0, 0, 0);
    d.wrongShadow();
    r.walkTo(4, 4);
    r.lookAt(new THREE.Vector3(1, 1.6, 1));
    for (let i = 0; i < 240; i++) w.update(1 / 60, {});
    if (!r.g.position) throw new Error('recca has no transform');
  });

  // ---------------------------------------------------------- scares
  step('scare manifest', () => {
    const a = scares.audit();
    if (!a.ok) throw new Error(`manifest: ${JSON.stringify(a)} — expected 19 total / 3 false / 3 contact`);
    report('scare manifest', a);
    const ids = MANIFEST.map(m => m.id);
    if (new Set(ids).size !== ids.length) throw new Error('duplicate scare id');
  });

  // ---------------------------------------------------------- content
  step('content', () => {
    if (TAPES.length !== 12) throw new Error(`tapes: ${TAPES.length}, expected 12`);
    if (new Set(TAPES.map(t => t.id)).size !== 12) throw new Error('duplicate tape id');
    if (docs.FLYERS.length !== 9) throw new Error(`flyers: ${docs.FLYERS.length}, expected 9`);
    if (docs.NINE.length !== 9) throw new Error(`the nine: ${docs.NINE.length}`);
    TAPES.forEach(t => { if (!t.html || t.html.length < 200) throw new Error(`tape ${t.id} too short`); });
    report('content', { tapes: TAPES.length, flyers: docs.FLYERS.length, nine: docs.NINE.length });
  });

  // ---------------------------------------------------------- chapters
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    await stepAsync(`chapter ${i + 1}: ${ch.title}`, async () => {
      const ctx = makeCtx(World, THREE);
      // build() awaits dialogue; run it and give it a moment, then stop.
      const p = ch.build(ctx).catch(e => { throw e; });
      await Promise.race([p, new Promise(r => setTimeout(r, 900))]);
      // pump the world the way the game loop does
      for (let k = 0; k < 120; k++) {
        ctx.world.update(1 / 60, ctx);
        ctx.world.checkTriggers(ctx.player.pos, ctx);
      }
      noteSurfaces(`chapter ${i + 1}`, ctx.world);
      report(`chapter ${i + 1}`, {
        colliders: ctx.world.colliders.length,
        floors: ctx.world.floors.length,
        interactables: ctx.world.interactables.length,
        triggers: ctx.world.triggers.length,
        ticks: ctx.world.ticks.length
      });
      // every interactable must have a resolvable label
      ctx.world.interactables.forEach(rec => {
        const l = typeof rec.label === 'function' ? rec.label(ctx) : rec.label;
        if (typeof l !== 'string' || !l.length) throw new Error('interactable with empty label');
        if (typeof rec.use !== 'function') throw new Error(`interactable "${l}" has no use()`);
      });
    });
  }

  // ---------------------------------------------------------- surfaces
  step('footstep surfaces', () => {
    const known = Object.keys(AudioEngine.SURFACES);
    const unknown = [...surfacesUsed].filter(([sfc]) => !known.includes(sfc));
    if (unknown.length)
      throw new Error('floors name surfaces the audio engine does not have: ' +
        unknown.map(([sfc, where]) => `"${sfc}" (${where})`).join(', '));
    const unused = known.filter(k => !surfacesUsed.has(k));
    report('footstep surfaces', {
      defined: known.length,
      used: surfacesUsed.size,
      unused: unused.length ? unused.join('/') : 'none'
    });
  });

  // ---------------------------------------------------------- house rules
  await stepAsync('house rules', async () => {
    const offenders = { emdash: [], sideBorder: [], gradient: [], glitchType: [], barePanel: [] };
    const walk = async (dir) => {
      for await (const e of Deno.readDir(dir)) {
        const path = `${dir}/${e.name}`;
        if (e.isDirectory) { await walk(path); continue; }
        if (!/\.(js|css|html)$/.test(e.name)) continue;
        const text = await Deno.readTextFile(path);
        text.split('\n').forEach((line, i) => {
          // RULE: no em dashes anywhere in the game.
          if (line.includes('\u2014')) offenders.emdash.push(`${path}:${i + 1}`);
          // RULE: no single-edge coloured accent rules. Selection is carried
          // by a full enclosure, a wash of colour, or a leading marker.
          if (/border-(left|right)(-color)?\s*:/.test(line) &&
              !/transparent|none|0\b/.test(line)) offenders.sideBorder.push(`${path}:${i + 1}`);
          // RULE: no gradients. Every fill is a flat colour, an inset
          // shadow falling away from an edge, or a drawn tile.
          if (/\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/.test(line))
            offenders.gradient.push(`${path}:${i + 1}`);
        });
        // RULE: no glitch type. A text-shadow layer may not combine a
        // horizontal offset with a chromatic colour, which is the
        // red/cyan channel split and nothing else.
        chromaticSplits(text).forEach(off =>
          offenders.glitchType.push(`${path}:${lineOf(text, off)}`));
        // RULE: no bare panel. An enclosed, filled box may not hold
        // plain body text; it must carry a marker or a type role.
        if (path.endsWith('.css')) barePanels(text).forEach(([sel, off]) =>
          offenders.barePanel.push(`${path}:${lineOf(text, off)} (${sel})`));
      }
    };
    await walk('src');
    await walk('styles');
    // index.html only; vendor/ is third-party and out of scope
    const html = await Deno.readTextFile('index.html');
    html.split('\n').forEach((line, i) => {
      if (line.includes('\u2014')) offenders.emdash.push(`index.html:${i + 1}`);
    });
    const msgs = [];
    if (offenders.emdash.length)
      msgs.push(`em dash used in ${offenders.emdash.length} place(s): ${offenders.emdash.slice(0, 6).join(', ')}`);
    if (offenders.sideBorder.length)
      msgs.push(`single-edge accent border in ${offenders.sideBorder.length} place(s): ${offenders.sideBorder.slice(0, 6).join(', ')}`);
    if (offenders.gradient.length)
      msgs.push(`gradient in ${offenders.gradient.length} place(s): ${offenders.gradient.slice(0, 6).join(', ')}`);
    if (offenders.glitchType.length)
      msgs.push(`glitch type in ${offenders.glitchType.length} place(s): ${offenders.glitchType.slice(0, 6).join(', ')}`);
    if (offenders.barePanel.length)
      msgs.push(`bare panel in ${offenders.barePanel.length} place(s): ${offenders.barePanel.slice(0, 6).join(', ')}`);
    if (msgs.length) throw new Error(msgs.join(' | '));
    report('house rules', {
      'em dashes': 0, 'side-border accents': 0,
      gradients: 0, 'glitch type': 0, 'bare panels': 0
    });
  });

  // ---------------------------------------------------------- report
  console.log('\n' + '='.repeat(64));
  if (errs.length) {
    console.log(`FAILED — ${errs.length} error(s)\n`);
    errs.forEach(([name, e]) => {
      console.log(`  ✗ ${name}`);
      console.log('    ' + String(e.stack || e).split('\n').slice(0, 6).join('\n    '));
      console.log('');
    });
    process.exit(1);
  } else {
    console.log('ALL SMOKE TESTS PASSED');
  }
}

// ----------------------------------------------------------- house rule helpers
const lineOf = (text, off) => text.slice(0, off).split('\n').length;

// blank out comments but keep every offset, so reported lines stay true
const uncomment = (text) => text.replace(/\/\*[\s\S]*?\*\//g,
  c => c.replace(/[^\n]/g, ' '));

// split a comma list at depth zero, so rgba(...) stays in one piece
function layersOf(value) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// how far a colour is from neutral, 0 for any grey, black or white
function chroma(layer) {
  let r, g, b;
  const fn = layer.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (fn) { [r, g, b] = fn.slice(1, 4).map(Number); }
  else {
    const hex = layer.match(/#([0-9a-fA-F]{3,8})\b/);
    if (!hex) return 0;
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map(c => c + c).join('');
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  }
  return Math.max(r, g, b) - Math.min(r, g, b);
}

// a text-shadow layer that is both offset sideways and coloured is a
// channel split. A centred coloured glow is a bloom and is fine.
function chromaticSplits(src) {
  const text = uncomment(src);
  const hits = [];
  const re = /text-shadow\s*:([^;}]*)/g;
  let m;
  while ((m = re.exec(text))) {
    for (const layer of layersOf(m[1])) {
      const x = layer.trim().match(/^(-?[\d.]+)(px|em|rem|vw|vh)?/);
      if (!x || Number(x[1]) === 0) continue;
      if (chroma(layer) > 30) { hits.push(m.index); break; }
    }
  }
  return hits;
}

const VISIBLE = v => !/^\s*(none|0|transparent)\b/.test(v) && !/\btransparent\s*$/.test(v);
const TREATED = body =>
  /font-family\s*:/.test(body) || /letter-spacing\s*:/.test(body) ||
  /text-transform\s*:/.test(body) || /content\s*:\s*["'][^"']/.test(body);

// A panel is an enclosed, filled box: a visible border plus a fill. It
// must not be left as a rectangle of default text, so the panel or
// something inside it has to declare a marker or a type role.
function barePanels(src) {
  const text = uncomment(src);
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text)))
    // point at the selector itself, not at the brace that ended the block before it
    blocks.push([m[1].trim(), m[2], m.index + m[1].length - m[1].trimStart().length]);
  const bad = [];
  for (const [selList, body, off] of blocks) {
    if (selList.startsWith('@') || /^\d|^(from|to)$/.test(selList)) continue;
    const border = body.match(/(?:^|[;{\s])border\s*:([^;}]*)/);
    const fill = body.match(/(?:^|[;{\s])background(?:-color)?\s*:([^;}]*)/);
    if (!border || !fill) continue;
    if (!VISIBLE(border[1]) || !VISIBLE(fill[1])) continue;
    if (/border-radius\s*:\s*50%/.test(body)) continue;   // a disc is not a box
    for (const sel of selList.split(',').map(x => x.trim())) {
      if (!sel || /::(before|after)/.test(sel)) continue;
      if (TREATED(body)) continue;
      const inside = blocks.some(([s2, b2]) => s2.split(',').some(x =>
        x.trim() !== sel && x.trim().startsWith(sel) && TREATED(b2)));
      if (!inside) bad.push([sel, off]);
    }
  }
  return bad;
}

// the menu scene grades the plate and pulls focus, so it needs those knobs
function fakeRenderer() {
  return {
    camera: new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 300),
    setFocus() {},
    final: {
      uniforms: {
        exposure: { value: 1 }, sat: { value: 1 }, vignette: { value: 1 },
        grain: { value: .06 }, dofOn: { value: 1 }, aperture: { value: 1 }
      }
    }
  };
}

// ---------------------------------------------------------------- harness
function makeCtx(World, THREE) {
  const scene = new THREE.Scene();
  const world = new World(scene);
  const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 300);
  const player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, eye: 1.72,
    canMove: true, canLook: true, frozen: false, carrying: null, shake: 0, headTilt: 0,
    hasFlashlight: false, flashOn: false, world,
    teleport(x, z, y = 0) { this.pos.set(x, y, z); },
    setFlashlight() {}, updateCamera() {}, pickUp() { return true; }, drop() { return null; }
  };
  const uniforms = {
    exposure: { value: 1 }, sat: { value: 1 }, vignette: { value: .4 }, focus: { value: 3 },
    grain: { value: .06 }, ca: { value: .001 }, contrast: { value: 1 }
  };
  const renderer = {
    camera, scene, setGrade() {}, setFocus() {}, applySettings() {},
    final: { uniforms },
    renderer: { getRenderTarget: () => null, setRenderTarget() {}, render() {}, readRenderTargetPixels() {} }
  };
  return {
    game: { world }, scene, world, player, camera, renderer,
    next: async () => {}, goto: async () => {}, ending: async () => {},
    fromSelect: false, resume: false, wantLock: false,
    refs: {}, S: {}
  };
}

function step(name, fn) { try { fn(); ok(name); } catch (e) { errs.push([name, e]); bad(name, e); } }
async function stepAsync(name, fn) { try { await fn(); ok(name); } catch (e) { errs.push([name, e]); bad(name, e); } }
const ok = (n) => console.log(`  ✓ ${n}`);
const bad = (n, e) => console.log(`  ✗ ${n} — ${e.message}`);
const report = (n, o) => console.log(`      ${Object.entries(o).map(([k, v]) => `${k}=${v}`).join('  ')}`);

main().catch(e => { console.error('HARNESS FAILURE\n', e); process.exit(2); });
