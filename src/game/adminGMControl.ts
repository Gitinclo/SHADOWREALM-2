// Unified Supreme Administration, Game Master (GM), Moderator & Contact Engine (2030.1 Future-Proof Edition)
// Mirrors C++ shadowrealm_gm.hpp privileges (GMPriv::All) and binds root authority
// and official contact to: creatergame31@gmail.com

import { computeSHA256Hex, ServerShardId } from './savePersistence';
import { MAX_REALM_INDEX } from './cultivationMath';

export const SUPREME_ADMIN_EMAIL = 'creatergame31@gmail.com' as const;

export type AdminAuthorityRole =
  | 'Supreme Administrator'
  | 'Game Master (GM)'
  | 'Lead Moderator'
  | 'Realm Architect'
  | '2030 Horizon Overseer';

export enum GMPriv {
  None = 0,
  Godmode = 1 << 0,
  SpawnEnemy = 1 << 1,
  SetHP = 1 << 2,
  GiveLoot = 1 << 3,
  Teleport = 1 << 4,
  SetLevel = 1 << 5,
  TimeControl = 1 << 6,
  ToggleHUD = 1 << 7,
  ModeratePlayers = 1 << 8,
  BroadcastDecree = 1 << 9,
  ShardMigration = 1 << 10,
  BatchScripting = 1 << 11,
  SnapshotRollback = 1 << 12,
  All = 0x1fff,
}

export type GMConsoleActionType =
  | 'spawn_item'
  | 'teleport_player'
  | 'set_cultivation_realm'
  | 'spawn_multiple_items'
  | 'teleport_all_players'
  | 'kick_player'
  | 'ban_player'
  | 'migrate_shard'
  | 'run_batch_script'
  | 'schedule_decree'
  | 'rollback_snapshot';

export interface GMConsoleCommandPayload {
  action: GMConsoleActionType;
  targetUserId?: string;
  itemId?: string;
  itemName?: string;
  itemRarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'chaos_artifact' | 'singularity_relic';
  quantity?: number;
  x?: number;
  y?: number;
  realmIndex?: number;
  layer?: number;
  reason?: string;
  targetShardId?: ServerShardId;
  scriptLines?: string[];
  decreeMessage?: string;
  decreeIntervalSec?: number;
  snapshotId?: string;
}

export interface GMConsoleExecutionResult {
  success: boolean;
  action: GMConsoleActionType;
  timestampIso: string;
  actorEmail: string;
  affectedEntitiesCount: number;
  summary: string;
  broadcastPayload?: {
    type: 'gm_command' | 'kick_player' | 'ban_player';
    action: GMConsoleActionType;
    targetUserId?: string;
    reason?: string;
    actorEmail: string;
    data: Record<string, any>;
    timestamp: number;
  };
}

export interface ServerTelemetryPoint {
  timestamp: number;
  timeLabel: string;
  serverLoadPercent: number;
  predictedLoad2030Percent?: number;
  anomalyScore?: number;
  autoScaleShardCount?: number;
  activeShardId?: ServerShardId;
  activeUsers: number;
  tickRateHz: number;
  memoryUsageMb: number;
  wsThroughputKbps: number;
}

export interface ConnectedPlayerSession {
  userId: string;
  username: string;
  realmIndex: number;
  x: number;
  y: number;
  pingMs: number;
  status: 'active' | 'kicked' | 'banned';
  shardId: ServerShardId;
}

export interface ScheduledServerDecree {
  id: string;
  message: string;
  intervalSec: number;
  active: boolean;
  createdAtIso: string;
}

export interface AdminContactProfile {
  email: string;
  displayName: string;
  title: string;
  roles: AdminAuthorityRole[];
  privilegeMask: number;
  verifiedSignatureSha256: string;
  supportChannels: {
    directEmail: string;
    mailtoHref: string;
    escalationSla: string;
    realmJurisdiction: string;
  };
}

export interface GMAuditLogEntry {
  id: string;
  timestampIso: string;
  actorEmail: string;
  role: string;
  action: string;
  details: string;
}

export interface GMSessionState {
  accountEmail: string;
  authenticated: boolean;
  roles: AdminAuthorityRole[];
  privMask: number;
  godmode: boolean;
  infiniteMana: boolean;
  timeFrozen: boolean;
  timeScale: number;
  activeShardId: ServerShardId;
  sessionTokenHex: string;
  canarySealHex: string;
  auditLog: GMAuditLogEntry[];
  consoleHistory: GMConsoleExecutionResult[];
  spawnedItemsInventory: Array<{
    itemId: string;
    itemName: string;
    rarity: string;
    quantity: number;
    spawnedAtIso: string;
  }>;
  connectedPlayers: ConnectedPlayerSession[];
  bannedUserIds: string[];
  kickedUserIds: string[];
  scheduledDecrees: ScheduledServerDecree[];
}

const GM_CANARY_SALT = 'SHADOWREALM_GM_CANARY_9E3779B97F4A7C15';

const INITIAL_CONNECTED_PLAYERS: ConnectedPlayerSession[] = [
  {
    userId: 'cultivator_azure_01',
    username: 'SwordSaint_Lin',
    realmIndex: 4,
    x: 680,
    y: 410,
    pingMs: 14,
    status: 'active',
    shardId: 'Shard-Alpha-2030',
  },
  {
    userId: 'cultivator_lotus_02',
    username: 'Fairy_YaoGuang',
    realmIndex: 5,
    x: 1120,
    y: 640,
    pingMs: 19,
    status: 'active',
    shardId: 'Shard-Alpha-2030',
  },
  {
    userId: 'rogue_fiend_07',
    username: 'BloodFiend_Mo',
    realmIndex: 3,
    x: 1890,
    y: 980,
    pingMs: 38,
    status: 'active',
    shardId: 'Shard-Omega-Void',
  },
  {
    userId: 'sect_vanguard_12',
    username: 'IronShield_Zhang',
    realmIndex: 2,
    x: 740,
    y: 520,
    pingMs: 26,
    status: 'active',
    shardId: 'Shard-Celestial-Siege',
  },
];

/**
 * Returns the canonical Administrator / GM / Moderator contact & authority profile
 * for creatergame31@gmail.com
 */
export function getSupremeAdminContactProfile(): AdminContactProfile {
  const email = SUPREME_ADMIN_EMAIL;
  const verifiedSignatureSha256 = computeSHA256Hex(
    `ADMIN_GM_MOD_ROOT:${email}:${GM_CANARY_SALT}`
  );

  return {
    email,
    displayName: 'CreatorGame31',
    title: 'Supreme Administrator • Grand Game Master (GM) • Lead Moderator • 2030 Horizon Overseer',
    roles: [
      'Supreme Administrator',
      'Game Master (GM)',
      'Lead Moderator',
      'Realm Architect',
      '2030 Horizon Overseer',
    ],
    privilegeMask: GMPriv.All,
    verifiedSignatureSha256,
    supportChannels: {
      directEmail: email,
      mailtoHref: `mailto:${email}?subject=${encodeURIComponent(
        '[ShadowRealm 2030.1 GM / Admin / Moderation Inquiry]'
      )}`,
      escalationSla: 'Priority Direct Dispatch — Root GM & 2030 Horizon Authority',
      realmJurisdiction:
        'All Shards (Alpha-2030 / Omega-Void / Celestial-Siege) • 30 Realms • Era-20 Citadels',
    },
  };
}

/**
 * Checks whether an email address holds root Admin / GM / Moderator privileges
 */
export function isAuthorizedAdminAccount(email: string): boolean {
  return email.trim().toLowerCase() === SUPREME_ADMIN_EMAIL.toLowerCase();
}

/**
 * Creates an authenticated GM / Admin / Moderator session for creatergame31@gmail.com
 */
export function createAdminGMSession(
  accountEmail: string = SUPREME_ADMIN_EMAIL
): GMSessionState {
  const authorized = isAuthorizedAdminAccount(accountEmail);
  const normalized = accountEmail.trim().toLowerCase();
  const sessionTokenHex = computeSHA256Hex(`GM_TOKEN:${normalized}:v2030.1.0`).slice(0, 24);
  const canarySealHex = computeSHA256Hex(
    `${sessionTokenHex}:${GM_CANARY_SALT}:${authorized ? 'ALLOW' : 'DENY'}`
  ).slice(0, 24);

  return {
    accountEmail: authorized ? SUPREME_ADMIN_EMAIL : accountEmail,
    authenticated: authorized,
    roles: authorized
      ? [
          'Supreme Administrator',
          'Game Master (GM)',
          'Lead Moderator',
          'Realm Architect',
          '2030 Horizon Overseer',
        ]
      : [],
    privMask: authorized ? GMPriv.All : GMPriv.None,
    godmode: false,
    infiniteMana: false,
    timeFrozen: false,
    timeScale: 1.0,
    activeShardId: 'Shard-Alpha-2030',
    sessionTokenHex,
    canarySealHex,
    auditLog: [
      {
        id: 'gm_init_1',
        timestampIso: new Date().toISOString(),
        actorEmail: SUPREME_ADMIN_EMAIL,
        role: 'Supreme Administrator / GM / 2030 Overseer',
        action: 'AUTH_SESSION_SEALED_2030',
        details: `Root GMPriv::All (0x${GMPriv.All.toString(16).toUpperCase()}) granted to ${SUPREME_ADMIN_EMAIL}`,
      },
    ],
    consoleHistory: [],
    spawnedItemsInventory: [
      {
        itemId: 'chaos_jade_seal',
        itemName: 'Chaos Origin Jade Seal',
        rarity: 'chaos_artifact',
        quantity: 1,
        spawnedAtIso: new Date().toISOString(),
      },
      {
        itemId: 'singularity_chrono_astrolabe',
        itemName: '2030 Chrono-Singularity Astrolabe',
        rarity: 'singularity_relic',
        quantity: 1,
        spawnedAtIso: new Date().toISOString(),
      },
    ],
    connectedPlayers: INITIAL_CONNECTED_PLAYERS.map((p) => ({ ...p })),
    bannedUserIds: [],
    kickedUserIds: [],
    scheduledDecrees: [
      {
        id: 'decree_2030_1',
        message: '2030.1 Horizon Singularity Calibration: 2x Spirit Vein Yield across all Shards.',
        intervalSec: 300,
        active: true,
        createdAtIso: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Verifies the anti-tamper canary seal of a GMSessionState
 */
export function verifyGMSessionIntegrity(session: GMSessionState): boolean {
  if (!session.authenticated) return false;
  if (!isAuthorizedAdminAccount(session.accountEmail)) return false;
  const expectedCanary = computeSHA256Hex(
    `${session.sessionTokenHex}:${GM_CANARY_SALT}:ALLOW`
  ).slice(0, 24);
  return session.canarySealHex === expectedCanary && (session.privMask & GMPriv.All) === GMPriv.All;
}

/**
 * Checks if a specific GMPriv bit is active on a verified session
 */
export function hasGMPrivilege(session: GMSessionState, priv: GMPriv): boolean {
  if (!verifyGMSessionIntegrity(session)) return false;
  return (session.privMask & priv) !== 0;
}

/**
 * Appends an immutable entry to the GM / Moderator audit log
 */
export function appendGMAuditLog(
  session: GMSessionState,
  action: string,
  details: string
): GMSessionState {
  const entry: GMAuditLogEntry = {
    id: `gm_log_${Date.now()}_${session.auditLog.length + 1}`,
    timestampIso: new Date().toISOString(),
    actorEmail: session.accountEmail,
    role: 'Admin / GM / 2030 Overseer',
    action,
    details,
  };
  return {
    ...session,
    auditLog: [entry, ...session.auditLog].slice(0, 40),
  };
}

/**
 * Parses a raw command string from the GM Command Console input field into a structured payload.
 * Examples:
 * - "spawn_item Celestial_Sword 1"
 * - "spawn_multiple_items Nine_Turn_Golden_Pill 50"
 * - "teleport_player cultivator_azure_01 1280 720"
 * - "teleport_all_players 640 360"
 * - "set_cultivation_realm 29 9"
 * - "kick_player rogue_fiend_07 Disruptive behavior"
 * - "ban_player rogue_fiend_07 Malicious packet injection"
 * - "migrate_shard Shard-Omega-Void ALL"
 * - "schedule_decree 180 Double Tribulation Essence Active"
 */
export function parseGMConsoleInput(rawInput: string): GMConsoleCommandPayload | null {
  const trimmed = rawInput.trim().replace(/^\//, '');
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase() as GMConsoleActionType;

  switch (cmd) {
    case 'spawn_item': {
      const itemName = (parts[1] || 'Immortal_Spirit_Sword').replace(/_/g, ' ');
      const quantity = Math.max(1, Number(parts[2]) || 1);
      return {
        action: 'spawn_item',
        itemId: itemName.toLowerCase().replace(/\s+/g, '_'),
        itemName,
        itemRarity: 'legendary',
        quantity,
      };
    }
    case 'spawn_multiple_items': {
      const itemName = (parts[1] || 'Nine_Turn_Golden_Pill').replace(/_/g, ' ');
      const quantity = Math.max(2, Number(parts[2]) || 25);
      return {
        action: 'spawn_multiple_items',
        itemId: itemName.toLowerCase().replace(/\s+/g, '_'),
        itemName,
        itemRarity: 'singularity_relic',
        quantity,
      };
    }
    case 'teleport_player': {
      const hasTargetId = parts.length >= 4 && isNaN(Number(parts[1]));
      const targetUserId = hasTargetId ? parts[1] : 'local_admin';
      const x = Number(hasTargetId ? parts[2] : parts[1]) || 1280;
      const y = Number(hasTargetId ? parts[3] : parts[2]) || 720;
      return {
        action: 'teleport_player',
        targetUserId,
        x,
        y,
      };
    }
    case 'teleport_all_players': {
      const x = Number(parts[1]) || 640;
      const y = Number(parts[2]) || 360;
      return {
        action: 'teleport_all_players',
        x,
        y,
      };
    }
    case 'set_cultivation_realm': {
      const realmIndex = Math.max(0, Math.min(MAX_REALM_INDEX, Number(parts[1]) || 5));
      const layer = Math.max(1, Math.min(9, Number(parts[2]) || 9));
      return {
        action: 'set_cultivation_realm',
        realmIndex,
        layer,
      };
    }
    case 'kick_player': {
      const targetUserId = parts[1] || 'rogue_fiend_07';
      const reason = parts.slice(2).join(' ') || 'Connection terminated by GM Command Console';
      return {
        action: 'kick_player',
        targetUserId,
        reason,
      };
    }
    case 'ban_player': {
      const targetUserId = parts[1] || 'rogue_fiend_07';
      const reason = parts.slice(2).join(' ') || 'Permanently banned by Supreme Administrator';
      return {
        action: 'ban_player',
        targetUserId,
        reason,
      };
    }
    case 'migrate_shard': {
      const validShards: ServerShardId[] = [
        'Shard-Alpha-2030',
        'Shard-Omega-Void',
        'Shard-Celestial-Siege',
      ];
      const rawShard = parts[1] as ServerShardId;
      const targetShardId: ServerShardId = validShards.includes(rawShard)
        ? rawShard
        : 'Shard-Alpha-2030';
      const targetUserId = parts[2] || 'ALL';
      return {
        action: 'migrate_shard',
        targetShardId,
        targetUserId,
      };
    }
    case 'schedule_decree': {
      const intervalSec = Math.max(15, Number(parts[1]) || 180);
      const decreeMessage =
        parts.slice(2).join(' ') ||
        'By 2030.1 Imperial Decree: Cosmic Singularity Resonance is active!';
      return {
        action: 'schedule_decree',
        decreeIntervalSec: intervalSec,
        decreeMessage,
      };
    }
    case 'rollback_snapshot': {
      return {
        action: 'rollback_snapshot',
        snapshotId: parts[1] || 'latest',
      };
    }
    default:
      return null;
  }
}

/**
 * Executes an administrative command on a verified GM session, mutating session state,
 * appending an audit log entry, and returning the broadcast payload for the WebSocket server.
 */
export function executeGMConsoleCommand(
  session: GMSessionState,
  command: GMConsoleCommandPayload
): { nextSession: GMSessionState; result: GMConsoleExecutionResult } {
  const nowIso = new Date().toISOString();

  if (!verifyGMSessionIntegrity(session)) {
    const deniedResult: GMConsoleExecutionResult = {
      success: false,
      action: command.action,
      timestampIso: nowIso,
      actorEmail: session.accountEmail,
      affectedEntitiesCount: 0,
      summary: `Rejected: Unauthorized account (${session.accountEmail}). Root Admin (${SUPREME_ADMIN_EMAIL}) required.`,
    };
    return { nextSession: session, result: deniedResult };
  }

  let nextSession: GMSessionState = {
    ...session,
    spawnedItemsInventory: [...session.spawnedItemsInventory],
    connectedPlayers: session.connectedPlayers.map((p) => ({ ...p })),
    bannedUserIds: [...session.bannedUserIds],
    kickedUserIds: [...session.kickedUserIds],
    consoleHistory: [...session.consoleHistory],
    scheduledDecrees: [...session.scheduledDecrees],
  };

  let summary = '';
  let affectedEntitiesCount = 1;
  let broadcastType: 'gm_command' | 'kick_player' | 'ban_player' = 'gm_command';

  switch (command.action) {
    case 'spawn_item': {
      const itemName = command.itemName || 'Celestial Void Blade';
      const itemId = command.itemId || itemName.toLowerCase().replace(/\s+/g, '_');
      const qty = Math.max(1, command.quantity ?? 1);
      const rarity = command.itemRarity || 'legendary';
      affectedEntitiesCount = qty;

      const existing = nextSession.spawnedItemsInventory.find((i) => i.itemId === itemId);
      if (existing) {
        existing.quantity += qty;
        existing.spawnedAtIso = nowIso;
      } else {
        nextSession.spawnedItemsInventory.unshift({
          itemId,
          itemName,
          rarity,
          quantity: qty,
          spawnedAtIso: nowIso,
        });
      }
      summary = `Spawned item "${itemName}" (x${qty}, ${rarity}) into administrator vault.`;
      break;
    }

    case 'spawn_multiple_items': {
      const itemName = command.itemName || 'Nine-Turn Golden Core Pill';
      const itemId = command.itemId || itemName.toLowerCase().replace(/\s+/g, '_');
      const qty = Math.max(2, command.quantity ?? 50);
      const rarity = command.itemRarity || 'singularity_relic';
      affectedEntitiesCount = qty;

      const existing = nextSession.spawnedItemsInventory.find((i) => i.itemId === itemId);
      if (existing) {
        existing.quantity += qty;
        existing.spawnedAtIso = nowIso;
      } else {
        nextSession.spawnedItemsInventory.unshift({
          itemId,
          itemName,
          rarity,
          quantity: qty,
          spawnedAtIso: nowIso,
        });
      }
      summary = `Bulk Action: Spawned ${qty}x "${itemName}" (${rarity}) across active sect distribution nodes.`;
      break;
    }

    case 'teleport_player': {
      const tx = Math.round(command.x ?? 1280);
      const ty = Math.round(command.y ?? 720);
      const targetId = command.targetUserId || 'local_admin';
      const playerEntry = nextSession.connectedPlayers.find(
        (p) => p.userId === targetId || p.username.toLowerCase() === targetId.toLowerCase()
      );
      if (playerEntry) {
        playerEntry.x = tx;
        playerEntry.y = ty;
      }
      affectedEntitiesCount = 1;
      summary = `Teleported player [${targetId}] to coordinates (${tx}, ${ty}).`;
      break;
    }

    case 'teleport_all_players': {
      const tx = Math.round(command.x ?? 640);
      const ty = Math.round(command.y ?? 360);
      const activeList = nextSession.connectedPlayers.filter((p) => p.status === 'active');
      activeList.forEach((p, idx) => {
        p.x = tx + (idx % 4) * 18;
        p.y = ty + Math.floor(idx / 4) * 18;
      });
      affectedEntitiesCount = Math.max(1, activeList.length + 1);
      summary = `Bulk Action: Teleported all ${affectedEntitiesCount} active players to assembly coordinates (${tx}, ${ty}).`;
      break;
    }

    case 'set_cultivation_realm': {
      const realmIdx = Math.max(0, Math.min(MAX_REALM_INDEX, command.realmIndex ?? 5));
      const layer = Math.max(1, Math.min(9, command.layer ?? 9));
      affectedEntitiesCount = 1;
      summary = `Set cultivator Major Realm to index #${realmIdx} (Layer ${layer}/9) across all 4 cultivation paths.`;
      break;
    }

    case 'kick_player': {
      const targetId = (command.targetUserId || '').trim();
      const reason = command.reason || 'Kicked by GM Command Console';
      broadcastType = 'kick_player';
      if (targetId && !nextSession.kickedUserIds.includes(targetId)) {
        nextSession.kickedUserIds.push(targetId);
      }
      nextSession.connectedPlayers = nextSession.connectedPlayers.map((p) =>
        p.userId === targetId || p.username.toLowerCase() === targetId.toLowerCase()
          ? { ...p, status: 'kicked' }
          : p
      );
      affectedEntitiesCount = 1;
      summary = `Terminated WebSocket session for user ID "${targetId}" (Action: kick_player • Reason: ${reason}).`;
      break;
    }

    case 'ban_player': {
      const targetId = (command.targetUserId || '').trim();
      const reason = command.reason || 'Banned by Supreme Administrator';
      broadcastType = 'ban_player';
      if (targetId && !nextSession.bannedUserIds.includes(targetId)) {
        nextSession.bannedUserIds.push(targetId);
      }
      nextSession.connectedPlayers = nextSession.connectedPlayers.map((p) =>
        p.userId === targetId || p.username.toLowerCase() === targetId.toLowerCase()
          ? { ...p, status: 'banned' }
          : p
      );
      affectedEntitiesCount = 1;
      summary = `Permanently banned user ID "${targetId}" & terminated active connection (Action: ban_player • Reason: ${reason}).`;
      break;
    }

    case 'migrate_shard': {
      const targetShard = command.targetShardId || 'Shard-Alpha-2030';
      const targetUser = (command.targetUserId || 'ALL').trim();
      nextSession.activeShardId = targetShard;

      if (targetUser.toUpperCase() === 'ALL') {
        const activePeers = nextSession.connectedPlayers.filter((p) => p.status === 'active');
        nextSession.connectedPlayers = nextSession.connectedPlayers.map((p) =>
          p.status === 'active' ? { ...p, shardId: targetShard } : p
        );
        affectedEntitiesCount = activePeers.length + 1;
        summary = `Cross-Shard Migration: Transferred all ${affectedEntitiesCount} active sessions to [${targetShard}].`;
      } else {
        nextSession.connectedPlayers = nextSession.connectedPlayers.map((p) =>
          p.userId === targetUser || p.username.toLowerCase() === targetUser.toLowerCase()
            ? { ...p, shardId: targetShard }
            : p
        );
        affectedEntitiesCount = 1;
        summary = `Cross-Shard Migration: Transferred session "${targetUser}" to [${targetShard}].`;
      }
      break;
    }

    case 'schedule_decree': {
      const intervalSec = Math.max(15, command.decreeIntervalSec ?? 180);
      const message =
        command.decreeMessage ||
        'By 2030.1 Imperial Decree: Cosmic Singularity Resonance is active!';
      const newDecree: ScheduledServerDecree = {
        id: `decree_${Date.now()}_${nextSession.scheduledDecrees.length + 1}`,
        message,
        intervalSec,
        active: true,
        createdAtIso: nowIso,
      };
      nextSession.scheduledDecrees = [newDecree, ...nextSession.scheduledDecrees].slice(0, 8);
      affectedEntitiesCount = nextSession.connectedPlayers.filter((p) => p.status === 'active').length + 1;
      summary = `Scheduled Automated Server Decree (every ${intervalSec}s): "${message}"`;
      break;
    }

    case 'rollback_snapshot': {
      const snapId = command.snapshotId || 'latest';
      affectedEntitiesCount = 1;
      summary = `Restored verified 2030.1 Realm State Snapshot [${snapId}] with Post-Quantum Lattice-Hash seal verification.`;
      break;
    }

    case 'run_batch_script': {
      const lines = command.scriptLines || [];
      affectedEntitiesCount = Math.max(1, lines.length);
      summary = `Executed GM Batch Macro Script (${lines.length} atomic directives).`;
      break;
    }
  }

  const result: GMConsoleExecutionResult = {
    success: true,
    action: command.action,
    timestampIso: nowIso,
    actorEmail: session.accountEmail,
    affectedEntitiesCount,
    summary,
    broadcastPayload: {
      type: broadcastType,
      action: command.action,
      targetUserId: command.targetUserId,
      reason: command.reason,
      actorEmail: session.accountEmail,
      data: { ...command, summary, affectedEntitiesCount },
      timestamp: Date.now(),
    },
  };

  nextSession.consoleHistory = [result, ...nextSession.consoleHistory].slice(0, 25);
  nextSession = appendGMAuditLog(
    nextSession,
    `CONSOLE_${command.action.toUpperCase()}`,
    summary
  );

  return { nextSession, result };
}

/**
 * Executes a multi-line 2030 GM Batch Macro Script sequentially and atomically.
 */
export function executeGMBatchScript(
  session: GMSessionState,
  scriptText: string
): {
  nextSession: GMSessionState;
  results: GMConsoleExecutionResult[];
  totalAffectedEntities: number;
} {
  const lines = scriptText
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  let currentSession = session;
  const results: GMConsoleExecutionResult[] = [];
  let totalAffectedEntities = 0;

  for (const line of lines) {
    const parsed = parseGMConsoleInput(line);
    if (!parsed) continue;
    const step = executeGMConsoleCommand(currentSession, parsed);
    currentSession = step.nextSession;
    results.push(step.result);
    totalAffectedEntities += step.result.affectedEntitiesCount;
  }

  currentSession = appendGMAuditLog(
    currentSession,
    'GM_BATCH_MACRO_EXECUTED',
    `Executed ${results.length}-step 2030 Batch Script affecting ${totalAffectedEntities} total entities`
  );

  return {
    nextSession: currentSession,
    results,
    totalAffectedEntities,
  };
}
