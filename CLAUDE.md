# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KESSLERTON ROW: a first-person narrative horror game in the browser. Plain ES modules, no build step, no package manager, no `node_modules`. Three.js r169 is vendored in `vendor/three/` and resolved through the importmap in `index.html` (`three`, `three/addons/`). Every texture, sound and piece of geometry is generated at runtime; there are no asset files except fonts (`audio-preview/` is a disposable bounce, nothing reads it).

`README.md` is the design document as well as the readme: full story, chapter-by-chapter beats, the rules of the world, what is and is not built, known issues. Read the relevant section before touching a chapter or a system.

## Commands

Serve over HTTP (ES modules will not load from `file://`):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Tests are headless Deno scripts (Deno 2.x is installed). Each is standalone; run one at a time:

```bash
deno run -A --import-map=test/importmap.json test/smoke.js   # builds every location + every chapter, house-rules lint
deno run -A --import-map=test/importmap.json test/audio.js   # whole synth engine against a strict Web Audio stub
deno run -A --import-map=test/importmap.json test/walk.js    # walks routes through the apartment and Ridge Road against real floors/colliders
deno run -A --import-map=test/importmap.json test/act.js     # dialogue lines drive a character rig, prints rig state
deno run -A --import-map=test/importmap.json test/act1.js    # plays Chapter One end to end (answers dialogue instantly, first choice always)
```

`test/smoke.js` is the broadest one; it ends with `ALL SMOKE TESTS PASSED` or a stack. There is no test runner and no single "run everything" command. See **Testing discipline** below before running anything: pick the one test that covers the change, or none.

Syntax check:

```bash
for f in $(find src -name '*.js'); do node --check "$f" || echo "FAIL $f"; done
```

Visual/audio tooling (serve the repo first):

- `tools/shot.html?cx=&cy=&cz=&yaw=&pitch=&fov=&fog=&night=1&snow=1&open=1&sky=&grade=&frames=` renders a held shot of Ridge Road with the real renderer and post stack; `window.__ready` / `window.__ms` report settle and mean frame time. Use it (or a similar one-room page + headless Chrome `toDataURL` in the same rAF tick) to look at geometry/lighting without playing to it.
- `deno run -A tools/capture.js out.png "cx=&cy=&cz=&yaw=&pitch=&night=1&grade=daylight&frames=20"` grabs the same shot headlessly to a PNG (same query string; add `people=1&n=5` for a line of pedestrians). This is the fast loop for judging props, people and facades: shoot, Read the PNG, adjust.
- `test/preview.html?who=` previews a character face/rig. `tools/people.html?who=recca,victor,extra&walk=1` is the line-up of the cast in one lit room through the real renderer; `deno run -A tools/capture.js out.png "page=/tools/people.html&capture=1&who=recca,man&dist=1.4"` grabs it headlessly.
- `deno run -A tools/render-audio.js [outDir]` bounces the score and radio to MP3 via a real Chrome `OfflineAudioContext` (needs Chrome at the hardcoded macOS path and ffmpeg).
- `F8` in game toggles the diagnostics overlay (`src/core/diag.js`: boot trace, black-screen watchdog).

## Architecture

**Boot and loop** (`src/main.js`): a `Game` object owns one `THREE.Scene`, the `Renderer`, the `ViewModel` (hands/sleeves), and per-chapter `World`, `Player`, `Interactor`. `startChapter(i)` disposes the old world, builds a fresh `World`/`Player`, constructs the chapter `ctx`, plays the title card, then `await def.build(ctx)`. The chapter is live (`mode = 'play'`) from the first line of `build()`, so a chapter may await the player mid-build (Chapter One drives into town; Chapter Two waits for him to arrive); the RAF loop ticks world/player/interactor/scares/audio throughout. Chapters that build synchronously and return are unaffected.

**Chapter contract** (`src/chapters/`): a chapter exports `{ id, card, title, date, temp, build(ctx) }` and is listed in order in `chapters/index.js`. `build(ctx)` is a long async script: it builds locations into `ctx.world`, places the player, wires interactables and triggers, and awaits beats. `ctx` carries `world, player, renderer, camera, scene, UI, audio, Phone, scares, state, settings, viewmodel, TAPES, wait, flag/setFlag/addNote/doneNote/addMessage`, plus `next(opts)`, `goto(chapterId, opts)`, `ending(id)`, and `fromSelect`/`resume` flags. `chapters/util.js` has the shared beat helpers (`convo`, `J`/`SAY`, `beat`, `objective`, `carryable`, `hingedDoor`, `forceLook`, `hardCut`, `numb`). Chapter scripts gate on promises and state; a chapter that deadlocks looks identical to one waiting for the player, which is what `test/act1.js` exists to catch.

**World** (`src/world/world.js`): `World` is the single registry for a chapter's space: `colliders` (AABBs with tags), `floors` (rects answered by `floorAt(x,z,y)`, the only thing that decides whether a room can be crossed), `triggers`, `interactables` (`world.interact(mesh, {label, use, dist, hold, carry, once})`), and a pooled light system (`bulb()`, `hemi()`, `sun()`, `updateLights(camera)`). Builders are free functions taking `(world, ...)`: `wall`, `wallWithDoor`, `wallWithWindow`, `floor`, `ceiling`, `solid`, `stairs`, `deco`. `SCALE` holds the room-metric constants. Geometry is cached through `geo(key, make)` and the `BOX/CYL/SPH/PLN` helpers; `World.dispose()` currently disposes these shared caches too (known issue, harmless but wasteful).

**Locations** (`src/world/loc_*.js`): each exports `buildX(world, opts)` functions that lay out a place at given coordinates using the World builders plus `props.js`. `loc_home.js` (apartment + laundromat), `loc_street.js` (Ridge Road block, stair, cars), `loc_row.js` (the two enterable shops opposite), `loc_vasko.js`, `loc_church.js`, `loc_town.js` (diner, pawn, Fuel & Go, cemetery, library, mine). `facades.js` fills out the town shell and does `mergeByMaterial`, which is what keeps draw calls affordable; `life.js` is pedestrians/traffic; `door.js` is every door (doors swing away from the player via `setDoorPlayer`); `streetlights.js` the thirty-one; `sky.js` the dome by preset.

**Materials** (`src/world/mat.js`): every texture is drawn on a canvas via `tex(key, w, h, draw)`; normal maps are derived by sobel (`normalOf`). `MAT` is the cached material table, `flat(color, opts)` makes plain materials, `faceTex`/`hairTex`/`faceMat` build character faces. The canvas-gradient use in `blotch()` is deliberate and exempt from the no-gradients rule (it is physics, not UI).

**Props and people** (`src/world/props.js`): furniture builders `(world, x, y, z, rot, opts)`, `clutter()` (the clutter rule), `humanoid()` + `Character` rig, `CAST` registry, and `performLine(who, text, ms, opts)` which animates the mouth/head/hands of whoever is speaking. Named factories: `makeRecca`, `makeReccaDrowned`, `makeVictor`, `makeMarta`, `makeGeneric`, `makeButtons`.

**Bodies** (`src/world/body.js`): `buildBody(opts)` makes one `SkinnedMesh` per person from lofted rings (`Loft`: rings of vertices with bone weights, stitched into tubes), bound over a `THREE.Bone` hierarchy that IS the rig contract (`hips/torso/chest/neckPivot/headG`, `arms[].sh/.el/.hand/.knuckles/.fingers[]/.thumb`, `legs[].hp/.kn/.ankle`). Everything is authored unrotated, bound, then `rest()` poses it. Clothes are one painted atlas per outfit (`atlasTex`: bands for top, sleeve, pants, skin, shoe; styles hoodie/jacket/flannel/sweater/coat/shirt, jeans/trouser/khaki, boot/shoe/sneaker/loafer) with a sobel normal map; `bandV(name, t)` maps a ring into a band. `humanoid()` in props.js hangs the head/hair/glasses on `headG` and returns the old contract; `life.js` `extra()` is the same at `detail: 'low'` (fewer rings, a mitten, 256 atlas). Any ring that crosses atlas bands must be duplicated at the same height (see the collar and cuff) or the strip shows every band in between. `tools/people.html` is the line-up page for looking at people (`page=/tools/people.html` through `tools/capture.js`; `who=`, `walk=1`, `sit=1`, `turn=`, `night=1`, `look=1`).

**Core systems** (`src/core/`): `render.js` (renderer, camera, SSAO/bloom/DOF/grain/CA/vignette, colour grades), `player.js` (capsule controller, headbob, stamina, carry spring, flashlight), `interact.js` (crosshair raycast, prompts, hold-to-use), `input.js` (rebindable, pointer lock), `ui.js` (`UI.say`, subtitles, prompts, `titleCard`, document reader, fades, letterbox, toast), `phone.js` (the 2014 Android; the camera that lies), `menu.js`, `music.js` + `audio.js` (the entire synthesised sound engine and score; `audio.musicScene(id)` per chapter, `setMusicIntensity`), `scares.js` (the 22-entry `MANIFEST`, with `EXPECT` = 22 total / 4 false / 3 Contact that the smoke test reads, and a director enforcing the pacing rules: max 1/12 min in Acts 1–2, 1/6 min in Act 3, never two of the same type in a row, she never chases), `state.js` (a tiny store: `state.get()/set()`, `flag/setFlag/bump`, `settings`, notes/messages/photos/tapes, IndexedDB `saveGame/loadGame`).

**Content** (`src/content/`): `tapes.js` (exactly 12 tapes, unique IDs) and `docs.js` (every readable document, 9 flyers, 9 names on the cap). The smoke test asserts these counts.

**Headless harness** (`test/`): `test/dom.js` is a minimal DOM stub (canvas 2D is no-op'd, no WebGL; smoke fakes the renderer). `test/webaudio_stub.js` is a strict Web Audio stub that records NaN, negative times, `exponentialRampToValueAtTime(0)`, `connect(undefined)` etc. as issues. Any new module that touches `document`/`window`/`AudioContext` at import time must still load under these stubs or smoke breaks.

## House rules (enforced by `test/smoke.js`, they fail the build)

1. **No em dashes (U+2014)** anywhere in `src/`, `styles/`, `index.html`, including code comments. Use an ellipsis for interruptions, commas for asides, a full stop for a hard break.
2. **No single-edge accent rules**: no `border-left`/`border-right` used as a highlight (only `transparent`, `none`, `0`).
3. **No CSS gradients** in UI (`linear-`, `radial-`, `conic-`, `repeating-`). Use flat colour, inset shadows, or an inline SVG tile instead.
4. **No glitch type**: no `text-shadow` layer combining a horizontal offset with a chromatic colour. Centred coloured glows and offset neutral shadows are fine.
5. **No bare panels**: any CSS block with a visible border and fill must carry a `content` marker glyph, `font-family`, `letter-spacing` or `text-transform` on itself or a nested selector.

## Visual target: Fears to Fathom (mandatory)

The game's design language, rendering, world, characters, props, UI and every action on screen MUST read as **Fears to Fathom** (Rayll Studios' episodic horror series: Home Alone, Norwood Hitchhike, Carson House, Ironbark Lookout, Woodbury Getaway). Not "inspired by", not "in the spirit of": a still from this game next to a still from Fears to Fathom should pass as the same series. The only permitted deviation is a little more texture resolution, and even that never buys sharper edges, harder light or a cooler palette (see **Rule 0**); everything else matches. When a rendering, prop, lighting, character, UI or palette choice is in doubt, the answer is "what would Fears to Fathom do", and the stills in `ref/` are the ground truth (see **Rule 0** immediately below, which outranks everything else in this section). Do not drift toward modern PBR realism, stylised low-poly, or clean flat-shaded minimalism; those are all wrong.

### Rule 0: `ref/` is the ground truth, and the look is WARM, SOFT, COZY

The stills in `ref/` are the target frame: the user's own reference grabs (the panelled bedroom with two lamps, the night road through a windscreen, the diner glowing through dusk fog, the vending machine, the motel forecourt, the title screens). They are not a mood board and not an influence. **A screenshot of this game must be indistinguishable from a screenshot in `ref/`.** `Read` them before any visual work, and shoot a matching frame with `tools/capture.js` and compare side by side afterwards.

The most common failure in this repo is that things come out **sharp, pointy, hard and cold**. That is wrong every single time. The reference is soft.

**Softness is mandatory.**

- **No hard silhouettes.** Every prop, every piece of furniture, every panel edge in `ref/` is slightly rounded, chamfered or worn. Boxy is right; razor-cornered is not. Bevel corners, round the tops of lamps, pillows, mattresses, cushions, bags, snow banks. Nothing is a cone, a spike, a knife edge or a needle taper unless it is genuinely supposed to be sharp (a fence post, a broken board), and even then fog softens it.
- **Edges dissolve, they are not drawn.** Neighbouring surfaces separate by warm haze, bloom bleed and grain, not by a crisp line. If an edge looks cut out with scissors, it is wrong.
- **Light is soft, wide, and it wraps.** The practicals in `ref/` (two bedside lamps, the diner windows, a streetlamp, the dash cluster) blow out into a large fuzzy halo that eats their own geometry. Wide bloom radius, low threshold, generous spot penumbra and decay, soft shadow bias. Never a tight hot dot with a clean rim.
- **Textures are soft and low frequency.** Slightly blurred, low resolution, no crunchy high-contrast normal maps, no fine sharp noise, no tight tiling detail. Roughness stays high, nothing glints. The panelling, rug and bedspread in `ref/image1.png` are almost pure soft blur.
- **Geometry is heavy and comfortable.** Furniture is thick and chunky: fat legs, deep cushions, solid headboards, padded arms. Thin rails, wire frames, spindly posts and knife-edged planes all read as wrong.

**Warmth is mandatory.**

- Interiors are **amber, tan, honey, oak, cream**, lit by tungsten so warm it is nearly orange, and the cast fills the whole frame (`ref/image1.png` is one continuous warm brown-gold wash, even in shadow). Interior shadows are warm brown-black, never blue-black and never neutral grey.
- Exteriors carry one warm point inside the cold: the diner burning sodium-gold through fog, a motel sign, headlights, a dash cluster. The cold parts are dusty navy or mauve, never pure blue and never clinical.
- Dusk skies are **peach, salmon and dusty mauve** with soft cloud blobs (`ref/image copy 5.png`), unsaturated and with no hard edge anywhere.
- Whites do not exist: cream, bone, tan, pale gold instead. Saturation is low but the hue is committed, one warm cast per frame.

**Cosiness is mandatory.** Rooms feel lived in and slightly stuffy: soft fabric, rugs, lampshades, blinds cutting warm bars across a wall, worn wood, clutter someone actually put down. Even when the scene is frightening, the room itself should look like somewhere you could fall asleep. A space that reads as clean, cold, empty, geometric or "designed" has failed this rule.

**How to check.** Grab a frame (`deno run -A tools/capture.js out.png "..."`), `Read` it beside a `ref/` still, and answer: is it warm, is it soft, are the edges dissolving, do the lights bloom wide, would it pass as the same game. Any "no" means it is not done. This rule outranks convenience, performance tuning and personal taste; where it conflicts with anything else in this document, `ref/` wins.

### The overall image

- **PS2 / early-2000s PC look, seen through a cheap camcorder.** Geometry is simple and boxy with honest silhouettes; surfaces are photo-sourced-looking textures at low-to-medium resolution, slightly soft, never razor-sharp, with visible repetition acceptable. Think Half-Life 2 / Silent Hill 2 era fidelity, not Unreal 5.
- **Heavy, always-on film grain / VHS noise** over the whole 3D frame. It is coarse and visibly animated, strongest in dark areas and skies (the night sky is practically all noise), and it is the single most recognisable part of the look. Keep `grain` in `render.js` at or above the current `0.06` baseline; never remove it, and the Reduce Flashing setting only halves it.
- **Dark.** Most frames are 60–80% near-black. Exposure is set so that lit surfaces sit at mid-grey and everything else falls away; blacks are lifted slightly by grain and a cool tint, never crushed to pure `#000`. Exteriors at night are navy/teal-black, interiors are warm brown-black.
- **Low-contrast, desaturated, slightly milky.** Colour is muted and pushed toward one cast per scene: sodium amber/orange for tungsten interiors and streetlamps, cold steel blue/teal for night exteriors and snow, brown-sepia for daylit interiors, a pink-orange salmon ramp for dusk skies. Saturation well under 1.0 (the `GRADES` table is the place for this); whites are never white, they are cream, tan or pale blue.
- **Soft bloom on every practical light source**, large and diffuse: bulbs, lampshades, vending-machine faces, dashboards, windows, a distant lookout tower. Light sources glow; nothing else does. Bloom strength stays low (the current `0.22`) but radius is wide so hot spots bleed into neighbouring pixels.
- **Mild chromatic aberration and a dark vignette** on the 3D frame, strongest at the corners. Mild DOF that softens whatever the player is not looking at. Slight barrel softness at the edges is welcome.
- **Thick atmospheric fog** outdoors (FogExp2 tuned so distant trees and rooflines are silhouettes dissolving into the sky), and a thinner haze indoors so long corridors lose detail at the far end.
- Resolution can run a touch under native (`setPixelRatio` below 1 is fine) so the image has a faint upscaled softness; that is closer to the target than a pin-sharp 4K frame.

### World and environments

- **Ordinary, lived-in, mundane American places**, built from boxes: timber-framed basements with exposed joists and brick piers, wood-panelled motel lobbies, cheap apartments, gas stations, laundromats, a road at night seen through a windscreen, a snowy riverbank with a chain-link fence and a red clapboard shed. Nothing designed; everything looks like it was found.
- **Clutter is the texture of the world.** Shelves hold paint cans, cardboard boxes, jars, tool cases; a workbench has a lamp, a drill, papers; bins, buckets, ladders, coiled cable and pipes run along walls and ceilings. Props are plain low-poly solids with believable texture, placed as if by a tired person, never arranged for the camera. (See `clutter()` in `props.js`; use it generously.)
- **Materials:** worn painted plaster, brick, raw concrete floors with stains and cracks, plywood, rough timber, peeling paint, dusty glass, aluminium that is scuffed rather than shiny. Roughness high almost everywhere; specular only on wet ground, glass, painted metal and car paint. Normal maps are subtle; silhouette and albedo do the work.
- **Lighting is practical and sparse.** A room has one or two real fittings (a bare bulb, a desk lamp, a fluorescent tube, a lamppost, headlights), warm tungsten, casting a visible pool and leaving the rest of the room in shadow. Light never comes from nowhere. Outdoor night scenes have one streetlamp or one lit window as the only warm point in a cold blue frame. Moonlight/ambient is a faint cool fill just strong enough to read silhouettes through the grain.
- **Skies** are soft painterly gradients with scattered small cloud blobs and a lot of grain: orange-pink into mauve for dusk, deep navy with faint sparse stars for night, flat grey-blue for overcast. Trees and hills are dark, low-detail silhouettes in front of them. Snow falls as sparse slow flecks.
- **Vehicles and interiors of vehicles** are boxy, with dim illuminated gauge clusters and a windscreen through which the road is almost entirely grain and two headlight cones.

### Characters

- **Stiff, low-poly, PS2-era humans**: a few hundred to a few thousand triangles, blocky limbs, simple hands, a head with a painted face texture (eyes, brows, mouth drawn on, slightly asymmetric, slightly uncanny). Clothes are flat-textured (a striped jumper, a plaid coat, jeans) with no cloth simulation. Skin is a matte, slightly waxy tone.
- **Animation is minimal and a little mechanical**: idle sway, a head turn toward the player, mouth flapping while a line is up, simple arm poses. No mocap fluidity. Figures often stand too still and look straight at you, which is part of the unease.
- NPCs are lit by the same practical lights as the room and pick up the same grain and bloom; they should never look like they were pasted in.
- The player's own body is mostly unseen; hands and held objects (phone, flashlight, drink) are simple low-poly models close to the lens, slightly out of focus.

### UI, text and title treatment

- **HUD is nearly nothing**: a tiny, thin white circle reticle at screen centre (a ring with a dot, low opacity), and otherwise a clean frame. Prompts appear only when something is usable.
- **Subtitles / dialogue** are small, pixel-bitmap or monospaced text (VCR OSD Mono style) in off-white or pale yellow, on a hard black strip or floating with a dark outline, lower-centre, often lowercase and understated ("didn't want it"). Dialogue choices are a short stacked list in the same face, in all caps, pale yellow, with `[LEAVE]`-style bracketed actions. Handled by the existing VCR/mono type roles in `styles/game.css`.
- **Title/wordmark language**: bold, tightly-tracked geometric sans in hot pink/magenta, with a subtitle in bright yellow, sitting directly over the grainy dusk sky. Any title card or chapter card in this game must use that two-colour, flat, high-contrast scheme over the 3D scene. (It stays within the house rules: flat colour, no gradient, no channel-split under letterforms. The chromatic aberration belongs to the post pass on the world, never to UI text.)
- Menus are plain text lists over a held, grainy 3D shot of the world, not panels and widgets.

### How to check it

Every visual change is judged against the reference stills, by eye, with `tools/shot.html` or a one-room page and a headless Chrome frame grab. The checklist: is it dark enough, is it grainy enough, is the colour cast single and muted, is every light a visible practical, do the props look found rather than placed, would this frame pass as a Fears to Fathom screenshot. If any answer is no, it is not done.

## Testing discipline (read before running or writing any test)

Tests here are slow, verbose and token-expensive (smoke alone builds thirteen locations and six chapters and prints hundreds of lines). Treat them as a tool you reach for when something could actually have changed, not as a ritual.

- **Run only the test that covers what you touched.** World geometry, floors, colliders, props, a chapter's `build()`, CSS/UI, content counts: `smoke.js` (optionally `walk.js` if you moved walls, floors or doors). `audio.js`/`music.js`: `audio.js`. Character rig / `performLine`: `act.js`. Chapter One flow or gating: `act1.js`. Nothing else; do not run the whole set "to be safe".
- **Do not run any test for changes that cannot affect it**: comment or string edits, README/CLAUDE.md, dialogue wording, colour/number tuning in a builder, a one-line tweak you can verify by reading. `node --check` on the touched file is enough for syntax. Do not re-run a test that already passed unless you changed something it covers.
- **Pipe output through `tail`** (e.g. `| tail -30`); the pass/fail summary and any stack are at the end. Never dump the full log into context.
- **Do not write new test files or ad hoc test scripts** unless the user asks for one or a bug genuinely cannot be reproduced any other way. In particular do not scaffold throwaway `test_*.js` / scratch scripts to "check" a function you can read, and do not add per-function unit tests: the project tests whole systems (a location, a chapter, the engine), not helpers. If a new check is warranted, add a `step()` to the existing harness rather than a new file.
- **Visual changes are checked by eye**, with `tools/shot.html` or a one-room page, not by tests. A passing smoke run says nothing about how a room looks.

## Conventions worth knowing

- Dialogue/world text is carefully voiced; match the existing register (understated, specific, no explanation) and keep Jared's lines as `thought` style via `J()`.
- Interiors: lights belong to visible fittings, a handful per room, prefer `SpotLight` cones near walls/mezzanines over point lights (they leak through geometry); `world.bulb()` hides its glow when intensity is 0.
- New interactables must resolve a non-empty label and have a `use()`; new scares must be declared in `MANIFEST` (the smoke test asserts the counts in `EXPECT` in scares.js, currently 22 / 4 false / 3 Contact; update `EXPECT` if the design changes).
- The footstep-surface table in `audio.js` must cover every `surface` string used by `world.floor()` (smoke checks defined vs used).
