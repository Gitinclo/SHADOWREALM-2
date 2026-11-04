// User Management & Role-Based Access Control (RBAC) Module
// Maps 'creatergame31@gmail.com' to the root 'admin' role and manages UI administrative unlocking.

import { SUPREME_ADMIN_EMAIL, AdminAuthorityRole } from './adminGMControl';

export type UserRole = 'admin' | 'moderator' | 'player';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  authorityRoles: AdminAuthorityRole[];
  isSignedIn: boolean;
  permissions: string[];
  signedInAtIso: string;
}

/**
 * Canonical role registry mapping user emails to their system role.
 * Explicitly maps 'creatergame31@gmail.com' to 'admin'.
 */
export const USER_ROLE_REGISTRY: Readonly<Record<string, UserRole>> = {
  'creatergame31@gmail.com': 'admin',
};

const ADMIN_PERMISSIONS: string[] = [
  'gm.console.execute',
  'gm.spawn_item',
  'gm.spawn_multiple_items',
  'gm.teleport_player',
  'gm.teleport_all_players',
  'gm.set_cultivation_realm',
  'gm.kick_player',
  'gm.ban_player',
  'gm.server_telemetry.view',
  'gm.broadcast_decree',
  'gm.godmode',
];

const PLAYER_PERMISSIONS: string[] = [
  'game.play',
  'party.ping',
  'save.export',
];

const AUTH_STORAGE_KEY = 'shadowrealm_authenticated_user_v1';

let currentSignedInUser: AuthenticatedUser = createUserProfile(SUPREME_ADMIN_EMAIL, true);

/**
 * Resolves the role for a given email address.
 * Maps 'creatergame31@gmail.com' to 'admin'.
 */
export function getUserRoleByEmail(email: string): UserRole {
  const normalized = (email || '').trim().toLowerCase();
  return USER_ROLE_REGISTRY[normalized] ?? 'player';
}

/**
 * Checks whether a user object or email has the 'admin' role.
 */
export function isUserAdmin(userOrEmail?: AuthenticatedUser | string | null): boolean {
  if (!userOrEmail) return false;
  if (typeof userOrEmail === 'string') {
    return getUserRoleByEmail(userOrEmail) === 'admin';
  }
  return (
    userOrEmail.isSignedIn &&
    userOrEmail.role === 'admin' &&
    getUserRoleByEmail(userOrEmail.email) === 'admin'
  );
}

/**
 * Builds an AuthenticatedUser profile from an email address.
 */
export function createUserProfile(
  email: string,
  isSignedIn: boolean = true
): AuthenticatedUser {
  const normalized = (email || '').trim().toLowerCase();
  const role = getUserRoleByEmail(normalized);
  const isAdmin = role === 'admin';

  return {
    id: isAdmin ? 'admin_root_creatergame31' : `user_${normalized.replace(/[^a-z0-9]/g, '_') || 'guest'}`,
    email: isAdmin ? SUPREME_ADMIN_EMAIL : normalized || 'wanderer@shadowrealm.io',
    displayName: isAdmin ? 'CreatorGame31 (Supreme Admin)' : normalized.split('@')[0] || 'Immortal Wanderer',
    role,
    authorityRoles: isAdmin
      ? [
          'Supreme Administrator',
          'Game Master (GM)',
          'Lead Moderator',
          'Realm Architect',
        ]
      : [],
    isSignedIn,
    permissions: isAdmin ? [...ADMIN_PERMISSIONS] : [...PLAYER_PERMISSIONS],
    signedInAtIso: new Date().toISOString(),
  };
}

/**
 * Signs in a user by email and persists session state to localStorage if available.
 */
export function signInUser(email: string): AuthenticatedUser {
  currentSignedInUser = createUserProfile(email, true);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentSignedInUser));
    } catch {
      // Ignore storage quota errors
    }
  }
  return currentSignedInUser;
}

/**
 * Signs out the current user.
 */
export function signOutUser(): AuthenticatedUser {
  currentSignedInUser = {
    ...currentSignedInUser,
    isSignedIn: false,
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  return currentSignedInUser;
}

/**
 * Retrieves the currently signed-in user.
 * Defaults to 'creatergame31@gmail.com' (Supreme Admin) so the authenticated owner session is active.
 */
export function getCurrentSignedInUser(): AuthenticatedUser {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthenticatedUser;
        if (parsed && parsed.email) {
          currentSignedInUser = createUserProfile(parsed.email, parsed.isSignedIn !== false);
          return currentSignedInUser;
        }
      }
    } catch {
      // Fall back to default admin session
    }
  }
  return currentSignedInUser;
}

/**
 * Unlocks or locks administrative controls in the DOM depending on whether
 * the signed-in user is 'creatergame31@gmail.com' with the 'admin' role.
 */
export function applyAdminUIUnlockState(user: AuthenticatedUser): boolean {
  const unlocked = isUserAdmin(user);
  if (typeof document === 'undefined') return unlocked;

  const gmElements = document.querySelectorAll<HTMLElement>('[data-command-tab="gm_admin"]');
  gmElements.forEach((el) => {
    if (unlocked) {
      el.style.display = '';
      el.removeAttribute('disabled');
      el.setAttribute('data-admin-unlocked', 'true');
      el.title = `Unlocked for Admin: ${user.email}`;
    } else {
      el.style.display = 'none';
      el.setAttribute('disabled', 'true');
      el.setAttribute('data-admin-unlocked', 'false');
      el.title = 'Restricted to Supreme Administrator (creatergame31@gmail.com)';
    }
  });

  const adminStatusBadge = document.getElementById('hud-admin-auth-badge');
  if (adminStatusBadge) {
    adminStatusBadge.textContent = unlocked
      ? `🔓 ADMIN UNLOCKED (${user.email})`
      : `🔒 PLAYER MODE (${user.email})`;
    adminStatusBadge.style.color = unlocked ? '#10b981' : '#94a3b8';
  }

  return unlocked;
}
