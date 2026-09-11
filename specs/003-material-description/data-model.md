# Phase 1 — Data Model: Descrição Obrigatória do Material Instrucional

**Feature**: `003-material-description` | **Date**: 2026-09-11

Uma coluna nova. Nenhuma entidade nova, nenhuma relação alterada.

---

## `MaterialInstrucional` — campo novo

```prisma
description String?
```

| Propriedade | Valor |
|---|---|
| Tipo | Texto livre |
| Nulo no banco | **Sim** — é o que permite conviver com o acervo já existente |
| Obrigatório no cadastro | **Sim** — imposto pelo schema de entrada, não pela coluna |
| Mínimo | **50** caracteres, após remover espaços das extremidades |
| Máximo | **2000** caracteres, após remover espaços das extremidades |
| Limites | **Inclusivos** — exatamente 50 e exatamente 2000 são aceitos |
| Alterável depois do cadastro | **Não** — o sistema não possui fluxo de edição de metadados |

### Por que a coluna aceita nulo e a entrada não

São camadas diferentes, e tratá-las como a mesma coisa é o que faz o FR-004 e o FR-009 parecerem
contraditórios:

```
   Entrada (schema de cadastro)        Armazenamento (coluna)
   ────────────────────────────        ──────────────────────
   descrição obrigatória,              aceita ausência,
   50 a 2000 caracteres        ──→     porque 13 materiais
                                       já existem sem ela
```

Uma coluna `NOT NULL` exigiria valor padrão para as linhas existentes — e qualquer padrão seria
descrição inventada, pior que a ausência honesta.

### Distinção entre ausência e vazio

`null` significa **"cadastrado antes da exigência"**. Não existe estado de descrição vazia: o schema
recusa string vazia e string só de espaços, então nenhum material novo pode chegar a `''`.

A tela usa essa distinção: `null` produz a indicação discreta de ausência (FR-003); qualquer outro
valor é exibido.

---

## Migração

Aditiva e sem risco: acrescenta uma coluna nullable. Nenhuma linha existente é lida ou reescrita, e
nenhum valor padrão é aplicado.

Os materiais já cadastrados ficam com `null` — o que é o significado correto, não um efeito
colateral.

---

## Trânsito do dado

A descrição entra no `select` de três repositórios, os mesmos mapeados na feature 001:

| Repositório | Rota servida |
|---|---|
| `materialPdfViewRepository.ts` | `GET /mis/:id` — é onde a especificação pede a exibição |
| `materialPdfAllListRepository.ts` | `GET /mis/all` |
| `materialPdfPendingListRepository.ts` | listagem de pendentes do painel do professor |

**Diferente de `vectorStatus`, a descrição não é condicional.** Não há interruptor que a esconda:
ela acompanha o material sempre, para qualquer perfil que possa ver o material.

Consequência de tipo: `IPendingMaterial` e `IUploadedMI` ganham `description?: string | null`.

---

## Entrada de cadastro

Os dois caminhos passam pelo mesmo schema:

| Caminho | Rota |
|---|---|
| Envio direto ao acervo | `POST /mis` |
| Envio vinculado a organização | `POST /organizations/:orgId/mis` |

`UploadMIInput` ganha `description: string` — **não** opcional, porque nesse ponto do fluxo a
descrição já é obrigatória.

---

## Entidades existentes — o que permanece intocado

| Entidade | Tratamento |
|---|---|
| `MaterialInstrucional` | Todos os demais campos inalterados. Título continua com o comportamento atual, inclusive a tolerância do servidor à sua ausência — corrigir isso está fora do escopo. |
| `AuditLog` | Nenhum registro novo. A criação do material já é auditada; a descrição é mais um dado do mesmo evento. |
| `InspectionLog` | Inalterado. Nenhum controller novo. |
| `AppSetting` | Não é consultado. A descrição não é governada por interruptor. |

---

## Limitação registrada

Como não existe fluxo de edição de metadados, **o valor gravado no cadastro é definitivo**. Isso
vale para os dois lados:

- Os materiais anteriores à mudança nunca terão descrição.
- Um erro de digitação numa descrição nova não tem conserto pela aplicação.

Criar um fluxo de edição está fora do escopo desta feature, por decisão do responsável pelo
projeto, mas é consequência direta do desenho e está registrado para não se perder.
