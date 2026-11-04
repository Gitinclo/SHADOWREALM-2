// Pure, framework-agnostic Four-Path Immortal Xianxia Cultivation & Realm Suppression Engine

export type CultivationPath = 'qi' | 'body' | 'soul' | 'mind';

export type KarmaAlignment = 'green_righteous' | 'neutral_wanderer' | 'red_blood_fiend';

export interface RealmDefinition {
  index: number;
  name: string;
  chineseTitle: string;
  epoch: 'Mortal Dao' | 'Immortal & Sage' | 'Great Dao Chaos' | 'Ultimate Origin';
  baseLifespanYears: number;
  baseQiCapacity: number;
  tribulationLightningBolts: number;
}

// 23 Canonical Immortal Xianxia Realms (0 to 22), each with 9 layers (1 to 9)
export const CULTIVATION_REALMS: readonly RealmDefinition[] = [
  // Epoch I: Mortal Dao (0 - 5)
  { index: 0, name: 'Qi Refinement', chineseTitle: '煉氣', epoch: 'Mortal Dao', baseLifespanYears: 120, baseQiCapacity: 100, tribulationLightningBolts: 1 },
  { index: 1, name: 'Foundation Establishment', chineseTitle: '築基', epoch: 'Mortal Dao', baseLifespanYears: 250, baseQiCapacity: 1_000, tribulationLightningBolts: 3 },
  { index: 2, name: 'Golden Core', chineseTitle: '金丹', epoch: 'Mortal Dao', baseLifespanYears: 600, baseQiCapacity: 10_000, tribulationLightningBolts: 6 },
  { index: 3, name: 'Nascent Soul', chineseTitle: '元嬰', epoch: 'Mortal Dao', baseLifespanYears: 1_500, baseQiCapacity: 100_000, tribulationLightningBolts: 9 },
  { index: 4, name: 'Spirit Severing', chineseTitle: '化神', epoch: 'Mortal Dao', baseLifespanYears: 3_500, baseQiCapacity: 1_000_000, tribulationLightningBolts: 18 },
  { index: 5, name: 'Dao Seeking', chineseTitle: '問道', epoch: 'Mortal Dao', baseLifespanYears: 8_000, baseQiCapacity: 10_000_000, tribulationLightningBolts: 27 },

  // Epoch II: Immortal & Sage (6 - 11)
  { index: 6, name: 'Earth Immortal', chineseTitle: '地仙', epoch: 'Immortal & Sage', baseLifespanYears: 20_000, baseQiCapacity: 1e8, tribulationLightningBolts: 36 },
  { index: 7, name: 'Heaven Immortal', chineseTitle: '天仙', epoch: 'Immortal & Sage', baseLifespanYears: 50_000, baseQiCapacity: 1e9, tribulationLightningBolts: 45 },
  { index: 8, name: 'True Immortal', chineseTitle: '真仙', epoch: 'Immortal & Sage', baseLifespanYears: 120_000, baseQiCapacity: 1e10, tribulationLightningBolts: 54 },
  { index: 9, name: 'Golden Immortal', chineseTitle: '金仙', epoch: 'Immortal & Sage', baseLifespanYears: 350_000, baseQiCapacity: 1e11, tribulationLightningBolts: 63 },
  { index: 10, name: 'Taiyi Jade Immortal', chineseTitle: '太乙玉仙', epoch: 'Immortal & Sage', baseLifespanYears: 1_000_000, baseQiCapacity: 1e12, tribulationLightningBolts: 72 },
  { index: 11, name: 'Daluo Golden Immortal', chineseTitle: '大羅金仙', epoch: 'Immortal & Sage', baseLifespanYears: 5_000_000, baseQiCapacity: 1e13, tribulationLightningBolts: 81 },

  // Epoch III: Great Dao Chaos (12 - 17)
  { index: 12, name: 'Quasi-Sage', chineseTitle: '準聖', epoch: 'Great Dao Chaos', baseLifespanYears: 20_000_000, baseQiCapacity: 1e14, tribulationLightningBolts: 99 },
  { index: 13, name: 'Heaven Dao Sage', chineseTitle: '天道聖人', epoch: 'Great Dao Chaos', baseLifespanYears: 100_000_000, baseQiCapacity: 1e15, tribulationLightningBolts: 108 },
  { index: 14, name: 'Chaos Immortal', chineseTitle: '混沌大仙', epoch: 'Great Dao Chaos', baseLifespanYears: 500_000_000, baseQiCapacity: 1e16, tribulationLightningBolts: 144 },
  { index: 15, name: 'Hongmeng Controller', chineseTitle: '鴻蒙掌控', epoch: 'Great Dao Chaos', baseLifespanYears: 2_000_000_000, baseQiCapacity: 1e17, tribulationLightningBolts: 216 },
  { index: 16, name: 'Void Sovereign', chineseTitle: '虛空主宰', epoch: 'Great Dao Chaos', baseLifespanYears: 10_000_000_000, baseQiCapacity: 1e18, tribulationLightningBolts: 324 },
  { index: 17, name: 'Eternal Ancestor', chineseTitle: '永恆道祖', epoch: 'Great Dao Chaos', baseLifespanYears: 50_000_000_000, baseQiCapacity: 1e19, tribulationLightningBolts: 486 },

  // Epoch IV: Ultimate Origin (18 - 22)
  { index: 18, name: 'Half-Step Transcendence', chineseTitle: '半步超脫', epoch: 'Ultimate Origin', baseLifespanYears: 250_000_000_000, baseQiCapacity: 1e20, tribulationLightningBolts: 648 },
  { index: 19, name: 'Dao Source Creator', chineseTitle: '道源創世', epoch: 'Ultimate Origin', baseLifespanYears: 1e12, baseQiCapacity: 1e21, tribulationLightningBolts: 729 },
  { index: 20, name: 'Boundless Monarch', chineseTitle: '無量帝君', epoch: 'Ultimate Origin', baseLifespanYears: 5e12, baseQiCapacity: 1e22, tribulationLightningBolts: 810 },
  { index: 21, name: 'Supreme Primordial', chineseTitle: '太初至尊', epoch: 'Ultimate Origin', baseLifespanYears: 25e12, baseQiCapacity: 1e23, tribulationLightningBolts: 900 },
  { index: 22, name: 'Ultimate Origin', chineseTitle: '終極本源', epoch: 'Ultimate Origin', baseLifespanYears: 999e12, baseQiCapacity: 1e24, tribulationLightningBolts: 999 },
] as const;

export interface PathProgress {
  path: CultivationPath;
  realmIndex: number; // 0 .. 22
  layer: number; // 1 .. 9
  currentEssence: number;
  requiredEssence: number;
}

export interface MasterDiscipleLineage {
  masterName: string | null;
  masterRealmIndex: number;
  discipleCount: number;
  proximityDistanceMeters: number;
  spiritStoneTaxRate: number; // 0.05 to 0.50
  transmittedScrolls: string[];
}

export interface KarmaState {
  score: number; // -1000 to +1000
  alignment: KarmaAlignment;
  unprovokedKills: number;
  righteousDeeds: number;
  bountySpiritStones: number;
  equippedDropRiskPercent: number;
  stationaryTribulationIntervalSec: number | null;
}

export interface FourPathCultivationState {
  paths: Record<CultivationPath, PathProgress>;
  spiritStones: number;
  innerDemonResistance: number; // 0.0 to 1.0
  karma: KarmaState;
  lineage: MasterDiscipleLineage;
}

/**
 * Exponential Realm Suppression Formula:
 * Multiplier = 10^(attackerRealm - defenderRealm)
 * Guarantee: Golden Core (Realm 2) vs Qi Refinement (Realm 0) === 100.0
 */
export function calculateRealmSuppression(
  attackerRealmIndex: number,
  defenderRealmIndex: number
): number {
  const deltaRealm = attackerRealmIndex - defenderRealmIndex;
  return Math.pow(10, deltaRealm);
}

/**
 * Computes fine-grained suppression including intra-realm layers (1..9)
 * while preserving exact 10^(deltaRealm) when layers are equal.
 */
export function calculateDetailedSuppression(
  attackerRealm: number,
  attackerLayer: number,
  defenderRealm: number,
  defenderLayer: number
): number {
  const baseSuppression = calculateRealmSuppression(attackerRealm, defenderRealm);
  const layerDiff = Math.max(-8, Math.min(8, attackerLayer - defenderLayer));
  const layerModifier = 1 + layerDiff * 0.05;
  return Number((baseSuppression * layerModifier).toFixed(6));
}

/**
 * Calculates required essence for a given realm (0..22) and layer (1..9)
 */
export function getRequiredEssenceForLayer(realmIndex: number, layer: number): number {
  const clampedRealm = Math.max(0, Math.min(22, realmIndex));
  const clampedLayer = Math.max(1, Math.min(9, layer));
  const realmDef = CULTIVATION_REALMS[clampedRealm];
  return Math.round(realmDef.baseQiCapacity * (1 + (clampedLayer - 1) * 0.35));
}

/**
 * Evaluates Four-Path Harmony Resonance multiplier.
 * When Qi, Body, Soul, and Mind are cultivated within 1 realm of each other,
 * the cultivator unlocks Primordial Four-Path Resonance (+35% to +100% power).
 */
export function calculateFourPathResonance(
  paths: Record<CultivationPath, PathProgress>
): {
  dominantRealmIndex: number;
  lowestRealmIndex: number;
  harmonyScore: number;
  resonanceMultiplier: number;
  resonanceTitle: string;
} {
  const realms = [
    paths.qi.realmIndex,
    paths.body.realmIndex,
    paths.soul.realmIndex,
    paths.mind.realmIndex,
  ];
  const dominantRealmIndex = Math.max(...realms);
  const lowestRealmIndex = Math.min(...realms);
  const spread = dominantRealmIndex - lowestRealmIndex;

  let harmonyScore = 1.0;
  let resonanceMultiplier = 1.0;
  let resonanceTitle = 'Divergent Vessel';

  if (spread === 0) {
    harmonyScore = 1.0;
    resonanceMultiplier = 2.0;
    resonanceTitle = 'Perfect Four-Path Unity (四道合一)';
  } else if (spread === 1) {
    harmonyScore = 0.85;
    resonanceMultiplier = 1.5;
    resonanceTitle = 'Harmonious Quad-Origin (四象共鳴)';
  } else if (spread <= 3) {
    harmonyScore = 0.65;
    resonanceMultiplier = 1.2;
    resonanceTitle = 'Balanced Meridians';
  } else {
    harmonyScore = Math.max(0.25, 1 - spread * 0.08);
    resonanceMultiplier = 1.0;
    resonanceTitle = 'Imbalanced Foundation (偏科道基)';
  }

  return {
    dominantRealmIndex,
    lowestRealmIndex,
    harmonyScore: Number(harmonyScore.toFixed(2)),
    resonanceMultiplier,
    resonanceTitle,
  };
}

/**
 * Evaluates Karma Alignment & Heavenly Tribulation PK penalties
 */
export function evaluateKarmaState(
  score: number,
  unprovokedKills: number,
  righteousDeeds: number
): KarmaState {
  const clamped = Math.max(-1000, Math.min(1000, score));
  let alignment: KarmaAlignment = 'neutral_wanderer';
  let bountySpiritStones = 0;
  let equippedDropRiskPercent = 5;
  let stationaryTribulationIntervalSec: number | null = null;

  if (clamped >= 200) {
    alignment = 'green_righteous';
    equippedDropRiskPercent = 1;
  } else if (clamped <= -200) {
    alignment = 'red_blood_fiend';
    const severity = Math.abs(clamped);
    bountySpiritStones = severity * 500 + unprovokedKills * 2_500;
    equippedDropRiskPercent = Math.min(85, 25 + Math.floor(severity / 20));
    stationaryTribulationIntervalSec = Math.max(8, Math.round(45 - severity / 30));
  }

  return {
    score: clamped,
    alignment,
    unprovokedKills,
    righteousDeeds,
    bountySpiritStones,
    equippedDropRiskPercent,
    stationaryTribulationIntervalSec,
  };
}

/**
 * Evaluates Master-Disciple Lineage proximity cultivation speed buff (+40% to +120%)
 * and Spirit Stone taxation (5% to 50%)
 */
export function calculateLineageCultivationBuff(lineage: MasterDiscipleLineage): {
  cultivationSpeedMultiplier: number;
  netTaxRate: number;
  activeScrollBonus: number;
} {
  const taxClamped = Math.max(0.05, Math.min(0.5, lineage.spiritStoneTaxRate));
  let proximityBonus = 0;

  if (lineage.masterName && lineage.proximityDistanceMeters <= 120) {
    const distanceFactor = 1 - lineage.proximityDistanceMeters / 120;
    // Scales from +40% (0.40) at edge of aura up to +120% (1.20) right beside Master
    proximityBonus = 0.4 + distanceFactor * 0.8;
  }

  const scrollBonus = lineage.transmittedScrolls.includes('Heaven Earth Sleeve')
    ? 0.25
    : lineage.transmittedScrolls.length * 0.1;

  return {
    cultivationSpeedMultiplier: Number((1 + proximityBonus + scrollBonus).toFixed(2)),
    netTaxRate: Number(taxClamped.toFixed(2)),
    activeScrollBonus: Number(scrollBonus.toFixed(2)),
  };
}

/**
 * Computes Heavenly Tribulation Breakthrough odds and lightning survival
 */
export function calculateBreakthroughOdds(
  state: FourPathCultivationState,
  targetPath: CultivationPath
): {
  successProbability: number;
  tribulationDamage: number;
  lightningBolts: number;
  canBreakthrough: boolean;
} {
  const pathState = state.paths[targetPath];
  const realmDef = CULTIVATION_REALMS[pathState.realmIndex] || CULTIVATION_REALMS[0];
  const isMajorRealmJump = pathState.layer === 9;
  const resonance = calculateFourPathResonance(state.paths);

  let baseChance = isMajorRealmJump ? 0.58 : 0.88;
  baseChance += (resonance.harmonyScore - 0.5) * 0.25;
  baseChance += state.innerDemonResistance * 0.15;

  if (state.karma.alignment === 'green_righteous') {
    baseChance += 0.08;
  } else if (state.karma.alignment === 'red_blood_fiend') {
    baseChance -= 0.14; // Heavenly Dao wrath against Blood-Fiends
  }

  const successProbability = Number(Math.max(0.1, Math.min(0.98, baseChance)).toFixed(2));
  const lightningBolts = isMajorRealmJump ? realmDef.tribulationLightningBolts : 1;
  const karmaPenaltyMultiplier = state.karma.alignment === 'red_blood_fiend' ? 1.65 : 1.0;
  const tribulationDamage = Math.round(
    lightningBolts * (realmDef.index + 1) * 45 * karmaPenaltyMultiplier * (1 - state.innerDemonResistance * 0.4)
  );

  return {
    successProbability,
    tribulationDamage,
    lightningBolts,
    canBreakthrough: pathState.currentEssence >= pathState.requiredEssence && pathState.realmIndex < 22,
  };
}

/**
 * Creates a default initial Four-Path Cultivation State
 */
export function createInitialCultivationState(): FourPathCultivationState {
  const makePath = (path: CultivationPath, realmIndex: number, layer: number): PathProgress => {
    const req = getRequiredEssenceForLayer(realmIndex, layer);
    return {
      path,
      realmIndex,
      layer,
      currentEssence: req,
      requiredEssence: req,
    };
  };

  return {
    paths: {
      qi: makePath('qi', 2, 1), // Golden Core Layer 1 by default so player can immediately test 100x suppression vs Qi Refinement
      body: makePath('body', 2, 1),
      soul: makePath('soul', 2, 1),
      mind: makePath('mind', 2, 1),
    },
    spiritStones: 125_000,
    innerDemonResistance: 0.45,
    karma: evaluateKarmaState(320, 0, 14),
    lineage: {
      masterName: 'Patriarch Xuanzang of Azure Cloud',
      masterRealmIndex: 11, // Daluo Golden Immortal
      discipleCount: 3,
      proximityDistanceMeters: 24,
      spiritStoneTaxRate: 0.15,
      transmittedScrolls: ['Heaven Earth Sleeve', 'Nine Heavens Sword Intent'],
    },
  };
}
