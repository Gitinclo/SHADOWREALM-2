import { Enemy, Player } from '../types';

export interface WorldDungeon {
  id: string;
  name: string;
  x: number;
  y: number;
  level: number;
  difficulty: string;
  bosses: number;
}

export interface WorldNPC {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  dialogue: string;
  quests: any[];
}

export interface WorldData {
  terrain: number[][];
  dungeons: WorldDungeon[];
  npcs: WorldNPC[];
  width: number;
  height: number;
  tileSize: number;
}

export interface Waypoint {
  x: number;
  y: number;
  label: string;
}

export class MiniMap {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private terrainCacheCanvas: HTMLCanvasElement;
  private terrainCacheCtx: CanvasRenderingContext2D | null;
  private worldData: WorldData;
  private zoomLevel: number = 1; // 1 = full world overview, 2 = local radar zoom
  private waypoint: Waypoint | null = null;
  private pulsePhase: number = 0;
  private hoveredLabelEl: HTMLElement | null = null;
  private objectiveStatusEl: HTMLElement | null = null;
  private zoomBtnEl: HTMLButtonElement | null = null;

  constructor(worldData: WorldData) {
    this.worldData = worldData;
    this.terrainCacheCanvas = document.createElement('canvas');
    this.terrainCacheCanvas.width = 200;
    this.terrainCacheCanvas.height = 112;
    this.terrainCacheCtx = this.terrainCacheCanvas.getContext('2d');

    this.preRenderTerrain();
    this.bindDOM();
  }

  private preRenderTerrain() {
    if (!this.terrainCacheCtx) return;
    const ctx = this.terrainCacheCtx;
    const rows = this.worldData.terrain.length || 45;
    const cols = this.worldData.terrain[0]?.length || 80;
    const cellW = this.terrainCacheCanvas.width / cols;
    const cellH = this.terrainCacheCanvas.height / rows;

    // Terrain palette matching GameScene tilemap
    const terrainColors: Record<number, string> = {
      0: '#0b1838', // Water
      1: '#121c3a', // Shadow Grass
      2: '#1b2852', // Dark Forest
      3: '#2c204d', // Obsidian Mountain
    };

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, this.terrainCacheCanvas.width, this.terrainCacheCanvas.height);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const val = this.worldData.terrain[y]?.[x] ?? 1;
        ctx.fillStyle = terrainColors[val] || '#121c3a';
        ctx.fillRect(
          Math.floor(x * cellW),
          Math.floor(y * cellH),
          Math.ceil(cellW),
          Math.ceil(cellH)
        );
      }
    }
  }

  private bindDOM() {
    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
    this.hoveredLabelEl = document.getElementById('minimap-tooltip');
    this.objectiveStatusEl = document.getElementById('minimap-objective');
    this.zoomBtnEl = document.getElementById('minimap-zoom-btn') as HTMLButtonElement | null;

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');

      this.canvas.onclick = (e: MouseEvent) => {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

        const worldPos = this.canvasToWorld(clickX, clickY);
        this.setWaypoint(worldPos.x, worldPos.y);
      };

      this.canvas.oncontextmenu = (e: MouseEvent) => {
        e.preventDefault();
        this.waypoint = null;
      };
    }

    if (this.zoomBtnEl) {
      this.zoomBtnEl.onclick = (e: MouseEvent) => {
        e.preventDefault();
        this.toggleZoom();
      };
    }

    // Set initial objective to nearest dungeon or quest giver
    if (this.worldData.dungeons.length > 0) {
      const firstDungeon = this.worldData.dungeons[0];
      this.waypoint = {
        x: firstDungeon.x,
        y: firstDungeon.y,
        label: firstDungeon.name,
      };
    }
  }

  private lastPlayerPos = { x: 640, y: 360 };

  public toggleZoom(): number {
    this.zoomLevel = this.zoomLevel === 1 ? 2 : 1;
    if (this.zoomBtnEl) {
      this.zoomBtnEl.textContent = `${this.zoomLevel}x`;
    }
    return this.zoomLevel;
  }

  public getWaypoint(): Waypoint | null {
    return this.waypoint;
  }

  public setWaypoint(worldX: number, worldY: number) {
    const clampedX = Math.max(0, Math.min(this.worldData.width, worldX));
    const clampedY = Math.max(0, Math.min(this.worldData.height, worldY));

    // Snap to nearby dungeon or NPC if clicked within 90 world units
    for (const dungeon of this.worldData.dungeons) {
      if (Math.hypot(dungeon.x - clampedX, dungeon.y - clampedY) < 90) {
        this.waypoint = {
          x: dungeon.x,
          y: dungeon.y,
          label: `${dungeon.name} (Lv.${dungeon.level})`,
        };
        return;
      }
    }

    for (const npc of this.worldData.npcs) {
      if (Math.hypot(npc.x - clampedX, npc.y - clampedY) < 90) {
        this.waypoint = {
          x: npc.x,
          y: npc.y,
          label: `${npc.name}`,
        };
        return;
      }
    }

    this.waypoint = {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      label: `Marker (${Math.round(clampedX)}, ${Math.round(clampedY)})`,
    };
  }

  private getViewWindow(playerX: number, playerY: number) {
    if (this.zoomLevel === 1) {
      return {
        x: 0,
        y: 0,
        w: this.worldData.width,
        h: this.worldData.height,
      };
    }

    // 2x Radar Zoom centered on player
    const viewW = this.worldData.width / 2;
    const viewH = this.worldData.height / 2;
    const viewX = Math.max(0, Math.min(this.worldData.width - viewW, playerX - viewW / 2));
    const viewY = Math.max(0, Math.min(this.worldData.height - viewH, playerY - viewH / 2));
    return { x: viewX, y: viewY, w: viewW, h: viewH };
  }

  private canvasToWorld(cx: number, cy: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const view = this.getViewWindow(this.lastPlayerPos.x, this.lastPlayerPos.y);
    return {
      x: view.x + (cx / this.canvas.width) * view.w,
      y: view.y + (cy / this.canvas.height) * view.h,
    };
  }

  public update(
    player: Player,
    enemies: Map<string, Enemy>,
    cameraBounds: { x: number; y: number; width: number; height: number },
    dt: number
  ) {
    if (!this.canvas || !this.ctx) return;

    this.pulsePhase += dt * 4;
    this.lastPlayerPos = { x: player.position.x, y: player.position.y };

    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const view = this.getViewWindow(player.position.x, player.position.y);

    const toCanvasX = (wx: number) => ((wx - view.x) / view.w) * cw;
    const toCanvasY = (wy: number) => ((wy - view.y) / view.h) * ch;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Draw pre-rendered terrain background
    const srcX = (view.x / this.worldData.width) * this.terrainCacheCanvas.width;
    const srcY = (view.y / this.worldData.height) * this.terrainCacheCanvas.height;
    const srcW = (view.w / this.worldData.width) * this.terrainCacheCanvas.width;
    const srcH = (view.h / this.worldData.height) * this.terrainCacheCanvas.height;

    ctx.drawImage(this.terrainCacheCanvas, srcX, srcY, srcW, srcH, 0, 0, cw, ch);

    // 2. Subtle tactical grid overlay
    ctx.strokeStyle = 'rgba(179, 102, 255, 0.12)';
    ctx.lineWidth = 1;
    const gridCols = 4;
    const gridRows = 3;
    for (let i = 1; i < gridCols; i++) {
      const gx = Math.floor((cw / gridCols) * i) + 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, ch);
      ctx.stroke();
    }
    for (let j = 1; j < gridRows; j++) {
      const gy = Math.floor((ch / gridRows) * j) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(cw, gy);
      ctx.stroke();
    }

    // 3. Draw camera viewport rectangle
    const camX = toCanvasX(cameraBounds.x);
    const camY = toCanvasY(cameraBounds.y);
    const camW = (cameraBounds.width / view.w) * cw;
    const camH = (cameraBounds.height / view.h) * ch;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX, camY, camW, camH);

    // 4. Draw Dungeons (Purple/Gold diamond objectives)
    for (const dungeon of this.worldData.dungeons) {
      const dx = toCanvasX(dungeon.x);
      const dy = toCanvasY(dungeon.y);
      if (dx < -6 || dx > cw + 6 || dy < -6 || dy > ch + 6) continue;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffb703';
      ctx.strokeStyle = '#7b2cff';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.strokeRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }

    // 5. Draw NPCs / Quest Objectives (Emerald / Cyan dots)
    for (const npc of this.worldData.npcs) {
      const nx = toCanvasX(npc.x);
      const ny = toCanvasY(npc.y);
      if (nx < -4 || nx > cw + 4 || ny < -4 || ny > ch + 4) continue;

      const isQuest = npc.type === 'quest';
      ctx.beginPath();
      ctx.arc(nx, ny, isQuest ? 3.2 : 2.3, 0, Math.PI * 2);
      ctx.fillStyle = isQuest ? '#00ff9d' : '#38bdf8';
      ctx.fill();
      if (isQuest) {
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 6. Draw Live Enemies (Crimson dots, brighter when aggroed)
    enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const ex = toCanvasX(enemy.position.x);
      const ey = toCanvasY(enemy.position.y);
      if (ex < -4 || ex > cw + 4 || ey < -4 || ey > ch + 4) return;

      const isAggro = Boolean(enemy.targetId);
      ctx.beginPath();
      ctx.arc(ex, ey, isAggro ? 3.4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isAggro ? '#ff2a55' : '#ef4444';
      ctx.fill();

      if (isAggro) {
        ctx.strokeStyle = 'rgba(255, 42, 85, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // 7. Draw Active Waypoint & Guide Line
    const px = toCanvasX(player.position.x);
    const py = toCanvasY(player.position.y);

    if (this.waypoint) {
      const wx = toCanvasX(this.waypoint.x);
      const wy = toCanvasY(this.waypoint.y);
      const dist = Math.round(
        Math.hypot(this.waypoint.x - player.position.x, this.waypoint.y - player.position.y)
      );

      // Auto-clear custom marker when reached
      if (dist < 45 && this.waypoint.label.startsWith('Marker')) {
        this.waypoint = null;
      } else {
        // Dashed trajectory line from player to objective
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        ctx.restore();

        // Pulsing beacon ring around waypoint
        const pulseRadius = 4 + Math.sin(this.pulsePhase) * 2.5;
        ctx.beginPath();
        ctx.arc(wx, wy, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (this.objectiveStatusEl) {
          this.objectiveStatusEl.textContent = `🎯 ${this.waypoint.label} • ${Math.round(dist / 10)}m`;
        }
      }
    } else if (this.objectiveStatusEl) {
      // Find nearest dungeon or quest NPC
      let nearestLabel = 'Explore the ShadowRealm';
      let minDist = Infinity;
      for (const d of this.worldData.dungeons) {
        const dist = Math.hypot(d.x - player.position.x, d.y - player.position.y);
        if (dist < minDist) {
          minDist = dist;
          nearestLabel = `${d.name} (${Math.round(dist / 10)}m)`;
        }
      }
      this.objectiveStatusEl.textContent = `🧭 Nearest: ${nearestLabel}`;
    }

    // 8. Draw Player Directional Arrow & Radar Pulse
    ctx.save();
    ctx.translate(px, py);

    // Subtle radar ring around player
    ctx.beginPath();
    ctx.arc(0, 0, 7 + Math.sin(this.pulsePhase) * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Directional cone/chevron showing player facing angle
    ctx.rotate(player.rotation);
    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#0a0e27';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4.5, -4);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-4.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
