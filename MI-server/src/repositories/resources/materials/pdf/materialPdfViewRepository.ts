// src/repositories/resources/materials/pdf/materialPdfViewRepository.ts
import { prisma } from '../../../../database/prisma'
import type { IPendingMaterial, IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { withRelatedLinks } from '../../../../utils/readStoredRelatedLinks'

const MI_SELECT = {
  id:               true,
  title:            true,
  description:      true,
  originalFileName: true,
  storageKey:       true,
  mimeType:         true,
  sizeBytes:        true,
  habilidadesBncc:  true,
  relatedLinks:     true,
  status:           true,
  uploadedById:     true,
  createdAt:        true,
  updatedAt:        true,
} as const

export async function findMaterialById(id: string): Promise<IUploadedMI | null> {
  // findFirst (não findUnique) para poder filtrar por deletedAt — soft delete oculta o material
  const mi = await prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: MI_SELECT,
  })
  return mi && withRelatedLinks(mi)
}

// Inclui os dados do autor e organizações — usado na tela de detalhe de um material específico
export async function findMaterialDetailById(id: string): Promise<IPendingMaterial | null> {
  const mi = await prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: {
      ...MI_SELECT,
      vectorStatus:  true, // exposto no detalhe para o front sinalizar o processamento (fila de vetorização)
      uploadedBy:    { select: { name: true, email: true } },
      organizations: { select: { organization: { select: { id: true, name: true } } } },
    },
  })
  return mi && withRelatedLinks(mi)
}
