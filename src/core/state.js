/* ============================================================
   state.js: tiny Zustand-shaped store + IndexedDB persistence
   Everything the game remembers lives here. Chapters read and
   write flags; nothing else is allowed to hold durable memory.
   ============================================================ */

const DB_NAME = 'kesslerton-row';
const DB_VER = 1;
const STORE = 'saves';

function makeStore(initial) {
  let s = { ...initial };
  const subs = new Set();
  return {
    get: () => s,
    set(patch) {
      const next = typeof patch === 'function' ? patch(s) : patch;
      s = { ...s, ...next };
      subs.forEach(f => f(s));
    },
    sub(f) { subs.add(f); return () => subs.delete(f); },
    replace(next) { s = { ...next }; subs.forEach(f => f(s)); }
  };
}

export const DEFAULT_SETTINGS = {
  fov: 88,                   // horizontal, not vertical: see Renderer._applyFov
  sensitivity: 1.0,
  headbob: true,
  viewmodel: true,           // Jared's hands, and his legs when he looks down
  reduceMotion: false,
  reduceJumpscares: false,   // kills stings + the entire Contact category
  noFlashing: false,
  subtitles: true,
  speakerLabels: true,
  subScrim: 0.6,
  subSize: 32,
  holdToCrouch: false,       // false = toggle
  holdToSprint: true,
  holdToCarry: true,
  masterVol: 0.9,
  musicVol: 0.62,
  dialogueBlips: true,
  voiceVol: 1.0,
  quality: 'high',           // high | medium | low
  dof: 0.75,                 // depth of field strength (0 = off)
  bloom: 1.0,
  invertY: false,
  colorblindHighlight: false,
  keys: {
    forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
    interact: 'KeyE', flashlight: 'KeyF', phone: 'Tab',
    sprint: 'ShiftLeft', crouch: 'ControlLeft', drop: 'KeyQ', journal: 'KeyJ'
  }
};

export const FRESH = {
  chapter: 0,
  scene: null,
  spawn: null,
  // ---- narrative flags -------------------------------------------------
  flags: {
    toldHerTheTruthAboutName: false,   // Ch1 → Ch5/C gate
    ringRemovedAtDinner: false,
    invitedHerIn: false,               // set in Ch1. Never unset. This is the game.
    sawEquinoxCar: false,              // Sept 22, 3:04 AM window
    readHohman: false,                 // pawn shop book → 3 Ch5 outcomes
    hasBenedictMedal: false,           // Mrs. Ostrowski, Ch2
    medalInCoat: false,                // still there in Ch5?
    dugAtTheStone: false,
    scrapedHexSign: false,
    sawMicrofilm: false,
    confrontedMarta: false,
    photographedAllFlyers: false,
    watchedStaticFull: false,
    fedButtons: 0,                     // 9 → he follows you into the church
    buttonsInChurch: false,
    saidHisFullNameAloud: false,
    saw3AMWindowVigil: false,
    tookThePhoto: false,
    deletedThePhoto: false,
    sawSecurityMonitor: false,
    calledFromPayphone: false,
    droveToKesslertonRow: false,
    graffitiEK: false,
    apartment3B: false                 // NG+
  },
  tapes: [],            // Elena's 12
  flyers: [],           // 9 photographed
  gallery: [],          // phone photos {id,caption,data}
  notes: [],            // Jared's own shorthand to-do
  messages: [],         // SMS thread
  seen: {},             // dialogue lines already heard (for barks)
  chores: {             // Chapter 5
    bell: false, lamps: 0, seals: [], register: false, font: false, name: false
  },
  streetlights: 31,
  scareCount: 0,
  playtime: 0,
  ending: null,
  ngPlus: false,
  version: 1
};

export const state = makeStore({
  ...structuredClone(FRESH),
  settings: loadSettingsSync()
});

// ---------------------------------------------------------------- helpers
export const flag = (k) => !!state.get().flags[k];
export const setFlag = (k, v = true) => state.set(s => ({ flags: { ...s.flags, [k]: v } }));
export const bump = (k, n = 1) => state.set(s => ({ flags: { ...s.flags, [k]: (s.flags[k] || 0) + n } }));
export const settings = () => state.get().settings;
export const setSetting = (k, v) => {
  state.set(s => ({ settings: { ...s.settings, [k]: v } }));
  saveSettings();
};

export function addTape(id) {
  const s = state.get();
  if (s.tapes.includes(id)) return false;
  state.set({ tapes: [...s.tapes, id] });
  return true;
}
export function addNote(text, id = text) {
  const s = state.get();
  if (s.notes.some(n => n.id === id)) return;
  state.set({ notes: [...s.notes, { id, text, done: false }] });
}
export function doneNote(id) {
  state.set(s => ({ notes: s.notes.map(n => n.id === id ? { ...n, done: true } : n) }));
}
/** `who` names the thread; Recca's is the default and the only one that matters. */
export function addMessage(from, text, time, who = null) {
  state.set(s => ({ messages: [...s.messages, who ? { from, text, time, who } : { from, text, time }] }));
}
export function addPhoto(shot) {
  state.set(s => ({ gallery: [...s.gallery, shot] }));
}

// ---------------------------------------------------------------- settings
function loadSettingsSync() {
  try {
    const raw = localStorage.getItem('kr.settings');
    if (!raw) return { ...DEFAULT_SETTINGS };
    const p = JSON.parse(raw);
    const out = { ...DEFAULT_SETTINGS, ...p, keys: { ...DEFAULT_SETTINGS.keys, ...(p.keys || {}) } };
    // `fov` used to be the vertical angle and is now the horizontal one.
    // Anything saved below the new slider's floor is an old vertical value:
    // widen it to the horizontal it used to imply at 16:9.
    if (out.fov < 70) out.fov = Math.round(Math.min(110, out.fov * 1.22));
    return out;
  } catch { return { ...DEFAULT_SETTINGS }; }
}
export function saveSettings() {
  try { localStorage.setItem('kr.settings', JSON.stringify(state.get().settings)); } catch {}
}

// ---------------------------------------------------------------- IndexedDB
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'slot' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function saveGame(slot = 'auto', label = '') {
  const s = state.get();
  const payload = {
    slot, label,
    at: new Date().toISOString(),
    data: {
      chapter: s.chapter, scene: s.scene, spawn: s.spawn,
      flags: s.flags, tapes: s.tapes, flyers: s.flyers, notes: s.notes,
      messages: s.messages, seen: s.seen, chores: s.chores,
      streetlights: s.streetlights, scareCount: s.scareCount,
      playtime: s.playtime, ending: s.ending, ngPlus: s.ngPlus, version: 1
      // gallery excluded, image blobs, kept in-memory per session
    }
  };
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(payload);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    return true;
  } catch (e) { console.warn('[save] failed', e); return false; }
}

export async function loadGame(slot = 'auto') {
  try {
    const d = await db();
    const rec = await new Promise((res, rej) => {
      const tx = d.transaction(STORE, 'readonly');
      const q = tx.objectStore(STORE).get(slot);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
    if (!rec) return null;
    state.replace({ ...structuredClone(FRESH), ...rec.data, gallery: [], settings: state.get().settings });
    return rec;
  } catch { return null; }
}

export async function listSaves() {
  try {
    const d = await db();
    return await new Promise((res, rej) => {
      const tx = d.transaction(STORE, 'readonly');
      const q = tx.objectStore(STORE).getAll();
      q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error);
    });
  } catch { return []; }
}

export async function hasSave(slot = 'auto') {
  const all = await listSaves();
  return all.some(r => r.slot === slot);
}

export function newGame(ngPlus = false) {
  state.replace({
    ...structuredClone(FRESH),
    ngPlus,
    settings: state.get().settings
  });
}
