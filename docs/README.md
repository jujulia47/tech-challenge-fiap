# Documentação

Para cada requisito da Fase 4: o que foi feito, onde está explicado (como funciona, por que foi escolhido, limitações) e como validar. As docs técnicas estão em inglês, como manda a convenção do repositório; cada uma descreve o estado final. A ordem em que as coisas aconteceram, com os problemas encontrados e corrigidos, está em [fase4/history.md](fase4/history.md).

## Requisitos da Fase 4

| Requisito | O que foi feito | Doc | Como validar |
|---|---|---|---|
| Arquitetura modular | Três apps Next.js servidas como um só site por Multi-Zones, e sete packages com uma responsabilidade cada, sem código copiado entre apps | [fase4/modularization.md](fase4/modularization.md) | `npm run lint` (regras de camada) e `npm run build`; no navegador, os menus das duas zonas por http://localhost:3000 |
| State management | RTK Query nas duas zonas, pela mesma fábrica de `@bytebank/store`, com tags e invalidação a cada escrita | [fase4/state-management.md](fase4/state-management.md) | `npm test` (a fábrica); DevTools → Network: uma transação nova recarrega saldo, extrato e gráficos sem reload |
| Clean Architecture | Domínio e casos de uso no `core`, sem framework; portas implementadas no `infrastructure` (json-server e Supabase); um BFF sem framework na borda | [fase4/domain.md](fase4/domain.md), [fase4/infrastructure.md](fase4/infrastructure.md), [fase4/bff.md](fase4/bff.md) | `npm test` (casos de uso com portas em memória, suítes de contrato dos dois bancos, handlers com `Request` reais) |
| Lazy loading e pré-carregamento | Recharts e os modais carregam sob demanda, com pré-carregamento na intenção (hover ou foco) e prefetch dos dados de cada período | [fase4/performance.md](fase4/performance.md) | DevTools → Network: nenhum chunk de modal ao abrir, o chunk chega no hover; First Load JS de `/dashboard` de 279,4 KB para 185,4 KB |
| Cache | Cache do RTK Query com invalidação, prefetch que o clique reaproveita, `no-store` nos dados financeiros e chunks imutáveis | [fase4/performance.md](fase4/performance.md#cache), [fase4/state-management.md](fase4/state-management.md) | Um período do gráfico já com hover não faz requisição no clique; `curl -sI` mostra `no-store` nas páginas e APIs e `immutable` nos chunks |
| Programação reativa | A busca e os filtros do extrato são um fluxo RxJS (`debounceTime`, `combineLatest`, `distinctUntilChanged`), com testes de marble | [fase4/reactive-programming.md](fase4/reactive-programming.md) | `npm test` (marble tests); no extrato, a lista muda uma vez, 300 ms depois da última tecla |
| Autenticação segura | scrypt, sessão JWT de 30 minutos, logout por inatividade, bloqueio após 5 tentativas, política de senha do OWASP ASVS 5.0, CSP com nonce, e sessões encerradas no servidor no logout e na troca de senha | [fase4/security.md](fase4/security.md) | Senhas erradas: a 6ª tentativa é bloqueada; `npm run test:session-race`; "Esqueci a senha" e o e-mail no Mailpit |
| Criptografia | Anexos cifrados com AES-256-GCM antes do banco, senhas e tokens só como hash, chaves dos limites com HMAC, HTTPS com HSTS | [fase4/security.md](fase4/security.md#attachments) | `npm test` (cifra, hash, chaves HMAC); o anexo gravado começa com `aes256gcm$v1$`; HSTS em produção |

Docs de apoio:

| Doc | O que cobre |
|---|---|
| [fase4/testing.md](fase4/testing.md) | A estratégia de testes e **todas as contagens**: unitários, Storybook, contrato, regressão no navegador, cobertura |
| [fase4/ci.md](fase4/ci.md) | O pipeline do GitHub Actions, o Dependabot e a auditoria de dependências |
| [fase4/deploy.md](fase4/deploy.md) | Supabase, Vercel, as variáveis de cada projeto e o teste do deploy |
| [fase4/accessibility.md](fase4/accessibility.md) | Contraste, teclado, leitores de tela e telas pequenas |
| [fase4/history.md](fase4/history.md) | A linha do tempo do trabalho, com os problemas encontrados e corrigidos |

## Arquitetura e convenções

- [architecture.md](architecture.md): o monorepo, as camadas, Multi-Zones, renderização, Docker e deploy.
- [conventions.md](conventions.md): idiomas, TypeScript, onde fica cada coisa, regras de camada, testes, commits e segredos.

## Decisões (ADRs)

| ADR | Decisão |
|---|---|
| [0001](adr/0001-money-in-integer-cents.md) | Dinheiro é um número inteiro de centavos, nunca ponto flutuante |
| [0002](adr/0002-calendar-dates-without-timezone.md) | Datas são dias de calendário, sem hora e sem fuso |
| [0003](adr/0003-english-transaction-type-codes.md) | Os tipos de transação são códigos estáveis em inglês, cada um com uma direção (entrada ou saída) |
| [0004](adr/0004-use-cases-depend-on-ports.md) | Os casos de uso dependem de portas, implementadas pelas camadas de fora |
| [0005](adr/0005-infrastructure-as-separate-package.md) | Os adaptadores ficam num package próprio (complementada pela 0007) |
| [0006](adr/0006-clock-in-sao-paulo-timezone.md) | "Hoje" é o dia de calendário em São Paulo, qualquer que seja o fuso do servidor |
| [0007](adr/0007-bff-with-framework-agnostic-handlers.md) | Um BFF com handlers sobre `Request` e `Response`, sem depender de framework |
| [0008](adr/0008-input-validation-at-the-boundary.md) | O formato é validado na borda, com Zod; as regras de negócio ficam no domínio |
| [0009](adr/0009-attachment-size-limit.md) | Anexos de até 70 KB, por causa do limite de corpo do json-server |
| [0010](adr/0010-supabase-as-production-database.md) | Supabase em produção, só como banco Postgres; o login continua nosso |

## Evidências

- [fase4/baseline.md](fase4/baseline.md): lint, build, tamanho do bundle, TypeScript e Lighthouse antes de qualquer mudança.
- [fase4/lighthouse/](fase4/lighthouse/): os relatórios do Lighthouse em PDF, com os mesmos quatro nomes nas duas pastas (`dashboard-desktop`, `dashboard-mobile`, `transactions-desktop`, `transactions-mobile`):
  - [before/](fase4/lighthouse/before/): o "antes" oficial da refatoração, uma rodada por página e dispositivo;
  - [after/](fase4/lighthouse/after/): a rodada mediana das 3 feitas para cada página e dispositivo. As medianas de cada métrica e as três rodadas estão na tabela de [performance.md](fase4/performance.md#lighthouse-before-and-after).
- As provas e os números de antes e depois de cada assunto ficam na doc dele: bundle e LCP em [performance.md](fase4/performance.md), pares de contraste em [accessibility.md](fase4/accessibility.md), smoke tests e limite do anexo em [bff.md](fase4/bff.md), comportamentos do json-server em [infrastructure.md](fase4/infrastructure.md), corrida de sessão, checagem de segredos e prova do server-only em [security.md](fase4/security.md), auditoria em [ci.md](fase4/ci.md).
