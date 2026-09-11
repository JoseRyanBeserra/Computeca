// src/features/organizations/hooks/useInviteUser.ts
import { useMutation } from '@tanstack/react-query'
import { inviteUserRequest, type OrgInviteDTO } from '../api/organizationsApi'

export function useInviteUser(orgId: string) {
  return useMutation<OrgInviteDTO, Error, string>({
    mutationFn: (email) => inviteUserRequest(orgId, email),
  })
}
