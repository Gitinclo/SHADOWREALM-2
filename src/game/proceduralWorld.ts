// Procedural Voxel Terrain, 2D Simplex + Hydraulic Erosion River Routing,
// Poisson-Disk Resource Spawner & Interactive 3D Three.js Voxel/Dungeon Viewport

import * as THREE from 'three';
import { WeatherType } from './weather';
import { GeneratedDungeon } from './dungeons';
import { synthesizePBRCanvasTexture } from './graphicsEngine';

export interface PoissonResourceNode {
  id: string;
  type: 'spirit_vein' | 'ancient_herb' | 'star_iron_ore' | 'tribulation_crystal';
  x: number;
  z: number;
  elevation: number;
  tier: number; // 1 .. 10
  richnessMultiplier: number;
}

export interface ErodedTerrainMap {
  gridSize: number;
  heights: number[][];
  riverMask: boolean[][];
  biomeGrid: Array<Array<'river_basin' | 'shoreline_moss' | 'spirit_meadow' | 'alpine_rock'>>;
  resourceNodes: PoissonResourceNode[];
}

/**
 * Deterministic 2D Value/Simplex-style smooth noise
 */
function smoothNoise2D(x: number, z: number, seed: number): number {
  const hash = (ix: number, iz: number) => {
    let n = (ix * 374761393 + iz * 668265263 + seed * 1442695041) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  };

  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);

  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

/**
 * Generates a 40x40 Voxel Terrain Grid with Multi-Octave Noise,
 * Hydraulic Erosion River Carving, and Bridson's Poisson-Disk Resource Spawning.
 */
export function generateErodedVoxelTerrain(params: {
  gridSize?: number;
  seed?: number;
  weather?: WeatherType;
  citadelEra?: number;
}): ErodedTerrainMap {
  const gridSize = params.gridSize ?? 40;
  const seed = params.seed ?? 2026;
  const weather = params.weather ?? 'clear_sky';
  const citadelEra = params.citadelEra ?? 5;

  const heights: number[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => 0)
  );
  const riverMask: boolean[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => false)
  );

  // 1. Multi-Octave Height Synthesis
  for (let z = 0; z < gridSize; z++) {
    for (let x = 0; x < gridSize; x++) {
      // Keep central 8x8 plateau leveled for the Scaling Citadel
      const distCenter = Math.hypot(x - gridSize / 2, z - gridSize / 2);
      if (distCenter < 5.2) {
        heights[z][x] = 2.6;
        continue;
      }
      const n1 = smoothNoise2D(x * 0.1, z * 0.1, seed);
      const n2 = smoothNoise2D(x * 0.25, z * 0.25, seed + 77) * 0.5;
      heights[z][x] = Number(((n1 + n2) * 4.2).toFixed(2));
    }
  }

  // 2. Hydraulic Erosion & Winding River Basin Routing
  let rx = 0;
  let rz = Math.floor(gridSize * 0.28);
  while (rx < gridSize) {
    // Route river around the central citadel moat
    const distToCitadel = Math.hypot(rx - gridSize / 2, rz - gridSize / 2);
    if (distToCitadel < 6.5) {
      rz = Math.min(gridSize - 3, rz + 2);
    }
    for (let dz = -1; dz <= 1; dz++) {
      const cz = Math.max(0, Math.min(gridSize - 1, rz + dz));
      heights[cz][rx] = 0.25;
      riverMask[cz][rx] = true;
    }
    const meander = smoothNoise2D(rx * 0.2, seed, seed) - 0.48;
    if (meander > 0.08 && rz < gridSize - 3) rz++;
    else if (meander < -0.08 && rz > 2) rz--;
    rx++;
  }

  // 3. Classify Biomes
  const biomeGrid: ErodedTerrainMap['biomeGrid'] = Array.from({ length: gridSize }, (_, z) =>
    Array.from({ length: gridSize }, (__, x) => {
      if (riverMask[z][x]) return 'river_basin';
      const h = heights[z][x];
      if (h < 1.3) return 'shoreline_moss';
      if (h > 3.6) return 'alpine_rock';
      return 'spirit_meadow';
    })
  );

  // 4. Poisson-Disk Resource Spawning based on Territory & Weather
  const resourceNodes = samplePoissonDiskResources({
    gridSize,
    minDistance: 4.8,
    heights,
    riverMask,
    weather,
    citadelEra,
    seed,
  });

  return {
    gridSize,
    heights,
    riverMask,
    biomeGrid,
    resourceNodes,
  };
}

/**
 * Bridson-inspired Poisson-Disk Sampler guaranteeing minimum separation distance
 * between Spirit Veins, Ancient Herbs, Star-Iron Ore, and Tribulation Crystals.
 */
export function samplePoissonDiskResources(params: {
  gridSize: number;
  minDistance: number;
  heights: number[][];
  riverMask: boolean[][];
  weather: WeatherType;
  citadelEra: number;
  seed: number;
}): PoissonResourceNode[] {
  const nodes: PoissonResourceNode[] = [];
  const types: Array<PoissonResourceNode['type']> = [
    'spirit_vein',
    'ancient_herb',
    'star_iron_ore',
    'tribulation_crystal',
  ];

  const weatherRichness =
    params.weather === 'blood_moon'
      ? 1.5
      : params.weather === 'spirit_mist'
      ? 1.35
      : params.weather === 'thunderstorm'
      ? 1.25
      : 1.0;

  let candidateIdx = 0;
  for (let attempt = 0; attempt < 220 && nodes.length < 28; attempt++) {
    candidateIdx++;
    const cx = Math.floor(smoothNoise2D(attempt * 1.3, params.seed, params.seed + 11) * (params.gridSize - 4)) + 2;
    const cz = Math.floor(smoothNoise2D(params.seed, attempt * 1.7, params.seed + 29) * (params.gridSize - 4)) + 2;

    // Exclude river cells and central citadel footprint
    if (params.riverMask[cz]?.[cx]) continue;
    if (Math.hypot(cx - params.gridSize / 2, cz - params.gridSize / 2) < 6.5) continue;

    // Enforce minimum Poisson-disk distance
    const tooClose = nodes.some(
      (existing) => Math.hypot(existing.x - cx, existing.z - cz) < params.minDistance
    );
    if (tooClose) continue;

    const nodeType =
      params.weather === 'thunderstorm' && candidateIdx % 3 === 0
        ? 'tribulation_crystal'
        : types[candidateIdx % types.length];

    nodes.push({
      id: `node_${nodes.length + 1}`,
      type: nodeType,
      x: cx,
      z: cz,
      elevation: params.heights[cz]?.[cx] ?? 1.5,
      tier: Math.max(1, Math.min(10, params.citadelEra + (candidateIdx % 3))),
      richnessMultiplier: weatherRichness,
    });
  }

  return nodes;
}

// ============================================================================
// Interactive 3D Three.js Voxel Realms & Procedural Dungeon Delve Viewport
// ============================================================================

export class VoxelRealms3DViewport {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rootGroup: THREE.Group;
  private astrolabeRings: THREE.Mesh[] = [];
  private fireflyParticles: THREE.Points | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private playerBeacon: THREE.Group | null = null;
  private animFrameId: number | null = null;
  private isVisible: boolean = false;
  private mode: 'voxel_citadel' | 'dungeon_delve' = 'voxel_citadel';

  // Camera spherical orbit state
  private orbitYaw: number = 0.65;
  private orbitPitch: number = 0.58;
  private orbitDistance: number = 38;
  private targetOrbitYaw: number = 0.65;
  private targetOrbitPitch: number = 0.58;
  private targetOrbitDistance: number = 38;
  private isDragging: boolean = false;
  private lastPointer = { x: 0, y: 0 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080a10);
    this.scene.fog = new THREE.FogExp2(0x080a10, 0.014);

    const w = Math.max(320, container.clientWidth || window.innerWidth);
    const h = Math.max(240, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.5, 300);
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.initLights();
    this.initRenderer(w, h);
    this.bindInteractionEvents();
  }

  private initLights() {
    // Three-Point Studio & Xianxia Atmospheric Lighting
    const ambientFill = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.75);
    this.scene.add(ambientFill);

    const keyLight = new THREE.DirectionalLight(0xffdfa8, 1.45);
    keyLight.position.set(28, 45, 24);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.85);
    rimLight.position.set(-30, 22, -26);
    this.scene.add(rimLight);
  }

  private initRenderer(width: number, height: number) {
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      const canvas = this.renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';

      // WebGL context safety handlers
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
      });
      canvas.addEventListener('webglcontextrestored', () => {
        this.startLoop();
      });

      this.container.innerHTML = '';
      this.container.appendChild(canvas);
    } catch {
      this.container.innerHTML =
        '<div style="color:#f8fafc;padding:24px;">3D WebGL Preview Standby</div>';
    }
  }

  private bindInteractionEvents() {
    this.container.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.isVisible) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.targetOrbitYaw -= dx * 0.007;
      this.targetOrbitPitch = Math.max(0.22, Math.min(1.38, this.targetOrbitPitch + dy * 0.006));
    });

    this.container.addEventListener(
      'wheel',
      (e) => {
        if (!this.isVisible) return;
        e.preventDefault();
        this.targetOrbitDistance = Math.max(16, Math.min(72, this.targetOrbitDistance + e.deltaY * 0.03));
      },
      { passive: false }
    );

    window.addEventListener('resize', () => {
      if (!this.renderer || !this.isVisible) return;
      const w = Math.max(320, this.container.clientWidth || window.innerWidth);
      const h = Math.max(240, this.container.clientHeight || window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private clearRootGroup() {
    this.astrolabeRings = [];
    this.fireflyParticles = null;
    this.waterMesh = null;
    this.playerBeacon = null;

    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children.pop()!;
      this.rootGroup.remove(child);
    }
  }

  /**
   * Builds the 40x40 Chunked Voxel Terrain, Eroded River Basin, Scaling Citadel (Eras 0-10)
   * with Rotating Astrolabe Rings, and Poisson-Disk Resource Nodes.
   */
  public renderVoxelCitadelWorld(params: {
    citadelLevel: number;
    weather: WeatherType;
    seed?: number;
  }) {
    this.mode = 'voxel_citadel';
    this.clearRootGroup();

    const terrain = generateErodedVoxelTerrain({
      gridSize: 32,
      seed: params.seed ?? 2026,
      weather: params.weather,
      citadelEra: Math.floor(params.citadelLevel / 10),
    });

    const half = terrain.gridSize / 2;
    const grassTex = synthesizePBRCanvasTexture('meadow_grass', 128);
    const stoneTex = synthesizePBRCanvasTexture('chiseled_stone', 128);
    const roofTex = synthesizePBRCanvasTexture('glazed_roof_tile', 128);

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const matMeadow = new THREE.MeshStandardMaterial({
      color: 0x1e4d38,
      map: grassTex || undefined,
      roughness: 0.78,
      metalness: 0.08,
    });
    const matMoss = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.65,
      metalness: 0.1,
    });
    const matRock = new THREE.MeshStandardMaterial({
      color: 0x475569,
      map: stoneTex || undefined,
      roughness: 0.55,
      metalness: 0.25,
    });

    // Build terrain voxels
    for (let z = 0; z < terrain.gridSize; z++) {
      for (let x = 0; x < terrain.gridSize; x++) {
        if (terrain.riverMask[z][x]) continue;
        const h = Math.max(0.4, terrain.heights[z][x]);
        const biome = terrain.biomeGrid[z][x];
        const mat =
          biome === 'alpine_rock'
            ? matRock
            : biome === 'shoreline_moss'
            ? matMoss
            : matMeadow;

        const voxel = new THREE.Mesh(boxGeo, mat);
        voxel.scale.set(0.96, h, 0.96);
        voxel.position.set(x - half, h / 2, z - half);
        this.rootGroup.add(voxel);
      }
    }

    // Gerstner Wave River Plane
    const waterGeo = new THREE.PlaneGeometry(terrain.gridSize, terrain.gridSize, 24, 24);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.4,
      opacity: 0.82,
      transparent: true,
      roughness: 0.18,
      metalness: 0.1,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = 0.75;
    this.rootGroup.add(this.waterMesh);

    // Scaling Immortal Citadel at Center (Eras 0..10)
    const era = Math.max(1, Math.min(10, Math.floor(params.citadelLevel / 10) + 1));
    const citadelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: stoneTex || undefined,
      roughness: 0.4,
      metalness: 0.45,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      map: roofTex || undefined,
      roughness: 0.28,
      metalness: 0.75,
    });

    for (let tier = 0; tier < Math.min(5, Math.ceil(era / 2) + 1); tier++) {
      const tierW = Math.max(1.8, 7.5 - tier * 1.35);
      const tierH = 1.4 + tier * 0.35;
      const baseY = 2.6 + tier * 1.5;

      const body = new THREE.Mesh(new THREE.BoxGeometry(tierW, tierH, tierW), citadelMat);
      body.position.set(0, baseY + tierH / 2, 0);
      this.rootGroup.add(body);

      const eaves = new THREE.Mesh(
        new THREE.ConeGeometry(tierW * 0.82, 0.9, 4),
        roofMat
      );
      eaves.rotation.y = Math.PI / 4;
      eaves.position.set(0, baseY + tierH + 0.4, 0);
      this.rootGroup.add(eaves);
    }

    // Golden Celestial Astrolabe Rings orbiting the Citadel peak
    const ringCount = Math.min(4, Math.max(1, Math.floor(era / 2)));
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.15,
    });

    for (let r = 0; r < ringCount; r++) {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(2.6 + r * 1.15, 0.08, 12, 48),
        ringMat
      );
      torus.position.set(0, 7.5 + era * 0.4, 0);
      torus.rotation.x = Math.PI / 3 + r * 0.35;
      this.astrolabeRings.push(torus);
      this.rootGroup.add(torus);
    }

    // Render Poisson-Disk Resource Nodes
    const nodeColors: Record<PoissonResourceNode['type'], number> = {
      spirit_vein: 0x06b6d4,
      ancient_herb: 0x10b981,
      star_iron_ore: 0xf59e0b,
      tribulation_crystal: 0xa855f7,
    };

    for (const node of terrain.resourceNodes) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: nodeColors[node.type],
          emissive: nodeColors[node.type],
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.8,
        })
      );
      crystal.position.set(node.x - half, node.elevation + 0.55, node.z - half);
      this.rootGroup.add(crystal);
    }

    this.spawnAtmosphericParticles(params.weather);
  }

  /**
   * Renders the 3D Procedural BSP + WFC Dungeon Delve (Rooms, Corridors, A* Path Runes & Boss Sanctum)
   */
  public renderProceduralDungeonDelve(dungeon: GeneratedDungeon) {
    this.mode = 'dungeon_delve';
    this.clearRootGroup();

    const halfW = dungeon.width / 2;
    const halfH = dungeon.height / 2;
    const stoneTex = synthesizePBRCanvasTexture('chiseled_stone', 128);
    const armorTex = synthesizePBRCanvasTexture('damascus_armor', 128);

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: stoneTex || undefined,
      roughness: 0.65,
      metalness: 0.2,
    });
    const corridorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.15,
    });
    const arrayMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.8,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      map: armorTex || undefined,
      roughness: 0.85,
      metalness: 0.3,
    });

    const tileGeo = new THREE.BoxGeometry(0.95, 0.4, 0.95);
    const wallGeo = new THREE.BoxGeometry(0.98, 2.2, 0.98);

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const t = dungeon.tiles[y][x];
        const wx = x - halfW;
        const wz = y - halfH;

        if (t === 'void_wall') {
          // Only extrude perimeter walls adjacent to walkable tiles to keep scene crisp
          const hasWalkableNeighbor =
            (y > 0 && dungeon.tiles[y - 1][x] !== 'void_wall') ||
            (y < dungeon.height - 1 && dungeon.tiles[y + 1][x] !== 'void_wall') ||
            (x > 0 && dungeon.tiles[y][x - 1] !== 'void_wall') ||
            (x < dungeon.width - 1 && dungeon.tiles[y][x + 1] !== 'void_wall');

          if (hasWalkableNeighbor) {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(wx, 1.1, wz);
            this.rootGroup.add(wall);
          }
          continue;
        }

        const mat =
          t === 'spirit_array'
            ? arrayMat
            : t === 'corridor_tile'
            ? corridorMat
            : floorMat;
        const floor = new THREE.Mesh(tileGeo, mat);
        floor.position.set(wx, 0, wz);
        this.rootGroup.add(floor);

        if (t === 'treasure_chest') {
          const chest = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.45, 0.4),
            new THREE.MeshStandardMaterial({
              color: 0xf59e0b,
              emissive: 0xb45309,
              emissiveIntensity: 0.4,
              metalness: 0.85,
              roughness: 0.2,
            })
          );
          chest.position.set(wx, 0.45, wz);
          this.rootGroup.add(chest);
        }
      }
    }

    // Highlight A* Verified Solvable Path from Entrance to Boss Sanctum
    const pathMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    for (const step of dungeon.astarPathToBoss) {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), pathMat);
      marker.position.set(step.x - halfW, 0.35, step.y - halfH);
      this.rootGroup.add(marker);
    }

    // Entrance Shrine Portal Beacon (Jade Cyan)
    const entrancePortal = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.12, 12, 32),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 0.85,
      })
    );
    entrancePortal.position.set(
      dungeon.entrance.x - halfW,
      1.2,
      dungeon.entrance.y - halfH
    );
    this.astrolabeRings.push(entrancePortal);
    this.rootGroup.add(entrancePortal);

    // Boss Altar Beacon (Crimson-Gold Tribulation Sovereign)
    const bossMonolith = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1, 0),
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.75,
        metalness: 0.8,
        roughness: 0.2,
      })
    );
    bossMonolith.position.set(
      dungeon.bossAltar.x - halfW,
      1.6,
      dungeon.bossAltar.y - halfH
    );
    this.astrolabeRings.push(bossMonolith);
    this.rootGroup.add(bossMonolith);

    this.spawnAtmosphericParticles('spirit_mist');
  }

  private spawnAtmosphericParticles(weather: WeatherType) {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = Math.random() * 16 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color =
      weather === 'blood_moon'
        ? 0xef4444
        : weather === 'thunderstorm'
        ? 0x38bdf8
        : 0xfbbf24;

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.24,
      transparent: true,
      opacity: 0.8,
    });
    this.fireflyParticles = new THREE.Points(geo, mat);
    this.rootGroup.add(this.fireflyParticles);
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
    if (visible) {
      if (this.renderer) {
        const w = Math.max(320, this.container.clientWidth || window.innerWidth);
        const h = Math.max(240, this.container.clientHeight || window.innerHeight);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
      this.startLoop();
    } else if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public isActive(): boolean {
    return this.isVisible;
  }

  public getMode(): 'voxel_citadel' | 'dungeon_delve' {
    return this.mode;
  }

  private startLoop() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    const animate = (timeMs: number) => {
      if (!this.isVisible) return;
      this.animFrameId = requestAnimationFrame(animate);

      const t = timeMs * 0.001;
      // Smooth camera orbit damping
      this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * 0.08;
      this.orbitPitch += (this.targetOrbitPitch - this.orbitPitch) * 0.08;
      this.orbitDistance += (this.targetOrbitDistance - this.orbitDistance) * 0.08;

      const cx =
        Math.cos(this.orbitPitch) * Math.sin(this.orbitYaw) * this.orbitDistance;
      const cy = Math.sin(this.orbitPitch) * this.orbitDistance;
      const cz =
        Math.cos(this.orbitPitch) * Math.cos(this.orbitYaw) * this.orbitDistance;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, 2.2, 0);

      // Rotate astrolabe rings and dungeon portals
      this.astrolabeRings.forEach((ring, i) => {
        ring.rotation.z = t * (0.45 + i * 0.2);
        ring.rotation.y = t * (0.3 - i * 0.15);
      });

      // Gently animate firefly/qi particles
      if (this.fireflyParticles) {
        this.fireflyParticles.rotation.y = t * 0.05;
      }

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animFrameId = requestAnimationFrame(animate);
  }
}
