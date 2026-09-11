// src/services/organizations/listMyOrganizationsService.ts
import type { IOrganizationListItem } from '../../@types/organizations'
import { listMyOrgs } from '../../repositories/organizations/orgRepository'
import { validateRequest } from '../../utils/validateRequest'
import { z } from 'zod'
import { logger } from '../../lib/logger'

const listMyOrganizationsSchema = z.object({
  userId: z.string().uuid(),
})

export async function listMyOrganizationsService(input: unknown): Promise<IOrganizationListItem[]> {
  logger.info('IN - listMyOrganizationsService')

  const { userId } = validateRequest(input, listMyOrganizationsSchema)
  const orgs = await listMyOrgs(userId)

  logger.info('OUT - listMyOrganizationsService')
  return orgs
}
