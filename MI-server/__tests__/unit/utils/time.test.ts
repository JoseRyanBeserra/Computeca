// __tests__/unit/utils/time.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseDurationToDate } from '../../../src/utils/time'

const NOW = new Date('2026-01-01T00:00:00.000Z').getTime()

describe('parseDurationToDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('converte segundos (s)', () => {
    expect(parseDurationToDate('30s').getTime()).toBe(NOW + 30 * 1000)
  })

  it('converte minutos (m)', () => {
    expect(parseDurationToDate('15m').getTime()).toBe(NOW + 15 * 60 * 1000)
  })

  it('converte horas (h)', () => {
    expect(parseDurationToDate('2h').getTime()).toBe(NOW + 2 * 60 * 60 * 1000)
  })

  it('converte dias (d)', () => {
    expect(parseDurationToDate('7d').getTime()).toBe(NOW + 7 * 24 * 60 * 60 * 1000)
  })

  it('trata unidade desconhecida como minutos (fallback)', () => {
    // "10x" → unidade "x" desconhecida → tratada como minutos
    expect(parseDurationToDate('10x').getTime()).toBe(NOW + 10 * 60 * 1000)
  })
})
