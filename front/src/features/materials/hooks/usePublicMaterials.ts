// src/features/materials/hooks/usePublicMaterials.ts
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listPublicMaterialsRequest } from '../api/materialsApi'

interface PublicMaterialsFilters {
  habilidades?:   string[]
  semHabilidade?: boolean
  /** Busca por termo no título/autor — enviada ao servidor (cobre o acervo inteiro) */
  search?:        string
}

export function usePublicMaterials(page = 1, filters: PublicMaterialsFilters = {}) {
  const { habilidades = [], semHabilidade = false } = filters
  const search = filters.search?.trim() ?? ''
  return useQuery({
    queryKey: ['public-materials', page, habilidades, semHabilidade, search],
    queryFn:  () =>
      listPublicMaterialsRequest({
        page,
        perPage: 25,
        habilidades,
        semHabilidade,
        search: search || undefined,
      }),
    // Mantém a lista anterior visível enquanto a nova busca/página carrega
    placeholderData: keepPreviousData,
  })
}
