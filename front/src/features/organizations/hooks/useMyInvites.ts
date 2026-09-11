// src/features/organizations/hooks/useMyInvites.ts
import { useQuery } from '@tanstack/react-query'
import { listMyInvitesRequest } from '../api/organizationsApi'

export function useMyInvites() {
  return useQuery({
    queryKey: ['my-invites'],
    queryFn:  listMyInvitesRequest,
  })
}
