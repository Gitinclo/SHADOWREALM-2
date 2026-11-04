// Pure Mathematical Formulas: Trillion-Scale Power, Troop Counter Matrix,
// Diminishing Returns Mitigation, Economic Sinks & Monte Carlo Combat Simulator

import { ArmyComposition, TroopArchetype, TROOP_TIERS, MAX_TOTAL_TROOPS, MAX_RALLY_COHORT } from './troopTraining';
import { calculateRealmSuppression } from './cultivationMath';

export type HeroRarity = 'mortal' | 'earth' | 'heaven' | 'immortal' | 'chaos_mythic';

export const HERO_RARITY_MULTIPLIERS: Record<HeroRarity, number> = {
  mortal: 1.0,
  earth: 1.35,
  heaven: 2.0,
  immortal: 3.5,
  chaos_mythic: 6.0,
};

/**
 * Castle Era Multiplier (Levels 0..100 mapped across 10 Eras, scaling 1x to 100x)
 */
export function getCastleEraMultiplier(castleLevel: number): {
  eraIndex: number; // 0 .. 10
  eraName: string;
  powerMultiplier: number; // 1.0 .. 100.0
} {
  const clampedLevel = Math.max(0, Math.min(100, Math.floor(castleLevel)));
  const eraIndex = Math.floor(clampedLevel / 10);
  const eraNames = [
    'Mortal Outpost',
    'Blackstone Stronghold',
    'Spirit Vein Bastion',
    'Golden Core Fortress',
    'Nascent Soul Citadel',
    'Earth Immortal Sanctuary',
    'Heavenly Star Keep',
    'Taiyi Jade Palace',
    'Daluo Celestial Court',
    'Chaos Sovereign Dominion',
    'Ultimate Origin Imperial Spire',
  ];

  // Smooth exponential-linear curve from 1x at Lv.0 to exactly 100x at Lv.100
  const powerMultiplier =
    clampedLevel === 0
      ? 1.0
      : clampedLevel === 100
      ? 100.0
      : Number((1 + (clampedLevel / 100) * 99).toFixed(2));

  return {
    eraIndex,
    eraName: eraNames[eraIndex] || eraNames[0],
    powerMultiplier,
  };
}

/**
 * Multiplicative Trillion-Scale Army Power Rating
 * Balances armies up to 1,000 Trillion troops and 1 Trillion rally cohorts.
 */
export function calculateTrillionScaleArmyPower(params: {
  army: ArmyComposition;
  castleLevel: number; // 0..100
  heroRarity: HeroRarity;
  researchLevel: number; // 0..100
  commanderRealmIndex: number; // 0..22
}): {
  totalTroops: number;
  cappedTotalTroops: number;
  maxRallyCohortTroops: number;
  rawPower: number;
  formattedPower: string;
  eraMultiplier: number;
} {
  const totalRaw =
    Math.max(0, params.army.shieldbearers) +
    Math.max(0, params.army.shooters) +
    Math.max(0, params.army.bombers);
  const cappedTotalTroops = Math.min(MAX_TOTAL_TROOPS, totalRaw);
  const maxRallyCohortTroops = Math.min(MAX_RALLY_COHORT, cappedTotalTroops);

  const tierDef = TROOP_TIERS[Math.max(0, Math.min(9, params.army.tier - 1))];
  const eraInfo = getCastleEraMultiplier(params.castleLevel);
  const heroMult = HERO_RARITY_MULTIPLIERS[params.heroRarity] || 1.0;
  const researchMult = 1 + Math.max(0, Math.min(100, params.researchLevel)) * 0.04;
  const realmBonus = 1 + Math.max(0, params.commanderRealmIndex) * 0.25;

  const rawPower =
    cappedTotalTroops *
    tierDef.basePowerPerUnit *
    eraInfo.powerMultiplier *
    heroMult *
    researchMult *
    realmBonus;

  return {
    totalTroops: totalRaw,
    cappedTotalTroops,
    maxRallyCohortTroops,
    rawPower,
    formattedPower: formatLargeNumber(rawPower),
    eraMultiplier: eraInfo.powerMultiplier,
  };
}

/**
 * Formats large numbers into K / M / B / T / Qa (Quadrillion)
 */
export function formatLargeNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  const abs = Math.abs(value);
  if (abs >= 1e15) return `${(value / 1e15).toFixed(2)} Qa`;
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)} T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)} M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return Math.round(value).toLocaleString();
}

/**
 * Rock-Paper-Scissors Troop Counter Matrix:
 * - Shieldbearer counters Shooter (1.5x damage dealt, 0.7x taken)
 * - Shooter counters Bomber (1.5x damage dealt, 0.7x taken)
 * - Bomber counters Shieldbearer (1.5x damage dealt, 0.7x taken)
 */
export function getTroopCounterMultiplier(
  attacker: TroopArchetype,
  defender: TroopArchetype
): number {
  if (attacker === defender) return 1.0;
  if (
    (attacker === 'shieldbearer' && defender === 'shooter') ||
    (attacker === 'shooter' && defender === 'bomber') ||
    (attacker === 'bomber' && defender === 'shieldbearer')
  ) {
    return 1.5;
  }
  return 0.72;
}

/**
 * Diminishing Returns Armor & Defense Mitigation Curve
 * Mitigation(A) = A / (A + K_era)
 * Guarantees strictly 0 <= mitigation < 0.92 so absolute zero-damage edge cases never occur.
 */
export function calculateDiminishingArmorMitigation(
  armorRating: number,
  defenderCastleEra: number = 1
): {
  mitigationRatio: number;
  damageThroughRatio: number;
} {
  const safeArmor = Math.max(0, armorRating);
  const kConstant = 150 * Math.max(1, defenderCastleEra + 1);
  const rawMitigation = safeArmor / (safeArmor + kConstant);
  const mitigationRatio = Number(Math.min(0.9, rawMitigation).toFixed(4));
  return {
    mitigationRatio,
    damageThroughRatio: Number((1 - mitigationRatio).toFixed(4)),
  };
}

/**
 * Economic Sinks & Inflation Control Model for Trillion-Scale Spirit Stone Economies
 */
export function evaluateEconomyInflationSink(params: {
  circulatingSpiritStones: number;
  activeCitadelEra: number;
  dailyRefineVolume: number;
}): {
  inflationIndex: number;
  dynamicTaxRatePercent: number;
  dailyUpkeepSink: number;
  netBurnRatePerDay: number;
  scarcityStatus: 'Deflationary' | 'Balanced Equilibrium' | 'High Velocity — Sink Active';
} {
  const baseline = Math.pow(10, Math.max(4, params.activeCitadelEra + 4));
  const ratio = params.circulatingSpiritStones / baseline;
  const inflationIndex = Number(Math.max(0.5, Math.min(5.0, ratio)).toFixed(2));

  const dynamicTaxRatePercent = Number(
    Math.min(35, 5 + Math.max(0, inflationIndex - 1) * 8).toFixed(1)
  );
  const dailyUpkeepSink = Math.round(params.circulatingSpiritStones * 0.025 * (params.activeCitadelEra + 1));
  const refineBurn = Math.round(params.dailyRefineVolume * (dynamicTaxRatePercent / 100));
  const netBurnRatePerDay = dailyUpkeepSink + refineBurn;

  let scarcityStatus: 'Deflationary' | 'Balanced Equilibrium' | 'High Velocity — Sink Active' =
    'Balanced Equilibrium';
  if (inflationIndex < 0.85) scarcityStatus = 'Deflationary';
  else if (inflationIndex > 1.45) scarcityStatus = 'High Velocity — Sink Active';

  return {
    inflationIndex,
    dynamicTaxRatePercent,
    dailyUpkeepSink,
    netBurnRatePerDay,
    scarcityStatus,
  };
}

export interface MonteCarloSimulationConfig {
  iterations: number; // e.g., 500 or 1000
  attackerArmy: ArmyComposition;
  defenderArmy: ArmyComposition;
  attackerRealmIndex: number;
  defenderRealmIndex: number;
  attackerArmor: number;
  defenderArmor: number;
  seed?: number;
}

export interface MonteCarloSimulationResult {
  iterations: number;
  attackerWinRatePercent: number;
  defenderWinRatePercent: number;
  drawRatePercent: number;
  avgAttackerSurvivorsRatio: number;
  avgDefenderSurvivorsRatio: number;
  realmSuppressionFactor: number;
  dominantStrategyDiagnosis: string;
  counterAdvantageSummary: string;
}

/**
 * Deterministic Mulberry32 PRNG for reproducible Monte Carlo combat sweeps
 */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Monte Carlo Combat Simulator
 * Simulates N multi-round tactical engagements across Shieldbearer, Shooter, and Bomber cohorts.
 */
export function runMonteCarloCombatSimulation(
  config: MonteCarloSimulationConfig
): MonteCarloSimulationResult {
  const iterations = Math.max(10, Math.min(5000, config.iterations));
  const rng = createSeededRandom(config.seed ?? 133742);

  const realmSuppression = calculateRealmSuppression(
    config.attackerRealmIndex,
    config.defenderRealmIndex
  );
  const attMitigation = calculateDiminishingArmorMitigation(config.attackerArmor, config.attackerArmy.tier);
  const defMitigation = calculateDiminishingArmorMitigation(config.defenderArmor, config.defenderArmy.tier);

  const attTierPower = TROOP_TIERS[Math.max(0, Math.min(9, config.attackerArmy.tier - 1))].basePowerPerUnit;
  const defTierPower = TROOP_TIERS[Math.max(0, Math.min(9, config.defenderArmy.tier - 1))].basePowerPerUnit;

  // Compute weighted counter advantage between army ratios
  const attTotalInit =
    Math.max(1, config.attackerArmy.shieldbearers + config.attackerArmy.shooters + config.attackerArmy.bombers);
  const defTotalInit =
    Math.max(1, config.defenderArmy.shieldbearers + config.defenderArmy.shooters + config.defenderArmy.bombers);

  const attShares: Record<TroopArchetype, number> = {
    shieldbearer: config.attackerArmy.shieldbearers / attTotalInit,
    shooter: config.attackerArmy.shooters / attTotalInit,
    bomber: config.attackerArmy.bombers / attTotalInit,
  };
  const defShares: Record<TroopArchetype, number> = {
    shieldbearer: config.defenderArmy.shieldbearers / defTotalInit,
    shooter: config.defenderArmy.shooters / defTotalInit,
    bomber: config.defenderArmy.bombers / defTotalInit,
  };

  let weightedAttCounter = 0;
  let weightedDefCounter = 0;
  const types: TroopArchetype[] = ['shieldbearer', 'shooter', 'bomber'];
  for (const aType of types) {
    for (const dType of types) {
      weightedAttCounter += attShares[aType] * defShares[dType] * getTroopCounterMultiplier(aType, dType);
      weightedDefCounter += defShares[dType] * attShares[aType] * getTroopCounterMultiplier(dType, aType);
    }
  }

  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let sumAttSurv = 0;
  let sumDefSurv = 0;

  // Clamp extreme suppression in tactical troop exchange while preserving exact realm dominance
  const effectiveAttRealmScale = Math.min(1000, Math.max(0.001, realmSuppression));

  for (let i = 0; i < iterations; i++) {
    let attHP = attTotalInit * attTierPower;
    let defHP = defTotalInit * defTierPower;
    const initAttHP = attHP;
    const initDefHP = defHP;

    for (let round = 0; round < 8; round++) {
      if (attHP <= 0 || defHP <= 0) break;
      const attRoll = 0.85 + rng() * 0.35; // tactical variance + critical strikes
      const defRoll = 0.85 + rng() * 0.35;

      const attDamage =
        attHP *
        0.24 *
        weightedAttCounter *
        effectiveAttRealmScale *
        defMitigation.damageThroughRatio *
        attRoll;

      const defDamage =
        (defHP *
          0.24 *
          weightedDefCounter *
          attMitigation.damageThroughRatio *
          defRoll) /
        effectiveAttRealmScale;

      attHP = Math.max(0, attHP - defDamage);
      defHP = Math.max(0, defHP - attDamage);
    }

    const attSurvRatio = attHP / initAttHP;
    const defSurvRatio = defHP / initDefHP;
    sumAttSurv += attSurvRatio;
    sumDefSurv += defSurvRatio;

    if (attSurvRatio > defSurvRatio + 0.02) attackerWins++;
    else if (defSurvRatio > attSurvRatio + 0.02) defenderWins++;
    else draws++;
  }

  const attackerWinRatePercent = Number(((attackerWins / iterations) * 100).toFixed(1));
  const defenderWinRatePercent = Number(((defenderWins / iterations) * 100).toFixed(1));
  const drawRatePercent = Number(((draws / iterations) * 100).toFixed(1));

  let dominantStrategyDiagnosis = 'Balanced Combined-Arms Equilibrium — No degenerate mono-stack detected.';
  const maxShare = Math.max(attShares.shieldbearer, attShares.shooter, attShares.bomber);
  if (maxShare > 0.8) {
    const monoType =
      attShares.shieldbearer === maxShare
        ? 'Shieldbearer'
        : attShares.shooter === maxShare
        ? 'Shooter'
        : 'Bomber';
    const hardCounter =
      monoType === 'Shieldbearer'
        ? 'Bomber'
        : monoType === 'Shooter'
        ? 'Shieldbearer'
        : 'Shooter';
    dominantStrategyDiagnosis = `Mono-Stack Warning: >80% ${monoType} ratio is vulnerable to 1.5x ${hardCounter} counter-swarms.`;
  }

  return {
    iterations,
    attackerWinRatePercent,
    defenderWinRatePercent,
    drawRatePercent,
    avgAttackerSurvivorsRatio: Number((sumAttSurv / iterations).toFixed(3)),
    avgDefenderSurvivorsRatio: Number((sumDefSurv / iterations).toFixed(3)),
    realmSuppressionFactor: realmSuppression,
    dominantStrategyDiagnosis,
    counterAdvantageSummary: `Attacker Counter Multiplier: ${weightedAttCounter.toFixed(2)}x vs Defender: ${weightedDefCounter.toFixed(2)}x`,
  };
}
