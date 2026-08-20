# KESSLERTON ROW

A first-person narrative horror game that runs in a browser. No build step, no
package manager, no asset downloads, every texture, every sound and every piece
of geometry is generated at runtime.

> Ashgrove, Pennsylvania. Anthracite coal country, an hour from nowhere.
> August 24 – December 21, 2014.
>
> **A rich kid's college girlfriend has been dead since September. He finds out
> at 3 AM on the winter solstice, in a church, holding a match.**

---

## Contents

- [Running it](#running-it)
- [Controls](#controls)
- [The story](#the-story), full synopsis, **spoilers**
- [The rules of the world](#the-rules-of-the-world)
- [Research grounding](#research-grounding)
- [What is built](#what-is-built)
- [What is not built](#what-is-not-built)
- [Architecture](#architecture)
- [Testing](#testing)
- [Known issues](#known-issues)
- [Where to take it next](#where-to-take-it-next)

---

## Running it

It needs to be served over HTTP. ES modules will not load from `file://`.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Anything else works too (VS Code Live Server, `npx serve`, nginx). There is
nothing to install and nothing to compile.

**Requirements:** a browser with WebGL2 and ES modules. Three.js r169 is vendored
into `vendor/three/` (~1.3 MB), so the game works offline and does not depend on
a CDN staying up.

**Audio starts on the first click or keypress**, browsers require a gesture
before an `AudioContext` will run.

---

## Controls

| | |
|---|---|
| `W A S D` | Move |
| `Shift` | Sprint (7 s of stamina) |
| `Ctrl` | Crouch |
| `E` | Interact / hold to use |
| `F` | Flashlight |
| `Tab` | Phone, messages, notes, camera, gallery, tapes |
| `J` | Notes |
| `Q` | Drop / set down |
| `Esc` | Pause |
| `F8` | Diagnostics overlay |

Every key is rebindable, and there are one-handed layouts for both hands in
**Options → Controls**.

---

## The story

**Everything below is a spoiler.**

### The frame

The game opens as a letter submitted to a small-town paranormal call-in radio
show, *Nights We Don't Talk About* (WKRB 1290 AM, Scranton). A tired host reads
the first two paragraphs over a black screen and tape hiss. **This is the only
narration in the game.** After the letter ends you are Jared, and nobody explains
anything to you again. The host returns once, over the credits, to read the last
line of the letter, and that line is different for every ending.

### The cast

**Jared Hale**, 20, the player. Never seen except his hands, and once,
deliberately, in a cracked shaving mirror in the sacristy. His hands are the
tell: clean, soft, a signet ring stamped with a colliery wheel. Great-grandson of
Aldous Hale, who owned Kesslerton No. 9. He chose Ashgrove State because it was
the least prestigious school that would take him, a small, private rebellion.
He is not a coward and not a hero; he is a polite, slightly guilty young man who
has never once had to fix anything himself, which is exactly why Act 3 destroys
him. He apologises to objects.

**Recca Vasko**, 20, warm, funny, quick, wearing her grandfather's canvas barn
coat three sizes too big. She is genuinely charming for the whole first act, and
that is the entire bet the game makes. The tells are seeded early and never
pointed at: she never eats in front of him; her hands are always cold and it is a
joke between them; she photographs wrong; the dog at the laundromat will not go
near her; her breath does not fog; snow does not land on her shoulders; and she
never once crosses his threshold uninvited.

**Fr. Victor Kowal**, 24, not an old man in a cassock. A young, exhausted,
chain-smoking transitional deacon who is not technically ordained and keeps
correcting people about it. He and Jared were freshman roommates in 2012, on a
scholarship funded, unknowingly, by Jared's grandfather as reparations nobody
named. Then Victor's sister Elena disappeared, Victor dropped out, and Jared, at
twenty and useless at grief, let the friendship die rather than say the wrong
thing. He never says "demon." He says "the thing," "your girl," "it."

**Marta Vasko**, 51. Recca's mother. Kind-faced, works the register at the Fuel
& Go, wears a Miraculous Medal, feeds Jared pierogi. She is in the Ninth. She
arranged her own daughter. Her scene in Chapter 3, where she cries, genuinely,
while lying to Jared's face, is the best scene in the game, because every word
she says is true and every word is a lie.

**Dale Prosser**, 60s, runs the Anthracite Diner. Warm, loud, free coffee. Has a
corkboard of missing-persons flyers by the restrooms that he keeps "meaning to
take down." Nine flyers. Count them.

**Mrs. Ostrowski**, 78. Jared's landlady. Not in the cult; the only
unambiguously good adult in the game. Salts her doorstep every night "for the
ice," in September, when there is no ice.

### Chapter by chapter

**Ch. 1, "Move-In Weekend"** · Aug 24 · 68°F
Twenty-five minutes with no horror in them at all. Unpack, hang a mirror, meet
the landlady, walk down to the laundromat because you forgot detergent. Recca is
folding a load, the dryers are running, and the whole meeting is one long
conversation over the tumble of the machines. Every dialogue branch ends with her
writing her number on the back of a laundry ticket.

Two things are planted here and never pointed at. **The detergent is in Jared's
hand the entire time**, the player is carrying it while he tells her he forgot
it. And at the end of the night she stops at his door and does not come in, and
he says *"come in."* He never takes it back.

She also asks what *Hale* means. He can lie or tell the truth. She smiles either
way, but the truth unlocks an extra line three hours later that guts you.

**Ch. 2, "Small Hours"** · Sept 6 – Oct 12 · 54°F
Five hard-cut vignettes: the walk home and the first kiss on the porch glider;
dinner at the Vasko house, where there is an interaction to take the ring off
before meeting her mother, and where Recca does not eat; **September 22nd**,
where she cancels with *"family thing. love you"* and Jared spends the evening
alone, and if the player is still standing at the window at 3:04 AM, a car goes
down Ridge Road toward the mine. No sting. No music. No line. Most players will
miss it, and the ones who don't will not stop thinking about it. *That is the
night she actually dies, and the player will not know it for three more hours.*

Then October 2nd: she moves in half her things, the cold-hands joke lands again,
and Jared wakes at 3:02 to find her sitting on the edge of the bed, upright,
facing away, in her coat, wearing boots. She says she couldn't sleep. The scare is
deliberately silent, it teaches the player that this game will not warn them.

Then October 12th: the photo at the diner. Her seat is empty and there is motion
blur where she was. She laughs and says the phone's junk. He can delete it. The
player cannot un-see it.

**Ch. 3, "Nine"** · Oct 20 – Dec 15 · 31°F
The open chapter, and the shame of paranoia. Ridge Road, downtown, the cemetery,
the mine, the barn and the college library are all unlocked, and the objectives
are soft, a list in the phone's Notes app that Jared writes himself, in his own
bad shorthand.

The escalation, in order: she asks him to stop wearing the ring; then to stop
calling his father; then, one night, quietly, to say his own full name out loud
*"so I can hear it."* He does. She writes it down.

What he finds: library microfilm from February 1963, nine men sealed in
Kesslerton No. 9 by order of Aldous Hale, to save the seam. **Vasko. Prosser.
Kowal.** The diner corkboard, nine flyers, 1965 to 2011, one every nine years,
all local, all aged 19 to 21, the last one Elena Kowal. *There is no tenth flyer,
because Recca was never reported missing.* A fresh, unmarked stone laid flat in
the Vasko family plot, which he can dig at until his phone rings and it is her,
asking what he's doing. The barn on Colliery Road whose cheerful hex sign has
been painted over, and underneath it is inverted, nine-pointed, with a date in
tar: **12/21**.

And Marta, at the register, crying while she tells him the truth.

Two of the shopfronts across the road from his own front door are not
shopfronts. The dry cleaner's belonged to Victor's family and has been shut
since the September his sister went; the realty office has been shut since 1997
and still has the county's paperwork in a drawer. Neither is on the list.
Both of them agree with everything else.

Scattered across the map are **Elena Kowal's twelve microcassettes**. She recorded
herself for a year. She figured out everything Jared is figuring out. She was two
days from telling her brother. The twelfth tape is her deciding to go to the
church alone, and it contains the one instruction that unlocks the true ending.

The chapter ends with a text at 11:47 PM on December 20th.

**Ch. 4, "Come Over"** · Dec 21, 11:47 PM – 1:20 AM · 19°F, snow
The text reads: *"jared i cant sleep. please come. i need you. im home."*
It was **sent at 11:56 PM**. The phone clock reads 11:47. Nine minutes in the
future. The player will notice before Jared does and there is nothing they can do
about it.

He drives. The radio picks up WKRB and cuts to her voice mid-sentence. A forced
stop for gas: Marta isn't working, a kid is, and behind the counter there is a
four-camera security monitor. Camera 2 is the forecourt. Jared's Volvo is on it.
**There is someone sitting in the passenger seat.** The player is free to turn
around and look through the window at the car, which is empty. Look back at the
monitor: also empty. This is the biggest single scare in the game and it is
entirely silent.

Then the payphone. She picks up, warm, sleepy, sweet. And behind her voice,
unmistakably, is the sound of the Wash-Rite dryers: the exact ambient loop the
player has been hearing for three hours of playtime. She says *"I'm home. Come
over."*

She is in his apartment. She has been for hours.

Ridge Road forks. Left is Kesslerton Row; right is the ridge and the church. The
player steers, and going left is genuinely possible, you find the house dark,
the stove cold, three months of mail on the floor, and get an early ending. Most
players go right. Four minutes uphill in the snow with no talking, and Jared says
exactly one thing, to himself: *"He's gonna say I told you so."*

He doesn't. Victor opens the rectory door already dressed, already carrying a can
of lamp oil, and says: **"You're two years late. Get inside and take your shoes
off, the floor's wet."**

**Ch. 5, "The Ninth Hour"** · 1:20 AM – 3:00 AM
The centrepiece: relentless, exhausting, physical. Victor delivers the rules in
ninety seconds while moving, then stands at the altar and holds the rite without
stopping. If he stops, they start over, and there is no time to start over. So
**six things have to happen and Jared has to do all of them.**

1. **The Bell**, nine strikes, slow, four seconds apart. Sixty-eight steps up
   the tower, three rotten landings that need a route found, bats, and a rope
   frozen to the wheel. On strike six the rope pulls back, hard, from above. On
   strike eight something in the dark up in the bell chamber says his name in her
   voice. *Do not answer.*
2. **Seven Lamps**, the oil is in the flooded boiler room with the breaker off.
   Throw the breaker and the coal chute rattles, because something is already
   trying the fourth door. Filling lamp four means turning your back on the nave;
   when you turn around, twelve pews on the left are facing the wrong way, and
   Victor does not react. Victor never reacts to anything, which is its own
   horror.
3. **Four Seals**, salt and iron on the west doors, the sacristy door, the
   sanctuary side door, and the coal chute. The chute is the problem: it is
   outside, at the base of the north wall, and the only way to it is out the
   breezeway and around. Thirty seconds in the snow. On the way back, the
   confessional door is open. It was closed.
4. **The Register**, the key is on Victor's belt and he cannot hand it over
   without breaking the rite, so Jared has to take it off him while he chants
   with his eyes shut and his hands shaking. It is a quiet, tender, awful thirty
   seconds. In the register: *Recca Marta Vasko, baptised 4 May 1994*, and, in a
   second hand, in the death register, ***d. 22 September 2014, no funeral, no
   interment, cause: entered.*** Ninety-one days ago. Three days after she ate
   dinner with him and didn't eat. This is where Jared breaks, and the player
   cannot move for forty seconds, not a cutscene; the input simply does nothing,
   and his breathing is the only sound.
5. **The Font**, prime the pump in the courtyard, fill a bucket, and carry it
   back without setting it down. Something walks parallel to him on the far side
   of the pews the entire way, glimpsed between the columns, never fully seen,
   always keeping pace.
6. **The Name**, write her full baptismal name in ink, hold it in the font
   water, and burn it at the altar.

**There is no HUD.** Through the nave's west windows you can see Ridge Road
descending toward town: thirty-one streetlights, going out one at a time, from the
bottom of the hill up. That is her, walking. Four miles. Nothing ever tells the
player to look out of the window. Once about half are out, they check
compulsively.

And then the last light goes out, and all seven lamps go out at once, west to
east, over about four seconds, the player watching the darkness come up the aisle
toward them. **The west doors do not open. The salt holds.** She is simply
inside, twenty metres away, soaked, in the barn coat, with mine silt in her hair.

She has been let in, because Jared invited her in, in Chapter 1, in the
apartment, on the first night, and never uninvited her. The apartment was never
the point. *He* is the dwelling. That is what the ring was for. That is what
saying his full name out loud was for.

She walks up the aisle. Slowly. She is crying. Victor keeps chanting and does not
turn around.

**Ch. 6. Endings** · 3:00 AM
It is a four-minute scene and it is not a boss fight. It is a breakup. She argues,
and every argument is good:

> *"It's a book, Jared. It's a book in a cabinet, and I'm standing in front of you."*
>
> *"Do you remember the laundromat? You had detergent in your hand the whole time."*
>
> *"They gave me to it. My mother held the light. That part's true, that part's all true, and I'm still here, so what does that tell you about what's true."*
>
> *"You said your name for me. You said it out loud. You already said yes, baby, you just have to say it one more time so it counts."*

Two options. No timer, no QTE, and neither ever greys out.

**ENDING A, "Forever."** He takes her hand, and her hand is warm for the first
time since he met her. Cut to the apartment, morning light, dryers running
downstairs, and it is perfect for eleven seconds, and then the room is the wrong
way around, and then the light is wrong, and then the dryers are the pumps at
Kesslerton No. 9, and the camera does not cut away. It is available on a first
playthrough, it is not punished and it is not mocked. It is, in a real sense, the
merciful ending.

**ENDING B, "The Ninth Hour."** He burns it. The loudest ninety seconds in the
game are all here: the PA speaks, the pews move, something comes out of the
confessional, the bell rings nine times on its own, and Victor shouts the last of
the rite over the noise. And then it is very, very quiet, and there is a wet barn
coat on the floor of the aisle with nothing in it.

Victor tells him the rest in the rectory kitchen at dawn, over instant coffee, in
one unbroken scene with no cuts and no music. The nine men. Aldous Hale. That a
payment buys nine years but the debt only *clears* with a Hale. That Victor has
been waiting in this town for three years because he knew they would need one and
there was exactly one in Pennsylvania. And the last thing:

> They came for her on the equinox. They'd had her since the nineteenth. And the
> only thing they actually needed was Jared's name, out of her mouth, said freely.
> **She held out three days.** That is why they had to kill her and wear her.
> She didn't tell them. She made them come and get it themselves.

Final shot: Jared drives out of Ashgrove at 8 AM, and there is snow on the ground
everywhere, including over Kesslerton No. 9, for the first time in fifty-one
years.

**ENDING C, "Gerald"** (requires all twelve tapes, the register, and having told
her the truth about his name in Chapter 1). Same as B, except that first he says
her name out loud, her *actual* name, the way Elena's last tape says you have to.
And for about six seconds, it is her. Really her. Confused, freezing, in a church
at 3 AM, with no idea how she got there and the last thing she remembers being a
car on Colliery Road. She gets one line. She uses it to ask if her mom is okay.

Then he burns it, and she is gone, and it is so much worse and so much better.
Post-credits: her bedroom, in daylight, the quilt turned down, the record player
dusted, and Gerald the taxidermied bird on the windowsill facing out.

**ENDING "Kesslerton Row"**, the early variant, if you turn left at the fork. A
ninety-second scene with no dialogue. He stands on the porch, looks through the
glass at three months of mail on the floor, does not go in, and the screen goes
white.

---

## The rules of the world

Every supernatural rule is consistent, discoverable before it is needed, and
lifted from real folklore rather than invented:

- **Threshold consent.** It cannot enter uninvited, and it cannot take a soul that
  does not go willingly. This is the central mechanic, not a flourish.
- **The name binds.** A thing is bound by its true name; burning a written name
  releases what is bound to it. Said aloud, by someone who means it, it can
  briefly call the real person back.
- **Answering is consent.** If something calls you by name out of a dark place and
  you do not know with certainty who it is, do not answer.
- **Salt, iron, running water, church bells, dogs.** All used, all consistent, all
  findable before they matter.
- **The debt.** Nine men died owed something. The arrangement made in 1964 costs
  one local nineteen-to-twenty-one-year-old every nine years, and only clears in
  full with a Hale.
- **She never chases.** There is no run-away sequence in this game. She walks four
  miles. The horror is arithmetic, not adrenaline.

---

## Research grounding

Nothing supernatural in this game was invented to be creepy. In-game credits list
these too:

| Element | Source |
|---|---|
| Powwow / Braucherei, and the charms quoted verbatim | *The Long Lost Friend*, John George Hohman, 1820, a real book, still in print |
| The murder of a powwow practitioner by men who believed they'd been hexed | The 1928 Hex Murder, Rehmeyer's Hollow, York County, PA |
| Hex signs on barns; cheerful folk-art rosettes | Real Pennsylvania Dutch practice |
| A coal seam burning underground for decades, snow not settling, a condemned town | The Centralia mine fire (burning since 1962) |
| 3 AM as the inversion of the Ninth Hour | Catholic tradition. 3 PM is the hour of Christ's death |
| Covering mirrors, stopping clocks, opening a window for the soul, three nights' watch | Slavic / Eastern-European immigrant Catholic mourning practice |
| Threshold consent, and the true name | Near-universal European folklore |

Ashgrove, the Vaskos, the Kowals, the Hales, the Ninth and Kesslerton No. 9 are
fiction. The 1928 murder happened to a real man named Nelson Rehmeyer.

---

## What is built

### Engine

- **Renderer**: Three.js r169 (vendored), WebGL2, ACES tonemapping, PCF soft
  shadows, three quality presets that swap the post stack and shadow resolution.
- **Post stack**, in the order the design calls for: depth-driven **SSAO** →
  **bloom** → **depth of field** (a real circle-of-confusion blur, 16-tap
  golden-angle spiral, focus follows the crosshair) → animated **film grain** →
  **chromatic aberration** (edges only) → **vignette** → **per-chapter colour
  grade**. All of it is one custom `ShaderPass` plus `UnrealBloomPass`, written
  for GLSL ES 1.00.
- **Five colour grades**, autumn sodium-vapour, hard-desaturated winter,
  lamp-oil-orange-against-black for the church, clean overexposed daylight for the
  ending, and a tape grade for the menu.
- **VHS treatment is a DOM layer**, so it can only ever appear on title cards,
  monitors and tapes, never on gameplay.
- **Movement**, cylinder-vs-box collision with iterative depenetration and
  step-up, plus a floor-rectangle height system that makes stairs, the sixty-eight
  step bell tower and its rotten landings work without a physics engine. Boxes may
  carry a yaw, and are then resolved in their own frame, which is what lets a door
  leaf be something you walk into at whatever angle it happens to be standing at.
  Walk 2.6 m/s, sprint 4.6 with 7 s stamina, crouch 1.3, eye height 1.66, headbob
  1.7 Hz at 0.018 m, FOV 70–110 measured **horizontally** (the camera's
  vertical angle falls out of the aspect, Hor+).
- **Doors are a single part** (`world/door.js`): 0.96 m of clear opening in a lined
  frame with casing on both faces, a 52 mm leaf with stiles, rails and hardware, a
  swing that takes half a second and settles, and a collider on the leaf itself
  that is rewritten every frame it moves. A door opens away from whoever pulled it,
  and closing one on yourself pushes you out of the opening rather than trapping
  you in it.
- **A first-person body**: two hands that breathe, swing with the walk, pump at a
  sprint, reach out when he uses something and come up together when he is
  carrying; and legs under the camera that stride, and are in frame when he looks
  down or runs. Off with one toggle in Video. The shoulders are placed from the
  camera's own frustum each frame, not from a fixed offset, so the hands stay in
  the bottom corners at any field of view and any aspect ratio instead of
  drifting to the middle of the screen on one monitor and off the edge of it on
  the next.
- **A head is an egg with a jaw on it, not a ball with a face painted on**
  (`world/props.js`). The sphere is sized on the *breadth* of a head and then
  stood up to its height, because a head is 15 cm across and 22 cm tall and a
  ball is neither. `JAW_W` gives the width down the face: nearly as wide as the
  cheekbone all the way to the angle of the jaw, and only then turning in to the
  chin -- taper it smoothly from the eye line to the bottom of the sphere, which
  is what it used to do, and you get an upside-down triangle with a point on the
  end. Everything below the chin folds back and up into the throat instead of
  carrying on down; left alone it is a long pale wedge that the eye reads as
  still more chin. Hair is built in world units against that skull's *measured*
  silhouette, and it is one shell from crown to tips plus one arc filling the
  parting, because every extra piece is another pair of cut edges. The arc has
  to end below the hairline painted on the forehead and above the brows: there is
  about two centimetres of room and that is the whole design constraint.
- **Bodies are turned forms, not stacked primitives** (`world/props.js`). The
  trunk is one lathe with the bust, the seat and the shoulders pushed out of it
  by a vertex pass, rather than spheres bolted onto a tube -- a bolted-on sphere
  only ever survives the angle it was aimed at. Limb segments overlap by a long
  way and meet over a joint ball smaller than either bone, so a bend has a crease
  and not a hole. A shoulder is a deltoid wedge that starts under the collarbone
  and dies away halfway down the arm, never a ball centred on the joint -- a ball
  stands proud of the trapezius on one side and of the arm on the other, and what
  you get is a puffed sleeve with a groove under it. **A lathe profile must run
  bottom to top**: turned from a
  descending profile the triangles face inward and the limb renders inside out,
  which reads as a dark, flat, badly lit tube with whatever is inside it showing
  through. `upward()` in `props.js` and `viewmodel.js` sorts every profile before
  it is turned.
- **Hold-to-carry with a spring constraint**, so the oil can and the water bucket
  have weight and drag the camera.
- **Interaction**: 2.4 m raycast, dot-to-ring crosshair, hold-to-use with a
  progress bar, state-dependent prompt labels.

### Audio, entirely synthesised

There are no sound files. Everything is built from noise, oscillators, filters and
envelopes at runtime.

- **A scene-driven piano score** (`src/core/music.js`). The instrument is a
  felt-muted upright that has been in an unheated room for a long time: dark
  partials, three strings a few cents apart, a shared tape wow on the tuning, the
  key action audible underneath, and a soft hammer that fades out almost entirely
  below middle C. The low register *swells* rather than strikes, a bass note
  takes about 220 ms to arrive against 26 ms at the top of the keyboard, with a
  clean sine on the fundamental under it. Everything runs into a long dark hall
  with a 55 ms pre-delay and a modulated tail, so one note takes five or six
  seconds to leave the room.
- **Eight written pieces**, not one loop. `old_doll` (the theme, a D-minor waltz
  slow enough that it keeps losing the beat), `wash_rite` (Ch1, the only kind
  piece in the game), `small_hours` (the town), `snow` (outdoors, where almost
  nothing happens), `nine` (the church, played mostly below middle C with the
  left hand simply held down), `doll_house` (Recca's room: the theme an octave
  and a half up with the mechanism failing and notes missing), `ninth_hour`
  (after 2:41, the piece stops agreeing with itself) and `nothing_to_say` (Ch6,
  two voices, no ornament, never louder). The game asks for one by scene name;
  same instrument, same room, so a change reads as the music changing its mind
  rather than as a track ending. It ducks under dialogue.
- **The dryer leitmotif** with four EQ modes, `comfort` (Ch1), `background`
  (Ch2–3), `wrong` (the payphone), and `pumps` (the last sound in Ending A).
- **The warmth chain.** Every physical sound in the game runs through a shared
  EQ and a gentle waveshaper before it reaches the master: the 3 kHz glare that
  makes synthesised transients sound like plastic is pulled out, the top is
  rolled off, the low-mids are lifted, and peaks are rounded instead of being
  allowed to click. It is the difference between "a door" and "a door in a house
  somebody lives in".
- **Footsteps**, twelve surfaces × six variations, ±4 % pitch, built from three
  layers (heel impact with a pitch drop, body, scuff/crunch tail), alternating
  feet with different weight and stereo placement, a tonal squeak for snow,
  boards that creak on rotten wood, and inharmonic ring on the steel stair.
  Attacks are 8–18 ms, not 4, and nothing has much energy left above 5 kHz.

  **Paved ground is not gravel.** Every outdoor floor in the game used to name
  `gravel`, so tarmac and sidewalk both gave a loose-stone crunch. There are now
  `asphalt` (dead: firm heel, short low-mid slap, almost no tail) and `concrete`
  (the same shape, harder and brighter, and it rings off the buildings), with the
  character coming from `grit`, one or two loose stones under the sole every
  third or fourth step, rather than from a crunch on every one. `gravel` is back
  to meaning actual loose stone: the cemetery and the mine.
- **Occlusion**, one instance, honestly earned. The Wash-Rite dryers sit 1.4 m
  under the floor of the flat and distance rolloff alone left them bright and
  present up in the room, so they read as being *in* the room. A storey of joists
  is a steep lowpass and about 9 dB, so from upstairs you get the rumble and none
  of the buckles. `setListener` drives it from the listener's height each frame,
  two states with a stair's worth of hysteresis so it cannot chatter.
- **Doors**, seven types (wood, heavy, metal, screen, cabinet, car, fridge) ×
  five actions (open, close, latch, try, knock), each assembled as four or five
  small events rather than one bang: the handle turning, the latch withdrawing,
  the seal letting go, the hinge, then the frame.
- **Handling things**, `pickup`, `setdown`, `book`, `mug`, `switch`, `drawer`,
  `cloth`, `chair`. Each is a hand arriving, the object leaving the surface, and
  the object's own note, inside about 90 ms.
- **The bell "Anna"**, additive synthesis with inharmonic partials and a proper
  strike transient.
- **Convolution reverbs generated at runtime** for the church, the tower, small
  rooms and the mine, plus **her voice on a separate bus running through the
  reverb of whatever room she is not in.**
- **HRTF positional audio**, including the Chapter 5 "something is walking
  parallel to you" effect: a second footstep set, offset, nine metres to the left,
  low-passed until it passes a gap between the columns.
- Ambiences: fluorescent hum with a tick, wood stove, dripping water, car
  interior, AM radio static, and an outdoor bed that is deliberately *static*.

  **Nothing in the game amplitude-modulates on a slow period any more.** This is
  a hard rule now, enforced by a test. Three things broke it: `wind` swept its
  bandpass ±260 Hz with a 0.06 Hz sine (under the menu *and* all six chapters),
  the dryer tumble was gated by a 0.86 Hz sine at about 59 % depth (Wash-Rite,
  Ch2, Ch4, Ch6, on an un-muted bus), and the car radio swept at 0.13 Hz for the
  whole of the Chapter Four drive. Each is a textbook patch for its sound and
  each is wrong for a *bed*: the ear locks onto the period, and the thing stops
  being a room and becomes an inescapable whoosh-whoosh. All three are now
  steady. What still makes the dryer a laundromat rather than a hum is the part
  that was never periodic, buckle clanks on a random interval.

  Pitch and time modulation survives, the instrument's tape wow and a sub-
  millisecond drift on the reverb tail, but `test/audio.js` walks the graph out
  from every oscillator under 5 Hz and fails the build if one reaches a gain
  param at more than 1 % depth.
- **Dialogue ticks**, a soft blip pitched per speaker when a line arrives, since
  there is no recorded VO.

### Systems

- **The scare director** (`src/core/scares.js`), the design doc's rules are
  enforced in code, not promised: a 19-entry manifest, type rotation so no two
  consecutive scares share a category, cadence gating (one per 12 min in Acts 1–2,
  one per 6 in Act 3), a chore lock so nothing fires during a difficult moment,
  exactly **3 false alarms** and exactly **3 Contact scares**. There is a
  self-audit that fails the test suite if those counts drift.
- **Reduce Jumpscares** removes the audio sting *and the entire Contact category*
  while keeping every scare's staging.
- **The scripts direct their own actors.** The dialogue has always carried stage
  directions in brackets -- `[she smiles]`, `[a long pause]`, `[she stops
  folding, one second, then keeps going]` -- and they used to be subtitles and
  nothing else, so she stood dead still through four minutes of a conversation
  that described her doing things. `performLine` in `props.js` reads every line
  the UI puts on screen, finds the body behind the speaker label, moves its mouth
  for as long as the spoken part of the line is up, and turns the bracketed half
  into a beat on the rig: smile, laugh, nod, shake, shrug, glance away, look at
  her own hands, flinch, cry, lean in, hold still. Underneath that runs an
  *activity* -- `setBusy('fold')`, `'salt'`, `'write'`, `'clasp'` -- which keeps
  going through the dialogue, because nobody stops folding a towel to say a
  sentence. A pause stops the hands and holds them; "keeps going" gives them
  back.
- **The phone**, a 2014 Android with Messages, Notes, Camera, Gallery and Tapes.
  The camera renders the live scene to a render target and then lies about it in
  three escalating stages: motion blur where she is while she isn't moving; a
  second, taller silhouette behind her; and finally nothing at all in her seat.
- **Save/load**: IndexedDB for progress, `localStorage` for settings.
- **The streetlight proximity system**: 31 lights, no HUD, with secondary tells
  (Victor's breath fogging indoors, the lamps guttering, the stuck clock ticking
  once and stopping again).
- **Ridge Road as a street rather than a set.** The modelled row runs 150 m and
  no two units of it are the same building: five rooflines (flat parapet,
  stepped parapet, gable end-on, false mansard, bracketed cornice), five window
  heads (flat, segmental, round, keystone), oriels, fire escapes, ghost signs
  painted for businesses that closed in 1961, canvas awnings and metal canopies,
  and forty-one trades on the signs. Past the end of it the road does not stop:
  the carriageway, kerbs, pavements, centre line, poles, streetlights and two
  rows of blocks carry on to 240 m through a gap cut in all three ridge bands
  for the valley to open out of, and the haze takes the rest. And there are
  people on it, in `life.js`: walkers with their own beat of pavement who stop
  and let you past, pairs standing still and talking, and a car going by every
  twenty seconds or so. Chapters ask for less of it, or none: Chapter Two gets
  one car and no people, Chapter Three gets nothing, and by then the emptiness
  is the point.
- **Two of the doors opposite open** (`src/world/loc_row.js`). Fifty painted
  shopfronts is the right way to build a street you only look at, but Chapter
  Three hands the player a flashlight and an open map, and a town where every
  door across the road is a texture is a town that has told you where the edges
  are. So the row is told to leave a hole and two real buildings fill it, with
  party walls, a shopfront you cannot walk through, a floor with its own
  footstep surface, a back room and a door on hinges. **Kowal Cleaners** is
  Victor and Elena's family shop, shut in September 2011: nine bagged orders on
  the rail and a tenth hook with nothing on it, the September 2011 calendar
  still up with the 22nd round twice in biro, a line of salt across the back
  threshold poured from the inside, pencil height marks up the door casing that
  stop in 2002, and one order dropped off on the 21st for collection on the
  23rd that somebody has come back for five times and left where it is.
  **Stanko Realty** closed in 1997 and the lamp is still on: a plat map with
  the No. 9 workings drawn under the town in red and a biro ring round 118½, a
  key board with nine keys and a tenth hook labelled 118½, a clock stopped at
  four minutes past three, and, in an open drawer in the file room, the
  February 1964 conveyances. Nine company houses, one to each family, a dollar
  each. None of it is on the list in his phone and none of it advances the
  chapter: `S.found` is deliberately untouched, so turning the row over cannot
  bring the text message forward. It is all corroboration, and all of it was
  filed rather than hidden.
- **Menus**, the game opens straight onto the main menu, set over a held shot of
  Ridge Road on the evening Jared moved in: a dusk sky, birds still up, and his
  house close on the right with the porch light already on. Everything on the
  ground is a silhouette and the only detail let through is a lit window. The
  streetlights still go out one by one on a ninety-second loop and nobody
  explains why, which is worse in daylight, because you can see there is nothing
  wrong with them. Depth of field is switched off for this one plate (it turned
  the row to mush) and the grain comes up to carry the texture instead. Plus
  chapter select, four-tab options, and a credits screen that carries both the
  folklore citations and the content notes.
  (The cold-open content card the design doc specifies is no longer in the boot
  flow; `warningCard()` is still exported from `menu.js`, so restoring it is a
  one-line change in `main.js`.)
- **Diagnostics**, `F8` shows mode, chapter, fade state, draw calls, triangle
  count, world statistics, camera and player position, and a timestamped trace of
  every boot milestone. It opens itself if the game believes it is playing while
  nothing is being drawn. Uncaught errors paint a readable overlay instead of a
  black screen.

### Content

All six chapters, all four endings, thirteen procedurally-built locations
(apartment, laundromat, Ridge Road block, the Vasko house in both lived and cold
states, St. Brigid's with nave/transepts/sanctuary/sacristy/boiler room/bell
tower/rectory, the diner, pawn shop, Fuel & Go, cemetery, library, and the burning
ground), five characters, Elena's twelve tapes written in full, nine
missing-persons flyers, two newspaper pages set in real three-column microfilm
layout, two parish register pages, excerpts from Hohman, Victor's index cards, and
the graffiti stretch.

### Typography

**`rainyhearts` is the interface face.** It replaces Inter and Roboto everywhere:
subtitles, prompts, choices, options, toasts, the phone OS, the readable plain
documents. It is a bitmap face on a 16 px grid (1024 upem, 64 units per pixel),
so it is crispest at multiples of 16 and antialiasing is switched **off**
wherever it is used. Subtitles therefore default to 32 px and the size slider
steps in 8s from 24 to 48, all grid-aligned. The document skins (newspaper,
parish register, Hohman, handwriting) keep their serif and script faces and keep
antialiasing on.

Its cmap has been extended for the en dash, the guillemets and the curly quotes.
It has no block-drawing glyphs, so the phone's signal and battery indicators are
now **drawn in CSS** rather than typed.

The rest of the design doc's faces are unchanged.

**VCR OSD Mono** (Riciery, 2015), the canonical VHS face for chapter cards, the
main menu and ending cards, is **self-hosted from `fonts/`** as WOFF2 with WOFF
and TTF fallbacks, and preloaded in `index.html` so the first title card never
flashes a substitute.

The shipped file has an **extended cmap**. The original face has no glyph mapped
for `·` (U+00B7), which is the separator on *every* chapter card and in the main
menu and chapter select, nor for the em dash used in the ending-card letter line.
Those codepoints, plus the en dash, the bullet and the curly quotes, are now
mapped onto the face's existing `bullet`, `hyphen`, `quotesingle` and `quotedbl`
glyphs. It is a true monospace (every advance is 1200 units), so the remaps cost
nothing in layout. Coverage is 210 codepoints, and nothing the game renders in
this face falls back or resolves to `.notdef`.

> If you re-export the font, beware of subsetting to printable ASCII: that drops
> `°`, which appears on every chapter card (`68°F`, `54°F`, `31°F`, `19°F`,
> `17°F`), and `←`, which is the BACK affordance in every submenu.

---

## What is not built

Honest list.

### Deliberate deviations

- **No authored art pipeline.** The design doc specifies Blender → baked
  lightmaps → glTF/Meshopt/KTX2, targeting the *Fears to Fathom* look. This build
  has none of that: all geometry is runtime primitives and all textures are drawn
  on a 2D canvas at load. The result reads as a **stylised blockout with correct
  real-world scale, correct lighting behaviour and the correct post stack**, not
  as the reference. Swapping in authored assets is the single biggest visual
  upgrade available and the architecture is ready for it.
- **No Rapier/WASM physics.** Custom AABB collision instead. Nothing in the design
  needs ragdolls, and this keeps the dependency count at one.
- **No per-chapter streaming or 45 MB budget.** The whole game is ~14 k lines of
  source plus vendored Three.js; there is nothing to stream.
- **Music throughout, and no unlock gate.** The doc's §9 rule is *no music in
  Chapters 1–4*, so that the first cue at 2:41 AM in Chapter 5 lands like a
  punch. That rule is gone, along with the **Continuous score** option that used
  to restore it. The score now runs from the first user gesture and never stops.
  2:41 still lands, but it lands as a *change*: the piano has been company all
  night, and here the piece stops agreeing with itself and does not change back.
  Which piece is playing is a scene question, never an on/off question.

### Missing or partial

- **No recorded voice acting.** The doc calls for full VO for Recca and Victor,
  who carry the game. Subtitles plus procedural dialogue ticks stand in. This is
  the largest single gap between this build and the design.
- **Chapter 5's clock runs ~22 minutes**, not the specified 70–90. It is one
  constant: `SECONDS_PER_LIGHT` in `src/chapters/ch5.js`.
- **Mrs. Ostrowski's St. Benedict medal** is fully wired at the *receiving* end,   Chapter 5 checks it and suppresses one specific Contact scare, but Chapter 2
  never actually gives it to the player, so it is currently unreachable.
- **The Long Lost Friend changes one Chapter 5 outcome, not three.** The bell
  chamber "do not answer" beat is implemented; the other two are not wired.
- **The laundromat TV's ninety-second payoff** sets its flag, but the two frames
  that resolve into St. Brigid's nave are not rendered.
- **The nine-flyer epilogue montage** sets its flag; the montage is not built.
- **Apartment 3B** (the NG+ room with the wall of Ridge Road photographs and the
  31 streetlight bulbs in a milk crate) exists as a flag only.
- **The hex rosettes on the Vasko window frames** are modelled, including the one
  that has been painted over, but have no interaction attached.
- **Buttons' nine feedings** are a single interactable rather than one scrap per
  chapter-region. He does follow you into the church, and he does not survive.
- **No achievements.**
- Character models are primitive-based; the only facial animation is Recca's jaw
  tell.

---

## House rules

Five are enforced by the test suite, so they cannot regress:

**1. No em dashes.** Anywhere. Not in dialogue, not in documents, not in menus,
not in code comments. Interruptions use an ellipsis, asides use commas, and a
hard break uses a full stop. The lint scans `src/`, `styles/` and `index.html`
and fails on a single `U+2014`.

**2. No single-edge coloured accent rules.** No `border-left` or `border-right`
used as a highlight. Selection and emphasis are carried by a full enclosure, a
wash of colour, or a leading marker glyph, never by a bar down one side. The lint
fails on any `border-left`/`border-right` declaration that is not `transparent`,
`none` or `0`.

**3. No gradients.** Not one, anywhere in the UI. No `linear-gradient`, no
`radial-gradient`, no `conic-gradient`, and no `repeating-` variant of any of
them. Every fill is one of three things instead:

- a **flat colour**, for washes and hovers,
- an **inset shadow**, for anything that has to fall away from an edge. An
  offset shadow with a wide blur and a negative spread is a solid colour dying
  out across the frame, which was the whole job of the gradient,
- a **drawn tile**, for anything periodic. The VHS scanline, the parish
  register's ruled lines and the notepad's are inline SVG data URIs now.

The main menu plate is the interesting case. It used to be two radial blooms
over a 102-degree scrim. It is now three inset shadows on `#menu`, a sodium
bloom low left, a dusk bloom high right and a vignette, plus a scrim that is one
solid blurred slab in `#menu::before`, hung off the top, bottom and left so that
the only edge of it on screen is the right one, which is the only edge meant to
fall away. The phone's battery cell is an `inset 6px 0 0` shelf. The lint fails
on any gradient function in `src/`, `styles/` or `index.html`.

> Out of scope on purpose: the world is allowed to have colour that changes
> across a surface, because that is physics rather than decoration. `blotch()`
> in `src/world/mat.js` uses a canvas `createRadialGradient` to paint stains
> into the plaster and brick textures, and `skyTexture()` in
> `src/chapters/menuscene.js` interpolates the dusk ramp row by row onto a
> canvas. Neither is interface design and the lint does not look for either.
> An earlier pass posterised that sky into flat dithered bands to stay in the
> spirit of the rule; it read as a broken JPEG, and the rule is about UI.

**4. No glitch type.** No red/cyan channel split under a letterform, ever. The
title cards and the main-menu wordmark used to carry one; the cards now bleed
white into black and the wordmark sits on a hard black shelf with a single amber
bloom. The lint reads every `text-shadow` layer and fails on any that combines a
horizontal offset with a chromatic colour. A **centred** coloured glow is a
bloom, not a split, and stays legal, as does an offset neutral shadow.

**5. No bare panels.** A panel is an enclosed, filled box: a visible `border`
plus a visible fill. A panel may never be left as a rectangle of plain body
text. It has to carry a typographic treatment, one of:

- a **leading marker glyph**, which is why `#choices button::before` shows its
  `>` at rest now and merely brightens on selection rather than appearing,
- a **label header** in VCR, which is what the content-warning list gained,
- or one of the **ten type roles** declared on the panel or on something inside
  it, which is how the handset, the keycaps and the toast already passed.

The lint finds every CSS block with a visible border and fill, skips discs
(`border-radius: 50%`) and pseudo-elements, and requires a `content` marker,
`font-family`, `letter-spacing` or `text-transform` on the panel or on a
selector nested under it.

All five run as the `house rules` step in `test/smoke.js`.

---

## Architecture

```
index.html              importmap → vendored three, DOM skeleton for every UI layer
styles/game.css         all UI; the ten type roles; the .doc-* document skins
fonts/                  VCR OSD Mono, self-hosted (woff2 / woff / ttf)
vendor/three/           Three.js r169 + the eight postprocessing addons used

src/main.js             boot, the letter, menu loop, chapter loop, RAF loop

src/core/
  render.js             renderer, camera, SSAO/bloom/DOF/grain/CA/vignette, 5 grades
  player.js             capsule controller, headbob, stamina, carry spring, flashlight
  interact.js           crosshair raycast, prompts, hold-to-use, DOF focus
  input.js              rebindable bindings, pointer lock, one-handed layouts
  audio.js              the whole synthesised sound engine
  music.js              the score: the felt piano, the hall, the eight pieces
  ui.js                 subtitles, prompts, title cards, document reader, fades
  phone.js              2014 Android; the camera that lies
  menu.js               warning card, main menu, options, chapter select, credits
  scares.js             the 19-entry manifest and the director that enforces the rules
  state.js              store, flags, settings, IndexedDB save/load
  diag.js               F8 overlay, boot trace, black-screen watchdog

src/world/
  world.js              World: colliders, floor rects, triggers, interactables, lights
  mat.js                every texture, drawn on canvas; normal maps derived by sobel
  props.js              furniture, the clutter rule, humanoids, Character, Buttons
  streetlights.js       the thirty-one
  sky.js                the gradient dome, sun, moon, cloud and stars, by preset
  facades.js            the commercial rows opposite and either side, the town
                        shell out to the ridges, the road carrying on out of the
                        valley, street furniture, cars, trees, and
                        mergeByMaterial, which is what makes all of it affordable
  life.js               the people on the pavements, the two or three of them
                        stopped and talking, and the traffic
  loc_home.js           118½ Ridge Rd, the hall outside it, the Wash-Rite beneath
  loc_street.js         the block, the exterior stair and landing, the Volvo,
                        the road, and the rest of Ridge Road either way
  loc_row.js            the two units in the row opposite that are not
                        painted glass: Kowal Cleaners and Stanko Realty,
                        with floors, back rooms and doors that open
  door.js               every door in the game, and the way it swings
  loc_vasko.js          9 Kesslerton Row, and Recca's room
  loc_church.js         St. Brigid's: nave, transepts, sanctuary, sacristy,
                        boiler room, bell tower, rectory, the four doors
  loc_town.js           diner, pawn, Fuel & Go, cemetery, library, the burning ground

src/chapters/           ch1–ch6, the menu scene, shared beat helpers
src/content/            the twelve tapes; every readable document
test/                   headless harness
```

**Adding a chapter** means exporting `{ id, card, title, date, temp, build(ctx) }`
and adding it to `src/chapters/index.js`. `ctx` carries the world, player,
renderer, UI, audio, phone, scare director, flags, and `next()` / `goto()` /
`ending()`.

---

## Testing

```bash
deno run -A --import-map=test/importmap.json test/smoke.js
deno run -A --import-map=test/importmap.json test/audio.js
deno run -A --import-map=test/importmap.json test/walk.js
```

`test/audio.js` drives the whole synthesis engine against a strict Web Audio stub
(`test/webaudio_stub.js`): every footstep surface × walk/run/crouch, every door
kind × action, every `sfx` kind, every ambient loop, and the full score including
a scene change between each of the eight pieces, an intensity sweep, and a
twenty-minute unattended run. The stub makes no sound; it refuses NaN, negative
times, `exponentialRampToValueAtTime(0)`, `connect(undefined)`, bad node types
and the other things that throw in a real browser but fail silently in a mock. It
is how the unknown-door-kind bug below was found.

`test/walk.js` walks a route through 118 1/2 the way the controller would,
against the real floor rects and colliders: in at the door, round the bed,
past the table, up the stair to the mezzanine, across the deck and back down.
It reports the first place the route stops and why, and it checks that all
three open edges of the deck are fenced. A room can be built correctly and
still be a room you cannot cross, and the floor query is the only thing that
knows the difference.

It then does the same thing outdoors: out onto Ridge Road, round the parked
cars, over the carriageway, in at both of the doors on the far side, down each
shop, through the back room and out again, and it asserts that the row either
side of them is still solid. A doorway with no floor rect in the 0.3 m of wall
it is cut through is a door you cannot walk through, and it looks identical
from the pavement.

`tools/shot.html` is a held shot of Ridge Road with the real renderer, post
stack and world builders, driven off the query string: camera, yaw, pitch, fov,
fog density, night rig, snow, whether the two shops opposite are unlocked and
lit, and how many frames to let the traffic and the walkers run before the
picture is taken. Serve the directory and open it. It is
how the road, the row and the people on it were looked at without playing four
minutes of Chapter One to get to them, and it reports its own mean frame time on
`window.__ms`.

`test/smoke.js` is a headless harness with a DOM stub that constructs
**all thirteen locations**,
**all five characters**, runs **every chapter's `build()`**, pumps the tick loop,
and asserts:

- every interactable resolves a non-empty label and has a `use()` handler
- the scare manifest is exactly 19 entries / 3 false alarms / 3 Contact
- there are exactly 12 tapes with unique IDs, 9 flyers, and 9 names on the cap
- no location throws while building, ticking, or answering floor queries

It reports collider, floor, mesh, triangle and interactable counts per location so
regressions in world construction are visible.

`test/act.js` pushes lines of dialogue at a built character and prints the rig
state after each one: the mouth has to move while a line is up and stop when it
ends, `[laughing]` has to throw the head back by a bounded amount, `[she stops
folding]` has to hold the hands, and everything has to settle back to the
activity afterwards. Head gestures are an overlay on the look-at, not an
addition to it, and this is what catches it when they stop being one.

Syntax-check everything with:

```bash
for f in $(find src -name '*.js'); do node --check "$f" || echo "FAIL $f"; done
```

---

## Known issues

- **Chapter transitions dispose shared cached geometry and materials.** Three.js
  re-uploads them on next use, so it works, but it is wasteful. The geometry cache
  in `world.js` and the material cache in `mat.js` should be exempted from
  `World.dispose()`.
- **Chapter 4's Fuel & Go beat has a 240-second fallback timer** so a player who
  refuses to engage with the monitor is not stuck. It is a crutch.
- **Chapter 2's vignettes advance via a `ctx._advance` callback**, which is
  workable but fragile; a proper vignette runner would be better.
- The depth of field and bloom are newly retuned; if the look is still too soft,
  **Options → Display** has sliders for both, and the animated film grain sits at
  the doc's specified `0.06`.

---

## Where to take it next

In the order that would most improve the game:

1. **Voice acting for Recca and Victor.** They carry the game and they are
   currently silent. Nothing else on this list is close.
2. **Authored art for the apartment and the laundromat only**, the Chapter 1
   vertical slice. The doc's own build order is right: if the meeting over the
   dryers doesn't make a playtester smile, nothing else matters.
3. Wire the three unreachable threads: the medal, the other two Hohman outcomes,
   and the laundromat TV payoff.
4. Stretch Chapter 5's clock toward the intended ninety minutes and playtest
   whether the streetlight dread holds at that length.
5. Apartment 3B and NG+.

---

## Credits

Written and built as an original work. The folklore is real and cited above and
in the in-game credits screen. Fonts are Google Fonts / SIL OFL. Three.js is MIT.
