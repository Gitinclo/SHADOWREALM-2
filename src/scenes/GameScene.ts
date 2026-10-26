import Phaser from 'phaser';
import { Player, Enemy, PlayerClass, PlayerStats, Ability } from '../types';
import { PlayerController } from '../systems/PlayerController';
import { CombatSystem } from '../systems/CombatSystem';
import { WorldGenerator } from '../systems/WorldGenerator';
import { NetworkManager } from '../systems/NetworkManager';
import { MiniMap, WorldData } from '../systems/MiniMap';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerData!: Player;
  private enemies: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private enemyData: Map<string, Enemy> = new Map();
  private enemyHealthBars: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private playerController!: PlayerController;
  private combatSystem!: CombatSystem;
  private worldGenerator!: WorldGenerator;
  private networkManager!: NetworkManager;
  private miniMap!: MiniMap;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private camera!: Phaser.Cameras.Scene2D.Camera;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  private collisionsLayer!: Phaser.Tilemaps.TilemapLayer;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private damageTexts: Phaser.GameObjects.Text[] = [];
  private selectedClass: PlayerClass = PlayerClass.WARRIOR;
  private shieldActiveUntil: number = 0;
  private shieldGraphic?: Phaser.GameObjects.Arc;
  private waypointMarker?: Phaser.GameObjects.Arc;
  private enemyIdCounter: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { playerClass?: PlayerClass }) {
    if (data?.playerClass) {
      this.selectedClass = data.playerClass;
    }
  }

  preload() {
    // Load base SVG sprite assets
    this.load.image('player', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiB4PSIwIiB5PSIwIiByeD0iNiIgZmlsbD0iIzdiMmNmZiIgc3Ryb2tlPSIjMDBmZmZmIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIyMiIgY3k9IjE2IiByPSI0IiBmaWxsPSIjMDBmZmZmIi8+PC9zdmc+');
    this.load.image('enemy', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iI2Q5MDQyOSIgc3Ryb2tlPSIjZmZiNzAzIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiBmaWxsPSIjZmZmZjAwIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIxMiIgYj0iMyIgciAzPSIzIiBmaWxsPSIjZmZmZjAwIi8+PC9zdmc+');
    this.load.image('projectile', 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjQiIGN5PSI0IiByPSI0IiBmaWxsPSIjZmZmZjAwIi8+PC9zdmc+');
  }

  create() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    this.enemies.clear();
    this.enemyData.clear();
    this.enemyHealthBars.clear();
    this.damageTexts = [];

    // Generate procedural tileset texture so tilemap layers have valid tiles
    this.ensureTilesetTexture();

    // Initialize systems
    this.worldGenerator = new WorldGenerator(this, 2560, 1440);
    this.combatSystem = new CombatSystem();
    this.networkManager = new NetworkManager();
    this.playerController = new PlayerController(this);

    // Create world
    const worldData = this.worldGenerator.generateWorld() as WorldData;
    this.createWorldTiles(worldData);
    this.spawnWorldObjectives(worldData);

    // Initialize Mini-Map HUD component
    this.miniMap = new MiniMap(worldData);

    // Set physics world bounds to match the 2560x1440 map
    this.physics.world.setBounds(0, 0, 2560, 1440);

    // Create player
    this.playerData = this.createPlayerData(this.selectedClass);
    this.player = this.physics.add.sprite(640, 360, 'player');
    this.player.setScale(1.5);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2);
    this.player.setDepth(10);

    // Create in-world waypoint beacon
    this.waypointMarker = this.add.circle(640, 360, 22, 0x00ffff, 0.12);
    this.waypointMarker.setStrokeStyle(2, 0x00ffff, 0.75);
    this.waypointMarker.setDepth(6);
    this.waypointMarker.setVisible(false);

    // Create groups
    this.projectiles = this.physics.add.group();
    this.enemyGroup = this.physics.add.group();

    // Setup camera
    this.camera = this.cameras.main;
    this.camera.startFollow(this.player, true, 0.1, 0.1);
    this.camera.setBounds(0, 0, 2560, 1440);

    // Setup input (Support both Q/W/E/R or 1/2/3/4 + Space for abilities, M for MiniMap zoom, and DOM HUD buttons)
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown-SPACE', () => this.castAbility(0));
    this.input.keyboard!.on('keydown-Q', () => this.castAbility(0));
    this.input.keyboard!.on('keydown-ONE', () => this.castAbility(0));
    this.input.keyboard!.on('keydown-TWO', () => this.castAbility(1));
    this.input.keyboard!.on('keydown-E', () => this.castAbility(2));
    this.input.keyboard!.on('keydown-THREE', () => this.castAbility(2));
    this.input.keyboard!.on('keydown-R', () => this.castAbility(3));
    this.input.keyboard!.on('keydown-FOUR', () => this.castAbility(3));
    this.input.keyboard!.on('keydown-M', () => this.miniMap?.toggleZoom());

    this.bindDOMAbilityButtons();

    // Spawn initial enemies
    this.spawnEnemies(10);

    // Setup physics collisions
    if (this.collisionsLayer) {
      this.physics.add.collider(this.player, this.collisionsLayer);
      this.physics.add.collider(this.enemyGroup, this.collisionsLayer);
    }
    this.physics.add.overlap(this.player, this.enemyGroup, () => {
      // Handled via proximity AI attack in updateEnemyAI
    });

    // Attempt WebSocket connection gracefully (non-fatal if offline)
    const serverStatusEl = document.getElementById('server-status');
    this.networkManager
      .connect('ws://localhost:8080')
      .then(() => {
        if (serverStatusEl) {
          serverStatusEl.textContent = '● Connected';
          serverStatusEl.style.color = '#00ff00';
        }
      })
      .catch(() => {
        if (serverStatusEl) {
          serverStatusEl.textContent = '● Local Realm (Solo)';
          serverStatusEl.style.color = '#00ffff';
        }
      });

    this.networkManager.on('enemy_spawn', (data: any) => this.handleEnemySpawn(data));
    this.networkManager.on('combat_event', (data: any) => this.handleCombatEvent(data));
  }

  private spawnWorldObjectives(worldData: WorldData) {
    // Render Dungeon Rift portals
    worldData.dungeons.forEach((dungeon) => {
      const riftOuter = this.add.circle(dungeon.x, dungeon.y, 26, 0x7b2cff, 0.28);
      riftOuter.setStrokeStyle(3, 0xffb703, 0.9);
      riftOuter.setDepth(4);

      const riftInner = this.add.rectangle(dungeon.x, dungeon.y, 18, 18, 0xffb703, 0.85);
      riftInner.setAngle(45);
      riftInner.setDepth(5);
      riftInner.setInteractive({ useHandCursor: true });
      riftInner.on('pointerdown', () => {
        this.miniMap?.setWaypoint(dungeon.x, dungeon.y);
      });

      this.tweens.add({
        targets: riftOuter,
        scale: 1.25,
        alpha: 0.1,
        yoyo: true,
        repeat: -1,
        duration: 1200,
      });

      this.add.text(dungeon.x, dungeon.y - 36, `⚔ ${dungeon.name} (Lv.${dungeon.level})`, {
        fontSize: '12px',
        color: '#ffb703',
        fontStyle: 'bold',
        backgroundColor: 'rgba(10,14,39,0.75)',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5).setDepth(6);
    });

    // Render NPCs / Quest Objectives
    worldData.npcs.forEach((npc) => {
      const isQuest = npc.type === 'quest';
      const markerColor = isQuest ? 0x00ff9d : 0x38bdf8;
      const npcCircle = this.add.circle(npc.x, npc.y, 13, markerColor, 0.85);
      npcCircle.setStrokeStyle(2, 0xffffff, 0.9);
      npcCircle.setDepth(7);
      npcCircle.setInteractive({ useHandCursor: true });

      npcCircle.on('pointerdown', () => {
        this.miniMap?.setWaypoint(npc.x, npc.y);
        const msg = this.add.text(npc.x, npc.y - 42, `"${npc.dialogue}"`, {
          fontSize: '12px',
          color: '#00ff9d',
          backgroundColor: 'rgba(10,14,39,0.9)',
          padding: { x: 6, y: 3 },
        }).setOrigin(0.5).setDepth(22);
        msg.setData('startY', npc.y - 42);
        this.damageTexts.push(msg);
      });

      this.add.text(npc.x, npc.y - 24, isQuest ? `! ${npc.name}` : npc.name, {
        fontSize: '11px',
        color: isQuest ? '#00ff9d' : '#bae6fd',
        fontStyle: isQuest ? 'bold' : 'normal',
        backgroundColor: 'rgba(10,14,39,0.65)',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(7);
    });
  }

  private ensureTilesetTexture() {
    if (this.textures.exists('tiles')) return;
    const canvasTex = this.textures.createCanvas('tiles', 192, 32);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();

    // 6 tiles of 32x32:
    // 0: empty, 1: Deep Water, 2: Shadow Grass, 3: Dark Forest, 4: Obsidian Floor, 5: Collision Pillar
    const colors = ['#0a0e27', '#0d1b3e', '#111833', '#192246', '#211a3a', '#4a306d'];
    const accents = ['#111833', '#162d66', '#1c2852', '#263466', '#33265a', '#7b2cff'];

    for (let i = 0; i < 6; i++) {
      const ox = i * 32;
      ctx.fillStyle = colors[i];
      ctx.fillRect(ox, 0, 32, 32);
      ctx.strokeStyle = accents[i];
      ctx.lineWidth = 1;
      ctx.strokeRect(ox + 0.5, 0.5, 31, 31);

      if (i === 5) {
        // Collision stone rune pattern
        ctx.fillStyle = '#311f4d';
        ctx.fillRect(ox + 4, 4, 24, 24);
        ctx.strokeStyle = '#b366ff';
        ctx.strokeRect(ox + 6, 6, 20, 20);
      } else {
        ctx.fillStyle = accents[i];
        ctx.fillRect(ox + 8, 8, 3, 3);
        ctx.fillRect(ox + 22, 20, 3, 3);
      }
    }
    canvasTex.refresh();
  }

  private bindDOMAbilityButtons() {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.ability-button');
    buttons.forEach((btn) => {
      const idx = Number(btn.getAttribute('data-ability') || '0');
      btn.onclick = (e) => {
        e.preventDefault();
        this.castAbility(idx);
      };
    });
  }

  update(_time: number, deltaMs: number) {
    if (!this.playerData) return;
    const dt = deltaMs / 1000;

    // Update player movement
    this.playerController.handleInput(this.cursors, this.player, this.playerData);
    this.playerData.position = { x: this.player.x, y: this.player.y };
    this.playerData.rotation = this.player.rotation;

    // Keep shield graphic on player if active
    if (this.shieldGraphic) {
      if (this.time.now < this.shieldActiveUntil) {
        this.shieldGraphic.setPosition(this.player.x, this.player.y);
      } else {
        this.shieldGraphic.destroy();
        this.shieldGraphic = undefined;
      }
    }

    // Regenerate Mana & Health slowly
    if (this.playerData.stats.mana < this.playerData.stats.maxMana) {
      this.playerData.stats.mana = Math.min(
        this.playerData.stats.maxMana,
        this.playerData.stats.mana + 3 * dt
      );
    }

    // Update enemy AI
    this.updateEnemyAI();

    // Update ability cooldowns
    this.updateAbilityCooldowns(dt);

    // Update DOM HUD & Mini-Map
    this.updateDOMHUD();
    if (this.miniMap) {
      this.miniMap.update(
        this.playerData,
        this.enemyData,
        {
          x: this.camera.scrollX,
          y: this.camera.scrollY,
          width: this.camera.width,
          height: this.camera.height,
        },
        dt
      );

      const wp = this.miniMap.getWaypoint();
      if (wp && this.waypointMarker) {
        this.waypointMarker.setPosition(wp.x, wp.y);
        this.waypointMarker.setVisible(true);
      } else if (this.waypointMarker) {
        this.waypointMarker.setVisible(false);
      }
    }

    // Send player position to network if online
    if (this.networkManager.isOnline()) {
      this.networkManager.sendMessage({
        type: 'player_move',
        playerId: this.playerData.id,
        data: {
          position: this.playerData.position,
          rotation: this.player.rotation,
        },
        timestamp: Date.now(),
      });
    }

    // Update damage text positions
    this.damageTexts = this.damageTexts.filter((text) => {
      text.y -= 1.5;
      if (text.y < text.getData('startY') - 50) {
        text.destroy();
        return false;
      }
      return true;
    });
  }

  private updateDOMHUD() {
    const stats = this.playerData.stats;
    const healthFill = document.getElementById('health-fill');
    const manaFill = document.getElementById('mana-fill');
    const expFill = document.getElementById('exp-fill');
    const levelDisplay = document.getElementById('level-display');
    const coordsDisplay = document.getElementById('coordinates');
    const enemiesDisplay = document.getElementById('enemies-nearby');
    const fpsDisplay = document.getElementById('fps-counter');

    if (healthFill) {
      healthFill.style.width = `${Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100))}%`;
    }
    if (manaFill) {
      manaFill.style.width = `${Math.max(0, Math.min(100, (stats.mana / stats.maxMana) * 100))}%`;
    }
    if (expFill) {
      expFill.style.width = `${Math.max(0, Math.min(100, (stats.experience / stats.experienceToLevel) * 100))}%`;
    }
    if (levelDisplay) {
      levelDisplay.textContent = `Level ${stats.level} (${this.playerData.class.toUpperCase()})`;
    }
    if (coordsDisplay) {
      coordsDisplay.textContent = `X: ${Math.round(this.player.x)} Y: ${Math.round(this.player.y)}`;
    }
    if (enemiesDisplay) {
      enemiesDisplay.textContent = `Enemies: ${this.enemies.size}`;
    }
    if (fpsDisplay && this.game.loop) {
      fpsDisplay.textContent = `FPS: ${Math.round(this.game.loop.actualFps)}`;
    }

    const buttons = document.querySelectorAll<HTMLButtonElement>('.ability-button');
    buttons.forEach((btn) => {
      const idx = Number(btn.getAttribute('data-ability') || '0');
      const ability = this.playerData.abilities[idx];
      if (!ability) return;
      if (ability.currentCooldown > 0) {
        btn.classList.add('cooldown');
        btn.setAttribute('data-cooldown', `${ability.currentCooldown.toFixed(1)}s`);
      } else {
        btn.classList.remove('cooldown');
        btn.removeAttribute('data-cooldown');
      }
    });
  }

  private createPlayerData(playerClass: PlayerClass): Player {
    const isMage = playerClass === PlayerClass.MAGE;
    const isRevenant = playerClass === PlayerClass.REVENANT;

    const stats: PlayerStats = {
      health: isMage ? 85 : isRevenant ? 100 : 120,
      maxHealth: isMage ? 85 : isRevenant ? 100 : 120,
      mana: isMage ? 120 : isRevenant ? 80 : 60,
      maxMana: isMage ? 120 : isRevenant ? 80 : 60,
      strength: isMage ? 55 : isRevenant ? 85 : 95,
      defense: isMage ? 50 : isRevenant ? 70 : 85,
      speed: isRevenant ? 80 : 65,
      intelligence: isMage ? 95 : isRevenant ? 70 : 40,
      endurance: 85,
      level: 1,
      experience: 0,
      experienceToLevel: 100,
    };

    const abilities: Ability[] = [
      {
        id: 'shadow_slash',
        name: 'Shadow Slash',
        description: 'Basic attack infused with shadow energy',
        level: 1,
        cooldown: 0.5,
        currentCooldown: 0,
        manaCost: 0,
        damage: 25,
        range: 140,
        icon: 'shadow_slash',
      },
      {
        id: 'dark_cleave',
        name: 'Dark Cleave',
        description: 'Powerful spinning attack hitting all nearby enemies',
        level: 1,
        cooldown: 4,
        currentCooldown: 0,
        manaCost: 15,
        damage: 55,
        range: 200,
        icon: 'dark_cleave',
      },
      {
        id: 'void_shield',
        name: 'Void Shield',
        description: 'Create a protective barrier absorbing damage & restoring HP',
        level: 1,
        cooldown: 8,
        currentCooldown: 0,
        manaCost: 20,
        damage: 15,
        range: 160,
        icon: 'void_shield',
      },
      {
        id: 'chaos_bringer',
        name: 'Chaos Bringer',
        description: 'Ultimate ability - massive area shadow detonation',
        level: 1,
        cooldown: 12,
        currentCooldown: 0,
        manaCost: 35,
        damage: 150,
        range: 320,
        icon: 'chaos_bringer',
      },
    ];

    return {
      id: 'player_' + Phaser.Math.RND.uuid(),
      username: 'Player',
      class: playerClass,
      stats,
      abilities,
      inventory: {
        items: [],
        maxSlots: 20,
        gold: 0,
      },
      position: { x: 640, y: 360 },
      rotation: 0,
      isMoving: false,
      isDead: false,
    };
  }

  private createWorldTiles(worldData: any) {
    const map = this.make.tilemap({ width: 80, height: 45, tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32, 0, 0);
    if (!tileset) return;

    const worldLayer = map.createBlankLayer('world', tileset);
    const collisionsLayer = map.createBlankLayer('collisions', tileset);
    if (!worldLayer || !collisionsLayer) return;

    this.worldLayer = worldLayer;
    this.collisionsLayer = collisionsLayer;

    // Fill with procedural terrain tiles
    for (let y = 0; y < 45; y++) {
      for (let x = 0; x < 80; x++) {
        const terrainVal = worldData?.terrain?.[y]?.[x] ?? Phaser.Math.Between(1, 3);
        const tileIndex = Phaser.Math.Clamp(terrainVal + 1, 1, 4);
        this.worldLayer.putTileAt(tileIndex, x, y);

        // Keep player spawn area around (20, 11) clear of obstacles
        const distFromSpawn = Math.hypot(x - 20, y - 11);
        if (distFromSpawn > 4 && Phaser.Math.Between(0, 100) < 8) {
          this.collisionsLayer.putTileAt(5, x, y);
        }
      }
    }

    this.collisionsLayer.setCollision([5]);
  }

  private spawnEnemies(count: number) {
    for (let i = 0; i < count; i++) {
      const id = `enemy_${++this.enemyIdCounter}`;
      const x = Phaser.Math.Between(120, 2440);
      const y = Phaser.Math.Between(120, 1320);

      const enemySprite = this.physics.add.sprite(x, y, 'enemy');
      enemySprite.setScale(1.4);
      enemySprite.setCollideWorldBounds(true);
      enemySprite.setBounce(0.2);
      enemySprite.setDepth(9);
      this.enemyGroup.add(enemySprite);

      const hpBar = this.add.graphics();
      hpBar.setDepth(15);

      const enemy: Enemy = {
        id,
        name: 'Shadow Goblin',
        level: this.playerData ? this.playerData.stats.level : 1,
        stats: {
          health: 45,
          maxHealth: 45,
          mana: 10,
          maxMana: 10,
          strength: 22,
          defense: 10,
          speed: 45,
          intelligence: 10,
          endurance: 20,
          level: 1,
          experience: 40,
          experienceToLevel: 100,
        },
        position: { x, y },
        rotation: 0,
        targetId: null,
        isDead: false,
        lootTable: [],
      };

      this.enemies.set(enemy.id, enemySprite);
      this.enemyData.set(enemy.id, enemy);
      this.enemyHealthBars.set(enemy.id, hpBar);
    }
  }

  private updateEnemyAI() {
    this.enemyData.forEach((enemy, id) => {
      if (enemy.isDead) return;

      const sprite = this.enemies.get(id);
      if (!sprite || !sprite.active) return;

      const distance = Phaser.Math.Distance.Between(
        sprite.x,
        sprite.y,
        this.player.x,
        this.player.y
      );

      if (distance < 340) {
        const angle = Phaser.Math.Angle.Between(
          sprite.x,
          sprite.y,
          this.player.x,
          this.player.y
        );

        const speed = 70;
        sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        enemy.targetId = this.playerData.id;

        if (distance < 55 && Phaser.Math.Between(0, 100) < 4) {
          this.enemyAttack(enemy);
        }
      } else {
        sprite.setVelocity(0, 0);
        enemy.targetId = null;
      }

      enemy.position = { x: sprite.x, y: sprite.y };

      // Draw floating enemy health bar
      const hpBar = this.enemyHealthBars.get(id);
      if (hpBar) {
        hpBar.clear();
        const barW = 40;
        const barH = 5;
        const bx = sprite.x - barW / 2;
        const by = sprite.y - 30;
        hpBar.fillStyle(0x000000, 0.7);
        hpBar.fillRect(bx, by, barW, barH);
        const pct = Math.max(0, enemy.stats.health / enemy.stats.maxHealth);
        hpBar.fillStyle(0xff2a55, 1);
        hpBar.fillRect(bx, by, barW * pct, barH);
      }
    });
  }

  private castAbility(abilityIndex: number) {
    const ability = this.playerData.abilities[abilityIndex];
    if (!ability || ability.currentCooldown > 0) return;
    if (this.playerData.stats.mana < ability.manaCost) return;

    // Reduce mana & trigger cooldown
    this.playerData.stats.mana -= ability.manaCost;
    ability.currentCooldown = ability.cooldown;

    // Visual spell ring effect
    const ringColors = [0xb366ff, 0xff2a85, 0x00ffff, 0xffaa00];
    const ringColor = ringColors[abilityIndex] ?? 0xb366ff;
    const effectRing = this.add.circle(this.player.x, this.player.y, 16, ringColor, 0.25);
    effectRing.setStrokeStyle(3, ringColor, 0.9);
    effectRing.setDepth(8);

    this.tweens.add({
      targets: effectRing,
      radius: Math.max(60, ability.range),
      alpha: 0,
      duration: 320,
      onComplete: () => effectRing.destroy(),
    });

    // Void Shield special buff + heal
    if (ability.id === 'void_shield') {
      this.shieldActiveUntil = this.time.now + 4000;
      this.playerData.stats.health = Math.min(
        this.playerData.stats.maxHealth,
        this.playerData.stats.health + 25
      );
      if (this.shieldGraphic) this.shieldGraphic.destroy();
      this.shieldGraphic = this.add.circle(this.player.x, this.player.y, 34, 0x00ffff, 0.2);
      this.shieldGraphic.setStrokeStyle(2, 0x00ffff, 0.85);
      this.shieldGraphic.setDepth(11);
    }

    // Damage enemies in range
    this.enemyData.forEach((enemy) => {
      if (enemy.isDead) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.position.x,
        enemy.position.y
      );

      if (distance <= ability.range) {
        const damage = this.combatSystem.calculateDamage(
          this.playerData.stats,
          enemy.stats,
          ability.damage
        );

        enemy.stats.health -= damage;

        const damageText = this.add.text(
          enemy.position.x,
          enemy.position.y - 20,
          `-${damage}`,
          {
            fontSize: '20px',
            color: abilityIndex === 3 ? '#ffdd00' : '#ff4444',
            fontStyle: 'bold',
          }
        ).setOrigin(0.5).setDepth(20);
        damageText.setData('startY', enemy.position.y - 20);
        this.damageTexts.push(damageText);

        if (this.networkManager.isOnline()) {
          this.networkManager.sendMessage({
            type: 'combat_event',
            playerId: this.playerData.id,
            data: {
              attacker: this.playerData.id,
              defender: enemy.id,
              damage,
              ability: ability.id,
              isCritical: damage > ability.damage * 1.4,
            },
            timestamp: Date.now(),
          });
        }

        if (enemy.stats.health <= 0) {
          this.enemyDeath(enemy);
        }
      }
    });
  }

  private enemyAttack(enemy: Enemy) {
    let damage = this.combatSystem.calculateDamage(
      enemy.stats,
      this.playerData.stats,
      14
    );

    if (this.time.now < this.shieldActiveUntil) {
      damage = Math.max(1, Math.floor(damage * 0.3));
    }

    this.playerData.stats.health -= damage;

    const damageText = this.add.text(
      this.player.x,
      this.player.y - 24,
      `-${damage}`,
      {
        fontSize: '18px',
        color: '#ff6666',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5).setDepth(20);
    damageText.setData('startY', this.player.y - 24);
    this.damageTexts.push(damageText);

    if (this.playerData.stats.health <= 0) {
      this.playerDeath();
    }
  }

  private updateAbilityCooldowns(dt: number) {
    this.playerData.abilities.forEach((ability) => {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown = Math.max(0, ability.currentCooldown - dt);
      }
    });
  }

  private enemyDeath(enemy: Enemy) {
    enemy.isDead = true;
    const sprite = this.enemies.get(enemy.id);
    if (sprite) {
      sprite.destroy();
      this.enemies.delete(enemy.id);
    }
    const hpBar = this.enemyHealthBars.get(enemy.id);
    if (hpBar) {
      hpBar.destroy();
      this.enemyHealthBars.delete(enemy.id);
    }
    this.enemyData.delete(enemy.id);

    // Award experience
    this.playerData.stats.experience += enemy.stats.experience;
    if (this.playerData.stats.experience >= this.playerData.stats.experienceToLevel) {
      this.levelUp();
    }

    // Respawn enemy after 4s
    this.time.delayedCall(4000, () => this.spawnEnemies(1));
  }

  private playerDeath() {
    this.playerData.isDead = true;
    this.player.setActive(false);
    this.scene.restart({ playerClass: this.selectedClass });
  }

  private levelUp() {
    this.playerData.stats.level++;
    this.playerData.stats.experience = 0;
    this.playerData.stats.experienceToLevel = Math.floor(
      this.playerData.stats.experienceToLevel * 1.2
    );
    this.playerData.stats.maxHealth += 15;
    this.playerData.stats.health = this.playerData.stats.maxHealth;
    this.playerData.stats.maxMana += 10;
    this.playerData.stats.mana = this.playerData.stats.maxMana;
    this.playerData.stats.strength += 5;

    const lvlText = this.add.text(this.player.x, this.player.y - 40, 'LEVEL UP!', {
      fontSize: '26px',
      color: '#00ffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);
    lvlText.setData('startY', this.player.y - 40);
    this.damageTexts.push(lvlText);
  }

  private handleEnemySpawn(_data: any) {
    // Handle network enemy spawn
  }

  private handleCombatEvent(_data: any) {
    // Handle network combat events
  }
}
