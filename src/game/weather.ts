// Pure Weather State Machine, Resource Multipliers & Monster Weather Adaptation

export type WeatherType =
  | 'clear_sky'
  | 'spirit_mist'
  | 'thunderstorm'
  | 'blood_moon'
  | 'spatial_gale';

export interface WeatherDescriptor {
  type: WeatherType;
  label: string;
  description: string;
  resourceGatherMultiplier: number;
  qiAbsorptionMultiplier: number;
  feralMonsterBehavior: 'prowl' | 'cower_under_canopy' | 'frenzy';
  apexTitanAttackMultiplier: number;
  visibilityFactor: number;
  particleDensity: number;
}

export const WEATHER_CATALOG: Record<WeatherType, WeatherDescriptor> = {
  clear_sky: {
    type: 'clear_sky',
    label: 'Celestial Clear Sky',
    description: 'Warm solar yang essence illuminates the realm; balanced gathering and visibility.',
    resourceGatherMultiplier: 1.0,
    qiAbsorptionMultiplier: 1.0,
    feralMonsterBehavior: 'prowl',
    apexTitanAttackMultiplier: 1.0,
    visibilityFactor: 1.0,
    particleDensity: 120,
  },
  spirit_mist: {
    type: 'spirit_mist',
    label: 'Dense Spirit Mist',
    description: 'Immortal spirit fog condenses herbs and spirit veins (+35% gathering, +45% Qi absorption).',
    resourceGatherMultiplier: 1.35,
    qiAbsorptionMultiplier: 1.45,
    feralMonsterBehavior: 'prowl',
    apexTitanAttackMultiplier: 1.1,
    visibilityFactor: 0.72,
    particleDensity: 450,
  },
  thunderstorm: {
    type: 'thunderstorm',
    label: 'Heavenly Thunderstorm',
    description: 'Feral packs cower under forest canopies, while Apex Titans siphon storm lightning for +55% Attack Power.',
    resourceGatherMultiplier: 1.15,
    qiAbsorptionMultiplier: 1.3,
    feralMonsterBehavior: 'cower_under_canopy',
    apexTitanAttackMultiplier: 1.55,
    visibilityFactor: 0.65,
    particleDensity: 800,
  },
  blood_moon: {
    type: 'blood_moon',
    label: 'Crimson Blood Moon',
    description: 'Yin fiend aura surges across ancient battlefields; monsters enter frenzy and drop +50% essence.',
    resourceGatherMultiplier: 1.5,
    qiAbsorptionMultiplier: 1.2,
    feralMonsterBehavior: 'frenzy',
    apexTitanAttackMultiplier: 1.35,
    visibilityFactor: 0.6,
    particleDensity: 520,
  },
  spatial_gale: {
    type: 'spatial_gale',
    label: 'Void Spatial Gale',
    description: 'Dimensional winds expose rare Dao fragments and accelerate movement along road corridors.',
    resourceGatherMultiplier: 1.25,
    qiAbsorptionMultiplier: 1.15,
    feralMonsterBehavior: 'cower_under_canopy',
    apexTitanAttackMultiplier: 1.25,
    visibilityFactor: 0.8,
    particleDensity: 650,
  },
};

export function evaluateWeatherImpact(
  weather: WeatherType,
  monsterBracket: number
): {
  gatherMultiplier: number;
  monsterAttackMultiplier: number;
  monsterDirective: string;
} {
  const desc = WEATHER_CATALOG[weather] || WEATHER_CATALOG.clear_sky;
  const isApex = monsterBracket >= 4;
  const isFeral = monsterBracket === 1;

  let monsterAttackMultiplier = 1.0;
  let monsterDirective = 'Standard territory patrol';

  if (weather === 'thunderstorm') {
    if (isFeral) {
      monsterAttackMultiplier = 0.75;
      monsterDirective = 'Cowering under ancient canopy shelter (-25% aggro)';
    } else if (isApex) {
      monsterAttackMultiplier = desc.apexTitanAttackMultiplier; // 1.55 (+55%)
      monsterDirective = 'Siphoning Heavenly Storm Lightning (+55% Attack Power)';
    }
  } else if (weather === 'blood_moon') {
    monsterAttackMultiplier = isApex ? 1.35 : 1.2;
    monsterDirective = 'Blood Moon Frenzy (+20% speed & aggression)';
  }

  return {
    gatherMultiplier: desc.resourceGatherMultiplier,
    monsterAttackMultiplier,
    monsterDirective,
  };
}
