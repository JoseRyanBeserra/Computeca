# Implementation Plan: Desativação Global das Funcionalidades de IA

**Branch**: `001-disable-ai-features` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-disable-ai-features/spec.md`

## Summary

Desativar chat com PDF, resumo automático e vetorização sem remover código, e permitir subir o
ambiente sem os serviços de fila e busca vetorial.

A abordagem é um **interruptor em dois níveis**. Um booleano de ambiente (`AI_FEATURES_ENABLED`,
padrão `false`) governa a existência da IA na instalação: sem ele, nenhuma conexão com Redis ou
Qdrant é aberta, as rotas de IA recusam, o worker não sobe e o front não renderiza nada de IA.
Acima dele, um registro persistido em banco, editável pelo painel administrativo, governa a
disponibilidade operacional com efeito imediato — subordinado ao primeiro, nunca capaz de
sobrepô-lo.

Os serviços Redis e Qdrant saem do conjunto padrão do Docker via **Compose profiles**, de modo que
`docker compose up -d` sobe a stack enxuta e `docker compose --profile ai up -d` devolve os dois.

Três obstáculos concretos, já identificados no código, determinam o desenho:

1. `lib/queue.ts` instancia a `Queue` e chama `waitUntilReady()` **no import do módulo** — precisa
   virar acesso preguiçoso, senão importar qualquer coisa que dependa dele abre conexão com Redis.
2. `server.ts` chama `ensureQdrantCollection()` na inicialização.
3. `env.ts` exige `OPENAI_API_KEY` incondicionalmente — a aplicação hoje não sobe sem a chave,
   o que contraria frontalmente o FR-008.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js >= 20 (back e front)

**Primary Dependencies**: Back — Fastify 5, Prisma 7, Zod 4, BullMQ 5, `@qdrant/js-client-rest`,
`openai`, Pino. Front — React 19, Vite 8, TanStack Query, Axios.

**Storage**: PostgreSQL via Prisma (relacional); MinIO/S3 (arquivos); Qdrant (vetores, a desativar);
Redis (fila, a desativar).

**Testing**: Vitest — `vitest.unit.config.ts` e `vitest.integration.config.ts` no back,
Vitest + Testing Library no front.

**Target Platform**: Contêineres Linux orquestrados por Docker Compose, Nginx como proxy reverso.

**Project Type**: Aplicação web com back-end e front-end separados no mesmo repositório.

**Performance Goals**: Sem meta nova. A feature remove trabalho, não adiciona. A leitura do estado
de disponibilidade não pode adicionar latência perceptível às telas — resolvida por uma consulta
única no carregamento do front, servida de cache em memória no back.

**Constraints**: Nenhuma migração destrutiva; nenhum arquivo de IA removido; comportamento de todos
os fluxos não-IA inalterado; estado desativado é o padrão de quem clona o repositório.

**Scale/Scope**: 2 rotas de IA a bloquear, 1 worker, 1 ponto de enfileiramento, 4 telas de front
afetadas, 2 arquivos de Compose, 1 comando administrativo novo.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Como o desenho atende |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa | As rotas novas seguem a convenção: `UpdateAiAvailabilityRequest` derivado de `UpdateAiAvailabilityBodySchema`, `updateAiAvailabilitySchema` validado com `validateRequest` no service, resposta `IFeatureAvailability` em `@types/`. |
| **II. Autorização explícita por perfil** | ✅ Passa | `PATCH /admin/features/ai` exige `authenticate` + `authorizeByRole([ADMIN])`, com JSDoc declarando o perfil. `GET /config/features` é público por decisão consciente — o front precisa dele antes do login para não renderizar IA a visitante. |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa | Toda alteração da disponibilidade grava `AuditLog` (`AI_AVAILABILITY_CHANGED`) com ator, papel e valores anterior/novo; os controllers gravam `InspectionLog` nos dois sentidos; o estado do interruptor é registrado na inicialização (FR-016). |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa | Nada pesado entra na request. O comando de reprocessamento apenas **enfileira**; o processamento continua no worker. Com a IA desativada, nenhum job é criado. |
| **V. Teste acompanha a feature** | ✅ Passa | Toda rota e todo ponto de decisão são exercitados nos dois estados do interruptor, incluindo a recusa (FR-017). |

**Restrições de Stack** — dois pontos merecem registro explícito:

- *"Funções de IA MUST ser desativáveis globalmente por painel administrativo, sem redeploy"*: o
  desenho **atende**. Com a instalação habilitada, o painel liga e desliga sem reinício. O nível de
  ambiente não é uma exceção a essa regra; é a camada abaixo dela, que decide se a instalação tem
  IA instalada de todo — equivalente a não ter o serviço provisionado.
- *"Toda variável de ambiente é declarada e validada em `src/env.ts`"*: `AI_FEATURES_ENABLED` entra
  lá, e `OPENAI_API_KEY` passa de obrigatória a **condicionalmente obrigatória**, exigida apenas
  quando a IA está habilitada.

**Resultado do gate: aprovado, sem violações.** A seção Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/001-disable-ai-features/
├── plan.md              # Este arquivo
├── spec.md              # Especificação
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   ├── get-config-features.md
│   ├── patch-admin-features-ai.md
│   └── ai-disabled-error.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
MI-server/
├── prisma/
│   └── schema.prisma                       # + model AppSetting
├── scripts/
│   └── aiBackfill.ts                       # novo — comando de reprocessamento
└── src/
    ├── env.ts                              # + AI_FEATURES_ENABLED; OPENAI_API_KEY condicional
    ├── server.ts                           # ensureQdrantCollection() condicionado
    ├── app.ts                              # registro das rotas de configuração
    ├── constants/
    │   └── features.ts                     # novo — chave e leitura do interruptor mestre
    ├── lib/
    │   ├── queue.ts                        # Queue preguiçosa (getVectorizeQueue)
    │   ├── qdrant.ts                       # cliente já é preguiçoso — apenas guarda
    │   └── openai.ts                       # cliente preguiçoso
    ├── middlewares/
    │   └── requireAiEnabled.ts             # novo — recusa uniforme quando IA indisponível
    ├── schemas/config/
    │   └── updateAiAvailabilitySchema.ts   # novo
    ├── services/config/
    │   ├── getFeatureAvailabilityService.ts    # novo
    │   └── updateAiAvailabilityService.ts      # novo
    ├── controllers/config/
    │   ├── getFeatureAvailabilityController.ts # novo
    │   └── updateAiAvailabilityController.ts   # novo
    ├── repositories/
    │   └── appSettingRepository.ts         # novo
    ├── routes/config/
    │   └── configRoutes.ts                 # novo
    ├── @types/config/
    │   └── index.ts                        # novo — IFeatureAvailability
    ├── utils/statusCode.ts                 # + SERVICE_UNAVAILABLE
    ├── lib/errors/errors.ts                # + AI.AI_DISABLED
    ├── lib/errors/errorMessages.ts         # + mensagens pt-BR e en-US
    ├── workers/vectorizeWorker.ts          # encerra limpo quando IA desativada
    └── services/resources/materials/pdf/
        └── materialPdfReviewService.ts     # enfileiramento condicionado

front/
└── src/
    ├── features/config/
    │   ├── api/configApi.ts                # novo
    │   └── hooks/useFeatures.ts            # novo
    ├── context/
    │   └── FeaturesContext.tsx             # novo — provê o estado ao app
    ├── app/Router.tsx                      # rota de chat redireciona quando desativada
    ├── pages/HomePage.tsx                  # ação de chat condicionada
    ├── pages/MaterialDetailPage.tsx        # painel de resumo e aviso condicionados
    ├── pages/MaterialsPage.tsx             # ação de chat condicionada
    └── pages/AdminDashboardPage.tsx        # controle de disponibilidade

MI-server/docker-compose.yml                # redis e qdrant sob profile "ai"
docker-compose.prod.yml                     # idem + depends_on ajustado
```

**Structure Decision**: mantida a separação existente entre `MI-server/` (API Fastify) e `front/`
(SPA React), sem introduzir novo pacote ou camada. Todos os arquivos novos seguem a estrutura de
pastas já consolidada — `schemas/` → `services/` → `controllers/` → `routes/`, com `repositories/`
restrito a queries Prisma — e o domínio novo recebe o nome `config`, coerente com os domínios
existentes (`auth`, `users`, `logs`, `organizations`, `resources`).

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação identificada. Seção intencionalmente vazia.
