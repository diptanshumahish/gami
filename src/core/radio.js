/* ============================================================
   radio.js: a radio playing somewhere in the room.

   This is NOT the score. The score (music.js) is in the player's
   head: it has no position, it never competes with dialogue, and
   it is mixed on the music bus. A radio is a physical object with
   a speaker in it, sitting on a counter eleven feet away, and
   everything here follows from that.

     · It is band-limited before you ever hear it. AM through a
       three-inch paper cone is roughly 220 Hz to 3.4 kHz, so
       there is no bass and no air, and every instrument in the
       band arrives sounding like the same instrument. That is a
       gift: simple voices are all you need, because the channel
       flattens them anyway.
     · It is squashed. Broadcast compression, then the cone
       running out of excursion. Nothing on a radio is dynamic.
     · It has a noise floor, mains hum and a signal strength.
     · It is positioned, so it pans and it gets quieter as you
       walk away, and it can be occluded by a wall or a floor.

   Nothing in here modulates on a slow period; see the house rule
   in audio.js. The tuning sweep is a one-shot scheduled ramp, and
   the dropouts fire on a random interval, so neither is something
   the ear can lock onto.

   Nothing wires a radio into a chapter yet. `audio.radio(id, …)`
   builds one; see the bottom of this file for how.
   ============================================================ */
import { hz } from './music.js';

/* ============================================================
   THE STATIONS

   Four things are on the air, plus the space between them. Each
   station is a chord cycle, a phrase library over it, a band, and
   a rhythm. Same shape as the pieces in music.js so that anyone
   who has read that file can read this one.
   ============================================================ */
const STATIONS = {

  /* -------------------------------------------------- WQFM 104.1 FM
     The only thing on the dial that is not from 1961.

     Slow, hazy, a lot of room on the piano, a melody that mostly
     falls. Written here, not covered from anywhere: the chord
     cycle is vi-IV-I-V with ninths and major sevenths on it, which
     is the most common progression in popular music and belongs to
     nobody, and the tune over the top is its own.

     This is also why the set has an FM channel and a `verb` send:
     the AM band would take the reverb off it and leave a music box.

     Title: "Come Home Late". */
  late_night: {
    call: 'WQFM 104.1', name: 'Come Home Late',
    bpm: 68, meter: 4, band: 'piano', drums: 'none', swing: 0,
    fm: true, verb: 0.62, tone: 12000, presence: 0.16,
    bars: [
      { bass: 'C2',  tones: ['Eb3', 'G3', 'Bb3', 'D4'], colour: 'Eb4' },   // Cm9
      { bass: 'Ab1', tones: ['C3', 'Eb3', 'G3', 'Bb3'], colour: 'C4' },    // Abmaj7
      { bass: 'Eb2', tones: ['G3', 'Bb3', 'D4', 'F4'],  colour: 'G4' },    // Ebmaj9
      { bass: 'Bb1', tones: ['D3', 'F3', 'Ab3', 'C4'],  colour: 'D4' },    // Bb7
      { bass: 'C2',  tones: ['Eb3', 'G3', 'Bb3', 'D4'], colour: 'Bb4' },
      { bass: 'Ab1', tones: ['C3', 'Eb3', 'G3', 'Bb3'], colour: 'Eb4' },
      { bass: 'F1',  tones: ['Ab2', 'C3', 'Eb3', 'G3'], colour: 'Ab4' },   // Fm7
      { bass: 'Bb1', tones: ['D3', 'F3', 'Ab3', 'C4'],  colour: 'F4' }
    ],
    phrases: [
      [['Bb4', 0, 2, .46], ['C5', 2, 1, .40], ['Bb4', 3, 1, .38], ['G4', 4, 4, .46]],
      [['Ab4', 0, 1.5, .42], ['G4', 1.5, 1.5, .40], ['F4', 3, 2, .42], ['Eb4', 5, 3, .44]],
      [['Eb5', 0, 2, .48], ['D5', 2, 2, .44], ['Bb4', 4, 4, .46]],
      [['C5', 0, 1, .42], ['D5', 1, 1, .42], ['Eb5', 2, 3, .50], ['D5', 5, 3, .44]],
      [['G4', 0, 2, .42], ['Bb4', 2, 2, .44], ['C5', 4, 4, .46]],
      [['F4', 0, 3, .44], ['Eb4', 3, 1, .38], ['D4', 4, 4, .42]],
      [['Bb4', 0, 1, .42], ['C5', 1, 1, .42], ['D5', 2, 2, .46], ['Eb5', 4, 4, .50]],
      [['Bb4', 0, 8, .46]]
    ]
  },

  /* --------------------------------------------------- WBRE 88.3 FM
     The college station after midnight, which for the last twenty
     years has meant one thing: a slow, dusty, swung four, jazz
     sevenths on an electric piano, and a drummer who is deliberately
     late for everything.

     Original, in the idiom. What makes the idiom is the production
     rather than the notes: the loop is short and repeats without
     apology, the kit is muffled and dragged eight milliseconds
     behind the grid, the record it is supposedly sampled from has
     dust on it, and the tape it was dubbed to has a wobble.

     Title: "Night Shift". */
  lofi: {
    call: 'WBRE 88.3', name: 'Night Shift',
    bpm: 78, meter: 4, band: 'lofi', drums: 'lofi',
    swing: 0.62, drag: 0.010, vinyl: 0.55, wow: 1.15,
    fm: true, verb: 0.30, tone: 8200, presence: 0.22,
    bars: [
      { bass: 'F1', tones: ['A3', 'C4', 'E4', 'G4'],   colour: 'C5' },   // Fmaj7
      { bass: 'E2', tones: ['G3', 'B3', 'D4', 'F#4'],  colour: 'B4' },   // Em9
      { bass: 'D2', tones: ['F3', 'A3', 'C4', 'E4'],   colour: 'A4' },   // Dm9
      { bass: 'G1', tones: ['B3', 'D4', 'F4', 'A4'],   colour: 'D5' },   // G7
      { bass: 'C2', tones: ['E3', 'G3', 'B3', 'D4'],   colour: 'G4' },   // Cmaj9
      { bass: 'A1', tones: ['C4', 'E4', 'G4', 'B4'],   colour: 'E5' },   // Am9
      { bass: 'D2', tones: ['F3', 'A3', 'C4', 'E4'],   colour: 'F4' },   // Dm7
      { bass: 'G1', tones: ['C4', 'D4', 'F4', 'A4'],   colour: 'C5' }    // G7sus
    ],
    phrases: [
      [['A4', 0, 1, .38], ['C5', 1, 1.5, .40], ['B4', 2.5, 1.5, .36], ['G4', 4, 3, .40]],
      [['E4', 0, 1.5, .36], ['G4', 1.5, 1, .36], ['A4', 2.5, 2, .40], ['F4', 5, 3, .38]],
      [],                                          // let the drums have it
      [['D5', 0, 1, .40], ['C5', 1, 1, .36], ['A4', 2, 2, .40], ['G4', 4, 4, .38]],
      [['C5', 0, 2, .40], ['B4', 2, 1, .34], ['G4', 3, 1, .36], ['E4', 4, 4, .38]],
      [],
      [['F4', 0, 1, .36], ['G4', 1, 1, .36], ['A4', 2, 1.5, .40], ['C5', 3.5, 4, .42]],
      [['G4', 0, 6, .38]]
    ]
  },

  /* --------------------------------------------------- WNEP 91.5 FM
     Jazz hip hop. A hollowbody guitar comping rootless sevenths
     over a boom-bap kit and an upright, which is the whole form.

     The guitar is a real plucked string (Karplus-Strong, see
     `_stringBuffer`), not a sawtooth pretending: comping is short
     stabs where you hear the pick and the strings stopping, and no
     filtered oscillator does that.

     Chords are a ii-V chain in B flat. Title: "Late Set". */
  jazzhop: {
    call: 'WNEP 91.5', name: 'Late Set',
    bpm: 86, meter: 4, band: 'jazzguitar', drums: 'boombap',
    swing: 0.58, drag: 0.008, vinyl: 0.30, wow: 0.55,
    fm: true, verb: 0.34, echo: 0.10, tone: 9000, presence: 0.24,
    gtr: { damp: .52, pick: .30, ring: 2.4, amp: 2400, dbl: 4 },
    bars: [
      { bass: 'C2',  tones: ['Eb3', 'Bb3', 'D4', 'G4'],  colour: 'G4' },   // Cm9
      { bass: 'F1',  tones: ['Eb3', 'A3', 'D4', 'G4'],   colour: 'D4' },   // F13
      { bass: 'Bb1', tones: ['D3', 'A3', 'C4', 'F4'],    colour: 'F4' },   // Bbmaj9
      { bass: 'Eb2', tones: ['D3', 'G3', 'Bb3', 'Eb4'],  colour: 'Bb3' },  // Ebmaj7
      { bass: 'A1',  tones: ['Eb3', 'G3', 'C4'],         colour: 'C4' },   // Am7b5
      { bass: 'D2',  tones: ['F#3', 'C4', 'Eb4'],        colour: 'Eb4' },  // D7b9
      { bass: 'G1',  tones: ['Bb2', 'F3', 'A3', 'D4'],   colour: 'D4' },   // Gm9
      { bass: 'C2',  tones: ['E3', 'Bb3', 'D4', 'G4'],   colour: 'G4' }    // C7
    ],
    phrases: [
      [['G4', 0, 1, .42], ['Bb4', 1, .5, .36], ['C5', 1.5, 1.5, .44], ['G4', 3, 1, .38], ['F4', 4, 3, .42]],
      [['Eb4', 0, 1.5, .40], ['D4', 1.5, .5, .34], ['F4', 2, 2, .42], ['Bb3', 4, 4, .40]],
      [],
      [['D5', 0, 1, .44], ['C5', 1, 1, .38], ['Bb4', 2, 1.5, .42], ['G4', 3.5, 3, .40]],
      [['C5', 0, 1.5, .42], ['Eb5', 1.5, .5, .38], ['D5', 2, 2, .44], ['Bb4', 4, 4, .42]],
      [],
      [['F4', 0, 1, .38], ['G4', 1, 1, .38], ['Bb4', 2, 1, .42], ['D5', 3, 1, .44], ['C5', 4, 4, .44]],
      [['Bb4', 0, 6, .42]]
    ]
  },

  /* -------------------------------------------------- WVSN 103.7 FM
     Synthwave. Detuned saw pads, a filter-swept bass running
     sixteenths, a gated snare, and a clean lead guitar with a
     dotted-eighth delay on it, which is the sound.

     The guitar is the same physical model as the jazz station,
     strung brighter and doubled: two more copies of the string a
     few cents either side, each drifting on its own, which is what
     a doubled guitar part actually is.

     vi-IV-I-V in A minor. Title: "After Dark". */
  synthwave: {
    call: 'WVSN 103.7', name: 'After Dark',
    bpm: 104, meter: 4, band: 'synthwave', drums: 'gated',
    swing: 0, drag: 0, vinyl: 0, wow: 0.18,
    fm: true, verb: 0.52, echo: 0.34, tone: 13000, presence: 0.14,
    gtr: { damp: .24, pick: .55, ring: 3.4, amp: 5200, dbl: 9 },
    bars: [
      { bass: 'A1', tones: ['A3', 'C4', 'E4'],   colour: 'A4' },
      { bass: 'F1', tones: ['F3', 'A3', 'C4'],   colour: 'C5' },
      { bass: 'C2', tones: ['C4', 'E4', 'G4'],   colour: 'G4' },
      { bass: 'G1', tones: ['G3', 'B3', 'D4'],   colour: 'D5' },
      { bass: 'A1', tones: ['A3', 'C4', 'E4'],   colour: 'E5' },
      { bass: 'F1', tones: ['F3', 'A3', 'C4'],   colour: 'A4' },
      { bass: 'D2', tones: ['D4', 'F4', 'A4'],   colour: 'F5' },
      { bass: 'E2', tones: ['E3', 'G#3', 'B3'],  colour: 'B4' }
    ],
    phrases: [
      [['E5', 0, 2, .46], ['G5', 2, 1, .42], ['A5', 3, 3, .50]],
      [['E5', 0, 1, .44], ['D5', 1, 1, .40], ['C5', 2, 4, .46]],
      [],
      [['A5', 0, 1.5, .50], ['G5', 1.5, .5, .42], ['E5', 2, 2, .46], ['D5', 4, 4, .44]],
      [['C5', 0, 1, .42], ['E5', 1, 1, .44], ['A5', 2, 4, .52]],
      [],
      [['F5', 0, 2, .46], ['E5', 2, 2, .44], ['D5', 4, 4, .46]],
      [['A4', 0, 8, .44]]
    ]
  },

  /* ----------------------------------------------------------- talk
     A man saying something in the next room. Deliberately not
     intelligible: syllable-shaped bursts on an irregular clock,
     with the pauses a real broadcaster leaves. The game already
     has a host who reads letters; this is the sound of one when
     you are not listening to him. */
  talk: {
    call: 'WVIA 1240', name: 'Talk',
    band: 'talk', bpm: 60, meter: 4, drums: 'none', swing: 0,
    tone: 2600, presence: 0.6,
    bars: [], phrases: []
  },

  /* ------------------------------------------------------- off-band
     Between stations. Just the carrier and the weather. */
  static: {
    call: '', name: 'Static',
    band: 'none', bpm: 60, meter: 4, drums: 'none', swing: 0,
    tone: 3400, presence: 0.9,
    bars: [], phrases: []
  }
};

export const STATION_IDS = Object.keys(STATIONS);
export const stationInfo = (id) => {
  const s = STATIONS[id];
  return s ? { id, call: s.call, name: s.name } : null;
};

export class Radio {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {object} opts
   *   pos      [x,y,z] in the world, or null for a non-positional radio
   *   station  which station it is tuned to
   *   volume   0..1, the knob on the front
   *   signal   0..1, how well it is receiving. 1 is a local
   *            transmitter; 0.3 is the ridge in bad weather.
   *   bus      which engine bus to land on. 'amb' by default,
   *            because a radio is part of the room and not part
   *            of the score.
   */
  constructor(engine, {
    pos = null, station = 'lofi', volume = 0.6, signal = 0.85,
    bus = 'amb', on = true, ref = 2.2, max = 22, set = 'table'
  } = {}) {
    this.e = engine;
    this.pos = pos;
    this.stationId = STATIONS[station] ? station : 'static';
    this.station = STATIONS[this.stationId];
    this.volume = volume;
    this.signal = signal;
    this.busName = bus;
    this.set = set;                  // 'table' = a small AM set, 'hifi' = a real speaker
    this.ref = ref; this.max = max;
    this.on = false;
    this.bar = 0;
    this.nextTime = 0;
    this.timer = null;
    this.pending = null;
    this.tuneAt = 0;
    this.nodes = null;
    this.occluded = false;
    this._alive = false;
    if (on) this.power(true);
  }

  get ctx() { return this.e.ctx; }
  get beat() { return 60 / (this.station.bpm || 60); }

  // ============================================================ the set
  /**
   * Build the chain. Everything the band plays lands on `this.in`
   * and then goes through the radio, in the order a real one does
   * it: broadcast compression, the band limit of the channel, the
   * cone, the noise floor, then the room.
   */
  _build() {
    const ctx = this.ctx, e = this.e;

    const S = this.station;
    const fm = !!S.fm;

    this.in = ctx.createGain();
    this.in.gain.value = 1;

    // ---- the room the record was made in ----
    // This reverb belongs to the *recording*, not to the space the
    // radio is standing in, so it sits ahead of the channel and gets
    // band-limited along with everything else. A piano ballad is
    // mostly its reverb; without this the FM station is a music box.
    const prog = ctx.createGain();
    prog.gain.value = 1;
    this.in.connect(prog);
    if (S.verb) {
      this.verb = ctx.createConvolver();
      this.verb.buffer = this._plate(3.4, 2.2);
      this.verbSend = ctx.createGain();
      this.verbSend.gain.value = S.verb;
      const pre = ctx.createDelay(0.2);
      pre.delayTime.value = 0.028;
      this.in.connect(this.verbSend).connect(pre).connect(this.verb).connect(prog);
    }

    // ---- broadcast compression ----
    // AM is squashed flat. FM is squashed, but it can breathe.
    const squash = ctx.createDynamicsCompressor();
    squash.threshold.value = fm ? -24 : -30;
    squash.knee.value = fm ? 14 : 6;
    squash.ratio.value = fm ? 3.4 : 9;
    squash.attack.value = fm ? 0.010 : 0.004;
    squash.release.value = fm ? 0.22 : 0.14;

    // ---- the channel. this is most of the sound. ----
    const loF = fm ? 62 : 240, hiF = S.tone;
    const lo = ctx.createBiquadFilter();
    lo.type = 'highpass'; lo.frequency.value = loF; lo.Q.value = 0.7;
    const lo2 = ctx.createBiquadFilter();
    lo2.type = 'highpass'; lo2.frequency.value = loF; lo2.Q.value = 0.7;
    this.hi = ctx.createBiquadFilter();
    this.hi.type = 'lowpass'; this.hi.frequency.value = hiF; this.hi.Q.value = 0.8;
    const hi2 = ctx.createBiquadFilter();
    hi2.type = 'lowpass'; hi2.frequency.value = hiF; hi2.Q.value = 0.8;

    // The transmission ends here. `programme` is the station's own
    // level, so a dropout or a weak signal moves this and nothing else.
    this.programme = ctx.createGain();
    this.programme.gain.value = 1;
    prog.connect(squash).connect(lo).connect(lo2).connect(this.hi).connect(hi2)
      .connect(this.programme);

    // ---- everything the set is reproducing meets here ----
    // Order matters, and it is the order the physical set has: the
    // programme and the receiver's own noise are summed at the
    // detector, and only *then* does it all go through the amplifier
    // and the speaker. Putting the cone before the noise (or before
    // the distortion) lets hiss and saturation products out above
    // 4 kHz that no three-inch paper cone could ever produce, and the
    // set ends up sounding bright and hissy instead of boxy.
    this.mix = ctx.createGain();
    this.mix.gain.value = 1;
    this.programme.connect(this.mix);

    // hiss: the part of the signal that is not the signal
    this.hissG = ctx.createGain();
    this.hissG.gain.value = 0;
    const hissSrc = ctx.createBufferSource();
    hissSrc.buffer = e.noise.white; hissSrc.loop = true;
    const hissBp = ctx.createBiquadFilter();
    hissBp.type = 'bandpass'; hissBp.frequency.value = 2000; hissBp.Q.value = 0.5;
    hissSrc.connect(hissBp).connect(this.hissG).connect(this.mix);
    hissSrc.start();

    // mains hum, 120 Hz in the States, from the set's own transformer
    const hum = ctx.createOscillator();
    hum.type = 'sine'; hum.frequency.value = 120;
    const humG = ctx.createGain(); humG.gain.value = 0.006;
    hum.connect(humG).connect(this.mix);
    hum.start();

    // ---- the amplifier, being pushed ----
    const drive = ctx.createWaveShaper();
    drive.curve = e._softCurve(this.set === 'hifi' ? 1.2 : 2.6);
    drive.oversample = '2x';

    // ---- and the speaker, which is the last word on all of it ----
    // A small paper cone has one big resonance in the middle and
    // simply stops either side of it.
    // The cone belongs to the radio, not to the station: what is
    // being broadcast and what is reproducing it are two different
    // questions. A kitchen set is three inches of paper. A hi-fi, or
    // a car with decent doors, is not.
    const K = this.set === 'hifi'
      ? { lo: 80, hi: 12000, peak: 2400, peakQ: 0.7, peakG: 1.6, box: -1.5 }
      : { lo: 300, hi: 3600, peak: 1700, peakQ: 1.1, peakG: 5 + this.station.presence * 4, box: -4 };
    const coneLo = ctx.createBiquadFilter();
    coneLo.type = 'highpass'; coneLo.frequency.value = K.lo; coneLo.Q.value = 0.8;
    const boxy = ctx.createBiquadFilter();
    boxy.type = 'peaking'; boxy.frequency.value = 620; boxy.Q.value = 1.8; boxy.gain.value = K.box;
    this.cone = ctx.createBiquadFilter();
    this.cone.type = 'peaking'; this.cone.frequency.value = K.peak;
    this.cone.Q.value = K.peakQ; this.cone.gain.value = K.peakG;
    const coneHi = ctx.createBiquadFilter();
    coneHi.type = 'lowpass'; coneHi.frequency.value = K.hi; coneHi.Q.value = 0.7;
    const coneHi2 = ctx.createBiquadFilter();
    coneHi2.type = 'lowpass'; coneHi2.frequency.value = K.hi; coneHi2.Q.value = 0.7;
    this._cone = K;

    this.mix.connect(drive).connect(coneLo).connect(boxy).connect(this.cone)
      .connect(coneHi).connect(coneHi2);

    // ---- occlusion, then the knob, then the room ----
    this.occl = ctx.createBiquadFilter();
    this.occl.type = 'lowpass'; this.occl.frequency.value = 14000; this.occl.Q.value = 0.5;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    coneHi2.connect(this.occl).connect(this.out);

    const bus = e.bus[this.busName] || e.bus.amb;
    if (this.pos) {
      this.panner = e.panner(this.pos[0], this.pos[1], this.pos[2], { ref: this.ref, max: this.max, roll: 1.3 });
      this.out.connect(this.panner);
      this.panner.connect(bus);
      // a radio in a room is a radio plus the room
      const send = e.gain(0.30);
      this.out.connect(send).connect(e.convSend);
    } else {
      this.out.connect(bus);
    }

    // ---- the delay on the lead ----
    // Dotted eighth, set from the tempo on every tune. Fixed time,
    // no modulation of any kind: this is a repeat, not a chorus.
    this.echo = ctx.createDelay(2.0);
    this.echo.delayTime.value = 0.36;
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = S.echo || 0;
    const efb = ctx.createGain(); efb.gain.value = 0.38;
    const eLp = ctx.createBiquadFilter();
    eLp.type = 'lowpass'; eLp.frequency.value = 2800; eLp.Q.value = 0.6;
    this.echoSend.connect(this.echo).connect(eLp).connect(efb).connect(this.echo);
    eLp.connect(prog);

    // ---- the tape it got dubbed to ----
    // A shared detune bus, in cents, that every pitched voice on the
    // dusty stations reads. Pitch only, never amplitude: this is
    // wobble, not a tremolo, and it stays well under the depth the
    // house rule allows.
    this.wowBus = ctx.createGain();
    this.wowBus.gain.value = S.wow || 0;
    const w1 = ctx.createOscillator(); w1.type = 'sine'; w1.frequency.value = 0.31;
    const w1g = ctx.createGain(); w1g.gain.value = 5.5;
    w1.connect(w1g).connect(this.wowBus); w1.start();
    const w2 = ctx.createOscillator(); w2.type = 'sine'; w2.frequency.value = 1.73;
    const w2g = ctx.createGain(); w2g.gain.value = 1.8;
    w2.connect(w2g).connect(this.wowBus); w2.start();

    this.sources = [hissSrc, hum, w1, w2];
    this._applySignal();
  }

  /**
   * A plate: dense, bright, and it does not sound like a room,
   * which is exactly why records are made with them. Brighter and
   * shorter than the hall the score sits in.
   */
  _plate(secs = 3.4, decay = 2.2) {
    const ctx = this.ctx;
    const n = Math.max(1, Math.floor(ctx.sampleRate * secs));
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const p = i / n;
        const env = Math.pow(1 - p, decay);
        // stays open much longer than the hall: a plate keeps its top
        const k = 0.75 * (1 - p * 0.55) + 0.10;
        lp += ((Math.random() * 2 - 1) * env - lp) * k;
        d[i] = lp * 2.4;
      }
      // a plate has no early reflections worth the name, just density
      for (let r = 1; r < 5; r++) {
        const off = Math.floor(ctx.sampleRate * (0.0031 * r + c * 0.0017));
        if (off < n) d[off] += (0.22 / r) * (Math.random() > 0.5 ? 1 : -1);
      }
    }
    return b;
  }

  /**
   * The piano on the FM station. Not the score's instrument: that
   * one is felt-muted and lives in an unheated room, and this one is
   * a close-miked grand with the lid up on a record somebody made on
   * purpose. Brighter partials, a real attack, and a long tail.
   */
  _piano(f, when, dur, vel) {
    const ctx = this.ctx;
    if (!this._pw) {
      const amps = [0, 1, 0.55, 0.38, 0.22, 0.15, 0.10, 0.07, 0.05, 0.035, 0.025, 0.018, 0.013, 0.009];
      const real = new Float32Array(amps.length), imag = new Float32Array(amps.length);
      for (let i = 0; i < amps.length; i++) imag[i] = amps[i];
      this._pw = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    }
    const reg = Math.min(1, Math.max(0, Math.log2(f / 41.2) / 5.6));
    const ring = dur + (1 - reg) * 3.2 + 1.4;
    const peak = vel * (0.16 - reg * 0.045);
    if (!(peak > 0)) return;

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, when);
    vca.gain.exponentialRampToValueAtTime(peak, when + 0.008 + (1 - reg) * 0.05);
    vca.gain.exponentialRampToValueAtTime(Math.max(0.00012, peak * 0.28), when + 0.3 + (1 - reg) * 0.6);
    vca.gain.exponentialRampToValueAtTime(0.0001, when + ring);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.Q.value = 0.5;
    tone.frequency.setValueAtTime(Math.min(13000, f * 14 + 1600), when);
    tone.frequency.exponentialRampToValueAtTime(Math.max(400, f * 3.4), when + 1.1 + (1 - reg) * 1.5);
    tone.connect(vca).connect(this.in);

    [[-1.4, 0.60], [0, 0.74], [1.7, 0.42]].forEach(([cents, g0], i) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(this._pw);
      o.frequency.value = f * (1 + i * 0.0003);
      o.detune.value = cents;
      const g = ctx.createGain(); g.gain.value = g0;
      o.connect(g).connect(tone);
      o.start(when); o.stop(when + ring + 0.1);
    });

    // the fundamental, for the left hand
    if (reg < 0.5 && f > 24) {
      const sub = ctx.createOscillator();
      sub.type = 'sine'; sub.frequency.value = f;
      const sg = ctx.createGain();
      const sa = peak * 0.55 * (1 - reg / 0.5), sd = ring * 0.8;
      sg.gain.setValueAtTime(0.0001, when);
      sg.gain.exponentialRampToValueAtTime(Math.max(0.00012, sa), when + 0.05);
      sg.gain.exponentialRampToValueAtTime(0.0001, when + sd);
      sub.connect(sg).connect(this.in);
      sub.start(when); sub.stop(when + sd + 0.1);
    }

    // the hammer
    const nse = ctx.createBufferSource();
    nse.buffer = this.e.noise.pink;
    const nb = ctx.createBiquadFilter();
    nb.type = 'bandpass'; nb.frequency.value = Math.min(6000, f * 4.5); nb.Q.value = 0.7;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(Math.max(0.00012, peak * 0.35 * Math.min(1, 0.25 + reg * 1.6)), when + 0.005);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
    nse.connect(nb).connect(ng).connect(this.in);
    nse.start(when, Math.random() * 2, 0.25); nse.stop(when + 0.3);
  }

  // ============================================================ knobs
  power(on) {
    if (on === this.on) return;
    this.on = on;
    if (on) {
      if (!this.e.ready) { this.on = false; return; }
      if (!this.in) this._build();
      this._alive = true;
      // the set warming up: a small thump, then the signal arrives
      const t = this.e.t;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(0.0001, t);
      this.out.gain.exponentialRampToValueAtTime(Math.max(0.0002, this.volume), t + 0.35);
      this.bar = 0;
      this.nextTime = t + 0.25;
      this.timer = setInterval(() => this._schedule(), 200);
      this._scheduleDropouts();
      if (this.station.band === 'talk') this._scheduleTalk();
      this._schedule();
    } else {
      const t = this.e.t;
      this.out?.gain.cancelScheduledValues(t);
      this.out?.gain.setTargetAtTime(0.0001, t, 0.06);
      clearInterval(this.timer); this.timer = null;
      this._alive = false;
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.on && this.out) this.out.gain.setTargetAtTime(this.volume, this.e.t, 0.08);
  }

  /** 1 = a local transmitter. 0.3 = the ridge, in weather. */
  setSignal(v) {
    this.signal = Math.max(0, Math.min(1, v));
    this._applySignal();
  }

  _applySignal() {
    if (!this.in) return;
    const t = this.e.t, s = this.signal;
    // a weak signal is noisier, narrower and quieter
    this.hissG.gain.setTargetAtTime(0.006 + (1 - s) * 0.075, t, 0.4);
    const floor = this.station.fm ? 4200 : 1100;
    this.hi.frequency.setTargetAtTime(floor + s * (this.station.tone - floor), t, 0.4);
    this.programme.gain.setTargetAtTime(this.station.band === 'none' ? 0 : 0.35 + s * 0.65, t, 0.4);
  }

  /** Move the set. Chapters can bolt this to a prop. */
  setPosition(pos) {
    this.pos = pos;
    const p = this.panner;
    if (!p || !pos) return;
    if (p.positionX) { p.positionX.value = pos[0]; p.positionY.value = pos[1]; p.positionZ.value = pos[2]; }
    else p.setPosition(pos[0], pos[1], pos[2]);
  }

  /** A wall or a door between you and it. */
  setOccluded(on, { cutoff = 700, amount = 0.55 } = {}) {
    if (!this.occl || on === this.occluded) return;
    this.occluded = on;
    const t = this.e.t;
    this.occl.frequency.setTargetAtTime(on ? cutoff : 14000, t, 0.2);
    this.mix.gain.setTargetAtTime(on ? amount : 1, t, 0.2);
  }

  /**
   * Turn the dial. With `sweep` you hear the set travel: the
   * programme drops out, the noise comes up and the band opens
   * right out, and then the new station lands. These are one-shot
   * scheduled ramps and not an oscillator, so it is a gesture and
   * never a pulse.
   */
  tune(id, { sweep = true } = {}) {
    if (!STATIONS[id]) return false;
    if (id === this.stationId) return true;
    const t = this.e.t;
    if (this.on && this.in && sweep) {
      this.programme.gain.cancelScheduledValues(t);
      this.programme.gain.setTargetAtTime(0.0001, t, 0.05);
      this.hissG.gain.cancelScheduledValues(t);
      this.hissG.gain.setTargetAtTime(0.11, t + 0.03, 0.05);
      // the band opening and closing again as the needle passes
      this.hi.frequency.cancelScheduledValues(t);
      this.hi.frequency.setTargetAtTime(5200, t, 0.08);
    }
    if (this.on && sweep) {
      // The landing runs off the audio clock, not off a timer. A
      // setTimeout here would throttle with the tab and leave the set
      // sitting in static until the player came back to the window.
      this.pending = id;
      this.tuneAt = t + 0.52;
    } else {
      this._land(id);
    }
    return true;
  }

  _land(id) {
    this.stationId = id;
    this.station = STATIONS[id];
    this.pending = null;
    this.tuneAt = 0;
    this.bar = 0;
    this.nextTime = this.e.t + 0.12;
    const S2 = this.station, t2 = this.e.t;
    if (this.wowBus) this.wowBus.gain.setTargetAtTime(S2.wow || 0, t2, 0.3);
    if (this.echoSend) this.echoSend.gain.setTargetAtTime(S2.echo || 0, t2, 0.3);
    if (this.echo && S2.bpm) this.echo.delayTime.setTargetAtTime((60 / S2.bpm) * 0.75, t2, 0.3);
    if (this.verbSend) this.verbSend.gain.setTargetAtTime(S2.verb || 0, t2, 0.3);
    this._ks?.clear();
    if (this.cone && this.set !== 'hifi') {
      this.cone.gain.setTargetAtTime(5 + this.station.presence * 4, this.e.t, 0.2);
    }
    if (this.hi) this.hi.frequency.cancelScheduledValues(this.e.t);
    this._applySignal();
    if (this.station.band === 'talk') this._scheduleTalk();
  }

  get nowPlaying() {
    return this.station.call ? `${this.station.call} · ${this.station.name}` : 'static';
  }

  dispose() {
    this._alive = false;
    clearInterval(this.timer); this.timer = null;
    const t = this.e?.t ?? 0;
    this.out?.gain.setTargetAtTime(0.0001, t, 0.15);
    const srcs = this.sources;
    setTimeout(() => {
      srcs?.forEach(s => { try { s.stop(); } catch {} });
      try { this.out?.disconnect(); this.panner?.disconnect(); } catch {}
    }, 700);
    this.in = null; this.sources = null;
  }

  // ============================================================ the band
  /** Attach the tape wobble to a pitched voice. */
  _wow(osc) { if (this.wowBus) this.wowBus.connect(osc.detune); }

  /** Where an offbeat eighth actually lands once the feel is applied. */
  _swung(beat) {
    const sw = this.station.swing || 0;
    const w = beat % 1;
    if (w > 0.42 && w < 0.58) return Math.floor(beat) + 0.5 + sw * 0.165;
    return beat;
  }

  /** Soft kick. Nothing above 200 Hz survives it. */
  _kick(when, vel) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(132, when);
    o.frequency.exponentialRampToValueAtTime(46, when + 0.075);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 210; lp.Q.value = 1.0;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.42), when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.30);
    o.connect(lp).connect(g).connect(this.in);
    o.start(when); o.stop(when + 0.34);
    const n = ctx.createBufferSource();
    n.buffer = this.e.noise.pink;
    const nb = ctx.createBiquadFilter();
    nb.type = 'lowpass'; nb.frequency.value = 900; nb.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, when);
    ng.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.09), when + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.035);
    n.connect(nb).connect(ng).connect(this.in);
    n.start(when, Math.random(), 0.1); n.stop(when + 0.12);
  }

  /** Snare, through a blanket. */
  _snare(when, vel, { ghost = false } = {}) {
    const ctx = this.ctx;
    const v = ghost ? vel * 0.32 : vel;
    const n = ctx.createBufferSource();
    n.buffer = this.e.noise.white;
    n.playbackRate.value = 0.85 + Math.random() * 0.2;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.6;
    const dull = ctx.createBiquadFilter();
    dull.type = 'lowpass'; dull.frequency.value = 3000; dull.Q.value = 0.6;
    const g = ctx.createGain();
    const d = ghost ? 0.055 : 0.14;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * 0.20), when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    n.connect(bp).connect(dull).connect(g).connect(this.in);
    n.start(when, Math.random() * 1.2, d + 0.1); n.stop(when + d + 0.15);
    [[192, 1], [287, 0.5]].forEach(([f, a]) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, when);
      og.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * 0.10 * a), when + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);
      o.connect(og).connect(this.in);
      o.start(when); o.stop(when + 0.1);
    });
  }

  /** Hat. Dusty, so it is band-limited well below where a real one lives. */
  _hat(when, vel, open = false) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.e.noise.white;
    n.playbackRate.value = 0.9 + Math.random() * 0.25;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 6400; bp.Q.value = 0.55;
    const lid = ctx.createBiquadFilter();
    lid.type = 'lowpass'; lid.frequency.value = 8200; lid.Q.value = 0.6;
    const g = ctx.createGain();
    const d = open ? 0.20 : 0.032 + Math.random() * 0.012;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.055), when + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    n.connect(bp).connect(lid).connect(g).connect(this.in);
    n.start(when, Math.random() * 1.2, d + 0.1); n.stop(when + d + 0.12);
  }

  /** Electric piano. The bark on the attack is the tine. */
  _rhodes(f, when, dur, vel) {
    const ctx = this.ctx;
    const d = dur + 1.0;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.115), when + 0.014);
    g.gain.exponentialRampToValueAtTime(Math.max(0.00012, vel * 0.045), when + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    g.connect(this.in);
    [[1, 1], [2, 0.22], [3, 0.07]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f * m;
      o.detune.value = (Math.random() * 2 - 1) * 3;
      this._wow(o);
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(g);
      o.start(when); o.stop(when + d + 0.1);
    });
    const t = ctx.createOscillator();
    t.type = 'sine'; t.frequency.value = f * 6.04;
    this._wow(t);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, when);
    tg.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.030), when + 0.006);
    tg.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    t.connect(tg).connect(this.in);
    t.start(when); t.stop(when + 0.26);
  }

  /** Round electric bass. All fundamental, no character above 400 Hz. */
  _bassNote(f, when, dur, vel) {
    const ctx = this.ctx;
    const d = dur + 0.35;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.34), when + 0.014);
    g.gain.exponentialRampToValueAtTime(Math.max(0.00012, vel * 0.16), when + 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    lp.connect(g).connect(this.in);
    [['sine', 1, 1], ['triangle', 1, 0.30], ['sine', 2, 0.10]].forEach(([type, m, a]) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f * m;
      this._wow(o);
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(when); o.stop(when + d + 0.1);
    });
  }

  /**
   * Dust. Irregular by construction: the positions are random inside
   * the bar, so there is no period for the ear to find.
   */
  _crackle(t0, span, amount) {
    const ctx = this.ctx;
    const n = Math.round(span * 14 * amount);
    for (let i = 0; i < n; i++) {
      const when = t0 + Math.random() * span;
      const src = ctx.createBufferSource();
      src.buffer = this.e.noise.white;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400 + Math.random() * 4200;
      bp.Q.value = 1.4 + Math.random() * 3;
      const g = ctx.createGain();
      const d = 0.004 + Math.random() * 0.014;
      const a = amount * (0.010 + Math.random() * 0.035);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, a), when + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, when + d);
      src.connect(bp).connect(g).connect(this.in);
      src.start(when, Math.random() * 1.5, d + 0.05); src.stop(when + d + 0.08);
    }
  }

  /* ============================================================ STRINGS
     A plucked string, modelled rather than approximated.

     Every other voice in this file is subtractive: an oscillator
     through a filter through an envelope. That is fine for a Rhodes
     and it is hopeless for a guitar, because what makes a guitar is
     behaviour a filter does not have. The high partials die much
     faster than the low ones. The pick position notches the spectrum.
     The attack is broadband noise that becomes pitched over about
     thirty milliseconds. Two notes of the same pitch are never
     identical, because the excitation is noise.

     Karplus-Strong gives all of that for almost nothing: excite a
     delay line one period long with a noise burst, then circulate it
     through a lowpass. The lowpass in the loop is the string losing
     its top on every pass, and that is the whole sound.

     Web Audio cannot do this in the graph: a DelayNode inside a
     feedback loop is clamped to one render quantum (128 samples,
     ~344 Hz at 44.1k), so every note above F4 would be wrong. The
     string is therefore rendered into an AudioBuffer here and played
     back as a sample, cached per pitch per preset.
     ============================================================ */
  _stringBuffer(freq, P) {
    const sr = this.ctx.sampleRate;
    const key = `${Math.round(freq * 4)}|${P.damp}|${P.pick}|${P.ring}`;
    this._ks = this._ks || new Map();
    const hit = this._ks.get(key);
    if (hit) return hit;

    const N = Math.max(2, Math.round(sr / freq));
    const seconds = Math.min(P.ring, 3.6);
    const len = Math.ceil(sr * seconds);
    const buf = this.ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    // ---- the pick ----
    // A noise burst, lowpassed by how soft the pick is: a thumb is
    // dull, a plectrum is bright.
    const line = new Float32Array(N);
    let lp = 0, mean = 0;
    const k = 0.08 + P.pick * 0.9;
    for (let i = 0; i < N; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * k;
      line[i] = lp; mean += lp;
    }
    // strip DC, or the string thumps on every note
    mean /= N;
    for (let i = 0; i < N; i++) line[i] -= mean;

    // ---- pick position ----
    // Plucking a fifth of the way along cancels every fifth harmonic.
    // This comb is why a string picked at the bridge is nasal and the
    // same string picked over the hole is round.
    const pp = Math.max(1, Math.round(N * 0.19));
    const exc = new Float32Array(N);
    for (let i = 0; i < N; i++) exc[i] = line[i] - line[(i + pp) % N] * 0.72;

    // ---- the loop ----
    // Loss per round trip is set from a target decay time, so a low
    // string rings longer than a high one all by itself.
    const g = Math.pow(10, -3 * N / (sr * P.ring));
    let idx = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = exc[idx];
      out[i] = cur;
      const filt = cur * (1 - P.damp) + prev * P.damp;   // string damping
      prev = filt;
      exc[idx] = filt * g;
      idx = idx + 1 === N ? 0 : idx + 1;
    }

    if (this._ks.size > 96) this._ks.clear();
    this._ks.set(key, buf);
    return buf;
  }

  /**
   * One note on the guitar. `dbl` doubles the string a few cents
   * either side, which is what a doubled guitar part is; the jazz
   * station uses barely any and the synthwave lead uses a lot.
   */
  _guitar(f, when, dur, vel, { lead = false } = {}) {
    const ctx = this.ctx;
    const P = this.station.gtr || { damp: .4, pick: .4, ring: 2.4, amp: 3200, dbl: 4 };
    const buf = this._stringBuffer(f, P);

    const amp = ctx.createBiquadFilter();
    amp.type = 'lowpass'; amp.frequency.value = P.amp; amp.Q.value = 0.7;
    const body = ctx.createBiquadFilter();
    body.type = 'peaking'; body.frequency.value = lead ? 1100 : 240;
    body.Q.value = 1.2; body.gain.value = lead ? 2.5 : 3.5;

    const g = ctx.createGain();
    const hold = Math.min(dur, P.ring);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * (lead ? 0.30 : 0.20)), when + 0.004);
    // the hand coming back down on the strings
    g.gain.setValueAtTime(Math.max(0.0002, vel * (lead ? 0.22 : 0.14)), when + hold * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, when + hold + (lead ? 0.30 : 0.10));

    amp.connect(body).connect(g);
    g.connect(this.in);
    if (lead && this.echoSend) g.connect(this.echoSend);

    const voices = P.dbl > 1 ? [[0, 1], [-P.dbl, 0.55], [P.dbl * 1.15, 0.48]] : [[0, 1]];
    voices.forEach(([cents, a], i) => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.detune.value = cents;
      this._wow(src);
      const vg = ctx.createGain(); vg.gain.value = a;
      src.connect(vg).connect(amp);
      // the doubles are a few milliseconds behind: two takes, not one
      src.start(when + (i ? 0.004 + Math.random() * 0.007 : 0));
      src.stop(when + hold + 0.6);
    });
  }

  /** A chord, strummed. Down on the beat, up off it. */
  _guitarChord(freqs, when, dur, vel, { up = false, spread = 0.014 } = {}) {
    const order = up ? [...freqs].reverse() : freqs;
    order.forEach((f, i) => {
      const v = vel * (up ? 0.72 : 1) * (0.85 + Math.random() * 0.3);
      this._guitar(f, when + i * spread * (0.8 + Math.random() * 0.4), dur, v);
    });
  }

  /* ============================================================ SYNTHS */
  /** Detuned saws through a filter envelope. The synthwave bass. */
  _sawBass(f, when, dur, vel) {
    const ctx = this.ctx;
    const d = dur + 0.10;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 7;
    lp.frequency.setValueAtTime(Math.min(4200, f * 16), when);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, f * 3), when + Math.min(0.22, d));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.20), when + 0.006);
    g.gain.setValueAtTime(Math.max(0.0002, vel * 0.20), when + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    lp.connect(g).connect(this.in);
    [-7, 7].forEach(c => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c;
      this._wow(o);
      o.connect(lp); o.start(when); o.stop(when + d + 0.05);
    });
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = f / 2;
    const sg = ctx.createGain(); sg.gain.value = 0.6;
    sub.connect(sg).connect(g);
    sub.start(when); sub.stop(when + d + 0.05);
  }

  /** The pad. Slow in, slow out, and very detuned. */
  _pad(freqs, when, dur, vel) {
    const ctx = this.ctx;
    const d = dur + 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.055), when + 0.30);
    g.gain.setValueAtTime(Math.max(0.0002, vel * 0.055), when + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    lp.connect(g).connect(this.in);
    freqs.forEach(f => [-9, 0, 9].forEach(c => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f;
      o.detune.value = c + (Math.random() * 4 - 2);
      this._wow(o);
      const og = ctx.createGain(); og.gain.value = 0.33;
      o.connect(og).connect(lp);
      o.start(when); o.stop(when + d + 0.1);
    }));
  }

  /** Gated snare: a big room, cut off before it can decay. */
  _gatedSnare(when, vel) {
    const ctx = this.ctx;
    const n = ctx.createBufferSource();
    n.buffer = this.e.noise.white;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.45;
    const g = ctx.createGain();
    // hold flat, then slam shut. that is the gate.
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.26), when + 0.004);
    g.gain.setValueAtTime(Math.max(0.0002, vel * 0.15), when + 0.15);
    g.gain.linearRampToValueAtTime(0.0001, when + 0.175);
    n.connect(bp).connect(g).connect(this.in);
    n.start(when, Math.random(), 0.3); n.stop(when + 0.3);
    [196, 268].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, when);
      og.gain.exponentialRampToValueAtTime(Math.max(0.0002, vel * 0.10 * (1 - i * 0.5)), when + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
      o.connect(og).connect(this.in);
      o.start(when); o.stop(when + 0.12);
    });
  }

  // ============================================================ transport
  _schedule() {
    const e = this.e;
    if (!this._alive || !e.ready || !this.in) return;
    // the needle arrives
    if (this.pending && e.t >= this.tuneAt) this._land(this.pending);
    const S = this.station;
    if (!S.bars.length) { this.nextTime = e.t + 0.5; return; }
    const AHEAD = 0.9;
    let guard = 0;
    while (this.nextTime < e.t + AHEAD && guard++ < 16) {
      this._bar(this.nextTime);
      this.nextTime += this.beat * S.meter;
      this.bar++;
    }
    if (guard >= 16) this.nextTime = e.t + 0.3;
  }

  _bar(t0) {
    const S = this.station;
    const ch = S.bars[this.bar % S.bars.length];
    const b = this.beat, m = S.meter;
    const j = () => (Math.random() - 0.5) * 0.018;
    const sw = (beat) => this._swung(beat);

    switch (S.band) {
      case 'piano': {
        // the hand rolls the chord rather than striking it, and the
        // left hand simply holds the bottom down through the bar
        this._piano(hz(ch.bass), t0 + j(), b * 3.6, 0.55);
        ch.tones.forEach((n, k) => this._piano(hz(n), t0 + k * 0.026 + j(), b * 3.0, 0.30));
        // a re-voicing halfway, quieter, so the bar does not sag
        if (m > 3) ch.tones.slice(1).forEach((n, k) =>
          this._piano(hz(n), t0 + b * 2 + k * 0.022 + j(), b * 1.8, 0.17));
        break;
      }

      case 'jazzguitar': {
        // upright on one and the and-of-three, guitar comping on the
        // offbeats, which is where a jazz guitarist actually plays
        this._bassNote(hz(ch.bass), t0 + j(), b * 1.5, 0.60);
        this._bassNote(hz(ch.bass) * 1.5, t0 + this._swung(2.5) * b + j(), b * 1.0, 0.38);
        const v = ch.tones.map(hz);
        this._guitarChord(v, t0 + this._swung(1.5) * b + j(), b * 0.55, 0.40);
        this._guitarChord(v, t0 + this._swung(3.5) * b + j(), b * 0.45, 0.30, { up: true });
        if (this.bar % 4 === 2) this._guitarChord(v, t0 + b * 0.5 + j(), b * 0.35, 0.24, { up: true });
        if (S.vinyl) this._crackle(t0, b * m, S.vinyl);
        break;
      }

      case 'synthwave': {
        // sixteenth bass, octave-jumping on the second half of the bar
        const step = b / 4;
        const root = hz(ch.bass);
        for (let k = 0; k < m * 4; k++) {
          const oct = (k >= m * 2 && k % 4 === 2) ? 2 : 1;
          this._sawBass(root * oct, t0 + k * step, step * 0.82, k % 4 === 0 ? 0.75 : 0.5);
        }
        this._pad(ch.tones.map(hz), t0 + j(), b * m * 0.92, 0.9);
        break;
      }

      case 'lofi': {
        const S2 = S;
        // bass on one, and a lazy pickup on the and-of-three
        this._bassNote(hz(ch.bass), t0 + j(), b * 1.7, 0.62);
        this._bassNote(hz(ch.bass), t0 + this._swung(2.5) * b + j(), b * 1.1, 0.40);
        // the chord, rolled, held across half the bar
        ch.tones.forEach((n, k) => this._rhodes(hz(n), t0 + 0.019 * k + j(), b * 2.2, 0.34));
        // a lighter re-hit, every other bar, so the loop is not a stamp
        if (this.bar % 2 === 1) ch.tones.forEach((n, k) =>
          this._rhodes(hz(n), t0 + this._swung(2.5) * b + 0.015 * k + j(), b * 1.2, 0.19));
        if (S2.vinyl) this._crackle(t0, b * m, S2.vinyl);
        break;
      }

   }

    // ---- the kit ----
    if (S.drums === 'boombap') {
      // harder and squarer than the lofi kit, and much less dragged
      const D = S.drag || 0;
      const at = (beat) => t0 + this._swung(beat) * b + D;
      this._kick(t0, 1.0);
      this._kick(at(1.5), 0.55);
      this._kick(at(2.5), 0.85);
      if (this.bar % 2 === 1) this._kick(at(3.75), 0.45);
      this._snare(at(1), 1.0);
      this._snare(at(3), 1.0);
      if (this.bar % 4 === 3) this._snare(at(3.5), 0.8, { ghost: true });
      for (let k = 0; k < m * 2; k++) this._hat(at(k * 0.5), k % 2 ? 0.34 : 0.5);
    } else if (S.drums === 'gated') {
      this._kick(t0, 1.0);
      this._kick(t0 + b * 2, 0.95);
      if (this.bar % 2 === 1) this._kick(t0 + b * 3.5, 0.6);
      this._gatedSnare(t0 + b, 0.95);
      this._gatedSnare(t0 + b * 3, 1.0);
      for (let k = 0; k < m * 2; k++) this._hat(t0 + k * 0.5 * b, k % 2 ? 0.26 : 0.42);
      if (this.bar % 8 === 7) {                       // the fill
        for (let k = 0; k < 4; k++) this._gatedSnare(t0 + b * 3 + k * b * 0.25, 0.5 + k * 0.16);
      }
    } else if (S.drums === 'lofi') {
      // Everything the drummer plays is late. That is the genre: the
      // kick sits on the grid and the snare and hats lean back off it,
      // so the loop drags against its own tempo.
      const D = S.drag || 0;
      const at = (beat) => t0 + this._swung(beat) * b + D;
      this._kick(t0 + D * 0.35, 0.95);
      this._kick(at(2.5), 0.60);
      if (this.bar % 4 === 3) this._kick(at(3.5), 0.42);
      this._snare(at(1), 0.85);
      this._snare(at(3), 0.90);
      if (this.bar % 2 === 1) this._snare(at(3.5), 0.7, { ghost: true });
      for (let k = 0; k < m * 2; k++) {
        const last = k === m * 2 - 1;
        this._hat(at(k * 0.5), k % 2 ? 0.30 : 0.46, last && this.bar % 4 === 3);
      }

    }

    // ---- the tune ----
    if (this.bar % 2 === 0 && S.phrases.length) {
      const ph = S.phrases[Math.floor(this.bar / 2) % S.phrases.length];
      ph.forEach(([n, beat, len, vel]) => {
        const when = t0 + sw(beat) * b + j();
        if (S.band === 'piano') this._piano(hz(n), when, len * b, vel * 1.35);
        else if (S.band === 'jazzguitar') this._guitar(hz(n), when, len * b, vel * 1.15, { lead: true });
        else if (S.band === 'synthwave') this._guitar(hz(n), when, len * b, vel * 1.3, { lead: true });
        else this._rhodes(hz(n), when, len * b, vel * 1.25);
      });
    }
  }

  /**
   * Talk: syllable-shaped bursts on an irregular clock, with the
   * pauses a broadcaster leaves. Not intelligible and not meant
   * to be. Rescheduled at random so it never gets a period.
   */
  _scheduleTalk() {
    if (this._talkTimer) clearTimeout(this._talkTimer);
    const run = () => {
      if (!this._alive || this.station.band !== 'talk' || !this.in) return;
      const t = this.e.t;
      const syllables = 3 + Math.floor(Math.random() * 9);
      let at = 0;
      const base = 96 + Math.random() * 40;
      for (let i = 0; i < syllables; i++) {
        const dur = 0.07 + Math.random() * 0.13;
        const f = base * (0.82 + Math.random() * 0.42);
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f;
        const fmt = this.ctx.createBiquadFilter();
        fmt.type = 'bandpass';
        fmt.frequency.value = 480 + Math.random() * 900;
        fmt.Q.value = 3.5;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(0.10 + Math.random() * 0.06, t + at + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
        o.connect(fmt).connect(g).connect(this.in);
        o.start(t + at); o.stop(t + at + dur + 0.03);
        at += dur + 0.015 + Math.random() * 0.05;
      }
      this._talkTimer = setTimeout(run, at * 1000 + 260 + Math.random() * 1500);
    };
    this._talkTimer = setTimeout(run, 200);
  }

  /**
   * A weak signal drops out now and then. Random interval, never a
   * period: the whole point is that you cannot predict it.
   */
  _scheduleDropouts() {
    const run = () => {
      if (!this._alive || !this.in) return;
      const chance = (1 - this.signal) * 0.8;
      if (Math.random() < chance) {
        const t = this.e.t;
        const d = 0.05 + Math.random() * 0.35;
        this.programme.gain.cancelScheduledValues(t);
        this.programme.gain.setTargetAtTime(0.02, t, 0.02);
        this.hissG.gain.setTargetAtTime(0.10, t, 0.02);
        setTimeout(() => { if (this._alive) this._applySignal(); }, d * 1000);
      }
      this._dropTimer = setTimeout(run, 1800 + Math.random() * 6000);
    };
    this._dropTimer = setTimeout(run, 2500 + Math.random() * 4000);
  }
}
