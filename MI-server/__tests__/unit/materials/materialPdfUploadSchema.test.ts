// __tests__/unit/materials/materialPdfUploadSchema.test.ts
// FR-005 e FR-011 — limites de descrição e título no cadastro.
//
// Os limites são INCLUSIVOS e a contagem acontece DEPOIS de remover espaços das
// extremidades: ninguém é reprovado por espaços que nem vê, nem aprovado por
// uma descrição de 50 espaços.
import { describe, it, expect } from 'vitest'
import {
  materialPdfUploadSchema,
  DESCRIPTION_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../../src/schemas/resources/materials/pdf/materialPdfUploadSchema'

const BASE = {
  title:            'Guia de Geometria',
  uploadedById:     '0a7de6d0-c06a-42da-91c2-5cd792059340',
  originalFileName: 'guia.pdf',
  mimeType:         'application/pdf',
}

const texto = (n: number) => 'a'.repeat(n)

function parse(overrides: Record<string, unknown>) {
  return materialPdfUploadSchema.safeParse({
    ...BASE,
    description: texto(DESCRIPTION_MIN_LENGTH),
    ...overrides,
  })
}

describe('materialPdfUploadSchema — limites da descrição', () => {
  it(`rejeita com ${DESCRIPTION_MIN_LENGTH - 1} caracteres`, () => {
    expect(parse({ description: texto(DESCRIPTION_MIN_LENGTH - 1) }).success).toBe(false)
  })

  it(`aceita com exatamente ${DESCRIPTION_MIN_LENGTH} — limite inclusivo`, () => {
    expect(parse({ description: texto(DESCRIPTION_MIN_LENGTH) }).success).toBe(true)
  })

  it(`aceita com exatamente ${DESCRIPTION_MAX_LENGTH} — limite inclusivo`, () => {
    expect(parse({ description: texto(DESCRIPTION_MAX_LENGTH) }).success).toBe(true)
  })

  it(`rejeita com ${DESCRIPTION_MAX_LENGTH + 1} caracteres`, () => {
    expect(parse({ description: texto(DESCRIPTION_MAX_LENGTH + 1) }).success).toBe(false)
  })
})

describe('materialPdfUploadSchema — descrição ausente ou em branco', () => {
  it('rejeita quando ausente', () => {
    expect(parse({ description: undefined }).success).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(parse({ description: '' }).success).toBe(false)
  })

  it('rejeita string composta só de espaços e quebras de linha', () => {
    expect(parse({ description: '   \n\n   \t  ' }).success).toBe(false)
  })

  it('conta DEPOIS do trim: 49 caracteres cercados de espaços é rejeitado', () => {
    expect(parse({ description: `   ${texto(DESCRIPTION_MIN_LENGTH - 1)}   ` }).success).toBe(false)
  })
})

describe('materialPdfUploadSchema — normalização da descrição', () => {
  it('aceita descrição válida cercada de espaços e grava o valor já aparado', () => {
    const resultado = parse({ description: `  ${texto(DESCRIPTION_MIN_LENGTH)}  ` })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.description).toBe(texto(DESCRIPTION_MIN_LENGTH))
      expect(resultado.data.description).toHaveLength(DESCRIPTION_MIN_LENGTH)
    }
  })

  it('preserva quebras de linha internas', () => {
    const comParagrafos = `${texto(25)}\n\n${texto(25)}`
    const resultado = parse({ description: comParagrafos })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.description).toContain('\n\n')
    }
  })
})

describe('materialPdfUploadSchema — título obrigatório (FR-011)', () => {
  it('rejeita quando ausente — o servidor não recorre mais ao nome do arquivo', () => {
    expect(parse({ title: undefined }).success).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(parse({ title: '' }).success).toBe(false)
  })

  it('rejeita título só de espaços', () => {
    expect(parse({ title: '    ' }).success).toBe(false)
  })

  it(`aceita com exatamente ${TITLE_MAX_LENGTH} caracteres`, () => {
    expect(parse({ title: texto(TITLE_MAX_LENGTH) }).success).toBe(true)
  })

  it(`rejeita com ${TITLE_MAX_LENGTH + 1} caracteres`, () => {
    expect(parse({ title: texto(TITLE_MAX_LENGTH + 1) }).success).toBe(false)
  })

  it('apara espaços das extremidades do título', () => {
    const resultado = parse({ title: '  Guia de Geometria  ' })

    expect(resultado.success).toBe(true)
    if (resultado.success) expect(resultado.data.title).toBe('Guia de Geometria')
  })
})

describe('materialPdfUploadSchema — habilidades BNCC seguem opcionais', () => {
  it('assume lista vazia quando ausentes', () => {
    const resultado = parse({ habilidadesBncc: undefined })

    expect(resultado.success).toBe(true)
    if (resultado.success) expect(resultado.data.habilidadesBncc).toEqual([])
  })

  it('remove duplicados, vazios e espaços', () => {
    const resultado = parse({ habilidadesBncc: ['EF15LP01', '  EF15LP01  ', '', 'EF67LP03'] })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.habilidadesBncc).toEqual(['EF15LP01', 'EF67LP03'])
    }
  })
})
