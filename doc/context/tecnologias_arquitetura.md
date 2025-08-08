---
description: Tecnologias e Arquitetura do projeto webhook_pagamento
---

# Visão Geral

- Nome: webhook_pagamento
- Linguagem: TypeScript (Node.js)
- Framework web: Express 5
- ORM: Prisma (PostgreSQL)
- Lint/Format: Biome
- Build: TypeScript (tsc)
- Dev runner: tsx

## Scripts (`package.json`)
- dev: `tsx watch src/server.ts`
- build: `tsc`
- lint: `npx @biomejs/biome lint ./src`
- format: `npx @biomejs/biome format --write ./src`

## Configuração TypeScript (`tsconfig.json`)
- target: `es2022`
- module: `commonjs`
- rootDir: `./src`
- outDir: `./dist`
- strict mode habilitado
- `esModuleInterop`: true

## Biome (`biome.json`)
- Formatter habilitado, indent 2, lineWidth 12
- Linter habilitado com regras recomendadas
- Ajustes de estilo e complexidade (ex.: `complexity.noForEach: warn`)
- Organizar imports automático

## ORM e Banco de Dados
- Cliente: `@prisma/client`
- Migrations/CLI: `prisma`
- Datasource: `postgresql`
- Variável: `DATABASE_URL` (definir em `.env`)

### Schema principal (`prisma/schema.prisma`)
- Modelos: `User`, `Solicitacao`, `Construtora`, `Empreendimento`, `Financeiro`, `Alert`, `Chamado`, `Logs`, `Tag`, `TagList`, `Termo`, `Suporte`, `Direto`, `DiretoTag`, `relatorio_financeiro`, `FinanceiroConstrutora`, `FinanceiroEmpreendimento`, `UserConstrutora`, `UserEmpreendimento`, `UserFinanceiro`, `SystemMessage`, `VideosFaq`.
- Relacionamentos com chaves compostas e índices (ex.: `@@id([userId, construtoraId])`, `@@index([email])`).

## Estrutura de Pastas
```
prisma/
  schema.prisma
src/
  lib/
    prisma.ts            // exporta PrismaClient singleton
  server.ts              // ponto de entrada HTTP (a definir)
```

## Padrões e Boas Práticas (conforme regras globais do projeto)
- Clean Code, SOLID, DDD, TDD, Clean Architecture com Simple Factory quando aplicável.
- Nomeação: português para domínios/arquivos, inglês para variáveis e funções.
- Funções pequenas e com responsabilidade única.

## Pontos em Aberto
 - Servidor HTTPS com mTLS implementado em `src/server.ts` usando `https.createServer`.
 - Endpoints atuais:
   - `GET /health` (status)
   - `POST /webhook/pix` (recepção do webhook PIX, exige mTLS válido)
 - Variáveis de ambiente exigidas para TLS/mTLS:
   - `TLS_CERT_PATH` (caminho do fullchain do domínio)
   - `TLS_KEY_PATH` (caminho da chave privada do domínio)
   - `EFI_CA_PATH` (CA pública da Efí para validar o client cert)
   - `PORT` (opcional, padrão 8443)
 - Opções TLS:
   - `minVersion: TLSv1.2`, `requestCert: true`, `rejectUnauthorized: true`
 - Próximos passos:
   - Validar assinatura/headers do provedor no corpo do webhook (além do mTLS)
   - Processamento assíncrono/idempotente do payload (fila/worker)
   - Integração com Prisma para persistir eventos e logs
