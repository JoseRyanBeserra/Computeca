// src/repositories/resources/materials/pdf/materialPdfReviewRepository.ts
import { prisma } from '../../../../database/prisma'
import type { IUploadedMI } from '../../../../@types/resources/materials/pdf'

const MI_SELECT = {
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
} as const

export async function updateMaterialStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<IUploadedMI> {
  return prisma.materialInstrucional.update({
    where:  { id },
    data:   { status },
    select: MI_SELECT,
  })
}
