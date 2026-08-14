# Migração — WOP TCG (perfil do jogador, admin e cartas de teste)

> Rode **depois** de `0013_tcg.md`. Execute no **SQL Editor** do Supabase.

```sql
-- ============ PERFIL TCG DO JOGADOR ============
create table if not exists public.tcg_players (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check (level >= 1),
  xp integer not null default 0 check (xp >= 0),
  wins integer not null default 0,
  losses integer not null default 0,
  last_daily_reward_at timestamptz,
  created_at timestamptz not null default now()
);

grant select, insert, update on public.tcg_players to authenticated;
grant all on public.tcg_players to service_role;

alter table public.tcg_players enable row level security;

drop policy if exists "tcg_players self all"  on public.tcg_players;
drop policy if exists "tcg_players admin all" on public.tcg_players;

create policy "tcg_players self all"
  on public.tcg_players for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tcg_players admin all"
  on public.tcg_players for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- registra/garante o perfil TCG do usuário logado (chamado ao abrir /tcggame)
create or replace function public.tcg_ensure_player()
returns public.tcg_players
language plpgsql security definer set search_path = public as $$
declare r public.tcg_players;
begin
  insert into public.tcg_players (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
  select * into r from public.tcg_players where user_id = auth.uid();
  return r;
end $$;

grant execute on function public.tcg_ensure_player() to authenticated;

-- ============ ADMIN: LISTA DE JOGADORES DO TCG ============
drop function if exists public.admin_list_tcg_players();
create or replace function public.admin_list_tcg_players()
returns table(
  user_id uuid,
  email text,
  username text,
  level int,
  xp int,
  wins int,
  losses int,
  cards_count int,
  last_daily_reward_at timestamptz,
  created_at timestamptz
)
language sql security definer set search_path = public as $$
  select p.user_id,
         u.email::text,
         coalesce(u.raw_user_meta_data->>'username', '')::text,
         p.level, p.xp, p.wins, p.losses,
         (select coalesce(sum(uc.quantity), 0)::int from public.user_cards uc where uc.user_id = p.user_id),
         p.last_daily_reward_at,
         p.created_at
  from public.tcg_players p
  join auth.users u on u.id = p.user_id
  where public.has_role(auth.uid(), 'admin')
  order by p.created_at desc
$$;

grant execute on function public.admin_list_tcg_players() to authenticated;

-- ============ ADMIN: AÇÕES SOBRE O JOGADOR ============
create or replace function public.admin_tcg_reset_daily(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not authorized'; end if;
  update public.tcg_players set last_daily_reward_at = null where user_id = _user_id;
end $$;

create or replace function public.admin_tcg_adjust_level(_user_id uuid, _delta int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not authorized'; end if;
  update public.tcg_players
     set level = greatest(1, level + _delta)
   where user_id = _user_id;
end $$;

-- entrega um pacote de cartas aleatórias
create or replace function public.admin_tcg_give_pack(_user_id uuid, _size int default 5)
returns int language plpgsql security definer set search_path = public as $$
declare c record; n int := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'not authorized'; end if;
  for c in select id from public.cards order by random() limit greatest(1, _size) loop
    insert into public.user_cards (user_id, card_id, quantity)
    values (_user_id, c.id, 1)
    on conflict (user_id, card_id) do update set quantity = public.user_cards.quantity + 1;
    n := n + 1;
  end loop;
  return n;
end $$;

grant execute on function public.admin_tcg_reset_daily(uuid) to authenticated;
grant execute on function public.admin_tcg_adjust_level(uuid, int) to authenticated;
grant execute on function public.admin_tcg_give_pack(uuid, int) to authenticated;

-- ============ 20 CARTAS DE TESTE ============
insert into public.cards (name, rarity, power, effect, image_url) values
  ('Grumete do Cais Rubro',      'COMUM',    45,  'Golpe de Remo: -15 PS no defensor.',                          'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Grumete'),
  ('Vigia da Gávea',             'COMUM',    50,  'Olho Aguçado: revela a próxima carta do oponente.',            'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Vigia'),
  ('Carregador de Pólvora',      'COMUM',    48,  'Estopim Curto: -10 PS em todos os aliados inimigos.',          'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Polvora'),
  ('Marujo do Vento Salgado',    'COMUM',    52,  'Rajada: empurra uma carta inimiga para o fim da fila.',        'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Marujo'),
  ('Pescador da Enseada',        'COMUM',    44,  'Rede Pesada: o defensor perde 1 ataque.',                      'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Pescador'),
  ('Batedor de Porão',           'COMUM',    47,  'Furto Rápido: rouba 5 moedas do oponente.',                    'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Batedor'),
  ('Cozinheiro de Bordo',        'COMUM',    46,  'Ração Quente: +10 PS a um aliado.',                            'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Cozinheiro'),
  ('Artilheiro Novato',          'COMUM',    55,  'Disparo de Pistola: -30 PS no defensor.',                      'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Artilheiro'),
  ('Contrabandista de Névoa',    'COMUM',    49,  'Cortina de Névoa: evita o próximo ataque.',                    'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Nevoa'),
  ('Timoneiro Teimoso',          'COMUM',    53,  'Guinada: troca a posição de dois aliados.',                    'https://placehold.co/500x700/1b2a3a/e8d9b5?text=Timoneiro'),
  ('Espadachim das Marés',       'RARA',     72,  'Corte Crescente: -35 PS e sangramento por 2 turnos.',          'https://placehold.co/500x700/2a1b3a/e8d9b5?text=Espadachim'),
  ('Navegadora de Estrelas',     'RARA',     68,  'Rota Certeira: +15 PS a todos os aliados.',                    'https://placehold.co/500x700/2a1b3a/e8d9b5?text=Navegadora'),
  ('Caçador de Recompensas',     'RARA',     75,  'Marcação: +25 de dano contra alvos feridos.',                  'https://placehold.co/500x700/2a1b3a/e8d9b5?text=Cacador'),
  ('Ferreiro do Casco Negro',    'RARA',     70,  'Blindagem: reduz o dano recebido em 20% por 3 turnos.',        'https://placehold.co/500x700/2a1b3a/e8d9b5?text=Ferreiro'),
  ('Bruxa dos Corais',           'RARA',     69,  'Maldição Salina: -20 PS por turno no defensor.',               'https://placehold.co/500x700/2a1b3a/e8d9b5?text=Bruxa'),
  ('Almirante da Bruma Fria',    'EPICA',    95,  'Sentença Gélida: congela o defensor por 1 turno.',             'https://placehold.co/500x700/3a2b1b/f2e2bd?text=Almirante'),
  ('Rainha do Porto Escarlate',  'EPICA',    98,  'Decreto Rubro: -40 PS em dois inimigos.',                      'https://placehold.co/500x700/3a2b1b/f2e2bd?text=Rainha'),
  ('Leviatã das Fossas',         'EPICA',   102,  'Redemoinho: -45 PS em toda a linha inimiga.',                  'https://placehold.co/500x700/3a2b1b/f2e2bd?text=Leviata'),
  ('Guardião do Farol Eterno',   'LENDARIA', 115, 'Luz Perpétua: revive um aliado com 50 PS.',                    'https://placehold.co/500x700/4a1b1b/ffd76a?text=Guardiao'),
  ('Imperador das Sete Correntes','LENDARIA',120, 'Jugo do Mar: -60 PS no defensor e anula seu efeito.',          'https://placehold.co/500x700/4a1b1b/ffd76a?text=Imperador')
on conflict do nothing;
```
