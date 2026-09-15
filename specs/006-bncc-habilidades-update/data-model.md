# Phase 1 — Data Model: Atualização do Catálogo de Habilidades da BNCC Computação

**Feature**: `006-bncc-habilidades-update` | **Date**: 2026-09-14

**Nenhuma mudança no banco.** Nenhuma tabela, coluna ou migração. O catálogo é um dado estático do
front-end; o que é persistido — a lista de códigos em `MaterialInstrucional.habilidadesBncc` —
permanece exatamente como está.

---

## `BnccHabilidade` — entrada do catálogo

Forma inalterada em relação ao catálogo atual.

| Campo | Tipo | Regra |
|---|---|---|
| `codigo` | texto | Único no catálogo. Formato `<etapa><ano ou segmento>CO<sequência de 2 dígitos>` |
| `descricao` | texto | Texto **integral** do arquivo, sem resumo nem correção editorial |

## `BnccGrupo` — etapa

Forma inalterada.

| Campo | Tipo | Regra |
|---|---|---|
| `etapa` | texto | Um dos quatro rótulos abaixo |
| `habilidades` | lista de `BnccHabilidade` | Ordem do arquivo |

### As quatro etapas, em ordem

| # | Rótulo | Prefixos | Quantidade |
|---|---|---|---|
| 1 | Educação Infantil | `EI03` | 11 |
| 2 | Ensino Fundamental — Anos Iniciais (1º ao 5º ano) | `EF01`–`EF05`, `EF15` | 41 + 9 = **50** |
| 3 | Ensino Fundamental — Anos Finais (6º ao 9º ano) | `EF06`–`EF09`, `EF69` | 42 + 12 = **54** |
| 4 | Ensino Médio | `EM13` | 26 |
| | **Total** | | **141** |

Contagem por prefixo no arquivo: `EF01` 7, `EF02` 6, `EF03` 9, `EF04` 8, `EF05` 11 — soma 41;
`EF06` 10, `EF07` 11, `EF08` 11, `EF09` 10 — soma 42.

### Exportações derivadas

Mantidas, com o mesmo significado — são as que o picker consome:

| Exportação | Conteúdo |
|---|---|
| `BNCC_COMPUTACAO` | Os quatro grupos |
| `BNCC_COMPUTACAO_FLAT` | As 141 habilidades, na ordem dos grupos |
| `BNCC_COMPUTACAO_MAP` | Código → descrição, 141 entradas |

---

## Da linha do arquivo à entrada do catálogo

```
 codigo,habilidade                    BnccHabilidade
 ─────────────────                    ──────────────
 EF05CO011,"Identificar ..."   ──→    { codigo: 'EF05CO11', descricao: 'Identificar ...' }
    │           │                                 ▲                   ▲
    │           └── aspas externas removidas; ────┼───────────────────┘
    │               vírgulas internas preservadas │
    └── normalização de sequência com 3 dígitos ──┘
        (afeta exatamente 1 código)
```

| Regra | Aplicação |
|---|---|
| Cabeçalho `codigo,habilidade` | Ignorado |
| Linhas vazias | Ignoradas (o arquivo termina com uma) |
| Campo entre aspas | Aspas externas removidas; vírgulas e aspas tipográficas internas preservadas |
| Espaços nas extremidades | Removidos |
| Sequência de 3 dígitos com zero à esquerda (`CO011`) | Vira 2 dígitos (`CO11`) |
| Código repetido | **Erro** — não há nenhum no arquivo, e um repetido indicaria arquivo corrompido |
| Prefixo fora das quatro etapas | **Erro** — ver research.md, item 5 |

---

## Diferença em relação ao catálogo atual

| Mudança | Códigos |
|---|---|
| Acrescentados | `EI03CO01`–`EI03CO11`, `EF15CO01`–`EF15CO09`, `EF69CO01`–`EF69CO12` (32) |
| Mantidos | Os 109 atuais, todos presentes no arquivo |
| Removidos | Nenhum |
| Descrição alterada | Todos os 109 mantidos — resumo substituído pelo texto integral |
| Etapa nova | Educação Infantil |

---

## Entidades existentes — o que permanece intocado

| Entidade | Tratamento |
|---|---|
| `MaterialInstrucional.habilidadesBncc` | Inalterada. Nenhum registro lido ou reescrito. |
| Validação do cadastro e da edição | Inalterada. Continua aceitando habilidade personalizada. |
| `GET /mis/habilidades` (filtro) | Inalterada. Lista os códigos presentes nos materiais aprovados. |
| `AuditLog` / `InspectionLog` | Nenhum registro novo — nenhuma ação altera estado. |
