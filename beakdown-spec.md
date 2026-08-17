# BEAKDOWN: complete specification

Everything needed to rebuild this game from nothing. Written 2026-07-26, after the tuning was declared finished.

**Source of truth is `public/index.html`**, a single self-contained file. No dependencies, no build step, no framework. Runs from a filesystem, a static host, or a phone. This document exists so the game can be reconstructed if that file is lost.

| | |
|---|---|
| Size | 87,653 bytes |
| sha256 | `a80ea1f4a30b0000d1af2130219c6bca111c6c81ee468947b89c7f084175318d` |
| Revision | 17 August 2026, pause protocol, wall clock splash hold |

The deployment conversation checks every deploy against that size and hash, so update both lines here whenever the file changes.

**Revised 2026-07-26 against the deployed source, not from memory.** The arena section previously said twelve layouts and then defined six, which would have sent a rebuild off the end of the array at wave 19. All twelve are now documented with their platform data regenerated from the code. The hold thrust constant, the combined enemy-count formula and the 88-platform constraint check are also new.

---

## 1. What it is

A single-screen arcade game. You fly a bird by flapping. Enemy birds fly around the same arena. **When two birds collide, the one whose lance is higher wins and the other is destroyed.** That is the entire rule and it is never written down anywhere in the game except one line on the splash screen.

Waves escalate, you have lives, you chase power-ups, and the run ends when the lives run out.

### Origin

Directly descended from **Joust** (Williams Electronics, 1982, designed by John Newcomer). Nathan played the BBC Micro version, or the 1988 Go-Dax clone **Skirmish**, both traceable to programmer Delos Harriman, some time around 1988.

**Joust is owned by Warner Bros**, who bought Midway's assets out of bankruptcy in 2009. The mechanic is not protectable and has been cloned since 1983 (Ostron, Winged Warlords, Glypha, and most famously Nintendo's Balloon Fight). **This game takes the mechanic only.** No knights, no ostriches, no buzzards, no lava, no pterodactyl, no lava troll, and the word Joust appears nowhere.

### Why it exists

Four previous game concepts died before anyone played them. This one was built crude in a single pass, played immediately, and worked. **The order was the difference, not the idea.** Do not design anything for this game before playing the change.

---

## 2. The world

Logical coordinate space, scaled to fit the viewport.

- `W = 800` always. Horizontal wrap distance is therefore constant across devices.
- `H = clamp(800 * viewportH / viewportW, 520, 1180)`. The arena grows taller on taller screens, capped so a portrait phone does not become a chimney.
- Rendering: `scale = canvasWidth / W`, with a vertical offset centring the field when H is capped.
- Device pixel ratio capped at 2.
- Floor at `y = H - 30`, solid, full width.
- Platforms are solid from above and below: you land on top, you bonk from underneath.
- **Horizontal wraparound.** Leaving one side re-enters the other. Applies to birds, eggs and pickups.
- Ceiling is solid.

---

## 3. Controls

**The splash lists every control scheme, always, in the static markup.** Device detection was tried and removed. `(pointer: coarse)` reports the *primary* pointer, so an iPad with a keyboard, a Surface or any touchscreen laptop is classed as touch and its owner is never told the keyboard works. The text was also injected by JavaScript, so a crawler saw an empty paragraph. Two short lines covering both cost nothing and are correct on every device including the hybrids.

Mouse control is deliberately undocumented. It is intuitive, it is secondary to the keyboard on desktop, and describing it accurately ("click either side of your bird") would need a third line to explain a control almost nobody reaches for.

**Touch.** Hold the left half of the screen to fly left, the right half to fly right. Holding auto-flaps at a steady rate. Tapping still works and is sharper. No buttons, no virtual stick.

**Keyboard, and the primary desktop control.** Left arrow or A, right arrow or D, space to fly straight up. Holding behaves identically to holding on screen.

**Mouse.** Direction is taken relative to **the bird**, not the screen midpoint, and it updates as you move the pointer while held. Screen halves are the correct rule for a thumb, which lands wherever it lands, and the wrong rule for a pointer, which is aimed. The branch is on `e.pointerType`.

**Flap physics.** Every flap is an impulse: `vy = max(vy - FLAP, -MAXUP)`. Never continuous lift, so the bird keeps its bob.

Two flap paths, deliberately different:

- **A deliberate tap** fires immediately, gated by `FLAPCD` (115ms, up to 8.7 per second), and also kicks you sideways by `PUSH`.
- **Holding** auto-flaps every `HOLD_CD` (200ms, 5 per second) and is **vertical only.** Horizontal movement while held comes from the gentler continuous thrust term instead.

That split matters. Hover rate is 3.38 flaps per second, so holding climbs steadily and reaches maximum climb in about 0.8 seconds, while a fast tapper gets there in 0.24. Holding is comfortable, tapping stays the skilled option. And because auto-flaps carry no sideways kick, holding drifts at roughly 283 px/s instead of pinning to the 380 top speed, so you can climb without being flung across the arena.

**Changed on player feedback**, after friends found constant tapping annoying. This is the only change ever made to the feel block, and the ten physics constants underneath were not touched.

---

## 4. The core rule

```
dy = lanceY(a) - lanceY(b)
if |dy| < HEIGHT_TIE   -> bounce both apart horizontally
else                   -> the higher one wins, the lower one dies
```

`lanceY(o) = o.y - LANCE * (o is the grown player ? BIG : 1)` where `LANCE = 25`.

Collision box: `|dx| < BODY * 1.7` and `|dy| < BODY * 1.9`, with dx computed across the wrap.

**Why lance tips rather than body centres.** For two normal birds the two are identical, because both are offset by the same LANCE. It only differs when the player is grown, and then it correctly gives the bigger bird a real height advantage. The rule stays honest: what you see is what is compared.

### The teaching beat

On any clash the game freezes and draws two dashed horizontal lines at the exact lance height of each bird, plus a vertical bar showing the gap. Yours is gold, theirs is red, the winner's line is highlighted.

- Player wins: 0.08s freeze.
- Player dies: 0.38s freeze, screen shake 13.

**This visual is the tutorial.** There is deliberately no death message. Words were tried and removed; the lines do it better.

---

## 5. Entities

### The player
Cream body `#f7e6c4`, gold accents `#ffc046`. Highest contrast object on screen at all times.

### Enemies

| | Colour | Accent | Points | Behaviour |
|---|---|---|---|---|
| Normal | `#2f6f66` teal | `#5fd6b4` | 500 | 60% of the time seeks the player, 40% wanders. Re-targets every 0.7 to 1.3s. |
| Fast | `#8e2038` red | `#ff5e5e` | 750 | Always seeks. Re-targets every 0.35s. Flaps harder and more often. Glows. |

Fast enemies appear from wave 3, at 32% of each spawn.

**AI flight controller.** Pick a target point, then: if below the target, flap and thrust toward it; otherwise if horizontally distant, flap weakly and thrust. Hunters aim 40 to 80 units *above* the player, which is what makes them dangerous rather than merely present. Horizontal pathing accounts for the wrap and takes the shorter route.

### Waves

Enemies per wave, combining the early ramp and the late one:

```js
n = min(2 + wave, min(FOE_MAX, FOE_BASE + floor(wave / FOE_STEP)))
```

The left clause governs the opening waves, the right clause the rest. Spawned at the left or right edge at a random height. A wave ends when no enemies remain and no hatchable eggs remain.

---

## 6. Eggs

Every downed enemy drops an egg. It falls, lands on a platform or the floor, and can be collected for **250 points**.

- **Waves 1 to 3:** eggs rot after `EGG_ROT` seconds, blinking for the last 2.5. They never hatch.
- **Wave 4 onward:** eggs hatch after `HATCH_T` seconds into a fresh enemy, 30% of which is a fast one. They glow and pulse gold for the last 2 seconds as a warning.

**Why the gate exists.** Hatching is the game's main escalation and it made early waves punishing. Wave 4 is where the game gets properly hard.

**Why rotting matters.** Wave completion originally required all eggs to be gone. Without rotting, a non-hatching egg the player ignored would stall the wave forever. Only hatchable eggs hold a wave open.

---

## 7. Power-ups

### Star, `#ffd83d`
Dropped by a downed enemy at `STAR_CHANCE`. Spinning five-point star, glowing.

Grants `STAR_TIME` seconds of invincibility. While active:
- Any contact kills the enemy regardless of height, worth **1000 points**.
- The bird cycles through a six-colour rainbow with a heavy glow and a longer trail.
- A progress bar sits low on screen, strobing over the last 1.4 seconds.

**This is the most important mechanic in the game after the core rule.** It creates a predator-prey inversion: you spend most of the game fleeing, then briefly you are the threat. That is Pac-Man's power pellet and it is what makes the game work. The two numbers governing it, `STAR_CHANCE` and `STAR_TIME`, are the most consequential in the file.

### Heart, `#ff5f8d`
Dropped at `HEART_CHANCE`. Pulsing heart. Grants one extra life, no cap. Flashes "+1 LIFE".

### Mushroom, `#ff4d3d` cap, `#fff2dc` spots, `#ffe9c8` stalk
**Not dropped by enemies.** It appears in the world, one at a time, at a random point along a random platform, falling in from above.

Grants one free hit. While held:
- The player is `BIG` times larger, with a cream ring around them.
- The lance is proportionally higher, so clashes are genuinely easier to win.
- A losing clash strips it instead of killing, with knockback, a shake, and `IFRAMES` seconds of blinking grace.

**It expires.** `PICKUP_LIFE` seconds on the field, blinking for the last 3, then gone, then a new one appears elsewhere `SHROOM_GAP` seconds later. Present roughly 76% of the time. **The expiry is the point:** it must be chased, which forces the player to cross the arena and take risks. A permanent mushroom was tried and made the game passive.

Cleared and respawned when the arena changes, since the old one would be left floating where a platform used to be.

### Drop logic
One roll per kill. `roll < STAR_CHANCE` gives a star, else `roll < STAR_CHANCE + HEART_CHANCE` gives a heart, else nothing. Stars and hearts expire after `PICKUP_LIFE`.

---

## 8. Lives and scoring

- Start with 3.
- **+1 guaranteed at every arena change**, meaning waves 6, 11, 16 and so on. Announced with the arena name.
- Plus hearts.
- HUD shows diamonds up to 5, then "◆ ×N".
- Death costs a life, 1.7s respawn, and clears both star and mushroom state.

| Event | Points |
|---|---|
| Normal bird | 500 |
| Fast bird | 750 |
| Any bird while invincible | 1000 |
| Egg | 250 |

---

## 9. Arenas

**Twelve layouts, each also played mirrored, giving 24 distinct grounds.** At `ARENA_EVERY` = 3 waves, nothing repeats until wave 72. Each layout changes both geometry and sky so it reads as a new place rather than rearranged furniture.

Arena counter is `floor((wave - 1) / ARENA_EVERY)`. The layout is `counter % 12`, and it is mirrored when `floor(counter / 12)` is odd. Mirroring flips x to `1 - x - width`, which costs two lines and doubles the pool. A reversed staircase or a reversed ladder plays genuinely differently, and the flash says REVERSED so it reads as intent rather than a repeat.

**Both orientations must fit.** Every platform needs `x + width <= 1.0` *and* `1 - x - width >= 0`, or it hangs off the edge when flipped.

Platforms are `[x, y, width]` as fractions of W and H. Height is always 13 world units.

| # | Arena | Character | Sky (top to horizon) | Rock / top / lip | Star alpha | Plats |
|---|---|---|---|---|---|---|
| 1 | **TERRACES** | Balanced staggered platforms. The default. | `#150e1c` `#2b1531` `#5e2439` `#c4603a` | `#2a1d33` / `#5a4066` / `#c98a6a` | 1.0 | 7 |
| 2 | **TOWERS** | Two tall stacks at the edges, open middle. Vertical chases. | `#0a1024` `#1a2247` `#33356e` `#6a5aa8` | `#1a2040` / `#40488a` / `#8f9fe0` | 1.0 | 7 |
| 3 | **THE SPINE** | One long central bar plus outriggers. Fights concentrate. | `#180d0a` `#331812` `#63291a` `#c9793a` | `#2e1c14` / `#63382a` / `#d98a52` | 0.5 | 6 |
| 4 | **THE STEPS** | Diagonal staircase corner to corner. | `#0c1410` `#14291f` `#2c4a2a` `#9aa83f` | `#1a2a1e` / `#3c5838` / `#a8c060` | 0.6 | 7 |
| 5 | **THE CAVERN** | Everything hugs the walls, empty centre. Wraparound matters. | `#0d0818` `#21103a` `#451a5c` `#9c3f8e` | `#241539` / `#4e2c68` / `#b070c0` | 1.0 | 7 |
| 6 | **THE ISLES** | Ten small perches, no long platforms. Chaotic. | `#101a2c` `#2a3350` `#6b5c72` `#e0a77a` | `#262636` / `#4e4e60` / `#9898b0` | 0.35 | 10 |
| 7 | **THE LADDER** | Six rungs alternating left and right, climbing from floor to ceiling. A zigzag ascent. | `#0d1420` `#1a2838` `#2e4a60` `#6b9ac4` | `#1c2634` / `#3e5470` / `#7fa8d0` | 0.8 | 6 |
| 8 | **THE PIT** | Mass at the bottom, three wide platforms almost at floor level, thinning upward to two high edge ledges. A basin. | `#140608` `#2e0c12` `#56171c` `#a8462e` | `#2e1418` / `#5e2a2e` / `#cf6a4a` | 0.4 | 8 |
| 9 | **THE CROWN** | Four platforms across the very top, tapering down to a single centre one. Top-heavy, the inverse of THE PIT. | `#1a1408` `#33280e` `#5c4718` `#d4a03a` | `#2e2614` / `#5c4a26` / `#d4aa54` | 0.5 | 7 |
| 10 | **THE COMB** | Seven identical narrow teeth in an even row at mid height, with one platform above and one below. Regular and readable. | `#0d1614` `#182a26` `#2c4a42` `#6fa88a` | `#1a2622` / `#38544a` / `#7fbfa0` | 0.6 | 9 |
| 11 | **THE HOURGLASS** | Wide pairs top and bottom, pinched to a narrow centre. | `#16091c` `#2e1038` `#56205c` `#b0509c` | `#2a1430` / `#543060` / `#c070b8` | 1.0 | 7 |
| 12 | **THE ROOST** | One very long central bar with small perches at the four corners and directly above and below the centre. | `#14100a` `#2a2214` `#4e3e22` `#c49a52` | `#2a2418` / `#544430` / `#c8a468` | 0.45 | 7 |

Characters for arenas 7 to 12 are described from their geometry rather than from play, since they were absent from the previous revision of this document.

### Platform data

```
TERRACES      [.06,.3,.22] [.72,.3,.22] [.36,.46,.28] [0,.62,.2]
              [.8,.62,.2] [.24,.76,.22] [.56,.76,.22]

TOWERS        [.04,.22,.18] [.78,.22,.18] [.04,.38,.18] [.78,.38,.18]
              [.04,.54,.18] [.78,.54,.18] [.4,.7,.2]

THE SPINE     [.22,.44,.56] [0,.26,.16] [.84,.26,.16] [0,.68,.18]
              [.82,.68,.18] [.42,.78,.16]

THE STEPS     [.02,.72,.2] [.2,.62,.18] [.38,.52,.18] [.56,.42,.18]
              [.74,.32,.18] [.06,.34,.14] [.62,.78,.2]

THE CAVERN    [0,.3,.24] [.76,.3,.24] [0,.5,.16] [.84,.5,.16]
              [0,.7,.24] [.76,.7,.24] [.38,.2,.24]

THE ISLES     [.08,.26,.13] [.44,.2,.13] [.78,.3,.13] [.24,.42,.13]
              [.6,.46,.13] [.04,.58,.13] [.4,.62,.13] [.76,.58,.13]
              [.2,.78,.13] [.58,.78,.13]

THE LADDER    [.05,.76,.2] [.72,.66,.2] [.1,.56,.2] [.68,.46,.2]
              [.14,.36,.2] [.64,.26,.2]

THE PIT       [0,.8,.26] [.36,.82,.28] [.74,.8,.26] [.14,.66,.2]
              [.62,.66,.2] [.38,.54,.24] [0,.4,.14] [.86,.4,.14]

THE CROWN     [.04,.2,.18] [.3,.16,.18] [.56,.16,.18] [.8,.2,.18]
              [.18,.32,.16] [.66,.32,.16] [.42,.44,.16]

THE COMB      [.02,.52,.1] [.16,.52,.1] [.3,.52,.1] [.44,.52,.1]
              [.58,.52,.1] [.72,.52,.1] [.86,.52,.1] [.24,.28,.2]
              [.58,.74,.2]

THE HOURGLASS [.02,.24,.28] [.7,.24,.28] [.38,.46,.24] [.02,.72,.28]
              [.7,.72,.28] [.2,.58,.12] [.68,.58,.12]

THE ROOST     [.28,.5,.44] [.04,.28,.12] [.84,.28,.12] [.04,.72,.12]
              [.84,.72,.12] [.44,.24,.12] [.44,.76,.12]
```

Constraint: `x + width <= 1.0` and `y <= 0.86` for every platform, or it collides with the floor band.

**All 88 platforms across all twelve arenas were checked against both rules and all 88 pass.** Eight sit at exactly `x + width = 1.0`, which is legal but has zero margin, so any future width increase on these specific platforms breaks the mirrored orientation:

```
TERRACES   [.8,.62,.2]
THE SPINE  [.84,.26,.16]
THE SPINE  [.82,.68,.18]
THE CAVERN [.76,.3,.24]
THE CAVERN [.84,.5,.16]
THE CAVERN [.76,.7,.24]
THE PIT    [.74,.8,.26]
THE PIT    [.86,.4,.14]
```

**When the arena changes**, any platform landing on top of the player lifts them clear rather than burying them.

---

## 10. Constants

### Feel. Do not change casually.

```js
G=1150      // gravity, px/s²
FLAP=340    // upward impulse per flap
MAXUP=430   // ceiling on upward velocity
MAXFALL=820 // terminal fall speed
PUSH=230    // horizontal impulse per directional flap
HDRAG=2.6   // horizontal drag coefficient
MAXH=380    // max horizontal speed
FLAPCD=115  // ms between flaps
HEIGHT_TIE=6 // half-width of the bounce band, world units
BODY=17     // collision radius
```

Plus one that lives inline rather than in this block, and should not:

```js
PUSH * 3.2  // = 736 px/s², continuous horizontal thrust while a direction is held
```

That multiplier is the eleventh feel constant in everything but name. It sets the drift speed of the hold control, which is the control most players will use most of the time. It is currently a bare `3.2` in the update loop, undiscoverable by anyone reading the constants block, and it is the single most likely thing in this file to be changed by accident. **Give it a name.**

These were set once, played, and never touched again across ten subsequent versions. Every change after the first playable was verified against them with a diff. **They are the game.** Derived properties: 3.38 flaps per second holds altitude, the cooldown permits 8.7, so there is comfortable climb authority. Roughly 35% of overlaps land in the bounce band.

### Pacing. All tuned by play.

```js
ARENA_EVERY=3     LIFE_EVERY=5      HATCH_WAVE=4     HATCH_T=7    EGG_ROT=9
STAR_CHANCE=0.10  HEART_CHANCE=0.065  STAR_TIME=7
SHROOM_GAP=4      PICKUP_LIFE=13    BIG=1.32         IFRAMES=1.3  HOLD_CD=200

FOE_BASE=7   FOE_MAX=10   FOE_STEP=10        // enemies per wave, and the late ramp
FAST_BASE=0.32  FAST_RAMP=0.012  FAST_MAX=0.70   // share of fast enemies
HATCH_FLOOR=4   HATCH_STEP=9                 // eggs hatch faster as waves climb
```

### The late-game ramp, and why it exists

A player reached wave 29 and reported it felt repetitive. Two causes, and the arenas were only half of it.

**Enemy count capped at 7, which is reached at wave 5.** The fast-enemy share was fixed at 32% from wave 3. So from wave five onward *nothing about the difficulty ever changed again*, and after wave 18 the scenery stopped changing too. The game was structurally static for the entire back half of any decent run.

Three things now escalate without ever stopping:

| | Early | Wave 20 | Wave 40+ |
|---|---|---|---|
| Enemies per wave | 7 | 8 | 10 (capped) |
| Fast enemy share | 32% | 56% | 70% (capped) |
| Egg hatch time | 7s | 5s | 4s (floor) |

The caps matter. Without `FOE_MAX` the screen turns to soup, and without `HATCH_FLOOR` eggs hatch faster than a player can reach them. Each egg stores its own hatch timer at the moment it drops, so an egg laid in an easy wave stays easy.

**`ARENA_EVERY` and `LIFE_EVERY` are deliberately different numbers.** The guaranteed extra life used to ride on the arena change. When arenas moved from every five waves to every three, leaving them coupled would have handed out 66 per cent more free lives and silently undone a difficulty setting that took four rounds of play to get right. They are now independent: new ground every three waves, a free life every five.

### The tuning history, so it is not re-litigated

| Setting | Journey | Why it landed there |
|---|---|---|
| `STAR_TIME` | 5 → 10 → 7 → 3.5 → **7** | 10 too long, 3.5 too brief to enjoy. |
| `STAR_CHANCE` | 0.12 → 0.25 → **0.10** | 0.25 fired nearly every wave and stopped feeling like an event. Roughly one star every two waves now. |
| `HEART_CHANCE` | 0.06 → 0.20 → 0.13 → **0.065** | Ended almost exactly where it began. The original rate was never the problem; the player was dying before ever seeing one. |
| Mushroom | 60% per wave → permanent → **perpetual but expiring** | Permanent made it passive. Expiring forces the chase. |
| `HATCH_WAVE` | always → **4** | Hatching in early waves was punishing. |
| `HEIGHT_TIE` | 14 → **6** | At 14, 82% of clashes bounced and the game felt mushy. Caught by simulation before it was ever played. |
| `ARENA_EVERY` | 10 → 5 → **3** | At 10 most runs never saw a second arena. Cut to 3 on player feedback about attention span. |
| Arena count | 6 → **12, plus mirrors** | Wave 29 felt repetitive. 6 arenas repeated from wave 19. |
| Late-game ramp | none → **added** | Enemy count and mix had been frozen since wave 5. |
| Flapping | tap → **hold** | Friends found constant tapping annoying. Tapping still works and still climbs faster. |

**Expected economics at these settings, over ten waves and about 60 kills:** roughly 6 stars totalling 42 seconds invincible, 3.9 hearts plus 1 guaranteed life, and about 35 mushroom cycles.

---

## 11. Presentation

- **Palette:** dusk gradient per arena, bright birds. Contrast is functional rather than decorative: relative height and enemy type must read instantly during a scramble.
- **Platforms** are drawn in four passes: a soft drop shadow offset down and right, the body in `rock`, a lit top band in `top`, and a 1.7px bright `lip` right at the landing surface. Players reported losing platforms against the sky, so `rock` and `top` were lightened across all six arenas and the `lip` was added. The lip matters most because the top edge is the part you actually land on.
- **Trails:** up to 9 fading dots behind each bird, 14 and rainbow-coloured while invincible. Materially helps read fast diagonal movement on a small screen.
- **Stars:** 46 twinkling background dots, alpha scaled per arena so bright skies do not become noisy.
- **Hit feedback:** brief freeze plus screen shake on every clash, scaled to whether it was a kill or a death.
- **Bird sprite:** a proper bird silhouette drawn entirely with canvas primitives. Ellipse body with a separate overlapping head circle, an orange beak, three tail feathers, a crest which is the lance, black wraparound sunglasses with a white glint, and **two wings**: a far wing behind the body in a darkened tint of the body colour, and a near wing in front in the accent colour. Both sweep together on the flap, which gives depth and reads far better in motion than the two straight strokes it replaced.
  **The crest tip must stay at `y = -LANCE`.** That is the point the height rule compares and the point the clash lines are drawn at. Move the crest and the game silently starts lying about who was higher.
- **Splash:** BEAKDOWN, gold gradient, wide tracking, with the tagline "Settle the pecking order." beneath in italic gold. Two lines follow: how to flap, and "Land on your enemies."
- **Death screen:** score as the headline, wave and best beneath, then seven counts with colour swatches matching the in-game objects. No message, because the score is the message.

**Run stats tracked:** teal birds, red birds, eggs, mushrooms, stars, extra lives earned, lives spent.

- **Credit line:** "by Nathan Haslewood", linking to nathanhaslewood.com.au in a new tab. It exists in **two forms**, which took three attempts to get right.
  During play it is **painted into the canvas**, inside the dark floor band at `floorY + 21`, 12px at 18% cream. It reads as a faint mark on the ground rather than a piece of interface, it never needs a text shadow because the rock behind it is flat and dark, and it cannot be tapped.
  On the splash and game-over screens the canvas version disappears and an HTML link takes its place, 11px at 55%, underlined and clickable.
  **What failed:** hiding it during play meant nobody saw it. Floating an HTML element at the bottom of the screen put it exactly on the horizon, straddling the bright sunset band and the dark ground, which is the worst contrast position available, and an underline on a non-clickable element read as a broken link. The lesson is that anything overlaid during play has to sit on a flat, dark, predictable surface, and the floor band is the only one there is.

---

## 12. Architecture

Single HTML file. Canvas 2D. One `requestAnimationFrame` loop with `dt` clamped to 33ms.

**Adaptive glow.** `shadowBlur` is the most expensive operation this renderer performs, and at wave 30 roughly ten objects request it every frame. The loop samples real frame time in 30-frame windows; after three consecutive windows averaging below 36fps it sets `fx=false` and every glow becomes a no-op for the rest of the run. It never re-enables, because oscillating between quality levels reads worse than staying on the lower one. The target device is a five-year-old Celeron Chromebook with integrated graphics.

**The sky gradient is cached** per arena and viewport rather than rebuilt on every frame.

**One polyfill, and it is load-bearing.** `ctx.roundRect` is Chrome 99+, Safari 16+ and Firefox 112+, and the game calls it eight times including in the platform draw that runs every frame. On an older browser the absence is not a degraded visual, it is an exception on the first draw and a black screen. The polyfill sits above everything else in the script and rebuilds the path from `arcTo`, clamping the radius to half the shorter side. This matters more than the browser share suggests, because managed school Chromebooks run old Chrome and are a named part of the search audience.

```
frame -> if hitstop, tick the freeze; else update(dt)
      -> draw()
```

Order inside `update`: timers, mushroom spawn, player, enemy AI and physics, eggs, pickups, collisions, filtering, wave check, HUD.

Pointer events unified for mouse and touch. `touch-action: none` and `overscroll-behavior: none` prevent the page scrolling under the game.

**Persistence: best score only, in `localStorage` under the key `beakdown_best`.** Loaded at boot, saved on every game over, shown on the splash when it is above zero, and shown on the death screen as either "new best" or the previous best.

Every call is wrapped in try/catch. A blocked, full or unavailable store degrades to a game that plays perfectly and simply has no memory, rather than throwing. This matters for locked-down school networks and private browsing, where storage is frequently unavailable or wiped on close.

**What is not persisted:** lifetime totals, best wave, or anything cross-device. There are no accounts by design, so a player who switches phone or clears their browser starts from zero.

---

## 13. Deliberately absent

A daily mode. A share card. Two-player. Online anything. Accounts. Cross-device saves. Lifetime statistics. A settings screen. Difficulty selection. An anti-camping mechanic (a timed hunter).

Sound, music and a pause were all on this list and have since been built. See sections 14 and 15.

**Camping is currently viable** on a high platform. Aggressive AI mitigates it but does not solve it. If it becomes a problem, a timed hunter is the proven answer.

---

---

## 14. Audio

Two layers, independently toggled, both defaulting to **on** when the game is loaded
directly and **off inside an iframe**. The embedded copies sit on content pages aimed
partly at school hardware, and unexpected noise in a classroom closes the tab. An
explicit choice by the player overrides both and persists in `localStorage`.

### Sound effects, synthesised

Ten effects generated at runtime with Web Audio. No files. Every one is layered rather
than a single oscillator: a transient, a body and a tail, through a filter with its own
envelope, into a shared plate reverb built from a generated impulse response, then a
soft-clip waveshaper on the master. That layering is the whole difference between a
chiptune bleep and something that sounds produced.

`flap` is the hardest of them, because it fires up to five times a second while a
direction is held. It is two bands of moving air with a soft swell, pitch-jittered and
panned randomly on every repeat, with **no pitched layer at all**. An earlier version
had a sine thump underneath and read as a drum tap rather than a wingbeat.

`shroom` is three rising beats, root then fifth then octave, over a filter opening on a
detuned sawtooth pair.

### Music, recorded

Five AAC tracks totalling 14:28 and about 12.7 MB, served from `public/music/`.

- **Same origin only.** These are our files on our domain, so nothing about the
  external-request rule changes.
- **Fetched on demand**, never on page load, and **the prefetch is gated on `musOn`**.
  The four content pages frame the game with music defaulting to off, so they pull
  nothing at all. An earlier build was not gated and each of those pages would have
  pulled 2.4 MB nobody was going to hear.
- Crossfaded between tracks, wrapping round the playlist. Never more than one track in
  flight, never more than two distinct.
- A failed track advances to the next rather than retrying the same file, so one 404
  cannot mean silence for the session.
- `public/_headers` serves them `public, max-age=31536000, immutable`. Pages stay on
  `max-age=0, must-revalidate` so a deploy is visible immediately.
- `TUNE_GAIN` is the single constant controlling the balance against the effects.

### The bus split

`musBus` used to be driven directly by the procedural arpeggio, which set its gain to
0.32 on start, 0.42 in star mode and 0.0001 on stop. Anything routed through it came
out multiplied by whatever the arp last set.

The recorded tracks now own `musBus`. The arpeggio moved to its own `arpBus` and **runs
only while the star is up**, playing over the track. The base procedural bed is gone.

---

## 15. The boot splash

A short lockup on cold load, held for 1.46 seconds, drawn inline so it needs no request.

**The countdown uses unclamped elapsed time, deliberately.** The frame delta is clamped
to 33ms so a stutter cannot teleport the bird, and an earlier version subtracted that
clamped value from the boot timer. At 60 or 30fps the hold was correct; at 10fps it
stretched to about 4.4 seconds of wall clock, which is precisely the hardware this game
targets. A wall-clock countdown uses wall-clock time. The clamp stays everywhere else.

A `<noscript>` rule hides the splash, because the field is opaque in the markup by
design and without script nothing removes it, which would cover the footer links that
must stay crawlable.

---

## 16. The arcade cabinet on content pages

All four content pages embed the game inside the SnapHit arcade cabinet, shared from
`public/arcade.css` and `public/arcade.js` rather than inlined four times.

- `src="/"`, because on this domain the game is the site root. The game's own frame
  detection hides its nav and credit and defaults audio to off, so it looks correct
  inside the bezel with no changes.
- **Tap to load.** Nothing loads until the attract screen is tapped. A live canvas on
  page load would hurt these pages on the low-end phones much of this traffic arrives on.
- Every custom property is `--arc-` prefixed. The pages define `--ink` on `:root`, the
  same name the studio palette uses, and an unprefixed copy repainted every paragraph.
- The keyboard relay lives in `arcade.js`. It used to be inline on each page and
  resolved `#game` once at load, which a tap-to-load cabinet breaks silently: with no
  iframe at load, arrow keys scrolled the page instead of flying the bird.

**Pause, not unload.** An `IntersectionObserver` in `arcade.js` posts `pause` when the
cabinet leaves the viewport and `resume` when it returns. `index.html` listens, compares
`e.origin` against its own, ignores anything else, and calls the existing `setPaused()`.
The game also stops drawing while paused: nothing moves without `update()`, and the
canvas keeps its last frame, so a paused machine costs almost nothing.

This replaced destroying the iframe by removing its `src`. That ended the run and put
the attract screen back, and on pages whose purpose is getting somebody to play, losing
a run because the reader scrolled down to read is worse than the work it saved. It cost
more once a run had music loaded and playing behind it, which would have gone with it.

Nothing waits on a reply. A frame that does not answer simply keeps running, which is
what lets this be a courtesy between two same-origin pages rather than an API either
side has to honour.

---

## 17. Open items

1. **The name.** Renamed from BIRDO, which is Nintendo's character from Super Mario Bros. 2 and an active trademark. **BEAKDOWN** returned no shipped game on Steam, the app stores or itch.io in a web search, but that is a smell test and not clearance. Before release: USPTO Class 9, IP Australia, both app stores, and the domain. Note also that Flappy Bird's own trademark was declared abandoned in January 2024 and captured by a third party, so registration matters if this gains any traction.
2. **Lifetime statistics.** Best score already persists. Games played, cumulative birds downed and best wave do not, and would give a returning player more than a single number to care about.
3. **Sound.** The single largest missing piece of feel. A flap tick, a clash thud, a star fanfare.
4. **Anti-camping.**
5. **Is it a daily game?** It is currently arcade score-attack, which is not the daily-ritual shape the wider project was built around. A daily variant (identical seeded wave sequence, one run) is possible but unproven, and the skill range in a reflex game is far wider than in a puzzle, which makes score comparison less friendly than a Wordle grid.
6. **Two-player**, which is what made the original famous. Asynchronous ghosts work from the second player onward and avoid the cold-start problem.

---

## 18. If rebuilding from scratch

Order matters and this is the lesson the whole project paid for.

1. Flap physics and one bird on a screen. Play it. If flapping is not pleasant, nothing else matters.
2. Platforms, floor, wraparound.
3. One enemy and the height rule. Play it. Check the rule teaches itself.
4. The clash freeze and the height lines.
5. Waves, lives, score.
6. Eggs.
7. Star. Play it. This is where the game stopped being fine and started being good.
8. Mushroom and hearts.
9. Arenas.
10. Stats.

Set the feel constants early, verify them by playing, then never touch them again while changing anything else. Every version of this game after the first playable was checked with a diff to prove they had not moved.
