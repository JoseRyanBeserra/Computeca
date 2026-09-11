# Feature Specification: Edição de Material Instrucional pelo Administrador

**Feature Branch**: `005-material-edit`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Quero que o administrador possa editar os MIs que já estão salvos e disponíveis, alterando qualquer parte do MI, para melhorar a adição de links e descrições no futuro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corrigir os dados de um material já publicado (Priority: P1)

Uma administradora percebe que um material do acervo tem a descrição truncada e nenhuma habilidade
BNCC associada. Hoje ela não tem o que fazer: o sistema nunca teve edição, e o único caminho seria
cadastrar o material de novo, o que criaria uma duplicata e perderia o histórico.

Com a edição, ela abre os detalhes do material, escolhe editar, encontra o formulário já preenchido
com o que existe hoje, corrige a descrição, marca as habilidades e salva. Os detalhes passam a
mostrar os dados corrigidos.

**Why this priority**: é a motivação declarada da feature. Entregue sozinha, já resolve o problema
que existe hoje — descrições e, futuramente, links que não têm como ser corrigidos depois do
cadastro.

**Independent Test**: editar a descrição e as habilidades de um material existente e confirmar, na
tela de detalhes, que os valores novos aparecem e que nada mais do material mudou.

**Acceptance Scenarios**:

1. **Given** um material disponível no acervo, **When** a administradora abre a edição, **Then** o
   formulário vem **preenchido com os valores atuais**.
2. **Given** o formulário de edição, **When** ela altera a descrição e salva, **Then** a tela de
   detalhes passa a exibir a descrição nova.
3. **Given** um material cadastrado **antes da exigência de descrição** (sem descrição), **When**
   ela informa uma descrição válida, **Then** o material deixa de estar sem descrição.
4. **Given** uma descrição abaixo do mínimo exigido, **When** ela tenta salvar, **Then** é impedida
   e informada da regra — **a mesma regra do cadastro**.
5. **Given** um título vazio, **When** ela tenta salvar, **Then** é impedida.
6. **Given** uma edição em que nada foi alterado, **When** ela salva, **Then** o material permanece
   como está e **nenhum registro de alteração é produzido**.
7. **Given** um material com situação **aprovada**, **When** apenas os metadados são alterados,
   **Then** ele **continua aprovado** e segue visível no acervo.

---

### User Story 2 - Substituir o documento de um material (Priority: P2)

A administradora descobre que o PDF publicado é uma versão antiga, com erros já corrigidos pelo
autor. Ela edita o material e envia o arquivo novo em lugar do antigo.

O documento anterior deixa de existir no acervo — o novo toma o seu lugar. Como a aprovação que o
material recebeu foi dada a **outro documento**, o material volta para a fila de revisão docente
antes de reaparecer publicamente.

**Why this priority**: resolve um problema real, mas é a parte irreversível da feature e a de maior
consequência. O valor principal — corrigir descrições e links — já é entregue pela US1 sem ela.

**Independent Test**: substituir o documento de um material aprovado e confirmar que o arquivo novo
é o que se abre, que o antigo não é mais acessível e que o material saiu do acervo público até nova
revisão.

**Acceptance Scenarios**:

1. **Given** um material com documento publicado, **When** a administradora envia um arquivo novo e
   confirma, **Then** abrir o material passa a mostrar o **documento novo**.
2. **Given** a substituição concluída, **When** se tenta acessar o documento antigo, **Then** ele
   **não está mais disponível** — foi removido do acervo.
3. **Given** um material **aprovado**, **When** o documento é substituído, **Then** ele volta para
   **revisão** e deixa de aparecer no acervo público até ser aprovado novamente.
4. **Given** um material que ainda **aguarda revisão**, **When** o documento é substituído, **Then**
   ele permanece aguardando revisão.
5. **Given** um arquivo que não é um documento válido, ou que excede o tamanho permitido, **When**
   enviado, **Then** é recusado — **as mesmas regras do cadastro** — e o documento atual permanece
   intacto.
6. **Given** uma substituição, **When** ela é solicitada, **Then** a administradora **confirma
   explicitamente** antes de a troca acontecer, por ser irreversível.
7. **Given** uma falha no meio da substituição, **When** ela ocorre, **Then** o material **nunca
   fica sem documento acessível**: ou a troca inteira acontece, ou nada muda.
8. **Given** um material cujo documento foi substituído, **When** os dados derivados do documento
   anterior (resumo e estado de processamento) são consultados, **Then** eles **não descrevem mais
   o documento antigo**.

---

### User Story 3 - Saber quem alterou o quê (Priority: P3)

Um material do acervo aparece com uma descrição diferente da que um professor lembrava. Sendo um
acervo acadêmico, a pergunta "quem mudou isso, quando, e o que estava escrito antes?" precisa ter
resposta.

Toda edição deixa registro do autor da alteração, do momento, do material afetado e de **quais
campos mudaram, com o valor anterior e o novo**.

**Why this priority**: não é visível na tela e não bloqueia o uso, mas a auditabilidade é exigência
inegociável do projeto. Sem o registro, a edição transforma o acervo em algo cujo histórico não se
reconstrói — e registro não se adiciona depois do fato.

> **Nota**: esta história **não estava no pedido original**. Ela entra porque o projeto exige
> registro de auditoria para toda ação que altera estado, e a edição é exatamente isso.

**Independent Test**: editar um material e confirmar que o registro produzido identifica quem
alterou, quando, qual material e quais campos mudaram.

**Acceptance Scenarios**:

1. **Given** uma edição de metadados, **When** ela é salva, **Then** fica registrado **quem**
   alterou, **quando**, **qual material** e **quais campos** mudaram.
2. **Given** um campo alterado, **When** o registro é consultado, **Then** ele permite saber o
   **valor anterior** e o **valor novo**.
3. **Given** uma substituição de documento, **When** ela conclui, **Then** o registro identifica que
   o documento foi trocado e qual era o anterior.
4. **Given** uma edição recusada por validação ou por falta de permissão, **When** ela ocorre,
   **Then** **nenhum registro de alteração é produzido** — nada mudou.

---

### Edge Cases

- **Material removido do acervo** (exclusão lógica): não pode ser editado. Editar algo que foi
  retirado reintroduziria pela porta dos fundos conteúdo que alguém decidiu remover.
- **Material rejeitado**: pode ser editado. É justamente o caso em que corrigir tem valor — o
  material foi recusado por um defeito que a edição conserta.
- **Material sem descrição** (anterior à exigência): ao ser editado, passa a valer a regra atual.
  Não é possível salvar uma edição deixando a descrição abaixo do mínimo.
- **Nada foi alterado**: aceito, sem efeito e sem registro de auditoria.
- **Mesmo arquivo enviado de novo**: tratado como substituição comum. O sistema não compara
  conteúdo para decidir se houve troca.
- **Duas edições simultâneas**: a última a ser salva prevalece. O sistema não bloqueia o material
  durante a edição — com um único perfil autorizado, a disputa é improvável e o registro de
  auditoria preserva o que cada uma fez.
- **Falha ao remover o documento antigo**: a edição é considerada concluída. Um arquivo órfão no
  armazenamento é um incômodo; um material apontando para um documento inexistente é uma quebra.
- **Substituição em material que nunca foi aprovado**: a situação não muda — não havia aprovação a
  invalidar.

## Requirements *(mandatory)*

### Functional Requirements

#### Permissão

- **FR-001**: O sistema MUST permitir que o perfil **ADMIN** altere um material instrucional já
  cadastrado.
- **FR-002**: Nenhum outro perfil MUST poder editar — **incluindo o professor e o próprio autor do
  material**. A recusa MUST valer também para requisições que não passem pela tela.

#### Metadados

- **FR-003**: MUST ser editáveis: **título**, **descrição** e **habilidades BNCC**. Quando os links
  relacionados existirem no produto, eles MUST ser editáveis pelo mesmo caminho.
- **FR-004**: As regras de validação MUST ser **as mesmas do cadastro** — título obrigatório e
  limitado, descrição obrigatória entre o mínimo e o máximo vigentes. Uma regra que valesse só no
  cadastro permitiria contornar a exigência editando.
- **FR-005**: Material sem descrição (cadastrado antes da exigência) MUST poder recebê-la pela
  edição, e MUST NOT poder ser salvo com descrição abaixo do mínimo.
- **FR-006**: Alterar apenas metadados MUST NOT alterar a situação de revisão do material.

#### Documento

- **FR-007**: O ADMIN MUST poder **substituir o documento** do material.
- **FR-008**: O arquivo enviado MUST passar pelas **mesmas verificações do cadastro** — ser de fato
  um documento do tipo aceito e respeitar o limite de tamanho.
- **FR-009**: Concluída a substituição, o documento anterior MUST ser **removido do acervo** e
  deixar de ser acessível.
- **FR-010**: A remoção do documento anterior MUST acontecer **somente depois** que o novo estiver
  armazenado e o material já apontar para ele.
- **FR-011**: A substituição MUST ser **tudo ou nada**: nenhuma falha pode deixar o material sem
  documento acessível.
- **FR-012**: A substituição MUST exigir **confirmação explícita** de quem edita, por ser
  irreversível.
- **FR-013**: Substituir o documento de um material **aprovado** MUST devolvê-lo à **fila de
  revisão**. A aprovação foi concedida a outro documento.
- **FR-014**: Substituir o documento MUST **invalidar os dados derivados do documento anterior**
  (resumo e estado de processamento), que deixam de descrever o material.

#### Integridade e rastro

- **FR-015**: Material **removido do acervo** MUST NOT ser editável.
- **FR-016**: Toda edição que altere algo MUST registrar **quem alterou, quando, qual material e
  quais campos mudaram, com valor anterior e valor novo**.
- **FR-017**: Edição que não altere nenhum valor MUST NOT produzir registro de alteração.
- **FR-018**: Edição recusada — por permissão, por validação ou por falha — MUST NOT produzir
  registro de alteração nem efeito parcial.

#### Interface

- **FR-019**: A edição MUST ser alcançável a partir da tela de detalhes do material, e MUST NOT
  aparecer para quem não pode editar.
- **FR-020**: O formulário de edição MUST vir preenchido com os valores atuais do material.
- **FR-021**: As regras MUST ser informadas **antes** da tentativa de salvar, como no cadastro.

#### Escopo preservado

- **FR-022**: A edição MUST NOT alterar o comportamento dos fluxos existentes — cadastro,
  aprovação, rejeição, remoção, consulta e pré-visualização permanecem como estão.
- **FR-023**: A cobertura de testes MUST exercitar: edição de metadados, substituição de documento,
  recusa por perfil não autorizado, recusa por validação, material removido, material sem descrição
  anterior à exigência, e a volta à revisão quando o documento de um material aprovado é trocado.

### Key Entities

- **Material Instrucional**: passa a ter seus dados alteráveis após o cadastro. Os campos de
  identidade (quem cadastrou, quando foi criado) **não** são editáveis.
- **Documento armazenado**: o arquivo do material. Passa a poder ser trocado, e o anterior deixa de
  existir no acervo.
- **Registro de alteração**: quem alterou, quando, qual material, quais campos mudaram e seus
  valores antes e depois.

## Success Criteria *(mandatory)*

- **SC-001**: Uma descrição errada num material publicado é corrigida **sem recadastrar o
  material** e sem criar duplicata.
- **SC-002**: 100% das edições que alteram algo ficam rastreáveis: quem, quando, o quê, de qual
  valor para qual.
- **SC-003**: Nenhum perfil além de ADMIN consegue editar, **inclusive por requisição que não passe
  pela tela**.
- **SC-004**: Nenhum material fica sem documento acessível após uma substituição, mesmo quando algo
  falha no meio do processo.
- **SC-005**: Nenhum material aprovado permanece público exibindo um documento que não foi o
  aprovado.
- **SC-006**: 100% dos materiais cadastrados antes da exigência de descrição podem receber
  descrição pela edição.
- **SC-007**: Nenhum fluxo alheio à edição muda de comportamento.

## Assumptions

- **Apenas ADMIN edita**, por decisão explícita. Professores seguem revisando e aprovando; autores
  seguem sem poder alterar o que enviaram. Se isso se mostrar restritivo na prática, ampliar depois
  é simples; reduzir depois, não.
- **O documento anterior é apagado do armazenamento**, por decisão explícita. **Isso é
  irreversível**: uma substituição feita por engano não tem desfazer, e o documento original não é
  recuperável. É a razão de a confirmação explícita ser exigida (FR-012).
- **A exclusão lógica do material continua sendo exclusão lógica.** O registro do material nunca é
  apagado; o que esta feature apaga é o **arquivo substituído**, não o material.
- **Edição de metadados não passa por nova revisão.** Como só o ADMIN edita, e ele já pode aprovar,
  exigir nova revisão para corrigir uma vírgula seria burocracia sem ganho de integridade.
- **Os links relacionados ainda não existem no produto** — sua especificação está pronta, a
  implementação não. A edição os contempla quando existirem, sem depender disso para ser entregue.
- **Não há histórico de versões.** O registro de auditoria guarda o que mudou, mas o sistema não
  oferece tela para navegar versões anteriores nem restaurar uma delas.
- **Não há bloqueio de edição concorrente.** Com um único perfil autorizado, o risco é baixo e a
  complexidade de um bloqueio não se justifica.
- **A edição não cria rota de acesso nova ao acervo.** Quem já podia ver o material continua vendo;
  o que muda é quem pode alterá-lo.
