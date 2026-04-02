Original prompt: make 2D game on the sleepy_seder folder where you're at a seder table and your dad's falling asleep, and the object is to keep him awake by using your spoon to catapult matzo balls at him.

Notes:
- Created `sleepy_seder` from the local Phaser template rather than modifying an existing game.
- Kept the scope to a single-screen generated-art arcade loop with spoon aiming, ballistic matzo
  balls, wakefulness decay, and a restartable game-over state.
- Added deterministic `window.advanceTime(ms)` and `window.render_game_to_text()` hooks so browser
  automation can inspect the game reliably.
- Added a reusable smoke choreography in `playwright_scripts/smoke_actions.json`.
- Tightened the wake meter to a hard cap of `50`, changed the wallpaper to a clearer light blue, and
  added a reload rule that requires dipping the spoon into the soup bowl at a shallow downward angle.
- Darkened the wallpaper and matching page background by roughly `15%` so foreground elements read
  more clearly.
- Shifted the room and page shell again into a more definite medium blue-grey after the first darker
  pass still felt too light.
- Matched the path prediction dots to the wine color so the arc cue feels tied into the table
  palette instead of using the old gold accent.
- Corrected the keyboard tilt sign so the documented up/down spoon controls now match the visible
  motion and the reload angle can be reached predictably.

Validation:
- Compiled `src/styles/main.scss` into `src/styles/main.css` with `npx --yes sass`.
- Syntax-checked `src/game.js` and `../games-manifest.js` with `node --check`.
- Parsed `playwright_scripts/smoke_actions.json` with Node to confirm valid JSON input for the test client.
- Ran the Playwright smoke loop against `http://127.0.0.1:8123/sleepy_seder/` and saved artifacts in
  `tmp/smoke-run-01/`.
- Smoke state `state-0.json` recorded `score: 90` and `bonks: 1`; `state-1.json` recorded
  `score: 230` and `bonks: 2`, confirming the canned input reliably lands hits.
- Refreshed `tmp/template-phaser-smoke.png` with the latest captured gameplay frame so the copied
  template artifact no longer points at unrelated content.
- Recompiled `src/styles/main.scss` after the wallpaper update and rechecked `src/game.js` with
  `node --check`.
- Updated the smoke choreography for the dip-to-reload loop and reran browser validation into
  `tmp/smoke-run-02/`.
- Smoke state `state-0.json` recorded `score: 180`, `bonks: 2`, and `wakefulness: 45.1`, confirming
  two successful hits with a reload in between under the new mechanic.
- Darkened the wallpaper palette in both the Phaser backdrop and the surrounding page shell, then
  recompiled SCSS and rechecked `src/game.js`.
- Retuned the wallpaper colors again toward a medium blue-grey and recompiled SCSS so the page shell
  and in-canvas room stay aligned.
- Changed the path prediction dots to the same wine tone used in the goblets and rechecked
  `src/game.js`.
- Reworked the game into a four-level campaign: each level now lasts `45` seconds, resets
  wakefulness to the `50` cap, carries score and bonks forward, empties one more wine glass, and
  increases wakefulness drain by `5%`.
- Added inter-level announcement cards, a victory state, five locust hazards for levels 2 and 4,
  and two frog hazards for levels 3 and 4.
- Frogs now fire staggered random tongue attacks that can intercept projectiles, and locusts now
  splat and decay after being hit.
- Froze hazard movement and cooldowns during announcement cards so level briefings do not burn live
  hazard time behind the overlay.
- Updated the HUD copy and overlay text to describe the campaign structure instead of the old
  endless-round loop.
- Marked the shipped campaign items complete in `docs/TODO.md` and refreshed the project docs to
  describe the new level flow and hazard systems.
- Ran the existing deterministic smoke choreography again into `tmp/smoke-run-03/`; it still landed
  two hits and kept the baseline level-1 loop working after the campaign rewrite.
- Ran a deeper deterministic Playwright campaign verification into `tmp/campaign-check-01/`,
  covering level transitions, announcement text, wakefulness resets, locust splats, frog catches,
  staggered frog timing, and the final combined hazard level.
- Added a reusable level-start audio cue by restarting `sounds/Chad Gadya.mp3` whenever a new level
  begins, and exposed the cue state through `render_game_to_text()` for browser verification.
- Reran the baseline smoke loop into `tmp/smoke-run-04/`; the level-1 game state now shows the
  audio cue playing with advancing playback time.
- Added a focused audio verification run in `tmp/audio-check-01/`, confirming that levels 1 through
  4 each restart the cue, bump the play count, and report no audio errors.
- Tightened the spacing between the four goblets and reversed the campaign emptying order so the
  glasses nearest Dad empty first instead of the far-left glass emptying first.
- Verified the updated goblet layout with a fresh baseline smoke in `tmp/smoke-run-05/` plus
  targeted level captures in `tmp/glass-check-01/`, including a level-2 frame showing the two
  glasses closest to Dad empty.
- Shortened every campaign level from `45` seconds to `20`, updated the default HUD and menu copy,
  and changed the documented campaign timing to match.
- Reworked locust movement from mostly horizontal buzzing into a taller vertical bounce that reaches
  down to the tabletop while keeping a smaller sideways drift.
- Added a dedicated game-over sleep cue by playing `sounds/Snore.mp3` when `enterGameOver()` fires
  and stopping the level-start music at that moment.
- Reran the baseline smoke loop into `tmp/smoke-run-07/`; regular gameplay still keeps the new
  snore cue idle while the level music plays normally.
- Added a focused game-over audio verification in `tmp/snore-check-01/`, confirming the snore cue
  starts when wakefulness hits zero, the level music stops, and snore playback time advances while
  the loss overlay is on screen.
- Added rotating impact audio by wiring Dad hits, table splats, locust splats, and frog-tongue
  interceptions into `sounds/Splat1.mp3`, `sounds/Splat2.mp3`, and `sounds/Splat3.mp3`.
- Extended `render_game_to_text()` with impact-audio playback state so browser checks can verify
  which splat cue fired and how many times impact audio has played.
- Reran the baseline smoke loop into `tmp/smoke-run-08/`; the level-1 state now still lands two
  hits while reporting `impactPlayCount: 2` and the last splat cue with no audio errors.
- Added a focused collision-audio verification in `tmp/impact-check-01/`, confirming the first
  four forced impacts step through `Splat1`, `Splat2`, `Splat3`, then wrap back to `Splat1`
  across Dad, table, locust, and frog-tongue collisions with no console or audio errors.
- Added frog-specific audio by playing `sounds/Ribbit.mp3` when a frog launches its tongue and
  `sounds/Gulp.mp3` when a tongue catches a matzo ball.
- Replaced the frog-tongue interception path's old generic splat with the dedicated gulp cue while
  leaving Dad, table, and locust impacts on the rotating `Splat` audio set.
- Extended `render_game_to_text()` with `ribbit*` and `gulp*` audio fields so automation can verify
  frog launch and catch audio directly.
- Reran the baseline smoke loop into `tmp/smoke-run-09/`; level-1 play remains stable and the new
  frog-audio fields stay idle before frogs appear.
- Added a focused frog-audio verification in `tmp/frog-audio-check-01/`, confirming level-3 frog
  launches trigger `Ribbit`, tongue catches trigger `Gulp`, the projectile is removed, and the
  generic impact audio remains untouched during the catch path.
- Added deterministic ribbit pitch variation by using the game RNG to set `Ribbit.mp3`
  `playbackRate` within a `0.95` to `1.05` band on each frog tongue launch.
- Extended `render_game_to_text()` with `ribbitPlaybackRate` so automation can verify the actual
  randomized pitch value instead of only checking whether the cue is playing.
- Reran the baseline smoke loop into `tmp/smoke-run-10/`; level-1 play remains stable and the idle
  ribbit playback rate stays at `1.0` before frogs appear.
- Added a focused ribbit pitch verification in `tmp/ribbit-pitch-check-01/`, confirming two forced
  frog launches produced distinct in-range playback rates of `0.977` and `1.032` with no reported
  errors.
- Expanded frog tongue targeting much farther upward by moving the top of the target band close to
  the top of the room instead of keeping launches near the tabletop.
- Reran the baseline smoke loop into `tmp/smoke-run-11/`; level-1 play remains stable after the
  frog targeting change.
- Added a focused frog-height verification in `tmp/frog-height-check-01/`, confirming sampled level-3
  tongue targets reached as high as `y = 33.9` in the default `720px` viewport, or about `506.1px`
  above the table, with no reported errors.
- Reworked announcement cards so they no longer auto-dismiss after a timer and instead wait for a
  click or `Enter` press to advance one card at a time.
- Updated `render_game_to_text()` announcement payload from the old timer field to explicit
  `awaitingAdvance`, `cardIndex`, and `cardCount` fields so browser checks can verify manual
  dismissal flow directly.
- Reran the baseline smoke loop into `tmp/smoke-run-12/`; level-1 play remains stable after the
  briefing-flow change.
- Added a focused announcement-click verification in `tmp/announcement-click-check-01/`, confirming
  level-2 and level-4 cards stayed open after `5s` of simulated time and only advanced when
  clicked, with level 4 still requiring two separate clicks.
- Added the approved hit retuning: head hits now award `210` score and `33` wakefulness, while body
  hits now award `60` score and `9.38` wakefulness.
- Added a floating `HEADSHOT!` popup on head hits using short-lived Phaser text objects that rise
  upward and fade out over `0.75s`.
- Increased frog levels from two frogs to four and spread them across a wider table lane so tongue
  attacks happen about twice as often overall.
- Tightened frog tongue target selection so the lowest possible target now stays above mid-screen.
- Extended `render_game_to_text()` with `floatingTexts` so browser checks can verify active
  headshot labels directly.
- Reran the baseline smoke loop into `tmp/smoke-run-13/`; the canned level-1 input now reached
  `score: 270`, and the text state captured an active `HEADSHOT!` label during live play.
- Added a focused hit-and-frog verification in `tmp/headshot-frogs-check-01/`, confirming the new
  head/body hit payouts, confirming the headshot label appears then disappears, confirming level 3
  now contains four frogs, and confirming sampled frog tongue targets stayed at or above
  `y = 323.34` in the default `720px` viewport, which is above the `360px` half-screen line.
- Moved the `sounds/Chad Gadya.mp3` restart so briefing levels now play it when the first
  announcement card appears instead of waiting for live play to begin, while levels without a
  briefing still trigger it immediately at level start.
- Reused the same cue on victory so the win screen gets the same musical sting as a new round.
- Reran the baseline smoke loop into `tmp/smoke-run-14/`; level 1 still started cleanly with the
  cue active and `audio.playCount: 1`.
- Added a focused timing verification in `tmp/chad-gadya-timing-check-01/`, confirming level 2
  and the first level-4 card replay the cue when their briefings open, later announcement clicks
  do not replay it, and the victory transition replays it once more with no reported errors.
- Split the page HUD into two top panels so the title, summary, and controls sit in the upper left
  while the live telemetry boxes move to the upper right.
- Cleaned up Dad's eye rendering so oval eyes draw while he is awake or drooping and the flat
  closed-eye lines only appear once he actually enters the asleep game-over state.
- Recompiled `src/styles/main.scss` after the HUD split and rechecked `src/game.js` with
  `node --check`.
- Added visual verification captures for the new layout and eye states: `tmp/ui-layout-check-01-awake/`
  confirms the live-play oval-eye rendering, `tmp/ui-layout-check-01-asleep/` confirms the closed-eye
  game-over rendering, and `tmp/ui-layout-check-02-menu.png` captures the split upper-left/upper-right
  HUD layout in a full-page browser shot.
- Added a level-1 announcement card so pressing start from the menu now opens a proper stage popup
  before live play begins.
- Routed the opening menu start through the normal announcement path so `sounds/Chad Gadya.mp3`
  now starts when the level-1 popup appears instead of waiting for level-1 live play.
- Updated `playwright_scripts/smoke_actions.json` to dismiss the new opening popup before running
  the baseline gameplay choreography.
- Added focused verification in `tmp/level1-popup-check-01/`, confirming the first `Enter` opens
  the level-1 announcement at full wakefulness with `audio.playCount: 1` while the cue is already
  playing.
- Added a second focused verification in `tmp/level1-popup-check-02/`, confirming dismissing the
  level-1 card moves into `playing` without replaying the cue.
- Reran the baseline smoke loop into `tmp/smoke-run-15/`; the updated choreography still lands two
  level-1 hits after dismissing the new opening popup.
- Added an in-world wakefulness indicator by drawing a solid red rounded bar above Dad's head,
  tied directly to the same wakefulness value used by the HUD and loss condition.
- Rechecked `src/game.js` with `node --check` after the wake-bar draw change.
- Added a focused visual verification in `tmp/wake-bar-check-02/`, confirming the over-head bar
  renders during live play with a partial fill that matches the captured `wakefulness: 46.5`.
- Retuned the wakefulness bar color so it now shifts smoothly from green at full wakefulness
  through yellow in the middle to red at `10%` or lower.
- Added three focused color verification captures: `tmp/wake-bar-color-check-01-green/` confirms
  the full `50`-point bar is green, `tmp/wake-bar-color-check-01-yellow/` confirms the mid-run
  `23.4` wakefulness state lands yellow, and `tmp/wake-bar-color-check-01-red/` confirms the
  `2.7` wakefulness state is solid red.
- Added a semi-transparent grey timer disc above the wakefulness bar that empties
  counterclockwise from `12 o'clock` as `levelTimeRemaining` runs down, while announcement cards
  keep it full.
- Rechecked `src/game.js` with `node --check` after the timer-disc draw change.
- Added focused timer-disc verification captures: `tmp/timer-pie-check-01-full/` confirms the
  opening briefing shows a full disc at `20s`, `tmp/timer-pie-check-01-mid/` shows a partially
  emptied disc during live play at `16.8s`, and `tmp/timer-pie-check-02-near-empty/` forces a
  live `1s` remaining state to confirm the disc is nearly empty.
- Reworked the page into a centered fixed landscape `4:3` stage so the Phaser canvas no longer
  changes aspect ratio with the browser window.
- Converted the HUD and overlay sizing from viewport-driven measurements to stage-relative scaling
  so the DOM UI grows and shrinks with the same frame as the canvas.
- Added `ResizeObserver`-driven scene syncing so Phaser resizes against the measured `#game-root`
  stage rectangle instead of assuming the viewport.
- Recompiled `src/styles/main.scss` after the stage-shell rewrite and rechecked `src/game.js` with
  `node --check`.
- Added a two-viewport fixed-stage verification in `tmp/aspect-ratio-check-01/`, confirming the
  stage, game root, and canvas all stay at roughly `1.3333` in both wide and tall browser windows.
- Reran the baseline smoke loop into `tmp/smoke-run-16/`; level 1 still enters live play and lands
  two hits inside the new fixed stage.
- Retuned the fixed stage from landscape `4:3` to landscape `5:3` so the canvas is wider while the
  DOM HUD and overlay continue scaling from the same shared frame.
