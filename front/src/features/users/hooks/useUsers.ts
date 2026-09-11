// src/features/users/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query'
import { listUsersRequest } from '../api/usersApi'
import type { Role } from '../../../types/auth'

export function useUsers(roleFilter?: Role) {
  return useQuery({
    queryKey: ['admin', 'users', roleFilter],
    queryFn:  () => listUsersRequest({ role: roleFilter, perPage: 100 }),
  })
}
