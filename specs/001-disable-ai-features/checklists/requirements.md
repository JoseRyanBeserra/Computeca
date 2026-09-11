# Specification Quality Checklist: Desativação Global das Funcionalidades de IA

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-10
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

- Validação concluída em 2026-09-10, todos os itens aprovados. Os dois marcadores
  [NEEDS CLARIFICATION] iniciais foram resolvidos por decisão do responsável pelo projeto.
- **Resolução do controle de disponibilidade** (antigo FR-012): adotado modelo de dois níveis —
  interruptor mestre de ambiente + controle operacional no painel administrativo (FR-013, FR-014).
  Isso **atende** a exigência de modularidade da constituição em vez de abrir exceção a ela: o
  painel governa sem redeploy sempre que a instalação tiver suporte a IA. Nenhuma exceção
  constitucional precisa ser registrada no `plan.md`.
- **Resolução do acervo pendente** (antigo FR-013, agora FR-015): reprocessamento por comando
  administrativo sob demanda, nunca automático, para manter o custo de tokens sob decisão
  consciente.
- Nomes de serviços de infraestrutura foram mantidos genéricos ("serviço de fila", "serviço de
  busca vetorial") para não vazar stack na especificação.

## Emendas após `/speckit-analyze` (2026-09-11)

A análise de consistência apontou seis achados, nenhum CRITICAL ou HIGH. Três foram resolvidos por
decisão do responsável pelo projeto:

- **FR-017 (novo)** — a API passa a **omitir o estado de processamento por IA** das respostas com a
  IA desativada, em vez de apenas escondê-lo na interface. O achado original era que `GET /mis/:id`
  continuaria enviando `vectorStatus`, contradizendo o que `data-model.md` afirmava. Alcance
  verificado no código: três repositórios de payload; as leituras internas de chat e resumo
  permanecem.
- **FR-018 (novo)** — com a IA ligada, a inicialização passa a **verificar o alcance do Redis** e
  avisar quando indisponível. Sem isso, a fila preguiçosa não conectaria no boot e a ausência do
  serviço só apareceria ao aprovar um material.
- **SC-002 reformulado** — a redação anterior ("cai de forma mensurável") não era falseável. O
  critério agora cita o número da medição de referência (~54 MiB de ~533 MiB), e as premissas
  registram que a motivação real é não manter serviços de pé para funcionalidade não usada, não a
  economia de memória.

Também registrado nas premissas que **esta versão não vai para produção** — a alteração em
`docker-compose.prod.yml` é por consistência do repositório, não para atender ambiente ativo.

Os três achados LOW restantes (janela de 5 vs 30 minutos entre US2 e SC-003, verificação de FR-010
apenas por inspeção, sobreposição entre FR-012 e FR-013) foram aceitos como estão. A janela de
verificação em `tasks.md` foi uniformizada em 30 minutos.
