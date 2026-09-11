---

description: "Task list — Pré-visualização do PDF na Tela de Detalhes"
---

# Tasks: Pré-visualização do PDF na Tela de Detalhes

**Input**: Design documents from `/specs/002-pdf-preview/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos e **obrigatórios**. O FR-011 exige cobertura de carregamento bem-sucedido, ausência de permissão, falha de carregamento e renovação do acesso expirado; o Princípio V da constituição exige teste acompanhando a feature.

**Organization**: Tarefas agrupadas por história de usuário, para que cada uma seja implementável e testável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: A qual história pertence (US1, US2, US3)
- Todo caminho de arquivo é explícito

## Path Conventions

Feature **inteiramente de front-end**: todo o trabalho acontece em `front/src/`. Nenhum arquivo em `MI-server/` é alterado.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: utilitário genérico de largura de tela, sem vínculo com materiais, consumido por US1 e US3.

- [ ] T001 [P] Criar `front/src/hooks/useIsNarrowScreen.ts` usando `window.matchMedia('(max-width: 767px)')` — corte em **768px**, alinhado ao breakpoint `md` do Tailwind já usado no projeto. Reavaliar em mudança da media query e limpar o listener na desmontagem
- [ ] T002 [P] Teste em `front/src/hooks/useIsNarrowScreen.test.ts` cobrindo: retorna `true` abaixo de 768px, `false` a partir de 768px, e reage à mudança da media query. Substituir `window.matchMedia` por dublê, que o jsdom não implementa

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: a fonte de acesso ao arquivo, com escolha de rota e renovação. Todas as histórias dependem dela.

**⚠️ CRITICAL**: nenhuma história pode começar antes desta fase terminar.

- [ ] T003 Extrair de `front/src/pages/MaterialDetailPage.tsx` (função `handleOpenPdf`) a escolha entre as três rotas de URL pré-assinada para uma função exportada em `front/src/features/materials/api/materialsApi.ts`, preservando exatamente a regra atual: `PROFESSOR`/`ADMIN` → `getReviewPresignedUrlRequest`; material `APPROVED` → `getPublicPresignedUrlRequest`; demais casos → `getMaterialPresignedUrlRequest`. A função recebe **papel e situação como parâmetros** e permanece pura — `materialsApi.ts` não acessa contexto de autenticação
- [ ] T004 Criar `front/src/features/materials/hooks/useMaterialFileUrl.ts` com `useQuery`, chave **`['material-file-url', materialId]`** — independente da chave do material, para que a falha de uma não contamine a outra. Assinatura `(materialId: string, materialStatus: MIStatus, enabled?: boolean)` — o **perfil do usuário não é parâmetro**: o hook o obtém internamente por `useAuth()` de `front/src/context/AuthContext.tsx` e o repassa para a função de seleção. Segue o padrão de `useAllMaterials` (depende de T003)
- [ ] T005 Em `front/src/features/materials/hooks/useMaterialFileUrl.ts`, derivar `expiresAt` em milissegundos a partir do `expiresInSeconds` da resposta, no instante em que ela chega (depende de T004)
- [ ] T006 Em `front/src/features/materials/hooks/useMaterialFileUrl.ts`, agendar a renovação para **5 minutos antes** de `expiresAt`, executando **apenas com a aba visível** (`document.visibilityState === 'visible'`). Com a aba oculta, deixar a renovação pendente e executá-la quando o usuário retornar — evita requisição desperdiçada e evita remontar o documento no meio de uma leitura (depende de T005)
- [ ] T007 Em `front/src/features/materials/hooks/useMaterialFileUrl.ts`, respeitar `enabled`: com `false`, **nenhuma requisição é emitida** — usado para não buscar o acesso em tela estreita, onde o documento não será exibido (depende de T004)
- [ ] T008 [P] Teste em `front/src/features/materials/hooks/useMaterialFileUrl.test.ts` da escolha de rota: `PROFESSOR` e `ADMIN` usam a rota de revisão; `COMMON` com material `APPROVED` usa a pública; `COMMON` com material `PENDING_REVIEW` usa a do autor (depende de T004)
- [ ] T009 [P] Teste em `front/src/features/materials/hooks/useMaterialFileUrl.test.ts` do agendamento da renovação, com `vi.useFakeTimers()`: avançando o relógio até a janela de 5 minutos antes da expiração, nova busca é emitida; com a aba oculta, nenhuma busca é emitida. **Padrão novo no front** — hoje nenhum teste usa temporizador simulado (depende de T006)
- [ ] T010 [P] Teste em `front/src/features/materials/hooks/useMaterialFileUrl.test.ts` confirmando que, com `enabled: false`, nenhuma requisição é emitida (depende de T007)

**Checkpoint**: acesso ao arquivo resolvível, com renovação e desligamento sob demanda.

---

## Phase 3: User Story 1 — Ver o documento sem sair da página (Priority: P1) 🎯 MVP

**Goal**: o documento aparece renderizado dentro da tela de detalhes, navegável, sem abrir outra aba.

**Independent Test**: abrir os detalhes de um MI aprovado e confirmar que o documento é exibido e percorrível na própria página, com os metadados aparecendo antes dele.

### Tests for User Story 1

- [ ] T011 [P] [US1] Teste em `front/src/components/PdfPreview.test.tsx` confirmando que, com a URL disponível, o elemento `<object>` tem `data` igual à URL obtida e `type="application/pdf"`. **Asseverar pelos atributos, nunca pelo texto de fallback**: no jsdom o `<object>` nunca falha ao carregar e seus filhos ficam sempre no DOM, então um teste que procure o texto de fallback passaria também no estado de sucesso, provando nada
- [ ] T012 [P] [US1] Teste em `front/src/components/PdfPreview.test.tsx` do estado de carregamento: enquanto a URL não chega, há indicador de progresso e a área reserva altura, para o restante da página não saltar quando o documento chega
- [ ] T013 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que a pré-visualização aparece na tela de detalhes de um material aprovado, **sem** que o botão "Abrir PDF" desapareça (FR-003)
- [ ] T014 [P] [US1] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que título, autor e habilidades BNCC são renderizados mesmo com a busca da URL ainda pendente (FR-004)

### Implementation for User Story 1

- [ ] T015 [US1] Criar `front/src/components/PdfPreview.tsx` recebendo `materialId`, `materialStatus`, `onOpenFullscreen` e `title` opcional, conforme [contracts/pdf-preview-component.md](./contracts/pdf-preview-component.md). O componente **não recebe a URL pronta** — obtém-na por `useMaterialFileUrl` (depende de T004)
- [ ] T016 [US1] Em `PdfPreview`, renderizar o documento com `<object type="application/pdf">`, altura fixa e rolagem interna, usando os mesmos tokens de borda, fundo e tipografia das demais seções da tela de detalhes, conforme `front/CLAUDE.md` (depende de T015)
- [ ] T017 [US1] Em `front/src/components/PdfPreview.tsx`, renderizar o estado de carregamento com altura reservada equivalente à do documento (depende de T015)
- [ ] T018 [US1] Inserir `<PdfPreview>` em `front/src/pages/MaterialDetailPage.tsx` **imediatamente antes de `<AiSection>`** (hoje na linha 263), ou seja, depois das habilidades BNCC e antes da área de IA — o documento é o conteúdo principal, e o resumo por IA comenta sobre ele. Passar `handleOpenPdf` como `onOpenFullscreen`, para que exista **um único** caminho de abertura em tela cheia (depende de T015)

**Checkpoint**: o documento aparece na própria tela. É o MVP — entregue sozinho, resolve o problema de quem avalia material.

---

## Phase 4: User Story 2 — Ninguém encontra visualizador quebrado (Priority: P2)

**Goal**: toda falha de exibição produz mensagem compreensível, preservando metadados e tela cheia.

**Independent Test**: abrir os detalhes com o armazenamento fora do ar e com material sem permissão, confirmando mensagem clara e distinta em cada caso.

### Tests for User Story 2

- [ ] T019 [P] [US2] Teste em `front/src/components/PdfPreview.test.tsx`: com a busca da URL falhando em **`403`**, exibir mensagem de indisponibilidade **sem** botão de tentar novamente — repetir uma recusa por permissão produziria a mesma recusa
- [ ] T020 [P] [US2] Teste em `front/src/components/PdfPreview.test.tsx`: com falha em **`401`** e em **`404`**, mesmo tratamento de `403` — sem nova tentativa
- [ ] T021 [P] [US2] Teste em `front/src/components/PdfPreview.test.tsx`: com falha em **`500`** ou erro de rede, exibir mensagem de indisponibilidade temporária **com** botão de tentar novamente (FR-008)
- [ ] T022 [P] [US2] Teste em `front/src/components/PdfPreview.test.tsx` confirmando que acionar "tentar novamente" dispara nova busca da URL
- [ ] T023 [P] [US2] Teste em `front/src/pages/MaterialDetailPage.test.tsx` confirmando que, com a busca da URL falhando, os metadados continuam visíveis e o botão "Abrir PDF" continua presente e acionável (FR-006)

### Implementation for User Story 2

- [ ] T024 [US2] Criar em `front/src/components/PdfPreview.tsx` a classificação da falha a partir do código de situação da resposta: **`401`, `403` e `404` → sem nova tentativa**; **demais falhas → com nova tentativa**, conforme [contracts/pdf-preview-component.md](./contracts/pdf-preview-component.md#distinção-entre-sem-permissão-e-falha-temporária) (depende de T015)
- [ ] T025 [US2] Em `front/src/components/PdfPreview.tsx`, renderizar os dois estados de falha com mensagem compreensível e, quando couber, botão de tentar novamente ligado ao `refetch` do hook (depende de T024)
- [ ] T026 [US2] Em `front/src/components/PdfPreview.tsx`, preencher o **conteúdo de fallback** do `<object>` com explicação e chamada para abrir em tela cheia — cobre nativamente o navegador sem suporte a PDF embutido, sem depender de detecção por JavaScript. **Não escrever teste automatizado para este conteúdo**: no jsdom ele está sempre presente, então qualquer asserção sobre ele é vazia. Verificação apenas manual (depende de T016)
- [ ] T027 [US2] Garantir em `front/src/pages/MaterialDetailPage.tsx` que nenhuma falha da pré-visualização interrompe a renderização do restante da tela — a área do documento falha isolada (depende de T018)

**Checkpoint**: nenhuma tela de detalhes exibe área vazia sem explicação.

---

## Phase 5: User Story 3 — Experiência utilizável em tela pequena (Priority: P3)

**Goal**: em tela estreita o documento não é montado; no lugar dele, chamada evidente para tela cheia.

**Independent Test**: abrir os detalhes em viewport estreita e confirmar que não há documento embutido, que a chamada de tela cheia aparece e que **nenhuma requisição do arquivo** é emitida.

### Tests for User Story 3

- [ ] T028 [P] [US3] Teste em `front/src/components/PdfPreview.test.tsx` confirmando que, em tela estreita, **nenhum** elemento `<object>` é renderizado e a chamada para abrir em tela cheia aparece
- [ ] T029 [P] [US3] Teste em `front/src/components/PdfPreview.test.tsx` confirmando que, em tela estreita, **nenhuma requisição da URL é emitida** — o hook é chamado com `enabled: false`, para o navegador não baixar o arquivo onde ele não será exibido
- [ ] T030 [P] [US3] Teste em `front/src/components/PdfPreview.test.tsx` confirmando que, em largura de desktop, o documento volta a ser renderizado normalmente

### Implementation for User Story 3

- [ ] T031 [US3] Em `front/src/components/PdfPreview.tsx`, consumir `useIsNarrowScreen()` e **não montar** o `<object>` quando verdadeiro — esconder por CSS deixaria o elemento no DOM e o navegador baixaria o PDF à toa (depende de T001, T015)
- [ ] T032 [US3] Em `front/src/components/PdfPreview.tsx`, passar `enabled: !isNarrow` para `useMaterialFileUrl`, de modo que a busca do acesso não aconteça em tela estreita (depende de T007, T031)
- [ ] T033 [US3] Em `front/src/components/PdfPreview.tsx`, renderizar em tela estreita um cartão com o nome do documento e chamada evidente para abrir em tela cheia, ligada a `onOpenFullscreen` (depende de T031)

**Checkpoint**: telas estreitas rolam de ponta a ponta, sem documento embutido e sem download desperdiçado.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Documentar em `front/CLAUDE.md` a convenção da pré-visualização: acesso ao arquivo sempre por `useMaterialFileUrl`, nunca montando `<object>` diretamente, e a regra de não montar em tela estreita
- [ ] T035 [P] Verificar a cobertura dos arquivos novos com `npm --prefix front run test:coverage`, atendendo ao Princípio V
- [ ] T036 Executar `npm --prefix front run test` confirmando que nenhum teste existente teve expectativa alterada (SC-005)
- [ ] T037 Executar `npm --prefix MI-server run test:unit` e `npm --prefix MI-server run test:integration` confirmando que o back segue íntegro — esta feature não deveria tê-lo tocado
- [ ] T038 Percorrer os 8 cenários de [quickstart.md](./quickstart.md) no ambiente real, incluindo a verificação na aba de rede de que o PDF **não** é baixado em tela estreita

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências
- **Foundational (Fase 2)**: independe da Fase 1, mas **bloqueia todas as histórias**
- **US1 (Fase 3)**: depende da Fase 2
- **US2 (Fase 4)**: depende da Fase 2 e do componente criado na US1
- **US3 (Fase 5)**: depende da Fase 2, da Fase 1 e do componente criado na US1
- **Polish (Fase 6)**: depende das histórias desejadas

### User Story Dependencies

Diferente da feature 001, aqui as histórias **não são mutuamente independentes**: as três atuam
sobre o mesmo componente. US2 e US3 acrescentam estados a `PdfPreview`, criado na US1.

- **US1 (P1)**: primeira, obrigatoriamente. Cria o componente.
- **US2 (P2)**: acrescenta os estados de falha ao componente da US1.
- **US3 (P3)**: acrescenta o comportamento de tela estreita ao componente da US1.

US2 e US3 podem ser feitas em qualquer ordem entre si, mas ambas tocam o mesmo arquivo — se
paralelizadas por pessoas diferentes, haverá conflito em `PdfPreview.tsx`.

### Parallel Opportunities

- T001 e T002 em paralelo com toda a Fase 2 — arquivos disjuntos
- T008, T009 e T010 em paralelo entre si
- Todos os testes de uma mesma história marcados `[P]`
- **Atenção**: as tarefas de implementação de US2 e US3 tocam `PdfPreview.tsx` e **não** devem ser paralelizadas entre si

---

## Parallel Example: User Story 1

```bash
# Testes da US1, juntos:
Task: "PdfPreview renderiza o documento em front/src/components/PdfPreview.test.tsx"
Task: "PdfPreview mostra carregamento com altura reservada em front/src/components/PdfPreview.test.tsx"
Task: "Detalhes exibe a pré-visualização em front/src/pages/MaterialDetailPage.test.tsx"
Task: "Metadados independem da URL em front/src/pages/MaterialDetailPage.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 2 — Foundational (**crítica**, bloqueia tudo)
2. Fase 3 — US1
3. **PARE E VALIDE**: abra os detalhes de um material e confirme o documento na tela
4. O objetivo declarado da feature já está cumprido

### Incremental Delivery

1. Foundational → acesso ao arquivo resolvível
2. + US1 → documento na tela → **MVP**
3. + US2 → nenhuma tela quebrada
4. + US3 → celular utilizável

### Ordem recomendada para uma pessoa só

Fase 2 → US1 → US2 → US3 → Polimento. A Fase 1 pode entrar a qualquer momento antes da US3; é a
única parte sem dependência.
