// Unified Xianxia HUD Command Center & 5-Pillar Interactive Controller
// Bridges the 2D Phaser Tactical Scene, 3D Three.js Voxel/Delve Viewport,
// Decoupled Pure TypeScript Gameplay Modules, and 3-Tier SHA-256 Persistence.

import {
  CULTIVATION_REALMS,
  CultivationPath,
  calculateRealmSuppression,
  calculateFourPathResonance,
  calculateLineageCultivationBuff,
  calculateBreakthroughOdds,
  evaluateKarmaState,
  getRequiredEssenceForLayer,
} from '../game/cultivationMath';
import {
  calculateTrillionScaleArmyPower,
  calculateDiminishingArmorMitigation,
  evaluateEconomyInflationSink,
  runMonteCarloCombatSimulation,
  getCastleEraMultiplier,
  formatLargeNumber,
} from '../game/math';
import {
  generateProceduralDungeon,
  DungeonTheme,
  GeneratedDungeon,
} from '../game/dungeons';
import {
  SQUAD_FORMATIONS,
  SquadFormationType,
  computeSquadFormationSlots,
  planNPCActionsGOAP,
  evaluateDynamicThreatTable,
  getMonsterBracketForLevel,
} from '../game/worldAI';
import {
  XIANXIA_DIALOGUE_GRAPH,
  resolveDialogueNode,
  generateRadiantQuestForNPC,
  RadiantQuest,
  NPCRole,
} from '../game/dialogueEngine';
import {
  createInitialSiegeSnapshot,
  stepSiegeSimulationTick,
  encodeSiegeDeltaPacket,
  reconcileClientPrediction,
  SiegeWorldSnapshot,
  SiegeDeltaPacket,
} from '../game/siegeNetcode';
import {
  PersistentRealmSaveData,
  SignedSaveEnvelope,
  loadFromLocalVault,
  saveToLocalVault,
  serializeSaveEnvelope,
  verifySaveEnvelopeChecksum,
} from '../game/savePersistence';
import { WEATHER_CATALOG, WeatherType } from '../game/weather';
import { getVIPBenefitProfile, getCyclicalLoginMultiplier } from '../game/vipSubscription';
import { evaluateFactionStanding } from '../game/clanMath';
import { VoxelRealms3DViewport } from '../game/proceduralWorld';
import { runAllArchitecturalGuardrailTests } from '../game/dungeons.test';
import {
  SUPREME_ADMIN_EMAIL,
  GMSessionState,
  getSupremeAdminContactProfile,
  createAdminGMSession,
  verifyGMSessionIntegrity,
  appendGMAuditLog,
} from '../game/adminGMControl';

export interface VoxelHUDCallbacks {
  onTriggerWorldPing?: (x: number, y: number, type: 'move' | 'attack' | 'defend' | 'danger', label?: string) => void;
  onBroadcastNetworkMessage?: (type: 'siege_delta' | 'save_sync' | 'gm_broadcast', data: any) => void;
  onGMAction?: (action: {
    type: 'godmode' | 'teleport' | 'smite_enemies' | 'heal_full' | 'time_scale';
    value?: any;
  }) => void;
}

export class VoxelRealmsHUD {
  private static instance: VoxelRealmsHUD | null = null;

  public static getInstance(callbacks?: VoxelHUDCallbacks): VoxelRealmsHUD {
    if (!VoxelRealmsHUD.instance) {
      VoxelRealmsHUD.instance = new VoxelRealmsHUD(callbacks || {});
    } else if (callbacks) {
      VoxelRealmsHUD.instance.setCallbacks(callbacks);
    }
    return VoxelRealmsHUD.instance;
  }

  private state: PersistentRealmSaveData;
  private lastSaveEnvelope: SignedSaveEnvelope;
  private currentDungeon: GeneratedDungeon;
  private currentDialogueNodeId: string = 'elder_greeting';
  private activeQuests: RadiantQuest[] = [];
  private siegeBaseline: SiegeWorldSnapshot;
  private siegeCurrent: SiegeWorldSnapshot;
  private lastSiegeDelta: SiegeDeltaPacket;
  private activeModalTab: string | null = null;
  private viewport3D: VoxelRealms3DViewport | null = null;
  private viewportMode: '2d_tactical' | '3d_voxel_citadel' | '3d_dungeon_delve' = '2d_tactical';
  private callbacks: VoxelHUDCallbacks;
  private gmSession: GMSessionState;
  private copyStatusText: string = '';

  // Interactive calculator & simulator UI state
  private calcAttackerRealm: number = 2; // Golden Core
  private calcDefenderRealm: number = 0; // Qi Refinement
  private tamperTestDiagnostic: string | null = null;

  constructor(callbacks: VoxelHUDCallbacks = {}) {
    this.callbacks = callbacks;
    this.gmSession = createAdminGMSession(SUPREME_ADMIN_EMAIL);
    const loaded = loadFromLocalVault();
    this.state = loaded.data;
    this.lastSaveEnvelope = loaded.envelope;

    this.currentDungeon = generateProceduralDungeon({
      seed: this.state.lastDungeonSeed || 888888,
      theme: 'dao_grotto',
      floorLevel: 25,
    });

    this.siegeBaseline = createInitialSiegeSnapshot(Math.floor(this.state.castleLevel / 10));
    this.siegeCurrent = stepSiegeSimulationTick(this.siegeBaseline, 0.05, this.state.activeFormation);
    this.lastSiegeDelta = encodeSiegeDeltaPacket(this.siegeBaseline, this.siegeCurrent);

    this.activeQuests = [
      generateRadiantQuestForNPC('marshal', Math.floor(this.state.castleLevel / 10), 2, 1024),
      generateRadiantQuestForNPC('mystic', Math.floor(this.state.castleLevel / 10), 2, 2048),
    ];

    this.mountDOM();
    this.refreshTopPlaque();
  }

  public setCallbacks(callbacks: VoxelHUDCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public applyRemoteSaveEnvelope(envelope: SignedSaveEnvelope) {
    const check = verifySaveEnvelopeChecksum(envelope);
    if (check.valid) {
      this.state = envelope.payload;
      this.lastSaveEnvelope = envelope;
      this.refreshTopPlaque();
      if (this.activeModalTab) this.renderModalContent();
    }
  }

  public applyRemoteSiegeDelta(delta: SiegeDeltaPacket) {
    if (!delta || !delta.deltas) return;
    this.lastSiegeDelta = delta;
    if (this.activeModalTab === 'siege') {
      this.renderModalContent();
    }
  }

  private persistState(broadcastToServer: boolean = false) {
    this.lastSaveEnvelope = saveToLocalVault(this.state);
    this.refreshTopPlaque();
    if (broadcastToServer && this.callbacks.onBroadcastNetworkMessage) {
      this.callbacks.onBroadcastNetworkMessage('save_sync', this.lastSaveEnvelope);
    }
  }

  private mountDOM() {
    const container3D = document.getElementById('voxel-3d-viewport');
    if (container3D) {
      this.viewport3D = new VoxelRealms3DViewport(container3D);
    }

    // Bind bottom command dock buttons and top-left GM/Admin plaque badge
    document.querySelectorAll<HTMLElement>('[data-command-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-command-tab');
        if (!tab) return;
        this.toggleModalTab(tab);
      });
    });

    // Bind viewport switcher buttons
    document.querySelectorAll<HTMLButtonElement>('[data-viewport-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-viewport-mode') as
          | '2d_tactical'
          | '3d_voxel_citadel'
          | '3d_dungeon_delve';
        if (mode) this.setViewportMode(mode);
      });
    });

    // Global hotkeys 5, 6, 7, 8, 9 or Tab/V for quick access without interfering with Phaser Q/W/E/R
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape' && this.activeModalTab) {
        this.closeModal();
      } else if (e.key === 'v' || e.key === 'V') {
        const nextMode =
          this.viewportMode === '2d_tactical'
            ? '3d_voxel_citadel'
            : this.viewportMode === '3d_voxel_citadel'
            ? '3d_dungeon_delve'
            : '2d_tactical';
        this.setViewportMode(nextMode);
      }
    });
  }

  public setViewportMode(mode: '2d_tactical' | '3d_voxel_citadel' | '3d_dungeon_delve') {
    this.viewportMode = mode;
    document.querySelectorAll<HTMLButtonElement>('[data-viewport-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-viewport-mode') === mode);
    });

    const bannerEl = document.getElementById('viewport-mode-banner');
    if (!this.viewport3D) return;

    if (mode === '2d_tactical') {
      this.viewport3D.setVisible(false);
      if (bannerEl) bannerEl.style.display = 'none';
    } else if (mode === '3d_voxel_citadel') {
      this.viewport3D.renderVoxelCitadelWorld({
        citadelLevel: this.state.castleLevel,
        weather: this.state.activeWeather,
        seed: 2026,
      });
      this.viewport3D.setVisible(true);
      if (bannerEl) {
        bannerEl.style.display = 'flex';
        bannerEl.innerHTML = `<span>🏯 <strong>3D Voxel Realms Overworld</strong> • Era ${Math.floor(this.state.castleLevel / 10)} Citadel • Weather: ${WEATHER_CATALOG[this.state.activeWeather].label}</span><span style="color:#94a3b8;font-size:11px;">Drag to Orbit • Scroll to Zoom • Press [V] to Switch</span>`;
      }
    } else {
      this.viewport3D.renderProceduralDungeonDelve(this.currentDungeon);
      this.viewport3D.setVisible(true);
      if (bannerEl) {
        bannerEl.style.display = 'flex';
        bannerEl.innerHTML = `<span>🌀 <strong>3D Procedural Delve: ${this.currentDungeon.themeTitle}</strong> • Seed #${this.currentDungeon.seed} • A* Path: ${this.currentDungeon.astarPathToBoss.length} steps</span><span style="color:#94a3b8;font-size:11px;">Drag to Orbit • Scroll to Zoom • Press [V] to Switch</span>`;
      }
    }
  }

  public toggleModalTab(tab: string) {
    if (this.activeModalTab === tab) {
      this.closeModal();
      return;
    }
    this.activeModalTab = tab;
    const modalBackdrop = document.getElementById('xianxia-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'flex';
    }
    document.querySelectorAll<HTMLButtonElement>('[data-command-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-command-tab') === tab);
    });
    this.renderModalContent();
  }

  public closeModal() {
    this.activeModalTab = null;
    const modalBackdrop = document.getElementById('xianxia-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'none';
    }
    document.querySelectorAll<HTMLButtonElement>('[data-command-tab]').forEach((btn) => {
      btn.classList.remove('active');
    });
  }

  public refreshTopPlaque() {
    const cult = this.state.cultivation;
    const resonance = calculateFourPathResonance(cult.paths);
    const qiPath = cult.paths.qi;
    const realmDef = CULTIVATION_REALMS[qiPath.realmIndex] || CULTIVATION_REALMS[0];
    const powerInfo = calculateTrillionScaleArmyPower({
      army: this.state.army,
      castleLevel: this.state.castleLevel,
      heroRarity: 'chaos_mythic',
      researchLevel: 65,
      commanderRealmIndex: resonance.dominantRealmIndex,
    });

    const realmBadgeEl = document.getElementById('hud-cultivator-realm');
    const karmaBadgeEl = document.getElementById('hud-cultivator-karma');
    const powerBadgeEl = document.getElementById('hud-army-power');
    const stonesBadgeEl = document.getElementById('hud-spirit-stones');
    const resonanceBadgeEl = document.getElementById('hud-four-path-summary');

    if (realmBadgeEl) {
      realmBadgeEl.textContent = `${realmDef.name} (${realmDef.chineseTitle}) • Layer ${qiPath.layer}`;
    }
    if (karmaBadgeEl) {
      const k = cult.karma;
      const label =
        k.alignment === 'green_righteous'
          ? `🟢 Righteous (+${k.score})`
          : k.alignment === 'red_blood_fiend'
          ? `🔴 Blood-Fiend (${k.score})`
          : `⚪ Neutral (${k.score})`;
      karmaBadgeEl.textContent = label;
      karmaBadgeEl.style.color =
        k.alignment === 'green_righteous'
          ? '#10b981'
          : k.alignment === 'red_blood_fiend'
          ? '#ef4444'
          : '#e2e8f0';
    }
    if (powerBadgeEl) {
      powerBadgeEl.textContent = `⚔️ Power: ${powerInfo.formattedPower}`;
    }
    if (stonesBadgeEl) {
      stonesBadgeEl.textContent = `💎 ${formatLargeNumber(cult.spiritStones)} Stones`;
    }
    if (resonanceBadgeEl) {
      resonanceBadgeEl.textContent = `Qi R${cult.paths.qi.realmIndex} • Body R${cult.paths.body.realmIndex} • Soul R${cult.paths.soul.realmIndex} • Mind R${cult.paths.mind.realmIndex} (${resonance.resonanceMultiplier}x)`;
    }
  }

  private renderModalContent() {
    const contentEl = document.getElementById('xianxia-modal-body');
    const titleEl = document.getElementById('xianxia-modal-title');
    if (!contentEl || !titleEl) return;

    switch (this.activeModalTab) {
      case 'cultivation':
        titleEl.innerHTML = '☯️ Pillar 1 & 4: Four-Path Immortal Cultivation & 10<sup>ΔRealm</sup> Suppression';
        contentEl.innerHTML = this.buildCultivationTabHTML();
        this.bindCultivationEvents(contentEl);
        break;
      case 'dungeon':
        titleEl.innerHTML = '🌀 Pillar 2: Procedural Delve Engine (BSP + WFC Dungeons & Eroded Biomes)';
        contentEl.innerHTML = this.buildDungeonTabHTML();
        this.bindDungeonEvents(contentEl);
        break;
      case 'siege':
        titleEl.innerHTML = '🏯 Pillar 1 & 3: 50v50 Siege Delta-Sync, Squad Formations & GOAP AI';
        contentEl.innerHTML = this.buildSiegeAndAITabHTML();
        this.bindSiegeAndAIEvents(contentEl);
        break;
      case 'dialogue':
        titleEl.innerHTML = '📜 Pillar 4: Branching Xianxia Dialogue, Karma & Faction Reputation Matrix';
        contentEl.innerHTML = this.buildDialogueAndLoreTabHTML();
        this.bindDialogueAndLoreEvents(contentEl);
        break;
      case 'vault':
        titleEl.innerHTML = '🛡️ Pillar 1 & 5: SHA-256 Save Vault, Monte Carlo Sim & C++20 Guardrail Tests';
        contentEl.innerHTML = this.buildVaultAndTestsTabHTML();
        this.bindVaultAndTestsEvents(contentEl);
        break;
      case 'gm_admin':
        titleEl.innerHTML = `👑 Supreme Administration, GM, Moderator & Contact Console — ${SUPREME_ADMIN_EMAIL}`;
        contentEl.innerHTML = this.buildGMAdminTabHTML();
        this.bindGMAdminEvents(contentEl);
        break;
    }
  }

  // ==========================================================================
  // TAB 1: Four-Path Cultivation & Realm Suppression (10^DeltaRealm)
  // ==========================================================================
  private buildCultivationTabHTML(): string {
    const cult = this.state.cultivation;
    const resonance = calculateFourPathResonance(cult.paths);
    const lineageBuff = calculateLineageCultivationBuff(cult.lineage);
    const suppressionMult = calculateRealmSuppression(this.calcAttackerRealm, this.calcDefenderRealm);
    const inverseMult = calculateRealmSuppression(this.calcDefenderRealm, this.calcAttackerRealm);

    const pathCards = (['qi', 'body', 'soul', 'mind'] as CultivationPath[])
      .map((pathKey) => {
        const p = cult.paths[pathKey];
        const rDef = CULTIVATION_REALMS[p.realmIndex] || CULTIVATION_REALMS[0];
        const odds = calculateBreakthroughOdds(cult, pathKey);
        const titles: Record<CultivationPath, string> = {
          qi: '🌬️ Qi Path (靈氣道)',
          body: '🩸 Body Path (煉體道)',
          soul: '👁️ Soul Path (元神道)',
          mind: '✨ Mind Path (心境道)',
        };
        return `
          <div class="sr-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#f8fafc;font-size:14px;">${titles[pathKey]}</strong>
              <span class="sr-tagGold">Realm #${p.realmIndex} • Layer ${p.layer}/9</span>
            </div>
            <div style="margin:6px 0;color:#fbbf24;font-weight:bold;font-size:13px;">
              ${rDef.name} (${rDef.chineseTitle}) — <span style="color:#94a3b8;font-weight:normal;">${rDef.epoch}</span>
            </div>
            <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;font-variant-numeric:tabular-nums;">
              Essence: ${formatLargeNumber(p.currentEssence)} / ${formatLargeNumber(p.requiredEssence)} • Lifespan: ${formatLargeNumber(rDef.baseLifespanYears)} yrs
            </div>
            <div style="display:flex;gap:6px;">
              <button class="sr-btn sr-btnCyan" data-breakthrough-path="${pathKey}">
                ⚡ Break Through (${Math.round(odds.successProbability * 100)}% • ${odds.lightningBolts} Bolts)
              </button>
              <button class="sr-btn" data-promote-realm="${pathKey}" title="Advance 1 full Major Realm for testing">
                +1 Major Realm
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    const realmOptionsAtt = CULTIVATION_REALMS.map(
      (r) =>
        `<option value="${r.index}" ${r.index === this.calcAttackerRealm ? 'selected' : ''}>Realm ${r.index}: ${r.name} (${r.chineseTitle})</option>`
    ).join('');
    const realmOptionsDef = CULTIVATION_REALMS.map(
      (r) =>
        `<option value="${r.index}" ${r.index === this.calcDefenderRealm ? 'selected' : ''}>Realm ${r.index}: ${r.name} (${r.chineseTitle})</option>`
    ).join('');

    return `
      <div class="sr-grid2">
        <div>
          <h4 class="sr-sectionTitle">Four-Path Immortal Vessel (23 Realms × 9 Layers)</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${pathCards}
          </div>
          <div class="sr-card" style="margin-top:10px;border-color:rgba(6,182,212,0.4);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#06b6d4;">Harmony Status: ${resonance.resonanceTitle}</strong>
              <span class="sr-tagCyan">Resonance Multiplier: ${resonance.resonanceMultiplier.toFixed(2)}x</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:4px;">
              Master-Disciple Lineage: <strong>${cult.lineage.masterName}</strong> • Proximity Buff: <strong style="color:#10b981;">${lineageBuff.cultivationSpeedMultiplier}x Speed</strong> • Spirit Tax: <strong>${Math.round(lineageBuff.netTaxRate * 100)}%</strong> • Scrolls: <em>${cult.lineage.transmittedScrolls.join(', ')}</em>
            </p>
          </div>
        </div>

        <div>
          <h4 class="sr-sectionTitle">Exponential Realm Suppression Verifier (10<sup>ΔRealm</sup>)</h4>
          <div class="sr-card" style="border-color:rgba(245,158,11,0.45);">
            <p style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">
              Backed by TypeScript & C++20 <code>static_assert(GoldenCore vs QiRefinement == 100.0)</code>.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Attacker Realm</label>
                <select id="calc-att-realm" class="sr-select">${realmOptionsAtt}</select>
              </div>
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Defender Realm</label>
                <select id="calc-def-realm" class="sr-select">${realmOptionsDef}</select>
              </div>
            </div>
            <div style="background:rgba(8,10,16,0.85);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:10px;font-variant-numeric:tabular-nums;">
              <div style="font-size:13px;color:#f8fafc;">
                ΔRealm = <strong>${this.calcAttackerRealm - this.calcDefenderRealm}</strong> &rarr;
                Damage Multiplier = <strong style="color:#fbbf24;font-size:16px;">${suppressionMult >= 10000 ? suppressionMult.toExponential(2) : suppressionMult}x</strong>
              </div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">
                Defender Counter-Damage Taken Multiplier: <strong style="color:#06b6d4;">${inverseMult < 0.0001 ? inverseMult.toExponential(2) : inverseMult}x</strong>
              </div>
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:12px;">The Karma & Heavenly Tribulation System</h4>
          <div class="sr-card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span>Karma Score: <strong style="font-variant-numeric:tabular-nums;">${cult.karma.score}</strong> (${cult.karma.alignment.replace(/_/g, ' ').toUpperCase()})</span>
              <span class="sr-tagGold">Drop Risk: ${cult.karma.equippedDropRiskPercent}%</span>
            </div>
            <div style="font-size:12px;color:#cbd5e1;margin:8px 0;">
              ${
                cult.karma.stationaryTribulationIntervalSec
                  ? `⚠️ <strong style="color:#ef4444;">RED-NAME PENALTY ACTIVE:</strong> Stationary Heavenly Tribulation strikes every ${cult.karma.stationaryTribulationIntervalSec}s • Bounty: ${formatLargeNumber(cult.karma.bountySpiritStones)} Spirit Stones!`
                  : `✅ Orthodox Aura Protected: No stationary Tribulation Lightning penalty.`
              }
            </div>
            <div style="display:flex;gap:8px;">
              <button class="sr-btn sr-btnGreen" id="btn-karma-righteous">+150 Righteous Deed</button>
              <button class="sr-btn sr-btnCrimson" id="btn-karma-pk">-300 Unprovoked PK (Trigger Red-Name)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindCultivationEvents(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('[data-breakthrough-path]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pathKey = btn.getAttribute('data-breakthrough-path') as CultivationPath;
        const p = this.state.cultivation.paths[pathKey];
        if (!p) return;
        if (p.layer < 9) {
          p.layer++;
        } else if (p.realmIndex < 22) {
          p.realmIndex++;
          p.layer = 1;
        }
        p.requiredEssence = getRequiredEssenceForLayer(p.realmIndex, p.layer);
        p.currentEssence = p.requiredEssence;
        this.persistState(true);
        this.renderModalContent();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-promote-realm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pathKey = btn.getAttribute('data-promote-realm') as CultivationPath;
        const p = this.state.cultivation.paths[pathKey];
        if (!p || p.realmIndex >= 22) return;
        p.realmIndex++;
        p.requiredEssence = getRequiredEssenceForLayer(p.realmIndex, p.layer);
        p.currentEssence = p.requiredEssence;
        this.persistState(true);
        this.renderModalContent();
      });
    });

    const attSel = root.querySelector<HTMLSelectElement>('#calc-att-realm');
    const defSel = root.querySelector<HTMLSelectElement>('#calc-def-realm');
    attSel?.addEventListener('change', () => {
      this.calcAttackerRealm = Number(attSel.value);
      this.renderModalContent();
    });
    defSel?.addEventListener('change', () => {
      this.calcDefenderRealm = Number(defSel.value);
      this.renderModalContent();
    });

    root.querySelector('#btn-karma-righteous')?.addEventListener('click', () => {
      const k = this.state.cultivation.karma;
      this.state.cultivation.karma = evaluateKarmaState(
        k.score + 150,
        k.unprovokedKills,
        k.righteousDeeds + 1
      );
      this.persistState(true);
      this.renderModalContent();
    });

    root.querySelector('#btn-karma-pk')?.addEventListener('click', () => {
      const k = this.state.cultivation.karma;
      this.state.cultivation.karma = evaluateKarmaState(
        k.score - 300,
        k.unprovokedKills + 1,
        k.righteousDeeds
      );
      this.persistState(true);
      this.renderModalContent();
    });
  }

  // ==========================================================================
  // TAB 2: Procedural Delve Engine (BSP + WFC Dungeons & 3D Voxel Switcher)
  // ==========================================================================
  private buildDungeonTabHTML(): string {
    const d = this.currentDungeon;
    const roomListHTML = d.rooms
      .map(
        (r) => `
        <div style="display:flex;justify-content:space-between;padding:5px 8px;background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.18);border-radius:4px;font-size:11px;">
          <span><strong>${r.name}</strong> (${r.width}×${r.height}m • Z:${r.zElevation}m)</span>
          <span style="color:#fbbf24;">Bracket ${r.monsterBracket} • Lv.${r.monsterLevel}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="sr-grid2">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h4 class="sr-sectionTitle" style="margin:0;">BSP + WFC Dungeon Blueprint (${d.width}×${d.height})</h4>
            <span class="sr-tagCyan">${d.isSolvable ? `✓ A* Solvable (${d.astarPathToBoss.length} steps)` : 'Unreachable'}</span>
          </div>
          <div class="sr-card" style="display:flex;flex-direction:column;align-items:center;">
            <canvas id="dungeon-blueprint-canvas" width="380" height="280" style="border:1px solid rgba(6,182,212,0.35);border-radius:4px;background:#05070c;"></canvas>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:#cbd5e1;">
              <span>🟢 Entrance Shrine</span>
              <span>🔵 A* Verified Boss Path</span>
              <span>🟣 WFC Spirit Array</span>
              <span>🟡 Treasure</span>
              <span>🔴 Apex Boss Altar</span>
            </div>
          </div>
        </div>

        <div>
          <h4 class="sr-sectionTitle">Generator Controls & 3D Delve Immersion</h4>
          <div class="sr-card">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Realm Theme</label>
                <select id="dungeon-theme-select" class="sr-select">
                  <option value="dao_grotto" ${d.theme === 'dao_grotto' ? 'selected' : ''}>Ancient Dao Grotto (古道洞天)</option>
                  <option value="secret_realm" ${d.theme === 'secret_realm' ? 'selected' : ''}>Nine-Nether Secret Realm (九幽秘境)</option>
                  <option value="tribulation_chamber" ${d.theme === 'tribulation_chamber' ? 'selected' : ''}>Heavenly Tribulation Chamber (天劫雷池)</option>
                </select>
              </div>
              <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:3px;">Deterministic Seed</label>
                <input id="dungeon-seed-input" type="number" class="sr-input" value="${d.seed}" />
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="sr-btn sr-btnCyan" id="btn-regen-dungeon">🎲 Synthesize New BSP+WFC Delve</button>
              <button class="sr-btn sr-btnGold" id="btn-launch-3d-delve">🌀 Enter 3D WebGL Dungeon Viewport</button>
              <button class="sr-btn" id="btn-ping-dungeon-boss">🎯 Ping Boss Sanctum on Radar</button>
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:12px;">Carved BSP Rooms & WFCCollapsed Cells (${d.wfcCollapsedCells})</h4>
          <div style="display:flex;flex-direction:column;gap:5px;max-height:175px;overflow-y:auto;">
            ${roomListHTML}
          </div>

          <div class="sr-card" style="margin-top:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;">Overworld Weather & Citadel Level (Lv.${this.state.castleLevel})</span>
              <select id="overworld-weather-select" class="sr-select" style="width:auto;">
                ${Object.values(WEATHER_CATALOG)
                  .map(
                    (w) =>
                      `<option value="${w.type}" ${w.type === this.state.activeWeather ? 'selected' : ''}>${w.label}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindDungeonEvents(root: HTMLElement) {
    this.drawDungeonBlueprintCanvas(root.querySelector<HTMLCanvasElement>('#dungeon-blueprint-canvas'));

    root.querySelector('#btn-regen-dungeon')?.addEventListener('click', () => {
      const themeSel = root.querySelector<HTMLSelectElement>('#dungeon-theme-select');
      const theme = (themeSel?.value || 'dao_grotto') as DungeonTheme;
      const newSeed = Math.floor(100000 + Math.random() * 899999);
      this.state.lastDungeonSeed = newSeed;
      this.currentDungeon = generateProceduralDungeon({
        seed: newSeed,
        theme,
        floorLevel: Math.max(10, this.state.castleLevel),
      });
      this.persistState(false);
      if (this.viewportMode === '3d_dungeon_delve') {
        this.setViewportMode('3d_dungeon_delve');
      }
      this.renderModalContent();
    });

    root.querySelector('#dungeon-theme-select')?.addEventListener('change', (e) => {
      const theme = (e.target as HTMLSelectElement).value as DungeonTheme;
      const seedInput = root.querySelector<HTMLInputElement>('#dungeon-seed-input');
      const seed = Number(seedInput?.value || this.currentDungeon.seed);
      this.currentDungeon = generateProceduralDungeon({
        seed,
        theme,
        floorLevel: Math.max(10, this.state.castleLevel),
      });
      if (this.viewportMode === '3d_dungeon_delve') {
        this.setViewportMode('3d_dungeon_delve');
      }
      this.renderModalContent();
    });

    root.querySelector('#btn-launch-3d-delve')?.addEventListener('click', () => {
      this.setViewportMode('3d_dungeon_delve');
      this.closeModal();
    });

    root.querySelector('#btn-ping-dungeon-boss')?.addEventListener('click', () => {
      const wx = Math.round((this.currentDungeon.bossAltar.x / this.currentDungeon.width) * 2400);
      const wy = Math.round((this.currentDungeon.bossAltar.y / this.currentDungeon.height) * 1350);
      this.callbacks.onTriggerWorldPing?.(wx, wy, 'attack', this.currentDungeon.themeTitle);
      this.closeModal();
    });

    root.querySelector('#overworld-weather-select')?.addEventListener('change', (e) => {
      this.state.activeWeather = (e.target as HTMLSelectElement).value as WeatherType;
      this.persistState(true);
      if (this.viewportMode === '3d_voxel_citadel') {
        this.setViewportMode('3d_voxel_citadel');
      }
      this.renderModalContent();
    });
  }

  private drawDungeonBlueprintCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const d = this.currentDungeon;
    const cw = canvas.width / d.width;
    const ch = canvas.height / d.height;

    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < d.height; y++) {
      for (let x = 0; x < d.width; x++) {
        const t = d.tiles[y][x];
        if (t === 'void_wall') continue;
        if (t === 'stone_floor') ctx.fillStyle = '#1e293b';
        else if (t === 'corridor_tile') ctx.fillStyle = '#334155';
        else if (t === 'spirit_array') ctx.fillStyle = '#7c3aed';
        else if (t === 'jade_bridge') ctx.fillStyle = '#0d9488';
        else if (t === 'treasure_chest') ctx.fillStyle = '#f59e0b';
        else ctx.fillStyle = '#1e293b';

        ctx.fillRect(x * cw, y * ch, Math.ceil(cw - 0.5), Math.ceil(ch - 0.5));
      }
    }

    // Draw A* solvable path
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    d.astarPathToBoss.forEach((pt, idx) => {
      const px = (pt.x + 0.5) * cw;
      const py = (pt.y + 0.5) * ch;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Entrance & Boss markers
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc((d.entrance.x + 0.5) * cw, (d.entrance.y + 0.5) * ch, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc((d.bossAltar.x + 0.5) * cw, (d.bossAltar.y + 0.5) * ch, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ==========================================================================
  // TAB 3: 50v50 Siege Sync, Squad Formations, GOAP & Threat Table
  // ==========================================================================
  private buildSiegeAndAITabHTML(): string {
    const delta = this.lastSiegeDelta;
    const formSpec = SQUAD_FORMATIONS[this.state.activeFormation];
    const goapPlan = planNPCActionsGOAP({}, { treasurySupplied: true });
    const reconciliation = reconcileClientPrediction({
      predictedX: 242.4,
      predictedY: 180.0,
      authoritativeX: 239.8,
      authoritativeY: 180.0,
      unacknowledgedInputs: [{ dx: 12, dy: 0, dt: 0.15 }],
    });

    const threatEntries = evaluateDynamicThreatTable([
      {
        entityId: ' vanguard_shield',
        name: 'Iron Xuanwu Shieldbearer Cohort',
        role: 'shieldbearer_tank',
        damageDealt: 18_500,
        healingDone: 0,
        activeTauntStacks: 3,
        distanceMeters: 6,
      },
      {
        entityId: 'star_shooter',
        name: 'Myriad Sword Shooter Volley',
        role: 'shooter_dps',
        damageDealt: 46_000,
        healingDone: 0,
        activeTauntStacks: 0,
        distanceMeters: 38,
      },
      {
        entityId: 'lotus_mystic',
        name: 'Azure Cloud Mystic Healer',
        role: 'mystic_healer',
        damageDealt: 4_200,
        healingDone: 34_000,
        activeTauntStacks: 0,
        distanceMeters: 28,
      },
    ]);

    return `
      <div class="sr-grid2">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 class="sr-sectionTitle" style="margin:0;">50v50 Territory Castle Siege (${delta.protocol})</h4>
            <span class="sr-tagGreen">Bandwidth Saved: ${delta.bandwidthSavingsPercent}%</span>
          </div>
          <div class="sr-card">
            <canvas id="siege-battlefield-canvas" width="380" height="170" style="border:1px solid rgba(245,158,11,0.35);border-radius:4px;background:#060911;width:100%;"></canvas>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px;font-size:11px;font-variant-numeric:tabular-nums;">
              <div style="background:rgba(15,23,42,0.8);padding:5px;border-radius:4px;">
                Gate HP: <strong style="color:#fbbf24;">${this.siegeCurrent.citadelGateHpPercent}%</strong>
              </div>
              <div style="background:rgba(15,23,42,0.8);padding:5px;border-radius:4px;">
                Raw vs Delta: <strong>${delta.rawSnapshotBytes}B &rarr; ${delta.compressedDeltaBytes}B</strong>
              </div>
              <div style="background:rgba(15,23,42,0.8);padding:5px;border-radius:4px;">
                Reconcile: <strong style="color:#06b6d4;">${reconciliation.correctionMode} (${reconciliation.driftDistance}m)</strong>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button class="sr-btn sr-btnCyan" id="btn-step-siege-tick">⚡ Step 50v50 Tick & Broadcast Delta (/ws)</button>
              <button class="sr-btn" id="btn-reset-siege">🔄 Reset 100 Cohorts</button>
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:10px;">Hierarchical Squad Formations</h4>
          <div class="sr-card">
            <div style="display:flex;gap:6px;margin-bottom:8px;">
              ${(['shield_wall', 'wedge_charge', 'loose_skirmish'] as SquadFormationType[])
                .map(
                  (f) => `
                  <button class="sr-btn ${this.state.activeFormation === f ? 'sr-btnGold' : ''}" data-select-formation="${f}">
                    ${SQUAD_FORMATIONS[f].name}
                  </button>
                `
                )
                .join('')}
            </div>
            <p style="font-size:12px;color:#cbd5e1;">
              <strong>${formSpec.chineseName}:</strong> ${formSpec.tacticalDescription}
            </p>
          </div>
        </div>

        <div>
          <h4 class="sr-sectionTitle">Autonomous NPC GOAP Planner (${goapPlan.steps.length}-Step Chain)</h4>
          <div class="sr-card">
            <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:11px;">
              ${goapPlan.steps
                .map(
                  (s, i) => `
                  <span style="background:rgba(6,182,212,0.16);border:1px solid rgba(6,182,212,0.4);padding:3px 7px;border-radius:4px;color:#e2e8f0;">
                    ${i + 1}. ${s.label} <small style="color:#38bdf8;">(Cost ${s.cost})</small>
                  </span>
                  ${i < goapPlan.steps.length - 1 ? '<span style="color:#64748b;">&rarr;</span>' : ''}
                `
                )
                .join('')}
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:10px;">Dynamic Multi-Target Threat & Aggro Table</h4>
          <div class="sr-card">
            ${threatEntries
              .map(
                (t) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(148,163,184,0.12);font-size:12px;font-variant-numeric:tabular-nums;">
                  <span>${t.isPrimaryTarget ? '🎯 <strong>[AGGRO LOCK]</strong> ' : ''}${t.name}</span>
                  <span style="color:${t.isPrimaryTarget ? '#ef4444' : '#38bdf8'};font-weight:bold;">
                    ${t.threatScore.toLocaleString()} Enmity (${t.threatSharePercent}%)
                  </span>
                </div>
              `
              )
              .join('')}
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:10px;">Lv. 1–1000 Monster Weather Adaptation</h4>
          <div class="sr-card" style="font-size:12px;color:#cbd5e1;">
            <div>• <strong>Lv.45 Feral Pack (${this.state.activeWeather}):</strong> ${getMonsterBracketForLevel(45, this.state.activeWeather).activeDirective}</div>
            <div style="margin-top:4px;">• <strong>Lv.950 Apex Titan (${this.state.activeWeather}):</strong> <span style="color:#fbbf24;">${getMonsterBracketForLevel(950, this.state.activeWeather).activeDirective}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  private bindSiegeAndAIEvents(root: HTMLElement) {
    this.drawSiegeBattlefieldCanvas(root.querySelector<HTMLCanvasElement>('#siege-battlefield-canvas'));

    root.querySelector('#btn-step-siege-tick')?.addEventListener('click', () => {
      this.siegeBaseline = this.siegeCurrent;
      this.siegeCurrent = stepSiegeSimulationTick(
        this.siegeBaseline,
        0.1,
        this.state.activeFormation
      );
      this.lastSiegeDelta = encodeSiegeDeltaPacket(this.siegeBaseline, this.siegeCurrent);
      this.callbacks.onBroadcastNetworkMessage?.('siege_delta', this.lastSiegeDelta);
      this.renderModalContent();
    });

    root.querySelector('#btn-reset-siege')?.addEventListener('click', () => {
      this.siegeBaseline = createInitialSiegeSnapshot(Math.floor(this.state.castleLevel / 10));
      this.siegeCurrent = stepSiegeSimulationTick(this.siegeBaseline, 0.05, this.state.activeFormation);
      this.lastSiegeDelta = encodeSiegeDeltaPacket(this.siegeBaseline, this.siegeCurrent);
      this.renderModalContent();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-select-formation]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fm = btn.getAttribute('data-select-formation') as SquadFormationType;
        if (!fm) return;
        this.state.activeFormation = fm;
        this.persistState(true);
        this.renderModalContent();
      });
    });
  }

  private drawSiegeBattlefieldCanvas(canvas: HTMLCanvasElement | null) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Citadel Fortress wall at X = 230
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(225, 10);
    ctx.lineTo(225, canvas.height - 10);
    ctx.stroke();

    // Draw 50 Attacker cohorts (Cyan) & 50 Defender cohorts (Crimson)
    this.siegeCurrent.cohorts.forEach((c) => {
      const cx = (c.x / 1100) * canvas.width;
      const cy = (c.y / 700) * canvas.height;
      ctx.fillStyle = c.faction === 'attacker' ? '#06b6d4' : '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw preview of active Squad Formation slots on the right
    const slots = computeSquadFormationSlots(this.state.activeFormation, 16, 6);
    ctx.fillStyle = '#fbbf24';
    slots.forEach((s) => {
      ctx.fillRect(320 + s.offsetX, 85 + s.offsetZ, 3, 3);
    });
  }

  // ==========================================================================
  // TAB 4: Branching Xianxia Dialogue, Karma & Faction Reputation Matrix
  // ==========================================================================
  private buildDialogueAndLoreTabHTML(): string {
    const cult = this.state.cultivation;
    const repMap: Record<string, number> = {};
    this.state.factions.forEach((f) => (repMap[f.id] = f.reputation));

    const resolved = resolveDialogueNode(XIANXIA_DIALOGUE_GRAPH, this.currentDialogueNodeId, {
      playerRealmIndex: cult.paths.qi.realmIndex,
      karmaScore: cult.karma.score,
      karmaAlignment: cult.karma.alignment,
      clanRank: this.state.clanRank,
      transmittedScrolls: cult.lineage.transmittedScrolls,
      factionReputations: repMap,
    });

    const choicesHTML = resolved.resolvedChoices
      .map(
        (ch) => `
        <button
          class="sr-btn ${ch.isUnlocked ? 'sr-btnCyan' : ''}"
          style="width:100%;text-align:left;margin-bottom:6px;opacity:${ch.isUnlocked ? '1' : '0.5'};"
          data-dialogue-choice="${ch.id}"
          ${ch.isUnlocked ? '' : 'disabled'}
        >
          <div><strong>${ch.label}</strong></div>
          <div style="font-size:10px;color:${ch.isUnlocked ? '#a5f3fc' : '#fca5a5'};">
            ${ch.unlockDiagnostic}
          </div>
        </button>
      `
      )
      .join('');

    const factionsHTML = this.state.factions
      .map(
        (f) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:rgba(15,23,42,0.75);border:1px solid rgba(148,163,184,0.16);border-radius:4px;font-size:11px;">
          <div>
            <strong>${f.name} (${f.chineseTitle})</strong>
            <div style="color:#94a3b8;font-size:10px;">Manuals: ${f.unlockedManuals.join(', ') || 'None'}</div>
          </div>
          <div style="text-align:right;">
            <span class="sr-tagGold">${f.rankLabel} (${f.reputation})</span>
            <div style="color:#10b981;font-size:10px;margin-top:2px;">Merchant Discount: -${f.merchantDiscountPercent}%</div>
          </div>
        </div>
      `
      )
      .join('');

    const questsHTML = this.activeQuests
      .map(
        (q) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;background:rgba(15,23,42,0.75);border:1px solid rgba(6,182,212,0.28);border-radius:4px;font-size:11px;">
          <div>
            <strong style="color:#38bdf8;">${q.title}</strong> (Lv.${q.recommendedLevel})
            <div style="color:#cbd5e1;font-size:10px;">${q.objectiveSummary}</div>
          </div>
          <button class="sr-btn sr-btnGold" data-ping-quest-x="${q.targetCoordinates.x}" data-ping-quest-y="${q.targetCoordinates.y}" data-ping-quest-title="${q.title}">
            🎯 Ping (${q.targetCoordinates.x}, ${q.targetCoordinates.y})
          </button>
        </div>
      `
      )
      .join('');

    return `
      <div class="sr-grid2">
        <div>
          <h4 class="sr-sectionTitle">Branching Xianxia Dialogue & Tribulation Trials</h4>
          <div class="sr-card" style="border-color:${resolved.node.isTribulationTrial ? '#ef4444' : 'rgba(245,158,11,0.4)'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <strong style="color:#fbbf24;font-size:14px;">${resolved.node.speakerName}</strong>
              <span class="sr-tagGold">${resolved.node.speakerTitle}</span>
            </div>
            <p style="font-size:13px;color:#f8fafc;line-height:1.5;margin-bottom:12px;background:rgba(8,10,16,0.75);padding:10px;border-radius:6px;">
              "${resolved.node.text}"
            </p>
            <div>${choicesHTML}</div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:10px;">Active Radiant Decrees (generateRadiantQuestForNPC)</h4>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${questsHTML}
          </div>
        </div>

        <div>
          <h4 class="sr-sectionTitle">5-Sect Faction Reputation Matrix</h4>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${factionsHTML}
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <button class="sr-btn sr-btnCyan" id="btn-gen-radiant-quest">📜 Issue New Radiant Bounty</button>
            <button class="sr-btn" id="btn-boost-sect-rep">+1,000 Sect Standing</button>
          </div>
        </div>
      </div>
    `;
  }

  private bindDialogueAndLoreEvents(root: HTMLElement) {
    root.querySelectorAll<HTMLButtonElement>('[data-dialogue-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choiceId = btn.getAttribute('data-dialogue-choice');
        const node = XIANXIA_DIALOGUE_GRAPH[this.currentDialogueNodeId];
        const choice = node?.choices.find((c) => c.id === choiceId);
        if (!choice) return;

        if (choice.effect) {
          const eff = choice.effect;
          if (eff.karmaDelta) {
            const k = this.state.cultivation.karma;
            this.state.cultivation.karma = evaluateKarmaState(
              k.score + eff.karmaDelta,
              eff.karmaDelta < 0 ? k.unprovokedKills + 1 : k.unprovokedKills,
              eff.karmaDelta > 0 ? k.righteousDeeds + 1 : k.righteousDeeds
            );
          }
          if (eff.spiritStonesDelta) {
            this.state.cultivation.spiritStones = Math.max(
              0,
              this.state.cultivation.spiritStones + eff.spiritStonesDelta
            );
          }
          if (eff.innerDemonResistanceDelta) {
            this.state.cultivation.innerDemonResistance = Math.min(
              0.95,
              Number((this.state.cultivation.innerDemonResistance + eff.innerDemonResistanceDelta).toFixed(2))
            );
          }
          if (
            eff.grantScroll &&
            !this.state.cultivation.lineage.transmittedScrolls.includes(eff.grantScroll)
          ) {
            this.state.cultivation.lineage.transmittedScrolls.push(eff.grantScroll);
          }
          if (eff.factionRepDelta) {
            this.state.factions = this.state.factions.map((f) =>
              f.id === eff.factionRepDelta!.factionId
                ? evaluateFactionStanding(f, eff.factionRepDelta!.delta)
                : f
            );
          }
          if (eff.spawnRadiantQuest) {
            const roles: NPCRole[] = ['guard', 'marshal', 'merchant', 'blacksmith', 'mystic'];
            const role = roles[this.activeQuests.length % roles.length];
            this.activeQuests.unshift(
              generateRadiantQuestForNPC(
                role,
                Math.floor(this.state.castleLevel / 10),
                this.state.cultivation.paths.qi.realmIndex,
                Date.now()
              )
            );
            this.activeQuests = this.activeQuests.slice(0, 3);
          }
        }

        this.currentDialogueNodeId = choice.nextNodeId;
        this.persistState(true);
        this.renderModalContent();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-ping-quest-x]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const x = Number(btn.getAttribute('data-ping-quest-x') || '640');
        const y = Number(btn.getAttribute('data-ping-quest-y') || '360');
        const title = btn.getAttribute('data-ping-quest-title') || 'Radiant Bounty';
        this.callbacks.onTriggerWorldPing?.(x, y, 'move', title);
        this.closeModal();
      });
    });

    root.querySelector('#btn-gen-radiant-quest')?.addEventListener('click', () => {
      const roles: NPCRole[] = ['marshal', 'mystic', 'blacksmith', 'merchant', 'guard'];
      const role = roles[Math.floor(Math.random() * roles.length)];
      this.activeQuests.unshift(
        generateRadiantQuestForNPC(
          role,
          Math.floor(this.state.castleLevel / 10),
          this.state.cultivation.paths.qi.realmIndex,
          Date.now()
        )
      );
      this.activeQuests = this.activeQuests.slice(0, 3);
      this.renderModalContent();
    });

    root.querySelector('#btn-boost-sect-rep')?.addEventListener('click', () => {
      this.state.factions = this.state.factions.map((f) => evaluateFactionStanding(f, 1000));
      this.persistState(true);
      this.renderModalContent();
    });
  }

  // ==========================================================================
  // TAB 5: Save Vault (SHA-256), Monte Carlo Combat Sim & Guardrail Test Suite
  // ==========================================================================
  private buildVaultAndTestsTabHTML(): string {
    const check = verifySaveEnvelopeChecksum(this.lastSaveEnvelope);
    const simResult = runMonteCarloCombatSimulation({
      iterations: 500,
      attackerArmy: this.state.army,
      defenderArmy: {
        shieldbearers: 180_000_000_000,
        shooters: 180_000_000_000,
        bombers: 140_000_000_000,
        tier: this.state.army.tier,
      },
      attackerRealmIndex: this.state.cultivation.paths.qi.realmIndex,
      defenderRealmIndex: 2,
      attackerArmor: 1200,
      defenderArmor: 1200,
      seed: 2026,
    });

    const sinkInfo = evaluateEconomyInflationSink({
      circulatingSpiritStones: this.state.cultivation.spiritStones,
      activeCitadelEra: Math.floor(this.state.castleLevel / 10),
      dailyRefineVolume: 45_000,
    });

    const vipInfo = getVIPBenefitProfile(this.state.vipLevel);
    const loginInfo = getCyclicalLoginMultiplier(this.state.loginStreakDays);
    const eraInfo = getCastleEraMultiplier(this.state.castleLevel);
    const armorInfo = calculateDiminishingArmorMitigation(1200, eraInfo.eraIndex);

    const testSuite = runAllArchitecturalGuardrailTests();

    return `
      <div class="sr-grid2">
        <div>
          <h4 class="sr-sectionTitle">Three-Tier Persistence & SHA-256 Integrity Checksum</h4>
          <div class="sr-card" style="border-color:${this.tamperTestDiagnostic ? '#ef4444' : 'rgba(16,185,129,0.4)'};">
            <div style="font-size:11px;color:#cbd5e1;font-variant-numeric:tabular-nums;word-break:break-all;">
              <div><strong>Schema:</strong> v${this.lastSaveEnvelope.schemaVersion} • <strong>Saved:</strong> ${this.lastSaveEnvelope.savedAtIso}</div>
              <div style="margin-top:4px;color:#10b981;"><strong>SHA-256:</strong> <code>${this.lastSaveEnvelope.checksumSha256}</code></div>
              <div style="margin-top:4px;color:${this.tamperTestDiagnostic ? '#ef4444' : '#38bdf8'};font-weight:bold;">
                ${this.tamperTestDiagnostic || check.diagnostic}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
              <button class="sr-btn sr-btnGreen" id="btn-save-local">💾 Save & Sign (SHA-256 + /ws Sync)</button>
              <button class="sr-btn sr-btnCyan" id="btn-export-json">📤 Export JSON Scroll</button>
              <button class="sr-btn sr-btnCrimson" id="btn-test-tamper">⚠️ Simulate Save Tampering</button>
            </div>
            <textarea id="save-json-textarea" class="sr-input" style="width:100%;height:68px;margin-top:8px;font-family:monospace;font-size:10px;" placeholder="Paste signed JSON scroll here to verify SHA-256 & import..."></textarea>
            <button class="sr-btn" id="btn-import-json" style="margin-top:4px;width:100%;">📥 Verify SHA-256 Checksum & Import JSON Scroll</button>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:10px;">Monte Carlo Combat Simulator (${simResult.iterations} Rounds)</h4>
          <div class="sr-card" style="font-size:12px;font-variant-numeric:tabular-nums;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>Attacker Win Rate: <strong style="color:#10b981;">${simResult.attackerWinRatePercent}%</strong></span>
              <span>Defender Win Rate: <strong style="color:#ef4444;">${simResult.defenderWinRatePercent}%</strong></span>
              <span>Suppression: <strong style="color:#fbbf24;">${simResult.realmSuppressionFactor}x</strong></span>
            </div>
            <div style="color:#cbd5e1;font-size:11px;">• ${simResult.counterAdvantageSummary}</div>
            <div style="color:#38bdf8;font-size:11px;margin-top:3px;">• ${simResult.dominantStrategyDiagnosis}</div>
            <div style="color:#94a3b8;font-size:11px;margin-top:3px;">
              • Armor Mitigation: ${(armorInfo.mitigationRatio * 100).toFixed(1)}% • VIP ${vipInfo.vipLevel} (-${Math.round(vipInfo.trainingCostDiscount * 100)}% Cost) • Day-${loginInfo.cycleDay} Streak (${loginInfo.rewardMultiplier}x) • Economy: ${sinkInfo.scarcityStatus} (Tax ${sinkInfo.dynamicTaxRatePercent}%)
            </div>
          </div>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 class="sr-sectionTitle" style="margin:0;">Automated CI Guardrail & Unit Test Suite</h4>
            <span class="sr-tagGreen">${testSuite.passedCount}/${testSuite.totalCount} PASSED</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;max-height:360px;overflow-y:auto;">
            ${testSuite.results
              .map(
                (r) => `
                <div style="padding:6px 8px;background:rgba(15,23,42,0.82);border-left:3px solid ${r.passed ? '#10b981' : '#ef4444'};border-radius:4px;font-size:11px;">
                  <div style="display:flex;justify-content:space-between;">
                    <strong style="color:#f8fafc;">${r.passed ? '✓' : '✗'} ${r.name}</strong>
                    <span style="color:#94a3b8;font-variant-numeric:tabular-nums;">${r.durationMs}ms</span>
                  </div>
                  <div style="color:#38bdf8;font-size:10px;margin-top:2px;font-variant-numeric:tabular-nums;">
                    [${r.pillar}] ${r.assertionSummary}
                  </div>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private bindVaultAndTestsEvents(root: HTMLElement) {
    const textArea = root.querySelector<HTMLTextAreaElement>('#save-json-textarea');

    root.querySelector('#btn-save-local')?.addEventListener('click', () => {
      this.tamperTestDiagnostic = null;
      this.persistState(true);
      this.renderModalContent();
    });

    root.querySelector('#btn-export-json')?.addEventListener('click', () => {
      this.tamperTestDiagnostic = null;
      const env = serializeSaveEnvelope(this.state);
      if (textArea) {
        textArea.value = JSON.stringify(env, null, 2);
      }
    });

    root.querySelector('#btn-test-tamper')?.addEventListener('click', () => {
      const tampered: SignedSaveEnvelope = JSON.parse(JSON.stringify(this.lastSaveEnvelope));
      tampered.payload.cultivation.spiritStones += 999_999_999;
      const check = verifySaveEnvelopeChecksum(tampered);
      this.tamperTestDiagnostic = check.diagnostic;
      if (textArea) {
        textArea.value = JSON.stringify(tampered, null, 2);
      }
      this.renderModalContent();
    });

    root.querySelector('#btn-import-json')?.addEventListener('click', () => {
      if (!textArea || !textArea.value.trim()) return;
      try {
        const parsed = JSON.parse(textArea.value) as SignedSaveEnvelope;
        const check = verifySaveEnvelopeChecksum(parsed);
        if (!check.valid) {
          this.tamperTestDiagnostic = check.diagnostic;
          this.renderModalContent();
          return;
        }
        this.tamperTestDiagnostic = null;
        this.state = parsed.payload;
        this.persistState(true);
        this.renderModalContent();
      } catch {
        this.tamperTestDiagnostic = 'Rejected: Invalid JSON syntax in Save Scroll.';
        this.renderModalContent();
      }
    });
  }

  // ==========================================================================
  // TAB 6: Supreme Administration, GM, Moderator & Contact Console (creatergame31@gmail.com)
  // ==========================================================================
  public displayGMBroadcastBanner(decree: {
    senderEmail: string;
    message: string;
    timestamp: number;
  }) {
    const bannerEl = document.getElementById('ping-alert-banner');
    if (bannerEl) {
      bannerEl.style.display = 'flex';
      bannerEl.style.borderColor = '#f59e0b';
      bannerEl.innerHTML = `<span style="color:#fbbf24;font-weight:bold;">👑 [GM DECREE • ${decree.senderEmail}]:</span>&nbsp;<span style="color:#f8fafc;">${decree.message}</span>`;
    }
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const div = document.createElement('div');
      div.style.marginBottom = '4px';
      div.innerHTML = `<span style="color:#fbbf24;font-weight:bold;">👑 [SUPREME GM / ADMIN • ${decree.senderEmail}]:</span> <span style="color:#fde68a;">${decree.message}</span>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  private buildGMAdminTabHTML(): string {
    const profile = getSupremeAdminContactProfile();
    const integrityOk = verifyGMSessionIntegrity(this.gmSession);

    const auditRowsHTML = this.gmSession.auditLog
      .map(
        (entry) => `
        <div style="padding:6px 8px;background:rgba(15,23,42,0.82);border-left:3px solid #f59e0b;border-radius:4px;font-size:11px;">
          <div style="display:flex;justify-content:space-between;">
            <strong style="color:#fbbf24;">[${entry.action}]</strong>
            <span style="color:#94a3b8;font-size:10px;font-variant-numeric:tabular-nums;">${entry.timestampIso.slice(11, 19)} UTC</span>
          </div>
          <div style="color:#e2e8f0;font-size:11px;margin-top:2px;">${entry.details}</div>
          <div style="color:#38bdf8;font-size:10px;margin-top:2px;">Actor: ${entry.actorEmail} (${entry.role})</div>
        </div>
      `
      )
      .join('');

    return `
      <div class="sr-grid2">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <h4 class="sr-sectionTitle" style="margin:0;">Verified Supreme Account & Official Contact</h4>
            <span class="sr-tagGold">${integrityOk ? '✓ ROOT GMPriv::All (0x3FF) ACTIVE' : 'LOCKED'}</span>
          </div>
          <div class="sr-card" style="border-color:rgba(245,158,11,0.55);background:linear-gradient(180deg,rgba(245,158,11,0.08),rgba(8,10,16,0.85));">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div>
                <div style="font-size:15px;font-weight:700;color:#fbbf24;">👑 ${profile.email}</div>
                <div style="font-size:12px;color:#f8fafc;margin-top:2px;">${profile.title}</div>
              </div>
              <span class="sr-tagGreen">ONLINE</span>
            </div>

            <div style="display:flex;flex-wrap:wrap;gap:5px;margin:8px 0;">
              ${profile.roles
                .map((r) => `<span class="sr-tagCyan" style="font-size:10px;">🛡️ ${r}</span>`)
                .join('')}
            </div>

            <div style="font-size:11px;color:#cbd5e1;background:rgba(8,10,16,0.75);padding:8px;border-radius:5px;border:1px solid rgba(148,163,184,0.18);font-variant-numeric:tabular-nums;">
              <div><strong>Official Admin / GM / Moderator Contact:</strong> <span style="color:#38bdf8;">${profile.supportChannels.directEmail}</span></div>
              <div style="margin-top:3px;"><strong>Jurisdiction:</strong> ${profile.supportChannels.realmJurisdiction}</div>
              <div style="margin-top:3px;"><strong>Canary Token Seal:</strong> <code>${this.gmSession.canarySealHex}</code></div>
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
              <a href="${profile.supportChannels.mailtoHref}" class="sr-btn sr-btnGold" style="text-decoration:none;display:inline-flex;align-items:center;">
                📧 Contact Admin / GM (${profile.email})
              </a>
              <button class="sr-btn sr-btnCyan" id="btn-copy-admin-email">
                📋 Copy Contact Email ${this.copyStatusText ? `(${this.copyStatusText})` : ''}
              </button>
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:12px;">Global Server GM / Moderator Decree Broadcast (/ws)</h4>
          <div class="sr-card">
            <div style="display:flex;gap:6px;">
              <input id="gm-broadcast-input" type="text" class="sr-input" value="By Decree of Supreme Admin creatergame31@gmail.com: Heavenly Double Cultivation & Siege Event is now active!" />
              <button class="sr-btn sr-btnGold" id="btn-send-gm-broadcast" style="white-space:nowrap;">📢 Broadcast Decree</button>
            </div>
          </div>

          <h4 class="sr-sectionTitle" style="margin-top:12px;">GM / Admin / Moderator Audit Log</h4>
          <div style="display:flex;flex-direction:column;gap:5px;max-height:145px;overflow-y:auto;">
            ${auditRowsHTML}
          </div>
        </div>

        <div>
          <h4 class="sr-sectionTitle">Live Game Master (GM) & Moderator Command Controls</h4>
          <div class="sr-card" style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <button class="sr-btn ${this.gmSession.godmode ? 'sr-btnGold' : 'sr-btnGreen'}" id="btn-gm-godmode">
                🛡️ Godmode & Infinite Qi: ${this.gmSession.godmode ? 'ENABLED' : 'OFF'}
              </button>
              <button class="sr-btn sr-btnCrimson" id="btn-gm-smite-all">
                ⚡ Smite All Enemies (Instant Purge)
              </button>
              <button class="sr-btn sr-btnGold" id="btn-gm-ascend-origin">
                🌌 Ascend 4 Paths to Realm 22 (Origin)
              </button>
              <button class="sr-btn sr-btnCyan" id="btn-gm-max-citadel">
                🏯 Max Citadel Lv.100 (100x) & VIP 15
              </button>
              <button class="sr-btn sr-btnGreen" id="btn-gm-grant-treasury">
                💎 Grant +1B Stones & +1T Cohort
              </button>
              <button class="sr-btn" id="btn-gm-purge-karma">
                ⚖️ Mod: Purge Red-Name & Set +1000 Karma
              </button>
            </div>

            <div style="border-top:1px solid rgba(148,163,184,0.18);padding-top:8px;margin-top:2px;">
              <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">📍 Instant GM Teleport & Radar Beacon</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="sr-btn" data-gm-tp-x="640" data-gm-tp-y="360" data-gm-tp-label="Central Sanctum">🏯 Central Sanctum (640, 360)</button>
                <button class="sr-btn" data-gm-tp-x="1280" data-gm-tp-y="720" data-gm-tp-label="Dragon Vein Citadel">🐉 Dragon Vein (1280, 720)</button>
                <button class="sr-btn" data-gm-tp-x="2100" data-gm-tp-y="1150" data-gm-tp-label="Abyssal Rift Gate">🌀 Abyssal Rift (2100, 1150)</button>
              </div>
            </div>

            <div style="border-top:1px solid rgba(148,163,184,0.18);padding-top:8px;margin-top:2px;">
              <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">⏱️ Engine Time-Scale Override (Current: ${this.gmSession.timeScale}x)</div>
              <div style="display:flex;gap:6px;">
                ${[0.5, 1.0, 2.0, 4.0]
                  .map(
                    (scale) => `
                  <button class="sr-btn ${this.gmSession.timeScale === scale ? 'sr-btnCyan' : ''}" data-gm-timescale="${scale}" style="flex:1;">
                    ${scale}x Speed
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindGMAdminEvents(root: HTMLElement) {
    root.querySelector('#btn-copy-admin-email')?.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(SUPREME_ADMIN_EMAIL).catch(() => {});
      }
      this.copyStatusText = 'Copied!';
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'CONTACT_COPIED',
        `Copied official Admin/GM/Moderator contact (${SUPREME_ADMIN_EMAIL}) to clipboard`
      );
      this.renderModalContent();
    });

    root.querySelector('#btn-send-gm-broadcast')?.addEventListener('click', () => {
      const inp = root.querySelector<HTMLInputElement>('#gm-broadcast-input');
      const msg = inp?.value.trim() || `Official Decree from ${SUPREME_ADMIN_EMAIL}`;
      const payload = {
        senderEmail: SUPREME_ADMIN_EMAIL,
        message: msg,
        timestamp: Date.now(),
      };
      this.displayGMBroadcastBanner(payload);
      this.callbacks.onBroadcastNetworkMessage?.('gm_broadcast', payload);
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_DECREE_BROADCAST',
        `Broadcasted server-wide decree: "${msg}"`
      );
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-godmode')?.addEventListener('click', () => {
      this.gmSession.godmode = !this.gmSession.godmode;
      this.gmSession.infiniteMana = this.gmSession.godmode;
      this.callbacks.onGMAction?.({ type: 'godmode', value: this.gmSession.godmode });
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_GODMODE_TOGGLE',
        `Set Godmode & Infinite Qi to ${this.gmSession.godmode ? 'ENABLED' : 'DISABLED'}`
      );
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-smite-all')?.addEventListener('click', () => {
      this.callbacks.onGMAction?.({ type: 'smite_enemies' });
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_SMITE_ALL_ENEMIES',
        'Executed realm-wide Heavenly Smite purging all active hostile entities'
      );
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-ascend-origin')?.addEventListener('click', () => {
      (['qi', 'body', 'soul', 'mind'] as CultivationPath[]).forEach((pKey) => {
        const p = this.state.cultivation.paths[pKey];
        p.realmIndex = 22; // Ultimate Origin
        p.layer = 9;
        p.requiredEssence = getRequiredEssenceForLayer(22, 9);
        p.currentEssence = p.requiredEssence;
      });
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_ASCEND_ULTIMATE_ORIGIN',
        'Elevated Qi, Body, Soul, and Mind paths to Realm 22 (Ultimate Origin • Layer 9)'
      );
      this.persistState(true);
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-max-citadel')?.addEventListener('click', () => {
      this.state.castleLevel = 100;
      this.state.vipLevel = 15;
      this.state.clanRank = 'grand_patriarch';
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_MAX_CITADEL_VIP',
        'Set Citadel to Level 100 (Era 10 • 100x Power), VIP 15, and Grand Patriarch rank'
      );
      this.persistState(true);
      if (this.viewportMode === '3d_voxel_citadel') {
        this.setViewportMode('3d_voxel_citadel');
      }
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-grant-treasury')?.addEventListener('click', () => {
      this.state.cultivation.spiritStones += 1_000_000_000;
      this.state.army.shieldbearers += 400_000_000_000;
      this.state.army.shooters += 400_000_000_000;
      this.state.army.bombers += 200_000_000_000;
      this.state.army.tier = 10;
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'GM_GRANT_TREASURY',
        'Granted +1B Spirit Stones and +1 Trillion Tier-10 Chaos Origin Sovereign Guard troops'
      );
      this.persistState(true);
      this.renderModalContent();
    });

    root.querySelector('#btn-gm-purge-karma')?.addEventListener('click', () => {
      this.state.cultivation.karma = evaluateKarmaState(1000, 0, 50);
      this.gmSession = appendGMAuditLog(
        this.gmSession,
        'MOD_KARMA_PARDON',
        'Moderator cleared all PK bounties and restored +1000 Righteous Karma alignment'
      );
      this.persistState(true);
      this.renderModalContent();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-gm-tp-x]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const x = Number(btn.getAttribute('data-gm-tp-x') || '640');
        const y = Number(btn.getAttribute('data-gm-tp-y') || '360');
        const label = btn.getAttribute('data-gm-tp-label') || 'GM Destination';
        this.callbacks.onGMAction?.({ type: 'teleport', value: { x, y } });
        this.callbacks.onTriggerWorldPing?.(x, y, 'move', `GM Teleport: ${label}`);
        this.gmSession = appendGMAuditLog(
          this.gmSession,
          'GM_TELEPORT',
          `Teleported administrator to ${label} (${x}, ${y})`
        );
        this.renderModalContent();
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-gm-timescale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scale = Number(btn.getAttribute('data-gm-timescale') || '1');
        this.gmSession.timeScale = scale;
        this.callbacks.onGMAction?.({ type: 'time_scale', value: scale });
        this.gmSession = appendGMAuditLog(
          this.gmSession,
          'GM_TIMESCALE_OVERRIDE',
          `Set world simulation time scale to ${scale}x`
        );
        this.renderModalContent();
      });
    });
  }
}
