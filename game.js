/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    try { this.best = Number(localStorage.getItem('coinDashBest')) || 0; } catch (e) { this.best = 0; }
    // The registry survives scene.restart(), so the mode sticks across rounds.
    this.mode = c.modes[this.registry.get('mode') || 0];
    this.mayhemOn = !!this.registry.get('mayhem');
    // Mayhem clock: only advances while playing (not paused, not in grace), so power timers never skip.
    this.mt = 0;
    this.rot = 0;
    this.nextSwap = c.mayhem.swapSeconds;
    this.dash = { phase: 'wait', t: 0 };
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
      drone.isGuard = i % 2 === 1;
    }
    this.graceEnd = this.time.now + (this.mode.droneGraceSeconds || 0) * 1000;
    // Bouncing drones push off each other; chasing drones are spaced in chaseDrones().
    if (!this.mode.chaseSpeed) this.physics.add.collider(this.drones, this.drones);
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!'));
    this.fx = this.add.graphics(); // sword and aim line, redrawn every frame; the scene frees it on restart
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard.on('keydown-M', () => {
      this.registry.set('mayhem', !this.mayhemOn);
      this.scene.restart();
    });
    ['ONE', 'TWO', 'THREE'].forEach((key, i) => this.input.keyboard.on(`keydown-${key}`, () => {
      this.registry.set('mode', i);
      this.scene.restart();
    }));
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.pausedAt = this.time.now;
      const c = COIN_DASH;
      this.pauseText = this.add.text(c.width / 2, c.height / 2, 'PAUSED - press P to resume',
        { font: '24px monospace', color: '#ffffff', backgroundColor: '#0a1120', padding: 16 }
      ).setOrigin(0.5);
    } else {
      this.physics.resume();
      this.deadline += this.time.now - this.pausedAt;
      this.graceEnd += this.time.now - this.pausedAt;
      this.pauseText.destroy();
    }
  }

  chaseDrones() {
    const m = this.mode;
    const p = this.player;
    // Telegraph: drones sit still and blink until the grace period ends.
    const grace = this.time.now < this.graceEnd;
    const drones = this.drones.getChildren();
    drones.forEach(d => d.setAlpha(grace && Math.floor(this.time.now / 120) % 2 ? 0.25 : 1));
    if (grace) {
      drones.forEach(d => d.body.setVelocity(0, 0));
      return;
    }
    const lead = new Phaser.Math.Vector2(p.x, p.y).add(p.body.velocity.clone().scale(m.leadTime));
    drones.forEach(drone => {
      const target = drone.isGuard
        ? lead.clone().lerp(new Phaser.Math.Vector2(this.coin.x, this.coin.y), m.coinBias) : lead;
      const toTarget = new Phaser.Math.Vector2(target.x - drone.x, target.y - drone.y);
      // Stop when on target so guards hover instead of jittering.
      const v = toTarget.length() < 4 ? toTarget.set(0, 0) : toTarget.normalize().scale(m.chaseSpeed);
      // Push away from drones inside the gap (strong, so they never stack), then cap to chase speed.
      drones.forEach(other => {
        if (other === drone) return;
        const away = new Phaser.Math.Vector2(drone.x - other.x, drone.y - other.y);
        const d = away.length();
        if (d >= COIN_DASH.minDroneGap) return;
        const push = away.length() < 1 ? away.set(1, 0) : away.normalize();
        v.add(push.scale(8 * m.chaseSpeed * (1 - d / COIN_DASH.minDroneGap)));
      });
      if (v.length() > m.chaseSpeed) v.normalize().scale(m.chaseSpeed);
      drone.body.setVelocity(v.x, v.y);
    });
  }

  // Powers add to the difficulty's own movement, so this runs after chaseDrones().
  mayhem(delta) {
    const m = COIN_DASH.mayhem;
    this.fx.clear();
    if (this.time.now < this.graceEnd) return;
    this.mt += delta / 1000;
    if (this.mt >= this.nextSwap) {
      this.nextSwap += m.swapSeconds;
      this.rot++;
      this.dash = { phase: 'wait', t: this.mt };
    }
    const blink = Math.floor(this.mt * 8) % 2 ? 0.25 : 1;
    const warn = this.nextSwap - this.mt < m.swapWarn;
    const u = this.mt % m.sprintEvery;
    const sprinting = u >= m.sprintEvery - m.sprintRun;
    const flashing = !sprinting && u >= m.sprintEvery - m.sprintRun - m.sprintFlash;
    this.drones.getChildren().forEach((d, i) => {
      const power = m.powers[(i + this.rot) % m.powers.length];
      d.setFillStyle(m.colors[power]).setAlpha(warn ? blink : 1);
      if (!this.mode.chaseSpeed) { // bouncing: keep a steady speed
        d.body.velocity.normalize().scale(COIN_DASH.droneSpeed * (power === 'sprinter' && sprinting ? m.sprintBoost : 1));
      } else if (power === 'sprinter' && sprinting) {
        d.body.velocity.scale(m.sprintBoost);
      }
      if (power === 'sprinter' && flashing) d.setAlpha(blink);
      if (power === 'spinner') {
        const a = this.mt * m.swordTurn;
        const sword = new Phaser.Geom.Line(d.x, d.y, d.x + Math.cos(a) * m.swordReach, d.y + Math.sin(a) * m.swordReach);
        this.fx.lineStyle(4, m.colors.spinner).strokeLineShape(sword);
        if (Phaser.Geom.Intersects.LineToRectangle(sword, this.player.getBounds())) this.finish('A drone caught you!');
      }
      if (power === 'dasher') this.dasherTick(d);
    });
  }

  dasherTick(d) {
    const m = COIN_DASH.mayhem;
    const k = this.dash;
    if (k.phase === 'wait' && this.mt - k.t >= m.dashEvery) {
      // Lock on: the direction is fixed now, so the player can dodge during the aim.
      const dir = new Phaser.Math.Vector2(this.player.x - d.x, this.player.y - d.y);
      k.dir = dir.length() < 1 ? dir.set(1, 0) : dir.normalize();
      k.phase = 'aim';
      k.t = this.mt;
    }
    if (k.phase === 'aim') {
      this.fx.lineStyle(1, COIN_DASH.mayhem.colors.dasher).lineBetween(d.x, d.y, d.x + k.dir.x * 1000, d.y + k.dir.y * 1000);
      if (this.mt - k.t >= m.dashAim) { k.phase = 'go'; k.t = this.mt; }
    } else if (k.phase === 'go') {
      const b = d.body.blocked;
      if (this.mt - k.t > m.dashMax || (this.mt - k.t > 0.1 && !b.none)) {
        k.phase = 'wait';
        k.t = this.mt;
      } else {
        d.body.setVelocity(k.dir.x * m.dashSpeed, k.dir.y * m.dashSpeed);
      }
    }
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  update(time, delta) {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    if (this.mode.chaseSpeed) this.chaseDrones();
    if (this.mayhemOn) this.mayhem(delta);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}   Best: ${Math.max(this.best, this.score)}   Time: ${seconds}s   Mode: ${this.mode.name} (1/2/3)   Mayhem: ${this.mayhemOn ? 'ON' : 'OFF'} (M)`);
    if (seconds === 0) this.finish('Time is up!');
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    const c = COIN_DASH;
    const beaten = this.score > this.best;
    if (beaten) try { localStorage.setItem('coinDashBest', this.score); } catch (e) { /* storage unavailable */ }
    this.add.rectangle(c.width / 2, c.height / 2, 460, beaten ? 190 : 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\n${beaten ? 'New best!\n' : ''}Press R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
