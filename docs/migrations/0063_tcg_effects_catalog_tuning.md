# 0063 — Ajustes finais do catálogo de efeitos (Effect Engine v2)

Complementa a `0062`. Não cria tabelas; apenas amplia alvos/opções do catálogo
para cobrir os 45 efeitos mapeados em `docs/tcg-effects-45-mapping.md`.

**Pré-requisito**: a migration `0062` já aplicada.

## Bloco 1 — GRANT_STATUS também em inimigos (Preguiça, Sono, Veneno)

```sql
update public.effects
set allowed_targets = '{SELF,ALLY_CHOSEN,ALL_ALLIES,ENEMY_CHOSEN,ALL_ENEMIES}',
    allowed_triggers = '{ON_PLAY,ON_ATTACK_RESOLVED}',
    params_schema = params_schema || jsonb_build_object(
      'duration', jsonb_build_object(
        'type','enum',
        'options', jsonb_build_array('PERMANENT','WHILE_IN_PLAY','UNTIL_NEXT_TURN','END_OF_TURN','N_TURNS'),
        'default','PERMANENT',
        'label','Duração'
      ),
      'amount', jsonb_build_object('type','int','min',1,'max',9,'default',1,'label','Intensidade / turnos')
    ),
    updated_at = now()
where effect_key = 'GRANT_STATUS';
```

## Bloco 2 — Cura ao entrar pode ter alvo inimigo? Não. Apenas amplia duração do BUFF_ATK

```sql
update public.effects
set allowed_triggers = '{ON_PLAY,ON_ATTACK_DECLARED,ON_ATTACK_RESOLVED,ON_START_TURN}',
    updated_at = now()
where effect_key = 'BUFF_ATK';

update public.effects
set allowed_triggers = '{ON_PLAY,ON_START_TURN,ON_END_TURN}',
    updated_at = now()
where effect_key = 'HEAL_ON_PLAY';
```

## Bloco 3 — Regeneração no fim do turno com condição de custo

```sql
update public.effects
set description = 'No fim do turno do dono, esta carta recupera HP (pode exigir condição, ex.: custo mínimo).',
    updated_at = now()
where effect_key = 'HEAL_SELF_EOT';
```

## Notas

- Nenhuma alteração destrutiva: só `UPDATE` em linhas do catálogo.
- O handler `HEAL_SELF_EOT` estava catalogado sem implementação no motor;
  foi implementado nesta etapa (`src/lib/tcg/effects/registry.ts`).
- Um teste automatizado (`src/lib/tcg/effects/catalog.test.ts`) agora falha
  se algum `effect_key` do catálogo ficar sem handler.
