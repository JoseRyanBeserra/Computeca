// src/services/organizations/createOrganizationService.ts
import type { IOrganization } from '../../@types/organizations'
import { prisma } from '../../database/prisma'
import { createAuditLog } from '../../repositories/audit/auditRepository'
import { validateRequest } from '../../utils/validateRequest'
import { createOrganizationSchema, type CreateOrganizationServiceInput } from '../../schemas/organizations/createOrganizationSchema'
import { logger } from '../../lib/logger'

export async function createOrganizationService(input: CreateOrganizationServiceInput): Promise<IOrganization> {
  logger.info('IN - createOrganizationService')

  const { name, description, createdById } = validateRequest(input, createOrganizationSchema)

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data:   { name, description, createdById },
      select: { id: true, name: true, description: true, status: true, createdById: true, createdAt: true, updatedAt: true },
    })

    await tx.organizationMember.create({
      data: { organizationId: created.id, userId: createdById, role: 'ADMIN' },
    })

    return created
  })

  await createAuditLog({
    actorId:  createdById,
    targetId: org.id,
    action:   'ORGANIZATION_CREATED',
    metadata: { name: org.name },
  })

  logger.info('OUT - createOrganizationService')
  return org
}
