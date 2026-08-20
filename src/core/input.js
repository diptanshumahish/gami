/* ============================================================
   input.js: keyboard/mouse, pointer lock, remappable bindings.
   Nothing in this game requires reflexes, so nothing in this
   file is allowed to require them either: every hold input can
   be flipped to a toggle, and every key can be rebound.
   ============================================================ */
import { settings, setSetting } from './state.js';

export const Input = {
  down: new Set(),
  pressed: new Set(),      // consumed each frame
  mouse: { dx: 0, dy: 0, l: false, r: false, lPressed: false, lHeldTime: 0 },
  locked: false,
  enabled: true,
  _listeners: new Set(),
  _capture: null,          // rebinding capture callback
  wheel: 0
};

const el = () => document.getElementById('viewport');

export function initInput() {
  addEventListener('keydown', e => {
    if (Input._capture) {
      e.preventDefault();
      if (e.code !== 'Escape') Input._capture(e.code);
      Input._capture = null;
      return;
    }
    if (e.code === 'Tab' || (e.code === 'Space' && Input.locked)) e.preventDefault();
    if (!Input.down.has(e.code)) Input.pressed.add(e.code);
    Input.down.add(e.code);
    Input._listeners.forEach(f => f(e.code, true));
  });
  addEventListener('keyup', e => {
    Input.down.delete(e.code);
    Input._listeners.forEach(f => f(e.code, false));
  });
  addEventListener('blur', () => { Input.down.clear(); Input.mouse.l = Input.mouse.r = false; });

  addEventListener('mousemove', e => {
    if (!Input.locked) return;
    const s = settings();
    Input.mouse.dx += e.movementX * 0.0022 * s.sensitivity;
    Input.mouse.dy += e.movementY * 0.0022 * s.sensitivity * (s.invertY ? -1 : 1);
  });
  addEventListener('mousedown', e => {
    if (!Input.locked) return;
    if (e.button === 0) { Input.mouse.l = true; Input.mouse.lPressed = true; Input.mouse.lHeldTime = 0; }
    if (e.button === 2) Input.mouse.r = true;
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) Input.mouse.l = false;
    if (e.button === 2) Input.mouse.r = false;
  });
  addEventListener('contextmenu', e => { if (Input.locked) e.preventDefault(); });
  addEventListener('wheel', e => { if (Input.locked) Input.wheel += Math.sign(e.deltaY); }, { passive: true });

  document.addEventListener('pointerlockchange', () => {
    Input.locked = document.pointerLockElement === el();
    document.getElementById('app').classList.toggle('pointer-locked', Input.locked);
    if (!Input.locked) Input.down.clear();
    Input._listeners.forEach(f => f('__lock', Input.locked));
  });
}

export function requestLock() {
  const v = el();
  if (!v || document.pointerLockElement === v) return;
  try {
    // Chrome returns a promise and rejects it when there is no user
    // activation (e.g. during a chapter transition). That is expected;
    // the canvas click handler will ask again.
    const p = v.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {}
}
export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}

/** Bound-action helpers. `act` is a key of settings().keys */
export const held = (act) => Input.enabled && Input.down.has(settings().keys[act]);
export const hit = (act) => Input.enabled && Input.pressed.has(settings().keys[act]);
export const rawHit = (code) => Input.enabled && Input.pressed.has(code);
export const rawHeld = (code) => Input.enabled && Input.down.has(code);

export function endFrame(dt) {
  Input.pressed.clear();
  Input.mouse.dx = 0; Input.mouse.dy = 0;
  Input.mouse.lPressed = false;
  Input.wheel = 0;
  if (Input.mouse.l) Input.mouse.lHeldTime += dt; else Input.mouse.lHeldTime = 0;
}

export function onKey(fn) { Input._listeners.add(fn); return () => Input._listeners.delete(fn); }

/** Rebinding: resolves with the next key code pressed. */
export function captureKey() {
  return new Promise(res => { Input._capture = res; });
}
export function rebind(action, code) {
  const keys = { ...settings().keys, [action]: code };
  setSetting('keys', keys);
}
export function keyLabel(code) {
  if (!code) return '';
  return code
    .replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '')
    .replace('ControlLeft', 'L CTRL').replace('ControlRight', 'R CTRL')
    .replace('ShiftLeft', 'L SHIFT').replace('ShiftRight', 'R SHIFT')
    .replace('AltLeft', 'L ALT').replace('Space', 'SPACE').replace('Tab', 'TAB')
    .replace('Escape', 'ESC').toUpperCase();
}

/** One-handed preset (doc §12) */
export const LAYOUTS = {
  standard: { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', interact: 'KeyE', flashlight: 'KeyF', phone: 'Tab', sprint: 'ShiftLeft', crouch: 'ControlLeft', drop: 'KeyQ', journal: 'KeyJ' },
  leftHand:  { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', interact: 'KeyR', flashlight: 'KeyF', phone: 'KeyQ', sprint: 'ShiftLeft', crouch: 'KeyC', drop: 'KeyG', journal: 'KeyV' },
  rightHand: { forward: 'ArrowUp', back: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', interact: 'Numpad0', flashlight: 'Numpad1', phone: 'Numpad2', sprint: 'ShiftRight', crouch: 'Numpad3', drop: 'Numpad4', journal: 'Numpad5' }
};
