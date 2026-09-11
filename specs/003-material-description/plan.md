# Implementation Plan: Descrição Obrigatória do Material Instrucional

**Branch**: `003-material-description` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-material-description/spec.md`

## Summary

Acrescentar descrição ao material instrucional: exibida na tela de detalhes abaixo das habilidades
BNCC, e **obrigatória** em todo cadastro novo, com 50 a 2000 caracteres.

A tensão central da feature é que dois requisitos parecem se contradizer: o FR-004 exige descrição
em todo cadastro, e o FR-009 exige que o acervo existente continue válido sem ela. A resolução é
separar **armazenamento** de **entrada**: a coluna aceita ausência, o schema de cadastro não.

Três achados do código determinam o desenho:

1. **O parse do formulário está duplicado.** `materialPdfUploadController` e
   `uploadOrgMaterialController` percorrem `request.parts()` cada um por conta própria. Acrescentar
   um campo obrigatório em dois lugares independentes é convite à divergência — que é justamente o
   que a US3 quer impedir. O parse vai para um módulo compartilhado.
2. **Não existe schema Zod para o upload.** O service valida as habilidades com um schema inline e
   confere o tipo do arquivo à mão, sem `validateRequest`. A constituição (Princípio I) exige
   `nomeFluxoSchema` validado no service. Esta feature cria esse schema.
3. **O título é exigido apenas no formulário.** O servidor tolera sua ausência e recorre ao nome do
   arquivo — fallback duplicado nos dois controllers, como o parse. Por decisão do responsável, o
   título **também** passa a ser obrigatório (FR-011): `resolveTitle` deixa de existir e o valor
   passa a vir de quem cadastra. Verificado no banco que nenhum material tem título vazio, então a
   nova exigência não cria inconsistência com o acervo.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js >= 20

**Primary Dependencies**: Back — Fastify 5, Prisma 7, Zod 4. Front — React 19, Vite 8, TanStack
Query. **Nenhuma dependência nova.**

**Storage**: PostgreSQL via Prisma. Uma coluna nova, nullable, com migração aditiva.

**Testing**: Vitest — unitário e integração no back, Vitest + Testing Library no front.

**Target Platform**: Aplicação web; a feature toca **as duas pontas**.

**Performance Goals**: Nenhuma meta nova. Um campo de texto não altera o custo de nenhum fluxo.

**Constraints**:

- A coluna de descrição **precisa** aceitar ausência: 13 materiais já existem sem ela, e uma coluna
  obrigatória impediria a migração de rodar. A coluna de título permanece obrigatória, como já é.
- **Os testes de cadastro existentes mudam.** O helper de `materialUpload.test.ts` monta o
  formulário sem descrição; tornar o campo obrigatório quebra os 8 casos daquele arquivo. Isso não
  é regressão, é o contrato de entrada mudando de propósito — e precisa de tarefa própria.
- O formulário de envio trafega como `multipart/form-data` — a descrição é mais um campo de texto,
  dentro do teto de 120 campos configurado no registro do multipart.
- Nenhum caminho de edição de metadados existe no sistema: o valor gravado no cadastro é definitivo.

**Scale/Scope**: 1 coluna, 1 migração, 2 controllers, 1 service, 3 repositórios, 2 telas do front, mais a atualização dos testes de cadastro já existentes.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa, e **corrige uma dívida** | A feature cria `materialPdfUploadSchema.ts` com `UploadMaterialRequest` e `materialPdfUploadSchema`, validado por `validateRequest` no service — que é o que o princípio exige e que o fluxo de upload não fazia. |
| **II. Autorização explícita por perfil** | ✅ Passa | Nenhuma rota nova e nenhuma regra de acesso alterada. A descrição acompanha o material: quem pode vê-lo, vê a descrição. |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa | O `AuditLog` do upload já registra a criação do material; a descrição entra como mais um dado do mesmo evento, sem registro novo. Os `InspectionLog` dos controllers permanecem. |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa (não se aplica) | Um campo de texto não adiciona trabalho pesado a nenhuma requisição. |
| **V. Teste acompanha a feature** | ✅ Passa | O FR-011 exige cobrir exibição com e sem descrição, e as quatro formas de recusa, **nos dois caminhos de cadastro**. |

**Restrições de Stack** — três pontos:

- *"Erro de negócio é `GeneralErrorResponse` com `StatusCode` explícito"*: a recusa por descrição
  inválida é erro de **validação**, não de negócio. Segue o caminho do `ZodError`, que o
  `errorHandler` global converte em `422` — o padrão já estabelecido no projeto.
- *"`repositories/` contém apenas queries Prisma"*: a coluna nova entra no `select` dos
  repositórios; nenhuma regra vai para lá.
- *"As telas seguem a estrutura base já consolidada"*: o campo do formulário e o bloco da tela de
  detalhes usam os mesmos tokens das seções existentes.

**Resultado do gate: aprovado, sem violações.** Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/003-material-description/
├── plan.md              # Este arquivo
├── spec.md              # Especificação
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   └── material-description.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
MI-server/
├── prisma/schema.prisma                        # + description String?
└── src/
    ├── schemas/resources/materials/pdf/
    │   └── materialPdfUploadSchema.ts          # novo — corrige a dívida do Princípio I
    ├── @types/resources/materials/pdf/
    │   └── index.ts                            # + description em UploadMIInput e nas respostas
    ├── controllers/resources/materials/pdf/
    │   ├── materialPdfUploadController.ts      # usa o parse compartilhado
    │   └── shared/parseMaterialMultipart.ts    # novo — parse único das duas rotas
    ├── controllers/organizations/materials/
    │   └── uploadOrgMaterialController.ts      # passa a usar o parse compartilhado
    ├── services/resources/materials/pdf/
    │   └── materialPdfUploadService.ts         # valida com validateRequest e persiste
    └── repositories/resources/materials/pdf/
        ├── materialPdfUploadRepository.ts      # grava a coluna
        ├── materialPdfViewRepository.ts        # + description no select
        ├── materialPdfAllListRepository.ts     # + description no select
        └── materialPdfPendingListRepository.ts # + description no select

front/
└── src/
    ├── features/materials/api/materialsApi.ts  # + description no tipo e no envio
    ├── pages/UploadPage.tsx                    # campo obrigatório com contador
    └── pages/MaterialDetailPage.tsx            # bloco abaixo das habilidades BNCC
```

**Structure Decision**: mantida a estrutura existente. A novidade estrutural é
`controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts`: hoje os dois controllers de
upload percorrem o formulário cada um por conta própria, e acrescentar um campo obrigatório em dois
lugares independentes é o caminho mais curto para os dois divergirem. Unificar o parse é o que faz a
US3 ser estrutural em vez de depender de disciplina.

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação identificada. Seção intencionalmente vazia.
