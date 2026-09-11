// src/features/materials/hooks/useHabilidades.ts
import { useQuery } from '@tanstack/react-query'
import { listHabilidadesRequest } from '../api/materialsApi'

export function useHabilidades(enabled = true) {
  return useQuery({
    queryKey: ['habilidades'],
    queryFn:  listHabilidadesRequest,
    enabled,
  })
}
