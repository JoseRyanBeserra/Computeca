// src/repositories/resources/materials/pdf/materialPdfEditRepository.ts
//
// Apenas a query. Ordem das operações, diff e auditoria vivem no service — o
// repositório não decide nada (Princípio: repositories contêm somente Prisma).
import type { Prisma } from '@prisma/client'
import { prisma } from '../../../../database/prisma'
import type { IMaterialLink, IUploadedMI } from '../../../../@types/resources/materials/pdf'
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

export interface UpdateMaterialInput {
  title:            string
  description:      string
  habilidadesBncc:  string[]
  /** Conjunto completo, já validado no service: substitui a lista atual. */
  relatedLinks:     IMaterialLink[]
  /** Campos de arquivo: presentes somente quando o documento foi substituído. */
  storageKey?:      string
  originalFileName?: string
  mimeType?:        string
  sizeBytes?:       number
  /** Presente somente quando a troca de documento invalidou a aprovação. */
  status?:          'PENDING_REVIEW'
  /**
   * Invalidação dos dados derivados do documento anterior. Vem junto com a
   * troca de arquivo: resumo e vetores descreviam o documento que saiu.
   */
  invalidateAiDerived?: boolean
}

/**
 * Atualiza o material. Um único `update` já é atômico — todos os campos mudam
 * juntos ou nenhum muda, que é o que o FR-011 exige do lado do banco.
 */
export async function updateMaterial(
  id: string,
  input: UpdateMaterialInput,
): Promise<IUploadedMI> {
  const { invalidateAiDerived, relatedLinks, ...campos } = input

  const mi = await prisma.materialInstrucional.update({
    where: { id },
    data: {
      ...campos,
      relatedLinks: relatedLinks as unknown as Prisma.InputJsonValue,
      ...(invalidateAiDerived
        ? {
            summary:            null,
            summaryGeneratedAt: null,
            summaryStatus:      'PENDING' as const,
            vectorStatus:       'PENDING' as const,
          }
        : {}),
    },
    select: MI_SELECT,
  })
  return withRelatedLinks(mi)
}
