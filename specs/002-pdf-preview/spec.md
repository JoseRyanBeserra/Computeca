# Feature Specification: Pré-visualização do PDF na Tela de Detalhes

**Feature Branch**: `002-pdf-preview`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Eu quero uma pré-visualização do PDF quando clicar em detalhes. O documento aparece renderizado dentro da própria página, junto dos metadados, sem precisar abrir outra aba. O botão de abrir em tela cheia permanece."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver o documento sem sair da página (Priority: P1)

Um professor procura material sobre pensamento computacional. Encontra um MI com título
promissor e abre os detalhes. Hoje ele precisa clicar em "Abrir PDF", esperar uma aba nova,
avaliar o conteúdo, fechar a aba e voltar — para cada candidato. Com a pré-visualização, o
documento aparece ali mesmo: ele percorre as primeiras páginas, decide em segundos se serve, e
volta para a busca sem nunca ter trocado de aba.

**Why this priority**: é o objetivo declarado da mudança e onde está todo o ganho. Entregue
sozinho, já resolve o problema para quem avalia material.

**Independent Test**: abrir os detalhes de um MI e confirmar que o documento é exibido dentro da
página, navegável, sem abrir outra aba.

**Acceptance Scenarios**:

1. **Given** um MI aprovado, **When** o usuário abre a tela de detalhes, **Then** o documento é
   exibido renderizado dentro da página, junto dos metadados.
2. **Given** a pré-visualização exibida, **When** o usuário percorre o documento, **Then** consegue
   avançar pelas páginas sem sair da tela de detalhes.
3. **Given** a pré-visualização exibida, **When** o usuário aciona a abertura em tela cheia,
   **Then** o comportamento atual é preservado — o documento abre fora da página.
4. **Given** um documento grande, **When** a tela de detalhes carrega, **Then** os metadados
   aparecem imediatamente, sem esperar o documento terminar de carregar.

---

### User Story 2 - Ninguém encontra visualizador quebrado (Priority: P2)

Alguém abre os detalhes de um material cujo arquivo não está disponível para ele — porque não tem
permissão, porque o armazenamento está fora do ar, ou porque o endereço temporário expirou enquanto
a página ficava aberta. Em vez de um retângulo vazio ou de uma mensagem técnica do navegador, vê
uma explicação clara e um caminho de saída.

**Why this priority**: um visualizador embutido falha de formas que um botão não falhava. Sem isso,
a feature troca um clique a mais por uma tela quebrada.

**Independent Test**: abrir os detalhes com o armazenamento indisponível e com um material sem
permissão, confirmando mensagem clara em ambos.

**Acceptance Scenarios**:

1. **Given** um usuário sem permissão de acesso ao arquivo, **When** abre os detalhes, **Then** os
   metadados são exibidos normalmente e no lugar do documento há uma explicação, não um erro
   técnico.
2. **Given** o armazenamento indisponível, **When** o usuário abre os detalhes, **Then** vê uma
   mensagem de indisponibilidade temporária e uma forma de tentar novamente.
3. **Given** a página aberta por tempo suficiente para o endereço temporário expirar, **When** o
   usuário volta a interagir com o documento, **Then** o sistema renova o acesso sem exigir que ele
   recarregue a página manualmente.
4. **Given** qualquer falha na pré-visualização, **When** ela ocorre, **Then** a ação de abrir em
   tela cheia permanece disponível e funcional.

---

### User Story 3 - Experiência utilizável em tela pequena (Priority: P3)

Um aluno acessa o acervo pelo celular. Um documento embutido numa tela estreita costuma ficar
ilegível e sequestra o gesto de rolagem da página. Ele precisa de um caminho que não o deixe preso.

**Why this priority**: não impede o valor principal, mas sem isso a feature piora a experiência de
quem usa telas pequenas em vez de melhorá-la.

**Independent Test**: abrir os detalhes em viewport estreita e confirmar que a página continua
navegável e o documento acessível.

**Acceptance Scenarios**:

1. **Given** uma tela estreita, **When** o usuário abre os detalhes, **Then** consegue rolar a
   página inteira sem ficar preso dentro do documento.
2. **Given** uma tela estreita, **When** o usuário abre os detalhes, **Then** no lugar do documento
   embutido encontra uma chamada evidente para abri-lo em tela cheia.
3. **Given** a mesma tela em largura de desktop, **When** o usuário abre os detalhes, **Then** o
   documento aparece embutido normalmente.

---

### Edge Cases

- **Endereço temporário expirado** com a página aberta: o acesso é renovado sob demanda, sem
  recarregar a página.
- **Material ainda em revisão**: a pré-visualização segue exatamente a mesma regra de acesso da
  abertura em tela cheia — quem pode abrir, pode pré-visualizar; quem não pode, não vê nenhuma das
  duas.
- **Armazenamento fora do ar**: metadados continuam visíveis; só a área do documento reporta
  indisponibilidade.
- **Navegador sem suporte a exibição embutida de documentos**: o usuário recebe orientação para
  abrir em tela cheia, em vez de uma área vazia sem explicação.
- **Documento no limite de tamanho aceito no upload**: a pré-visualização não pode travar a página
  enquanto carrega.
- **Usuário que sai da tela antes do documento carregar**: o carregamento é abandonado, sem erro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A tela de detalhes de um material MUST exibir o documento renderizado dentro da
  própria página, sem exigir navegação para outra aba ou janela.
- **FR-002**: O usuário MUST conseguir percorrer as páginas do documento sem sair da tela de
  detalhes.
- **FR-003**: A ação de abrir o documento em tela cheia MUST permanecer disponível, com o
  comportamento atual inalterado.
- **FR-004**: Os metadados do material MUST ser exibidos imediatamente, sem depender do
  carregamento do documento — o documento carrega em paralelo e sinaliza seu próprio progresso.
- **FR-005**: O acesso ao documento na pré-visualização MUST seguir exatamente a mesma regra de
  permissão já aplicada à abertura em tela cheia, sem introduzir nenhum caminho de acesso novo.
- **FR-006**: Quando o documento não puder ser exibido — falta de permissão, armazenamento
  indisponível ou falha de carregamento —, o sistema MUST apresentar mensagem compreensível no
  lugar do documento e MUST manter os metadados e a abertura em tela cheia funcionando.
- **FR-007**: Quando o acesso temporário ao arquivo expirar com a página aberta, o sistema MUST
  renová-lo sob demanda, sem exigir recarregamento manual da página.
- **FR-008**: O sistema MUST oferecer ao usuário uma forma explícita de tentar novamente após uma
  falha de carregamento.
- **FR-009**: Em telas estreitas, o documento embutido MUST ser substituído por uma chamada
  evidente para abrir em tela cheia, em vez de exibir o documento reduzido. A página MUST
  permanecer integralmente navegável, sem que nenhuma área capture a rolagem a ponto de impedir o
  usuário de sair dela.
- **FR-010**: A pré-visualização MUST NOT alterar o comportamento de nenhuma outra parte da tela de
  detalhes — metadados, download, habilidades BNCC e ações administrativas permanecem como estão.
- **FR-011**: A cobertura de testes MUST exercitar o carregamento bem-sucedido, a ausência de
  permissão, a falha de carregamento e a renovação do acesso expirado.

### Key Entities

Nenhuma entidade nova. A feature consome o material instrucional e o acesso temporário ao arquivo,
ambos já existentes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Avaliar se um material serve deixa de exigir troca de aba: o usuário vê conteúdo do
  documento na própria tela de detalhes em 100% dos materiais a que tem acesso.
- **SC-002**: Os metadados do material aparecem na tela sem esperar o documento — o tempo até o
  título e a descrição ficarem visíveis não aumenta em relação ao comportamento atual.
- **SC-003**: Nenhuma tela de detalhes apresenta área vazia sem explicação: toda falha de exibição
  do documento resulta em mensagem compreensível.
- **SC-004**: Em tela estreita, o usuário percorre a página de detalhes de ponta a ponta sem ficar
  preso em nenhuma área, e alcança o documento por uma chamada visível de tela cheia.
- **SC-005**: Todos os fluxos existentes da tela de detalhes passam na suíte de testes sem alteração
  de expectativa.

## Assumptions

- **Todo material é um PDF.** O upload aceita exclusivamente esse formato, então não existe caso de
  material com outro tipo de arquivo a tratar.
- **Nenhum acesso novo ao arquivo é criado.** A pré-visualização reutiliza o mesmo mecanismo de
  acesso temporário que a abertura em tela cheia já usa, com a mesma seleção por perfil e situação
  do material. Nenhuma permissão é ampliada.
- **A pré-visualização carrega automaticamente** ao abrir os detalhes, sem exigir um clique
  adicional — foi o comportamento escolhido para a feature.
- **O documento é exibido pelo mecanismo de exibição do próprio navegador**, sem processamento
  adicional no servidor e sem gerar miniatura ou derivado do arquivo.
- **Nenhum dado novo é persistido**, nenhuma migração é necessária e nenhum registro de auditoria
  novo é exigido: visualizar não altera estado.
- **O limite de tamanho de arquivo permanece o já configurado no upload**; a feature não o altera.
- **Em telas estreitas o documento não é embutido**, e sim substituído por uma chamada para tela
  cheia — decisão do responsável pelo projeto, alinhada ao comportamento usual de leitores de
  documento no celular.
