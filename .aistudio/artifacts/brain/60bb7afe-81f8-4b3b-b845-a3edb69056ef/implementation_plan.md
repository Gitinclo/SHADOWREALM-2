# ShadowRealm 2030.1 — Horizon Architecture & Full-Stack Future-Proofing Plan

This plan defines the complete **2030/01/01 Horizon Upgrade** for **ShadowRealm — Voxel Realms MMORPG**, upgrading all five core gameplay pillars, introducing Post-Quantum Hybrid Save Cryptography (`v2030.1`), upgrading the 3D viewport to a physically based Studio Environment & Anisotropic PBR pipeline, expanding progression to 30 Cosmic Realms and Era-20 Dyson Citadels, and equipping the Supreme GM/Admin Console (`creatergame31@gmail.com`) with predictive anomaly telemetry, batch entity scripting, cross-shard player migration, and instant state snapshot rollback.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Scope from Clarification Interview**
> - **All 4 Core 2030 System Upgrades Selected**:
>   1. **Full 2030 Overhaul Across All 5 Pillars**: Upgraded deterministic math, procedural 3D delves, autonomous GOAP/Utility AI, dynamic narrative chronicles, and server-authoritative WebSocket netcode.
>   2. **Post-Quantum Save Cryptography & Schema `v2030.1`**: Dual-signature save envelope combining classical SHA-256 with a deterministic Lattice-Hash commitment seal (`LWE-2030-SEAL`) and automatic backward-compatible migration from `v1.5.0` to `v2030.1`.
>   3. **Next-Gen 3D WebGPU-Ready / WebGL2 Studio PBR Pipeline**: Physically based `MeshPhysicalMaterial` with `RoomEnvironment` PMREM reflections, anisotropic brushed gold/steel, transmissive spirit crystals, software-WebGL frame pacing protection, and smooth exponential camera damping.
>   4. **Expanded 2030 Immortal Realms & Cosmic Siege Eras**: Expansion from 23 to **30 Major Realms** (culminating in *2030 Singularity Sovereign* & *Eternal Dao Architect*) and **Citadel Eras 0–20** supporting **Septillion-scale ($10^{24}$) astral cohorts**.
> - **Tri-Mode 2030 Visual Theme Engine (Supporting All 3 Visual Directions)**:
>   - Because all three visual directions were selected, the HUD and 3D Viewport will feature a live **2030 Visual Theme Switcher** defaulting to **(1) Cyber-Celestial 2030 Obsidian & Holographic Gold**, with instant one-click switching into **(2) Classic Dark Xianxia Jade & Spirit Cyan** and **(3) High-Contrast Tactical Command HUD**.
> - **Supreme GM & Admin Console (`creatergame31@gmail.com`) 2030 Capabilities**:
>   - **Predictive 2030 Anomaly Detection & Auto-Scaling Telemetry**: Real-time `recharts` multi-metric streams with anomaly score forecasting, packet-burst detection, and dynamic shard auto-scaling controls.
>   - **Batch Entity Scripting & Scheduled Server Decrees**: Multi-line GM macro batch execution (running sequences of `spawn_multiple_items`, `teleport_all_players`, `set_cultivation_realm`, `kick_player`, `ban_player`) plus scheduled recurring server decrees.
>   - **Cross-Shard Player Migration & Snapshot Rollback**: Live shard routing (`Shard-Alpha-2030`, `Shard-Omega-Void`, `Shard-Celestial-Siege`) and one-click authoritative server/vault state snapshot creation and rollback.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates **ShadowRealm** into a 2030-ready, zero-compromise Xianxia & Tactical Siege MMORPG where players cultivate across 30 Immortal & Cosmic Realms, delve into 3D BSP+WFC procedural Dao grottoes rendered with physically based studio reflections, command Septillion-scale armies in delta-compressed multi-shard castle sieges, and persist progress inside post-quantum tamper-evident save vaults.
- **Target Audience / Persona**: Both core cultivation/strategy players seeking deep mathematical progression and the Supreme Administrator (`creatergame31@gmail.com`) managing multi-shard populations, live telemetry, batch entity macros, and instant state rollbacks.
- **Key Value**: Guarantees complete mathematical determinism, forward-compatible `v2030.1` persistence, hardware-adaptive 3D PBR visual fidelity, and enterprise-grade real-time GM command orchestration.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Tri-Mode 2030 HUD & Viewport Experience**:
   - Players view the unobstructed `100vw × 100vh` 2D Tactical Realm or 3D Studio PBR Voxel/Delve Viewport (`85%+` canvas allocation).
   - From the top-left Immortal Cultivator Plaque or the collapsible bottom Command Dock (`[H]` to toggle Zen/Cinema collapse), users can switch between the three 2030 Visual Themes (*Cyber-Celestial 2030*, *Classic Dark Xianxia*, *High-Contrast Tactical*) and three Viewport Modes (*2D Tactical*, *3D Voxel Citadel*, *3D Dungeon Delve*).
2. **30-Realm Cosmic Cultivation & Breakthroughs**:
   - Players advance Qi, Body, Soul, and Mind paths through Realms 0–29, inspect $10^{\Delta\text{Realm}}$ suppression multipliers across cosmic tiers, and trigger Era 0–20 Citadel upgrades.
3. **Supreme GM & Admin 2030 Command Center (`creatergame31@gmail.com`)**:
   - Automatically unlocked when `creatergame31@gmail.com` is signed in.
   - **Predictive Telemetry Sub-Section (`recharts`)**: Displays real-time Server CPU Load, Predictive Load Forecast, Anomaly Risk Index, Active Shard Users, and WebSocket Throughput.
   - **Batch Scripting & Command Console**: Supports single commands, bulk actions (`spawn_multiple_items`, `teleport_all_players`), moderation (`kick_player`, `ban_player`), multi-line **GM Batch Macro Scripts**, and **Scheduled Server Decrees**.
   - **Cross-Shard Migration & Snapshot Rollback**: Allows migrating individual or all active players across server shards and capturing/restoring full timestamped world & cultivation snapshots.

### Visual Identity & Tri-Mode Theme Tokens (60-30-10 Rule)
- **Theme 1: Cyber-Celestial 2030 Obsidian & Holographic Gold (Default)**
  - *60% Primary Canvas*: Deep Chrono Obsidian (`#06080E`) and Elevated Void Surface (`#0C111D`).
  - *30% Structural Trim & Typography*: Celestial Alabaster (`#F8FAFC`), Astral Slate (`#94A3B8`), and hairline metallic borders (`1px solid rgba(245, 158, 11, 0.28)`).
  - *10% Semantic Accents*: Holographic Gold (`#F59E0B`), Quantum Cyan (`#06B6D4`), Singularity Emerald (`#10B981`), and Tribulation Crimson (`#EF4444`).
- **Theme 2: Classic Dark Xianxia Jade & Spirit Cyan**
  - Deep Immortal Grotto Slate (`#07110E`), Sect Jade Trim (`rgba(16, 185, 129, 0.32)`), and Spirit Qi Cyan (`#22D3EE`).
- **Theme 3: High-Contrast Tactical Command HUD**
  - Pitch Tactical Black (`#020408`), Crisp High-Visibility Amber (`#FBBF24`) & Ice White (`#FFFFFF`) with high-legibility borders for competitive 50v50 siege command.
- **Typography & Scannable Hierarchy**:
  - Display headers styled with geometric authority (`Plus Jakarta Sans` / `Cinzel` display pairing), body prose in `Plus Jakarta Sans`, and strict `font-variant-numeric: tabular-nums` monospace formatting for all power counters, $10^{\Delta\text{Realm}}$ multipliers, SHA-256 + Lattice-Hash digests, and telemetry metrics.
  - Unboxed metadata with clean typographic separators (`·`) and collapsible bottom dock controls for zero viewport occlusion.

---

## 3. Key Product Decisions & Trade-Offs

1. **Post-Quantum Hybrid Save Envelope (`v2030.1` vs. Legacy `v1.5.0`)**:
   - *Chosen Approach*: Upgrade the persistence engine to emit `schemaVersion: '2030.1.0'` containing both a canonical `checksumSha256` digest and a deterministic 2030 Lattice-Hash commitment (`postQuantumLatticeSeal`), while automatically migrating any `v1.5.0` save payload on import/load.
   - *Why*: Future-proofs player vaults against tampering and schema drift through 2030 without breaking existing saved scrolls.
2. **Hardware-Adaptive 3D Studio PBR Pipeline (`RoomEnvironment` + Software-WebGL Guard)**:
   - *Chosen Approach*: Upgrade the Three.js 3D Citadel and Dungeon Delve renderer with `ACESFilmicToneMapping`, `SRGBColorSpace`, procedural `RoomEnvironment` PMREM reflections, multi-part `THREE.Group` architectural assemblies, and automatic `isSoftwareGl` detection to pace frames safely on headless/software GPUs while delivering full anisotropic PBR on hardware GPUs.
   - *Why*: Eliminates flat lighting on metallic/jade surfaces and prevents frame starvation across diverse 2030 client devices.
3. **Authoritative Multi-Shard Telemetry, Batch Scripting & Snapshot Rollback**:
   - *Chosen Approach*: Extend the `/ws` server and GM engine to maintain active shard assignments (`Shard-Alpha-2030`, `Shard-Omega-Void`, `Shard-Celestial-Siege`), compute rolling z-score anomaly predictions on packet & CPU load, execute multi-line GM batch scripts atomically, and store restorable state snapshots.
   - *Why*: Gives the administrator (`creatergame31@gmail.com`) deterministic disaster recovery, cross-shard load balancing, and automated bulk management in a single unified console.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  SHADOWREALM 2030.1 UNIFIED CLIENT & HUD ENGINE                  │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  ┌────────────────┐  │
│  │ 2D Phaser Tactical View │  │ 3D Studio PBR Viewport    │  │ Tri-Mode 2030  │  │
│  │ • Shadow Radar Mini-Map │◄─┤ • RoomEnvironment PMREM   ├─►│ HUD & Zen Dock │  │
│  │ • Multi-Shard Beacons   │  │ • 3D BSP/WFC Dao Grottoes │  │ • Theme Engine │  │
│  └────────────┬────────────┘  └─────────────┬─────────────┘  └────────┬───────┘  │
└───────────────┼─────────────────────────────┼─────────────────────────┼──────────┘
                │                             │                         │
                ▼                             ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│            2030.1 DECOUPLED PURE TYPESCRIPT GAMEPLAY & GM ENGINE                 │
│  ┌────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────┐  │
│  │ Pillar 1 & 5: 2030 Math│ │ Pillar 2: 3D Delve & PBR│ │ Pillar 3 & 4: AI &  │  │
│  │ • 30 Cosmic Realms     │ │ • 3D BSP Tree + Voxels  │ │   Narrative Engine  │  │
│  │ • Era 0-20 Citadels    │ │ • WFC Constraint Solver │ │ • 6-Step GOAP + Util│  │
│  │ • Septillion Power Sim │ │ • A* Boss Reachability  │ │ • 2030 Lore & Quests│  │
│  └────────────────────────┘ └─────────────────────────┘ └─────────────────────┘  │
│  ┌────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │ Post-Quantum Save Vault (v2030.1)  │ │ Supreme GM Console (creatergame31)  │  │
│  │ • SHA-256 + LWE-2030 Lattice Seal  │ │ • Recharts Predictive Anomaly Graph │  │
│  │ • Auto-Migration (v1.5 -> v2030.1) │ │ • Batch Scripting & Scheduled Decree│  │
│  │ • Instant State Snapshot Rollback  │ │ • Cross-Shard Migration & Kick/Ban  │  │
│  └────────────────────────────────────┘ └──────────────────┬──────────────────┘  │
└────────────────────────────────────────────────────────────┼─────────────────────┘
                                                             │ WebSocket (/ws)
                                                             ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│           AUTHORITATIVE 2030.1 MULTI-SHARD WEBSOCKET SERVER (/ws)                │
│  • Real-Time Load, Forecast & Anomaly Score Stream  • Cross-Shard Routing        │
│  • Kick/Ban Connection Termination                  • 50v50 Delta Broadcast      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **2030 Visual Theme Switcher**: Toggles CSS custom properties and HUD theme state between `cyber_celestial_2030`, `classic_xianxia_jade`, and `tactical_high_contrast`, persisting preference in the `v2030.1` save envelope and collapsible Zen Dock (`[H]` hotkey).
- **30-Realm & Era-20 Progression Controls**: Extends `CULTIVATION_REALMS` to 30 realms (Indices `0..29`) and Castle Levels `1..200` (Eras `0..20`), updating the suppression verifier, breakthrough simulator, and 3D Citadel astrolabe rings dynamically.
- **Post-Quantum Save Vault (`v2030.1`) & Snapshot Manager**: Computes dual SHA-256 + `LWE-2030` lattice seals, verifies integrity on import, auto-upgrades legacy `v1.5.0` payloads, and provides a **Snapshot Rollback Manager** to capture and restore named state checkpoints at any time.
- **Supreme GM 2030 Console (`creatergame31@gmail.com`)**:
  - **Predictive Recharts Telemetry**: Renders dual `recharts` charts showing actual vs. predicted 2030 server load, anomaly index, active shard population, and auto-scaling shard status.
  - **Batch Macro Script Runner & Scheduled Decrees**: Executes multi-line GM command scripts (e.g., batch spawning artifacts, teleporting all players, setting realms, kicking/banning rogue IDs) with a single click and manages scheduled server broadcast decrees.
  - **Cross-Shard Migration Controls**: Moves selected or all connected players between `Shard-Alpha-2030`, `Shard-Omega-Void`, and `Shard-Celestial-Siege` and broadcasts shard routing updates over `/ws`.
