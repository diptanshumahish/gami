/* ============================================================
   phone.js: flip-era Android, 2014. Messages, Notes, Camera,
   Gallery, Tapes.

   The camera is the important one. She appears in mirrors
   normally. She does not appear correctly here:
     stage 1, motion blur where she is, while she isn't moving
     stage 2, a second silhouette behind her
     stage 3, nothing at all in her seat
   ============================================================ */
import * as THREE from 'three';
import { state, addPhoto } from './state.js';
import { audio } from './audio.js';
import { UI } from './ui.js';
import { Input, releaseLock, requestLock } from './input.js';

const $ = s => document.querySelector(s);

export const Phone = {
  open: false,
  app: 'messages',
  clock: '11:47',
  ctx: null,
  cameraStage: 0,          // 0 none, 1 blur, 2 silhouette, 3 absent
  subject: null,           // the Character the camera lies about
  onShot: null,

  init(ctx) {
    this.ctx = ctx;
    this.el = $('#phone');
    this.screen = $('#phone .screen');
    this.clockEl = $('#phone .statusbar .clock');
    $('#phone .softkeys').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      this.show(b.dataset.app);
      audio.sfx('click', { vol: .25 });
    });
  },

  setClock(t) { this.clock = t; if (this.clockEl) this.clockEl.textContent = t; },

  toggle() { this.open ? this.close() : this.show(this.app); },

  show(app = this.app) {
    this.app = app;
    this.open = true;
    this.el.classList.remove('hidden');
    UI.showHUD(false);
    releaseLock();
    [...document.querySelectorAll('#phone .softkeys button')]
      .forEach(b => b.classList.toggle('on', b.dataset.app === app));
    this.render();
  },

  close() {
    this.open = false;
    this.el.classList.add('hidden');
    UI.showHUD(true);
    if (this.ctx?.wantLock !== false) requestLock();
  },

  render() {
    const s = state.get();
    const S = this.screen;
    switch (this.app) {
      case 'messages': {
        if (!s.messages.length) { S.innerHTML = `<h4>Messages</h4><div style="opacity:.45;padding:10px 2px">No messages.</div>`; break; }
        // one thread per correspondent, most recently written to at the
        // bottom, which is where the thumb is
        const threads = new Map();
        s.messages.forEach(m => { const k = m.who || 'Recca'; if (!threads.has(k)) threads.set(k, []); threads.get(k).push(m); });
        const order = [...threads.keys()].sort((a, b) => s.messages.lastIndexOf(threads.get(a).at(-1)) - s.messages.lastIndexOf(threads.get(b).at(-1)));
        S.innerHTML = order.map(k => `<h4>${esc(k)}</h4><div class="thread">` + threads.get(k).map(m =>
          `<div class="msg ${m.from === 'me' ? 'me' : 'them'}">${esc(m.text)}<span class="t">${m.time || ''}</span></div>`
        ).join('') + `</div>`).join('');
        S.scrollTop = 9e9;
        break;
      }
      case 'notes': {
        if (!s.notes.length) { S.innerHTML = `<h4>Notes</h4><div style="opacity:.45;padding:10px 2px">Nothing written down.</div>`; break; }
        S.innerHTML = `<h4>notes</h4>` + s.notes.map(n =>
          `<div class="noteline ${n.done ? 'done' : ''}">${esc(n.text)}</div>`).join('');
        break;
      }
      case 'camera': {
        S.innerHTML = `<h4>Camera</h4><div class="vf"><span style="color:#5f6a75;font-size:11px">viewfinder</span><button class="shutter"></button></div>
          <div style="font-size:10px;color:#6d757c;margin-top:6px">${s.gallery.length} photo${s.gallery.length === 1 ? '' : 's'}</div>`;
        S.querySelector('.shutter').addEventListener('click', () => this.takePhoto());
        break;
      }
      case 'gallery': {
        if (!s.gallery.length) { S.innerHTML = `<h4>Gallery</h4><div style="opacity:.45;padding:10px 2px">Empty.</div>`; break; }
        S.innerHTML = `<h4>Gallery</h4><div class="grid">` + s.gallery.map((g, i) =>
          `<div class="shot" data-i="${i}"><img src="${g.data}"><span class="cap">${esc(g.caption || '')}</span></div>`).join('') + `</div>`;
        S.querySelectorAll('.shot').forEach(el => el.addEventListener('click', () => {
          const g = state.get().gallery[+el.dataset.i];
          UI.openReader(`<img src="${g.data}" style="width:100%;display:block;border:1px solid #2a2e33">
            <div style="font-family:var(--mono);font-size:12px;color:#4a4a46;margin-top:10px">${esc(g.caption || '')}</div>`, 'doc-plain');
        }));
        break;
      }
      case 'tapes': {
        const TAPES = this.ctx?.TAPES || [];
        const have = state.get().tapes;
        S.innerHTML = `<h4>Tapes, ${have.length}/12</h4>` + TAPES.map((t, i) => {
          const got = have.includes(t.id);
          return `<div class="tape ${got ? '' : 'locked'}" data-id="${t.id}">
            <span class="n">${String(i + 1).padStart(2, '0')}</span>
            <span>${got ? esc(t.label) : '-------'}</span></div>`;
        }).join('') || '<div style="opacity:.45">No tapes.</div>';
        S.querySelectorAll('.tape:not(.locked)').forEach(el => el.addEventListener('click', () => {
          const t = TAPES.find(x => x.id === el.dataset.id);
          if (t) UI.openReader(t.html, 'doc-tape');
        }));
        break;
      }
    }
  },

  // ---------------------------------------------------------- camera
  /**
   * Renders the live scene into a small canvas, applying whatever
   * the camera is currently lying about.
   */
  takePhoto(caption = null) {
    const ctx = this.ctx;
    if (!ctx?.renderer) return;
    audio.sfx('shutter', { vol: .5 });

    const W = 320, H = 240;
    const r = ctx.renderer.renderer;
    const cam = ctx.renderer.camera.clone();
    cam.aspect = W / H; cam.updateProjectionMatrix();

    const rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const subj = this.subject;
    let restore = () => {};

    if (subj && this.cameraStage === 3) {
      subj.g.visible = false;
      restore = () => { subj.g.visible = true; };
    }

    const prevTarget = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.render(ctx.scene, cam);
    r.setRenderTarget(prevTarget);
    restore();

    const buf = new Uint8Array(W * H * 4);
    r.readRenderTargetPixels(rt, 0, 0, W, H, buf);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const img = g.createImageData(W, H);
    // flip Y
    for (let y = 0; y < H; y++) {
      const sy = (H - 1 - y) * W * 4, dy = y * W * 4;
      for (let x = 0; x < W * 4; x++) img.data[dy + x] = buf[sy + x];
    }
    g.putImageData(img, 0, 0);

    // 2014 phone camera: compression mush, noise, slight green cast
    g.globalAlpha = 0.12; g.fillStyle = '#1f2a1c'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    const nd = g.getImageData(0, 0, W, H);
    for (let i = 0; i < nd.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      nd.data[i] += n; nd.data[i + 1] += n * 0.9; nd.data[i + 2] += n * 1.1;
    }
    g.putImageData(nd, 0, 0);

    // ---- the lie
    if (subj && this.cameraStage > 0 && this.cameraStage < 3) {
      const p = subj.g.getWorldPosition(new THREE.Vector3());
      p.y += 0.9;
      const sp = p.clone().project(ctx.renderer.camera);
      if (sp.z < 1 && Math.abs(sp.x) < 1.4 && Math.abs(sp.y) < 1.4) {
        const sx = (sp.x * 0.5 + 0.5) * W, sy = (-sp.y * 0.5 + 0.5) * H;
        const dist = ctx.renderer.camera.position.distanceTo(p);
        const sc = Math.max(24, 320 / Math.max(1, dist));
        if (this.cameraStage === 1) {
          // motion blur where she is, while she isn't moving
          g.save();
          g.globalAlpha = 0.55;
          for (let k = -6; k <= 6; k++) {
            g.drawImage(c, sx - sc * .5 + k * 2.4, sy - sc, sc, sc * 2, sx - sc * .5, sy - sc, sc, sc * 2);
          }
          g.restore();
        } else if (this.cameraStage === 2) {
          // a second silhouette, behind her, taller
          g.save();
          g.globalAlpha = 0.62;
          g.fillStyle = '#0c0d0f';
          const hx = sx + sc * 0.28, hy = sy - sc * 0.42;
          g.beginPath();
          g.ellipse(hx, hy - sc * 0.62, sc * 0.22, sc * 0.28, 0, 0, 7); g.fill();
          g.beginPath();
          g.moveTo(hx - sc * 0.34, hy + sc * 1.5);
          g.lineTo(hx - sc * 0.30, hy - sc * 0.30);
          g.lineTo(hx + sc * 0.30, hy - sc * 0.30);
          g.lineTo(hx + sc * 0.34, hy + sc * 1.5);
          g.closePath(); g.fill();
          g.restore();
        }
      }
    }

    rt.dispose();
    const data = c.toDataURL('image/jpeg', 0.72);
    const shot = { id: 'p' + Date.now(), caption: caption ?? this.ctx?.photoCaption ?? '', data };
    addPhoto(shot);
    this.onShot?.(shot);
    if (this.app === 'camera') this.render();
    return shot;
  }
};

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
