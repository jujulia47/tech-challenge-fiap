# Bytebank — Tech Challenge

## Sobre o projeto

Dashboard financeiro desenvolvido como parte do Tech Challenge da **FIAP POSTECH Front-End Engineering**.

A aplicação simula um banco digital com landing page pública, autenticação via modais, e uma área de dashboard para gerenciamento de transações financeiras. O projeto utiliza um Design System próprio construído com Tailwind CSS v4 e DaisyUI v5.

## Tecnologias

- [Next.js 16](https://nextjs.org/) — framework React com App Router
- [TypeScript](https://www.typescriptlang.org/) — tipagem estática
- [Tailwind CSS v4](https://tailwindcss.com/) — estilização utilitária
- [DaisyUI v5](https://daisyui.com/) — componentes de UI
- [Material Icons](https://fonts.google.com/icons) — ícones
- [json-server](https://github.com/typicode/json-server) — API fake para mock de dados

## Pré-requisitos

- Node.js 18+
- npm

## Instalação

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

### Variáveis de ambiente

O projeto utiliza uma variável de ambiente para configurar a URL da API mockada. Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

O valor padrão (`NEXT_PUBLIC_API_URL=http://localhost:3001`) funciona com a configuração padrão do json-server e geralmente não precisa ser alterado.

## Rodando o projeto

O projeto requer **dois terminais** rodando simultaneamente — um para a API e outro para o Next.js.

**Terminal 1 — API fake (json-server):**

```bash
npm run api
```

A API estará disponível em `http://localhost:3001`

**Terminal 2 — Aplicação Next.js:**

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

> Certifique-se de iniciar o Terminal 1 antes do Terminal 2 para que a aplicação consiga se conectar à API.

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento Next.js |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor em modo produção |
| `npm run api` | Inicia o json-server na porta 3001 |
| `npm run lint` | Executa o linter ESLint |
| `npm run storybook` | Inicia o Storybook em http://localhost:6006 |
| `npm run build-storybook` | Gera o build estático do Storybook |

## Estrutura do projeto

```
src/
  app/
    page.tsx                    # Landing page
    layout.tsx                  # Layout raiz
    not-found.tsx               # Página 404 global
    (public)/                   # Route group: páginas deslogadas
      layout.tsx                # Layout público (NavbarPublic + Footer)
      forgot-password/
        page.tsx                # Recuperação de senha
      components/               # HeroSection, BenefitsSection, ModalLogin, ModalCadastro
    dashboard/                  # Área autenticada
      layout.tsx                # Layout do dashboard
      page.tsx                  # Página principal
      components/               # CardWelcome, CardStatement, CardNewTransaction,
                                # ModalEditTransaction, ModalTransactionDetail, TransactionItem
      context/
        TransactionsContext.tsx # Estado global de transações
      hooks/
        use-balance.ts          # Toggle de visibilidade do saldo
      types/
        transaction.ts          # Tipos do domínio
      statement/                # Extrato completo (page.tsx + componentes)
      investments/              # Investimentos (page.tsx + components/CardInvestments)
      cards/                    # Meus cartões (page.tsx + components/CardMyCards, CardBill)
      services/                 # Outros serviços (page.tsx + components/CardServices)
      account/                  # Minha conta (page.tsx + components/CardAccount)
      transfers/                # Redirect para coming-soon
      coming-soon/              # Placeholder genérico
  components/
    ui/                         # Design System primitives:
                                # Button, Input, Select, Checkbox, Toast, Modal,
                                # ModalConfirmDelete, ProfileMenu, Link
    layout/                     # Estruturas compartilhadas:
                                # Header, Footer, NavbarPublic, DashboardWelcome,
                                # MenuDrawer, MenuTabs, MenuSidebar, nav-items
  hooks/                        # Hooks globais
    use-toast.ts                # Toast de feedback
    use-user.ts                 # Dados do usuário (localStorage)
    use-currency-input.ts       # Input de valor monetário
  lib/
    api/
      transactions.ts           # CRUD de transações (json-server)
    utils/
      cn.ts                     # Composição de classnames
      currency.ts               # Formatação de moeda
      transactions.ts           # Utilitários de transações (group, sort, filter)
      user.ts                   # Utilitários de usuário (firstName, etc)
  stories/                      # Documentação Storybook
    foundations/                # Tokens visuais (Colors, Typography, Spacing, etc)
    patterns/                   # Convenções (DaisyUI, ArbitraryValues, AuthFlow, etc)
  styles/
    globals.css                 # Tokens de design (Tailwind v4 @theme)
  types/
    daisyui.d.ts                # Tipagens DaisyUI
db.json                         # Dados mockados (json-server)
```

## Funcionalidades

### Área pública
- Landing page com seções de hero e benefícios
- Modal de login com campos Nome, E-mail e Senha
- Modal de cadastro
- Página de recuperação de senha
- Experiência personalizada: nome digitado no login aparece no card de boas-vindas, no header e em Minha Conta

### Dashboard — `/dashboard`
- Visualização de saldo (com toggle de visibilidade)
- Extrato resumido com as 4 últimas transações e link para extrato completo
- Adicionar nova transação (tipo, data e valor)
- Editar transação existente (modal)
- Excluir transação (modal de confirmação)
- Layout em duas colunas no desktop (conteúdo + extrato)

### Extrato completo — `/dashboard/statement`
- Histórico completo de transações agrupado por mês
- Filtro por tipo de transação
- Filtro por mês (opções dinâmicas geradas a partir dos dados)
- Editar e excluir transações com feedback via toast

### Investimentos — `/dashboard/investments`
- Total investido e distribuição por tipo (Renda Fixa / Renda Variável)
- Gráfico de rosca (donut chart) com legenda por categoria
- Rentabilidade do mês
- Histórico dos últimos aportes
- Barra de progresso da meta anual

### Meus Cartões — `/dashboard/cards`
- Visualização de cartão físico e digital
- Seleção interativa de cartão (alterna fatura exibida)
- Fatura atual, vencimento, limite total e limite disponível
- Últimas transações da fatura por cartão

### Outros Serviços — `/dashboard/services`
- Grade com 9 serviços disponíveis
- Serviços com rota apontam para a página correspondente
- Serviços sem implementação apontam para `/dashboard/coming-soon`

### Navegação
- Mobile: drawer lateral
- Tablet: barra de tabs horizontal
- Desktop: sidebar fixa com 5 itens de navegação
- Página 404 personalizada
- Página genérica "Em breve" (`/dashboard/coming-soon`) para funcionalidades futuras

## Acessibilidade

O projeto foi desenvolvido com atenção às diretrizes de acessibilidade:

- `lang="pt-BR"` no elemento raiz para leitores de tela
- Elementos semânticos: `<main>`, `<nav>`, `<header>`, `<footer>`, `<form>`
- `aria-label` em todos os botões de ícone (editar, excluir, fechar, visibilidade)
- `aria-modal` e `role="dialog"` nos modais
- `aria-live="polite"` e `role="alert"` no Toast de feedback
- `aria-expanded` e `role="listbox"` no Select
- `aria-describedby` e `aria-invalid` nos inputs com erro
- `focus-visible:outline-2` em todos os elementos interativos
- Formulários com `<form onSubmit>` e validação nativa HTML5

## Design System

O Design System é documentado de forma interativa via Storybook (ver seção abaixo). Os tokens de cor, tipografia, espaçamento e demais variáveis estão definidos em `src/styles/globals.css` via bloco `@theme` do Tailwind CSS v4. Todos os componentes primitivos residem em `src/components/ui/`.

## Storybook

O projeto inclui documentação interativa de todos os componentes do Design System via Storybook. Para acessar:

```bash
npm run storybook
```

Storybook estará disponível em `http://localhost:6006`.

A documentação é organizada em três áreas:

- **Foundations** — tokens visuais (cores, tipografia, espaçamento, ícones, breakpoints, animações)
- **Patterns** — convenções e regras de uso (valores arbitrários, contexto de tokens, fluxo de auth, fluxo de CRUD, integração com DaisyUI)
- **Design System** e **Components/Layout** — componentes primitivos e de layout com states e variants documentados

## Fluxo da aplicação

1. Acesse `http://localhost:3000` para ver a landing page
2. Clique em **"Abrir minha conta"** ou **"Já tenho conta"** para acessar os modais de autenticação
3. No modal de login, preencha **Nome**, **E-mail** e **Senha** — o nome será exibido no card de boas-vindas, no header e em Minha Conta
4. Após login, você é redirecionado para o dashboard em `/dashboard`
5. No dashboard, gerencie suas transações financeiras
6. Use o menu lateral (desktop) ou tabs (tablet) para navegar entre as seções:
   - **Transferências** → redireciona para "Em breve"
   - **Extrato completo** → `/dashboard/statement` com filtros
   - **Investimentos** → `/dashboard/investments`
   - **Outros serviços** → `/dashboard/services`

## Dados do usuário

- Nome e e-mail digitados no login são salvos no `localStorage` do browser (chave `bytebank_user`)
- Os dados persistem entre sessões enquanto o browser não limpar os dados do site
- Para simular outro usuário, basta fazer login com nome e e-mail diferentes — o `localStorage` é sobrescrito automaticamente
