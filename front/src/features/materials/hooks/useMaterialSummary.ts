// src/features/materials/hooks/useMaterialSummary.ts
import { useQuery } from '@tanstack/react-query'
import { getMaterialSummaryRequest } from '../api/materialsApi'

/**
 * Busca o resumo por IA de um material. Na primeira visita o backend gera e
 * persiste o resumo; enquanto outra requisição estiver gerando (status
 * PROCESSING), refazemos a consulta a cada 3s até o resumo ficar pronto.
 *
 * `enabled` deve ser passado apenas quando faz sentido consultar (material
 * aprovado) — evita 400 desnecessário para materiais não aprovados.
 */
export function useMaterialSummary(materialId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['material-summary', materialId],
    queryFn:  () => getMaterialSummaryRequest(materialId as string),
    enabled:  enabled && !!materialId,
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 3000 : false),
  })
}
