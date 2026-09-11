---

description: "Task list — Edição de Material Instrucional pelo Administrador"
---

# Tasks: Edição de Material Instrucional pelo Administrador

**Input**: Design documents from `/specs/005-material-edit/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos e **obrigatórios**. O FR-023 lista o que precisa ser exercitado, e o Princípio V
exige teste acompanhando a feature. Os casos de erro e de autorização negada são obrigatórios, não
opcionais.

**Correção ao plano**: a rota do front para material é `/materials/:id`, não `/mis/:id`. A tela de
edição fica em **`/materials/:id/edit`**. O caminho no servidor continua `PUT /mis/:id`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual história pertence (US1, US2, US3)
- Todo caminho de arquivo é explícito

## Path Conventions

Feature nas duas pontas: `MI-server/` (API) e `front/` (SPA). **Nenhuma migração** — a feature não
acrescenta coluna nem tabela.

---

## ⚠️ Leia antes de começar

**A US3 não é adiável.** O Princípio III exige registro de auditoria para **toda** ação que altera
estado. Editar um material é exatamente isso. Portanto:

- A gravação do `AuditLog` está em **T025**, dentro da US1 — não na US3.
- A US3 contém o que **prova** esse registro, mais as regras finas (o que entra no registro quando o
  documento é trocado, e o silêncio quando nada mudou).
- **O MVP é a US1 completa**, incluindo T025. Entregar edição sem registro seria violação
  constitucional, não uma fatia menor.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: o contrato de entrada existir. Tudo depende disto.

- [X] T001 Exportar `titleSchema`, `descriptionSchema` e `habilidadesBnccSchema` de `MI-server/src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts` — hoje são `const` privados do módulo. **Exportar em vez de redeclarar** é o que garante que mudar o mínimo da descrição valha no cadastro e na edição de uma vez
- [X] T002 Exportar de `MI-server/src/services/resources/materials/pdf/materialPdfUploadService.ts` as verificacoes de arquivo hoje privadas do modulo: `validatePDFBuffer`, `sanitizeForStorageKey`, `PDF_MAGIC`, `ALLOWED_MIME_TYPE` e `maxFileSizeBytes`. **Sem isto o T036 nao tem como cumprir "as mesmas verificacoes do cadastro"** e quem implementar vai duplica-las — a mesma duplicacao que quebrou o envio por projeto e que ja foi corrigida duas vezes neste projeto. Se a extracao para um modulo proprio ficar mais limpa que exportar do service, ela serve igual; o que nao serve e copiar
- [X] T003 [P] Acrescentar `EditMIInput { materialId: string; title: string; description: string; habilidadesBncc?: string[]; buffer?: Buffer; originalFileName?: string; mimeType?: string; editedById: string }` a `MI-server/src/@types/resources/materials/pdf/index.ts`. **`buffer` opcional é o que expressa "não trocar o documento"**
- [X] T004 Criar `MI-server/src/schemas/resources/materials/pdf/materialPdfEditSchema.ts` consumindo os schemas exportados em T001, mais `materialId: z.string().uuid()` e `editedById: z.string().uuid()`. **Título e descrição são obrigatórios, nunca opcionais**: campo opcional tornaria "omiti a descrição" indistinguível de "mantenha a atual", e uma descrição inválida atravessaria a edição sem ser conferida (depende de T001)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a requisição chegar ao service com o perfil certo, e a comparação antes/depois existir.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar.

- [X] T005 Criar `MI-server/src/repositories/resources/materials/pdf/materialPdfEditRepository.ts` com **apenas** o `update` do Prisma, recebendo os campos já decididos pelo service. Sem lógica de negócio — a constituição quer repositório só com query
- [X] T006 Criar `MI-server/src/utils/buildMaterialEditDiff.ts`: **função pura** que recebe o material atual e a entrada validada e devolve `{ changed: string[], ...campos }` no formato de [data-model.md](./data-model.md). Compara `title`, `description` e `habilidadesBncc` **após aparar**; lista de habilidades compara por conteúdo, não por referência. Ser pura é o que permite testá-la sem banco
- [X] T007 [P] Teste unitário em `MI-server/__tests__/unit/materials/buildMaterialEditDiff.test.ts`: nenhum campo alterado devolve `changed` vazio; um campo alterado aparece com `from` e `to`; **habilidades na mesma ordem e conteúdo não contam como alteração**; habilidade acrescentada conta (depende de T006)
- [X] T008 Criar `MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts` com o esqueleto: `validateRequest(input, materialPdfEditSchema)` como **primeira instrução** (Princípio I), carrega o material por `findMaterialById` — que já exclui removidos —, e lança `404 MI_NOT_FOUND` quando não encontra. Logs `IN`/`OUT` (depende de T004, T005)
- [X] T009 Criar `MI-server/src/controllers/resources/materials/pdf/materialPdfEditController.ts` seguindo o padrão de `materialPdfDeleteController.ts`: `authorizeByRole(request.user.role, [ADMIN])` — **somente ADMIN, sem exceção para o autor do material** —, `parseMaterialMultipart(request)` **sem alterar o parser**, e `httpResponse`/`httpError`. JSDoc declarando método, path e perfil autorizado (Princípio II) (depende de T008)
- [X] T010 Acrescentar `createInspectionLog` `CLIENT_TO_SERVER` antes do try/catch e `SERVER_TO_CLIENT` nos caminhos de **sucesso e de erro** em `MI-server/src/controllers/resources/materials/pdf/materialPdfEditController.ts`, seguindo `MI-server/src/controllers/organizations/archiveOrganizationController.ts`. Falha de escrita de log é capturada e logada, **nunca derruba a requisição** (depende de T009)
- [X] T011 Registrar `app.put('/:id', { preHandler: [authenticate] }, materialPdfEditController)` em `MI-server/src/routes/resources/materials/pdf/materialPdfUploadRoutes.ts`. **`PUT`, não `PATCH`**: o corpo carrega o conjunto completo dos metadados editáveis (depende de T009)
- [X] T012 [P] Acrescentar `editMaterialRequest(materialId, payload)` a `front/src/features/materials/api/materialsApi.ts`, montando `FormData` com `title` e `description` **sempre**, `habilidadesBncc` como array JSON, e `file` **apenas quando houver arquivo novo**. Conferir o conteúdo do `FormData` em teste, não só a chamada — foi o que deixou passar o defeito do envio por projeto
- [X] T013 [P] Criar `front/src/features/materials/hooks/useEditMaterial.ts` seguindo o padrão de `useUploadMaterial.ts`, invalidando as consultas do material e das listagens ao concluir
- [X] T014 Registrar a rota `/materials/:id/edit` em `front/src/app/Router.tsx` apontando para `MaterialEditPage` (depende de T013)
- [X] T015 [P] Teste de integração em `MI-server/__tests__/integration/materials/materialEditPermission.test.ts` cobrindo o FR-002: **`ADMIN` nao e recusado** (nem 401 nem 403 — a assercao do `200` com persistencia e do T017, porque nesta fase o service ainda nao atualiza nada), `PROFESSOR` → **403**, `INSTITUTIONALIZED` → **403**, **o próprio autor do material → 403** (autoria não dá direito de alterar), sem autenticação → **401**
- [X] T016 [P] Teste de integração em `MI-server/__tests__/integration/materials/materialEditPermission.test.ts` cobrindo o FR-015: material **removido do acervo** → `404`, material inexistente → `404`

**Checkpoint**: a rota existe, só o ADMIN passa, e a comparação antes/depois está pronta e testada.

---

## Phase 3: User Story 1 — Corrigir os dados de um material publicado (Priority: P1) 🎯 MVP

**Goal**: o ADMIN altera título, descrição e habilidades de um material existente, e a alteração
fica registrada.

**Independent Test**: editar descrição e habilidades de um material e confirmar, nos detalhes, que
os valores novos aparecem e que nada mais mudou.

### Tests for User Story 1

- [X] T017 [P] [US1] Teste de integração em `MI-server/__tests__/integration/materials/materialEdit.test.ts`: altera título, descrição e habilidades → `200` com os valores persistidos
- [X] T018 [P] [US1] Teste em `MI-server/__tests__/integration/materials/materialEdit.test.ts`: material **sem descrição** (cadastrado antes da exigência) recebe uma válida → `200`, e deixa de estar sem descrição (FR-005, SC-006)
- [X] T019 [P] [US1] Teste em `MI-server/__tests__/integration/materials/materialEdit.test.ts` dos limites, **iguais aos do cadastro**: `title` vazio ou só espaços → `422`; `title` com 256 → `422`; **com exatamente 255 → `200`**; `description` com 49 → `422`; **com exatamente 50 e com 2000 → `200`**; com 2001 → `422`
- [X] T020 [P] [US1] Teste em `MI-server/__tests__/integration/materials/materialEdit.test.ts`: valores cercados de espaços são persistidos **já aparados**
- [X] T021 [P] [US1] Teste em `MI-server/__tests__/integration/materials/materialEdit.test.ts`: edição **só de metadados** em material `APPROVED` → **continua `APPROVED`** e o documento não é tocado (FR-006)
- [X] T022 [P] [US1] Teste em `front/src/pages/MaterialEditPage.test.tsx`: a tela abre **preenchida com os valores atuais** do material (FR-020)
- [X] T023 [P] [US1] Teste em `front/src/pages/MaterialEditPage.test.tsx`: salvar é **impedido** com título vazio e com descrição abaixo do mínimo, com a regra informada **antes** da tentativa (FR-021)
- [X] T024 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx`: o caminho para a edição **aparece para `ADMIN`** e **não aparece** para os demais perfis (FR-019)

### Implementation for User Story 1

- [X] T025 [US1] Implementar em `MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts` o caminho de metadados: calcula o diff com `buildMaterialEditDiff`, atualiza pelo repositório e **grava `AuditLog` com ação `MI_UPDATED`** via `createAuditLog`, com `actorRole` vindo de `request.user.role` — como `materialPdfDeleteService` ja faz, em vez de fixar o valor — e `metadata` contendo apenas os campos alterados. **Esta gravação não é adiável** — o Princípio III exige registro para toda alteração de estado (depende de T006, T008)
- [X] T026 [US1] Criar `front/src/pages/MaterialEditPage.tsx` com título, descrição com contador ao vivo e `BnccHabilidadePicker`, importando os limites de `front/src/features/materials/constants.ts` — **nunca redeclarados**. Ao concluir, volta aos detalhes do material (depende de T012, T013, T014)
- [X] T027 [US1] Acrescentar em `front/src/pages/MaterialDetailPage.tsx` o caminho para a edição, visível **somente** quando `isSysAdmin(user)` — o predicado já existe em `front/src/lib/permissions.ts` (depende de T014)

**Checkpoint**: o problema que motivou a feature está resolvido, com rastro. **É o MVP.**

---

## Phase 4: User Story 2 — Substituir o documento (Priority: P2)

**Goal**: o documento é trocado, o anterior deixa de existir, e nenhuma falha deixa o material sem
arquivo.

**Independent Test**: substituir o documento de um material aprovado e confirmar que o novo é o que
abre, que o antigo sumiu do armazenamento e que o material saiu do acervo público até nova revisão.

### Tests for User Story 2

- [ ] T028 [P] [US2] Teste de integração em `MI-server/__tests__/integration/materials/materialEditFile.test.ts`: substitui o documento → `200`, e a `storageKey` resultante é **diferente da anterior** (FR-010). Chave igual significaria sobrescrita, que é o desenho que destrói o original antes de saber se o novo chegou inteiro
- [ ] T029 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialEditFile.test.ts`: concluída a substituição, o objeto da **chave anterior não existe mais** no armazenamento (FR-009). Verificar com `minioClient.statObject(MINIO_BUCKET, chaveAnterior)` **esperando que lance** — a integracao usa MinIO real, nao mock, como `materialUpload.test.ts` ja faz
- [ ] T030 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialEditFile.test.ts` das transições: `APPROVED` → **`PENDING_REVIEW`**; `PENDING_REVIEW` → **permanece**; `REJECTED` → **permanece** (FR-013)
- [ ] T031 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialEditFile.test.ts`: após a troca, `summary` e `summaryGeneratedAt` ficam **nulos** e `summaryStatus` e `vectorStatus` voltam a **`PENDING`** (FR-014)
- [ ] T032 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialEditFile.test.ts`: arquivo que **não é PDF** → `415`; arquivo **acima do limite** → `413`. **O 413 vem do plugin multipart** (`fileSize` em `app.ts`), que aborta antes de o service ver o buffer: asserte o status, **nao** o codigo `FILE_TOO_LARGE` do catalogo. Nos dois casos **o documento atual permanece intacto e acessível** (FR-008)
- [ ] T033 [P] [US2] Teste unitário em `MI-server/__tests__/unit/materials/materialPdfEditService.test.ts` da compensação: falha ao atualizar o registro **remove o arquivo novo** e nada muda; falha ao remover o arquivo antigo **não desfaz a edição**, apenas registra advertência (FR-011)
- [ ] T034 [P] [US2] Teste em `front/src/pages/MaterialEditPage.test.tsx`: selecionar um arquivo exige **confirmação explícita** antes do envio, e **recusar a confirmação não envia nada** (FR-012)

### Implementation for User Story 2

- [ ] T035 [US2] Acrescentar remoção de objeto a `MI-server/src/lib/minio.ts`. É a única capacidade de armazenamento que o projeto ainda não usava — o soft delete de material nunca apagou arquivo. Todo acesso ao armazenamento continua passando por este módulo
- [ ] T036 [US2] Implementar em `MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts` o caminho de substituição, **nesta ordem exata**: valida o arquivo (magic bytes, tamanho, tipo — as mesmas verificações do cadastro) → grava sob **chave nova** → atualiza o registro com ponteiro do arquivo, transição de situação e invalidação dos dados de IA → **só então** remove o arquivo antigo. Falha ao atualizar remove o arquivo novo; falha ao remover o antigo **não desfaz nada** (depende de T025, T035)
- [X] T037 [US2] Acrescentar a `front/src/pages/MaterialEditPage.tsx` a seleção de arquivo e a confirmação explícita, avisando que o documento atual **será apagado e que isso não tem desfazer**; e o aviso, após salvar, de que o material voltou para revisão quando foi o caso (depende de T026)

**Checkpoint**: o documento é substituível, e nenhuma falha deixa material sem arquivo.

---

## Phase 5: User Story 3 — Saber quem alterou o quê (Priority: P3)

**Goal**: o registro identifica quem, quando, o quê e de qual valor para qual — e silencia quando
nada mudou.

**Independent Test**: editar um material e conferir o registro produzido; salvar sem alterar nada e
confirmar que nenhum registro novo aparece.

> A gravação em si está em **T025**, na US1, porque nenhuma alteração de estado pode ser entregue
> sem ela. O que esta fase acrescenta é a **prova** e as regras finas.

### Tests for User Story 3

- [ ] T038 [P] [US3] Teste de integração em `MI-server/__tests__/integration/materials/materialEditAudit.test.ts`: uma edição de metadados grava **um** registro `MI_UPDATED` com `actorId`, `actorRole`, `targetId` e os campos alterados, cada um com `from` e `to` (FR-016)
- [ ] T039 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialEditAudit.test.ts`: o valor anterior da descrição é guardado **por inteiro, não truncado** — é o que permite reconstruir o que existia antes
- [ ] T040 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialEditAudit.test.ts`: a troca de documento registra a identificação do **arquivo anterior** e a **transição de situação**, quando houve
- [ ] T041 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialEditAudit.test.ts`: salvar **sem alterar nada** devolve `200` e **não grava registro algum** (FR-017)
- [ ] T042 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialEditAudit.test.ts`: edição recusada **por perfil** e edição recusada **por validação** não gravam registro (FR-018)

### Implementation for User Story 3

- [ ] T043 [US3] Acrescentar a `MI-server/src/utils/buildMaterialEditDiff.ts` as entradas de `file` (chave e nome do arquivo anterior e novo) e de `status` (transição), no formato de [data-model.md](./data-model.md) (depende de T006, T036)
- [ ] T044 [US3] Acrescentar a `MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts` o curto-circuito do FR-017: diff vazio **e** nenhum arquivo enviado → devolve o material sem atualizar e **sem gravar registro** (depende de T025)

**Checkpoint**: toda alteração é reconstruível, e o silêncio quando nada muda é garantido.

---

> **Sobre os links relacionados (FR-003)**: nao ha tarefa para eles, e isso e intencional — a
> feature 004 esta especificada e **nao implementada**. Quando ela existir, os links entram na
> edicao pelo mesmo caminho dos demais metadados: schema em T004, service em T025, tela em T026.
> Nao e esquecimento.

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Documentar em `MI-server/CLAUDE.md` a edição: só `ADMIN`, entrada com conjunto completo de metadados, e **a ordem das operações da troca de arquivo** — chave nova, remoção do antigo por último —, para que ninguém a "simplifique" para uma sobrescrita
- [ ] T046 [P] Documentar em `front/CLAUDE.md` a tela de edição e a confirmação obrigatória da troca de documento
- [ ] T047 Executar `npm --prefix MI-server run test:unit` e `npm --prefix MI-server run test:integration` confirmando que nenhum teste existente teve expectativa alterada (SC-007)
- [ ] T048 Executar `npm --prefix front run test` confirmando o mesmo no front (SC-007)
- [ ] T049 Percorrer os 10 cenários de [quickstart.md](./quickstart.md) no ambiente real, com **duas contas** (`ADMIN` e `PROFESSOR`) — vários cenários dependem de comparar as duas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências — **bloqueia tudo**
- **Foundational (Fase 2)**: depende da Fase 1 — **bloqueia todas as histórias**
- **US1 (Fase 3)**: depende da Fase 2
- **US2 (Fase 4)**: depende da US1 — o caminho de substituição estende o service que a US1 cria
- **US3 (Fase 5)**: T044 depende da US1; T043 depende da US2
- **Polish (Fase 6)**: depende das histórias entregues

### User Story Dependencies

- **US1 (P1)**: independente após a Fase 2. **Inclui a gravação do registro de auditoria (T025)** —
  não é fatia opcional, é exigência do Princípio III
- **US2 (P2)**: estende o service da US1. Não é independente de verdade, e forçar independência aqui
  significaria duplicar a lógica de atualização
- **US3 (P3)**: majoritariamente **prova**. As duas tarefas de implementação são refinamentos: o que
  entra no registro quando o documento muda, e o silêncio quando nada muda

### Parallel Opportunities

- T012 e T013 em paralelo — arquivos diferentes no front
- T015 e T016 em paralelo com a implementação da US1, se escritos antes
- Todos os testes marcados `[P]` dentro de cada história
- **Atenção aos arquivos compartilhados**: T017–T021 tocam `materialEdit.test.ts`; T028–T032 tocam
  `materialEditFile.test.ts`; T038–T042 tocam `materialEditAudit.test.ts`; T015 e T016 tocam
  `materialEditPermission.test.ts`. Dentro de cada grupo, um por vez

---

## Parallel Example: Foundational

```bash
# As duas peças do front, juntas:
Task: "editMaterialRequest em features/materials/api/materialsApi.ts"
Task: "useEditMaterial em features/materials/hooks/useEditMaterial.ts"
```

---

## Implementation Strategy

### MVP (US1 completa)

1. Fase 1 — Setup
2. Fase 2 — Foundational (**crítica**: é onde a permissão é fechada)
3. Fase 3 — US1, **incluindo T025**
4. **PARE E VALIDE**: corrija a descrição de um material aprovado e confirme que ele continua
   aprovado, que os detalhes mostram o valor novo, e que há um registro `MI_UPDATED` no banco
5. Neste ponto o problema que motivou a feature está resolvido

### Incremental Delivery

1. Setup + Foundational → a rota existe e só o ADMIN entra
2. + US1 → metadados corrigíveis, com rastro → **MVP**
3. + US2 → documento substituível, com a ordem de operações que protege o original
4. + US3 → o rastro está provado e silencia quando nada muda

### Ordem recomendada para uma pessoa só

Fase 1 → Fase 2 → US1 → US2 → US3 → Polimento. A US2 depois da US1 porque estende o mesmo service;
a US3 por último porque seus testes exercitam o que as duas anteriores produziram.

### O ponto de maior risco

**T036.** A ordem das operações ali não é preferência de estilo: é o que separa "uma falha de
escrita não custou nada" de "o documento original foi destruído e não há como recuperá-lo". Se
alguma tarefa merecer revisão cuidadosa antes do merge, é essa.
