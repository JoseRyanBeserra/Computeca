// src/features/materials/hooks/useAllMaterials.ts
import { useQuery } from '@tanstack/react-query'
import { listAllMaterialsRequest, type MIStatus } from '../api/materialsApi'

export function useAllMaterials(status?: MIStatus, page = 1) {
  return useQuery({
    queryKey: ['professor', 'all-materials', status, page],
    queryFn:  () => listAllMaterialsRequest({ status, page, perPage: 25 }),
  })
}
