// Pure VIP Subscription & 7-Day Cyclical Login Scaling Math

export interface VIPBenefitProfile {
  vipLevel: number; // 0 .. 15
  trainingCostDiscount: number; // 0.0 to 0.45
  trainingSpeedMultiplier: number; // 1.0 to 3.5
  resourceYieldMultiplier: number; // 1.0 to 2.5
  dailySpiritStoneStipend: number;
  marchQueueSlots: number;
}

export function getVIPBenefitProfile(vipLevel: number): VIPBenefitProfile {
  const lvl = Math.max(0, Math.min(15, Math.floor(vipLevel)));
  return {
    vipLevel: lvl,
    trainingCostDiscount: Number((lvl * 0.03).toFixed(2)),
    trainingSpeedMultiplier: Number((1 + lvl * 0.16).toFixed(2)),
    resourceYieldMultiplier: Number((1 + lvl * 0.1).toFixed(2)),
    dailySpiritStoneStipend: lvl === 0 ? 500 : lvl * lvl * 1_200,
    marchQueueSlots: 2 + Math.floor(lvl / 3),
  };
}

/**
 * Evaluates 7-day cyclical login streak multiplier (Day 1..7)
 */
export function getCyclicalLoginMultiplier(streakDays: number): {
  cycleDay: number; // 1..7
  rewardMultiplier: number;
  bonusChestUnlocked: boolean;
} {
  const safeDays = Math.max(1, Math.floor(streakDays));
  const cycleDay = ((safeDays - 1) % 7) + 1;
  const multipliers = [1.0, 1.15, 1.3, 1.5, 1.75, 2.1, 3.0];
  return {
    cycleDay,
    rewardMultiplier: multipliers[cycleDay - 1],
    bonusChestUnlocked: cycleDay === 7,
  };
}
