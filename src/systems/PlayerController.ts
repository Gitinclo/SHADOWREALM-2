import Phaser from 'phaser';
import { Player } from '../types';

interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export class PlayerController {
  private scene: Phaser.Scene;
  private speed: number = 200;
  private wasd?: WASDKeys;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    if (this.scene.input.keyboard) {
      this.wasd = this.scene.input.keyboard.addKeys('W,A,S,D') as WASDKeys;
    }
  }

  handleInput(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    sprite: Phaser.Physics.Arcade.Sprite,
    player: Player
  ): Phaser.Math.Vector2 {
    const velocity = new Phaser.Math.Vector2(0, 0);

    if (cursors.left.isDown || this.wasd?.A?.isDown) {
      velocity.x = -this.speed;
    } else if (cursors.right.isDown || this.wasd?.D?.isDown) {
      velocity.x = this.speed;
    }

    if (cursors.up.isDown || this.wasd?.W?.isDown) {
      velocity.y = -this.speed;
    } else if (cursors.down.isDown || this.wasd?.S?.isDown) {
      velocity.y = this.speed;
    }

    if (velocity.x !== 0 && velocity.y !== 0) {
      velocity.normalize().scale(this.speed);
    }

    sprite.setVelocity(velocity.x, velocity.y);

    // Update rotation based on velocity
    if (velocity.length() > 0) {
      sprite.setRotation(velocity.angle());
      player.isMoving = true;
    } else {
      player.isMoving = false;
    }

    return velocity;
  }

  setSpeed(speed: number) {
    this.speed = speed;
  }
}
