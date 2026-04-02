# Developer Overview

## Structure

- `index.html` provides the split top-left/top-right HUD panels, overlay card, game root, and
  script loading order.
- `vendor/phaser.js` is the locally vendored Phaser runtime loaded before the game bootstraps.
- `src/game.js` owns Phaser bootstrapping, DOM validation, input wiring, deterministic stepping,
  scene drawing, collision checks, four-level campaign flow, wakefulness decay, hazard state, and
  UI synchronization.
- `src/game.js` also owns the reusable HTML audio elements for the level-start `Chad Gadya` cue,
  the game-over `Snore` cue, the frog `Ribbit` and `Gulp` cues, and the three `Splat` impact cues.
- `src/styles/main.scss` defines the source styling for the HUD, overlay, and page shell.
- `src/styles/main.css` is generated from the SCSS file and should not be edited by hand.
- `playwright_scripts/smoke_actions.json` is the baseline deterministic smoke choreography.
- `progress.md` tracks the original prompt, implementation decisions, and validation notes.

## Scene layout

- The room, table, spoon, father, candles, dishes, projectiles, and particle effects are all drawn
  from Phaser graphics primitives, so the game has no external art pipeline.
- The spoon launcher lives on the left side of the table and computes a ballistic launch vector from
  the current aim angle plus the current charge amount.
- The soup bowl sits slightly below horizontal from the spoon pivot, and a spent spoon only reloads
  after the bowl end is dipped into that zone for a brief hold.
- Four goblets sit near Dad; the current level decides how many draw as empty so the table state
  reflects campaign progress, with the Dad-side goblets emptying first.
- Dad sits on the right side of the table, with his head pose derived from the active sleepiness
  state so collision checks and drawing use the same geometry; his eye art stays oval while awake
  and only switches to flat closed lines in the actual game-over asleep state.
- Locusts now travel through a taller vertical lane that reaches down to the table edge, while
  frogs occupy fixed table positions and project tongues from explicit mouth coordinates into a much
  taller upward target band that stays above mid-screen. Levels 3 and 4 now place four frogs across
  that lane instead of two.
- `handleResize()` recalculates the table layout from the current Phaser scale size and redraws the
  full scene.

## Runtime systems

- `advanceFrame()` routes between `menu`, `announcement`, `playing`, `gameover`, and `victory`
  while keeping UI and overlay text synchronized each step.
- `startLevel()` and `completeLevel()` own the four-stage campaign, resetting wakefulness to max
  between levels while preserving score and bonk totals.
- `startAnnouncementSequence()` now enters a fully paused briefing state, and `advanceAnnouncementCard()`
  moves through one card per click or `Enter` press instead of relying on a countdown timer.
- `playLevelStartCue()` rewinds and replays the same `sounds/Chad Gadya.mp3` element when a level
  briefing first appears, immediately on levels that skip briefings, and again on victory.
- `enterGameOver()` now stops the level-start music and triggers `sounds/Snore.mp3` once when Dad
  finally nods off.
- `playImpactCue()` advances through the three `Splat` files and is called from the Dad, table,
  and locust collision paths.
- `playRibbitCue()` fires when a frog launches its tongue, while `playGulpCue()` handles the tongue
  interception path so frog catches use their own audio instead of the generic splat rotation.
  Ribbit launch pitch now uses the game RNG to vary `HTMLAudioElement.playbackRate` within `±5%`
  while keeping automated checks deterministic.
- `registerHit()` now applies the retuned head/body score and wakefulness gains, and head hits also
  spawn a short-lived floating `HEADSHOT!` text object.
- `advancePlayingState()` handles reload detection, spoon charging, wakefulness drain, projectile
  motion, level completion, and state transitions into game over.
- `updateHazards()` splits locust movement and frog tongue timing away from the projectile logic,
  while announcement mode intentionally freezes hazard advancement.
- `render_game_to_text()` exposes the mode, level, timer, empty-glass count, hazard counts,
  announcement card, score, wakefulness, aim state, dad pose, active floating hit labels, and the
  level-start, frog, impact, and game-over audio-cue states for browser automation, including
  whether an announcement is waiting for player advance and which card in the sequence is visible.
- `advanceTime(ms)` steps the simulation in fixed increments so Playwright can test the game without
  relying on real-time rendering cadence.

## Maintenance notes

- Recompile `src/styles/main.scss` into `src/styles/main.css` after any SCSS change.
- Replace `vendor/phaser.js` deliberately when upgrading Phaser so runtime changes stay explicit in the repo.
- Keep runtime failures explicit. Missing Phaser globals, missing DOM nodes, invalid scene sizes, or
  missing input objects should continue to throw instead of silently degrading.
- If gameplay visuals change, keep `render_game_to_text()` aligned with what is actually visible so
  automation remains trustworthy.
- Campaign verification artifacts currently live under `tmp/smoke-run-03/` and
  `tmp/campaign-check-01/`; newer audio verification artifacts now also live under
  `tmp/audio-check-01/`, `tmp/snore-check-01/`, `tmp/impact-check-01/`,
  `tmp/frog-audio-check-01/`, `tmp/ribbit-pitch-check-01/`, `tmp/frog-height-check-01/`,
  `tmp/announcement-click-check-01/`, `tmp/headshot-frogs-check-01/`,
  `tmp/chad-gadya-timing-check-01/`, `tmp/ui-layout-check-01-awake/`,
  `tmp/ui-layout-check-01-asleep/`, and `tmp/ui-layout-check-02-menu.png`. Keep newer runs in
  `tmp/` rather than mixing them into source files.
