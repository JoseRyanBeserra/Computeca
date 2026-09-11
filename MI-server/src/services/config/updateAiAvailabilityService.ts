// src/services/config/updateAiAvailabilityService.ts
import type { Role } from '@prisma/client'
import {
  updateAiAvailabilitySchema,
  type UpdateAiAvailabilityServiceInput,
} from '../../schemas/config/updateAiAvailabilitySchema'
import {
  findAppSettingByKey,
  upsertAppSetting,
} from '../../repositories/config/appSettingRepository'
import { createAuditLog } from '../../repositories/audit/auditRepository'
import {
  AI_SETTING_KEY,
  isAiManageable,
  isAiEnabled,
  invalidateAiAvailabilityCache,
} from '../../constants/features'
import { validateRequest } from '../../utils/validateRequest'
import { ERRORS, buildError } from '../../lib/errors/errors'
import { GeneralErrorResponse } from '../../errors/GeneralErrorResponse'
import { StatusCode } from '../../utils/statusCode'
import type { IFeatureAvailability } from '../../@types/config'
import { logger } from '../../lib/logger'

/** Lê o valor operacional atual, para decidir se houve mudança de estado. */
async function currentAdminValue(): Promise<boolean> {
  const setting = await findAppSettingByKey(AI_SETTING_KEY)
  if (!setting) return true // ausência = administrador nunca se pronunciou

  const value = setting.value as { enabled?: unknown } | null
  return typeof value?.enabled === 'boolean' ? value.enabled : true
}

export async function updateAiAvailabilityService(
  input: UpdateAiAvailabilityServiceInput,
): Promise<IFeatureAvailability> {
  logger.info('IN - updateAiAvailabilityService')

  const { enabled, updatedById, actorRole } = validateRequest(input, updateAiAvailabilitySchema)

  // A instalação precisa ter suporte a IA para que o painel possa governá-la.
  // Recusa explícita, não silenciosa: nada é gravado e o cache não é invalidado.
  if (!isAiManageable()) {
    throw new GeneralErrorResponse(
      StatusCode.CONFLICT,
      buildError(ERRORS.AI.AI_NOT_MANAGEABLE),
    )
  }

  const anterior = await currentAdminValue()

  await upsertAppSetting({
    key:         AI_SETTING_KEY,
    value:       { enabled },
    updatedById,
  })

  invalidateAiAvailabilityCache()

  // Auditoria registra MUDANÇA de estado, não requisição recebida: ligar o que
  // já está ligado não gera registro.
  if (anterior !== enabled) {
    await createAuditLog({
      actorId:   updatedById,
      actorRole: actorRole as Role,
      targetId:  AI_SETTING_KEY,
      action:    'AI_AVAILABILITY_CHANGED',
      metadata:  { de: anterior, para: enabled },
    })
  }

  const result: IFeatureAvailability = {
    ai: {
      enabled:    await isAiEnabled(),
      manageable: isAiManageable(),
    },
  }

  logger.info('OUT - updateAiAvailabilityService')
  return result
}
