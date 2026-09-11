# Implementation Plan: Edição de Material Instrucional pelo Administrador

**Branch**: `005-material-edit` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-material-edit/spec.md`

## Summary

Dar ao perfil `ADMIN` uma rota e uma tela para alterar os metadados de um material já cadastrado e,
opcionalmente, substituir o seu documento — com o arquivo anterior apagado do armazenamento.

O que mais influencia o desenho não é a alteração dos metadados, que é trivial, e sim a
**irreversibilidade da troca de arquivo**. A decisão central do plano está em uma linha: **o arquivo
novo é gravado sob chave nova, e o antigo só é removido depois que o registro já aponta para o
novo.** Sobrescrever a chave existente é o desenho que qualquer um escreveria primeiro, e é o que
transforma uma falha de escrita em perda definitiva do documento original.

Três decisões estruturais:

1. **Nada de novo no modelo de dados.** Nenhuma coluna, nenhuma tabela, nenhuma migração. A feature
   torna mutável o que já existe e registra a mudança no `AuditLog`, que já existe.
2. **A entrada carrega o conjunto completo de metadados**, reaproveitando os schemas do cadastro.
   Campos opcionais tornariam "omiti a descrição" indistinguível de "mantenha a atual", e uma
   descrição inválida atravessaria a edição sem ser conferida.
3. **O parse do formulário já serve**, sem alteração. `parseMaterialMultipart` já devolve
   `fileBuffer: Buffer | null`, e esse `null` passa a significar "não trocar o documento".

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js >= 20

**Primary Dependencies**: Back — Fastify 5, Prisma 7, Zod 4, MinIO. Front — React 19, Vite 8.
**Nenhuma dependência nova.**

**Storage**: PostgreSQL via Prisma e object storage via `lib/minio.ts`. **Nenhuma migração.**

**Testing**: Vitest — unitário e integração no back, Vitest + Testing Library no front.

**Target Platform**: Aplicação web; a feature toca **as duas pontas**.

**Performance Goals**: Nenhuma meta nova. A substituição de arquivo tem o mesmo custo do upload, que
já é um fluxo aceito.

**Constraints**:

- **A remoção do arquivo anterior é definitiva.** Nenhuma parte do sistema o recupera. Daí a ordem
  de operações, a atomicidade e a confirmação explícita na tela.
- **`REJECTED` é terminal no sistema atual** — o fluxo de revisão só decide sobre material
  `PENDING_REVIEW`. Editar material rejeitado melhora seus dados e não o devolve à fila. Limitação
  anterior a esta feature; ver [research.md](./research.md), item 6.
- **O cadastro de material não grava `AuditLog` hoje**, embora o Princípio III o exija. A edição não
  herda a lacuna — grava desde o primeiro commit.

**Scale/Scope**: 1 rota, 1 schema, 1 service, 1 controller, 1 repositório, 1 tela.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa | `materialPdfEditSchema` validado por `validateRequest` como primeira instrução do service, reaproveitando `titleSchema` e `descriptionSchema` do cadastro. Resposta pela interface `IUploadedMI` já existente. |
| **II. Autorização explícita por perfil** | ✅ Passa | Rota restrita a `ADMIN` por `authorizeByRole(request.user.role, [ADMIN])` no controller, com JSDoc declarando método, path e perfil. **O autor do material não é exceção** — autoria não dá direito de alterar. A transição `APPROVED → PENDING_REVIEW` na troca de arquivo **reforça** o princípio: nenhum documento novo fica publicado sem revisão docente. |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa | `AuditLog` `MI_UPDATED` com o diff dos campos, `InspectionLog` nos dois sentidos no controller, `IN`/`OUT` no service. **Ver a ressalva abaixo.** |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa (não se aplica) | A troca de arquivo tem o mesmo custo do upload, que já roda na request. O trabalho pesado de verdade — vetorização — continua na fila, e a invalidação (FR-014) apenas devolve o estado a `PENDING` para que a aprovação seguinte o reenfileire. |
| **V. Teste acompanha a feature** | ✅ Passa | O FR-023 exige cobrir edição de metadados, substituição de documento, recusa por perfil, recusa por validação, material removido, material sem descrição anterior, e a volta à revisão. Os casos de erro e de autorização negada são obrigatórios. |

### Ressalva ao Princípio III — registrada, não contornada

O fluxo de **cadastro** de material grava apenas log estruturado (`evento: 'mi_enviado'`), **sem
`AuditLog`**, embora o Princípio III liste "upload" entre as ações que o exigem. Aprovação, rejeição
e remoção gravam corretamente.

Isso é **violação pré-existente, anterior a esta feature**, e está registrada aqui porque o portão
do Princípio III não pode ser dado por aprovado com base num registro que não existe. A edição não
depende dele e grava o seu próprio. Corrigir o cadastro é trabalho à parte.

### Restrições de Stack

- *"As telas seguem a estrutura base já consolidada"*: a tela de edição reaproveita a estrutura do
  formulário de cadastro, o `BnccHabilidadePicker` e os limites de
  `features/materials/constants.ts` — a mesma origem, nunca redeclarados.
- *"Nenhum módulo de domínio fala com MinIO diretamente"*: a gravação e a remoção do arquivo passam
  por `lib/minio.ts`, como o upload já faz.
- *"Erro de negócio é `GeneralErrorResponse`"*: perfil não autorizado, material inexistente e
  arquivo inválido seguem o catálogo existente; erro de validação segue o caminho `ZodError` → `422`.

**Resultado do gate: aprovado, com uma ressalva registrada e nenhuma violação introduzida.**
Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/005-material-edit/
├── plan.md              # Este arquivo
├── spec.md              # Especificação
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   └── material-edit.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
MI-server/
└── src/
    ├── schemas/resources/materials/pdf/
    │   └── materialPdfEditSchema.ts            # novo — reaproveita title/description do cadastro
    ├── @types/resources/materials/pdf/
    │   └── index.ts                            # + EditMIInput
    ├── controllers/resources/materials/pdf/
    │   └── materialPdfEditController.ts        # novo — authorizeByRole([ADMIN]) + InspectionLog
    ├── services/resources/materials/pdf/
    │   └── materialPdfEditService.ts           # novo — ordem das operações, diff, auditoria
    ├── repositories/resources/materials/pdf/
    │   └── materialPdfEditRepository.ts        # novo — apenas o update
    ├── lib/
    │   └── minio.ts                            # + remoção de objeto
    └── routes/resources/materials/pdf/
        └── materialPdfUploadRoutes.ts          # + PUT /mis/:id

front/
└── src/
    ├── features/materials/
    │   ├── api/materialsApi.ts                 # + requisição de edição
    │   └── hooks/useEditMaterial.ts            # novo
    ├── pages/
    │   ├── MaterialEditPage.tsx                # novo — a tela de edição
    │   └── MaterialDetailPage.tsx              # + caminho para a edição, visível só ao ADMIN
    └── app/                                    # + rota /mis/:id/edit
```

**Structure Decision**: mantida a estrutura existente, com um arquivo por camada seguindo
`schemas/` → `services/` → `controllers/` → `routes/`. O repositório novo contém **apenas** o
`update` do Prisma; a ordem das operações, o diff e a auditoria moram no service, onde a
constituição os quer.

`parseMaterialMultipart` **não é alterado** — já atende. `lib/minio.ts` ganha a remoção de objeto,
que é a única capacidade de armazenamento que o projeto ainda não usava: o soft delete de material
nunca apagou arquivo.

A tela é uma rota própria, e não uma janela sobreposta, porque o formulário tem o mesmo tamanho do
de cadastro — e a descrição, campo central da feature, precisa de área para ser lida enquanto se
escreve. Ver [research.md](./research.md), item 8.

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação introduzida por esta feature. A ressalva ao Princípio III documentada acima é
**pré-existente** e não decorre de decisão deste plano.
