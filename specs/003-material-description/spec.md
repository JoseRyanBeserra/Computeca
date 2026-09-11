# Feature Specification: Descrição Obrigatória do Material Instrucional

**Feature Branch**: `003-material-description`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Na tela de detalhes do MI, abaixo das habilidades da BNCC, ter um espaço para descrição. Os materiais que já existem vão ficar com esse espaço em branco, mas quando for cadastrar os materiais quero que seja obrigatório ter descrição."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entender o material antes de abri-lo (Priority: P1)

Um professor percorre o acervo procurando material sobre pensamento computacional. Abre os
detalhes de um MI e, hoje, encontra apenas título, autor, tamanho e códigos da BNCC — nada que
diga do que o material trata. Com a descrição, ele lê em segundos a proposta do material e decide
se vale abrir o documento.

Ao abrir um material antigo, cadastrado antes desta mudança, o espaço aparece vazio de forma
explicada, sem parecer que a tela quebrou.

**Why this priority**: é o ganho imediato para quem consulta, e vale para todo o acervo — inclusive
enquanto a maioria dos materiais ainda não tiver descrição.

**Independent Test**: abrir os detalhes de um material com descrição e de um sem, confirmando que
o espaço aparece corretamente nos dois casos.

**Acceptance Scenarios**:

1. **Given** um material com descrição, **When** o usuário abre os detalhes, **Then** a descrição
   é exibida **abaixo das habilidades BNCC**.
2. **Given** um material cadastrado antes desta mudança, **When** o usuário abre os detalhes,
   **Then** o espaço da descrição indica de forma clara que o material não possui descrição, sem
   mensagem de erro.
3. **Given** uma descrição longa, **When** exibida, **Then** o texto é legível e não deforma o
   restante da tela.
4. **Given** uma descrição com quebras de linha, **When** exibida, **Then** os parágrafos são
   preservados.

---

### User Story 2 - Ninguém publica material sem explicar do que se trata (Priority: P1)

Um professor envia um novo material. O formulário exige que ele descreva o conteúdo antes de
concluir: sem descrição, o envio não acontece. O sistema informa com clareza quanto texto falta,
em vez de apenas recusar.

**Why this priority**: é o que faz o acervo melhorar com o tempo. Sem obrigatoriedade no cadastro,
a descrição vira campo opcional que ninguém preenche, e a US1 nunca cumpre sua promessa.

**Independent Test**: tentar cadastrar um material sem descrição e com descrição curta demais,
confirmando a recusa; cadastrar com descrição válida e confirmar o sucesso.

**Acceptance Scenarios**:

1. **Given** um formulário de envio preenchido sem descrição, **When** o usuário tenta enviar,
   **Then** o envio é impedido e a exigência é informada com clareza.
2. **Given** uma descrição com menos de 50 caracteres, **When** o usuário tenta enviar, **Then** o
   envio é impedido e o usuário é informado do mínimo exigido.
3. **Given** uma descrição com mais de 2000 caracteres, **When** o usuário tenta enviar, **Then** o
   envio é impedido e o usuário é informado do máximo permitido.
4. **Given** uma descrição válida, **When** o usuário envia, **Then** o material é cadastrado com
   a descrição e ela aparece na tela de detalhes.
5. **Given** uma descrição composta apenas de espaços, **When** o usuário tenta enviar, **Then** o
   envio é impedido — espaço em branco não é descrição.
6. **Given** uma tentativa de cadastro que contorne o formulário, **When** ela chega ao sistema sem
   descrição válida, **Then** é recusada — a exigência não depende da interface.
7. **Given** um envio sem título, **When** submetido, **Then** é recusado. O servidor deixa de
   recorrer ao nome do arquivo: título passa a ser informação que o autor fornece, não que o
   sistema adivinha.

---

### User Story 3 - A exigência vale para todo caminho de cadastro (Priority: P2)

O Computeca permite enviar material diretamente ao acervo e também vinculado a uma organização.
Quem usa o segundo caminho encontra a mesma exigência: não há porta lateral por onde entre material
sem descrição.

**Why this priority**: uma regra que vale só em um dos caminhos não é uma regra. Sem isto, o acervo
continuaria recebendo material sem descrição pelo caminho das organizações.

**Independent Test**: tentar enviar material por uma organização sem descrição e confirmar a mesma
recusa do caminho direto.

**Acceptance Scenarios**:

1. **Given** um envio vinculado a uma organização sem descrição, **When** submetido, **Then** é
   recusado com a mesma regra do envio direto.
2. **Given** um envio vinculado a uma organização com descrição válida, **When** submetido,
   **Then** o material é cadastrado com a descrição.

---

### Edge Cases

- **Material anterior à mudança**: permanece sem descrição permanentemente — não existe caminho de
  edição de metadados no sistema. Ver a nota em Assumptions.
- **Descrição só com espaços ou quebras de linha**: tratada como ausente e recusada.
- **Descrição exatamente no limite** (50 ou 2000 caracteres): aceita. Os limites são inclusivos.
- **Descrição com caracteres especiais ou acentuação**: preservada como digitada.
- **Contagem de caracteres**: conta caracteres visíveis ao usuário, após remover espaços das
  extremidades — o usuário não deve ser reprovado por espaços que nem vê.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O material instrucional MUST possuir um campo de descrição textual.
- **FR-002**: A tela de detalhes MUST exibir a descrição **imediatamente abaixo das habilidades
  BNCC**.
- **FR-003**: Quando o material não possui descrição, a tela MUST indicar a ausência de forma
  clara e discreta, sem mensagem de erro e sem deixar área vazia inexplicada.
- **FR-004**: A descrição MUST ser obrigatória em todo cadastro de material novo.
- **FR-005**: A descrição MUST ter no mínimo **50** e no máximo **2000** caracteres, contados após
  remover espaços das extremidades. Ambos os limites são inclusivos.
- **FR-006**: A obrigatoriedade MUST ser aplicada no servidor, não apenas na interface — um
  cadastro que contorne o formulário MUST ser recusado.
- **FR-007**: O formulário de envio MUST informar a exigência **antes** da tentativa de envio, e
  MUST indicar quanto texto ainda falta ou excede.
- **FR-008**: A exigência MUST valer igualmente para o envio direto ao acervo e para o envio
  vinculado a uma organização.
- **FR-009**: Materiais cadastrados antes desta mudança MUST permanecer válidos e consultáveis, sem
  descrição, sem qualquer interrupção de funcionamento.
- **FR-010**: A mudança MUST NOT alterar o comportamento de nenhum fluxo alheio ao cadastro —
  habilidades BNCC, arquivo, aprovação, exclusão, download e pré-visualização permanecem como estão.
  As únicas regras de entrada que mudam são as de descrição e título, ambas no cadastro.
- **FR-011**: O **título** MUST ser obrigatório em todo cadastro de material novo, com no máximo
  **255** caracteres, contados após remover espaços das extremidades. Hoje o servidor tolera sua
  ausência e recorre ao nome do arquivo; essa tolerância deixa de existir.
- **FR-012**: A cobertura de testes MUST exercitar a exibição com e sem descrição, e a recusa por
  ausência de descrição, por texto curto demais, por texto longo demais, por espaços em branco e
  por ausência de título, **nos dois caminhos de cadastro**.

### Key Entities

- **Material Instrucional**: ganha o atributo **descrição** — texto livre, opcional no
  armazenamento (para comportar o acervo já existente) e obrigatório no cadastro de material novo,
  entre 50 e 2000 caracteres.
- **Título** (atributo já existente): deixa de ser preenchido automaticamente pelo sistema. A
  coluna continua obrigatória no banco, como sempre foi; o que muda é que o **valor precisa vir de
  quem cadastra**, com no máximo 255 caracteres. Nenhum material do acervo é afetado — todos já
  possuem título.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos materiais cadastrados após esta mudança possuem descrição com pelo menos 50
  caracteres e título fornecido por quem cadastrou, não derivado do nome do arquivo.
- **SC-002**: Nenhum cadastro sem descrição válida é aceito, inclusive por requisição que não passe
  pelo formulário.
- **SC-003**: 100% dos materiais anteriores à mudança continuam consultáveis, e sua tela de
  detalhes não apresenta erro nem área vazia sem explicação.
- **SC-004**: Quem preenche o formulário sabe que a descrição é exigida antes de tentar enviar, e
  não descobre a regra por uma recusa.
- **SC-005**: Nenhum fluxo alheio ao cadastro muda de comportamento — consulta, aprovação,
  exclusão, download e pré-visualização seguem idênticos. Os testes de **cadastro** são atualizados
  para enviar os campos agora exigidos: tornar um campo obrigatório é, por definição, uma mudança
  de contrato de entrada, e fingir o contrário produziria um critério impossível de cumprir.

## Assumptions

- **Materiais antigos ficam sem descrição para sempre.** O sistema não possui nenhum caminho de
  edição de metadados de material — não há operação que altere título, habilidades ou descrição
  depois do cadastro. Quem quiser dar descrição a um material antigo precisaria cadastrá-lo
  novamente. Criar um fluxo de edição está **fora do escopo** desta feature, mas é a consequência
  direta da decisão de deixá-los em branco.
- **A descrição é texto simples**, sem formatação rica. Quebras de linha são preservadas; nenhuma
  marcação é interpretada.
- **A descrição não é usada em busca** nesta feature. Torná-la pesquisável é trabalho separado.
- **A descrição não aparece nos cartões de listagem** nesta feature; o pedido é sobre a tela de
  detalhes.
- **Quem pode ver o material pode ver a descrição.** Nenhuma regra de acesso nova é criada: a
  descrição acompanha o material.
- **Os limites de 50 e 2000 caracteres** foram definidos pelo responsável pelo projeto, para
  garantir descrição substancial num acervo acadêmico sem transformar o cadastro em redação.
- **O título passa a ser obrigatório junto com a descrição**, por decisão do responsável. Hoje o
  servidor aceita cadastro sem título e usa o nome do arquivo — um título como
  `documento_final_v3` não ajuda ninguém a encontrar o material. O limite de 255 caracteres
  acompanha o que o formulário já aplica.
- **Nenhum material do acervo tem título vazio**, verificado no banco, então a nova exigência não
  cria inconsistência com o que já existe.
