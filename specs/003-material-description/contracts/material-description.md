# Contrato — Descrição do Material Instrucional

Nenhuma rota nova. Esta feature acrescenta um campo às rotas de cadastro e às respostas de consulta.

---

## Entrada: cadastro de material

Vale igualmente para os dois caminhos:

| Caminho | Rota |
|---|---|
| Envio direto | `POST /mis` |
| Envio por organização | `POST /organizations/:orgId/mis` |

### Campo novo no formulário

Ambas as rotas recebem `multipart/form-data`.

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `description` | texto | **sim** | 50 a 2000 caracteres, contados após remover espaços das extremidades. Limites inclusivos. |

### Tipos e schemas

| Artefato | Nome |
|---|---|
| Tipo do body | `UploadMaterialRequest` |
| Schema do body | `UploadMaterialBodySchema` |
| Schema do service | `materialPdfUploadSchema` |
| Entrada do service | `UploadMaterialServiceInput` |

O schema do service inclui `uploadedById`, vindo do contexto de autenticação, conforme a convenção
do projeto.

### Respostas

| Situação | Resposta |
|---|---|
| Descrição válida | `201` com o material criado, incluindo a descrição |
| Descrição ausente | `422` |
| Descrição com menos de 50 caracteres | `422` |
| Descrição com mais de 2000 caracteres | `422` |
| Descrição composta só de espaços | `422` — o `trim` a reduz a zero caractere |

O `422` vem do `ZodError` capturado pelo `errorHandler` global, o caminho já estabelecido no projeto
para erro de validação. A resposta carrega o campo e a regra violada.

**A validação acontece no service**, não apenas no controller: uma chamada interna com entrada
inválida precisa ser recusada do mesmo jeito (Princípio I).

### Parse compartilhado

As duas rotas passam a usar o mesmo módulo de leitura do formulário. Hoje cada controller percorre
`request.parts()` por conta própria, e acrescentar um campo obrigatório em dois laços independentes
é o caminho mais curto para os dois divergirem — que é exatamente o que a US3 quer impedir.

---

## Saída: consulta de material

`description` passa a compor a resposta das rotas que já devolvem material:

| Rota | Observação |
|---|---|
| `GET /mis/:id` | Onde a tela de detalhes a exibe |
| `GET /mis/all` | Listagem geral |
| `GET /mis/pending` | Painel do professor |

| Valor | Significado |
|---|---|
| `null` | Material cadastrado antes da exigência |
| texto | Descrição fornecida no cadastro |

**Não existe descrição vazia.** O schema recusa string vazia e string só de espaços, então nenhum
material novo chega a `''`. A distinção é binária: ou tem descrição, ou é anterior à mudança.

Diferente de `vectorStatus` na feature 001, **a descrição não é condicional** — nenhum interruptor a
esconde. Quem pode ver o material vê a descrição.

---

## Interface: tela de detalhes

A descrição é exibida **imediatamente abaixo das habilidades BNCC** e acima da pré-visualização do
documento, introduzida na feature 002.

| Estado | O que é exibido |
|---|---|
| Com descrição | O texto, com quebras de linha preservadas e sem interpretar marcação |
| Sem descrição (`null`) | Indicação discreta de que o material não possui descrição — **sem** mensagem de erro e sem área vazia inexplicada |

---

## Interface: formulário de envio

Área de texto obrigatória, com contador ao vivo.

| Estado | Comportamento |
|---|---|
| Vazia | Envio bloqueado; a exigência é visível antes da tentativa |
| Menos de 50 caracteres | Envio bloqueado; o contador mostra quanto falta |
| Entre 50 e 2000 | Envio liberado |
| Mais de 2000 | Envio bloqueado; o contador mostra o excesso |

O FR-007 e o SC-004 exigem que a regra seja conhecida **antes** da tentativa: ninguém deve descobri-la
por uma recusa.

---

## Testes obrigatórios (FR-011)

### Back-end

| Caso | Verificação |
|---|---|
| Cadastro com descrição válida | `201`, e a descrição é persistida |
| Cadastro sem descrição | `422` |
| Descrição com 49 caracteres | `422` |
| Descrição com exatamente 50 caracteres | `201` — limite inclusivo |
| Descrição com exatamente 2000 caracteres | `201` — limite inclusivo |
| Descrição com 2001 caracteres | `422` |
| Descrição só de espaços | `422` |
| **Os sete casos acima pela rota de organização** | Mesmo resultado — a regra não depende do caminho |
| Consulta de material antigo | `description` vem `null`, sem erro |
| Consulta de material novo | `description` vem preenchida |

### Front-end

| Caso | Verificação |
|---|---|
| Detalhe com descrição | O texto aparece abaixo das habilidades BNCC |
| Detalhe sem descrição | Indicação de ausência, sem erro |
| Formulário vazio | Envio bloqueado e exigência visível |
| Formulário com texto curto | Envio bloqueado e contador indicando o que falta |
| Formulário válido | Envio liberado e a descrição segue na requisição |
