// src/repositories/resources/materials/pdf/materialPdfUploadRepository.ts
import type { Prisma } from '@prisma/client'
import { prisma } from '../../../../database/prisma'
import type { IMaterialLink, IUploadedMI } from '../../../../@types/resources/materials/pdf'
import { withRelatedLinks } from '../../../../utils/readStoredRelatedLinks'

// Campos retornados em todas as queries — nunca expõe campos internos
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

interface CreateMaterialPdfInput {
  title:            string
  /** Descrição do material — obrigatória no cadastro, validada no service */
  description:      string
  originalFileName: string
  storageKey:       string
  mimeType:         string
  sizeBytes:        number
  /** Opcional — quando ausente o material é criado com lista de habilidades vazia */
  habilidadesBncc?: string[]
  /** Opcional — já validados no service; quando ausentes o material é criado sem links */
  relatedLinks?:    IMaterialLink[]
  uploadedById:     string
}

export async function createMaterialPdf(input: CreateMaterialPdfInput): Promise<IUploadedMI> {
  const mi = await prisma.materialInstrucional.create({
    data: {
      title:            input.title,
      description:      input.description,
      originalFileName: input.originalFileName,
      storageKey:       input.storageKey,
      mimeType:         input.mimeType,
      sizeBytes:        input.sizeBytes,
      habilidadesBncc:  input.habilidadesBncc ?? [],
      relatedLinks:     (input.relatedLinks ?? []) as unknown as Prisma.InputJsonValue,
      uploadedById:     input.uploadedById,
    },
    select: MI_SELECT,
  })
  return withRelatedLinks(mi)
}
