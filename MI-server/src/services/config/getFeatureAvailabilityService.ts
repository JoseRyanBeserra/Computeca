// src/services/config/getFeatureAvailabilityService.ts
import { isAiEnabled, isAiManageable } from '../../constants/features'
import type { IFeatureAvailability } from '../../@types/config'
import { logger } from '../../lib/logger'

/**
 * Resolve a disponibilidade dos módulos da instalação.
 *
 * Não recebe entrada — não há o que validar. O estado vem do interruptor de
 * ambiente e do registro operacional em `AppSetting`.
 */
export async function getFeatureAvailabilityService(): Promise<IFeatureAvailability> {
  logger.info('IN - getFeatureAvailabilityService')

  const result: IFeatureAvailability = {
    ai: {
      enabled:    await isAiEnabled(),
      manageable: isAiManageable(),
    },
  }

  logger.info('OUT - getFeatureAvailabilityService')
  return result
}
