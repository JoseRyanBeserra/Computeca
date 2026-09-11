# Phase 0 — Research: Descrição Obrigatória do Material Instrucional

**Feature**: `003-material-description` | **Date**: 2026-09-11

Todas as incógnitas foram resolvidas por leitura do código. Não restou nenhum ponto em aberto.

---

## 1. Obrigatória no cadastro, ausente no acervo — sem contradição

**Decisão**: coluna **nullable** no banco, campo **obrigatório** no schema de cadastro.

**Rationale**: o FR-004 e o FR-009 só parecem se contradizer enquanto armazenamento e entrada forem
tratados como a mesma coisa. São camadas distintas:

| Camada | Regra |
|---|---|
| Coluna no banco | Aceita ausência — é o que permite conviver com os 13 materiais já existentes |
| Schema de cadastro | Exige 50 a 2000 caracteres — é o que impede material novo sem descrição |

Uma coluna `NOT NULL` exigiria valor padrão para as linhas existentes, e qualquer padrão seria uma
descrição inventada — pior que a ausência honesta.

**Alternativas consideradas**:

- *Coluna `NOT NULL` com padrão `''`*: transformaria "sem descrição" em "descrição vazia",
  indistinguíveis. A tela precisaria adivinhar a diferença, e o dado mentiria sobre o que aconteceu.
- *Preencher retroativamente com o título*: criaria descrição falsa em 13 materiais, e ninguém
  saberia quais foram escritas por gente.

---

## 2. Validação por Zod, não por erro de negócio

**Decisão**: `z.string().trim().min(50).max(2000)` no schema do service; a recusa chega ao cliente
como `422`, pelo `errorHandler` global.

**Rationale**: a constituição manda validar a entrada com `validateRequest(input, schema)`, e o
`ZodError` resultante já é convertido em `422` pelo tratador global. Esse é o caminho estabelecido
no projeto para erro de **validação**.

`GeneralErrorResponse` com código próprio é para erro de **negócio** — "material não está pendente",
"organização arquivada". Descrição curta demais não é regra de negócio, é entrada malformada.

O `.trim()` antes do `.min()` atende ao FR-005: a contagem ignora espaços das extremidades, então
ninguém é reprovado por espaços que nem vê, nem aprovado por uma descrição de 50 espaços.

**Alternativas consideradas**:

- *Código de erro dedicado com `GeneralErrorResponse`*: daria mensagem mais específica, mas
  desviaria do caminho de validação do projeto e exigiria entrada nova no catálogo bilíngue para
  algo que o Zod já descreve com precisão.
- *Validar só no controller*: deixaria o service exposto a chamadas internas inválidas — exatamente
  o que o Princípio I justifica evitar.

---

## 3. Parse do formulário unificado

**Decisão**: extrair o percurso de `request.parts()` para
`controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts`, usado pelos dois
controllers de upload.

**Rationale**: hoje `materialPdfUploadController` e `uploadOrgMaterialController` têm laços
independentes lendo os mesmos campos. Acrescentar a descrição em dois lugares separados significa
que, no dia em que alguém mexer num deles, os caminhos divergem — e material sem descrição volta a
entrar pela porta da organização.

A US3 existe para impedir isso. Unificar o parse torna a garantia **estrutural** em vez de
depender de alguém lembrar de alterar os dois.

**Ponto de atenção**: o teto de campos do multipart é 120, elevado na correção do limite de
habilidades BNCC. Um campo de texto a mais cabe com folga.

**Alternativas consideradas**: acrescentar o campo nos dois laços e confiar em teste para pegar a
divergência. O teste pegaria — mas só depois de alguém já ter escrito o código errado.

---

## 4. Schema de upload: dívida que a feature paga

**Decisão**: criar `materialPdfUploadSchema.ts` com `UploadMaterialRequest`, o schema do body e o
schema do service, seguindo a convenção do projeto.

**Rationale**: o fluxo de upload é o único do projeto sem schema próprio. O service valida as
habilidades com um schema inline e confere o tipo do arquivo à mão, sem `validateRequest` — o
Princípio I não é atendido ali.

Como a feature já precisa validar a descrição naquele service, criar o schema completo custa pouco
a mais e acerta o fluxo com a constituição. Título, habilidades e descrição passam a ser validados
no mesmo lugar.

**Alternativas consideradas**: validar só a descrição, deixando o resto como está. Espalharia
validação por dois mecanismos no mesmo service e deixaria a dívida para a próxima pessoa.

---

## 5. O que o front faz antes de tentar enviar

**Decisão**: área de texto com contador ao vivo, mostrando quanto falta ou quanto excede, e envio
bloqueado enquanto o texto estiver fora dos limites.

**Rationale**: o FR-007 exige que a exigência seja conhecida **antes** da tentativa, e o SC-004 diz
que ninguém deve descobrir a regra por uma recusa. Um contador resolve os dois: a pessoa vê o
estado enquanto escreve.

O padrão já existe na tela — o campo de título usa `maxLength={255}` e bloqueia o envio quando
vazio. A descrição estende esse padrão acrescentando o mínimo, que o título não tem.

**Alternativas consideradas**: validar apenas no envio. Cumpriria o FR-004, mas não o FR-007 nem o
SC-004 — a pessoa escreveria, tentaria, seria recusada, e só então entenderia a regra.

---

## 6. Exibição de texto com quebras de linha

**Decisão**: preservar quebras de linha na exibição, sem interpretar nenhuma marcação.

**Rationale**: o caso de borda da especificação pede parágrafos preservados. Texto simples com
quebras respeitadas resolve, sem abrir a porta para conteúdo formatado vindo do usuário.

Interpretar marcação exigiria sanitização — superfície de risco que um campo de descrição não
justifica.

**Alternativas consideradas**: aceitar Markdown. Daria mais expressividade e traria a necessidade de
sanitizar entrada de terceiros numa plataforma acadêmica aberta a submissões. Fora de escopo.

---

## 7. Onde a descrição precisa trafegar

**Decisão**: incluir a descrição no `select` dos três repositórios que servem material ao cliente —
detalhe, listagem geral e listagem de pendentes.

**Rationale**: são os mesmos três pontos mapeados na feature 001, quando `vectorStatus` passou a ser
omitido. O detalhe é o que a especificação pede; as duas listagens entram para que o dado não fique
disponível de forma inconsistente entre telas.

**Ponto de atenção**: diferente de `vectorStatus`, a descrição **não** é condicional — não há
interruptor que a esconda. Ela acompanha o material sempre.

**Alternativas consideradas**: incluir apenas no detalhe. Deixaria a listagem sem o dado e forçaria
uma requisição extra caso alguém queira exibi-la em cartão no futuro.
