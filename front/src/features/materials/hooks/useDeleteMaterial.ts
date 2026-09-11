// src/features/materials/hooks/useDeleteMaterial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMaterialRequest } from '../api/materialsApi'

/**
 * Soft delete de um material. Ao concluir, invalida as listagens para que o
 * material deletado suma imediatamente da tela.
 */
export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (materialId: string) => deleteMaterialRequest(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professor', 'all-materials'] })
      queryClient.invalidateQueries({ queryKey: ['professor', 'pending-materials'] })
      queryClient.invalidateQueries({ queryKey: ['public-materials'] })
      queryClient.invalidateQueries({ queryKey: ['materials', 'my-list'] })
      queryClient.invalidateQueries({ queryKey: ['habilidades'] })
    },
  })
}
