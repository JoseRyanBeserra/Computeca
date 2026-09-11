// src/features/organizations/hooks/useUpdateOrganization.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateOrganizationRequest, type OrganizationDTO } from '../api/organizationsApi'

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<OrganizationDTO, Error, { name?: string; description?: string }>({
    mutationFn: (input) => updateOrganizationRequest(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
      queryClient.invalidateQueries({ queryKey: ['org-detail', orgId] })
    },
  })
}
