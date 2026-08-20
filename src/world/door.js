/* ============================================================
   door.js: one door, built once, used everywhere.

   The rules a door in this game has to obey:

     · it is 0.96 m of clear opening, hung in a lined frame with
       casing on both faces, so it reads as a hole somebody cut
       in a wall rather than a plank leaning on one
     · the leaf is 52 mm thick with real stiles and rails, so
       standing in the opening you can see it is a door edge-on
     · it swings AWAY from you, over half a second, with the
       hinge complaining the whole way, and it settles
     · the leaf itself collides at whatever angle it is at, so a
       half-open door is a thing in the room, not a suggestion
     · closing it on yourself pushes you out of the way, because
       that is what a door does

   Everything else in here is trim.
   ============================================================ */
import * as THREE from 'three';
import { flat } from './mat.js';
import { SCALE, BOX, CYL, SPH } from './world.js';
import { audio } from '../core/audio.js';
import { UI } from '../core/ui.js';

const OPEN_TIME = 0.62;    // matches the hinge tail in audio.door('open')
const SHUT_TIME = 0.45;    // matches the frame impact in audio.door('close')
const FULL = 1.62;         // ~93 degrees. a door that stops at 90 looks stuck

/**
 * Hang a door in an opening.
 *
 * (x, y, z) is the centre of the CLEAR OPENING at floor level, which is
 * exactly what `world.wallWithDoor()` now hands back as `{ox, y, oz}`.
 *
 *   facing  yaw of the wall the door sits in (0 = wall runs along X)
 *   hinge   'left' | 'right', in the door's own frame
 *   swing   'auto' | -1 | 1. auto opens away from whoever pulled it
 */
export function makeDoor(world, {
  x = 0, y = 0, z = 0,
  w = SCALE.doorW, h = SCALE.door, thick = SCALE.doorThick,
  facing = 0, hinge = 'left', swing = 'auto', full = FULL,
  wallThick = 0.14,
  face = 0xc9c0ae, panels = true, glass = 0,
  frame = true, frameCol = 0xdcd6c8, threshold = false,
  hardware = 'knob', metal = 0xb8a25e,
  kind = 'wood', tag = 'door',
  label = 'Open', shutLabel = 'Close', lockedLabel = 'Locked',
  locked = false, lockedLine = 'Locked.',
  dist = 2.8, interactive = true, collide = true,
  onOpen = null, sound = true, mat = null
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = facing;
  world.add(g);

  const hs = hinge === 'right' ? 1 : -1;         // which side the knuckles are on
  const leafMat = mat || flat(face, { rough: .62 });
  const trimMat = flat(frameCol, { rough: .74 });
  const metalMat = flat(metal, { rough: .3, metal: .85 });
  const darkMat = flat(0x2a2724, { rough: .5, metal: .35 });

  // ---------------------------------------------------------- the frame
  // Jambs stand in the extra 75 mm the rough opening carries on each side,
  // so the leaf keeps the whole 0.96 and the frame is still visible.
  const jw = SCALE.jamb, jd = wallThick + 0.012;
  if (frame) {
    [-1, 1].forEach(s => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(jw, h + jw, jd), trimMat);
      jamb.position.set(s * (w / 2 + jw / 2), (h + jw) / 2, 0);
      jamb.castShadow = true; jamb.receiveShadow = true;
      g.add(jamb);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(w + jw * 2, jw, jd), trimMat);
    head.position.set(0, h + jw / 2, 0);
    head.castShadow = true; head.receiveShadow = true;
    g.add(head);

    // casing, proud of the wall on both faces. this is the bit that makes
    // a doorway legible from across a dark room.
    const cw = SCALE.casing, cd = 0.022;
    [-1, 1].forEach(f => {
      const zc = f * (jd / 2 + cd / 2);
      [-1, 1].forEach(s => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(cw, h + jw + cw, cd), trimMat);
        b.position.set(s * (w / 2 + jw + cw / 2), (h + jw + cw) / 2, zc);
        b.castShadow = true; g.add(b);
      });
      const t = new THREE.Mesh(new THREE.BoxGeometry(w + (jw + cw) * 2, cw, cd), trimMat);
      t.position.set(0, h + jw + cw / 2, zc);
      t.castShadow = true; g.add(t);
    });
  }
  if (threshold) {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + jw * 2, 0.028, jd + 0.05), flat(0x6a4a30, { rough: .6 }));
    sill.position.set(0, 0.014, 0);
    sill.receiveShadow = true; g.add(sill);
  }

  // ---------------------------------------------------------- the leaf
  const pivot = new THREE.Group();
  pivot.position.set(hs * (w / 2 - 0.004), 0, 0);
  g.add(pivot);

  const leaf = new THREE.Group();
  leaf.position.set(-hs * (w / 2 - 0.004), 0, 0);
  pivot.add(leaf);

  const slabW = w - 0.014, slabH = h - 0.012;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, slabH, thick), leafMat);
  slab.position.y = slabH / 2 + 0.006;
  slab.castShadow = true; slab.receiveShadow = true;
  leaf.add(slab);

  // stiles and rails, raised 6 mm on both faces. two panels, the tall one
  // over the short one, which is what every door in a town like this is.
  if (panels) {
    const pm = flat(shade(face, 0.86), { rough: .66 });
    const inset = 0.11;
    const split = slabH * 0.42;
    const rects = [
      [inset, split + 0.05, slabW - inset * 2, slabH - split - 0.05 - inset],
      [inset, inset, slabW - inset * 2, split - inset - 0.05]
    ];
    rects.forEach(([px, py, pw, ph]) => {
      if (pw <= 0.02 || ph <= 0.02) return;
      [-1, 1].forEach(f => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.012), pm);
        panel.position.set(-slabW / 2 + px + pw / 2, 0.006 + py + ph / 2, f * (thick / 2 + 0.004));
        panel.castShadow = true; panel.receiveShadow = true;
        leaf.add(panel);
      });
    });
  }
  if (glass > 0) {
    // an upper light, for shopfronts and back doors
    const gw = slabW - 0.2, gh = glass > 1 ? slabH * 0.46 : slabH * 0.3;
    const gy = 0.006 + slabH - gh / 2 - 0.16;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshPhysicalMaterial({
      color: 0x2a3a48, roughness: .07, transmission: .55, transparent: true, opacity: .42, side: THREE.DoubleSide
    }));
    pane.position.set(0, gy, thick / 2 + 0.003);
    leaf.add(pane);
  }

  // hinges, three of them, on the knuckle side
  [0.22, slabH * 0.5, slabH - 0.22].forEach(hy => {
    const kn = new THREE.Mesh(CYL(0.016, 0.016, 0.1, 6), metalMat);
    kn.position.set(hs * (slabW / 2 - 0.004), hy, -thick / 2 - 0.008);
    kn.rotation.x = 0; leaf.add(kn);
  });

  // hardware, both faces, with a backplate so it catches a light
  if (hardware !== 'none') {
    const hx = -hs * (slabW / 2 - 0.075);
    const hy = 1.02;
    [-1, 1].forEach(f => {
      const rose = new THREE.Mesh(CYL(0.045, 0.045, 0.008, 12), metalMat);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(hx, hy, f * (thick / 2 + 0.004));
      leaf.add(rose);
      if (hardware === 'lever') {
        const stem = new THREE.Mesh(CYL(0.014, 0.014, 0.05, 8), metalMat);
        stem.rotation.x = Math.PI / 2;
        stem.position.set(hx, hy, f * (thick / 2 + 0.03));
        const arm = new THREE.Mesh(BOX(0.115, 0.02, 0.024), metalMat);
        arm.position.set(hx + hs * 0.05, hy - 0.012, f * (thick / 2 + 0.05));
        leaf.add(stem, arm);
      } else if (hardware === 'ring') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 16), metalMat);
        ring.position.set(hx, hy - 0.08, f * (thick / 2 + 0.01));
        leaf.add(ring);
      } else if (hardware === 'bar') {
        const bar = new THREE.Mesh(BOX(slabW * 0.7, 0.045, 0.045), metalMat);
        bar.position.set(0, hy, f * (thick / 2 + 0.045));
        leaf.add(bar);
      } else {
        const knob = new THREE.Mesh(SPH(0.037, 10), metalMat);
        knob.scale.z = 0.8;
        knob.position.set(hx, hy, f * (thick / 2 + 0.038));
        const neck = new THREE.Mesh(CYL(0.015, 0.015, 0.04, 8), metalMat);
        neck.rotation.x = Math.PI / 2;
        neck.position.set(hx, hy, f * (thick / 2 + 0.018));
        leaf.add(knob, neck);
      }
      if (locked || kind === 'metal' || kind === 'heavy') {
        const esc = new THREE.Mesh(CYL(0.018, 0.018, 0.006, 8), darkMat);
        esc.rotation.x = Math.PI / 2;
        esc.position.set(hx, hy - 0.13, f * (thick / 2 + 0.004));
        leaf.add(esc);
      }
    });
    // strike plate on the latch jamb
    if (frame) {
      const strike = new THREE.Mesh(BOX(0.012, 0.1, 0.03), metalMat);
      strike.position.set(-hs * (w / 2 + 0.006), hy, 0);
      g.add(strike);
    }
  }

  // ---------------------------------------------------------- physics
  // The leaf owns exactly one collider and rewrites it as it swings.
  // Its centre is worked out from the hinge angle directly rather than
  // read back off the scene graph, so it is right on the frame the door
  // is built, before anything has updated a world matrix.
  const px = hs * (w / 2 - 0.004);          // hinge offset along the opening
  const cf = Math.cos(facing), sf = Math.sin(facing);
  const cd = Math.max(thick, 0.07);
  let col = null;
  const syncCollider = () => {
    if (!collide) return;
    const th = pivot.rotation.y;
    const lx = px * (1 - Math.cos(th));
    const lz = px * Math.sin(th);
    const wx = x + lx * cf + lz * sf;
    const wz = z - lx * sf + lz * cf;
    if (col) world.moveCollider(col, wx, y, wz, w, h, cd, facing + th);
    else col = world.collide(wx, y, wz, w, h, cd, tag, facing + th);
  };
  syncCollider();

  // ---------------------------------------------------------- the swing
  let isOpen = false, dir = -1;
  let anim = null;   // {t, dur, from, to, closing, settle}

  /**
   * Which way it goes. `side` is the direction the leaf travels along the
   * door's own Z, and the hinge side flips the sign of the angle that
   * produces, which is why this is not just `swing`.
   */
  const pick = () => {
    let side = -1;
    if (swing === 1 || swing === -1) side = swing;
    else {
      const p = world._doorPlayer;
      if (p) {
        const localZ = (p.x - x) * sf + (p.z - z) * cf;
        side = localZ >= 0 ? -1 : 1;      // away from whoever pulled it
      }
    }
    return side * hs;
  };

  const start = (opening, instant) => {
    const to = opening ? dir * full : 0;
    if (instant) {
      pivot.rotation.y = to; anim = null; isOpen = opening; syncCollider(); return;
    }
    anim = {
      t: 0, from: pivot.rotation.y, to, closing: !opening,
      dur: opening ? OPEN_TIME : SHUT_TIME, settle: opening
    };
    isOpen = opening;
  };

  world.tick(dt => {
    if (!anim) return;
    anim.t += dt;
    const k = Math.min(1, anim.t / anim.dur);
    // opening eases out and then rocks back a few degrees on the stop;
    // closing accelerates into the jamb, because that is where the bang is
    let e;
    if (anim.closing) e = Math.pow(k, 1.7);
    else {
      e = 1 - Math.pow(1 - k, 2.6);
      if (anim.settle) e -= Math.sin(Math.min(1, k) * Math.PI) * 0.035 * (1 - k);
    }
    pivot.rotation.y = anim.from + (anim.to - anim.from) * e;
    syncCollider();
    if (k >= 1) { pivot.rotation.y = anim.to; anim = null; syncCollider(); }
  });

  // ---------------------------------------------------------- interaction
  const at = () => [g.position.x, g.position.y + 1.0, g.position.z];
  const handle = {
    g, pivot, leaf, pos: { x, y, z }, facing, width: w, tag,
    get isOpen() { return isOpen; },
    get moving() { return !!anim; },
    get locked() { return locked; },
    set locked(v) { locked = v; },
    setLocked(v) { locked = v; return handle; },
    /** Open or close it. `instant` skips the swing, for scripted staging. */
    setOpen(v, { instant = false, quiet = false, from = null } = {}) {
      if (v === isOpen && !instant) return handle;
      if (v) dir = from === 1 || from === -1 ? from * hs : pick();
      if (sound && !quiet) audio.door(kind, v ? 'open' : 'close', { vol: v ? .62 : .7, pos: at() });
      start(v, instant);
      onOpen?.(v, handle);
      return handle;
    },
    toggle(opts) { return handle.setOpen(!isOpen, opts); },
    /** Bang on it. Used by the church and by whatever is in the hall. */
    knock(vol = .8) { audio.door(kind, 'knock', { vol, pos: at() }); return handle; },
    rattle(vol = .7) { audio.door(kind, 'try', { vol, pos: at() }); return handle; },
    dispose() { if (col) world.dropCollider(col); }
  };

  if (interactive) {
    handle.rec = world.interact(g, {
      dist,
      label: () => locked ? lockedLabel : (isOpen ? shutLabel : label),
      use: () => {
        if (anim) return;
        if (locked) {
          audio.door(kind, 'try', { vol: .62, pos: at() });
          if (lockedLine) UI.say('JARED', lockedLine, { style: 'thought' });
          return;
        }
        handle.toggle();
      }
    });
  }
  return handle;
}

/**
 * A pair of leaves in one opening, hinged at the outer edges: the west
 * doors of St. Casimir, and every set of double doors after them.
 */
export function makeDoorPair(world, opts = {}) {
  const { x = 0, y = 0, z = 0, w = 2.0, facing = 0 } = opts;
  const half = w / 2;
  const left = makeDoor(world, {
    ...opts, x: x + off(facing, -half / 2).x, z: z + off(facing, -half / 2).z,
    w: half, hinge: 'left', interactive: false
  });
  const right = makeDoor(world, {
    ...opts, x: x + off(facing, half / 2).x, z: z + off(facing, half / 2).z,
    w: half, hinge: 'right', interactive: false
  });
  const pair = {
    g: left.g, halves: [left, right], pos: { x, y, z }, sealed: false,
    get isOpen() { return left.isOpen || right.isOpen; },
    setOpen(v, o) { left.setOpen(v, o); right.setOpen(v, { ...o, quiet: true }); return pair; },
    toggle(o) { return pair.setOpen(!pair.isOpen, o); },
    setLocked(v) { left.setLocked(v); right.setLocked(v); return pair; },
    knock(vol) { return left.knock(vol); },
    rattle(vol) { return left.rattle(vol); },
    dispose() { left.dispose(); right.dispose(); }
  };
  if (opts.interactive !== false) {
    pair.rec = world.interact(left.g, {
      dist: opts.dist ?? 3.0,
      label: () => opts.locked ? (opts.lockedLabel || 'Locked') : (pair.isOpen ? 'Close' : (opts.label || 'Open')),
      use: () => {
        if (left.locked) { left.rattle(); if (opts.lockedLine) UI.say('JARED', opts.lockedLine, { style: 'thought' }); return; }
        pair.toggle();
      }
    });
    // the second leaf answers to the same prompt
    world.interact(right.g, {
      dist: opts.dist ?? 3.0,
      label: () => pair.rec.label(),
      use: () => pair.rec.use()
    });
  }
  return pair;
}

/** Offset along the wall the door sits in. */
function off(facing, d) {
  return { x: Math.cos(facing) * d, z: -Math.sin(facing) * d };
}

/** Darken a hex colour, for the raised panels. */
function shade(hex, k) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return c.getHex();
}

/**
 * The player position doors consult when they decide which way to swing.
 * main.js parks it on the world once a chapter is up; a door built before
 * anybody exists just swings away from the wall's +Z face.
 */
export function setDoorPlayer(world, player) {
  world._doorPlayer = player ? player.pos : null;
}
