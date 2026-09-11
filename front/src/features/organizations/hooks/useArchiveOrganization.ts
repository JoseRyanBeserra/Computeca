// src/features/organizations/hooks/useArchiveOrganization.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { archiveOrganizationRequest, type OrganizationDTO } from '../api/organizationsApi'

export function useArchiveOrganization() {
  const queryClient = useQueryClient()
  return useMutation<OrganizationDTO, Error, string>({
    mutationFn: archiveOrganizationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
    },
  })
}
