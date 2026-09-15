// src/features/materials/data/bnccComputacao.test.ts
//
// O catálogo é GERADO a partir do arquivo oficial ao lado. Este teste é o que
// impede os dois de divergirem: foi editando a lista à mão que ela chegou a 109
// habilidades com descrições resumidas, sem que ninguém percebesse.
//
// O parse do CSV é feito AQUI, de propósito, e não reaproveita o do gerador
// (scripts/gerarCatalogoBncc.mjs). Dois parsers independentes é o que dá valor
// à comparação — um parser errado compartilhado passaria nos dois lados.
import { describe, it, expect } from 'vitest'
import csv from './habilidades_bncc_computacao.csv?raw'
import {
  BNCC_COMPUTACAO,
  BNCC_COMPUTACAO_FLAT,
  BNCC_COMPUTACAO_MAP,
} from './bnccComputacao'

interface LinhaCsv {
  codigoOriginal: string
  codigo:         string
  descricao:      string
}

/** Separa uma linha CSV em campos, respeitando aspas e `""` como aspas literais. */
function campos(linha: string): string[] {
  const resultado: string[] = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
      else if (c === '"') entreAspas = false
      else atual += c
    } else if (c === '"') entreAspas = true
    else if (c === ',') { resultado.push(atual); atual = '' }
    else atual += c
  }
  resultado.push(atual)
  return resultado
}

/** Sequência de 3 dígitos com zero à esquerda (`CO011`) vira 2 dígitos (`CO11`). */
const normalizar = (codigo: string) => codigo.replace(/CO0(\d{2})$/, 'CO$1')

const linhas: LinhaCsv[] = csv
  .split('\n')
  .map((l) => l.replace(/\r$/, ''))
  .slice(1) // cabeçalho codigo,habilidade
  .filter((l) => l.trim() !== '')
  .map((l) => {
    const [codigo, descricao] = campos(l)
    return {
      codigoOriginal: codigo.trim(),
      codigo:         normalizar(codigo.trim()),
      descricao:      descricao.trim(),
    }
  })

describe('catálogo BNCC Computação × arquivo oficial', () => {
  it('o arquivo tem as 141 habilidades esperadas', () => {
    expect(linhas).toHaveLength(141)
  })

  it('o catálogo tem os mesmos códigos e as mesmas descrições, na mesma ordem', () => {
    // Lista as divergências pelo código, para a falha apontar o que está errado
    // em vez de só dizer que duas listas de 141 itens são diferentes.
    const divergencias: string[] = []
    const total = Math.max(linhas.length, BNCC_COMPUTACAO_FLAT.length)

    for (let i = 0; i < total; i++) {
      const esperada = linhas[i]
      const atual = BNCC_COMPUTACAO_FLAT[i]
      if (!esperada) divergencias.push(`#${i + 1}: sobra no catálogo (${atual.codigo})`)
      else if (!atual) divergencias.push(`#${i + 1}: falta no catálogo (${esperada.codigo})`)
      else if (atual.codigo !== esperada.codigo) {
        divergencias.push(`#${i + 1}: código ${atual.codigo}, esperado ${esperada.codigo}`)
      } else if (atual.descricao !== esperada.descricao) {
        divergencias.push(`${esperada.codigo}: descrição diferente da do arquivo`)
      }
    }

    expect(divergencias).toEqual([])
  })

  it('normaliza EF05CO011 para EF05CO11 — e só esse código', () => {
    const normalizados = linhas.filter((l) => l.codigo !== l.codigoOriginal)

    // Se um arquivo futuro trouxer outra anomalia, este teste falha em vez de
    // corrigi-la em silêncio.
    expect(normalizados.map((l) => l.codigoOriginal)).toEqual(['EF05CO011'])
    expect(BNCC_COMPUTACAO_MAP).toHaveProperty('EF05CO11')
    expect(BNCC_COMPUTACAO_MAP).not.toHaveProperty('EF05CO011')
  })
})

describe('catálogo BNCC Computação — integridade', () => {
  it('não tem código repetido', () => {
    const codigos = BNCC_COMPUTACAO_FLAT.map((h) => h.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('o mapa tem exatamente uma entrada por habilidade, com a sua descrição', () => {
    expect(Object.keys(BNCC_COMPUTACAO_MAP)).toHaveLength(BNCC_COMPUTACAO_FLAT.length)
    for (const h of BNCC_COMPUTACAO_FLAT) {
      expect(BNCC_COMPUTACAO_MAP[h.codigo]).toBe(h.descricao)
    }
  })

  it('mantém as habilidades usadas pelo acervo existente', () => {
    for (const codigo of ['EF06CO01', 'EF06CO02', 'EF06CO04']) {
      expect(BNCC_COMPUTACAO_MAP).toHaveProperty(codigo)
    }
  })
})

describe('catálogo BNCC Computação — etapas', () => {
  const ETAPAS = [
    { etapa: 'Educação Infantil',                                   total: 11, prefixos: /^EI03/ },
    { etapa: 'Ensino Fundamental — Anos Iniciais (1º ao 5º ano)',   total: 50, prefixos: /^EF(0[1-5]|15)/ },
    { etapa: 'Ensino Fundamental — Anos Finais (6º ao 9º ano)',     total: 54, prefixos: /^EF(0[6-9]|69)/ },
    { etapa: 'Ensino Médio',                                        total: 26, prefixos: /^EM13/ },
  ]

  it('tem as quatro etapas, na ordem da escolaridade', () => {
    expect(BNCC_COMPUTACAO.map((g) => g.etapa)).toEqual(ETAPAS.map((e) => e.etapa))
  })

  it.each(ETAPAS)('$etapa tem $total habilidades, todas da própria etapa', ({ etapa, total, prefixos }) => {
    const grupo = BNCC_COMPUTACAO.find((g) => g.etapa === etapa)!

    expect(grupo.habilidades).toHaveLength(total)
    expect(grupo.habilidades.filter((h) => !prefixos.test(h.codigo))).toEqual([])
  })
})
