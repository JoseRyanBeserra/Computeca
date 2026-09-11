// src/features/materials/hooks/usePendingMaterials.ts
import { useQuery } from '@tanstack/react-query'
import { listPendingMaterialsRequest } from '../api/materialsApi'

export function usePendingMaterials() {
  return useQuery({
    queryKey: ['professor', 'pending-materials'],
    queryFn:  listPendingMaterialsRequest,
  })
}
