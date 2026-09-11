# Implementation Plan: Links Relacionados do Material Instrucional

**Branch**: `004-material-links` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-material-links/spec.md`

## Summary

Acrescentar ao material uma lista opcional de links relacionados — rótulo e endereço —, informada
no cadastro e exibida na tela de detalhes como botões com a aparência dos chips de habilidade BNCC.

O achado que mais influencia o desenho veio de verificação empírica: **`z.string().url()` aceita
`javascript:alert(1)`**, e também `data:`, `file:` e `ftp:`. O validador que qualquer pessoa
escolheria primeiro deixa aberto exatamente o buraco que a US3 existe para fechar. A restrição de
esquema precisa ser explícita, e o teste que a prova precisa existir.

Três decisões estruturais:

1. **Os links são um dado embutido no material**, não uma entidade relacionada. Eles pertencem
   inteiramente ao material, nunca são consultados sozinhos e acompanham o soft delete sem precisar
   de cascata.
2. **A aparência é reaproveitada, não recriada.** O chip de habilidade e o botão de link precisam
   parecer irmãos — e vão continuar parecendo daqui a seis meses, quando alguém alterar a cor de um
   deles.
3. **O parse do formulário já é compartilhado** desde a feature 003, então acrescentar um campo
   serve aos dois caminhos de cadastro de uma vez.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js >= 20

**Primary Dependencies**: Back — Fastify 5, Prisma 7, Zod 4. Front — React 19, Vite 8.
**Nenhuma dependência nova.**

**Storage**: PostgreSQL via Prisma. Uma coluna `Json` com valor padrão de lista vazia, em migração
aditiva.

**Testing**: Vitest — unitário e integração no back, Vitest + Testing Library no front.

**Target Platform**: Aplicação web; a feature toca **as duas pontas**.

**Performance Goals**: Nenhuma meta nova. Uma lista de no máximo dez pares de texto não altera o
custo de nenhum fluxo.

**Constraints**:

- **`z.string().url()` não basta** — verificado que aceita `javascript:`, `data:`, `file:` e `ftp:`.
  A restrição a `http`/`https` precisa ser explícita.
- O formulário trafega como `multipart/form-data`, que transporta texto plano — um par
  rótulo/endereço precisa de uma forma de representação acordada entre front e back.
- Materiais anteriores não têm links, e **não precisam de migração de dados**: lista vazia é o
  estado natural de quem nunca informou nenhum.

**Scale/Scope**: 1 coluna, 1 migração, 1 schema, 2 componentes de front, 2 telas.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Justificativa |
|---|---|---|
| **I. Contratos tipados e validados na fronteira** | ✅ Passa | Os links entram no `materialPdfUploadSchema` já existente, validados por `validateRequest` no service. O tipo de resposta `IMaterialLink` acompanha a convenção `IEntidade`. |
| **II. Autorização explícita por perfil** | ✅ Passa | Nenhuma rota nova e nenhuma regra de acesso alterada. Os links acompanham o material: quem pode vê-lo, vê os links. |
| **III. Auditabilidade e observabilidade não-opcionais** | ✅ Passa | O `AuditLog` do upload já registra a criação; os links entram como mais um dado do mesmo evento. Nenhum controller novo, logo nenhum `InspectionLog` novo. |
| **IV. Trabalho pesado é assíncrono** | ✅ Passa (não se aplica) | Validar dez pares de texto não é trabalho pesado. **O sistema não acessa os endereços** — verificar disponibilidade está fora do escopo, e seria justamente o tipo de trabalho que precisaria sair da request. |
| **V. Teste acompanha a feature** | ✅ Passa | O FR-017 exige cobrir exibição com e sem links e as cinco formas de recusa, **nos dois caminhos de cadastro**. O caso do esquema perigoso é obrigatório. |

**Restrições de Stack** — dois pontos:

- *"As telas seguem a estrutura base já consolidada com as cores e designs"*: o requisito de
  aparência é explícito na especificação. O plano o atende **extraindo o estilo do chip para um
  lugar só**, em vez de duplicar as classes — ver `research.md`, item 3.
- *"Erro de negócio é `GeneralErrorResponse`"*: endereço malformado é erro de **validação**, e segue
  o caminho do `ZodError` → `422`, como descrição e título na feature 003.

**Resultado do gate: aprovado, sem violações.** Complexity Tracking permanece vazia.

## Project Structure

### Documentation (this feature)

```text
specs/004-material-links/
├── plan.md              # Este arquivo
├── spec.md              # Especificação
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   └── material-links.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
MI-server/
├── prisma/schema.prisma                        # + relatedLinks Json @default("[]")
└── src/
    ├── schemas/resources/materials/pdf/
    │   └── materialPdfUploadSchema.ts          # + relatedLinksSchema com restrição de esquema
    ├── @types/resources/materials/pdf/
    │   └── index.ts                            # + IMaterialLink e o campo nas respostas
    ├── controllers/resources/materials/pdf/
    │   └── shared/parseMaterialMultipart.ts    # + leitura do campo relatedLinks
    ├── services/resources/materials/pdf/
    │   └── materialPdfUploadService.ts         # repassa os links ao repositório
    └── repositories/resources/materials/pdf/
        ├── materialPdfUploadRepository.ts      # grava a coluna
        ├── materialPdfViewRepository.ts        # + relatedLinks no select
        ├── materialPdfAllListRepository.ts     # + relatedLinks no select
        └── materialPdfPendingListRepository.ts # + relatedLinks no select

front/
└── src/
    ├── components/
    │   ├── chipStyles.ts                       # novo — o estilo compartilhado do chip
    │   ├── HabilidadesBncc.tsx                 # passa a consumir o estilo compartilhado
    │   ├── MaterialLinks.tsx                   # novo — os botões na tela de detalhes
    │   └── MaterialLinkPicker.tsx              # novo — acrescentar/remover no formulário
    ├── features/materials/api/materialsApi.ts  # + relatedLinks no tipo e no envio
    ├── pages/MaterialDetailPage.tsx            # bloco abaixo da descrição
    └── pages/UploadPage.tsx                    # campo de links no formulário
```

**Structure Decision**: mantida a estrutura existente. A novidade é `components/chipStyles.ts`: a
especificação exige que o botão de link tenha **a mesma aparência** do chip de habilidade, e copiar
as classes de um para o outro garante que eles divirjam no dia em que alguém ajustar uma cor.
Extrair o estilo para um lugar só transforma "parecem iguais hoje" em "são iguais por construção" —
mesma lógica que levou a unificar o parse do formulário na feature 003.

`HabilidadesBncc.tsx` passa a consumir esse estilo; seu comportamento não muda.

## Complexity Tracking

> Preenchido apenas quando o Constitution Check aponta violações.

Nenhuma violação identificada. Seção intencionalmente vazia.
