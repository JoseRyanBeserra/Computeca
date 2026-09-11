// src/features/organizations/hooks/useOrgMembers.ts
import { useQuery } from '@tanstack/react-query'
import { listOrgMembersRequest } from '../api/organizationsApi'

export function useOrgMembers(orgId: string) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn:  () => listOrgMembersRequest(orgId),
    enabled:  !!orgId,
  })
}
