/* ============================================================
   menu.js: warning card, main menu, options, controls.

   The main menu is set in VCR OSD Mono over a static shot of
   Ridge Road, and the streetlights in the background go out one
   by one on a 90-second loop. Nobody explains this. It becomes
   horrifying on the second playthrough. (doc §8)
   ============================================================ */
import { settings, setSetting, DEFAULT_SETTINGS, state, listSaves, hasSave } from './state.js';
import { keyLabel, captureKey, rebind, LAYOUTS, releaseLock } from './input.js';
import { audio } from './audio.js';
import { UI } from './ui.js';

const $ = s => document.querySelector(s);
const el = () => $('#menu');

let ctx = null;
export function initMenu(gameCtx) { ctx = gameCtx; }

function show(html, { opaque = false, wide = false, title = false } = {}) {
  const m = el();
  m.classList.remove('hidden');
  m.classList.toggle('opaque', opaque);
  // `wide` is for the screens that are a document rather than a list of
  // six words, so they can use the width instead of running off the bottom
  m.classList.toggle('wide', wide);
  // `title` is the series frame: full bleed, nothing centred, the world
  // left showing through everywhere it is not being written on
  m.classList.toggle('title', title);
  const s = settings();
  m.classList.toggle('still', title && !!(s.reduceMotion || s.noFlashing));
  m.innerHTML = `<div class="inner">${html}</div>`;
  releaseLock();
  return m.querySelector('.inner');
}
export function hideMenu() { el().classList.add('hidden'); el().innerHTML = ''; }
export const menuOpen = () => !el().classList.contains('hidden');

// ============================================================ WARNING
export function warningCard() {
  return new Promise(res => {
    const inner = show(`
      <div class="eyebrow">WKRB 1290 AM &nbsp;·&nbsp; SCRANTON</div>
      <h1>KESSLERTON<br>ROW</h1>
      <div class="rule"></div>
      <div class="warn">
        <b>Before you start</b>
        <p>KESSLERTON ROW is a horror game. It contains:</p>
        <ul data-label="CONTENT">
          <li>a stalking relationship</li>
          <li>gaslighting by a family member</li>
          <li>the off-screen murder of a young woman</li>
          <li>religious horror</li>
          <li>sudden loud audio</li>
          <li>flashing light</li>
        </ul>
        <p>The harm in this story is done by living people. Everything else in it
        is folklore, and the folklore is real. It is cited in the credits.</p>
        <p class="quiet">Every one of these can be softened in Options, including a
        Reduce Jumpscares setting that keeps every scare's staging and removes the noise.</p>
      </div>
      <ul style="margin-top:30px">
        <li><button id="wc-ok">CONTINUE</button></li>
        <li><button id="wc-opt">OPTIONS</button></li>
      </ul>
      <div class="foot">ASHGROVE, PENNSYLVANIA</div>`, { opaque: true });
    inner.querySelector('#wc-ok').onclick = () => { audio.sfx('click', { vol: .3 }); res(); };
    inner.querySelector('#wc-opt').onclick = () => optionsMenu(() => warningCard().then(res));
  });
}

// ============================================================ MAIN
/* The title screen. The wordmark sits low on the left in two flat
   colours over the sky, the words you can press are a plain list at
   eye height on the right, and the small print is in the corner. No
   plate, no panel, no rule: the plate is Ridge Road at dusk with the
   streetlights going out, and it stays visible. (doc §8) */
export async function mainMenu() {
  const saved = await hasSave('auto');
  const s = state.get();
  const item = (id, label, on = true) =>
    `<li><button id="${id}" ${on ? '' : 'disabled'}>${label}</button></li>`;
  return new Promise(res => {
    const inner = show(`
      <div class="tear"></div>
      <div class="tear b"></div>

      <div class="corner">
        <span class="k">Quality</span>
        <select id="m-qual" aria-label="Quality">
          ${['high', 'medium', 'low'].map(q =>
            `<option value="${q}" ${settings().quality === q ? 'selected' : ''}>${q}</option>`).join('')}
        </select>
      </div>

      <div class="wordmark">
        <p class="over">WKRB 1290 AM &nbsp;·&nbsp; Scranton</p>
        <h1 class="mark">Kesslerton</h1>
        <div class="road"><span class="mark">Row</span><span class="bar"></span></div>
        <p class="ep">Ashgrove, Pennsylvania &nbsp;·&nbsp; 2014</p>
      </div>

      <ul class="mainnav">
        ${item('m-cont', 'Continue', saved)}
        ${item('m-new', 'New Game')}
        ${item('m-ng', 'New Game +', !!s.ending)}
        ${item('m-chap', 'Chapters')}
        ${item('m-opt', 'Options')}
        ${item('m-cred', 'Credits')}
      </ul>

      <div class="footnote">
        <span class="ver">v0.9</span>
        Nights we don't talk about, weeknights after one.<br>
        <span class="addr">Call the station. Somebody is up.</span>
      </div>`, { title: true });
    inner.querySelector('#m-qual').onchange = e => {
      setSetting('quality', e.target.value);
      ctx?.onSettingsChanged?.('quality');
    };
    const pick = (v) => { audio.sfx('click', { vol: .3 }); res(v); };
    inner.querySelector('#m-cont').onclick = () => saved && pick('continue');
    inner.querySelector('#m-new').onclick = () => pick('new');
    inner.querySelector('#m-ng').onclick = () => s.ending && pick('ngplus');
    inner.querySelector('#m-chap').onclick = () => chapterSelect(() => mainMenu().then(res));
    inner.querySelector('#m-opt').onclick = () => optionsMenu(() => mainMenu().then(res));
    inner.querySelector('#m-cred').onclick = () => credits(() => mainMenu().then(res));
  });
}

// ============================================================ PAUSE
export function pauseMenu() {
  return new Promise(res => {
    const inner = show(`
      <h1 style="font-size:30px">PAUSED</h1>
      <ul>
        <li><button id="p-res">RESUME</button></li>
        <li><button id="p-opt">OPTIONS</button></li>
        <li><button id="p-save">SAVE &amp; QUIT TO MENU</button></li>
      </ul>`);
    const done = v => { audio.sfx('click', { vol: .25 }); hideMenu(); res(v); };
    inner.querySelector('#p-res').onclick = () => done('resume');
    inner.querySelector('#p-opt').onclick = () => optionsMenu(() => pauseMenu().then(res));
    inner.querySelector('#p-save').onclick = () => done('quit');
  });
}

// ============================================================ CHAPTERS
export function chapterSelect(back) {
  const CH = ctx?.CHAPTERS || [];
  const inner = show(`<h1 style="font-size:30px">CHAPTERS</h1><ul>` +
    CH.map((c, i) => `<li><button data-i="${i}">${String(i + 1).padStart(2, '0')} · ${c.title.toUpperCase()}<span style="opacity:.4;font-size:13px;display:block;letter-spacing:.06em">${c.date} · ${c.temp}</span></button></li>`).join('') +
    `</ul><div class="back"><button id="c-back">← BACK</button></div>
     <div class="hint">Chapter select starts a fresh run of that chapter. Flags from a full
     playthrough (the truth about his name, the twelve tapes, the medal) are not carried in.</div>`);
  inner.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => {
    hideMenu(); ctx.startChapter(+b.dataset.i, { fromSelect: true });
  });
  inner.querySelector('#c-back').onclick = () => back();
}

// ============================================================ OPTIONS
export function optionsMenu(back) {
  let tab = 'display';
  const draw = () => {
    const s = settings();
    const T = (id, label) => `<button class="tabb ${tab === id ? 'sel' : ''}" data-tab="${id}"
      style="display:inline-block;width:auto;padding:6px 16px;font-size:14px">${label}</button>`;
    let body = '';
    if (tab === 'display') body = `
      ${slider('fov', 'Field of view', s.fov, 70, 110, 1, v => v + '\u00b0')}
      ${slider('sensitivity', 'Look sensitivity', s.sensitivity, 0.2, 3, 0.05, v => v.toFixed(2))}
      ${toggle('invertY', 'Invert vertical look', s.invertY)}
      ${select('quality', 'Quality', s.quality, ['high', 'medium', 'low'])}
      ${slider('dof', 'Depth of field', s.dof ?? 0.85, 0, 1.6, 0.05, v => v <= 0.01 ? 'off' : v.toFixed(2))}
      ${slider('bloom', 'Bloom', s.bloom ?? 1, 0, 2, 0.05, v => v <= 0.01 ? 'off' : v.toFixed(2))}
      ${toggle('headbob', 'Head bob', s.headbob)}
      ${toggle('viewmodel', 'Show hands', s.viewmodel !== false, 'His hands, and his legs when he looks down or runs.')}
      ${toggle('reduceMotion', 'Reduce motion', s.reduceMotion, 'Kills head bob and all camera shake.')}
      ${toggle('noFlashing', 'No flashing light', s.noFlashing)}
      ${toggle('colorblindHighlight', 'Colourblind-safe interaction highlight', s.colorblindHighlight)}`;
    if (tab === 'audio') body = `
      ${slider('masterVol', 'Master', s.masterVol, 0, 1, 0.01, v => Math.round(v * 100) + '%')}
      ${slider('musicVol', 'Music', s.musicVol, 0, 1, 0.01, v => Math.round(v * 100) + '%')}
      ${slider('voiceVol', 'Voice', s.voiceVol, 0, 1, 0.01, v => Math.round(v * 100) + '%')}
      ${toggle('dialogueBlips', 'Dialogue ticks', s.dialogueBlips !== false, 'A soft tick when a line arrives.')}`;
    if (tab === 'access') body = `
      ${toggle('reduceJumpscares', 'Reduce jumpscares', s.reduceJumpscares, 'Removes the audio sting and every physical-contact scare. Keeps all staging.')}
      ${toggle('subtitles', 'Subtitles', s.subtitles)}
      ${toggle('speakerLabels', 'Speaker labels', s.speakerLabels)}
      ${slider('subSize', 'Subtitle size', s.subSize, 24, 48, 8, v => v + 'px')}
      ${slider('subScrim', 'Subtitle background', s.subScrim, 0, 0.95, 0.05, v => Math.round(v * 100) + '%')}
      ${toggle('holdToCrouch', 'Hold to crouch', s.holdToCrouch, 'Off = toggle.')}
      ${toggle('holdToSprint', 'Hold to sprint', s.holdToSprint, 'Off = toggle.')}
      ${toggle('holdToCarry', 'Hold to carry', s.holdToCarry, 'Off = toggle.')}
      <div class="hint">Nothing in this game requires reflexes, so nothing in it should require them.</div>`;
    if (tab === 'keys') body = `
      <div class="cols">${Object.keys(DEFAULT_SETTINGS.keys).map(k => `
        <div class="row"><label>${keyName(k)}</label>
        <button class="keycap" data-key="${k}">${keyLabel(s.keys[k])}</button></div>`).join('')}</div>
      <div class="row" style="border:0;margin-top:14px">
        <label>Preset layouts</label>
        <button class="keycap" data-layout="standard">STANDARD</button>
        <button class="keycap" data-layout="leftHand">LEFT HAND</button>
        <button class="keycap" data-layout="rightHand">RIGHT HAND</button>
      </div>`;

    const inner = show(`<h1 style="font-size:30px">OPTIONS</h1>
      <div style="margin:-14px 0 22px">${T('display', 'DISPLAY')}${T('audio', 'AUDIO')}${T('access', 'ACCESSIBILITY')}${T('keys', 'CONTROLS')}</div>
      ${body}
      <div class="back"><button id="o-back">← BACK</button></div>`);

    inner.querySelectorAll('.tabb').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    inner.querySelectorAll('input[type=range]').forEach(i => {
      i.oninput = () => {
        const v = parseFloat(i.value);
        setSetting(i.dataset.k, v);
        i.parentElement.querySelector('.val').textContent = fmtOf(i.dataset.k)(v);
        ctx?.onSettingsChanged?.();
      };
    });
    inner.querySelectorAll('.sw').forEach(sw => sw.onclick = () => {
      const k = sw.dataset.k;
      setSetting(k, !settings()[k]);
      sw.classList.toggle('on', settings()[k]);
      ctx?.onSettingsChanged?.();
      audio.sfx('click', { vol: .2 });
    });
    inner.querySelectorAll('select').forEach(sel => sel.onchange = () => {
      setSetting(sel.dataset.k, sel.value);
      ctx?.onSettingsChanged?.(sel.dataset.k);
    });
    inner.querySelectorAll('.keycap[data-key]').forEach(b => b.onclick = async () => {
      b.classList.add('listening'); b.textContent = 'PRESS...';
      const code = await captureKey();
      if (code) rebind(b.dataset.key, code);
      draw();
    });
    inner.querySelectorAll('.keycap[data-layout]').forEach(b => b.onclick = () => {
      setSetting('keys', { ...LAYOUTS[b.dataset.layout] });
      draw();
    });
    inner.querySelector('#o-back').onclick = () => back();
  };
  draw();
}

const FMT = {};
function fmtOf(k) { return FMT[k] || (v => v); }
function slider(k, label, val, min, max, step, fmt = v => v) {
  FMT[k] = fmt;
  return `<div class="row"><label>${label}</label>
    <input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${val}">
    <span class="val">${fmt(val)}</span></div>`;
}
function toggle(k, label, val, hint) {
  return `<div class="row"><label>${label}${hint ? `<span style="display:block;font-size:11.5px;opacity:.5;margin-top:2px">${hint}</span>` : ''}</label>
    <div class="sw ${val ? 'on' : ''}" data-k="${k}"></div></div>`;
}
function select(k, label, val, opts) {
  return `<div class="row"><label>${label}</label>
    <select data-k="${k}" style="background:#16181b;color:#ccc;border:1px solid #2a2e33;padding:5px 8px;font-size:13px">
    ${opts.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}
function keyName(k) {
  return ({ forward: 'Move forward', back: 'Move back', left: 'Move left', right: 'Move right',
    interact: 'Interact', flashlight: 'Flashlight', phone: 'Phone', sprint: 'Sprint',
    crouch: 'Crouch', drop: 'Drop / set down', journal: 'Notes' })[k] || k;
}

// ============================================================ CREDITS
export function credits(back) {
  const src = (term, rest) => `<li><b class="term">${term}</b>${rest}</li>`;
  const inner = show(`
    <div class="eyebrow">APPENDIX</div>
    <h1 style="font-size:30px">SOURCES</h1>
    <div class="rule"></div>
    <div class="tag" style="margin-bottom:34px">EVERY RULE IN THIS GAME IS SOMEBODY ELSE'S</div>

    <div class="warn">
      <div class="cols">
        <div>
          <b>Content</b>
          <p>KESSLERTON ROW is a horror game. It contains a stalking relationship,
          gaslighting by a family member, the off-screen murder of a young woman,
          religious horror, sudden loud audio and flashing light. Every one of these
          can be softened in Options, including a Reduce Jumpscares setting that keeps
          every scare's staging and removes the noise.</p>
        </div>
        <div>
          <b>Sources</b>
          <p>Every supernatural rule in this game is lifted from real folklore or a
          real case. Nothing in it was invented to be creepy. What follows is where
          each one comes from.</p>
        </div>
      </div>

      <ul data-label="CITED">
        ${src('The 1928 Hex Murder', `. Rehmeyer's Hollow, York County, Pennsylvania.
          A Pennsylvania Dutch powwow practitioner was killed by three men who
          believed he had hexed them.`)}
        ${src('The Long Lost Friend', `. John George Hohman, 1820. A real book of
          Braucherei charms, still in print. Its charms are quoted verbatim in
          this game.`)}
        ${src('Hex signs', `, real Pennsylvania Dutch barn folk-art. Cheerful
          rosettes. Ashgrove has one that has been painted over.`)}
        ${src('The Centralia mine fire', `, burning underground since 1962; the town
          is condemned. Fictionalised here as the Kesslerton No. 9 seam.`)}
        ${src('The Ninth Hour', `. 3 PM is the hour of Christ's death in Catholic
          tradition. Its inversion at 3 AM is the Devil's Hour.`)}
        ${src('Slavic and Eastern-European Catholic mourning', `, covering mirrors,
          stopping the clocks, opening a window to let the soul out, watching the
          body for three nights. Recca's family did none of this.`)}
        ${src('Threshold consent', `, near-universal: the harmful dead cannot enter
          uninvited, and cannot take a soul that does not go willingly.`)}
        ${src('The name', `, a thing's true name binds it. Burning a written name
          releases what is bound to it.`)}
      </ul>

      <p class="quiet">Ashgrove, the Vaskos, the Kowals, the Hales, the Ninth and
      Kesslerton No. 9 are fiction. The 1928 murder happened to a real man named
      Nelson Rehmeyer.</p>
    </div>

    <div class="back"><button id="cr-back">&#8592; BACK</button></div>`,
    { opaque: true, wide: true });
  inner.querySelector('#cr-back').onclick = () => back();
}

// ============================================================ ENDING CARD
export function endingCard(title, letterLine, onDone) {
  const inner = show(`
    <h1 style="font-size:34px">${title}</h1>
    <div class="warn" style="max-width:60ch;margin-top:26px">
      <p style="font-family:var(--vcr);letter-spacing:.06em;font-size:15px;line-height:2;color:#c8ccd0">
        ${letterLine}</p>
      <p style="margin-top:30px;font-size:12px;opacity:.45">read by the host over the credits,
      Nights We Don't Talk About, WKRB 1290 AM</p>
    </div>
    <ul style="margin-top:34px"><li><button id="e-menu">MAIN MENU</button></li></ul>`, { opaque: true });
  inner.querySelector('#e-menu').onclick = () => onDone();
}
