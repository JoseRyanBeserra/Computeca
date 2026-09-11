---

description: "Task list — Descrição Obrigatória do Material Instrucional"
---

# Tasks: Descrição Obrigatória do Material Instrucional

**Input**: Design documents from `/specs/003-material-description/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos e **obrigatórios**. O FR-011 exige cobrir a exibição com e sem descrição e as quatro formas de recusa **nos dois caminhos de cadastro**; o Princípio V da constituição exige teste acompanhando a feature.

**Organization**: Tarefas agrupadas por história de usuário.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual história pertence (US1, US2, US3)
- Todo caminho de arquivo é explícito

## Path Conventions

Feature nas duas pontas: `MI-server/` (API) e `front/` (SPA).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: o campo existir. Tudo depende disto.

- [X] T001 Acrescentar `description String?` ao model `MaterialInstrucional` em `MI-server/prisma/schema.prisma`. **Nullable é deliberado**: os materiais já cadastrados ficam com `null`, que significa "anterior à exigência". Uma coluna `NOT NULL` exigiria valor padrão, e qualquer padrão seria descrição inventada
- [X] T002 Gerar a migração aditiva com `npx prisma migrate dev --name add_material_description` em `MI-server/`, confirmando que nenhuma linha existente é lida ou reescrita (depende de T001)
- [X] T003 [P] Acrescentar `description?: string | null` a `IPendingMaterial` e `IUploadedMI`, e `description: string` (**não opcional**) a `UploadMIInput`, em `MI-server/src/@types/resources/materials/pdf/index.ts` — nesse ponto do fluxo a descrição já é obrigatória

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a regra de validação e o parse unificado. As três histórias dependem disto.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar.

- [X] T004 Criar `MI-server/src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts` exportando `UploadMaterialBodySchema`, o tipo `UploadMaterialRequest`, o schema de service `materialPdfUploadSchema` (com `uploadedById`) e o tipo `UploadMaterialServiceInput`. A descrição é `z.string().trim().min(50).max(2000)` — **limites inclusivos**, contagem **após remover espaços das extremidades**, conforme FR-005. O **título passa a ser obrigatório** (FR-011): `z.string().trim().min(1).max(255)` — o servidor deixa de recorrer ao nome do arquivo, e `resolveTitle` é removido dos dois controllers. Inclui também habilidades, pagando a dívida do Princípio I: o upload é o único fluxo do projeto sem schema próprio
- [X] T005 Criar `MI-server/src/controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts` com o percurso de `request.parts()` extraído de `materialPdfUploadController`, acrescentando a leitura do campo `description`. Retorna também `organizationIds`, para servir aos dois controllers
- [X] T006 Fazer `MI-server/src/services/resources/materials/pdf/materialPdfUploadService.ts` validar a entrada com `validateRequest(input, materialPdfUploadSchema)` como primeira instrução, substituindo o schema inline de habilidades — conforme o Princípio I (depende de T004)
- [X] T007 Persistir a descrição em `MI-server/src/repositories/resources/materials/pdf/materialPdfUploadRepository.ts`, acrescentando `description: input.description` ao `data` de `createMaterialPdf` (depende de T001, T003)
- [X] T008 [P] Acrescentar `description: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfViewRepository.ts` — é a rota que a tela de detalhes consome (depende de T001)
- [X] T009 [P] Acrescentar `description: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfAllListRepository.ts` (depende de T001)
- [X] T010 [P] Acrescentar `description: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfPendingListRepository.ts` (depende de T001)
- [X] T011 [P] Teste unitário em `MI-server/__tests__/unit/materials/materialPdfUploadSchema.test.ts` cobrindo os limites: **49 rejeitado, exatamente 50 aceito, exatamente 2000 aceito, 2001 rejeitado**, ausência rejeitada, string vazia rejeitada, string só de espaços rejeitada, e descrição válida cercada de espaços **aceita com o valor já sem os espaços das pontas** (depende de T004)
- [X] T012 [P] Teste unitário em `MI-server/__tests__/unit/materials/parseMaterialMultipart.test.ts` confirmando que o campo `description` é lido do formulário e que os demais campos seguem sendo lidos como antes (depende de T005)

- [X] T013 Atualizar o helper `uploadMaterial` em `MI-server/__tests__/integration/materials/materialUpload.test.ts` para enviar `description` válida (>= 50 caracteres) e `title`, e conferir os **8 casos** daquele arquivo. **Sem esta tarefa a suíte fica vermelha assim que a T006 entrar** — não é regressão, é o contrato de entrada mudando de propósito (depende de T006)
- [X] T014 Atualizar os envios de material em `MI-server/__tests__/integration/organizations/orgMaterials.test.ts` para incluir `description` e `title` válidos, pelo mesmo motivo da T013 (depende de T006)

**Checkpoint**: a regra existe em um único lugar, o parse é compartilhado e a suíte existente segue verde.

---

## Phase 3: User Story 1 — Entender o material antes de abri-lo (Priority: P1) 🎯 MVP

**Goal**: a descrição aparece na tela de detalhes abaixo das habilidades BNCC, e a ausência nos materiais antigos é explicada.

**Independent Test**: abrir os detalhes de um material com descrição e de um sem, confirmando a exibição correta nos dois casos.

### Tests for User Story 1

- [ ] T015 [P] [US1] Teste de integração em `MI-server/__tests__/integration/materials/materialDescription.test.ts` confirmando que `GET /mis/:id` devolve `description` preenchida para material que a possui e **`null`** para material cadastrado sem ela, sem erro
- [ ] T016 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que a descrição é renderizada **abaixo das habilidades BNCC**
- [ ] T017 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que, com `description` em `null`, aparece a indicação discreta de ausência — **sem** mensagem de erro e sem área vazia inexplicada (FR-003)
- [ ] T018 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que quebras de linha na descrição são preservadas na exibição

### Implementation for User Story 1

- [ ] T019 [US1] Acrescentar `description?: string | null` ao tipo do material em `front/src/features/materials/api/materialsApi.ts`
- [ ] T020 [US1] Renderizar a descrição em `front/src/pages/MaterialDetailPage.tsx` **entre o bloco de habilidades BNCC e o `<PdfPreview>`**, preservando quebras de linha e sem interpretar marcação, usando os mesmos tokens de borda e tipografia das demais seções (depende de T019)
- [ ] T021 [US1] Tratar em `front/src/pages/MaterialDetailPage.tsx` o caso `null` com indicação discreta de ausência, distinta de erro (depende de T020)

**Checkpoint**: a descrição é visível para quem consulta, e o acervo antigo não parece quebrado. É o MVP.

---

## Phase 4: User Story 2 — Ninguém publica material sem explicar (Priority: P1)

**Goal**: o cadastro direto exige descrição válida, no formulário e no servidor.

**Independent Test**: tentar cadastrar sem descrição e com descrição curta demais pela rota direta, confirmando a recusa; cadastrar com descrição válida e confirmar o sucesso.

### Tests for User Story 2

- [ ] T022 [P] [US2] Teste de integração em `MI-server/__tests__/integration/materials/materialDescriptionUpload.test.ts` cobrindo `POST /mis`: **sem descrição → 422**, **49 caracteres → 422**, **exatamente 50 → 201**, **exatamente 2000 → 201**, **2001 → 422**, **só espaços → 422**
- [ ] T023 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialDescriptionUpload.test.ts` confirmando que a descrição é **persistida sem os espaços das extremidades** quando enviada cercada de espaços
- [ ] T024 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialDescriptionUpload.test.ts` confirmando que, na recusa, **nenhum material é criado** — a contagem no banco não muda
- [ ] T025 [P] [US2] Teste em `front/src/pages/UploadPage.test.tsx` confirmando que o envio é bloqueado com descrição vazia e que a exigência é visível **antes** da tentativa (FR-007)
- [ ] T026 [P] [US2] Teste em `front/src/pages/UploadPage.test.tsx` confirmando que o contador indica quanto falta com menos de 50 caracteres e o excesso acima de 2000
- [ ] T027 [P] [US2] Teste em `front/src/pages/UploadPage.test.tsx` confirmando que, com descrição válida, o envio é liberado e o campo `description` segue na requisição

### Implementation for User Story 2

- [X] T028 [US2] Fazer `MI-server/src/controllers/resources/materials/pdf/materialPdfUploadController.ts` usar `parseMaterialMultipart` e repassar `description` ao service, removendo o laço próprio de `request.parts()` (depende de T005)
- [X] T029 [US2] Acrescentar a área de texto de descrição a `front/src/pages/UploadPage.tsx`, obrigatória, com `maxLength` de 2000 e contador ao vivo mostrando quanto falta para 50 ou quanto excede 2000 (depende de T019)
- [ ] T030 [US2] Bloquear o envio em `front/src/pages/UploadPage.tsx` enquanto a descrição estiver fora dos limites, seguindo o padrão já usado pelo campo de título (depende de T029)
- [ ] T031 [US2] Enviar `description` no `FormData` de `uploadMaterialRequest` em `front/src/features/materials/api/materialsApi.ts` (depende de T019)

**Checkpoint**: o caminho principal de cadastro exige descrição, e a exigência não depende da interface.

---

## Phase 5: User Story 3 — A exigência vale para todo caminho (Priority: P2)

**Goal**: o envio por organização segue a mesma regra, sem porta lateral.

**Independent Test**: repetir os casos da US2 pela rota de organização e obter os mesmos resultados.

### Tests for User Story 3

- [ ] T032 [P] [US3] Teste de integração em `MI-server/__tests__/integration/organizations/orgMaterialDescription.test.ts` cobrindo `POST /organizations/:orgId/mis` com os mesmos seis casos da T022 — **a regra não pode depender do caminho**
- [X] T033 [P] [US3] Teste em `MI-server/__tests__/integration/organizations/orgMaterialDescription.test.ts` confirmando que a descrição é persistida no material vinculado à organização

### Implementation for User Story 3

- [X] T034 [US3] Fazer `MI-server/src/controllers/organizations/materials/uploadOrgMaterialController.ts` usar `parseMaterialMultipart` e repassar `description` ao service, removendo o laço próprio de `request.parts()` — é o que torna a garantia **estrutural** em vez de depender de alguém lembrar de alterar os dois controllers (depende de T005)

**Checkpoint**: não há porta lateral por onde entre material sem descrição.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Documentar o campo e a regra em `MI-server/CLAUDE.md` — descrição obrigatória de 50 a 2000 caracteres no cadastro, nullable no banco por causa do acervo anterior, e o parse compartilhado entre os dois controllers
- [ ] T036 Executar `npm --prefix MI-server run test:unit` e `npm --prefix MI-server run test:integration` confirmando que nenhum teste existente teve expectativa alterada (SC-005)
- [ ] T037 Executar `npm --prefix front run test` confirmando o mesmo no front (SC-005)
- [ ] T038 Confirmar no banco que a migração preservou o acervo: `select count(*) total, count(description) com_descricao from "MaterialInstrucional";` deve mostrar `com_descricao = 0` e `total` inalterado (SC-003)
- [X] T039 Percorrer os 7 cenários de [quickstart.md](./quickstart.md) no ambiente real, incluindo as chamadas diretas por `curl` que provam que a exigência não depende da interface

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências — **bloqueia tudo**, porque o campo precisa existir
- **Foundational (Fase 2)**: depende da Fase 1 — **bloqueia todas as histórias**
- **US1 (Fase 3)**, **US2 (Fase 4)**, **US3 (Fase 5)**: dependem da Fase 2
- **Polish (Fase 6)**: depende das histórias desejadas

### User Story Dependencies

- **US1 (P1)**: independente após a Fase 2. Só precisa que o campo exista e trafegue
- **US2 (P1)**: independente após a Fase 2
- **US3 (P2)**: depende do parse compartilhado (T005) e, no front, do envio implementado na US2 (T031)

US1 e US2 tocam arquivos diferentes no front (`MaterialDetailPage` e `UploadPage`), mas **ambas
alteram `materialsApi.ts`** — T019 é pré-requisito das duas e por isso vive na US1.

### Parallel Opportunities

- T008, T009 e T010 em paralelo — três repositórios distintos
- T011 e T012 em paralelo
- Todos os testes de uma mesma história marcados `[P]`
- US1 (front de exibição) e US2 (back de validação) podem correr em paralelo por pessoas diferentes
- **Atenção**: T016, T017 e T018 tocam o mesmo arquivo de teste; T025, T026 e T027 também

---

## Parallel Example: Foundational

```bash
# Os três repositórios, juntos:
Task: "description no select de materialPdfViewRepository.ts"
Task: "description no select de materialPdfAllListRepository.ts"
Task: "description no select de materialPdfPendingListRepository.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 — Setup (o campo existir)
2. Fase 2 — Foundational (**crítica**, bloqueia tudo)
3. Fase 3 — US1
4. **PARE E VALIDE**: abra um material antigo e confirme que a ausência é explicada, não quebrada
5. A tela de detalhes já tem o espaço pedido

### Incremental Delivery

1. Setup + Foundational → o campo existe e trafega
2. + US1 → descrição visível → **MVP**
3. + US2 → cadastro direto exige descrição
4. + US3 → nenhuma porta lateral

### Ordem recomendada para uma pessoa só

Fase 1 → Fase 2 → US1 → US2 → US3 → Polimento. A US3 por último porque reaproveita tanto o parse
compartilhado quanto o envio do front construído na US2.
