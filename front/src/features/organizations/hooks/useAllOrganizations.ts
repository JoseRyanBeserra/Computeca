// src/features/organizations/hooks/useAllOrganizations.ts
import { useQuery } from '@tanstack/react-query'
import { listAllOrganizationsRequest } from '../api/organizationsApi'

/**
 * Listagem administrativa de organizações (todas da plataforma). Usada no
 * painel admin para contar e pré-visualizar os projetos ativos.
 */
export function useAllOrganizations(params?: { status?: 'ACTIVE' | 'ARCHIVED'; perPage?: number }) {
  return useQuery({
    queryKey: ['admin', 'organizations', params?.status, params?.perPage],
    queryFn:  () => listAllOrganizationsRequest({ status: params?.status, perPage: params?.perPage }),
  })
}
