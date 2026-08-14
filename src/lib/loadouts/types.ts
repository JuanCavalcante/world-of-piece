export const MOVE_TYPES = [
  "Ofensiva",
  "Passiva",
  "Suplementar",
  "Defensiva",
  "Reação",
] as const;
export type MoveType = (typeof MOVE_TYPES)[number] | "";

export const AKUMA_TYPES = [
  "Paramecia",
  "Zoan Normal",
  "Zoan Mítica",
  "Zoan Ancestral",
  "Logia",
] as const;
export type AkumaType = (typeof AKUMA_TYPES)[number] | "";

export type LoadoutMove = {
  id: string;
  image_url: string;
  name: string;
  type: string;
  tier: string;
  cost: string;
  description?: string;
};

export type LoadoutData = {
  image_url?: string;
  name?: string;
  tier?: string;
  extra_points?: string;
  current_user?: string;
  description?: string;
  akuma_type?: string;
  moves?: LoadoutMove[];
  variant_moves?: LoadoutMove[];
};

export const LOADOUT_SLOTS = [
  { id: "edl", field: "edl_data", label: "Estilo de Luta" },
  { id: "akuma", field: "akuma_data", label: "Akuma no Mi" },
  { id: "misc", field: "misc_data", label: "Misceâneas" },
] as const;

export type LoadoutSlot = (typeof LOADOUT_SLOTS)[number];
