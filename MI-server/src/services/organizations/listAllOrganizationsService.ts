// src/services/organizations/listAllOrganizationsService.ts
import type { IOrganizationAdminListResult } from '../../@types/organizations'
import { listAllOrgs } from '../../repositories/organizations/orgRepository'
import { validateRequest } from '../../utils/validateRequest'
import { ListAllOrganizationsQuerySchema } from '../../schemas/organizations/listAllOrganizationsSchema'
import { logger } from '../../lib/logger'

/**
 * Lista todas as organizações da plataforma (uso administrativo).
 * Filtro opcional por status e paginação — devolve também a contagem total.
 */
export async function listAllOrganizationsService(input: unknown): Promise<IOrganizationAdminListResult> {
  logger.info('IN - listAllOrganizationsService')

  const { status, page, perPage } = validateRequest(input, ListAllOrganizationsQuerySchema)
  const result = await listAllOrgs({ status, page, perPage })

  logger.info('OUT - listAllOrganizationsService')
  return result
}
