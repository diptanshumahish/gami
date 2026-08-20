/* ============================================================
   interact.js: crosshair raycast, prompts, carry.
   Dot-to-ring crosshair, 2.4 m reach, DOF focus follows it.
   ============================================================ */
import * as THREE from 'three';
import { Input, held, hit } from './input.js';
import { settings } from './state.js';
import { UI } from './ui.js';
import { audio } from './audio.js';

const ray = new THREE.Raycaster();
ray.far = 3.2;

export class Interactor {
  constructor(ctx) {
    this.ctx = ctx;
    this.current = null;
    this.busy = false;       // a scripted beat owns the input
    this.holdTime = 0;
  }

  update(dt) {
    const { renderer, world, player } = this.ctx;
    const cam = renderer.camera;

    // DOF focus follows the crosshair even when there's nothing to use
    ray.setFromCamera(new THREE.Vector2(0, 0), cam);
    ray.far = 60;
    const all = ray.intersectObjects(world.root.children, true);
    renderer.setFocus(all.length ? all[0].distance : 8);

    if (this.busy || player.frozen) { this._clear(); return; }

    // carry: drop
    if (player.carrying && (hit('drop') || (!settings().holdToCarry && hit('interact')))) {
      const c = player.carrying;
      if (!c.noSetDown) {
        player.drop();
        audio.sfx('setdown', { vol: .34 });
      } else {
        UI.toast('Not here.');
      }
    }
    if (player.carrying && settings().holdToCarry && !held('interact') && this.heldCarry) {
      const c = player.carrying;
      if (!c.noSetDown) { player.drop(); audio.sfx('setdown', { vol: .34 }); }
      this.heldCarry = false;
    }

    // find the nearest enabled interactable under the crosshair
    ray.far = 3.2;
    const hits = ray.intersectObjects(world.root.children, true);
    let found = null, dist = 0;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.interact) o = o.parent;
      if (!o) continue;
      const rec = o.userData.interact;
      if (!rec.enabled || (rec.once && rec.used)) continue;
      if (h.distance > rec.dist) continue;
      found = rec; dist = h.distance;
      break;
    }

    if (found !== this.current) {
      this.current = found;
      this.holdTime = 0;
    }

    if (!found) { this._clear(); return; }

    const label = typeof found.label === 'function' ? found.label(this.ctx) : found.label;
    UI.setCrosshair(true, settings().colorblindHighlight ? 0x4FC3F7 : found.hl);
    UI.setPrompt(label, keyName('interact'));

    if (found.hold) {
      if (held('interact')) {
        this.holdTime += dt;
        UI.setPrompt(label + ' ' + bar(this.holdTime / found.hold), keyName('interact'));
        if (this.holdTime >= found.hold) {
          this.holdTime = 0;
          this._use(found);
        }
      } else this.holdTime = 0;
    } else if (hit('interact')) {
      this._use(found);
    }
  }

  _use(rec) {
    this.ctx.viewmodel?.poke(rec.hold ? 0.7 : 1);
    if (rec.once) rec.used = true;
    if (rec.carry) this.heldCarry = true;
    const r = rec.use(this.ctx);
    if (r instanceof Promise) {
      this.busy = true;
      this._clear();
      r.finally(() => { this.busy = false; });
    }
  }

  _clear() { UI.setCrosshair(false); UI.setPrompt(null); }
}

function bar(t) {
  const n = Math.round(THREE.MathUtils.clamp(t, 0, 1) * 8);
  return `<span style="opacity:.7;font-family:var(--mono);margin-left:8px">${'▮'.repeat(n)}${'▯'.repeat(8 - n)}</span>`;
}
function keyName(act) {
  const c = settings().keys[act];
  return c.replace(/^Key/, '').replace('ShiftLeft', 'Shift').replace('ControlLeft', 'Ctrl');
}
