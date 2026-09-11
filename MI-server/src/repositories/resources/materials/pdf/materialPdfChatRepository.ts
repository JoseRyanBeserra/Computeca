// src/repositories/resources/materials/pdf/materialPdfChatRepository.ts
import { prisma } from '../../../../database/prisma'
import type { MIStatus, VectorStatus } from '@prisma/client'

export interface MaterialForChat {
  id:           string
  status:       MIStatus
  vectorStatus: VectorStatus
}

export async function findMaterialForChat(id: string): Promise<MaterialForChat | null> {
  return prisma.materialInstrucional.findFirst({
    where:  { id, deletedAt: null },
    select: { id: true, status: true, vectorStatus: true },
  })
}
