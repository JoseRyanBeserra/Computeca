// __tests__/unit/materials/buildMaterialEditDiff.test.ts
import { describe, it, expect } from 'vitest'
import {
  buildMaterialEditDiff,
  type MaterialEditSnapshot,
} from '../../../src/utils/buildMaterialEditDiff'

const DESCRICAO = 'd'.repeat(60)

const atual: MaterialEditSnapshot = {
  title:            'Título original',
  description:      DESCRICAO,
  habilidadesBncc:  ['EF06CO01', 'EF06CO02'],
  storageKey:       'chave-antiga.pdf',
  originalFileName: 'antigo.pdf',
  status:           'APPROVED',
}

const mesmaEntrada = {
  title:           'Título original',
  description:     DESCRICAO,
  habilidadesBncc: ['EF06CO01', 'EF06CO02'],
}

describe('buildMaterialEditDiff', () => {
  it('devolve changed vazio quando nada foi alterado', () => {
    const diff = buildMaterialEditDiff(atual, mesmaEntrada)

    expect(diff.changed).toEqual([])
    expect(diff.title).toBeUndefined()
    expect(diff.description).toBeUndefined()
    expect(diff.habilidadesBncc).toBeUndefined()
  })

  it('registra o campo alterado com from e to', () => {
    const diff = buildMaterialEditDiff(atual, { ...mesmaEntrada, title: 'Título novo' })

    expect(diff.changed).toEqual(['title'])
    expect(diff.title).toEqual({ from: 'Título original', to: 'Título novo' })
  })

  it('guarda a descrição anterior por inteiro, sem truncar', () => {
    const longa = 'x'.repeat(2000)
    const diff = buildMaterialEditDiff(
      { ...atual, description: longa },
      { ...mesmaEntrada, description: DESCRICAO },
    )

    expect(diff.description?.from).toHaveLength(2000)
    expect(diff.description?.from).toBe(longa)
  })

  it('trata descrição ausente como from null — material anterior à exigência', () => {
    const diff = buildMaterialEditDiff(
      { ...atual, description: null },
      mesmaEntrada,
    )

    expect(diff.changed).toContain('description')
    expect(diff.description).toEqual({ from: null, to: DESCRICAO })
  })

  it('não considera alteração espaços nas pontas', () => {
    const diff = buildMaterialEditDiff(atual, {
      ...mesmaEntrada,
      title:       '   Título original   ',
      description: `  ${DESCRICAO}  `,
    })

    expect(diff.changed).toEqual([])
  })

  it('habilidades com mesmo conteúdo e mesma ordem não são alteração', () => {
    const diff = buildMaterialEditDiff(atual, {
      ...mesmaEntrada,
      habilidadesBncc: ['EF06CO01', 'EF06CO02'],
    })

    expect(diff.changed).toEqual([])
  })

  it('habilidade acrescentada, removida ou reordenada conta como alteração', () => {
    const acrescentada = buildMaterialEditDiff(atual, {
      ...mesmaEntrada,
      habilidadesBncc: ['EF06CO01', 'EF06CO02', 'EF06CO03'],
    })
    const removida = buildMaterialEditDiff(atual, {
      ...mesmaEntrada,
      habilidadesBncc: ['EF06CO01'],
    })
    const reordenada = buildMaterialEditDiff(atual, {
      ...mesmaEntrada,
      habilidadesBncc: ['EF06CO02', 'EF06CO01'],
    })

    expect(acrescentada.changed).toEqual(['habilidadesBncc'])
    expect(removida.changed).toEqual(['habilidadesBncc'])
    expect(reordenada.changed).toEqual(['habilidadesBncc'])
  })

  it('registra a troca de documento identificando o arquivo anterior', () => {
    const diff = buildMaterialEditDiff(atual, mesmaEntrada, {
      storageKey:       'chave-nova.pdf',
      originalFileName: 'novo.pdf',
    })

    expect(diff.changed).toEqual(['file'])
    expect(diff.file?.from).toEqual({
      storageKey: 'chave-antiga.pdf', originalFileName: 'antigo.pdf',
    })
    expect(diff.file?.to).toEqual({
      storageKey: 'chave-nova.pdf', originalFileName: 'novo.pdf',
    })
  })

  it('registra a transição de situação quando a troca invalida a aprovação', () => {
    const diff = buildMaterialEditDiff(atual, mesmaEntrada, {
      storageKey:       'chave-nova.pdf',
      originalFileName: 'novo.pdf',
      status:           'PENDING_REVIEW',
    })

    expect(diff.changed).toEqual(['file', 'status'])
    expect(diff.status).toEqual({ from: 'APPROVED', to: 'PENDING_REVIEW' })
  })

  it('não registra transição quando a situação não muda com a troca', () => {
    const pendente: MaterialEditSnapshot = { ...atual, status: 'PENDING_REVIEW' }
    const diff = buildMaterialEditDiff(pendente, mesmaEntrada, {
      storageKey:       'chave-nova.pdf',
      originalFileName: 'novo.pdf',
      status:           'PENDING_REVIEW',
    })

    expect(diff.changed).toEqual(['file'])
    expect(diff.status).toBeUndefined()
  })

  // ── Feature 004: links relacionados na edição ──────────────────────────────

  describe('links relacionados', () => {
    const videoaula = { label: 'Videoaula', url: 'https://exemplo.org/aula' }
    const artigo    = { label: 'Artigo',    url: 'https://exemplo.org/artigo' }

    it('ausentes dos dois lados não são alteração — acervo anterior à feature', () => {
      const diff = buildMaterialEditDiff(atual, mesmaEntrada)

      expect(diff.changed).toEqual([])
      expect(diff.relatedLinks).toBeUndefined()
    })

    it('lista vazia equivale a ausente', () => {
      const diff = buildMaterialEditDiff(atual, { ...mesmaEntrada, relatedLinks: [] })

      expect(diff.changed).toEqual([])
    })

    it('mesmos links na mesma ordem não são alteração', () => {
      const diff = buildMaterialEditDiff(
        { ...atual, relatedLinks: [videoaula, artigo] },
        { ...mesmaEntrada, relatedLinks: [{ ...videoaula }, { ...artigo }] },
      )

      expect(diff.changed).toEqual([])
    })

    it('registra acréscimo, remoção, reordenação e troca de endereço', () => {
      const comLinks: MaterialEditSnapshot = { ...atual, relatedLinks: [videoaula, artigo] }

      const acrescentado = buildMaterialEditDiff(atual, { ...mesmaEntrada, relatedLinks: [videoaula] })
      const removido     = buildMaterialEditDiff(comLinks, { ...mesmaEntrada, relatedLinks: [videoaula] })
      const reordenado   = buildMaterialEditDiff(comLinks, { ...mesmaEntrada, relatedLinks: [artigo, videoaula] })
      const outroDestino = buildMaterialEditDiff(comLinks, {
        ...mesmaEntrada,
        relatedLinks: [videoaula, { ...artigo, url: 'https://exemplo.org/outro' }],
      })

      for (const diff of [acrescentado, removido, reordenado, outroDestino]) {
        expect(diff.changed).toEqual(['relatedLinks'])
      }
      expect(acrescentado.relatedLinks).toEqual({ from: [], to: [videoaula] })
      expect(removido.relatedLinks).toEqual({ from: [videoaula, artigo], to: [videoaula] })
    })
  })
})
