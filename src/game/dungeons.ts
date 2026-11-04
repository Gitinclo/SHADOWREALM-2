// Pure Procedural Dungeon Delve Engine: Binary Space Partitioning (BSP) +
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

export interface GeneratedDungeon {
  seed: number;
  theme: DungeonTheme;
  themeTitle: string;
  floorLevel: number; // 1 .. 100
  recommendedRealmIndex: number;
  width: number;
  height: number;
  tiles: DungeonTileType[][];
  rooms: DungeonRoom[];
  encounters: DungeonEncounter[];
  entrance: { x: number; y: number };
  bossAltar: { x: number; y: number };
  astarPathToBoss: Array<{ x: number; y: number }>;
  isSolvable: boolean;
  wfcCollapsedCells: number;
}

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: { x: number; y: number; w: number; h: number };
}

/**
 * Deterministic PRNG (Mulberry32)
 */
function createRNG(seed: number): () => number {
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
 * Generates a 3D-layered Procedural Dungeon using BSP macro room hierarchy +
 * WFC interior pattern synthesis + A* entrance-to-boss verification.
 */
export function generateProceduralDungeon(params: {
  seed: number;
  theme: DungeonTheme;
  floorLevel?: number;
  width?: number;
  height?: number;
}): GeneratedDungeon {
  const width = Math.max(28, Math.min(64, params.width ?? 40));
  const height = Math.max(28, Math.min(64, params.height ?? 32));
  const floorLevel = Math.max(1, Math.min(100, params.floorLevel ?? 1));
  const rng = createRNG(params.seed);

  const themeMeta: Record<DungeonTheme, { title: string; minRealm: number }> = {
    dao_grotto: { title: 'Ancient Dao Grotto (古道洞天)', minRealm: 1 },
    secret_realm: { title: 'Nine-Nether Secret Realm (九幽秘境)', minRealm: 3 },
    tribulation_chamber: { title: 'Heavenly Tribulation Chamber (天劫雷池)', minRealm: 5 },
  };

  // Initialize grid with void_wall
  const tiles: DungeonTileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 'void_wall' as DungeonTileType)
  );

  // 1. Macro Binary Space Partitioning (BSP)
  const root: BSPNode = { x: 1, y: 1, w: width - 2, h: height - 2 };
  const leafNodes: BSPNode[] = [];

  function splitBSP(node: BSPNode, depth: number) {
    if (depth <= 0 || (node.w < 14 && node.h < 14)) {
      leafNodes.push(node);
      return;
    }
    const splitHorizontally = node.w < node.h ? true : node.h < node.w ? false : rng() > 0.5;
    if (splitHorizontally && node.h >= 14) {
      const splitH = Math.floor(node.h * (0.4 + rng() * 0.2));
      node.left = { x: node.x, y: node.y, w: node.w, h: splitH };
      node.right = { x: node.x, y: node.y + splitH, w: node.w, h: node.h - splitH };
      splitBSP(node.left, depth - 1);
      splitBSP(node.right, depth - 1);
    } else if (!splitHorizontally && node.w >= 14) {
      const splitW = Math.floor(node.w * (0.4 + rng() * 0.2));
      node.left = { x: node.x, y: node.y, w: splitW, h: node.h };
      node.right = { x: node.x + splitW, y: node.y, w: node.w - splitW, h: node.h };
      splitBSP(node.left, depth - 1);
      splitBSP(node.right, depth - 1);
    } else {
      leafNodes.push(node);
    }
  }

  splitBSP(root, 3);

  // Carve rooms inside each BSP leaf
  const rolesOrder: DungeonRoomRole[] = [
    'entry_shrine',
    'guardian_barracks',
    'spirit_vein_chamber',
    'inner_demon_altar' as any,
    'treasure_vault',
    'boss_sanctum',
  ];
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
    const rx = leaf.x + Math.max(1, Math.floor((leaf.w - rw) / 2));
    const ry = leaf.y + Math.max(1, Math.floor((leaf.h - rh) / 2));
    leaf.room = { x: rx, y: ry, w: rw, h: rh };

    const isFirst = idx === 0;
    const isLast = idx === leafNodes.length - 1;
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
      zElevation: isLast ? 2.5 : idx * 0.5,
      width: rw,
      height: rh,
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

  return {
    seed: params.seed,
    theme: params.theme,
    themeTitle: themeMeta[params.theme].title,
    floorLevel,
    recommendedRealmIndex: themeMeta[params.theme].minRealm,
    width,
    height,
    tiles,
    rooms,
    encounters,
    entrance,
    bossAltar,
    astarPathToBoss,
    isSolvable: astarPathToBoss.length > 0,
    wfcCollapsedCells,
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
