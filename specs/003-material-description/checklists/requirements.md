# Specification Quality Checklist: Descrição Obrigatória do Material Instrucional

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validação concluída em 2026-09-11, todos os itens aprovados. Nenhum marcador de esclarecimento
  restou: os limites de 50 e 2000 caracteres foram definidos pelo responsável antes da redação.
- **Consequência a destacar**: o sistema não possui nenhum caminho de edição de metadados de
  material. A decisão de deixar o acervo existente sem descrição é, portanto, **permanente** —
  não há como preencher esses campos depois sem cadastrar o material novamente. Registrado em
  Assumptions e reportado ao responsável.
- O reconhecimento do código antes da redação revelou dois pontos de entrada de cadastro
  (`POST /mis` e `POST /organizations/:orgId/mis`), o que deu origem à US3. Uma regra aplicada só
  em um dos caminhos não seria regra.
- Também revelou que o **título** hoje é exigido apenas no formulário — o servidor tolera sua
  ausência e recorre ao nome do arquivo. A descrição não seguirá esse padrão: o FR-006 exige
  validação no servidor, porque a obrigatoriedade pedida é de verdade, não de interface.

## Emendas após `/speckit-analyze` (2026-09-11)

A análise apontou cinco achados, incluindo **um CRITICAL**. Os quatro acionáveis foram resolvidos
por decisão do responsável pelo projeto:

- **X1 (CRITICAL) — SC-005 era impossível de cumprir.** Ele exigia que todos os fluxos existentes
  passassem "sem alteração de expectativa", enquanto o FR-004 tornava a descrição obrigatória. As
  duas frases não podiam ser verdade ao mesmo tempo. Reescrito: o que não pode mudar é tudo que não
  seja cadastro; os testes de cadastro acompanham a nova regra, porque tornar um campo obrigatório
  **é** uma mudança de contrato de entrada.
- **G1 (HIGH) — 8 testes quebrariam sem tarefa prevista.** O helper de `materialUpload.test.ts`
  monta o formulário sem descrição. Acrescentadas T013 e T014 na fase fundacional, antes de a
  validação entrar.
- **U1 (MEDIUM) — condicional não resolvida.** A tarefa do front para o caminho de organização
  dizia "se o fluxo usar caminho distinto". Verificado que **não usa**: `uploadMaterialRequest` já
  escolhe a rota por `organizationId`. Tarefa removida.
- **I1 (MEDIUM) — título.** O plano incluiria o título num schema obrigatório de carona, mudando
  seu comportamento sem requisito. Decisão do responsável: **tornar o título obrigatório de
  propósito** (FR-011), removendo o fallback para o nome do arquivo. Verificado no banco que nenhum
  material tem título vazio, então a exigência não cria inconsistência com o acervo.
- **A1 (LOW)** aceito como está: "clara e discreta" é tornado testável pela tarefa correspondente.

Contradição interna corrigida na mesma passagem: o FR-010 dizia que o título permanecia como
estava, o que passou a contradizer o FR-011. Reescrito para falar de fluxos alheios ao cadastro.
