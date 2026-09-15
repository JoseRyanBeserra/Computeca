// src/schemas/resources/materials/pdf/materialPdfEditSchema.ts
//
// Validação de entrada da edição de material (`PUT /mis/:id`).
//
// Os schemas de título, descrição e habilidades vêm do CADASTRO, importados —
// não redeclarados. É o que garante que a regra seja literalmente a mesma nos
// dois fluxos: mudar o mínimo da descrição passa a valer no cadastro e na edição
// de uma vez, sem depender de alguém lembrar do segundo lugar.
import { z } from 'zod'
import {
  titleSchema,
  descriptionSchema,
  habilidadesBnccSchema,
  relatedLinksSchema,
} from './materialPdfUploadSchema'

/**
 * Título e descrição são OBRIGATÓRIOS na edição, nunca opcionais.
 *
 * Com campos opcionais, "omiti a descrição" seria indistinguível de "mantenha a
 * que está", e um material com descrição inválida atravessaria a edição sem
 * nunca ser conferido. Exigindo o conjunto completo, toda edição revalida tudo,
 * e a regra não tem como ser contornada pela porta da edição.
 *
 * Isso não pesa para quem usa: o formulário já abre preenchido com os valores
 * atuais, então o conjunto completo é o que a tela naturalmente devolve.
 */
export const materialPdfEditSchema = z.object({
  materialId:      z.string().uuid(),
  title:           titleSchema,
  description:     descriptionSchema,
  habilidadesBncc: habilidadesBnccSchema,
  // Mesmo schema do cadastro: esquema perigoso não entra pela porta da edição.
  relatedLinks:    relatedLinksSchema,
  editedById:      z.string().uuid(),
})

export type MaterialPdfEditServiceInput = z.infer<typeof materialPdfEditSchema>
