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
