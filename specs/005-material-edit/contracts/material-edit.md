# Contrato — Edição de Material Instrucional

Uma rota nova no servidor, uma tela nova no front. Nenhuma estrutura de dados nova.

---

## `PUT /mis/:id`

Altera os metadados de um material e, opcionalmente, substitui o seu documento.

| Item | Valor |
|---|---|
| Autenticação | Obrigatória |
| Perfil autorizado | **`ADMIN`, e somente ele** |
| Corpo | `multipart/form-data` |

**Por que `PUT` e não `PATCH`**: o corpo carrega o **conjunto completo** dos metadados editáveis,
não um subconjunto. Ver [research.md](./research.md), item 3 — campos opcionais tornariam "omiti a
descrição" indistinguível de "mantenha a atual", e uma descrição inválida atravessaria a edição sem
ser conferida.

### Campos

| Campo | Formato | Obrigatório | Observação |
|---|---|---|---|
| `title` | texto | **sim** | 1 a 255 caracteres após aparar |
| `description` | texto | **sim** | 50 a 2000 caracteres após aparar |
| `habilidadesBncc` | campos repetidos **ou** array JSON numa parte | não | Ausente equivale a lista vazia |
| `file` | arquivo | **não** | **Ausente significa "não trocar o documento"** |

Os três campos de metadados usam **os mesmos schemas do cadastro**. Quando os links relacionados
existirem, entram aqui pela mesma regra.

O parse reaproveita `parseMaterialMultipart` sem alteração: ele já devolve `fileBuffer: Buffer |
null`, e o `null` passa a significar "manter o documento atual".

### Respostas

| Situação | Resposta |
|---|---|
| Edição aplicada | `200` com o material atualizado |
| Nada mudou (mesmos valores, sem arquivo) | `200` com o material — **sem registro de auditoria** |
| Perfil diferente de `ADMIN` | `403` |
| Sem autenticação | `401` |
| Material inexistente **ou removido do acervo** | `404` |
| `title` ausente, vazio, só espaços ou acima de 255 | `422` |
| `description` ausente, abaixo de 50 ou acima de 2000 | `422` |
| Arquivo enviado que não é um PDF válido | `415` |
| Arquivo enviado acima do limite configurado | `413` |

O `422` vem do `ZodError` capturado pelo `errorHandler` global. **A validação acontece no service**,
não apenas no controller (Princípio I). Os erros de arquivo seguem o catálogo já usado pelo
cadastro: `INVALID_FILE_TYPE` e `FILE_TOO_LARGE`.

### Efeitos da substituição do documento

Aplicam-se **somente** quando `file` é enviado:

| Efeito | Detalhe |
|---|---|
| Arquivo novo gravado | Sob **chave nova** — a anterior nunca é sobrescrita |
| Arquivo anterior removido | **Somente depois** que o registro já aponta para o novo |
| Situação | `APPROVED` → `PENDING_REVIEW`. Demais situações **não mudam** |
| Resumo | `summary` e `summaryGeneratedAt` zerados, `summaryStatus` volta a `PENDING` |
| Vetorização | `vectorStatus` volta a `PENDING` |

### Garantias em caso de falha

| Falha | Resultado |
|---|---|
| Ao gravar o arquivo novo | Nada mudou. Erro ao chamador |
| Ao atualizar o registro | Arquivo novo é removido. **Nada mudou** |
| **Ao remover o arquivo antigo** | **A edição está concluída.** Advertência registrada, `200` ao chamador |

A última linha é deliberada: um arquivo órfão é incômodo, um material sem documento acessível é
quebra. Ver [research.md](./research.md), item 1.

### Registro de auditoria

Ação `MI_UPDATED`, com `metadata` contendo apenas os campos alterados, cada um com valor anterior e
novo. Formato em [data-model.md](./data-model.md).

**Não é gravado** quando nada mudou, nem quando a edição foi recusada.

---

## Tela de edição

```
front/src/pages/MaterialEditPage.tsx
```

Alcançável a partir da tela de detalhes do material.

### Acesso

| Quem | O que vê |
|---|---|
| `ADMIN` | O caminho para a edição aparece nos detalhes; a tela abre |
| Qualquer outro perfil | **O caminho não aparece**; a rota, se acessada diretamente, não edita |

Usa `isSysAdmin(user)` de `lib/permissions.ts`, que já significa exatamente "é ADMIN". A ocultação
é conveniência; a proteção está no servidor.

### Comportamento

| Situação | Resultado |
|---|---|
| Tela abre | Campos **preenchidos com os valores atuais** do material (FR-020) |
| Material sem descrição (anterior à exigência) | Campo vazio, com a regra visível — precisa ser preenchido para salvar |
| Descrição fora dos limites | Salvar impedido, com a regra informada **antes** da tentativa |
| Título vazio | Salvar impedido |
| Nenhum arquivo selecionado | Salva apenas os metadados |
| **Arquivo selecionado** | **Confirmação explícita** antes de enviar, avisando que o documento atual será apagado e que isso não tem desfazer |
| Salvo com sucesso | Volta aos detalhes do material, já com os valores novos |
| Documento trocado em material aprovado | Avisa que o material voltou para revisão |

O contador ao vivo da descrição e os limites vêm de `features/materials/constants.ts` — a mesma
origem do cadastro, nunca redeclarados.

---

## Testes obrigatórios (FR-023)

### Back-end — permissão

| Caso | Verificação |
|---|---|
| `ADMIN` edita | `200` |
| `PROFESSOR` edita | `403` |
| `INSTITUTIONALIZED` edita | `403` |
| **O próprio autor do material edita** | `403` — autoria não dá direito de alterar |
| Sem autenticação | `401` |

### Back-end — metadados

| Caso | Verificação |
|---|---|
| Altera título, descrição e habilidades | `200`, valores persistidos |
| Material sem descrição recebe uma válida | `200`, deixa de estar sem descrição |
| `title` vazio ou só espaços | `422` |
| `title` com 256 caracteres | `422` |
| `description` com 49 caracteres | `422` |
| `description` com exatamente 50 e com 2000 | `200` — limites inclusivos |
| Valores cercados de espaços | `200`, persistidos já aparados |
| Edição de metadados em material `APPROVED` | `200`, **continua `APPROVED`** |
| Material removido do acervo | `404` |
| Material inexistente | `404` |

### Back-end — documento

| Caso | Verificação |
|---|---|
| Substitui o documento | `200`, material aponta para o arquivo novo |
| Arquivo anterior | **Não está mais no armazenamento** |
| A chave do arquivo novo | **Diferente** da anterior |
| Substituição em material `APPROVED` | Situação vira `PENDING_REVIEW` |
| Substituição em material `PENDING_REVIEW` | Situação **não muda** |
| Substituição | `summary`, `summaryGeneratedAt` zerados; `summaryStatus` e `vectorStatus` em `PENDING` |
| Arquivo que não é PDF | `415`, e **o documento atual permanece** |
| Arquivo acima do limite | `413`, e **o documento atual permanece** |
| Edição só de metadados | O documento **não é tocado** |

### Back-end — auditoria

| Caso | Verificação |
|---|---|
| Edição que altera algo | Grava `MI_UPDATED` com actor, material e campos alterados |
| Campo alterado | `metadata` traz valor anterior e novo |
| Troca de documento | `metadata` identifica o arquivo anterior |
| **Nada alterado** | **Nenhum registro** |
| Recusa por perfil | **Nenhum registro** |
| Recusa por validação | **Nenhum registro** |

### Front-end

| Caso | Verificação |
|---|---|
| Tela abre | Campos preenchidos com os valores atuais |
| `ADMIN` nos detalhes | O caminho para a edição aparece |
| Demais perfis nos detalhes | O caminho **não aparece** |
| Descrição abaixo do mínimo | Salvar impedido, com a regra informada |
| Título vazio | Salvar impedido |
| Salvar sem arquivo | Requisição segue **sem** o campo de arquivo |
| **Selecionar arquivo** | **Confirmação exigida** antes do envio |
| Confirmação recusada | Nada é enviado |
