// src/utils/readStoredRelatedLinks.ts
//
// Leitura defensiva da coluna `relatedLinks`.
//
// A coluna é `Json`, e o banco não garante a forma do conteúdo. Em operação
// normal só a aplicação escreve ali, sempre depois de validar — a guarda existe
// para que uma edição manual no banco degrade a exibição (lista vazia) em vez de
// derrubar a tela de detalhes ou pôr na tela um endereço que o cadastro recusaria.
import { z } from 'zod'
import { relatedLinkSchema } from '../schemas/resources/materials/pdf/materialPdfUploadSchema'
import { logger } from '../lib/logger'
import type { IMaterialLink } from '../@types/resources/materials/pdf'

const storedRelatedLinksSchema = z.array(relatedLinkSchema)

export function readStoredRelatedLinks(value: unknown): IMaterialLink[] {
  const resultado = storedRelatedLinksSchema.safeParse(value)
  if (resultado.success) return resultado.data

  logger.warn('readStoredRelatedLinks: conteúdo de relatedLinks fora do formato — tratado como lista vazia')
  return []
}

/** Substitui o `Json` cru vindo do Prisma pela lista já conferida. */
export function withRelatedLinks<T extends { relatedLinks: unknown }>(
  row: T,
): Omit<T, 'relatedLinks'> & { relatedLinks: IMaterialLink[] } {
  return { ...row, relatedLinks: readStoredRelatedLinks(row.relatedLinks) }
}
