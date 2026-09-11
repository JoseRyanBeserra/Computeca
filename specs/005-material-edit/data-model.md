# Phase 1 — Data Model: Edição de Material Instrucional

**Feature**: `005-material-edit` | **Date**: 2026-09-11

**Nenhuma coluna nova, nenhuma tabela nova, nenhuma migração.** A feature não acrescenta dado ao
sistema — ela torna mutável o que já existe e registra a mudança nas estruturas que já existem.

---

## `MaterialInstrucional` — o que passa a ser alterável

| Campo | Alterável | Regra na edição |
|---|---|---|
| `title` | **sim** | Obrigatório, 1 a 255 caracteres após aparar — a mesma regra do cadastro |
| `description` | **sim** | Obrigatória, 50 a 2000 caracteres após aparar — a mesma regra do cadastro |
| `habilidadesBncc` | **sim** | Lista, pode ficar vazia. Sem espaços, sem vazios, sem duplicados |
| `storageKey` | **sim**, indiretamente | Trocado apenas quando um arquivo novo é enviado |
| `originalFileName` | **sim**, indiretamente | Acompanha a troca de arquivo |
| `mimeType` | **sim**, indiretamente | Acompanha a troca de arquivo |
| `sizeBytes` | **sim**, indiretamente | Acompanha a troca de arquivo |
| `status` | **derivado** | `APPROVED` → `PENDING_REVIEW` **somente** quando o arquivo é trocado |
| `summary` | **derivado** | Zerado quando o arquivo é trocado |
| `summaryStatus` | **derivado** | Volta a `PENDING` quando o arquivo é trocado |
| `summaryGeneratedAt` | **derivado** | Zerado quando o arquivo é trocado |
| `vectorStatus` | **derivado** | Volta a `PENDING` quando o arquivo é trocado |
| `updatedAt` | automático | Já mantido pelo Prisma |

### O que nunca é alterável

| Campo | Por quê |
|---|---|
| `id` | Identidade do registro |
| `uploadedById` | **Quem enviou não muda porque outra pessoa editou.** Confundir autoria com edição apagaria a resposta à pergunta "de quem é este material" |
| `createdAt` | Quando entrou no acervo é fato histórico |
| `deletedAt` / `deletedById` | Remoção tem fluxo próprio; a edição não retira nem devolve material ao acervo |
| `status`, diretamente | A aprovação tem fluxo dedicado. Dois caminhos para o mesmo estado divergem |

`relatedLinks` entra nesta tabela como alterável **quando a feature 004 for implementada**. A edição
não depende disso para ser entregue.

---

## Transição de situação

```
            arquivo trocado          arquivo trocado
APPROVED ────────────────────→ PENDING_REVIEW ──────────→ PENDING_REVIEW
                                     (permanece)

REJECTED ────────────────────→ REJECTED  (permanece — ver research.md, item 6)

qualquer ── só metadados ────→ inalterado
```

**Apenas `APPROVED` transiciona.** A aprovação foi concedida a um documento específico; trocado o
documento, ela perde o objeto. Material que ainda aguarda revisão continua aguardando; material
rejeitado continua rejeitado.

> **Limitação registrada**: `REJECTED` é terminal no sistema atual — o fluxo de revisão só aceita
> decisão sobre material `PENDING_REVIEW`. Editar um material rejeitado melhora seus dados, e ele
> seguirá rejeitado. Isso é anterior a esta feature; ver [research.md](./research.md), item 6.

---

## Documento armazenado

| Propriedade | Valor |
|---|---|
| Onde vive | Object storage, sempre por `lib/minio.ts` |
| Chave | Gerada nova a cada substituição — **nunca sobrescrita** |
| Arquivo anterior | **Removido**, e somente após o registro já apontar para o novo |
| Recuperável | **Não.** A remoção é definitiva |

A chave nova é o que torna a operação reversível até o último instante: enquanto o registro não
aponta para o arquivo novo, o antigo continua íntegro e servível. Ver
[research.md](./research.md), item 1.

---

## `AuditLog` — o registro da alteração

Estrutura existente, sem mudança. O que a feature define é **o conteúdo**:

| Campo | Valor na edição |
|---|---|
| `actorId` | Quem editou |
| `actorRole` | `ADMIN` — o único perfil que chega aqui |
| `targetId` | O material editado |
| `action` | `MI_UPDATED` |
| `metadata` | **Somente os campos que mudaram**, cada um com valor anterior e novo |
| `createdAt` | Automático |

Forma do `metadata`:

```json
{
  "changed": ["description", "habilidadesBncc"],
  "description":     { "from": "<texto anterior completo>", "to": "<texto novo completo>" },
  "habilidadesBncc": { "from": ["EF06CO01"], "to": ["EF06CO01", "EF06CO02"] }
}
```

Quando o documento é trocado, entram também a identificação do arquivo anterior e a transição de
situação, se houver:

```json
{
  "changed": ["file", "status"],
  "file":   { "from": { "storageKey": "<chave anterior>", "originalFileName": "antigo.pdf" },
              "to":   { "storageKey": "<chave nova>",     "originalFileName": "novo.pdf" } },
  "status": { "from": "APPROVED", "to": "PENDING_REVIEW" }
}
```

O valor anterior da descrição vai **por inteiro**, não truncado: num acervo cujos metadados passaram
a ser mutáveis, ele é a única forma de reconstruir o que existia antes.

### Quando o registro NÃO é gravado

| Situação | Registro |
|---|---|
| Nenhum campo mudou e nenhum arquivo enviado | **Nenhum** (FR-017) |
| Edição recusada por perfil não autorizado | **Nenhum** (FR-018) |
| Edição recusada por validação | **Nenhum** (FR-018) |
| Falha ao gravar o arquivo novo ou ao atualizar o registro | **Nenhum** — nada mudou |
| Falha **apenas** ao remover o arquivo antigo | **Gravado** — a edição aconteceu |

---

## Entidades existentes — o que permanece intocado

| Entidade | Tratamento |
|---|---|
| `User` | Inalterada. A edição não muda autoria nem perfil |
| `Organization` / vínculo do material | Inalterados. A edição não altera a que projetos o material pertence |
| `InspectionLog` | Ganha os registros do controller novo, pelo padrão já vigente |
| `AppSetting` | Não consultado. A edição não é governada por interruptor |

---

## Limitação registrada

**Não há histórico de versões.** O `AuditLog` guarda o que mudou, mas o sistema não oferece tela
para navegar as alterações de um material nem para restaurar um valor anterior. Recuperar exige
consultar a tabela diretamente.

Para os metadados isso é um incômodo — o valor antigo está registrado. **Para o documento, não**:
o arquivo substituído é apagado, e nenhum registro o traz de volta.
