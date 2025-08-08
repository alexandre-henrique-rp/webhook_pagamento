---
description: Ideia, conceito e regras gerais do projeto webhook_pagamento
---

# Ideia e Conceito

- Objetivo: disponibilizar um endpoint de webhook para eventos de pagamento, persistindo estados e dados relacionados (ex.: solicitações, financeiros, usuários) em PostgreSQL via Prisma.
- Escopo inicial: receber notificações (ex.: PIX, transações), validar payload, registrar logs, atualizar entidades de domínio, e responder adequadamente ao provedor.

## Regras Gerais
- Segurança: validar assinatura/autorização do provedor (headers/secret) e sanitizar input.
- Idempotência: garantir que o mesmo evento não seja processado mais de uma vez (armazenar eventId/txid e checar duplicidade).
- Observabilidade: registrar `Logs` com rota, descrição e usuário quando aplicável.
- Resiliência: tratamento explícito de erros e retornos HTTP consistentes (`2xx` sucesso, `4xx` validação/credenciais, `5xx` falhas internas).
- Confiabilidade: transações no banco quando múltiplas entidades forem atualizadas.

## Padrões de Projeto e Arquitetura
- Clean Architecture + Simple Factory quando aplicável.
- DDD: separar camadas de domínio, aplicação, infraestrutura e interface (HTTP), mantendo regras de negócio independentes de frameworks.
- SOLID: classes/coordenadores/serviços com responsabilidade única.
- TDD: testes de unidade e integração (ex.: serviços de domínio e repositórios Prisma).

## Nomenclatura
- Português para domínios e arquivos.
- Inglês para nomes de variáveis e funções.

## Fluxo de Alto Nível (proposto)
1. Receber POST no `POST /webhooks/pagamentos`.
2. Validar cabeçalhos/assinatura e schema do corpo.
3. Checar idempotência (por `txid`/`eventId`).
4. Mapear evento para caso de uso de domínio (ex.: atualizar `Solicitacao`, registrar `relatorio_financeiro`).
5. Persistir via Prisma e registrar `Logs`.
6. Retornar 200/204 ao provedor.

## Variáveis de Ambiente (previstas)
- `DATABASE_URL`: conexão PostgreSQL para Prisma.
- `WEBHOOK_SECRET`: validação de assinatura do provedor (definir conforme integração).

## Próximos Passos
- Definir contratos de payload do provedor e estratégia de verificação de assinatura.
- Implementar endpoints e casos de uso alinhados ao domínio existente (`Solicitacao`, `Financeiro`, etc.).
