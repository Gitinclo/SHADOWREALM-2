import Phaser from 'phaser';
import { PlayerClass } from '../types';

export class MenuScene extends Phaser.Scene {
  private selectedClass: PlayerClass = PlayerClass.WARRIOR;
  private classButtons: Map<PlayerClass, Phaser.GameObjects.Rectangle> = new Map();
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    // Background
    this.cameras.main.setBackgroundColor('#0a0e27');

    // Title
    this.add.text(640, 100, 'ShadowRealm', {
      fontSize: '64px',
      color: '#b366ff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(640, 160, 'Open World MMORPG', {
      fontSize: '24px',
      color: '#00ffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Play button
    const playButton = this.add.rectangle(640, 300, 220, 54, 0x6b4c9a, 0.9);
    playButton.setStrokeStyle(2, 0xb366ff);
    playButton.setInteractive({ useHandCursor: true });
    playButton.on('pointerover', () => playButton.setFillStyle(0x8b5cba));
    playButton.on('pointerout', () => playButton.setFillStyle(0x6b4c9a));
    playButton.on('pointerdown', () => {
      this.scene.start('GameScene', { playerClass: this.selectedClass });
    });

    this.add.text(640, 300, 'Play Game', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Class selection
    this.add.text(640, 400, 'Select Your Class', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    const classes: { name: string; value: PlayerClass; x: number; desc: string }[] = [
      { name: 'Warrior', value: PlayerClass.WARRIOR, x: 400, desc: 'High HP & Melee Defense' },
      { name: 'Mage', value: PlayerClass.MAGE, x: 640, desc: 'High Mana & Arcane Range' },
      { name: 'Revenant', value: PlayerClass.REVENANT, x: 880, desc: 'Hybrid Speed & Crit Power' },
    ];

    this.classButtons.clear();

    classes.forEach((cls) => {
      const isSelected = cls.value === this.selectedClass;
      const classButton = this.add.rectangle(
        cls.x,
        480,
        170,
        64,
        isSelected ? 0x6b4c9a : 0x32264a,
        0.9
      );
      classButton.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x00ffff : 0x8b5cba);
      classButton.setInteractive({ useHandCursor: true });

      classButton.on('pointerover', () => {
        if (this.selectedClass !== cls.value) {
          classButton.setFillStyle(0x523e78);
        }
      });
      classButton.on('pointerout', () => {
        if (this.selectedClass !== cls.value) {
          classButton.setFillStyle(0x32264a);
        }
      });
      classButton.on('pointerdown', () => {
        this.selectedClass = cls.value;
        this.updateClassSelectionUI(cls.name, cls.desc);
      });

      this.classButtons.set(cls.value, classButton);

      this.add.text(cls.x, 480, cls.name, {
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial',
      }).setOrigin(0.5);
    });

    this.statusText = this.add.text(640, 555, 'Selected: Warrior — High HP & Melee Defense', {
      fontSize: '16px',
      color: '#b366ff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.add.text(640, 620, 'Controls: WASD / Arrows to Move • Q / W / E / R or Click HUD Buttons to Cast Abilities', {
      fontSize: '14px',
      color: '#99aabb',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Settings button
    const settingsButton = this.add.rectangle(1240, 40, 50, 50, 0x333333, 0.8);
    settingsButton.setStrokeStyle(2, 0x666666);
    settingsButton.setInteractive({ useHandCursor: true });
    settingsButton.on('pointerdown', () => this.toggleSettings());

    this.add.text(1240, 40, '⚙', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  private updateClassSelectionUI(name: string, desc: string) {
    this.classButtons.forEach((btn, key) => {
      const selected = key === this.selectedClass;
      btn.setFillStyle(selected ? 0x6b4c9a : 0x32264a, 0.9);
      btn.setStrokeStyle(selected ? 3 : 2, selected ? 0x00ffff : 0x8b5cba);
    });
    if (this.statusText) {
      this.statusText.setText(`Selected: ${name} — ${desc}`);
    }
  }

  private toggleSettings() {
    console.log('Settings clicked');
  }
}
