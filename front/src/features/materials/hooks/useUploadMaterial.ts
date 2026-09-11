// src/features/materials/hooks/useUploadMaterial.ts
import { useMutation } from '@tanstack/react-query'
import { uploadMaterialRequest, type UploadMaterialPayload } from '../api/materialsApi'

export function useUploadMaterial() {
  return useMutation({
    mutationFn: (payload: UploadMaterialPayload) => uploadMaterialRequest(payload),
  })
}
