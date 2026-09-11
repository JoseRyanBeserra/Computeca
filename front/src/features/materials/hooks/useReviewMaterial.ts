// src/features/materials/hooks/useReviewMaterial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewMaterialRequest, type ReviewDecision } from '../api/materialsApi'

export function useReviewMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ materialId, decision }: { materialId: string; decision: ReviewDecision }) =>
      reviewMaterialRequest(materialId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'pending-materials'] })
    },
  })
}
