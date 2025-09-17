import { Host, post } from '../hostBridge.js';
import { installSwipe, rnd, irnd } from '../util.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // Parallax background layers (high-fidelity feel using gradients + shapes)
    const w = this.scale.width, h = this.scale.height;
    this.bg = this.add.graphics();
    this.drawSky();

    // Lanes (3 lanes)
    this.lanes = [w*0.3, w*0.5, w*0.7];

    // Groups
    this.player = this.physics.add.sprite(this.lanes[1], h*0.75, null).setCircle(18).setTint(0x00ffa2);
    this.player.displayWidth = 36; this.player.displayHeight = 36;
    this.player.setCollideWorldBounds(true);

    this.shadow = this.add.ellipse(this.player.x, this.player.y+16, 40, 10, 0x000000, 0.35).setDepth(-1);

    this.obstacles = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.speed = 260; // forward scroll speed (px/s)
    this.distance = 0;
    this.coinsCount = 0;
    this.laneIndex = 1;
    this.isJumping = false;
    this.magnet = false;
    this.shield = false;

    // Road strip
    this.road = this.add.graphics(); this.road.setDepth(-2);
    this.drawRoad();

    // Collisions
    this.physics.add.overlap(this.player, this.obstacles, this.onHit, null, this);
    this.physics.add.overlap(this.player, this.coins, this.onCoin, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.onPower, null, this);

    // Swipe controls
    installSwipe(this, {
      onLeft: () => this.changeLane(-1),
      onRight: () => this.changeLane(1),
      onUp: () => this.jump(),
      onDown: () => this.slide(),
    });

    // Spawners
    this.spawnTimer = 0;
    this.coinTimer = 0;
    this.powerTimer = 0;

    // HUD
    this.scene.launch('HUD', { ref: this });
    this.hud = this.scene.get('HUD');

    // Progress ticker
    this.progressTicker = 0;

    // Music/SFX could be added here after user tap (from start overlay). Respect Host.muted.
  }

  drawSky() {
    const g = this.bg; const w = this.scale.width, h = this.scale.height;
    g.clear();
    // gradient sky
    const grd = g.createGradient(0,0,0,h);
    grd.addColorStop(0, '#0e0e10');
    grd.addColorStop(1, '#1a1d29');
    g.fillStyle(grd);
    g.fillRect(0,0,w,h);
    // distant skyline
    for (let i=0;i<12;i++) {
      const bw = rnd(40, 90), bh = rnd(h*0.1, h*0.35);
      const x = rnd(0, w); const y = h*0.6 - bh;
      g.fillStyle(0x121520, 1); g.fillRect(x, y, bw, bh);
      g.fillStyle(0x0e111b, 1); g.fillRect(x+bw*0.15, y+bh*0.2, bw*0.2, bh*0.5);
    }
  }

  drawRoad() {
    const w = this.scale.width, h = this.scale.height; const g = this.road;
    g.clear();
    g.fillStyle(0x0b0b0b, 1);
    g.fillRect(0, h*0.65, w, h*0.35);
    // lane markers
    g.lineStyle(2, 0x1f1f1f, 1);
    g.beginPath();
    const y = h*0.65; const laneW = (this.lanes[2]-this.lanes[0]) / 2;
    g.moveTo(this.lanes[1], y); g.lineTo(this.lanes[1], h);
    g.strokePath();
  }

  changeLane(dir) {
    const next = Phaser.Math.Clamp(this.laneIndex + dir, 0, 2);
    if (next !== this.laneIndex) {
      this.laneIndex = next;
      this.tweens.add({ targets: this.player, x: this.lanes[this.laneIndex], duration: 120, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this.shadow, x: this.lanes[this.laneIndex], duration: 120, ease: 'Quad.easeOut' });
    }
  }

  jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.tweens.add({
      targets: [this.player, this.shadow],
      props: { y: { getStart: () => this.player.y, getEnd: () => this.player.y - 90 } },
      duration: 260,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => { this.isJumping = false; },
      onUpdate: (_, t) => { this.shadow.scaleY = 1 + 0.4 * t; }
    });
  }

  slide() {
    // Simple visual: shrink hitbox briefly
    this.player.setScale(1, 0.6);
    this.time.delayedCall(400, () => this.player.setScale(1,1));
  }

  onHit(player, obstacle) {
    if (this.shield) {
      obstacle.destroy();
      this.flash(0x48C9FF);
      return;
    }
    this.endRun('fail');
  }

  onCoin(player, coin) {
    coin.destroy();
    this.coinsCount++;
    this.hud.events.emit('hud:update', { coins: this.coinsCount });
    // small pop
    this.tweens.add({ targets: player, scale: 1.08, duration: 80, yoyo: true });
  }

  onPower(player, p) {
    const kind = p.getData('kind');
    p.destroy();
    if (kind === 'magnet') {
      this.magnet = true; this.flash(0x00ffa2);
      this.time.delayedCall(5000, () => this.magnet = false);
    } else if (kind === 'shield') {
      this.shield = true; this.flash(0x48C9FF);
      this.time.delayedCall(5000, () => this.shield = false);
    }
  }

  flash(color) {
    this.cameras.main.flash(100, (color>>16)&255, (color>>8)&255, color&255, 0.5);
  }

  endRun(reason) {
    const seconds = Math.floor(this.distance / (this.speed/3)); // rough mapping
    post({ type: 'game:end', gameId: 'runner-skyline', sessionId: Host.sessionId, reason, seconds, distance_m: Math.floor(this.distance) });
    this.scene.stop('HUD');
    this.scene.restart(); // restart to idle state
  }

  update(time, delta) {
    const dt = delta/1000;
    // forward progression
    this.distance += (this.speed * dt) / 10; // scale to "meters"
    this.hud?.events.emit('hud:update', { distance: this.distance });

    // difficulty ramp
    this.speed = Math.min(520, this.speed + dt * 2);

    // progress heartbeat every ~5s
    this.progressTicker = (this.progressTicker || 0) + delta;
    if (this.progressTicker >= 5000) {
      post({ type: 'game:progress', gameId: 'runner-skyline', sessionId: Host.sessionId,
        seconds: Math.floor(this.distance / (this.speed/3)) });
      this.progressTicker = 0;
    }

    // spawn obstacles
    this.spawnTimer += delta;
    if (this.spawnTimer > Math.max(600, 1600 - this.speed * 2)) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    // spawn coins
    this.coinTimer += delta;
    if (this.coinTimer > 900) {
      this.coinTimer = 0;
      this.spawnCoins();
    }

    // spawn powerups
    this.powerTimer += delta;
    if (this.powerTimer > 5000) {
      this.powerTimer = 0;
      this.spawnPower();
    }

    // magnet effect: attract nearby coins
    if (this.magnet) {
      const range = 120;
      this.coins.children.iterate((c) => {
        if (!c) return;
        const dx = this.player.x - c.x, dy = this.player.y - c.y;
        const d = Math.hypot(dx, dy);
        if (d < range) {
          c.body.velocity.x = dx * 3;
          c.body.velocity.y = dy * 3;
        }
      });
    }
  }

  spawnObstacle() {
    const lane = irnd(0,3);
    const w = 42, h = 26;
    const y = this.scale.height * 0.65 - 6;
    const obs = this.obstacles.create(this.lanes[lane], y, null).setImmovable(true).setOrigin(0.5, 1);
    obs.displayWidth = w; obs.displayHeight = h;
    obs.setSize(w, h).setOffset(-w/2, -h);
    obs.setTint(0xE74C3C);
    // animate up from road
    obs.y += 24;
    this.tweens.add({ targets: obs, y: y, duration: 160, ease: 'Quad.easeOut' });
    // clean up after passing player (simulate forward scroll by moving obstacle down)
    this.tweens.add({ targets: obs, y: this.scale.height + 20, duration: 3500 - this.speed*3, ease: 'Linear', onComplete: () => obs.destroy() });
  }

  spawnCoins() {
    const lane = irnd(0,3);
    const count = irnd(3,7);
    const startY = this.scale.height * 0.65 - 30;
    for (let i=0;i<count;i++) {
      const c = this.coins.create(this.lanes[lane], startY - i*22, null).setCircle(8).setTint(0xFFD54A);
      c.displayWidth = 16; c.displayHeight = 16;
      this.tweens.add({ targets: c, y: this.scale.height + 20, duration: 3600 - this.speed*3, ease: 'Linear', onComplete: () => c.destroy() });
    }
  }

  spawnPower() {
    const lane = irnd(0,3);
    const kind = Math.random() < 0.5 ? 'magnet' : 'shield';
    const y = this.scale.height * 0.65 - 30;
    const p = this.powerups.create(this.lanes[lane], y, null).setCircle(10).setTint(kind==='magnet'?0x00ffa2:0x48C9FF);
    p.displayWidth = 20; p.displayHeight = 20;
    p.setData('kind', kind);
    this.tweens.add({ targets: p, y: this.scale.height + 20, duration: 3600 - this.speed*3, ease: 'Linear', onComplete: () => p.destroy() });
  }
}
