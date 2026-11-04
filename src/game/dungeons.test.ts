// Automated Architectural Guardrail & Unit Test Suite (src/game/dungeons.test.ts — 2030.1 Edition)
// Validates all 5 Core Game Development Pillars, 3D BSP Dao Grottoes, User Auth RBAC,
// 30-Realm 2030 Singularity Math, Post-Quantum Vault, and 2030 GM Command Console deterministically.

import {
  generateProceduralDungeon,
  buildBSP3DDaoGrottoTree,
  DungeonTheme,
} from './dungeons';
import {
  CULTIVATION_REALMS,
  MAX_REALM_INDEX,
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
  getCastleEraMultiplier,
  formatLargeNumber,
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
  SAVE_SCHEMA_VERSION,
  createDefaultSaveData,
  serializeSaveEnvelope,
  verifySaveEnvelopeChecksum,
  migrateSaveEnvelopeTo2030,
  createSaveSnapshot,
} from './savePersistence';
import {
  SUPREME_ADMIN_EMAIL,
  GMPriv,
  getSupremeAdminContactProfile,
  createAdminGMSession,
  verifyGMSessionIntegrity,
  hasGMPrivilege,
  executeGMConsoleCommand,
  executeGMBatchScript,
  parseGMConsoleInput,
} from './adminGMControl';
import {
  getUserRoleByEmail,
  isUserAdmin,
  createUserProfile,
} from './auth';

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

  // 3. Pillar 2: 3D BSP Dao Grotto Partitioning + WFC Dungeon Solvability across all 3 Themes
  runTest(
    'test_bsp_wfc_dungeon_solvability',
    'Pillar 2: Procedural 3D Dao Grotto BSP',
    '3D BSP Tree Partitioning, WFC Cells & A* Entrance-to-Boss Reachability',
    () => {
      const bspTree = buildBSP3DDaoGrottoTree({
        width: 40,
        height: 32,
        depth3D: 12,
        maxDepth: 3,
        seed: 424242,
      });
      const themes: DungeonTheme[] = ['dao_grotto', 'secret_realm', 'tribulation_chamber'];
      const d1 = generateProceduralDungeon({ seed: 424242, theme: 'dao_grotto', floorLevel: 15 });
      const d2 = generateProceduralDungeon({ seed: 424242, theme: 'dao_grotto', floorLevel: 15 });
      const deterministic =
        d1.astarPathToBoss.length === d2.astarPathToBoss.length &&
        d1.rooms.length === d2.rooms.length &&
        d1.voxelBlocks3D.length > 50;

      const allSolvable = themes.every((theme, i) => {
        const g = generateProceduralDungeon({ seed: 1000 + i * 77, theme, floorLevel: 25 });
        return (
          g.isSolvable &&
          g.rooms.length >= 4 &&
          g.astarPathToBoss.length >= 5 &&
          g.bspLeafCount === g.rooms.length &&
          g.voxelBlocks3D.some((v) => v.voxelType === 'altar_core')
        );
      });

      return {
        passed: bspTree.leaves.length >= 4 && deterministic && allSolvable,
        summary: `3D BSP Leaves=${bspTree.leaves.length}, Voxels3D=${d1.voxelBlocks3D.length}, WFC Cells=${d1.wfcCollapsedCells}, A* Steps=${d1.astarPathToBoss.length}`,
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

  // 9. Pillar 1: Post-Quantum + SHA-256 Save Integrity Checksum & Tamper Rejection
  runTest(
    'test_sha256_save_tamper_guard',
    'Pillar 1: Post-Quantum + SHA-256 Persistence',
    'Schema v2030.1.0 Dual SHA-256 + Ring-LWE Seal, Legacy Migration & Tamper Guard',
    () => {
      const data = createDefaultSaveData();
      const env = serializeSaveEnvelope(data);
      const validCheck = verifySaveEnvelopeChecksum(env);

      const tamperedEnv = JSON.parse(JSON.stringify(env));
      tamperedEnv.payload.cultivation.spiritStones += 999_999_999;
      const tamperedCheck = verifySaveEnvelopeChecksum(tamperedEnv);

      const snap = createSaveSnapshot(data, 'UnitTest Checkpoint');
      const migrated = migrateSaveEnvelopeTo2030({
        schemaVersion: '1.5.0',
        payload: data,
      });

      const passed =
        env.schemaVersion === SAVE_SCHEMA_VERSION &&
        Boolean(env.postQuantumLatticeSealHex?.startsWith('LWE2030:')) &&
        validCheck.valid === true &&
        tamperedCheck.valid === false &&
        snap.envelope.schemaVersion === SAVE_SCHEMA_VERSION &&
        migrated.schemaVersion === SAVE_SCHEMA_VERSION;
      return {
        passed,
        summary: `Schema=v${env.schemaVersion}, PQ=${env.postQuantumLatticeSealHex?.slice(0, 16)}…, TamperedRejected=${!tamperedCheck.valid}`,
      };
    }
  );

  // 10. User Management & Supreme Admin Role Mapping (src/game/auth.ts)
  runTest(
    'test_user_auth_admin_role_mapping',
    'Auth & RBAC (src/game/auth.ts)',
    'User Management maps creatergame31@gmail.com to Admin Role & Unlocks Controls',
    () => {
      const adminRole = getUserRoleByEmail('creatergame31@gmail.com');
      const guestRole = getUserRoleByEmail('guest@example.com');
      const adminProfile = createUserProfile('creatergame31@gmail.com', true);
      const profile = getSupremeAdminContactProfile();
      const gmSession = createAdminGMSession('creatergame31@gmail.com');
      const unauthSession = createAdminGMSession('intruder@example.com');

      const passed =
        adminRole === 'admin' &&
        guestRole === 'player' &&
        isUserAdmin(adminProfile) === true &&
        profile.email === SUPREME_ADMIN_EMAIL &&
        verifyGMSessionIntegrity(gmSession) === true &&
        hasGMPrivilege(gmSession, GMPriv.All) === true &&
        verifyGMSessionIntegrity(unauthSession) === false;

      return {
        passed,
        summary: `Email=${adminProfile.email} -> Role=${adminRole} | GMPriv::All=0x${gmSession.privMask.toString(16).toUpperCase()}`,
      };
    }
  );

  // 11. GM Command Console: Single, Bulk, Kick & Ban Actions
  runTest(
    'test_gm_command_console_bulk_and_moderation',
    'GM Command Console Engine',
    'Single, Bulk (spawn_multiple_items, teleport_all_players) & Kick/Ban Execution',
    () => {
      let session = createAdminGMSession(SUPREME_ADMIN_EMAIL);

      const parsedBulk = parseGMConsoleInput('spawn_multiple_items Nine_Turn_Golden_Pill 50');
      const bulkExec = executeGMConsoleCommand(
        session,
        parsedBulk || {
          action: 'spawn_multiple_items',
          itemName: 'Nine Turn Golden Pill',
          quantity: 50,
        }
      );
      session = bulkExec.nextSession;

      const tpAllExec = executeGMConsoleCommand(session, {
        action: 'teleport_all_players',
        x: 640,
        y: 360,
      });
      session = tpAllExec.nextSession;

      const kickExec = executeGMConsoleCommand(session, {
        action: 'kick_player',
        targetUserId: 'rogue_fiend_07',
        reason: 'Speedhack violation',
      });
      session = kickExec.nextSession;

      const banExec = executeGMConsoleCommand(session, {
        action: 'ban_player',
        targetUserId: 'exploit_bot_99',
        reason: 'Packet tampering',
      });
      session = banExec.nextSession;

      const passed =
        bulkExec.result.success &&
        bulkExec.result.affectedEntitiesCount === 50 &&
        tpAllExec.result.success &&
        tpAllExec.result.affectedEntitiesCount >= 4 &&
        kickExec.result.broadcastPayload?.type === 'kick_player' &&
        banExec.result.broadcastPayload?.type === 'ban_player' &&
        session.bannedUserIds.includes('exploit_bot_99') &&
        session.kickedUserIds.includes('rogue_fiend_07');

      return {
        passed,
        summary: `BulkSpawn=50, TeleportAll=${tpAllExec.result.affectedEntitiesCount}, Kicked=${session.kickedUserIds.length}, Banned=${session.bannedUserIds.length}`,
      };
    }
  );

  // 12. 2030.1 Future-Proofing: 30 Major Realms, Era-20 Citadel (1,000x) & Batch/Shard GM Ops
  runTest(
    'test_2030_singularity_realms_and_batch_shard_gm',
    '2030.1 Horizon Upgrade Suite',
    '30 Realms (0–29), Era-20 Citadel (1,000x), GM Batch Macro Scripting & Cross-Shard Migration',
    () => {
      const realm29 = CULTIVATION_REALMS[MAX_REALM_INDEX];
      const era20 = getCastleEraMultiplier(200);
      const spFormat = formatLargeNumber(2.5e24);

      const session = createAdminGMSession(SUPREME_ADMIN_EMAIL);
      const batch = executeGMBatchScript(
        session,
        [
          'spawn_multiple_items Singularity_Core 20',
          'set_cultivation_realm 29 9',
          'migrate_shard Shard-Omega-Void ALL',
          'schedule_decree 120 Horizon Calibration Active',
        ].join('\n')
      );

      const passed =
        CULTIVATION_REALMS.length === 30 &&
        MAX_REALM_INDEX === 29 &&
        realm29.name === 'Eternal Dao Architect' &&
        era20.eraIndex === 20 &&
        era20.eraMultiplier === 1000.0 &&
        spFormat.endsWith('Sp') &&
        batch.results.length === 4 &&
        batch.nextSession.activeShardId === 'Shard-Omega-Void' &&
        batch.nextSession.scheduledDecrees.length >= 2;

      return {
        passed,
        summary: `Realms=${CULTIVATION_REALMS.length} (R29=${realm29.name}), Era20=${era20.eraMultiplier}x, BatchOps=${batch.results.length}, Shard=${batch.nextSession.activeShardId}`,
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
