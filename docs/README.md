# Documentation

## Available docs

- `developer_overview.md`: structure, runtime responsibilities, layout model, and maintenance notes.
- `gameplay_systems.md`: mode flow, level structure, controls, scoring, wakefulness, hazards, and
  projectile behavior.
- `TODO.md`: the project task list, now marked against the implemented four-level campaign work.

## Current implementation

- The project uses functions and plain objects rather than custom classes, so `docs/classes` is
  intentionally empty.
- Phaser `3.90.0` is vendored locally in `vendor/phaser.js`.
- Gameplay now uses a hard `50`-point wakefulness cap, a soup-dip reload rule for the spoon, and a
  four-level campaign with announcement cards and escalating hazards.
- Announcement cards now remain on screen until the player clicks or presses `Enter` to advance
  them, instead of auto-dismissing on a timer.
- The goblet cluster now sits slightly tighter together, and campaign progress empties the glasses
  starting from the one closest to Dad.
- Level starts now restart `sounds/Chad Gadya.mp3`, and the automation text state exposes the cue
  status for verification.
- Game-over transitions now also play `sounds/Snore.mp3`, and that cue is exposed through the same
  automation state output.
- Matzo-ball impacts now rotate through `sounds/Splat1.mp3`, `Splat2.mp3`, and `Splat3.mp3`, and
  the automation text state reports the active impact cue plus its play count.
- Frog tongues now play `sounds/Ribbit.mp3` on launch and `sounds/Gulp.mp3` on catches, and the
  automation text state exposes both cue states plus the current ribbit playback rate for
  verification.
- Frog tongue targeting now reaches much farther upward into the room, rather than staying in a
  narrow band above the table.
- Browser automation relies on `window.advanceTime(ms)` and `window.render_game_to_text()`.
- Reusable smoke inputs belong in `playwright_scripts/`, and generated validation artifacts belong
  in `tmp/`.
