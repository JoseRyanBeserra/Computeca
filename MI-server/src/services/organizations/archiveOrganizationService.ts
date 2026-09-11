// src/services/organizations/archiveOrganizationService.ts
import type { IOrganization } from '../../@types/organizations'
import { findOrganization, archiveOrg } from '../../repositories/organizations/orgRepository'
import { requireMembership } from '../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../utils/validateRequest'
import { archiveOrganizationSchema, type ArchiveOrganizationRequest } from '../../schemas/organizations/archiveOrganizationSchema'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

export async function archiveOrganizationService(input: ArchiveOrganizationRequest): Promise<IOrganization> {
  logger.info('IN - archiveOrganizationService')

  const { orgId, requestingUserId } = validateRequest(input, archiveOrganizationSchema)

  const org = await findOrganization(orgId)
  if (org.status === 'ARCHIVED') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.ORG_ARCHIVED))

  const membership = await requireMembership(orgId, requestingUserId)
  if (membership.role !== 'ADMIN') throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))

  const archived = await archiveOrg(orgId)

  logger.info('OUT - archiveOrganizationService')
  return archived
}
