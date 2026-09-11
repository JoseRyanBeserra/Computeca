// src/services/organizations/updateOrganizationService.ts
import type { IOrganization } from '../../@types/organizations'
import { findOrgById, updateOrg } from '../../repositories/organizations/orgRepository'
import { findMembership } from '../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../utils/validateRequest'
import { updateOrganizationSchema } from '../../schemas/organizations/updateOrganizationSchema'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import { logger } from '../../lib/logger'

export async function updateOrganizationService(input: unknown): Promise<IOrganization> {
  logger.info('IN - updateOrganizationService')

  const { orgId, requestingUserId, name, description } = validateRequest(input, updateOrganizationSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))
  if (org.status === 'ARCHIVED') throw new GeneralErrorResponse(StatusCode.BAD_REQUEST, buildError(ERRORS.ORG.ORG_ARCHIVED))

  const membership = await findMembership(orgId, requestingUserId)
  const isOrgAdmin = membership?.role === 'ADMIN'

  if (!isOrgAdmin) throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_STAFF))

  const updated = await updateOrg(orgId, { name, description })

  logger.info('OUT - updateOrganizationService')
  return updated
}
