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
- **Vercel + Railway** — deploy em cloud
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
NEXTAUTH_SECRET=bytebank-secret-fase2-fiap
NEXTAUTH_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:3003
TRANSACTIONS_URL=http://localhost:3002
```

**apps/dashboard/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SHELL_URL=http://localhost:3000
NEXTAUTH_SECRET=bytebank-secret-fase2-fiap
```

**apps/transactions/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=bytebank-secret-fase2-fiap
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

```bash
docker-compose up --build
```

Todos os serviços sobem automaticamente:
- shell → http://localhost:3000
- json-server → http://localhost:3001
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

| Email | Senha |
|---|---|
| test@bytebank.com | bytebank123 |

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
