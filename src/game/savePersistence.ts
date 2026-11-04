// Schema-Versioned Local, JSON & WebSocket State Serialization with Pure SHA-256 Integrity Checksums

import { FourPathCultivationState, createInitialCultivationState } from './cultivationMath';
import { ArmyComposition } from './troopTraining';
import { ClanRank, FactionStanding, INITIAL_FACTION_MATRIX } from './clanMath';
import { WeatherType } from './weather';
import { SquadFormationType } from './worldAI';

export const SAVE_SCHEMA_VERSION = '1.5.0';
export const LOCAL_STORAGE_SAVE_KEY = 'shadowrealm_voxel_realms_save_v1_5_0';

export interface PersistentRealmSaveData {
  cultivation: FourPathCultivationState;
  castleLevel: number; // 0 .. 100
  vipLevel: number; // 0 .. 15
  loginStreakDays: number;
  clanRank: ClanRank;
  factions: FactionStanding[];
  army: ArmyComposition;
  activeFormation: SquadFormationType;
  activeWeather: WeatherType;
  lastDungeonSeed: number;
  completedQuestsCount: number;
}

export interface SignedSaveEnvelope {
  schemaVersion: string;
  savedAtIso: string;
  checksumSha256: string;
  payload: PersistentRealmSaveData;
}

// ============================================================================
// Deterministic Pure-TypeScript SHA-256 Implementation (RFC 6234)
// Works synchronously in Browser, WebWorkers, Node.js, and Unit Tests
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function computeSHA256Hex(input: string): string {
  // Encode UTF-8 bytes
  const utf8: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i);
    if (code < 0x80) {
      utf8.push(code);
    } else if (code < 0x800) {
      utf8.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      utf8.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const bitLen = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }

  // Append 64-bit big-endian bit length
  const hiLen = Math.floor(bitLen / 0x100000000);
  const loLen = bitLen >>> 0;
  utf8.push(
    (hiLen >>> 24) & 0xff,
    (hiLen >>> 16) & 0xff,
    (hiLen >>> 8) & 0xff,
    hiLen & 0xff,
    (loLen >>> 24) & 0xff,
    (loLen >>> 16) & 0xff,
    (loLen >>> 8) & 0xff,
    loLen & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < utf8.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((utf8[j] << 24) | (utf8[j + 1] << 16) | (utf8[j + 2] << 8) | utf8[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (
    toHex(h0) +
    toHex(h1) +
    toHex(h2) +
    toHex(h3) +
    toHex(h4) +
    toHex(h5) +
    toHex(h6) +
    toHex(h7)
  );
}

const INTEGRITY_SALT = 'SHADOWREALM_VOXEL_GUARDRAIL_SALT_v1.5.0';

/**
 * Canonicalizes a JSON value with deterministically sorted object keys so
 * SHA-256 hashing is invariant to key insertion order.
 */
export function canonicalizeJSON(value: any): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalizeJSON(item)).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalizeJSON(value[k])}`
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Creates a default initial PersistentRealmSaveData state
 */
export function createDefaultSaveData(): PersistentRealmSaveData {
  return {
    cultivation: createInitialCultivationState(),
    castleLevel: 50, // Era 5: Earth Immortal Sanctuary
    vipLevel: 7,
    loginStreakDays: 7,
    clanRank: 'core_elder',
    factions: INITIAL_FACTION_MATRIX.map((f) => ({ ...f, unlockedManuals: [...f.unlockedManuals] })),
    army: {
      shieldbearers: 150_000_000_000, // 150B
      shooters: 220_000_000_000, // 220B
      bombers: 130_000_000_000, // 130B (500 Billion total cohort)
      tier: 7,
    },
    activeFormation: 'shield_wall',
    activeWeather: 'thunderstorm',
    lastDungeonSeed: 888888,
    completedQuestsCount: 12,
  };
}

/**
 * Packages a save payload into a SHA-256 signed envelope
 */
export function serializeSaveEnvelope(payload: PersistentRealmSaveData): SignedSaveEnvelope {
  const canonical = canonicalizeJSON({
    schemaVersion: SAVE_SCHEMA_VERSION,
    payload,
    salt: INTEGRITY_SALT,
  });
  const checksumSha256 = computeSHA256Hex(canonical);
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAtIso: new Date().toISOString(),
    checksumSha256,
    payload,
  };
}

/**
 * Verifies a SignedSaveEnvelope against tampering
 */
export function verifySaveEnvelopeChecksum(envelope: SignedSaveEnvelope): {
  valid: boolean;
  expectedChecksum: string;
  actualChecksum: string;
  diagnostic: string;
} {
  if (!envelope || !envelope.payload || typeof envelope.checksumSha256 !== 'string') {
    return {
      valid: false,
      expectedChecksum: 'N/A',
      actualChecksum: 'MALFORMED',
      diagnostic: 'Rejected: Save envelope is missing payload or SHA-256 signature.',
    };
  }

  const canonical = canonicalizeJSON({
    schemaVersion: envelope.schemaVersion || SAVE_SCHEMA_VERSION,
    payload: envelope.payload,
    salt: INTEGRITY_SALT,
  });
  const expectedChecksum = computeSHA256Hex(canonical);
  const valid = expectedChecksum === envelope.checksumSha256;

  return {
    valid,
    expectedChecksum,
    actualChecksum: envelope.checksumSha256,
    diagnostic: valid
      ? `Integrity Verified (SHA-256: ${expectedChecksum.slice(0, 16)}…)`
      : `TAMPER DETECTED! Payload hash ${expectedChecksum.slice(0, 12)}… does not match signature ${envelope.checksumSha256.slice(0, 12)}…`,
  };
}

/**
 * Saves state to browser LocalStorage and returns the signed envelope
 */
export function saveToLocalVault(data: PersistentRealmSaveData): SignedSaveEnvelope {
  const envelope = serializeSaveEnvelope(data);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_SAVE_KEY, JSON.stringify(envelope));
    } catch {
      // Ignore quota errors
    }
  }
  return envelope;
}

/**
 * Loads and verifies state from browser LocalStorage
 */
export function loadFromLocalVault(): {
  data: PersistentRealmSaveData;
  envelope: SignedSaveEnvelope;
  verification: ReturnType<typeof verifySaveEnvelopeChecksum>;
  loadedFromStorage: boolean;
} {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SignedSaveEnvelope;
        const verification = verifySaveEnvelopeChecksum(parsed);
        if (verification.valid) {
          return {
            data: parsed.payload,
            envelope: parsed,
            verification,
            loadedFromStorage: true,
          };
        }
      }
    } catch {
      // Fallback to default on parse failure
    }
  }

  const defaultData = createDefaultSaveData();
  const envelope = serializeSaveEnvelope(defaultData);
  return {
    data: defaultData,
    envelope,
    verification: verifySaveEnvelopeChecksum(envelope),
    loadedFromStorage: false,
  };
}
