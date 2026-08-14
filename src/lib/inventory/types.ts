export const ITEM_TIERS = [
  "TIER_I", "TIER_II", "TIER_III", "TIER_IV", "TIER_V",
  "TIER_VI", "TIER_VII", "TIER_VIII", "TIER_IX", "TIER_X", "TIER_XX",
] as const;
export type ItemTier = (typeof ITEM_TIERS)[number];

export const TIER_LABELS: Record<ItemTier, string> = {
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

export const TIER_STYLES: Record<ItemTier, { border: string; text: string; glow: string }> = {
  TIER_I:    { border: "border-parchment/30",   text: "text-parchment/70", glow: "shadow-none" },
  TIER_II:   { border: "border-emerald-400/50", text: "text-emerald-300",  glow: "shadow-emerald-500/10" },
  TIER_III:  { border: "border-sky-400/50",     text: "text-sky-300",      glow: "shadow-sky-500/10" },
  TIER_IV:   { border: "border-violet-400/50",  text: "text-violet-300",   glow: "shadow-violet-500/10" },
  TIER_V:    { border: "border-fuchsia-400/50", text: "text-fuchsia-300",  glow: "shadow-fuchsia-500/10" },
  TIER_VI:   { border: "border-amber-400/60",   text: "text-amber-300",    glow: "shadow-amber-500/15" },
  TIER_VII:  { border: "border-orange-400/60",  text: "text-orange-300",   glow: "shadow-orange-500/15" },
  TIER_VIII: { border: "border-gold/70",        text: "text-gold",         glow: "shadow-yellow-500/20" },
  TIER_IX:   { border: "border-red-400/60",     text: "text-red-300",      glow: "shadow-red-500/20" },
  TIER_X:    { border: "border-rose-500/70",    text: "text-rose-300",     glow: "shadow-rose-500/25" },
  TIER_XX:   { border: "border-cyan-300/80",    text: "text-cyan-200",     glow: "shadow-cyan-400/30" },
};

export const ITEM_CATEGORIES = [
  "EQUIPAMENTO", "CONSUMIVEL", "AKUMA", "LIVRO", "TECNICA",
  "MOEDA", "MATERIAL", "PROFISSAO", "PET", "NAVIO",
  "RECOMPENSA", "PRESENTE", "BAU", "EVENTO", "OUTRO",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  EQUIPAMENTO: "Equipamento",
  CONSUMIVEL: "Consumível",
  AKUMA: "Akuma no Mi",
  LIVRO: "Livro",
  TECNICA: "Técnica",
  MOEDA: "Moeda",
  MATERIAL: "Material",
  PROFISSAO: "Profissão",
  PET: "Pet",
  NAVIO: "Navio",
  RECOMPENSA: "Recompensa",
  PRESENTE: "Presente",
  BAU: "Baú",
  EVENTO: "Evento",
  OUTRO: "Outro",
};

export type InventoryStatus = "AVAILABLE" | "PENDING_ACTIVATION" | "ACTIVATED" | "REMOVED";

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category: ItemCategory;
  tier: ItemTier;
  stackable: boolean;
  created_at: string;
};

export type PlayerInventoryRow = {
  id: string;
  player_id: string;
  item_id: string;
  quantity: number;
  status: InventoryStatus;
  created_at: string;
  item: InventoryItem;
};

export type ActivationRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
  character_name: string;
  quantity: number;
  player_id: string;
  player_email: string;
  item_id: string;
  item_name: string;
  item_image_url: string | null;
  item_tier: ItemTier;
};
