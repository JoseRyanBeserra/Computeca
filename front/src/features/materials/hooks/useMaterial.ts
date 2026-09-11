// src/features/materials/hooks/useMaterial.ts
import { useQuery } from '@tanstack/react-query'
import { getMaterialByIdRequest } from '../api/materialsApi'

export function useMaterial(materialId: string | undefined) {
  return useQuery({
    queryKey: ['material', materialId],
    queryFn:  () => getMaterialByIdRequest(materialId as string),
    enabled:  !!materialId,
  })
}
