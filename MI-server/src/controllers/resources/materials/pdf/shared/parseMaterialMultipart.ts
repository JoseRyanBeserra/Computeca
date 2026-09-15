// src/controllers/resources/materials/pdf/shared/parseMaterialMultipart.ts
//
// Leitura do formulário de cadastro de material, compartilhada pelos DOIS
// caminhos de upload: `POST /mis` e `POST /organizations/:orgId/mis`.
//
// Antes desta feature cada controller percorria `request.parts()` por conta
// própria. Acrescentar um campo obrigatório em dois laços independentes é o
// caminho mais curto para eles divergirem — e material sem descrição voltar a
// entrar pela porta da organização. Unificar torna a garantia estrutural em vez
// de depender de alguém lembrar de alterar os dois.
import type { FastifyRequest } from 'fastify'
import { logger } from '../../../../../lib/logger'

export interface ParsedMaterialMultipart {
  fileBuffer:       Buffer | null
  originalFileName: string | null
  mimeType:         string | null
  title:            string | undefined
  description:      string | undefined
  habilidadesBncc:  string[]
  /**
   * Links relacionados como vieram do formulário, ainda NÃO validados — quem
   * decide se servem é o schema do service. `[]` quando o campo não veio.
   */
  relatedLinks:     unknown
  organizationIds:  string[]
}

/**
 * O par rótulo/endereço atravessa o multipart como um array JSON numa única
 * parte. JSON malformado vira lista vazia com advertência: a requisição não cai
 * por erro de parse. Já um JSON válido que não é lista segue adiante, para o
 * schema recusar com 422 em vez de ser descartado em silêncio.
 */
function parseRelatedLinksField(raw: string): unknown {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    logger.warn({ tamanho: raw.length }, 'parseMaterialMultipart: relatedLinks com JSON malformado — tratado como lista vazia')
    return []
  }
}

async function collectBuffer(stream: AsyncIterable<Buffer>): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function parseMaterialMultipart(
  request: FastifyRequest,
): Promise<ParsedMaterialMultipart> {
  let fileBuffer:       Buffer | null = null
  let originalFileName: string | null = null
  let mimeType:         string | null = null
  let title:            string | undefined
  let description:      string | undefined
  const habilidadesBncc: string[] = []
  let relatedLinks:      unknown  = []
  const organizationIds: string[] = []

  for await (const part of request.parts()) {
    if (part.type === 'field') {
      if (part.fieldname === 'title') {
        title = String(part.value).trim()
      } else if (part.fieldname === 'description') {
        description = String(part.value).trim()
      } else if (part.fieldname === 'habilidadesBncc' || part.fieldname === 'habilidadesBncc[]') {
        // Aceita repetições do campo (uma habilidade por parte) ou um JSON array
        // em uma única parte.
        const raw = String(part.value).trim()
        if (raw.startsWith('[')) {
          try {
            const parsed: unknown = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              for (const h of parsed) habilidadesBncc.push(String(h).trim())
            }
          } catch {
            if (raw) habilidadesBncc.push(raw)
          }
        } else if (raw) {
          habilidadesBncc.push(raw)
        }
      } else if (part.fieldname === 'relatedLinks') {
        relatedLinks = parseRelatedLinksField(String(part.value).trim())
      } else if (part.fieldname === 'organizationIds[]' || part.fieldname === 'organizationIds') {
        organizationIds.push(String(part.value).trim())
      }
    } else {
      if (part.fieldname === 'file') {
        originalFileName = part.filename
        mimeType         = part.mimetype
        fileBuffer       = await collectBuffer(part.file)
      } else {
        // Consome partes inesperadas para não bloquear o stream.
        part.file.resume()
      }
    }
  }

  // Remove vazios e duplicados, preservando a ordem de envio.
  const normalizedHabilidades = [...new Set(habilidadesBncc.filter(Boolean))]

  return {
    fileBuffer,
    originalFileName,
    mimeType,
    title,
    description,
    habilidadesBncc: normalizedHabilidades,
    relatedLinks,
    organizationIds: [...new Set(organizationIds.filter(Boolean))],
  }
}
