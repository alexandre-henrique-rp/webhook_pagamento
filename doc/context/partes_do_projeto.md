---
description: Detalhamento por partes do projeto webhook_pagamento
---

# Estrutura de Pastas e Responsabilidades

- `prisma/schema.prisma`
  - Define modelos de domínio: `User`, `Solicitacao`, `Construtora`, `Empreendimento`, `Financeiro`, `Alert`, `Chamado`, `Logs`, `Tag`, `TagList`, `Termo`, `Suporte`, `Direto`, `DiretoTag`, `relatorio_financeiro`, `FinanceiroConstrutora`, `FinanceiroEmpreendimento`, `UserConstrutora`, `UserEmpreendimento`, `UserFinanceiro`, `SystemMessage`, `VideosFaq`.
  - Índices e chaves compostas para relacionamentos e buscas eficientes.
  - Provider: PostgreSQL via `DATABASE_URL`.

- `src/lib/prisma.ts`
  - Exporta uma instância única do `PrismaClient` para ser reutilizada em toda a aplicação.
  - Uso esperado: importar `prisma` nos casos de uso/repositórios para operações no banco.

- `src/server.ts`
  - Ponto de entrada HTTPS do serviço com mTLS. Implementado com `https.createServer` e Express.
  - Middlewares: `morgan` (logs), `express.json()`, `express.urlencoded()`.
  - Rotas: `GET /health`, `POST /webhook/pix` (exige mTLS válido; acessa `request.socket` como `TLSSocket`).

# Regras e Contratos por Parte

- __Camada HTTP (`src/server.ts` + rotas)__
  - Validar assinatura/headers do provedor (`WEBHOOK_SECRET`).
  - Validar schema do corpo (ex.: Zod/Valibot ou validador simples com TypeScript).
  - Retornar códigos HTTP apropriados.

- __Casos de Uso (Aplicação)__
  - Orquestrar validações, idempotência e persistência.
  - Mapear evento → atualização de entidades (`Solicitacao`, `Financeiro`, `relatorio_financeiro`).

- __Repositórios (Infraestrutura)__
  - Implementar acesso ao banco com `prisma`.
  - Criar métodos coesos (ex.: `findSolicitacaoByTxid`, `updateSituacaoPagamento`).

- __Domínio__
  - Entidades e regras de negócio desacopladas da infraestrutura.
  - Serviços de domínio pequenos e testáveis.

# Rotas Atuais
- `GET /health` → status do serviço.
- `POST /webhook/pix` → recebe eventos PIX (requer mTLS válido) e delega a caso de uso (a definir).

# Logs
- Utilizar modelo `Logs` para registrar eventos relevantes:
  - `rota`, `descricao`, `User`(quando aplicável), timestamps.

# Idempotência
- Armazenar/consultar `txid` ou `eventId` antes de processar.
- Estratégia inicial: índice único ou tabela auxiliar de eventos processados.

# Testes (TDD)
- Unitários: serviços de domínio e casos de uso.
- Integração: repositórios Prisma (com banco de testes ou SQLite em memória se aplicável ao Prisma v6).

# Ações Técnicas Pendentes
- Implementar `src/server.ts` com Express e rotas propostas.
- Definir verificação de assinatura do provedor e variáveis `.env`.
- Criar repositórios e casos de uso com interfaces para facilitar testes.
