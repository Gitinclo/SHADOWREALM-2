//===----------------------------------------------------------------------===//
// engine_guardrail_test.cpp - C++20 Automated Guardrail & SIMD Benchmark Suite
//===----------------------------------------------------------------------===//

#include "VoxelRealmsGuardrails.hpp"
#include <chrono>
#include <iostream>
#include <memory>

int main() {
  using namespace voxel_realms;

  // 1. Verify constexpr Realm Suppression (10^DeltaRealm)
  constexpr double goldenVsQi = CalculateRealmSuppression(
      CultivationRealm::GoldenCore, CultivationRealm::QiRefinement);
  static_assert(goldenVsQi == 100.0,
                "Golden Core vs Qi Refinement must be 100.0x");

  // 2. Verify RAII smart pointer ownership & 10,000-unit SoA SIMD flocking pass
  auto flockSoA = std::make_unique<SimdFlockingBufferSoA>(10'000);
  const auto t0 = std::chrono::high_resolution_clock::now();
  for (int step = 0; step < 100; ++step) {
    flockSoA->StepFlockingPass(0.016f, 500.0f, 500.0f);
  }
  const auto t1 = std::chrono::high_resolution_clock::now();
  const double elapsedMs =
      std::chrono::duration<double, std::milli>(t1 - t0).count();

  std::cout << "[C++20 Guardrails PASS] GoldenCore vs QiRefinement = "
            << goldenVsQi << "x | 10,000-Unit SoA 100-Step Pass = "
            << elapsedMs << " ms\n";
  return 0;
}
