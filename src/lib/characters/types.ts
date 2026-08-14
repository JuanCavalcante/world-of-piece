export const ORGANIZATIONS = [
  "Pirata",
  "Marinheiro",
  "Governo",
  "Revolucionário",
  "Rosa Negra",
  "Caçador",
  "Nenhuma Afiliação",
] as const;
export type Organization = (typeof ORGANIZATIONS)[number];

export const GENDERS = [
  "Homem",
  "Mulher",
  "Homem Transgênero",
  "Mulher Transgênero",
  "Não-Binário",
  "Agênero",
  "Gênero-Fluido",
  "Bigênero",
] as const;
export type Gender = (typeof GENDERS)[number];

export const SEXUALITIES = [
  "Heterossexual",
  "Homossexual",
  "Bissexual",
  "Pansexual",
  "Polissexual",
  "Assexual",
  "Antrosexual",
  "Demissexual",
  "Grissexual",
  "Frigosexual",
  "Acoissexual",
  "Reciprosexual",
  "Androssexual",
  "Ginessexual",
  "Ceterosexual",
  "Skoliosexual",
  "Onissexual",
] as const;
export type Sexuality = (typeof SEXUALITIES)[number];

export const ATTRIBUTES = [
  { key: "forca", label: "Força" },
  { key: "combate", label: "Combate" },
  { key: "agilidade", label: "Agilidade" },
  { key: "precisao", label: "Precisão" },
  { key: "vigor", label: "Vigor" },
  { key: "inteligencia", label: "Inteligência" },
  { key: "percepcao", label: "Percepção" },
  { key: "vontade", label: "Força de Vontade" },
  { key: "espirito", label: "Espírito" },
] as const;
export type AttributeKey = (typeof ATTRIBUTES)[number]["key"];
export const ATTR_PARTS = ["base", "passivo", "equip", "treino"] as const;
export type AttributePart = (typeof ATTR_PARTS)[number];

export type Character = {
  id: string;
  user_id: string;
  slot: number;
  is_active: boolean;

  name: string | null;
  title: string | null;
  level: number;
  xp_current: number;
  xp_max: number;
  gender: string | null;
  age: number | null;
  coins: number;
  crew: string | null;
  fighting_style: string | null;
  sexuality: string | null;
  organization: Organization | null;

  portrait_url: string | null;
  wanted_poster_url: string | null;
  flag_url: string | null;

  profession_1: string | null;
  profession_2: string | null;
  profession_1_tier: string | null;
  profession_1_xp_current: number;
  profession_1_xp_max: number;
  profession_1_specialization: string | null;
  profession_1_domain: string | null;
  profession_2_tier: string | null;
  profession_2_xp_current: number;
  profession_2_xp_max: number;
  profession_2_specialization: string | null;
  profession_2_domain: string | null;
  haki_armamento_tier: string | null;
  haki_armamento_state: string | null;
  haki_observacao_tier: string | null;
  haki_observacao_state: string | null;
  haki_conquistador_tier: string | null;
  haki_conquistador_state: string | null;
  edl_data: Record<string, unknown> | null;
  akuma_data: Record<string, unknown> | null;
  misc_data: Record<string, unknown> | null;
  race: string | null;
  race_image_url: string | null;
  race_description: string | null;
  history: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
} & Record<`attr_${AttributeKey}_${AttributePart}`, number>;

export type CharacterPatch = Partial<Omit<Character, "id" | "user_id" | "created_at" | "updated_at">>;

export function attrCol(key: AttributeKey, part: AttributePart) {
  return `attr_${key}_${part}` as keyof Character;
}
