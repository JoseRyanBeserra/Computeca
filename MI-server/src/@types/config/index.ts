// src/@types/config/index.ts
// Contratos de resposta da configuração de módulos.

/** Disponibilidade de um módulo governado por configuração. */
export interface IModuleAvailability {
  /**
   * Disponibilidade EFETIVA — conjunção do interruptor de ambiente com o
   * registro operacional. É o único campo que o front consulta para decidir
   * o que renderizar.
   */
  enabled: boolean
  /**
   * A instalação permite governar o módulo pelo painel administrativo.
   * Espelha o interruptor de ambiente. Consumido apenas pelo painel, para
   * apresentar o controle como bloqueado quando a instalação não tem suporte.
   */
  manageable: boolean
}

/** Disponibilidade dos módulos da instalação. */
export interface IFeatureAvailability {
  ai: IModuleAvailability
}

/** Resposta de `GET /config/features`. */
export type GetFeatureAvailabilityResponse = IFeatureAvailability
