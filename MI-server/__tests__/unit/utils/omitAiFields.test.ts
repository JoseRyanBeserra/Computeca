// __tests__/unit/utils/omitAiFields.test.ts
// FR-017 — remoção do estado de processamento por IA das respostas.
import { describe, it, expect } from 'vitest'
import { omitAiFields, omitAiFieldsFromList } from '../../../src/utils/omitAiFields'

const material = () => ({
  id:           'm1',
  title:        'Guia de Geometria',
  status:       'APPROVED',
  vectorStatus: 'DONE',
})

describe('omitAiFields', () => {
  it('remove vectorStatus com a IA desativada', () => {
    const resultado = omitAiFields(material(), false)

    expect(resultado).not.toHaveProperty('vectorStatus')
  })

  it('preserva todos os demais campos', () => {
    const resultado = omitAiFields(material(), false)

    expect(resultado).toEqual({ id: 'm1', title: 'Guia de Geometria', status: 'APPROVED' })
  })

  it('devolve o objeto intacto com a IA ativada', () => {
    const original = material()
    const resultado = omitAiFields(original, true)

    expect(resultado).toBe(original)
    expect(resultado).toHaveProperty('vectorStatus', 'DONE')
  })

  it('não altera o objeto original ao remover', () => {
    const original = material()
    omitAiFields(original, false)

    expect(original).toHaveProperty('vectorStatus', 'DONE')
  })

  it('tolera objeto que já não possui o campo', () => {
    const semCampo = { id: 'm1', title: 'X' }

    expect(() => omitAiFields(semCampo, false)).not.toThrow()
    expect(omitAiFields(semCampo, false)).toEqual(semCampo)
  })
})

describe('omitAiFieldsFromList', () => {
  it('remove o campo de todos os itens com a IA desativada', () => {
    const resultado = omitAiFieldsFromList([material(), material()], false)

    for (const item of resultado) {
      expect(item).not.toHaveProperty('vectorStatus')
    }
  })

  it('devolve a lista intacta com a IA ativada', () => {
    const lista = [material()]
    const resultado = omitAiFieldsFromList(lista, true)

    expect(resultado).toBe(lista)
    expect(resultado[0]).toHaveProperty('vectorStatus')
  })

  it('trata lista vazia', () => {
    expect(omitAiFieldsFromList([], false)).toEqual([])
  })
})
