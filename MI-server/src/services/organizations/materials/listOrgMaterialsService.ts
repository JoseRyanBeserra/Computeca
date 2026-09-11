// src/services/organizations/listOrgMaterialsService.ts
import type { IUploadedMI } from '../../../@types/resources/materials/pdf'
import { findOrgById, findOrgApprovedMaterials } from '../../../repositories/organizations/orgRepository'
import { findMembership } from '../../../repositories/organizations/orgMembersRepository'
import { validateRequest } from '../../../utils/validateRequest'
import { z } from 'zod'
import { ERRORS, buildError } from '../../../lib/errors/errors'
import { GeneralErrorResponse } from '../../../errors/GeneralErrorResponse'
import { StatusCode } from '../../../utils/statusCode'
import { logger } from '../../../lib/logger'

const listOrgMaterialsSchema = z.object({
  orgId:            z.string().uuid(),
  requestingUserId: z.string().uuid(),
})

export async function listOrgMaterialsService(input: unknown): Promise<IUploadedMI[]> {
  logger.info('IN - listOrgMaterialsService')

  const { orgId, requestingUserId } = validateRequest(input, listOrgMaterialsSchema)

  const org = await findOrgById(orgId)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))

  const membership = await findMembership(orgId, requestingUserId)
  if (!membership) throw new GeneralErrorResponse(StatusCode.FORBIDDEN, buildError(ERRORS.ORG.ORG_NOT_MEMBER))

  const materials = await findOrgApprovedMaterials(orgId)

  logger.info('OUT - listOrgMaterialsService')
  return materials
}

