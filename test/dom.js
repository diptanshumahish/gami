/* Minimal DOM/browser stub, enough to construct the world headlessly.
   No WebGL — the renderer is faked in smoke.js. */
const noop = () => {};
function ctx2d(w, h) {
  const api = {};
  const names = ['fillRect','clearRect','strokeRect','beginPath','arc','ellipse','moveTo','lineTo',
    'bezierCurveTo','quadraticCurveTo','closePath','fill','stroke','save','restore','translate',
    'rotate','scale','setLineDash','fillText','strokeText','drawImage','clip','rect','putImageData','setTransform'];
  names.forEach(n => api[n] = noop);
  api.canvas = { width: w, height: h };
  api.createImageData = (a, b) => {
    const ww = typeof a === 'number' ? a : w, hh = typeof b === 'number' ? b : h;
    return { width: ww, height: hh, data: new Uint8ClampedArray(ww * hh * 4) };
  };
  api.getImageData = (x, y, ww, hh) => ({ width: ww, height: hh, data: new Uint8ClampedArray(ww * hh * 4) });
  api.createRadialGradient = () => ({ addColorStop: noop });
  api.createLinearGradient = () => ({ addColorStop: noop });
  api.measureText = () => ({ width: 10 });
  return api;
}
function el(tag) {
  const node = {
    tagName: String(tag).toUpperCase(), style: { setProperty: noop }, dataset: {},
    children: [], classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    width: 300, height: 150, textContent: '', innerHTML: '',
    appendChild(c) { this.children.push(c); return c; },
    removeChild: noop, remove: noop, addEventListener: noop, removeEventListener: noop,
    querySelector: () => el('div'), querySelectorAll: () => [],
    getContext(kind) { return kind === '2d' ? ctx2d(this.width, this.height) : null; },
    toDataURL: () => 'data:image/jpeg;base64,',
    setAttribute: noop, getAttribute: () => null, focus: noop, click: noop,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600, top: 0, left: 0 })
  };
  return node;
}
const document = {
  createElement: el,
  documentElement: el('html'),
  body: el('body'),
  addEventListener: noop, removeEventListener: noop,
  querySelector: () => el('div'), querySelectorAll: () => [],
  getElementById: () => el('div'),
  pointerLockElement: null, exitPointerLock: noop
};
globalThis.document = document;
globalThis.window = globalThis;
globalThis.navigator = globalThis.navigator || { userAgent: 'node' };
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = noop; globalThis.removeEventListener = noop;
globalThis.requestAnimationFrame = (f) => 0;
globalThis.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
globalThis.indexedDB = undefined;
globalThis.HTMLCanvasElement = class {};
globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
globalThis.AudioContext = undefined;
globalThis.structuredClone = globalThis.structuredClone || ((o) => JSON.parse(JSON.stringify(o)));
export { document };
