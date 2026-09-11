# Contrato — Links Relacionados do Material

Nenhuma rota nova. A feature acrescenta um campo às rotas de cadastro e às respostas de consulta,
mais dois componentes de interface.

---

## Entrada: cadastro de material

Vale igualmente para os dois caminhos:

| Caminho | Rota |
|---|---|
| Envio direto | `POST /mis` |
| Envio por organização | `POST /organizations/:orgId/mis` |

### Campo novo no formulário

| Campo | Formato | Obrigatório |
|---|---|---|
| `relatedLinks` | **array JSON em uma única parte** do `multipart/form-data` | não |

```json
[
  { "label": "Videoaula",  "url": "https://exemplo.org/aula" },
  { "label": "Planilha",   "url": "https://exemplo.org/planilha.xlsx" }
]
```

O campo ausente equivale a `[]`. JSON malformado é tratado como lista vazia, com registro de
advertência — nunca derruba a requisição com erro de parse.

### Regras

| Alvo | Regra |
|---|---|
| Quantidade | No máximo **10** por material |
| `label` | Obrigatório, 1 a **60** caracteres após `trim` |
| `url` | Obrigatório, bem formado **e** com protocolo `http:` ou `https:` |

**A verificação de protocolo é obrigatória e separada.** `z.string().url()` sozinho aceita
`javascript:alert(1)`, `data:`, `file:` e `ftp:` — verificado empiricamente. A comparação usa o
protocolo normalizado pelo construtor de URL, não prefixo de string.

### Respostas

| Situação | Resposta |
|---|---|
| Sem o campo, ou lista vazia | `201` — links são opcionais |
| Lista válida | `201`, com os links no material criado |
| Mais de 10 itens | `422` |
| `label` ausente, vazio ou só espaços | `422` |
| `label` com mais de 60 caracteres | `422` |
| `url` malformada | `422` |
| `url` com protocolo `javascript:`, `data:`, `file:` ou `ftp:` | `422` |

O `422` vem do `ZodError` capturado pelo `errorHandler` global. **A validação acontece no service**,
não apenas no controller (Princípio I).

---

## Saída: consulta de material

`relatedLinks` passa a compor a resposta de `GET /mis/:id`, `GET /mis/all` e `GET /mis/pending`.

```json
{ "relatedLinks": [ { "label": "Videoaula", "url": "https://exemplo.org/aula" } ] }
```

**Sempre presente**, como array. Material sem links devolve `[]` — nunca `null`.

Tipo: `IMaterialLink { label: string; url: string }`, e `relatedLinks: IMaterialLink[]` **não
opcional** nas interfaces de material.

---

## Interface: `MaterialLinks`

```
front/src/components/MaterialLinks.tsx
```

### Entrada

| Propriedade | Tipo | Obrigatória |
|---|---|---|
| `links` | `IMaterialLink[]` | sim |

### Comportamento

| Situação | O que é renderizado |
|---|---|
| Lista vazia | **Nada** — nem rótulo de seção, nem espaço, nem aviso (FR-007) |
| Lista com itens | Um botão por link, com a **mesma aparência** do chip de habilidade |

Cada botão:

- Exibe o **rótulo**, nunca o endereço (FR-004)
- Revela o endereço completo ao passar o cursor (FR-005)
- Abre o destino **fora da tela atual** (FR-006)
- **Não** dá ao destino referência à página de origem, nem informa de onde o usuário veio (FR-015)

### Aparência

O estilo vem de `components/chipStyles.ts`, a mesma origem que `HabilidadesBncc` passa a consumir.
Copiar as classes garantiria divergência no dia em que alguém ajustasse uma cor — ver
[research.md](./research.md), item 3.

Forma e peso idênticos ao chip de habilidade; **matiz própria**, para o leitor distinguir o que é
clicável do que não é.

---

## Interface: `MaterialLinkPicker`

```
front/src/components/MaterialLinkPicker.tsx
```

### Entrada

| Propriedade | Tipo | Obrigatória |
|---|---|---|
| `links` | `IMaterialLink[]` | sim |
| `onChange` | `(links: IMaterialLink[]) => void` | sim |
| `disabled` | `boolean` | não |

### Comportamento

| Ação | Resultado |
|---|---|
| Preencher rótulo e endereço e acrescentar | O link entra na lista exibida, e os campos se esvaziam |
| Acrescentar com rótulo vazio | Impedido, com a exigência informada |
| Acrescentar com endereço malformado ou de protocolo não permitido | Impedido, com o formato esperado informado |
| Acrescentar além do limite de 10 | Impedido, com o limite informado |
| Remover um link da lista | Sai da lista e não é enviado |

**As regras são informadas antes da tentativa de envio** (FR-014, SC-004): quem cadastra não
descobre o formato por uma recusa do servidor.

A validação de protocolo no formulário é **conveniência, não proteção** — a proteção está no
servidor (FR-012).

---

## Testes obrigatórios (FR-017)

### Back-end

| Caso | Verificação |
|---|---|
| Cadastro sem o campo | `201`, e `relatedLinks` é `[]` |
| Cadastro com lista vazia | `201` |
| Cadastro com links válidos | `201`, e os links são persistidos na ordem informada |
| `label` ausente | `422` |
| `label` só de espaços | `422` |
| `label` com 61 caracteres | `422` |
| `label` com exatamente 60 | `201` — limite inclusivo |
| `url` malformada | `422` |
| **`url` com `javascript:`** | `422` — o caso que a US3 existe para cobrir |
| **`url` com `data:`** | `422` |
| **`url` com `file:`** | `422` |
| **`url` com `ftp:`** | `422` |
| 11 links | `422` |
| Exatamente 10 links | `201` — limite inclusivo |
| `url` repetida no mesmo material | `201` — aceito por decisão |
| Rótulo e endereço cercados de espaços | `201`, gravados já aparados |
| **Todos os casos acima pela rota de organização** | Mesmo resultado |
| Consulta de material anterior à mudança | `relatedLinks` vem `[]`, sem erro |

### Front-end

| Caso | Verificação |
|---|---|
| Detalhe com links | Um botão por link, exibindo o rótulo, abaixo da descrição |
| Detalhe sem links | **Nada** renderizado — sem rótulo de seção e sem espaço |
| Botão de link | Aponta ao endereço, abre fora da tela e isola a origem |
| Botão de link | Revela o endereço ao passar o cursor |
| Formulário: acrescentar | O link entra na lista exibida |
| Formulário: remover | O link sai da lista |
| Formulário: endereço inválido | Impedido, com a regra informada |
| Formulário: rótulo vazio | Impedido |
| Formulário: limite de 10 | Impedido ao tentar o décimo primeiro |
| Envio | `relatedLinks` segue na requisição como array JSON |
