/* ============================================================
   audio.js: everything is synthesised. No sample files ship
   with this build, so every sound in Ashgrove is built out of
   noise, filters and envelopes at runtime.

   Design rules honoured here:
     · The score plays from the first frame. There is no silent
       stretch and no unlock gate; `music.setScene()` chooses
       which of the written pieces is running. (See music.js.)
     · Everything that is not a scare goes through the warmth
       chain: the glare is pulled out around 3 kHz, the top is
       rolled off, the low-mids are lifted, and the whole thing
       is softly saturated. Doors, footsteps, cups and switches
       are meant to be pleasant to make.
     · The dryer loop is the leitmotif and has its own bus so it
       can be moved between "comfort" and "horror" EQ.
     · 9 footstep surfaces × 6 variations, pitch ±4%.
     · Her voice runs through a convolver of the room she is NOT
       in. That bus is `sheBus`.
   ============================================================ */
import { settings } from './state.js';
import { Music, SCENES } from './music.js';
import { Radio, STATION_IDS, stationInfo } from './radio.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.nodes = {};
    this.loops = new Map();
    this.radios = new Map();
    // there is no "first music in the game" any more; the score is
    // running from the first gesture. kept as a flag so old callers
    // (unlockMusic) stay harmless.
    this.musicUnlocked = true;
  }

  /**
   * @param {object} opts
   *   context  render into a context that already exists instead of
   *            making a live one. This is how tools/render-audio.js
   *            bounces the score to disk through an
   *            OfflineAudioContext: the whole engine, the real buses
   *            and the real compressor, just not in real time.
   */
  async unlock({ context = null } = {}) {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = context || new AC({ latencyHint: 'interactive' });
    ctx.listener.upX && (ctx.listener.upX.value = 0, ctx.listener.upY.value = 1, ctx.listener.upZ.value = 0);

    const master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 3.2;
    comp.attack.value = 0.006; comp.release.value = 0.22;
    master.connect(comp).connect(ctx.destination);

    const mk = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
    this.bus = {
      master,
      amb: mk(0.85),
      sfx: mk(0.9),
      voice: mk(1.0),
      music: mk(0.0),        // raised to musicVol by applySettings, below
      dryer: mk(0.0),
      she: mk(1.0),
      ui: mk(0.55)
    };

    // ---- the warmth chain -------------------------------------------
    // Every physical sound in the game runs through this before it
    // reaches the master. It is the difference between "a door" and
    // "a door in a house somebody lives in": the 3 kHz glare that
    // makes synthesised transients sound like plastic is pulled out,
    // the top is rolled off the way a warm room rolls it off, the
    // low-mids are lifted so wood has body, and a gentle waveshaper
    // rounds the peaks instead of letting them click.
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowshelf'; warm.frequency.value = 260; warm.gain.value = 3.2;
    const deglare = ctx.createBiquadFilter();
    deglare.type = 'peaking'; deglare.frequency.value = 3100; deglare.Q.value = 0.85; deglare.gain.value = -3.0;
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf'; air.frequency.value = 7600; air.gain.value = -4.5;
    const round = ctx.createWaveShaper();
    round.curve = this._softCurve();
    round.oversample = '2x';
    this.bus.sfx.disconnect();
    this.bus.sfx.connect(warm).connect(deglare).connect(air).connect(round).connect(master);
    this.warmth = { warm, deglare, air, round };

    // convolvers: church (long stone), room (small plaster), tunnel (mine)
    this.ir = {
      church: this._impulse(ctx, 3.6, 2.4, 0.55),
      room: this._impulse(ctx, 0.42, 3.6, 0.2),
      tunnel: this._impulse(ctx, 2.1, 1.4, 0.85),
      tower: this._impulse(ctx, 1.5, 2.0, 0.4)
    };
    this.conv = ctx.createConvolver();
    this.conv.buffer = this.ir.room;
    this.convSend = ctx.createGain(); this.convSend.gain.value = 0.22;
    this.convSend.connect(this.conv).connect(this.bus.master);

    // her bus -> its own convolver (the room she is not in)
    this.sheConv = ctx.createConvolver();
    this.sheConv.buffer = this.ir.church;
    this.bus.she.disconnect();
    const sheDry = ctx.createGain(); sheDry.gain.value = 0.55;
    const sheWet = ctx.createGain(); sheWet.gain.value = 0.7;
    this.bus.she.connect(sheDry).connect(master);
    this.bus.she.connect(sheWet).connect(this.sheConv).connect(master);

    this.noise = { white: this._noise(ctx, 2, 'white'), pink: this._noise(ctx, 3, 'pink'), brown: this._noise(ctx, 4, 'brown') };
    this.ready = true;
    this.music = new Music(this);
    this.applySettings();
  }

  applySettings() {
    if (!this.ready) return;
    const s = settings();
    this.bus.master.gain.value = s.masterVol;
    this.bus.voice.gain.value = s.voiceVol;
    if (this.musicUnlocked) this.bus.music.gain.value = s.musicVol;
    if (this.bus.ui) this.bus.ui.gain.value = s.dialogueBlips === false ? 0 : 0.55;
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  // ------------------------------------------------------------ buffers
  _noise(ctx, secs, kind) {
    const n = ctx.sampleRate * secs;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    if (kind === 'white') { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    else if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    } else { // pink (Voss-ish)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return b;
  }

  _impulse(ctx, secs, decay, damp) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * secs));
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const env = Math.pow(1 - i / n, decay);
        const w = (Math.random() * 2 - 1) * env;
        lp += (w - lp) * (1 - damp * 0.9);
        d[i] = lp;
      }
      // early reflections
      for (let k = 1; k < 7; k++) {
        const off = Math.floor(ctx.sampleRate * 0.008 * k * (1 + c * 0.13));
        if (off < n) d[off] += (0.45 / k) * (Math.random() > 0.5 ? 1 : -1);
      }
    }
    return b;
  }

  /**
   * A very gentle saturation curve. Not distortion: at normal
   * levels it is inaudible, and on a transient it rounds the peak
   * off instead of letting it turn into a click. This is most of
   * why the doors and the footsteps stopped sounding like a
   * synthesiser.
   */
  _softCurve(drive = 1.35, n = 2048) {
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    return c;
  }

  // ------------------------------------------------------------ primitives
  src(buffer, { loop = false, rate = 1, dest } = {}) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.loop = loop; s.playbackRate.value = rate;
    if (dest) s.connect(dest);
    return s;
  }
  gain(v = 1, dest) { const g = this.ctx.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; }
  filter(type, f, q = 1, dest) {
    const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
    if (dest) b.connect(dest); return b;
  }
  osc(type, f, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; if (dest) o.connect(dest); return o; }

  panner(x, y, z, { ref = 2.5, max = 45, roll = 1.1 } = {}) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = roll;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
    else p.setPosition(x, y, z);
    return p;
  }

  /** Update the WebAudio listener from the camera each frame. */
  setListener(cam) {
    if (!this.ready) return;
    const l = this.ctx.listener;
    const p = cam.getWorldPosition(new (cam.position.constructor)());
    const f = new (cam.position.constructor)(0, 0, -1).applyQuaternion(cam.quaternion);
    const u = new (cam.position.constructor)(0, 1, 0).applyQuaternion(cam.quaternion);
    if (l.positionX) {
      const t = this.t + 0.02;
      l.positionX.linearRampToValueAtTime(p.x, t);
      l.positionY.linearRampToValueAtTime(p.y, t);
      l.positionZ.linearRampToValueAtTime(p.z, t);
      l.forwardX.linearRampToValueAtTime(f.x, t); l.forwardY.linearRampToValueAtTime(f.y, t); l.forwardZ.linearRampToValueAtTime(f.z, t);
      l.upX.linearRampToValueAtTime(u.x, t); l.upY.linearRampToValueAtTime(u.y, t); l.upZ.linearRampToValueAtTime(u.z, t);
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z); }

    this._updateOcclusion(p.y);
  }

  /**
   * The only occlusion in the game, and it only has one customer: the
   * Wash-Rite dryers, which sit 1.4 m under the floor of the flat.
   * A storey of joists and floorboards is a steep lowpass and about
   * 9 dB, so from upstairs you get the rumble and none of the buckles.
   *
   * Two states, not a continuous function: the player is either on
   * the machines' floor or they are not, and the hysteresis band
   * stops the filter chattering on the stairs.
   */
  _updateOcclusion(listenerY) {
    const list = this._occluders;
    if (!list || !list.length) return;
    const t = this.t;
    for (const o of list) {
      const dy = listenerY - o.y;
      // 1.9 m to become occluded, 1.4 m to come back: a stair's worth of gap
      const want = o.state === 'through'
        ? (dy < 1.4 ? 'same' : 'through')
        : (dy > 1.9 ? 'through' : 'same');
      if (want === o.state) continue;
      o.state = want;
      if (want === 'through') {
        o.lp.frequency.setTargetAtTime(o.cutoff ?? 200, t, 0.35);
        o.g.gain.setTargetAtTime(o.amount ?? 0.36, t, 0.35);
      } else {
        o.lp.frequency.setTargetAtTime(14000, t, 0.25);
        o.g.gain.setTargetAtTime(1, t, 0.25);
      }
    }
  }

  /** Register a source that a floor should get between you and. */
  addFloorOcclusion(entry) {
    (this._occluders = this._occluders || []).push(entry);
    return entry;
  }
  removeFloorOcclusion(entry) {
    if (!this._occluders) return;
    const i = this._occluders.indexOf(entry);
    if (i >= 0) this._occluders.splice(i, 1);
  }

  // ------------------------------------------------------------ loops
  /** Registered ambient loop with a fade handle. */
  loop(id, builder, { vol = 1, fade = 1.2, bus = 'amb' } = {}) {
    if (this.loops.has(id)) return this.loops.get(id);
    if (!this.ready) return null;
    const out = this.gain(0, this.bus[bus] || this.bus.amb);
    const stop = builder(out) || (() => {});
    out.gain.setTargetAtTime(vol, this.t, fade / 3);
    const handle = { out, stop, vol, id };
    this.loops.set(id, handle);
    return handle;
  }
  setLoopVol(id, v, time = 0.8) {
    const h = this.loops.get(id); if (!h || !this.ready) return;
    h.out.gain.setTargetAtTime(v, this.t, time / 3);
  }
  killLoop(id, fade = 1.0) {
    const h = this.loops.get(id); if (!h) return;
    h.out.gain.setTargetAtTime(0, this.t, fade / 3);
    this.loops.delete(id);
    setTimeout(() => { try { h.stop(); h.out.disconnect(); } catch {} }, fade * 1000 + 200);
  }
  killAllLoops(fade = 0.8) { [...this.loops.keys()].forEach(k => this.killLoop(k, fade)); }

  // ============================================================ THE DRYERS
  /**
   * The leitmotif. mode: 'comfort' | 'background' | 'wrong' | 'pumps'
   *
   * The drum tumble used to be low-passed brown noise gated by a
   * 0.86 Hz sine at roughly 59% depth. That is a whoosh once a
   * second, forever, on an un-muted bus, in the Wash-Rite, Chapter
   * Two, Chapter Four and Chapter Six. It is the same mistake as the
   * old wind patch and it is worse here because the period is fast
   * enough to count.
   *
   * There is no periodic modulation left in this loop. What makes it
   * a laundromat and not a hum is the irregular part: buckle clanks
   * on a random interval, which the ear cannot lock onto. The tumble
   * is now a steady low rumble and the four modes differ by filter
   * and by level, which is what they were really doing anyway.
   */
  dryers(mode = 'comfort', pos = null) {
    if (!this.ready) return null;
    const existing = this.loops.get('dryers');
    if (existing) { existing.setMode?.(mode); return existing; }

    let setMode = () => {};
    const h = this.loop('dryers', out => {
      const panned = pos
        ? (() => { const p = this.panner(pos[0], pos[1], pos[2], { ref: 3, max: 26 }); p.connect(out); return p; })()
        : out;

      // ---- the floor between you and them ----
      // A dryer running one storey down is not a quiet dryer, it is a
      // different sound: the rumble comes up through the joists and
      // everything above a couple of hundred hertz stays downstairs.
      // Distance rolloff alone cannot do this, which is why the
      // machines used to follow you up into the flat. `setListener`
      // drives these two nodes from the listener's height each frame.
      const muffle = this.filter('lowpass', 14000, 0.5);
      const occG = this.gain(1);
      muffle.connect(occG).connect(panned);
      const sink = muffle;
      if (pos) this._dryerOcc = this.addFloorOcclusion({ y: pos[1], lp: muffle, g: occG, state: null });

      // drum tumble: a steady low rumble, and nothing else
      const n = this.src(this.noise.brown, { loop: true, rate: 0.9 });
      const lp = this.filter('lowpass', 340, 0.9);
      const tumbleG = this.gain(0.10);
      n.connect(lp).connect(tumbleG).connect(sink);

      // motor
      const m1 = this.osc('sawtooth', 57.5), m2 = this.osc('sine', 115);
      const mF = this.filter('lowpass', 220, 3.0);
      const mG = this.gain(0.055);
      m1.connect(mF); m2.connect(mF); mF.connect(mG).connect(sink);

      // buckle clanks, irregular, the thing that makes it a laundromat
      let alive = true;
      const clank = () => {
        if (!alive) return;
        const t = this.t;
        const c = this.src(this.noise.white);
        const bp = this.filter('bandpass', 1200 + Math.random() * 900, 7);
        const g = this.gain(0.0001);
        c.connect(bp).connect(g).connect(sink);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.10 + Math.random() * 0.07, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        c.start(t); c.stop(t + 0.2);
        setTimeout(clank, 900 + Math.random() * 2600);
      };
      setTimeout(clank, 700);

      n.start(); m1.start(); m2.start();

      // [ lowpass, tumble level, motor level, glide seconds ]
      setMode = (mm) => {
        const t2 = this.t;
        const P = {
          comfort:    [340, 0.100, 0.055, 0.5],
          background: [210, 0.065, 0.030, 0.5],
          wrong:      [520, 0.130, 0.085, 2.0],
          pumps:      [150, 0.165, 0.160, 6.0]
        }[mm];
        if (!P) return;
        lp.frequency.setTargetAtTime(P[0], t2, P[3] / 3);
        tumbleG.gain.setTargetAtTime(P[1], t2, P[3] / 3);
        mG.gain.setTargetAtTime(P[2], t2, P[3] / 3);
      };
      setMode(mode);

      return () => {
        alive = false;
        this.removeFloorOcclusion(this._dryerOcc); this._dryerOcc = null;
        try { n.stop(); m1.stop(); m2.stop(); } catch {}
      };
    }, { vol: 0.8, bus: 'dryer', fade: 2.0 });

    if (h) {
      h.setMode = setMode;
      this.bus.dryer.gain.setTargetAtTime(1, this.t, 0.6);
    }
    return h;
  }

  // ============================================================ AMBIENCES
  roomTone(level = 0.06, cut = 500) {
    return this.loop('roomtone', out => {
      const n = this.src(this.noise.pink, { loop: true, rate: 0.6 });
      const f = this.filter('lowpass', cut, 0.7);
      const g = this.gain(level);
      n.connect(f).connect(g).connect(out); n.start();
      return () => { try { n.stop(); } catch {} };
    }, { vol: 1 });
  }

  fluorescent(pos) {
    return this.loop('fluoro', out => {
      const sink = pos ? (() => { const p = this.panner(...pos, { ref: 2, max: 14 }); p.connect(out); return p; })() : out;
      const a = this.osc('sawtooth', 120), b = this.osc('sine', 60);
      const f = this.filter('bandpass', 1500, 4.5);
      const g = this.gain(0.028);
      a.connect(f); b.connect(f); f.connect(g).connect(sink);
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const t = this.t;
        g.gain.setValueAtTime(0.028, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.03);
        g.gain.linearRampToValueAtTime(0.028, t + 0.09);
        setTimeout(tick, 2400 + Math.random() * 7000);
      };
      setTimeout(tick, 1500);
      a.start(); b.start();
      return () => { alive = false; try { a.stop(); b.stop(); } catch {} };
    }, { vol: 1 });
  }

  /**
   * The outdoor bed. Named `wind` because every chapter calls it
   * that, but there is deliberately no wind in it any more.
   *
   * It used to be a bandpass swept +/-260 Hz by a 0.06 Hz sine with a
   * second LFO on the gain, which is a textbook wind patch and which,
   * running under the menu and all six chapters, turned into an
   * oscillating whoosh-whoosh that you cannot stop hearing once you
   * have heard it. A slow periodic sweep is the one thing an ambient
   * bed must never do: the ear locks onto the period and the sound
   * stops being a room and starts being an effect.
   *
   * So: no oscillators, no modulation, no movement of any kind. Two
   * layers of steady filtered noise at roughly a sixth of the old
   * level. It should sit just above the noise floor of the player's
   * own hardware and never once draw attention to itself.
   */
  wind(strength = 0.5) {
    return this.loop('wind', out => {
      // the body: low, dull, and completely still
      const n = this.src(this.noise.brown, { loop: true, rate: 0.5 });
      const hp = this.filter('highpass', 110, 0.5);
      const lp = this.filter('lowpass', 900, 0.5);
      const g = this.gain(0.020 * strength);
      n.connect(hp).connect(lp).connect(g).connect(out);

      // a hair of air on top, so it reads as outdoors rather than as
      // a sealed room. quieter again by a factor of three.
      const a = this.src(this.noise.pink, { loop: true, rate: 0.85 });
      const af = this.filter('bandpass', 2600, 0.4);
      const ag = this.gain(0.007 * strength);
      a.connect(af).connect(ag).connect(out);

      n.start(); a.start();
      return () => { try { n.stop(); a.stop(); } catch {} };
    }, { vol: 1 });
  }

  stoveFire() {
    return this.loop('stove', out => {
      const n = this.src(this.noise.brown, { loop: true, rate: 0.7 });
      const f = this.filter('lowpass', 260, 1.2);
      const g = this.gain(0.05);
      n.connect(f).connect(g).connect(out);
      let alive = true;
      const pop = () => {
        if (!alive) return;
        const t = this.t; const c = this.src(this.noise.white);
        const bp = this.filter('bandpass', 700 + Math.random() * 1600, 4);
        const gg = this.gain(0.0001); c.connect(bp).connect(gg).connect(out);
        gg.gain.exponentialRampToValueAtTime(0.05, t + 0.003);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        c.start(t); c.stop(t + 0.12);
        setTimeout(pop, 1200 + Math.random() * 4000);
      };
      setTimeout(pop, 900); n.start();
      return () => { alive = false; try { n.stop(); } catch {} };
    }, { vol: 1 });
  }

  waterDrip(pos, rate = 3200) {
    const id = 'drip' + (pos ? pos.join(',') : '');
    return this.loop(id, out => {
      const sink = pos ? (() => { const p = this.panner(...pos, { ref: 1.5, max: 18 }); p.connect(out); return p; })() : out;
      let alive = true;
      const d = () => {
        if (!alive) return;
        const t = this.t;
        const o = this.osc('sine', 900 + Math.random() * 500);
        const g = this.gain(0.0001);
        o.connect(g).connect(sink);
        o.frequency.exponentialRampToValueAtTime(320, t + 0.09);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.start(t); o.stop(t + 0.2);
        setTimeout(d, rate * (0.5 + Math.random()));
      };
      setTimeout(d, 500);
      return () => { alive = false; };
    }, { vol: 1 });
  }

  carInterior() {
    return this.loop('car', out => {
      const n = this.src(this.noise.brown, { loop: true, rate: 0.8 });
      const f = this.filter('lowpass', 170, 1.4);
      const g = this.gain(0.16);
      n.connect(f).connect(g).connect(out);
      const e1 = this.osc('sawtooth', 44), ef = this.filter('lowpass', 130, 4), eg = this.gain(0.05);
      e1.connect(ef).connect(eg).connect(out);
      n.start(); e1.start();
      return () => { try { n.stop(); e1.stop(); } catch {} };
    }, { vol: 1 });
  }

  // ============================================================ FOOTSTEPS
  /**
   * A footstep is three things happening within 120 ms:
   *   impact, the heel arriving: a low tone that drops in pitch
   *   body  , the shoe's mass against the material
   *   tail  , the scuff, crunch or squeak afterwards
   * There is deliberately no cloth/clothing layer: a broadband low
   * swell on every step turns into an audible whoosh-whoosh at
   * walking pace, which is worse than the thing it was fixing.
   * Nine surfaces, six variations, ±4% pitch, and the feet alternate,
   * because two identical steps in a row is what makes footsteps in
   * games sound like a machine.
   *
   * These are deliberately soft. Walking around this game is
   * something the player does for hours and it should be nice: the
   * tails sit an octave lower than they used to, the attacks are
   * ten to fifteen milliseconds rather than four, and nothing here
   * has any energy left above about 5 kHz.
   */
  static SURFACES = {
    wood:       { impact: [112, 58, .28, .13], body: ['bandpass',  480, 1.1, .20, .095], tail: ['bandpass', 1500, .5, .045, .075], send: .10, creak: .14, att: .012 },
    // Paved ground. Everything outdoors used to be 'gravel', which
    // gave a loose-stone crunch on tarmac and on sidewalks. Asphalt is
    // a dead surface: a firm heel, a short low-mid slap, and almost no
    // tail. Concrete is the same shape but harder and brighter, and it
    // rings off the buildings, which is what `send` is doing. The
    // character on both comes from `grit`, a few loose stones under
    // the sole every third or fourth step, rather than from a crunch
    // on every single one.
    asphalt:    { impact: [104, 66, .23, .080], body: ['bandpass',  560, 0.9, .19, .060], tail: ['bandpass', 1450, .55, .045, .055], send: .16, att: .010, grit: .26 },
    concrete:   { impact: [124, 78, .25, .070], body: ['bandpass',  700, 1.4, .20, .052], tail: ['bandpass', 2000, .70, .060, .048], send: .24, att: .009, grit: .34 },
    lino:       { impact: [158, 104, .15, .07], body: ['bandpass', 1150, 1.3, .21, .060], tail: ['bandpass', 2600, .6, .075, .050], send: .06, att: .010 },
    carpet:     { impact: [78,  48, .21, .17], body: ['lowpass',    300, .7,  .17, .13],  tail: ['lowpass',  1000, .5, .030, .070], send: .03, att: .018 },
    gravel:     { impact: [92,  58, .17, .09], body: ['bandpass',  820, .6,  .16, .085], tail: ['bandpass', 1900, .5, .165, .19],  send: .09, att: .010, grit: .55 },
    snow:       { impact: [70,  44, .19, .14], body: ['lowpass',    440, .6,  .16, .12],  tail: ['bandpass',  900, .9, .140, .23],  send: .07, squeak: [560, 1020, .055, .24], att: .014 },
    slush:      { impact: [64,  40, .18, .15], body: ['lowpass',    370, .5,  .18, .15],  tail: ['bandpass',  620, .6, .165, .26],  send: .08, wet: true, att: .014 },
    stone:      { impact: [132, 84, .24, .08], body: ['bandpass',  720, 2.0, .21, .065], tail: ['bandpass', 2100, .7, .070, .11],  send: .42, att: .009 },
    // The exterior stair up the side of the block. This surface was
    // named by loc_street.js from the beginning and never existed
    // here, so the open steel treads have been playing the *wood*
    // footstep all along. `ring` is what makes it steel: two
    // inharmonic partials that carry on after the foot has gone.
    metal:      { impact: [150, 96, .21, .070], body: ['bandpass', 1050, 3.2, .19, .075], tail: ['bandpass', 2300, 1.2, .075, .10], send: .18, att: .008, ring: [560, .085, .55] },
    water:      { impact: [68,  42, .15, .12], body: ['lowpass',    440, .5,  .24, .24],  tail: ['bandpass', 1500, .5, .160, .30],  send: .30, wet: true, att: .012 },
    rottenwood: { impact: [94,  52, .26, .15], body: ['bandpass',  300, 2.4, .22, .13],  tail: ['bandpass', 1050, 1.0, .065, .11], send: .14, creak: .42, att: .014 }
  };

  step(surface = 'wood', { vol = 0.32, run = false, crouch = false } = {}) {
    if (!this.ready) return;
    const S = AudioEngine.SURFACES[surface] || AudioEngine.SURFACES.wood;
    const t = this.t;

    // alternate feet, subtly different weight, pitch and placement
    this._foot = !this._foot;
    const foot = this._foot ? 1 : -1;
    const variation = (this._stepVar = ((this._stepVar | 0) + 1) % 6);
    const detune = 1 + (variation - 2.5) * 0.016 + (Math.random() * 0.08 - 0.04);
    const weight = foot > 0 ? 1.0 : 0.92;
    const amp = vol * (run ? 1.45 : crouch ? 0.55 : 1) * weight * (0.9 + Math.random() * 0.2);

    const pan = this.ctx.createStereoPanner
      ? this.ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = foot * 0.16;
    const out = this.gain(1);
    if (pan) { out.connect(pan); pan.connect(this.bus.sfx); }
    else out.connect(this.bus.sfx);
    if (S.send > 0.02) { const sd = this.gain(S.send * 1.4); out.connect(sd).connect(this.convSend); }

    const att = S.att || 0.012;

    // ---- impact: the heel ----
    const [i0, i1, ia, idur] = S.impact;
    const o = this.osc('sine', i0 * detune);
    const og = this.gain(0.0001);
    // a lowpass on the heel too, so the pitch drop reads as weight
    // rather than as an oscillator being switched on
    const of = this.filter('lowpass', 420, 0.6);
    o.connect(of).connect(og).connect(out);
    o.frequency.exponentialRampToValueAtTime(i1 * detune, t + idur);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * ia), t + att);
    og.gain.exponentialRampToValueAtTime(0.0001, t + idur);
    o.start(t); o.stop(t + idur + 0.06);

    // ---- body ----
    const noiseFor = (wet) => wet ? this.noise.brown : this.noise.white;
    const mk = (spec, delay, useWet) => {
      const [type, f, q, a, dur] = spec;
      const n = this.src(noiseFor(useWet), { rate: detune });
      const b = this.filter(type, f * detune, q);
      const g = this.gain(0.0001);
      n.connect(b).connect(g).connect(out);
      const st = t + delay;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * a), st + att);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      n.start(st, Math.random() * 1.2, dur + 0.15);
      n.stop(st + dur + 0.2);
    };
    mk(S.body, 0.003, S.wet);
    mk(S.tail, 0.022 + Math.random() * 0.024, S.wet);

    // ---- snow squeaks. it is the whole character of walking on snow. ----
    if (S.squeak && Math.random() > 0.45) {
      const [f0, f1, a, dur] = S.squeak;
      const sq = this.osc('triangle', f0 * detune);
      const sf = this.filter('bandpass', f0 * 1.4, 4.5);
      const sg = this.gain(0.0001);
      sq.connect(sf).connect(sg).connect(out);
      sq.frequency.linearRampToValueAtTime(f1 * detune, t + dur);
      sg.gain.setValueAtTime(0.0001, t + 0.02);
      sg.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * a), t + 0.055);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      sq.start(t + 0.02); sq.stop(t + dur + 0.05);
    }

    // ---- steel goes on ringing after the foot has left it ----
    if (S.ring) {
      const [rf, ra, rd] = S.ring;
      [[1, 1, 1], [2.41, 0.42, 0.62], [3.86, 0.18, 0.40]].forEach(([m, g0, dm]) => {
        const o = this.osc('sine', rf * m * detune * (1 + (Math.random() * 0.02 - 0.01)));
        const rg = this.gain(0.0001);
        o.connect(rg).connect(out);
        const d = rd * dm;
        rg.gain.setValueAtTime(0.0001, t);
        rg.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * ra * g0), t + 0.008);
        rg.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.start(t); o.stop(t + d + 0.05);
      });
    }

    // ---- loose stones under the sole ----
    // One or two small, quiet, high scrapes a short moment after the
    // foot lands. This is what stops paved ground sounding like a
    // loop: most steps are clean, and the ones that are not are never
    // the same twice.
    if (S.grit && Math.random() < S.grit) {
      const stones = 1 + (Math.random() < 0.35 ? 1 : 0);
      for (let i = 0; i < stones; i++) {
        const gt = t + 0.028 + Math.random() * 0.075 + i * 0.035;
        const gd = 0.020 + Math.random() * 0.045;
        const n = this.src(this.noise.white, { rate: 0.9 + Math.random() * 0.4 });
        const b = this.filter('bandpass', 2400 + Math.random() * 2600, 1.6 + Math.random() * 2.5);
        const g = this.gain(0.0001);
        n.connect(b).connect(g).connect(out);
        g.gain.setValueAtTime(0.0001, gt);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * (0.055 + Math.random() * 0.055)), gt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, gt + gd);
        n.start(gt, Math.random() * 1.2, gd + 0.1); n.stop(gt + gd + 0.15);
      }
    }

    // ---- old boards complain ----
    if (S.creak && Math.random() < S.creak * 0.5) {
      const c = this.osc('triangle', 130 + Math.random() * 70);
      const cf = this.filter('bandpass', 380 + Math.random() * 320, 7);
      const cg = this.gain(0.0001);
      c.connect(cf).connect(cg).connect(out);
      const cd = 0.22 + Math.random() * 0.34;
      c.frequency.linearRampToValueAtTime(105 + Math.random() * 110, t + cd);
      cg.gain.setValueAtTime(0.0001, t + 0.015);
      cg.gain.exponentialRampToValueAtTime(Math.max(0.0002, amp * 0.11), t + 0.09);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + cd);
      c.start(t + 0.015); c.stop(t + cd + 0.05);
    }
  }

  /** The Ch5 "something is walking parallel to you" effect. */
  parallelStep(x, y, z, occluded = true) {
    if (!this.ready) return;
    const t = this.t;
    const p = this.panner(x, y, z, { ref: 4, max: 40, roll: 0.8 });
    const lp = this.filter('lowpass', occluded ? 420 : 5200, occluded ? 1.2 : 0.7);
    const g = this.gain(0.0001);
    const n = this.src(this.noise.white, { rate: 0.94 });
    n.connect(lp).connect(g).connect(p);
    p.connect(this.bus.sfx);
    const send = this.gain(0.5); g.connect(send).connect(this.convSend);
    g.gain.exponentialRampToValueAtTime(occluded ? 0.14 : 0.3, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    n.start(t, Math.random() * 1.5, 0.4); n.stop(t + 0.45);
    // its heel, too, so it reads as a person and not as a noise
    const o = this.osc('sine', 96);
    const og = this.gain(0.0001);
    o.connect(og).connect(p);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.09);
    og.gain.exponentialRampToValueAtTime(occluded ? 0.05 : 0.11, t + 0.005);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.start(t); o.stop(t + 0.14);
  }

  // ============================================================ DOORS
  /**
   * kind:   wood | heavy | metal | screen | cabinet | car | fridge
   * action: open | close | latch | knock | try
   *
   * Doors get opened several hundred times in a playthrough, so they
   * are built to be pleasant rather than accurate: the latch is a
   * low, short click instead of a bright tick, the hinge is a slow
   * wooden complaint instead of a squeal, and the frame impact has
   * real body under it. The whole thing then goes through the
   * warmth chain on the sfx bus.
   */
  door(kind = 'wood', action = 'open', { vol = 0.6, pos = null } = {}) {
    if (!this.ready) return;
    const t = this.t;
    const sink = pos
      ? (() => { const p = this.panner(...pos, { ref: 2.5, max: 26 }); p.connect(this.bus.sfx); return p; })()
      : this.bus.sfx;
    const out = this.gain(vol, sink);
    const send = this.gain(kind === 'heavy' ? 0.55 : 0.22);
    out.connect(send).connect(this.convSend);

    const KINDS = {
      wood:    { body: 150, bodyQ: 5.0, thud: 92,  latch: 1800, hinge: 250, hingeQ: 8.0, mass: 1.0, rattle: .22 },
      heavy:   { body: 84,  bodyQ: 4.5, thud: 52,  latch: 1300, hinge: 168, hingeQ: 9.0, mass: 2.2, rattle: .30 },
      metal:   { body: 320, bodyQ: 9.0, thud: 150, latch: 2600, hinge: 470, hingeQ: 12.0, mass: 1.3, rattle: .46 },
      screen:  { body: 420, bodyQ: 3.6, thud: 210, latch: 2200, hinge: 640, hingeQ: 6.5, mass: 0.5, rattle: .58 },
      cabinet: { body: 230, bodyQ: 5.5, thud: 140, latch: 2300, hinge: 400, hingeQ: 7.5, mass: 0.6, rattle: .17 },
      car:     { body: 110, bodyQ: 3.6, thud: 66,  latch: 1550, hinge: 285, hingeQ: 7.0, mass: 1.6, rattle: .26 },
      fridge:  { body: 130, bodyQ: 2.8, thud: 78,  latch: 800,  hinge: 225, hingeQ: 5.0, mass: 1.2, rattle: .12 }
    };
    // an unknown kind used to fall through to {}, which put NaN into
    // every frequency and gain below and silently produced nothing
    const P = KINDS[kind] || KINDS.wood;

    // attacks are ~10 ms, not ~4: long enough that nothing here ever
    // reads as a click, short enough that it still reads as a latch
    const tone = (type, f, f2, a, dur, at = 0) => {
      const o = this.osc(type, f);
      const g = this.gain(0.0001);
      o.connect(g).connect(out);
      if (f2 && f2 !== f) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + at + dur);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), t + at + Math.min(0.011, dur * 0.4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    const burst = (f, q, a, dur, at = 0, type = 'bandpass', src = 'white') => {
      const n = this.src(this.noise[src]);
      const b = this.filter(type, f, q);
      const g = this.gain(0.0001);
      n.connect(b).connect(g).connect(out);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), t + at + Math.min(0.010, dur * 0.4));
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      n.start(t + at, Math.random() * 1.2, dur + 0.2); n.stop(t + at + dur + 0.25);
    };
    /** the hinge: a resonant filter wandering while the door swings */
    const hinge = (at, dur, amount = 1) => {
      const o = this.osc('triangle', P.hinge);
      const f = this.filter('bandpass', P.hinge * 1.8, P.hingeQ);
      const g = this.gain(0.0001);
      o.connect(f).connect(g).connect(out);
      const steps = 7;
      for (let i = 1; i <= steps; i++) {
        const k = t + at + (dur * i / steps);
        o.frequency.linearRampToValueAtTime(P.hinge * (0.75 + Math.random() * 0.7), k);
        f.frequency.linearRampToValueAtTime(P.hinge * (1.8 + Math.random() * 1.6), k);
      }
      g.gain.linearRampToValueAtTime(0.075 * amount, t + at + 0.14);
      g.gain.setValueAtTime(0.075 * amount, t + at + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.start(t + at); o.stop(t + at + dur + 0.05);
    };

    if (action === 'latch' || action === 'try') {
      burst(P.latch, 4.0, 0.42, 0.028);
      tone('triangle', P.body * 1.3, P.body, 0.16, 0.045, 0.012);
      tone('sine', P.thud * 0.9, P.thud * 0.6, 0.18 * P.mass, 0.11, 0.014);
      if (action === 'try') {
        burst(P.latch * 0.75, 3.2, 0.28, 0.026, 0.12);
        tone('sine', P.thud, P.thud * 0.7, 0.26 * P.mass, 0.13, 0.11);
      }
      return;
    }
    if (action === 'knock') {
      for (let i = 0; i < 3; i++) {
        const at = i * 0.19 + Math.random() * 0.012;
        tone('sine', P.thud * 1.1, P.thud * 0.6, 0.44 * P.mass, 0.14, at);
        tone('triangle', P.body * 0.8, P.body * 0.6, 0.18, 0.09, at);
        burst(P.body * 2.4, 1.6, 0.22, 0.055, at);
      }
      return;
    }

    if (action === 'open') {
      // the handle turning → the latch withdrawing → the door coming
      // off the jamb → the swing. four small events, not one bang.
      burst(P.latch, 4.5, 0.34, 0.026, 0);
      tone('triangle', P.body * 1.2, P.body * 0.9, 0.13, 0.05, 0.010);
      burst(P.latch * 0.65, 3.0, 0.26, 0.038, 0.060);
      tone('sine', P.thud * 1.1, P.thud * 0.8, 0.26 * P.mass, 0.11, 0.082);
      burst(P.body * 1.8, 1.1, 0.20, 0.10, 0.082, 'bandpass', 'brown');   // the seal letting go
      hinge(0.10, 0.60 + P.mass * 0.22, 1.0);
      if (P.rattle > 0.3) burst(P.body * 5, 1.2, 0.075 * P.rattle, 0.14, 0.15, 'bandpass');
      return;
    }

    // close: swing → the body meeting the frame → latch
    const swing = 0.32 + P.mass * 0.13;
    burst(P.hinge * 1.3, 0.7, 0.075, swing, 0, 'lowpass', 'brown');   // air
    hinge(0.02, swing, 0.62);
    // the door meets the frame. this is the sound; everything else is trim.
    tone('sine', P.thud, P.thud * 0.55, 0.72 * P.mass, 0.22, swing);
    tone('triangle', P.body, P.body * 0.75, 0.34, 0.14, swing);
    burst(P.body * 3.0, P.bodyQ * 0.4, 0.42, 0.09, swing, 'bandpass', 'brown');
    // and the latch drops into it
    burst(P.latch, 4.5, 0.38, 0.026, swing + 0.040);
    tone('triangle', P.latch * 0.30, P.latch * 0.22, 0.15, 0.036, swing + 0.048);
    if (P.rattle > 0.4) burst(P.body * 5.5, 1.1, 0.10 * P.rattle, 0.22, swing + 0.06, 'bandpass');
  }

  // ============================================================ DIALOGUE
  /**
   * There is no recorded VO in this build, so a line arriving needs a
   * physical event or it reads as text appearing on a screenshot.
   * Very quiet, pitched per speaker, and skipped for the host's
   * radio narration (which has its own hiss).
   */
  voiceTick(who = '', style = '') {
    if (!this.ready || style === 'radio') return;
    const t = this.t;
    // stable pitch per speaker
    let h = 0;
    for (let i = 0; i < who.length; i++) h = (h * 31 + who.charCodeAt(i)) >>> 0;
    const base = who ? 190 + (h % 7) * 26 : 150;
    const thought = style === 'thought';

    const out = this.gain(thought ? 0.06 : 0.085, this.bus.ui);
    const o = this.osc('sine', base);
    const f = this.filter('lowpass', 900, 0.7);
    const g = this.gain(0.0001);
    o.connect(f).connect(g).connect(out);
    o.frequency.exponentialRampToValueAtTime(base * 0.78, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.start(t); o.stop(t + 0.1);

    if (!thought) {
      const n = this.src(this.noise.pink);
      const nb = this.filter('bandpass', 1200, 0.9);
      const ng = this.gain(0.0001);
      n.connect(nb).connect(ng).connect(out);
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      n.start(t, Math.random(), 0.1); n.stop(t + 0.12);
    }
  }

  // ============================================================ ONE-SHOTS
  /** Bell "Anna", cast 1904. Additive; the hum note is a fifth below. */
  bell(strength = 1, pos = null) {
    if (!this.ready) return;
    const t = this.t;
    const f0 = 146.8; // D3 tenor-ish
    const partials = [
      [0.5, 0.55, 11], [1.0, 1.0, 8.5], [1.19, 0.42, 6.2], [1.56, 0.34, 4.8],
      [2.0, 0.30, 3.6], [2.66, 0.20, 2.4], [3.01, 0.14, 1.7], [4.1, 0.09, 1.1]
    ];
    const out = this.gain(0.3 * strength);
    const sink = pos ? (() => { const p = this.panner(...pos, { ref: 6, max: 90, roll: 0.6 }); p.connect(this.bus.sfx); return p; })() : this.bus.sfx;
    out.connect(sink);
    const send = this.gain(0.7); out.connect(send).connect(this.convSend);
    partials.forEach(([m, a, dec], i) => {
      const o = this.osc('sine', f0 * m * (1 + (Math.random() * 0.004 - 0.002)));
      const g = this.gain(0.0001);
      o.connect(g).connect(out);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.004 + i * 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.start(t); o.stop(t + dec + 0.2);
    });
    // strike transient
    const n = this.src(this.noise.white);
    const bp = this.filter('bandpass', 2600, 2.2); const ng = this.gain(0.0001);
    n.connect(bp).connect(ng).connect(out);
    ng.gain.exponentialRampToValueAtTime(0.45, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    n.start(t); n.stop(t + 0.3);
  }

  /**
   * Generic transient.
   *
   * kind: thud · click · latch · creak · match · pour · paper ·
   *       sizzle · glass · metal · salt · dialtone · ring · coin ·
   *       shutter · text · wood · splash · ignite · breath · engine ·
   *       pickup · setdown · cloth · book · mug · switch · drawer ·
   *       fabric · chair
   *
   * The house rule here is the same as everywhere else: nothing gets
   * a four-millisecond attack, nothing lives above 5 kHz on its own,
   * and every hard event gets a low partner underneath it so it has
   * somewhere to sit. Picking a mug up should feel like picking a
   * mug up.
   */
  sfx(kind, { vol = 0.5, pos = null, rate = 1 } = {}) {
    if (!this.ready) return;
    const t = this.t;
    const sink = pos ? (() => { const p = this.panner(...pos, { ref: 2.5, max: 30 }); p.connect(this.bus.sfx); return p; })() : this.bus.sfx;
    const out = this.gain(vol, sink);
    const send = this.gain(0.25); out.connect(send).connect(this.convSend);
    /** filtered noise. `at` delays it, `att` is the attack in seconds. */
    const N = (type, f, q, dur, a = 1, at = 0, att = null, ftype = 'bandpass') => {
      const n = this.src(this.noise[type], { rate });
      const b = this.filter(ftype, f, q); const g = this.gain(0.0001);
      n.connect(b).connect(g).connect(out);
      const st = t + at, A = att ?? Math.min(0.010, dur * 0.35);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), st + A);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      n.start(st, Math.random() * 1.2, dur + 0.2); n.stop(st + dur + 0.25);
      return b;
    };
    const T = (type, f, f2, dur, a = 1, at = 0, att = null) => {
      const o = this.osc(type, f); const g = this.gain(0.0001);
      o.connect(g).connect(out);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + at + dur);
      const st = t + at, A = att ?? Math.min(0.010, dur * 0.35);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), st + A);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      o.start(st); o.stop(st + dur + 0.05);
    };
    const R = () => Math.random();
    switch (kind) {
      // ---- handling things -------------------------------------------
      // a pickup is: the hand arriving, the object leaving the surface,
      // and the object's own note. three events inside 90 ms.
      case 'pickup':
        N('brown', 260, 0.9, 0.075, 0.55, 0, 0.012);
        N('white', 900, 0.8, 0.055, 0.20, 0.030, 0.010);
        T('sine', 175, 130, 0.13, 0.26, 0.028, 0.014);
        break;
      case 'setdown':
        N('brown', 210, 1.0, 0.13, 0.65, 0, 0.010);
        T('sine', 118, 76, 0.20, 0.44, 0, 0.011);
        N('white', 620, 0.7, 0.09, 0.14, 0.026, 0.014);   // the hand letting go
        break;
      case 'cloth':
      case 'fabric':
        N('brown', 300, 0.5, 0.26, 0.34, 0, 0.045, 'lowpass');
        N('white', 1400, 0.6, 0.19, 0.10, 0.02, 0.055);
        break;
      case 'book':
        N('white', 1100, 0.7, 0.10, 0.28, 0, 0.014);
        N('brown', 230, 0.9, 0.16, 0.44, 0.01, 0.012);
        T('sine', 130, 90, 0.17, 0.16, 0.01, 0.012);
        break;
      case 'mug':
        T('sine', 620, 560, 0.55, 0.16, 0, 0.010);       // the ceramic note
        T('sine', 1490, 1440, 0.34, 0.07, 0, 0.008);
        N('brown', 240, 1.0, 0.09, 0.40, 0, 0.010);
        break;
      case 'switch':
        // a bakelite light switch: two small wooden events, no glare
        N('white', 850, 2.2, 0.022, 0.40, 0, 0.005);
        T('triangle', 240, 170, 0.045, 0.20, 0.006, 0.006);
        N('brown', 180, 1.0, 0.07, 0.22, 0.006, 0.010);
        break;
      case 'drawer':
        N('brown', 210, 0.7, 0.42, 0.34, 0, 0.10, 'lowpass');
        N('white', 620, 0.6, 0.36, 0.12, 0.02, 0.12);
        T('sine', 96, 72, 0.20, 0.32, 0.36, 0.014);      // it reaches the stop
        break;
      case 'chair':
        N('brown', 190, 0.6, 0.5, 0.42, 0, 0.12, 'lowpass');
        T('triangle', 128, 104, 0.42, 0.10, 0, 0.10);
        break;

      // ---- the originals, warmed ------------------------------------
      case 'thud':     N('brown', 170, 0.9, 0.20, 1.0, 0, 0.011); T('sine', 84, 44, 0.24, 0.70, 0, 0.012); break;
      case 'click':    N('white', 1500, 2.2, 0.030, 0.40, 0, 0.006); T('triangle', 300, 220, 0.045, 0.13, 0, 0.007); break;
      case 'latch':    N('white', 1200, 2.4, 0.055, 0.52, 0, 0.009); T('triangle', 200, 130, 0.06, 0.20, 0.006, 0.009); break;
      case 'doorclose':N('brown', 220, 1.1, 0.18, 0.90, 0, 0.010); T('sine', 66, 38, 0.30, 0.62, 0, 0.012); break;
      case 'creak': {
        // slow, wooden, and it does not shriek
        const o = this.osc('triangle', 140); const f = this.filter('bandpass', 420, 6); const g = this.gain(0.0001);
        o.connect(f).connect(g).connect(out);
        o.frequency.setValueAtTime(132, t);
        for (let i = 1; i <= 10; i++) o.frequency.linearRampToValueAtTime(120 + R() * 90, t + i * 0.11);
        g.gain.linearRampToValueAtTime(0.13, t + 0.14);
        g.gain.setTargetAtTime(0.0001, t + 0.7, 0.22);
        o.start(t); o.stop(t + 1.5); break;
      }
      case 'match':    N('white', 3200, 1.1, 0.26, 0.70, 0, 0.008); N('pink', 760, 0.7, 0.6, 0.26, 0.01, 0.03); break;
      case 'sizzle':   N('white', 3000, 0.5, 1.0, 0.15, 0, 0.09); break;
      case 'paper':    N('white', 1900, 0.9, 0.17, 0.36, 0, 0.014); N('brown', 330, 0.7, 0.12, 0.10, 0, 0.016); break;
      case 'pour':     N('pink', 1100, 0.6, 0.85, 0.26, 0, 0.08); T('sine', 220, 320, 0.8, 0.05, 0, 0.10); break;
      case 'salt':     N('white', 3800, 0.8, 0.40, 0.24, 0, 0.020); break;
      case 'glass':    T('sine', 1850, 1700, 1.1, 0.26, 0, 0.008); T('sine', 2760, 2700, 0.7, 0.11, 0, 0.008); N('white', 2600, 2, 0.07, 0.26, 0, 0.007); break;
      case 'metal':    T('triangle', 700, 660, 1.0, 0.26, 0, 0.009); T('sine', 1180, 1150, 0.6, 0.11, 0, 0.008); N('white', 1800, 2.4, 0.06, 0.24, 0, 0.008); break;
      case 'coin':     T('triangle', 1500, 1300, 0.55, 0.18, 0, 0.007); T('sine', 780, 720, 0.4, 0.10, 0, 0.008); break;
      case 'dialtone': { const a = this.osc('sine', 350), b = this.osc('sine', 440); const g = this.gain(0.0001); a.connect(g); b.connect(g); g.connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.05); g.gain.setValueAtTime(0.11, t + 2.1); g.gain.linearRampToValueAtTime(0.0001, t + 2.2); a.start(t); b.start(t); a.stop(t + 2.25); b.stop(t + 2.25); break; }
      case 'ring':     for (let i = 0; i < 2; i++) { const o = this.osc('sine', 440 + i * 40); const g = this.gain(0.0001); o.connect(g).connect(out); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.05); g.gain.setValueAtTime(0.16, t + 1.58); g.gain.linearRampToValueAtTime(0.0001, t + 1.68); o.start(t); o.stop(t + 1.72); } break;
      case 'shutter':  N('white', 1500, 2.2, 0.035, 0.42, 0, 0.006); setTimeout(() => this.sfx('click', { vol: vol * 0.7 }), 70); break;
      case 'text':     T('sine', 660, 660, 0.14, 0.18, 0, 0.010); setTimeout(() => T('sine', 990, 990, 0.18, 0.16, 0, 0.010), 120); break;
      case 'wood':     N('brown', 260, 1.4, 0.15, 0.70, 0, 0.011); T('sine', 140, 100, 0.18, 0.22, 0, 0.012); break;
      case 'splash':   N('brown', 420, 0.5, 0.40, 0.58, 0, 0.014); N('white', 1700, 0.7, 0.24, 0.20, 0.01, 0.020); break;
      case 'ignite':   N('white', 2200, 0.6, 0.45, 0.42, 0, 0.014); T('sine', 110, 55, 0.34, 0.38, 0, 0.016); break;
      case 'breath':   N('pink', 560, 0.5, 0.6, 0.18, 0, 0.10); break;
      case 'engine':   T('triangle', 58, 104, 1.3, 0.22, 0, 0.06); N('brown', 150, 0.6, 1.2, 0.10, 0, 0.10); break;
      default:         N('white', 900, 1.4, 0.10, 0.42, 0, 0.010);
    }
  }

  /**
   * Radio: AM static, between stations.
   *
   * This used to sweep its bandpass with a 0.13 Hz sine, i.e. a
   * whoosh every seven and a half seconds for the whole of the
   * Chapter Four drive. Same rule as `wind`: a bed that repeats on a
   * period the ear can hold is not a bed. It is hiss now, and it
   * stays hiss.
   */
  radioStatic(vol = 0.14) {
    if (!this.ready) return null;
    return this.loop('radio', out => {
      const n = this.src(this.noise.white, { loop: true, rate: 0.85 });
      const bp = this.filter('bandpass', 1500, 0.6);
      const hp = this.filter('highpass', 300, 0.7);
      const g = this.gain(vol);
      n.connect(hp).connect(bp).connect(g).connect(out);
      n.start();
      return () => { try { n.stop(); } catch {} };
    }, { vol: 1 });
  }

  /** A sting. Suppressed entirely under Reduce Jumpscares (doc §12). */
  sting(kind = 'hit') {
    if (!this.ready || settings().reduceJumpscares) return;
    const t = this.t;
    const out = this.gain(0.55, this.bus.sfx);
    if (kind === 'hit') {
      const o = this.osc('sawtooth', 90); const f = this.filter('lowpass', 900, 8); const g = this.gain(0.0001);
      o.connect(f).connect(g).connect(out);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
      o.start(t); o.stop(t + 1.4);
      const n = this.src(this.noise.white); const bp = this.filter('bandpass', 3400, 1.2); const ng = this.gain(0.0001);
      n.connect(bp).connect(ng).connect(out);
      ng.gain.exponentialRampToValueAtTime(0.5, t + 0.005); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      n.start(t); n.stop(t + 0.6);
    } else if (kind === 'riser') {
      const o = this.osc('sawtooth', 60); const f = this.filter('bandpass', 300, 3); const g = this.gain(0.0001);
      o.connect(f).connect(g).connect(out);
      o.frequency.exponentialRampToValueAtTime(1400, t + 2.6);
      f.frequency.exponentialRampToValueAtTime(4000, t + 2.6);
      g.gain.linearRampToValueAtTime(0.5, t + 2.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
      o.start(t); o.stop(t + 3.1);
    } else if (kind === 'sub') {
      const o = this.osc('sine', 42); const g = this.gain(0.0001);
      o.connect(g).connect(out);
      g.gain.exponentialRampToValueAtTime(0.7, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.start(t); o.stop(t + 2.3);
    }
  }

  // ============================================================ RADIO
  /**
   * A radio playing somewhere in the room. Diegetic: it has a
   * position, it is band-limited to an AM channel through a paper
   * cone, and it lands on the ambience bus rather than the music
   * bus, because it is part of the world and not part of the score.
   *
   *   const r = audio.radio('diner', { pos: [x, 1.4, z], station: 'standards' });
   *   r.tune('gospel');            // with a sweep through the noise
   *   r.setSignal(0.35);           // the ridge, in weather
   *   r.setOccluded(true);         // a wall or a door in the way
   *   r.power(false);
   *
   * `floorOcclusion: true` also hands it to the listener-height
   * occluder, so a set playing downstairs stays downstairs.
   * Radios are torn down with the world; see killRadios().
   */
  radio(id = 'radio', opts = {}) {
    if (!this.ready) return null;
    const existing = this.radios.get(id);
    if (existing) return existing;
    const { floorOcclusion = false, ...rest } = opts;
    const r = new Radio(this, rest);
    if (floorOcclusion && r.pos && r.occl && r.mix) {
      r._occEntry = this.addFloorOcclusion({
        y: r.pos[1], lp: r.occl, g: r.mix, state: null, cutoff: 420, amount: 0.42
      });
    }
    this.radios.set(id, r);
    return r;
  }

  getRadio(id) { return this.radios.get(id) || null; }

  killRadio(id) {
    const r = this.radios.get(id);
    if (!r) return;
    if (r._occEntry) this.removeFloorOcclusion(r._occEntry);
    r.dispose();
    this.radios.delete(id);
  }

  killRadios() { [...this.radios.keys()].forEach(k => this.killRadio(k)); }

  /** The dial, for a tuning UI or for the F8 overlay. */
  get stations() { return STATION_IDS.map(stationInfo); }

  // ============================================================ MUSIC
  /**
   * Start the score. There is no gate on this any more: the first
   * user gesture in the game starts the piano and it does not stop.
   * The name is kept because half the chapters call it.
   */
  unlockMusic({ instant = false } = {}) {
    if (!this.ready) return;
    this.musicUnlocked = true;
    this.bus.music.gain.setTargetAtTime(settings().musicVol, this.t, instant ? 0.6 : 2.0);
    this.music?.start();
  }

  stopMusic(fade = 3) { this.music?.stop(fade); }

  /**
   * Ask for one of the written pieces by scene name. See SCENES in
   * music.js for the list; `immediate` drops the score out for a
   * beat first, which is what a chapter change wants.
   */
  musicScene(scene, opts = {}) {
    if (!this.ready) return;
    this.music?.setScene(scene, opts);
  }

  /** The list of scene names the score answers to. */
  get musicScenes() { return Object.keys(SCENES); }

  /** What is playing right now, for the F8 overlay. */
  get nowPlaying() { return this.music?.nowPlaying || ''; }

  /** 0 = the laundromat. 1 = the aisle at three in the morning. */
  setMusicIntensity(v) { this.music?.setIntensity(v); }

  /** Pull the score down under a line of dialogue. */
  duckMusic(seconds = 1.6, amount = 0.5) { this.music?.duckFor(seconds, amount); }

  /**
   * The drone that sits UNDER the piano when the game is at its
   * worst: a bowed, breathing D that never quite settles. It does
   * not replace the score, it leans on it, and it pushes the piano
   * into its darker settings on the way past.
   */
  score(intensity = 0) {
    if (!this.ready) return null;
    this.setMusicIntensity(0.35 + intensity * 0.65);
    return this.loop('score', out => {
      const root = 73.4; // D2
      const voices = [1, 1.5, 1.2, 2, 2.4, 3];
      const oscs = [];
      voices.forEach((m, i) => {
        // triangles, not saws: the drone should be felt, not heard
        const o = this.osc(i % 3 === 0 ? 'sine' : 'triangle', root * m * (1 + (Math.random() * 0.006 - 0.003)));
        const f = this.filter('lowpass', 380 + i * 120, 0.9);
        const g = this.gain(0.0);
        o.connect(f).connect(g).connect(out);
        // a breath, not a pulse: the depth here is a few percent of
        // the voice's level, and the rates are prime-ish against each
        // other so the six voices never line up into one swell
        const l = this.osc('sine', 0.037 + i * 0.0113), lg = this.gain(0.0035);
        l.connect(lg).connect(g.gain);
        o.start(); l.start();
        g.gain.setTargetAtTime(0.050 / (i * 0.5 + 1), this.t + i * 1.4, 4.0);
        oscs.push(o, l);
      });
      return () => oscs.forEach(o => { try { o.stop(); } catch {} });
    }, { vol: 0.26 + intensity * 0.30, bus: 'music', fade: 7 });
  }
}

export const audio = new AudioEngine();
