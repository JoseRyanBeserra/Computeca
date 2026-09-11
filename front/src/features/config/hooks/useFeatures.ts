// src/features/config/hooks/useFeatures.ts
import { useContext } from 'react'
import { FeaturesContext, type FeaturesContextValue } from '../../../context/FeaturesContext'

/**
 * Disponibilidade dos módulos desta instalação.
 *
 * Combine com as regras de perfil de `lib/permissions.ts` nos pontos de uso:
 *
 *   const { ai } = useFeatures()
 *   const podeConversar = ai.enabled && canUseAiChat(user)
 */
export function useFeatures(): FeaturesContextValue {
  return useContext(FeaturesContext)
}
