# Bytebank — Dashboard Financeiro

Dashboard financeiro desenvolvido como Tech Challenge da pós-graduação
em Front-End Engineering da FIAP POSTECH.

**Júlia Borges de Freitas Borba Pereira · RM 372209**

---

## Tecnologias

- **Next.js 16** com App Router
- **TypeScript**
- **Tailwind CSS v4** + DaisyUI v5
- **Turborepo** — monorepo com múltiplos apps
- **Next.js Multizones** — arquitetura de microfrontends
- **Redux Toolkit** — gestão de estado global
- **NextAuth v5** — autenticação com JWT
- **Docker + Docker Compose** — containerização
- **Vercel + Supabase** — deploy em cloud (`docs/fase4/deploy.md`)
- **Recharts** — gráficos financeiros

---

## Arquitetura

O projeto é um monorepo com 3 zonas independentes:

| Zona | Porta local | Responsabilidade |
|---|---|---|
| shell | 3000 | Landing page, autenticação, proxy entre zonas |
| dashboard | 3003 | Dashboard financeiro, gráficos, nova transação |
| transactions | 3002 | Extrato completo, filtros, busca, paginação |

Para detalhes sobre decisões arquiteturais, consulte [docs/architecture.md](docs/architecture.md).

---

## Como rodar localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação

```bash
git clone https://github.com/jujulia47/tech-challenge-fiap.git
cd tech-challenge-fiap
npm install
```

### Variáveis de ambiente

Criar os seguintes arquivos:

**apps/shell/.env.local**
```
NEXTAUTH_SECRET=<valor-gerado>
NEXTAUTH_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3003
TRANSACTIONS_URL=http://localhost:3002
JSON_SERVER_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM=Bytebank <no-reply@bytebank.local>
```

**apps/dashboard/.env.local**
```
JSON_SERVER_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
SHELL_URL=http://localhost:3000
ATTACHMENT_ENCRYPTION_KEY=<valor-gerado>
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
NEXTAUTH_SECRET=<valor-gerado>
```

**apps/transactions/.env.local**
```
JSON_SERVER_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000
SHELL_URL=http://localhost:3000
ATTACHMENT_ENCRYPTION_KEY=<valor-gerado>
NEXTAUTH_SECRET=<valor-gerado>
```

### Rodando

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
cd apps/shell && npm run api
```

Acesse: http://localhost:3000

---

## Como rodar com Docker

Os segredos ficam num `.env` na raiz, fora do git. Sem ele, o Docker Compose não sobe. Copie `.env.example` para `.env` e gere cada valor com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```bash
docker-compose up --build
```

Todos os serviços sobem automaticamente:
- shell → http://localhost:3000
- json-server → só na rede interna do Docker (a porta 3001 não é publicada)
- transactions → http://localhost:3002
- dashboard → http://localhost:3003

---

## Deploy

| Serviço | URL |
|---|---|
| Aplicação | https://bytebank-shell.vercel.app |
| API mock | https://glistening-recreation-production-63c0.up.railway.app |

---

## Storybook

Documentação do Design System:

```bash
cd apps/shell && npm run storybook
```

Acesse: http://localhost:6006

---

## Credenciais de teste

Os e-mails de recuperação de senha chegam na caixa do Mailpit: http://localhost:8025 (com o Docker Compose no ar).

| Email | Senha |
|---|---|
| test@bytebank.com | bytebank123 |

Esta senha é um dado de demonstração. O banco guarda só o hash scrypt dela, e o cadastro em "Abrir minha conta" cria usuários do mesmo jeito. Detalhes em [docs/fase4/security.md](docs/fase4/security.md).

Se o seu `db.json` for anterior à Etapa 3.1, rode `npm run db:reset` e `docker compose restart json-server`.

---

## Funcionalidades

- Login com autenticação real (NextAuth + JWT)
- Dashboard com saldo, extrato resumido e gráficos financeiros
- Filtros de gráfico por período e tipo de transação
- Extrato completo com filtros, busca e paginação
- Criação, edição e exclusão de transações
- Validação avançada com sugestões automáticas de tipo
- Upload de anexos (imagem ou PDF, máximo 100KB)
- Visualização e download de anexos
- SSG na página /sobre com revalidação a cada hora (ISR)
- SSR na página Minha Conta com dados renderizados no servidor
