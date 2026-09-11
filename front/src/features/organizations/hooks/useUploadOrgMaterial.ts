// src/features/organizations/hooks/useUploadOrgMaterial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadOrgMaterialRequest, type UploadOrgMaterialPayload } from '../api/organizationsApi'

export function useUploadOrgMaterial(orgId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UploadOrgMaterialPayload) =>
      uploadOrgMaterialRequest(orgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-materials', orgId] })
    },
  })
}
