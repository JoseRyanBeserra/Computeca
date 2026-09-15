# Implementation Plan: Atualização do Catálogo de Habilidades da BNCC Computação

**Branch**: `006-bncc-habilidades-update` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-bncc-habilidades-update/spec.md`

## Summary

Substituir o catálogo de habilidades da BNCC Computação — hoje 109 entradas com descrições
resumidas — pelas **141 habilidades do arquivo oficial**, com texto integral, acrescentando a
Educação Infantil (`EI03`) e os códigos por segmento (`EF15`, `EF69`).

O achado que mais simplifica o desenho: **o catálogo é consumido só pelo front-end**, por um único
componente (`BnccHabilidadePicker`). O servidor aceita qualquer código, o filtro da listagem vem dos
materiais, e o chip de exibição mostra só o código. A feature, portanto, **não toca servidor, banco
nem rota** — e o acervo fica intacto por construção, não por cuidado.

Três decisões estruturais:

1. **O catálogo continua um arquivo TypeScript tipado**, agora gerado a partir do CSV por um script
   versionado. A lista segue revisável em diff e nenhum parser de CSV vai para o bundle.
2. **O CSV fica versionado ao lado do catálogo, e um teste confere a correspondência** item a item.
   É o que impede o catálogo de voltar a divergir da fonte oficial sem que ninguém perceba — que é
   exatamente como ele chegou a 109 habilidades resumidas.
3. **A única correção sobre o arquivo é `EF05CO011` → `EF05CO11`**, isolada numa regra que o teste
   confirma afetar exatamente um código.

## Technical Context

**Language/Version**: TypeScript em modo estrito sobre Node.js >= 20

**Primary Dependencies**: React 19, Vite 8. **Nenhuma dependência nova** — o parse do CSV cabe em
poucas linhas e o `?raw` do Vite já é tipado pelo `vite/client`.

**Storage**: N/A — nenhuma mudança no banco. O catálogo é dado estático do front-end.

**Testing**: Vitest + Testing Library no front.

**Target Platform**: Aplicação web; a feature toca **só o front-end**.

**Project Type**: Web application (front + API), com mudança restrita ao front.

**Performance Goals**: Nenhuma meta nova. 141 entradas em memória e busca por `includes` sobre elas
não têm custo perceptível. O limite de 8 sugestões por etapa é **removido** (clarificação de
2026-09-14): renderizar as 141 opções dispensa virtualização.

**Constraints**:

- O CSV tem campos entre aspas com vírgulas internas — `split(',')` não serve.
- O front **não tem `@types/node`**: testes não podem ler arquivo com `fs`.
- Os testes estão fora do `tsc` do build; o CSV não pode ser importado por código de produção, para
  não ir para o bundle.
- A redação do arquivo é adotada literalmente, inclusive aspas tipográficas e pequenas variações.

**Scale/Scope**: 1 arquivo de dados regenerado, 1 CSV versionado, 1 script gerador, 1 arquivo de
teste novo, 1 arquivo de teste ampliado. Nenhum componente com mudança de comportamento.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa (não se aplica) | Nenhum dado novo cruza a fronteira da API. O catálogo segue tipado por `BnccHabilidade` e `BnccGrupo`, cuja forma não muda. |
| **II. Autorização explícita por perfil** | ✅ Passa (não se aplica) | Nenhuma rota nova ou alterada. |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa (não se aplica) | Nenhuma ação altera estado — nenhum material é lido ou reescrito. Por isso também não há `AuditLog` a gravar: o FR-009 é garantido por não haver escrita. |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa (não se aplica) | Nenhum processamento. A geração do catálogo é offline, no desenvolvimento. |
| **V. Teste acompanha a feature** | ✅ Passa, com uma ressalva registrada | O catálogo tem teste de correspondência total com o arquivo, e o picker ganha casos para as etapas novas. **Ressalva**: o script gerador (`front/scripts/`) fica fora da cobertura do Vitest, que inclui só `src/`. Aceito porque é ferramenta de desenvolvimento executada à mão, e a **saída** dele é verificada integralmente pelo teste de correspondência — um gerador errado produz catálogo que falha no teste. |

**Restrições de Stack** — um ponto:

- *"As telas seguem a estrutura base já consolidada"*: nenhuma mudança visual. Verificado que o
  picker já exibe a descrição sem truncar (research.md, item 6).

**Resultado do gate: aprovado.** A ressalva do Princípio V não é violação — a função tocada pela
feature (o catálogo) tem cobertura total; ela está registrada abaixo por transparência.

**Reavaliação pós-design**: mantido. O design da Fase 1 não introduziu rota, escrita, dependência
nem componente novo.

## Project Structure

### Documentation (this feature)

```text
specs/006-bncc-habilidades-update/
├── plan.md                          # Este arquivo
├── spec.md                          # Especificação
├── habilidades_bncc_computacao.csv  # Anexo: arquivo oficial enviado
├── research.md                      # Fase 0
├── data-model.md                    # Fase 1
├── quickstart.md                    # Fase 1
├── contracts/                       # Fase 1
│   └── bncc-catalog.md
├── checklists/
│   └── requirements.md
└── tasks.md                         # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
front/
├── scripts/
│   └── gerarCatalogoBncc.mjs                   # novo — CSV → bnccComputacao.ts
└── src/
    ├── features/materials/data/
    │   ├── habilidades_bncc_computacao.csv     # novo — fonte oficial, só lida por teste e gerador
    │   ├── bnccComputacao.ts                   # regenerado — 141 habilidades, texto integral
    │   └── bnccComputacao.test.ts              # novo — correspondência catálogo × CSV
    └── components/
        └── BnccHabilidadePicker.test.tsx       # ampliado — etapas novas e texto integral

MI-server/                                      # sem alteração
```

**Structure Decision**: mantida a estrutura existente. O catálogo continua onde está, com a mesma
interface pública, e nenhum consumidor muda. As duas novidades são o CSV **ao lado** do catálogo —
e não em `specs/`, que fica fora do projeto do front e do contexto do build Docker — e a pasta
`front/scripts/`, que não existia; ela segue o precedente de `MI-server/scripts/`.

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação identificada. A ressalva do Princípio V (gerador fora da cobertura) está
justificada na tabela acima e não constitui violação.
