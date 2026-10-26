import { Enemy, Player, MapPing, PingType } from '../types';

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

export interface PartyMemberLocation {
  playerId: string;
  username: string;
  x: number;
  y: number;
  rotation: number;
  lastUpdated: number;
}

export const PING_CONFIG: Record<
  PingType,
  { label: string; color: string; hex: number; icon: string; freq: number }
> = {
  move: {
    label: 'Move Here',
    color: '#00ffff',
    hex: 0x00ffff,
    icon: '🎯',
    freq: 660,
  },
  attack: {
    label: 'Attack Target',
    color: '#ff2a55',
    hex: 0xff2a55,
    icon: '⚔️',
    freq: 880,
  },
  defend: {
    label: 'Defend / Group',
    color: '#a855f7',
    hex: 0xa855f7,
    icon: '🛡️',
    freq: 520,
  },
  danger: {
    label: 'Danger!',
    color: '#ffb703',
    hex: 0xffb703,
    icon: '⚠️',
    freq: 980,
  },
};

export class MiniMap {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private terrainCacheCanvas: HTMLCanvasElement;
  private terrainCacheCtx: CanvasRenderingContext2D | null;
  private worldData: WorldData;
  private zoomLevel: number = 1; // 1 = full world overview, 2 = local radar zoom
  private waypoint: Waypoint | null = null;
  private pulsePhase: number = 0;
  private objectiveStatusEl: HTMLElement | null = null;
  private pingAlertEl: HTMLElement | null = null;
  private zoomBtnEl: HTMLButtonElement | null = null;
  private activePingType: PingType = 'move';
  private activePings: Map<string, MapPing> = new Map();
  private onPingCallback?: (ping: MapPing) => void;
  private localPlayerInfo: { id: string; username: string } = {
    id: 'local',
    username: 'Player',
  };
  private lastPlayerPos = { x: 640, y: 360 };
  private alertTimeout?: number;

  constructor(worldData: WorldData, onPing?: (ping: MapPing) => void) {
    this.worldData = worldData;
    this.onPingCallback = onPing;
    this.terrainCacheCanvas = document.createElement('canvas');
    this.terrainCacheCanvas.width = 200;
    this.terrainCacheCanvas.height = 112;
    this.terrainCacheCtx = this.terrainCacheCanvas.getContext('2d');

    this.preRenderTerrain();
    this.bindDOM();
  }

  public setLocalPlayerInfo(id: string, username: string) {
    this.localPlayerInfo = { id, username };
  }

  private preRenderTerrain() {
    if (!this.terrainCacheCtx) return;
    const ctx = this.terrainCacheCtx;
    const rows = this.worldData.terrain.length || 45;
    const cols = this.worldData.terrain[0]?.length || 80;
    const cellW = this.terrainCacheCanvas.width / cols;
    const cellH = this.terrainCacheCanvas.height / rows;

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
    this.objectiveStatusEl = document.getElementById('minimap-objective');
    this.pingAlertEl = document.getElementById('ping-alert-banner');
    this.zoomBtnEl = document.getElementById('minimap-zoom-btn') as HTMLButtonElement | null;

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');

      this.canvas.onclick = (e: MouseEvent) => {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
        const clickY = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

        let chosenType: PingType = this.activePingType;
        if (e.shiftKey) chosenType = 'attack';
        else if (e.altKey) chosenType = 'danger';
        else if (e.ctrlKey || e.metaKey) chosenType = 'defend';

        const worldPos = this.canvasToWorld(clickX, clickY);
        this.triggerLocalPing(worldPos.x, worldPos.y, chosenType);
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

    const modeBtns = document.querySelectorAll<HTMLButtonElement>('.ping-mode-btn');
    modeBtns.forEach((btn) => {
      btn.onclick = (e: MouseEvent) => {
        e.preventDefault();
        const mode = (btn.getAttribute('data-ping-mode') || 'move') as PingType;
        this.setPingType(mode);
      };
    });

    if (this.worldData.dungeons.length > 0) {
      const firstDungeon = this.worldData.dungeons[0];
      this.waypoint = {
        x: firstDungeon.x,
        y: firstDungeon.y,
        label: firstDungeon.name,
      };
    }
  }

  public setPingType(type: PingType) {
    this.activePingType = type;
    const modeBtns = document.querySelectorAll<HTMLButtonElement>('.ping-mode-btn');
    modeBtns.forEach((btn) => {
      const btnMode = btn.getAttribute('data-ping-mode');
      if (btnMode === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public triggerLocalPing(worldX: number, worldY: number, pingType: PingType = this.activePingType) {
    const waypointInfo = this.setWaypoint(worldX, worldY);
    const ping: MapPing = {
      id: `ping_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      playerId: this.localPlayerInfo.id,
      username: this.localPlayerInfo.username,
      pingType,
      x: waypointInfo.x,
      y: waypointInfo.y,
      targetLabel: waypointInfo.label,
      timestamp: Date.now(),
      duration: 4500,
    };

    this.addPing(ping);
    if (this.onPingCallback) {
      this.onPingCallback(ping);
    }
  }

  public addPing(ping: MapPing) {
    if (!ping || !ping.id || this.activePings.has(ping.id)) return;
    this.activePings.set(ping.id, {
      ...ping,
      timestamp: Date.now(),
      duration: ping.duration || 4500,
    });

    this.waypoint = {
      x: ping.x,
      y: ping.y,
      label: ping.targetLabel || `${PING_CONFIG[ping.pingType]?.label || 'Ping'} (${ping.x}, ${ping.y})`,
    };

    this.playPingTone(ping.pingType);
    this.showPingBanner(ping);
  }

  private playPingTone(pingType: PingType) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const cfg = PING_CONFIG[pingType] || PING_CONFIG.move;

      osc.type = pingType === 'danger' || pingType === 'attack' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(cfg.freq * 1.35, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
      setTimeout(() => ctx.close().catch(() => {}), 350);
    } catch {
      // Ignore audio errors
    }
  }

  private showPingBanner(ping: MapPing) {
    if (!this.pingAlertEl) return;
    const cfg = PING_CONFIG[ping.pingType] || PING_CONFIG.move;
    const targetDesc = ping.targetLabel ? ` → ${ping.targetLabel}` : ` (${ping.x}, ${ping.y})`;
    this.pingAlertEl.style.display = 'flex';
    this.pingAlertEl.style.borderColor = cfg.color;
    this.pingAlertEl.innerHTML = `<span style="color:${cfg.color};font-weight:bold;">${cfg.icon} ${cfg.label}</span> <span style="color:#e2e8f0;margin-left:4px;">[${ping.username}]${targetDesc}</span>`;

    if (this.alertTimeout) {
      window.clearTimeout(this.alertTimeout);
    }
    this.alertTimeout = window.setTimeout(() => {
      if (this.pingAlertEl) {
        this.pingAlertEl.style.display = 'none';
      }
    }, 4200);
  }

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

  public setWaypoint(worldX: number, worldY: number): Waypoint {
    const clampedX = Math.max(0, Math.min(this.worldData.width, worldX));
    const clampedY = Math.max(0, Math.min(this.worldData.height, worldY));

    for (const dungeon of this.worldData.dungeons) {
      if (Math.hypot(dungeon.x - clampedX, dungeon.y - clampedY) < 90) {
        this.waypoint = {
          x: dungeon.x,
          y: dungeon.y,
          label: `${dungeon.name} (Lv.${dungeon.level})`,
        };
        return this.waypoint;
      }
    }

    for (const npc of this.worldData.npcs) {
      if (Math.hypot(npc.x - clampedX, npc.y - clampedY) < 90) {
        this.waypoint = {
          x: npc.x,
          y: npc.y,
          label: `${npc.name}`,
        };
        return this.waypoint;
      }
    }

    this.waypoint = {
      x: Math.round(clampedX),
      y: Math.round(clampedY),
      label: `Coords (${Math.round(clampedX)}, ${Math.round(clampedY)})`,
    };
    return this.waypoint;
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
    partyMembers: Map<string, PartyMemberLocation>,
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX, camY, camW, camH);

    // 4. Draw Dungeons (Gold/Purple diamonds)
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

    // 5. Draw NPCs / Quest Objectives
    for (const npc of this.worldData.npcs) {
      const nx = toCanvasX(npc.x);
      const ny = toCanvasY(npc.y);
      if (nx < -4 || nx > cw + 4 || ny < -4 || ny > ch + 4) continue;

      const isQuest = npc.type === 'quest';
      ctx.beginPath();
      ctx.arc(nx, ny, isQuest ? 3.2 : 2.3, 0, Math.PI * 2);
      ctx.fillStyle = isQuest ? '#00ff9d' : '#38bdf8';
      ctx.fill();
    }

    // 6. Draw Live Enemies
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
    });

    // 7. Draw Allied Party Members
    const now = Date.now();
    partyMembers.forEach((ally, allyId) => {
      if (allyId === player.id) return;
      if (now - ally.lastUpdated > 15000) return;

      const ax = toCanvasX(ally.x);
      const ay = toCanvasY(ally.y);
      if (ax < -6 || ax > cw + 6 || ay < -6 || ay > ch + 6) return;

      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ally.rotation || 0);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0a0e27';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-4, -3.5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 8. Draw Active Waypoint & Guide Line
    const px = toCanvasX(player.position.x);
    const py = toCanvasY(player.position.y);

    if (this.waypoint) {
      const wx = toCanvasX(this.waypoint.x);
      const wy = toCanvasY(this.waypoint.y);
      const dist = Math.round(
        Math.hypot(this.waypoint.x - player.position.x, this.waypoint.y - player.position.y)
      );

      if (dist < 45 && this.waypoint.label.startsWith('Coords')) {
        this.waypoint = null;
      } else {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(wx, wy);
        ctx.stroke();
        ctx.restore();

        const pulseRadius = 4 + Math.sin(this.pulsePhase) * 2;
        ctx.beginPath();
        ctx.arc(wx, wy, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        if (this.objectiveStatusEl) {
          this.objectiveStatusEl.textContent = `🎯 ${this.waypoint.label} • ${Math.round(dist / 10)}m`;
        }
      }
    } else if (this.objectiveStatusEl) {
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

    // 9. Draw Broadcasted Party Pings (Expanding Sonar Rings + Target Core)
    this.activePings.forEach((ping, id) => {
      const elapsed = now - ping.timestamp;
      if (elapsed > ping.duration) {
        this.activePings.delete(id);
        return;
      }

      const cfg = PING_CONFIG[ping.pingType] || PING_CONFIG.move;
      const pingX = toCanvasX(ping.x);
      const pingY = toCanvasY(ping.y);

      for (let r = 0; r < 2; r++) {
        const waveProgress = (elapsed / 900 + r * 0.5) % 1;
        const radius = 3 + waveProgress * 18;
        const alpha = (1 - waveProgress) * 0.9;

        ctx.save();
        ctx.beginPath();
        ctx.arc(pingX, pingY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = cfg.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(pingX, pingY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cfg.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    });

    // 10. Draw Local Player Directional Chevron
    ctx.save();
    ctx.translate(px, py);

    ctx.beginPath();
    ctx.arc(0, 0, 7 + Math.sin(this.pulsePhase) * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

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
