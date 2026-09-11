// src/features/config/api/configApi.ts
// Disponibilidade dos módulos desta instalação.
import { api } from '../../../lib/api'

export interface ModuleAvailability {
  /** Disponibilidade efetiva — é o que decide o que renderizar. */
  enabled: boolean
  /** A instalação permite governar o módulo pelo painel administrativo. */
  manageable: boolean
}

export interface FeatureAvailability {
  ai: ModuleAvailability
}

/**
 * Consulta a disponibilidade dos módulos.
 *
 * Rota pública: o front precisa do estado antes do login, porque visitante não
 * logado também não pode ver vestígio de funcionalidade desativada.
 */
export async function getFeatureAvailabilityRequest(): Promise<FeatureAvailability> {
  const { data } = await api.get<FeatureAvailability>('/config/features')
  return data
}

/**
 * Liga ou desliga a disponibilidade das funcionalidades de IA (ADMIN).
 *
 * Só funciona quando a instalação tem suporte a IA habilitado no ambiente
 * (`manageable: true`). Caso contrário a API responde 409 AI_NOT_MANAGEABLE e
 * nada é gravado.
 */
export async function updateAiAvailabilityRequest(enabled: boolean): Promise<FeatureAvailability> {
  const { data } = await api.patch<FeatureAvailability>('/config/features/ai', { enabled })
  return data
}
