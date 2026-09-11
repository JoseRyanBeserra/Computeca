---

description: "Task list — Desativação Global das Funcionalidades de IA"
---

# Tasks: Desativação Global das Funcionalidades de IA

**Input**: Design documents from `/specs/001-disable-ai-features/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos e **obrigatórios**. O FR-019 exige cobertura nos dois estados do interruptor, e o Princípio V da constituição exige teste acompanhando a feature, com caminhos de erro e de autorização negada como casos obrigatórios.

**Organization**: Tarefas agrupadas por história de usuário, para que cada uma seja implementável e testável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual história pertence (US1, US2, US3, US4)
- Todo caminho de arquivo é explícito

## Path Conventions

Aplicação web com duas pontas no mesmo repositório: `MI-server/src/` (API Fastify) e `front/src/` (SPA React), conforme a Structure Decision do [plan.md](./plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: declarar o interruptor e o vocabulário de erro que todas as histórias consomem.

- [X] T001 Adicionar `AI_FEATURES_ENABLED` ao schema Zod em `MI-server/src/env.ts` — booleano derivado de string com `.default('false')` e `.transform((v) => v === 'true')`, seguindo o padrão já usado por `MINIO_USE_SSL` e `SMTP_SECURE`
- [X] T002 Tornar `OPENAI_API_KEY` condicionalmente obrigatória em `MI-server/src/env.ts` via `superRefine`, exigida com mensagem `'OPENAI_API_KEY is required'` apenas quando `AI_FEATURES_ENABLED` é `true`, anexando o erro ao campo `OPENAI_API_KEY` (depende de T001)
- [X] T003 [P] Acrescentar `SERVICE_UNAVAILABLE: 503` ao objeto `StatusCode` em `MI-server/src/utils/statusCode.ts`
- [X] T004 [P] Acrescentar a chave `AI` com `AI_DISABLED` e `AI_NOT_MANAGEABLE` ao objeto `ERRORS` em `MI-server/src/lib/errors/errors.ts`, ao lado da chave `CHAT` existente
- [X] T005 [P] Acrescentar as mensagens de `AI_DISABLED` e `AI_NOT_MANAGEABLE` em **pt-BR e en-US** em `MI-server/src/lib/errors/errorMessages.ts`, com os textos definidos em `contracts/ai-disabled-error.md`
- [X] T006 [P] Documentar `AI_FEATURES_ENABLED=false` em `MI-server/.env.example`, com comentário explicando que a ausência de `OPENAI_API_KEY` só é aceita enquanto a IA estiver desligada

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: persistência do estado operacional, resolução da disponibilidade efetiva e eliminação das conexões abertas no import de módulo.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar — toda decisão de renderização, recusa e conexão depende do resolvedor criado aqui.

- [X] T007 Criar o model `AppSetting` em `MI-server/prisma/schema.prisma` com `key String @id`, `value Json`, `updatedAt DateTime @updatedAt` e `updatedById String?`, mais a relação opcional `updatedBy User? @relation("AppSettingEditor", ...)`
- [X] T008 Acrescentar a relação inversa `appSettingsUpdated AppSetting[] @relation("AppSettingEditor")` ao model `User` em `MI-server/prisma/schema.prisma` (depende de T007)
- [X] T009 Gerar a migração aditiva com `npx prisma migrate dev --name add_app_setting` em `MI-server/`, confirmando que nenhuma linha existente é alterada (depende de T008)
- [X] T010 [P] Criar `MI-server/src/repositories/appSettingRepository.ts` com `findAppSettingByKey(key)` e `upsertAppSetting({ key, value, updatedById })` — apenas queries Prisma, sem lógica de negócio, conforme o Princípio I
- [X] T011 Criar `MI-server/src/constants/features.ts` expondo `AI_SETTING_KEY = 'ai.enabled'`, `isAiManageable()` (espelha `env.AI_FEATURES_ENABLED`) e `isAiEnabled()` assíncrono, resolvendo `AI_FEATURES_ENABLED && (registro?.enabled ?? true)`; o `value` é validado por Zod contra `{ enabled: boolean }` e, se malformado, é tratado como ausente com `logger.warn` (depende de T001, T010)
- [X] T012 Acrescentar cache em memória de processo a `MI-server/src/constants/features.ts`, com `invalidateAiAvailabilityCache()` exportado para uso na escrita, evitando consulta ao banco a cada requisição (depende de T011)
- [X] T013 [P] Converter `MI-server/src/lib/queue.ts` para acesso preguiçoso: remover `new Queue(...)`, o listener de erro e `waitUntilReady()` do corpo do módulo, expondo `getVectorizeQueue()` que instancia sob demanda, mantém a instância em memória e retorna `null` quando `AI_FEATURES_ENABLED` é `false`
- [X] T014 [P] Converter `MI-server/src/lib/openai.ts` para cliente preguiçoso via `getOpenAiClient()`, eliminando o `new OpenAI({ apiKey: env.OPENAI_API_KEY })` executado no import
- [X] T015 Atualizar os consumidores de `openai` em `MI-server/src/services/resources/materials/pdf/materialPdfChatService.ts`, `materialPdfSummaryService.ts` e `MI-server/src/workers/vectorizeWorker.ts` para usar `getOpenAiClient()` (depende de T014)
- [X] T016 [P] Escrever testes unitários da resolução de disponibilidade em `MI-server/__tests__/unit/config/features.test.ts`, cobrindo as quatro linhas da tabela-verdade de `data-model.md`, o registro malformado tratado como ausente e a invalidação de cache (depende de T012)
- [X] T017 [P] Escrever teste unitário em `MI-server/__tests__/unit/lib/queue.test.ts` provando que importar o módulo **não** abre conexão com Redis e que `getVectorizeQueue()` retorna `null` com a IA desativada (depende de T013)

**Checkpoint**: interruptor resolvível, nenhuma conexão aberta por import. As histórias podem começar.

---

## Phase 3: User Story 1 — Acervo sem vestígio de IA na interface (Priority: P1) 🎯 MVP

**Goal**: nenhum usuário, em nenhum perfil, encontra resumo, chat ou estado de processamento por IA — nem na tela, nem no conteúdo devolvido pela API.

**Independent Test**: percorrer todas as telas deslogado e logado em cada perfil, confirmando ausência total de elementos de IA, inclusive em material que já possui resumo gravado; e inspecionar as respostas de consulta de material confirmando ausência de `vectorStatus`.

### Tests for User Story 1

- [X] T018 [P] [US1] Teste de integração de `GET /config/features` em `MI-server/__tests__/integration/config/featureAvailability.test.ts`, cobrindo as três combinações válidas de `enabled`/`manageable`, o acesso **sem token** e o registro malformado, conforme `contracts/get-config-features.md`
- [X] T019 [P] [US1] Teste de integração em `MI-server/__tests__/integration/materials/materialAiFieldsOmitted.test.ts` provando que, com a IA desativada, `GET /mis/:id` e `GET /mis/all` **não** incluem `vectorStatus` no conteúdo retornado, e que com a IA ativada o campo volta a aparecer (FR-017)
- [X] T020 [P] [US1] Teste de `front/src/pages/MaterialDetailPage.test.tsx` confirmando que, com IA desativada, não há painel de resumo nem aviso de processamento — **inclusive para material com resumo já gravado** e com `vectorStatus` ausente na resposta
- [X] T021 [P] [US1] Teste de `front/src/pages/HomePage.test.tsx` confirmando ausência de ação de chat nos cards com IA desativada, para todos os perfis
- [X] T022 [P] [US1] Teste de `front/src/app/Router.test.tsx` confirmando que `/materials/:id/chat` redireciona para uma tela válida do acervo com IA desativada, sem mensagem de erro técnica

### Implementation for User Story 1

- [X] T023 [P] [US1] Criar `IFeatureAvailability` e `GetFeatureAvailabilityResponse` em `MI-server/src/@types/config/index.ts`, com o formato `{ ai: { enabled: boolean, manageable: boolean } }`
- [X] T024 [US1] Criar `MI-server/src/services/config/getFeatureAvailabilityService.ts` retornando `IFeatureAvailability` a partir de `isAiEnabled()` e `isAiManageable()`, com `logger.info` de entrada e saída (depende de T011, T023)
- [X] T025 [US1] Criar `MI-server/src/controllers/config/getFeatureAvailabilityController.ts` seguindo o padrão do projeto, com `InspectionLog` `CLIENT_TO_SERVER` antes do try/catch e `SERVER_TO_CLIENT` no sucesso e no erro (depende de T024)
- [X] T026 [US1] Criar `MI-server/src/routes/config/configRoutes.ts` registrando `GET /features` **sem** `authenticate`, com JSDoc declarando explicitamente que a rota é pública e por quê, conforme o Princípio II (depende de T025)
- [X] T027 [US1] Registrar `configRoutes` com prefixo `/config` em `MI-server/src/app.ts` (depende de T026)
- [X] T028 [P] [US1] Tornar `vectorStatus` **opcional** em `IPendingMaterial`, em `MI-server/src/@types/resources/materials/pdf/index.ts` (`vectorStatus?: VectorStatus`)
- [X] T029 [US1] Condicionar a seleção de `vectorStatus` a `isAiEnabled()` em `MI-server/src/repositories/resources/materials/pdf/materialPdfViewRepository.ts`, `materialPdfAllListRepository.ts` e `materialPdfPendingListRepository.ts` — **não alterar** `materialPdfChatRepository.ts` nem `materialPdfSummaryRepository.ts`, cujas leituras são internas e só executam com a IA ativa (depende de T011, T028)
- [X] T030 [P] [US1] Criar `front/src/features/config/api/configApi.ts` com `getFeatureAvailabilityRequest()` e os tipos correspondentes
- [X] T031 [US1] Criar `front/src/context/FeaturesContext.tsx` que consulta a disponibilidade uma única vez no carregamento e a expõe ao app, tratando falha de rede como **IA desativada** — o padrão seguro é esconder (depende de T030)
- [X] T032 [US1] Criar o hook `front/src/features/config/hooks/useFeatures.ts` sobre o contexto (depende de T031)
- [X] T033 [US1] Envolver a árvore da aplicação com `FeaturesProvider` em `front/src/main.tsx` ou `front/src/app/Router.tsx` (depende de T031)
- [X] T034 [US1] Condicionar a ação de chat em `front/src/pages/HomePage.tsx` — combinar `useFeatures().ai.enabled` com `canUseAiChat(user)`, **sem** alterar `front/src/lib/permissions.ts`, que permanece puro (depende de T032)
- [X] T035 [P] [US1] ~~Condicionar a ação de chat em `front/src/pages/MaterialsPage.tsx`~~ — **sem efeito**: a varredura por `onChat` mostrou que a ação de chat só existe em `HomePage.tsx`. `MaterialsPage` nunca a ofereceu
- [X] T036 [US1] Em `front/src/pages/MaterialDetailPage.tsx`: condicionar o painel de recursos de IA, o aviso `AiStatusNotice` e a chamada de `useMaterialSummary` — que **não deve ser disparada** com a IA desativada —, e tornar `vectorStatus` opcional no tipo de `front/src/features/materials/api/materialsApi.ts`, tratando a ausência do campo (depende de T028, T032)
- [X] T037 [US1] Redirecionar a rota `/materials/:id/chat` para o acervo em `front/src/app/Router.tsx` quando a IA estiver desativada (depende de T032)

**Checkpoint**: nenhum vestígio de IA na tela nem no conteúdo devolvido pela API. É o MVP.

---

## Phase 4: User Story 2 — Ambiente sobe sem os serviços de IA (Priority: P1)

**Goal**: `docker compose up -d` não inicia fila nem busca vetorial, e a aplicação sobe íntegra sem eles.

**Independent Test**: subir a stack, listar os serviços ativos e acompanhar os registros por 30 minutos, confirmando ausência de erros recorrentes de conexão.

### Tests for User Story 2

- [ ] T038 [P] [US2] Teste de integração em `MI-server/__tests__/integration/config/aiDisabledBoot.test.ts` provando que, com `AI_FEATURES_ENABLED=false`, a construção da aplicação não invoca `ensureQdrantCollection` nem instancia a fila (clientes espionados)
- [ ] T039 [P] [US2] Teste unitário em `MI-server/__tests__/unit/config/env.test.ts` cobrindo os dois lados de T002: `OPENAI_API_KEY` ausente **aceita** com IA desligada e **rejeitada** com IA ligada
- [ ] T040 [P] [US2] Teste unitário em `MI-server/__tests__/unit/config/aiReadinessCheck.test.ts` provando que, com a IA ligada e o Redis inalcançável, a verificação de inicialização registra aviso específico e **não** derruba a aplicação; e que nada é registrado com a IA desligada (FR-018)

### Implementation for User Story 2

- [ ] T041 [US2] Condicionar a chamada de `ensureQdrantCollection()` em `MI-server/src/server.ts` a `env.AI_FEATURES_ENABLED`, preservando o `try/catch` com aviso quando a IA estiver ligada (depende de T001)
- [ ] T042 [US2] Registrar na inicialização, em `MI-server/src/server.ts`, uma linha explícita informando se as funcionalidades de IA estão ativas ou desativadas, atendendo ao FR-016 (depende de T001)
- [ ] T043 [US2] Acrescentar a `MI-server/src/server.ts` uma verificação de alcance do **Redis** executada apenas quando a IA está ligada, registrando aviso claro e específico em caso de falha, sem impedir a subida — hoje a fila preguiçosa não conecta no boot, então a ausência do Redis só apareceria ao aprovar um material (FR-018, depende de T001, T013)
- [ ] T044 [US2] Fazer `MI-server/src/workers/vectorizeWorker.ts` encerrar de forma limpa, com mensagem explicativa e código de saída `0`, quando iniciado com a IA desativada (depende de T001)
- [ ] T045 [P] [US2] Mover `redis` e `qdrant` para `profiles: ["ai"]` em `MI-server/docker-compose.yml`, sem remover nenhuma definição de serviço ou volume
- [ ] T046 [US2] Mover `redis` e `qdrant` para `profiles: ["ai"]` em `docker-compose.prod.yml` e **remover do serviço `app` as entradas `depends_on` que apontam para eles** — um `depends_on` para serviço fora do profile ativo impede a stack de subir. Esta versão não vai para produção, então a alteração é por consistência do repositório
- [ ] T047 [P] [US2] Atualizar as instruções de subida em `MI-server/docker-compose.yml` e `README.md`, documentando `docker compose up -d` para a stack enxuta e `docker compose --profile ai up -d` para incluir os serviços de IA

**Checkpoint**: ambiente enxuto no ar, sem erro de conexão e sem depender de fila para aprovar material.

---

## Phase 5: User Story 3 — API não atende operações de IA (Priority: P2)

**Goal**: chamadas diretas às operações de IA recebem recusa limpa, sem consumir tokens nem poluir o registro de erro.

**Independent Test**: chamar cada operação de IA diretamente e conferir resposta, ausência de consumo de tokens e ausência de job criado.

### Tests for User Story 3

- [ ] T048 [P] [US3] Teste de integração em `MI-server/__tests__/integration/materials/materialAiDisabled.test.ts` cobrindo `POST /mis/:id/chat` e `GET /mis/:id/summary` com IA desativada — `503` e `code: AI_DISABLED` — e a volta ao comportamento original com a IA ativada
- [ ] T049 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialAiDisabled.test.ts` garantindo que, **sem token**, ambas as rotas respondem `401` e nunca `503`, provando a ordem dos `preHandler`
- [ ] T050 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialAiDisabled.test.ts`, com o cliente de IA espionado, provando que nenhuma chamada ao provedor é emitida com a IA desativada (FR-007)
- [ ] T051 [P] [US3] Teste de integração em `MI-server/__tests__/integration/materials/materialReviewNoQueue.test.ts` provando que aprovar um material com IA desativada conclui com sucesso e **não cria job**, deixando `vectorStatus` em `PENDING`

### Implementation for User Story 3

- [ ] T052 [US3] Criar `MI-server/src/middlewares/requireAiEnabled.ts` seguindo a assinatura de `requireUploadPermission`, lançando `GeneralErrorResponse(StatusCode.SERVICE_UNAVAILABLE, buildError(ERRORS.AI.AI_DISABLED))` quando `isAiEnabled()` for falso, com JSDoc explicando o uso após `authenticate` (depende de T003, T004, T011)
- [ ] T053 [US3] Aplicar `requireAiEnabled` como `preHandler` **após** `authenticate` nas rotas `POST /:id/chat` e `GET /:id/summary` em `MI-server/src/routes/resources/materials/pdf/materialPdfUploadRoutes.ts`, mantendo ambas registradas nos dois estados do interruptor (depende de T052)
- [X] T054 [US3] Condicionar o enfileiramento em `MI-server/src/services/resources/materials/pdf/materialPdfReviewService.ts` — com a IA desativada, a aprovação conclui sem chamar `vectorizeQueue.add`, e o acesso passa a usar `getVectorizeQueue()` (depende de T011, T013)

**Checkpoint**: porta dos fundos fechada. Orçamento de tokens e registros de erro protegidos contra chamadas diretas.

---

## Phase 6: User Story 4 — Reativação sem reescrever código (Priority: P3)

**Goal**: religar a IA por configuração e governá-la pelo painel, com o acervo pendente recuperável por comando administrativo.

**Independent Test**: religar a configuração, subir os serviços, alternar o controle no painel sem reiniciar e exercitar chat, resumo e o comando de reprocessamento.

### Tests for User Story 4

- [ ] T055 [P] [US4] Teste de integração de `PATCH /config/features/ai` em `MI-server/__tests__/integration/config/updateAiAvailability.test.ts`, cobrindo desligar, religar, `403` para `PROFESSOR`, `401` sem token e `422` para `{"enabled": "false"}`, conforme `contracts/patch-admin-features-ai.md`
- [ ] T056 [P] [US4] Teste em `MI-server/__tests__/integration/config/updateAiAvailability.test.ts` provando que, com `AI_FEATURES_ENABLED=false`, o `PATCH` responde `409` com `code: AI_NOT_MANAGEABLE` e **nada é gravado** no banco
- [ ] T057 [P] [US4] Teste em `MI-server/__tests__/integration/config/updateAiAvailability.test.ts` provando o efeito sem reinício: após desligar pelo painel, `POST /mis/:id/chat` passa a responder `503` na mesma execução da aplicação (SC-008)
- [ ] T058 [P] [US4] Teste em `MI-server/__tests__/integration/config/updateAiAvailability.test.ts` provando que a mudança de valor grava `AuditLog` com `action: AI_AVAILABILITY_CHANGED` e `metadata: { de, para }`, e que **repetir o mesmo valor não gera registro**
- [ ] T059 [P] [US4] Teste de `front/src/pages/AdminDashboardPage.test.tsx` confirmando que o controle aparece **bloqueado e explicado** quando `manageable` é `false`, e operante quando é `true`
- [ ] T060 [P] [US4] Teste do comando de reprocessamento em `MI-server/__tests__/unit/scripts/aiBackfill.test.ts`, cobrindo a recusa com IA desativada, a contagem informada antes de iniciar e a seleção de `PENDING` e `FAILED` com exclusão de `PROCESSING`

### Implementation for User Story 4

- [ ] T061 [P] [US4] Criar `MI-server/src/schemas/config/updateAiAvailabilitySchema.ts` exportando `UpdateAiAvailabilityBodySchema` com `enabled: z.boolean()` estrito, o tipo `UpdateAiAvailabilityRequest`, o schema de service `updateAiAvailabilitySchema` com `updatedById` e o tipo `UpdateAiAvailabilityServiceInput`
- [ ] T062 [US4] Criar `MI-server/src/services/config/updateAiAvailabilityService.ts` — valida com `validateRequest`, recusa com `409 AI_NOT_MANAGEABLE` quando `isAiManageable()` for falso, grava via `upsertAppSetting` no formato `{ "enabled": boolean }`, invalida o cache e grava `AuditLog` **apenas quando o valor muda** (depende de T010, T012, T061)
- [ ] T063 [US4] Criar `MI-server/src/controllers/config/updateAiAvailabilityController.ts` com `authorizeByRole(request.user.role, [ADMIN])` e `InspectionLog` nos dois sentidos, sucesso e erro (depende de T062)
- [ ] T064 [US4] Registrar `PATCH /features/ai` com `preHandler: [authenticate]` em `MI-server/src/routes/config/configRoutes.ts`, com JSDoc `/** PATCH /config/features/ai — altera a disponibilidade da IA (ADMIN) */` (depende de T063)
- [ ] T065 [P] [US4] Acrescentar `updateAiAvailabilityRequest()` a `front/src/features/config/api/configApi.ts` (depende de T030)
- [ ] T066 [US4] Acrescentar a `front/src/pages/AdminDashboardPage.tsx` a seção de disponibilidade da IA, com o controle desabilitado e texto explicativo quando `manageable` for `false`, e invalidação da consulta de features após a alteração (depende de T032, T065)
- [ ] T067 [P] [US4] Criar `MI-server/scripts/aiBackfill.ts` que recusa execução com a IA desativada, seleciona materiais `APPROVED` com `vectorStatus` em `PENDING` ou `FAILED` — **excluindo `PROCESSING`**, que pode ter job vivo —, informa o total antes de iniciar e enfileira via `getVectorizeQueue()` (depende de T011, T013)
- [ ] T068 [US4] Registrar o script `"ai:backfill": "tsx scripts/aiBackfill.ts"` em `MI-server/package.json` (depende de T067)

**Checkpoint**: decisão reversível de ponta a ponta, sem nenhum arquivo restaurado.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T069 [P] Documentar o interruptor de dois níveis e os perfis do Compose em `README.md` e `MI-server/CLAUDE.md`
- [ ] T070 [P] Verificar a cobertura das funções tocadas com `npm --prefix MI-server run test:coverage`, atendendo ao Princípio V
- [ ] T071 Executar a suíte completa nas duas pontas — `test:unit`, `test:integration` e `npm --prefix front run test` — confirmando que nenhum fluxo não-IA teve expectativa alterada (SC-005)
- [ ] T072 Percorrer os 8 cenários de [quickstart.md](./quickstart.md) no ambiente real, medindo o consumo de memória para comparar com a linha de base de ~533 MiB (SC-002)
- [ ] T073 Confirmar `git diff --stat --diff-filter=D main...001-disable-ai-features` com saída vazia, provando que nenhum arquivo foi removido (SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências
- **Foundational (Fase 2)**: depende da Fase 1 — **bloqueia todas as histórias**
- **US1 (Fase 3)**, **US2 (Fase 4)**, **US3 (Fase 5)**, **US4 (Fase 6)**: dependem da Fase 2
- **Polish (Fase 7)**: depende das histórias desejadas

### User Story Dependencies

- **US1 (P1)**: independente após a Fase 2
- **US2 (P1)**: independente após a Fase 2 — não depende de US1
- **US3 (P2)**: independente após a Fase 2. Na prática combina bem com US2, que remove os serviços que as rotas recusadas usariam
- **US4 (P3)**: usa a rota `GET /config/features` de US1 (T026) e o cliente de front de T030. **Faça US1 antes de US4.**

### Parallel Opportunities

- T003, T004, T005 e T006 em paralelo, após T001
- T010, T013, T014 em paralelo dentro da Fase 2
- Todos os testes de uma mesma história marcados `[P]`
- US1 e US2 podem correr em paralelo por pessoas diferentes — tocam arquivos disjuntos
- US3 toca apenas back; US1 toca as duas pontas

---

## Parallel Example: User Story 1

```bash
# Testes da US1, juntos:
Task: "Teste de integração de GET /config/features em MI-server/__tests__/integration/config/featureAvailability.test.ts"
Task: "Teste de omissão de vectorStatus em MI-server/__tests__/integration/materials/materialAiFieldsOmitted.test.ts"
Task: "Teste de MaterialDetailPage em front/src/pages/MaterialDetailPage.test.tsx"
Task: "Teste de HomePage em front/src/pages/HomePage.test.tsx"
Task: "Teste de Router em front/src/app/Router.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 — Setup
2. Fase 2 — Foundational (**crítica**, bloqueia tudo)
3. Fase 3 — US1
4. **PARE E VALIDE**: percorra as telas em todos os perfis e inspecione o conteúdo devolvido pela API
5. A promessa ao usuário final já está cumprida

### Incremental Delivery

1. Setup + Foundational → base pronta
2. + US1 → interface e payload limpos → **MVP**
3. + US2 → serviços fora do ar
4. + US3 → orçamento de tokens protegido
5. + US4 → decisão reversível

### Ordem recomendada para uma pessoa só

US1 → US2 → US3 → US4. US1 entrega valor visível primeiro; US2 depende de nada de US1 mas se beneficia de já haver um estado resolvível testado; US4 por último porque consome a rota criada em US1.
