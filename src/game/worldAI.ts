// Pure AI & Life Simulation Engine:
// 1. Lv. 1-1000 Monster Complexity Brackets (bracket_1_feral .. bracket_5_apex_titan)
// 2. Hierarchical Squad AI & Troop Formations (Shield Wall, Wedge Charge, Loose Skirmish)
// 3. Goal-Oriented Action Planning (GOAP) for Autonomous NPCs
// 4. Dynamic Multi-Target Threat & Aggro Tables

import { WeatherType, evaluateWeatherImpact } from './weather';

export type MonsterBracketId =
  | 'bracket_1_feral'
  | 'bracket_2_pack_hunter'
  | 'bracket_3_spirit_fiend'
  | 'bracket_4_primordial_lord'
  | 'bracket_5_apex_titan';

export interface MonsterBracketSpec {
  id: MonsterBracketId;
  bracketNumber: 1 | 2 | 3 | 4 | 5;
  levelRange: [number, number];
  tacticalIQ: number; // 20 .. 250
  aggroRadiusMeters: number;
  telegraphPatterns: Array<'cleave' | 'cone' | 'void_rift' | 'cataclysm_3phase'>;
  weatherBehaviorNote: string;
}

export const MONSTER_BRACKETS: readonly MonsterBracketSpec[] = [
  {
    id: 'bracket_1_feral',
    bracketNumber: 1,
    levelRange: [1, 100],
    tacticalIQ: 35,
    aggroRadiusMeters: 18,
    telegraphPatterns: ['cleave'],
    weatherBehaviorNote: 'Cowers under forest canopies during thunderstorms (-25% aggro).',
  },
  {
    id: 'bracket_2_pack_hunter',
    bracketNumber: 2,
    levelRange: [101, 300],
    tacticalIQ: 75,
    aggroRadiusMeters: 30,
    telegraphPatterns: ['cleave', 'cone'],
    weatherBehaviorNote: 'Uses Spirit Mist cover to flank isolated ranged cohorts.',
  },
  {
    id: 'bracket_3_spirit_fiend',
    bracketNumber: 3,
    levelRange: [301, 600],
    tacticalIQ: 120,
    aggroRadiusMeters: 48,
    telegraphPatterns: ['cone', 'void_rift'],
    weatherBehaviorNote: 'Channels Blood Moon Yin energy to regenerate barrier shields.',
  },
  {
    id: 'bracket_4_primordial_lord',
    bracketNumber: 4,
    levelRange: [601, 850],
    tacticalIQ: 185,
    aggroRadiusMeters: 75,
    telegraphPatterns: ['cone', 'void_rift', 'cataclysm_3phase'],
    weatherBehaviorNote: 'Siphons thunderstorm lightning to empower domain AoE (+55% ATK).',
  },
  {
    id: 'bracket_5_apex_titan',
    bracketNumber: 5,
    levelRange: [851, 1000],
    tacticalIQ: 250,
    aggroRadiusMeters: 120,
    telegraphPatterns: ['cleave', 'cone', 'void_rift', 'cataclysm_3phase'],
    weatherBehaviorNote: 'Siphons Heavenly Storm Lightning for +55% Attack Power & 3-Phase Cataclysms.',
  },
] as const;

export function getMonsterBracketForLevel(
  level: number,
  activeWeather: WeatherType = 'clear_sky'
): {
  spec: MonsterBracketSpec;
  effectiveAttackMultiplier: number;
  activeDirective: string;
} {
  const clamped = Math.max(1, Math.min(1000, Math.floor(level)));
  const spec =
    MONSTER_BRACKETS.find(
      (b) => clamped >= b.levelRange[0] && clamped <= b.levelRange[1]
    ) || MONSTER_BRACKETS[0];

  const weatherImpact = evaluateWeatherImpact(activeWeather, spec.bracketNumber);
  return {
    spec,
    effectiveAttackMultiplier: weatherImpact.monsterAttackMultiplier,
    activeDirective: weatherImpact.monsterDirective,
  };
}

// ============================================================================
// 2. Hierarchical Squad AI & Troop Formations
// ============================================================================

export type SquadFormationType = 'shield_wall' | 'wedge_charge' | 'loose_skirmish';

export interface SquadFormationSpec {
  id: SquadFormationType;
  name: string;
  chineseName: string;
  frontalMitigationBonus: number;
  chargeImpactBonus: number;
  aoeVulnerabilityReduction: number;
  moveSpeedMultiplier: number;
  rangedCadenceBonus: number;
  tacticalDescription: string;
}

export const SQUAD_FORMATIONS: Record<SquadFormationType, SquadFormationSpec> = {
  shield_wall: {
    id: 'shield_wall',
    name: 'Xuanwu Iron Shield Wall',
    chineseName: '玄武鐵壁陣',
    frontalMitigationBonus: 0.4, // +40% frontal mitigation
    chargeImpactBonus: 0.0,
    aoeVulnerabilityReduction: -0.1,
    moveSpeedMultiplier: 0.75, // -25% move speed
    rangedCadenceBonus: 0.0,
    tacticalDescription: 'Interlocks heavy tower shields (+40% frontal mitigation, immune to cavalry knockback).',
  },
  wedge_charge: {
    id: 'wedge_charge',
    name: 'Azure Dragon Spear Wedge',
    chineseName: '青龍鋒矢陣',
    frontalMitigationBonus: -0.05,
    chargeImpactBonus: 0.35, // +35% charge impact
    aoeVulnerabilityReduction: 0.0,
    moveSpeedMultiplier: 1.25, // +25% speed
    rangedCadenceBonus: 0.0,
    tacticalDescription: 'Concentrates breakthrough momentum into a razor spearhead (+35% charge impact, +25% march speed).',
  },
  loose_skirmish: {
    id: 'loose_skirmish',
    name: 'Vermilion Bird Cloud Skirmish',
    chineseName: '朱雀散雲陣',
    frontalMitigationBonus: 0.0,
    chargeImpactBonus: 0.0,
    aoeVulnerabilityReduction: 0.45, // -45% Bomber AoE damage taken
    moveSpeedMultiplier: 1.1,
    rangedCadenceBonus: 0.2, // +20% Shooter fire rate
    tacticalDescription: 'Disperses cohorts into staggered intervals (-45% Bomber AoE damage taken, +20% Shooter cadence).',
  },
};

/**
 * Generates deterministic 2D/3D relative slot coordinates for a cohort marching in formation
 */
export function computeSquadFormationSlots(
  formation: SquadFormationType,
  unitCount: number,
  spacingMeters: number = 2.5
): Array<{ slotIndex: number; offsetX: number; offsetZ: number; role: 'vanguard' | 'core' | 'flank' }> {
  const count = Math.max(1, Math.min(100, unitCount));
  const slots: Array<{ slotIndex: number; offsetX: number; offsetZ: number; role: 'vanguard' | 'core' | 'flank' }> = [];

  if (formation === 'shield_wall') {
    const cols = Math.max(4, Math.ceil(Math.sqrt(count * 2)));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      slots.push({
        slotIndex: i,
        offsetX: (col - (cols - 1) / 2) * (spacingMeters * 0.8),
        offsetZ: row * (spacingMeters * 0.75),
        role: row === 0 ? 'vanguard' : 'core',
      });
    }
  } else if (formation === 'wedge_charge') {
    let placed = 0;
    let row = 0;
    while (placed < count) {
      const unitsInRow = row * 2 + 1;
      for (let c = 0; c < unitsInRow && placed < count; c++) {
        slots.push({
          slotIndex: placed,
          offsetX: (c - row) * spacingMeters,
          offsetZ: row * spacingMeters * 0.9,
          role: row <= 1 ? 'vanguard' : c === 0 || c === unitsInRow - 1 ? 'flank' : 'core',
        });
        placed++;
      }
      row++;
    }
  } else {
    // loose_skirmish staggered checkerboard
    const cols = Math.max(3, Math.ceil(Math.sqrt(count)));
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const stagger = (row % 2) * (spacingMeters * 0.7);
      slots.push({
        slotIndex: i,
        offsetX: (col - (cols - 1) / 2) * (spacingMeters * 1.45) + stagger,
        offsetZ: row * (spacingMeters * 1.45),
        role: col === 0 || col === cols - 1 ? 'flank' : 'core',
      });
    }
  }

  return slots;
}

// ============================================================================
// 3. Goal-Oriented Action Planning (GOAP) for Autonomous NPCs
// ============================================================================

export type GOAPStateKey =
  | 'stockChecked'
  | 'atMine'
  | 'hasRawOre'
  | 'atSmelter'
  | 'hasRefinedIngots'
  | 'atCastleTreasury'
  | 'treasurySupplied';

export type GOAPWorldState = Partial<Record<GOAPStateKey, boolean>>;

export interface GOAPAction {
  id: string;
  label: string;
  cost: number;
  preconditions: GOAPWorldState;
  effects: GOAPWorldState;
}

export const AUTONOMOUS_NPC_GOAP_ACTIONS: readonly GOAPAction[] = [
  {
    id: 'check_stock',
    label: 'Check Castle Treasury Stock',
    cost: 1,
    preconditions: {},
    effects: { stockChecked: true },
  },
  {
    id: 'travel_to_mine',
    label: 'Travel to Spirit Vein Mine (A* Patrol)',
    cost: 2,
    preconditions: { stockChecked: true },
    effects: { atMine: true, atSmelter: false, atCastleTreasury: false },
  },
  {
    id: 'extract_ore',
    label: 'Extract Star-Iron Spirit Ore',
    cost: 3,
    preconditions: { atMine: true },
    effects: { hasRawOre: true },
  },
  {
    id: 'return_to_smelter',
    label: 'Return to Crimson Pavilion Smelter',
    cost: 2,
    preconditions: { hasRawOre: true },
    effects: { atSmelter: true, atMine: false },
  },
  {
    id: 'smelt_ingots',
    label: 'Smelt Damascus Spirit Ingots',
    cost: 3,
    preconditions: { atSmelter: true, hasRawOre: true },
    effects: { hasRefinedIngots: true, hasRawOre: false },
  },
  {
    id: 'deliver_to_treasury',
    label: 'Deliver Ingots to Castle Treasury',
    cost: 2,
    preconditions: { hasRefinedIngots: true },
    effects: { atCastleTreasury: true, treasurySupplied: true, hasRefinedIngots: false },
  },
] as const;

/**
 * Evaluates a multi-step GOAP plan from `initialState` to `goalState` using forward A* search
 */
export function planNPCActionsGOAP(
  initialState: GOAPWorldState,
  goalState: GOAPWorldState = { treasurySupplied: true },
  availableActions: readonly GOAPAction[] = AUTONOMOUS_NPC_GOAP_ACTIONS
): {
  satisfied: boolean;
  totalCost: number;
  steps: GOAPAction[];
} {
  const satisfies = (state: GOAPWorldState, target: GOAPWorldState): boolean =>
    Object.entries(target).every(([k, v]) => Boolean(state[k as GOAPStateKey]) === Boolean(v));

  const stateHash = (s: GOAPWorldState): string =>
    Object.keys(s)
      .sort()
      .filter((k) => s[k as GOAPStateKey])
      .join('|');

  interface PlanNode {
    state: GOAPWorldState;
    steps: GOAPAction[];
    cost: number;
  }

  const queue: PlanNode[] = [{ state: { ...initialState }, steps: [], cost: 0 }];
  const visited = new Map<string, number>();

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;

    if (satisfies(current.state, goalState)) {
      return {
        satisfied: true,
        totalCost: current.cost,
        steps: current.steps,
      };
    }

    const h = stateHash(current.state);
    if (visited.has(h) && visited.get(h)! <= current.cost) continue;
    visited.set(h, current.cost);

    for (const action of availableActions) {
      if (satisfies(current.state, action.preconditions)) {
        const nextState: GOAPWorldState = { ...current.state, ...action.effects };
        queue.push({
          state: nextState,
          steps: [...current.steps, action],
          cost: current.cost + action.cost,
        });
      }
    }
  }

  return { satisfied: false, totalCost: 0, steps: [] };
}

// ============================================================================
// 4. Dynamic Multi-Target Threat & Aggro Tables
// ============================================================================

export type CombatRoleType = 'shieldbearer_tank' | 'shooter_dps' | 'mystic_healer';

export interface ThreatCombatantInput {
  entityId: string;
  name: string;
  role: CombatRoleType;
  damageDealt: number;
  healingDone: number;
  activeTauntStacks: number;
  distanceMeters: number;
}

export interface ThreatTableEntry {
  entityId: string;
  name: string;
  role: CombatRoleType;
  threatScore: number;
  threatSharePercent: number;
  isPrimaryTarget: boolean;
}

/**
 * Computes a boss/monster multi-target Aggro Table reacting to high-DPS Shooters,
 * taunting Shieldbearers (3.5x enmity + flat taunt snap), and healing Mystics (0.85x global enmity).
 */
export function evaluateDynamicThreatTable(
  combatants: ThreatCombatantInput[]
): ThreatTableEntry[] {
  if (combatants.length === 0) return [];

  const scored = combatants.map((c) => {
    const roleMultiplier =
      c.role === 'shieldbearer_tank'
        ? 3.5
        : c.role === 'shooter_dps'
        ? 1.25
        : 0.9;

    const damageThreat = Math.max(0, c.damageDealt) * roleMultiplier;
    const healThreat = Math.max(0, c.healingDone) * 0.85;
    const tauntBonus = Math.max(0, c.activeTauntStacks) * 2_500;
    const distanceFactor = c.distanceMeters <= 15 ? 1.15 : Math.max(0.65, 1 - (c.distanceMeters - 15) * 0.005);

    const threatScore = Math.round((damageThreat + healThreat + tauntBonus) * distanceFactor);
    return {
      ...c,
      threatScore,
    };
  });

  scored.sort((a, b) => b.threatScore - a.threatScore);
  const totalThreat = Math.max(1, scored.reduce((acc, s) => acc + s.threatScore, 0));

  return scored.map((s, idx) => ({
    entityId: s.entityId,
    name: s.name,
    role: s.role,
    threatScore: s.threatScore,
    threatSharePercent: Number(((s.threatScore / totalThreat) * 100).toFixed(1)),
    isPrimaryTarget: idx === 0,
  }));
}
