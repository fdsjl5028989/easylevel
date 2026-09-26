# Easy Level: continuation notes

A deceptively simple three.js platformer ("troll platformer") with a lying narrator. Every trap
**patches itself** each time it kills you (v1.0 → v2.0 → v3.0, with patch notes). The last
version of a trap stays fixed, so the player's knowledge eventually sticks and the level can be beaten.

- **Game file:** `easy-level.html` (single file, no build step, open it in a browser)
- **Published artifact:** https://claude.ai/artifact/XdVqQWiDV8QPSZrqUEL9s7 (currently Version 4)
  - To republish from a new session, call the Artifact tool with `url` set to the link above and
    `file_path` pointing at this folder's `easy-level.html` (read the artifact first, as the tool requires).
- **GitHub repo:** https://github.com/fdsjl5028989/easylevel (branch `main`; this folder is the working copy, `backup/` is gitignored)
- **Status:** World 1 (levels 1-1, 1-2, 1-3) is complete and published. The player has finished 1-1 and 1-2.
  1-3 was just made harder (see "Open items").

---

## Player feedback so far
- 1-1: "fun". The original final spike version was impossible and has been fixed (see 1-1 below).
- 1-2: "fun".
- 1-3: "way too easy", so it was reworked. The new version has not been played yet.
- Asked for: classic chiptune music (done), a more interesting character than a square (done: Pip).

---

## Reviewing without playing: dev mode and tests
- **Dev mode:** double-click `dev.html` (it opens `easy-level.html#dev`), or add `?dev` / `#dev` to the URL. A panel lets you pick a level,
  jump straight to any trap at any version (deaths respawn you right there until you pass a checkpoint),
  set all traps to v1 or final, and toggle **God** (G), **Lock versions** (L), **Hitboxes** (H, shows what the
  physics sees: fake/hidden blocks, crushers, spike and enemy boxes, trap zones, the Guide's caught line),
  **Freeze** (F) with frame-step (`.`, Shift+`.` = 0.1 s) and **speed** (`[` `]`). `` ` `` hides the panel.
  Dev mode never saves progress or best times.
- **Tests:** `npm install` once, then `npm test` (about 8 s). `node tests/run.mjs 1-3` or `node tests/run.mjs guide`
  filters by level or trap id. They run the real game script headless in Node (`tests/harness.mjs` extracts it from
  the HTML and fakes the browser). The suite checks:
  level data (text for every version, zones, a bot route for every trap), checkpoints stand on ground, trap
  versions escalate and stop at final, **a bot beats the final version of every trap and every whole level with
  0 deaths**, timing windows and the chase margin ("Numbers to watch"), and 20 s of random button mashing per
  version mix never crashes.
- **Routes** live in `tests/routes.mjs`: one generator per trap that presses real keys (`b.go`, `b.wait`,
  `b.jump`, `b.jumpTo`). **Adding a trap means adding its route**; the data check fails until you do. If you
  retune a trap and its route breaks, either the route needs new timings or the trap became impossible.
- The game exposes `window.easy` (state getters, `playLevel`, `goto(trapId, version)`, `setAll`, `step(n)`)
  for the tests; it's harmless for players.
- Measured (perfect play): 1-1 Tunnel start window 1.65 s of every 2.4 s; 1-3 Dark Mode tunnel v3 0.65 s of every 2.2 s
  (first half) and 0.48 s of every 1.2 s (second half); 1-3 chase v3 closest approach 4.45 tiles (about 0.8 s of slack).
- 1-3's tuning numbers are constants just above `LEVEL_3` (flash, tunnel, mushrooms, bridge, statues, beam, Guide).
  To try values without editing the file, `loadGame({ patch })` in `tests/harness.mjs` can rewrite the source before
  it runs. Traps that fought the physics while being designed: a backwards wave of 4 crushers has no window at all below
  a ~3 s period; a forward wave moving at Pip's speed (lag ≈ tile width / 7) is trivially easy; the light bridge halves
  must be wider than a full jump (4.8 tiles) or you skip them; statues need their wake-up delay or they're under you
  when you land.

## Tech stack
- three.js `0.169.0` as an ES module from `cdn.jsdelivr.net` (the artifact CSP only allows cdnjs, jsdelivr/npm and Google Fonts).
- Fonts: Fredoka (UI/display) and JetBrains Mono (counters), from Google Fonts.
- All audio is synthesised with WebAudio: sfx, a per-level chiptune loop and the narrator's text blips. No audio files.
- `localStorage` keys: `easy.progress` (unlocked count, best deaths/time per level, coward flag),
  `easy.muted`, `easy.music`. All access is wrapped in try/catch.
- Single-world visual design (no light/dark theme switching), in a "sticker book" style:
  white panels, 3px ink borders, hard offset shadows.

## Code map (search for these section banners in the file)
| Banner | What's there |
|---|---|
| `Renderer & themes` | `THEMES` (day / dusk / night: sky, light levels, outline colour, decor colours), shared materials `MAT`, `boxWithEdges` |
| `Entities` | `addSolid`, `ground`, `wall`, `brick`, `addSpike`, `addEnemy` (blob or bat), `addDoor`, `labelPlane`, `signMesh`, `move`, `fall` |
| `Narrator` | `say(text, prio)` typewriter queue; the Guide's generic and milestone lines |
| `Audio` / `Music` | `sfx.*`; `SONGS` (day, dusk, night) with `bpm`, `lead`, `roots`, `wave`, `tr` (transpose), `glitch`; `music.rate` speeds a song up (used in the chase) |
| `Pip` | the character: body, eyes, sprout on a spring, scarf, feet and hands; plus `lantern` (a PointLight, night only) |
| `Per-tick control state` | `invert`, `remap`, `camCtl` (stuck/flip), `lightCtl` (lantern), `flashT`, `ui` (fake overlays). **Reset every tick**; traps set them |
| `LEVEL 1-1` / `LEVEL 1-2` / `LEVEL 1-3` | the level definitions (see the schema below) |
| `Game state` | `loadLevel`, `playLevel`, `buildLevel` (rebuilds all trap entities), `spawn`, `die`, `fakeDie`, `advanceTrap`, `respawn`, `win`, `showPatchCard` |
| `Physics` | fixed 120 Hz `tick()`: traps → crumbling blocks → carry and crush → input → move X then Y → hazards → enemies → doors → checkpoints |
| `Rendering` | syncs meshes; Pip animation; camera (follow / stuck / 180° flip); off-screen arrow |
| `HUD` / `Menus` / `Input` / `Loop` | DOM overlays, level select, keys and touch, `syncMusic()` (music plays only while you're actually playing) |

## Level schema
```js
{
  id: '1-2', title: 'Loading…', theme: 'day'|'dusk'|'night', song: 'day'|'dusk'|'night', end: <x of exit wall>,
  dodgy?: true,      // "Next level" button runs from the mouse 3 times (1-1 only)
  trollCp?: 1,       // this checkpoint lies once (sends you back to the start the first time)
  last?: true,       // final level of the world
  intro, winTitle, winText, winLine,
  checkpoints: [{ x, y, line }],   // index 0 is the spawn point
  statics() { ... },               // permanent geometry: ground(x0, x1, top), wall(x0, x1, top), brick(x, y, w, h)
  extras?(trapsById) { ... },      // dynamic non-trap entities (rebuilt on every respawn)
  onTick?() { ... },
  traps: () => [ trap, ... ],      // a factory, so every level load gets fresh trap state
}
```

## Trap schema (the heart of the game)
```js
{
  id, name, zone: [x0, x1],   // deaths inside the zone count against this trap
  max: 1|2,                   // highest version index (0-based); v(max+1).0 is final and never changes
  sayAt: x,                   // Guide says approach[stage] when Pip passes this x (once per life)
  approach: [...], deaths: [...], patch: [null, ...], hint: '...',   // one entry per version
  build(T, stage) { ... },    // create entities; pass { dyn: true, trap: T } so they're rebuilt and credited
  update(T, dt, stage) { ... },
  touchDoor?(T, door, stage) { ... },
}
```
- `die(cause, trap)` → the trap's version goes up (unless it's already final) → a patch card appears → after 3 deaths
  on the final version, the Guide says the trap's `hint`.
- Useful entity options: `fake` (looks solid, isn't), `hidden` (invisible until bumped), `crush`, `spring`,
  `crumble: <seconds>`, spike `prop` (fake death), spike `ownMat` + `hot` (glows red), enemy
  `secret` / `spiky` / `sleep` / `bat` / `glow` / `sway` + `amp`, door `real` / `cardboard` / `label`.
- Things a trap can change for one tick: `invert`, `remap.jumpDown` / `remap.swap`, `camCtl.stuck = x` / `camCtl.flip`,
  `lightCtl.lantern = false`, `flashT = seconds`, `ui.loading` / `ui.fakePause` / `ui.fakeWin` / `ui.banner`, `revUI`.
- Helpers: `waveCrush(T, dt, period = 2.4, lag = 0.35)` (a negative lag makes the wave run backwards),
  `zapBlock(b)` / `restoreBlock(b)`, `teleport(x, y)`, `pl.frozen`.

## Physics numbers (units are tiles)
- Gravity 45, jump velocity 15.5 → **apex 2.67**, a flat jump lasts about 0.69 s and covers **up to ~4.8 tiles** at full speed.
- Run speed 7. Tapping jump gives a tiny hop (velocity 5 → apex 0.28); releasing mid-air cuts upward velocity to 5.
- Coyote time 0.08 s, jump buffer 0.12 s. Pip's collision box is 0.8 × 0.9.
- **Rule of thumb for gaps:** up to 2.5 tiles is comfortable, 3.5 needs a good jump, ~4.5 is the limit.
- Before shipping any new jump, simulate it: a ~20-line node script stepping at `dt = 1/120` with the numbers above.
  That's how these were checked:
  - 1-1 spike v3: can be beaten if you stand still and jump when it's 2.2–4.8 tiles away; running away never works.
  - 1-2 exit v2: you clear the EXIT door if you take off at x 119.85–120.75 (door at 122.5).
  - 1-3 backwards tunnel: a 0.53 s safe window to start running per 3 s cycle (1-1's tunnel has 1.33 s).

## The levels and their trap versions
**1-1 Easy Level** (day): Gap (floor drops → fake platform → real platform that falls), Spike
(jumps → chases → copies your jump and glows red), Blob (hedgehog → jumps → asleep, so stomp it), Stairs (invisible
block → fake edge → cracked tiles are the safe ones), Spring (launches you into spikes → hold jump), Platforms
(controls reversed → announced but not really reversed → flip every 1.6 s), Tunnel (crush → wave), Door (runs away → painting on a
trapdoor → real, with a cardboard decoy). Checkpoint 1 lies once.

**1-2 Loading…** (dusk, a fast glitchy song) turns the game's own screens and settings against you. Every trap has 3
versions except Early Exit (15 forced deaths): Loading Screen (spike behind an opaque loader → see-through loader, spike
from behind → a "part 2 of 2" loading bar with a second spike from the right), Gap Remastered (a fake "v1.0" patch card,
floor drops → the platform becomes a lift that sinks while you stand on it (`GAP_SINK` 1.5 tiles/s): ride too long and
you can't reach the ledge, about a 0.8 s window to jump off → the lift stops 3.5 tiles short and sinks slower
(`GAP_SINK_V3` 0.8), so jump off at the end of its run, about a 0.45 s window), Early
Exit (fake Level Complete → trapdoor; then it's a portal past a wall), Settings (jump becomes ↓ → a "reset" that lies →
left and right swapped), Camera (stuck, you walk off-screen → spinning, with a second spike → upside down, two spikes),
Pause Screen (opaque fake pause over a bridge that crumbles on contact, the Guide calls "Jump!" → crumbles faster, raised
last step, the Guide calls "Big jump!" → see-through pause, the steps only crumble once you've been on the bridge 1 s),
Prop Spike (the spike is a prop, but touching it still counts as a death, and jumping hits invisible ceiling spikes →
real spike under visible ceiling spikes (bottom at `PROP_CEIL` 2.5); a clean small hop gets a new spike popped up right
under your landing, so v2 always gets you → ceiling lowered to `PROP_CEIL_V3` 2.2, no pop-up spike: hold jump
0.04–0.075 s), Exit (loops back to the checkpoint → EXIT loops, NOT THE EXIT is real → NOT THE EXIT hops back
over your head, so you jump EXIT twice).
- Early Exit has no v3 on purpose: its v2 can't kill you (it's a portal, there's no pit), so a v3 would only ever appear
  if a stuck player pressed R. Give it a way to die first if it needs a third version.
- Pause Screen and Camera versions were reordered on player feedback (the see-through pause is the final version; the
  spinning camera comes before the upside-down one).
- Spikes can be `hidden` (invisible until they kill you); the dev hitbox overlay shows them dashed.

**1-3 Lights Out** (night, minor-key song) is the finale: 8 traps, all with 3 versions (16 forced deaths), and the
tightest final versions. It's very dark: near-black sky (nothing shows as a silhouette), a small lantern (`LANTERN`
intensity, 3.4 tiles) that shines the way Pip faces, sleeping bats drawn pitch black, no "z Z z" at night. Checkpoints at
53, 99, 127 and 167.
Flash (the flash shows fake platforms; real ones only show within 1.6 tiles → no fakes, the platforms are only visible
while the lights flash (every `FLASH_EVERY` 2.6 s, lantern blinks first), so jump from memory → visible in the dark
again, but they drift and vanish during each flash), Eyes (hedgehog under an invisible sleeping bat → one swinging bat →
two bats swinging opposite ways), Tunnel Dark Mode (backwards wave of 3, unlit → 4 glowing crushers → split in two with a
rest room: first half backwards `LAMP_V3A`, go as its first crusher starts lifting, 0.65 s window; second half fast and
forwards `LAMP_V3B`, go as its first crusher slams, 0.48 s window), Mushrooms (glow on fakes → real crumbling steps
(`SHROOM_CRUMBLE` 0.3 s) at mixed heights, lantern taken → flatter steps that bob by `SHROOM_BOB`), **Light Bridge**
(two 6-tile halves of light, too wide to jump, pillar between: the Guide turns it off halfway → both halves on a timer
with a countdown banner → the halves take turns, 0.8 s each), **Statues** (spikes that only move while they're behind
the way you face, after `STATUE_DELAY`; tapping back for a moment freezes them and restarts the delay. You hop them and
must look back → more and faster → faster and quicker off the mark; they give up at x 147), **Lighthouse** (floor
tiles only exist inside a sweeping beam: the Guide says walk in the dark → the beam sweeps slowly from the ledge →
faster, narrower, pauses halfway), Guide chase (deletes the block you jump to → blocks come back, and at the end the
Guide says it's stuck, then "Just kidding!" and charges at `GUIDE_CHARGE` after `FAKE_STUCK` s; stopping kills you →
also faster (`GUIDE_FAST`) and the first EXIT door is a painting on a trapdoor; jump it to reach the real one).

## Open items / next steps
1. **Playtest the reworked 1-3** (third rework, from player feedback: too bright, too few traps, Flash, Tunnel,
   Mushrooms and the Guide too easy). Three new traps (Light Bridge, Statues, Lighthouse) and new versions everywhere.
   The bot's reaction-lag success rates for the finals (0.1 s lag): Tunnel 100%, Guide 43%, the rest 83–100%. The
   Statues depend on a tap-back move the bot does perfectly, so watch how they feel to a human.
2. Possible difficulty check across World 1: 1-3 should be the hardest level now; confirm 1-2 isn't harder.
3. Ideas pitched but not built yet:
   - **Traps that remember:** bring back 1-1 traps in their *old* versions to punish memory (1-2's Gap does a bit of this).
   - A **World 2** (the win screen currently jokes "There is no World 2").
   - A leaderboard, or a speedrun mode showing deaths and time per level.
   - More meta tricks: patch notes that lie about what changed, a death counter that counts backwards, a fake "game crashed" screen.
4. Known quirks, all accepted for now:
   - Pressing R inside a trap's zone counts as that trap killing you, so it upgrades the trap.
   - On touch devices the "jump is now ↓" remap doesn't apply, because the touch jump button always jumps.
   - The upside-down camera trap also mirrors left and right on screen. That's on purpose; it's disorienting.

## Related files in `..\` (the threejs folder)
- `mesa-glide.html`: a canyon glider arcade game (first demo). https://claude.ai/artifact/9fHHcsf8RCT74QbiYxvRnn
- `tower-of-mild-inconvenience.html`: a rage-bait RPG tower climb with a third-person mouse-look camera.
  https://claude.ai/artifact/3utSYUdE3YC8hwTaFrpRQZ
