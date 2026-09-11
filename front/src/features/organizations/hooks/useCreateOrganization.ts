// src/features/organizations/hooks/useCreateOrganization.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createOrganizationRequest, type OrganizationDTO } from '../api/organizationsApi'

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation<OrganizationDTO, Error, { name: string; description?: string }>({
    mutationFn: createOrganizationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
    },
  })
}
