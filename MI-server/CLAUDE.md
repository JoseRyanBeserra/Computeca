# MI-server — Convenções de código

API REST em **Fastify + TypeScript + Prisma**. Siga estas convenções em toda adição ou alteração.

---

## Estrutura de pastas

```
src/
├── @types/domain/index.ts          # interfaces públicas de resposta (IEntidade)
├── schemas/domain/nomeFluxoSchema.ts
├── services/domain/[subfolder/]nomeFluxoService.ts
├── controllers/domain/[subfolder/]nomeFluxoController.ts
├── repositories/domain/nomeRepositorio.ts
├── routes/domain/domainRoutes.ts
├── middlewares/
├── lib/          # mailer, logger, minio
├── utils/        # http, statusCode, validateRequest, hash…
└── errors/       # GeneralErrorResponse, errorHandler
```

Quando um domínio tem grupos de features distintos (ex.: `organizations` tem invites / members / materials), services e controllers ficam em **subpastas** (`invites/`, `members/`, `materials/`). O CRUD principal do domínio fica na raiz da pasta.

---

## Nomenclatura

- Todas as entidades presentes, como Contratos de dados de entrada/saída devem ter seus tipos definidos
- Exemplo:
  a. {name, email} --> ICreateUserRequest
  b. user: IUser = User.findById(...);
  c. response: IUserResponse = createResponse(userData);

| Artefato                    | Padrão                   | Exemplo                                |
| --------------------------- | ------------------------ | -------------------------------------- |
| Tipo de body (request)      | `INomeFluxoRequest`      | `CreateOrganizationRequest`            |
| Tipo de resposta (response) | `INomeFluxoResponse`     |
| Schema service (Zod)        | `nomeFluxoSchema`        | `createOrganizationSchema`             |
| Interface de resposta       | `IEntidade`              | `IOrganization`, `IOrganizationMember` |
| Arquivo de service          | `nomeFluxoService.ts`    | `createOrganizationService.ts`         |
| Arquivo de controller       | `nomeFluxoController.ts` | `createOrganizationController.ts`      |

---

## Schema (`src/schemas/`)

Cada feature tem seu próprio arquivo com dois exports:

```ts
// 1. Schema do body — usado para tipar o request no controller
export const CreateOrganizationBodySchema = z.object({ ... })
export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationBodySchema>

// 2. Schema do service — inclui campos vindos do contexto de auth (userId, etc.)
export const createOrganizationSchema = z.object({ ...body, createdById: z.string().uuid() })
export type CreateOrganizationServiceInput = z.infer<typeof createOrganizationSchema>
```

---

## Controller

```ts
const ctx = 'createOrganizationController'

export async function createOrganizationController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  const body = request.body as CreateOrganizationRequest
  // Para path params: const { orgId } = request.params as { orgId: string }

  // 1. InspectionLog CLIENT_TO_SERVER — sempre antes do try/catch
  await createInspectionLog({ correlationId: request.user.sub, context: ctx, direction: 'CLIENT_TO_SERVER', payload: [...] })
    .catch((err) => logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`))

  try {
    // 2. Autorização in-function (quando não há middleware de rota)
    authorizeByRole(request.user.role, [PROFESSOR, ADMIN])

    const result = await createOrganizationService({ ...body, createdById: request.user.sub })

    // 3. InspectionLog SERVER_TO_CLIENT — sucesso
    await createInspectionLog({ ..., direction: 'SERVER_TO_CLIENT', payload: [...] })
      .catch((err) => logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`))

    httpResponse({ reply, statusCode: StatusCode.CREATED, data: result, context: ctx })
  } catch (error) {
    // 4. InspectionLog SERVER_TO_CLIENT — erro
    await createInspectionLog({ ..., direction: 'SERVER_TO_CLIENT', payload: [{ title: 'Erro - ...', content: { message, code } }] })
      .catch((err) => logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`))

    httpError({ error, context: ctx })
  }
}
```

---

## Service

```ts
export async function createOrganizationService(
  input: CreateOrganizationServiceInput,
): Promise<IOrganization> {
  logger.info("IN - createOrganizationService");

  const { name, description, createdById } = validateRequest(
    input,
    createOrganizationSchema,
  );

  // lógica de negócio, prisma, auditLog…

  logger.info("OUT - createOrganizationService");
  return result;
}
```

- Sempre valida a entrada com `validateRequest(input, schema)` — lança `ZodError` capturado pelo errorHandler global (→ 422).
- Lança `new GeneralErrorResponse(StatusCode.XYZ, buildError(ERRORS.DOMAIN.CODE))` para erros de negócio.

---

## Erros

```ts
// Lançar
throw new GeneralErrorResponse(
  StatusCode.NOT_FOUND,
  buildError(ERRORS.ORG.ORG_NOT_FOUND),
);

// Adicionar novo erro
// 1. src/lib/errors/errors.ts  → adicionar chave no objeto ERRORS correto
// 2. src/lib/errors/errorMessages.ts → adicionar mensagem em pt-BR e en-US
```

---

## Middlewares disponíveis

| Middleware                       | O que faz                                                | Quando usar                                   |
| -------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `authenticate`                   | Injeta `request.user.sub` (userId) e `request.user.role` | Toda rota autenticada                         |
| `requireUploadPermission`        | Bloqueia quem não pode fazer upload                      | Rotas de upload de MI                         |
| `authorizeByRole(role, [roles])` | Autorização granular in-function                         | Quando a permissão depende de contexto da org |

---

## Rotas

```ts
// Registrar no arquivo de rotas do domínio
app.post("/", { preHandler: [authenticate] }, createOrganizationController);
app.post(
  "/:orgId/mis",
  { preHandler: [authenticate, requireUploadPermission] },
  uploadOrgMaterialController,
);

// Comentário JSDoc antes de cada rota: método, path, quem pode acessar
/** POST /organizations — cria organização (PROFESSOR, ADMIN) */
```

---

## Repositórios

- Um arquivo por agregado (`orgRepository.ts`, `orgMembersRepository.ts`).
- Funções nomeadas pela operação: `findOrgById`, `createInvite`, `updateInviteStatus`.
- Não contêm lógica de negócio — apenas queries Prisma.

---

## Tipos públicos (`@types/`)

- Prefixo `I` para interfaces de entidade retornadas pela API: `IOrganization`, `IUser`.
- Apenas shapes de resposta — inputs ficam nos schemas.

## Testes automatizados

- TODAS as features feitas devem ter seus testes jest implementados, cobrindo 100% (ou proximo) do coverage da function relacionada

---

## Funcionalidades de IA — interruptor de dois níveis

Chat com PDF, resumo automático e vetorização são **desativáveis globalmente**.
O padrão do projeto é desligado.

```
disponibilidadeEfetiva = AI_FEATURES_ENABLED && (AppSetting["ai.enabled"] ?? true)
```

| Nível | Onde | Como ler no código | Exige reinício? |
| --- | --- | --- | --- |
| Ambiente (mestre) | `AI_FEATURES_ENABLED` em `src/env.ts` | `isAiManageable()` | Sim |
| Administração | `AppSetting["ai.enabled"]` | — | Não |
| **Efetiva** | conjunção dos dois | `await isAiEnabled()` | — |

Ambos em `src/constants/features.ts`. O resolvedor usa cache de processo:
**invalide com `invalidateAiAvailabilityCache()` após qualquer escrita.**

### Regras ao mexer em código de IA

- **Nunca abra conexão no corpo do módulo.** `lib/queue.ts` e `lib/openai.ts`
  expõem `getVectorizeQueue()` e `getOpenAiClient()`, criados sob demanda.
  `getVectorizeQueue()` retorna `null` com a IA desativada — trate o `null`.
- **Rota nova de IA** leva `requireAiEnabled` como `preHandler`, sempre **depois**
  de `authenticate`: sem token o retorno é `401`, não `503`.
- **Campo de IA em resposta** passa por `omitAiFields` / `omitAiFieldsFromList`
  na camada de **service**. Repositório não decide isso — ele só consulta.
- **Serviço de apoio novo** entra no `profiles: ["ai"]` do Compose e ganha
  verificação em `lib/aiReadiness.ts`.

Referência completa: `specs/001-disable-ai-features/`.

---

## Cadastro de material — campos obrigatórios

`POST /mis` e `POST /organizations/:orgId/mis` exigem:

| Campo | Regra |
| --- | --- |
| `title` | 1 a 255 caracteres, após `trim`. O servidor **não** recorre mais ao nome do arquivo |
| `description` | 50 a 2000 caracteres, após `trim`. Limites **inclusivos** |

A regra vive em `schemas/resources/materials/pdf/materialPdfUploadSchema.ts` e é aplicada por
`validateRequest` **no service** — não só no controller, para que chamada interna inválida também
seja recusada. A recusa sai como `422` pelo `ErrorHandler` global, caminho padrão de erro de
validação no projeto.

### Ao mexer no formulário de cadastro

- **Leia o multipart por `controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts`**,
  nunca com um laço próprio de `request.parts()`. Os dois controllers usam o mesmo módulo — é o que
  impede os caminhos de divergirem nos campos exigidos.
- **Campo novo entra no schema**, não em validação espalhada pelo controller.

### Coluna `description`

Nullable no banco, obrigatória na entrada. `null` significa **"cadastrado antes da exigência"**,
não vazio — o schema recusa string vazia, então nenhum material novo chega a `''`. A tela de
detalhes usa essa distinção para indicar ausência sem parecer erro.

---

## Edição de material — `PUT /mis/:id`

Restrita a **ADMIN, e somente ele**: nem PROFESSOR, nem o autor do material. Autoria não dá direito
de alterar.

O corpo carrega o **conjunto completo** dos metadados editáveis (`title`, `description`,
`habilidadesBncc`), nunca um subconjunto: campo opcional tornaria "omiti a descrição"
indistinguível de "mantenha a atual", e uma descrição inválida atravessaria a edição sem ser
conferida. O schema **importa** `titleSchema` e `descriptionSchema` do cadastro — não os redeclara.

`file` é opcional; sua ausência significa "manter o documento atual".

### A ordem das operações da troca de arquivo — não simplifique

```
1. valida o arquivo novo      — antes de tocar em qualquer coisa
2. grava sob CHAVE NOVA       — o antigo segue íntegro e servível
3. atualiza o registro        — só agora o material aponta para o novo
4. remove o arquivo antigo    — por último, e só por último
```

**Sobrescrever a chave existente parece mais simples e destrói o documento original antes de se
saber se o novo chegou inteiro.** A remoção é definitiva: nada no sistema recupera o objeto apagado.

O tratamento de falha é assimétrico de propósito:

| Falha ao | Resultado |
| --- | --- |
| Gravar o arquivo novo | Nada mudou |
| Atualizar o registro | Remove o arquivo novo e desfaz. Nada mudou |
| **Remover o antigo** | **A edição vale.** Advertência no log — arquivo órfão é incômodo, material sem documento é tela quebrada |

Trocar o documento de material `APPROVED` o devolve a `PENDING_REVIEW` (a aprovação foi dada a outro
documento) e **invalida resumo e vetorização**, que descreviam o arquivo que saiu.

### Auditoria

`AuditLog` com ação `MI_UPDATED` e `metadata` contendo **apenas os campos alterados**, cada um com
`from` e `to` — o diff sai de `utils/buildMaterialEditDiff.ts`, função pura. Edição que não altera
nada **não atualiza e não registra**.

### Verificações de arquivo

Vivem em `utils/materialFile.ts` e são consumidas pelo cadastro **e** pela edição. Não duplique:
um arquivo que o cadastro recusaria não pode entrar pela porta da edição.

Referência completa: `specs/005-material-edit/`.
