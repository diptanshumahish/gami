/* ============================================================
   render-audio.js: bounce the score and the radio to MP3.

   There is no offline Web Audio in Deno, and reimplementing the
   synthesis outside the browser would mean listening to a
   different program than the one that ships. So this drives the
   real thing: a local server hands Chrome the actual src/ modules,
   Chrome renders each piece through an OfflineAudioContext with
   the real engine, real buses and real compressor, and POSTs the
   WAV back. ffmpeg does the rest.

     deno run -A tools/render-audio.js [outDir]

   Output is disposable. Nothing in the game reads it.
   ============================================================ */
const OUT = Deno.args[0] || 'audio-preview';
const ONLY = Deno.args[1] || '';          // score,radio,sfx: which sets to bounce; a third arg `wav` keeps the WAVs too
// pick a free port: a killed run can leave the old one held for a while
const PORT = 8730 + Math.floor(Math.random() * 240);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
await Deno.mkdir(OUT, { recursive: true });
const tmp = await Deno.makeTempDir({ prefix: 'bounce-' });

const made = [];
let finished = false, failure = null;

const server = Deno.serve({ port: PORT, onListen: () => {} }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/save') {
    const name = url.searchParams.get('name');
    const title = url.searchParams.get('title') || name;
    const wav = `${tmp}/${name}.wav`;
    await Deno.writeFile(wav, new Uint8Array(await req.arrayBuffer()));
    made.push({ name, title, wav });
    console.log(`  rendered  ${name}`);
    return new Response('ok');
  }
  if (url.pathname === '/done') { finished = true; return new Response('ok'); }
  if (url.pathname === '/fail') { failure = await req.text(); finished = true; return new Response('ok'); }

  let path = url.pathname === '/' ? '/tools/render.html' : url.pathname;
  path = decodeURIComponent(path).replace(/\.\./g, '');
  try {
    const body = await Deno.readFile('.' + path);
    const ext = path.slice(path.lastIndexOf('.'));
    return new Response(body, { headers: { 'content-type': MIME[ext] || 'application/octet-stream' } });
  } catch { return new Response('not found', { status: 404 }); }
});

console.log('rendering through Chrome, this takes a moment\n');
const chrome = new Deno.Command(CHROME, {
  args: [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    `--user-data-dir=${tmp}/profile`,
    `http://127.0.0.1:${PORT}/?only=${ONLY}`
  ],
  stdout: 'null', stderr: 'null'
}).spawn();

const started = Date.now();
while (!finished && Date.now() - started < 240000) await new Promise(r => setTimeout(r, 250));
try { chrome.kill(); } catch {}
try { await chrome.status; } catch {}
await server.shutdown();

if (failure) {
  console.error('\nthe render page threw:\n' + failure);
  Deno.exit(1);
}
if (!made.length) {
  console.error('\nnothing came back from the browser');
  Deno.exit(1);
}

// ---- WAV -> MP3. peak-normalised, because the game mixes quiet. ----
console.log('\nencoding');
for (const m of made) {
  const mp3 = `${OUT}/${m.name}.mp3`;
  const ff = new Deno.Command('ffmpeg', {
    args: [
      '-y', '-loglevel', 'error', '-i', m.wav,
      '-af', 'dynaudnorm=f=250:g=15:p=0.72:m=6,alimiter=limit=0.94',
      '-codec:a', 'libmp3lame', '-b:a', '192k',
      '-metadata', `title=${m.title}`,
      '-metadata', 'artist=Kesslerton Row',
      mp3
    ],
    stdout: 'null', stderr: 'piped'
  });
  const { code, stderr } = await ff.output();
  if (code !== 0) { console.error(`  ${m.name}: ${new TextDecoder().decode(stderr)}`); continue; }
  if (Deno.args[2] === 'wav') await Deno.copyFile(m.wav, `${OUT}/${m.name}.wav`);   // the raw take, for analysis
  const { size } = await Deno.stat(mp3);
  console.log(`  ${mp3}  ${(size / 1024).toFixed(0)} KB  "${m.title}"`);
}

await Deno.remove(tmp, { recursive: true });
console.log(`\n${made.length} files in ${OUT}/`);
