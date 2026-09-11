// src/features/organizations/hooks/useLeaveOrganization.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveOrganizationRequest } from '../api/organizationsApi'

export function useLeaveOrganization() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: leaveOrganizationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organizations'] })
    },
  })
}
