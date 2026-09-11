// src/services/organizations/listOrgMembersService.ts
import type { IOrganizationMember } from '../../../@types/organizations'
import { findOrgById } from '../../../repositories/organizations/orgRepository'
import { findMembership, listMembers } from '../../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

const listOrgMembersSchema = z.object({
  orgId:            z.string().uuid(),
  requestingUserId: z.string().uuid(),
})

export async function listOrgMembersService(input: unknown): Promise<IOrganizationMember[]> {
  logger.info('IN - listOrgMembersService')

  const { orgId, requestingUserId } = validateRequest(input, listOrgMembersSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))

  const membership = await findMembership(orgId, requestingUserId)
  if (!membership) throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_MEMBER))

  const members = await listMembers(orgId)

  logger.info('OUT - listOrgMembersService')
  return members
}

