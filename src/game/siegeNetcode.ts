// Pure Multiplayer 50v50 Territory Castle Siege Synchronization Protocol (v1.5.0)
// Includes Quantized Delta-Compression, Client-Side Prediction & Server Reconciliation

import { SquadFormationType } from './worldAI';
import { TroopArchetype } from './troopTraining';

export interface SiegeCohortEntity {
  cohortId: number; // 0 .. 99 (0..49 Attackers, 50..99 Defenders)
  faction: 'attacker' | 'defender';
  commanderName: string;
  archetype: TroopArchetype;
  formation: SquadFormationType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hpPercent: number; // 0 .. 100
  troopCount: number;
}

export interface SiegeWorldSnapshot {
  tick: number;
  timestamp: number;
  citadelEra: number;
  citadelGateHpPercent: number;
  citadelCoreHpPercent: number;
  cohorts: SiegeCohortEntity[];
}

export interface QuantizedCohortDelta {
  id: number;
  qx?: number; // Quantized integer X (0.1m precision)
  qy?: number; // Quantized integer Y (0.1m precision)
  hp?: number; // Integer 0..100
  fm?: SquadFormationType;
}

export interface SiegeDeltaPacket {
  protocol: 'SR-SIEGE-v1.5.0';
  baseTick: number;
  targetTick: number;
  seq: number;
  gateHp?: number;
  coreHp?: number;
  changedMaskCount: number;
  deltas: QuantizedCohortDelta[];
  rawSnapshotBytes: number;
  compressedDeltaBytes: number;
  bandwidthSavingsPercent: number;
}

/**
 * Initializes a 50v50 Territory Castle Siege state (50 Attacker cohorts vs 50 Defender cohorts)
 */
export function createInitialSiegeSnapshot(citadelEra: number = 5): SiegeWorldSnapshot {
  const cohorts: SiegeCohortEntity[] = [];
  const archetypes: TroopArchetype[] = ['shieldbearer', 'shooter', 'bomber'];
  const formations: SquadFormationType[] = ['shield_wall', 'wedge_charge', 'loose_skirmish'];

  for (let i = 0; i < 100; i++) {
    const isAttacker = i < 50;
    const idxInTeam = isAttacker ? i : i - 50;
    const row = Math.floor(idxInTeam / 10);
    const col = idxInTeam % 10;

    const baseX = isAttacker ? 180 + row * 42 : 980 - row * 38;
    const baseY = 140 + col * 52;

    cohorts.push({
      cohortId: i,
      faction: isAttacker ? 'attacker' : 'defender',
      commanderName: isAttacker ? `Vanguard-${i + 1}` : `Garrison-${idxInTeam + 1}`,
      archetype: archetypes[i % 3],
      formation: formations[row % 3],
      x: baseX,
      y: baseY,
      vx: isAttacker ? 14 : -8,
      vy: 0,
      hpPercent: 100,
      troopCount: 20_000_000_000, // 20B per cohort -> 1 Trillion per 50-cohort rally!
    });
  }

  return {
    tick: 1,
    timestamp: Date.now(),
    citadelEra,
    citadelGateHpPercent: 100,
    citadelCoreHpPercent: 100,
    cohorts,
  };
}

/**
 * Advances the 50v50 siege simulation by one tick, moving partial subsets of cohorts
 * so delta compression can omit stationary/unchanged cohorts.
 */
export function stepSiegeSimulationTick(
  prev: SiegeWorldSnapshot,
  dtSeconds: number = 0.05,
  playerFormationOverride?: SquadFormationType
): SiegeWorldSnapshot {
  const nextTick = prev.tick + 1;
  let gateHp = prev.citadelGateHpPercent;
  let coreHp = prev.citadelCoreHpPercent;

  const nextCohorts = prev.cohorts.map((c) => {
    // Only ~28% of cohorts change state in any single 50ms tick (realistic sparse update)
    const activeThisTick = (c.cohortId + nextTick) % 4 === 0;
    const formation =
      c.faction === 'attacker' && playerFormationOverride ? playerFormationOverride : c.formation;

    if (!activeThisTick && formation === c.formation) {
      return c;
    }

    const centerLineX = 620;
    const distToClash = centerLineX - c.x;
    let nx = c.x;
    let ny = c.y;
    let nextHp = c.hpPercent;

    if (Math.abs(distToClash) > 35 && nextHp > 0) {
      const dir = distToClash > 0 ? 1 : -1;
      const speedMod =
        formation === 'wedge_charge' ? 1.25 : formation === 'shield_wall' ? 0.75 : 1.05;
      nx = Number((c.x + dir * Math.abs(c.vx) * speedMod * dtSeconds * 4).toFixed(1));
      ny = Number((c.y + Math.sin(nextTick * 0.2 + c.cohortId) * 1.2).toFixed(1));
    } else if (nextHp > 0) {
      // Clash zone combat attrition
      const mitigation = formation === 'shield_wall' ? 0.6 : 1.0;
      const dmg = Math.max(1, Math.round(2 * mitigation));
      nextHp = Math.max(0, c.hpPercent - dmg);
      if (c.faction === 'attacker' && gateHp > 0) {
        gateHp = Math.max(0, Number((gateHp - 0.15).toFixed(2)));
      } else if (c.faction === 'attacker' && gateHp <= 0 && coreHp > 0) {
        coreHp = Math.max(0, Number((coreHp - 0.12).toFixed(2)));
      }
    }

    return {
      ...c,
      formation,
      x: nx,
      y: ny,
      hpPercent: nextHp,
    };
  });

  return {
    tick: nextTick,
    timestamp: Date.now(),
    citadelEra: prev.citadelEra,
    citadelGateHpPercent: gateHp,
    citadelCoreHpPercent: coreHp,
    cohorts: nextCohorts,
  };
}

/**
 * Computes a quantized Delta Packet between `baseline` and `current` 50v50 siege snapshots.
 */
export function encodeSiegeDeltaPacket(
  baseline: SiegeWorldSnapshot,
  current: SiegeWorldSnapshot,
  seq: number = current.tick
): SiegeDeltaPacket {
  const deltas: QuantizedCohortDelta[] = [];

  for (let i = 0; i < current.cohorts.length; i++) {
    const prev = baseline.cohorts[i];
    const curr = current.cohorts[i];
    if (!prev || !curr) continue;

    const qPrevX = Math.round(prev.x * 10);
    const qPrevY = Math.round(prev.y * 10);
    const qCurrX = Math.round(curr.x * 10);
    const qCurrY = Math.round(curr.y * 10);

    const posChanged = qPrevX !== qCurrX || qPrevY !== qCurrY;
    const hpChanged = Math.round(prev.hpPercent) !== Math.round(curr.hpPercent);
    const fmChanged = prev.formation !== curr.formation;

    if (posChanged || hpChanged || fmChanged) {
      const entry: QuantizedCohortDelta = { id: curr.cohortId };
      if (posChanged) {
        entry.qx = qCurrX;
        entry.qy = qCurrY;
      }
      if (hpChanged) {
        entry.hp = Math.round(curr.hpPercent);
      }
      if (fmChanged) {
        entry.fm = curr.formation;
      }
      deltas.push(entry);
    }
  }

  const rawSnapshotBytes = JSON.stringify(current).length;
  const compactPayload = {
    p: 'SR-SIEGE-v1.5.0',
    b: baseline.tick,
    t: current.tick,
    s: seq,
    g: baseline.citadelGateHpPercent !== current.citadelGateHpPercent ? current.citadelGateHpPercent : undefined,
    c: baseline.citadelCoreHpPercent !== current.citadelCoreHpPercent ? current.citadelCoreHpPercent : undefined,
    d: deltas,
  };
  const compressedDeltaBytes = JSON.stringify(compactPayload).length;
  const bandwidthSavingsPercent = Number(
    Math.max(0, ((rawSnapshotBytes - compressedDeltaBytes) / rawSnapshotBytes) * 100).toFixed(1)
  );

  return {
    protocol: 'SR-SIEGE-v1.5.0',
    baseTick: baseline.tick,
    targetTick: current.tick,
    seq,
    gateHp:
      baseline.citadelGateHpPercent !== current.citadelGateHpPercent
        ? current.citadelGateHpPercent
        : undefined,
    coreHp:
      baseline.citadelCoreHpPercent !== current.citadelCoreHpPercent
        ? current.citadelCoreHpPercent
        : undefined,
    changedMaskCount: deltas.length,
    deltas,
    rawSnapshotBytes,
    compressedDeltaBytes,
    bandwidthSavingsPercent,
  };
}

/**
 * Applies a SiegeDeltaPacket onto a client baseline snapshot to reconstruct the authoritative state
 */
export function applySiegeDeltaPacket(
  baseline: SiegeWorldSnapshot,
  packet: SiegeDeltaPacket
): SiegeWorldSnapshot {
  const deltaMap = new Map<number, QuantizedCohortDelta>();
  packet.deltas.forEach((d) => deltaMap.set(d.id, d));

  const updatedCohorts = baseline.cohorts.map((cohort) => {
    const d = deltaMap.get(cohort.cohortId);
    if (!d) return cohort;
    return {
      ...cohort,
      x: d.qx !== undefined ? d.qx / 10 : cohort.x,
      y: d.qy !== undefined ? d.qy / 10 : cohort.y,
      hpPercent: d.hp !== undefined ? d.hp : cohort.hpPercent,
      formation: d.fm !== undefined ? d.fm : cohort.formation,
    };
  });

  return {
    tick: packet.targetTick,
    timestamp: Date.now(),
    citadelEra: baseline.citadelEra,
    citadelGateHpPercent:
      packet.gateHp !== undefined ? packet.gateHp : baseline.citadelGateHpPercent,
    citadelCoreHpPercent:
      packet.coreHp !== undefined ? packet.coreHp : baseline.citadelCoreHpPercent,
    cohorts: updatedCohorts,
  };
}

/**
 * Client-Side Prediction & Server Reconciliation
 * Predicts local commander position forward using unacknowledged inputs and smoothly
 * reconciles when an authoritative server snapshot arrives.
 */
export function reconcileClientPrediction(params: {
  predictedX: number;
  predictedY: number;
  authoritativeX: number;
  authoritativeY: number;
  unacknowledgedInputs: Array<{ dx: number; dy: number; dt: number }>;
  snapThresholdMeters?: number;
}): {
  reconciledX: number;
  reconciledY: number;
  driftDistance: number;
  correctionMode: 'in_sync' | 'smooth_lerp' | 'hard_snap';
} {
  let replayedX = params.authoritativeX;
  let replayedY = params.authoritativeY;
  for (const inp of params.unacknowledgedInputs) {
    replayedX += inp.dx * inp.dt;
    replayedY += inp.dy * inp.dt;
  }

  const driftDistance = Number(
    Math.hypot(params.predictedX - replayedX, params.predictedY - replayedY).toFixed(3)
  );
  const snapThreshold = params.snapThresholdMeters ?? 25.0;

  if (driftDistance < 0.5) {
    return {
      reconciledX: Number(replayedX.toFixed(2)),
      reconciledY: Number(replayedY.toFixed(2)),
      driftDistance,
      correctionMode: 'in_sync',
    };
  }

  if (driftDistance <= snapThreshold) {
    // Smooth 30% Hermite/linear blend toward authoritative replay
    const blend = 0.35;
    return {
      reconciledX: Number((params.predictedX + (replayedX - params.predictedX) * blend).toFixed(2)),
      reconciledY: Number((params.predictedY + (replayedY - params.predictedY) * blend).toFixed(2)),
      driftDistance,
      correctionMode: 'smooth_lerp',
    };
  }

  return {
    reconciledX: Number(replayedX.toFixed(2)),
    reconciledY: Number(replayedY.toFixed(2)),
    driftDistance,
    correctionMode: 'hard_snap',
  };
}
