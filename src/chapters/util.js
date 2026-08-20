/* ============================================================
   util.js: shared chapter helpers.
   ============================================================ */
import * as THREE from 'three';
import { UI, wait } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { Input, releaseLock, requestLock } from '../core/input.js';
import { addNote, doneNote, state } from '../core/state.js';

/** Run a list of [who, text, opts] lines in order. */
export async function convo(lines, { gap = 260 } = {}) {
  for (const l of lines) {
    if (typeof l === 'function') { await l(); continue; }
    const [who, text, opts] = l;
    await UI.say(who, text, opts || {});
    await wait(gap);
  }
}

/** Jared thinks. He understates everything. */
export const J = (text, opts = {}) => ['JARED', text, { style: 'thought', ...opts }];
export const SAY = (who, text, opts = {}) => [who, text, opts];

/** A scripted beat: the player keeps the camera, loses the rest. */
export async function beat(ctx, fn, { lock = true, letterbox = false } = {}) {
  const p = ctx.player;
  const prev = { move: p.canMove, look: p.canLook };
  if (lock) p.canMove = false;
  if (letterbox) UI.letterbox(true);
  try { await fn(); }
  finally {
    p.canMove = prev.move; p.canLook = prev.look;
    if (letterbox) UI.letterbox(false);
  }
}

/** Objective in Jared's own bad shorthand. */
export function objective(text, id = text) {
  addNote(text, id);
  UI.toast('note added', text);
}
export function objectiveDone(id) { doneNote(id); }

/** Make a mesh pick-up-able and carryable. */
export function carryable(world, mesh, ctx, { label = 'Pick up', heavy = false, onPick, onDrop, noSetDown = false } = {}) {
  return world.interact(mesh, {
    label: () => ctx.player.carrying?.obj === mesh ? 'Set down' : label,
    dist: 2.4,
    use: () => {
      if (ctx.player.carrying?.obj === mesh) {
        if (noSetDown) { UI.toast('Not here.'); return; }
        ctx.player.drop(); audio.sfx('setdown', { vol: heavy ? .42 : .30 }); onDrop?.();
      } else if (!ctx.player.carrying) {
        ctx.player.pickUp(mesh, { heavy, noSetDown });
        // hand, then object leaving the surface, then the object's own note
        audio.sfx('pickup', { vol: heavy ? .40 : .30 });
        if (heavy) audio.sfx('cloth', { vol: .22 });
        onPick?.();
      } else UI.toast('Hands full.');
    }
  });
}

/** Look at something and hold, with the camera pinned. Used sparingly. */
export async function forceLook(ctx, target, ms = 1400) {
  ctx.player.forceLookAt = target.isVector3 ? target : target.getWorldPosition(new THREE.Vector3());
  await wait(ms);
  ctx.player.forceLookAt = null;
}

/** Hard-cut between vignettes: fade, rebuild, fade. */
export async function hardCut(ms = 700) {
  await UI.fadeOut(ms);
  await wait(200);
}

/** Time-of-day tinting helper for lights. */
export function setNight(world, night) {
  world.lights.forEach(l => { if (l.userData.day) l.intensity = night ? 0 : l.userData.day; });
}

/** Freeze all input for a moment. Not a cutscene, the input just does nothing. */
export async function numb(ctx, ms) {
  ctx.player.frozen = true;
  UI.setPrompt(null); UI.setCrosshair(false);
  await wait(ms);
  ctx.player.frozen = false;
}

/**
 * A door the player can open, for the loose meshes that are not built by
 * `makeDoor` yet. It swings over half a second instead of teleporting
 * between two angles, and if you hand it a door handle it just forwards.
 */
export function hingedDoor(world, mesh, { axis = 'y', open = -1.35, tag = 'door', label = 'Open', onOpen, locked = false, lockedLine = 'Locked.', kind = 'wood', dur = 0.55 } = {}) {
  if (mesh && typeof mesh.setOpen === 'function') {
    if (locked) mesh.setLocked(true);
    return mesh;
  }
  let isOpen = false;
  let anim = null;
  world.tick(dt => {
    if (!anim) return;
    anim.t += dt;
    const k = Math.min(1, anim.t / dur);
    const e = anim.to === 0 ? Math.pow(k, 1.7) : 1 - Math.pow(1 - k, 2.6);
    mesh.rotation.y = anim.from + (anim.to - anim.from) * e;
    if (k >= 1) { mesh.rotation.y = anim.to; anim = null; }
  });
  const swing = (v) => { anim = { t: 0, from: mesh.rotation.y, to: v ? open : 0 }; isOpen = v; };
  const rec = world.interact(mesh, {
    label: () => locked ? 'Locked' : (isOpen ? 'Close' : label),
    use: (ctx) => {
      const at = mesh.getWorldPosition(new THREE.Vector3()).toArray();
      if (locked) { audio.door(kind, 'try', { vol: .6, pos: at }); UI.say('JARED', lockedLine, { style: 'thought' }); return; }
      swing(!isOpen);
      audio.door(kind, isOpen ? 'open' : 'close', { vol: .7, pos: at });
      if (isOpen) world.clearCollidersTagged(tag);
      onOpen?.(isOpen);
    }
  });
  return {
    rec,
    get isOpen() { return isOpen; },
    set locked(v) { locked = v; },
    setLocked(v) { locked = v; return this; },
    setOpen(v) { swing(v); if (v) world.clearCollidersTagged(tag); return this; },
    open() { swing(true); world.clearCollidersTagged(tag); }
  };
}
