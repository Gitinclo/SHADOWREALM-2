// Pure Narrative, Lore & Quest Systems:
// 1. Type-Safe Branching Dialogue Graph Interpreter (JSON/Yarn-compatible)
// 2. Heavenly Tribulation Cataclysm Storylines & Inner Demon Trials
// 3. Radiant Quest Generator (generateRadiantQuestForNPC)

import { ClanRank } from './clanMath';
import { KarmaAlignment } from './cultivationMath';

export interface DialogueCondition {
  minRealmIndex?: number;
  maxRealmIndex?: number;
  requiredKarmaAlignment?: KarmaAlignment;
  minKarmaScore?: number;
  maxKarmaScore?: number;
  requiredClanRank?: ClanRank;
  requiredScroll?: string;
  minFactionReputation?: { factionId: string; minRep: number };
}

export interface DialogueEffect {
  karmaDelta?: number;
  spiritStonesDelta?: number;
  innerDemonResistanceDelta?: number;
  grantScroll?: string;
  factionRepDelta?: { factionId: string; delta: number };
  triggerTribulationCataclysm?: boolean;
  spawnRadiantQuest?: boolean;
}

export interface DialogueChoice {
  id: string;
  label: string;
  nextNodeId: string;
  condition?: DialogueCondition;
  lockedReason?: string;
  effect?: DialogueEffect;
}

export interface DialogueNode {
  id: string;
  speakerName: string;
  speakerTitle: string;
  speakerFaction: string;
  text: string;
  isTribulationTrial?: boolean;
  choices: DialogueChoice[];
}

export interface DialogueEvaluationContext {
  playerRealmIndex: number;
  karmaScore: number;
  karmaAlignment: KarmaAlignment;
  clanRank: ClanRank;
  transmittedScrolls: string[];
  factionReputations: Record<string, number>;
}

const CLAN_RANK_ORDER: Record<ClanRank, number> = {
  outer_disciple: 0,
  inner_disciple: 1,
  core_elder: 2,
  grand_patriarch: 3,
};

/**
 * Evaluates whether a dialogue choice condition is satisfied by the cultivator's current state
 */
export function evaluateDialogueCondition(
  condition: DialogueCondition | undefined,
  ctx: DialogueEvaluationContext
): { met: boolean; reason: string } {
  if (!condition) return { met: true, reason: 'Unconditional choice' };

  if (condition.minRealmIndex !== undefined && ctx.playerRealmIndex < condition.minRealmIndex) {
    return {
      met: false,
      reason: `Requires Cultivation Realm #${condition.minRealmIndex} or higher`,
    };
  }
  if (condition.maxRealmIndex !== undefined && ctx.playerRealmIndex > condition.maxRealmIndex) {
    return {
      met: false,
      reason: `Restricted to Realm #${condition.maxRealmIndex} or below`,
    };
  }
  if (
    condition.requiredKarmaAlignment &&
    ctx.karmaAlignment !== condition.requiredKarmaAlignment
  ) {
    return {
      met: false,
      reason: `Requires ${condition.requiredKarmaAlignment.replace(/_/g, ' ')} Karma aura`,
    };
  }
  if (condition.minKarmaScore !== undefined && ctx.karmaScore < condition.minKarmaScore) {
    return {
      met: false,
      reason: `Requires Karma >= ${condition.minKarmaScore} (Current: ${ctx.karmaScore})`,
    };
  }
  if (condition.maxKarmaScore !== undefined && ctx.karmaScore > condition.maxKarmaScore) {
    return {
      met: false,
      reason: `Requires Blood-Fiend Karma <= ${condition.maxKarmaScore}`,
    };
  }
  if (
    condition.requiredClanRank &&
    CLAN_RANK_ORDER[ctx.clanRank] < CLAN_RANK_ORDER[condition.requiredClanRank]
  ) {
    return {
      met: false,
      reason: `Requires Clan Rank: ${condition.requiredClanRank.replace(/_/g, ' ')}`,
    };
  }
  if (
    condition.requiredScroll &&
    !ctx.transmittedScrolls.includes(condition.requiredScroll)
  ) {
    return {
      met: false,
      reason: `Requires Lineage Scroll: "${condition.requiredScroll}"`,
    };
  }
  if (condition.minFactionReputation) {
    const currentRep = ctx.factionReputations[condition.minFactionReputation.factionId] ?? 0;
    if (currentRep < condition.minFactionReputation.minRep) {
      return {
        met: false,
        reason: `Requires ${condition.minFactionReputation.minRep} standing with ${condition.minFactionReputation.factionId}`,
      };
    }
  }

  return { met: true, reason: 'Condition satisfied' };
}

/**
 * Resolves a dialogue node along with per-choice unlock diagnostics for UI rendering
 */
export function resolveDialogueNode(
  graph: Record<string, DialogueNode>,
  nodeId: string,
  ctx: DialogueEvaluationContext
): {
  node: DialogueNode;
  resolvedChoices: Array<
    DialogueChoice & { isUnlocked: boolean; unlockDiagnostic: string }
  >;
} {
  const node = graph[nodeId] || Object.values(graph)[0];
  const resolvedChoices = node.choices.map((choice) => {
    const check = evaluateDialogueCondition(choice.condition, ctx);
    return {
      ...choice,
      isUnlocked: check.met,
      unlockDiagnostic: check.met ? 'Available' : choice.lockedReason || check.reason,
    };
  });

  return { node, resolvedChoices };
}

/**
 * Canonical Xianxia Sect & Heavenly Tribulation Cataclysm Dialogue Graph
 */
export const XIANXIA_DIALOGUE_GRAPH: Record<string, DialogueNode> = {
  elder_greeting: {
    id: 'elder_greeting',
    speakerName: 'Grand Patriarch Xuanzang',
    speakerTitle: 'Daluo Golden Immortal • Azure Cloud Sect',
    speakerFaction: 'Azure Cloud Sect',
    text: 'Disciple, the Dragon Vein beneath the Central Citadel trembles. A Nine-Fold Heavenly Tribulation approaches the Ancient Dao Grotto. How will you temper your Four-Path vessel?',
    choices: [
      {
        id: 'choice_golden_core_decree',
        label: '[Golden Core+] Channel the Heaven Earth Sleeve to stabilize the Dragon Vein',
        nextNodeId: 'tribulation_cataclysm_trial',
        condition: { minRealmIndex: 2, requiredScroll: 'Heaven Earth Sleeve' },
        lockedReason: 'Requires Golden Core (Realm 2+) & "Heaven Earth Sleeve" Scroll',
        effect: {
          karmaDelta: 80,
          spiritStonesDelta: 15_000,
          factionRepDelta: { factionId: 'azure_cloud_sect', delta: 450 },
        },
      },
      {
        id: 'choice_righteous_oath',
        label: '[Righteous Karma] Swear a Celestial Vow to shield the mortal outposts from storm lightning',
        nextNodeId: 'righteous_sanctuary_outcome',
        condition: { minKarmaScore: 150 },
        lockedReason: 'Requires Righteous Karma >= +150',
        effect: {
          karmaDelta: 120,
          innerDemonResistanceDelta: 0.12,
          grantScroll: 'Taiyi Jade Protection Seal',
          spawnRadiantQuest: true,
        },
      },
      {
        id: 'choice_blood_fiend_siphon',
        label: '[Demonic Path] Devour the tribulation lightning and refine a Blood-Fiend Core (-250 Karma)',
        nextNodeId: 'inner_demon_mirror',
        effect: {
          karmaDelta: -250,
          spiritStonesDelta: 35_000,
          factionRepDelta: { factionId: 'shadow_nether_hall', delta: 600 },
          triggerTribulationCataclysm: true,
        },
      },
      {
        id: 'choice_radiant_commission',
        label: 'Request a Castle Era Imperial Decree & Radiant Bounty',
        nextNodeId: 'radiant_decree_issued',
        effect: {
          spiritStonesDelta: 5_000,
          spawnRadiantQuest: true,
        },
      },
    ],
  },
  tribulation_cataclysm_trial: {
    id: 'tribulation_cataclysm_trial',
    speakerName: 'Celestial Arbiter Phantom',
    speakerTitle: 'Heavenly Dao Manifestation • Nine-Heavens Thunder',
    speakerFaction: 'Heavenly Dao',
    isTribulationTrial: true,
    text: 'Violet-Gold Chaos Lightning cleaves the sky! An Inner Demon wearing your own face whispers: "Surrender your Soul Path to eternal comfort, or shatter the heavens with all Four Paths united?"',
    choices: [
      {
        id: 'choice_shatter_inner_demon',
        label: 'Unleash Four-Path Resonance to sever the Inner Demon (+18% Inner Demon Resistance)',
        nextNodeId: 'elder_greeting',
        effect: {
          karmaDelta: 90,
          innerDemonResistanceDelta: 0.18,
          spiritStonesDelta: 25_000,
          grantScroll: 'Primordial Chaos Thunder Scripture',
        },
      },
      {
        id: 'choice_absorb_demon_shadow',
        label: 'Fuse the Inner Demon into a Shadow Clone for Siege Warfare (+40,000 Spirit Stones)',
        nextNodeId: 'elder_greeting',
        effect: {
          karmaDelta: -60,
          spiritStonesDelta: 40_000,
        },
      },
    ],
  },
  righteous_sanctuary_outcome: {
    id: 'righteous_sanctuary_outcome',
    speakerName: 'Grand Patriarch Xuanzang',
    speakerTitle: 'Daluo Golden Immortal • Azure Cloud Sect',
    speakerFaction: 'Azure Cloud Sect',
    text: 'Golden merit lotus blooms above your crown! The Azure Cloud Treasury bestows the Taiyi Jade Protection Seal upon your lineage and issues a high-priority Sect Decree.',
    choices: [
      {
        id: 'return_to_root_1',
        label: 'Bow to the Patriarch and return to command',
        nextNodeId: 'elder_greeting',
      },
    ],
  },
  inner_demon_mirror: {
    id: 'inner_demon_mirror',
    speakerName: 'Sovereign of Shadow Nether Hall',
    speakerTitle: 'Blood-Moon Archfiend',
    speakerFaction: 'Shadow Nether Hall',
    isTribulationTrial: true,
    text: 'Crimson clouds gather! Should your Karma fall into the Red Blood-Fiend realm, stationary Heavenly Tribulation lightning will strike your coordinates and orthodox cultivators will hunt your bounty—yet your destructive might surges!',
    choices: [
      {
        id: 'embrace_crimson_dao',
        label: 'Accept the Blood-Moon Decree and return to the War Council',
        nextNodeId: 'elder_greeting',
      },
    ],
  },
  radiant_decree_issued: {
    id: 'radiant_decree_issued',
    speakerName: 'Imperial Marshal Ling',
    speakerTitle: 'Citadel War Minister',
    speakerFaction: 'Central Imperial Citadel',
    text: 'By Imperial Seal, a new level-scaled Radiant Bounty has been inscribed onto your War Scroll and marked on the Shadow Radar.',
    choices: [
      {
        id: 'return_to_root_2',
        label: 'Inspect the Radiant Bounty and prepare the vanguard',
        nextNodeId: 'elder_greeting',
      },
    ],
  },
};

// ============================================================================
// 3. Radiant Quest Generation (generateRadiantQuestForNPC)
// ============================================================================

export type NPCRole = 'guard' | 'marshal' | 'merchant' | 'blacksmith' | 'mystic';

export interface RadiantQuest {
  id: string;
  title: string;
  npcRole: NPCRole;
  castleEra: number;
  recommendedLevel: number;
  objectiveSummary: string;
  rewardSpiritStones: number;
  rewardEssence: number;
  rewardKarma: number;
  targetCoordinates: { x: number; y: number };
}

/**
 * Generates a level-scaled Radiant Bounty or Imperial Decree based on NPC role and Castle Era
 */
export function generateRadiantQuestForNPC(
  npcRole: NPCRole,
  castleEra: number,
  playerRealmIndex: number,
  seed: number = Date.now()
): RadiantQuest {
  const safeEra = Math.max(0, Math.min(10, Math.floor(castleEra)));
  const safeRealm = Math.max(0, Math.min(22, Math.floor(playerRealmIndex)));
  const recommendedLevel = Math.min(1000, Math.max(1, safeEra * 80 + safeRealm * 25 + 10));

  const roleTemplates: Record<
    NPCRole,
    { titlePrefix: string; objective: string; baseKarma: number }
  > = {
    guard: {
      titlePrefix: 'Perimeter Purge Decree',
      objective: 'Eliminate roaming Spirit Fiend scouts breaching the outer citadel ward.',
      baseKarma: 35,
    },
    marshal: {
      titlePrefix: 'Siege Vanguard Rally',
      objective: 'Lead a Wedge Charge formation to capture the contested Dragon Vein Outpost.',
      baseKarma: 50,
    },
    merchant: {
      titlePrefix: 'Spirit Caravan Escort',
      objective: 'Escort the Azure Cloud spirit stone convoy through the thunderstorm basin.',
      baseKarma: 40,
    },
    blacksmith: {
      titlePrefix: 'Star-Iron Ore Expedition',
      objective: 'Harvest 12 Damascus Star-Iron nodes from the Ancient Dao Grotto.',
      baseKarma: 25,
    },
    mystic: {
      titlePrefix: 'Tribulation Array Calibration',
      objective: 'Inscribe 4 Taiyi Spirit Arrays around the Heavenly Tribulation Chamber.',
      baseKarma: 60,
    },
  };

  const tpl = roleTemplates[npcRole] || roleTemplates.marshal;
  const scaleMult = Math.pow(1.45, safeEra) * (1 + safeRealm * 0.5);
  const rewardSpiritStones = Math.round(1_500 * scaleMult);
  const rewardEssence = Math.round(800 * scaleMult);

  const pseudoX = 320 + ((seed * 9301 + 49297) % 1900);
  const pseudoY = 220 + ((seed * 49297 + 9301) % 1000);

  return {
    id: `quest_${npcRole}_${safeEra}_${seed % 10000}`,
    title: `[Era ${safeEra}] ${tpl.titlePrefix}`,
    npcRole,
    castleEra: safeEra,
    recommendedLevel,
    objectiveSummary: tpl.objective,
    rewardSpiritStones,
    rewardEssence,
    rewardKarma: tpl.baseKarma,
    targetCoordinates: { x: pseudoX, y: pseudoY },
  };
}
