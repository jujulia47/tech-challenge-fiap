# Documentação

Para cada requisito da Fase 4: o que foi feito, onde está explicado e como validar. As docs técnicas estão em inglês, como manda a convenção do repositório, e descrevem o estado final do projeto.

## Requisitos da Fase 4

| Requisito | O que foi feito | Doc | Como validar |
|---|---|---|---|
| Arquitetura modular | Três apps Next.js servidas como um só site por Multi-Zones, e sete packages com uma responsabilidade cada, sem código copiado entre apps | [modularization.md](fase4/modularization.md) | `npm run lint` (regras de camada) e `npm run build`; no navegador, os menus das duas zonas por http://localhost:3000 |
| State management | RTK Query nas duas zonas, pela mesma fábrica de `@bytebank/store`, com tags e invalidação a cada escrita | [state-management.md](fase4/state-management.md) | `npm test`; no DevTools, uma transação nova recarrega saldo, extrato e gráficos sem reload |
| Clean Architecture | Domínio e casos de uso no `core`, sem framework; portas implementadas no `infrastructure` para json-server e Supabase; um BFF sem framework na borda | [domain.md](fase4/domain.md), [infrastructure.md](fase4/infrastructure.md), [bff.md](fase4/bff.md) | `npm test`: casos de uso com portas em memória, suítes de contrato dos dois bancos, handlers com `Request` reais |
| Lazy loading e pré-carregamento | Recharts e os modais carregam sob demanda, com pré-carregamento no hover ou no foco e prefetch dos dados de cada período | [performance.md](fase4/performance.md) | No DevTools, nenhum chunk de modal ao abrir e o chunk chega no hover; First Load JS de `/dashboard` de 279,4 KB para 185,4 KB |
| Cache | Cache do RTK Query com invalidação, prefetch que o clique reaproveita, `no-store` nos dados financeiros e chunks imutáveis | [performance.md](fase4/performance.md#cache), [state-management.md](fase4/state-management.md) | Um período do gráfico já com hover não faz requisição no clique; `curl -sI` mostra `no-store` nas páginas e `immutable` nos chunks |
| Programação reativa | Busca e filtros do extrato como um fluxo RxJS (`debounceTime`, `combineLatest`, `distinctUntilChanged`), com testes de marble | [reactive-programming.md](fase4/reactive-programming.md) | `npm test`; no extrato, a lista muda uma vez, logo depois da última tecla |
| Autenticação segura | scrypt, sessão JWT de 30 minutos, logout por inatividade, bloqueio após 5 tentativas, política de senha do OWASP ASVS 5.0, CSP com nonce, e sessões encerradas no servidor pelo "Sair" e pela troca de senha | [security.md](fase4/security.md) | Senhas erradas: a 6ª tentativa é bloqueada; `npm run test:session-race` (12 de 12 em produção); "Esqueci a senha" e o e-mail no Mailpit |
| Criptografia | Anexos cifrados com AES-256-GCM antes do banco, senhas e tokens só como hash, chaves dos limites com HMAC, HTTPS com HSTS | [security.md](fase4/security.md#attachments) | `npm test`; o anexo gravado começa com `aes256gcm$v1$`; HSTS em produção |

Docs de apoio:

| Doc | O que cobre |
|---|---|
| [testing.md](fase4/testing.md) | A estratégia de testes e todas as contagens |
| [ci.md](fase4/ci.md) | O pipeline do GitHub Actions, o Dependabot e a auditoria de dependências |
| [deploy.md](fase4/deploy.md) | Supabase, Vercel, as variáveis de cada projeto e o teste do deploy |
| [accessibility.md](fase4/accessibility.md) | Contraste, teclado, leitores de tela e telas pequenas (Lighthouse de 88 para 100) |

## Arquitetura e convenções

- [architecture.md](architecture.md): o monorepo, as camadas, Multi-Zones, renderização, Docker e deploy.
- [conventions.md](conventions.md): idiomas, TypeScript, onde fica cada coisa, regras de camada, testes, commits e segredos.

## Decisões (ADRs)

| ADR | Decisão |
|---|---|
| [0001](adr/0001-money-in-integer-cents.md) | Dinheiro é um número inteiro de centavos, nunca ponto flutuante |
| [0002](adr/0002-calendar-dates-without-timezone.md) | Datas são dias de calendário, sem hora e sem fuso |
| [0003](adr/0003-english-transaction-type-codes.md) | Os tipos de transação são códigos estáveis em inglês, cada um com uma direção |
| [0004](adr/0004-use-cases-depend-on-ports.md) | Os casos de uso dependem de portas, implementadas pelas camadas de fora |
| [0005](adr/0005-infrastructure-as-separate-package.md) | Os adaptadores ficam num package próprio (complementada pela 0007) |
| [0006](adr/0006-clock-in-sao-paulo-timezone.md) | "Hoje" é o dia de calendário em São Paulo, qualquer que seja o fuso do servidor |
| [0007](adr/0007-bff-with-framework-agnostic-handlers.md) | Um BFF com handlers sobre `Request` e `Response`, sem framework |
| [0008](adr/0008-input-validation-at-the-boundary.md) | O formato é validado na borda com Zod, e as regras de negócio ficam no domínio |
| [0009](adr/0009-attachment-size-limit.md) | Anexos de até 70 KB, por causa do limite de corpo do json-server |
| [0010](adr/0010-supabase-as-production-database.md) | Supabase em produção, só como banco Postgres; o login continua nosso |

## Evidências

- [baseline.md](fase4/baseline.md): lint, build, tamanho do bundle e Lighthouse antes de qualquer mudança.
- [lighthouse/](fase4/lighthouse/): os relatórios do Lighthouse em PDF, com os mesmos quatro nomes nas duas pastas. [before/](fase4/lighthouse/before/) é o ponto de partida da refatoração, e [after/](fase4/lighthouse/after/) guarda a rodada mediana de cada página e dispositivo. A comparação está em [performance.md](fase4/performance.md#lighthouse-before-and-after).
