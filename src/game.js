"use strict";

const FIXED_STEP_SECONDS = 1 / 60;
const FIXED_STEP_MS = 1000 / 60;
const MAX_WAKEFULNESS = 50;
const STARTING_WAKEFULNESS = MAX_WAKEFULNESS;
const BASE_WAKE_DRAIN_PER_SECOND = 6.4;
const LEVEL_DURATION_SECONDS = 20;
const LEVEL_DRAIN_STEP = 0.04;
const AIM_SPEED = 2.1;
const BASE_SHOT_SPEED = 520;
const BONUS_SHOT_SPEED = 360;
const SHOT_GRAVITY = 780;
const HEAD_HIT_MULTIPLIER = 1.5;
const BODY_HIT_MULTIPLIER = 0.67;
const BASE_HEAD_HIT_SCORE = 140;
const BASE_BODY_HIT_SCORE = 90;
const BASE_HEAD_HIT_WAKE = 22;
const BASE_BODY_HIT_WAKE = 14;
const HEAD_HIT_SCORE = Math.round(BASE_HEAD_HIT_SCORE * HEAD_HIT_MULTIPLIER);
const BODY_HIT_SCORE = Math.round(BASE_BODY_HIT_SCORE * BODY_HIT_MULTIPLIER);
const HEAD_HIT_WAKE = BASE_HEAD_HIT_WAKE * HEAD_HIT_MULTIPLIER;
const BODY_HIT_WAKE = BASE_BODY_HIT_WAKE * BODY_HIT_MULTIPLIER;
const RELOAD_MIN_ANGLE = (5 * Math.PI) / 180;
const RELOAD_MAX_ANGLE = (15 * Math.PI) / 180;
const RELOAD_HOLD_SECONDS = 0.18;
const LOCUST_SPLAT_SECONDS = 2.8;
const FROG_ATTACK_INTERVAL = 3;
const FROG_TONGUE_DURATION = 0.72;
const HEADSHOT_TEXT_LIFETIME = 0.75;
const RIBBIT_PLAYBACK_RATE_VARIATION = 0.05;
const RANDOM_SEED = 0x53454452;

const LEVEL_DEFINITIONS = [
  {
    level: 1,
    threatLabel: "Quiet table",
    locustCount: 0,
    frogCount: 0,
    announcements: [
      {
        kicker: "Level 1",
        title: "Keep Dad Awake",
        body: "The table is still quiet for now. Start the seder by bonking Dad awake before the first glass runs dry.",
      },
    ],
  },
  {
    level: 2,
    threatLabel: "Locusts",
    locustCount: 5,
    frogCount: 0,
    announcements: [
      {
        kicker: "Level 2",
        title: "Oh no! A plague of locusts!",
        body: "Five locusts are about to buzz around the seder. A splat takes them out, but it also kills the shot.",
      },
    ],
  },
  {
    level: 3,
    threatLabel: "Frogs",
    locustCount: 0,
    frogCount: 4,
    announcements: [
      {
        kicker: "Level 3",
        title: "Oh no! A plague of frogs!",
        body: "Four frogs are lining the table. Their tongues fire every few seconds, and even their bad aim can still ruin a shot.",
      },
    ],
  },
  {
    level: 4,
    threatLabel: "Locusts + Frogs",
    locustCount: 5,
    frogCount: 4,
    announcements: [
      {
        kicker: "Level 4",
        title: "Oh no! Death of the firstborn!",
        body: "The seder somehow found one more way to get stressful.",
      },
      {
        kicker: "Level 4",
        title: "Just kidding! Locusts AND frogs!",
        body: "All four glasses are empty now, and both plagues are joining the final stretch.",
      },
    ],
  },
];

(function bootstrapGame() {
  if (!window.Phaser) {
    throw new Error("Phaser failed to load before src/game.js executed.");
  }

  const dom = readDomReferences(document);
  const initialSize = readGameRootSize(dom.gameRoot);
  const state = createGameState(dom, initialSize);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: dom.gameRoot,
    width: initialSize.width,
    height: initialSize.height,
    backgroundColor: "#f2e6cf",
    render: {
      preserveDrawingBuffer: true,
    },
    audio: {
      noAudio: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    scene: {
      create() {
        createScene(this, state);
      },
      update(_time, delta) {
        advanceFrame(state, delta / 1000, false);
      },
    },
  });

  window.__sleepySeder = state;
  window.render_game_to_text = () => renderGameToText(state);
  window.advanceTime = (ms) => advanceSimulationByMs(state, ms);

  window.addEventListener("beforeunload", () => {
    game.destroy(true);
  });
})();

function createScene(scene, state) {
  if (!scene.input.keyboard) {
    throw new Error("Phaser keyboard input is required for sleepy_seder.");
  }

  state.scene = scene;
  state.graphics.backdrop = scene.add.graphics();
  state.graphics.world = scene.add.graphics();
  state.graphics.effects = scene.add.graphics();
  state.graphics.backdrop.setDepth(-20);
  state.graphics.world.setDepth(-10);
  state.graphics.effects.setDepth(10);
  state.controls = createControls(scene);

  registerPointerControls(scene, state);
  scene.scale.on("resize", () => {
    handleResize(state);
  });

  handleResize(state);
  resetRound(state, "menu");
  syncUi(state);
  drawScene(state);
}

function createControls(scene) {
  if (!scene.input.keyboard) {
    throw new Error("Cannot create controls before Phaser keyboard input exists.");
  }

  const cursors = scene.input.keyboard.createCursorKeys();
  const extraKeys = scene.input.keyboard.addKeys({
    raiseKeyA: Phaser.Input.Keyboard.KeyCodes.W,
    raiseKeyB: Phaser.Input.Keyboard.KeyCodes.A,
    lowerKeyA: Phaser.Input.Keyboard.KeyCodes.S,
    lowerKeyB: Phaser.Input.Keyboard.KeyCodes.D,
    enterKey: Phaser.Input.Keyboard.KeyCodes.ENTER,
  });
  const space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  if (
    !cursors.left ||
    !cursors.right ||
    !cursors.up ||
    !cursors.down ||
    !space ||
    !extraKeys.raiseKeyA ||
    !extraKeys.raiseKeyB ||
    !extraKeys.lowerKeyA ||
    !extraKeys.lowerKeyB ||
    !extraKeys.enterKey
  ) {
    throw new Error("Expected sleepy_seder keyboard bindings to initialize completely.");
  }

  return {
    raiseKeys: [cursors.up, cursors.left, extraKeys.raiseKeyA, extraKeys.raiseKeyB],
    lowerKeys: [cursors.down, cursors.right, extraKeys.lowerKeyA, extraKeys.lowerKeyB],
    space,
    enter: extraKeys.enterKey,
  };
}

function registerPointerControls(scene, state) {
  scene.input.on("pointerdown", (pointer) => {
    state.pointer.isDown = true;
    state.pointer.x = pointer.x;
    state.pointer.y = pointer.y;

    if (state.mode === "menu" || state.mode === "gameover" || state.mode === "victory") {
      startRound(state);
      return;
    }

    if (state.mode === "announcement") {
      advanceAnnouncementCard(state);
      return;
    }

    if (state.mode !== "playing") {
      return;
    }

    updatePointerAim(state, pointer);
    beginCharge(state, "pointer");
  });

  scene.input.on("pointermove", (pointer) => {
    state.pointer.x = pointer.x;
    state.pointer.y = pointer.y;

    if (state.mode === "playing") {
      updatePointerAim(state, pointer);
    }
  });

  scene.input.on("pointerup", () => {
    state.pointer.isDown = false;

    if (state.mode === "playing" && state.aim.isCharging && state.aim.source === "pointer") {
      releaseShot(state);
    }
  });
}

function createGameState(dom, initialSize) {
  return {
    dom,
    scene: null,
    audio: createAudioState(),
    controls: null,
    graphics: {
      backdrop: null,
      world: null,
      effects: null,
    },
    size: initialSize,
    layout: createLayout(initialSize),
    mode: "menu",
    time: 0,
    randomSeed: RANDOM_SEED,
    score: 0,
    bonks: 0,
    level: 1,
    levelTimeRemaining: LEVEL_DURATION_SECONDS,
    wakefulness: STARTING_WAKEFULNESS,
    projectiles: [],
    particles: [],
    floatingTexts: [],
    spoon: {
      loaded: true,
      reloadProgress: 1,
    },
    aim: {
      angle: -0.82,
      isCharging: false,
      source: null,
      chargeTimer: 0,
      currentCharge: readChargeAmount(0),
      pointerControlled: false,
    },
    dad: {
      nodPhase: 0,
      recoil: 0,
      snoreTimer: 0.9,
    },
    hazards: {
      locusts: [],
      frogs: [],
    },
    announcement: {
      cards: [],
      current: null,
      index: 0,
      awaitingAdvance: false,
      nextMode: null,
    },
    pointer: {
      isDown: false,
      x: initialSize.width * 0.5,
      y: initialSize.height * 0.5,
    },
  };
}

function createAudioState() {
  const levelStartCue = new Audio("sounds/Chad Gadya.mp3");
  levelStartCue.preload = "auto";
  const snoreCue = new Audio("sounds/Snore.mp3");
  snoreCue.preload = "auto";
  const ribbitCue = new Audio("sounds/Ribbit.mp3");
  ribbitCue.preload = "auto";
  const gulpCue = new Audio("sounds/Gulp.mp3");
  gulpCue.preload = "auto";
  const impactCueNames = ["Splat1.mp3", "Splat2.mp3", "Splat3.mp3"];
  const impactCues = impactCueNames.map((name) => {
    const cue = new Audio(`sounds/${name}`);
    cue.preload = "auto";
    return cue;
  });

  return {
    levelStartCue,
    snoreCue,
    ribbitCue,
    gulpCue,
    impactCueNames,
    impactCues,
    impactCursor: 0,
    lastImpactCue: null,
    lastImpactCueIndex: null,
    impactPlayCount: 0,
    impactLastError: null,
    lastPlayedLevel: null,
    playCount: 0,
    lastError: null,
    snorePlayCount: 0,
    snoreLastError: null,
    ribbitPlayCount: 0,
    ribbitLastError: null,
    ribbitPlaybackRate: 1,
    gulpPlayCount: 0,
    gulpLastError: null,
  };
}

function createLayout(size) {
  if (size.width <= 0 || size.height <= 0) {
    throw new Error("Cannot build sleepy_seder layout for a non-positive scene size.");
  }

  const tableTopY = size.height * 0.75;
  const dadBodyHeight = size.height * 0.23;

  return {
    tableTopY,
    tableclothY: tableTopY - size.height * 0.02,
    spoonPivotX: size.width * 0.17,
    spoonPivotY: tableTopY - size.height * 0.065,
    spoonLength: size.height * 0.17,
    spoonBowlRadius: size.height * 0.024,
    dadSeatX: size.width * 0.77,
    dadSeatY: tableTopY - size.height * 0.025,
    dadBodyWidth: size.width * 0.13,
    dadBodyHeight,
    dadHeadRadius: size.height * 0.058,
    chairWidth: size.width * 0.1,
    chairHeight: size.height * 0.25,
    windowX: size.width * 0.58,
    windowY: size.height * 0.09,
    windowWidth: size.width * 0.19,
    windowHeight: size.height * 0.25,
    bowlX: size.width * 0.27,
    bowlY: tableTopY - size.height * 0.035,
    bowlRadius: size.height * 0.048,
    sederPlateX: size.width * 0.5,
    sederPlateY: tableTopY - size.height * 0.03,
    sederPlateRadius: size.height * 0.055,
    candleLeftX: size.width * 0.38,
    candleRightX: size.width * 0.45,
    candleY: tableTopY - size.height * 0.12,
    glassStartX: size.width * 0.54,
    glassY: tableTopY - size.height * 0.048,
    glassSpacing: size.width * 0.044,
    glassScale: size.height / 950,
    frogY: tableTopY - size.height * 0.036,
    frogLeftX: size.width * 0.41,
    frogRightX: size.width * 0.58,
    frogLaneStartX: size.width * 0.34,
    frogLaneEndX: size.width * 0.61,
    frogBodyRadius: size.height * 0.036,
    locustMinX: size.width * 0.32,
    locustMaxX: size.width * 0.93,
    locustMinY: size.height * 0.14,
    locustMaxY: tableTopY - size.height * 0.03,
  };
}

function handleResize(state) {
  if (!state.scene) {
    throw new Error("Cannot resize sleepy_seder before the scene exists.");
  }

  state.size = getSceneSize(state.scene);
  state.layout = createLayout(state.size);
  realignHazardsToLayout(state);
  drawScene(state);
}

function resetRound(state, mode) {
  state.mode = mode;
  state.time = 0;
  state.randomSeed = RANDOM_SEED;
  state.score = 0;
  state.bonks = 0;
  state.level = 1;
  state.levelTimeRemaining = LEVEL_DURATION_SECONDS;
  state.wakefulness = STARTING_WAKEFULNESS;
  state.projectiles = [];
  state.particles = [];
  clearFloatingTexts(state);
  state.spoon.loaded = true;
  state.spoon.reloadProgress = 1;
  state.aim.angle = -0.82;
  state.aim.isCharging = false;
  state.aim.source = null;
  state.aim.chargeTimer = 0;
  state.aim.currentCharge = readChargeAmount(0);
  state.aim.pointerControlled = false;
  state.dad.nodPhase = 0;
  state.dad.recoil = 0;
  state.dad.snoreTimer = 0.7;
  state.hazards.locusts = [];
  state.hazards.frogs = [];
  stopAudioCue(state.audio.levelStartCue);
  stopAudioCue(state.audio.snoreCue);
  stopAudioCue(state.audio.ribbitCue);
  stopAudioCue(state.audio.gulpCue);
  state.audio.ribbitCue.playbackRate = 1;
  stopImpactCues(state);
  state.audio.impactCursor = 0;
  state.audio.lastImpactCue = null;
  state.audio.lastImpactCueIndex = null;
  state.audio.impactPlayCount = 0;
  state.audio.impactLastError = null;
  state.audio.lastPlayedLevel = null;
  state.audio.playCount = 0;
  state.audio.lastError = null;
  state.audio.snorePlayCount = 0;
  state.audio.snoreLastError = null;
  state.audio.ribbitPlayCount = 0;
  state.audio.ribbitLastError = null;
  state.audio.ribbitPlaybackRate = 1;
  state.audio.gulpPlayCount = 0;
  state.audio.gulpLastError = null;
  clearAnnouncementState(state);
  updateOverlay(state);
}

function startRound(state) {
  resetRound(state, "playing");
  startLevel(state, 1, true);
  syncUi(state);
  drawScene(state);
}

function startLevel(state, level, useAnnouncements) {
  const config = readLevelConfig(level);

  state.level = config.level;
  state.levelTimeRemaining = LEVEL_DURATION_SECONDS;
  state.wakefulness = STARTING_WAKEFULNESS;
  state.projectiles = [];
  state.particles = [];
  clearFloatingTexts(state);
  state.spoon.loaded = true;
  state.spoon.reloadProgress = 1;
  state.aim.angle = -0.82;
  state.aim.isCharging = false;
  state.aim.source = null;
  state.aim.chargeTimer = 0;
  state.aim.currentCharge = readChargeAmount(0);
  state.aim.pointerControlled = false;
  state.dad.nodPhase = 0;
  state.dad.recoil = 0;
  state.dad.snoreTimer = 0.7;
  state.hazards.locusts = createLocusts(state, config.locustCount);
  state.hazards.frogs = createFrogs(state, config.frogCount);

  if (useAnnouncements && config.announcements.length > 0) {
    startAnnouncementSequence(state, config.level, config.announcements, "playing");
    return;
  }

  playLevelStartCue(state, config.level);
  clearAnnouncementState(state);
  state.mode = "playing";
}

function completeLevel(state) {
  if (state.level >= LEVEL_DEFINITIONS.length) {
    enterVictory(state);
    return;
  }

  startLevel(state, state.level + 1, true);
}

function enterGameOver(state) {
  state.mode = "gameover";
  state.wakefulness = 0;
  state.projectiles = [];
  clearFloatingTexts(state);
  state.aim.isCharging = false;
  state.aim.source = null;
  stopAudioCue(state.audio.levelStartCue);
  playSnoreCue(state);
  clearAnnouncementState(state);
  updateOverlay(state);
  syncUi(state);
}

function enterVictory(state) {
  state.mode = "victory";
  state.levelTimeRemaining = 0;
  state.projectiles = [];
  clearFloatingTexts(state);
  state.hazards.locusts = [];
  state.hazards.frogs = [];
  state.aim.isCharging = false;
  state.aim.source = null;
  state.spoon.loaded = true;
  state.spoon.reloadProgress = 1;
  stopAudioCue(state.audio.snoreCue);
  playLevelStartCue(state, state.level);
  clearAnnouncementState(state);
  updateOverlay(state);
  syncUi(state);
}

function startAnnouncementSequence(state, level, cards, nextMode) {
  state.mode = "announcement";
  state.announcement.cards = cards.map((card) => ({
    kicker: card.kicker,
    title: card.title,
    body: card.body,
  }));
  state.announcement.index = 0;
  state.announcement.current = state.announcement.cards[0] || null;
  state.announcement.awaitingAdvance = true;
  state.announcement.nextMode = nextMode;
  playLevelStartCue(state, level);
}

function advanceAnnouncementCard(state) {
  if (state.mode !== "announcement" || !state.announcement.current) {
    return;
  }

  state.announcement.index += 1;

  if (state.announcement.index < state.announcement.cards.length) {
    state.announcement.current = state.announcement.cards[state.announcement.index];
    return;
  }

  const nextMode = state.announcement.nextMode;
  clearAnnouncementState(state);
  state.mode = nextMode || "playing";
}

function playLevelStartCue(state, level) {
  const cue = state.audio.levelStartCue;

  if (!(cue instanceof HTMLAudioElement)) {
    throw new Error("Sleepy Seder level-start audio failed to initialize.");
  }

  stopAudioCue(state.audio.snoreCue);
  state.audio.lastPlayedLevel = level;
  state.audio.playCount += 1;
  state.audio.lastError = null;
  stopAudioCue(cue);

  const playAttempt = cue.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      state.audio.lastError = String(error);
      console.error(`Sleepy Seder could not play Chad Gadya for level ${level}: ${String(error)}`);
    });
  }
}

function playSnoreCue(state) {
  const cue = state.audio.snoreCue;

  if (!(cue instanceof HTMLAudioElement)) {
    throw new Error("Sleepy Seder snore audio failed to initialize.");
  }

  state.audio.snorePlayCount += 1;
  state.audio.snoreLastError = null;
  stopAudioCue(cue);

  const playAttempt = cue.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      state.audio.snoreLastError = String(error);
      console.error(`Sleepy Seder could not play Snore.mp3: ${String(error)}`);
    });
  }
}

function playImpactCue(state) {
  const cueIndex = state.audio.impactCursor;
  const cue = state.audio.impactCues[cueIndex];
  const cueName = state.audio.impactCueNames[cueIndex];

  if (!(cue instanceof HTMLAudioElement) || typeof cueName !== "string") {
    throw new Error("Sleepy Seder impact audio failed to initialize.");
  }

  state.audio.impactCursor = (cueIndex + 1) % state.audio.impactCues.length;
  state.audio.lastImpactCue = cueName;
  state.audio.lastImpactCueIndex = cueIndex;
  state.audio.impactPlayCount += 1;
  state.audio.impactLastError = null;
  stopAudioCue(cue);

  const playAttempt = cue.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      state.audio.impactLastError = String(error);
      console.error(`Sleepy Seder could not play ${cueName}: ${String(error)}`);
    });
  }
}

function playRibbitCue(state) {
  const cue = state.audio.ribbitCue;

  if (!(cue instanceof HTMLAudioElement)) {
    throw new Error("Sleepy Seder Ribbit audio failed to initialize.");
  }

  const playbackRate = 1 + (nextRandom(state) * 2 - 1) * RIBBIT_PLAYBACK_RATE_VARIATION;
  state.audio.ribbitPlayCount += 1;
  state.audio.ribbitLastError = null;
  state.audio.ribbitPlaybackRate = playbackRate;
  stopAudioCue(cue);
  cue.playbackRate = playbackRate;

  const playAttempt = cue.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      state.audio.ribbitLastError = String(error);
      console.error(`Sleepy Seder could not play Ribbit.mp3: ${String(error)}`);
    });
  }
}

function playGulpCue(state) {
  const cue = state.audio.gulpCue;

  if (!(cue instanceof HTMLAudioElement)) {
    throw new Error("Sleepy Seder Gulp audio failed to initialize.");
  }

  state.audio.gulpPlayCount += 1;
  state.audio.gulpLastError = null;
  stopAudioCue(cue);

  const playAttempt = cue.play();

  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch((error) => {
      state.audio.gulpLastError = String(error);
      console.error(`Sleepy Seder could not play Gulp.mp3: ${String(error)}`);
    });
  }
}

function stopAudioCue(cue) {
  if (!(cue instanceof HTMLAudioElement)) {
    throw new Error("Expected a real HTMLAudioElement when resetting sleepy_seder audio.");
  }

  cue.pause();
  cue.currentTime = 0;
}

function stopImpactCues(state) {
  for (const cue of state.audio.impactCues) {
    stopAudioCue(cue);
  }
}

function clearFloatingTexts(state) {
  for (const floatingText of state.floatingTexts) {
    floatingText.textObject.destroy();
  }

  state.floatingTexts = [];
}

function clearAnnouncementState(state) {
  state.announcement.cards = [];
  state.announcement.index = 0;
  state.announcement.current = null;
  state.announcement.awaitingAdvance = false;
  state.announcement.nextMode = null;
}

function advanceFrame(state, deltaSeconds, isExternalStep) {
  if (!state.scene) {
    throw new Error("Cannot advance sleepy_seder before the scene is ready.");
  }

  processMetaInput(state);

  if (state.mode === "playing") {
    advancePlayingState(state, deltaSeconds);
  } else if (state.mode === "announcement") {
    advanceAnnouncementState(state, deltaSeconds);
  } else {
    advancePreviewState(state, deltaSeconds);
  }

  updateOverlay(state);
  syncUi(state);

  if (!isExternalStep) {
    drawScene(state);
  }
}

function advanceSimulationByMs(state, ms) {
  if (!state.scene) {
    throw new Error("window.advanceTime(ms) was called before sleepy_seder finished booting.");
  }

  const steps = ms > FIXED_STEP_MS ? Math.round(ms / FIXED_STEP_MS) : 1;

  for (let index = 0; index < steps; index += 1) {
    advanceFrame(state, FIXED_STEP_SECONDS, true);
  }

  drawScene(state);
  return renderGameToText(state);
}

function processMetaInput(state) {
  if (!state.controls) {
    throw new Error("Controls were not initialized before input processing.");
  }

  if (
    (state.mode === "menu" || state.mode === "gameover" || state.mode === "victory") &&
    Phaser.Input.Keyboard.JustDown(state.controls.enter)
  ) {
    startRound(state);
    return;
  }

  if (state.mode === "announcement" && Phaser.Input.Keyboard.JustDown(state.controls.enter)) {
    advanceAnnouncementCard(state);
    return;
  }

  if (state.mode !== "playing") {
    return;
  }

  if (Phaser.Input.Keyboard.JustDown(state.controls.space)) {
    beginCharge(state, "keyboard");
  }

  if (Phaser.Input.Keyboard.JustUp(state.controls.space)) {
    releaseShot(state);
  }
}

function advancePlayingState(state, deltaSeconds) {
  state.time += deltaSeconds;
  state.levelTimeRemaining -= deltaSeconds;
  updateAimFromKeyboard(state, deltaSeconds);
  updateReloadState(state, deltaSeconds);
  updateChargeState(state, deltaSeconds);
  updateHazards(state, deltaSeconds);
  updateDadState(state, deltaSeconds);
  updateProjectiles(state, deltaSeconds);
  updateParticles(state, deltaSeconds);
  updateFloatingTexts(state, deltaSeconds);
  state.wakefulness -= BASE_WAKE_DRAIN_PER_SECOND * readWakeDrainMultiplier(state) * deltaSeconds;

  if (state.wakefulness <= 0) {
    enterGameOver(state);
    return;
  }

  if (state.levelTimeRemaining <= 0) {
    completeLevel(state);
  }
}

function advanceAnnouncementState(state, deltaSeconds) {
  state.time += deltaSeconds;
  updateDadState(state, deltaSeconds);
  updateParticles(state, deltaSeconds);
  updateFloatingTexts(state, deltaSeconds);
}

function advancePreviewState(state, deltaSeconds) {
  state.time += deltaSeconds;
  updateDadState(state, deltaSeconds);
  updateParticles(state, deltaSeconds);
  updateFloatingTexts(state, deltaSeconds);
}

function updateAimFromKeyboard(state, deltaSeconds) {
  if (state.aim.pointerControlled && state.pointer.isDown) {
    return;
  }

  const direction = Number(anyKeyDown(state.controls.lowerKeys)) - Number(anyKeyDown(state.controls.raiseKeys));

  if (direction !== 0) {
    state.aim.angle += direction * AIM_SPEED * deltaSeconds;
    state.aim.pointerControlled = false;
  }
}

function updatePointerAim(state, pointer) {
  const layout = readLayout(state);
  const angle = Math.atan2(pointer.y - layout.spoonPivotY, pointer.x - layout.spoonPivotX);

  if (Number.isNaN(angle)) {
    throw new Error("Pointer aiming produced NaN in sleepy_seder.");
  }

  state.aim.angle = angle;
  state.aim.pointerControlled = true;
}

function beginCharge(state, source) {
  if (state.mode !== "playing" || state.aim.isCharging || !state.spoon.loaded) {
    return;
  }

  state.aim.isCharging = true;
  state.aim.source = source;
  state.aim.chargeTimer = 0;
  state.aim.currentCharge = readChargeAmount(0);
}

function updateChargeState(state, deltaSeconds) {
  if (!state.aim.isCharging) {
    return;
  }

  state.aim.chargeTimer += deltaSeconds;
  state.aim.currentCharge = readChargeAmount(state.aim.chargeTimer);
}

function updateReloadState(state, deltaSeconds) {
  if (state.spoon.loaded) {
    state.spoon.reloadProgress = 1;
    return;
  }

  if (state.aim.isCharging || !isSpoonInReloadZone(state)) {
    state.spoon.reloadProgress = 0;
    return;
  }

  state.spoon.reloadProgress += deltaSeconds / RELOAD_HOLD_SECONDS;

  if (state.spoon.reloadProgress >= 1) {
    state.spoon.loaded = true;
    state.spoon.reloadProgress = 1;
    spawnBurst(state, state.layout.bowlX, state.layout.bowlY, "star", 5);
  }
}

function releaseShot(state) {
  if (state.mode !== "playing" || !state.aim.isCharging || !state.spoon.loaded) {
    return;
  }

  const launchPoint = readSpoonTipPosition(state, state.aim.angle);
  const launchVelocity = readLaunchVelocity(state.aim.angle, state.aim.currentCharge);

  state.projectiles.push({
    x: launchPoint.x,
    y: launchPoint.y,
    vx: launchVelocity.vx,
    vy: launchVelocity.vy,
    radius: state.layout.spoonBowlRadius * 0.58,
    age: 0,
  });
  spawnBurst(state, launchPoint.x, launchPoint.y, "crumb", 5);
  state.spoon.loaded = false;
  state.spoon.reloadProgress = 0;
  state.aim.isCharging = false;
  state.aim.source = null;
  state.aim.chargeTimer = 0;
  state.aim.currentCharge = readChargeAmount(0);
}

function updateHazards(state, deltaSeconds) {
  updateLocusts(state, deltaSeconds);
  updateFrogs(state, deltaSeconds);
}

function updateLocusts(state, deltaSeconds) {
  const layout = readLayout(state);

  for (const locust of state.hazards.locusts) {
    if (locust.mode === "gone") {
      continue;
    }

    if (locust.mode === "splat") {
      locust.splatTimer -= deltaSeconds;

      if (locust.splatTimer <= 0) {
        locust.mode = "gone";
      }

      continue;
    }

    locust.phase += deltaSeconds * locust.phaseSpeed;
    locust.baseX += locust.vx * deltaSeconds;
    locust.y += locust.vy * deltaSeconds;

    if (locust.baseX < layout.locustMinX) {
      locust.baseX = layout.locustMinX;
      locust.vx = Math.abs(locust.vx);
    } else if (locust.baseX > layout.locustMaxX) {
      locust.baseX = layout.locustMaxX;
      locust.vx = -Math.abs(locust.vx);
    }

    if (locust.y < layout.locustMinY) {
      locust.y = layout.locustMinY;
      locust.vy = Math.abs(locust.vy);
    } else if (locust.y > layout.locustMaxY) {
      locust.y = layout.locustMaxY;
      locust.vy = -Math.abs(locust.vy);
    }

    const swayX = Math.sin(locust.phase) * locust.waveAmplitude + Math.cos(locust.phase * 0.55) * 6;
    locust.x = Math.min(layout.locustMaxX, Math.max(layout.locustMinX, locust.baseX + swayX));
  }
}

function updateFrogs(state, deltaSeconds) {
  for (const frog of state.hazards.frogs) {
    if (frog.catchFlash > 0) {
      frog.catchFlash -= deltaSeconds;

      if (frog.catchFlash < 0) {
        frog.catchFlash = 0;
      }
    }

    if (frog.tongue.active) {
      frog.tongue.elapsed += deltaSeconds;

      if (frog.tongue.elapsed >= frog.tongue.duration) {
        frog.tongue.active = false;
        frog.tongue.elapsed = 0;
        frog.attackCooldown = FROG_ATTACK_INTERVAL;
      }

      continue;
    }

    frog.attackCooldown -= deltaSeconds;

    if (frog.attackCooldown <= 0) {
      startFrogTongueAttack(state, frog);
    }
  }
}

function startFrogTongueAttack(state, frog) {
  const layout = readLayout(state);
  const horizontalStart = state.size.width * 0.34;
  const horizontalSpan = state.size.width * 0.42;
  const verticalStart = state.size.height * 0.04;
  const verticalEnd = state.size.height * 0.5;
  const verticalSpan = verticalEnd - verticalStart;

  frog.tongue.active = true;
  frog.tongue.elapsed = 0;
  frog.tongue.duration = FROG_TONGUE_DURATION;
  frog.tongue.targetX = horizontalStart + nextRandom(state) * horizontalSpan;
  frog.tongue.targetY = verticalStart + nextRandom(state) * verticalSpan;
  playRibbitCue(state);
}

function updateDadState(state, deltaSeconds) {
  const sleepiness = getSleepinessFactor(state);

  state.dad.nodPhase += deltaSeconds * (0.8 + sleepiness * 2.6);

  if (state.dad.recoil > 0) {
    state.dad.recoil -= deltaSeconds;

    if (state.dad.recoil < 0) {
      state.dad.recoil = 0;
    }
  }

  state.dad.snoreTimer -= deltaSeconds;

  if (state.dad.snoreTimer <= 0) {
    if ((state.mode === "playing" || state.mode === "announcement") && sleepiness > 0.45) {
      spawnSnore(state);
    } else if (state.mode === "menu" || state.mode === "gameover" || state.mode === "victory") {
      spawnSnore(state);
    }

    state.dad.snoreTimer = 1.05 - sleepiness * 0.38;
  }
}

function updateProjectiles(state, deltaSeconds) {
  const nextProjectiles = [];

  for (const projectile of state.projectiles) {
    projectile.age += deltaSeconds;
    projectile.x += projectile.vx * deltaSeconds;
    projectile.y += projectile.vy * deltaSeconds;
    projectile.vy += SHOT_GRAVITY * deltaSeconds;

    const result = resolveProjectile(state, projectile);

    if (result === "keep") {
      nextProjectiles.push(projectile);
    }
  }

  state.projectiles = nextProjectiles;
}

function resolveProjectile(state, projectile) {
  const layout = readLayout(state);
  const dadPose = readDadPose(state);

  if (resolveLocustCollision(state, projectile)) {
    return "consume";
  }

  if (resolveFrogTongueCollision(state, projectile)) {
    return "consume";
  }

  if (distanceBetween(projectile.x, projectile.y, dadPose.headX, dadPose.headY) <= dadPose.headRadius + projectile.radius) {
    registerHit(state, projectile, "head");
    return "consume";
  }

  if (
    Math.abs(projectile.x - dadPose.bodyX) <= dadPose.bodyWidth * 0.4 &&
    Math.abs(projectile.y - dadPose.bodyY) <= dadPose.bodyHeight * 0.46
  ) {
    registerHit(state, projectile, "body");
    return "consume";
  }

  if (projectile.y >= layout.tableTopY - projectile.radius * 0.35) {
    playImpactCue(state);
    spawnBurst(state, projectile.x, layout.tableTopY - projectile.radius, "crumb", 7);
    return "consume";
  }

  if (
    projectile.x > state.size.width + projectile.radius * 4 ||
    projectile.x < -projectile.radius * 4 ||
    projectile.y > state.size.height + projectile.radius * 4
  ) {
    return "consume";
  }

  return "keep";
}

function resolveLocustCollision(state, projectile) {
  for (const locust of state.hazards.locusts) {
    if (locust.mode !== "flying") {
      continue;
    }

    if (distanceBetween(projectile.x, projectile.y, locust.x, locust.y) > locust.radius + projectile.radius) {
      continue;
    }

    locust.mode = "splat";
    locust.x = projectile.x;
    locust.y = projectile.y;
    locust.splatTimer = LOCUST_SPLAT_SECONDS;
    playImpactCue(state);
    spawnBurst(state, projectile.x, projectile.y, "star", 5);
    spawnBurst(state, projectile.x, projectile.y, "crumb", 7);
    return true;
  }

  return false;
}

function resolveFrogTongueCollision(state, projectile) {
  for (const frog of state.hazards.frogs) {
    if (!frog.tongue.active) {
      continue;
    }

    const tongue = readFrogTongueState(frog);

    if (tongue.extension <= 0.28) {
      continue;
    }

    const mouth = readFrogMouthPosition(frog);
    const distance = distanceToSegment(projectile.x, projectile.y, mouth.x, mouth.y, tongue.tipX, tongue.tipY);

    if (distance > projectile.radius + frog.tongue.width * 0.5) {
      continue;
    }

    frog.tongue.active = false;
    frog.tongue.elapsed = 0;
    frog.attackCooldown = FROG_ATTACK_INTERVAL;
    frog.catchFlash = 0.4;
    playGulpCue(state);
    spawnBurst(state, projectile.x, projectile.y, "crumb", 6);
    return true;
  }

  return false;
}

function registerHit(state, projectile, target) {
  const isHeadshot = target === "head";

  state.bonks += 1;
  state.score += isHeadshot ? HEAD_HIT_SCORE : BODY_HIT_SCORE;
  state.wakefulness = Math.min(MAX_WAKEFULNESS, state.wakefulness + (isHeadshot ? HEAD_HIT_WAKE : BODY_HIT_WAKE));
  state.dad.recoil = isHeadshot ? 0.42 : 0.28;
  playImpactCue(state);
  if (isHeadshot) {
    spawnHeadshotText(state, projectile.x, projectile.y - state.layout.dadHeadRadius * 0.2);
  }
  spawnBurst(state, projectile.x, projectile.y, "star", isHeadshot ? 10 : 7);
  spawnBurst(state, projectile.x, projectile.y, "crumb", 8);
}

function updateParticles(state, deltaSeconds) {
  const nextParticles = [];

  for (const particle of state.particles) {
    particle.life -= deltaSeconds;

    if (particle.life <= 0) {
      continue;
    }

    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;

    if (particle.type === "crumb" || particle.type === "star") {
      particle.vy += SHOT_GRAVITY * 0.16 * deltaSeconds;
    }

    if (particle.type === "snore") {
      particle.vx += 6 * deltaSeconds;
      particle.vy -= 10 * deltaSeconds;
    }

    nextParticles.push(particle);
  }

  state.particles = nextParticles;
}

function updateFloatingTexts(state, deltaSeconds) {
  const nextFloatingTexts = [];

  for (const floatingText of state.floatingTexts) {
    floatingText.life -= deltaSeconds;

    if (floatingText.life <= 0) {
      floatingText.textObject.destroy();
      continue;
    }

    floatingText.x += floatingText.vx * deltaSeconds;
    floatingText.y += floatingText.vy * deltaSeconds;
    floatingText.textObject.setPosition(floatingText.x, floatingText.y);
    floatingText.textObject.setAlpha(floatingText.life / floatingText.maxLife);
    nextFloatingTexts.push(floatingText);
  }

  state.floatingTexts = nextFloatingTexts;
}

function spawnBurst(state, x, y, type, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + state.time * 0.3;
    const speed = type === "star" ? 70 + index * 8 : 40 + index * 6;
    const life = type === "star" ? 0.42 + index * 0.015 : 0.52 + index * 0.02;

    state.particles.push({
      type,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life,
      maxLife: life,
      radius: type === "star" ? 3 + (index % 2) : 2 + (index % 3),
    });
  }
}

function spawnSnore(state) {
  const dadPose = readDadPose(state);
  const size = 8 + (state.particles.length % 4);

  state.particles.push({
    type: "snore",
    x: dadPose.headX + state.layout.dadHeadRadius * 0.72,
    y: dadPose.headY - state.layout.dadHeadRadius * 0.15,
    vx: 18,
    vy: -32,
    life: 1.2,
    maxLife: 1.2,
    radius: size,
  });
}

function spawnHeadshotText(state, x, y) {
  if (!state.scene) {
    throw new Error("Cannot spawn a headshot label before the sleepy_seder scene exists.");
  }

  const textObject = state.scene.add.text(x, y, "HEADSHOT!", {
    fontFamily: "Georgia, serif",
    fontSize: `${Math.max(18, Math.round(state.size.height * 0.024))}px`,
    fontStyle: "700",
    color: "#b81422",
    stroke: "#fff2dc",
    strokeThickness: 3,
  });
  textObject.setOrigin(0.5);
  textObject.setDepth(14);

  state.floatingTexts.push({
    label: "HEADSHOT!",
    x,
    y,
    vx: 0,
    vy: -48,
    life: HEADSHOT_TEXT_LIFETIME,
    maxLife: HEADSHOT_TEXT_LIFETIME,
    textObject,
  });
}

function drawScene(state) {
  if (!state.graphics.backdrop || !state.graphics.world || !state.graphics.effects) {
    throw new Error("Cannot draw sleepy_seder before all graphics layers exist.");
  }

  state.graphics.backdrop.clear();
  state.graphics.world.clear();
  state.graphics.effects.clear();

  drawBackdrop(state.graphics.backdrop, state);
  drawTable(state.graphics.world, state);
  drawFrogBodies(state.graphics.world, state);
  drawDad(state.graphics.world, state);
  drawSpoon(state.graphics.world, state);
  drawProjectiles(state.graphics.world, state);
  drawLocusts(state.graphics.effects, state);
  drawFrogTongues(state.graphics.effects, state);
  drawAimGuide(state.graphics.effects, state);
  drawParticles(state.graphics.effects, state);
}

function drawBackdrop(graphics, state) {
  const { width, height } = state.size;
  const layout = readLayout(state);

  graphics.fillStyle(0x8fa4b3, 1);
  graphics.fillRect(0, 0, width, height);

  graphics.fillStyle(0x728899, 0.32);
  for (let column = 0; column < 12; column += 1) {
    for (let row = 0; row < 6; row += 1) {
      const x = width * 0.04 + column * (width * 0.08);
      const y = height * 0.08 + row * (height * 0.095);
      graphics.fillCircle(x, y, 3 + ((column + row) % 2));
    }
  }

  graphics.fillStyle(0x647988, 0.32);
  graphics.fillRect(0, 0, width, height * 0.06);

  graphics.fillStyle(0x6b1630, 1);
  graphics.fillRoundedRect(layout.windowX, layout.windowY, layout.windowWidth, layout.windowHeight, 26);
  graphics.fillStyle(0x0c2248, 1);
  graphics.fillRoundedRect(
    layout.windowX + layout.windowWidth * 0.06,
    layout.windowY + layout.windowHeight * 0.08,
    layout.windowWidth * 0.88,
    layout.windowHeight * 0.84,
    20
  );
  graphics.fillStyle(0xf8f3ce, 1);
  graphics.fillCircle(layout.windowX + layout.windowWidth * 0.66, layout.windowY + layout.windowHeight * 0.28, layout.windowWidth * 0.11);
  graphics.fillStyle(0xffde86, 0.14);
  graphics.fillCircle(layout.windowX + layout.windowWidth * 0.66, layout.windowY + layout.windowHeight * 0.28, layout.windowWidth * 0.22);

  graphics.lineStyle(4, 0xc6a567, 1);
  graphics.beginPath();
  graphics.moveTo(layout.windowX + layout.windowWidth * 0.5, layout.windowY + layout.windowHeight * 0.08);
  graphics.lineTo(layout.windowX + layout.windowWidth * 0.5, layout.windowY + layout.windowHeight * 0.92);
  graphics.moveTo(layout.windowX + layout.windowWidth * 0.06, layout.windowY + layout.windowHeight * 0.5);
  graphics.lineTo(layout.windowX + layout.windowWidth * 0.94, layout.windowY + layout.windowHeight * 0.5);
  graphics.strokePath();
}

function drawTable(graphics, state) {
  const { width, height } = state.size;
  const layout = readLayout(state);
  const canReload = state.mode === "playing" && !state.spoon.loaded && isSpoonInReloadZone(state);

  graphics.fillStyle(0x6d1830, 1);
  graphics.fillRoundedRect(-10, layout.tableclothY, width + 20, height - layout.tableclothY + 10, 28);

  graphics.fillStyle(0xf3e6ca, 0.94);
  graphics.fillRoundedRect(width * 0.2, layout.tableTopY - height * 0.032, width * 0.62, height * 0.095, 24);
  graphics.fillStyle(0xaa293f, 0.92);
  graphics.fillRoundedRect(width * 0.22, layout.tableTopY - height * 0.018, width * 0.58, height * 0.06, 22);

  drawLevelGlasses(graphics, state);

  graphics.fillStyle(0xf5ecd9, 1);
  graphics.fillCircle(layout.sederPlateX, layout.sederPlateY, layout.sederPlateRadius);
  graphics.fillStyle(0xd0bc96, 1);
  graphics.fillCircle(layout.sederPlateX, layout.sederPlateY, layout.sederPlateRadius * 0.76);

  const sederDots = [
    [0, -0.45, 0xe5e0a0],
    [0.34, -0.12, 0xc76939],
    [0.3, 0.3, 0x8a7a55],
    [-0.32, -0.16, 0x7ea55f],
    [-0.18, 0.33, 0xf2df8a],
    [0.02, 0.02, 0xd5a862],
  ];

  for (const [offsetX, offsetY, color] of sederDots) {
    graphics.fillStyle(color, 1);
    graphics.fillCircle(
      layout.sederPlateX + layout.sederPlateRadius * offsetX,
      layout.sederPlateY + layout.sederPlateRadius * offsetY,
      layout.sederPlateRadius * 0.19
    );
  }

  graphics.fillStyle(0xb49462, 1);
  graphics.fillCircle(layout.bowlX, layout.bowlY, layout.bowlRadius);
  graphics.fillStyle(0xe7d7b5, 1);
  graphics.fillCircle(layout.bowlX, layout.bowlY, layout.bowlRadius * 0.8);
  graphics.fillStyle(0xd8b86a, 1);
  graphics.fillCircle(layout.bowlX, layout.bowlY, layout.bowlRadius * 0.62);

  if (!state.spoon.loaded) {
    const alpha = canReload ? 0.18 + state.spoon.reloadProgress * 0.28 : 0.12;
    const radiusScale = canReload ? 1.05 + state.spoon.reloadProgress * 0.1 : 1;

    graphics.fillStyle(0xffd873, alpha);
    graphics.fillCircle(layout.bowlX, layout.bowlY, layout.bowlRadius * radiusScale);
  }

  const bowlOffsets = [
    [-0.28, 0.04],
    [0.1, -0.18],
    [0.28, 0.08],
    [-0.04, 0.24],
  ];

  for (const [offsetX, offsetY] of bowlOffsets) {
    graphics.fillStyle(0xf1e4c7, 1);
    graphics.fillCircle(
      layout.bowlX + layout.bowlRadius * offsetX,
      layout.bowlY + layout.bowlRadius * offsetY,
      layout.bowlRadius * 0.23
    );
  }

  drawCandle(graphics, layout.candleLeftX, layout.candleY);
  drawCandle(graphics, layout.candleRightX, layout.candleY - height * 0.008);
}

function drawLevelGlasses(graphics, state) {
  const layout = readLayout(state);
  const emptyCount = readEmptyGlassCount(state);

  for (let index = 0; index < 4; index += 1) {
    const glassX = layout.glassStartX + layout.glassSpacing * index;
    const isEmpty = index >= 4 - emptyCount;

    drawGoblet(graphics, glassX, layout.glassY, isEmpty, layout.glassScale);
  }
}

function drawGoblet(graphics, x, y, isEmpty, scale) {
  const bowlWidth = 34 * scale;
  const bowlHeight = 24 * scale;
  const wineWidth = 26 * scale;
  const wineHeight = 17 * scale;
  const stemWidth = 8 * scale;
  const stemHeight = 24 * scale;
  const baseWidth = 28 * scale;
  const baseHeight = 8 * scale;
  const shadowRadius = 32 * scale;

  if (!isEmpty) {
    graphics.fillStyle(0x8e1232, 0.26);
    graphics.fillCircle(x, y, shadowRadius);
  }

  graphics.fillStyle(0xf7ecda, 0.9);
  graphics.fillEllipse(x, y, bowlWidth, bowlHeight);

  if (isEmpty) {
    graphics.lineStyle(2, 0xd5c1a3, 0.7);
    graphics.beginPath();
    graphics.moveTo(x - wineWidth * 0.4, y + wineHeight * 0.08);
    graphics.lineTo(x + wineWidth * 0.42, y + wineHeight * 0.08);
    graphics.strokePath();
  } else {
    graphics.fillStyle(0x8f1531, 0.9);
    graphics.fillEllipse(x, y + scale, wineWidth, wineHeight);
  }

  graphics.fillStyle(0xf7ecda, 0.9);
  graphics.fillRect(x - stemWidth * 0.5, y + bowlHeight * 0.45, stemWidth, stemHeight);
  graphics.fillEllipse(x, y + bowlHeight * 1.45, baseWidth, baseHeight);
}

function drawCandle(graphics, x, y) {
  graphics.fillStyle(0xffd873, 0.18);
  graphics.fillCircle(x, y - 42, 30);
  graphics.fillStyle(0xf3ebde, 1);
  graphics.fillRoundedRect(x - 9, y - 34, 18, 46, 6);
  graphics.fillStyle(0xffcc54, 1);
  graphics.fillEllipse(x, y - 42, 12, 20);
}

function drawFrogBodies(graphics, state) {
  for (const frog of state.hazards.frogs) {
    const flashAlpha = frog.catchFlash > 0 ? 0.28 + frog.catchFlash * 0.6 : 0;

    if (flashAlpha > 0) {
      graphics.fillStyle(0xffd873, flashAlpha);
      graphics.fillCircle(frog.x, frog.y, frog.bodyRadius * 1.3);
    }

    graphics.fillStyle(0x5b8d3a, 1);
    graphics.fillEllipse(frog.x, frog.y, frog.bodyRadius * 2.2, frog.bodyRadius * 1.7);
    graphics.fillCircle(frog.x - frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.38);
    graphics.fillCircle(frog.x + frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.38);
    graphics.fillStyle(0x84b95a, 1);
    graphics.fillEllipse(frog.x, frog.y + frog.bodyRadius * 0.08, frog.bodyRadius * 1.4, frog.bodyRadius * 0.92);
    graphics.fillStyle(0xf8f3ce, 1);
    graphics.fillCircle(frog.x - frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.14);
    graphics.fillCircle(frog.x + frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.14);
    graphics.fillStyle(0x1e2d1b, 1);
    graphics.fillCircle(frog.x - frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.06);
    graphics.fillCircle(frog.x + frog.bodyRadius * 0.58, frog.y - frog.bodyRadius * 0.5, frog.bodyRadius * 0.06);
  }
}

function drawDad(graphics, state) {
  const layout = readLayout(state);
  const dadPose = readDadPose(state);
  const sleepiness = getSleepinessFactor(state);
  const eyeOpen = 1.1 - sleepiness * 0.78 + state.dad.recoil * 0.8;
  const isAsleep = state.mode === "gameover";
  const wakeRatio = state.mode === "gameover" ? 0 : state.wakefulness / MAX_WAKEFULNESS;
  const wakeBarColor = readWakeBarColor(wakeRatio);
  const wakeBarWidth = dadPose.headRadius * 2.2;
  const wakeBarHeight = dadPose.headRadius * 0.36;
  const wakeBarX = dadPose.headX - wakeBarWidth * 0.5;
  const wakeBarY = dadPose.headY - dadPose.headRadius * 1.82;
  const wakeFillWidth = wakeBarWidth * wakeRatio;
  const wakeBarRadius = wakeBarHeight * 0.5;

  graphics.fillStyle(0x3d0d15, 0.72);
  graphics.fillRoundedRect(
    wakeBarX - 3,
    wakeBarY - 3,
    wakeBarWidth + 6,
    wakeBarHeight + 6,
    wakeBarRadius + 3
  );
  graphics.fillStyle(0x6b1622, 0.95);
  graphics.fillRoundedRect(wakeBarX, wakeBarY, wakeBarWidth, wakeBarHeight, wakeBarRadius);

  if (wakeFillWidth > 0) {
    graphics.fillStyle(wakeBarColor, 1);
    graphics.fillRoundedRect(wakeBarX, wakeBarY, wakeFillWidth, wakeBarHeight, wakeBarRadius);
  }

  graphics.fillStyle(0x6b4b2b, 0.58);
  graphics.fillRoundedRect(
    layout.dadSeatX - layout.chairWidth * 0.48,
    layout.dadSeatY - layout.chairHeight * 0.78,
    layout.chairWidth,
    layout.chairHeight,
    18
  );

  graphics.fillStyle(0x203247, 1);
  graphics.fillRoundedRect(
    dadPose.bodyX - dadPose.bodyWidth * 0.46,
    dadPose.bodyY - dadPose.bodyHeight * 0.48,
    dadPose.bodyWidth * 0.92,
    dadPose.bodyHeight,
    22
  );
  graphics.fillStyle(0xf4ebdd, 1);
  graphics.fillRoundedRect(
    dadPose.bodyX - dadPose.bodyWidth * 0.14,
    dadPose.bodyY - dadPose.bodyHeight * 0.42,
    dadPose.bodyWidth * 0.28,
    dadPose.bodyHeight * 0.74,
    12
  );
  graphics.fillStyle(0x7f1931, 1);
  graphics.fillTriangle(
    dadPose.bodyX,
    dadPose.bodyY - dadPose.bodyHeight * 0.18,
    dadPose.bodyX - dadPose.bodyWidth * 0.08,
    dadPose.bodyY + dadPose.bodyHeight * 0.18,
    dadPose.bodyX + dadPose.bodyWidth * 0.08,
    dadPose.bodyY + dadPose.bodyHeight * 0.18
  );

  graphics.fillStyle(0xe8bf91, 1);
  graphics.fillCircle(dadPose.headX, dadPose.headY, dadPose.headRadius);
  graphics.fillStyle(0x4a1b1d, 1);
  graphics.fillEllipse(dadPose.headX, dadPose.headY - dadPose.headRadius * 0.88, dadPose.headRadius * 1.3, dadPose.headRadius * 0.55);

  if (isAsleep) {
    graphics.lineStyle(3, 0x322220, 1);
    graphics.beginPath();
    graphics.moveTo(dadPose.headX - dadPose.headRadius * 0.38, dadPose.headY - dadPose.headRadius * 0.02);
    graphics.lineTo(dadPose.headX - dadPose.headRadius * 0.1, dadPose.headY - dadPose.headRadius * 0.02);
    graphics.moveTo(dadPose.headX + dadPose.headRadius * 0.1, dadPose.headY - dadPose.headRadius * 0.02);
    graphics.lineTo(dadPose.headX + dadPose.headRadius * 0.38, dadPose.headY - dadPose.headRadius * 0.02);
    graphics.strokePath();
  } else {
    graphics.fillStyle(0x322220, 1);
    graphics.fillEllipse(
      dadPose.headX - dadPose.headRadius * 0.24,
      dadPose.headY,
      dadPose.headRadius * 0.12,
      dadPose.headRadius * 0.07 + dadPose.headRadius * 0.18 * eyeOpen
    );
    graphics.fillEllipse(
      dadPose.headX + dadPose.headRadius * 0.24,
      dadPose.headY,
      dadPose.headRadius * 0.12,
      dadPose.headRadius * 0.07 + dadPose.headRadius * 0.18 * eyeOpen
    );
  }

  graphics.lineStyle(3, 0x8e4f3d, 1);
  graphics.beginPath();
  graphics.moveTo(dadPose.headX - dadPose.headRadius * 0.18, dadPose.headY + dadPose.headRadius * 0.34);
  graphics.lineTo(dadPose.headX + dadPose.headRadius * 0.22, dadPose.headY + dadPose.headRadius * 0.42);
  graphics.strokePath();

  graphics.fillStyle(0xe8bf91, 1);
  graphics.fillCircle(dadPose.bodyX - dadPose.bodyWidth * 0.48, dadPose.bodyY + dadPose.bodyHeight * 0.08, dadPose.bodyWidth * 0.09);
  graphics.fillCircle(dadPose.bodyX + dadPose.bodyWidth * 0.48, dadPose.bodyY + dadPose.bodyHeight * 0.06, dadPose.bodyWidth * 0.09);
}

function readWakeBarColor(wakeRatio) {
  if (wakeRatio <= 0.1) {
    return 0xc61e2d;
  }

  if (wakeRatio <= 0.5) {
    return interpolateRgbColor(0xc61e2d, 0xd6c93a, (wakeRatio - 0.1) / 0.4);
  }

  return interpolateRgbColor(0xd6c93a, 0x2ea84e, (wakeRatio - 0.5) / 0.5);
}

function interpolateRgbColor(startColor, endColor, progress) {
  const startR = (startColor >> 16) & 0xff;
  const startG = (startColor >> 8) & 0xff;
  const startB = startColor & 0xff;
  const endR = (endColor >> 16) & 0xff;
  const endG = (endColor >> 8) & 0xff;
  const endB = endColor & 0xff;
  const currentR = Math.round(startR + (endR - startR) * progress);
  const currentG = Math.round(startG + (endG - startG) * progress);
  const currentB = Math.round(startB + (endB - startB) * progress);

  return (currentR << 16) | (currentG << 8) | currentB;
}

function drawSpoon(graphics, state) {
  const layout = readLayout(state);
  const visualAngle = readVisualSpoonAngle(state);
  const spoonTip = readSpoonTipPosition(state, visualAngle);
  const charge = state.spoon.loaded ? readDisplayedCharge(state) : 0;
  const canReload = state.mode === "playing" && !state.spoon.loaded && isSpoonInReloadZone(state);

  graphics.fillStyle(0xb98a48, 1);
  graphics.fillCircle(layout.spoonPivotX, layout.spoonPivotY, layout.spoonBowlRadius * 0.45);
  graphics.lineStyle(layout.spoonBowlRadius * 0.72, 0xc29659, 1);
  graphics.beginPath();
  graphics.moveTo(layout.spoonPivotX, layout.spoonPivotY);
  graphics.lineTo(spoonTip.x, spoonTip.y);
  graphics.strokePath();

  graphics.fillStyle(0xe1c58f, 1);
  graphics.fillEllipse(spoonTip.x, spoonTip.y, layout.spoonBowlRadius * 2.3, layout.spoonBowlRadius * 1.7);

  if (state.spoon.loaded) {
    graphics.fillStyle(0xf1e4c7, 1);
    graphics.fillCircle(spoonTip.x, spoonTip.y, layout.spoonBowlRadius * 0.58);
  } else {
    graphics.fillStyle(canReload ? 0xd8b86a : 0xc49c5d, 1);
    graphics.fillEllipse(spoonTip.x, spoonTip.y, layout.spoonBowlRadius * 1.22, layout.spoonBowlRadius * 0.72);
  }

  graphics.fillStyle(0xffd873, state.spoon.loaded ? 0.15 + charge * 0.22 : 0.08 + state.spoon.reloadProgress * 0.18);
  graphics.fillCircle(layout.spoonPivotX, layout.spoonPivotY, layout.spoonLength * (0.18 + charge * 0.08));
}

function drawProjectiles(graphics, state) {
  for (const projectile of state.projectiles) {
    graphics.fillStyle(0xe1c692, 0.36);
    graphics.fillCircle(projectile.x + 4, projectile.y + 5, projectile.radius);
    graphics.fillStyle(0xf2e3c4, 1);
    graphics.fillCircle(projectile.x, projectile.y, projectile.radius);
    graphics.lineStyle(2, 0xd9c59b, 1);
    graphics.beginPath();
    graphics.moveTo(projectile.x - projectile.radius * 0.46, projectile.y - projectile.radius * 0.12);
    graphics.lineTo(projectile.x + projectile.radius * 0.38, projectile.y + projectile.radius * 0.1);
    graphics.strokePath();
  }
}

function drawLocusts(graphics, state) {
  for (const locust of state.hazards.locusts) {
    if (locust.mode === "gone") {
      continue;
    }

    if (locust.mode === "splat") {
      const alpha = locust.splatTimer / LOCUST_SPLAT_SECONDS;

      graphics.fillStyle(0x56753d, alpha);
      graphics.fillCircle(locust.x, locust.y, locust.radius * 1.15);
      graphics.fillCircle(locust.x - locust.radius * 0.7, locust.y + locust.radius * 0.18, locust.radius * 0.46);
      graphics.fillCircle(locust.x + locust.radius * 0.6, locust.y - locust.radius * 0.12, locust.radius * 0.42);
      graphics.fillStyle(0x33291d, alpha * 0.9);
      graphics.fillCircle(locust.x - locust.radius * 0.2, locust.y - locust.radius * 0.24, locust.radius * 0.2);
      graphics.fillCircle(locust.x + locust.radius * 0.26, locust.y + locust.radius * 0.3, locust.radius * 0.18);
      continue;
    }

    const wingAlpha = 0.22 + 0.14 * (0.5 + 0.5 * Math.sin(locust.phase * 3.4));

    graphics.fillStyle(0xd3d6cb, wingAlpha);
    graphics.fillEllipse(locust.x - locust.radius * 0.4, locust.y - locust.radius * 0.18, locust.radius * 1.05, locust.radius * 0.55);
    graphics.fillEllipse(locust.x + locust.radius * 0.38, locust.y - locust.radius * 0.14, locust.radius * 1.05, locust.radius * 0.55);
    graphics.fillStyle(0x56753d, 1);
    graphics.fillEllipse(locust.x, locust.y, locust.radius * 1.2, locust.radius * 0.72);
    graphics.fillCircle(locust.x + locust.radius * 0.68, locust.y - locust.radius * 0.08, locust.radius * 0.26);

    graphics.lineStyle(2, 0x33291d, 0.9);
    graphics.beginPath();
    graphics.moveTo(locust.x - locust.radius * 0.1, locust.y + locust.radius * 0.2);
    graphics.lineTo(locust.x - locust.radius * 0.6, locust.y + locust.radius * 0.6);
    graphics.moveTo(locust.x + locust.radius * 0.12, locust.y + locust.radius * 0.22);
    graphics.lineTo(locust.x + locust.radius * 0.58, locust.y + locust.radius * 0.62);
    graphics.strokePath();
  }
}

function drawFrogTongues(graphics, state) {
  for (const frog of state.hazards.frogs) {
    if (!frog.tongue.active) {
      continue;
    }

    const mouth = readFrogMouthPosition(frog);
    const tongue = readFrogTongueState(frog);

    graphics.lineStyle(frog.tongue.width, 0xd97c8d, 0.94);
    graphics.beginPath();
    graphics.moveTo(mouth.x, mouth.y);
    graphics.lineTo(tongue.tipX, tongue.tipY);
    graphics.strokePath();
    graphics.fillStyle(0xe8a7b2, 0.92);
    graphics.fillCircle(tongue.tipX, tongue.tipY, frog.tongue.width * 0.52);
  }
}

function drawAimGuide(graphics, state) {
  if (state.mode === "gameover" || state.mode === "victory" || (state.mode === "playing" && !state.spoon.loaded)) {
    return;
  }

  const angle = state.mode === "playing" ? state.aim.angle : readVisualSpoonAngle(state);
  const charge = readDisplayedCharge(state);
  const origin = readSpoonTipPosition(state, angle);
  const velocity = readLaunchVelocity(angle, charge);

  for (let index = 1; index <= 6; index += 1) {
    const t = index * 0.18;
    const x = origin.x + velocity.vx * t;
    const y = origin.y + velocity.vy * t + 0.5 * SHOT_GRAVITY * t * t;
    const radius = 5 - index * 0.45;
    const alpha = 0.3 + charge * 0.25 - index * 0.03;

    graphics.fillStyle(0x8f1531, alpha);
    graphics.fillCircle(x, y, radius);
  }
}

function drawParticles(graphics, state) {
  for (const particle of state.particles) {
    const alpha = particle.life / particle.maxLife;

    if (particle.type === "crumb") {
      graphics.fillStyle(0xf2e3c4, alpha);
      graphics.fillCircle(particle.x, particle.y, particle.radius);
      continue;
    }

    if (particle.type === "star") {
      graphics.lineStyle(2, 0xffd873, alpha);
      graphics.beginPath();
      graphics.moveTo(particle.x - particle.radius, particle.y);
      graphics.lineTo(particle.x + particle.radius, particle.y);
      graphics.moveTo(particle.x, particle.y - particle.radius);
      graphics.lineTo(particle.x, particle.y + particle.radius);
      graphics.strokePath();
      continue;
    }

    if (particle.type === "snore") {
      graphics.lineStyle(3, 0x6b1630, alpha);
      graphics.beginPath();
      graphics.moveTo(particle.x - particle.radius * 0.45, particle.y - particle.radius * 0.55);
      graphics.lineTo(particle.x + particle.radius * 0.45, particle.y - particle.radius * 0.55);
      graphics.lineTo(particle.x - particle.radius * 0.35, particle.y + particle.radius * 0.05);
      graphics.lineTo(particle.x + particle.radius * 0.35, particle.y + particle.radius * 0.05);
      graphics.lineTo(particle.x - particle.radius * 0.45, particle.y + particle.radius * 0.6);
      graphics.lineTo(particle.x + particle.radius * 0.45, particle.y + particle.radius * 0.6);
      graphics.strokePath();
    }
  }
}

function updateOverlay(state) {
  if (state.mode === "playing") {
    state.dom.overlay.classList.add("is-hidden");
    return;
  }

  state.dom.overlay.classList.remove("is-hidden");

  if (state.mode === "menu") {
    state.dom.overlayKicker.textContent = "Matzo Ball Emergency";
    state.dom.overlayTitle.textContent = "Keep Dad Awake For Four Levels";
    state.dom.overlayBody.textContent =
      "Survive four 20-second seder levels. Wake Dad up with matzo balls, refill from the soup bowl, and deal with each new plague as another glass empties.";
    state.dom.overlayAction.textContent = "Press Enter or tap the table to begin";
    return;
  }

  if (state.mode === "announcement" && state.announcement.current) {
    state.dom.overlayKicker.textContent = state.announcement.current.kicker;
    state.dom.overlayTitle.textContent = state.announcement.current.title;
    state.dom.overlayBody.textContent = state.announcement.current.body;
    state.dom.overlayAction.textContent = "Click or press Enter to continue";
    return;
  }

  if (state.mode === "victory") {
    state.dom.overlayKicker.textContent = "Dayenu";
    state.dom.overlayTitle.textContent = "Seder Saved";
    state.dom.overlayBody.textContent =
      "All four glasses are empty, every level is behind you, and Dad made it through the whole seder awake enough to finish.";
    state.dom.overlayAction.textContent = "Press Enter or tap the table to play again";
    return;
  }

  state.dom.overlayKicker.textContent = `Level ${state.level}`;
  state.dom.overlayTitle.textContent = "Dad Dozed Off";
  state.dom.overlayBody.textContent =
    "The nodding finally won before the level timer ran out. Restart and try to get through all four glasses.";
  state.dom.overlayAction.textContent = "Press Enter or tap the table to try again";
}

function syncUi(state) {
  state.dom.modeValue.textContent = readModeLabel(state.mode);
  state.dom.levelValue.textContent = `${state.level} / ${LEVEL_DEFINITIONS.length}`;
  state.dom.timeValue.textContent = `${Math.ceil(state.levelTimeRemaining)}s`;
  state.dom.wakeValue.textContent = state.mode === "gameover" ? "0" : String(Math.round(Math.min(MAX_WAKEFULNESS, state.wakefulness)));
  state.dom.scoreValue.textContent = String(state.score);
  state.dom.hitsValue.textContent = String(state.bonks);
}

function renderGameToText(state) {
  const dadPose = readDadPose(state);
  const locustCounts = readLocustCounts(state);
  const payload = {
    mode: state.mode,
    level: state.level,
    levelTimeRemaining: roundNumber(state.levelTimeRemaining, 1),
    wakefulness: roundNumber(state.wakefulness, 1),
    score: state.score,
    bonks: state.bonks,
    emptyGlasses: readEmptyGlassCount(state),
    threatLabel: readLevelConfig(state.level).threatLabel,
    dadState: describeDadState(state),
    announcement: state.announcement.current
      ? {
          title: state.announcement.current.title,
          awaitingAdvance: state.announcement.awaitingAdvance,
          cardIndex: state.announcement.index + 1,
          cardCount: state.announcement.cards.length,
        }
      : null,
    aim: {
      angle: roundNumber(state.aim.angle, 3),
      charge: roundNumber(readDisplayedCharge(state), 3),
      charging: state.aim.isCharging,
      loaded: state.spoon.loaded,
      reloadProgress: roundNumber(state.spoon.reloadProgress, 3),
      reloadEligible: isSpoonInReloadZone(state),
    },
    dadPose: {
      headX: roundNumber(dadPose.headX, 1),
      headY: roundNumber(dadPose.headY, 1),
      bodyX: roundNumber(dadPose.bodyX, 1),
      bodyY: roundNumber(dadPose.bodyY, 1),
    },
    locusts: locustCounts,
    frogs: {
      count: state.hazards.frogs.length,
      tonguesActive: state.hazards.frogs.filter((frog) => frog.tongue.active).length,
    },
    floatingTexts: state.floatingTexts.map((floatingText) => ({
      label: floatingText.label,
      x: roundNumber(floatingText.x, 1),
      y: roundNumber(floatingText.y, 1),
      life: roundNumber(floatingText.life, 2),
    })),
    audio: {
      playing: !state.audio.levelStartCue.paused,
      currentTime: roundNumber(state.audio.levelStartCue.currentTime, 2),
      lastPlayedLevel: state.audio.lastPlayedLevel,
      playCount: state.audio.playCount,
      lastError: state.audio.lastError,
      snorePlaying: !state.audio.snoreCue.paused,
      snoreCurrentTime: roundNumber(state.audio.snoreCue.currentTime, 2),
      snorePlayCount: state.audio.snorePlayCount,
      snoreLastError: state.audio.snoreLastError,
      ribbitPlaying: !state.audio.ribbitCue.paused,
      ribbitCurrentTime: roundNumber(state.audio.ribbitCue.currentTime, 2),
      ribbitPlayCount: state.audio.ribbitPlayCount,
      ribbitLastError: state.audio.ribbitLastError,
      ribbitPlaybackRate: roundNumber(state.audio.ribbitPlaybackRate, 3),
      gulpPlaying: !state.audio.gulpCue.paused,
      gulpCurrentTime: roundNumber(state.audio.gulpCue.currentTime, 2),
      gulpPlayCount: state.audio.gulpPlayCount,
      gulpLastError: state.audio.gulpLastError,
      impactPlaying: state.audio.impactCues.some((cue) => !cue.paused),
      lastImpactCue: state.audio.lastImpactCue,
      lastImpactCurrentTime:
        state.audio.lastImpactCueIndex === null ? 0 : roundNumber(state.audio.impactCues[state.audio.lastImpactCueIndex].currentTime, 2),
      impactPlayCount: state.audio.impactPlayCount,
      impactLastError: state.audio.impactLastError,
    },
    projectileCount: state.projectiles.length,
    projectiles: state.projectiles.map((projectile) => ({
      x: roundNumber(projectile.x, 1),
      y: roundNumber(projectile.y, 1),
      vx: roundNumber(projectile.vx, 1),
      vy: roundNumber(projectile.vy, 1),
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function createLocusts(state, count) {
  const locusts = [];
  const layout = readLayout(state);
  const spanX = layout.locustMaxX - layout.locustMinX;
  const spanY = layout.locustMaxY - layout.locustMinY;

  for (let index = 0; index < count; index += 1) {
    const startX = layout.locustMinX + spanX * (0.1 + 0.16 * index);
    const startY = layout.locustMinY + spanY * (0.08 + 0.2 * index);
    const direction = index % 2 === 0 ? 1 : -1;
    const verticalDirection = index % 3 === 0 ? 1 : -1;

    locusts.push({
      mode: "flying",
      x: startX,
      y: startY,
      baseX: startX,
      vx: direction * (22 + index * 4),
      vy: verticalDirection * (126 + index * 10),
      phase: nextRandom(state) * Math.PI * 2,
      phaseSpeed: 2 + nextRandom(state) * 0.7,
      waveAmplitude: 10 + nextRandom(state) * 8,
      radius: 12 + (index % 2),
      splatTimer: 0,
    });
  }

  return locusts;
}

function createFrogs(state, count) {
  const layout = readLayout(state);
  const frogs = [];
  const positions = readFrogPositions(layout, count);

  for (let index = 0; index < count; index += 1) {
    frogs.push({
      x: positions[index],
      y: layout.frogY,
      bodyRadius: layout.frogBodyRadius,
      catchFlash: 0,
      attackCooldown: 1.2 + index * 1.5,
      tongue: {
        active: false,
        elapsed: 0,
        duration: FROG_TONGUE_DURATION,
        targetX: positions[index] - state.size.width * 0.08,
        targetY: layout.frogY - state.size.height * 0.18,
        width: layout.frogBodyRadius * 0.34,
      },
    });
  }

  return frogs;
}

function readFrogPositions(layout, count) {
  if (count <= 0) {
    return [];
  }

  if (count === 1) {
    return [(layout.frogLaneStartX + layout.frogLaneEndX) * 0.5];
  }

  if (count === 2) {
    return [layout.frogLeftX, layout.frogRightX];
  }

  const spacing = (layout.frogLaneEndX - layout.frogLaneStartX) / (count - 1);
  return Array.from({ length: count }, (_unused, index) => layout.frogLaneStartX + spacing * index);
}

function readDadPose(state) {
  const layout = readLayout(state);
  const sleepiness = getSleepinessFactor(state);
  const slump = sleepiness * state.size.height * 0.042 + (state.mode === "gameover" ? state.size.height * 0.018 : 0);
  const sway = Math.sin(state.dad.nodPhase) * state.size.height * 0.012 * (0.4 + sleepiness);
  const lean = Math.sin(state.dad.nodPhase * 0.5 + 0.3) * state.size.width * 0.012 * sleepiness - state.dad.recoil * state.size.width * 0.02;

  return {
    headX: layout.dadSeatX + lean,
    headY: layout.dadSeatY - layout.dadBodyHeight * 0.8 + slump + sway - state.dad.recoil * state.size.height * 0.018,
    headRadius: layout.dadHeadRadius,
    bodyX: layout.dadSeatX + lean * 0.18,
    bodyY: layout.dadSeatY - layout.dadBodyHeight * 0.18 + slump * 0.18,
    bodyWidth: layout.dadBodyWidth,
    bodyHeight: layout.dadBodyHeight,
  };
}

function readVisualSpoonAngle(state) {
  if (state.mode === "menu") {
    return state.aim.angle + Math.sin(state.time * 1.6) * 0.08;
  }

  if (state.mode === "gameover") {
    return state.aim.angle - 0.22;
  }

  if (state.mode === "victory") {
    return state.aim.angle + 0.12;
  }

  return state.aim.angle;
}

function readSpoonTipPosition(state, angle) {
  const layout = readLayout(state);

  return {
    x: layout.spoonPivotX + Math.cos(angle) * layout.spoonLength,
    y: layout.spoonPivotY + Math.sin(angle) * layout.spoonLength,
  };
}

function readLaunchVelocity(angle, charge) {
  const speed = BASE_SHOT_SPEED + BONUS_SHOT_SPEED * charge;

  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function readChargeAmount(timer) {
  return 0.18 + 0.82 * (0.5 + 0.5 * Math.sin(timer * 5.4 - Math.PI / 2));
}

function readDisplayedCharge(state) {
  if (state.mode === "playing" && !state.spoon.loaded) {
    return 0;
  }

  if (state.aim.isCharging) {
    return state.aim.currentCharge;
  }

  return 0.42 + 0.2 * (0.5 + 0.5 * Math.sin(state.time * 2.2));
}

function isSpoonInReloadZone(state) {
  if (state.mode !== "playing" || state.spoon.loaded) {
    return false;
  }

  const layout = readLayout(state);
  const spoonTip = readSpoonTipPosition(state, state.aim.angle);

  if (state.aim.angle < RELOAD_MIN_ANGLE || state.aim.angle > RELOAD_MAX_ANGLE) {
    return false;
  }

  return distanceBetween(spoonTip.x, spoonTip.y, layout.bowlX, layout.bowlY) <= layout.bowlRadius * 0.8;
}

function getSleepinessFactor(state) {
  if (state.mode === "menu") {
    return 0.56 + 0.08 * Math.sin(state.time * 0.9);
  }

  if (state.mode === "gameover") {
    return 1.02;
  }

  if (state.mode === "victory") {
    return 0.28 + 0.06 * Math.sin(state.time * 0.9);
  }

  return 1 / (1 + Math.exp((state.wakefulness - 26) * 0.09));
}

function describeDadState(state) {
  if (state.mode === "gameover") {
    return "asleep";
  }

  if (state.mode === "victory") {
    return "awake";
  }

  const sleepiness = getSleepinessFactor(state);

  if (sleepiness > 0.76) {
    return "snoring";
  }

  if (sleepiness > 0.5) {
    return "drooping";
  }

  return "awake-ish";
}

function readModeLabel(mode) {
  if (mode === "menu") {
    return "Menu";
  }

  if (mode === "announcement") {
    return "Briefing";
  }

  if (mode === "gameover") {
    return "Asleep";
  }

  if (mode === "victory") {
    return "Saved";
  }

  return "Live";
}

function readLevelConfig(level) {
  const config = LEVEL_DEFINITIONS.find((entry) => entry.level === level);

  if (!config) {
    throw new Error(`No sleepy_seder level config exists for level ${level}.`);
  }

  return config;
}

function readWakeDrainMultiplier(state) {
  return 1 + (state.level - 1) * LEVEL_DRAIN_STEP;
}

function readEmptyGlassCount(state) {
  if (state.mode === "victory") {
    return LEVEL_DEFINITIONS.length;
  }

  return state.level;
}

function readLocustCounts(state) {
  return {
    flying: state.hazards.locusts.filter((locust) => locust.mode === "flying").length,
    splatted: state.hazards.locusts.filter((locust) => locust.mode === "splat").length,
    gone: state.hazards.locusts.filter((locust) => locust.mode === "gone").length,
  };
}

function readFrogMouthPosition(frog) {
  return {
    x: frog.x,
    y: frog.y - frog.bodyRadius * 0.06,
  };
}

function readFrogTongueState(frog) {
  if (!frog.tongue.active) {
    return {
      extension: 0,
      tipX: frog.tongue.targetX,
      tipY: frog.tongue.targetY,
    };
  }

  const phase = frog.tongue.elapsed / frog.tongue.duration;
  const extension = Math.sin(phase * Math.PI);
  const mouth = readFrogMouthPosition(frog);

  return {
    extension,
    tipX: mouth.x + (frog.tongue.targetX - mouth.x) * extension,
    tipY: mouth.y + (frog.tongue.targetY - mouth.y) * extension,
  };
}

function realignHazardsToLayout(state) {
  const layout = readLayout(state);
  const frogPositions = readFrogPositions(layout, state.hazards.frogs.length);

  for (const locust of state.hazards.locusts) {
    if (locust.mode === "gone") {
      continue;
    }

    locust.baseX = Math.min(layout.locustMaxX, Math.max(layout.locustMinX, locust.baseX ?? locust.x));
    locust.x = Math.min(layout.locustMaxX, Math.max(layout.locustMinX, locust.x));
    locust.y = Math.min(layout.locustMaxY, Math.max(layout.locustMinY, locust.y));
  }

  for (let index = 0; index < state.hazards.frogs.length; index += 1) {
    const frog = state.hazards.frogs[index];

    frog.x = frogPositions[index] || frog.x;
    frog.y = layout.frogY;
    frog.bodyRadius = layout.frogBodyRadius;
    frog.tongue.width = layout.frogBodyRadius * 0.34;
  }
}

function nextRandom(state) {
  state.randomSeed = (1664525 * state.randomSeed + 1013904223) >>> 0;
  return state.randomSeed / 0x100000000;
}

function anyKeyDown(keys) {
  return keys.some((key) => key.isDown);
}

function distanceBetween(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;

  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return distanceBetween(px, py, x1, y1);
  }

  const projection = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;

  if (projection <= 0) {
    return distanceBetween(px, py, x1, y1);
  }

  if (projection >= 1) {
    return distanceBetween(px, py, x2, y2);
  }

  const closestX = x1 + dx * projection;
  const closestY = y1 + dy * projection;

  return distanceBetween(px, py, closestX, closestY);
}

function roundNumber(value, digits) {
  return Number(value.toFixed(digits));
}

function readLayout(state) {
  if (!state.layout) {
    throw new Error("Sleepy Seder layout was not initialized before use.");
  }

  return state.layout;
}

function readDomReferences(doc) {
  const gameRoot = doc.getElementById("game-root");
  const overlay = doc.getElementById("overlay");
  const overlayKicker = doc.getElementById("overlay-kicker");
  const overlayTitle = doc.getElementById("overlay-title");
  const overlayBody = doc.getElementById("overlay-body");
  const overlayAction = doc.getElementById("overlay-action");
  const modeValue = doc.getElementById("mode-value");
  const levelValue = doc.getElementById("level-value");
  const timeValue = doc.getElementById("time-value");
  const wakeValue = doc.getElementById("wake-value");
  const scoreValue = doc.getElementById("score-value");
  const hitsValue = doc.getElementById("hits-value");

  if (!(gameRoot instanceof HTMLDivElement)) {
    throw new Error("Expected #game-root to exist and be a div element.");
  }

  if (!(overlay instanceof HTMLElement)) {
    throw new Error("Expected #overlay to exist.");
  }

  if (!(overlayKicker instanceof HTMLElement)) {
    throw new Error("Expected #overlay-kicker to exist.");
  }

  if (!(overlayTitle instanceof HTMLElement)) {
    throw new Error("Expected #overlay-title to exist.");
  }

  if (!(overlayBody instanceof HTMLElement)) {
    throw new Error("Expected #overlay-body to exist.");
  }

  if (!(overlayAction instanceof HTMLElement)) {
    throw new Error("Expected #overlay-action to exist.");
  }

  if (!(modeValue instanceof HTMLElement)) {
    throw new Error("Expected #mode-value to exist.");
  }

  if (!(levelValue instanceof HTMLElement)) {
    throw new Error("Expected #level-value to exist.");
  }

  if (!(timeValue instanceof HTMLElement)) {
    throw new Error("Expected #time-value to exist.");
  }

  if (!(wakeValue instanceof HTMLElement)) {
    throw new Error("Expected #wake-value to exist.");
  }

  if (!(scoreValue instanceof HTMLElement)) {
    throw new Error("Expected #score-value to exist.");
  }

  if (!(hitsValue instanceof HTMLElement)) {
    throw new Error("Expected #hits-value to exist.");
  }

  return {
    gameRoot,
    overlay,
    overlayKicker,
    overlayTitle,
    overlayBody,
    overlayAction,
    modeValue,
    levelValue,
    timeValue,
    wakeValue,
    scoreValue,
    hitsValue,
  };
}

function readGameRootSize(gameRoot) {
  const rect = gameRoot.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("Expected #game-root to have a measurable layout before bootstrapping Phaser.");
  }

  return {
    width: rect.width,
    height: rect.height,
  };
}

function getSceneSize(scene) {
  const { width, height } = scene.scale;

  if (width <= 0 || height <= 0) {
    throw new Error("Expected Phaser scale manager to expose a positive scene size.");
  }

  return { width, height };
}
