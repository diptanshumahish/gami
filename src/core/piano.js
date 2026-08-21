/* ============================================================
   piano.js: the instrument, rendered.

   Every pitched voice in the game used to be an oscillator through
   a filter through an envelope. That is fine for a Rhodes and it is
   hopeless for a piano, because what makes a piano a piano is
   behaviour an oscillator does not have:

     · the partials are not harmonic. A stiff steel string rings
       sharp of the series, and the higher the partial the sharper
       (f_n = n f0 sqrt(1 + B n^2)). This is the single biggest
       reason a PeriodicWave sounds like an organ and a piano does
       not.
     · every partial decays at its own rate, the top ones fastest,
       so the note changes colour as it goes.
     · a note has two or three strings on it, a few cents apart,
       and the partials beat slowly against each other. The
       in-phase part dies quickly (the prompt sound) and the
       out-of-phase part lingers (the aftersound), which is the
       piano's famous double decay.
     · the hammer hits the string about an eighth of the way along,
       which notches the spectrum, and it is a felt cushion, which
       is a lowpass that opens with velocity.
     · there is a knock: the hammer and the soundboard, before the
       string is even ringing.

   All of that is cheap to render into a buffer and expensive to do
   in the graph, so, like the guitar in radio.js, the note is
   computed here once per pitch per preset, cached, and played back
   as a sample. What the player then does at runtime (velocity
   tone, envelope, pedal, tape wow, the room) is the caller's job.

   Two presets. `felt` is the score: a felt-muted upright in an
   unheated room, dark and soft with a thumpy hammer. `grand` is
   the radio: a close-miked grand on a record somebody made on
   purpose, brighter, with a real attack and longer partials.
   ============================================================ */

export const PIANO_PRESETS = {
  felt: {
    partials: 22,      // how far up the series we bother to go
    fmax: 6800,        // and where the felt simply stops it
    strike: 0.092,     // hammer position along the string (1 = the far end)
    tilt: 1.38,        // amplitude falls as 1/n^tilt before the hammer filter
    hardness: 0.80,    // the hammer lowpass, as a multiple of the default corner
    decay: 0.85,       // multiplier on the fundamental's decay time
    upperLoss: 1.0,    // how much faster the upper partials die
    unison: 1.9,       // cents between the strings of one note
    attack: 0.006,     // seconds. felt hammers do not click
    knock: 0.26,       // hammer noise, relative to the string
    thump: 0.45,       // soundboard knock, relative to the string
    maxLen: 7.0
  },
  grand: {
    partials: 32,
    fmax: 11000,
    strike: 0.118,
    tilt: 0.95,
    hardness: 1.35,
    decay: 1.15,
    upperLoss: 0.78,
    unison: 1.25,
    attack: 0.0024,
    knock: 0.30,
    thump: 0.26,
    maxLen: 7.5
  }
};

// one cache per context, so a fresh OfflineAudioContext in the
// bounce tool never picks up buffers rendered at the wrong rate
const caches = new WeakMap();
function cacheFor(ctx) {
  let c = caches.get(ctx);
  if (!c) { c = new Map(); caches.set(ctx, c); }
  return c;
}
const CACHE_MAX = 110;

/** 0 at A0, 1 at C8. Everything about the instrument changes with it. */
export function pianoRegister(freq) {
  const midi = 69 + 12 * Math.log2(Math.max(1, freq) / 440);
  return Math.min(1, Math.max(0, (midi - 21) / 87));
}

/**
 * One note, rendered. Mono, peak-normalised, at the context's rate.
 * Returns null for anything that is not a note.
 */
export function pianoBuffer(ctx, freq, preset = 'felt') {
  if (!ctx || !(freq > 22) || !(freq < 5000)) return null;
  const P = PIANO_PRESETS[preset] || PIANO_PRESETS.felt;
  const cache = cacheFor(ctx);
  const key = `${preset}|${Math.round(freq * 2)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const sr = ctx.sampleRate;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const reg = Math.min(1, Math.max(0, (midi - 21) / 87));

  // ---- how long it rings ----
  // Sixteen seconds to silence at the bottom of the keyboard, under a
  // second at the top. The buffer is capped well short of that for the
  // bass, and faded, so the caller's envelope never runs off the end.
  const t60 = 16 * Math.pow(2, -reg * 4.2) * P.decay;
  const tau1 = t60 / 6.91;                                  // e-fold time of the fundamental
  const secs = Math.max(0.7, Math.min(P.maxLen, 2.1 + (1 - reg) * 5.4, t60 * 0.8 + 0.3));
  const len = Math.ceil(sr * secs);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);

  // ---- inharmonicity ----
  // B doubles roughly every octave: wound bass strings are floppy,
  // short treble strings are stiff.
  const B = Math.min(0.02, Math.max(4e-5, 1.4e-4 * Math.pow(2, (midi - 40) / 12 * 0.95)));

  // ---- strings per note ----
  // single wound strings at the bottom, pairs above that, three
  // everywhere else; the highest partials of a note barely beat, so
  // they get fewer.
  const strings = reg < 0.12 ? 1 : reg < 0.30 ? 2 : 3;
  // the unison spread. wider low down, where a few cents is still only
  // a fraction of a hertz
  const spreadCents = P.unison * (1.6 - reg * 0.8);
  // the hammer lowpass. opens with register, scaled by hardness
  const fc = (820 + freq * 2.6) * P.hardness;

  // ---- build the component table ----
  const RE = [], IM = [], CR = [], CI = [];
  const nyq = sr * 0.45;
  let partials = 0;
  for (let n = 1; n <= P.partials; n++) {
    const fn = n * freq * Math.sqrt(1 + B * n * n);
    if (fn > nyq || fn > P.fmax) break;
    partials++;
    // amplitude: the strike comb, the series tilt, the hammer filter
    const comb = Math.abs(Math.sin(Math.PI * n * P.strike));
    const tilt = Math.pow(n, -P.tilt);
    const hammer = 1 / (1 + Math.pow(fn / fc, 2.2));
    const amp = (0.18 + comb) * tilt * hammer;
    if (amp < 1e-4) continue;
    // decay: every partial dies faster than the one below it
    const tau = tau1 / (1 + 0.12 * (n - 1) + P.upperLoss * 0.42 * (fn / 1000));
    const count = n <= 6 ? strings : n <= 14 ? Math.min(strings, 2) : 1;
    // the hammer hits every string of the note at once, so they start
    // in phase (the prompt sound) and only then drift apart
    const ph = Math.random() * 2 * Math.PI;
    for (let s = 0; s < count; s++) {
      // prompt sound in the middle, aftersound on the outer strings
      let cents = 0, g = 1, tm = 1;
      if (count === 2) { cents = s ? spreadCents * 0.9 : -spreadCents * 0.45; g = s ? 0.55 : 0.80; tm = s ? 1.35 : 0.85; }
      else if (count === 3) { cents = [-spreadCents, 0, spreadCents * 1.15][s]; g = [0.46, 0.78, 0.42][s]; tm = [1.32, 0.82, 1.40][s]; }
      else if (strings === 1 && n <= 6) {
        // a single string still has two polarisations, and they do
        // not decay together
        if (s === 0) { g = 0.8; tm = 0.85; }
      }
      const f = fn * Math.pow(2, cents / 1200);
      if (f > nyq) continue;
      const dec = Math.exp(-1 / (sr * Math.max(0.004, tau * tm)));
      const w = 2 * Math.PI * f / sr;
      const a = amp * g;
      RE.push(a * Math.cos(ph)); IM.push(a * Math.sin(ph));
      CR.push(Math.cos(w) * dec); CI.push(Math.sin(w) * dec);
    }
    // the second polarisation of a lone string, a hair detuned
    if (strings === 1 && n <= 6) {
      const f = fn * Math.pow(2, 0.35 / 1200);
      const dec = Math.exp(-1 / (sr * Math.max(0.004, tau * 1.45)));
      const w = 2 * Math.PI * f / sr;
      const a = amp * 0.4;
      RE.push(a * Math.cos(ph)); IM.push(a * Math.sin(ph));
      CR.push(Math.cos(w) * dec); CI.push(Math.sin(w) * dec);
    }
  }
  if (!partials) return null;

  // ---- the strings, as rotating phasors ----
  const C = RE.length;
  const re = Float64Array.from(RE), im = Float64Array.from(IM);
  const cr = Float64Array.from(CR), ci = Float64Array.from(CI);
  for (let i = 0; i < len; i++) {
    let s = 0;
    for (let c = 0; c < C; c++) {
      const r = re[c], m = im[c];
      re[c] = r * cr[c] - m * ci[c];
      im[c] = r * ci[c] + m * cr[c];
      s += im[c];
    }
    out[i] = s;
  }

  // ---- the hammer and the board ----
  // Two noises, both short. The thump is the soundboard taking the
  // blow: lowpassed, a few tens of milliseconds, bigger for low notes.
  // The knock is the hammer itself: a resonant tick that belongs to
  // the top half of the keyboard.
  let peak = 0;
  for (let i = 0; i < len; i++) { const v = Math.abs(out[i]); if (v > peak) peak = v; }
  const thumpA = peak * P.thump * (0.35 + (1 - reg) * 0.9);
  const thumpN = Math.min(len, Math.floor(sr * (0.022 + (1 - reg) * 0.03)));
  const thumpK = 1 - Math.exp(-2 * Math.PI * (95 + freq * 0.55) / sr);
  let lp = 0, lp2 = 0;
  for (let i = 0; i < thumpN; i++) {
    lp += ((Math.random() * 2 - 1) - lp) * thumpK;
    lp2 += (lp - lp2) * thumpK;
    const env = Math.exp(-i / (thumpN * 0.36));
    out[i] += lp2 * env * thumpA * 6;
  }
  const knockA = peak * P.knock * (0.25 + reg * 1.1);
  const knockN = Math.min(len, Math.floor(sr * 0.011));
  const kf = 2 * Math.PI * Math.min(nyq, 1500 + freq * 1.6) / sr;
  const kr = 0.9935;
  let y1 = 0, y2 = 0;
  for (let i = 0; i < knockN + 400; i++) {
    const x = i < knockN ? (Math.random() * 2 - 1) * Math.exp(-i / (knockN * 0.4)) : 0;
    const y = x + 2 * kr * Math.cos(kf) * y1 - kr * kr * y2;
    y2 = y1; y1 = y;
    if (i < len) out[i] += y * knockA * 0.12;
  }

  // ---- attack and tail ----
  const attN = Math.min(len >> 1, Math.max(1, Math.floor(sr * P.attack * (1 + (1 - reg) * 1.6))));
  for (let i = 0; i < attN; i++) out[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / attN);
  const fadeN = Math.min(len >> 1, Math.floor(sr * 0.35));
  for (let i = 0; i < fadeN; i++) out[len - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fadeN);

  // ---- normalise ----
  peak = 0;
  for (let i = 0; i < len; i++) { const v = Math.abs(out[i]); if (v > peak) peak = v; }
  if (peak > 0) { const k = 0.85 / peak; for (let i = 0; i < len; i++) out[i] *= k; }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, buf);
  return buf;
}

/** Drop everything rendered for a context. The bounce tool uses this. */
export function clearPianoCache(ctx) { if (ctx) caches.delete(ctx); }
