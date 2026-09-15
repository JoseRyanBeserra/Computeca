---

description: "Task list — Atualização do Catálogo de Habilidades da BNCC Computação"
---

# Tasks: Atualização do Catálogo de Habilidades da BNCC Computação

**Input**: Design documents from `/specs/006-bncc-habilidades-update/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/bncc-catalog.md](./contracts/bncc-catalog.md)

**Tests**: Incluídos e **obrigatórios**. O FR-012 exige verificação automatizada de que o catálogo corresponde ao arquivo, o FR-013 lista os casos a cobrir, e o Princípio V da constituição exige teste acompanhando a feature.

**Organization**: Tarefas agrupadas por história de usuário.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual história pertence (US1, US2, US3)
- Todo caminho de arquivo é explícito

## Path Conventions

Feature **só no front-end**: `front/`. Nenhum arquivo de `MI-server/` é alterado.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a fonte oficial dentro do projeto do front, e o registro do estado atual para comparação.

- [X] T001 Copiar `specs/006-bncc-habilidades-update/habilidades_bncc_computacao.csv` para `front/src/features/materials/data/habilidades_bncc_computacao.csv`, **sem nenhuma alteração** — nem de codificação (UTF-8), nem de quebra de linha, nem de conteúdo. Conferir com `cmp` que os dois arquivos são idênticos
- [X] T002 [P] Registrar em `specs/006-bncc-habilidades-update/baseline-habilidades.txt` as habilidades gravadas no acervo **antes** da mudança, com `docker exec mi-postgres psql -U postgres -d mi_db -c 'select id, "habilidadesBncc" from "MaterialInstrucional" order by id;'` — é a referência do SC-003
- [X] T003 [P] Registrar em `specs/006-bncc-habilidades-update/baseline-codigos.txt` os 109 códigos do catálogo atual de `front/src/features/materials/data/bnccComputacao.ts`, um por linha, ordenados — é a referência de "nenhuma habilidade retirada"

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o catálogo regenerado a partir do arquivo, e a prova de que corresponde a ele. As três histórias dependem disto.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar.

### Test (escrito antes do gerador)

- [X] T004 Criar `front/src/features/materials/data/bnccComputacao.test.ts` com o **teste de correspondência** (FR-012): importar o CSV com `import csv from './habilidades_bncc_computacao.csv?raw'`, fazer o parse **no próprio teste** — cabeçalho `codigo,habilidade` ignorado, linhas vazias ignoradas, campo entre aspas com aspas externas removidas e **vírgulas internas preservadas**, espaços das extremidades removidos, e a normalização de sequência `CO0NN` → `CONN` — e asseverar que `BNCC_COMPUTACAO_FLAT` tem **141** entradas com **os mesmos códigos e as mesmas descrições, na mesma ordem**. A falha deve apontar o código divergente, não só dizer que as listas diferem. **Não reutilizar o parser do gerador** — dois parsers independentes é o que dá valor à comparação. Deve falhar contra o catálogo atual (109 entradas)
- [X] T005 Acrescentar a `front/src/features/materials/data/bnccComputacao.test.ts` o caso da normalização: o CSV contém `EF05CO011`; o catálogo contém `EF05CO11` e **não** contém `EF05CO011`; e a normalização afeta **exatamente um** código do arquivo — se um arquivo futuro trouxer outra anomalia, o teste falha em vez de corrigi-la em silêncio (depende de T004)
- [X] T006 Acrescentar a `front/src/features/materials/data/bnccComputacao.test.ts` a integridade das exportações: nenhum código repetido em `BNCC_COMPUTACAO_FLAT`, e `BNCC_COMPUTACAO_MAP` com exatamente uma chave por código, cujo valor é a descrição da entrada (depende de T004)

### Implementation

- [X] T007 Criar `front/scripts/gerarCatalogoBncc.mjs` (Node puro, sem dependência nova) que lê `front/src/features/materials/data/habilidades_bncc_computacao.csv` e **reescreve por inteiro** `front/src/features/materials/data/bnccComputacao.ts`, aplicando as regras de [data-model.md](./data-model.md): cabeçalho e linhas vazias ignorados; aspas externas removidas com vírgulas e aspas tipográficas internas preservadas; espaços das extremidades removidos; "Sequência de 3 dígitos com zero à esquerda (`CO011`) → Vira 2 dígitos (`CO11`)"; etapa derivada do prefixo — `EI03` → `Educação Infantil`, `EF01`–`EF05` e `EF15` → `Ensino Fundamental — Anos Iniciais (1º ao 5º ano)`, `EF06`–`EF09` e `EF69` → `Ensino Fundamental — Anos Finais (6º ao 9º ano)`, `EM13` → `Ensino Médio` —, grupos nessa ordem e habilidades na ordem do arquivo. "Código repetido" e "Prefixo fora das quatro etapas" MUST encerrar com erro **sem escrever** o arquivo. Aspas simples nas descrições (ex.: `'verdadeiro'`) MUST ser escapadas na saída
- [X] T008 Fazer o gerador de `front/scripts/gerarCatalogoBncc.mjs` emitir em `bnccComputacao.ts` **a mesma interface pública de hoje** — `BnccHabilidade { codigo; descricao }`, `BnccGrupo { etapa; habilidades }`, `BNCC_COMPUTACAO`, `BNCC_COMPUTACAO_FLAT` e `BNCC_COMPUTACAO_MAP` —, com cabeçalho de comentário que: cita a fonte (Resolução CNE/CEB nº 1/2022, arquivo `habilidades_bncc_computacao.csv` ao lado); diz que as descrições são o **texto integral**; registra a correção `EF05CO011` → `EF05CO11`; e avisa **"arquivo gerado — não edite à mão; atualize o CSV e rode `node scripts/gerarCatalogoBncc.mjs`"**. Remover a justificativa atual de descrições "em forma resumida para caber na UI", que a verificação mostrou falsa (research.md, item 6) (depende de T007)
- [X] T009 Executar `node scripts/gerarCatalogoBncc.mjs` em `front/` para regenerar `front/src/features/materials/data/bnccComputacao.ts`, conferir que o arquivo sai com quebras de linha LF, e rodar `npx vitest run src/features/materials/data/bnccComputacao.test.ts` em `front/` — T004, T005 e T006 devem passar (depende de T001, T004–T008)
- [X] T010 Conferir que os 109 códigos de `specs/006-bncc-habilidades-update/baseline-codigos.txt` estão todos no catálogo regenerado — nenhum retirado — e que exatamente 32 novos entraram: `EI03CO01`–`EI03CO11`, `EF15CO01`–`EF15CO09` e `EF69CO01`–`EF69CO12` (depende de T003, T009)

**Checkpoint**: o catálogo tem as 141 habilidades com texto integral, e está provado que corresponde ao arquivo.

---

## Phase 3: User Story 1 — Encontrar qualquer habilidade oficial ao classificar um material (Priority: P1) 🎯 MVP

**Goal**: o autor encontra qualquer uma das 141 habilidades, pelo código ou por trecho da descrição integral, no cadastro e na edição.

**Independent Test**: no formulário de cadastro, buscar `EI03CO07`, `EF15CO05`, `EF69CO10` e o trecho "robótica", confirmando as sugestões com a descrição integral.

### Tests for User Story 1

- [X] T011 [P] [US1] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que a busca encontra uma habilidade de **cada etapa acrescentada** — `EI03CO07`, `EF15CO05` e `EF69CO10` — como `option` (FR-001, FR-006)
- [X] T012 [P] [US1] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que a busca pelo trecho `robótica` retorna `EM13CO16`, e pelo trecho `padrão de repetição` retorna `EI03CO01` — trechos que só existem no **texto integral**, não no resumo antigo (FR-002, FR-006)
- [X] T013 [P] [US1] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que a sugestão de `EF02CO02` exibe a descrição **inteira**, terminando em "impacta na execução do algoritmo." (FR-007)
- [X] T014 [P] [US1] Teste em `front/src/pages/MaterialEditPage.test.tsx` confirmando que o seletor de habilidades da **edição** encontra `EI03CO03` — o mesmo catálogo do cadastro (FR-008)

### Implementation for User Story 1

- [X] T015 [US1] Verificar em `front/src/components/BnccHabilidadePicker.tsx` que o texto da sugestão e o `title` da tag selecionada **não truncam** a descrição (sem `truncate`, `line-clamp` ou corte por caracteres). Se houver, remover; se não houver — o esperado pela research.md, item 6 —, registrar na task que nada precisou mudar (depende de T009)
- [X] T031 [US1] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que, ao focar o campo **sem digitar**, a lista traz **141** opções — uma por habilidade do catálogo —, e que a busca `algoritmo` traz **exatamente** o número de habilidades do catálogo cuja descrição ou código contém o termo, sem corte por etapa (FR-014, SC-006). Deve falhar com o limite atual de 8 por etapa
- [X] T032 [US1] Remover de `front/src/components/BnccHabilidadePicker.tsx` a constante `MAX_POR_GRUPO` e o `.slice(0, MAX_POR_GRUPO)`, para a lista mostrar todas as correspondências; aumentar a altura máxima da lista de `max-h-72` para `max-h-96`, mantendo a rolagem própria (FR-014) (depende de T031)
- [X] T016 [US1] Rodar os testes de `front/src/components/BnccHabilidadePicker.test.tsx` e `front/src/pages/MaterialEditPage.test.tsx` — T011 a T014 devem passar com o catálogo regenerado (depende de T009, T011–T015)

**Checkpoint**: qualquer habilidade oficial é encontrada no cadastro e na edição. É o MVP.

---

## Phase 4: User Story 2 — O acervo existente não é afetado (Priority: P1)

**Goal**: nenhuma habilidade gravada muda; personalizada continua valendo; código que virou oficial ganha descrição.

**Independent Test**: comparar as habilidades gravadas em todos os materiais antes e depois — nenhuma diferença.

### Tests for User Story 2

- [X] T017 [P] [US2] Acrescentar a `front/src/features/materials/data/bnccComputacao.test.ts` o caso de continuidade do acervo: `EF06CO01`, `EF06CO02` e `EF06CO04` — os códigos gravados nos materiais existentes — estão presentes em `BNCC_COMPUTACAO_MAP`
- [X] T018 [P] [US2] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que, com `selected={['EI03CO01']}`, a tag exibe no `title` a **descrição oficial** — e não "Habilidade personalizada" — (FR-011)
- [X] T019 [P] [US2] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que digitar `EI03CO01` **não** oferece "Adicionar habilidade personalizada", enquanto um texto fora do catálogo continua oferecendo (FR-010, FR-011)

### Implementation for User Story 2

- [X] T020 [US2] Confirmar que nenhum arquivo de `MI-server/` foi alterado pela feature com `git diff --stat -- MI-server` restrito aos commits desta feature — a garantia do FR-009 é **não haver escrita**, e é isso que se verifica (depende de T009)
- [X] T021 [US2] Repetir a consulta de T002 e comparar com `specs/006-bncc-habilidades-update/baseline-habilidades.txt`: saída **idêntica** linha por linha (SC-003). Remover os dois arquivos `baseline-*.txt` depois da comparação — são artefato de verificação, não documentação (depende de T002, T009)

**Checkpoint**: o acervo está intacto, e o que era personalizado e virou oficial passa a ser reconhecido.

---

## Phase 5: User Story 3 — Distinguir as etapas ao navegar pela lista (Priority: P2)

**Goal**: sugestões em quatro grupos, na ordem da escolaridade, cada um só com os seus códigos.

**Independent Test**: abrir a lista sem digitar nada e conferir os quatro grupos na ordem.

### Tests for User Story 3

- [X] T022 [P] [US3] Acrescentar a `front/src/features/materials/data/bnccComputacao.test.ts` o caso das etapas: `BNCC_COMPUTACAO` tem **4** grupos na ordem `Educação Infantil` → `Ensino Fundamental — Anos Iniciais (1º ao 5º ano)` → `Ensino Fundamental — Anos Finais (6º ao 9º ano)` → `Ensino Médio`, com **11, 50, 54 e 26** habilidades, e cada grupo contém **apenas** os prefixos da sua etapa — `EI03`; `EF01`–`EF05` e `EF15`; `EF06`–`EF09` e `EF69`; `EM13` (FR-004)
- [X] T023 [P] [US3] Teste em `front/src/components/BnccHabilidadePicker.test.tsx` confirmando que, ao focar o campo **sem digitar**, os rótulos de etapa aparecem no documento nessa mesma ordem (FR-004, FR-005)

### Implementation for User Story 3

- [X] T024 [US3] Rodar `front/src/features/materials/data/bnccComputacao.test.ts` e `front/src/components/BnccHabilidadePicker.test.tsx` — T022 e T023 devem passar. O agrupamento já é produzido pelo gerador (T007); se falhar, a correção é **no gerador**, seguida de nova execução de T009, nunca no `.ts` gerado (depende de T009, T022, T023)

**Checkpoint**: a lista de 141 habilidades segue navegável por etapa.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 [P] Documentar em `front/CLAUDE.md` que `features/materials/data/bnccComputacao.ts` é **gerado** a partir do CSV ao lado, que **não se edita à mão**, e o procedimento de atualização: substituir o CSV, rodar `node scripts/gerarCatalogoBncc.mjs`, rodar os testes — o de correspondência falha se o catálogo divergir do arquivo
- [X] T026 [P] Atualizar a linha **Habilidades BNCC** da tabela "Funcionalidades do Acervo" em `README.md` para citar as **141** habilidades da BNCC Computação, da Educação Infantil ao Ensino Médio, com descrição integral
- [X] T027 Executar `npm --prefix front run test` confirmando que todos passam e que **nenhum teste preexistente teve expectativa alterada** — em especial os três de `BnccHabilidadePicker.test.tsx` já existentes (SC-005)
- [X] T028 Executar `npm --prefix front run build` e confirmar que o **CSV não entrou no bundle**: `grep -r "codigo,habilidade" front/dist` não deve encontrar nada — ele só pode ser importado pelo teste (plan.md, Constraints)
- [X] T029 Validar que a verificação protege de fato: alterar uma vírgula numa descrição de `front/src/features/materials/data/bnccComputacao.ts`, rodar o teste de correspondência e confirmar que ele **falha apontando o código**; desfazer com `node scripts/gerarCatalogoBncc.mjs` e confirmar que volta a passar
- [ ] T030 Percorrer os 8 cenários de [quickstart.md](./quickstart.md) no ambiente real, com uma conta de upload e uma conta ADMIN

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências. T001 **bloqueia** a Fase 2; T002 e T003 precisam acontecer **antes** de T009, porque registram o estado anterior
- **Foundational (Fase 2)**: depende de T001 — **bloqueia todas as histórias**
- **US1 (Fase 3)**, **US2 (Fase 4)**, **US3 (Fase 5)**: dependem da Fase 2; independentes entre si
- **Polish (Fase 6)**: depende das histórias desejadas

### Dentro da Fase 2

```
T001 ─┐
T004 ─┼─→ T005, T006 ─┐
      │               ├─→ T009 ─→ T010
T007 ─┴─→ T008 ───────┘            ▲
T003 ──────────────────────────────┘
```

O teste de correspondência (T004) é escrito **antes** do gerador e deve falhar contra o catálogo
atual — é a evidência de que ele de fato compara, e não passa por vacuidade.

### User Story Dependencies

- **US1 (P1)**: independente após a Fase 2
- **US2 (P1)**: independente após a Fase 2. T021 exige T002, registrado na Fase 1
- **US3 (P2)**: independente após a Fase 2. O agrupamento é produzido pelo gerador; a US3 é
  **majoritariamente de teste**, e isso é deliberado — a etapa é estrutural, derivada do prefixo,
  e o que a história entrega é a prova de que ela está certa

### Parallel Opportunities

- T002 e T003 em paralelo (arquivos diferentes, só leitura do estado atual)
- T004 e T007 podem começar juntos — teste e gerador são arquivos diferentes, e o teste **não** reutiliza o parser do gerador
- Testes de histórias diferentes marcados `[P]`, desde que em arquivos diferentes
- T025 e T026 em paralelo
- **Atenção a arquivos compartilhados**: T004, T005, T006, T017 e T022 tocam `bnccComputacao.test.ts`; T011, T012, T013, T018, T019 e T023 tocam `BnccHabilidadePicker.test.tsx` — dentro de cada arquivo, em sequência

---

## Parallel Example: após a Fase 2

```bash
# Um arquivo de teste por frente:
Task: "T011–T013, T018, T019, T023 em BnccHabilidadePicker.test.tsx"
Task: "T017, T022 em bnccComputacao.test.ts"
Task: "T014 em MaterialEditPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 — Setup (inclui registrar o estado anterior)
2. Fase 2 — Foundational (**crítica**: catálogo regenerado e provado contra o arquivo)
3. Fase 3 — US1
4. **PARE E VALIDE**: buscar `EI03CO07` e "robótica" no cadastro
5. O autor já encontra todas as habilidades oficiais

### Incremental Delivery

1. Setup + Foundational → catálogo de 141 habilidades, verificado
2. + US1 → encontrável no cadastro e na edição → **MVP**
3. + US2 → prova de que o acervo não mudou
4. + US3 → prova de que as etapas estão certas

### Ordem recomendada para uma pessoa só

Fase 1 → Fase 2 → US1 → US2 → US3 → Polimento. Na prática, depois da Fase 2 quase todo o trabalho
restante é teste: a mudança de comportamento inteira está no catálogo regenerado.
