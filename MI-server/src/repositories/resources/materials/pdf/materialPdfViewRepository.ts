// src/repositories/resources/materials/pdf/materialPdfViewRepository.ts
import { prisma } from '../../../../database/prisma'
import type { IPendingMaterial, IUploadedMI } from '../../../../@types/resources/materials/pdf'

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

export async function findMaterialById(id: string): Promise<IUploadedMI | null> {
  // findFirst (não findUnique) para poder filtrar por deletedAt — soft delete oculta o material
  return prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: MI_SELECT,
  })
}

// Inclui os dados do autor e organizações — usado na tela de detalhe de um material específico
export async function findMaterialDetailById(id: string): Promise<IPendingMaterial | null> {
  return prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: {
      ...MI_SELECT,
      vectorStatus:  true, // exposto no detalhe para o front sinalizar o processamento (fila de vetorização)
      uploadedBy:    { select: { name: true, email: true } },
      organizations: { select: { organization: { select: { id: true, name: true } } } },
    },
  })
}
