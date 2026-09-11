// src/controllers/auth/authController.ts
import { randomUUID } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { type LoginRequest } from "../../schemas/auth/authSchema";
import {
  loginService,
  refreshTokenService,
  logoutService,
} from "../../services/auth/authService";
import {
  createRefreshToken,
  deleteRefreshToken,
} from "../../repositories/auth/authRepository";
import { httpResponse, httpError } from "../../utils/http";
import { ERRORS, buildError } from "../../lib/errors/errors";
import { GeneralErrorResponse } from "../../errors/GeneralErrorResponse";
import { StatusCode } from "../../utils/statusCode";
import { logger } from "../../lib/logger";
import { env } from "../../env";
import { parseDurationToDate } from "../../utils/time";

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export async function loginController(
  request: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply,
): Promise<void> {
  const context = "loginController";
  logger.info(`IN - ${context}`);

  try {
    const user = await loginService(request.body);

    const accessToken = request.server.jwt.sign(
      { sub: user.id, role: user.role, canUpload: user.canUpload },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    );

    const rawRefreshToken = randomUUID();
    await createRefreshToken({
      token: rawRefreshToken,
      userId: user.id,
      expiresAt: parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN),
    });

    reply.setCookie("refreshToken", rawRefreshToken, refreshCookieOptions());

    httpResponse({
      reply,
      statusCode: 200,
      data: { accessToken, user },
      context,
    });
  } catch (error) {
    httpError({ error, context });
  }
}

// ── refreshController ──────────────────────────────────────────────────────────

export async function refreshController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const context = "refreshController";
  logger.info(`IN - ${context}`);

  try {
    const token = request.cookies.refreshToken;
    if (!token) throw new GeneralErrorResponse(StatusCode.UNAUTHORIZED, buildError(ERRORS.AUTH.UNAUTHORIZED));

    const user = await refreshTokenService(token);

    // Rotação do refresh token — invalida o anterior, emite um novo
    await deleteRefreshToken(token);
    const newRawToken = randomUUID();
    await createRefreshToken({
      token: newRawToken,
      userId: user.id,
      expiresAt: parseDurationToDate(env.JWT_REFRESH_EXPIRES_IN),
    });

    const accessToken = request.server.jwt.sign(
      { sub: user.id, role: user.role, canUpload: user.canUpload },
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    );

    reply.setCookie("refreshToken", newRawToken, refreshCookieOptions());

    httpResponse({ reply, statusCode: 200, data: { accessToken }, context });
  } catch (error) {
    httpError({ error, context });
  }
}

// ── logoutController ───────────────────────────────────────────────────────────

export async function logoutController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const context = "logoutController";
  logger.info(`IN - ${context}`);

  try {
    const token = request.cookies.refreshToken;

    if (token) {
      await logoutService(token);
    }

    reply.clearCookie("refreshToken", { path: "/" });

    httpResponse({ reply, statusCode: 204, data: null, context });
  } catch (error) {
    httpError({ error, context });
  }
}
