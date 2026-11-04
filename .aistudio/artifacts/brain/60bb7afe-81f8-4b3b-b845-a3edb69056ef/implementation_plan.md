# ShadowRealm: Voxel Realms 5-Pillar Architectural Expansion Plan

This plan outlines the full architecture and implementation roadmap for expanding **ShadowRealm** across all five core game development pillars while adhering strictly to the **Architect-First** decouple rules, automated CI/test coverage, and C++20 guardrail standards.

> [!IMPORTANT]
> **Confirmed Scope & Architectural Decisions**
> - **All 5 Architectural Pillars Included**: We will implement the **Four-Path Cultivation & Realm Suppression Math Modules**, **Procedural Delve Engine (BSP + WFC Dungeons)**, **Multiplayer 50v50 Siege WebSocket Sync with Delta Compression**, **Branching Xianxia Dialogue & Karma/Lineage Engine**, **Hierarchical Squad AI & GOAP/Threat Tables**, and **C++20 Engine Guardrails & SIMD Pathfinding Benchmarks** with unit test suites.
> - **Dual-Mode 2D Tactical + 3D Voxel Realms Viewport**: The application will seamlessly bridge the existing **2D Phaser Tactical Realm & Shadow Radar Mini-Map** with a toggleable **3D Three.js Voxel Realms & Procedural Dungeon Delve Viewport**, unified under a semantic dark-obsidian Xianxia HUD dock.
> - **Three-Tier Persistence Architecture**: Player cultivation state, active dungeon delves, and castle siege telemetry will persist via (1) **Local Save Serialization with SHA-256 Integrity Checksums**, (2) **Portable JSON Schema Export/Import**, and (3) **Real-Time Server-Side `/ws` WebSocket State Sync** across connected party and siege clients.

---

## 1. Overview & Core Concept

**ShadowRealm — Voxel Realms RPG** combines a dark-fantasy Immortal Xianxia cultivation sandbox with large-scale tactical territory warfare. All core gameplay formulas, procedural generators, AI planners, dialogue interpreters, and network packet serializers are designed as **pure, framework-agnostic TypeScript modules** (backed by native **C++20 header/benchmark modules**), completely decoupled from the rendering layer so they can be verified deterministically via automated unit tests and Monte Carlo combat simulations.

Players can explore the overworld and coordinate party maneuvers using the **Shadow Radar Mini-Map & Party Ping System**, switch at any time into the **3D Three.js Voxel Terrain & Procedural Dao Grotto Delve Viewport**, break through 23 Immortal Realms across four cultivation paths, converse with sect elders through conditional branching dialogues, command troop formations in **50v50 delta-compressed castle sieges**, and validate save integrity through cryptographic SHA-256 checksums.

---

## 2. User Experience & Visual Design

### Viewport Budget & Semantic Layering
- **85%+ Unobstructed Canvas Allocation**: Whether viewing the **2D Phaser Overworld** or the **3D Three.js Voxel Citadel & Dungeon Delve**, the primary interactive viewport fills `100vw × 100vh` with zero page scrollbars.
- **Semantic Floating HUD & Collapsible Command Dock**:
  - **Top-Right**: The existing **Shadow Radar Mini-Map** (`[M]` toggle, `[N]` expand, click/Alt+click Party Ping radial menu, live dungeon entrance & siege objective beacons).
  - **Top-Left**: Compact **Immortal Cultivator Plaque** showing current Major Realm (e.g., *Golden Core — Layer 9*), Karma Alignment Aura (*Green Righteous*, *Neutral*, or *Red Blood-Fiend*), Four-Path resonance bars (*Qi, Body, Soul, Mind*), and Trillion-Scale Army Power badge.
  - **Bottom Command Dock**: A sleek, collapsible glassmorphic command bar (`[1]` Cultivation & Breakthroughs, `[2]` Procedural Dungeon Delve & 3D Voxel Switcher, `[3]` 50v50 Castle Siege & Squad Formations, `[4]` Sect Dialogue & Karma Chronicle, `[5]` Save Vault & Combat Simulator). Opening any modal pauses background pointer capture cleanly and dims the canvas with a subtle backdrop blur.

### Atmospheric Polarity & Color Palette (60-30-10 Rule)
- **60% Primary Canvas & Obsidian Surfaces**: Deep Void Obsidian (`#080A10`) and Sect Slate (`#0E131F` at `80%` opacity with `backdrop-filter: blur(12px)`).
- **30% Structural Trim & Text Hierarchy**: Celestial Alabaster (`#F8FAFC`) for primary headings and tabular stats, Mist Silver (`#94A3B8`) for lore descriptions, and Hairline Jade/Gold borders (`1px solid rgba(212, 175, 55, 0.22)`).
- **10% Semantic Xianxia & Tactical Accents**:
  - **Immortal Gold (`#F59E0B`)**: Realm breakthroughs, Citadel Era upgrades, and Master-Disciple lineage decrees.
  - **Spirit Qi Cyan (`#06B6D4`)**: Qi flow, A* / WFC dungeon portals, and Move pings.
  - **Tribulation Crimson (`#EF4444`)**: Red-name Karma penalties, Heavenly Tribulation lightning telegraphs, and Siege Attack vectors.
  - **Jade Vitality (`#10B981`)**: Righteous Karma alignment, Poisson-disk spirit herb nodes, and Defend formations.

### Typography & Scannable Hierarchy
- **Display & Realm Headers**: High-authority serif/geometric display styling (`Cinzel` / `Chakra Petch` aesthetic, uppercase tracking `0.08em`) for Realm titles, Dungeon floor banners, and Siege phase callouts.
- **Numeric Discipline**: Strict `font-variant-numeric: tabular-nums` across all Trillion-scale power counters, $10^{\Delta\text{Realm}}$ suppression multipliers, delta-packet telemetry, and SHA-256 checksum hashes.

### 3D Three.js Voxel & Dungeon Viewport Standards
- **Three-Point Atmospheric Lighting**: Warm directional Key Light (sun/torchlight), cool ambient Fill Light, and sharp Rim Light separating the tiered Voxel Citadel (Eras 0–10 with rotating astrolabe rings), Gerstner wave water, and procedural dungeon masonry from the exponential distance fog (`scene.fog`).
- **Runtime PBR Canvas Synthesis**: Deterministic procedural generation of Albedo, Normal, Roughness, and Ambient Occlusion maps for chiseled grotto stone, spirit-infused jade, glazed sect roof tiles, and Damascus steel.
- **WebGL Context Safety**: Automatic `webglcontextlost` and `webglcontextrestored` handlers so switching between 2D Phaser and 3D Three.js viewports never leaks GPU buffers or leaves an unstyled black void.

---

## 3. Key Product Decisions & Trade-Offs

1. **Pure Functional Core vs. Coupled Scene Logic**:
   - *Decision*: Every mathematical formula, procedural dungeon algorithm, GOAP planner, dialogue evaluator, and delta-compression codec is implemented as a pure, zero-DOM TypeScript module with deterministic PRNG seeding.
   - *Rationale*: Enables 100% deterministic unit tests, Monte Carlo combat balance sweeps, and instant parity with the C++20 `constexpr` guardrail suite without spinning up a browser or WebGL context.
2. **Hybrid BSP + Wave Function Collapse (WFC) Dungeon Generator**:
   - *Decision*: Combine **Binary Space Partitioning (BSP)** for macro-level room hierarchy (Entry Hall → Spirit Vein Sanctum → Tribulation Boss Chamber) with **Wave Function Collapse (WFC)** tile adjacency rules for micro-level corridors, Daoist陣法 (array formations), river/lava channels, and secret chambers.
   - *Rationale*: Pure WFC can occasionally fail to guarantee boss pathing on large grids, while pure BSP feels overly boxy. Combining macro BSP partitioning with micro WFC constraint propagation guarantees 100% solvable A* paths from entrance to boss while preserving rich organic grotto patterns.
3. **50v50 Siege Sync via Quantized Delta-Compression & Client Prediction**:
   - *Decision*: Instead of broadcasting full snapshots of 100 commander cohorts and castle HP every tick, the `/ws` server maintains an authoritative tick loop (`20 Hz`) and transmits **XOR/diff delta frames** containing only changed entity bitmasks, quantized positions, squad formation states, and sequence numbers for client-side interpolation and reconciliation.
   - *Rationale*: Reduces WebSocket payload bandwidth by >80% during 50v50 territory sieges and keeps party mini-map pings and siege engines synchronized across tabs and connected clients.
4. **Tamper-Evident Three-Tier Persistence**:
   - *Decision*: Combine Web Crypto / deterministic SHA-256 integrity hashing over canonicalized JSON payloads with schema version migration (`v1.5.0`), local storage auto-save, downloadable/importable JSON scrolls, and live `/ws` server state mirroring.
   - *Rationale*: Prevents trivial save-file tampering of cultivation realms or spirit stone reserves while giving players full portability and live multi-client continuity.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     SHADOWREALM UNIFIED CLIENT INTERFACE                     │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌─────────────┐  │
│  │ 2D Phaser Tactical View │  │ 3D Three.js Voxel / Delve│  │ Xianxia HUD │  │
│  │ + Shadow Radar Mini-Map │◄─┤ Viewport (Citadel + BSP/ │─►│ & Command   │  │
│  │ + Party Ping Beacons    │  │ WFC Grotto + PBR Meshes) │  │ Modals      │  │
│  └────────────┬────────────┘  └─────────────┬────────────┘  └──────┬──────┘  │
└───────────────┼─────────────────────────────┼──────────────────────┼─────────┘
                │                             │                      │
                ▼                             ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                DECOUPLED PURE TYPESCRIPT GAMEPLAY & MATH ENGINE              │
│  ┌──────────────────────┐ ┌────────────────────────┐ ┌────────────────────┐  │
│  │ Pillar 1 & 5: Math   │ │ Pillar 2: Procedural   │ │ Pillar 3: AI &     │  │
│  │ • 4-Path Cultivation │ │ • BSP + WFC Dungeons   │ │   Life Simulation  │  │
│  │ • 10^ΔRealm Suppress │ │ • Simplex + Erosion    │ │ • Squad Formations │  │
│  │ • Trillion Power     │ │ • Poisson-Disk Nodes   │ │ • NPC GOAP Planner │  │
│  │ • Monte Carlo Sim    │ │ • Runtime PBR Synthesis│ │ • Multi-Aggro Table│  │
│  └──────────────────────┘ └────────────────────────┘ └────────────────────┘  │
│  ┌────────────────────────────────────┐ ┌─────────────────────────────────┐  │
│  │ Pillar 4: Narrative, Lore & Quests │ │ Pillar 1: Netcode & Persistence │  │
│  │ • Branching Dialogue Graph Engine  │ │ • 50v50 Delta-Packet Serializer │  │
│  │ • Karma & Tribulation Cataclysms   │ │ • Client Prediction & Reconcile │  │
│  │ • Master-Disciple & Faction Matrix │ │ • SHA-256 Checksum Save Vault   │  │
│  └────────────────────────────────────┘ └────────────────┬────────────────┘  │
└──────────────────────────────────────────────────────────┼───────────────────┘
                                                           │ WebSocket (/ws)
                ┌──────────────────────────────────────────┴───────────────────┐
                ▼                                                              ▼
┌───────────────────────────────────────┐    ┌─────────────────────────────────┐
│ VITE /WS AUTHORITATIVE SIEGE & PARTY  │    │ C++20 ENGINE GUARDRAILS & SIMD  │
│ SERVER                                │    │ • VoxelRealmsGuardrails.hpp     │
│ • 50v50 Siege State & Delta Broadcast │    │ • static_assert(10^2 == 100.0)  │
│ • Party Ping & Persistence Sync       │    │ • SIMD A* & ECS Benchmarks      │
└───────────────────────────────────────┘    └─────────────────────────────────┘
```

### Detailed Pillar Specifications

#### Pillar 1 & 5: Decoupled Architecture, Four-Path Cultivation, Trillion-Scale Balance & Persistence
- **Realm Suppression Formula**:
  $$\text{SuppressionMultiplier}(\Delta R) = 10^{\Delta R}$$
  Verified across both TypeScript unit tests and C++20 `static_assert` so a **Golden Core** cultivator ($\text{Realm } 2$) inflicts exactly $10^{2 - 0} = 100\times$ damage against a **Qi Refinement** cultivator ($\text{Realm } 0$), while incoming damage from the lower realm is mitigated by $10^{-2} = 0.01\times$.
- **Four-Path Immortal Progression**: Tracks **Qi, Body, Soul, and Mind** across **23 Major Realms** (Mortal → Immortal & Sage → Great Dao Chaos → Ultimate Origin) and **9 Layers** per realm, with cross-path resonance bonuses and Heavenly Tribulation breakthrough probabilities.
- **Multiplicative Trillion-Scale Power & Troop Counter Matrix**:
  - Evaluates army power up to **1,000 Trillion troops** and **1 Trillion rally cohorts** using Castle Era multipliers ($1\times$ to $100\times$), Hero rarity tiers, VIP subscription modifiers, and 7-day cyclical login scaling.
  - Enforces the Rock-Paper-Scissors counter matrix (**Shieldbearer** $>$ **Shooter** $>$ **Bomber** $>$ **Shieldbearer**) plus diminishing-returns armor mitigation:
    $$\text{Mitigation}(A) = \frac{A}{A + K_{\text{era}}}$$
    preventing zero-damage invulnerability edge cases.
- **Monte Carlo Combat Simulator & Economic Sinks**: Runs 1,000+ automated battle iterations across configurable troop ratios and spirit stone inflation sinks to expose win-rate confidence intervals and resource velocity curves.
- **SHA-256 Schema-Versioned Save Serialization**: Serializes full game state into a canonical envelope `{ version, timestamp, payload, checksum }`. On load or import, recomputes the SHA-256 digest and rejects tampered payloads with a clear diagnostic report.

#### Pillar 2: Procedural Delve Engine, River Erosion & 3D Voxel World
- **Procedural Dungeon Generator (BSP + WFC)**:
  - **Themes**: *Ancient Dao Grotto*, *Nine-Nether Secret Realm*, and *Heavenly Tribulation Chamber*.
  - **Macro BSP Tree**: Recursively splits the 3D dungeon grid into rooms (Entrance Shrine, Spirit Herb Vault, Guardian Barracks, Inner Demon Altar, Apex Boss Sanctum) and connects sibling leaf nodes with L-corridors.
  - **Micro WFC Solver**: Populates room interiors and hazards using adjacency constraints (floor tiles, spirit arrays, chasm bridges, treasure chests, and boss telegraphs) and validates solvability with an A* reachability check.
- **Terrain Simplex Noise, Hydraulic Erosion & Poisson-Disk Spawning**:
  - Generates elevation and moisture maps carved by droplet-based hydraulic erosion for natural river basins.
  - Uses **Bridson's Poisson-Disk Sampling** to distribute spirit stone veins, ancient herbs, and monster lairs with guaranteed minimum separation radii modulated by territory ownership and active weather (*Clear, Spirit Mist, Thunderstorm, Blood Moon*).
- **Interactive 3D Three.js Viewport**: Renders the procedural dungeon delve or the 40×40 chunked Voxel Citadel directly in WebGL with orbit/follow camera controls, instanced voxel meshes, procedural PBR canvas textures, and live player/boss markers synced with the HUD mini-map.

#### Pillar 3: AI & Life Simulation (Squad Formations, GOAP & Threat Tables)
- **Lv. 1–1000 Monster Complexity Brackets**: Scales monster AI across 5 brackets (`bracket_1_feral` through `bracket_5_apex_titan`) with dynamic weather adaptation (feral beasts seek canopy shelter in storms; Apex Titans siphon lightning for $+55\%$ attack power).
- **Hierarchical Squad AI & Formations**:
  - Supports **Shield Wall** ($+40\%$ frontal mitigation, $-25\%$ move speed), **Wedge Charge** ($+35\%$ breakthrough impact, flanking bonus), and **Loose Skirmish** ($-45\%$ AoE Bomber vulnerability, $+20\%$ ranged cadence).
- **Goal-Oriented Action Planning (GOAP) for Autonomous NPCs**:
  - Evaluates minimum-cost action sequences using A* over world preconditions and effects (e.g., `InspectTreasury` $\rightarrow$ `NavigateToSpiritMine` $\rightarrow$ `ExtractSpiritOre` $\rightarrow$ `SmeltCelestialIngots` $\rightarrow$ `DepositToCitadel`).
- **Dynamic Multi-Target Threat & Aggro Table**:
  - Computes real-time threat scores per combatant based on raw DPS output (Shooters), taunt multipliers ($3.5\times$ from Shieldbearers), and spirit healing enmity (Mystics), with distance decay and boss phase aggro resets.

#### Pillar 4: Narrative, Lore & Quest Systems
- **Type-Safe Branching Dialogue Engine**:
  - Evaluates JSON/Yarn-style dialogue graphs where nodes and player choices support conditional predicates on `minRealm`, `karmaAlignment` (*Green, Neutral, Red*), `clanRank`, `factionStanding`, and `masterLineage`.
  - Executes state-mutating outcomes (granting skill scrolls like *Heaven Earth Sleeve*, triggering Tribulation Lightning, adjusting sect reputation, or launching a Radiant Quest).
- **Karma, Master-Disciple Lineage & Faction Reputation Matrix**:
  - Tracks righteous deeds vs. unprovoked PK penalties (Red-name bounty broadcasts, stationary Heavenly Tribulation strikes, and equipped artifact drop risk).
  - Models Master-Disciple proximity cultivation buffs ($+40\%$ to $+120\%$) and spirit stone taxation ($5\%$–$50\%$), alongside a 5-Sect Reputation Matrix (*Azure Cloud Sect, Crimson Furnace Pavilion, Myriad Sword Valley, Shadow Nether Hall, Imperial Citadel*) unlocking secret manuals and merchant discounts.

#### Pillar 1 & 4 Native C++20 Guardrails & SIMD Pathfinding Expansion
- **`cpp/VoxelRealmsGuardrails.hpp` & `cpp/engine_guardrail_test.cpp`**:
  - Enforces modern C++20 smart-pointer ownership (`std::unique_ptr` / `std::shared_ptr`), `constexpr` Realm Suppression verification (`static_assert(CalculateRealmSuppression(2, 0) == 100.0)`), and structure-of-arrays (SoA) cache-aligned ECS buffers for SIMD batch pathfinding and flocking benchmarks.

---

## 5. Verification & Automated Testing Strategy

- **Unit & Property Test Suite**: Comprehensive test coverage validating the BSP/WFC dungeon generator (room connectivity, A* boss reachability, deterministic seed replay), $10^{\Delta\text{Realm}}$ suppression math, troop counter matrix, GOAP action planner, branching dialogue evaluator, delta-packet compression/decompression, and SHA-256 save tamper detection.
- **TypeScript & Build Verification**: Full `tsc --noEmit` and Vite production build checks (`compile_applet`) ensuring zero compilation or runtime errors across both the 2D Phaser Tactical scene, the 3D Three.js Voxel/Delve viewport, and the `/ws` multiplayer server.
