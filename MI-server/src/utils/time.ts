// src/utils/time.ts
// Utilitários de manipulação de tempo

/**
 * Converte uma string de duração (ex.: '7d', '15m', '1h', '30s')
 * em um objeto Date representando o instante futuro correspondente.
 *
 * Unidades suportadas: s (segundos), m (minutos), h (horas), d (dias).
 * Unidade desconhecida é tratada como minutos.
 */
export function parseDurationToDate(duration: string): Date {
  const unit = duration.slice(-1)
  const value = parseInt(duration.slice(0, -1), 10)

  const msPerUnit: Record<string, number> = {
    s: 1_000,
    m: 60 * 1_000,
    h: 60 * 60 * 1_000,
    d: 24 * 60 * 60 * 1_000,
  }

  const ms = (msPerUnit[unit] ?? msPerUnit['m']) * value
  return new Date(Date.now() + ms)
}
