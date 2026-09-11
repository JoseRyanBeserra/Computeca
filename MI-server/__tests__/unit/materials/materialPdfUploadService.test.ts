// __tests__/unit/materials/materialPdfUploadService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────────
// Isola o service de toda I/O externa (MinIO, Prisma) para testar a regra de
// negócio das habilidades BNCC sem depender de infraestrutura.

vi.mock('../../../src/lib/minio', () => ({
  minioClient: { putObject: vi.fn().mockResolvedValue(undefined) },
  MINIO_BUCKET: 'test-bucket',
}))

vi.mock('../../../src/repositories/users/usersRepository', () => ({
  findUserById: vi.fn(),
}))

vi.mock('../../../src/repositories/resources/materials/pdf/materialPdfUploadRepository', () => ({
  createMaterialPdf: vi.fn(),
}))

vi.mock('../../../src/repositories/organizations/orgMembersRepository', () => ({
  findMembership: vi.fn(),
}))

vi.mock('../../../src/repositories/organizations/orgRepository', () => ({
  linkMaterialToOrgs: vi.fn(),
}))

import { materialPdfUploadService } from '../../../src/services/resources/materials/pdf/materialPdfUploadService'
import { findUserById } from '../../../src/repositories/users/usersRepository'
import { createMaterialPdf } from '../../../src/repositories/resources/materials/pdf/materialPdfUploadRepository'
import type { UploadMIInput } from '../../../src/@types/resources/materials/pdf'

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002'

/** Buffer de PDF válido — começa com os magic bytes "%PDF". */
const PDF_BUFFER = Buffer.from('%PDF-1.7 conteúdo de teste')

function baseInput(overrides: Partial<UploadMIInput> = {}): UploadMIInput {
  return {
    title:            'Material de Teste',
    buffer:           PDF_BUFFER,
    originalFileName: 'arquivo.pdf',
    mimeType:         'application/pdf',
    uploadedById:     USER_ID,
    ...overrides,
  }
}

/** Extrai o `habilidadesBncc` passado para o repositório de criação. */
function habilidadesPersistidas(): string[] {
  const call = vi.mocked(createMaterialPdf).mock.calls[0]?.[0]
  return call?.habilidadesBncc ?? []
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  vi.mocked(findUserById).mockResolvedValue({
    id:   USER_ID,
    name: 'Fulano de Tal',
  } as Awaited<ReturnType<typeof findUserById>>)

  // Eco da entrada — devolve o que o service mandou persistir.
  vi.mocked(createMaterialPdf).mockImplementation(async (data) => ({
    id:               'mat-0000-0000-0000-000000000001',
    title:            data.title,
    originalFileName: data.originalFileName,
    storageKey:       data.storageKey,
    mimeType:         data.mimeType,
    sizeBytes:        data.sizeBytes,
    status:           'PENDING_REVIEW',
    habilidadesBncc:  data.habilidadesBncc ?? [],
    uploadedById:     data.uploadedById,
    createdAt:        new Date('2026-01-01'),
    updatedAt:        new Date('2026-01-01'),
  } as Awaited<ReturnType<typeof createMaterialPdf>>))
})

// ── Testes ─────────────────────────────────────────────────────────────────────

describe('materialPdfUploadService — habilidades BNCC', () => {
  describe('normalização das habilidades', () => {
    it('deve assumir lista vazia quando habilidadesBncc é omitido', async () => {
      await materialPdfUploadService(baseInput())

      expect(habilidadesPersistidas()).toEqual([])
    })

    it('deve assumir lista vazia quando habilidadesBncc é explicitamente undefined', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: undefined }))

      expect(habilidadesPersistidas()).toEqual([])
    })

    it('deve remover espaços em branco ao redor de cada habilidade', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: ['  EF15LP01  ', ' EF67LP03'] }))

      expect(habilidadesPersistidas()).toEqual(['EF15LP01', 'EF67LP03'])
    })

    it('deve remover habilidades duplicadas', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: ['EF15LP01', 'EF15LP01', 'EF67LP03'] }))

      expect(habilidadesPersistidas()).toEqual(['EF15LP01', 'EF67LP03'])
    })

    it('deve descartar duplicatas que só diferem por espaços em branco', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: ['EF15LP01', '  EF15LP01  '] }))

      expect(habilidadesPersistidas()).toEqual(['EF15LP01'])
    })

    it('deve remover entradas vazias ou compostas só por espaços', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: ['EF15LP01', '', '   ', 'EF67LP03'] }))

      expect(habilidadesPersistidas()).toEqual(['EF15LP01', 'EF67LP03'])
    })

    it('deve preservar a ordem de envio das habilidades válidas', async () => {
      await materialPdfUploadService(baseInput({ habilidadesBncc: ['EF67LP03', 'EF15LP01', 'EF15LP02'] }))

      expect(habilidadesPersistidas()).toEqual(['EF67LP03', 'EF15LP01', 'EF15LP02'])
    })
  })

  describe('persistência e retorno', () => {
    it('deve persistir as habilidades normalizadas e devolvê-las no material criado', async () => {
      const result = await materialPdfUploadService(
        baseInput({ habilidadesBncc: ['EF15LP01', 'EF15LP01', '  EF67LP03  '] }),
      )

      expect(vi.mocked(createMaterialPdf)).toHaveBeenCalledWith(
        expect.objectContaining({ habilidadesBncc: ['EF15LP01', 'EF67LP03'] }),
      )
      expect(result.habilidadesBncc).toEqual(['EF15LP01', 'EF67LP03'])
    })

    it('não deve persistir material quando o tipo do arquivo é inválido', async () => {
      await expect(
        materialPdfUploadService(baseInput({ mimeType: 'image/png', habilidadesBncc: ['EF15LP01'] })),
      ).rejects.toThrow()

      expect(vi.mocked(createMaterialPdf)).not.toHaveBeenCalled()
    })
  })
})
