# Computeca Constitution

Plataforma de gestão e disseminação de Materiais Instrucionais (MIs) do Campus IV da UFPB.
Este documento define as regras inegociáveis do projeto. Toda spec, todo plano e todo PR são
avaliados contra ele.

## Core Principles

### I. Contratos Tipados e Validados na Fronteira

Todo dado que cruza a fronteira da API tem tipo declarado e validação em runtime.

- Body de requisição: `INomeFluxoRequest`, derivado de um schema Zod `NomeFluxoBodySchema`.
- Entrada de service: `nomeFluxoSchema` (body + contexto de auth), validada com
  `validateRequest(input, schema)` como primeira instrução do service.
- Resposta pública: interface `IEntidade` em `src/@types/domain/`.
- Nenhum `any` em assinatura pública; nenhum acesso a `request.body` sem cast para o tipo do fluxo.

**Rationale**: o `ZodError` capturado pelo errorHandler global vira 422 automaticamente. Validar
apenas no controller deixa o service exposto a chamadas internas inválidas — por isso a validação
mora no service, não na rota.

### II. Autorização Explícita por Perfil

Toda rota declara quem pode acessá-la. Não existe rota cujo perfil autorizado seja implícito.

- Perfis: `COMMON`, `INSTITUTIONALIZED`, `PROFESSOR`, `ADMIN` (mais `OrgMemberRole` no escopo de
  organização). Rota pública é decisão consciente, registrada em JSDoc.
- Toda rota autenticada usa o preHandler `authenticate`; permissão granular usa
  `requireUploadPermission` ou `authorizeByRole(request.user.role, [...])` dentro do controller.
- Cada rota carrega JSDoc com método, path e perfis autorizados.
- Submissão de MI por `INSTITUTIONALIZED` **MUST** entrar como `PENDING_REVIEW` e só transita para
  `APPROVED` por ação de `PROFESSOR` ou `ADMIN`. Nenhum caminho de código pode publicar MI de
  terceiro sem essa transição.

**Rationale**: a integridade acadêmica do acervo depende da revisão docente. Uma rota que esquece
a checagem de perfil não falha em teste — falha em produção, publicando material não revisado.

### III. Auditabilidade e Observabilidade Não-Opcionais

Quem fez, o quê, quando e a que custo é sempre recuperável.

- Ação que altera estado (upload, aprovação, rejeição, soft delete, convite, mudança de papel)
  **MUST** gravar `AuditLog` com `actorId`, `actorRole`, `targetId`, `action` e `metadata`.
- Todo controller grava `InspectionLog` `CLIENT_TO_SERVER` antes do try/catch e `SERVER_TO_CLIENT`
  nos caminhos de sucesso **e** de erro. Falha de escrita de log é capturada e logada, nunca
  derruba a requisição.
- Services e controllers logam `IN - nomeFluxo` e `OUT - nomeFluxo` via `logger`.
- Toda chamada a modelo de IA (resumo, tradução, embedding) **MUST** registrar tokens consumidos,
  operação e usuário responsável.
- Remoção de MI é soft delete (`deletedAt` + `deletedById`); registro nunca é apagado fisicamente.

**Rationale**: o projeto exige auditabilidade total e rastreio de custo de IA. Log adicionado
depois nunca reconstrói o histórico perdido.

### IV. Trabalho Pesado é Assíncrono

A API Fastify responde rápido; trabalho caro vai para a fila.

- Vetorização, OCR, parsing de PDF, tradução e geração de resumo **MUST** ser enfileirados em
  BullMQ/Redis e processados por worker em `src/workers/`. Nenhum deles roda no ciclo da request.
- Todo processamento assíncrono expõe estado via enum com `PENDING`, `PROCESSING`, `DONE`, `FAILED`
  (padrão de `VectorStatus` e `SummaryStatus`), persistido na própria entidade.
- Jobs **MUST** ser idempotentes: reprocessar o mesmo job não duplica dados nem custo.
- Falha de worker transiciona para `FAILED` com causa registrada — nunca deixa o registro preso em
  `PROCESSING`.

**Rationale**: upload de MI com OCR pode levar minutos. Fazer isso na request derruba a API sob
carga e não dá ao usuário forma de acompanhar o progresso.

### V. Teste Acompanha a Feature

Feature sem teste não está pronta.

- Back-end: Vitest, testes unitários por service/controller (`vitest.unit.config.ts`) e de
  integração para fluxos que cruzam camadas (`vitest.integration.config.ts`).
- Front-end: Vitest + Testing Library, arquivo `.test.tsx` ao lado do componente.
- Cobertura das funções tocadas pela feature **MUST** chegar a 100% ou justificar o que ficou fora.
- Caminhos de erro e de autorização negada são casos de teste obrigatórios, não opcionais.

**Rationale**: a infraestrutura de teste já está montada nas duas pontas. O custo de escrever o
teste junto é baixo; o de retroagir cobertura em código já entregue é alto.

## Restrições de Stack e Infraestrutura

- **Runtime**: Node >= 20, TypeScript em modo estrito nas duas pontas.
- **Back-end**: Fastify 5, Prisma 7 sobre PostgreSQL, Zod 4 via `@fastify/type-provider-zod`.
- **Front-end**: React 19 + Vite. O layout base (barra de pesquisa, título "Computeca", submenu à
  esquerda) permanece em toda tela; telas novas herdam cores e componentes já consolidados.
- **Armazenamento de arquivos**: sempre através de `src/lib/minio.ts`. Nenhum módulo de domínio
  fala com MinIO ou S3 diretamente — a troca Dev (MinIO) → Produção (S3) é transparente.
- **Busca semântica**: Qdrant via `src/lib/qdrant.ts`. Busca por significado não se resolve com
  `LIKE`; busca textual trivial não justifica ingressar vetores.
- **Filas**: Redis + BullMQ via `src/lib/queue.ts`.
- **Deploy**: Docker em todos os serviços, Nginx como proxy reverso.
- **Configuração**: toda variável de ambiente é declarada e validada em `src/env.ts`. Segredo em
  código-fonte ou em commit é violação — sem exceção.
- **Modularidade**: funções de IA (tradução, resumo, busca semântica) **MUST** ser desativáveis
  globalmente por painel administrativo, sem redeploy.
- **Erros**: catálogo centralizado em `src/lib/errors/errors.ts`, com mensagem em pt-BR e en-US em
  `errorMessages.ts`. Erro de negócio é `GeneralErrorResponse` com `StatusCode` explícito.
- **Estrutura de pastas**: `schemas/` → `services/` → `controllers/` → `routes/`, com
  `repositories/` contendo apenas queries Prisma, sem lógica de negócio. Domínio com grupos de
  features usa subpastas (ex.: `organizations/invites/`, `organizations/members/`).

## Fluxo de Desenvolvimento

Feature com regra de negócio nasce de uma spec, não de um prompt solto.

1. `/speckit-specify` — cria `specs/NNN-nome/` e a branch correspondente.
2. `/speckit-clarify` — resolve ambiguidades antes de qualquer decisão técnica.
3. `/speckit-plan` — arquitetura, modelo de dados e contratos, validados contra esta constituição.
4. `/speckit-tasks` — tarefas ordenadas por dependência.
5. `/speckit-analyze` — consistência entre spec, plan e tasks antes de escrever código.
6. `/speckit-implement` — execução.

Correção de bug, ajuste de infraestrutura e refactor sem mudança de comportamento dispensam spec
formal.

Portões de revisão de PR — o revisor verifica explicitamente:

- Contratos tipados e `validateRequest` presentes (Princípio I).
- Perfis autorizados declarados em JSDoc e aplicados em código (Princípio II).
- `AuditLog` e `InspectionLog` nos pontos exigidos (Princípio III).
- Nada pesado rodando dentro da request (Princípio IV).
- Testes cobrindo sucesso, erro e autorização negada (Princípio V).

## Governance

Esta constituição prevalece sobre preferência individual, hábito herdado e sobre qualquer sugestão
de agente de IA. Conflito entre este documento e um `CLAUDE.md` resolve-se a favor deste documento,
e o `CLAUDE.md` é corrigido.

**Emenda**: proposta em PR que altere apenas `.specify/memory/constitution.md`, descrevendo o
princípio afetado, a motivação e o impacto em código existente. Emenda que invalide código em
produção **MUST** vir acompanhada de plano de migração.

**Versionamento** (semver):

- MAJOR — remoção ou redefinição incompatível de princípio.
- MINOR — novo princípio ou seção, ou ampliação material de escopo.
- PATCH — esclarecimento, redação, correção sem mudança de significado.

**Conformidade**: revisada a cada PR pelos portões acima. Violação consciente **MUST** ser
registrada no `plan.md` da feature, com justificativa e a alternativa mais simples que foi
descartada. Complexidade não justificada é motivo suficiente para rejeitar o PR.

**Guia de runtime**: `CLAUDE.md` (raiz), `MI-server/CLAUDE.md` e `front/CLAUDE.md` detalham
convenções do dia a dia. São subordinados a esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-09-10 | **Last Amended**: 2026-09-10
