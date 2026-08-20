/* ============================================================
   diag.js: a black screen should never be a mystery.

   Records boot/chapter milestones, watches for the specific
   failure of "we think we're playing but nothing is on screen",
   and shows everything on F8.
   ============================================================ */
const TRACE = [];
const ERRORS = [];
let el = null;
let game = null;
let visible = false;

export function trace(msg, data) {
  const line = { t: performance.now(), msg, data };
  TRACE.push(line);
  if (TRACE.length > 80) TRACE.shift();
  if (visible) paint();
  return line;
}

export function noteError(where, e) {
  ERRORS.push({ where, text: String((e && e.stack) || e) });
  if (ERRORS.length > 12) ERRORS.shift();
  show(true);
}

// ---------------------------------------------------------------- perf
// A rolling window of real frame intervals. The panel reports the median
// rather than the mean, because one 400 ms chapter build otherwise hides
// a hundred frames of the thing you are actually trying to see.
const FRAMES = [];
let perf = { fps: 0, ms: 0, worst: 0 };

function pushFrame(dtms) {
  FRAMES.push(dtms);
  if (FRAMES.length > 120) FRAMES.shift();
  if (FRAMES.length < 8) return;
  const s = FRAMES.slice().sort((a, b) => a - b);
  const med = s[s.length >> 1];
  perf = { fps: 1000 / med, ms: med, worst: s[s.length - 1] };
}

/** How many shadow maps the renderer is asked to redraw every frame. */
function shadowCensus(scene) {
  let point = 0, other = 0, dark = 0, passes = 0;
  scene?.traverse(o => {
    if (!o.isLight || !o.castShadow) return;
    if (o.intensity <= 0.001) dark++;
    if (o.isPointLight) { point++; passes += 6; } else { other++; passes += 1; }
  });
  return { point, other, dark, passes };
}

function lightCensus(scene) {
  let n = 0;
  scene?.traverse(o => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight) n++; });
  return n;
}

export function initDiag(g) {
  game = g;
  addEventListener('keydown', e => {
    if (e.code === 'F8') { e.preventDefault(); show(!visible); }
  });

  // Watchdog: if we believe we are playing, the fade is clear, and the
  // renderer has drawn nothing for several seconds, say so out loud.
  let blackFor = 0, last = performance.now();
  const tick = () => {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = (now - last) / 1000; last = now;
    pushFrame(dt * 1000);
    const info = game?.renderer?.renderer?.info?.render;
    const fade = document.getElementById('fade');
    const faded = fade && getComputedStyle(fade).opacity > 0.9;
    const stuck = game?.mode === 'play' && !faded && (!info || info.calls === 0);
    blackFor = stuck ? blackFor + dt : 0;
    if (blackFor > 4 && !visible) {
      trace('WATCHDOG: playing, screen clear, zero draw calls');
      show(true);
    }
    if (visible) paint();
  };
  requestAnimationFrame(tick);
  trace('diag ready, press F8 any time');
}

function show(v) {
  visible = v;
  if (!el) {
    el = document.createElement('div');
    el.id = 'diag';
    el.style.cssText = `position:fixed;top:0;left:0;z-index:9998;max-width:min(640px,52vw);
      max-height:96vh;overflow:auto;background:rgba(6,6,8,.92);color:#cfd3d6;
      font:11px/1.55 'JetBrains Mono',monospace;padding:10px 14px;white-space:pre-wrap;
      border:1px solid #2a2e33;border-radius:0 0 3px 0;pointer-events:none`;
    document.body.appendChild(el);
  }
  el.style.display = v ? 'block' : 'none';
  if (v) paint();
}

function paint() {
  if (!el) return;
  const g = game || {};
  const r = g.renderer?.renderer?.info?.render;
  const mem = g.renderer?.renderer?.info?.memory;
  const sh = shadowCensus(g.scene);
  const gl = g.renderer?.renderer;
  const dpr = gl ? `${gl.getPixelRatio().toFixed(2)} -> ${gl.domElement.width}x${gl.domElement.height} (${(gl.domElement.width * gl.domElement.height / 1e6).toFixed(2)} Mpx)` : '';
  const fade = document.getElementById('fade');
  const cam = g.renderer?.camera;
  const p = g.player;
  const rows = [
    ['mode', g.mode],
    ['chapter', g.chapter ? `${g.chapterIndex + 1} · ${g.chapter.title}` : ''],
    ['paused', g.paused],
    ['fade opacity', fade ? getComputedStyle(fade).opacity : '?'],
    ['fps (median)', `${perf.fps.toFixed(1)}  (${perf.ms.toFixed(2)} ms, worst ${perf.worst.toFixed(1)} ms)`],
    ['device px', dpr],
    ['draw calls', r ? r.calls : 'no renderer'],
    ['triangles', r ? r.triangles : ''],
    ['shadow passes/frame', sh ? `${sh.passes}  (${sh.point} point x6, ${sh.other} other, ${sh.dark} switched off)` : ''],
    ['lights in scene', lightCensus(g.scene)],
    ['gpu textures', mem ? mem.textures : ''],
    ['gpu geometries', mem ? mem.geometries : ''],
    ['programs', g.renderer?.renderer?.info?.programs?.length ?? ''],
    ['scene children', g.scene?.children?.length],
    ['world colliders', g.world?.colliders?.length],
    ['world floors', g.world?.floors?.length],
    ['interactables', g.world?.interactables?.length],
    ['ticks', g.world?.ticks?.length],
    ['camera', cam ? `${cam.position.x.toFixed(1)}, ${cam.position.y.toFixed(1)}, ${cam.position.z.toFixed(1)}` : ''],
    ['player feet', p ? `${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)}, ${p.pos.z.toFixed(1)}` : ''],
    ['surface', p?.surface],
    ['audio', g.audioReady ? 'unlocked' : 'locked (needs a click)']
  ];
  const t0 = TRACE.length ? TRACE[0].t : 0;
  el.textContent =
    'KESSLERTON ROW, diagnostics   [F8 to hide]\n' +
    '─'.repeat(52) + '\n' +
    rows.map(([k, v]) => `${(k + ' ').padEnd(17, '.')} ${v}`).join('\n') +
    '\n\n' + '─'.repeat(52) + '\nTRACE\n' +
    TRACE.slice(-22).map(l => `${((l.t - t0) / 1000).toFixed(2).padStart(7)}s  ${l.msg}` +
      (l.data ? '  ' + JSON.stringify(l.data) : '')).join('\n') +
    (ERRORS.length ? '\n\n' + '─'.repeat(52) + '\nERRORS\n' +
      ERRORS.map(e => `[${e.where}]\n${e.text.split('\n').slice(0, 8).join('\n')}`).join('\n\n') : '');
}

export const diagVisible = () => visible;
