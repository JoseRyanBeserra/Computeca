# Feature Specification: Desativação Global das Funcionalidades de IA

**Feature Branch**: `001-disable-ai-features`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "Mudança radical: o projeto não deve possuir visivelmente no front as
features de IA, e elas devem estar desabilitadas no back. Não apagar o código, apenas desabilitar.
Ao subir o Docker, os bancos referentes a vetorização e fila para uso da IA também ficam
desativados, pois sem IA eles só consumiriam recursos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acervo sem qualquer vestígio de IA na interface (Priority: P1)

Um professor, um aluno institucionalizado ou um visitante não logado navega pelo Computeca —
busca materiais, abre um MI, lê os metadados e baixa o arquivo. Em nenhum momento encontra resumo
gerado por IA, botão de conversar com o documento, aviso de "processando com IA" ou qualquer
menção a recursos inteligentes. Para essa pessoa, o Computeca simplesmente é um acervo de
materiais instrucionais.

**Why this priority**: é o objetivo declarado da mudança. Entregue sozinho, já cumpre a promessa
para 100% dos usuários finais, mesmo que o back ainda exponha as rotas.

**Independent Test**: navegar por todas as telas autenticado em cada perfil e deslogado,
confirmando ausência de elementos de IA.

**Acceptance Scenarios**:

1. **Given** um MI aprovado que já possui resumo gerado e armazenado, **When** o usuário abre a
   página de detalhe do material, **Then** nenhum resumo, aviso de processamento ou ação de chat é
   exibido, e os metadados e o download funcionam normalmente.
2. **Given** um usuário com perfil que antes permitia usar o chat com IA, **When** ele visualiza a
   listagem de materiais, **Then** nenhuma ação de chat é oferecida em nenhum card.
3. **Given** um usuário que guardou o endereço direto da tela de chat, **When** ele acessa esse
   endereço, **Then** é redirecionado para uma tela válida do acervo sem ver a interface de chat e
   sem mensagem de erro técnica.
4. **Given** um MI cujo processamento de IA ficou incompleto, **When** qualquer usuário o abre,
   **Then** nenhuma indicação de estado de processamento aparece.
5. **Given** a IA desativada, **When** alguém inspeciona a resposta da consulta de um material ou
   da listagem do acervo, **Then** nenhum campo de estado de processamento por IA está presente no
   conteúdo retornado.

---

### User Story 2 - Ambiente sobe sem os serviços de IA consumindo recursos (Priority: P1)

O responsável pela infraestrutura sobe o ambiente com um único comando. Os serviços dedicados a
vetorização e à fila de IA não são iniciados, liberando memória e CPU da máquina. A aplicação sobe
íntegra, sem erros de conexão recorrentes e sem ficar tentando alcançar serviços ausentes.

**Why this priority**: é a economia de recursos que motivou o pedido. Sem isso, ocultar a
interface não devolve nenhum recurso à máquina.

**Independent Test**: subir o ambiente, listar os serviços ativos e acompanhar os registros da
aplicação por alguns minutos verificando ausência de erros de conexão.

**Acceptance Scenarios**:

1. **Given** o ambiente configurado sem IA, **When** o operador sobe a stack, **Then** os serviços
   de vetorização e de fila não constam entre os contêineres em execução.
2. **Given** a aplicação no ar sem esses serviços, **When** o operador acompanha os registros por
   5 minutos, **Then** não há nenhum erro ou aviso recorrente de falha de conexão com serviços
   ausentes.
3. **Given** um professor logado, **When** ele faz upload de um MI e outro professor o aprova,
   **Then** o fluxo conclui com sucesso e o material fica disponível, sem depender de fila.
4. **Given** o ambiente sem IA no ar, **When** o operador consulta o indicador de saúde da
   aplicação, **Then** ele reporta estado saudável.

---

### User Story 3 - API não atende operações de IA (Priority: P2)

Alguém com conhecimento das rotas anteriores — um cliente antigo em cache, um script, um curioso
— chama diretamente as operações de conversa com documento ou de resumo. A API recusa de forma
limpa e previsível, sem consumir crédito de IA e sem expor erro interno.

**Why this priority**: fecha a porta dos fundos. A interface oculta protege o usuário comum; isto
protege o orçamento e os registros de erro contra chamadas diretas.

**Independent Test**: chamar cada operação de IA diretamente e conferir a resposta e a ausência de
consumo de tokens.

**Acceptance Scenarios**:

1. **Given** a IA desativada, **When** alguém autenticado chama a operação de conversa com um
   documento, **Then** recebe uma recusa explícita de funcionalidade indisponível, sem erro
   interno.
2. **Given** a IA desativada, **When** alguém chama a operação de resumo de um material,
   **Then** recebe a mesma recusa explícita.
3. **Given** a IA desativada, **When** qualquer dessas chamadas ocorre, **Then** nenhum token de
   modelo de IA é consumido e nenhum registro de custo é gerado.
4. **Given** a IA desativada, **When** um material é aprovado, **Then** nenhum trabalho de
   vetorização é agendado.

---

### User Story 4 - Reativação sem reescrever código (Priority: P3)

Passado algum tempo, a coordenação decide voltar a usar IA. Uma pessoa com acesso à configuração
do ambiente religa o interruptor mestre e sobe novamente os serviços necessários. A partir daí, o
administrador passa a governar a disponibilidade pelo painel, sem depender de mais ninguém. Ele
roda o comando de reprocessamento para colocar em dia o acervo acumulado e decide a hora em que
esse custo acontece. Chat, resumo e vetorização voltam a funcionar exatamente como antes, sem que
ninguém tenha precisado reescrever, recuperar ou reimplementar código.

**Why this priority**: é a razão de desabilitar em vez de apagar. Não entrega valor hoje, mas é o
que torna a decisão reversível.

**Independent Test**: religar a configuração, subir os serviços, alternar o controle no painel e
exercitar chat e resumo.

**Acceptance Scenarios**:

1. **Given** o ambiente com IA desativada, **When** o responsável reativa o interruptor mestre e
   sobe os serviços de vetorização e fila, **Then** a interface volta a apresentar resumo e chat
   nos mesmos lugares de antes.
2. **Given** a IA ativa no nível mestre, **When** o administrador desliga a disponibilidade pelo
   painel, **Then** resumo e chat somem da interface e as operações passam a recusar, sem
   reiniciar a aplicação.
3. **Given** a IA reativada e materiais aprovados durante o período de desativação, **When** o
   administrador executa o comando de reprocessamento, **Then** o comando informa quantos
   materiais serão processados e os submete a processamento.
4. **Given** a IA desativada no nível mestre, **When** alguém tenta executar o comando de
   reprocessamento, **Then** o comando recusa a execução com mensagem explicativa.
5. **Given** a reativação, **When** o responsável revisa o histórico do repositório, **Then**
   nenhum arquivo de funcionalidade de IA precisou ser restaurado, porque nenhum foi removido.

---

### Edge Cases

- **Material com resumo já armazenado**: o conteúdo permanece no banco, intocado, mas não é
  exibido nem entregue por nenhuma consulta enquanto a IA estiver desativada.
- **Material que ficou com processamento pela metade**: seu estado é preservado como está; o
  sistema não tenta concluir nem marca como falho, e nada disso aparece na interface.
- **Aprovação de MI com a IA desligada**: conclui normalmente; o material fica disponível para
  consulta e download mesmo nunca tendo sido processado.
- **Chamada direta a endereço de IA da interface**: leva a uma tela válida do acervo, não a uma
  tela quebrada.
- **Configuração inconsistente** (IA ligada mas serviços de apoio ausentes): a aplicação deve
  avisar claramente na inicialização em vez de falhar silenciosamente a cada requisição.
- **Processo trabalhador de IA iniciado por engano** com a IA desativada: encerra de forma limpa
  informando que a funcionalidade está desligada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST oferecer um interruptor único de configuração que determine se as
  funcionalidades de IA estão ativas, com o valor desativado como padrão do projeto.
- **FR-002**: Com a IA desativada, a interface MUST omitir toda apresentação de resumo gerado por
  IA, toda ação de conversa com documento e todo indicador de estado de processamento por IA, em
  todas as telas e para todos os perfis.
- **FR-003**: Com a IA desativada, o acesso direto a um endereço de interface dedicado à IA MUST
  redirecionar o usuário para uma tela válida do acervo.
- **FR-004**: Com a IA desativada, as operações de conversa com documento e de resumo MUST recusar
  a requisição de forma explícita e uniforme, identificando a funcionalidade como indisponível.
- **FR-005**: Com a IA desativada, a aprovação de um material MUST concluir sem agendar qualquer
  trabalho de vetorização.
- **FR-006**: Com a IA desativada, o sistema MUST NOT estabelecer nem tentar estabelecer conexão
  com o serviço de fila ou com o serviço de busca vetorial, em nenhum momento do ciclo de vida da
  aplicação, incluindo a inicialização.
- **FR-007**: Com a IA desativada, o sistema MUST NOT emitir nenhuma chamada a provedor externo de
  modelo de IA, e portanto não MUST consumir tokens nem gerar registro de custo.
- **FR-008**: A composição padrão do ambiente MUST subir sem os serviços de vetorização e de fila,
  e a aplicação MUST iniciar e operar integralmente nessa configuração.
- **FR-009**: O sistema MUST preservar no repositório todo o código das funcionalidades de IA,
  sem remoção de arquivos, rotas, serviços ou componentes.
- **FR-010**: O sistema MUST preservar no banco os dados de IA já produzidos — resumos
  armazenados e estados de processamento — sem apagá-los nem reescrevê-los.
- **FR-011**: Todas as funcionalidades não relacionadas a IA — autenticação, upload, aprovação,
  organizações, convites, busca textual, download, auditoria e administração — MUST permanecer
  inalteradas em comportamento.
- **FR-012**: A reativação das funcionalidades de IA MUST ser possível apenas alterando
  configuração e subindo os serviços de apoio, sem qualquer alteração de código.
- **FR-013**: O controle de disponibilidade da IA MUST operar em dois níveis hierárquicos:
  - **Nível de ambiente (mestre)**: o interruptor de configuração descrito em FR-001 determina se
    a instalação tem IA. Desativado, nada de IA existe — nem conexões, nem rotas, nem interface —
    e alterá-lo exige reiniciar a aplicação.
  - **Nível de administração (operacional)**: o painel administrativo MUST apresentar um controle
    de disponibilidade das funcionalidades de IA que produz efeito imediato, sem reinício, enquanto
    o nível mestre estiver ativo.
- **FR-014**: Enquanto o nível mestre estiver desativado, o controle no painel administrativo MUST
  aparecer como indisponível, explicando que a instalação está sem suporte a IA, e nenhuma ação ali
  MUST produzir efeito.
- **FR-015**: O sistema MUST oferecer um comando administrativo, executado sob demanda, que
  identifique os materiais aprovados ainda não processados pela IA e os submeta a processamento.
  O comando MUST informar quantos materiais serão processados antes de iniciar e MUST recusar
  execução enquanto a IA estiver desativada.
- **FR-016**: O sistema MUST registrar, na inicialização, de forma visível nos registros da
  aplicação, se as funcionalidades de IA estão ativas ou desativadas.
- **FR-017**: Com a IA desativada, as respostas da API MUST omitir o estado de processamento por IA
  dos materiais. O dado permanece no banco (FR-010), mas não trafega para nenhum cliente — esconder
  apenas na interface deixaria o estado de IA exposto a quem inspecionasse a resposta.
- **FR-018**: Com a IA ativada, o sistema MUST verificar na inicialização se os serviços de apoio
  estão alcançáveis e MUST registrar aviso claro e específico para cada um que não estiver,
  sem impedir a subida da aplicação.
- **FR-019**: A cobertura de testes MUST exercitar o comportamento do sistema nos dois estados do
  interruptor, incluindo a recusa das operações de IA quando desativadas.

### Key Entities

- **Interruptor mestre de IA**: configuração de ambiente que governa se a instalação tem suporte a
  IA. Determina conexões com serviços de apoio, atendimento das operações e visibilidade no front.
  Alterá-lo exige reinício.
- **Disponibilidade administrada de IA**: estado governado pelo painel administrativo, com efeito
  imediato, subordinado ao interruptor mestre. Só pode ser alterado enquanto o mestre estiver
  ativo.
- **Material Instrucional**: mantém os campos relativos a IA (resumo armazenado, estado de geração
  do resumo, estado de vetorização) com seus valores atuais; nenhum deles é lido, escrito ou
  exibido enquanto a IA estiver desativada.
- **Trabalho de vetorização**: unidade de processamento que deixa de ser criada enquanto a IA
  estiver desativada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma varredura por todas as telas do sistema, em todos os perfis de acesso e também
  deslogado, encontra zero elementos de interface relacionados a IA.
- **SC-002**: O ambiente padrão sobe com dois serviços a menos do que antes — nenhum processo de
  fila ou de busca vetorial em execução —, liberando na máquina os cerca de 54 MiB que eles
  ocupavam em repouso na medição de referência.
- **SC-003**: A aplicação permanece 30 minutos no ar sem os serviços de IA registrando zero erros
  ou avisos de falha de conexão com serviços ausentes.
- **SC-004**: O consumo de tokens de IA no período com a funcionalidade desativada é exatamente
  zero.
- **SC-005**: Todos os fluxos não relacionados a IA passam na suíte de testes existente sem
  alteração de expectativa.
- **SC-006**: A reativação completa das funcionalidades de IA é realizada em menos de 15 minutos
  por uma pessoa com acesso ao ambiente, sem nenhuma alteração de código.
- **SC-007**: Nenhum arquivo de funcionalidade de IA é removido do repositório — verificável pela
  comparação de arquivos entre o estado anterior e o posterior.
- **SC-008**: Com a instalação habilitada para IA, o administrador liga e desliga a
  disponibilidade pelo painel e a mudança se reflete na interface dos usuários em menos de um
  minuto, sem reiniciar a aplicação.
- **SC-009**: Após uma reativação, o administrador coloca 100% do acervo aprovado pendente em
  processamento com uma única execução de comando, sabendo de antemão quantos materiais serão
  processados.

## Assumptions

- **Resumos já armazenados permanecem ocultos**: materiais que já possuem resumo gerado não o
  exibem enquanto a IA estiver desativada. O usuário não deve perceber que alguns materiais
  tiveram tratamento diferente de outros.
- **A busca textual não é afetada**: a busca por materiais hoje opera sobre o banco relacional e
  não sobre o serviço de busca vetorial, portanto continua funcionando integralmente. Não existe
  busca semântica ativa na listagem a ser removida.
- **O serviço de fila não atende a nenhuma outra finalidade**: limitação de tentativas de login e
  limitação de taxa de requisições não dependem dele, logo sua remoção não enfraquece nenhuma
  proteção de segurança.
- **Estado desativado é o padrão do projeto**: quem clonar o repositório e subir o ambiente obtém
  o Computeca sem IA, sem precisar configurar nada.
- **Esta versão não vai para produção**: não há implantação em curso a coordenar, e um processo de
  implantação diferente será definido no futuro. As alterações em arquivos de composição de
  produção são feitas por consistência do repositório, não para atender a um ambiente ativo.
- **A motivação é não manter serviços de pé para uma funcionalidade que não será usada**, e
  preservar o código para o caso de a IA voltar ao projeto. A economia de memória é consequência,
  não a justificativa principal — na medição de referência ela foi de ~54 MiB num total de
  ~533 MiB.
- **A recusa das operações de IA é tratada como funcionalidade indisponível**, não como falha do
  sistema, e portanto não polui os registros de erro.
- **Nenhuma migração de banco é necessária**: os campos de IA permanecem no modelo de dados.
- **O painel administrativo de módulos**, previsto na constituição, é atendido por esta mudança no
  que diz respeito a IA: o controle passa a existir no painel, subordinado ao interruptor de
  ambiente. Nenhum outro módulo além de IA entra no escopo.
- **O reprocessamento do acervo pendente é decisão consciente do administrador**, nunca automático,
  porque envolve custo de tokens proporcional ao tamanho do acervo acumulado.
- **O comando de reprocessamento é operado por quem tem acesso ao servidor**, não pela interface
  web, e por isso não exige tela nova.
