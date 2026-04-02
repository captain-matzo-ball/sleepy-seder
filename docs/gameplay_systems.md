# Gameplay Systems

## Mode flow

- `menu`: shows the attract scene and instructions while Dad already looks drowsy.
- `announcement`: pauses live play between levels to show short briefing cards before a new plague
  starts, and each card now waits for a click or `Enter` press before the run continues.
- `playing`: drains wakefulness over time, allows soup-dip reloads, spoon charge and release, runs
  level hazards, and scores direct hits.
- `gameover`: freezes the round after Dad fully nods off and waits for an `Enter` press or tap to
  restart, while playing `sounds/Snore.mp3`.
- `victory`: ends the campaign after level 4 and waits for a restart.

## Campaign structure

- The run has four levels, and each level lasts `20` seconds of active play.
- Dad's wakefulness resets to the `50`-point cap at the start of each new level, but score and
  bonks carry forward through the whole campaign.
- One more wine glass is empty each level, so the table shows `1` empty glass in level 1 and all
  `4` empty by level 4, starting with the glass closest to Dad and working outward.
- Wakefulness drains `5%` faster per level, so later rounds punish missed shots more aggressively.
- Level 1 now opens with a quiet-table briefing card as soon as the player starts the run.
- Level 2 announces a locust plague before the timer starts.
- Level 3 announces a frog plague before the timer starts, and it now uses four frogs.
- Level 4 plays two cards in sequence: `Oh no! Death of the firstborn!` and then `Just kidding!
  Locusts AND frogs!`, with four frogs still active there as well.

## Controls

- `ArrowUp`, `ArrowLeft`, `W`, or `A`: tilt the spoon upward.
- `ArrowDown`, `ArrowRight`, `S`, or `D`: tilt the spoon downward.
- Dip the spoon into the soup bowl at roughly `5-15` degrees below horizontal: reload one matzo ball.
- Hold `Space`: charge the spoon when loaded.
- Release `Space`: launch the current matzo ball.
- Pointer move: point the spoon toward the cursor or touch position.
- Pointer down and release: start charging and then fire on release.
- Click during an announcement: advance to the next card or start the level.
- `Enter`: start from the menu, advance announcements, or restart after game over.

## Wakefulness and scoring

- Dad starts each run with `50` wakefulness, and the meter cannot rise above `50`.
- Wakefulness drains continuously during live play; the round ends as soon as it reaches zero.
- Head hits now restore `1.5x` their previous wakefulness and score payout, while body hits restore
  `0.67x` of their previous payout.
- `Bonks` counts successful hits rather than total shots, so the top status strip stays focused on
  the objective.

## Hazards

- Locusts appear in levels 2 and 4. They now travel mostly up and down through a lane that reaches
  down to the table, and a matzo ball that touches one creates a temporary splat and disappears
  instead of reaching Dad.
- Frog hazards appear in levels 3 and 4. Four frogs sit on the table and fire tongues with
  staggered cooldowns toward random targets every few seconds, and those targets can now reach far
  higher into the room while never dipping below halfway up the screen.
- Frog tongues can intercept a matzo ball mid-flight. A successful catch cancels the projectile and
  triggers a brief catch flash on the frog.
- Every tongue launch plays `sounds/Ribbit.mp3` with a slight random pitch shift inside a `±5%`
  window, and every successful tongue catch plays `sounds/Gulp.mp3`.
- Announcement cards pause hazard movement and cooldowns so the player does not lose time to hidden
  activity before a level actually starts.

## Projectile behavior

- The spoon holds one generated matzo ball at a time and fires it with velocity based on the current
  aim angle and the charge oscillator.
- After every shot, the spoon is empty until the player dips it back into the soup bowl and holds it
  in that shallow downward reload angle long enough to refill.
- Trying to fire while empty now pops a `Scoop soup to reload!` hint box just to the right of the
  soup bowl; it stays fully visible for `1s` and then fades over another `1s`.
- Gravity pulls every projectile downward, so timing and loft matter more than rapid spam.
- A shot disappears if it bonks Dad, splats on the table, gets intercepted by a frog tongue, hits
  a locust, or exits the visible play area.
- Dad hits, table splats, and locust splats rotate through `sounds/Splat1.mp3`, `Splat2.mp3`, and
  `Splat3.mp3`, while frog-tongue interceptions now use `sounds/Gulp.mp3`.
- Charging also draws a dotted ballistic preview to make the arcade loop readable without authored
  assets.

## Presentation

- The whole game now renders inside a fixed landscape `5:3` stage, so the visible playfield keeps
  the same proportions across browser sizes while the top status strip and overlays scale with it.
- Dad’s head slump, eye openness, and snore particles are all derived from the current sleepiness
  state rather than from separate animation clips.
- Dad also carries a rounded wakefulness bar above his head that shifts from green at full
  wakefulness through yellow to red at `10%` or lower, so the target's current alertness is
  legible directly in the canvas instead of relying on a separate meter panel.
- Above that bar, a semi-transparent grey timer disc empties counterclockwise from `12 o'clock` as
  the active level timer runs down, while briefings leave it full; the remaining whole seconds are
  drawn inside the disc.
- Hits generate crumbs and starburst particles to keep the scene readable even without sound.
- Head hits also spawn a small red `HEADSHOT!` label that floats upward and fades out over `0.75s`.
- The start menu uses one centered intro card with the controls in it, while live play shows only
  a dark-text top strip for `Level`, `Bonks`, and `Score`.
- Announcement cards and the status strip explain which plague is active and how far through the
  seder run the player has progressed.
- `sounds/Chad Gadya.mp3` rewinds and replays when each level briefing first appears, including the
  level-1 popup that shows right after the player starts, so the run gets an audible cue before
  each stage and again on victory.
- Dad falling asleep stops the level music and plays `sounds/Snore.mp3` as the failure cue.

## Automation hooks

- `window.advanceTime(ms)` steps the simulation deterministically in fixed-size updates.
- `window.render_game_to_text()` returns JSON describing the visible state so browser automation can
  verify gameplay behavior without inspecting pixels alone, including whether the level-start audio
  is playing, whether the `Ribbit` and `Gulp` cues are active, the current ribbit playback rate,
  which impact cue played most recently, which floating hit labels are visible, whether an
  announcement is waiting for dismissal, and whether the game-over snore cue is active.
