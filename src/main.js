/* ============================================================
   KESSLERTON ROW
   main.js: boot, the letter, the menu, the chapter loop.
   ============================================================ */
import * as THREE from 'three';
import { Renderer } from './core/render.js';
import { World } from './world/world.js';
import { setDoorPlayer } from './world/door.js';
import { ViewModel } from './core/viewmodel.js';
import { Player } from './core/player.js';
import { Interactor } from './core/interact.js';
import { UI, wait } from './core/ui.js';
import { Phone } from './core/phone.js';
import { audio } from './core/audio.js';
import { scares } from './core/scares.js';
import { initInput, Input, requestLock, releaseLock, hit, rawHit, onKey } from './core/input.js';
import { state, settings, saveGame, loadGame, newGame, setFlag, flag, addNote, doneNote, addMessage } from './core/state.js';
import { initMenu, mainMenu, pauseMenu, hideMenu, menuOpen, endingCard } from './core/menu.js';
import { CHAPTERS } from './chapters/index.js';
import { performLine } from './world/props.js';
import { TAPES } from './content/tapes.js';
import { buildRidgeRoadMenuScene } from './chapters/menuscene.js';
import { initDiag, trace, noteError } from './core/diag.js';

/** Never fail to black. If something throws, say so on screen. */
function showFatal(where, e) {
  console.error(`[KESSLERTON ROW] ${where}`, e);
  try { noteError(where, e); } catch {}
  let el = document.getElementById('fatal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal';
    el.style.cssText = `position:fixed;inset:0;z-index:9999;background:#0a0a0b;color:#d8d2c4;
      font:13px/1.6 'JetBrains Mono',monospace;padding:6vh 6vw;overflow:auto;white-space:pre-wrap`;
    document.body.appendChild(el);
  }
  el.textContent =
    `KESSLERTON ROW hit an error in: ${where}\n\n${(e && e.stack) || e}\n\n` +
    `If this says "Failed to resolve module specifier", the page is being opened\n` +
    `from file://, serve it over http instead:  python3 -m http.server 8000`;
}
addEventListener('error', e => showFatal('window', e.error || e.message));
addEventListener('unhandledrejection', e => showFatal('promise', e.reason));

const FRAME_CAP = 60;
const FRAME_MIN_MS = 1000 / FRAME_CAP - 2;

class Game {
  constructor() {
    this.canvas = document.getElementById('viewport');
    this.renderer = new Renderer(this.canvas);
    this.scene = this.renderer.scene;
    this.world = null;
    this.player = null;
    this.chapter = null;
    this.chapterIndex = -1;
    this.paused = false;
    this.running = false;
    this.last = performance.now();
    this.CHAPTERS = CHAPTERS;
    this.TAPES = TAPES;
    this.wantLock = true;
    this.mode = 'boot';
  }

  // ------------------------------------------------------------ boot
  async boot() {
    trace('boot: start');
    initDiag(this);
    UI.init();
    // Every line of dialogue reaches whoever is saying it: the mouth
    // moves, and the stage directions the scripts have always carried
    // ("[she smiles]", "[a long pause]") reach the body that is meant
    // to be doing them.
    UI.onLine = performLine;
    initInput();
    // his hands. they live on the scene, not on the world, so they
    // survive every chapter rebuild.
    this.viewmodel = new ViewModel(this.scene);
    initMenu(this);
    Phone.init(this);
    UI.showHUD(false);

    // Unlock audio on the first real gesture.
    const unlock = async () => {
      await audio.unlock(); audio.applySettings();
      this.audioReady = audio.ready;
      trace('audio unlocked');
      // The score comes up on the first gesture and does not leave
      // again. Which piece is playing is a scene question, never an
      // on/off question.
      audio.unlockMusic({ instant: true });
      audio.musicScene(audio.wantScene || (this.chapter ? this.chapter.id : 'menu'));
    };
    addEventListener('pointerdown', unlock, { once: true });
    addEventListener('keydown', unlock, { once: true });

    onKey((code, down) => {
      if (!down) return;
      if (code === '__lock') return;
      if (code === 'Escape') this.onEscape();
      if (this.mode === 'play' && !this.paused) {
        if (code === settings().keys.phone) { Phone.toggle(); }
        if (code === settings().keys.flashlight && this.player?.hasFlashlight) {
          this.player.setFlashlight(!this.player.flashOn);
          audio.sfx('switch', { vol: .34 });
        }
        if (code === settings().keys.journal) { Phone.show('notes'); }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.mode === 'play' && !this.paused && !Phone.open && !UI.readerOpen && this.wantLock) requestLock();
    });

    trace('boot: loop starting');
    this.loop();
    await this.title();
  }

  async title() {
    trace('title: building menu scene');
    this.mode = 'menu';
    // Ridge Road, at night, with thirty-one streetlights.
    this.buildMenuScene();
    await UI.fadeIn(1600);
    // The cold-open content card is no longer in the boot flow; the notes it
    // carried now live under Credits & Sources. `warningCard()` is still
    // exported, so restoring it is a one-line change.
    await this.menuLoop();
  }

  buildMenuScene() {
    this.disposeWorld();
    this.world = new World(this.scene);
    this.renderer.setGrade('winter');
    this.menu = buildRidgeRoadMenuScene(this.world, this.renderer);
  }

  async menuLoop() {
    this.mode = 'menu';
    if (!this.menu) this.buildMenuScene();
    const choice = await mainMenu();
    hideMenu();
    if (choice === 'continue') {
      const rec = await loadGame('auto');
      if (rec) { await this.startChapter(state.get().chapter, { resume: true }); return; }
    }
    if (choice === 'new') {
      trace('menu: NEW GAME');
      newGame(false);
      await this.letter();
      trace('letter: done');
      await this.startChapter(0);
      return;
    }
    if (choice === 'ngplus') {
      newGame(true);
      UI.toast('NEW GAME +', 'Apartment 3B is unlocked.');
      await this.startChapter(0);
      return;
    }
    await this.menuLoop();
  }

  // ------------------------------------------------------------ the letter
  /**
   * The only narration in the game. A tired male host reads the
   * first two paragraphs over a black screen with tape hiss.
   * After this, nobody explains anything to you again.
   */
  async letter() {
    await UI.fadeOut(700);
    hideMenu();
    UI.showHUD(false);
    UI.letterbox(true);
    UI.toast('press space to skip');
    await audio.unlock();
    audio.loop('hiss', out => {
      const n = audio.src(audio.noise.pink, { loop: true, rate: 0.5 });
      const f = audio.filter('highpass', 900, 0.7);
      const g = audio.gain(0.05);
      n.connect(f).connect(g).connect(out); n.start();
      return () => { try { n.stop(); } catch {} };
    }, { vol: 1 });

    const lines = [
      ['HOST', 'All right. This one came in on paper. Handwritten, both sides, no return address, and a Scranton postmark that does not match the date at the top of it.'],
      ['HOST', 'I have had it checked. Do with that what you like. I am going to read you the first part of it and then I am going to stop, because the rest of it is not mine to read.'],
      ['HOST', '"To whoever does this show now...'],
      ['HOST', 'I am writing this from a car outside a church in a town you have never heard of, and I am going to try very hard to put it in order, because the order is the only part of it I still trust."'],
      ['HOST', '"There is a place about an hour past everything, where the ground has been on fire underneath since before my father was born, and the snow does not sit on it, and everybody knows that, and nobody says it."'],
      ['HOST', '"I met a girl there in August. She was funny. Her hands were always cold."'],
      ['HOST', '"That is the whole of what I knew for four months, and I want you to understand. I want somebody to understand, that four months is not stupid. Four months is just how long it takes."'],
      ['HOST', '[paper]'],
      ['HOST', 'Yeah. We are going to take a break.']
    ];
    let skipped = false;
    const skip = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        skipped = true; UI.clearSub();
      }
    };
    addEventListener('keydown', skip);
    for (const [who, text] of lines) {
      if (skipped) break;
      await UI.say(who, text, { style: 'radio', dur: Math.max(2600, text.length * 56) });
      if (skipped) break;
      await wait(320);
    }
    removeEventListener('keydown', skip);
    UI.clearSub();
    await wait(skipped ? 200 : 900);
    audio.killLoop('hiss', 1.6);
    UI.letterbox(false);
  }

  // ------------------------------------------------------------ chapters
  async startChapter(i, opts = {}) {
    if (i < 0 || i >= CHAPTERS.length) { await this.toMenu(); return; }
    this.mode = 'load';
    hideMenu();
    Phone.close();
    await UI.fadeOut(600);
    this.disposeWorld();

    const def = CHAPTERS[i];
    trace(`chapter ${i + 1}: disposing previous world`);
    this.chapterIndex = i;
    state.set({ chapter: i });
    scares.reset();
    scares.setAct(i <= 1 ? 1 : i === 2 ? 3 : i >= 4 ? 3 : 2);

    this.world = new World(this.scene);
    this.player = new Player(this.renderer.camera, this.world);
    this.player.attachFlashlight(this.scene);
    // doors swing away from whoever opens them, so they need to be able
    // to ask where that is
    setDoorPlayer(this.world, this.player);
    this.viewmodel.setVisible(null);
    this.viewmodel.setSleeve(i >= 2 ? 0x5a4a38 : 0x4a5560);
    this.interactor = new Interactor(this);
    this.menu = null;

    const ctx = this.ctx = {
      game: this, scene: this.scene, world: this.world, player: this.player,
      renderer: this.renderer, camera: this.renderer.camera,
      UI, audio, Phone, scares, state, settings,
      viewmodel: this.viewmodel,
      TAPES, wait,
      flag, setFlag, addNote, doneNote, addMessage,
      next: (o) => this.startChapter(this.chapterIndex + 1, o),
      goto: (n, o) => this.startChapter(CHAPTERS.findIndex(c => c.id === n), o),
      ending: (id) => this.finish(id),
      fromSelect: !!opts.fromSelect,
      resume: !!opts.resume,
      wantLock: true
    };
    Phone.ctx = ctx;
    Phone.subject = null;
    Phone.cameraStage = 0;

    audio.killAllLoops(0.4);
    audio.killRadios();
    // The score is not a loop and does not get torn down between
    // chapters. Each chapter asks for its own piece; the instrument
    // and the room stay the same, so the change reads as the music
    // changing its mind rather than as a track ending.
    audio.unlockMusic({ instant: true });
    audio.musicScene(def.id, { immediate: true });
    audio.setMusicIntensity([0, 0.06, 0.22, 0.38, 0.6, 1.0][i] ?? 0);
    this.chapter = def;

    trace(`chapter ${i + 1}: title card`, { title: def.title });
    if (!opts.resume && !opts.skipCard) {
      await UI.titleCard(def.card, def.title, def.date, def.temp);
    }
    trace(`chapter ${i + 1}: build() begin`);

    // The chapter is LIVE from here, not from when build() returns. A
    // build() is allowed to await the player: Chapter One drives into
    // town and walks him up the stair inside it, Chapter Two is five
    // vignettes that each wait for him to arrive somewhere, Chapter Four
    // is a drive. None of that can happen unless the player controller,
    // the interactor and the scare clock are running while it waits.
    // Chapters that build synchronously and return are unaffected: the
    // screen is still black until the fade below.
    this.mode = 'play';
    UI.showHUD(true);
    try {
      await def.build(ctx);
    } catch (e) {
      showFatal(`chapter ${i + 1} (${def.title})`, e);
      throw e;
    }
    trace(`chapter ${i + 1}: build() done`, {
      colliders: this.world.colliders.length,
      floors: this.world.floors.length,
      interactables: this.world.interactables.length
    });
    this.mode = 'play';
    UI.showHUD(true);
    await UI.fadeIn(1400);
    trace(`chapter ${i + 1}: visible`, {
      calls: this.renderer.renderer.info.render.calls,
      tris: this.renderer.renderer.info.render.triangles
    });
    if (this.wantLock !== false && ctx.wantLock !== false) requestLock();
    saveGame('auto', def.title);
  }

  async finish(endingId) {
    state.set({ ending: endingId });
    await saveGame('auto', 'Ended');
    this.mode = 'ending';
    releaseLock();
    UI.showHUD(false);
    audio.musicScene('ending', { immediate: true });
    audio.setMusicIntensity(0.15);
    const E = {
      A: ['FOREVER', '"He wrote the last part of this letter in December of 2014. It was postmarked the following August. I have had it checked."'],
      B: ['THE NINTH HOUR', '"I am not going to tell you the name of the town. If you are from there you already know, and if you are not, then there is nothing you can do about it from where you are sitting, and I would rather you slept."'],
      C: ['GERALD', '"She asked if her mother was okay. That was the whole of it. Four months, and a church, and a match, and the only thing she wanted with the time she had was to know if somebody else was all right. I think about that more than I think about the rest of it."'],
      KR: ['KESSLERTON ROW', '"There was three months of mail on the floor. I want to be honest with you. I did not go in. I stood on the porch and I looked through the glass at the mail on the floor and I got back in the car."']
    }[endingId] || ['', ''];
    endingCard(E[0], E[1], () => this.toMenu());
  }

  async toMenu() {
    await UI.fadeOut(700);
    this.disposeWorld();
    audio.musicScene('menu', { immediate: true });
    this.chapter = null; this.chapterIndex = -1;
    this.buildMenuScene();
    await UI.fadeIn(1200);
    await this.menuLoop();
  }

  disposeWorld() {
    if (this.world) { this.world.dispose(); this.world = null; }
    if (this.player?.flashlight) { this.scene.remove(this.player.flashlight); this.scene.remove(this.player.flashTarget); }
    this.player = null; this.menu = null;
    audio.killAllLoops(0.3);
    audio.killRadios();
  }

  // ------------------------------------------------------------ pause
  async onEscape() {
    if (UI.readerOpen) return;
    if (Phone.open) { Phone.close(); return; }
    if (this.mode !== 'play' || this.paused) return;
    this.paused = true;
    releaseLock();
    const r = await pauseMenu();
    this.paused = false;
    if (r === 'quit') { await saveGame('auto', this.chapter?.title || ''); await this.toMenu(); }
    else requestLock();
  }

  onSettingsChanged(key) {
    audio.applySettings();
    UI.applySettings();
    this.renderer.applySettings();
    if (key === 'quality') this.renderer.rebuild();
  }

  // ------------------------------------------------------------ loop
  /**
   * A 120 Hz panel asks for twice as many frames as this game has any use
   * for, and every one of them pays for the whole post stack: SSAO, five
   * mips of bloom, and a sixteen-tap depth-of-field. Nothing here is
   * animated finely enough to read the difference between 60 and 120, so
   * the extra vblanks are let go by and the machine stops cooking.
   *
   * The slack matters. A 60 Hz panel delivers frames at 16.67 ms give or
   * take a little jitter, and a hard 16.67 ms gate would reject every
   * other one of those and halve the game to 30. Two milliseconds of
   * grace lets a real 60 Hz frame through and still rejects the 8.33 ms
   * half-frames of a 120 Hz one.
   *
   * Skipping is safe for input because mouse deltas ACCUMULATE
   * (input.js) and look is applied without dt (player.js), so a longer
   * gap turns into exactly the same rotation; and `pressed` is a set
   * that is only cleared at the end of a frame that actually ran, so a
   * key tapped inside a skipped window is still seen.
   */
  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    if (now - this.last < FRAME_MIN_MS) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;

    const active = !this.paused && !menuOpen();
    if (this.viewmodel && !(this.mode === 'play' && active && this.world)) {
      this.viewmodel.root.visible = false;
      this.viewmodel.body.visible = false;
    }
    if (this.world) {
      if (this.mode === 'play' && active) {
        state.set(s => ({ playtime: s.playtime + dt }));
        scares.tick(dt);
        this.player.update(dt, this.ctx);
        this.interactor.update(dt);
        this.viewmodel.update(dt, this.player, this.renderer.camera, { playing: true });
        UI.setStamina(this.player.stamina / 7);
        audio.setListener(this.renderer.camera);
      }
      this.world.update(dt, this.ctx || { world: this.world });
      // Hand the pooled lights to whatever can be seen from here. Must
      // come before renderer.update(), which decides what shadow maps to
      // redraw and needs this frame's intensities to do it.
      this.world.updateLights(this.renderer.camera);
    }
    this.renderer.update(dt);
    this.renderer.render();
    Input.pressed.clear();
    Input.mouse.dx = 0; Input.mouse.dy = 0;
    Input.mouse.lPressed = false;
  }
}

const game = new Game();
window.KR = game;   // for the console; the game does not use it
game.boot().catch(e => {
  console.error(e);
  document.body.innerHTML = `<pre style="color:#c88;font:13px monospace;padding:2rem;white-space:pre-wrap">
KESSLERTON ROW failed to start.

${e && e.stack ? e.stack : e}

This build needs WebGL2 and ES modules over http(s), file:// will not work.
Run:  python3 -m http.server 8000
Then: http://localhost:8000
</pre>`;
});
