# Bytebank: Dashboard Financeiro

Banco digital fictício desenvolvido como Tech Challenge da pós-graduação em Front-End Engineering da FIAP POSTECH. Tem login, dashboard com saldo e gráficos, extrato com busca reativa, transações com anexo cifrado e recuperação de senha. Na Fase 4, o projeto virou um monorepo de microfrontends com Clean Architecture, BFF próprio e deploy na Vercel com Supabase.

**Júlia Borges de Freitas Borba Pereira · RM 372209**

**App publicado:** https://bytebank-shell.vercel.app

| Usuário de demonstração | Senha |
|---|---|
| `julia@bytebank.com` (com 7 transações) | `bytebank123` |
| `test@bytebank.com` (sem transações) | `bytebank123` |

A senha de demonstração é pública de propósito, e o banco guarda só o hash scrypt dela. Em "Abrir minha conta" você cria um usuário seu. A política de senha vale só para senhas novas, por isso `bytebank123` continua entrando, mas uma senha nova parecida seria recusada por conter "bytebank" e ser comum.

## Tecnologias

| Grupo | Tecnologias |
|---|---|
| Front-end | Next.js 16.4 (App Router, Multi-Zones, Turbopack), React 19.3, TypeScript 5.9, Tailwind CSS 4.3 + daisyUI 5.7, Recharts 3.10, Storybook 10.6 |
| Estado e reatividade | Redux Toolkit 2.13 com RTK Query, React Redux 9.3, RxJS 7.8 |
| Arquitetura | Turborepo 2.11 (npm workspaces), Clean Architecture com portas e adaptadores, BFF próprio independente do Next, Zod 4.6 na borda da API |
| Segurança | Auth.js (NextAuth) 5.0.0-beta.32 com JWT, scrypt e AES-256-GCM do `node:crypto`, CSP com nonce, HSTS, limite de tentativas |
| Banco | json-server 1.0.0-beta.15 (local) e Supabase Postgres via `@supabase/supabase-js` 2.118 (produção) |
| Testes | Vitest 4.1 (com cobertura v8), Playwright 1.64, testes de Storybook |
| Infraestrutura | Node 22, Docker e Docker Compose, Mailpit 1.29, Nodemailer 10.3, Vercel, GitHub Actions |

## Arquitetura

Três apps Next.js são servidas pela mesma origem: o shell recebe o navegador e repassa `/dashboard` e `/transactions` para as zonas.

| App | Porta local | Papel |
|---|---|---|
| `apps/shell` | 3000 | Landing, login, cadastro, recuperação de senha, `/sobre` e o proxy das zonas |
| `apps/dashboard` | 3003 | Saldo, gráficos, nova transação, Minha conta |
| `apps/transactions` | 3002 | Extrato completo, filtros, busca e paginação |

As apps só montam as peças. O código fica nos packages:

| Package | Papel |
|---|---|
| `core` | Regras de negócio: domínio, casos de uso e portas, sem framework |
| `infrastructure` | Adaptadores das portas: json-server, Supabase, scrypt, AES-GCM, SMTP |
| `bff` | Handlers HTTP sem Next e montagem dos casos de uso; `DATA_BACKEND` escolhe o banco num só lugar |
| `store` | RTK Query: fábrica da API, store e provider que cada zona monta com o seu basePath |
| `auth` | NextAuth das zonas, proxy de sessão e config de sessão compartilhada com o shell |
| `utils` | Funções puras compartilhadas: formatação, política de sessão, rewrites das zonas |
| `design-system` | Componentes de UI, tema, cabeçalho e menus, documentados no Storybook |

Os detalhes estão em [docs/architecture.md](docs/architecture.md), as decisões em [docs/adr/](docs/adr/) e as regras de código em [docs/conventions.md](docs/conventions.md).

## Requisitos da Fase 4

O índice em [docs/README.md](docs/README.md) mostra, para cada requisito, o que foi feito, a doc que explica e como validar.

| Requisito | Como o projeto atende |
|---|---|
| Arquitetura modular | Multi-Zones e sete packages com responsabilidade única, sem código copiado entre apps |
| State management | RTK Query nas duas zonas, pela mesma fábrica, com tags e invalidação por mutação |
| Clean Architecture | Domínio e casos de uso no `core`, portas implementadas no `infrastructure`, BFF na borda |
| Lazy loading e pré-carregamento | Modais e gráficos sob demanda, prefetch das páginas da zona e dos dados de cada período |
| Cache | Cache do RTK Query com invalidação, prefetch que o clique reaproveita, `no-store` nos dados financeiros e chunks imutáveis |
| Programação reativa | Busca e filtros do extrato como um fluxo RxJS, com testes de marble |
| Autenticação segura | scrypt, JWT com expiração, logout por inatividade, bloqueio após 5 tentativas, CSP, política de senha do OWASP ASVS 5.0 e sessões encerradas no servidor |
| Criptografia | Anexos cifrados com AES-256-GCM antes de chegar ao banco, senhas e tokens só como hash, HTTPS com HSTS |

## Pré-requisitos

- [Node.js 22](https://nodejs.org/), que já traz o npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), aberto e com o engine rodando
- [Git](https://git-scm.com/)

## Como rodar com Docker (recomendado)

Os comandos valem para Git Bash, macOS e Linux. No PowerShell, troque `cp` por `Copy-Item`.

### 1. Clonar

```bash
git clone https://github.com/jujulia47/tech-challenge-fiap.git
cd tech-challenge-fiap
```

### 2. Criar o `.env`

O `.env` fica fora do git, e o Docker Compose não sobe sem ele.

```bash
cp .env.example .env
```

### 3. Gerar os segredos

Rode o comando abaixo duas vezes e troque cada `replace-me` do `.env` por uma saída diferente, uma em `NEXTAUTH_SECRET` e outra em `ATTACHMENT_ENCRYPTION_KEY`.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Deixe `DATA_BACKEND=json-server` e as variáveis do Supabase vazias. Localmente o banco é o json-server, que já vem com os dados de demonstração.

### 4. Subir

```bash
docker compose up -d --build
```

Na primeira vez o build leva cerca de 2 minutos, e o shell responde alguns segundos depois.

### 5. Usar

| O quê | Endereço |
|---|---|
| App | http://localhost:3000 |
| Mailpit (e-mails de recuperação de senha) | http://localhost:8025 |

Entre com `julia@bytebank.com` e `bytebank123`. Para ver a recuperação de senha, saia, clique em "Esqueci a senha", informe o mesmo e-mail e abra o Mailpit. O link do e-mail leva para `http://localhost:3000/redefinir-senha`.

O dashboard (3003) e o extrato (3002) também ficam publicados, mas o uso é sempre pelo shell, na porta 3000. O json-server só é acessível dentro da rede do Docker.

### Encurtar os tempos para demonstração

`IDLE_TIMEOUT_SECONDS` e `IDLE_WARNING_SECONDS` encurtam o logout por inatividade, e `RATE_LIMIT_WINDOW_SECONDS` encurta o bloqueio de login depois de 5 senhas erradas; valores maiores que o padrão são ignorados:

```powershell
$env:RATE_LIMIT_WINDOW_SECONDS = 30; docker compose up -d --no-deps --force-recreate shell dashboard
```

### Voltar aos dados iniciais

```bash
npm run db:reset
docker compose restart json-server
```

O script só copia `apps/shell/data/db.seed.json` sobre o banco em uso, sem precisar de `npm install`. O json-server não observa o arquivo, por isso precisa ser reiniciado.

### Parar

```bash
docker compose down
```

## Como rodar sem Docker

### 1. Instalar as dependências

```bash
npm ci
```

### 2. Criar um `.env.local` em cada app

Copie o `.env.example` de cada app para `.env.local` e troque cada `replace-me` por um segredo gerado com o comando do passo 3 acima. `NEXTAUTH_SECRET` precisa ser o mesmo nas três apps, e `ATTACHMENT_ENCRYPTION_KEY` o mesmo nas duas zonas.

```bash
cp apps/shell/.env.example apps/shell/.env.local
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/transactions/.env.example apps/transactions/.env.local
```

O exemplo do shell usa `SMTP_HOST=127.0.0.1`, e não `localhost`, porque o Node resolve `localhost` primeiro para IPv6 (`::1`) e o envio falha. As variáveis precisam estar nos `.env.local`, porque o Turbo não repassa as do terminal para o `npm run dev`.

### 3. Subir o json-server, o Mailpit e as apps

Cada comando num terminal:

```bash
cd apps/shell && npm run api
```

```bash
docker run --rm -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit:v1.29.5
```

```bash
npm run dev
```

Acesse http://localhost:3000. Sem o Mailpit, tire `SMTP_HOST` do `.env.local` do shell: o envio fica desligado, a tela mostra a mensagem de sempre e o servidor registra uma linha no log. Depois de um `npm run db:reset`, pare e rode `npm run api` de novo.

## Testes

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários, de integração e de contrato dos packages |
| `npm run test:coverage` | Os mesmos, com a cobertura |
| `cd apps/shell && npx vitest run --project storybook` | As stories do design system num navegador real, com os testes de interação. Precisa do Chromium do Playwright (`npx playwright install chromium`) |
| `SUPABASE_CONTRACT_TESTS=1 npx vitest run supabase.contract` | A suíte de contrato contra um projeto Supabase real, com `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no `.env` |
| `npm run test:session-race` | A corrida de sessão num navegador real, contra o app rodando |
| `npm run test:logout-scope` | O que cada logout encerra, contra o app rodando com tempos curtos de inatividade |

Os mesmos casos de contrato rodam contra o json-server no `npm test`, então os dois bancos cumprem as mesmas regras. Os testes de navegador precisam do app no ar e do Chrome instalado, e usam o usuário de demonstração:

```bash
E2E_EMAIL=julia@bytebank.com E2E_PASSWORD=bytebank123 npm run test:session-race
```

Com `SHELL_URL=https://bytebank-shell.vercel.app`, o teste roda contra a produção. As contagens e os detalhes de cada suíte estão em [docs/fase4/testing.md](docs/fase4/testing.md). O GitHub Actions roda lint, testes, build e auditoria a cada push ([docs/fase4/ci.md](docs/fase4/ci.md)).

O Storybook abre com `cd apps/shell && npm run storybook`, em http://localhost:6006.

## Deploy

Cada app é um projeto na Vercel, com as funções na região `iad1`, a mesma do banco. O shell serve as três apps pela própria origem, repassando as zonas pelos rewrites. O banco de produção é um Postgres no Supabase, acessado só pelo servidor, com RLS ligado e sem política pública. As variáveis, a configuração de build e a ordem dos passos estão em [docs/fase4/deploy.md](docs/fase4/deploy.md).

Em produção o envio de e-mail fica desligado: "Esqueci a senha" responde a mensagem de sempre, mas nenhum e-mail sai. A recuperação de senha é demonstrada localmente, pelo Mailpit.

## Problemas comuns

### Antivírus que inspeciona HTTPS

Antivírus como o Avast assinam de novo as conexões HTTPS com um certificado próprio, em que o Windows confia e os containers Linux não. O `npm ci` dentro do `docker compose up --build` pode falhar com `SELF_SIGNED_CERT_IN_CHAIN` ou `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. Adicione no antivírus uma exceção para `https://registry.npmjs.org/*` (no Avast, em Menu › Configurações › Geral › Exceções), ou desligue a verificação HTTPS durante o build, e rode `docker compose up -d --build` de novo.

O mesmo antivírus pode bloquear o domínio de uma das zonas na Vercel, o que não afeta o uso, já que o navegador só fala com o shell. Para usar o Supabase de dentro do Docker numa máquina assim, veja "HTTPS inspected by an antivirus" em [docs/fase4/deploy.md](docs/fase4/deploy.md#https-inspected-by-an-antivirus).

### A porta 3000 já está em uso

Pare o que estiver nela, ou outro `docker compose` deste projeto, com `docker compose down`.

### `Missing or invalid NEXTAUTH_SECRET` ou `ATTACHMENT_ENCRYPTION_KEY` ao subir

Falta o `.env` na raiz, ou o segredo está vazio, ainda é `replace-me` ou é curto demais para 32 bytes em base64. O `docker compose up` para no serviço `secrets-check`, antes de subir as apps, e fora do Docker o servidor se recusa a iniciar com a mesma mensagem. Volte aos passos 2 e 3.
