// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Centre-to-centre distance chasing drones try to keep from each other.
  minDroneGap: 70,
  // Keys 1/2/3. chaseSpeed (below playerSpeed) makes drones steer at the player; none = bounce.
  // leadTime: seconds of player movement to predict. coinBias: 0-1 pull toward the coin,
  // applied only to every second drone (the "guards"). droneGraceSeconds: drones freeze and
  // flash this long at the start of each round before chasing.
  modes: [
    { name: 'Easy' },
    { name: 'Hard', chaseSpeed: 150, leadTime: 0, coinBias: 0, droneGraceSeconds: 1.5 },
    { name: 'Expert', chaseSpeed: 170, leadTime: 0.4, coinBias: 0.6, droneGraceSeconds: 1.5 }
  ],
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a },
  // Key M, on top of the difficulty. Drones hold one power each (rotating every swapSeconds,
  // blinking for swapWarn before). Sprinter: blinks sprintFlash, then runs at sprintBoost x speed
  // for sprintRun, once per sprintEvery. Spinner: sword of swordReach px turning swordTurn rad/s.
  // Dasher: every dashEvery locks on, aims dashAim, then flies at dashSpeed (dashMax = safety cap).
  mayhem: {
    swapSeconds: 12, swapWarn: 1,
    sprintEvery: 5, sprintFlash: 0.5, sprintRun: 1.5, sprintBoost: 2,
    swordReach: 50, swordTurn: 4,
    dashEvery: 4, dashAim: 0.8, dashSpeed: 500, dashMax: 2,
    powers: ['sprinter', 'spinner', 'dasher'],
    colors: { sprinter: 0xff9f43, spinner: 0xb77bff, dasher: 0x4d9dff }
  }
};
