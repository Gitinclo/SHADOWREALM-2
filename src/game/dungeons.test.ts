// Automated Architectural Guardrail & Unit Test Suite (src/game/dungeons.test.ts)
// Validates all 5 Core Game Development Pillars deterministically.

import {
  generateProceduralDungeon,
  DungeonTheme,
} from './dungeons';
import {
  calculateRealmSuppression,
  calculateFourPathResonance,
  createInitialCultivationState,
  evaluateKarmaState,
} from './cultivationMath';
import {
  calculateTrillionScaleArmyPower,
  getTroopCounterMultiplier,
  calculateDiminishingArmorMitigation,
  runMonteCarloCombatSimulation,
} from './math';
import {
  getMonsterBracketForLevel,
  computeSquadFormationSlots,
  planNPCActionsGOAP,
  evaluateDynamicThreatTable,
} from './worldAI';
import {
  XIANXIA_DIALOGUE_GRAPH,
  resolveDialogueNode,
  generateRadiantQuestForNPC,
} from './dialogueEngine';
import {
  createInitialSiegeSnapshot,
  stepSiegeSimulationTick,
  encodeSiegeDeltaPacket,
  applySiegeDeltaPacket,
  reconcileClientPrediction,
} from './siegeNetcode';
import {
  createDefaultSaveData,
  serializeSaveEnvelope,
  verifySaveEnvelopeChecksum,
} from './savePersistence';
import {
  SUPREME_ADMIN_EMAIL,
  GMPriv,
  getSupremeAdminContactProfile,
  createAdminGMSession,
  verifyGMSessionIntegrity,
  hasGMPrivilege,
} from './adminGMControl';

export interface GuardrailTestResult {
  id: string;
  pillar: string;
  name: string;
  passed: boolean;
  assertionSummary: string;
  durationMs: number;
}

export function runAllArchitecturalGuardrailTests(): {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  results: GuardrailTestResult[];
} {
  const results: GuardrailTestResult[] = [];

  const runTest = (
    id: string,
    pillar: string,
    name: string,
    fn: () => { passed: boolean; summary: string }
  ) => {
    const t0 = performance.now();
    try {
      const res = fn();
      results.push({
        id,
        pillar,
        name,
        passed: res.passed,
        assertionSummary: res.summary,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      });
    } catch (err: any) {
      results.push({
        id,
        pillar,
        name,
        passed: false,
        assertionSummary: `Exception: ${err?.message || String(err)}`,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      });
    }
  };

  // 1. Pillar 5 & 1: Realm Suppression 10^DeltaRealm (Golden Core vs Qi Refinement === 100.0)
  runTest(
    'test_realm_suppression_100x',
    'Pillar 1 & 5: Cultivation Math',
    'Golden Core (Realm 2) vs Qi Refinement (Realm 0) == 100.0x Suppression',
    () => {
      const mult = calculateRealmSuppression(2, 0);
      const inverse = calculateRealmSuppression(0, 2);
      const passed = mult === 100.0 && inverse === 0.01;
      return {
        passed,
        summary: `10^(2-0) = ${mult.toFixed(1)}x damage dealt | 10^(0-2) = ${inverse}x taken`,
      };
    }
  );

  // 2. Pillar 4: Four-Path Harmony Resonance & Karma Penalties
  runTest(
    'test_four_path_resonance_karma',
    'Pillar 4: Xianxia Lore & Karma',
    'Four-Path Unity Resonance (2.0x) & Red-Name Tribulation Lightning',
    () => {
      const init = createInitialCultivationState();
      const res = calculateFourPathResonance(init.paths);
      const redKarma = evaluateKarmaState(-600, 5, 0);
      const passed =
        res.resonanceMultiplier === 2.0 &&
        redKarma.alignment === 'red_blood_fiend' &&
        redKarma.stationaryTribulationIntervalSec !== null;
      return {
        passed,
        summary: `Resonance=${res.resonanceMultiplier}x (${res.resonanceTitle}), Red-Karma Tribulation=${redKarma.stationaryTribulationIntervalSec}s`,
      };
    }
  );

  // 3. Pillar 2: BSP + WFC Procedural Dungeon Solvability across all 3 Themes
  runTest(
    'test_bsp_wfc_dungeon_solvability',
    'Pillar 2: Procedural Delve Engine',
    'BSP + WFC Dungeon Generation & A* Entrance-to-Boss Reachability',
    () => {
      const themes: DungeonTheme[] = ['dao_grotto', 'secret_realm', 'tribulation_chamber'];
      const d1 = generateProceduralDungeon({ seed: 424242, theme: 'dao_grotto', floorLevel: 15 });
      const d2 = generateProceduralDungeon({ seed: 424242, theme: 'dao_grotto', floorLevel: 15 });
      const deterministic =
        d1.astarPathToBoss.length === d2.astarPathToBoss.length &&
        d1.rooms.length === d2.rooms.length;

      const allSolvable = themes.every((theme, i) => {
        const g = generateProceduralDungeon({ seed: 1000 + i * 77, theme, floorLevel: 25 });
        return g.isSolvable && g.rooms.length >= 4 && g.astarPathToBoss.length >= 5;
      });

      return {
        passed: deterministic && allSolvable,
        summary: `Rooms=${d1.rooms.length}, WFC Cells=${d1.wfcCollapsedCells}, A* Steps=${d1.astarPathToBoss.length}, Deterministic=${deterministic}`,
      };
    }
  );

  // 4. Pillar 5: Trillion-Scale Army Power, RPS Counter Matrix & Armor Mitigation
  runTest(
    'test_trillion_power_counter_matrix',
    'Pillar 5: Game Balance & Math',
    'Trillion-Scale Power, RPS Counter Matrix (1.5x) & Diminishing Armor Mitigation',
    () => {
      const c1 = getTroopCounterMultiplier('shieldbearer', 'shooter');
      const c2 = getTroopCounterMultiplier('shooter', 'bomber');
      const c3 = getTroopCounterMultiplier('bomber', 'shieldbearer');
      const armor = calculateDiminishingArmorMitigation(5000, 5);
      const power = calculateTrillionScaleArmyPower({
        army: {
          shieldbearers: 400_000_000_000,
          shooters: 400_000_000_000,
          bombers: 200_000_000_000,
          tier: 10,
        },
        castleLevel: 100,
        heroRarity: 'chaos_mythic',
        researchLevel: 100,
        commanderRealmIndex: 10,
      });

      const passed =
        c1 === 1.5 &&
        c2 === 1.5 &&
        c3 === 1.5 &&
        armor.mitigationRatio > 0 &&
        armor.mitigationRatio <= 0.9 &&
        power.eraMultiplier === 100.0 &&
        power.maxRallyCohortTroops === 1_000_000_000_000;

      return {
        passed,
        summary: `RPS=${c1}x, EraLv100=${power.eraMultiplier}x, Mitigation=${(armor.mitigationRatio * 100).toFixed(1)}%, Rally=${power.formattedPower}`,
      };
    }
  );

  // 5. Pillar 5: Monte Carlo Combat Simulator
  runTest(
    'test_monte_carlo_simulator',
    'Pillar 5: Monte Carlo Combat Sim',
    'Monte Carlo Multi-Round Battle Sweep & Mono-Stack Vulnerability Detection',
    () => {
      const sim = runMonteCarloCombatSimulation({
        iterations: 250,
        attackerArmy: { shieldbearers: 90_000, shooters: 5_000, bombers: 5_000, tier: 6 },
        defenderArmy: { shieldbearers: 10_000, shooters: 10_000, bombers: 80_000, tier: 6 },
        attackerRealmIndex: 3,
        defenderRealmIndex: 3,
        attackerArmor: 400,
        defenderArmor: 400,
        seed: 999,
      });
      // Defender has 80% Bombers which hard-counter Attacker's 90% Shieldbearers
      const passed =
        sim.defenderWinRatePercent > sim.attackerWinRatePercent &&
        sim.dominantStrategyDiagnosis.includes('Mono-Stack Warning');
      return {
        passed,
        summary: `Bomber Counter WinRate=${sim.defenderWinRatePercent}% vs Mono-Shieldbearer=${sim.attackerWinRatePercent}%`,
      };
    }
  );

  // 6. Pillar 3: GOAP Autonomous NPC Planner, Squad Formations & Dynamic Threat Table
  runTest(
    'test_goap_squad_threat_ai',
    'Pillar 3: AI & Life Simulation',
    'GOAP 6-Step Treasury Plan, Squad Formations & Storm Titan +55% Lightning Siphon',
    () => {
      const plan = planNPCActionsGOAP({}, { treasurySupplied: true });
      const titanStorm = getMonsterBracketForLevel(950, 'thunderstorm');
      const feralStorm = getMonsterBracketForLevel(40, 'thunderstorm');
      const wedgeSlots = computeSquadFormationSlots('wedge_charge', 25);
      const threat = evaluateDynamicThreatTable([
        {
          entityId: 'dps_1',
          name: 'Archer',
          role: 'shooter_dps',
          damageDealt: 5000,
          healingDone: 0,
          activeTauntStacks: 0,
          distanceMeters: 30,
        },
        {
          entityId: 'tank_1',
          name: 'Vanguard Shield',
          role: 'shieldbearer_tank',
          damageDealt: 2200,
          healingDone: 0,
          activeTauntStacks: 2,
          distanceMeters: 5,
        },
      ]);

      const passed =
        plan.satisfied &&
        plan.steps.length === 6 &&
        titanStorm.effectiveAttackMultiplier === 1.55 &&
        feralStorm.effectiveAttackMultiplier === 0.75 &&
        wedgeSlots.length === 25 &&
        threat[0].entityId === 'tank_1';

      return {
        passed,
        summary: `GOAP Steps=${plan.steps.length}, StormTitan=${titanStorm.effectiveAttackMultiplier}x, PrimaryAggro=${threat[0].name}`,
      };
    }
  );

  // 7. Pillar 4: Conditional Branching Dialogue & Radiant Quest Engine
  runTest(
    'test_branching_dialogue_radiant',
    'Pillar 4: Dialogue & Quests',
    'Conditional Dialogue Graph Predicates & Level-Scaled Radiant Quests',
    () => {
      const lowCtx = {
        playerRealmIndex: 0,
        karmaScore: 0,
        karmaAlignment: 'neutral_wanderer' as const,
        clanRank: 'outer_disciple' as const,
        transmittedScrolls: [],
        factionReputations: {},
      };
      const highCtx = {
        playerRealmIndex: 3,
        karmaScore: 300,
        karmaAlignment: 'green_righteous' as const,
        clanRank: 'core_elder' as const,
        transmittedScrolls: ['Heaven Earth Sleeve'],
        factionReputations: { azure_cloud_sect: 4000 },
      };

      const lowRes = resolveDialogueNode(XIANXIA_DIALOGUE_GRAPH, 'elder_greeting', lowCtx);
      const highRes = resolveDialogueNode(XIANXIA_DIALOGUE_GRAPH, 'elder_greeting', highCtx);
      const quest = generateRadiantQuestForNPC('marshal', 6, 4, 777);

      const passed =
        !lowRes.resolvedChoices[0].isUnlocked &&
        highRes.resolvedChoices[0].isUnlocked &&
        quest.rewardSpiritStones > 1500;

      return {
        passed,
        summary: `Realm0 ChoiceLocked=${!lowRes.resolvedChoices[0].isUnlocked}, Realm3 Unlocked=${highRes.resolvedChoices[0].isUnlocked}, QuestReward=${quest.rewardSpiritStones}`,
      };
    }
  );

  // 8. Pillar 1: 50v50 Siege Delta Compression & Client Prediction
  runTest(
    'test_50v50_siege_delta_sync',
    'Pillar 1: 50v50 Siege Netcode',
    '50v50 Castle Siege Quantized Delta-Compression & Client Prediction Reconcile',
    () => {
      const snap0 = createInitialSiegeSnapshot(5);
      const snap1 = stepSiegeSimulationTick(snap0, 0.05);
      const delta = encodeSiegeDeltaPacket(snap0, snap1);
      const reconstructed = applySiegeDeltaPacket(snap0, delta);
      const rec = reconcileClientPrediction({
        predictedX: 210,
        predictedY: 140,
        authoritativeX: 205,
        authoritativeY: 140,
        unacknowledgedInputs: [{ dx: 20, dy: 0, dt: 0.2 }],
      });

      const passed =
        snap0.cohorts.length === 100 &&
        delta.bandwidthSavingsPercent > 60 &&
        reconstructed.cohorts[0].x === snap1.cohorts[0].x &&
        rec.correctionMode !== 'hard_snap';

      return {
        passed,
        summary: `Cohorts=${snap0.cohorts.length} (50v50), DeltaSavings=${delta.bandwidthSavingsPercent}%, Reconcile=${rec.correctionMode}`,
      };
    }
  );

  // 9. Pillar 1: SHA-256 Save Integrity Checksum & Tamper Rejection
  runTest(
    'test_sha256_save_tamper_guard',
    'Pillar 1: SHA-256 Persistence',
    'Schema v1.5.0 Save Serialization & Cryptographic SHA-256 Tamper Rejection',
    () => {
      const data = createDefaultSaveData();
      const env = serializeSaveEnvelope(data);
      const validCheck = verifySaveEnvelopeChecksum(env);

      // Simulate malicious save tampering (+999,999,999 Spirit Stones without valid signature)
      const tamperedEnv = JSON.parse(JSON.stringify(env));
      tamperedEnv.payload.cultivation.spiritStones += 999_999_999;
      const tamperedCheck = verifySaveEnvelopeChecksum(tamperedEnv);

      const passed = validCheck.valid === true && tamperedCheck.valid === false;
      return {
        passed,
        summary: `AuthenticValid=${validCheck.valid}, TamperedRejected=${!tamperedCheck.valid} (Hash=${env.checksumSha256.slice(0, 12)}…)`,
      };
    }
  );

  // 10. Supreme Admin / GM / Moderator Authority & Contact Guardrail (creatergame31@gmail.com)
  runTest(
    'test_supreme_admin_gm_authority',
    'GM / Admin / Moderator Control',
    'Supreme Admin, GM & Moderator Authority (creatergame31@gmail.com) + Canary Seal',
    () => {
      const profile = getSupremeAdminContactProfile();
      const gmSession = createAdminGMSession('creatergame31@gmail.com');
      const unauthSession = createAdminGMSession('intruder@example.com');

      const passed =
        profile.email === SUPREME_ADMIN_EMAIL &&
        verifyGMSessionIntegrity(gmSession) === true &&
        hasGMPrivilege(gmSession, GMPriv.All) === true &&
        verifyGMSessionIntegrity(unauthSession) === false;

      return {
        passed,
        summary: `Root=${profile.email} | GMPriv::All=0x${gmSession.privMask.toString(16).toUpperCase()} | CanaryVerified=${verifyGMSessionIntegrity(gmSession)}`,
      };
    }
  );

  const passedCount = results.filter((r) => r.passed).length;
  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    results,
  };
}
