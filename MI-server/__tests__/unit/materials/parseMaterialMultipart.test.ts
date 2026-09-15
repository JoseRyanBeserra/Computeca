// __tests__/unit/materials/parseMaterialMultipart.test.ts
// Feature 004 — leitura do campo `relatedLinks` no formulário compartilhado
// pelos dois caminhos de cadastro e pela edição.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest } from 'fastify'

vi.mock('../../../src/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { parseMaterialMultipart } from '../../../src/controllers/resources/materials/pdf/shared/parseMaterialMultipart'
import { logger } from '../../../src/lib/logger'

/** Simula `request.parts()` com campos de texto, na ordem informada. */
function requestComCampos(campos: Array<[string, string]>): FastifyRequest {
  return {
    parts: async function* () {
      for (const [fieldname, value] of campos) {
        yield { type: 'field', fieldname, value }
      }
    },
  } as unknown as FastifyRequest
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseMaterialMultipart — relatedLinks', () => {
  it('lê o campo como array JSON numa única parte, preservando a ordem', async () => {
    const links = [
      { label: 'Videoaula', url: 'https://exemplo.org/aula' },
      { label: 'Planilha',  url: 'https://exemplo.org/planilha' },
    ]

    const parsed = await parseMaterialMultipart(
      requestComCampos([['relatedLinks', JSON.stringify(links)]]),
    )

    expect(parsed.relatedLinks).toEqual(links)
  })

  it('campo ausente vira lista vazia', async () => {
    const parsed = await parseMaterialMultipart(requestComCampos([['title', 'Guia']]))

    expect(parsed.relatedLinks).toEqual([])
  })

  it('JSON malformado vira lista vazia com advertência, sem lançar', async () => {
    const parsed = await parseMaterialMultipart(
      requestComCampos([['relatedLinks', '[{"label": "Videoaula", "url": ']]),
    )

    expect(parsed.relatedLinks).toEqual([])
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('JSON válido que não é lista segue adiante, para o schema recusar', async () => {
    const parsed = await parseMaterialMultipart(
      requestComCampos([['relatedLinks', '{"label":"Videoaula"}']]),
    )

    expect(parsed.relatedLinks).toEqual({ label: 'Videoaula' })
  })

  it('não interfere nos demais campos', async () => {
    const parsed = await parseMaterialMultipart(
      requestComCampos([
        ['title', 'Guia'],
        ['relatedLinks', '[]'],
        ['habilidadesBncc', 'EF06CO01'],
      ]),
    )

    expect(parsed.title).toBe('Guia')
    expect(parsed.habilidadesBncc).toEqual(['EF06CO01'])
    expect(parsed.relatedLinks).toEqual([])
  })
})
