export const HAKI_TIERS = [
  "TIER_II",
  "TIER_III",
  "TIER_IV",
  "TIER_V",
  "TIER_VI",
  "TIER_VII",
  "TIER_VIII",
  "TIER_IX",
  "TIER_X",
  "TIER_XX",
] as const;
export type HakiTier = (typeof HAKI_TIERS)[number];

export const HAKI_TIER_LABELS: Record<HakiTier, string> = {
  TIER_II: "Tier II",
  TIER_III: "Tier III",
  TIER_IV: "Tier IV",
  TIER_V: "Tier V",
  TIER_VI: "Tier VI",
  TIER_VII: "Tier VII",
  TIER_VIII: "Tier VIII",
  TIER_IX: "Tier IX",
  TIER_X: "Tier X",
  TIER_XX: "Tier XX",
};

export const HAKI_TIER_ORDER: Record<HakiTier, number> = {
  TIER_II: 2,
  TIER_III: 3,
  TIER_IV: 4,
  TIER_V: 5,
  TIER_VI: 6,
  TIER_VII: 7,
  TIER_VIII: 8,
  TIER_IX: 9,
  TIER_X: 10,
  TIER_XX: 20,
};

export const HAKI_STATES = ["Dormente", "Despertado", "Controlado"] as const;
export type HakiState = (typeof HAKI_STATES)[number];

export type HakiAbility = {
  tier: HakiTier;
  title: string;
  body: string;
};

export type HakiData = {
  id: string;
  name: string;
  image: string;
  description: string;
  abilities: HakiAbility[];
};
