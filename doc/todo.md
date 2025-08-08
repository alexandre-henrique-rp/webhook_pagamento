---
description: Checklist e sprints do projeto webhook_pagamento
---

# Checklist

- [x] Mapear tecnologias e arquitetura (package.json, tsconfig.json, biome.json, prisma)
- [x] Criar pasta `doc/context/`
- [x] Documentar tecnologias e arquitetura (`doc/context/tecnologias_arquitetura.md`)
- [x] Documentar ideia, conceito e regras (`doc/context/ideia_conceito_regras.md`)
- [x] Detalhar partes do projeto (`doc/context/partes_do_projeto.md`)
- [x] Implementar `src/server.ts` com Express e middlewares básicos
- [x] Definir rota `GET /health`
- [x] Definir rota `POST /webhook/pix` (mTLS)
- [ ] Implementar verificação de assinatura (`WEBHOOK_SECRET`)
- [ ] Implementar idempotência por `txid/eventId`
- [ ] Criar repositórios Prisma (ex.: `SolicitacaoRepository`)
- [ ] Criar casos de uso (ex.: `ProcessarPagamentoUseCase`)
- [ ] Adicionar testes unitários (TDD)
- [ ] Adicionar testes de integração do repositório
- [x] Documentar variáveis de ambiente e exemplos (TLS_CERT_PATH, TLS_KEY_PATH, EFI_CA_PATH, PORT)
- [ ] Atualizar README com instruções de execução

# Sprints

## Sprint 1 — Fundação do Serviço
- [x] Documentação de contexto (arquitetura, ideia, partes)
- [x] Implementar servidor e rotas básicas
- [x] Definir variáveis de ambiente e configuração

## Sprint 2 — Domínio e Persistência
- [ ] Repositórios e casos de uso
- [ ] Idempotência e logs
- [ ] Testes (unidade e integração)

## Sprint 3 — Observabilidade e Hardening
- [ ] Melhorias de logs e métricas
- [ ] Tratamento de erros consistente
- [ ] Revisão de segurança (assinatura/headers)
