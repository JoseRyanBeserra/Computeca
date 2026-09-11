// src/features/organizations/hooks/useMyOrganizations.ts
import { useQuery } from '@tanstack/react-query'
import { listMyOrganizationsRequest } from '../api/organizationsApi'

export function useMyOrganizations() {
  return useQuery({
    queryKey: ['my-organizations'],
    queryFn:  listMyOrganizationsRequest,
  })
}
