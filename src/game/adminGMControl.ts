// Unified Supreme Administration, Game Master (GM), Moderator & Contact Engine
// Mirrors C++ shadowrealm_gm.hpp privileges (GMPriv::All) and binds root authority
// and official contact to: creatergame31@gmail.com

import { computeSHA256Hex } from './savePersistence';

export const SUPREME_ADMIN_EMAIL = 'creatergame31@gmail.com' as const;

export type AdminAuthorityRole =
  | 'Supreme Administrator'
  | 'Game Master (GM)'
  | 'Lead Moderator'
  | 'Realm Architect';

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
  All = 0x3ff,
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
  sessionTokenHex: string;
  canarySealHex: string;
  auditLog: GMAuditLogEntry[];
}

const GM_CANARY_SALT = 'SHADOWREALM_GM_CANARY_9E3779B97F4A7C15';

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
    title: 'Supreme Administrator • Grand Game Master (GM) • Lead Moderator',
    roles: [
      'Supreme Administrator',
      'Game Master (GM)',
      'Lead Moderator',
      'Realm Architect',
    ],
    privilegeMask: GMPriv.All,
    verifiedSignatureSha256,
    supportChannels: {
      directEmail: email,
      mailtoHref: `mailto:${email}?subject=${encodeURIComponent(
        '[ShadowRealm GM / Admin / Moderation Inquiry]'
      )}`,
      escalationSla: 'Priority Direct Dispatch — Root GM & Moderation Authority',
      realmJurisdiction: 'All Servers • 2D Tactical Overworld • 3D Voxel Realms • 50v50 Castle Sieges',
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
  const sessionTokenHex = computeSHA256Hex(`GM_TOKEN:${normalized}:v1.5.0`).slice(0, 24);
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
        ]
      : [],
    privMask: authorized ? GMPriv.All : GMPriv.None,
    godmode: false,
    infiniteMana: false,
    timeFrozen: false,
    timeScale: 1.0,
    sessionTokenHex,
    canarySealHex,
    auditLog: [
      {
        id: 'gm_init_1',
        timestampIso: new Date().toISOString(),
        actorEmail: SUPREME_ADMIN_EMAIL,
        role: 'Supreme Administrator / GM / Moderator',
        action: 'AUTH_SESSION_SEALED',
        details: `Root GMPriv::All (0x${GMPriv.All.toString(16).toUpperCase()}) granted to ${SUPREME_ADMIN_EMAIL}`,
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
    role: 'Admin / GM / Moderator',
    action,
    details,
  };
  return {
    ...session,
    auditLog: [entry, ...session.auditLog].slice(0, 25),
  };
}
