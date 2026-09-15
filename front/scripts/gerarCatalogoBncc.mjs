// scripts/gerarCatalogoBncc.mjs
//
// Gera src/features/materials/data/bnccComputacao.ts a partir do arquivo oficial
// src/features/materials/data/habilidades_bncc_computacao.csv.
//
// Uso (na pasta front/):
//   node scripts/gerarCatalogoBncc.mjs
//
// Para atualizar o catálogo: substitua o CSV, rode este script e rode os testes.
// O teste bnccComputacao.test.ts confere que o catálogo gerado corresponde ao
// arquivo — com um parser próprio, independente deste.
//
// Regras (specs/006-bncc-habilidades-update/data-model.md):
//   - cabeçalho e linhas vazias ignorados
//   - aspas externas removidas; vírgulas e aspas tipográficas internas preservadas
//   - espaços das extremidades removidos
//   - sequência de 3 dígitos com zero à esquerda (CO011) vira 2 dígitos (CO11)
//   - etapa derivada do prefixo do código; grupos na ordem da escolaridade
//   - código repetido ou prefixo desconhecido: erro, SEM escrever o arquivo
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGEM = join(raiz, 'src/features/materials/data/habilidades_bncc_computacao.csv')
const DESTINO = join(raiz, 'src/features/materials/data/bnccComputacao.ts')

/** Etapas na ordem em que aparecem na lista, com os prefixos de código de cada uma. */
const ETAPAS = [
  { etapa: 'Educação Infantil',                                 prefixo: /^EI03CO/ },
  { etapa: 'Ensino Fundamental — Anos Iniciais (1º ao 5º ano)', prefixo: /^EF(0[1-5]|15)CO/ },
  { etapa: 'Ensino Fundamental — Anos Finais (6º ao 9º ano)',   prefixo: /^EF(0[6-9]|69)CO/ },
  { etapa: 'Ensino Médio',                                      prefixo: /^EM13CO/ },
]

function falhar(mensagem) {
  console.error(`✖ ${mensagem}\n  Nada foi escrito em ${DESTINO}.`)
  process.exit(1)
}

/** Separa uma linha CSV em campos, respeitando aspas e `""` como aspas literais. */
function separarCampos(linha) {
  const campos = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++ }
      else if (c === '"') entreAspas = false
      else atual += c
    } else if (c === '"') entreAspas = true
    else if (c === ',') { campos.push(atual); atual = '' }
    else atual += c
  }
  campos.push(atual)
  return campos
}

/** Literal de string TypeScript com aspas simples. */
const literal = (texto) => `'${texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const linhas = readFileSync(ORIGEM, 'utf8')
  .split('\n')
  .map((l) => l.replace(/\r$/, ''))

if (linhas[0].trim() !== 'codigo,habilidade') {
  falhar(`cabeçalho inesperado: "${linhas[0]}" (esperado "codigo,habilidade")`)
}

const grupos = ETAPAS.map((e) => ({ ...e, habilidades: [] }))
const vistos = new Set()
const normalizados = []

linhas.slice(1).forEach((linha, i) => {
  if (linha.trim() === '') return
  const numero = i + 2
  const [codigoBruto, descricaoBruta, ...sobra] = separarCampos(linha)
  if (!descricaoBruta || sobra.length > 0) falhar(`linha ${numero}: esperados 2 campos — "${linha}"`)

  const original = codigoBruto.trim()
  const codigo = original.replace(/CO0(\d{2})$/, 'CO$1')
  const descricao = descricaoBruta.trim()
  if (codigo !== original) normalizados.push(`${original} → ${codigo}`)

  if (vistos.has(codigo)) falhar(`linha ${numero}: código repetido ${codigo}`)
  vistos.add(codigo)

  const grupo = grupos.find((g) => g.prefixo.test(codigo))
  if (!grupo) falhar(`linha ${numero}: prefixo fora das quatro etapas — ${codigo}`)
  grupo.habilidades.push({ codigo, descricao })
})

const blocos = grupos
  .map((g) => [
    '  {',
    `    etapa: ${literal(g.etapa)},`,
    '    habilidades: [',
    ...g.habilidades.map((h) => `      { codigo: ${literal(h.codigo)}, descricao: ${literal(h.descricao)} },`),
    '    ],',
    '  },',
  ].join('\n'))
  .join('\n')

const saida = `// src/features/materials/data/bnccComputacao.ts
//
// ARQUIVO GERADO — não edite à mão. Atualize habilidades_bncc_computacao.csv
// (ao lado) e rode \`node scripts/gerarCatalogoBncc.mjs\` na pasta front/.
// O teste bnccComputacao.test.ts falha se este arquivo divergir do CSV.
//
// Habilidades da BNCC de Computação (Complemento à BNCC — "Normas sobre Computação
// na Educação Básica", Resolução CNE/CEB nº 1/2022), da Educação Infantil ao
// Ensino Médio. As descrições são o TEXTO INTEGRAL do arquivo oficial.
//
// Única correção sobre o arquivo: o código EF05CO011 é registrado como EF05CO11,
// no formato de dois dígitos de sequência usado por todos os demais.
//
// Usado como base de seleção no seletor de habilidades do cadastro e da edição.

export interface BnccHabilidade {
  codigo:    string
  descricao: string
}

export interface BnccGrupo {
  etapa:       string
  habilidades: BnccHabilidade[]
}

export const BNCC_COMPUTACAO: BnccGrupo[] = [
${blocos}
]

/** Lista achatada de todas as habilidades, para busca. */
export const BNCC_COMPUTACAO_FLAT: BnccHabilidade[] = BNCC_COMPUTACAO.flatMap((g) => g.habilidades)

/** Mapa código → descrição, para exibir a descrição de um código conhecido. */
export const BNCC_COMPUTACAO_MAP: Record<string, string> = Object.fromEntries(
  BNCC_COMPUTACAO_FLAT.map((h) => [h.codigo, h.descricao]),
)
`

writeFileSync(DESTINO, saida)

console.log(`✔ ${DESTINO}`)
for (const g of grupos) console.log(`  ${String(g.habilidades.length).padStart(3)}  ${g.etapa}`)
console.log(`  ${String(vistos.size).padStart(3)}  total`)
if (normalizados.length) console.log(`  normalizados: ${normalizados.join(', ')}`)
