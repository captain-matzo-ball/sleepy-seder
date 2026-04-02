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
- Level 1 now also uses an announcement card, so pressing start from the menu first opens the
  level-1 popup before live play begins.
- Announcement cards now remain on screen until the player clicks or presses `Enter` to advance
  them, instead of auto-dismissing on a timer.
- Dad hit rewards are now retuned: headshots pay `1.5x` the previous score and wakefulness gain,
  while body hits pay `0.67x`.
- The goblet cluster now sits slightly tighter together, and campaign progress empties the glasses
  starting from the one closest to Dad.
- `sounds/Chad Gadya.mp3` now restarts when each level briefing first appears, including the new
  level-1 popup that shows as soon as the player starts the game, and it also replays on victory;
  the automation text state exposes the cue status for verification.
- Game-over transitions now also play `sounds/Snore.mp3`, and that cue is exposed through the same
  automation state output.
- Matzo-ball impacts now rotate through `sounds/Splat1.mp3`, `Splat2.mp3`, and `Splat3.mp3`, and
  the automation text state reports the active impact cue plus its play count.
- Frog tongues now play `sounds/Ribbit.mp3` on launch and `sounds/Gulp.mp3` on catches, and the
  automation text state exposes both cue states plus the current ribbit playback rate for
  verification.
- Frog levels now field four frogs instead of two.
- Frog tongue targeting now reaches much farther upward into the room, but never targets below the
  halfway point of the screen.
- Headshots now spawn a floating `HEADSHOT!` label, and the automation text state exposes active
  floating text labels for verification.
- The page HUD is now split into an upper-left instruction panel and an upper-right telemetry
  panel, instead of packing both into one top-left card.
- Dad now keeps oval eyes while awake or drooping, and only switches to flat closed-eye lines in
  the actual asleep game-over state.
- Dad now also has an in-world rounded wakefulness bar above his head that shifts from green at
  full wakefulness through yellow in the middle to red at `10%` or lower, so the same alertness
  value shown in the HUD is visible directly over the target.
- Browser automation relies on `window.advanceTime(ms)` and `window.render_game_to_text()`.
- Reusable smoke inputs belong in `playwright_scripts/`, and generated validation artifacts belong
  in `tmp/`.
