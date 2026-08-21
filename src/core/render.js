/* ============================================================
   render.js: renderer, camera, and the post stack.

   Order matters (doc §7):
     SSAO → bloom → DOF → grain → CA → vignette → LUT
   DOF is the single biggest contributor to the look, so it is a
   real depth-driven circle-of-confusion blur focused on whatever
   the crosshair is pointed at, not a fixed-plane fake.
   VHS is a DOM layer (styles/game.css) so it can never touch
   gameplay, only title cards, monitors and tapes.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { settings } from './state.js';

// ---------------------------------------------------------------- SSAO
const SSAOShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    resolution: { value: new THREE.Vector2() },
    cameraNear: { value: 0.1 }, cameraFar: { value: 300 },
    radius: { value: 0.55 }, intensity: { value: 0.95 }, bias: { value: 0.012 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 resolution; uniform float cameraNear, cameraFar, radius, intensity, bias;
    varying vec2 vUv;
    float readDepth(vec2 uv){
      float z = texture2D(tDepth, uv).x;
      float n = 2.0*cameraNear*cameraFar;
      return n / (cameraFar + cameraNear - (z*2.0-1.0)*(cameraFar-cameraNear));
    }
    void main(){
      vec4 col = texture2D(tDiffuse, vUv);
      float d = readDepth(vUv);
      if (d > cameraFar*0.6){ gl_FragColor = col; return; }
      float occ = 0.0;
      float ang = fract(sin(dot(vUv, vec2(12.9898,78.233)))*43758.5453)*6.2831;
      for (int i=0;i<12;i++){
        float fi = float(i);
        float a = ang + fi*0.5236;
        float r = radius * (0.25 + 0.75*fract(fi*0.618)) / max(d,0.4);
        vec2 off = vec2(cos(a),sin(a)) * r * 0.06;
        float sd = readDepth(vUv + off);
        float diff = d - sd;
        if (diff > bias && diff < 0.9) occ += smoothstep(0.0,0.35,diff)*(1.0 - diff/0.9);
      }
      occ = clamp(occ/12.0 * intensity, 0.0, 0.82);
      gl_FragColor = vec4(col.rgb * (1.0-occ), col.a);
    }`
};

// ---------------------------------------------------------------- final
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    resolution: { value: new THREE.Vector2() },
    cameraNear: { value: 0.1 }, cameraFar: { value: 300 },
    focus: { value: 3.0 }, aperture: { value: 1.0 }, dofOn: { value: 1.0 },
    focusRange: { value: 0.25 }, maxBlur: { value: 0.0050 },
    time: { value: 0 }, grain: { value: 0.045 }, ca: { value: 0.0018 },
    vignette: { value: 0.52 },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    gamma: { value: new THREE.Vector3(1, 1, 1) },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    sat: { value: 1.0 }, contrast: { value: 1.0 }, exposure: { value: 1.0 },
    tint: { value: new THREE.Color(1, 1, 1) },
    fadeWhite: { value: 0.0 }, fadeBlack: { value: 0.0 },
    pulse: { value: 0.0 }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, focus, aperture, dofOn, focusRange, maxBlur;
    uniform float time, grain, ca, vignette, sat, contrast, exposure, fadeWhite, fadeBlack, pulse;
    uniform vec3 lift, gamma, gain; uniform vec3 tint;
    varying vec2 vUv;

    float readDepth(vec2 uv){
      float z = texture2D(tDepth, uv).x;
      float n = 2.0*cameraNear*cameraFar;
      return n / (cameraFar + cameraNear - (z*2.0-1.0)*(cameraFar-cameraNear));
    }
    // 16-tap golden-angle spiral (GLSL ES 1.00, no array constructors)
    vec2 tap(int i, float rot){
      float fi = float(i);
      float a = fi * 2.39996 + rot;
      float rr = sqrt((fi + 0.5) / 16.0);
      return vec2(cos(a), sin(a)) * rr;
    }

    vec3 sampleCA(vec2 uv, float amt){
      vec2 c = uv - 0.5;
      float e = dot(c,c)*2.0;           // edges only
      vec2 o = c * amt * e;
      return vec3(
        texture2D(tDiffuse, uv+o).r,
        texture2D(tDiffuse, uv).g,
        texture2D(tDiffuse, uv-o).b);
    }

    void main(){
      vec2 uv = vUv;
      vec3 col;

      if (dofOn > 0.5){
        float d = readDepth(uv);
        // Circle of confusion, measured RELATIVE TO THE FOCUS DISTANCE.
        // Dividing by the sample depth (the obvious-looking version) makes
        // anything nearer than the focal point saturate to full blur the
        // instant you look past it, which turns an interior into soup.
        // A smoothstep gives a genuinely sharp band around focus and lets
        // the falloff off into the background where it belongs.
        float dev = abs(d - focus) / max(focus, 0.35);
        float coc = smoothstep(focusRange, focusRange + 1.80, dev) * aperture;
        float r = coc * maxBlur;
        if (r > 0.0004){
          vec3 acc = vec3(0.0); float w = 0.0;
          float rot = fract(sin(dot(uv, vec2(12.9898,78.233)))*43758.5453) * 6.2831;
          for (int i=0;i<16;i++){
            vec2 off = tap(i, rot)*r*vec2(1.0, resolution.x/resolution.y);
            float sd = readDepth(uv+off);
            float sw = (sd < d - 0.25) ? 0.35 : 1.0;   // reduce foreground bleed
            acc += sampleCA(uv+off, ca)*sw; w += sw;
          }
          col = acc / max(w,0.001);
        } else col = sampleCA(uv, ca);
      } else col = sampleCA(uv, ca);

      // Linear -> sRGB. The composer renders into a linear half-float
      // target and this pass is a raw ShaderMaterial, so three never runs
      // <colorspace_fragment> on it and never encodes the result. Without
      // these two lines the entire game is displayed about two stops
      // under: a clear August afternoon came out the colour of midnight
      // and every grade below was being tuned against that.
      // Everything after this point grades in DISPLAY space, which is
      // where lift/gamma/gain, contrast, grain and vignette belong.
      col = max(col, vec3(0.0));
      col = mix(col * 12.92, 1.055 * pow(col, vec3(0.41666)) - 0.055, step(vec3(0.0031308), col));

      col *= exposure;
      col *= tint;

      // lift / gamma / gain
      col = clamp(col,0.0,4.0);
      col = pow(max(col + lift*(1.0-col), 0.0), 1.0/max(gamma,vec3(0.01))) * gain;

      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col = mix(vec3(l), col, sat);
      col = (col - 0.5)*contrast + 0.5;

      // grain: fine, animated, and scaled to the light that is there.
      // Two things this must not do. It must not slide: a noise field
      // offset by a fixed step every tick is a field the eye tracks
      // moving across the frame, so the tick goes into the hash as a
      // seed and the pattern is re-rolled in place. And it must not
      // sprinkle white on black: additive noise on a near-black pixel
      // can only ever brighten it, so the amplitude follows the
      // luminance, with a small floor so the sky still has grain in it.
      // And it must not boil. Most of the field is fixed, a film's grain
      // structure, and only a share of it re-rolls, slowly, so the
      // picture shimmers a little rather than seething.
      vec2 gp = floor(uv*resolution);
      float tick = floor(time*9.0);
      float gs = fract(sin(dot(gp, vec2(12.9898,78.233)))*43758.5453);
      float gd = fract(sin(dot(gp, vec2(12.9898,78.233)) + tick*91.7)*43758.5453);
      float g = mix(gs, gd, 0.30);
      float g2 = fract(sin(dot(floor(gp*0.5), vec2(39.346,11.135)) + tick*57.3)*43758.5453);
      float lum = dot(col, vec3(0.2126,0.7152,0.0722));
      float amp = grain * (0.25 + 1.1*smoothstep(0.0, 0.45, lum));
      col += ((g - 0.5) * 0.85 + (g2 - 0.5) * 0.15) * amp;

      // vignette
      vec2 vc = (uv-0.5)*vec2(1.0, resolution.y/resolution.x);
      float v = smoothstep(0.85, 0.15, length(vc)*1.45);
      col *= mix(1.0, v, vignette);

      col *= (1.0 + pulse);
      col = mix(col, vec3(1.0), fadeWhite);
      col = mix(col, vec3(0.0), fadeBlack);
      gl_FragColor = vec4(max(col,0.0), 1.0);
    }`
};

// ---------------------------------------------------------------- grades
/*
   Every `tone` here used to be about half again what it is now. They were
   set against a post chain that silently threw away the sRGB encode, so
   they were compensating for a factor of two that no longer exists. With
   the encode restored the same numbers turned a gloomy August afternoon
   into a bright one, which is the wrong film entirely: this game is
   overcast, underlit and slightly green, and it is supposed to look like
   four in the afternoon in a town that has been losing for forty years.

   `tone` is the renderer's ACES exposure and it is the honest place to
   set mood, because it works BEFORE the highlight rolloff. Pulling
   `exposure` (which is after it) instead just crushes.
*/
export const GRADES = {
  // Aug–Oct: sodium vapour amber over dusk blue-grey
  // Low contrast, desaturated, a little milky in the blacks, and pushed
  // to one warm cast: this is a camcorder in a kitchen, not a photograph.
  autumn: { lift: [0.026, 0.022, 0.030], gamma: [1.0, 0.99, 1.03], gain: [1.03, 0.99, 0.94], sat: 0.74, contrast: 0.96, tint: 0xf3e8d8, exposure: 0.98, tone: 0.612 },
  // Nov–Dec: desaturate hard
  winter: { lift: [0.022, 0.026, 0.036], gamma: [1.02, 1.01, 0.99], gain: [0.95, 0.99, 1.05], sat: 0.58, contrast: 1.02, tint: 0xe8eef6, exposure: 0.92, tone: 0.476 },
  // Church: lamp-oil orange against total black. Nothing else.
  church: { lift: [0.004, 0.002, 0.002], gamma: [0.95, 0.98, 1.05], gain: [1.12, 0.94, 0.74], sat: 0.84, contrast: 1.2, tint: 0xffd7ad, exposure: 0.9, tone: 0.425 },
  // Ending: the only clean daylight in the game.
  daylight: { lift: [0.024, 0.026, 0.028], gamma: [1.04, 1.04, 1.04], gain: [1.06, 1.07, 1.08], sat: 0.88, contrast: 0.96, tint: 0xffffff, exposure: 1.0, tone: 0.697 },
  // Menu / letter
  tape: { lift: [0.02, 0.02, 0.02], gamma: [1.0, 1.0, 1.0], gain: [0.95, 0.97, 1.0], sat: 0.5, contrast: 1.15, tint: 0xdfe6ec, exposure: 0.9, tone: 0.51 }
};

// ---------------------------------------------------------------- shadow cull
/*
   Three redraws the shadow map of every shadow-casting light in the
   scene, every frame, with no regard for whether that light reaches
   anything you can currently see (WebGLShadowMap.render: it skips a
   light only when `shadow.autoUpdate` is false, and never looks at
   intensity, distance or the frustum).

   A point light is not one pass. Its frame extents are 4x2, so a 512
   map becomes a 2048x1024 atlas and SIX full depth renders of the whole
   world. Ashgrove has seven shadow-casting bulbs, and they were all
   being redrawn at all times: the ones switched off, the ones three
   streets away behind a wall, and the Vasko house that chapter six
   builds at (300, -400, 0) so it can be cut to later.

   The cull is exact rather than a heuristic. A point or spot light with
   a finite `distance` contributes precisely zero past that radius --
   three's falloff reaches zero AT the cutoff, it does not taper beyond
   it -- so if the light's influence sphere misses the frustum, or its
   intensity is zero, no visible fragment can be lit by it and its
   shadow map cannot be seen. Leaving that map stale is invisible.

   Two things this deliberately does not do:
     - it does not touch `castShadow`, because the number of shadow
       casters is baked into every material's shader defines, and
       changing it would recompile the entire scene mid-frame;
     - it does not cull directional lights, which have no radius, and
       it does not freeze static maps, because doors swing and people
       walk and those shadows have to keep up.
*/
const _frustum = new THREE.Frustum();
const _projScreen = new THREE.Matrix4();
const _cullSphere = new THREE.Sphere();
const _lightPos = new THREE.Vector3();
// A metre of slack on the influence radius, so nothing can pop at the
// exact edge of the frustum on a frame where something moved fast.
const SHADOW_CULL_MARGIN = 1.0;
const SHADOW_RESCAN = 0.5;   // seconds between rebuilds of the light list

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(this._dpr());
    r.setSize(innerWidth, innerHeight, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.06, 300);
    this._applyFov();
    this.scene = new THREE.Scene();

    this._buildComposer();
    this.grade = 'autumn';
    this.setGrade('autumn');
    this.applySettings();
    this._focusTarget = 3;
    this._t = 0;
    this._shadowLights = [];
    this._shadowScan = 0;

    addEventListener('resize', () => this.resize());
  }

  /**
   * The FOV setting is the angle *across* the screen, not up it.
   * Three wants the vertical, and a vertical FOV on a wide monitor is a
   * fisheye -- 72 up is 105 across at 16:9, which stretches the floor,
   * balloons anything near the frame edge (his hands), and makes a man of
   * ordinary height feel like he is walking on stilts. Hor+ keeps the
   * horizontal fixed and lets the vertical fall out of the aspect, which
   * is what every first-person game does and what the eye expects.
   */
  _applyFov() {
    const h = THREE.MathUtils.degToRad(settings().fov);
    const a = Math.max(0.5, this.camera.aspect || 16 / 9);
    const v = 2 * Math.atan(Math.tan(h / 2) / a);
    this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(v), 30, 78);
    this.camera.updateProjectionMatrix();
  }

  _dpr() {
    const q = settings().quality;
    // A touch under native on purpose: the frame should carry a faint
    // upscaled softness, not a pin-sharp edge on every brick.
    const cap = q === 'high' ? 1.0 : q === 'medium' ? 0.85 : 0.7;
    return Math.min(devicePixelRatio || 1, cap);
  }

  _buildComposer() {
    const q = settings().quality;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, samples: q === 'high' ? 4 : 0
    });
    rt.depthTexture = new THREE.DepthTexture(size.x, size.y);
    rt.depthTexture.type = THREE.UnsignedShortType;
    this.rt = rt;

    const c = this.composer = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));

    if (q !== 'low') {
      this.ssao = new ShaderPass(SSAOShader);
      this.ssao.uniforms.tDepth.value = rt.depthTexture;
      this.ssao.uniforms.resolution.value.set(size.x, size.y);
      this.ssao.uniforms.intensity.value = q === 'high' ? 0.95 : 0.65;
      c.addPass(this.ssao);
    }
    if (q !== 'low') {
      // strength / radius / threshold, low and tight. Practical lights are
      // supposed to read as lights, not as weather.
      // low strength, WIDE radius: a practical bleeds into the pixels
      // round it rather than sitting in a tight hot disc
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.85, 0.74);
      c.addPass(this.bloom);
    }
    this.final = new ShaderPass(FinalShader);
    this.final.uniforms.tDepth.value = rt.depthTexture;
    this.final.uniforms.resolution.value.set(size.x, size.y);
    this.final.uniforms.dofOn.value = q === 'low' ? 0 : 1;
    this.final.renderToScreen = true;
    c.addPass(this.final);
  }

  rebuild() {
    this.composer?.dispose?.();
    this.renderer.setPixelRatio(this._dpr());
    this._buildComposer();
    this.setGrade(this.grade);
    this.applySettings();
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._applyFov();
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer.setSize(w, h);
    this.rt.depthTexture.image.width = size.x;
    this.rt.depthTexture.image.height = size.y;
    this.ssao?.uniforms.resolution.value.set(size.x, size.y);
    this.final.uniforms.resolution.value.set(size.x, size.y);
    this.bloom?.setSize(size.x, size.y);
  }

  setGrade(name, blend = 0) {
    const g = GRADES[name] || GRADES.autumn;
    this.grade = name;
    const u = this.final.uniforms;
    // ACES is applied to the scene before any of the post uniforms, so the
    // grade's `tone` is the only lever that lifts a whole exterior without
    // also lifting the crushed blacks the game is built on.
    const tone = g.tone ?? 1.0;
    this.renderer.toneMappingExposure = blend <= 0
      ? tone
      : this.renderer.toneMappingExposure + (tone - this.renderer.toneMappingExposure) * blend;
    const c = new THREE.Color(g.tint);
    if (blend <= 0) {
      u.lift.value.fromArray(g.lift); u.gamma.value.fromArray(g.gamma); u.gain.value.fromArray(g.gain);
      u.sat.value = g.sat; u.contrast.value = g.contrast; u.tint.value.copy(c); u.exposure.value = g.exposure;
    } else {
      u.lift.value.lerp(new THREE.Vector3().fromArray(g.lift), blend);
      u.gamma.value.lerp(new THREE.Vector3().fromArray(g.gamma), blend);
      u.gain.value.lerp(new THREE.Vector3().fromArray(g.gain), blend);
      u.sat.value += (g.sat - u.sat.value) * blend;
      u.contrast.value += (g.contrast - u.contrast.value) * blend;
      u.exposure.value += (g.exposure - u.exposure.value) * blend;
      u.tint.value.lerp(c, blend);
    }
  }

  /** DOF focus follows the crosshair (doc §7). */
  setFocus(dist) { this._focusTarget = THREE.MathUtils.clamp(dist, 0.35, 60); }

  applySettings() {
    const s = settings();
    this._applyFov();
    const u = this.final.uniforms;
    // Reduce Flashing halves the grain; nothing removes it.
    u.grain.value = s.noFlashing ? 0.02 : 0.045;
    u.ca.value = s.reduceMotion ? 0.0009 : 0.0018;
    const dof = s.dof ?? 1;
    u.aperture.value = dof;
    u.dofOn.value = (dof > 0.01 && s.quality !== 'low') ? 1 : 0;
    if (this.bloom) this.bloom.strength = 0.22 * (s.bloom ?? 1);
  }

  /** See the note above the class. Runs before render(), every frame. */
  _cullShadows(dt) {
    this._shadowScan -= dt;
    if (this._shadowScan <= 0) {
      this._shadowScan = SHADOW_RESCAN;
      const list = this._shadowLights;
      list.length = 0;
      this.scene.traverse(o => {
        if (o.isLight && o.castShadow && o.shadow && (o.isPointLight || o.isSpotLight)) list.push(o);
      });
    }
    const lights = this._shadowLights;
    if (!lights.length) return;

    const cam = this.camera;
    cam.updateMatrixWorld();
    _projScreen.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projScreen);

    for (let i = lights.length - 1; i >= 0; i--) {
      const l = lights[i];
      if (!l.parent) { lights.splice(i, 1); continue; }   // chapter tore it down
      let live = l.visible && l.intensity > 0.001;
      if (live && l.distance > 0) {
        l.getWorldPosition(_lightPos);                     // walks the parent chain, so never a frame stale
        _cullSphere.center.copy(_lightPos);
        _cullSphere.radius = l.distance + SHADOW_CULL_MARGIN;
        live = _frustum.intersectsSphere(_cullSphere);
      }
      l.shadow.autoUpdate = live;
      if (!live) l.shadow.needsUpdate = false;
    }
  }

  update(dt) {
    this._cullShadows(dt);
    this._t += dt;
    const u = this.final.uniforms;
    u.time.value = this._t;
    u.focus.value += (this._focusTarget - u.focus.value) * Math.min(1, dt * 5.5);
    this.ssao && (this.ssao.uniforms.cameraNear.value = this.camera.near, this.ssao.uniforms.cameraFar.value = this.camera.far);
    u.cameraNear.value = this.camera.near; u.cameraFar.value = this.camera.far;
  }

  render() { this.composer.render(); }
}
