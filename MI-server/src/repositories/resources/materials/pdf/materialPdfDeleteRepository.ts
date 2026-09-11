// src/repositories/resources/materials/pdf/materialPdfDeleteRepository.ts
import { prisma } from '../../../../database/prisma'

/**
 * Soft delete de um material: marca `deletedAt`/`deletedById` apenas quando ainda
 * não estiver deletado. Retorna `true` quando o material foi efetivamente ocultado
 * (count === 1) e `false` quando não existia ou já estava deletado.
 */
export async function softDeleteMaterial(id: string, deletedById: string): Promise<boolean> {
  const { count } = await prisma.materialInstrucional.updateMany({
    where: { id, deletedAt: null },
    data:  { deletedAt: new Date(), deletedById },
  })
  return count === 1
}
