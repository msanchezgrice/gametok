import { Host, post } from '../hostBridge.js';

export class HudScene extends Phaser.Scene {
  constructor() { super('HUD'); }
  init(data) { this.ref = data?.ref; }
  create() {
    const w = this.scale.width, h = this.scale.height;
    this.distance = 0; this.coins = 0; this.lives = 1;

    this.distText = this.add.text(16, 12, '0 m', { fontSize:'18px', color:'#FFFFFF', fontFamily:'system-ui, -apple-system, Segoe UI, Roboto' });
    this.coinText = this.add.text(w-16, 12, '🪙 0', { fontSize:'18px', color:'#FFD54A' }).setOrigin(1,0);

    this.events.on('hud:update', (state) => {
      if (state.distance != null) { this.distance = Math.floor(state.distance); this.distText.setText(this.distance + ' m'); }
      if (state.coins != null) { this.coins = state.coins; this.coinText.setText('🪙 ' + this.coins); }
    });
  }
}
