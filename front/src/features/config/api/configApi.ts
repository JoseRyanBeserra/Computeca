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
