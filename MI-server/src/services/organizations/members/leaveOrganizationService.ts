// src/services/organizations/leaveOrganizationService.ts
import { findOrgById } from '../../../repositories/organizations/orgRepository'
import { findMembership, removeMember } from '../../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

const leaveOrganizationSchema = z.object({
  orgId:  z.string().uuid(),
  userId: z.string().uuid(),
})

export async function leaveOrganizationService(input: unknown): Promise<void> {
  logger.info('IN - leaveOrganizationService')

  const { orgId, userId } = validateRequest(input, leaveOrganizationSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))

  const membership = await findMembership(orgId, userId)
  if (!membership) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_MEMBER))

  // ADMIN cannot leave — must archive the org first
  if (membership.role === 'ADMIN') throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))

  await removeMember(orgId, userId)

  logger.info('OUT - leaveOrganizationService')
}

