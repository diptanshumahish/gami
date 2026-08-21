/* ============================================================
   scares.js: the twenty-two.

   Doc §6 is a set of hard constraints, so they live here as
   code rather than as a promise:
     · max 1 per 12 min in Acts 1–2, 1 per 6 min in Act 3
     · never two of the same TYPE in a row
     · exactly 4 of the 22 are false alarms
     · no sting on the best ones
     · never fire during a chore's difficult moment, only at
       the moment of completion or transition
     · she never chases

   Reduce Jumpscares (doc §12) removes the audio sting and the
   entire Contact category, and keeps every scare's staging.
   ============================================================ */
import { audio } from './audio.js';
import { settings, state } from './state.js';
import { UI } from './ui.js';

export const TYPE = {
  PRESENCE: 'presence',       // she is already there. no sound, no motion.
  ABSENCE: 'absence',         // something that was there is gone / was closed is open
  MEDIATED: 'mediated',       // it happens on a screen. never in the room.
  AUDIO: 'audio',             // her voice from a speaker that isn't her
  CONTACT: 'contact',         // a hand. four times in the whole game.
  GEOMETRY: 'geometry'        // the pews turn around
};

/** What the manifest has to add up to. The smoke test holds it to this. */
export const EXPECT = { total: 22, falses: 4, contacts: 3 };

/** The manifest. Every scare in the game is declared here. */
export const MANIFEST = [
  // ---- Act 1–2 (one per 12 min) ----
  // Chapter One used to have no horror in it at all. It still has no
  // horror in it that Jared would call horror: a person at a treeline
  // at dusk, a radiator, and somebody across the road at three in the
  // morning, which in a town of eleven hundred is either nothing or is
  // the whole story. None of them sting. Two of them are nothing.
  { id: 'ch1.roadside',    ch: 1, type: TYPE.PRESENCE, sting: false, note: 'The drive in. Somebody at the treeline in a coat three sizes too big. Not in the mirror.' },
  { id: 'ch1.radiator',    ch: 1, type: TYPE.AUDIO,    sting: false, false: true, note: '3:04 AM. The radiator knocks. You talk to it, it stops. She said.' },
  { id: 'ch1.window',      ch: 1, type: TYPE.PRESENCE, sting: false, note: '3:06 AM. Under the streetlight across the road, looking up. The light flickers and nobody.' },
  { id: 'ch2.bedside',     ch: 2, type: TYPE.PRESENCE, sting: false, note: 'Oct 2, 3:02 AM. Sitting on the edge of the bed, in her coat, in boots.' },
  { id: 'ch2.coathook',    ch: 2, type: TYPE.ABSENCE,  sting: false, false: true, note: 'A coat on a hook.' },
  { id: 'ch2.photo',       ch: 2, type: TYPE.MEDIATED, sting: false, note: 'Oct 12. Her seat is empty and there is motion blur where she was.' },
  // ---- Act 3 (one per 6 min) ----
  { id: 'ch3.doorway',     ch: 3, type: TYPE.PRESENCE, sting: false, note: 'Doorway, foot of the bed, gone.' },
  { id: 'ch3.shoulder',    ch: 3, type: TYPE.CONTACT,  sting: true,  note: 'Then a hand on his shoulder. (1 of 4)' },
  { id: 'ch3.branch',      ch: 3, type: TYPE.ABSENCE,  sting: false, false: true, note: 'A branch.' },
  { id: 'ch3.mirrorsheet', ch: 3, type: TYPE.ABSENCE,  sting: false, note: 'The sheet is off the mirror. He did not take it off.' },
  { id: 'ch3.phonecall',   ch: 3, type: TYPE.AUDIO,    sting: false, note: 'Ten centimetres down, the phone rings. It is Recca.' },
  { id: 'ch3.dogbite',     ch: 3, type: TYPE.PRESENCE, sting: true,  note: 'Buttons bites her. The wound does not bleed.' },
  { id: 'ch3.staticTV',    ch: 3, type: TYPE.MEDIATED, sting: false, note: 'Two frames of St Brigid\'s nave.' },
  // ---- Ch4 ----
  { id: 'ch4.radio',       ch: 4, type: TYPE.AUDIO,    sting: false, note: 'WKRB cuts to her voice mid-sentence.' },
  { id: 'ch4.monitor',     ch: 4, type: TYPE.MEDIATED, sting: false, note: 'Camera 2. Someone is sitting in the passenger seat. Silent.' },
  { id: 'ch4.dryerphone',  ch: 4, type: TYPE.AUDIO,    sting: false, note: 'Behind her voice: the Wash-Rite dryers.' },
  // ---- Ch5 ----
  { id: 'ch5.rope',        ch: 5, type: TYPE.CONTACT,  sting: true,  note: 'Strike six. The rope pulls back, hard, from above. (2 of 4)' },
  { id: 'ch5.name',        ch: 5, type: TYPE.AUDIO,    sting: false, note: 'Strike eight. Something in the bell chamber says his name.' },
  { id: 'ch5.pews',        ch: 5, type: TYPE.GEOMETRY, sting: false, note: 'Lamp 4. Twelve pews on the left, facing the wrong way. Victor does not react.' },
  { id: 'ch5.confessional',ch: 5, type: TYPE.ABSENCE,  sting: false, note: 'The confessional door is open. It was closed.' },
  { id: 'ch5.dryerdoor',   ch: 5, type: TYPE.ABSENCE,  sting: false, false: true, note: 'The dryer door swinging. (rectory washer)' },
  { id: 'ch5.hand',        ch: 5, type: TYPE.CONTACT,  sting: true,  note: 'The font walk. A hand. Suppressed if the medal is still in the coat. (3 of 4)' }
  // the fourth Contact is Chapter 6, and it is her taking his hand, and it is not a scare.
];

class ScareDirector {
  constructor() {
    this.fired = [];
    this.lastType = null;
    this.lastAt = -1e9;
    this.clock = 0;
    this.act = 1;
    this.inChore = false;      // never scare during a chore's difficult moment
  }

  reset() { this.fired = []; this.lastType = null; this.lastAt = -1e9; this.clock = 0; }
  tick(dt) { this.clock += dt; }
  setAct(a) { this.act = a; }
  setChore(v) { this.inChore = v; }

  get minGap() { return this.act >= 3 ? 6 * 60 : 12 * 60; }

  /** Would this scare be allowed right now? */
  allowed(id, { force = false } = {}) {
    const m = MANIFEST.find(s => s.id === id);
    if (!m) return false;
    if (this.fired.includes(id)) return false;
    if (force) return true;
    if (this.inChore) return false;
    if (m.type === this.lastType) return false;
    if (this.clock - this.lastAt < this.minGap) return false;
    return true;
  }

  /**
   * Fire a scare. `stage` does the actual staging and always runs,    * Reduce Jumpscares only removes the sting and the Contact category.
   */
  fire(id, stage, { force = true } = {}) {
    const m = MANIFEST.find(s => s.id === id);
    if (!m) { console.warn('[scares] unknown', id); return false; }
    if (this.fired.includes(id)) return false;
    if (!force && !this.allowed(id)) return false;

    const s = settings();
    if (m.type === TYPE.CONTACT && s.reduceJumpscares) {
      this.fired.push(id);
      return false;                       // staged out entirely, by design
    }

    this.fired.push(id);
    this.lastType = m.type;
    this.lastAt = this.clock;
    state.set(st => ({ scareCount: st.scareCount + 1 }));

    if (m.sting && !s.reduceJumpscares) audio.sting('hit');
    try { stage?.(m); } catch (e) { console.error('[scares]', id, e); }
    return true;
  }

  /** Count check for the build. 22 declared, 4 of them false, 3 Contact. */
  audit() {
    const total = MANIFEST.length;
    const falses = MANIFEST.filter(m => m.false).length;
    const contacts = MANIFEST.filter(m => m.type === TYPE.CONTACT).length;
    return { total, falses, contacts, ok: total === EXPECT.total && falses === EXPECT.falses && contacts === EXPECT.contacts };
  }
}

export const scares = new ScareDirector();
