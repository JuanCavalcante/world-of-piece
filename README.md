# World of Piece v2

Aplicação web full-stack que une um sistema de RPG (fichas de personagem, tripulações, inventário, pets, Haki, profissões, raças) ao card game **WOP TCG** — com duelos contra IA, modo PvP JxJ, baralhos, craft, mercado, conquistas e ranking por Valor de Recompensa (VR).

Desenvolvido com [Lovable](https://lovable.dev), banco de dados via Lovable Cloud (Supabase) e publicado na Vercel.

## Principais funcionalidades

- **RPG**
  - Criação e gerenciamento de personagens (atributos, imagens, cargas).
  - Sistemas de Haki, Profissões, Raças, Pets e Tripulações.
  - Inventário com ativação de itens e aprovação de requisições (admin).
  - Painel administrativo para aprovar conteúdo e gerenciar jogadores.

- **WOP TCG**
  - Coleção de cartas, abertura de packs e sistema de decks.
  - Duelos contra IA e modo PvP Jogador vs Jogador com matchmaking em tempo real.
  - Craft: desmantelar/extrair essência e trocar cartas com outros jogadores.
  - Mercado de cartas, conquistas, ranking VR e histórico de duelos.
  - Perfil público com estatísticas competitivas, avatar e banner personalizados.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19 + SSR/SSG)
- [Vite](https://vitejs.dev) 7
- [Tailwind CSS](https://tailwindcss.com) v4
- [Supabase](https://supabase.com) (banco PostgreSQL, auth, Realtime)
- [Vercel](https://vercel.com) (deploy/edge)

## Desenvolvimento local

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

A aplicação estará disponível em `http://localhost:8080`.

## Migrações de banco

Comandos SQL para o Supabase ficam em `docs/migrations/`. Rode-os no **SQL Editor** do Supabase na ordem numérica.

> ⚠️ Nunca execute migrações diretamente na produção sem revisar. Ajustes sensíveis devem ser validados antes em ambiente de teste.

## Deploy

- Preview: `https://id-preview--a7bb7ed0-e54c-4245-a156-dcc7698653e6.lovable.app`
- Produção: publicada via Vercel no domínio do projeto.

## Estrutura de pastas (resumida)

- `src/routes/` — rotas TanStack (file-based routing).
- `src/components/` — componentes React reutilizáveis (RPG, TCG, admin).
- `src/lib/` — lógica de negócio, API e integrações.
- `src/integrations/supabase/` — clientes e middleware de auth.
- `docs/migrations/` — scripts SQL do banco.

## Links úteis

- Editor Lovable: [abra o projeto](https://lovable.dev/projects/11b488e6-b88d-4d93-84bf-ab8e7461d42c)
- Documentação Cloud: [docs.lovable.dev/features/cloud](https://docs.lovable.dev/features/cloud)

