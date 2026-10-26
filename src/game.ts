import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { MenuScene } from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
      tileBias: 16,
    },
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  scene: [MenuScene, GameScene, UIScene],
  backgroundColor: '#0a0e27',
};

export const game = new Phaser.Game(config);
