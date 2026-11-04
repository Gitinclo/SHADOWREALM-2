// Pure Clan Hierarchy, Territory Control & 5-Sect Faction Reputation Matrix

export type ClanRank = 'outer_disciple' | 'inner_disciple' | 'core_elder' | 'grand_patriarch';

export interface FactionStanding {
  id: string;
  name: string;
  chineseTitle: string;
  alignment: 'orthodox' | 'neutral' | 'demonic' | 'imperial';
  reputation: number; // -5000 (Hostile) to +10000 (Exalted)
  rankLabel: 'Sworn Enemy' | 'Stranger' | 'Friendly' | 'Honored' | 'Revered' | 'Exalted';
  merchantDiscountPercent: number;
  unlockedManuals: string[];
}

export const INITIAL_FACTION_MATRIX: readonly FactionStanding[] = [
  {
    id: 'azure_cloud_sect',
    name: 'Azure Cloud Sect',
    chineseTitle: '青雲宗',
    alignment: 'orthodox',
    reputation: 3_400,
    rankLabel: 'Honored',
    merchantDiscountPercent: 15,
    unlockedManuals: ['Azure Cloud Sword Scripture', 'Heaven Earth Sleeve'],
  },
  {
    id: 'crimson_furnace_pavilion',
    name: 'Crimson Furnace Pavilion',
    chineseTitle: '赤爐閣',
    alignment: 'neutral',
    reputation: 1_850,
    rankLabel: 'Friendly',
    merchantDiscountPercent: 8,
    unlockedManuals: ['Nine-Flame Pill Cauldron Art'],
  },
  {
    id: 'myriad_sword_valley',
    name: 'Myriad Sword Valley',
    chineseTitle: '萬劍谷',
    alignment: 'orthodox',
    reputation: 6_200,
    rankLabel: 'Revered',
    merchantDiscountPercent: 22,
    unlockedManuals: ['Myriad Sword Returning to Origin', 'Starlight Flying Sword Array'],
  },
  {
    id: 'shadow_nether_hall',
    name: 'Shadow Nether Hall',
    chineseTitle: '幽冥殿',
    alignment: 'demonic',
    reputation: -600,
    rankLabel: 'Sworn Enemy',
    merchantDiscountPercent: 0,
    unlockedManuals: [],
  },
  {
    id: 'imperial_citadel',
    name: 'Central Imperial Citadel',
    chineseTitle: '中州皇城',
    alignment: 'imperial',
    reputation: 4_800,
    rankLabel: 'Honored',
    merchantDiscountPercent: 18,
    unlockedManuals: ['Imperial Dragon Vein Seal', 'Golden Citadel Siege Formation'],
  },
] as const;

export function evaluateFactionStanding(
  baseFaction: FactionStanding,
  reputationDelta: number
): FactionStanding {
  const rep = Math.max(-5000, Math.min(10000, baseFaction.reputation + reputationDelta));
  let rankLabel: FactionStanding['rankLabel'] = 'Stranger';
  let discount = 0;
  const manuals = [...baseFaction.unlockedManuals];

  if (rep < 0) {
    rankLabel = 'Sworn Enemy';
    discount = 0;
  } else if (rep < 1000) {
    rankLabel = 'Stranger';
    discount = 0;
  } else if (rep < 3000) {
    rankLabel = 'Friendly';
    discount = 8;
  } else if (rep < 6000) {
    rankLabel = 'Honored';
    discount = 15;
  } else if (rep < 9000) {
    rankLabel = 'Revered';
    discount = 25;
    if (!manuals.includes(`${baseFaction.name} Supreme Canon`)) {
      manuals.push(`${baseFaction.name} Supreme Canon`);
    }
  } else {
    rankLabel = 'Exalted';
    discount = 35;
    if (!manuals.includes(`${baseFaction.name} Immortal Origin Codex`)) {
      manuals.push(`${baseFaction.name} Immortal Origin Codex`);
    }
  }

  return {
    ...baseFaction,
    reputation: rep,
    rankLabel,
    merchantDiscountPercent: discount,
    unlockedManuals: manuals,
  };
}
