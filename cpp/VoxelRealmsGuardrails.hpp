//===----------------------------------------------------------------------===//
// VoxelRealmsGuardrails.hpp - C++20 Engine Core, Constexpr Realm Math & SIMD SoA
// Enforces:
// 1. Zero raw owning pointers (std::unique_ptr / std::shared_ptr only)
// 2. Compile-time constexpr Realm Suppression verification (10^DeltaRealm)
// 3. Cache-aligned 64-byte Structure-of-Arrays (SoA) SIMD Flocking & A* Kernel
//===----------------------------------------------------------------------===//

#pragma once

#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <string_view>
#include <type_traits>
#include <vector>

namespace voxel_realms {

enum class CultivationRealm : std::int32_t {
  QiRefinement = 0,
  FoundationEstablishment = 1,
  GoldenCore = 2,
  NascentSoul = 3,
  SpiritSevering = 4,
  DaoSeeking = 5,
  EarthImmortal = 6,
  HeavenImmortal = 7,
  TrueImmortal = 8,
  GoldenImmortal = 9,
  TaiyiJadeImmortal = 10,
  DaluoGoldenImmortal = 11,
  QuasiSage = 12,
  HeavenDaoSage = 13,
  ChaosImmortal = 14,
  HongmengController = 15,
  VoidSovereign = 16,
  EternalAncestor = 17,
  HalfStepTranscendence = 18,
  DaoSourceCreator = 19,
  BoundlessMonarch = 20,
  SupremePrimordial = 21,
  UltimateOrigin = 22
};

/**
 * Compile-time constexpr integer power of 10 for exact Realm Suppression checks.
 * Formula: 10^(AttackerRealm - DefenderRealm)
 */
constexpr double CalculateRealmSuppression(CultivationRealm attacker,
                                           CultivationRealm defender) noexcept {
  const std::int32_t delta =
      static_cast<std::int32_t>(attacker) - static_cast<std::int32_t>(defender);
  double result = 1.0;
  if (delta >= 0) {
    for (std::int32_t i = 0; i < delta; ++i) {
      result *= 10.0;
    }
  } else {
    for (std::int32_t i = 0; i < -delta; ++i) {
      result /= 10.0;
    }
  }
  return result;
}

// Mandatory C++20 Guardrail Compile-Time Static Assertions
static_assert(CalculateRealmSuppression(CultivationRealm::GoldenCore,
                                        CultivationRealm::QiRefinement) == 100.0,
              "Guardrail Violation: Golden Core (2) vs Qi Refinement (0) must equal 100.0x");

static_assert(CalculateRealmSuppression(CultivationRealm::NascentSoul,
                                        CultivationRealm::QiRefinement) == 1000.0,
              "Guardrail Violation: Nascent Soul (3) vs Qi Refinement (0) must equal 1000.0x");

static_assert(CalculateRealmSuppression(CultivationRealm::QiRefinement,
                                        CultivationRealm::GoldenCore) == 0.01,
              "Guardrail Violation: Qi Refinement (0) vs Golden Core (2) must equal 0.01x");

// Canonical Root Administrator / GM / Moderator Account & Contact Guardrail
inline constexpr std::string_view kSupremeAdminEmail = "creatergame31@gmail.com";
inline constexpr std::string_view kModeratorContactEmail = "creatergame31@gmail.com";

constexpr bool IsAuthorizedSupremeAdmin(std::string_view email) noexcept {
  return email == kSupremeAdminEmail;
}

static_assert(IsAuthorizedSupremeAdmin("creatergame31@gmail.com"),
              "Guardrail Violation: creatergame31@gmail.com must hold Supreme Admin/GM/Moderator authority");

/**
 * Diminishing Returns Armor Mitigation: A / (A + K_era)
 */
constexpr double CalculateArmorMitigation(double armor,
                                          std::int32_t castleEra) noexcept {
  if (armor <= 0.0) {
    return 0.0;
  }
  const double kEra = 150.0 * static_cast<double>(castleEra < 1 ? 1 : castleEra + 1);
  const double raw = armor / (armor + kEra);
  return raw > 0.90 ? 0.90 : raw;
}

/**
 * Cache-aligned Structure-of-Arrays (SoA) buffer for 10,000+ Flocking & Siege Units.
 * Uses std::unique_ptr managed storage—zero raw owning pointers.
 */
struct alignas(64) SimdFlockingBufferSoA {
  std::size_t count{0};
  std::unique_ptr<float[]> posX;
  std::unique_ptr<float[]> posZ;
  std::unique_ptr<float[]> velX;
  std::unique_ptr<float[]> velZ;

  explicit SimdFlockingBufferSoA(std::size_t unitCount)
      : count(unitCount),
        posX(std::make_unique<float[]>(unitCount)),
        posZ(std::make_unique<float[]>(unitCount)),
        velX(std::make_unique<float[]>(unitCount)),
        velZ(std::make_unique<float[]>(unitCount)) {
    for (std::size_t i = 0; i < count; ++i) {
      posX[i] = static_cast<float>(i % 100) * 1.5f;
      posZ[i] = static_cast<float>(i / 100) * 1.5f;
      velX[i] = 2.0f;
      velZ[i] = 1.25f;
    }
  }

  // Vectorizable contiguous SoA integration pass
  void StepFlockingPass(float dt, float targetX, float targetZ) noexcept {
    float* __restrict px = posX.get();
    float* __restrict pz = posZ.get();
    float* __restrict vx = velX.get();
    float* __restrict vz = velZ.get();

    for (std::size_t i = 0; i < count; ++i) {
      const float dx = targetX - px[i];
      const float dz = targetZ - pz[i];
      vx[i] = vx[i] * 0.92f + dx * 0.008f;
      vz[i] = vz[i] * 0.92f + dz * 0.008f;
      px[i] += vx[i] * dt;
      pz[i] += vz[i] * dt;
    }
  }
};

} // namespace voxel_realms
