# Sleepy Seder

Sleepy Seder is a one-screen Phaser arcade game about keeping your dad awake through the meal by
catapulting matzo balls at him with a giant spoon, then dipping back into the soup bowl to reload.
The shipped game now runs as a four-level seder campaign: each stage lasts `20` seconds, another
wine glass empties beside Dad, wakefulness resets to the `50`-point cap between levels, and later
rounds add locust and frog hazards. Each new level also restarts `sounds/Chad Gadya.mp3`, and
Dad falling asleep now plays `sounds/Snore.mp3`. Any matzo-ball impact on Dad, the table, or
locusts also triggers a rotating `sounds/Splat1.mp3` / `Splat2.mp3` / `Splat3.mp3` cue. Frogs
now play `sounds/Ribbit.mp3` when they fire a tongue with a slight random pitch shift of up to
`5%` either way, and `sounds/Gulp.mp3` when a tongue catches a matzo ball. Frog tongues can now
also target much higher into the room instead of staying close to the tabletop. Inter-level
briefing cards no longer auto-close; they now wait for a click or `Enter` press.

## Files

- `index.html` provides the HUD, overlay card, and Phaser mount point.
- `src/game.js` owns bootstrapping, the campaign level flow, spoon aiming, soup-dip reload logic,
  hazard simulation, dad wakefulness, generated seder-table art, and deterministic test hooks.
- `src/styles/main.scss` is the source stylesheet for the HUD and overlay shell.
- `src/styles/main.css` is the compiled stylesheet loaded by the page.
- `docs/` contains the implementation and gameplay notes for the project.
- `playwright_scripts/smoke_actions.json` is the reusable smoke input burst for browser validation.
- `tmp/` holds generated smoke and campaign-check artifacts from browser validation runs.
- `vendor/phaser.js` is the vendored Phaser `3.90.0` runtime.

## Running

Open `index.html` directly in a browser, or serve the directory with a static file server.
