// Pure Procedural Dungeon Delve Engine: 3D Binary Space Partitioning (BSP) for Dao Grottoes +
// Wave Function Collapse (WFC) Constraint Solver + A* Solvability Verification

export type DungeonTheme = 'dao_grotto' | 'secret_realm' | 'tribulation_chamber';

export type DungeonTileType =
  | 'void_wall'
  | 'stone_floor'
  | 'corridor_tile'
  | 'spirit_array'
  | 'lava_chasm'
  | 'jade_bridge'
  | 'entrance_portal'
  | 'boss_altar'
  | 'treasure_chest';

export type DungeonRoomRole =
  | 'entry_shrine'
  | 'spirit_vein_chamber'
  | 'guardian_barracks'
  | 'inner_demon_hall'
  | 'treasure_vault'
  | 'boss_sanctum';

export interface DungeonRoom {
  id: string;
  role: DungeonRoomRole;
  name: string;
  x: number;
  y: number;
  zElevation: number;
  width: number;
  height: number;
  depth3D: number;
  centerX: number;
  centerY: number;
  monsterBracket: number; // 1 .. 5
  monsterLevel: number; // 1 .. 1000
}

export interface DungeonEncounter {
  id: string;
  roomId: string;
  name: string;
  bracket: 1 | 2 | 3 | 4 | 5;
  level: number;
  x: number;
  y: number;
  zElevation: number;
  telegraphPattern: 'cleave' | 'cone' | 'void_rift' | 'cataclysm_3phase';
  defeated: boolean;
}

/**
 * 3D BSP Node representing a partitioned volume in a procedural 3D Dao Grotto
 */
export interface BSPPartitionNode {
  id: string;
  depthLevel: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  splitAxis?: 'x' | 'y' | 'z';
  left?: BSPPartitionNode;
  right?: BSPPartitionNode;
  room?: {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  };
}

/**
 * 3D Voxel representation of a carved Dao Grotto chamber/corridor block
 */
export interface VoxelGrotto3DBlock {
  x: number;
  y: number;
  z: number;
  voxelType:
    | 'obsidian_wall'
    | 'jade_floor'
    | 'spirit_stalactite'
    | 'qi_crystal_vein'
    | 'corridor_arch'
    | 'altar_core';
}

export interface GeneratedDungeon {
  seed: number;
  theme: DungeonTheme;
  themeTitle: string;
  floorLevel: number; // 1 .. 100
  recommendedRealmIndex: number;
  width: number;
  height: number;
  depth3D: number;
  tiles: DungeonTileType[][];
  rooms: DungeonRoom[];
  encounters: DungeonEncounter[];
  entrance: { x: number; y: number };
  bossAltar: { x: number; y: number };
  astarPathToBoss: Array<{ x: number; y: number }>;
  isSolvable: boolean;
  wfcCollapsedCells: number;
  bspRoot: BSPPartitionNode;
  bspLeafCount: number;
  voxelBlocks3D: VoxelGrotto3DBlock[];
}

/**
 * Deterministic PRNG (Mulberry32)
 */
export function createDungeonRNG(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * WFC Adjacency Rules defining which tile types can border one another inside rooms
 */
const WFC_ADJACENCY: Record<DungeonTileType, DungeonTileType[]> = {
  void_wall: ['void_wall', 'stone_floor', 'corridor_tile'],
  stone_floor: [
    'stone_floor',
    'corridor_tile',
    'spirit_array',
    'jade_bridge',
    'entrance_portal',
    'boss_altar',
    'treasure_chest',
    'void_wall',
  ],
  corridor_tile: ['corridor_tile', 'stone_floor', 'jade_bridge', 'void_wall'],
  spirit_array: ['stone_floor', 'spirit_array', 'boss_altar'],
  lava_chasm: ['lava_chasm', 'jade_bridge', 'stone_floor'],
  jade_bridge: ['stone_floor', 'corridor_tile', 'lava_chasm', 'jade_bridge'],
  entrance_portal: ['stone_floor', 'corridor_tile'],
  boss_altar: ['stone_floor', 'spirit_array'],
  treasure_chest: ['stone_floor', 'spirit_array'],
};

/**
 * Recursively partitions a 3D Dao Grotto bounding volume using Binary Space Partitioning (BSP).
 * Guarantees non-overlapping spatial sub-volumes with vertical Z-tier elevation progression.
 */
export function buildBSP3DDaoGrottoTree(params: {
  width: number;
  height: number;
  depth3D?: number;
  maxDepth?: number;
  seed: number;
}): { root: BSPPartitionNode; leaves: BSPPartitionNode[] } {
  const rng = createDungeonRNG(params.seed);
  const maxDepth = params.maxDepth ?? 3;
  const depth3D = Math.max(6, params.depth3D ?? 12);

  const root: BSPPartitionNode = {
    id: 'bsp_root',
    depthLevel: 0,
    x: 1,
    y: 1,
    z: 0,
    w: params.width - 2,
    h: params.height - 2,
    d: depth3D,
  };

  const leaves: BSPPartitionNode[] = [];
  let nodeCounter = 0;

  function splitNode(node: BSPPartitionNode, remainingDepth: number) {
    if (remainingDepth <= 0 || (node.w < 14 && node.h < 14)) {
      leaves.push(node);
      return;
    }

    const splitHorizontally =
      node.w < node.h ? true : node.h < node.w ? false : rng() > 0.5;

    if (splitHorizontally && node.h >= 14) {
      const splitH = Math.floor(node.h * (0.4 + rng() * 0.2));
      const zStep = Number((node.z + 0.5).toFixed(2));
      node.splitAxis = 'y';
      node.left = {
        id: `bsp_${++nodeCounter}`,
        depthLevel: node.depthLevel + 1,
        x: node.x,
        y: node.y,
        z: node.z,
        w: node.w,
        h: splitH,
        d: node.d,
      };
      node.right = {
        id: `bsp_${++nodeCounter}`,
        depthLevel: node.depthLevel + 1,
        x: node.x,
        y: node.y + splitH,
        z: zStep,
        w: node.w,
        h: node.h - splitH,
        d: node.d,
      };
      splitNode(node.left, remainingDepth - 1);
      splitNode(node.right, remainingDepth - 1);
    } else if (!splitHorizontally && node.w >= 14) {
      const splitW = Math.floor(node.w * (0.4 + rng() * 0.2));
      const zStep = Number((node.z + 0.5).toFixed(2));
      node.splitAxis = 'x';
      node.left = {
        id: `bsp_${++nodeCounter}`,
        depthLevel: node.depthLevel + 1,
        x: node.x,
        y: node.y,
        z: node.z,
        w: splitW,
        h: node.h,
        d: node.d,
      };
      node.right = {
        id: `bsp_${++nodeCounter}`,
        depthLevel: node.depthLevel + 1,
        x: node.x + splitW,
        y: node.y,
        z: zStep,
        w: node.w - splitW,
        h: node.h,
        d: node.d,
      };
      splitNode(node.left, remainingDepth - 1);
      splitNode(node.right, remainingDepth - 1);
    } else {
      leaves.push(node);
    }
  }

  splitNode(root, maxDepth);
  return { root, leaves };
}

/**
 * Generates 3D Dao Grotto voxel blocks (floors, obsidian walls, stalactites, spirit crystal veins, and boss altar core)
 * from a generated BSP+WFC dungeon layout.
 */
export function generate3DDaoGrottoVoxels(
  tiles: DungeonTileType[][],
  rooms: DungeonRoom[]
): VoxelGrotto3DBlock[] {
  const blocks: VoxelGrotto3DBlock[] = [];
  const height = tiles.length;
  const width = tiles[0]?.length || 0;

  // Map room elevation lookup
  const getElevationAt = (x: number, y: number): number => {
    for (const r of rooms) {
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        return Math.round(r.zElevation);
      }
    }
    return 0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y][x];
      if (t === 'void_wall') continue;

      const zBase = getElevationAt(x, y);
      blocks.push({
        x,
        y,
        z: zBase,
        voxelType:
          t === 'corridor_tile'
            ? 'corridor_arch'
            : t === 'boss_altar'
            ? 'altar_core'
            : t === 'spirit_array' || t === 'treasure_chest'
            ? 'qi_crystal_vein'
            : 'jade_floor',
      });

      // Add overhead grotto stalactites on spirit array / boss chambers for 3D depth
      if (t === 'spirit_array' || t === 'boss_altar') {
        blocks.push({
          x,
          y,
          z: zBase + 4,
          voxelType: 'spirit_stalactite',
        });
      }
    }
  }

  return blocks;
}

/**
 * Generates a 3D-layered Procedural Dungeon using BSP macro room hierarchy +
 * WFC interior pattern synthesis + A* entrance-to-boss verification.
 */
export function generateProceduralDungeon(params: {
  seed: number;
  theme: DungeonTheme;
  floorLevel?: number;
  width?: number;
  height?: number;
  depth3D?: number;
}): GeneratedDungeon {
  const width = Math.max(28, Math.min(64, params.width ?? 40));
  const height = Math.max(28, Math.min(64, params.height ?? 32));
  const depth3D = Math.max(6, Math.min(24, params.depth3D ?? 12));
  const floorLevel = Math.max(1, Math.min(100, params.floorLevel ?? 1));
  const rng = createDungeonRNG(params.seed);

  const themeMeta: Record<DungeonTheme, { title: string; minRealm: number }> = {
    dao_grotto: { title: 'Ancient Dao Grotto (古道洞天)', minRealm: 1 },
    secret_realm: { title: 'Nine-Nether Secret Realm (九幽秘境)', minRealm: 3 },
    tribulation_chamber: { title: 'Heavenly Tribulation Chamber (天劫雷池)', minRealm: 5 },
  };

  // Initialize grid with void_wall
  const tiles: DungeonTileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'void_wall' as DungeonTileType)
  );

  // 1. Macro 3D Binary Space Partitioning (BSP)
  const { root: bspRoot, leaves: leafNodes } = buildBSP3DDaoGrottoTree({
    width,
    height,
    depth3D,
    maxDepth: 3,
    seed: params.seed,
  });

  const roleNames: Record<DungeonRoomRole, string> = {
    entry_shrine: 'Ascension Entry Shrine',
    spirit_vein_chamber: 'Dragon Spirit Vein Pool',
    guardian_barracks: 'Immortal Puppet Garrison',
    inner_demon_hall: 'Heart-Demon Mirage Hall',
    treasure_vault: 'Celestial Pill & Artifact Vault',
    boss_sanctum: 'Apex Tribulation Sovereign Sanctum',
  };

  const rooms: DungeonRoom[] = [];

  leafNodes.forEach((leaf, idx) => {
    const rw = Math.max(5, Math.min(leaf.w - 2, Math.floor(leaf.w * (0.65 + rng() * 0.2))));
    const rh = Math.max(5, Math.min(leaf.h - 2, Math.floor(leaf.h * (0.65 + rng() * 0.2))));
    const rd = Math.max(4, Math.floor(depth3D * (0.5 + rng() * 0.4)));
    const rx = leaf.x + Math.max(1, Math.floor((leaf.w - rw) / 2));
    const ry = leaf.y + Math.max(1, Math.floor((leaf.h - rh) / 2));
    const isFirst = idx === 0;
    const isLast = idx === leafNodes.length - 1;
    const zElevation = isLast ? 2.5 : Number((idx * 0.5).toFixed(2));

    leaf.room = { x: rx, y: ry, z: zElevation, w: rw, h: rh, d: rd };

    let role: DungeonRoomRole = 'guardian_barracks';
    if (isFirst) role = 'entry_shrine';
    else if (isLast) role = 'boss_sanctum';
    else {
      const midRoles: DungeonRoomRole[] = [
        'spirit_vein_chamber',
        'guardian_barracks',
        'inner_demon_hall',
        'treasure_vault',
      ];
      role = midRoles[idx % midRoles.length];
    }

    const bracket = isLast ? 5 : Math.min(4, Math.max(1, Math.ceil(((idx + 1) / leafNodes.length) * 4)));
    const monsterLevel = Math.min(1000, floorLevel * 10 + idx * 15);

    const roomObj: DungeonRoom = {
      id: `room_${idx + 1}`,
      role,
      name: roleNames[role],
      x: rx,
      y: ry,
      zElevation,
      width: rw,
      height: rh,
      depth3D: rd,
      centerX: Math.floor(rx + rw / 2),
      centerY: Math.floor(ry + rh / 2),
      monsterBracket: bracket,
      monsterLevel,
    };
    rooms.push(roomObj);

    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
          tiles[y][x] = 'stone_floor';
        }
      }
    }
  });

  // Connect rooms sequentially with L-shaped corridors so full connectivity is guaranteed
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i];
    const b = rooms[i + 1];
    let cx = a.centerX;
    let cy = a.centerY;

    while (cx !== b.centerX) {
      if (tiles[cy][cx] === 'void_wall') tiles[cy][cx] = 'corridor_tile';
      cx += cx < b.centerX ? 1 : -1;
    }
    while (cy !== b.centerY) {
      if (tiles[cy][cx] === 'void_wall') tiles[cy][cx] = 'corridor_tile';
      cy += cy < b.centerY ? 1 : -1;
    }
  }

  // 2. Micro Wave Function Collapse (WFC) Constraint Solver inside carved rooms
  let wfcCollapsedCells = 0;
  for (const room of rooms) {
    if (room.role === 'entry_shrine') continue;
    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
        if (x === room.centerX && y === room.centerY) continue;
        const neighborTypes: DungeonTileType[] = [
          tiles[y - 1][x],
          tiles[y + 1][x],
          tiles[y][x - 1],
          tiles[y][x + 1],
        ];
        // Compute intersection of valid WFC domain based on neighbors
        let candidates: DungeonTileType[] = [
          'stone_floor',
          'spirit_array',
          'jade_bridge',
          'treasure_chest',
        ];
        for (const nb of neighborTypes) {
          const allowed = WFC_ADJACENCY[nb] || ['stone_floor'];
          candidates = candidates.filter((c) => allowed.includes(c));
        }
        if (candidates.length === 0) candidates = ['stone_floor'];

        const roll = rng();
        if (room.role === 'spirit_vein_chamber' && roll < 0.24 && candidates.includes('spirit_array')) {
          tiles[y][x] = 'spirit_array';
          wfcCollapsedCells++;
        } else if (room.role === 'treasure_vault' && roll < 0.14 && candidates.includes('treasure_chest')) {
          tiles[y][x] = 'treasure_chest';
          wfcCollapsedCells++;
        } else if (room.role === 'inner_demon_hall' && roll < 0.18 && candidates.includes('jade_bridge')) {
          tiles[y][x] = 'jade_bridge';
          wfcCollapsedCells++;
        }
      }
    }
  }

  // Place Entrance & Boss Altar
  const firstRoom = rooms[0];
  const lastRoom = rooms[rooms.length - 1];
  const entrance = { x: firstRoom.centerX, y: firstRoom.centerY };
  const bossAltar = { x: lastRoom.centerX, y: lastRoom.centerY };
  tiles[entrance.y][entrance.x] = 'entrance_portal';
  tiles[bossAltar.y][bossAltar.x] = 'boss_altar';

  // 3. Spawn Encounters per Room
  const encounters: DungeonEncounter[] = [];
  rooms.slice(1).forEach((room, idx) => {
    const isBoss = room.role === 'boss_sanctum';
    const bracket = (isBoss ? 5 : Math.min(4, Math.max(1, room.monsterBracket))) as 1 | 2 | 3 | 4 | 5;
    const telegraphs: Array<DungeonEncounter['telegraphPattern']> = [
      'cleave',
      'cone',
      'void_rift',
      'cataclysm_3phase',
    ];
    encounters.push({
      id: `enc_${idx + 1}`,
      roomId: room.id,
      name: isBoss
        ? `Tribulation Sovereign Titan (Lv.${room.monsterLevel})`
        : `${room.name} Guardian (Lv.${room.monsterLevel})`,
      bracket,
      level: room.monsterLevel,
      x: room.centerX,
      y: room.centerY,
      zElevation: room.zElevation,
      telegraphPattern: isBoss ? 'cataclysm_3phase' : telegraphs[idx % 3],
      defeated: false,
    });
  });

  // 4. Verify solvability via A* Pathfinding from Entrance to Boss Altar
  const astarPathToBoss = findDungeonPathAStar(tiles, entrance, bossAltar);

  // 5. Generate 3D Dao Grotto Voxel Blocks
  const voxelBlocks3D = generate3DDaoGrottoVoxels(tiles, rooms);

  return {
    seed: params.seed,
    theme: params.theme,
    themeTitle: themeMeta[params.theme].title,
    floorLevel,
    recommendedRealmIndex: themeMeta[params.theme].minRealm,
    width,
    height,
    depth3D,
    tiles,
    rooms,
    encounters,
    entrance,
    bossAltar,
    astarPathToBoss,
    isSolvable: astarPathToBoss.length > 0,
    wfcCollapsedCells,
    bspRoot,
    bspLeafCount: leafNodes.length,
    voxelBlocks3D,
  };
}

/**
 * Pure A* Grid Pathfinding verifying walkability across dungeon tiles
 */
export function findDungeonPathAStar(
  tiles: DungeonTileType[][],
  start: { x: number; y: number },
  goal: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const height = tiles.length;
  const width = tiles[0]?.length || 0;
  const isWalkable = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const t = tiles[y][x];
    return t !== 'void_wall' && t !== 'lava_chasm';
  };

  const key = (x: number, y: number) => `${x},${y}`;
  const openSet: Array<{ x: number; y: number; g: number; f: number }> = [
    {
      x: start.x,
      y: start.y,
      g: 0,
      f: Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y),
    },
  ];
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScore = new Map<string, number>();
  gScore.set(key(start.x, start.y), 0);
  const closed = new Set<string>();

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const cKey = key(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      const path: Array<{ x: number; y: number }> = [];
      let curr: { x: number; y: number } | undefined = { x: goal.x, y: goal.y };
      while (curr) {
        path.unshift(curr);
        curr = cameFrom.get(key(curr.x, curr.y));
      }
      return path;
    }

    closed.add(cKey);

    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      const nKey = key(nx, ny);
      if (closed.has(nKey) || !isWalkable(nx, ny)) continue;

      const tentativeG = current.g + 1;
      const prevG = gScore.get(nKey);
      if (prevG === undefined || tentativeG < prevG) {
        cameFrom.set(nKey, { x: current.x, y: current.y });
        gScore.set(nKey, tentativeG);
        const f = tentativeG + Math.abs(goal.x - nx) + Math.abs(goal.y - ny);
        if (!openSet.some((n) => n.x === nx && n.y === ny)) {
          openSet.push({ x: nx, y: ny, g: tentativeG, f });
        }
      }
    }
  }

  return [];
}
