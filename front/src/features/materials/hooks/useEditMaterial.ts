// src/features/materials/hooks/useEditMaterial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { editMaterialRequest, type EditMaterialPayload } from '../api/materialsApi'

/**
 * Invalida as consultas do material e das listagens ao concluir: a edição pode
 * mudar título, descrição e — quando o documento é trocado — a própria situação
 * do material, que decide se ele aparece no acervo público.
 */
export function useEditMaterial(materialId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: EditMaterialPayload) => editMaterialRequest(materialId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material', materialId] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      queryClient.invalidateQueries({ queryKey: ['my-materials'] })
      queryClient.invalidateQueries({ queryKey: ['pending-materials'] })
    },
  })
}
