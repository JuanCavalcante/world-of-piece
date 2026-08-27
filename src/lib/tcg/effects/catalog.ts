/**
 * Espelho das chaves do catálogo de efeitos no banco (`public.effects`),
 * semeadas pelas migrations 0062 e 0063.
 *
 * Mantenha esta lista sincronizada com o SQL: os testes garantem que toda
 * chave daqui tem handler em `HANDLED_EFFECT_KEYS` e vice-versa.
 */
export const CATALOG_EFFECT_KEYS = [
  // DANO
  "DAMAGE_ON_PLAY",
  "DAMAGE_PLAYER_ON_PLAY",
  "DAMAGE_ON_ATTACK",
  "SPLASH_ON_ATTACK",
  "DEBUFF_ATK",
  "SELF_DAMAGE_EOT",
  "IRREDUCIBLE_BONUS",
  "DAMAGE_REDUCTION",
  "THORNS",
  // BUFF / CURA
  "HEAL_ON_PLAY",
  "BUFF_MAX_HP",
  "BUFF_ATK",
  "AURA_BUFF_ATK",
  "AURA_BUFF_MAX_HP",
  "HEAL_SELF_EOT",
  "COPY_ATK_ON_PLAY",
  // STATUS
  "GRANT_STATUS",
  "CONDITIONAL_KEYWORD",
  "CLEANSE",
  "REMOVE_GUARD_ON_ATTACK",
  "IMMUNE_STATUS",
  "KEYWORD",
  // ESPECIAL
  "ON_ANY_DEATH_TRIGGER",
] as const;

export type CatalogEffectKey = (typeof CATALOG_EFFECT_KEYS)[number];

/** Status catalogados em `public.status_effects`. */
export const CATALOG_STATUS_KEYS = [
  "RUSH",
  "GUARD",
  "STEALTH_UNTIL_ATTACK",
  "STEALTH_TEMP",
  "STEALTH",
  "LAZY",
  "SLEEP",
  "POISON",
  "IMMOBILIZED",
  "DISTRACTED",
] as const;
