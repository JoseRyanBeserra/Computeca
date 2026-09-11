// src/repositories/resources/materials/pdf/materialPdfAllListRepository.ts
import { Prisma, type MIStatus } from '@prisma/client'
import { prisma } from '../../../../database/prisma'
import type { IPendingMaterial } from '../../../../@types/resources/materials/pdf'

export interface AllMaterialsParams {
  status?:  MIStatus
  /** Filtra materiais que possuam QUALQUER uma destas habilidades (hasSome) */
  habilidades?: string[]
  /** Inclui também materiais sem nenhuma habilidade (lista vazia) */
  includeSemHabilidade?: boolean
  /** Busca por termo no título ou no nome de quem enviou (case-insensitive) */
  search?: string
  page:     number
  perPage:  number
}

export interface AllMaterialsResult {
  materials: IPendingMaterial[]
  total:     number
  page:      number
  perPage:   number
}

const MI_SELECT = {
  id:               true,
  title:            true,
  originalFileName: true,
  storageKey:       true,
  mimeType:         true,
  sizeBytes:        true,
  habilidadesBncc:  true,
  status:           true,
  vectorStatus:     true,
  uploadedById:     true,
  createdAt:        true,
  updatedAt:        true,
  uploadedBy: {
    select: { name: true, email: true },
  },
  organizations: {
    select: {
      organization: {
        select: { id: true, name: true },
      },
    },
  },
} as const

export async function findAllMaterials(
  params: AllMaterialsParams,
): Promise<AllMaterialsResult> {
  const { status, habilidades, includeSemHabilidade, search, page, perPage } = params

  const where: Prisma.MaterialInstrucionalWhereInput = { deletedAt: null }
  if (status) where.status = status

  // Filtro de habilidades: união entre "tem alguma das selecionadas" e "sem habilidade"
  const habilidadeConditions: Prisma.MaterialInstrucionalWhereInput[] = []
  if (habilidades && habilidades.length > 0) {
    habilidadeConditions.push({ habilidadesBncc: { hasSome: habilidades } })
  }
  if (includeSemHabilidade) {
    habilidadeConditions.push({ habilidadesBncc: { isEmpty: true } })
  }
  if (habilidadeConditions.length === 1) {
    Object.assign(where, habilidadeConditions[0])
  } else if (habilidadeConditions.length > 1) {
    where.OR = habilidadeConditions
  }

  // Busca por termo: título OU nome do autor. Vai em `AND` para não colidir com o
  // `OR` das habilidades (chaves de topo do where são combinadas com AND pelo Prisma).
  if (search) {
    where.AND = [
      {
        OR: [
          { title:      { contains: search, mode: 'insensitive' } },
          { uploadedBy: { name: { contains: search, mode: 'insensitive' } } },
        ],
      },
    ]
  }

  const [materials, total] = await prisma.$transaction([
    prisma.materialInstrucional.findMany({
      where,
      select:  MI_SELECT,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.materialInstrucional.count({ where }),
  ])

  return { materials, total, page, perPage }
}
