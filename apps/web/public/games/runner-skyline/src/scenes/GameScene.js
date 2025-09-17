import { Host, post } from '../hostBridge.js';
import { installSwipe, rnd, irnd } from '../util.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const w = this.scale.width, h = this.scale.height;

    // Simple background
    this.add.rectangle(0, 0, w, h, 0x0e0e10).setOrigin(0, 0);
    this.add.rectangle(0, h * 0.6, w, h * 0.4, 0x1a1d29).setOrigin(0, 0);

    // Road
    this.add.rectangle(0, h * 0.65, w, h * 0.35, 0x0b0b0b).setOrigin(0, 0);

    // Lanes
    this.lanes = [w*0.3, w*0.5, w*0.7];

    // Lane markers
    this.add.rectangle(this.lanes[1], h * 0.65, 2, h * 0.35, 0x1f1f1f).setOrigin(0.5, 0);

    // Player - simple rectangle sprite
    this.player = this.add.rectangle(this.lanes[1], h * 0.75, 36, 36, 0x00ffa2);

    // Shadow
    this.shadow = this.add.ellipse(this.player.x, this.player.y + 16, 40, 10, 0x000000, 0.35).setDepth(-1);

    // Game state
    this.speed = 260;
    this.distance = 0;
    this.coinsCount = 0;
    this.laneIndex = 1;
    this.isJumping = false;
    this.magnet = false;
    this.shield = false;

    // Obstacles array (we'll manage them manually)
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];

    // Controls
    installSwipe(this, {
      onLeft: () => this.changeLane(-1),
      onRight: () => this.changeLane(1),
      onUp: () => this.jump(),
      onDown: () => this.slide(),
    });

    // Spawn timers
    this.spawnTimer = 0;
    this.coinTimer = 0;
    this.powerTimer = 0;

    // HUD
    this.scene.launch('HUD', { ref: this });
    this.hud = this.scene.get('HUD');

    // Progress ticker
    this.progressTicker = 0;

    // Skyline buildings
    for (let i = 0; i < 12; i++) {
      const bw = rnd(40, 90), bh = rnd(h * 0.1, h * 0.35);
      const x = rnd(0, w);
      const y = h * 0.6 - bh;
      this.add.rectangle(x, y, bw, bh, 0x121520).setOrigin(0, 0);
    }
  }

  changeLane(dir) {
    const next = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
    if (next !== this.laneIndex) {
      this.laneIndex = next;
      this.tweens.add({
        targets: this.player,
        x: this.lanes[this.laneIndex],
        duration: 120,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: this.shadow,
        x: this.lanes[this.laneIndex],
        duration: 120,
        ease: 'Quad.easeOut'
      });
    }
  }

  jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    const startY = this.player.y;
    this.tweens.add({
      targets: this.player,
      y: startY - 90,
      duration: 260,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isJumping = false;
      }
    });
  }

  slide() {
    this.player.setScale(1, 0.6);
    this.time.delayedCall(400, () => this.player.setScale(1, 1));
  }

  checkCollision(player, obstacle) {
    const dx = Math.abs(player.x - obstacle.x);
    const dy = Math.abs(player.y - obstacle.y);
    return dx < 30 && dy < 30;
  }

  flash(color) {
    this.cameras.main.flash(100, (color >> 16) & 255, (color >> 8) & 255, color & 255, 0.5);
  }

  endRun(reason) {
    const seconds = Math.floor(this.distance / (this.speed / 3));
    post({
      type: 'game:end',
      gameId: 'runner-skyline',
      sessionId: Host.sessionId,
      reason,
      seconds,
      distance_m: Math.floor(this.distance)
    });
    this.scene.stop('HUD');
    this.scene.restart();
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Forward progression
    this.distance += (this.speed * dt) / 10;
    this.hud?.events.emit('hud:update', { distance: this.distance });

    // Difficulty ramp
    this.speed = Math.min(520, this.speed + dt * 2);

    // Progress heartbeat
    this.progressTicker = (this.progressTicker || 0) + delta;
    if (this.progressTicker >= 5000) {
      post({
        type: 'game:progress',
        gameId: 'runner-skyline',
        sessionId: Host.sessionId,
        seconds: Math.floor(this.distance / (this.speed / 3))
      });
      this.progressTicker = 0;
    }

    // Spawn obstacles
    this.spawnTimer += delta;
    if (this.spawnTimer > Math.max(600, 1600 - this.speed * 2)) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // Spawn coins
    this.coinTimer += delta;
    if (this.coinTimer > 900) {
      this.coinTimer = 0;
      this.spawnCoins();
    }

    // Spawn powerups
    this.powerTimer += delta;
    if (this.powerTimer > 5000) {
      this.powerTimer = 0;
      this.spawnPower();
    }

    // Check collisions manually
    this.obstacles.forEach((obs, index) => {
      if (!obs.active) return;

      if (this.checkCollision(this.player, obs)) {
        if (this.shield) {
          obs.destroy();
          this.obstacles.splice(index, 1);
          this.flash(0x48C9FF);
        } else {
          this.endRun('fail');
        }
      }
    });

    // Collect coins
    this.coins.forEach((coin, index) => {
      if (!coin.active) return;

      if (this.checkCollision(this.player, coin)) {
        coin.destroy();
        this.coins.splice(index, 1);
        this.coinsCount++;
        this.hud.events.emit('hud:update', { coins: this.coinsCount });

        // Small pop animation
        this.tweens.add({
          targets: this.player,
          scale: 1.08,
          duration: 80,
          yoyo: true
        });
      }

      // Magnet effect
      if (this.magnet) {
        const dx = this.player.x - coin.x;
        const dy = this.player.y - coin.y;
        const d = Math.hypot(dx, dy);
        if (d < 120) {
          coin.x += dx * 0.1;
          coin.y += dy * 0.1;
        }
      }
    });

    // Collect powerups
    this.powerups.forEach((p, index) => {
      if (!p.active) return;

      if (this.checkCollision(this.player, p)) {
        const kind = p.getData('kind');
        p.destroy();
        this.powerups.splice(index, 1);

        if (kind === 'magnet') {
          this.magnet = true;
          this.flash(0x00ffa2);
          this.time.delayedCall(5000, () => this.magnet = false);
        } else if (kind === 'shield') {
          this.shield = true;
          this.flash(0x48C9FF);
          this.time.delayedCall(5000, () => this.shield = false);
        }
      }
    });
  }

  spawnObstacle() {
    const lane = irnd(0, 3);
    const y = this.scale.height * 0.75;
    const obs = this.add.rectangle(this.lanes[lane], y, 42, 26, 0xE74C3C);
    obs.active = true;
    this.obstacles.push(obs);

    // Animate entrance
    obs.y += 24;
    this.tweens.add({
      targets: obs,
      y: y,
      duration: 160,
      ease: 'Quad.easeOut'
    });

    // Move down screen
    this.tweens.add({
      targets: obs,
      y: this.scale.height + 20,
      duration: 3500 - this.speed * 3,
      ease: 'Linear',
      onComplete: () => {
        obs.destroy();
        const index = this.obstacles.indexOf(obs);
        if (index > -1) this.obstacles.splice(index, 1);
      }
    });
  }

  spawnCoins() {
    const lane = irnd(0, 3);
    const count = irnd(3, 7);
    const startY = this.scale.height * 0.65 - 30;

    for (let i = 0; i < count; i++) {
      const c = this.add.circle(this.lanes[lane], startY - i * 22, 8, 0xFFD54A);
      c.active = true;
      this.coins.push(c);

      this.tweens.add({
        targets: c,
        y: this.scale.height + 20,
        duration: 3600 - this.speed * 3,
        ease: 'Linear',
        onComplete: () => {
          c.destroy();
          const index = this.coins.indexOf(c);
          if (index > -1) this.coins.splice(index, 1);
        }
      });
    }
  }

  spawnPower() {
    const lane = irnd(0, 3);
    const kind = Math.random() < 0.5 ? 'magnet' : 'shield';
    const y = this.scale.height * 0.65 - 30;

    const p = this.add.circle(this.lanes[lane], y, 10, kind === 'magnet' ? 0x00ffa2 : 0x48C9FF);
    p.active = true;
    p.setData('kind', kind);
    this.powerups.push(p);

    this.tweens.add({
      targets: p,
      y: this.scale.height + 20,
      duration: 3600 - this.speed * 3,
      ease: 'Linear',
      onComplete: () => {
        p.destroy();
        const index = this.powerups.indexOf(p);
        if (index > -1) this.powerups.splice(index, 1);
      }
    });
  }
}