// src/repositories/organizations/orgRepository.ts
import type { OrgStatus, Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import type {
  IOrganization,
  IOrganizationListItem,
  IOrganizationAdminListResult,
} from '../../@types/organizations'
import type { IUploadedMI } from '../../@types/resources/materials/pdf'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'

const ORG_SELECT = {
  id:          true,
  name:        true,
  description: true,
  status:      true,
  createdById: true,
  createdAt:   true,
  updatedAt:   true,
} as const

export async function findOrgById(id: string): Promise<IOrganization | null> {
  return prisma.organization.findUnique({ where: { id }, select: ORG_SELECT })
}

export async function findOrganization(id: string): Promise<IOrganization> {
  const org = await findOrgById(id)
  if (!org) throw new GeneralErrorResponse(StatusCode.NOT_FOUND, buildError(ERRORS.ORG.ORG_NOT_FOUND))
  return org
}

export async function createOrg(params: {
  name:        string
  description?: string
  createdById: string
}): Promise<IOrganization> {
  return prisma.organization.create({
    data:   { name: params.name, description: params.description, createdById: params.createdById },
    select: ORG_SELECT,
  })
}

export async function updateOrg(
  id: string,
  data: { name?: string; description?: string | null },
): Promise<IOrganization> {
  return prisma.organization.update({ where: { id }, data, select: ORG_SELECT })
}

export async function archiveOrg(id: string): Promise<IOrganization> {
  return prisma.organization.update({
    where:  { id },
    data:   { status: 'ARCHIVED' },
    select: ORG_SELECT,
  })
}

export async function listMyOrgs(userId: string): Promise<IOrganizationListItem[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id:          true,
          name:        true,
          description: true,
          status:      true,
          createdAt:   true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return memberships.map(m => ({
    id:          m.organization.id,
    name:        m.organization.name,
    description: m.organization.description,
    status:      m.organization.status,
    myRole:      m.role,
    memberCount: m.organization._count.members,
    createdAt:   m.organization.createdAt,
  }))
}

/**
 * Listagem administrativa de organizações (todas, não apenas as do usuário).
 * Filtra por status opcional e devolve a contagem de membros de cada uma.
 */
export async function listAllOrgs(params: {
  status?:  OrgStatus
  page?:    number
  perPage?: number
}): Promise<IOrganizationAdminListResult> {
  const { status, page = 1, perPage = 20 } = params
  const where: Prisma.OrganizationWhereInput = {}
  if (status !== undefined) where.status = status

  const [orgs, total] = await prisma.$transaction([
    prisma.organization.findMany({
      where,
      skip:    (page - 1) * perPage,
      take:    perPage,
      select: {
        id:          true,
        name:        true,
        description: true,
        status:      true,
        createdById: true,
        createdAt:   true,
        _count:      { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.count({ where }),
  ])

  return {
    organizations: orgs.map(o => ({
      id:          o.id,
      name:        o.name,
      description: o.description,
      status:      o.status,
      createdById: o.createdById,
      memberCount: o._count.members,
      createdAt:   o.createdAt,
    })),
    total,
    page,
    perPage,
  }
}

export async function findOrgApprovedMaterials(
  orgId: string,
): Promise<IUploadedMI[]> {
  const links = await prisma.materialInstrucionalOrganization.findMany({
    where: { organizationId: orgId, material: { status: 'APPROVED', deletedAt: null } },
    include: {
      material: {
        select: {
          id:               true,
          title:            true,
          originalFileName: true,
          storageKey:       true,
          mimeType:         true,
          sizeBytes:        true,
          habilidadesBncc:  true,
          status:           true,
          uploadedById:     true,
          createdAt:        true,
          updatedAt:        true,
        },
      },
    },
    orderBy: { material: { createdAt: 'desc' } },
  })

  return links.map(l => l.material)
}

export async function linkMaterialToOrgs(
  materialId: string,
  organizationIds: string[],
): Promise<void> {
  if (organizationIds.length === 0) return
  await prisma.materialInstrucionalOrganization.createMany({
    data: organizationIds.map(orgId => ({ materialId, organizationId: orgId })),
    skipDuplicates: true,
  })
}
