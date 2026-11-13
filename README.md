# Bytebank — Dashboard Financeiro

Banco digital fictício desenvolvido como Tech Challenge da pós-graduação em Front-End Engineering da FIAP POSTECH. Tem login, dashboard com saldo e gráficos, extrato com busca reativa, transações com anexo cifrado e recuperação de senha. Na Fase 4, o projeto virou um monorepo de microfrontends com Clean Architecture, BFF próprio e deploy na Vercel com Supabase.

**Júlia Borges de Freitas Borba Pereira · RM 372209**

**App publicado:** https://bytebank-shell.vercel.app

**Vídeo de demonstração:** (link em breve)

| Usuário de demonstração | Senha |
|---|---|
| `julia@bytebank.com` (com 7 transações) | `bytebank123` |
| `test@bytebank.com` (sem transações) | `bytebank123` |

A senha é um dado de demonstração, pública de propósito. O banco guarda só o hash scrypt dela. Em "Abrir minha conta" você cria um usuário seu.

A política de senha vale só para senhas novas, no cadastro, na redefinição e na troca de senha. Por isso `bytebank123` continua entrando, mas uma senha nova parecida seria recusada, porque contém "bytebank" e é comum. É o esperado.

---

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

---

## Arquitetura

Três apps Next.js, servidas pela mesma origem: o shell recebe o navegador e repassa `/dashboard` e `/transactions` para as zonas.

| App | Porta local | Papel |
|---|---|---|
| `apps/shell` | 3000 | Landing, login, cadastro, recuperação de senha, `/sobre` e o proxy das zonas |
| `apps/dashboard` | 3003 | Saldo, gráficos, nova transação, Minha conta |
| `apps/transactions` | 3002 | Extrato completo, filtros, busca e paginação |

As apps são finas. O código fica nos packages:

| Package | Papel |
|---|---|
| `core` | Regras de negócio: domínio, casos de uso e portas, sem framework |
| `infrastructure` | Adaptadores das portas: json-server, Supabase, scrypt, AES-GCM, SMTP |
| `bff` | Handlers HTTP sem Next e montagem dos casos de uso; `DATA_BACKEND` escolhe o banco num só lugar |
| `store` | RTK Query: fábrica da API, store e provider que cada zona monta com o seu basePath |
| `auth` | NextAuth das zonas, proxy de sessão e config de sessão compartilhada com o shell |
| `utils` | Funções puras compartilhadas: formatação, política de sessão, rewrites das zonas |
| `design-system` | Componentes de UI, tema, cabeçalho e menus, documentados no Storybook |

Detalhes em [docs/architecture.md](docs/architecture.md), nas decisões de [docs/adr/](docs/adr/) e na documentação da fase em [docs/fase4/](docs/fase4/). As regras de código (camadas, imports, testes, estilo, commits) estão em [docs/conventions.md](docs/conventions.md).

---

## Requisitos da Fase 4

| Requisito | Como o projeto atende | Doc |
|---|---|---|
| Arquitetura modular | Multi-Zones e sete packages com responsabilidade única, sem código copiado entre apps | [modularization.md](docs/fase4/modularization.md) |
| State management | RTK Query nas duas zonas, pela mesma fábrica, com tags e invalidação por mutação | [state-management.md](docs/fase4/state-management.md) |
| Clean Architecture | Domínio e casos de uso no `core`, portas implementadas no `infrastructure`, BFF na borda | [domain.md](docs/fase4/domain.md), [bff.md](docs/fase4/bff.md) |
| Lazy loading e pré-carregamento | Modais e gráficos sob demanda, prefetch das páginas da zona e dos dados de cada período | [performance.md](docs/fase4/performance.md) |
| Cache | Cache do RTK Query com invalidação, prefetch que o clique reaproveita, `no-store` nos dados financeiros e chunks imutáveis | [state-management.md](docs/fase4/state-management.md), [performance.md](docs/fase4/performance.md) |
| Programação reativa | Busca e filtros do extrato como um fluxo RxJS (`debounceTime`, `combineLatest`, `distinctUntilChanged`), com testes de marble | [reactive-programming.md](docs/fase4/reactive-programming.md) |
| Autenticação segura | scrypt, JWT com expiração, logout por inatividade, bloqueio após 5 tentativas, CSP e correção da corrida de sessão. Política de senha do OWASP ASVS 5.0: mínimo de 8 caracteres, sem regras de composição, recusa das senhas mais comuns e de palavras do contexto. Indicador de força por estimativa de entropia, em 4 níveis, que só mede | [security.md](docs/fase4/security.md) |
| Criptografia | Anexos cifrados com AES-256-GCM antes de chegar ao banco, senhas e tokens de recuperação só como hash, HTTPS com HSTS | [security.md](docs/fase4/security.md) |

---

## Pré-requisitos

- [Node.js 22](https://nodejs.org/) (o npm vem junto)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), aberto e com o engine rodando
- [Git](https://git-scm.com/)

---

## Como rodar com Docker (recomendado)

Os comandos valem para o Git Bash, macOS e Linux. No PowerShell, troque `cp` por `Copy-Item`.

**1. Clonar**

```bash
git clone https://github.com/jujulia47/tech-challenge-fiap.git
cd tech-challenge-fiap
```

**2. Criar o `.env`** a partir do modelo. Ele fica fora do git, e o Docker Compose não sobe sem ele.

```bash
cp .env.example .env
```

**3. Gerar os segredos.** Rode o comando abaixo duas vezes e, no `.env`, troque cada `replace-me` por uma saída diferente: uma em `NEXTAUTH_SECRET`, outra em `ATTACHMENT_ENCRYPTION_KEY`.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Deixe `DATA_BACKEND=json-server` e as variáveis do Supabase vazias: localmente o banco é o json-server, que já vem com os dados de demonstração.

**4. Subir**

```bash
docker compose up -d --build
```

Na primeira vez, o build leva cerca de 2 minutos. O shell responde alguns segundos depois de os containers subirem.

**5. Usar**

| O quê | Endereço |
|---|---|
| App | http://localhost:3000 |
| Mailpit (e-mails de recuperação de senha) | http://localhost:8025 |

Entre com `julia@bytebank.com` / `bytebank123`. Para ver a recuperação de senha: saia, clique em "Esqueci a senha", informe o mesmo e-mail e abra o Mailpit. O link do e-mail leva para `http://localhost:3000/redefinir-senha`.

O dashboard (3003) e o extrato (3002) também ficam publicados, mas o uso é sempre pelo shell, na porta 3000. O json-server só é acessível dentro da rede do Docker.

**Voltar aos dados iniciais**

```bash
npm run db:reset
docker compose restart json-server
```

Não precisa de `npm install`: o script só copia `apps/shell/data/db.seed.json` sobre o banco em uso.

**Parar**

```bash
docker compose down
```

---

## Como rodar sem Docker

Ainda é suportado, para desenvolvimento.

**1. Instalar as dependências**

```bash
npm ci
```

**2. Criar um `.env.local` em cada app**, a partir dos `.env.example` delas, com os acréscimos abaixo. Gere os segredos com o mesmo comando do passo 3 acima. `NEXTAUTH_SECRET` precisa ser o mesmo nas três apps, e `ATTACHMENT_ENCRYPTION_KEY` o mesmo nas duas zonas.

`apps/shell/.env.local`:

```
NEXTAUTH_SECRET=<segredo>
SHELL_URL=http://localhost:3000
JSON_SERVER_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
MAIL_FROM=Bytebank <no-reply@bytebank.local>
```

`apps/dashboard/.env.local` e `apps/transactions/.env.local`:

```
NEXTAUTH_SECRET=<o mesmo do shell>
ATTACHMENT_ENCRYPTION_KEY=<chave>
SHELL_URL=http://localhost:3000
JSON_SERVER_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
```

Use `SMTP_HOST=127.0.0.1`, não `localhost`: o Node resolve `localhost` primeiro para IPv6 (`::1`), e o envio falha. As variáveis precisam estar nos `.env.local`, e não no terminal, porque o Turbo não repassa variáveis de ambiente para o `npm run dev`.

**3. Subir o json-server, o Mailpit e as apps**, cada um num terminal:

```bash
cd apps/shell && npm run api
```

```bash
docker run --rm -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit:v1.29.5
```

```bash
npm run dev
```

Acesse http://localhost:3000. Sem o Mailpit, deixe `SMTP_HOST` de fora: o envio fica desligado, a tela mostra a mensagem de sempre e o servidor registra uma linha no log.

---

## Testes

| Comando | O que faz |
|---|---|
| `npm test` | Os testes unitários e de integração dos packages: 1492 testes, em cerca de 10 s |
| `npm run test:coverage` | Os mesmos, com a cobertura (v8) |
| `cd apps/shell && npx vitest run --project storybook` | As 77 stories do design system num navegador real, com 15 testes de interação. Precisa do Chromium do Playwright (`npx playwright install chromium`) |
| `SUPABASE_CONTRACT_TESTS=1 npx vitest run supabase.contract` | A suíte de contrato contra um projeto Supabase real, com `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no `.env`. Desligada por padrão, e fora do CI |
| `npm run test:session-race` | O teste de regressão da corrida de sessão, num navegador real, contra o app rodando (abaixo) |

Os mesmos casos de contrato rodam contra o json-server no `npm test`, então os dois bancos cumprem as mesmas regras.

O `test:session-race` precisa do app no ar e do Chrome instalado. Ele usa o usuário de demonstração:

```bash
E2E_EMAIL=julia@bytebank.com E2E_PASSWORD=bytebank123 npm run test:session-race
```

Com `SHELL_URL=https://bytebank-shell.vercel.app`, ele roda contra a produção. Detalhes em [docs/fase4/testing.md](docs/fase4/testing.md). O CI (GitHub Actions) roda lint, testes, build e auditoria a cada push: [docs/fase4/ci.md](docs/fase4/ci.md).

O Storybook do design system abre com `cd apps/shell && npm run storybook`, em http://localhost:6006.

---

## Deploy

Cada app é um projeto na Vercel, com as funções na região `iad1`, a mesma do banco. O shell serve as três pela própria origem, repassando as zonas pelos rewrites. O banco de produção é um Postgres no Supabase, acessado só pelo servidor (RLS ligado, sem política pública). O checklist de variáveis, as configurações de build e a ordem dos passos estão em [docs/fase4/deploy.md](docs/fase4/deploy.md).

Em produção, o envio de e-mail fica desligado: "Esqueci a senha" responde a mensagem de sempre, mas nenhum e-mail sai. A recuperação de senha é demonstrada localmente, pelo Mailpit.

---

## Problemas comuns

**Antivírus que inspeciona HTTPS (ex.: Avast).** Ele assina de novo as conexões HTTPS com um certificado próprio, em que o Windows confia e os containers Linux não. O `npm ci` dentro do `docker compose up --build` pode então falhar com erros de certificado como `SELF_SIGNED_CERT_IN_CHAIN` ou `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. Para resolver:

1. No antivírus, adicione uma exceção para `https://registry.npmjs.org/*` (no Avast, em Menu › Configurações › Geral › Exceções), ou desligue a verificação HTTPS do escudo da web durante o build.
2. Rode `docker compose up -d --build` de novo.

O mesmo antivírus pode bloquear o domínio de uma das zonas na Vercel, como aconteceu com `bytebank-transactions-virid.vercel.app`. Isso não afeta o uso do app: o navegador só fala com o shell. Para usar o Supabase de dentro do Docker numa máquina assim, veja "HTTPS inspected by an antivirus" em [docs/fase4/deploy.md](docs/fase4/deploy.md).

**A porta 3000 já está em uso.** Pare o que estiver nela, ou outro `docker compose` deste projeto, com `docker compose down`.

**`Missing or invalid NEXTAUTH_SECRET` ou `Missing or invalid ATTACHMENT_ENCRYPTION_KEY` ao subir.** Falta o `.env` na raiz, ou o segredo está vazio, ainda é `replace-me` ou é curto demais para 32 bytes em base64. O `docker compose up` para no serviço `secrets-check`, antes de subir as apps, e fora do Docker o servidor se recusa a iniciar com a mesma mensagem. Volte aos passos 2 e 3.
