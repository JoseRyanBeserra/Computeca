// src/repositories/organizations/createOrganizationRepository.ts
import { prisma } from '../../database/prisma'
import type { IOrganization } from '../../@types/organizations'

export async function createOrganization(params: {
  name:        string
  description?: string
  createdById: string
}): Promise<IOrganization> {
  return await prisma.organization.create({
    data: {
      name:        params.name,
      description: params.description,
      createdById: params.createdById,
    },
    select: {
      id:          true,
      name:        true,
      description: true,
      status:      true,
      createdById: true,
      createdAt:   true,
      updatedAt:   true,
    },
  })
}
