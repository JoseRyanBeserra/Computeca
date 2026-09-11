# Feature Specification: Links Relacionados do Material Instrucional

**Feature Branch**: `004-material-links`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Abaixo de descrição, uma linha de links relacionados: uma lista de botões que eu possa clicar e me redirecione a links. Quero adicionar esses links na hora do cadastro do MI, e eles aparecerão com a mesma aparência das habilidades na hora de exibir nos detalhes do MI, só que clicável. Esses links serão opcionais."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alcançar o material complementar em um clique (Priority: P1)

Um professor abre os detalhes de um MI sobre pensamento computacional. Além do documento, o autor
indicou uma videoaula, uma planilha de atividades e o artigo que fundamenta a proposta. Os três
aparecem como botões logo abaixo da descrição — ele reconhece pelo nome o que cada um é, clica no
que interessa e o material abre sem perder a tela onde estava.

Ao abrir um material que não indicou nenhum link, a área simplesmente não existe: nada de espaço
vazio ou aviso de ausência.

**Why this priority**: é todo o valor da feature para quem consulta. Entregue sozinho, já conecta o
acervo ao material complementar que hoje fica de fora.

**Independent Test**: abrir os detalhes de um material com links e de um sem, confirmando que os
botões aparecem e funcionam no primeiro e que nada é exibido no segundo.

**Acceptance Scenarios**:

1. **Given** um material com links relacionados, **When** o usuário abre os detalhes, **Then** os
   links aparecem como botões **abaixo da descrição**, com a mesma aparência dos chips de
   habilidade BNCC.
2. **Given** os botões exibidos, **When** o usuário aciona um deles, **Then** o endereço é aberto
   **fora da tela atual**, preservando a página do material.
3. **Given** um material sem links, **When** o usuário abre os detalhes, **Then** **nenhuma área de
   links é exibida** — nem rótulo, nem espaço vazio, nem aviso.
4. **Given** um botão de link, **When** o usuário para o cursor sobre ele, **Then** o endereço de
   destino é revelado antes do clique.
5. **Given** um rótulo longo, **When** exibido, **Then** o botão não deforma a linha nem empurra o
   restante da tela.

---

### User Story 2 - Indicar material complementar no cadastro (Priority: P1)

Ao enviar um MI, o autor informa os links que complementam o material: para cada um, um nome curto
e o endereço. Pode não informar nenhum — os links são opcionais e o envio conclui sem eles.

Se o endereço estiver malformado, o autor descobre na hora, não depois de publicar.

**Why this priority**: sem o cadastro não há o que exibir. É a outra metade obrigatória da US1.

**Independent Test**: cadastrar um material com links e outro sem, confirmando que ambos concluem e
que os links do primeiro aparecem nos detalhes.

**Acceptance Scenarios**:

1. **Given** o formulário de envio, **When** o autor informa nome e endereço de um link e o
   adiciona, **Then** o link aparece na lista do formulário antes do envio.
2. **Given** um link adicionado por engano, **When** o autor o remove, **Then** ele deixa a lista e
   não é enviado.
3. **Given** nenhum link informado, **When** o autor envia, **Then** o cadastro conclui
   normalmente — links são opcionais.
4. **Given** um endereço malformado, **When** o autor tenta adicionar, **Then** é impedido e
   informado do formato esperado, **antes** do envio.
5. **Given** um nome não informado, **When** o autor tenta adicionar, **Then** é impedido — um
   botão sem nome não diz nada a quem lê.
6. **Given** links informados, **When** o cadastro conclui, **Then** eles são exibidos na tela de
   detalhes exatamente como informados.

---

### User Story 3 - Ninguém é levado a um destino perigoso (Priority: P2)

O Computeca aceita submissões de terceiros. Um botão com nome amigável que leva a qualquer lugar é
um vetor de abuso: quem clica confia no nome, não no endereço. O sistema recusa endereços que não
sejam de navegação web comum e não deixa a página de origem exposta ao destino.

**Why this priority**: não impede o valor principal, mas sem isso a feature abre uma porta que hoje
não existe no produto — conteúdo clicável fornecido por quem submete material.

**Independent Test**: tentar cadastrar endereços com esquemas perigosos e confirmar a recusa, tanto
pela tela quanto por chamada direta.

**Acceptance Scenarios**:

1. **Given** um endereço com esquema de execução de código, **When** submetido, **Then** é
   recusado.
2. **Given** um endereço sem esquema de navegação web reconhecido, **When** submetido, **Then** é
   recusado.
3. **Given** uma tentativa que contorne o formulário, **When** ela chega ao sistema com endereço
   inválido, **Then** é recusada — a regra não depende da interface.
4. **Given** um link exibido, **When** o usuário o aciona, **Then** o destino **não** obtém
   controle sobre a página de origem nem recebe o endereço de onde o usuário veio.

---

### Edge Cases

- **Material sem links**: a área inteira desaparece, seguindo o comportamento já adotado pelos chips
  de habilidade quando a lista está vazia.
- **Material anterior a esta mudança**: equivale a material sem links — nenhuma área exibida,
  nenhuma migração de dados.
- **Rótulo ou endereço só com espaços**: tratado como ausente e recusado.
- **Endereço repetido no mesmo material**: aceito. Dois nomes diferentes podem apontar ao mesmo
  lugar legitimamente; impedir traria mais atrito do que benefício.
- **Rótulo longo demais**: recusado no cadastro, com limite informado antes da tentativa.
- **Quantidade de links**: limitada, para que a linha continue legível e o formulário não vire uma
  lista infinita.
- **Endereço válido mas fora do ar**: fora do escopo — o sistema não verifica se o destino responde,
  apenas se o endereço é bem formado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O material instrucional MUST poder ter uma lista de links relacionados, cada um
  composto por **rótulo** e **endereço**.
- **FR-002**: A lista MUST ser **opcional** — um material sem links é válido e o cadastro conclui
  normalmente.
- **FR-003**: A tela de detalhes MUST exibir os links **imediatamente abaixo da descrição**, como
  botões com a **mesma aparência visual dos chips de habilidade BNCC**, porém acionáveis.
- **FR-004**: Cada botão MUST exibir o **rótulo** informado no cadastro, não o endereço.
- **FR-005**: Cada botão MUST revelar o endereço de destino ao usuário antes do clique.
- **FR-006**: Acionar um botão MUST abrir o endereço **fora da tela atual**, preservando a página do
  material.
- **FR-007**: Quando o material não possui links, a tela MUST NOT exibir nenhuma área relacionada —
  sem rótulo, sem espaço vazio, sem aviso de ausência.
- **FR-008**: O formulário de cadastro MUST permitir acrescentar e remover links antes do envio,
  exibindo a lista acumulada.
- **FR-009**: O rótulo MUST ser obrigatório para cada link, com no máximo **60** caracteres,
  contados após remover espaços das extremidades.
- **FR-010**: O endereço MUST ser obrigatório para cada link e MUST usar exclusivamente esquema de
  navegação web (`http` ou `https`). Endereços com outros esquemas MUST ser recusados.
- **FR-011**: O número de links por material MUST ser limitado a **10**.
- **FR-012**: As regras de rótulo, endereço e quantidade MUST ser aplicadas no servidor, não apenas
  na interface — um cadastro que contorne o formulário MUST ser recusado.
- **FR-013**: As regras MUST valer igualmente para o envio direto ao acervo e para o envio vinculado
  a uma organização.
- **FR-014**: O formulário MUST informar as regras **antes** da tentativa de envio: endereço
  malformado ou rótulo ausente impedem o acréscimo do link na hora.
- **FR-015**: Ao acionar um link, o destino MUST NOT obter controle sobre a página de origem nem
  receber o endereço de onde o usuário veio.
- **FR-016**: A introdução dos links MUST NOT alterar o comportamento de nenhum outro campo ou fluxo
  do material — título, descrição, habilidades BNCC, arquivo, aprovação e exclusão permanecem como
  estão.
- **FR-017**: A cobertura de testes MUST exercitar a exibição com e sem links, a recusa por rótulo
  ausente, por rótulo longo demais, por endereço malformado, por esquema perigoso e por exceder o
  limite de quantidade, **nos dois caminhos de cadastro**.

### Key Entities

- **Link relacionado**: pertence a um material instrucional. Composto por **rótulo** (texto curto
  que identifica o destino para quem lê) e **endereço** (destino de navegação web). Um material tem
  de zero a dez links; a ordem de exibição segue a ordem informada no cadastro.
- **Material Instrucional**: passa a comportar a lista de links. Nenhum outro atributo é alterado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem consulta um material com links alcança qualquer um deles em **um clique**, sem
  sair da página do material.
- **SC-002**: 100% dos materiais sem links exibem a tela de detalhes sem nenhuma área de links —
  nenhum espaço vazio, nenhum aviso.
- **SC-003**: Nenhum endereço com esquema fora de `http`/`https` é aceito, inclusive por requisição
  que não passe pelo formulário.
- **SC-004**: Quem cadastra conhece as regras de rótulo e endereço **antes** de tentar enviar, e não
  as descobre por uma recusa.
- **SC-005**: 100% dos materiais cadastrados antes desta mudança continuam consultáveis, sem links e
  sem erro.
- **SC-006**: Nenhum fluxo alheio aos links muda de comportamento — cadastro dos demais campos,
  consulta, aprovação, exclusão e pré-visualização seguem idênticos.

## Assumptions

- **Links são opcionais, diferente da descrição.** Um material sem links é tão válido quanto um com
  dez, e a ausência não é sinalizada de forma alguma na tela.
- **O limite de 10 links e de 60 caracteres no rótulo** foram escolhidos para manter a linha de
  botões legível e comparável aos chips de habilidade. Não vieram de exigência externa.
- **O sistema não verifica se o destino responde.** Validar que o endereço é bem formado é
  diferente de garantir que o site está no ar — verificação de disponibilidade está fora do escopo.
- **Endereços repetidos são aceitos** dentro do mesmo material: dois rótulos podem legitimamente
  apontar para o mesmo lugar.
- **Os links não são editáveis depois do cadastro**, pela mesma razão da descrição: o sistema não
  possui fluxo de edição de metadados de material. O que for informado no envio é definitivo.
- **Os links não aparecem nos cartões de listagem** nesta feature; o pedido é sobre a tela de
  detalhes.
- **Quem pode ver o material pode ver os links.** Nenhuma regra de acesso nova é criada.
- **Materiais anteriores à mudança não precisam de migração de dados** — ausência de links é o
  estado natural de quem nunca os informou.
