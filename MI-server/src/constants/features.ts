// src/constants/features.ts
// Resolução da disponibilidade das funcionalidades de IA.
//
// O controle opera em DOIS NÍVEIS hierárquicos:
//
//   1. Ambiente (mestre) — `AI_FEATURES_ENABLED`. Determina se a instalação tem
//      IA. Desativado, nada de IA existe: nem conexões, nem rotas, nem interface.
//      Alterá-lo exige reiniciar a aplicação.
//
//   2. Administração (operacional) — `AppSetting["ai.enabled"]`, editável pelo
//      painel com efeito imediato, SUBORDINADO ao nível mestre.
//
// A disponibilidade efetiva é a conjunção dos dois:
//
//   AI_FEATURES_ENABLED && (registro?.enabled ?? true)
//
// O nível de banco nunca sobrepõe o de ambiente: com o mestre desligado,
// gravar `enabled: true` não produz efeito algum.
import { z } from 'zod'
import { env } from '../env'
import { logger } from '../lib/logger'
import { findAppSettingByKey } from '../repositories/config/appSettingRepository'

/** Chave do registro de disponibilidade da IA em `AppSetting`. */
export const AI_SETTING_KEY = 'ai.enabled'

/** Formato esperado do `value`. Registro fora deste formato é tratado como ausente. */
const aiSettingValueSchema = z.object({ enabled: z.boolean() })

// ── Cache de processo ──────────────────────────────────────────────────────────
// Evita uma consulta ao banco em toda requisição para um dado que muda raramente.
// Só o próprio processo escreve, então invalidar na escrita é suficiente.
let cachedEnabled: boolean | null = null

/** Descarta o valor em cache. Chamar após toda escrita da configuração. */
export function invalidateAiAvailabilityCache(): void {
  cachedEnabled = null
}

/**
 * A instalação permite governar a IA pelo painel administrativo?
 * Espelha o interruptor mestre de ambiente.
 */
export function isAiManageable(): boolean {
  return env.AI_FEATURES_ENABLED
}

/**
 * Disponibilidade EFETIVA da IA — conjunção dos dois níveis.
 *
 * Com o mestre desligado responde `false` sem sequer consultar o banco, que é o
 * que garante o funcionamento em instalações sem os serviços de apoio no ar.
 */
export async function isAiEnabled(): Promise<boolean> {
  if (!env.AI_FEATURES_ENABLED) return false

  if (cachedEnabled !== null) return cachedEnabled

  cachedEnabled = await readAdminAvailability()
  return cachedEnabled
}

/**
 * Lê o nível operacional. A ausência do registro significa "o administrador
 * nunca se pronunciou" e resolve como habilitado — quem provisionou a instalação
 * com IA já declarou que a quer.
 */
async function readAdminAvailability(): Promise<boolean> {
  try {
    const setting = await findAppSettingByKey(AI_SETTING_KEY)
    if (!setting) return true

    const parsed = aiSettingValueSchema.safeParse(setting.value)
    if (!parsed.success) {
      logger.warn(
        { key: AI_SETTING_KEY, value: setting.value },
        'AppSetting com formato inválido — tratando como ausente (IA habilitada)',
      )
      return true
    }

    return parsed.data.enabled
  } catch (err) {
    logger.warn({ err }, 'Falha ao ler a disponibilidade da IA — tratando como habilitada')
    return true
  }
}
