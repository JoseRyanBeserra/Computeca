// __tests__/unit/materials/materialPdfSummaryService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
// O service de resumo depende de OpenAI, Qdrant, repositório e logs.
// Mockamos toda a I/O externa para testar a orquestração e o cache.

const { openaiMock, qdrantScroll } = vi.hoisted(() => ({
  openaiMock: {
    chat: { completions: { create: vi.fn() } },
  },
  qdrantScroll: vi.fn(),
}))

vi.mock('../../../src/lib/openai', () => ({ openai: openaiMock }))
vi.mock('../../../src/lib/qdrant', () => ({
  getQdrant: vi.fn(async () => ({ scroll: qdrantScroll })),
  QDRANT_COLLECTION: 'test-collection',
}))
vi.mock('../../../src/repositories/resources/materials/pdf/materialPdfSummaryRepository', () => ({
  findMaterialForSummary:  vi.fn(),
  claimSummaryGeneration:  vi.fn(),
  saveSummary:             vi.fn(),
  markSummaryFailed:       vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../src/repositories/inspectionLog/inspectionLogRepository', () => ({
  createInspectionLog: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { materialPdfSummaryService } from '../../../src/services/resources/materials/pdf/materialPdfSummaryService'
import {
  findMaterialForSummary,
  claimSummaryGeneration,
  saveSummary,
  markSummaryFailed,
} from '../../../src/repositories/resources/materials/pdf/materialPdfSummaryRepository'

// ── Helpers ────────────────────────────────────────────────────────────────────

const MATERIAL_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID     = 'bbbbbbbb-0000-4000-8000-000000000002'
const GENERATED_AT = new Date('2026-07-28T00:00:00.000Z')

type MaterialForSummary = Awaited<ReturnType<typeof findMaterialForSummary>>

function input(overrides: Record<string, unknown> = {}) {
  return { materialId: MATERIAL_ID, userId: USER_ID, ...overrides }
}

function material(overrides: Partial<NonNullable<MaterialForSummary>> = {}): MaterialForSummary {
  return {
    id:                 MATERIAL_ID,
    status:             'APPROVED',
    vectorStatus:       'DONE',
    summary:            null,
    summaryStatus:      'PENDING',
    summaryGeneratedAt: null,
    ...overrides,
  } as MaterialForSummary
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(findMaterialForSummary).mockResolvedValue(material())
  vi.mocked(claimSummaryGeneration).mockResolvedValue(true)
  vi.mocked(saveSummary).mockResolvedValue(GENERATED_AT)
  qdrantScroll.mockResolvedValue({
    points: [
      { id: '1', payload: { chunkIndex: 1, text: 'Segundo trecho do documento.' } },
      { id: '2', payload: { chunkIndex: 0, text: 'Primeiro trecho do documento.' } },
    ],
    next_page_offset: null,
  })
  openaiMock.chat.completions.create.mockResolvedValue({
    choices: [{ message: { content: 'Este material aborda o tema X e seus tópicos principais.' } }],
    usage:   { prompt_tokens: 200, completion_tokens: 80, total_tokens: 280 },
  })
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('materialPdfSummaryService', () => {
  describe('validação do material', () => {
    it('deve lançar 404 quando o material não existe', async () => {
      vi.mocked(findMaterialForSummary).mockResolvedValue(null)
      await expect(materialPdfSummaryService(input())).rejects.toMatchObject({ statusCode: 404 })
      expect(vi.mocked(claimSummaryGeneration)).not.toHaveBeenCalled()
    })

    it('deve lançar 400 quando o material não está APPROVED', async () => {
      vi.mocked(findMaterialForSummary).mockResolvedValue(material({ status: 'PENDING_REVIEW' }))
      await expect(materialPdfSummaryService(input())).rejects.toMatchObject({ statusCode: 400 })
    })

    it('deve lançar 400 quando o material ainda não foi vetorizado', async () => {
      vi.mocked(findMaterialForSummary).mockResolvedValue(material({ vectorStatus: 'PROCESSING' }))
      await expect(materialPdfSummaryService(input())).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  describe('cache', () => {
    it('deve retornar o resumo em cache sem chamar a IA quando summaryStatus é DONE', async () => {
      vi.mocked(findMaterialForSummary).mockResolvedValue(
        material({ summaryStatus: 'DONE', summary: 'Resumo já pronto.', summaryGeneratedAt: GENERATED_AT }),
      )

      const result = await materialPdfSummaryService(input())

      expect(result).toEqual({ status: 'DONE', summary: 'Resumo já pronto.', generatedAt: GENERATED_AT })
      expect(vi.mocked(claimSummaryGeneration)).not.toHaveBeenCalled()
      expect(qdrantScroll).not.toHaveBeenCalled()
      expect(openaiMock.chat.completions.create).not.toHaveBeenCalled()
    })
  })

  describe('geração na primeira visita', () => {
    it('deve gerar, persistir e retornar o resumo ordenando os chunks pelo chunkIndex', async () => {
      const result = await materialPdfSummaryService(input())

      expect(result).toEqual({
        status:      'DONE',
        summary:     'Este material aborda o tema X e seus tópicos principais.',
        generatedAt: GENERATED_AT,
      })
      expect(openaiMock.chat.completions.create).toHaveBeenCalledOnce()

      // O texto enviado à IA respeita a ordem do documento (chunkIndex 0 antes do 1).
      const userMessage = openaiMock.chat.completions.create.mock.calls[0][0].messages[1].content as string
      expect(userMessage.indexOf('Primeiro trecho')).toBeLessThan(userMessage.indexOf('Segundo trecho'))

      expect(vi.mocked(saveSummary)).toHaveBeenCalledWith(
        MATERIAL_ID,
        'Este material aborda o tema X e seus tópicos principais.',
      )
    })

    it('deve paginar o scroll do Qdrant até esgotar os chunks', async () => {
      qdrantScroll
        .mockResolvedValueOnce({
          points: [{ id: '1', payload: { chunkIndex: 0, text: 'Página um.' } }],
          next_page_offset: 'cursor-1',
        })
        .mockResolvedValueOnce({
          points: [{ id: '2', payload: { chunkIndex: 1, text: 'Página dois.' } }],
          next_page_offset: null,
        })

      await materialPdfSummaryService(input())

      expect(qdrantScroll).toHaveBeenCalledTimes(2)
      const userMessage = openaiMock.chat.completions.create.mock.calls[0][0].messages[1].content as string
      expect(userMessage).toContain('Página um.')
      expect(userMessage).toContain('Página dois.')
    })

    it('deve marcar FAILED e lançar quando não há texto vetorizado', async () => {
      qdrantScroll.mockResolvedValue({ points: [], next_page_offset: null })

      await expect(materialPdfSummaryService(input())).rejects.toMatchObject({ statusCode: 400 })
      expect(vi.mocked(markSummaryFailed)).toHaveBeenCalledWith(MATERIAL_ID)
      expect(openaiMock.chat.completions.create).not.toHaveBeenCalled()
    })

    it('deve marcar FAILED e propagar quando a geração da IA falha', async () => {
      openaiMock.chat.completions.create.mockRejectedValue(new Error('OpenAI indisponível'))

      await expect(materialPdfSummaryService(input())).rejects.toThrow('OpenAI indisponível')
      expect(vi.mocked(markSummaryFailed)).toHaveBeenCalledWith(MATERIAL_ID)
      expect(vi.mocked(saveSummary)).not.toHaveBeenCalled()
    })
  })

  describe('concorrência', () => {
    it('deve retornar PROCESSING quando outra requisição já está gerando', async () => {
      vi.mocked(claimSummaryGeneration).mockResolvedValue(false)
      // Re-leitura após perder o claim: ainda em processamento.
      vi.mocked(findMaterialForSummary)
        .mockResolvedValueOnce(material())
        .mockResolvedValueOnce(material({ summaryStatus: 'PROCESSING' }))

      const result = await materialPdfSummaryService(input())

      expect(result).toEqual({ status: 'PROCESSING', summary: null, generatedAt: null })
      expect(openaiMock.chat.completions.create).not.toHaveBeenCalled()
    })

    it('deve retornar DONE quando a geração concorrente concluiu no meio-tempo', async () => {
      vi.mocked(claimSummaryGeneration).mockResolvedValue(false)
      vi.mocked(findMaterialForSummary)
        .mockResolvedValueOnce(material())
        .mockResolvedValueOnce(
          material({ summaryStatus: 'DONE', summary: 'Gerado por outra requisição.', summaryGeneratedAt: GENERATED_AT }),
        )

      const result = await materialPdfSummaryService(input())

      expect(result).toEqual({ status: 'DONE', summary: 'Gerado por outra requisição.', generatedAt: GENERATED_AT })
      expect(openaiMock.chat.completions.create).not.toHaveBeenCalled()
    })
  })
})
