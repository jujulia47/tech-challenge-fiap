# Arquitetura — Bytebank Fase 2

## Visão geral

O Bytebank é um monorepo Turborepo com três aplicações Next.js independentes
organizadas como microfrontends via Next.js Multizones.

## Estrutura do monorepo

```
tech-challenge-fiap/
├─ apps/
│  ├─ shell/          → landing page, autenticação, proxy (porta 3000)
│  ├─ dashboard/      → dashboard financeiro (porta 3003)
│  └─ transactions/   → extrato completo (porta 3002)
├─ packages/
│  ├─ design-system/  → componentes UI compartilhados
│  ├─ utils/          → funções utilitárias compartilhadas
│  └─ types/          → tipos TypeScript compartilhados
├─ docker-compose.yml
└─ turbo.json
```

## Decisão: Next.js Multizones

Optamos por Next.js Multizones em vez de Module Federation ou Single SPA porque:

- **Module Federation** não suporta Next.js 16 com App Router
- **Single SPA** entra em conflito com o roteamento do App Router
- **Multizones** é a abordagem oficial do Next.js para microfrontends,
  endossada pelo professor da disciplina

Referência: https://nextjs.org/docs/app/building-your-application/deploying/multi-zones

## Comunicação entre zonas

Em desenvolvimento local, o shell faz proxy via `next.config.ts`:
- `/dashboard/*` → `http://localhost:3003`
- `/transactions/*` → `http://localhost:3002`

Em produção (Vercel), o proxy é feito via `vercel.json` do shell:
- `/dashboard/*` → `https://bytebank-dashboard.vercel.app`
- `/transactions/*` → `https://bytebank-transactions.vercel.app`

## Autenticação

NextAuth v5 no shell gerencia a sessão via JWT. O mesmo `NEXTAUTH_SECRET`
é compartilhado entre as zonas, permitindo que todas leiam o cookie de sessão.

O middleware (`proxy.ts`) no shell protege as rotas `/dashboard/*` e
`/transactions/*`, redirecionando para `/` quando não autenticado.

## Gestão de estado

As duas zonas usam RTK Query para os dados do servidor, com a mesma fábrica de
`@bytebank/store`, e falam com o BFF pelo mesmo cliente, `@bytebank/bff/client`.
Veja `docs/fase4/state-management.md`.

## Renderização

| Página | Estratégia | Motivo |
|---|---|---|
| Landing page | SSG | Conteúdo estático |
| `/sobre` | SSR | Números lidos do json-server a cada requisição |
| `/dashboard/account` | SSR | Dados do usuário por request |
| Dashboard, Transactions | CSR | Interatividade com RTK Query |

## Docker

Cada zona tem um Dockerfile com multistage build:
1. **deps** — instala dependências com `npm ci`
2. **builder** — executa `turbo build --filter=@bytebank/<zona>`
3. **runner** — imagem final com apenas o `.next/standalone`

O Docker Compose orquestra 4 serviços na rede `bytebank`:
shell (:3000), json-server (:3001), transactions (:3002), dashboard (:3003).

## Deploy

| Serviço | Plataforma | URL |
|---|---|---|
| shell | Vercel | https://bytebank-shell.vercel.app |
| dashboard | Vercel | https://bytebank-dashboard.vercel.app |
| transactions | Vercel | https://bytebank-transactions.vercel.app |
| json-server | Railway | https://glistening-recreation-production-63c0.up.railway.app |

O json-server no Railway usa um Dockerfile dedicado (`apps/shell/Dockerfile.jsonserver`)
que instala o json-server globalmente e serve na porta 3001 um `db.json` copiado da semente `apps/shell/data/db.seed.json`.
