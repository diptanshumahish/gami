/* ============================================================
   music.js: the score.

   There are no audio files in this build, so the piano is
   synthesised. The instrument is deliberately NOT a concert
   grand: it is a felt-muted upright that has been in an unheated
   room for a long time. Soft hammers, dark partials, two or three
   strings a few cents apart, a slow tape-style wow on the tuning,
   and the key action audible under the notes.

   Everything runs into a long, dark hall with a pre-delay, and a
   modulated tail, so a single note takes five or six seconds to
   leave the room. That reverb is most of the character.

   The score is not one loop. There are eight written pieces and
   the game asks for one by scene name; they are all the same
   instrument in the same room, so moving between them reads as
   the same music changing its mind, not as a playlist.
   ============================================================ */

import { pianoBuffer, pianoRegister } from './piano.js';

// ---------------------------------------------------------------- pitch
const A4 = 440;
/** Scientific pitch: 'A3', 'C#4', 'Eb5' */
export function hz(note) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) return 440;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const oct = parseInt(m[3], 10);
  const midi = (oct + 1) * 12 + base + acc;
  return A4 * Math.pow(2, (midi - 69) / 12);
}

/* ============================================================
   THE PIECES

   Each one is: a chord cycle (bass / fifth / inner tones / a
   colour note), a library of melodic phrases laid over it, a
   left-hand figure, and the room settings the piece wants.

   `wet` is the reverb send, `tone` the lowpass over the whole
   piece, `box` how much music-box ring sits on top of each note,
   `rest` the chance a melody note simply does not arrive.
   ============================================================ */

const PIECES = {

  /* ---------------------------------------------------------- the theme.
     D minor, a waltz slow enough that it keeps losing the beat.
     This is what the game sounds like when it is being honest. */
  old_doll: {
    title: 'Old Doll',
    bpm: 50, meter: 3, left: 'waltz',
    wet: 0.62, tone: 2600, box: 0.55, felt: 0.55, rest: 0.04, vel: 1.0,
    bars: [
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],   colour: ['F5', 'A5'] },
      { bass: 'Bb1', fifth: 'F2', tones: ['Bb3', 'D4', 'F4'],  colour: ['D5', 'F5'] },
      { bass: 'F1',  fifth: 'C2', tones: ['F3', 'A3', 'C4'],   colour: ['A4', 'C5'] },
      { bass: 'C2',  fifth: 'G2', tones: ['C4', 'E4', 'G4'],   colour: ['E5', 'G5'] },
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],   colour: ['A5', 'D6'] },
      { bass: 'G1',  fifth: 'D2', tones: ['G3', 'Bb3', 'D4'],  colour: ['Bb4', 'D5'] },
      { bass: 'A1',  fifth: 'E2', tones: ['A3', 'C#4', 'E4'],  colour: ['C#5', 'E5'] },
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],   colour: ['F5', 'D5'] }
    ],
    phrases: [
      [['A5', 0, 2.5, .44], ['F5', 2.5, 1, .34], ['D5', 3.5, 2.5, .42]],
      [['Bb5', 0, 1.5, .40], ['A5', 1.5, 1.5, .36], ['F5', 3, 3, .38]],
      [['C6', 0, 2, .36], ['A5', 2, 1, .30], ['F5', 3, 1, .32], ['G5', 4, 2, .36]],
      [['E5', 0, 1, .34], ['F5', 1, 1, .34], ['G5', 2, 1, .32], ['A5', 3, 3, .44]],
      [],                                              // the room comes back
      [['D6', 0, 2.5, .34], ['C6', 2.5, 1.5, .30], ['A5', 4, 2, .36]],
      [['F5', 0, 1.5, .36], ['E5', 1.5, 1.5, .32], ['D5', 3, 3, .42]],
      []
    ]
  },

  /* ---------------------------------------------------------- Wash-Rite.
     Chapter One. Warm, low, unhurried. F major with the sixth
     hanging around. The only piece in the game that is kind. */
  wash_rite: {
    title: 'Wash-Rite',
    bpm: 58, meter: 4, left: 'broken',
    wet: 0.40, tone: 3400, box: 0.14, felt: 0.72, rest: 0.0, vel: 0.92,
    bars: [
      { bass: 'F1',  fifth: 'C2', tones: ['F3', 'A3', 'C4'],  colour: ['C5', 'A4'] },
      { bass: 'A1',  fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['E5', 'C5'] },
      { bass: 'Bb1', fifth: 'F2', tones: ['Bb3', 'D4', 'F4'], colour: ['D5', 'F5'] },
      { bass: 'C2',  fifth: 'G2', tones: ['C4', 'E4', 'G4'],  colour: ['G4', 'E5'] },
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['A4', 'F5'] },
      { bass: 'Bb1', fifth: 'F2', tones: ['Bb3', 'D4', 'F4'], colour: ['F5', 'Bb4'] },
      { bass: 'F1',  fifth: 'C2', tones: ['F3', 'A3', 'C4'],  colour: ['A4', 'C5'] },
      { bass: 'C2',  fifth: 'G2', tones: ['C4', 'E4', 'G4'],  colour: ['E5', 'G4'] }
    ],
    phrases: [
      [['C5', 0, 2, .36], ['A4', 2, 1.5, .30], ['F4', 3.5, 2.5, .34], ['G4', 6, 2, .30]],
      [['A4', 0.5, 1.5, .32], ['C5', 2, 2, .34], ['D5', 4, 2, .32], ['C5', 6, 2, .30]],
      [['F5', 0, 2, .34], ['E5', 2, 1, .28], ['D5', 3, 1, .28], ['C5', 4, 3.5, .34]],
      [],
      [['A4', 0, 1.5, .30], ['Bb4', 1.5, 1.5, .30], ['C5', 3, 3, .34]],
      [['D5', 0, 2, .32], ['C5', 2, 2, .30], ['A4', 4, 3, .32]],
      [],
      [['C5', 0, 1, .30], ['D5', 1, 1, .28], ['F5', 2, 4, .36]]
    ]
  },

  /* ---------------------------------------------------------- Small Hours.
     Chapters Two and Three, the town. A minor, the piece that
     will not resolve. */
  small_hours: {
    title: 'Small Hours',
    bpm: 50, meter: 4, left: 'broken',
    wet: 0.52, tone: 2900, box: 0.24, felt: 0.60, rest: 0.02, vel: 0.96,
    bars: [
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['B4', 'E5'] },
      { bass: 'F1', fifth: 'C2', tones: ['F3', 'A3', 'C4'],  colour: ['E5', 'A4'] },
      { bass: 'C2', fifth: 'G2', tones: ['C4', 'E4', 'G4'],  colour: ['D5', 'G4'] },
      { bass: 'G1', fifth: 'D2', tones: ['G3', 'B3', 'D4'],  colour: ['E5', 'B4'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['C5', 'E5'] },
      { bass: 'D2', fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['F5', 'D5'] },
      { bass: 'E1', fifth: 'B1', tones: ['E3', 'G#3', 'B3'], colour: ['G#4', 'B4'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['A4', 'C5'] }
    ],
    phrases: [
      [['E5', 0, 2, .38], ['C5', 2, 1, .30], ['B4', 3, 1.5, .32], ['A4', 4.5, 3.5, .38]],
      [['A4', 0.5, 1.5, .32], ['C5', 2, 1, .34], ['E5', 3, 2.5, .38], ['D5', 6, 2, .30]],
      [['C5', 0, 1.5, .34], ['B4', 1.5, 0.75, .26], ['A4', 2.25, 2.5, .36], ['G4', 5, 3, .30]],
      [],
      [['E5', 0, 1, .36], ['F5', 1, 1, .34], ['E5', 2, 1, .30], ['C5', 3, 4, .38]],
      [['A4', 1, 2, .30], ['G4', 3, 1, .26], ['F4', 4, 4, .32]],
      [['D5', 0, 2, .36], ['C5', 2, 1, .30], ['A4', 3, 1, .30], ['E5', 4, 4, .40]],
      []
    ]
  },

  /* ---------------------------------------------------------- Snow.
     Outdoors. Ridge Road, the block, the walk to the church.
     Almost nothing happens. That is the piece. */
  snow: {
    title: 'Snow on Ridge Road',
    bpm: 44, meter: 4, left: 'still',
    wet: 0.70, tone: 2200, box: 0.42, felt: 0.62, rest: 0.10, vel: 0.86,
    bars: [
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'E4', 'A4'],  colour: ['E5', 'B4'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['C5', 'E5'] },
      { bass: 'F1', fifth: 'C2', tones: ['F3', 'C4', 'F4'],  colour: ['A4', 'C5'] },
      { bass: 'G1', fifth: 'D2', tones: ['G3', 'D4', 'G4'],  colour: ['B4', 'D5'] },
      { bass: 'E1', fifth: 'B1', tones: ['E3', 'G3', 'B3'],  colour: ['G4', 'B4'] },
      { bass: 'C2', fifth: 'G2', tones: ['C4', 'G4', 'C5'],  colour: ['E5', 'G5'] },
      { bass: 'D2', fifth: 'A2', tones: ['D4', 'A4', 'D5'],  colour: ['F5', 'A5'] },
      { bass: 'E1', fifth: 'B1', tones: ['E3', 'B3', 'E4'],  colour: ['G#4', 'B4'] }
    ],
    phrases: [
      [['E5', 0, 4, .32], ['D5', 5, 3, .26]],
      [['C5', 1, 3, .28], ['B4', 5, 3, .24]],
      [],
      [['A5', 0, 5, .30]],
      [['G4', 2, 3, .26], ['E4', 6, 2, .22]],
      [],
      [['B4', 0, 2, .26], ['A4', 3, 4, .30]],
      []
    ]
  },

  /* ---------------------------------------------------------- Nine.
     The church. E minor, played mostly below middle C, with the
     left hand simply held down. */
  nine: {
    title: 'Nine',
    bpm: 40, meter: 4, left: 'drone',
    wet: 0.78, tone: 1900, box: 0.30, felt: 0.50, rest: 0.06, vel: 0.90,
    bars: [
      { bass: 'E1', fifth: 'B1',  tones: ['E3', 'G3', 'B3'],   colour: ['B4', 'E5'] },
      { bass: 'E1', fifth: 'B1',  tones: ['E3', 'G3', 'D4'],   colour: ['D5', 'G4'] },
      { bass: 'C2', fifth: 'G2',  tones: ['C3', 'G3', 'C4'],   colour: ['E4', 'G4'] },
      { bass: 'A1', fifth: 'E2',  tones: ['A3', 'C4', 'E4'],   colour: ['C5', 'E5'] },
      { bass: 'E1', fifth: 'B1',  tones: ['E3', 'G3', 'B3'],   colour: ['G4', 'B4'] },
      { bass: 'B1', fifth: 'F#2', tones: ['B3', 'D4', 'F#4'],  colour: ['D5', 'F#5'] },
      { bass: 'C2', fifth: 'G2',  tones: ['C4', 'E4', 'G4'],   colour: ['E5', 'G5'] },
      { bass: 'B1', fifth: 'F#2', tones: ['B3', 'D#4', 'F#4'], colour: ['D#5', 'F#4'] }
    ],
    phrases: [
      [['B4', 0, 4, .30], ['G4', 4, 4, .26]],
      [['E5', 0, 3, .28], ['D5', 4, 4, .26]],
      [],
      [['C5', 0, 2, .28], ['B4', 2, 2, .24], ['A4', 4, 4, .30]],
      [['G4', 0, 6, .26]],
      [['F#5', 0, 3, .28], ['D5', 4, 4, .26]],
      [],
      [['E5', 0, 8, .30]]
    ]
  },

  /* ---------------------------------------------------------- Doll's House.
     9 Kesslerton Row, and Recca's room. The theme again, an
     octave and a half up, with the mechanism failing: notes are
     simply missing, and the tuning drifts further than anywhere
     else in the game. */
  doll_house: {
    title: "Doll's House",
    bpm: 48, meter: 3, left: 'sparse',
    wet: 0.74, tone: 3200, box: 1.0, felt: 0.30, rest: 0.20, vel: 0.78, drift: 2.6,
    bars: [
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['A5', 'D6'] },
      { bass: 'Bb1', fifth: 'F2', tones: ['Bb3', 'D4', 'F4'], colour: ['F5', 'Bb5'] },
      { bass: 'F1',  fifth: 'C2', tones: ['F3', 'A3', 'C4'],  colour: ['C6', 'A5'] },
      { bass: 'C2',  fifth: 'G2', tones: ['C4', 'E4', 'G4'],  colour: ['G5', 'E5'] },
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['D6', 'A5'] },
      { bass: 'G1',  fifth: 'D2', tones: ['G3', 'Bb3', 'D4'], colour: ['Bb5', 'D5'] },
      { bass: 'A1',  fifth: 'E2', tones: ['A3', 'C#4', 'E4'], colour: ['C#6', 'E5'] },
      { bass: 'D2',  fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['F5', 'D6'] }
    ],
    phrases: [
      [['A6', 0, 2.5, .30], ['F6', 2.5, 1, .24], ['D6', 3.5, 2.5, .28]],
      [['Bb6', 0, 1.5, .26], ['A6', 1.5, 1.5, .24], ['F6', 3, 3, .26]],
      [['D6', 0, 2, .26], ['A5', 2, 1, .22], ['F5', 3, 1, .22], ['G5', 4, 2, .24]],
      [],
      [['E6', 0, 1, .24], ['F6', 1, 1, .24], ['G6', 2, 1, .22], ['A6', 3, 3, .30]],
      [],
      [['F6', 0, 1.5, .26], ['E6', 1.5, 1.5, .22], ['D6', 3, 3, .28]],
      []
    ]
  },

  /* ---------------------------------------------------------- The Ninth Hour.
     Chapter Five after 2:41. The theme's key, but the piece has
     stopped agreeing with itself: a flat fifth under the tonic,
     a Neapolitan where the subdominant should be. */
  ninth_hour: {
    title: 'The Ninth Hour',
    bpm: 38, meter: 4, left: 'drone',
    wet: 0.82, tone: 1600, box: 0.36, felt: 0.44, rest: 0.08, vel: 1.05, drift: 1.8,
    bars: [
      { bass: 'D1',  fifth: 'A1',  tones: ['D3', 'F3', 'A3'],   colour: ['F4', 'A4'] },
      { bass: 'D1',  fifth: 'Ab1', tones: ['D3', 'F3', 'Ab3'],  colour: ['Ab4', 'D5'] },
      { bass: 'Bb1', fifth: 'F2',  tones: ['Bb2', 'D3', 'F3'],  colour: ['D4', 'F4'] },
      { bass: 'A1',  fifth: 'E2',  tones: ['A2', 'C#3', 'G3'],  colour: ['Bb4', 'C#5'] },
      { bass: 'D1',  fifth: 'A1',  tones: ['D3', 'F3', 'A3'],   colour: ['A4', 'D5'] },
      { bass: 'G1',  fifth: 'D2',  tones: ['G2', 'Bb2', 'D3'],  colour: ['Bb4', 'D5'] },
      { bass: 'Eb1', fifth: 'Bb1', tones: ['Eb3', 'G3', 'Bb3'], colour: ['G4', 'Bb4'] },
      { bass: 'A1',  fifth: 'E2',  tones: ['A2', 'C#3', 'E3'],  colour: ['C#5', 'E5'] }
    ],
    phrases: [
      [['A4', 0, 4, .32], ['F4', 4, 4, .28]],
      [['Ab4', 0, 6, .30]],
      [],
      [['Bb4', 0, 3, .32], ['A4', 4, 4, .30]],
      [['D5', 0, 4, .30], ['C5', 5, 3, .26]],
      [],
      [['Bb4', 0, 2, .28], ['G4', 2, 2, .26], ['Eb4', 4, 4, .30]],
      [['C#5', 0, 8, .34]]
    ]
  },

  /* ---------------------------------------------------------- Nothing to Say.
     Chapter Six. Two voices. No colour notes, no ornament, and
     it never gets louder. */
  nothing_to_say: {
    title: 'Nothing to Say',
    bpm: 44, meter: 4, left: 'still',
    wet: 0.56, tone: 2400, box: 0.10, felt: 0.66, rest: 0.0, vel: 0.72, plain: true,
    bars: [
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['C5', 'E5'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['B4', 'E5'] },
      { bass: 'F1', fifth: 'C2', tones: ['F3', 'A3', 'C4'],  colour: ['A4', 'C5'] },
      { bass: 'G1', fifth: 'D2', tones: ['G3', 'B3', 'D4'],  colour: ['B4', 'D5'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['E5', 'A5'] },
      { bass: 'D2', fifth: 'A2', tones: ['D4', 'F4', 'A4'],  colour: ['F5', 'A4'] },
      { bass: 'E1', fifth: 'B1', tones: ['E3', 'G#3', 'B3'], colour: ['G#4', 'B4'] },
      { bass: 'A1', fifth: 'E2', tones: ['A3', 'C4', 'E4'],  colour: ['A4', 'C5'] }
    ],
    phrases: [
      [['A4', 0, 4, .28], ['G4', 4, 4, .24]],
      [],
      [['C5', 0, 3, .26], ['A4', 4, 4, .28]],
      [['B4', 0, 2, .26], ['A4', 2, 2, .24], ['E4', 4, 4, .26]],
      [['E5', 0, 6, .28]],
      [],
      [['G#4', 0, 4, .26], ['B4', 4, 4, .24]],
      [['A4', 0, 8, .30]]
    ]
  }
};

/** Scene name → piece. Anything unknown falls back to the theme. */
export const SCENES = {
  menu:       'old_doll',
  letter:     'old_doll',
  ending:     'old_doll',
  credits:    'old_doll',

  ch1:        'wash_rite',
  ch2:        'small_hours',
  ch3:        'small_hours',
  ch4:        'snow',
  ch5:        'nine',
  ch6:        'nothing_to_say',

  home:       'wash_rite',
  laundromat: 'wash_rite',
  street:     'snow',
  outside:    'snow',
  town:       'small_hours',
  church:     'nine',
  vasko:      'doll_house',
  reccas_room:'doll_house',
  ninth_hour: 'ninth_hour',
  dread:      'ninth_hour',
  // the car. there is no score on the road: the radio is the music,
  // if he has it on, and if he has not it is the engine and the wind.
  drive:      null,
  silent:     null
};

export const PIECE_IDS = Object.keys(PIECES);

/** The pieces were written against a much darker instrument. Now
 *  that the strings are real the lid comes up a little: every
 *  piece's `tone` is opened by this much. */
const TONE_OPEN = 1.6;
export function pieceFor(scene) {
  if (!scene) return PIECES.old_doll;
  if (scene in SCENES && SCENES[scene] === null) return null;     // a scene that asks for nothing
  return PIECES[SCENES[scene] || scene] || PIECES.old_doll;
}

export class Music {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.e = engine;
    this.playing = false;
    this.intensity = 0;        // 0 calm → 1 the aisle at three in the morning
    this.scene = 'menu';
    this.piece = PIECES.old_doll;
    this.silent = false;        // a scene with no piece: the score holds its breath
    this.pending = null;
    this.swapAt = 0;
    this.pieceBar = 0;
    this.nextTime = 0;
    this.timer = null;
    this.out = null;
  }

  get ctx() { return this.e.ctx; }
  get bpm() { return this.piece.bpm - this.intensity * 6; }   // it slows down, it never speeds up
  get beat() { return 60 / this.bpm; }

  // ------------------------------------------------------------ the room
  /**
   * A long, dark hall. Unlike the game's other impulses this one
   * gets progressively duller as it decays, which is what makes a
   * held piano note turn into weather instead of into noise.
   */
  _hall(secs = 5.6, decay = 2.9) {
    const ctx = this.ctx;
    const n = Math.max(1, Math.floor(ctx.sampleRate * secs));
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const p = i / n;
        const env = Math.pow(1 - p, decay);
        // the tail closes down as it goes: 0.42 open → 0.03 at the end
        const k = 0.42 * (1 - p) * (1 - p) + 0.03;
        lp += ((Math.random() * 2 - 1) * env - lp) * k;
        d[i] = lp * 3.2;
      }
      // a handful of early reflections, offset per channel so it is wide
      for (let r = 1; r < 9; r++) {
        const off = Math.floor(ctx.sampleRate * (0.011 * r + c * 0.0031) * (1 + r * 0.14));
        if (off < n) d[off] += (0.38 / r) * (Math.random() > 0.5 ? 1 : -1);
      }
    }
    return b;
  }

  /**
   * One key, pressed.
   * `dur` is how long it is held; the tail rings well past it,
   * because the pedal is down for the whole game.
   *
   * The string itself comes from piano.js, rendered once per pitch
   * and played back as a sample. What happens here is the playing:
   * how hard the key went down (which is the hammer lowpass opening),
   * the swell on the bass, the tape wow, the music box on top, and
   * the room it all lands in.
   */
  note(freq, when, dur = 2.0, vel = 0.5, opts = {}) {
    const e = this.e, ctx = this.ctx;
    if (!ctx || !this.out) return;
    const P = this.piece;
    const out = opts.dest || this.dry;
    const box = opts.box ?? P.box ?? 0.3;
    const felt = opts.felt ?? P.felt ?? 0.55;
    const buf = pianoBuffer(ctx, freq, 'felt');
    if (!buf) return;

    // 0 at the bottom of the keyboard, 1 at the top
    const reg = pianoRegister(freq);
    const ring = Math.min(buf.duration - 0.05, dur + (1 - reg) * 4.6 + 1.6);
    const peak = vel * (0.42 - reg * 0.12) * (1 + (1 - reg) * 0.25);
    // A felt hammer is a soft strike, not a click, and the lower the
    // note the softer: a few milliseconds at the top, a fifth of that
    // again at the bottom. It is still a strike. This is the line that
    // decides whether the low end is a piano or a pad.
    const att = opts.att ?? (0.004 + felt * 0.006 + Math.pow(1 - reg, 2) * 0.05);
    if (!(peak > 0)) return;

    const vca = ctx.createGain();
    vca.gain.setValueAtTime(0.0001, when);
    vca.gain.exponentialRampToValueAtTime(peak, when + att);
    vca.gain.setValueAtTime(peak, when + ring);
    vca.gain.exponentialRampToValueAtTime(0.0001, when + ring + 0.45);

    // velocity is tone: a quiet note is a darker note. the felt strip
    // takes the top off everything
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.Q.value = 0.45;
    const open = (900 + freq * 3.6) * (0.7 + vel * 1.4) * (1.3 - felt * 0.6) * (1 - this.intensity * 0.18);
    tone.frequency.setValueAtTime(Math.min(9000, Math.max(freq * 2.2, open)), when);
    tone.frequency.exponentialRampToValueAtTime(Math.max(240, freq * 1.9), when + 1.4 + (1 - reg) * 2.2);
    tone.connect(vca).connect(out);

    // ---- the string ----
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (this.wowBus) this.wowBus.connect(src.detune);   // tape wow, shared by everything
    src.connect(tone);
    src.start(when);
    src.stop(when + ring + 0.5);

    // ---- the bottom of the instrument ----
    // A felt upright loses some of its fundamental to the hammer, and
    // the lowest notes end up as a shape rather than a pitch. A clean
    // sine underneath, past the tone filter, puts the floor back.
    if (reg < 0.42 && freq > 24) {
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = freq;
      if (this.wowBus) this.wowBus.connect(sub.detune);
      const sg = ctx.createGain();
      const sa = peak * 0.34 * (1 - reg / 0.42);
      const sd = ring * 0.9;
      sg.gain.setValueAtTime(0.0001, when);
      sg.gain.exponentialRampToValueAtTime(Math.max(0.00012, sa), when + Math.max(att, 0.09));
      sg.gain.exponentialRampToValueAtTime(Math.max(0.00012, sa * 0.5), when + 1.2 + (1 - reg) * 1.6);
      sg.gain.exponentialRampToValueAtTime(0.0001, when + sd);
      sub.connect(sg).connect(out);
      sub.start(when); sub.stop(when + sd + 0.1);
    }

    // ---- the music box on top. this is the doll. ----
    if (box > 0.02 && reg > 0.18) {
      [[2.0, 0.55, 1.0], [3.02, 0.28, 0.62], [5.07, 0.11, 0.38]].forEach(([m, a, decMul]) => {
        const f = freq * m;
        if (f > 11000) return;
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = (Math.random() * 2 - 1) * 5 * (1 + (P.drift || 0));
        if (this.wowBus) this.wowBus.connect(o.detune);
        const g = ctx.createGain();
        const bp = peak * a * box * 0.32;
        const bd = (1.1 + (1 - reg) * 1.6) * decMul;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(Math.max(0.00012, bp), when + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, when + bd);
        o.connect(g).connect(out);
        o.start(when); o.stop(when + bd + 0.05);
      });
    }
  }

  /** The key action: wood, felt and a hinge, under everything. Very quiet. */
  _action(when, amount = 1) {
    const e = this.e, ctx = this.ctx;
    if (!ctx || !this.dry || !e.noise?.pink) return;
    const n = ctx.createBufferSource();
    n.buffer = e.noise.pink;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 190 + Math.random() * 260; f.Q.value = 1.1;
    const g = ctx.createGain();
    const a = 0.012 * amount;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(a, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
    n.connect(f).connect(g).connect(this.dry);
    n.start(when, Math.random() * 2, 0.4);
    n.stop(when + 0.4);
  }

  // ------------------------------------------------------------ transport
  start() {
    const e = this.e;
    if (!e.ready || this.playing) return;
    const ctx = this.ctx;
    this.playing = true;

    // master for the score. everything the piece plays goes through here.
    this.out = ctx.createGain();
    this.out.gain.value = 0.0;

    // the instrument's own voice: warm underneath, no glare on top
    const body = ctx.createBiquadFilter();
    body.type = 'lowshelf'; body.frequency.value = 260; body.gain.value = 5.5;
    const glare = ctx.createBiquadFilter();
    glare.type = 'peaking'; glare.frequency.value = 3000; glare.Q.value = 0.9; glare.gain.value = -2.5;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'lowpass'; this.tone.frequency.value = this.piece.tone * TONE_OPEN; this.tone.Q.value = 0.4;

    // dry: where every note is written
    this.dry = ctx.createGain();
    this.dry.gain.value = 1;
    this.dry.connect(body).connect(glare).connect(this.tone).connect(this.out);
    this.out.connect(e.bus.music);

    // ---- the hall ----
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._hall(5.8, 2.9);
    const pre = ctx.createDelay(0.5);
    pre.delayTime.value = 0.055;                    // the room arrives late
    this.wetSend = ctx.createGain();
    this.wetSend.gain.value = this.piece.wet;
    const rumble = ctx.createBiquadFilter();        // keep the bass out of the tail
    rumble.type = 'highpass'; rumble.frequency.value = 240; rumble.Q.value = 0.6;
    const tail = ctx.createBiquadFilter();
    tail.type = 'lowpass'; tail.frequency.value = 2400; tail.Q.value = 0.5;

    // The tail drifts very slightly, so it does not sit perfectly
    // still. This is the only periodic modulation left anywhere in
    // the game, it is on the wet return only, and the depth is well
    // under a millisecond: enough to stop the reverb sounding frozen,
    // far too little to hear as a sweep.
    const warp = ctx.createDelay(0.1);
    warp.delayTime.value = 0.014;
    const wl = ctx.createOscillator(); wl.type = 'sine'; wl.frequency.value = 0.19;
    const wg = ctx.createGain(); wg.gain.value = 0.0006;
    wl.connect(wg).connect(warp.delayTime); wl.start();

    this.tone.connect(this.wetSend).connect(rumble).connect(pre).connect(this.verb)
      .connect(tail).connect(warp).connect(this.out);

    // a long, dark echo under the hall. the church stairwell.
    const echo = ctx.createDelay(2.0);
    echo.delayTime.value = 0.62;
    const fb = ctx.createGain(); fb.gain.value = 0.30;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 1300;
    const es = ctx.createGain(); es.gain.value = 0.16;
    this.tone.connect(es).connect(echo).connect(ef).connect(fb).connect(echo);
    ef.connect(this.out);
    this.echoSend = es;

    // ---- tape wow. every oscillator in the score reads this. ----
    this.wowBus = ctx.createGain();
    this.wowBus.gain.value = 1;
    const mkWow = (rate, cents) => {
      const l = ctx.createOscillator(); l.type = 'sine'; l.frequency.value = rate;
      const g = ctx.createGain(); g.gain.value = cents;
      l.connect(g).connect(this.wowBus); l.start();
      return l;
    };
    this.wowOscs = [mkWow(0.21, 4.2), mkWow(0.073, 2.6), mkWow(5.4, 0.8)];

    this.out.gain.setTargetAtTime(1, e.t, 2.2);

    this.pieceBar = 0;
    this.nextTime = e.t + 0.4;
    this.timer = setInterval(() => this._schedule(), 200);
    this._schedule();
  }

  stop(fade = 3) {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    const o = this.out, w = this.wowOscs;
    if (o) o.gain.setTargetAtTime(0, this.e.t, fade / 3);
    setTimeout(() => {
      try { w?.forEach(l => l.stop()); } catch {}
      try { o?.disconnect(); } catch {}
    }, fade * 1000 + 500);
    this.out = this.dry = this.tone = this.wetSend = this.wowBus = null;
    this.wowOscs = null;
  }

  // ------------------------------------------------------------ scenes
  /**
   * Ask for a piece by scene name. Without `immediate` the change
   * lands on the next bar line, which is almost always what you
   * want because the tails carry across it. With `immediate` the
   * score falls silent for a beat and the new piece starts clean,
   * which is what a chapter change should feel like.
   */
  setScene(scene, { immediate = false } = {}) {
    const p = pieceFor(scene);
    this.scene = scene;
    if (!p) {
      // nothing to play. the tails go on into the hall and then it is quiet.
      this.pending = null; this.swapAt = 0;
      if (!this.silent) {
        this.silent = true;
        if (this.out) {
          const t = this.e.t;
          this.out.gain.cancelScheduledValues(t);
          this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
          this.out.gain.setTargetAtTime(0.0001, t, immediate ? 0.4 : 1.6);
        }
      }
      return;
    }
    if (this.silent) {
      // coming back from nothing: start clean on the new piece
      this.silent = false;
      this.piece = p; this.pending = null; this.swapAt = 0; this.pieceBar = 0;
      if (this.out) {
        const t = this.e.t;
        this.nextTime = t + 0.3;
        this.wetSend.gain.setTargetAtTime(p.wet, t, 0.5);
        this.tone.frequency.setTargetAtTime(p.tone * TONE_OPEN * (1 - this.intensity * 0.25), t, 0.5);
        this.echoSend.gain.setTargetAtTime(0.10 + p.wet * 0.14, t, 0.5);
        this.out.gain.cancelScheduledValues(t);
        this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
        this.out.gain.setTargetAtTime(1, t, 1.2);
      }
      return;
    }
    if (p === this.piece && !this.pending) { this.pending = null; this.swapAt = 0; return; }
    this.pending = p;
    if (immediate && this.out) {
      const t = this.e.t;
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setValueAtTime(this.out.gain.value, t);
      this.out.gain.setTargetAtTime(0.0, t, 0.30);
      this.swapAt = t + 1.3;
    } else {
      this.swapAt = 0;
    }
  }

  /** What is playing, for the diagnostics overlay. */
  get nowPlaying() { return this.silent ? '' : (this.piece?.title || ''); }

  _swap() {
    this.piece = this.pending;
    this.pending = null;
    this.swapAt = 0;
    this.pieceBar = 0;
    if (!this.out) return;
    const t = this.e.t;
    this.wetSend.gain.setTargetAtTime(this.piece.wet, t, 0.5);
    this.tone.frequency.setTargetAtTime(this.piece.tone * TONE_OPEN * (1 - this.intensity * 0.25), t, 0.5);
    this.echoSend.gain.setTargetAtTime(0.10 + this.piece.wet * 0.14, t, 0.5);
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), t);
    this.out.gain.setTargetAtTime(1, t, 0.7);
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
    if (this.tone && this.piece) {
      this.tone.frequency.setTargetAtTime(this.piece.tone * TONE_OPEN * (1 - this.intensity * 0.25), this.e.t, 1.5);
    }
  }

  /** Duck the score under dialogue so lines stay legible. */
  duckFor(seconds = 1.6, amount = 0.45) {
    if (!this.out || this.swapAt) return;
    const t = this.e.t;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(amount, t, 0.12);
    this.out.gain.setTargetAtTime(1, t + seconds, 0.5);
  }

  _schedule() {
    const e = this.e;
    if (!this.playing || !e.ready || !this.out) return;
    if (this.silent) { this.nextTime = e.t + 0.3; return; }

    // a hard change: schedule nothing while the old piece falls away
    if (this.pending && this.swapAt) {
      if (e.t < this.swapAt) return;
      this._swap();
      this.nextTime = e.t + 0.15;
    }

    const AHEAD = 0.9;
    let guard = 0;
    while (this.nextTime < e.t + AHEAD && guard++ < 16) {
      if (this.pending) this._swap();       // soft change, on the bar line
      this._bar(this.nextTime);
      this.nextTime += this.beat * this.piece.meter;
      this.pieceBar++;
    }
    if (guard >= 16) this.nextTime = e.t + 0.3;   // we fell behind; catch up quietly
  }

  _bar(t0) {
    const P = this.piece;
    const index = this.pieceBar;
    const ch = P.bars[index % P.bars.length];
    const b = this.beat;
    const m = P.meter;
    const I = this.intensity;
    const v = (P.vel ?? 1) * (0.86 + I * 0.22);
    const drop = () => Math.random() < (P.rest || 0) * (1 + I * 0.5);
    // human timing. the bigger the drift, the less the player is on the grid.
    const j = () => (Math.random() - 0.5) * (0.028 + (P.drift || 0) * 0.02);

    // ---------------------------------------------------------- left hand
    switch (P.left) {
      case 'waltz':
        this.note(hz(ch.bass), t0 + j(), b * 2.2, 0.34 * v);
        for (let k = 1; k < m; k++) {
          if (drop()) continue;
          this.note(hz(ch.tones[k % ch.tones.length]), t0 + k * b + j(), b * 0.85, 0.15 * v);
        }
        break;

      case 'broken': {
        this.note(hz(ch.bass), t0 + j(), b * 2.6, 0.32 * v);
        this.note(hz(ch.fifth), t0 + b * 1.5 + j(), b * 1.6, 0.18 * v);
        const pat = m === 3 ? [0, 1, 2] : [0, 1, 2, 1];
        pat.forEach((ti, k) => {
          if (drop()) return;
          this.note(hz(ch.tones[ti]), t0 + k * b + j(), b * 1.1, (0.17 + (k === 0 ? 0.05 : 0)) * v);
        });
        break;
      }

      case 'still':
        this.note(hz(ch.bass), t0 + j(), b * 3.2, 0.30 * v);
        this.note(hz(ch.fifth), t0 + b * (m / 2) + j(), b * 2.2, 0.16 * v);
        if (index % 2 === 0 && !drop()) this.note(hz(ch.tones[1]), t0 + b * (m - 1) + j(), b * 1.6, 0.13 * v);
        break;

      case 'drone':
        // both hands simply held. the bar line is the only thing moving.
        this.note(hz(ch.bass), t0 + j(), b * (m + 1), 0.30 * v);
        if (index % 2 === 0) this.note(hz(ch.fifth), t0 + 0.06 + j(), b * m, 0.15 * v);
        if (index % 4 === 0) this.note(hz(ch.tones[0]), t0 + b * 0.5 + j(), b * m, 0.12 * v);
        break;

      case 'sparse':
        // the mechanism is missing teeth
        if (index % 2 === 0) this.note(hz(ch.bass), t0 + j(), b * 2.4, 0.22 * v);
        if (index % 4 === 2 && !drop()) this.note(hz(ch.tones[0]), t0 + b + j(), b * 1.4, 0.12 * v);
        break;
    }

    // ---------------------------------------------------------- melody
    if (index % 2 === 0) {
      const ph = P.phrases[Math.floor(index / 2) % P.phrases.length];
      ph.forEach(([n, beat, len, vel]) => {
        if (drop()) return;
        this.note(hz(n), t0 + beat * b + j(), len * b, vel * v);
      });
    }

    // ---------------------------------------------------------- the colour note
    if (!P.plain && index % 4 === 3) {
      this.note(hz(ch.colour[0]), t0 + b * (m - 1.5) + j(), b * 2.2, 0.24 * v);
    }

    // ---------------------------------------------------------- the octave
    // The left hand is doubled an octave down wherever there is room
    // for it. Below about 40 Hz there is no note left, only cone
    // movement, so pieces that already sit on D1 and E1 are left
    // alone and get their weight from the sub inside note() instead.
    const bassHz = hz(ch.bass);
    if (bassHz > 48) {
      // half a second to fade in, so it reads as the room getting
      // deeper rather than as a second note being played
      this.note(bassHz / 2, t0 + 0.012 + j(), b * (m + 0.5), 0.20 * v,
        { box: 0, felt: 0.9, att: 0.5 });
    }

    // ---------------------------------------------------------- pressure
    // under intensity the instrument does not get louder, it gets lower
    if (I > 0.3 && index % 2 === 1) {
      this.note(bassHz / (bassHz > 48 ? 2 : 1), t0 + j(), b * (m + 2), 0.15 * I * v, { box: 0, att: 0.6 });
    }
    if (I > 0.7 && index % 8 === 7) {
      // the flat fifth, once, at the bottom. it is not in the key.
      this.note(hz(ch.bass) * 1.4142, t0 + b * (m - 1), b * 2, 0.09 * I, { box: 0, att: 0.45 });
    }

    // ---------------------------------------------------------- the player
    this._action(t0 - 0.03, 0.8 + Math.random() * 0.5);
    if (Math.random() < 0.22) this._action(t0 + b * (0.5 + Math.random() * (m - 1)), 0.5);
  }
}
