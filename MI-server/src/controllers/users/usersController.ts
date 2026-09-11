// src/controllers/users/usersController.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import { type CreateUserRequest } from "../../schemas/users/usersSchema";
import { createUserService } from "../../services/users/usersService";
import { createInspectionLog } from "../../repositories/inspectionLog/inspectionLogRepository";
import { httpResponse, httpError } from "../../utils/http";
import { GeneralErrorResponse } from "../../errors/GeneralErrorResponse";
import { logger } from "../../lib/logger";

export async function createUserController(
  request: FastifyRequest<{ Body: CreateUserRequest }>,
  reply: FastifyReply,
): Promise<void> {
  const ctx = "createUserController";

  logger.info("IN - createUserController");

  await createInspectionLog({
    context:   ctx,
    direction: "CLIENT_TO_SERVER",
    payload: [
      {
        title:   "Request Payload",
        content: {
          method: request.method,
          url:    request.url,
          body:   { name: request.body.name, email: request.body.email },
        },
      },
    ],
  }).catch((err) =>
    logger.error({ err }, `${ctx}: inspectionLog CLIENT_TO_SERVER write failed`),
  );

  try {
    const user = await createUserService(request.body);

    await createInspectionLog({
      context:   ctx,
      direction: "SERVER_TO_CLIENT",
      payload: [
        {
          title:   "DB - Novo usuário criado",
          content: { id: user.id, email: user.email, role: user.role },
        },
        {
          title:   "Resposta",
          content: { statusCode: 201 },
        },
      ],
    }).catch((err) =>
      logger.error({ err }, `${ctx}: inspectionLog SERVER_TO_CLIENT write failed`),
    );

    httpResponse({ reply, statusCode: 201, data: user, context: ctx });
  } catch (error) {
    await createInspectionLog({
      context:   ctx,
      direction: "SERVER_TO_CLIENT",
      payload: [
        {
          title:   "Erro - Criação de usuário",
          content: {
            message: error instanceof Error ? error.message : String(error),
            code:    error instanceof GeneralErrorResponse ? error.code : "INTERNAL_ERROR",
          },
        },
      ],
    }).catch((err) =>
      logger.error({ err }, `${ctx}: inspectionLog ERROR write failed`),
    );

    httpError({ error, context: ctx });
  }
}
