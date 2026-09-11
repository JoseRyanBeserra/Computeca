// src/controllers/organizations/pendingInviteCountController.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { pendingInviteCountService } from '../../../services/organizations/invites/pendingInviteCountService'
import { httpResponse, httpError } from '../../../utils/http'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'
const ctx = 'pendingInviteCountController'

export async function pendingInviteCountController(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  logger.info(`IN - ${ctx}`)

  try {
    const result = await pendingInviteCountService({ userId: request.user.sub })
    httpResponse({ reply, statusCode: StatusCode.OK, data: result, context: ctx })
  } catch (error) {
    httpError({ error, context: ctx })
  }
}

