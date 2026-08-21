/* ============================================================
   capture.js: a frame of Ridge Road, to a PNG, without a browser
   window.

     deno run -A tools/capture.js out.png "cx=0&cy=1.7&cz=16&yaw=-90" [w h]

   Same query string as tools/shot.html (camera, yaw, pitch, fov, fog,
   night, snow, open, sky, grade, frames), plus:

     people=1&n=5&pseed=0&pz=12.3&prot=0   a line of pedestrians from
                                           life.js in front of the camera
                                           instead of the street's own

   It serves the repo, points headless Chrome at a page that builds the
   block with the real renderer, grabs toDataURL in the same rAF tick as
   the render (the drawing buffer is not preserved, so --screenshot on
   its own gives you black), POSTs the PNG back and exits. Needs Chrome
   at the macOS path below. This is how the props, the people and the
   facades get looked at without playing to them.
   ============================================================ */
const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const [out, qs = '', W = '1600', H = '900'] = Deno.args;
const PORT = 8800 + Math.floor(Math.random() * 150);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const PAGE = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style>
<canvas id="viewport"></canvas>
<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { Renderer } from '/src/core/render.js';
import { World } from '/src/world/world.js';
import { buildRidgeBlock } from '/src/world/loc_street.js';
import { buildSky } from '/src/world/sky.js';
import { extra } from '/src/world/life.js';
const P = new URLSearchParams(location.search);
const num = (k, d) => P.has(k) ? parseFloat(P.get(k)) : d;
const on = (k) => parseFloat(P.get(k) || 0) === 1;
const log = (m) => fetch('/log', { method: 'POST', body: String(m) });
window.addEventListener('error', e => log('ERR ' + e.message + ' ' + (e.error && e.error.stack)));
try {
const renderer = new Renderer(document.getElementById('viewport'));
const world = new World(renderer.scene);
renderer.setGrade(P.get('grade') || 'autumn');
const night = on('night'), snow = on('snow');
const sky = buildSky(world, { preset: P.get('sky') || (night ? 'night' : 'afternoon'), camera: renderer.camera, fogDensity: num('fog', night ? 0.0095 : 0.0060) });
buildRidgeBlock(world, { x: 0, y: 0, z: 0, night, snow, winter: snow, shopsOpen: on('open'), life: !on('people') });
if (on('people')) {
  const pg = new THREE.Group(); world.add(pg);
  const n = num('n', 5);
  for (let i = 0; i < n; i++) {
    const p = extra(pg, 1000 + i * 77 + num('pseed', 0), { winter: snow });
    p.g.position.set((i - (n - 1) / 2) * 0.9, 0, num('pz', 12.3));
    p.g.rotation.y = num('prot', 0) * Math.PI / 180;
  }
}
if (night) { world.hemi(0x51709a, 0x181209, 1.15); world.sun([0.35, -0.62, -0.70], 0xA9C0E4, 2.2); }
else { world.hemi(0x8b9aa8, 0x453d31, 1.75); world.sun([-0.275, -0.40, -0.45], 0xE8CBA4, 1.1); }
const cam = renderer.camera;
cam.fov = num('fov', cam.fov); cam.updateProjectionMatrix();
cam.position.set(num('cx', 0), num('cy', 1.72), num('cz', 16.2));
cam.rotation.order = 'YXZ';
cam.rotation.set(num('pitch', 0) * Math.PI / 180, num('yaw', -90) * Math.PI / 180, 0);
const SETTLE = Math.round(num('frames', 12));
let n = 0;
function loop() {
  const dt = 1 / 60;
  world.update(dt, { camera: cam }); sky?.update?.(dt); renderer.render(dt); n++;
  if (n === SETTLE) {
    const data = document.getElementById('viewport').toDataURL('image/png');
    fetch('/save', { method: 'POST', body: data }).then(() => log('saved'));
    return;
  }
  requestAnimationFrame(loop);
}
loop();
} catch (e) { log('ERR ' + e.message + ' ' + e.stack); }
</script>`;
let done = false;
const server = Deno.serve({ port: PORT, onListen: () => {} }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/log') { console.log('[page]', await req.text()); return new Response('ok'); }
  if (url.pathname === '/save') {
    const b64 = (await req.text()).split(',')[1];
    await Deno.writeFile(out, Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    done = true; return new Response('ok');
  }
  if (url.pathname === '/capture.html') return new Response(PAGE, { headers: { 'content-type': 'text/html' } });
  try {
    const f = await Deno.readFile(REPO + url.pathname);
    const ext = url.pathname.slice(url.pathname.lastIndexOf('.'));
    return new Response(f, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } });
  } catch { return new Response('nf', { status: 404 }); }
});
// `page=/tools/drive.html` points Chrome at another page in the repo that
// knows to POST its frame to /save (see tools/drive.html, ?capture=1).
const pageOf = new URLSearchParams(qs).get('page') || '/capture.html';
const chrome = new Deno.Command(CHROME, { args: ['--headless=new', '--use-angle=metal', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, '--no-first-run', '--user-data-dir=/tmp/cap-profile-' + PORT, `http://127.0.0.1:${PORT}${pageOf}?${qs}`], stdout: 'null', stderr: 'null' }).spawn();
const t0 = Date.now();
while (!done && Date.now() - t0 < 90000) await new Promise(r => setTimeout(r, 200));
try { chrome.kill(); } catch {}
await server.shutdown();
console.log(done ? `wrote ${out}` : 'TIMEOUT');
Deno.exit(done ? 0 : 1);
