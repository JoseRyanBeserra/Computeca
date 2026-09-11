// src/features/materials/hooks/useMyMaterials.ts
import { useQuery } from '@tanstack/react-query'
import { listMyMaterialsRequest } from '../api/materialsApi'

export function useMyMaterials() {
  return useQuery({
    queryKey: ['materials', 'my-list'],
    queryFn:  listMyMaterialsRequest,
  })
}
