# Sleepy Seder

Sleepy Seder is a one-screen Phaser arcade game about keeping your dad awake through the meal by
catapulting matzo balls at him with a giant spoon, then dipping back into the soup bowl to reload.
The shipped game now runs as a four-level seder campaign: each stage lasts `20` seconds, another
wine glass empties beside Dad, wakefulness resets to the `50`-point cap between levels, and later
rounds add locust and frog hazards. Every level now opens with a briefing popup, including level 1
as soon as the player starts the game, and `sounds/Chad Gadya.mp3` restarts when that first card
appears before replaying again on victory. Dad falling asleep now plays `sounds/Snore.mp3`. Any
matzo-ball impact on Dad, the table, or locusts also triggers a rotating `sounds/Splat1.mp3` /
`Splat2.mp3` / `Splat3.mp3` cue. Frogs
now play `sounds/Ribbit.mp3` when they fire a tongue with a slight random pitch shift of up to
`5%` either way, and `sounds/Gulp.mp3` when a tongue catches a matzo ball. Frog tongues can now
also target much higher into the room instead of staying close to the tabletop, and they never aim
below halfway up the screen. Levels 3 and 4 now use four frogs instead of two. Head hits now do
`1.5x` their previous reward, body hits do `0.67x`, and headshots spawn a small floating
`HEADSHOT!` popup that fades out over `0.75s`. Inter-level briefing cards no longer auto-close;
they now wait for a click or `Enter` press. The start screen now uses one centered `Sleepy Seder`
intro card with the controls inside it, while live play shows a bare dark-text top strip for
`Level`, `Bonks`, and `Score`. Dad's eye art now uses oval eyes while awake and flat closed lines
only after he finally falls asleep. Dad also now has a rounded wakefulness
bar floating above his head that shifts smoothly from green at full wakefulness through yellow in
the middle to red at `10%` or lower, so his current alertness is readable in the play space itself.
Above that bar, a semi-transparent grey timer disc now empties counterclockwise from `12 o'clock`
as the level timer runs down, and it now shows the remaining whole seconds inside the disc. The
game also now pops a small `Scoop soup to reload!` toast to the right of the soup bowl if the
player tries to fire while the spoon is empty; it stays solid for `1s` and then fades over another
`1s`. The
whole game now lives inside a fixed landscape `5:3` stage, so the canvas, HUD, and overlays all
scale together instead of the playfield changing shape with the browser window.

## Files

- `index.html` provides the top status strip, overlay card, and Phaser mount point.
- `src/game.js` owns bootstrapping, the campaign level flow, spoon aiming, soup-dip reload logic,
  hazard simulation, dad wakefulness, generated seder-table art, and deterministic test hooks.
- `src/styles/main.scss` is the source stylesheet for the status strip and overlay shell.
- `src/styles/main.css` is the compiled stylesheet loaded by the page.
- `docs/` contains the implementation and gameplay notes for the project.
- `playwright_scripts/smoke_actions.json` is the reusable smoke input burst for browser validation.
- `tmp/` holds generated smoke and campaign-check artifacts from browser validation runs.
- `vendor/phaser.js` is the vendored Phaser `3.90.0` runtime.

## Running

Open `index.html` directly in a browser, or serve the directory with a static file server.
