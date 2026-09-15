# Feature Specification: Atualização do Catálogo de Habilidades da BNCC Computação

**Feature Branch**: `006-bncc-habilidades-update`

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "Quero atualizar a lista de habilidades da BNCC computação disponiveis. Mandei em anexo o csv com todas as habilidades e suas descrições"

**Fonte**: [`habilidades_bncc_computacao.csv`](./habilidades_bncc_computacao.csv) — cópia do arquivo enviado, versionada junto à especificação.

## Contexto

Ao cadastrar ou editar um material, quem envia escolhe as habilidades da BNCC de Computação numa
lista com busca. Essa lista foi montada à mão e está **incompleta** em relação ao arquivo enviado:

| Aspecto | Catálogo atual | Arquivo enviado |
|---|---|---|
| Total de habilidades | 109 | **141** |
| Educação Infantil (`EI03CO01`–`EI03CO11`) | ausente | 11 habilidades |
| Anos Iniciais agrupados (`EF15CO01`–`EF15CO09`) | ausente | 9 habilidades |
| Anos Finais agrupados (`EF69CO01`–`EF69CO12`) | ausente | 12 habilidades |
| Descrições | **resumidas** "para caber na tela" | texto integral |
| Código do 5º ano, 11ª habilidade | `EF05CO11` | `EF05CO011` (dígito a mais) |

Todos os 109 códigos atuais existem no arquivo — nenhuma habilidade é retirada. As três
habilidades usadas hoje pelo acervo (`EF06CO01`, `EF06CO02`, `EF06CO04`) permanecem.

## Clarifications

### Session 2026-09-14

- Q: A lista de sugestões deve continuar limitada a 8 habilidades por etapa? → A: **Não.** Ao
  publicar um material, o autor precisa ver a lista com **todas** as habilidades do arquivo, e não
  apenas algumas. O limite por etapa é removido (FR-014, SC-006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encontrar qualquer habilidade oficial ao classificar um material (Priority: P1)

Uma professora de Educação Infantil cadastra um material sobre reconhecimento de padrões em
sequências de sons e movimentos. Ela busca por "padrão" e encontra `EI03CO01`, com a descrição
completa, e a seleciona. Antes, a etapa inteira não existia na lista, e ela precisaria digitar o
código como habilidade personalizada — sem descrição e sujeita a erro de digitação.

Da mesma forma, quem classifica um material por segmento, e não por ano, encontra os códigos
agrupados `EF15` e `EF69`.

**Why this priority**: é o pedido em si. Uma habilidade que não aparece na busca empurra o autor
para a digitação livre, que é onde nascem códigos errados e materiais que o filtro não encontra.

**Independent Test**: no formulário de cadastro, buscar por código cada uma das 141 habilidades do
arquivo e confirmar que todas aparecem, com a descrição idêntica à do arquivo.

**Acceptance Scenarios**:

1. **Given** o formulário de cadastro aberto, **When** o autor busca `EI03CO07`, **Then** a
   habilidade aparece como sugestão, sob a etapa Educação Infantil, com a descrição integral.
2. **Given** o formulário de cadastro aberto, **When** o autor busca pelo trecho "robótica",
   **Then** `EM13CO16` aparece entre as sugestões.
3. **Given** o formulário de edição de um material, **When** o Admin busca `EF69CO10`, **Then**
   a habilidade aparece, exatamente como no cadastro.
4. **Given** uma habilidade de descrição longa (ex.: `EF02CO02`), **When** ela aparece como
   sugestão, **Then** o texto integral é legível, sem ser cortado com reticências.

---

### User Story 2 - O acervo existente não é afetado (Priority: P1)

Um material já publicado tem as habilidades `EF06CO01`, `EF06CO02` e `EF06CO04`. Depois da
atualização, ele continua exatamente com essas três, continua aparecendo no filtro por
habilidade, e abrir sua edição mostra as três selecionadas.

**Why this priority**: atualizar a lista de escolha não pode alterar o que já foi classificado.
Uma habilidade que some ou muda de código num material aprovado é uma alteração de conteúdo
revisado sem revisão, e sem registro de auditoria.

**Independent Test**: comparar as habilidades gravadas em todos os materiais antes e depois da
atualização — nenhuma diferença.

**Acceptance Scenarios**:

1. **Given** materiais já cadastrados, **When** a atualização é aplicada, **Then** nenhuma
   habilidade gravada em nenhum material é alterada, removida ou acrescentada.
2. **Given** um material com uma habilidade personalizada que não consta no arquivo, **When** ele
   é aberto na edição, **Then** a habilidade continua selecionada e identificada como personalizada.
3. **Given** um material que recebeu `EI03CO01` como habilidade personalizada antes da
   atualização, **When** ele é aberto na edição depois dela, **Then** a habilidade passa a exibir a
   descrição oficial — sem que o registro do material tenha sido alterado.

---

### User Story 3 - Distinguir as etapas ao navegar pela lista (Priority: P2)

Com 141 habilidades, a lista precisa continuar navegável. As sugestões aparecem agrupadas por
etapa — Educação Infantil, Ensino Fundamental Anos Iniciais, Ensino Fundamental Anos Finais e
Ensino Médio —, e os códigos agrupados (`EF15`, `EF69`) ficam junto ao segmento a que pertencem.

**Why this priority**: sem agrupamento a busca ainda funciona, mas quem navega sem saber o código
se perde. É melhoria de uso sobre a US1, não condição para ela.

**Independent Test**: abrir a lista de sugestões sem digitar nada e conferir os quatro grupos, na
ordem da escolaridade, cada um contendo apenas códigos da sua etapa.

**Acceptance Scenarios**:

1. **Given** a lista de sugestões aberta, **When** nenhum termo foi digitado, **Then** os grupos
   aparecem na ordem Educação Infantil → Anos Iniciais → Anos Finais → Ensino Médio.
2. **Given** o grupo Anos Iniciais, **When** o autor o percorre, **Then** encontra os códigos
   `EF01`–`EF05` e os agrupados `EF15`; nenhum código de outra etapa aparece ali.
3. **Given** o grupo Anos Finais, **When** o autor o percorre, **Then** encontra `EF06`–`EF09` e
   os agrupados `EF69`.
4. **Given** a lista de sugestões aberta sem termo, **When** o autor rola até o fim, **Then**
   encontra **todas as 141 habilidades** — nenhuma etapa aparece cortada.

---

### Edge Cases

- **Código com dígito a mais no arquivo** (`EF05CO011`): o catálogo usa o formato oficial
  `EF05CO11`, que é também o código que materiais existentes podem ter gravado. A descrição vem do
  arquivo.
- **Descrições repetidas entre códigos diferentes** (ex.: `EF05CO03` e `EF15CO03` têm o mesmo
  texto; `EF06CO02` e `EF69CO02` também): ambos os códigos existem e são selecionáveis
  separadamente — o código é o que distingue a habilidade, não a descrição.
- **Busca por termo que casa com muitas habilidades** (ex.: "algoritmo"): **todas** as
  correspondências aparecem, agrupadas por etapa, na lista com rolagem — nenhuma é omitida por
  limite de quantidade.
- **Habilidade já selecionada**: não reaparece nas sugestões, como hoje.
- **Pequenas variações de redação entre códigos equivalentes** (ex.: "tipo de dados" em `EF06CO01`
  e "tipo de dado" em `EF69CO01`): preservadas como estão no arquivo, sem correção editorial.
- **Aspas tipográficas e acentos** presentes no arquivo (ex.: ‘Algoritmos’): preservados.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O catálogo de habilidades MUST conter exatamente as 141 habilidades do arquivo
  enviado — nem mais, nem menos —, uma entrada por código.
- **FR-002**: A descrição de cada habilidade MUST ser o texto integral do arquivo, sem resumo.
- **FR-003**: O código `EF05CO011` do arquivo MUST ser registrado no catálogo como `EF05CO11`.
- **FR-004**: O catálogo MUST organizar as habilidades em quatro etapas, nesta ordem: Educação
  Infantil (`EI03`), Ensino Fundamental — Anos Iniciais (`EF01`–`EF05` e `EF15`), Ensino
  Fundamental — Anos Finais (`EF06`–`EF09` e `EF69`) e Ensino Médio (`EM13`).
- **FR-005**: Dentro de cada etapa, as habilidades MUST seguir a ordem em que aparecem no arquivo.
- **FR-006**: A busca por habilidade MUST encontrar qualquer uma das 141 pelo código ou por
  qualquer trecho da descrição integral, sem diferenciar maiúsculas de minúsculas.
- **FR-007**: A descrição integral MUST ser legível tanto na lista de sugestões quanto ao consultar
  uma habilidade já selecionada, sem truncamento que oculte parte do texto.
- **FR-008**: Os formulários de cadastro e de edição de material MUST oferecer o mesmo catálogo.
- **FR-009**: A atualização MUST NOT alterar, remover ou acrescentar habilidades gravadas em
  materiais existentes.
- **FR-010**: A inclusão de habilidade personalizada (fora do catálogo) MUST continuar permitida.
- **FR-011**: Um código gravado como personalizado que passe a constar no catálogo MUST ser
  exibido com a descrição oficial.
- **FR-012**: O arquivo de origem MUST ficar versionado no repositório, e MUST existir verificação
  automatizada de que o catálogo corresponde a ele — mesma quantidade, mesmos códigos (com a
  normalização do FR-003) e mesmas descrições.
- **FR-014**: A lista de sugestões MUST exibir **todas** as habilidades que correspondem à busca —
  sem termo digitado, as 141 —, sem limite de quantidade por etapa, navegável por rolagem.
- **FR-013**: Os testes MUST cobrir a presença das habilidades novas das três etapas acrescentadas,
  a normalização do FR-003, a ordem das etapas e a continuidade das habilidades já usadas pelo acervo.

### Key Entities

- **Habilidade BNCC**: uma competência da BNCC de Computação. Atributos: código (identificador
  único, no formato `<etapa><ano ou segmento>CO<sequência>`), descrição integral e etapa.
- **Etapa**: agrupamento de escolaridade que organiza as habilidades para navegação — Educação
  Infantil, Anos Iniciais, Anos Finais e Ensino Médio.
- **Material Instrucional** *(existente)*: guarda a lista de códigos de habilidades escolhidos.
  Não muda nesta feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos 141 códigos do arquivo são encontrados pela busca no formulário de cadastro.
- **SC-002**: 0 divergências entre as descrições exibidas e as do arquivo.
- **SC-003**: 0 materiais com habilidades alteradas após a atualização.
- **SC-004**: Um autor localiza uma habilidade da Educação Infantil, a partir de um termo da
  descrição, em menos de 30 segundos e sem recorrer à habilidade personalizada.
- **SC-006**: Com a lista aberta e sem termo digitado, as 141 habilidades estão acessíveis por
  rolagem — 0 habilidades ocultas por limite.
- **SC-005**: Nenhum teste existente tem expectativa alterada, exceto os que dependiam
  explicitamente do texto resumido das descrições antigas.

## Assumptions

- **Atualização pontual, não gestão contínua**: o pedido é atualizar o conteúdo da lista com o
  arquivo enviado. Um fluxo em que o administrador importa uma nova planilha pela interface fica
  fora do escopo; nova atualização futura segue o mesmo caminho desta.
- **O arquivo é a fonte oficial**: sua redação é adotada como está, inclusive variações pequenas
  entre códigos equivalentes. A única correção é o código `EF05CO011`, por não seguir o formato de
  dois dígitos de sequência usado por todos os outros 140 códigos.
- **Códigos agrupados são habilidades próprias**: `EF15` e `EF69` representam os segmentos
  (1º ao 5º e 6º ao 9º ano) e coexistem com os códigos por ano, mesmo com descrições coincidentes.
- **A Educação Infantil `EI03`** corresponde à faixa de crianças pequenas e forma uma etapa própria.
- **O servidor continua sem restringir códigos ao catálogo**: habilidade personalizada segue
  válida, então a atualização não exige mudança na validação do cadastro.
- **O filtro por habilidade da listagem não muda**: ele é montado a partir das habilidades
  presentes nos materiais aprovados, não do catálogo.
- **Fora do escopo**: identificação automática de habilidades por IA; tradução das descrições;
  inclusão do seletor de habilidades no formulário de envio por projeto.
