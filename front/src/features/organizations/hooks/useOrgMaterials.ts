// src/features/organizations/hooks/useOrgMaterials.ts
import { useQuery } from '@tanstack/react-query'
import { listOrgMaterialsRequest } from '../api/organizationsApi'

export function useOrgMaterials(orgId: string) {
  return useQuery({
    queryKey: ['org-materials', orgId],
    queryFn:  () => listOrgMaterialsRequest(orgId),
    enabled:  !!orgId,
  })
}
