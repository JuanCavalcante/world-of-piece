export const PROFESSION_TIERS = [
  "INICIAL",
  "TIER_I",
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
export type ProfessionTier = (typeof PROFESSION_TIERS)[number];

export const TIER_LABELS: Record<ProfessionTier, string> = {
  INICIAL: "Inicial",
  TIER_I: "Tier I",
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

export const TIER_ORDER: Record<ProfessionTier, number> = {
  INICIAL: 0,
  TIER_I: 1,
  TIER_II: 2,
  TIER_III: 3,
  TIER_IV: 4,
  TIER_V: 5,
  TIER_VI: 6,
  TIER_VII: 7,
  TIER_VIII: 8,
  TIER_IX: 9,
  TIER_X: 10,
  TIER_XX: 11,
};

export type Ability = {
  tier: ProfessionTier;
  title: string;
  body: string;
};

export type Domain = {
  id: string;
  name: string;
  description: string;
  abilities: Ability[]; // Tier VIII → XX
};

export type Specialization = {
  id: string;
  name: string;
  description: string;
  abilities: Ability[]; // Tier IV → VII
  domains: Domain[];
};

export type ProfessionData = {
  id: string;
  name: string;
  description: string;
  initialAbilities: Ability[]; // Inicial → Tier III
  specializations: Specialization[];
};

export type ProfessionMeta = {
  id: string;
  name: string;
  hasContent: boolean;
  image?: string | null;
};
