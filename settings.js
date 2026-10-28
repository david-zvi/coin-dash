// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  // Keys 1/2/3. chaseSpeed (below playerSpeed) makes drones steer at the player; none = bounce.
  // leadTime: seconds of player movement to predict. coinBias: 0-1 pull toward the coin,
  // applied only to every second drone (the "guards").
  modes: [
    { name: 'Easy' },
    { name: 'Hard', chaseSpeed: 150, leadTime: 0, coinBias: 0 },
    { name: 'Expert', chaseSpeed: 170, leadTime: 0.4, coinBias: 0.6 }
  ],
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
