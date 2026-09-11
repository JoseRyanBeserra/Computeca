// src/repositories/resources/materials/pdf/materialPdfPendingListRepository.ts
import { type Prisma } from '@prisma/client'
import { prisma } from '../../../../database/prisma'
import type { IPendingMaterial } from '../../../../@types/resources/materials/pdf'

const PENDING_SELECT = {
  id:               true,
  title:            true,
  originalFileName: true,
  storageKey:       true,
  mimeType:         true,
  sizeBytes:        true,
  habilidadesBncc:  true,
  status:           true,
  vectorStatus:     true,
  uploadedById:     true,
  createdAt:        true,
  updatedAt:        true,
  uploadedBy:    { select: { name: true, email: true } },
  organizations: { select: { organization: { select: { id: true, name: true } } } },
} as const

export async function findPendingMaterials(params: {
  reviewerId:   string
  reviewerRole: string
}): Promise<IPendingMaterial[]> {
  const { reviewerId, reviewerRole } = params

  const where: Prisma.MaterialInstrucionalWhereInput = { status: 'PENDING_REVIEW', deletedAt: null }

  // Req 26: Professors only see org-labeled MIs if they belong to those orgs.
  // ADMINs see everything.
  if (reviewerRole !== 'ADMIN') {
    where.OR = [
      { organizations: { none: {} } },
      {
        organizations: {
          some: {
            organization: {
              members: { some: { userId: reviewerId } },
            },
          },
        },
      },
    ]
  }

  return prisma.materialInstrucional.findMany({
    where,
    select:  PENDING_SELECT,
    orderBy: { createdAt: 'asc' },
  })
}
