# KESSLERTON ROW, the action list

Every action the player performs, from the letter to the credits, in order, with
the time it should take. This is a planning document, not code. It takes what is
already built in Chapters One and Two as the baseline (the drive, the Fuel & Go,
the box, the laundromat, the five vignettes) and proposes the rest of the game
on top of it, with the changes needed to make the whole thing play for **three
hours or more** without a single stretch where the player is only reading.

Tags on every action:

- `[built]` exists and plays as described.
- `[tweak]` exists; change the detail given.
- `[new]` does not exist.

House rules still apply to anything that lands in `src/` (no em dashes, no
gradients, 22/4/3 scares unless `EXPECT` is updated). Where this plan adds a
scare it says so.

---

## 0. The rules this plan plays by

1. **The hands rule.** No conversation runs more than about six exchanges
   without the player doing something with their hands. A talk that has to be
   longer is split by a task and continues while the task is done (the
   laundromat already does this three times; every other long scene should).
   Nothing in this game is a twenty-minute conversation. The longest unbroken
   talk is Marta at the register in Chapter Three, at roughly ninety seconds,
   and the rectory kitchen at dawn, which earns it.
2. **Every location has at least three things to touch that pay off**, not
   flavour text: a thing that plants a tell, a thing that corroborates, and a
   thing that is just a thing in a room (a jukebox, a vending machine, a dog).
3. **Physical verbs carry the game**: carry, pour, scrape, thread, crank, dig,
   salt, strike, dial, light, wipe, count. Holding `E` with a progress ring is
   the basic grammar; everything important is at least that, and the Chapter
   Five chores are several of them chained.
4. **Conversations are locked** (`talk()`), short, and end in an action. Choices
   are three lines max and most of them change a flag that comes back later.
5. **No HUD beyond the reticle and the phone.** Objectives live in Jared's own
   Notes list in his own shorthand. Counting things (lights, flyers, names,
   nails, strikes) is always done by the player, never shown as a number.
6. **Time budget.** The table at the end sums to about 195 minutes on a
   first, unhurried playthrough. Chapter Five is the long one by design.

---

## 1. PROLOGUE, the letter (2 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 0.1 | Black screen, tape hiss. A microcassette recorder is drawn in the centre. The first input of the whole game is the player pressing **E** on its PLAY button. The host of *Nights We Don't Talk About* reads the first two paragraphs of the letter. | `[tweak]` (currently starts on its own) | 1.5 |
| 0.2 | The letter ends mid-sentence. The recorder's counter reads `000`, then the title card: KESSLERTON ROW, in the pink/yellow wordmark over the dusk sky. | `[built]` | 0.5 |

---

## 2. CHAPTER ONE, "Move-In Weekend" (Aug 24, 68°F), ~48 min

### 2.1 The drive in (12 min) `[built]`, with tweaks

| # | Action | Tag | Min |
|---|---|---|---|
| 1.1 | Jared's hands on the Taurus wheel. **W/S** throttle and brake, mouse steers, the indicator stalk and the radio face are interactables on the dash. Objective: *"ashgrove. twelve miles. left at the only light."* | `[built]` | 0.5 |
| 1.2 | Radio. Press the face to step stations (lofi / jazzhop / synthwave / late night). **New:** at the very top of the band, between two stations, WKRB 1290 is just audible for about ten seconds: the prologue host's voice, one sentence, then static. Nobody points at it. | `[tweak]` | 1 |
| 1.3 | Mile 2: Dad texts *"Did you find it"*. The phone buzzes on the passenger seat. Choice: *"almost. 10 min"* / *"yes"* / *Don't answer while driving.* Not answering gets a second, colder text. Flagged: `dadAnswered`. (Seeds Chapter Three's "stop calling your father".) | `[built]` | 1 |
| 1.4 | Mile 4: the deer. It is in the road. The player has to brake to a stop; it looks at him for four seconds and walks off. **New consequence:** if he does not brake, the thump cracks the right headlight; that headlight is dim for the rest of the game, including Chapter Four. No line about it. Flag: `hitTheDeer`. | `[tweak]` | 1.5 |
| 1.5 | Mile 5: **new** mailbox row and a sign, *KESSLERTON No. 9  3 MI*, faded, with a newer sign bolted under it: *ROAD CLOSED*. He reads it in passing. | `[new]` | 0.5 |
| 1.6 | Mile 6: somebody at the treeline in a coat three sizes too big. `ch1.roadside` fires. The player can check the mirror (look over the shoulder): nobody. | `[built]` | 1 |
| 1.7 | Mile 8: *ASHGROVE 4* sign. *"There it is."* | `[built]` | 0.5 |
| 1.8 | Mile 9: the tank light. Objective: *"gas."* | `[built]` | 0.5 |
| 1.9 | Mile 10: the Fuel & Go sign, lit. Indicate right (stalk), steer onto the forecourt, stop at **pump two**. The car settles. | `[built]` | 1 |
| 1.10 | The remaining 4 miles happen in 2.12 below. | | |

### 2.2 Ashgrove Fuel & Go at dusk (7 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.11 | Get out. Pump two: take the nozzle (`E`), put it in the filler (`E`), **hold** to pump; the digits roll. It clicks off at $31.40. Objective: *"pay inside."* | `[built]` | 1 |
| 1.12 | The plaque by the door. Hold to read: nine names, HALE COLLIERY COMPANY at the bottom. His thumb covers HALE if he photographs it (phone Camera is live from here). Flag `sawThePlaque`. | `[built]` | 1 |
| 1.13 | The payphone on the wall outside: dead tone. (It works in Chapter Four.) | `[built]` | 0.3 |
| 1.14 | Inside. The four-camera monitor behind the counter: his own car on camera 2, nobody in it. He can stand and watch it as long as he likes. | `[built]` | 0.5 |
| 1.15 | **New:** the rack by the register. Buy one thing with his change: a lighter, a bag of road salt, or a pack of gum. The lighter is the one he uses in Chapter Five if he has it (otherwise Victor's matches, which are finite). The salt sits in his hall for the rest of the game and Mrs. Ostrowski notices it. Flag `boughtLighter` / `boughtSalt`. | `[new]` | 0.5 |
| 1.16 | Marta makes his change. She looks at the ring a half second too long. Choice: *"There's a plaque outside. Nine names."* / *"Thank you."* Six lines either way. She tells him to go on, he'll lose the light. | `[built]` | 1.5 |
| 1.17 | **New:** walking back to the car, a single microcassette is on the ground by the ice chest, unlabelled, run over once. He picks it up and it goes in the glovebox. It plays nothing but hiss in the Tapes app. It is **not** one of the twelve; it is the tape Elena dropped the night she came here last. In Chapter Three the Tapes app lists it as *"(blank?)"* and after tape 12 is found, it plays: her, in this forecourt, thirty seconds, *"I'm going to the church. If I'm not back, Wik, the fourth landing."* | `[new]` | 0.5 |
| 1.18 | Back in the car. Objective: *"back in the car. ridge road, left at the only light."* | `[built]` | 0.3 |

### 2.3 The last four miles, in the dark (3 min) `[built]`

| # | Action | Tag | Min |
|---|---|---|---|
| 1.19 | Headlights on (stalk). The road is grain and two cones. The only traffic light in Ashgrove; indicate left, turn. | `[built]` | 1.5 |
| 1.20 | Ridge Road opens below as he crests: thirty-one streetlights in a line. Jared counts under his breath and loses the count. The player can count them; the number the player gets is the number. | `[built]` | 1 |
| 1.21 | Park outside 118½. Engine off, dash dies, radio dies mid-word. | `[built]` | 0.5 |

### 2.4 The street and the last box (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.22 | Objective: *"the last box. up the outside stair."* Open the tailgate, pick up the KITCHEN box (heavy carry, the camera sags). | `[built]` | 0.5 |
| 1.23 | Mrs. Ostrowski is salting her step. He talks to her with the box in his arms; she does not offer to take it. Four lines. She gives him the note (radiator: talk to it; quarters: ask for Dolores at the diner). | `[built]` | 1.5 |
| 1.24 | The salt bag on the step is an interactable: *"for the ice."* It is August. | `[built]` | 0.2 |
| 1.25 | The notice on the street door (read). | `[built]` | 0.3 |
| 1.26 | **New:** the mailbox bank at the foot of the stair. 118½ has a letter in it already, addressed to *Occupant*, from Stanko Realty, dated 1997. He can put it in his pocket; it is the plat map that turns up in Chapter Three's realty office, so he will recognise it. | `[new]` | 0.5 |
| 1.27 | Up the outside stair with the box. The landing rail is loose on the second turn (it moves when he leans). | `[built]` | 1 |
| 1.28 | Put the box down inside the door. | `[built]` | 0.3 |

### 2.5 The room (7 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.29 | Objective: *"unpack. the boxes are labelled. mostly."* Four boxes, any order. Each opens with a hold. | `[built]` | |
| 1.30 | BOOKS: paperbacks to the shelf (carry a stack, three trips), and at the bottom the ring case, empty, the ring is on his hand. | `[tweak]` | 1 |
| 1.31 | CLOTHES: the coat goes on the hook by the door. (This hook is `ch2.coathook` later; the player hangs the thing that scares them.) | `[tweak]` | 0.5 |
| 1.32 | MISC. FRAGILE?: the mirror. Carry it to the door wall, hold to hang, then a left/right nudge to get it straight (it is never quite straight; it settles crooked by two degrees whatever he does). Objective *"hang the mirror. by the door."* | `[built]` | 1 |
| 1.33 | KITCHEN: the detergent and the hot plate. The detergent is a carryable. It is in his hand from here. | `[built]` | 0.5 |
| 1.34 | The window: stuck; hold to force it. Then *Look out*: the row opposite, the streetlights. *"Twenty-six. Twenty-seven."* | `[built]` | 0.5 |
| 1.35 | The whiteboard on the fridge. **New:** he writes the first line himself, choice of three: *"quarters"*, *"call mom"*, *"don't count the lights"* (the last only if he counted in 1.20). The board is persistent; Recca writes under it in Chapter Two and something else writes under that in Chapter Three. | `[tweak]` | 0.5 |
| 1.36 | Bed: not yet (*"there are quarters to get"*). Objective: *"quarters. the diner, down the hill. ask for dolores."* | `[built]` | 0.2 |
| 1.37 | **New:** the radiator under the window has a brass key on a string. He can turn it: it clanks once, nothing. Plants 1.64. | `[new]` | 0.3 |
| 1.38 | The hall outside: the shared bathroom, the laundromat stair down, the back door to the yard (locked tonight; open from Chapter Two). | `[built]` | 0.5 |

### 2.6 Down the hill (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.39 | Ridge Road on foot in the evening: walkers, a pair talking, a car every twenty seconds. | `[built]` | 1 |
| 1.40 | The diner. Dale (or Dolores) at the register: *"Mrs. Ostrowski sent me"* / *"Just the change"*. Quarters into his hand (the roll is a carryable for a moment). Six lines. | `[built]` | 1.5 |
| 1.41 | The corkboard by the restrooms: glance. Nine flyers. He does not count them tonight. Flag `sawTheFlyersInChapterOne`. | `[built]` | 0.3 |
| 1.42 | The jukebox: put a quarter in, pick one of three. **New:** the pick is remembered; it is the song on when he comes back with her on Oct 12, and the song playing on the dead jukebox in Chapter Three with nobody having put a quarter in. | `[tweak]` | 0.5 |
| 1.43 | The pawn shop next door, last ten minutes before close. The ring case (nine rings, all colliery signets, all the same wheel as his: flag `sawTheRings`). The book on the counter, *The Long Lost Friend*, $4. He does not buy it tonight. The pawnbroker: two lines. | `[built]` | 1.5 |
| 1.44 | **New:** the pawnbroker asks to see his hand, says the ring is worth forty and he'd give sixty. Choice: *Show him* / *Keep it in the pocket.* He does not sell. (Chapter Three he can.) | `[new]` | 0.5 |
| 1.45 | Back up the hill. Objective: *"detergent, quarters, downstairs. do a wash."* | `[built]` | 1 |

### 2.7 The Wash-Rite (11 min) `[built]`, the vertical slice

| # | Action | Tag | Min |
|---|---|---|---|
| 1.46 | In through the laundromat door. The TV in the corner is static; the vending machine; the machines. Buttons the dog on a rope by the change machine. | `[built]` | 0.5 |
| 1.47 | **Tweak:** Buttons is pettable (`E`, hold, he leans). He will not walk toward the back row where she is; the rope is long enough and he sits at its limit. Nobody says anything about it. | `[tweak]` | 0.5 |
| 1.48 | Recca is folding at the back table. The meeting starts. Conversation 1 (her grandfather's coat, his car): choice *"He said it twice"* / *"four-wheel drive"* / *say nothing*. | `[built]` | 1.5 |
| 1.49 | Task: pick a machine. Objective *"put the wash on. NOT the third from the end."* Load the clothes (carry the bag), quarters in (four, one by one), the detergent he has been holding the whole time goes in, the lid shuts. | `[built]` | 1.5 |
| 1.50 | Conversation 2, over the tumble (why Ashgrove State): *"the school that would take me"* / *"somewhere nobody knew me"* / *"I don't know yet."* | `[built]` | 1 |
| 1.51 | Task: the dryers. Move a load. Pick the good dryer (she says fourth from the left and is lying; she admits it by text later). | `[built]` | 1 |
| 1.52 | Conversation 3: **what does Hale mean.** *"Nothing. It's just a name."* / *"My great-grandfather owned the colliery."* Flag `toldHerTheTruthAboutName`. She smiles either way. | `[built]` | 1 |
| 1.53 | Task: the towel. She throws one; take it. | `[built]` | 0.3 |
| 1.54 | Conversation 4: why did you come down. *"I forgot the detergent"* (it is in his hand) / *"the detergent machine"* / *"I just came down."* Flag `detergentInHand`. | `[built]` | 1 |
| 1.55 | **New:** the TV. While her load finishes, he can watch the static. Ninety seconds of watching sets `watchedStaticFull`; in Chapter Three the same set resolves for two frames into St. Brigid's nave. | `[built flag, picture new]` | 1.5 |
| 1.56 | She writes her number on the back of a laundry ticket. It goes into Notes (the number is real and the player will dial it in Chapter Four). | `[built]` | 0.5 |
| 1.57 | The vending machine: a can. She does not want one. (She never eats. First instance.) | `[built]` | 0.3 |

### 2.8 The threshold (3 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.58 | Walk her up the outside stair. She stops one step below the landing. Choice: *"Come in."* / *"...Do you want to come in?"* / *"Goodnight."* Every branch resolves to an invitation and the words *come in* out of his mouth. Flag `invitedHerIn`. | `[built]` | 1.5 |
| 1.59 | She comes in, stands at the window. *"Don't count the streetlights."* **Tweak:** she writes one word on the whiteboard under his line, without looking at it, and the player can read it after she goes: *"9"*. | `[tweak]` | 1 |
| 1.60 | She goes. He watches her down the stair from the window; she passes under the lamp and the lamp does not flicker, tonight. | `[built]` | 0.5 |

### 2.9 The night (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 1.61 | Objective: *"text her back. not immediately. wait like an hour."* Her text comes: *"made it home. the good one really is the 4th from the left. i lied earlier."* Choice: reply now / *"it has been thirty nine minutes"* / don't answer yet. | `[built]` | 1 |
| 1.62 | Wash up at the sink. The mirror: his own face, the only time in the game until the sacristy. | `[built]` | 0.5 |
| 1.63 | Bed (objective *"bed. it has been a day."*). Fade. | `[built]` | 0.5 |
| 1.64 | 3:04 AM. The radiator knocks. Follow the sound in the dark (no flashlight yet), find it, hold `E`: *"okay. okay. I hear you."* It stops. `ch1.radiator` (false alarm). Objective *"the radiator. she said talk to it."* | `[built]` | 1.5 |
| 1.65 | The window on the way back to bed. Across the road, under the lamp, somebody looking up. The lamp goes out for half a second; nobody. `ch1.window`. | `[built]` | 1 |
| 1.66 | Bed. Card: *September.* | `[built]` | 0.5 |

---

## 3. CHAPTER TWO, "Small Hours" (Sep 6 – Oct 12, 54°F), ~32 min

Five hard-cut vignettes. They are built; the changes below put something in the
player's hands in each one so that no vignette is only dialogue.

### 3.1 September 6, the walk home (7 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 2.1 | Card. Ridge Road at night, the two of them. Objective *"walk her home. it is 4 blocks. it takes an hour."* | `[built]` | 0.3 |
| 2.2 | **Tweak:** the walk is walked, not skipped. She sets the pace (0.85 m/s) and the player has to keep to it; if he gets ahead she stops and waits, arms folded, and the talk does not continue until he is beside her. Three talk fragments along the way, each five lines. | `[tweak]` | 3 |
| 2.3 | Fragment 1: the four streets and the hill. The lights again. | `[built]` | |
| 2.4 | **New** Fragment 2: a car comes up Ridge Road. She steps into the hedge shadow and stops talking until it has passed. *"Headlights. I'm a vampire, Jared, I've told you this."* He laughs. | `[new]` | |
| 2.5 | **New** Fragment 3: the Kesslerton Row end units. Every window frame has a painted hex rosette. She touches the one on 9 as she passes, without looking, *"for luck"*. It is the only one on the row that is painted over. | `[new]` | |
| 2.6 | The glider. They sit (the camera drops, the glider creaks). *"Cold."* He takes her hands. Choice: *Kiss her* / *Wait.* | `[built]` | 1.5 |
| 2.7 | *"Go home, Jared Hale."* She goes in, waves through the glass, badly. Texts: *"made it up the hill"* / *"liar you took the car"*. | `[built]` | 1 |
| 2.8 | **New:** the walk back alone is playable for ninety seconds (it is four blocks uphill). The car is parked outside 118½; he did take the car. Objective ends when he touches the door. The last streetlight before his door is off. It was on when they walked down. | `[new]` | 1.5 |

### 3.2 September 19, dinner at the Vaskos' (8 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 2.9 | Card. The porch of 9 Kesslerton Row. Objective *"dinner at her mom's. take the ring off."* The ring is an interactable on the step before the door: hold to take it off, it goes in the pocket. Flag `ringRemovedAtDinner`. | `[built]` | 0.5 |
| 2.10 | **New:** Marta is slow to the door. While he waits he can look at the painted-over rosette from the porch and at the line of salt on the sill inside the storm door. | `[new]` | 0.3 |
| 2.11 | Marta. *"He read the plaque."* Six lines. | `[built]` | 1 |
| 2.12 | **New** Task: Marta hands him the dish of pierogi to carry to the table, and then the plates: three. He sets them. Recca's place has no knife. She does not ask for one. | `[new]` | 1 |
| 2.13 | **New:** Marta says grace. Choice: bow his head / look at Recca. If he looks, Recca is looking at him, not bowing, and smiles. If he bows, Marta's hand finds his on the table and holds it through the whole grace. | `[new]` | 0.5 |
| 2.14 | Dinner talk (undeclared, the cabbage). Recca cuts the same pierogi into four and moves it to the edge. Twice. He can look at her plate (`E`: *"[four pieces. the edge of the plate.]"*). | `[built]` | 1.5 |
| 2.15 | Choice: *the plaque* / *Recca's dad* / *eat the cabbage.* | `[built]` | 1 |
| 2.16 | **New:** after dinner Recca shows him her room while Marta does the dishes. Her room is fully built (`loc_vasko.js`). Three touches: Gerald the taxidermied bird on the sill (facing in); the record player (put the record on: the theme an octave up, the *doll_house* piece, it skips once); the quilt; and on the back of the door, a calendar with the 22nd circled twice in biro (the same double ring that is on the 2011 calendar in Kowal Cleaners; neither is explained). | `[new]` | 2 |
| 2.17 | Marta at the door with the foil plate; she holds his hand too long. *"You're good for her."* If the ring is on, she looked at it. | `[built]` | 0.5 |
| 2.18 | **New:** the porch. The porch light goes off behind him while he is still on the top step. He walks to the car in the dark. | `[new]` | 0.3 |

### 3.3 September 22, the equinox (7 min)

The built vignette has a clock that runs and a window. It needs more for him to
do so that staying up until 3:04 is a thing a player might do, and so that the
player who goes to bed early has still spent an evening.

| # | Action | Tag | Min |
|---|---|---|---|
| 2.19 | Card. 7:04 PM. Text: *"family thing. love you"*. Choice: *"ok. tomorrow?"* / *"everything alright?"* / *Don't reply.* Objective *"nothing. it is a tuesday."* | `[built]` | 1 |
| 2.20 | The evening runs at 26x. Things to do, any order, each about a minute: | | |
| 2.21 | **New:** dinner. The hot plate: the pan, the ramen, the water; a three-step hold. He eats standing at the window. | `[new]` | 1 |
| 2.22 | **New:** Dad. The phone rings at 8:40, DAD. Choice: *Answer* / *Decline.* If answered, a locked forty-second call, Dad does the talking, one choice (*"I'm fine"* / *"I met somebody"*), which sets `toldDadAboutHer`. | `[new]` | 1 |
| 2.23 | **New:** the last box (MISC. FRAGILE? had a false bottom): his grandfather's photographs, one of the Kesslerton headframe, 1963, with men in front of it. Nine. Goes on the shelf. | `[new]` | 0.5 |
| 2.24 | **New:** downstairs. The back hall door to the Wash-Rite is open at night now; the laundromat after hours, lights off, the machines ticking as they cool, the TV on static, Buttons asleep. Sit with the dog. Watch the static (counts toward `watchedStaticFull`). | `[new]` | 1.5 |
| 2.25 | The whiteboard: her *"9"* is still there. He can wipe it or leave it. Flag `wipedTheNine`. | `[tweak]` | 0.2 |
| 2.26 | Stand at the window. Count the lights. A different number every time. | `[built]` | 1 |
| 2.27 | Sleep (ends the vignette), or stay. At 3:04, if he has been at the window three seconds, a small brown sedan goes down Ridge Road toward the mine at twenty. No sting, no line. Flag `sawEquinoxCar`. | `[built]` | 1 |

### 3.4 October 2, half her things (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 2.28 | Card. 6:40 PM. **New:** start outside. Her car is at the kerb: a small brown sedan. The player who stood at the window on the 22nd recognises it. Nobody says anything. Three boxes in the back seat. | `[new]` | 0.3 |
| 2.29 | **New** Task: carry her boxes up the outside stair. Three trips, she carries the lamp. Talk runs across the trips: *"This is not moving in."* | `[new]` | 2 |
| 2.30 | Put the lamp where she says (two spots; she changes her mind once). Plug it in: the room has a second light now, and it is warmer than his. | `[new]` | 0.5 |
| 2.31 | She writes on the whiteboard. *"milk, the good kind not the blue one."* The cold-hands exchange, she touches the back of his neck. | `[built]` | 1.5 |
| 2.32 | **New:** she hangs her scarf over the top corner of the mirror by the door, *"glare"*. The player can take it down; it is back up in the 3:02 beat. | `[new]` | 0.3 |
| 2.33 | 3:02 AM. He wakes. She is on the edge of the bed, upright, facing away, coat, boots. `ch2.bedside`. Input does nothing for four seconds. | `[built]` | 1 |
| 2.34 | *"I couldn't sleep."* Choice: *"Come back to bed."* / *"Where were you?"* / *Turn the light on.* She lies down with the boots on. | `[built]` | 1 |

### 3.5 October 12, the photo (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 2.35 | Card. The diner, 9:20 PM, the booth. Dale's free coffee, the pie she takes home. The jukebox is playing the song he picked on Aug 24. | `[built / tweak]` | 1 |
| 2.36 | **New:** the corkboard. He gets up for the restroom and passes it. *"Don't, it's depressing,"* from the booth, before he has stopped. He can stop anyway: nine flyers. If he photographs it she says nothing at all for the rest of the vignette until the photo beat. | `[new]` | 1 |
| 2.37 | *"Hold still."* Tab, Camera, take the photo. Gallery: motion blur where she is. `ch2.photo`. | `[built]` | 1.5 |
| 2.38 | *"Your phone's junk."* Choice: *Delete it* / *Keep it.* She checks his gallery either way. Flag `deletedThePhoto`. | `[built]` | 1 |
| 2.39 | **New:** the walk to the car in the rain. She gets in on the passenger side. The camera on the dash monitor at the Fuel & Go in Chapter Four will show someone in that seat. Not now. Card. | `[new]` | 0.5 |

---

## 4. CHAPTER THREE, "Nine" (Oct 20 – Dec 15, 31°F), ~62 min

The open chapter. Currently it is one long day with a car that teleports, ten
destinations, thirteen finds counted in `S.found`, and it ends when
`found >= 5 || tapes >= 8`. The three escalations (ring, father, name) are a
single `nightBeat` the player can miss.

**Proposed structure: three days and three nights.** The map is open every day.
The chapter ends only after the third night, and each night is one escalation,
so they cannot be skipped. Sleeping at 118½ ends a day; the night beat plays;
the next day starts. The text on Dec 20 comes after night three *and*
`found >= 5`. (A player who sleeps three times with nothing found gets a fourth
"day" that never ends until five finds are made; the whiteboard says
*"you haven't been anywhere."*)

Finds are made with the hands: threading, digging, scraping, counting. Every
find below lists its physical action.

### 4.1 118½ Ridge Road, the hub (visited every day)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.1 | The Notes list is Jared's own: *"ask her about the ring thing"*, *"library, microfilm. 1963. ask the woman."*, *"count the flyers at the diner. i counted 9 twice."*, *"cemetery. the vasko plot."*, *"the barn on colliery. the white one."* New items appear as he finds things. | `[built]` | |
| 3.2 | The whiteboard. Her list is on it and it changes between days: day 2 it says *"stop wearing it"*; day 3 it says his name. He can wipe it (it comes back). | `[tweak]` | |
| 3.3 | The mirror by the door has a sheet over it. He did not put it there. He can take it off. It is back each morning. | `[built]` | |
| 3.4 | The coat hook: `ch2.coathook` (false alarm) fires the first night he comes in after dark. | `[built]` | |
| 3.5 | The car outside (*"The Volvo"*, it is the Ford) is the map: choose a destination, fade, arrive; the car comes with you. **Tweak:** the drive between destinations is a short `driveRail` of 20–40 s on the real road (town, Colliery Road, the ridge), not a fade. He is still driving the thing; the radio is on; his father texts once per day and he can read it at a red light. It costs about five minutes over the chapter and makes the town a place. | `[tweak]` | |
| 3.6 | Recca texts during the day. *"where are you"*. Choice each time: the truth / a lie / no reply. Flag `liedToHerAboutWhere` counts. If he tells the truth from the cemetery, she calls (see 3.34). | `[new]` | |
| 3.7 | Buttons is at the foot of the outside stair from day 1, off his rope. Feed him: nine scraps, one in each region (diner bin, pawn counter, Fuel & Go rack, Marta's foil plate at home, cemetery, barn, mine, library car park, the Row). Each scrap is a hold. He follows Jared after three. Flag `buttonsFed` counts. The `ch3.dogbite` scare needs him following. | `[tweak]` (one interactable now) | |

### 4.2 Night one, Oct 20: the ring (4 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.8 | Sleep. 2:50 AM, the lamp (hers) is on. She is in the room. *"Can you not wear it. The ring. In bed. It's cold."* Choice: take it off (it goes in the drawer, an interactable from now; the player can put it back on any day) / *"It was my grandfather's."* (she turns away; in the morning it is in the drawer anyway). Flag `ringOffForHer`. | `[tweak]` | 2 |
| 3.9 | Later, the doorway at the foot of the bed: somebody, then gone (`ch3.doorway`). Then a hand on the shoulder (`ch3.shoulder`, Contact 1). *"It's me, baby. Breathe."* From behind him, in the dark, without crossing the room. | `[built]` | 1.5 |
| 3.10 | Morning. The sheet is on the mirror. | `[built]` | 0.5 |

### 4.3 Night two, Nov: the father (4 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.11 | 11 PM, Dad calls while she is there. She looks at the phone and then at him. Choice: *Answer* / *Decline* / *Turn it off.* If answered: a locked sixty seconds, Dad has had a letter from the Ashgrove Historical Society about the plaque, and asks if Jared has been "going round asking". Recca listens. Flag `answeredDadNight2`. | `[new]` | 2 |
| 3.12 | *"You don't need him. You've got a family here now."* Six lines. She asks him to stop calling. Choice: *"Okay."* / *"He's my dad."* Flag `agreedToStopCallingDad`. | `[new]` | 1 |
| 3.13 | 3 AM, the sheet is off the mirror (`ch3.mirrorsheet`). He did not take it off. In it, over his shoulder, the lamp is off; in the room the lamp is on. | `[built / tweak]` | 1 |

### 4.4 Night three, Dec: the name (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.14 | 3 AM. *"Say your name. Your whole name. Out loud. I want to hear you say it."* Choice: *"Jared Aldous Hale."* / *"No."* / *"Why?"*. *No* delays it three nights and then he says it, because she is crying. Flag `saidHisFullNameAloud` is always set by the end of this night; the choice decides whether it was freely said the first time, which Ending C's Recca remembers (*"you didn't want to"*). | `[built / tweak]` | 2 |
| 3.15 | She writes it down on the back of something, in the dark, without looking. | `[built]` | |
| 3.16 | **New:** morning. Her coat is on the hook. The pocket has a laundry ticket in it. He can take it out: his own number, written in Chapter One, and on the other side, his full name in her hand, and under it, in a hand that is not hers, a date: *12/21*. He can put it back or keep it. Flag `foundTheTicket`. If he keeps it she does not mention it, ever. | `[new]` | 1.5 |
| 3.17 | A branch against the window (`ch3.branch`, false alarm) some other night, on the scare director's clock. | `[built]` | |

### 4.5 Ashgrove State, the library (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.18 | The microfilm room. **Tweak:** the reader is a machine, not a button. The reel boxes are on a shelf, twelve of them, labelled by month; he has to pick FEB 1963 (the others load and show other pages, dull ones; a little real reading). Load the reel (hold), then **W/S** cranks the film; the page scrolls; he has to stop on the right column. Flag `sawMicrofilm`, `found++`. New notes: *"aldous hale. ask dad. do not ask dad."*, *"victor. st brigids. you have to go."* | `[tweak]` | 3 |
| 3.19 | The librarian: four lines, she already has the reel out for him, *"the Kowal girl asked for the same one."* | `[new]` | 0.5 |
| 3.20 | The return bin: tape t02. Hold to dig through the books. | `[built]` | 0.5 |
| 3.21 | Taped under the reader desk: tape t05. Crouch to see it. | `[built]` | 0.5 |
| 3.22 | **New:** the card catalogue, K drawer: *Kesslerton Colliery Disaster, 1963*, one card, with a checkout stamp from 2011 and a name: E. Kowal. | `[new]` | 0.5 |

### 4.6 The Anthracite Diner (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.23 | The corkboard. Photograph each flyer (nine shots; the Gallery fills). On the ninth, `photographedAllFlyers`, `found++`, note *"there is no flyer for recca"*. Each flyer is readable: name, age, year, 1965 to 2011, one every nine years, the last Elena Kowal. | `[built]` | 2.5 |
| 3.24 | **New:** tape t08 is behind the corkboard. He has to take a flyer down to reach it. Dale sees him do it from the counter and says nothing; the flyer is back up the next day. | `[tweak]` | 0.5 |
| 3.25 | Dale at the counter. *"Who are the flyers?"* / *"Do you know a Kowal?"* / *"Coffee."* Five lines each. He keeps meaning to take them down. | `[built]` | 1.5 |
| 3.26 | The jukebox is on. Nobody has put a quarter in. It is the song from Aug 24. He can unplug it (`E`); it finishes the verse anyway. | `[new]` | 0.5 |
| 3.27 | The booth. Recca's seat. If he has the photo from Oct 12 he can put the phone up against the real booth; the blur is where the wall is. | `[new]` | 0.5 |

### 4.7 Kesslerton Pawn & Loan (4 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.28 | *The Long Lost Friend*, $4. Buy it (quarters). Read it: the reader opens on p. 63, *do not answer if something calls your name from a dark place*. Flag `readHohman`, `found++`, note *"do not answer if something says your name in the dark"*. | `[built]` | 1.5 |
| 3.29 | **New:** the ring. The pawnbroker offers sixty again. Choice: *Sell it* / *Keep it.* Selling sets `soldTheRing`; the ring is gone from the drawer and from his hand; in Chapter Six she says *"you sold it, so it wasn't that"*. It changes nothing mechanical. It is there because the player should be able to try to get out of it the easy way and find out it was never the ring. | `[new]` | 0.5 |
| 3.30 | The glass case: tape t01, $2. | `[built]` | 0.5 |
| 3.31 | **New:** the back wall of the pawn shop has nine lunch pails on a shelf, each with a name scratched in. The same nine. *"People bring them in. I don't sell them."* | `[new]` | 0.5 |

### 4.8 Ashgrove Fuel & Go (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.32 | Marta at the register. The best scene. Choice 1: *"She doesn't eat."* / *"There's a stone in your family plot with no name on it."* / *"I think somebody is hurting her."* Choice 2: *"I'm not going anywhere."* / *"That's not what this is."* She cries, genuinely, and every word is a lie. Flag `confrontedMarta`, `found++`, note *"marta says she's been sick since she was 4. believe it."* This is the one long conversation in the chapter: about ninety seconds, locked. | `[built]` | 3 |
| 3.33 | **New** Task before the talk: he is buying gas. Pump two again; the numbers; and on the pump's card reader, a sticker: *ST. BRIGID'S PARISH PICNIC 1963*, half scraped. The talk starts when he comes in to pay. | `[new]` | 1 |
| 3.34 | The security monitor: four cameras, forecourt, his car. Nobody in it. Yet. | `[built]` | 0.3 |
| 3.35 | Tape t10 is **not** here (it is in the sacristy). The tape that is here is the ch1 forecourt tape, which the player already has; instead, on the ice chest: Marta's Miraculous Medal, on its chain, left on the lid while she cries inside. He can take it. Flag `tookMartasMedal`. It does nothing in Chapter Five (it is not the Benedict medal). It is on her kitchen table in the post-credits. | `[new]` | 0.5 |

### 4.9 St. Brigid's cemetery (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.36 | The Vasko plot. Andrej, 1999. And a fresh stone, flat, no name. Note *"the stone has no name on it"*. | `[built]` | 0.5 |
| 3.37 | The sexton's spade against the wall. Take it. | `[built]` | 0.3 |
| 3.38 | Dig. **Tweak:** four holds, each a spade's depth, each with a line. On the third, ten centimetres down, the phone rings (`ch3.phonecall`): RECCA. Answer: *"what are you doing?"* warm, sleepy. Choice: *"Nothing. Walking."* / *"I'm at the cemetery."* If the truth, four seconds of silence and *"come home."* He stops digging either way. Flag `dugAtTheStone`, `found++`. | `[built / tweak]` | 2 |
| 3.39 | **New:** the Kowal plot, two rows over. Stefan, Anna, and a space. No Elena. A jam jar with a candle burnt down, and tape t09 is NOT here (it is in the culvert); what is here is a second jam jar, fresh candle, a lighter beside it. He can light it. If he does, it is still burning in Chapter Five when he looks down the hill, the one warm point in the cemetery. | `[new]` | 1 |
| 3.40 | **New:** the sexton's shed by the east wall. Nine spades on the wall, and his, the tenth, is the one Jared took. A burial ledger on the bench, 2014: nothing in September. | `[new]` | 0.5 |
| 3.41 | **New:** the church itself by day. West doors locked. Victor is smoking on the rectory step. Six lines maximum, he will not give more: *"Not before the twenty-first. Go home. Don't sleep there if you can help it."* He does not explain. The rectory kitchen door is unlatched behind him and he does not stop Jared going in. | `[new]` | 1.5 |
| 3.42 | **New:** the rectory, by day. Victor's mattress, tape t07 under the corner. Index cards rubber-banded on the table (readable; the rite in his shorthand; the player who reads them knows the six chores before Victor lists them on the night). A St. Benedict medal on a nail by the door. **Tweak:** this is where the medal is given: Victor, from the step, without turning round: *"Take the one on the nail. Put it in your coat and leave it there."* Flag `hasBenedictMedal`, `medalInCoat`. This is the currently unreachable thread, wired. | `[new]` | 1.5 |

### 4.10 Colliery Road, the barn (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.43 | The white barn. The cheerful hex sign on the gable, freshly painted. The ladder is inside. | `[built]` | 0.5 |
| 3.44 | **Tweak:** carry the ladder out (heavy), stand it, climb (a floor rect up the rungs). A scraper is on the workbench; take it first or climb down for it. Scrape: three holds, the paint comes away in passes; underneath, inverted, nine points, and in tar: **12/21**. Flag `scrapedHexSign`, `found++`, note *"12/21. the longest night."* | `[tweak]` | 2.5 |
| 3.45 | Tape t04 nailed to a post inside. Pry it (hold). | `[built]` | 0.5 |
| 3.46 | **New:** the barn floor. Nine chairs in a ring, folding chairs, church chairs, with *ST. BRIGID'S* stencilled on the backs. A tenth chair, folded, against the wall. | `[new]` | 0.5 |
| 3.47 | **New:** the hex rosette at 9 Kesslerton Row (2.5) is scrapeable now too, from her porch, with the same scraper, if he goes there by day. Same sign. Marta watches from the kitchen window. She does not come out. | `[new]` | 1 |

### 4.11 Colliery Road, the old blacktop (3 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.48 | The graffiti stretch. Something in white: *E.K. WAS HERE 9/18/11* and under it, smaller, *DON'T ANSWER*. Flag `graffitiEK`. | `[built]` | 1 |
| 3.49 | The culvert: tape t09, in the wall. Crouch and reach (hold). | `[built]` | 0.5 |
| 3.50 | **New:** the guardrail where the sedan would have turned off toward the mine. Tyre marks in the verge, old. A glove. A woman's. It is not Recca's (it is Elena's). | `[new]` | 0.5 |
| 3.51 | `ch3.staticTV` fires here or at home on the director's clock if `watchedStaticFull`: it is a mediated scare, so it plays on the next screen he looks at. | `[built]` | |

### 4.12 Kesslerton No. 9 (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.52 | The cap. Nine names cast in the concrete. Count them (he touches each: nine holds, each a name said in thought). Note *"9 men. 1963. my great-grandfather gave the order."*, `found++`. | `[built / tweak]` | 1.5 |
| 3.53 | The ground. It is warm through his boots. There is frost everywhere on Colliery Road and none inside the fence. | `[built]` | 0.5 |
| 3.54 | The headframe. Look up. | `[built]` | 0.3 |
| 3.55 | Tape t06 in a coffee can on the fence post. | `[built]` | 0.5 |
| 3.56 | **New:** the fan house. Door chained. Through the gap, a folding table with nine candle stubs and a new book of matches. The chain can be rattled and nothing else. | `[new]` | 0.5 |
| 3.57 | **New:** Buttons, if he followed, will not come through the gate. He sits at it. | `[new]` | |

### 4.13 The row opposite (5 min, optional, does not advance)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.58 | Kowal Cleaners: the bagged orders, the tenth hook, the 2011 calendar, the salt line, the height marks to 2002, the order left for collection. A board is missing from the back fence. | `[built]` | 2.5 |
| 3.59 | Stanko Realty: the plat map with 118½ ringed (and the letter from 1.26 matches it), nine keys and the empty 118½ hook, the clock at 3:04, the 1964 conveyances. | `[built]` | 2.5 |

### 4.14 9 Kesslerton Row by day (4 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.60 | **New:** Recca is home by day, in her room, with the record on. She is warm and funny and nothing happens. Six lines. She asks him to stay for dinner; he can. | `[new]` | 1.5 |
| 3.61 | The basement door. Choice to go down (she is upstairs). The fuse box: tape t03 on top. While he is down there she calls down the stairs, *"what are you doing?"* in exactly the cemetery voice. Flag `wentInTheBasement`. | `[built / tweak]` | 1.5 |
| 3.62 | **New:** the basement has a drain in the floor, and around it, a ring of salt, and in the ring, her boots, the mud on them black and wet. | `[new]` | 0.5 |

### 4.15 The text (1 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 3.63 | Dec 20. After night three and five finds: 11:47 PM, the phone. *"jared i cant sleep. please come. i need you. im home."* Sent 11:56 PM. *"The clock's wrong. The clock on this thing has been wrong since I bought it."* Fade. | `[built]` | 1 |

### 4.16 Elena's tapes in Chapter Three

Twelve tapes, each a hold to pick up and a Tapes-app listen (each 40–70 s, the
player can keep moving while it plays; Jared's hands hold the recorder up to
his ear in the viewmodel). Nine are in the open chapter, three are in the
church (t10 sacristy press, t11 confessional kneeler, t12 the fourth landing),
and the forecourt tape from 1.17 plays last. Finding all twelve is the
completionist thread that enables Ending C with the register and the truth in
1.52. See §7 for the placement table.

---

## 5. CHAPTER FOUR, "Come Over" (Dec 21, 11:47 PM – 1:20 AM, 19°F, snow), ~16 min

| # | Action | Tag | Min |
|---|---|---|---|
| 4.1 | Card. Objective *"go to her."* Down the outside stair in the snow, into the car, the headlights (one dim if 1.4). Snow on the windscreen; wipers are on the stalk. | `[built / tweak]` | 1 |
| 4.2 | Drive. The radio: WKRB, the host, mid-sentence it is her voice, *"...and I'm home, so,"* and static (`ch4.radio`). He can turn it off. If he does, it is on again at the next bend. | `[built]` | 2 |
| 4.3 | The tank light, again (he never did fill it properly in October). Objective *"gas. then her."* Pull in. Pump two. | `[built]` | 1 |
| 4.4 | Pump: the hold. Then inside. The kid at the register. Behind him, the monitor. Camera 2, the forecourt, the Taurus, **and somebody in the passenger seat.** `ch4.monitor`. Silent. Objective *"look at the car."* | `[built]` | 2 |
| 4.5 | Turn around; the window; the car is empty. Look back; empty. **Tweak:** the 240 s fallback goes; instead the kid says *"You paying or what"* at 60 s, and the scene advances when he pays. The monitor can be looked at as long as he wants after that. | `[tweak]` | 1 |
| 4.6 | The kid: two lines. *"Marta's off. Family thing."* | `[built]` | 0.3 |
| 4.7 | The payphone outside. Objective *"call her."* **Tweak:** he dials. The keypad is an interactable with ten keys; the number is on the laundry ticket in Notes since Aug 24 (and in his pocket if 3.16). Ten presses. A wrong number rings out to nothing and he hangs up and tries again. | `[tweak]` | 1.5 |
| 4.8 | She picks up, warm, sleepy. Behind her voice: the Wash-Rite dryers (`ch4.dryerphone`). *"I'm home. Come over."* Flag `calledFromPayphone`. | `[built]` | 1 |
| 4.9 | Drive. Ridge Road descends. Objective *"left is her house. right is the church."* The fork sign. Steer. Left or right is decided by where the car is when the sign passes; straight is right. | `[built]` | 2 |
| 4.10 | **Left, "Kesslerton Row":** the house dark, stove cold. **Tweak:** he gets out and walks to the porch (playable, thirty seconds), looks through the glass: three months of mail on the floor. He does not go in; the door is an interactable with no `use`, the prompt says nothing. Ninety seconds, no dialogue, white. `ending('KR')`. | `[built / tweak]` | 2 |
| 4.11 | **Right, "Up the ridge":** four minutes uphill in the snow, no talking, one line to himself: *"He's gonna say I told you so."* **Tweak:** the streetlights up the ridge are all out; the only light is the rectory window. The car fishtails once on the last bend and the player has to correct it. | `[built / tweak]` | 3 |
| 4.12 | The rectory door. Victor, dressed, carrying a can of lamp oil. *"You're two years late. Get inside and take your shoes off, the floor's wet."* Flag `arrivedAtChurch`. | `[built]` | 0.5 |

---

## 6. CHAPTER FIVE, "The Ninth Hour" (1:20 AM – 3:00 AM), ~42 min

The centrepiece. **`SECONDS_PER_LIGHT` goes from 42 to 75**: thirty-one lights
at 75 s is 38.75 minutes of her walking, plus the opening and the arrival. The
six chores are sized to take about thirty minutes for a player who does them
cleanly, so there is slack for looking out of the window and for being scared,
and not much more than that. If the player is still short when the last light
goes, the lamps go out anyway; the chores that are done are done, and Chapter
Six reads the flags (Ending C needs the register; Ending B needs the name burnt;
an unfinished bell or seals changes Victor's lines and the staging, not the
outcome, because she never needed the doors).

| # | Action | Tag | Min |
|---|---|---|---|
| 5.1 | Shoes off at the door (hold). The floor is wet. Buttons, if he followed all chapter, is at the door; Victor lets him in. Flag `buttonsInChurch`. | `[built / tweak]` | 0.5 |
| 5.2 | Victor's rules, in ninety seconds, while walking through the nave lighting the first lamp. Locked. The six chores go into Notes. *"do what he says."* | `[built]` | 2 |
| 5.3 | Victor at the altar. The rite starts. He does not stop. Flag: the rite is a sound that runs under everything. | `[built]` | |
| 5.4 | **The window.** *Look down the hill*: the west windows show Ridge Road descending, thirty-one lights. Nothing tells the player to look. A light goes out every 75 s from the bottom. Secondary tells: Victor's breath fogs indoors, the lamps gutter, the stopped clock in the sacristy ticks once. The candle in the cemetery jar (3.39) is visible from the side window if he lit it. | `[built]` | (throughout) |

#### Chore 1, the bell (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.5 | The tower door. Sixty-eight steps. Landing one is rotten: find the plank (carryable) and lay it. Landing two: the ladder (carryable) for the missing flight. Landing three: the bats; crouch and wait. | `[built]` | 2.5 |
| 5.6 | **New:** the fourth landing, tape t12, wedged in the wheel housing. | `[tweak]` | 0.3 |
| 5.7 | The rope is frozen to the wheel. Hold to work it free; it gives in three stages. | `[built]` | 0.5 |
| 5.8 | Nine strikes, four seconds apart. **Tweak:** the player pulls each one (`E`); too fast or too slow (outside 3–5 s) and Jared says *"no. again."* and the count starts over. Strike six: the rope pulls back, hard, from above (`ch5.rope`, Contact 2). Strike eight: something in the dark above says his name in her voice (`ch5.name`). Choice: *Answer* / *Say nothing* (the hint reads *Hohman, p.63* if he bought the book). Answering sets `answeredInTheTower`: Ending B's Victor has one extra line and the rite is harder (two lamps blow out and have to be relit). Not answering: the ninth strike is clean. | `[built / tweak]` | 2.5 |

#### Chore 2, seven lamps (7 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.9 | The boiler room stair. The water is ankle deep; the breaker is off. Throw it (hold). The coal chute rattles: something is trying the fourth door from outside. | `[built]` | 1 |
| 5.10 | The oil drum. Fill the can (hold; it is heavy, the carry spring). | `[built]` | 0.5 |
| 5.11 | Seven lamps along the nave, each: set the can down, fill (hold), light. **Tweak:** lighting uses his lighter if he bought it in 1.15, otherwise Victor's matchbox on the altar rail, twenty matches, and every one is counted; lamps that blow out cost another. A player who runs out has to take a lit lamp to light the next (carry a lit lamp, which is its own tension). | `[built / tweak]` | 3.5 |
| 5.12 | Lamp four: he has to turn his back on the nave. When he turns round, twelve pews on the left face the wrong way (`ch5.pews`). Victor does not react. | `[built]` | 1 |
| 5.13 | The can goes back by the altar; Victor needs it at the end. | `[built]` | 0.3 |

#### Chore 3, four seals (6 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.14 | Salt from the sacristy, iron nails from the boiler room shelf (both carryables, both holds). | `[built]` | 1 |
| 5.15 | Each door: pour salt along the sill (hold, and he has to walk the width of the door while holding), then three nails, three holds, the hammer from the tower. West doors, sacristy door, sanctuary side door. | `[built / tweak]` | 2.5 |
| 5.16 | The coal chute: outside. Out the breezeway and round the north wall, thirty seconds in the snow, the wind, no lamps. Salt, nails. On the way back, the confessional door is open. It was closed. (`ch5.confessional`). | `[built]` | 2 |
| 5.17 | **New:** in the confessional, under the kneeler, tape t11. | `[tweak]` | 0.3 |

#### Chore 4, the register (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.18 | The key is on Victor's belt. He is chanting, eyes shut, hands shaking. Take it: a hold that is slow and close and the camera is on his hands. Thirty seconds. | `[built]` | 1 |
| 5.19 | The sacristy cabinet. The baptismal register: find the page (flip with the mouse, 1994). *Recca Marta Vasko, baptised 4 May 1994.* | `[built]` | 1 |
| 5.20 | The death register, second hand: ***d. 22 September 2014, no funeral, no interment, cause: entered.*** Flag `sawTheRegister`. Input does nothing for forty seconds. His breathing. | `[built]` | 1.5 |
| 5.21 | The cracked shaving mirror on the sacristy wall: the one time he is seen. | `[built]` | 0.3 |
| 5.22 | The sacristy press: tape t10. Victor's index cards. *The Long Lost Friend* on the desk if he did not buy it. | `[built]` | 0.5 |
| 5.23 | Put the key back on Victor's belt (hold). He can keep it. If he keeps it, Victor's belt is the only thing Victor notices all night; one line, later, at the kitchen table. | `[new]` | 0.5 |

#### Chore 5, the font (5 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.24 | The courtyard pump. Prime it: six pumps (`E` ×6, each a full arm), then it runs. Fill the bucket. | `[built / tweak]` | 1.5 |
| 5.25 | Carry it back without setting it down (the carry spring; dropping it spills and he goes back). Something walks parallel to him on the far side of the pews, glimpsed between the columns, keeping pace. A second footstep set, nine metres left. | `[built]` | 2 |
| 5.26 | A hand (`ch5.hand`, Contact 3), suppressed if the Benedict medal is in his coat. | `[built]` | 0.5 |
| 5.27 | Pour into the font. | `[built]` | 0.3 |
| 5.28 | `ch5.dryerdoor` (false alarm): the rectory washer door swinging. | `[built]` | |

#### Chore 6, the name (3 min)

| # | Action | Tag | Min |
|---|---|---|---|
| 5.29 | The pen and the ink on the altar rail. Write: the player **types** it, *Recca Marta Vasko*, the letters appear in his hand on the card. A wrong name can be written (the game does not stop him); it burns and nothing happens and he has to write it again. | `[tweak]` | 1.5 |
| 5.30 | Hold it in the font water (hold). Carry it to the altar. Do not burn it yet; Victor says *not yet*. | `[built]` | 1 |

#### The arrival

| # | Action | Tag | Min |
|---|---|---|---|
| 5.31 | The last light goes out. The seven lamps go out, west to east, over four seconds, the dark coming up the aisle. The west doors do not open. She is inside, twenty metres away, soaked, the barn coat, silt in her hair. | `[built]` | 1 |
| 5.32 | She walks up the aisle. Slowly. She is crying. Victor does not turn round. | `[built]` | 1 |

---

## 7. CHAPTER SIX, endings (3:00 AM), ~12 min plus credits

| # | Action | Tag | Min |
|---|---|---|---|
| 6.1 | The breakup. Her four arguments, each a good one, each about four lines, and between each one the player can move (not a cutscene): step back, step forward, look at Victor, look at the card in his hand. She stops where she is when he steps back. She never closes the distance herself past arm's length. | `[built / tweak]` | 4 |
| 6.2 | If he told her the truth in 1.52, one more line, hers, about the name. | `[built]` | |
| 6.3 | Choice, no timer, nothing greys out: *[Take her hand.]* / *[Say her name and burn it.]* and, if all twelve tapes + the register + the truth, *[Say her name, her actual name, out loud, first.]* | `[built]` | 0.5 |
| 6.4 | **Ending A, "Forever."** Her hand is warm. The apartment, morning, the dryers; eleven seconds; the room is the wrong way round; the light is wrong; the dryers are the pumps. The camera does not cut. | `[built]` | 3 |
| 6.5 | **Ending B, "The Ninth Hour."** The loudest ninety seconds. The PA, the pews, the confessional, the bell on its own nine times, Victor shouting the last of the rite. Then the quiet, and the wet coat in the aisle with nothing in it. | `[built]` | 2.5 |
| 6.6 | **Ending C, "Gerald."** Six seconds of her. *"Is my mom okay?"* Choice: *"She's okay."* / *Nothing. There isn't time.* / *"I love you."* Then B. | `[built]` | 3 |
| 6.7 | The rectory kitchen at dawn. One unbroken scene. **Tweak:** the player makes the coffee: the kettle, the jar, two mugs; Victor talks while he does it and does not stop. The nine men, Aldous Hale, the payment, the Hale, *she held out three days*. If he kept the key (5.23): *"Give me that back."* | `[built / tweak]` | 4 |
| 6.8 | The final shot: the drive out at 8 AM on the rail, the Fuel & Go passing, snow on the ground everywhere, including over Kesslerton No. 9. The deer by the road, or not. | `[built]` | 2 |
| 6.9 | Credits; the host reads the last line of the letter, different per ending. Post-credits for C: her room, daylight, Gerald on the sill facing out. | `[built]` | 2 |

---

## 8. Tape placement (the twelve, plus one)

| Tape | Label | Where | Chapter |
|---|---|---|---|
| (forecourt) | *(blank?)* | Fuel & Go forecourt, by the ice chest | 1 (plays after t12) |
| t01 | OCT, ma's hands | pawn shop glass case, $2 | 3 |
| t02 | NOV, the diner wall | library return bin | 3 |
| t03 | JAN, hohman | Vasko basement, on the fuse box | 3 |
| t04 | MAR, the barn | nailed inside the Colliery Rd barn | 3 |
| t05 | APR. 1963 | library microfilm room, under the desk | 3 |
| t06 | MAY, what they got | mine fence, coffee can | 3 |
| t07 | JUN, the ones who go | Victor's mattress, rectory, by day | 3 |
| t08 | JUL, ma, again | diner, behind the corkboard | 3 |
| t09 | AUG, the hale | graffiti stretch, culvert wall | 3 |
| t10 | SEP 18, three nights | church, sacristy vestment press | 5 |
| t11 | SEP 20, for wik | the confessional, under the kneeler | 5 |
| t12 | (unlabelled) | the bell tower, fourth landing | 5 |

Note: the current `scatterTapes` puts t10/t11/t12 on the Chapter Three map
(Fuel & Go, cemetery, mine). This plan moves them into the church to match
`tapes.js`'s own `where:` fields, and gives the cemetery and the second mine
spot something else (3.39, 3.56). Ending C therefore requires the tower, the
sacristy and the confessional to have been searched during Chapter Five, which
is correct: Elena's last three tapes are where she went.

---

## 9. Every choice and what it changes

| Choice | Where | Flag | Comes back |
|---|---|---|---|
| Answer Dad while driving | 1.3 | `dadAnswered` | tone of Dad's texts in Ch3 |
| Brake for the deer | 1.4 | `hitTheDeer` | dim headlight in Ch4 |
| Buy lighter / salt / gum | 1.15 | `boughtLighter` | Ch5 lamps: lighter vs 20 matches |
| Plaque or thank you | 1.16 | | Marta's first line at dinner |
| Show the pawnbroker the ring | 1.44 | | the sixty-dollar offer in Ch3 |
| Jukebox pick | 1.42 | `jukeSong` | Oct 12 and Ch3 diner |
| Whiteboard first line | 1.35 | | what she writes under it |
| What Hale means | 1.52 | `toldHerTheTruthAboutName` | Ending C eligibility + her extra line |
| Why he came down | 1.54 | `detergentInHand` | her laundromat argument in Ch6 |
| Come in / ask / goodnight | 1.58 | `invitedHerIn` | the whole game |
| Text back now / later | 1.61 | | her reply |
| Kiss / wait | 2.6 | | nothing but the scene |
| Ring off at dinner | 2.9 | `ringRemovedAtDinner` | Marta's look |
| Bow / look at her at grace | 2.13 | | nothing but the scene |
| Plaque / dad / cabbage | 2.15 | | Marta lines |
| Reply to "family thing" | 2.19 | | her reply |
| Answer Dad Sep 22 | 2.22 | `toldDadAboutHer` | Dad's call in Ch3 night two |
| Stay at the window to 3:04 | 2.27 | `sawEquinoxCar` | recognising the sedan Oct 2 |
| Bedside: bed / where / light | 2.34 | | her lines |
| Photograph the corkboard Oct 12 | 2.36 | | her silence |
| Delete / keep the photo | 2.38 | `deletedThePhoto` | 3.27; Ch6 her line |
| Ring off for her, night one | 3.8 | `ringOffForHer` | the drawer |
| Answer Dad night two | 3.11 | `answeredDadNight2` | Ch6 kitchen: Victor mentions the Historical Society letter |
| Agree to stop calling | 3.12 | `agreedToStopCallingDad` | final shot: he calls him or doesn't |
| Say the name / no / why | 3.14 | `saidHisFullNameAloud` | Ch6 her line; Ending C line |
| Keep the ticket | 3.16 | `foundTheTicket` | he can read the number at the payphone |
| Truth from the cemetery | 3.38 | | she says "come home" |
| Sell the ring | 3.29 | `soldTheRing` | Ch6 her line |
| Light the Kowal candle | 3.39 | | visible from the church |
| Take the Benedict medal | 3.42 | `hasBenedictMedal` | suppresses Contact 3 |
| Lie about where he is | 3.6 | `liedToHerAboutWhere` | Ch6: "you lied to me nine times" (count) |
| Feed Buttons ×9 | 3.7 | `buttonsFed` | he comes to the church |
| Left / right at the fork | 4.9 | | Ending KR or the church |
| Answer in the tower | 5.8 | `answeredInTheTower` | two lamps blow out; Victor's line |
| Keep Victor's key | 5.23 | | kitchen line |
| Hand / burn / name first | 6.3 | `endingA/B/C` | the ending |
| "She's okay" / nothing / "I love you" | 6.6 | | the letter's last line |

---

## 10. Time budget

| Section | Minutes |
|---|---|
| Prologue | 2 |
| Ch1, the drive in | 12 |
| Ch1, Fuel & Go | 7 |
| Ch1, the dark four miles | 3 |
| Ch1, the street and the box | 5 |
| Ch1, the room | 7 |
| Ch1, down the hill | 6 |
| Ch1, the Wash-Rite | 11 |
| Ch1, the threshold | 3 |
| Ch1, the night | 6 |
| **Chapter One** | **60** |
| Ch2, Sep 6 | 7 |
| Ch2, Sep 19 | 8 |
| Ch2, Sep 22 | 7 |
| Ch2, Oct 2 | 6 |
| Ch2, Oct 12 | 5 |
| **Chapter Two** | **33** |
| Ch3, hub + nights + travel | 18 |
| Ch3, ten locations | 44 |
| **Chapter Three** | **62** |
| **Chapter Four** | **16** |
| Ch5, opening + rules | 3 |
| Ch5, six chores | 32 |
| Ch5, window, arrival, slack | 7 |
| **Chapter Five** | **42** |
| **Chapter Six + credits** | **14** |
| **Total** | **~229 min on a thorough first run; ~190 min skipping the optional row, the basement, the day visit and half the tapes.** |

Either way it clears three hours, and there is no stretch longer than about
ninety seconds where the player is only reading.

---

## 11. What this plan changes in the built systems (for when it is coded)

Listed so the scope is honest. None of this is done.

- **Scares:** no new manifest entries are required. Every scare in this plan
  already exists in `MANIFEST` (22 / 4 / 3 stays as is). The plan moves when
  some of them are reachable (dogbite needs Buttons following; the medal
  suppression is now reachable via 3.42).
- **Ch1:** WKRB on the dial (1.2); deer consequence (1.4); the closed-road
  sign (1.5); rack purchase (1.15); forecourt tape (1.17); the 1997 letter
  (1.26); whiteboard first line (1.35); radiator key (1.37); jukebox memory
  (1.42); pawnbroker offer (1.44); Buttons pettable and rope-limited (1.47);
  the TV's two frames (1.55, the flag exists, the picture does not); her *9*
  on the whiteboard (1.59).
- **Ch2:** a walked walk with pace-keeping and two new fragments (2.2–2.5);
  the walk back (2.8); dinner tasks, grace, her room, porch light (2.10–2.18);
  four evening activities on Sep 22 (2.21–2.25); the sedan and the carried
  boxes on Oct 2 (2.28–2.32); the corkboard and the rain on Oct 12 (2.36,
  2.39). The vignette runner should replace `ctx._advance`.
- **Ch3:** the day/night structure; three distinct night beats; the drive
  between destinations on the rail; her daytime texts; nine scraps for
  Buttons; the microfilm machine; Dale and the flyer; the jukebox; Hohman +
  ring sale; the medal handover; the scrape with ladder and scraper; the
  rosette at No. 9; the basement; the tape relocation (t10–t12 into the
  church); the end condition (`nights >= 3 && found >= 5`).
- **Ch4:** the 240 s fallback replaced by the kid; the dial pad; playable porch
  on the KR ending; the fishtail on the ridge.
- **Ch5:** `SECONDS_PER_LIGHT` 42 → 75; strike timing with restart; matches
  counted / lighter; the typed name; key return; confessional and tower tapes.
- **Ch6:** movable breakup; the coffee made by hand; the key line; the
  Historical Society line.
