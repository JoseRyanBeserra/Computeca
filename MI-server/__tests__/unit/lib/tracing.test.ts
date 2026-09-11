// __tests__/unit/lib/tracing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
// Substitui o tracer real por um fake que executa o callback e registra o que o
// helper fez com o span (atributos, exceções, status, end).

const { mockSpan, mockTracer, SpanStatusCode } = vi.hoisted(() => {
  const mockSpan = {
    setAttribute:   vi.fn(),
    recordException: vi.fn(),
    setStatus:      vi.fn(),
    end:            vi.fn(),
  }
  return {
    mockSpan,
    mockTracer: {
      startActiveSpan: vi.fn((_name: string, _opts: unknown, fn: (span: unknown) => unknown) =>
        fn(mockSpan),
      ),
    },
    SpanStatusCode: { ERROR: 2, OK: 1, UNSET: 0 },
  }
})

vi.mock('@opentelemetry/api', () => ({
  trace: { getTracer: vi.fn(() => mockTracer) },
  SpanStatusCode,
}))

import { withSpan, withSpanSync } from '../../../src/lib/tracing'

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSpan.setAttribute.mockReset()
  mockSpan.recordException.mockReset()
  mockSpan.setStatus.mockReset()
  mockSpan.end.mockReset()
  mockTracer.startActiveSpan.mockClear()
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('lib/tracing — withSpan', () => {
  it('abre o span com nome e atributos e devolve o valor da função', async () => {
    const result = await withSpan('mi.upload', { 'mi.id': 'abc' }, async () => 42)

    expect(result).toBe(42)
    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      'mi.upload',
      { attributes: { 'mi.id': 'abc' } },
      expect.any(Function),
    )
    expect(mockSpan.end).toHaveBeenCalledOnce()
  })

  it('entrega o span à função, permitindo atributos calculados durante a execução', async () => {
    await withSpan('mi.chat.rag', {}, async (span) => {
      span.setAttribute('busca.trechos_usados', 3)
    })

    expect(mockSpan.setAttribute).toHaveBeenCalledWith('busca.trechos_usados', 3)
  })

  it('registra a exceção, marca o span como erro e repropaga', async () => {
    const boom = new Error('minio fora do ar')

    await expect(
      withSpan('mi.upload.minio_put', {}, async () => { throw boom }),
    ).rejects.toThrow('minio fora do ar')

    expect(mockSpan.recordException).toHaveBeenCalledWith(boom)
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code:    SpanStatusCode.ERROR,
      message: 'minio fora do ar',
    })
    expect(mockSpan.end).toHaveBeenCalledOnce()
  })

  it('converte valores lançados que não são Error', async () => {
    await expect(
      withSpan('op', {}, async () => { throw 'falha textual' }),
    ).rejects.toBe('falha textual')

    expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error))
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code:    SpanStatusCode.ERROR,
      message: 'falha textual',
    })
  })
})

describe('lib/tracing — withSpanSync', () => {
  it('devolve o valor da função síncrona e encerra o span', () => {
    const result = withSpanSync('mi.vetorizacao.chunking', { 'mi.caracteres': 10 }, () => ['a', 'b'])

    expect(result).toEqual(['a', 'b'])
    expect(mockTracer.startActiveSpan).toHaveBeenCalledWith(
      'mi.vetorizacao.chunking',
      { attributes: { 'mi.caracteres': 10 } },
      expect.any(Function),
    )
    expect(mockSpan.end).toHaveBeenCalledOnce()
  })

  it('registra a exceção, marca o span como erro e repropaga', () => {
    const boom = new Error('pdf inválido')

    expect(() => withSpanSync('mi.upload.validar_pdf', {}, () => { throw boom })).toThrow('pdf inválido')

    expect(mockSpan.recordException).toHaveBeenCalledWith(boom)
    expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.ERROR, message: 'pdf inválido' })
    expect(mockSpan.end).toHaveBeenCalledOnce()
  })
})
