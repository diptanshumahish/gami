/* ============================================================
   viewmodel.js: Jared's hands, and his legs when he looks down.

   The game was played by a floating camera with a torch. This
   gives it a body: two hands in the bottom corners of the frame
   that breathe, swing with the walk, pump when he runs, reach out
   when he opens a door, and come up together when he is carrying
   something; and a pair of legs under the camera that stride when
   he moves and are only ever in frame when he looks down or runs.

   The hands hang off the camera's full transform, so they pitch
   with the look. The legs hang off the yaw only, because they are
   attached to a person and not to a head.

   None of it casts a shadow and none of it is raycast, so it
   cannot interfere with an interaction or with the focus pull.
   ============================================================ */
import * as THREE from 'three';
import { settings } from './state.js';

const SKIN = 0xd8bda6;
const SLEEVE = 0x4a5560;

const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
/**
 * A lathe profile has to run bottom-to-top or the triangles face inward
 * and the limb renders inside out -- back-face culling drops the near
 * wall and you see the inside of the far one. Every profile down here is
 * written tip-last because that is how you think about an arm, so sort
 * it before turning it.
 */
const upward = (pts) => (pts.length > 1 && pts[pts.length - 1][1] < pts[0][1])
  ? pts.slice().reverse() : pts;
/** A turned limb from a [radius, length] profile, running down its own -Z. */
const LZ = (pts, seg = 12) => {
  const g = new THREE.LatheGeometry(upward(pts).map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), seg);
  g.rotateX(Math.PI / 2);
  return g;
};
/** The same, standing up: for legs, which hang down their own -Y. */
const LY = (pts, seg = 14) =>
  new THREE.LatheGeometry(upward(pts).map(p => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), seg);
const skinMat = (c) => new THREE.MeshStandardMaterial({
  color: c, roughness: 0.78, metalness: 0,
  // a floor under the shading, so a hand in an unlit hallway is still a
  // hand and not a hole
  emissive: new THREE.Color(c).multiplyScalar(0.055)
});

export class ViewModel {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
    this.forced = null;          // a chapter can pin it off for a vignette
    this.t = 0;
    this.reach = 0;              // 0..1, the door-opening lunge
    this.reachV = 0;
    this.legShow = 0;

    this.skin = skinMat(SKIN);
    this.cloth = new THREE.MeshStandardMaterial({ color: SLEEVE, roughness: 0.95 });
    this.trouser = new THREE.MeshStandardMaterial({ color: 0x2f3742, roughness: 0.96 });
    this.boot = new THREE.MeshStandardMaterial({ color: 0x241f1c, roughness: 0.85 });
    this.sole = new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.98 });

    // hands ride the camera; legs ride the yaw only
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.renderOrder = 2;
    scene.add(this.root); scene.add(this.body);

    this.arms = [-1, 1].map(s => this._arm(s));
    this.legs = [-1, 1].map(s => this._leg(s));
    this._noShadows(this.root); this._noShadows(this.body);
  }

  // ------------------------------------------------------------ rig
  _arm(side) {
    const g = new THREE.Group();
    // Where the shoulders sit is decided per frame, not here: the frame
    // is not a fixed size in metres, so a hand pinned to x = 0.255 is in
    // the bottom corner at one field of view and off the edge entirely at
    // another. See _frame().
    g.position.set(side * 0.255, -0.16, -0.06);
    this.root.add(g);

    const upper = new THREE.Group(); g.add(upper);
    // a sleeve tapers from the shoulder to the cuff; a box does not
    const uMesh = new THREE.Mesh(LZ([
      [0.048, 0.02], [0.046, -0.06], [0.042, -0.18], [0.039, -0.27], [0.037, -0.30]
    ]), this.cloth);
    upper.add(uMesh);
    const cuff = new THREE.Mesh(LZ([
      [0.037, -0.255], [0.044, -0.275], [0.044, -0.300], [0.036, -0.305]
    ]), this.cloth);
    upper.add(cuff);

    const fore = new THREE.Group(); fore.position.z = -0.30; upper.add(fore);
    const fMesh = new THREE.Mesh(LZ([
      [0.035, 0.01], [0.037, -0.04], [0.034, -0.12], [0.030, -0.20], [0.027, -0.245]
    ]), this.skin);
    fore.add(fMesh);

    const wrist = new THREE.Group(); wrist.position.z = -0.25; fore.add(wrist);
    // The forearm comes up into the frame; the hand does not, it stays
    // level, the way a wrist keeps a hand level while the arm swings.
    // And it is rolled thumb-up: palm-down puts every finger behind the
    // back of the hand, so all you see is a rounded stump.
    wrist.rotation.set(-0.30, 0, side * 0.62);
    // palm: wide, flat, and thicker at the thumb side
    const palm = new THREE.Mesh(LZ([
      [0.027, 0.010], [0.036, -0.015], [0.039, -0.055], [0.037, -0.085], [0.031, -0.100]
    ]), this.skin);
    palm.scale.set(1.06, 0.62, 1); wrist.add(palm);

    // four fingers, three joints each, different lengths, knuckles on an arc
    const LEN = [0.068, 0.073, 0.067, 0.055];       // index .. little
    const KZ = [-0.090, -0.096, -0.092, -0.082];
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const kn = new THREE.Group();
      kn.position.set(side * (0.027 - i * 0.018), -0.006 - i * 0.001, KZ[i]);
      kn.rotation.z = side * (i - 1.5) * 0.030;
      wrist.add(kn);
      const L = LEN[i];
      const seg = (len, r0, r1, tip, parent, z) => {
        const j = new THREE.Group(); j.position.z = z; parent.add(j);
        const pts = [[r0 * 0.55, 0.010], [r0, 0.004], [r0, -len * 0.45], [r1, -len + 0.004]];
        if (tip) pts.push([r1 * 0.86, -len - 0.002], [r1 * 0.52, -len - 0.007],
          [r1 * 0.18, -len - 0.010]);
        else pts.push([r1 * 0.92, -len - 0.003]);
        j.add(new THREE.Mesh(LZ(pts, 8), this.skin));
        return j;
      };
      const r = 0.0118 - i * 0.0008;
      const j1 = seg(L * 0.45, r, r * 0.94, false, kn, 0);
      const j2 = seg(L * 0.31, r * 0.92, r * 0.86, false, j1, -L * 0.45);
      const j3 = seg(L * 0.24, r * 0.84, r * 0.74, true, j2, -L * 0.31);
      // negative is toward the palm. A hand at rest is half closed; a hand
      // curling the other way is a claw, which is what this was.
      j1.rotation.x = -(0.16 + i * 0.03); j2.rotation.x = -0.26; j3.rotation.x = -0.20;
      fingers.push({ j1, j2, j3, rest: [-(0.16 + i * 0.03), -0.26, -0.20] });
    }
    const thumbG = new THREE.Group();
    thumbG.position.set(side * 0.044, -0.006, -0.040);
    thumbG.rotation.y = -side * 0.62;
    thumbG.rotation.z = side * 0.30;
    const th1 = new THREE.Group(); thumbG.add(th1);
    th1.add(new THREE.Mesh(LZ([[0.009, 0.010], [0.015, 0.004], [0.014, -0.020], [0.013, -0.040]], 8), this.skin));
    th1.rotation.x = -0.20;
    const th2 = new THREE.Group(); th2.position.z = -0.040; th1.add(th2);
    th2.add(new THREE.Mesh(LZ([
      [0.008, 0.008], [0.013, 0.002], [0.012, -0.018], [0.011, -0.030],
      [0.008, -0.035], [0.003, -0.038]
    ], 8), this.skin));
    th2.rotation.x = -0.26;

    // the pose everything else is a deviation from
    // Rotation about X is positive-up here, because the arm is built
    // pointing down its own -Z. The rest pose is a man carrying nothing,
    // with his hands where his hands go.
    // The shoulder sits below the bottom edge of the frame and the upper
    // arm carries the elbow further down and out, off screen; the forearm
    // then rises back into the lower corner. That diagonal is the shape a
    // first-person arm makes. An arm held level just floats there.
    const rest = { upper: new THREE.Euler(-0.20, side * 0.05, side * 0.10), fore: new THREE.Euler(0.62, side * 0.11, 0) };
    upper.rotation.copy(rest.upper);
    fore.rotation.copy(rest.fore);
    return { side, g, upper, fore, wrist, fingers, thumbG, th1, th2, rest };
  }

  _leg(side) {
    const g = new THREE.Group();
    g.position.set(side * 0.115, -0.94, 0.06);
    this.body.add(g);
    const hip = new THREE.Group(); g.add(hip);
    // domed at the top: look straight down and an open lathe is a pipe
    hip.add(new THREE.Mesh(LY([
      [0.001, 0.062], [0.030, 0.056], [0.058, 0.040], [0.078, 0.018],
      [0.088, -0.010], [0.090, -0.070], [0.086, -0.190], [0.078, -0.320],
      [0.072, -0.430], [0.068, -0.462]
    ]), this.trouser));
    const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee);
    knee.add(new THREE.Mesh(LY([
      [0.008, 0.058], [0.036, 0.052], [0.060, 0.034], [0.069, 0.008],
      [0.070, -0.020], [0.068, -0.090], [0.058, -0.220], [0.048, -0.340],
      [0.046, -0.420], [0.010, -0.436]
    ]), this.trouser));
    const calf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), this.trouser);
    calf.scale.set(0.11, 0.20, 0.13); calf.position.set(0, -0.14, -0.024); knee.add(calf);

    const ankle = new THREE.Group(); ankle.position.y = -0.42; knee.add(ankle);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.026, 0.265), this.sole);
    sole.position.set(0, -0.070, -0.030); ankle.add(sole);
    const shoe = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), this.boot);
      m.scale.set(w, h, d); m.position.set(x, y, z); ankle.add(m); return m;
    };
    shoe(0.108, 0.088, 0.215, 0, -0.042, -0.032);      // the vamp
    shoe(0.094, 0.052, 0.100, 0, -0.052, -0.115);      // the toe
    shoe(0.096, 0.100, 0.096, 0, -0.024, 0.046);       // the heel counter
    return { side, g, hip, knee, ankle };
  }

  _noShadows(o) {
    o.traverse(n => { n.castShadow = false; n.receiveShadow = false; n.frustumCulled = false; });
  }

  // ------------------------------------------------------------ api
  /**
   * Put the shoulders where the corners of the frame actually are.
   *
   * The hands sit about half a metre in front of the eye. Half a metre
   * in front of the eye is 0.9 m across at a 100-degree field of view
   * and 0.5 m across at 60, so a fixed offset is a hand in the bottom
   * corner on one setting and a hand entirely off the screen on the
   * next. Measure the frustum instead.
   */
  _frame(cam) {
    const hh = Math.tan(THREE.MathUtils.degToRad(cam.fov) * 0.5);
    const Z = 0.50;
    this.fx = THREE.MathUtils.clamp(hh * (cam.aspect || 1.78) * Z * 0.83, 0.22, 0.46);
    this.fy = -THREE.MathUtils.clamp(hh * Z * 1.00, 0.14, 0.34);
  }

  /** Chapters that put Jared somewhere his arms should not be. */
  setVisible(v) { this.forced = v === null ? null : !!v; }
  /** August is a henley. December is a barn coat. */
  setSleeve(color) { this.cloth.color.setHex(color); }
  /** He reached for something. Called by the interactor. */
  poke(strength = 1) { this.reachV = Math.max(this.reachV, 5.2 * strength); }

  dispose() {
    this.scene.remove(this.root); this.scene.remove(this.body);
    [this.skin, this.cloth, this.trouser, this.boot, this.sole].forEach(m => m.dispose());
    this.root.traverse(o => o.geometry?.dispose());
    this.body.traverse(o => o.geometry?.dispose());
  }

  // ------------------------------------------------------------ update
  update(dt, player, cam, { playing = true } = {}) {
    const s = settings();
    const on = playing && this.enabled && s.viewmodel !== false &&
      (this.forced === null ? !player.frozen : this.forced);
    this.root.visible = on;
    this.body.visible = on;
    if (!on) return;

    this.t += dt;
    const calm = s.reduceMotion ? 0.35 : 1;

    // where the body is
    this.root.position.copy(cam.position);
    this.root.quaternion.copy(cam.quaternion);
    this.body.position.set(cam.position.x, cam.position.y, cam.position.z);
    this.body.rotation.set(0, player.yaw, 0);

    this._frame(cam);
    const planar = Math.hypot(player.vel.x, player.vel.z);
    const run = THREE.MathUtils.clamp((planar - 2.9) / 1.7, 0, 1);
    const walk = THREE.MathUtils.clamp(planar / 2.6, 0, 1);
    const phase = player.bobPhase;
    const breath = Math.sin(this.t * 1.15) * 0.5 + Math.sin(this.t * 0.47) * 0.5;

    // the reach: a spring that gets kicked, not a timeline
    this.reachV += (-this.reach * 46 - this.reachV * 9.5) * dt;
    this.reach += this.reachV * dt;

    const carry = player.carrying ? (player.carrying.heavy ? 1 : 0.7) : 0;
    const torch = player.flashOn ? 1 : 0;

    this.arms.forEach((a, i) => {
      const sd = a.side;
      const lead = i === 1 ? 0 : Math.PI;         // the arms disagree, as arms do
      const sw = Math.sin(phase + lead);
      // idle breath, walk swing, run pump
      let ux = a.rest.upper.x + breath * 0.018 * calm
        + sw * (0.10 * walk + 0.30 * run) * calm
        + carry * 0.26 + this.reach * 0.20;
      let uy = a.rest.upper.y + sd * (0.05 * run) * calm + carry * sd * 0.13;
      let uz = a.rest.upper.z + sd * Math.cos(phase + lead) * 0.05 * run * calm;
      let fx = a.rest.fore.x - Math.abs(sw) * (0.06 * walk + 0.26 * run) * calm
        + carry * 0.22 + this.reach * 0.46;
      let fy = a.rest.fore.y - carry * sd * 0.20;

      // the torch hand comes up in front of him and the fist closes on it
      if (sd === -1 && torch) { ux += 0.24 * torch; fx += 0.30 * torch; }

      a.upper.rotation.set(ux, uy, uz);
      a.fore.rotation.set(fx, fy, a.rest.fore.z);

      // fingers curl for carrying, for the torch, and a little on the reach.
      // Three joints each, and the far joints close hardest, which is what
      // makes a fist look like a fist.
      const curl = Math.max(carry * 0.9, (sd === -1 ? torch : 0) * 1.05, this.reach * 0.5);
      a.fingers.forEach((f, k) => {
        const c = curl * (1 + k * 0.06);
        f.j1.rotation.x = f.rest[0] - c * 0.62;
        f.j2.rotation.x = f.rest[1] - c * 0.85;
        f.j3.rotation.x = f.rest[2] - c * 0.55;
      });
      a.th1.rotation.x = -0.20 - curl * 0.42;
      a.th2.rotation.x = -0.26 - curl * 0.50;

      // the corners of the frame, wherever they are today; and the whole
      // hand drops a touch under sprint, out of the way
      a.g.position.x = sd * this.fx;
      a.g.position.y = this.fy - run * 0.03 * calm;
    });

    // ---- legs. only ever seen looking down, or at a sprint.
    const want = (player.pitch < -0.42 || run > 0.35) ? 1 : 0;
    this.legShow += (want - this.legShow) * Math.min(1, dt * 7);
    this.legs.forEach(l => {
      l.g.visible = this.legShow > 0.03;
      l.g.position.y = -0.94 - (1 - this.legShow) * 0.5;
      const lead = l.side < 0 ? 0 : Math.PI;
      const sw = Math.sin(phase * 0.5 + lead);
      const amp = (0.34 * walk + 0.42 * run) * calm;
      l.hip.rotation.x = sw * amp - 0.04;
      l.knee.rotation.x = Math.max(0, -sw + 0.25) * (0.5 * walk + 0.7 * run) * calm;
      l.ankle.rotation.x = -l.hip.rotation.x * 0.32;
      // crouching folds them up under him
      const crouch = player.crouching ? 1 : 0;
      l.hip.rotation.x -= crouch * 0.55;
      l.knee.rotation.x += crouch * 1.0;
    });
  }
}
