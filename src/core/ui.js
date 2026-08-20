/* ============================================================
   ui.js: subtitles, prompts, title cards, the document reader,
   fades, and the letterbox.

   Subtitles are on by default and never scale below 18px. Every
   speaker gets a label unless the player turns labels off.
   ============================================================ */
import { settings } from './state.js';
import { audio } from './audio.js';

const $ = s => document.querySelector(s);

export const UI = {
  el: {},
  _subTimer: null,
  _subResolve: null,

  init() {
    this.el = {
      hud: $('#hud'), crosshair: $('#crosshair'), prompt: $('#prompt'),
      subs: $('#subs'), subline: $('#subline'),
      who: $('#subline .who'), what: $('#subline .what'),
      choices: $('#choices'), choicesWrap: $('#choices .wrap'),
      card: $('#card'), cardNum: $('#card .num'), cardName: $('#card .name'), cardMeta: $('#card .meta'),
      fade: $('#fade'), vhs: $('#vhs'), letterbox: $('#letterbox'),
      reader: $('#reader'), sheet: $('#reader .sheet'), readerClose: $('#reader .close'),
      toast: $('#toast'), carrybar: $('#carrybar'), stamina: $('#stamina'),
      menu: $('#menu'), phone: $('#phone')
    };
    this.el.readerClose.addEventListener('click', () => this.closeReader());
    this.applySettings();
  },

  applySettings() {
    const s = settings();
    document.documentElement.style.setProperty('--sub-size', Math.max(18, s.subSize) + 'px');
    document.documentElement.style.setProperty('--sub-scrim', s.subScrim);
    document.documentElement.style.setProperty('--hl', s.colorblindHighlight ? '#4FC3F7' : 'rgba(255,255,255,.85)');
  },

  // ---------------------------------------------------------- HUD
  showHUD(v = true) { this.el.hud.classList.toggle('hidden', !v); },
  setCrosshair(hot, color) {
    this.el.crosshair.classList.toggle('hot', !!hot);
    if (color) this.el.crosshair.style.setProperty('--hl', '#' + color.toString(16).padStart(6, '0'));
  },
  setPrompt(text, key) {
    const p = this.el.prompt;
    if (!text) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden');
    p.innerHTML = key ? `<kbd>${key}</kbd>${text}` : text;
  },
  setStamina(v) {
    const e = this.el.stamina;
    e.classList.toggle('hidden', v >= 0.999);
    e.firstElementChild.style.transform = `scaleX(${v})`;
  },

  // ---------------------------------------------------------- subtitles
  /**
   * say(who, text, {dur, style})
   * style: '' | 'thought' | 'radio' | 'phone'
   * Returns a promise that resolves when the line is done.
   */
  say(who, text, { dur = null, style = '' } = {}) {
    return new Promise(res => {
      const s = settings();
      // A superseded line must still settle its promise. Dropping it
      // deadlocks whatever sequence was awaiting it, which shows up as
      // a scene that simply stops, so always release the previous one.
      this._releaseSub();
      if (!s.subtitles && who) {
        const d0 = dur ?? this._durOf(text);
        this.onLine?.(who, text, d0, { style });
        this._subTimer = setTimeout(res, d0); this._subResolve = res; return;
      }
      const l = this.el.subline;
      l.className = style;
      l.classList.remove('hidden');
      this.el.who.textContent = (s.speakerLabels && who) ? who : '';
      this.el.what.textContent = text;
      const d = dur ?? this._durOf(text);
      // a line arriving is an event, not just text appearing
      this.onLine?.(who, text, d, { style });
      audio.voiceTick(who, style);
      audio.duckMusic(Math.min(4, d / 1000), who ? 0.42 : 0.6);
      this._subResolve = res;
      this._subTimer = setTimeout(() => { l.classList.add('hidden'); this._releaseSub(); }, d);
    });
  },
  _releaseSub() {
    clearTimeout(this._subTimer);
    this._subTimer = null;
    const r = this._subResolve;
    this._subResolve = null;
    if (r) r();
  },
  _durOf(t) { return Math.max(1200, Math.min(9000, 620 + t.length * 52)); },
  clearSub() { this._releaseSub(); this.el.subline.classList.add('hidden'); },

  // ---------------------------------------------------------- choices
  /**
   * choose([{text, hint, value}]) -> Promise<value>
   * No timer, ever. Options never grey out.
   */
  choose(options) {
    return new Promise(res => {
      const w = this.el.choicesWrap;
      w.innerHTML = '';
      this.el.choices.classList.remove('hidden');
      let sel = 0;
      const btns = options.map((o, i) => {
        const b = document.createElement('button');
        b.innerHTML = o.text + (o.hint ? `<span class="hintless">${o.hint}</span>` : '');
        b.addEventListener('mouseenter', () => { sel = i; paint(); });
        b.addEventListener('click', () => done(o.value ?? i));
        w.appendChild(b);
        return b;
      });
      const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
      paint();
      const key = (e) => {
        if (e.code === 'ArrowDown' || e.code === 'KeyS') { sel = (sel + 1) % btns.length; paint(); e.preventDefault(); }
        if (e.code === 'ArrowUp' || e.code === 'KeyW') { sel = (sel + btns.length - 1) % btns.length; paint(); e.preventDefault(); }
        if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { done(options[sel].value ?? sel); e.preventDefault(); }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= btns.length) done(options[n - 1].value ?? (n - 1));
      };
      const done = (v) => {
        removeEventListener('keydown', key, true);
        this.el.choices.classList.add('hidden');
        w.innerHTML = '';
        audio.sfx('click', { vol: .3 });
        res(v);
      };
      addEventListener('keydown', key, true);
    });
  },

  // ---------------------------------------------------------- title card
  /** VHS chapter card: number, name, date, temperature. */
  async titleCard(num, name, date, temp, { hold = 3400 } = {}) {
    const c = this.el.card;
    this.el.cardNum.textContent = num;
    this.el.cardName.textContent = name;
    this.el.cardMeta.textContent = `${date}   ·   ${temp}`;
    this.vhs(true);
    c.classList.remove('hidden');
    await wait(hold);
    c.classList.add('hidden');
    this.vhs(false);
  },

  vhs(on) { this.el.vhs.classList.toggle('hidden', !on); },
  letterbox(on) { this.el.letterbox.classList.toggle('hidden', !on); },

  // ---------------------------------------------------------- fades
  fadeOut(ms = 900, white = false) {
    this.el.fade.style.transitionDuration = ms + 'ms';
    this.el.fade.classList.toggle('white', white);
    this.el.fade.classList.remove('clear');
    return wait(ms);
  },
  fadeIn(ms = 1200) {
    this.el.fade.style.transitionDuration = ms + 'ms';
    this.el.fade.classList.add('clear');
    return wait(ms);
  },
  async blink(ms = 260) { await this.fadeOut(ms); await wait(60); await this.fadeIn(ms); },

  // ---------------------------------------------------------- reader
  /** Full-screen document. `skin` maps to the .doc-* CSS classes. */
  openReader(html, skin = 'doc-plain') {
    return new Promise(res => {
      const r = this.el.reader;
      this.el.sheet.className = 'sheet ' + skin;
      this.el.sheet.innerHTML = html;
      r.classList.remove('hidden');
      if (skin === 'doc-tape') this.vhs(true);
      const key = e => { if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); close(); } };
      const close = () => {
        removeEventListener('keydown', key, true);
        this.el.readerClose.removeEventListener('click', close);
        r.classList.add('hidden'); this.vhs(false);
        this._readerClose = null;
        res();
      };
      this._readerClose = close;
      addEventListener('keydown', key, true);
      this.el.readerClose.addEventListener('click', close);
    });
  },
  closeReader() { this._readerClose?.(); },
  get readerOpen() { return !this.el.reader.classList.contains('hidden'); },

  // ---------------------------------------------------------- toast
  toast(text, sub = '') {
    const d = document.createElement('div');
    d.className = 't';
    d.innerHTML = text + (sub ? `<span class="k">${sub}</span>` : '');
    this.el.toast.appendChild(d);
    setTimeout(() => d.remove(), 4700);
  }
};

export const wait = (ms) => new Promise(r => setTimeout(r, ms));
