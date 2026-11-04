// Pure Troop Training, Cohort Scaling & Trillion-Rally Sizing Engine

export type TroopArchetype = 'shieldbearer' | 'shooter' | 'bomber';

export interface TroopTierDefinition {
  tier: number; // 1 .. 10
  name: string;
  basePowerPerUnit: number;
  spiritStoneCostPerUnit: number;
  trainingTimeSecPerThousand: number;
}

export const TROOP_TIERS: readonly TroopTierDefinition[] = [
  { tier: 1, name: 'Mortal Militia', basePowerPerUnit: 1, spiritStoneCostPerUnit: 1, trainingTimeSecPerThousand: 5 },
  { tier: 2, name: 'Iron Meridian Guard', basePowerPerUnit: 3, spiritStoneCostPerUnit: 2, trainingTimeSecPerThousand: 8 },
  { tier: 3, name: 'Bronze Qi Cohort', basePowerPerUnit: 10, spiritStoneCostPerUnit: 5, trainingTimeSecPerThousand: 12 },
  { tier: 4, name: 'Silver Core Vanguard', basePowerPerUnit: 35, spiritStoneCostPerUnit: 12, trainingTimeSecPerThousand: 18 },
  { tier: 5, name: 'Golden Core Templars', basePowerPerUnit: 120, spiritStoneCostPerUnit: 30, trainingTimeSecPerThousand: 25 },
  { tier: 6, name: 'Nascent Soul Arhats', basePowerPerUnit: 450, spiritStoneCostPerUnit: 80, trainingTimeSecPerThousand: 35 },
  { tier: 7, name: 'Earth Immortal Legion', basePowerPerUnit: 1_800, spiritStoneCostPerUnit: 220, trainingTimeSecPerThousand: 50 },
  { tier: 8, name: 'Heaven Immortal Sentinels', basePowerPerUnit: 7_500, spiritStoneCostPerUnit: 600, trainingTimeSecPerThousand: 70 },
  { tier: 9, name: 'Daluo Star Breakers', basePowerPerUnit: 32_000, spiritStoneCostPerUnit: 1_800, trainingTimeSecPerThousand: 95 },
  { tier: 10, name: 'Chaos Origin Sovereign Guard', basePowerPerUnit: 150_000, spiritStoneCostPerUnit: 5_000, trainingTimeSecPerThousand: 120 },
] as const;

export const MAX_TOTAL_TROOPS = 1_000_000_000_000_000; // 1,000 Trillion (10^15)
export const MAX_RALLY_COHORT = 1_000_000_000_000; // 1 Trillion (10^12)

export interface ArmyComposition {
  shieldbearers: number;
  shooters: number;
  bombers: number;
  tier: number; // 1..10
}

export function calculateTrainingQuote(
  archetype: TroopArchetype,
  tier: number,
  quantity: number,
  vipCostDiscount: number,
  vipSpeedMultiplier: number
): {
  archetype: TroopArchetype;
  tier: number;
  quantity: number;
  netSpiritStoneCost: number;
  netDurationSeconds: number;
} {
  const clampedTier = Math.max(1, Math.min(10, Math.floor(tier)));
  const tierDef = TROOP_TIERS[clampedTier - 1];
  const discount = Math.max(0, Math.min(0.6, vipCostDiscount));
  const speed = Math.max(0.5, vipSpeedMultiplier);

  const rawCost = quantity * tierDef.spiritStoneCostPerUnit;
  const netSpiritStoneCost = Math.max(1, Math.round(rawCost * (1 - discount)));
  const rawTime = (quantity / 1_000) * tierDef.trainingTimeSecPerThousand;
  const netDurationSeconds = Math.max(1, Math.round(rawTime / speed));

  return {
    archetype,
    tier: clampedTier,
    quantity,
    netSpiritStoneCost,
    netDurationSeconds,
  };
}
