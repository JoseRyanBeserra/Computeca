---

description: "Task list — Links Relacionados do Material Instrucional"
---

# Tasks: Links Relacionados do Material Instrucional

**Input**: Design documents from `/specs/004-material-links/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos e **obrigatórios**. O FR-017 exige cobrir a exibição com e sem links e as cinco formas de recusa **nos dois caminhos de cadastro**; o Princípio V da constituição exige teste acompanhando a feature.

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

- [X] T001 Acrescentar `relatedLinks Json @default("[]")` ao model `MaterialInstrucional` em `MI-server/prisma/schema.prisma`. **Não anulável, diferente de `description`**: nunca ter informado links e ter informado zero são a mesma coisa, e dois estados para um significado só complicariam toda leitura
- [X] T002 Gerar a migração aditiva com `npx prisma migrate dev --name add_material_related_links` em `MI-server/`. **Depois de migrar, reiniciar a API**: o processo carrega o cliente Prisma na subida, e `tsx watch` recarrega TypeScript, não o cliente gerado (depende de T001)
- [X] T003 [P] Criar a interface `IMaterialLink { label: string; url: string }` e acrescentar `relatedLinks: IMaterialLink[]` (**não opcional** — a coluna sempre tem valor) a `IPendingMaterial` e `IUploadedMI`, mais `relatedLinks?: IMaterialLink[]` (**opcional** — o autor não é obrigado a informar) a `UploadMIInput`, em `MI-server/src/@types/resources/materials/pdf/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a regra de validação, o trânsito do dado e o estilo compartilhado. As três histórias dependem disto.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar.

- [X] T004 Acrescentar `relatedLinksSchema` a `MI-server/src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts`: array opcional com `.default([])` e `.max(10)`; cada item com `label` em `z.string().trim().min(1).max(60)` e `url` validada em **duas etapas** — `z.string().url()` **seguido de** `.refine()` conferindo que `new URL(v).protocol` está em `{ 'http:', 'https:' }`. **A segunda etapa não é redundante**: verificado que `.url()` sozinho aceita `javascript:alert(1)`, `data:`, `file:` e `ftp:`. Usar o protocolo normalizado pelo construtor de URL, **nunca** comparação de prefixo de string
- [X] T005 Acrescentar ao schema do service em `MI-server/src/schemas/resources/materials/pdf/materialPdfUploadSchema.ts` o campo `relatedLinks` usando `relatedLinksSchema` (depende de T004)
- [X] T006 Ler o campo `relatedLinks` em `MI-server/src/controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts` como **array JSON numa única parte**, seguindo o precedente que o módulo já tem para habilidades. JSON malformado vira **lista vazia com `logger.warn`** — nunca derruba a requisição com erro de parse
- [X] T007 Repassar `relatedLinks` ao repositório em `MI-server/src/services/resources/materials/pdf/materialPdfUploadService.ts`, extraindo-o do resultado de `validateRequest` (depende de T005)
- [X] T008 Persistir os links em `MI-server/src/repositories/resources/materials/pdf/materialPdfUploadRepository.ts`, acrescentando `relatedLinks` ao `data` e ao tipo `CreateMaterialPdfInput` (depende de T001, T003)
- [X] T009 [P] Acrescentar `relatedLinks: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfViewRepository.ts` — é a rota que a tela de detalhes consome (depende de T001)
- [X] T010 [P] Acrescentar `relatedLinks: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfAllListRepository.ts` (depende de T001)
- [X] T011 [P] Acrescentar `relatedLinks: true` ao select de `MI-server/src/repositories/resources/materials/pdf/materialPdfPendingListRepository.ts` (depende de T001)
- [X] T012 Criar `front/src/components/chipStyles.ts` exportando as classes do chip extraídas de `HabilidadesBncc.tsx`, parametrizadas por matiz. **Extrair em vez de copiar** é o que impede o chip e o botão de link de divergirem no dia em que alguém ajustar uma cor
- [X] T013 Fazer `front/src/components/HabilidadesBncc.tsx` consumir `chipStyles`, **sem alterar sua aparência nem seu comportamento** — `max`, contador `+N` e retorno nulo com lista vazia permanecem idênticos (depende de T012)
- [X] T014 [P] Teste unitário em `MI-server/__tests__/unit/materials/materialPdfUploadSchema.test.ts` do `relatedLinksSchema`: ausente vira `[]`, lista vazia aceita, **11 itens rejeitado, exatamente 10 aceito**, `label` ausente/vazio/só espaços rejeitado, **`label` com 61 rejeitado e com exatamente 60 aceito**, URL malformada rejeitada, e **`javascript:`, `data:`, `file:` e `ftp:` rejeitados** — este último grupo é o que `.url()` sozinho aceitaria (depende de T004)
- [X] T015 [P] Teste unitário em `MI-server/__tests__/unit/materials/parseMaterialMultipart.test.ts` confirmando que `relatedLinks` é lido como array JSON e que **JSON malformado vira lista vazia sem lançar** (depende de T006)

**Checkpoint**: a regra existe num lugar só, o dado transita, e o estilo é compartilhado.

---

## Phase 3: User Story 1 — Alcançar o material complementar em um clique (Priority: P1) 🎯 MVP

**Goal**: os links aparecem como botões abaixo da descrição, com a aparência dos chips, e levam ao destino.

**Independent Test**: abrir os detalhes de um material com links e de um sem, confirmando os botões no primeiro e **nada** no segundo.

### Tests for User Story 1

- [X] T016 [P] [US1] Teste de integração em `MI-server/__tests__/integration/materials/materialLinks.test.ts` confirmando que `GET /mis/:id` devolve `relatedLinks` preenchido para material que os possui e **`[]`** — nunca `null` — para material cadastrado sem eles
- [X] T017 [P] [US1] Teste em `front/src/components/MaterialLinks.test.tsx` confirmando que cada link vira um elemento acionável exibindo o **rótulo**, nunca o endereço
- [X] T018 [P] [US1] Teste em `front/src/components/MaterialLinks.test.tsx` confirmando que, com lista vazia, **nada é renderizado** — nem rótulo de seção, nem contêiner (FR-007)
- [X] T019 [P] [US1] Teste em `front/src/components/MaterialLinks.test.tsx` confirmando que o endereço completo é exposto para revelação ao usuário antes do clique (FR-005)
- [X] T020 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que os links aparecem **abaixo da descrição** e acima da pré-visualização do documento

### Implementation for User Story 1

- [X] T021 [US1] Acrescentar o tipo `MaterialLink { label: string; url: string }` e `relatedLinks?: MaterialLink[]` ao tipo do material em `front/src/features/materials/api/materialsApi.ts`
- [X] T022 [US1] Criar `front/src/components/MaterialLinks.tsx` recebendo `links: MaterialLink[]`, renderizando um elemento acionável por link com o estilo de `chipStyles` em matiz própria, e **retornando nulo com lista vazia** — mesmo padrão de `HabilidadesBncc` (depende de T012, T021)
- [X] T023 [US1] Renderizar em `front/src/pages/MaterialDetailPage.tsx` o `<MaterialLinks>` **entre o bloco de descrição e o `<PdfPreview>`** (depende de T022)

**Checkpoint**: quem consulta alcança o material complementar em um clique. É o MVP.

---

## Phase 4: User Story 2 — Indicar material complementar no cadastro (Priority: P1)

**Goal**: o autor acrescenta e remove links no formulário, com as regras informadas antes do envio.

**Independent Test**: cadastrar um material com links e outro sem, confirmando que ambos concluem e que os links do primeiro aparecem nos detalhes.

### Tests for User Story 2

- [X] T024 [P] [US2] Teste de integração em `MI-server/__tests__/integration/materials/materialLinks.test.ts` cobrindo `POST /mis`: **sem o campo → 201 com `[]`**, lista vazia → `201`, lista válida → `201` com os links persistidos **na ordem informada**, e rótulo/endereço cercados de espaços gravados **já aparados**
- [X] T025 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialLinks.test.ts` cobrindo a recusa por quantidade e rótulo: **11 links → 422**, **exatamente 10 → 201**, `label` vazio → `422`, `label` com 61 caracteres → `422`, **exatamente 60 → 201**
- [X] T026 [P] [US2] Teste em `MI-server/__tests__/integration/materials/materialLinks.test.ts` confirmando que **endereço repetido no mesmo material é aceito** — dois rótulos podem apontar ao mesmo lugar, por decisão registrada
- [X] T027 [P] [US2] Teste em `front/src/components/MaterialLinkPicker.test.tsx` confirmando que acrescentar um link válido o coloca na lista exibida e esvazia os campos
- [X] T028 [P] [US2] Teste em `front/src/components/MaterialLinkPicker.test.tsx` confirmando que remover um link o tira da lista sem afetar os demais
- [X] T029 [P] [US2] Teste em `front/src/components/MaterialLinkPicker.test.tsx` confirmando que rótulo vazio, endereço malformado e o **décimo primeiro link** são impedidos **ao acrescentar**, com a regra informada — não ao enviar (FR-014)
- [X] T030 [P] [US2] Teste em `front/src/pages/UploadPage.test.tsx` confirmando que o cadastro **conclui sem nenhum link** — eles são opcionais (FR-002)
- [X] T031 [P] [US2] Teste em `front/src/pages/UploadPage.test.tsx` confirmando que os links informados seguem na requisição como **array JSON** no campo `relatedLinks`

### Implementation for User Story 2

- [X] T032 [US2] Criar `front/src/components/MaterialLinkPicker.tsx` com campos de rótulo e endereço, botão de acrescentar, e a lista acumulada com remoção por item. Props `links`, `onChange` e `disabled`, conforme [contracts/material-links.md](./contracts/material-links.md) (depende de T021)
- [X] T033 [US2] Validar no `front/src/components/MaterialLinkPicker.tsx`, **ao acrescentar**, que o rótulo não está vazio (máx. 60), que o endereço é bem formado com protocolo `http`/`https`, e que o limite de 10 não foi atingido. É **conveniência, não proteção** — a proteção está no servidor (depende de T032)
- [X] T034 [US2] Inserir o `<MaterialLinkPicker>` em `front/src/pages/UploadPage.tsx`, abaixo do seletor de habilidades BNCC, com estado próprio (depende de T032)
- [X] T035 [US2] Enviar `relatedLinks` como **array JSON serializado** no `FormData` de `uploadMaterialRequest` em `front/src/features/materials/api/materialsApi.ts`, **omitindo o campo quando a lista está vazia** (depende de T021, T034)

**Checkpoint**: o autor indica material complementar, e links seguem opcionais.

---

## Phase 5: User Story 3 — Ninguém é levado a um destino perigoso (Priority: P2)

**Goal**: esquemas perigosos são recusados nos dois caminhos, e o destino não obtém controle sobre a origem.

**Independent Test**: tentar cadastrar endereços com esquemas perigosos por chamada direta, nas duas rotas, e confirmar a recusa; inspecionar um botão e confirmar o isolamento.

### Tests for User Story 3

- [X] T036 [P] [US3] Teste de integração em `MI-server/__tests__/integration/materials/materialLinks.test.ts` confirmando que `POST /mis` recusa com **422** endereços com `javascript:`, `data:`, `file:` e `ftp:`. **Este é o grupo que `z.string().url()` sozinho aceitaria** — é o teste que prova a US3
- [X] T037 [P] [US3] Teste de integração em `MI-server/__tests__/integration/organizations/orgMaterialLinks.test.ts` repetindo os casos de recusa da T036 e da T025 por `POST /organizations/:orgId/mis` — **a regra não pode depender do caminho** (FR-013)
- [X] T038 [P] [US3] Teste em `MI-server/__tests__/integration/materials/materialLinks.test.ts` confirmando que, na recusa por link inválido, **nenhum material é criado**
- [X] T039 [P] [US3] Teste em `front/src/components/MaterialLinks.test.tsx` confirmando que cada elemento acionável declara abertura em contexto separado **e** a relação que impede o destino de obter referência à origem e de receber a procedência (FR-015)

### Implementation for User Story 3

- [X] T040 [US3] Em `front/src/components/MaterialLinks.tsx`, declarar em cada elemento acionável a abertura em contexto separado e a relação de isolamento da origem. Sem isso a página de destino obtém referência à janela de origem e pode redirecioná-la — risco real num acervo que aceita submissões de terceiros (depende de T022)

**Checkpoint**: nenhum esquema perigoso entra, por nenhum caminho, e o destino fica isolado da origem.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T041 [P] Documentar em `MI-server/CLAUDE.md` a regra dos links — opcionais, máximo 10, rótulo até 60 caracteres, e **a armadilha do `.url()`**, para que ninguém a reintroduza em campo de URL futuro
- [X] T042 [P] Documentar em `front/CLAUDE.md` que o estilo do chip vive em `components/chipStyles.ts` e deve ser consumido, nunca copiado
- [X] T043 Executar `npm --prefix MI-server run test:unit` e `npm --prefix MI-server run test:integration` confirmando que nenhum teste existente teve expectativa alterada (SC-006)
- [X] T044 Executar `npm --prefix front run test` confirmando o mesmo no front, **com atenção especial aos testes de `HabilidadesBncc`** — ele passou a consumir o estilo compartilhado e não pode ter mudado de aparência (SC-006)
- [X] T045 Confirmar no banco que a migração preservou o acervo: `select count(*) total, count(*) filter (where "relatedLinks"::text = '[]') sem_links from "MaterialInstrucional";` deve mostrar `sem_links` igual a `total` (SC-005)
- [ ] T046 Percorrer os 8 cenários de [quickstart.md](./quickstart.md) no ambiente real, incluindo as chamadas por `curl` com os quatro esquemas perigosos nas duas rotas

### Adições feitas na implementação (fora da lista original)

A feature 005 (edição pelo ADMIN) foi entregue antes desta. Por pedido explícito, os links entraram
também na edição:

- [X] T047 `materialPdfEditSchema` importa `relatedLinksSchema`; controller, service e
  `materialPdfEditRepository` repassam e gravam a lista (conjunto completo — vazia remove todos)
- [X] T048 `buildMaterialEditDiff` compara `relatedLinks` (conteúdo e ordem) e registra `from`/`to` no
  `AuditLog`; testes em `__tests__/unit/materials/buildMaterialEditDiff.test.ts`
- [X] T049 Teste de integração `__tests__/integration/materials/materialEditLinks.test.ts`: acréscimo,
  remoção total, os quatro esquemas perigosos com 422, 11 links, auditoria e edição sem mudança
- [X] T050 `MaterialLinkPicker` em `front/src/pages/MaterialEditPage.tsx`, preenchido com os links
  atuais; `editMaterialRequest` envia `relatedLinks` sempre; testes em `MaterialEditPage.test.tsx`
- [X] T051 Leitura defensiva da coluna `Json` em `MI-server/src/utils/readStoredRelatedLinks.ts`,
  aplicada pelos repositórios (prevista em data-model.md, sem task própria)

**Sobre a T046**: os cenários 1, 5, 6, 7 e 8 estão cobertos pelas suítes automatizadas contra
Fastify, PostgreSQL e MinIO reais. Os cenários 2, 3 e 4 exigem uma sessão de autor/ADMIN no
navegador e ficaram para verificação manual.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências — **bloqueia tudo**
- **Foundational (Fase 2)**: depende da Fase 1 — **bloqueia todas as histórias**
- **US1 (Fase 3)**, **US2 (Fase 4)**, **US3 (Fase 5)**: dependem da Fase 2
- **Polish (Fase 6)**: depende das histórias desejadas

### User Story Dependencies

- **US1 (P1)**: independente após a Fase 2. Cria o `MaterialLinks`
- **US2 (P1)**: depende do tipo criado na US1 (T021), que é pré-requisito das duas
- **US3 (P2)**: a validação de protocolo já entra na Fase 2, porque a US2 também precisa dela. A US3 acrescenta os **testes que a provam** nos dois caminhos, e o isolamento da origem no componente da US1 (T022)

A US3 é, portanto, **majoritariamente de teste**. Isso é deliberado: a proteção é estrutural e vive
no schema compartilhado; o que a US3 entrega é a **prova** de que ela funciona por todos os
caminhos, que é o que impede alguém de afrouxá-la sem perceber.

### Parallel Opportunities

- T009, T010 e T011 em paralelo — três repositórios distintos
- T014 e T015 em paralelo
- Todos os testes de uma mesma história marcados `[P]`
- **Atenção**: T017, T018, T019 e T039 tocam `MaterialLinks.test.tsx`; T024, T025, T026, T036 e T038 tocam `materialLinks.test.ts`; T027, T028 e T029 tocam `MaterialLinkPicker.test.tsx`

---

## Parallel Example: Foundational

```bash
# Os três repositórios, juntos:
Task: "relatedLinks no select de materialPdfViewRepository.ts"
Task: "relatedLinks no select de materialPdfAllListRepository.ts"
Task: "relatedLinks no select de materialPdfPendingListRepository.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 — Setup
2. Fase 2 — Foundational (**crítica**, bloqueia tudo)
3. Fase 3 — US1
4. **PARE E VALIDE**: abra um material sem links e confirme que **nada** aparece; depois um com links
5. A tela de detalhes já tem a linha de botões pedida

### Incremental Delivery

1. Setup + Foundational → o dado existe e transita
2. + US1 → botões na tela → **MVP**
3. + US2 → o autor indica links no cadastro
4. + US3 → a proteção está provada por todos os caminhos

### Ordem recomendada para uma pessoa só

Fase 1 → Fase 2 → US1 → US2 → US3 → Polimento. A US3 por último porque seus testes exercitam tanto
o schema da Fase 2 quanto o componente da US1.
