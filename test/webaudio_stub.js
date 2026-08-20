/* A strict-ish Web Audio stub. It does not render sound; it enforces the
   parts of the spec that actually throw, and refuses NaN/undefined, which
   is the failure mode that matters for procedural audio. */
const problems = [];
export function issues() { return problems; }
function bad(where, v) {
  if (typeof v !== 'number' || !isFinite(v)) problems.push(`${where}: non-finite value ${v}`);
}
let PARAM_ID = 0;

class AudioParam {
  constructor(name, value = 0, owner = '?') {
    this.name = `${owner}.${name}`; this._v = value; this.id = PARAM_ID++;
    this.events = [];
  }
  get value() { return this._v; }
  set value(v) { bad(`${this.name}=`, v); this._v = v; }
  setValueAtTime(v, t) { bad(`${this.name}.setValueAtTime(v)`, v); bad(`${this.name}.setValueAtTime(t)`, t); if (t < 0) problems.push(`${this.name}: negative time`); this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v, t) { bad(`${this.name}.linearRamp(v)`, v); bad(`${this.name}.linearRamp(t)`, t); this.events.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) {
    bad(`${this.name}.expRamp(v)`, v); bad(`${this.name}.expRamp(t)`, t);
    if (v === 0) problems.push(`${this.name}: exponentialRampToValueAtTime(0) throws in a real browser`);
    if (v < 0) problems.push(`${this.name}: exponentialRampToValueAtTime(negative)`);
    this.events.push(['exp', v, t]); return this;
  }
  setTargetAtTime(v, t, tc) { bad(`${this.name}.setTarget(v)`, v); bad(`${this.name}.setTarget(t)`, t); bad(`${this.name}.setTarget(tc)`, tc); if (tc <= 0) problems.push(`${this.name}: setTargetAtTime timeConstant <= 0`); this.events.push(['tgt', v, t]); return this; }
  cancelScheduledValues(t) { bad(`${this.name}.cancel(t)`, t); return this; }
  setValueCurveAtTime() { return this; }
}

class AudioNode {
  // nodes are counted, not retained: a twenty-minute run builds
  // hundreds of thousands of them and the array is the bottleneck
  constructor(ctx, kind) { this.context = ctx; this.kind = kind; this._out = []; ctx.nodeCount++; }
  connect(dst) {
    if (dst == null) { problems.push(`${this.kind}.connect(null/undefined)`); return dst; }
    if (!(dst instanceof AudioNode) && !(dst instanceof AudioParam)) problems.push(`${this.kind}.connect(non-node ${dst})`);
    this._out.push(dst); return dst;
  }
  disconnect() { this._out = []; }
}
class SourceNode extends AudioNode {
  constructor(ctx, kind) { super(ctx, kind); this._started = false; this._stopped = false; }
  start(when = 0, off, dur) {
    // anything oscillating below 5 Hz is a modulator, not a tone.
    // keep it so the "no slow modulation" test can walk its graph.
    if (this.kind === 'osc' && this.frequency && this.frequency.value < 5) this.context.slowOscillators.push(this);
    bad(`${this.kind}.start(when)`, when);
    if (when < 0) problems.push(`${this.kind}.start negative time`);
    if (off !== undefined) bad(`${this.kind}.start(offset)`, off);
    if (dur !== undefined) bad(`${this.kind}.start(duration)`, dur);
    if (this._started) problems.push(`${this.kind}.start called twice`);
    this._started = true;
  }
  stop(when = 0) {
    bad(`${this.kind}.stop(when)`, when);
    if (!this._started) problems.push(`${this.kind}.stop before start`);
    this._stopped = true;
  }
}

class AudioContextStub {
  constructor() {
    this.sampleRate = 48000; this.currentTime = 0; this.state = 'running';
    this.nodeCount = 0;
    this.slowOscillators = [];
    this.destination = new AudioNode(this, 'destination');
    this.listener = {
      positionX: new AudioParam('positionX', 0, 'listener'), positionY: new AudioParam('positionY', 0, 'listener'), positionZ: new AudioParam('positionZ', 0, 'listener'),
      forwardX: new AudioParam('forwardX', 0, 'listener'), forwardY: new AudioParam('forwardY', 0, 'listener'), forwardZ: new AudioParam('forwardZ', -1, 'listener'),
      upX: new AudioParam('upX', 0, 'listener'), upY: new AudioParam('upY', 1, 'listener'), upZ: new AudioParam('upZ', 0, 'listener')
    };
  }
  resume() { return Promise.resolve(); }
  createBuffer(ch, len, sr) {
    if (!(len > 0)) problems.push(`createBuffer length ${len}`);
    const data = []; for (let i = 0; i < ch; i++) data.push(new Float32Array(Math.max(1, Math.floor(len))));
    return { numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: i => data[i] };
  }
  createGain() { const n = new AudioNode(this, 'gain'); n.gain = new AudioParam('gain', 1, 'gain'); return n; }
  createDelay(max = 1) { const n = new AudioNode(this, 'delay'); n.maxDelay = max; n.delayTime = new AudioParam('delayTime', 0, 'delay'); n._max = max; return n; }
  createBiquadFilter() {
    const n = new AudioNode(this, 'biquad');
    n._type = 'lowpass';
    Object.defineProperty(n, 'type', { get: () => n._type, set: v => {
      const ok = ['lowpass','highpass','bandpass','lowshelf','highshelf','peaking','notch','allpass'];
      if (!ok.includes(v)) problems.push(`biquad bad type ${v}`); n._type = v;
    }});
    n.frequency = new AudioParam('frequency', 350, 'biquad');
    n.Q = new AudioParam('Q', 1, 'biquad');
    n.gain = new AudioParam('gain', 0, 'biquad');
    n.detune = new AudioParam('detune', 0, 'biquad');
    return n;
  }
  createOscillator() {
    const n = new SourceNode(this, 'osc');
    n._type = 'sine';
    Object.defineProperty(n, 'type', { get: () => n._type, set: v => {
      const ok = ['sine','square','sawtooth','triangle','custom'];
      if (!ok.includes(v)) problems.push(`osc bad type ${v}`); n._type = v;
    }});
    n.frequency = new AudioParam('frequency', 440, 'osc');
    n.detune = new AudioParam('detune', 0, 'osc');
    n.setPeriodicWave = (w) => { if (!w || w.__kind !== 'periodicwave') problems.push('setPeriodicWave got non-wave'); n._type = 'custom'; };
    return n;
  }
  createBufferSource() {
    const n = new SourceNode(this, 'bufsrc');
    n.buffer = null; n.loop = false;
    n.playbackRate = new AudioParam('playbackRate', 1, 'bufsrc');
    n.detune = new AudioParam('detune', 0, 'bufsrc');
    const origStart = n.start.bind(n);
    n.start = (...a) => { if (!n.buffer) problems.push('bufsrc.start with no buffer'); origStart(...a); };
    return n;
  }
  createConvolver() { const n = new AudioNode(this, 'convolver'); n.buffer = null; n.normalize = true; return n; }
  createStereoPanner() { const n = new AudioNode(this, 'stereopanner'); n.pan = new AudioParam('pan', 0, 'stereopanner'); return n; }
  createPanner() {
    const n = new AudioNode(this, 'panner');
    n.panningModel = 'equalpower'; n.distanceModel = 'inverse';
    n.refDistance = 1; n.maxDistance = 10000; n.rolloffFactor = 1;
    n.positionX = new AudioParam('positionX', 0, 'panner'); n.positionY = new AudioParam('positionY', 0, 'panner'); n.positionZ = new AudioParam('positionZ', 0, 'panner');
    n.setPosition = (x, y, z) => { bad('panner.setPosition', x); bad('panner.setPosition', y); bad('panner.setPosition', z); };
    return n;
  }
  createDynamicsCompressor() {
    const n = new AudioNode(this, 'comp');
    for (const k of ['threshold','knee','ratio','attack','release']) n[k] = new AudioParam(k, 0, 'comp');
    return n;
  }
  createWaveShaper() {
    const n = new AudioNode(this, 'waveshaper');
    n._curve = null;
    Object.defineProperty(n, 'curve', { get: () => n._curve, set: v => {
      if (!(v instanceof Float32Array)) problems.push('waveShaper.curve must be a Float32Array');
      else { for (let i = 0; i < v.length; i++) if (!isFinite(v[i])) { problems.push('waveShaper.curve has non-finite entries'); break; } }
      n._curve = v;
    }});
    n.oversample = 'none';
    return n;
  }
  createPeriodicWave(real, imag) {
    if (!(real instanceof Float32Array) || !(imag instanceof Float32Array)) problems.push('createPeriodicWave needs Float32Arrays');
    else if (real.length !== imag.length) problems.push('createPeriodicWave real/imag length mismatch');
    return { __kind: 'periodicwave' };
  }
}
/**
 * Walk out from a modulator and report every AudioParam it reaches,
 * with the effective depth (the product of the gains on the way).
 * Returns [{param, depth}].
 */
export function modulationTargets(osc, maxDepth = 6) {
  const found = [];
  const walk = (node, depth, scale) => {
    if (depth > maxDepth) return;
    for (const dst of node._out || []) {
      if (dst instanceof AudioParam) { found.push({ param: dst.name, depth: scale }); continue; }
      const g = (dst.kind === 'gain' && dst.gain) ? dst.gain.value : 1;
      walk(dst, depth + 1, scale * g);
    }
  };
  walk(osc, 0, 1);
  return found;
}

export function install(g = globalThis) {
  g.AudioContext = AudioContextStub;
  g.webkitAudioContext = AudioContextStub;
  return AudioContextStub;
}
export { AudioContextStub };
