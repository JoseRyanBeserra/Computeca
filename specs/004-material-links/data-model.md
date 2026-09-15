# Phase 1 — Data Model: Links Relacionados do Material Instrucional

**Feature**: `004-material-links` | **Date**: 2026-09-11

Uma coluna nova. Nenhuma tabela nova, nenhuma relação nova.

---

## `MaterialInstrucional` — campo novo

```prisma
relatedLinks Json @default("[]")
```

| Propriedade | Valor |
|---|---|
| Tipo | Lista de objetos `{ label, url }` |
| Nulo no banco | **Não** — o padrão de lista vazia já expressa "sem links" |
| Padrão | `[]` |
| Obrigatório no cadastro | **Não** — links são opcionais |
| Máximo de itens | **10** por material |
| Ordem | A de cadastro, preservada na exibição |
| Alterável depois do cadastro | **Sim**, pelo ADMIN na edição de material (feature 005) — ver "Limitação registrada" |

### Por que não é anulável, diferente de `description`

Na feature 003, `null` precisou carregar um significado: *"cadastrado antes da exigência"*. Aqui não
há distinção a preservar — **nunca ter informado links e ter informado zero links são a mesma
coisa**. Uma coluna anulável criaria dois estados (`null` e `[]`) para um único significado, e toda
leitura precisaria tratar os dois.

---

## Estrutura de cada link

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `label` | texto | **sim** | 1 a **60** caracteres, após remover espaços das extremidades |
| `url` | texto | **sim** | Endereço bem formado **e** com protocolo `http:` ou `https:` |

### A regra do endereço, em duas etapas

```
   1. Bem formado?          2. Protocolo permitido?
   ───────────────          ──────────────────────
   z.string().url()    ──→  new URL(v).protocol ∈ { http:, https: }
```

**As duas etapas são necessárias.** Verificado empiricamente que `z.string().url()` sozinho aceita
`javascript:alert(1)`, `data:`, `file:` e `ftp:` — ver [research.md](./research.md), item 1. A
primeira etapa rejeita lixo; só a segunda fecha o vetor que a US3 descreve.

A comparação usa o protocolo **normalizado pelo construtor de URL**, não prefixo de string: caixa,
espaços à frente e variações como `hTTps://` são normalizados antes da comparação.

### Validação da lista

| Situação | Resultado |
|---|---|
| Lista ausente no cadastro | Aceita — vira `[]` |
| Lista vazia | Aceita |
| Mais de 10 itens | Recusada |
| Qualquer item com `label` ausente, vazio ou só espaços | Recusada |
| Qualquer item com `label` acima de 60 caracteres | Recusada |
| Qualquer item com `url` malformada ou de protocolo não permitido | Recusada |
| Itens com `url` repetida | **Aceita** — dois rótulos podem apontar ao mesmo lugar |

Rótulo e endereço são gravados **já sem os espaços das extremidades**.

---

## Migração

Aditiva e sem risco: acrescenta uma coluna com valor padrão. Os 14 materiais existentes passam a ter
`[]`, que é exatamente o significado correto — nenhum deles informou links, e nenhum precisou
informar.

Nenhuma linha é lida ou reescrita pela lógica da aplicação.

---

## Trânsito do dado

`relatedLinks` entra no `select` dos mesmos três repositórios das features 001 e 003:

| Repositório | Rota servida |
|---|---|
| `materialPdfViewRepository.ts` | `GET /mis/:id` — onde a tela de detalhes exibe |
| `materialPdfAllListRepository.ts` | `GET /mis/all` |
| `materialPdfPendingListRepository.ts` | listagem de pendentes do painel do professor |

Como `vectorStatus` na 001 e `description` na 003, o dado acompanha o material. **Diferente de
`vectorStatus`, não é condicional** — nenhum interruptor o esconde.

Consequência de tipo: `IPendingMaterial` e `IUploadedMI` ganham `relatedLinks: IMaterialLink[]`,
**não opcional**, porque a coluna sempre tem valor.

### Leitura defensiva

A coluna é `Json`, e o banco não garante a forma do conteúdo. Na leitura, o valor é validado contra
o mesmo schema; conteúdo malformado é tratado como **lista vazia**, com registro de advertência.

Em operação normal isso nunca acontece — só a aplicação escreve nessa coluna, e sempre depois de
validar. A guarda existe para que uma edição manual no banco degrade a exibição em vez de derrubar a
tela de detalhes.

---

## Entrada de cadastro

Os dois caminhos passam pelo mesmo schema, como na feature 003:

| Caminho | Rota |
|---|---|
| Envio direto | `POST /mis` |
| Envio por organização | `POST /organizations/:orgId/mis` |

`UploadMIInput` ganha `relatedLinks?: IMaterialLink[]` — **opcional**, porque o autor não é obrigado
a informar nenhum.

---

## Entidades existentes — o que permanece intocado

| Entidade | Tratamento |
|---|---|
| `MaterialInstrucional` — demais campos | Inalterados. Título, descrição, habilidades, arquivo e estados de IA seguem como estão. |
| `AuditLog` | Nenhum registro novo. A criação do material já é auditada; os links entram como mais um dado do mesmo evento. |
| `InspectionLog` | Inalterado. Nenhum controller novo. |
| `AppSetting` | Não é consultado. Os links não são governados por interruptor. |

---

## Limitação registrada

Como não existe fluxo de edição de metadados, **os links informados no cadastro são definitivos**.
Um endereço digitado errado, ou um site que muda de endereço, não têm conserto pela aplicação —
seria preciso cadastrar o material novamente.

É a mesma limitação registrada na feature 003 para a descrição, e ela pesa um pouco mais aqui:
endereços quebram com o tempo por causas alheias a quem cadastrou.

> **Atualização na implementação:** a feature 005 (edição de material pelo ADMIN) chegou antes da
> implementação desta. Os links entraram também em `PUT /mis/:id`, com o mesmo `relatedLinksSchema`,
> conjunto completo (lista vazia remove todos) e registro no diff de auditoria. A limitação acima
> deixou de valer para o ADMIN; quem cadastrou continua sem poder corrigir sozinho.
