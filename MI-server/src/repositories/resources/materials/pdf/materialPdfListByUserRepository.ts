// src/repositories/resources/materials/pdf/materialPdfListByUserRepository.ts
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

export async function findMaterialsByUserId(userId: string): Promise<IUploadedMI[]> {
  return prisma.materialInstrucional.findMany({
    where:   { uploadedById: userId, deletedAt: null },
    select:  MI_SELECT,
    orderBy: { createdAt: 'desc' },
  })
}
