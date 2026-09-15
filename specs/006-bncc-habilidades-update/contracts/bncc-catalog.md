# Contrato — Catálogo de Habilidades da BNCC Computação

Nenhuma rota nova e nenhuma rota alterada. O contrato desta feature é o **módulo de catálogo** que
o front-end expõe aos seus componentes, e a sua **correspondência com o arquivo oficial**.

---

## Módulo: `front/src/features/materials/data/bnccComputacao.ts`

A interface pública **não muda** — só o conteúdo. Nenhum consumidor precisa ser alterado.

```ts
interface BnccHabilidade { codigo: string; descricao: string }
interface BnccGrupo      { etapa: string; habilidades: BnccHabilidade[] }

const BNCC_COMPUTACAO:      BnccGrupo[]
const BNCC_COMPUTACAO_FLAT: BnccHabilidade[]
const BNCC_COMPUTACAO_MAP:  Record<string, string>
```

### Garantias

| Garantia | Verificação |
|---|---|
| `BNCC_COMPUTACAO` tem **4** grupos, na ordem Educação Infantil → Anos Iniciais → Anos Finais → Ensino Médio | teste |
| `BNCC_COMPUTACAO_FLAT` tem **141** entradas, sem código repetido | teste |
| Cada grupo contém apenas códigos dos seus prefixos (ver data-model.md) | teste |
| Toda descrição é **idêntica** à do arquivo | teste de correspondência |
| `EF05CO11` presente; `EF05CO011` ausente | teste |
| `EF06CO01`, `EF06CO02`, `EF06CO04` presentes (usados pelo acervo) | teste |
| `BNCC_COMPUTACAO_MAP` tem uma chave para cada código do catálogo | teste |

---

## Arquivo de origem

```
front/src/features/materials/data/habilidades_bncc_computacao.csv
```

| Aspecto | Contrato |
|---|---|
| Codificação | UTF-8 |
| Cabeçalho | `codigo,habilidade` |
| Campos | CSV com aspas duplas quando o texto contém vírgula |
| Conteúdo | Idêntico ao anexo da spec, `specs/006-bncc-habilidades-update/habilidades_bncc_computacao.csv` |
| Uso | **Somente pelo teste** de correspondência e pelo gerador — nunca importado por código de produção |

---

## Gerador

```
front/scripts/gerarCatalogoBncc.mjs
```

| Aspecto | Contrato |
|---|---|
| Entrada | O CSV acima |
| Saída | Reescreve `bnccComputacao.ts` por inteiro |
| Normalização | Exatamente as regras de data-model.md |
| Falha | Código repetido ou prefixo fora das quatro etapas encerra com erro, **sem escrever** o arquivo |
| Execução | Manual, uma vez por atualização do arquivo oficial |

Futuras atualizações seguem o mesmo caminho: substituir o CSV, rodar o gerador, rodar os testes.

---

## Interface: `BnccHabilidadePicker`

**Sem mudança de props nem de comportamento.** O que a feature garante sobre ele:

| Situação | Resultado |
|---|---|
| Busca por qualquer um dos 141 códigos | A habilidade aparece como sugestão, sob a sua etapa |
| Busca por trecho da descrição integral (ex.: "robótica") | A habilidade correspondente aparece |
| Lista aberta sem termo | Quatro grupos, na ordem das etapas |
| Código antes personalizado que agora consta no catálogo (ex.: `EI03CO01`) | Tratado como conhecido: exibe a descrição oficial e não oferece "adicionar personalizada" |
| Descrição longa (ex.: `EF02CO02`, 283 caracteres) | Exibida integralmente, sem reticências |

---

## Testes obrigatórios

| Caso | Arquivo |
|---|---|
| Correspondência total catálogo × CSV (quantidade, códigos, descrições, ordem) | `bnccComputacao.test.ts` |
| Normalização afeta exatamente `EF05CO011` → `EF05CO11` | `bnccComputacao.test.ts` |
| Quatro etapas na ordem, cada uma só com os seus prefixos | `bnccComputacao.test.ts` |
| Códigos usados pelo acervo continuam presentes | `bnccComputacao.test.ts` |
| Busca encontra habilidade da Educação Infantil, de `EF15` e de `EF69` | `BnccHabilidadePicker.test.tsx` |
| Busca por trecho só presente no texto integral | `BnccHabilidadePicker.test.tsx` |
| Grupos na ordem ao abrir a lista sem termo | `BnccHabilidadePicker.test.tsx` |
| Código antes personalizado passa a ser conhecido | `BnccHabilidadePicker.test.tsx` |
