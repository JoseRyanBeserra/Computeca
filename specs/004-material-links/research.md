# Phase 0 — Research: Links Relacionados do Material Instrucional

**Feature**: `004-material-links` | **Date**: 2026-09-11

Todas as incógnitas foram resolvidas por leitura do código e por verificação empírica. Não restou
nenhum ponto em aberto.

---

## 1. `z.string().url()` não protege contra esquema perigoso

**Decisão**: validar o endereço com `z.string().url()` **seguido de** uma verificação explícita de
que o protocolo é `http:` ou `https:`.

**Rationale**: este é o achado mais importante do plano, e veio de teste direto contra a versão do
Zod usada no projeto:

```
aceita? | endereço
true    | https://ok.com
true    | http://ok.com
true    | javascript:alert(1)
true    | data:text/html,<script>x</script>
true    | file:///etc/passwd
true    | ftp://x.com
```

`.url()` verifica se a string é uma URL **bem formada**, não se ela é **segura para navegação**.
Quatro dos seis casos acima passariam.

Isso importa porque esta é a primeira feature do Computeca a colocar na tela **conteúdo clicável
fornecido por quem submete material**, num sistema aberto a submissões de terceiros. Um link com
rótulo "Videoaula" apontando para `javascript:` é exatamente o cenário que a US3 descreve.

A verificação usa o protocolo já normalizado pelo construtor de URL, não comparação de prefixo de
string: `hTTps://`, espaços à frente e maiúsculas são normalizados antes da comparação, o que
elimina uma classe inteira de contorno.

**Alternativas consideradas**:

- *Só `.url()`*: é o que a maioria escreveria, e é justamente o que deixa o buraco aberto.
- *Lista de domínios permitidos*: protegeria mais, mas transformaria uma feature de conveniência em
  trabalho de curadoria — alguém teria de manter a lista, e material legítimo seria recusado.
- *Verificar por prefixo de string* (`url.startsWith('http')`): frágil. `httpx://`, `HTTP://` com
  espaço à frente e variações de caixa exigiriam tratamento manual que o construtor de URL já faz.

---

## 2. Links embutidos no material, não em tabela própria

**Decisão**: coluna `Json` em `MaterialInstrucional`, com valor padrão de lista vazia.

**Rationale**: os links são um **dado de valor que pertence inteiramente ao material**. Três traços
confirmam isso:

| Pergunta | Resposta |
|---|---|
| São consultados sozinhos, sem o material? | Não |
| São referenciados por outra entidade? | Não |
| Precisam de ordenação além da ordem de cadastro? | Não |

Somado ao limite de dez por material, embutir é o caminho mais simples que atende. E há um ganho
concreto: o material usa **soft delete** (`deletedAt`), e com os links embutidos eles acompanham o
material sem precisar de cascata ou de filtro adicional em nenhuma consulta.

O projeto já embute listas em coluna — `habilidadesBncc String[]` — e já usa `Json` para dados
estruturados em `AppSetting.value` e `AuditLog.metadata`. Não é padrão novo.

**Alternativas consideradas**:

- *Tabela `MaterialLink` com relação*: daria estrutura no banco e validação por tipo de coluna. Em
  troca: repositório novo, cascata no soft delete, e um `include` em toda consulta de material —
  custo desproporcional para uma lista de no máximo dez pares que nunca é consultada sozinha.
- *`String[]` com rótulo e endereço concatenados por separador*: reaproveitaria o padrão das
  habilidades, mas quebraria no primeiro rótulo que contivesse o separador.

---

## 3. A aparência é extraída, não copiada

**Decisão**: extrair as classes do chip de habilidade para `components/chipStyles.ts` e fazer os
dois componentes consumirem a mesma origem.

**Rationale**: a especificação diz que o botão de link deve ter **a mesma aparência** do chip de
habilidade. Copiar as classes de `HabilidadesBncc.tsx` para o componente novo atende hoje e falha
depois — no dia em que alguém ajustar a cor ou o arredondamento de um deles, os dois deixam de
parecer irmãos sem que ninguém perceba.

Extrair transforma "parecem iguais" em "são iguais por construção". É a mesma lógica que levou a
unificar o parse do formulário na feature 003: garantia estrutural em vez de disciplina.

O estilo é parametrizado por cor, porque o link não deve ser visualmente indistinguível da
habilidade — mesma forma e mesmo peso, matiz própria, para o leitor saber que um é clicável e o
outro não.

**Alternativas consideradas**:

- *Copiar as classes*: mais rápido de escrever, e garante divergência futura.
- *Um componente `Chip` genérico que renderiza `span` ou `a`*: mais elegante em tese, mas
  acoplaria os dois componentes num só com comportamento condicional — e o chip de habilidade tem
  lógica própria (`max`, contador `+N`) que o link não tem.

---

## 4. Como um par rótulo/endereço atravessa o formulário

**Decisão**: um campo `relatedLinks` contendo um **array JSON** em uma única parte do
`multipart/form-data`.

**Rationale**: o formulário transporta texto plano, e um par de valores precisa de representação
acordada. O projeto **já tem esse precedente**: `parseMaterialMultipart` aceita as habilidades tanto
como campos repetidos quanto como um array JSON numa única parte.

Para objetos, o array JSON é a única das duas formas que funciona sem inventar convenção de
nomenclatura (`relatedLinks[0][label]` e afins). E mantém o número de partes do formulário
constante, o que não mexe no teto de 120 campos configurado no multipart.

A desserialização falha de forma controlada: JSON malformado vira lista vazia com registro de
advertência, e a validação seguinte decide — nunca derruba a requisição com erro de parse.

**Alternativas consideradas**:

- *Campos repetidos pareados por índice* (`linkLabel[]` e `linkUrl[]`): funciona, mas o pareamento
  depende de os dois arrays chegarem com o mesmo tamanho e na mesma ordem. Um campo a mais de um
  lado desalinha tudo silenciosamente.
- *Uma parte por link, com rótulo e endereço separados por caractere especial*: mesmo problema do
  separador descrito no item 2.

---

## 5. Abertura do link e isolamento da origem

**Decisão**: abrir em contexto separado, com a relação declarada de modo que o destino não obtenha
referência à página de origem nem receba o endereço de onde o usuário veio.

**Rationale**: o FR-006 pede que a página do material seja preservada, e o FR-015 pede que o destino
não tenha controle sobre a origem nem saiba de onde o usuário veio.

Sem esse isolamento, a página de destino obtém uma referência à janela de origem e pode
redirecioná-la — a técnica conhecida como *tabnabbing*, que num acervo com submissões de terceiros é
risco real, não teórico.

O endereço completo é revelado no atributo de título do botão (FR-005), para que o usuário decida
antes de clicar. Um botão rotulado "Videoaula" que não revela o destino é precisamente o vetor de
engano que a US3 descreve.

**Alternativas consideradas**: abrir na mesma aba. Cumpriria o FR-015 por acidente — não há janela
de origem a sequestrar — mas quebraria o FR-006, que pede a preservação da tela do material.

---

## 6. Ausência de links não é sinalizada

**Decisão**: quando a lista está vazia, **nada** é renderizado — nem rótulo da seção, nem espaço.

**Rationale**: o FR-007 é explícito, e o comportamento já existe no projeto: `HabilidadesBncc`
começa com `if (!habilidades?.length) return null`.

Isso contrasta deliberadamente com a descrição da feature 003, que indica ausência de forma
discreta. A diferença é de significado: descrição é obrigatória, então sua falta é uma anomalia
histórica que merece explicação; links são opcionais, e não ter é o estado normal da maior parte do
acervo. Avisar "este material não possui links" em quase toda tela seria ruído.

**Alternativas consideradas**: exibir a seção vazia com aviso, por simetria com a descrição.
Rejeitado — simetria de código produziria assimetria de sentido.

---

## 7. Nenhuma migração de dados

**Decisão**: coluna com valor padrão de lista vazia; nenhuma linha existente é reescrita.

**Rationale**: os 14 materiais do acervo nunca informaram links, e lista vazia é exatamente o que
isso significa. Diferente da descrição — onde `null` precisou carregar o sentido de "anterior à
exigência" —, aqui não há distinção a preservar: nunca ter informado e ter informado zero links são
a mesma coisa.

Por isso a coluna **não é anulável**: o padrão de lista vazia já expressa tudo, e um `null` além da
lista vazia criaria dois estados para o mesmo significado.

**Alternativas consideradas**: coluna anulável, por simetria com `description`. Rejeitado pelo
mesmo motivo do item 6 — a simetria seria só aparente.
