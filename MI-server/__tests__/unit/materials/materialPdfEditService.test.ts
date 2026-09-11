// __tests__/unit/materials/materialPdfEditService.test.ts
//
// O que estes testes protegem é a ORDEM DAS OPERAÇÕES da substituição de
// documento, e o comportamento em cada ponto de falha. Isolar de MinIO e Prisma
// é o que permite provocar falhas que a integração não consegue reproduzir.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../src/lib/minio', () => ({
  minioClient:  { putObject: vi.fn().mockResolvedValue(undefined) },
  MINIO_BUCKET: 'test-bucket',
  removeObject: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/repositories/resources/materials/pdf/materialPdfViewRepository', () => ({
  findMaterialById: vi.fn(),
}))

vi.mock('../../../src/repositories/resources/materials/pdf/materialPdfEditRepository', () => ({
  updateMaterial: vi.fn(),
}))

vi.mock('../../../src/repositories/users/usersRepository', () => ({
  findUserById: vi.fn(),
}))

vi.mock('../../../src/repositories/audit/auditRepository', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}))

import { materialPdfEditService } from '../../../src/services/resources/materials/pdf/materialPdfEditService'
import { minioClient, removeObject } from '../../../src/lib/minio'
import { findMaterialById } from '../../../src/repositories/resources/materials/pdf/materialPdfViewRepository'
import { updateMaterial } from '../../../src/repositories/resources/materials/pdf/materialPdfEditRepository'
import { findUserById } from '../../../src/repositories/users/usersRepository'
import { createAuditLog } from '../../../src/repositories/audit/auditRepository'

const MATERIAL_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const USER_ID     = 'bbbbbbbb-0000-4000-8000-000000000002'
const CHAVE_ANTIGA = 'chave-antiga.pdf'

const PDF_NOVO  = Buffer.from('%PDF-1.7 documento novo')
const DESCRICAO = 'd'.repeat(60)

function materialAtual(overrides = {}) {
  return {
    id:               MATERIAL_ID,
    title:            'Título original',
    description:      DESCRICAO,
    originalFileName: 'antigo.pdf',
    storageKey:       CHAVE_ANTIGA,
    mimeType:         'application/pdf',
    sizeBytes:        1024,
    status:           'APPROVED',
    habilidadesBncc:  [],
    uploadedById:     USER_ID,
    createdAt:        new Date(),
    updatedAt:        new Date(),
    ...overrides,
  }
}

function input(overrides = {}) {
  return {
    materialId:  MATERIAL_ID,
    title:       'Título novo',
    description: DESCRICAO,
    editedById:  USER_ID,
    actorRole:   'ADMIN' as const,
    buffer:           PDF_NOVO,
    originalFileName: 'novo.pdf',
    mimeType:         'application/pdf',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(findMaterialById).mockResolvedValue(materialAtual() as never)
  vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, name: 'Ana Souza' } as never)
  vi.mocked(updateMaterial).mockResolvedValue(materialAtual({ title: 'Título novo' }) as never)
})

describe('materialPdfEditService — ordem das operações', () => {
  it('grava o arquivo novo ANTES de atualizar o registro', async () => {
    const ordem: string[] = []
    vi.mocked(minioClient.putObject).mockImplementation(async () => {
      ordem.push('put'); return undefined as never
    })
    vi.mocked(updateMaterial).mockImplementation(async () => {
      ordem.push('update'); return materialAtual() as never
    })
    vi.mocked(removeObject).mockImplementation(async () => { ordem.push('remove') })

    await materialPdfEditService(input())

    // A remoção do antigo é sempre a ÚLTIMA etapa: enquanto o registro não
    // aponta para o novo, o documento anterior precisa continuar servível.
    expect(ordem).toEqual(['put', 'update', 'remove'])
  })

  it('remove o arquivo ANTERIOR, nunca o novo', async () => {
    await materialPdfEditService(input())

    expect(removeObject).toHaveBeenCalledTimes(1)
    expect(removeObject).toHaveBeenCalledWith(CHAVE_ANTIGA)
  })

  it('usa chave nova, diferente da anterior', async () => {
    await materialPdfEditService(input())

    const chaveUsada = vi.mocked(minioClient.putObject).mock.calls[0][1]
    expect(chaveUsada).not.toBe(CHAVE_ANTIGA)
  })
})

describe('materialPdfEditService — falhas (FR-011)', () => {
  it('falha ao atualizar o registro REMOVE o arquivo novo e nada muda', async () => {
    vi.mocked(updateMaterial).mockRejectedValue(new Error('banco indisponível'))

    await expect(materialPdfEditService(input())).rejects.toThrow('banco indisponível')

    // Compensação: o arquivo novo estava no armazenamento sem ninguém apontando
    // para ele. A chave removida é a NOVA — a antiga segue intacta.
    expect(removeObject).toHaveBeenCalledTimes(1)
    expect(removeObject).not.toHaveBeenCalledWith(CHAVE_ANTIGA)
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('falha ao remover o arquivo ANTIGO não desfaz a edição', async () => {
    vi.mocked(removeObject).mockRejectedValue(new Error('armazenamento fora do ar'))

    const resultado = await materialPdfEditService(input())

    // Assimetria deliberada: arquivo órfão é incômodo, material sem documento
    // acessível é tela quebrada. A edição vale, e o registro é gravado.
    expect(resultado).toBeDefined()
    expect(createAuditLog).toHaveBeenCalledTimes(1)
  })

  it('falha ao gravar o arquivo novo não toca em nada', async () => {
    vi.mocked(minioClient.putObject).mockRejectedValue(new Error('sem espaço'))

    await expect(materialPdfEditService(input())).rejects.toThrow('sem espaço')

    expect(updateMaterial).not.toHaveBeenCalled()
    expect(removeObject).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })

  it('arquivo inválido é recusado antes de qualquer escrita', async () => {
    await expect(
      materialPdfEditService(input({ buffer: Buffer.from('nao e pdf') })),
    ).rejects.toThrow()

    expect(minioClient.putObject).not.toHaveBeenCalled()
    expect(updateMaterial).not.toHaveBeenCalled()
    expect(removeObject).not.toHaveBeenCalled()
  })
})

describe('materialPdfEditService — sem troca de documento', () => {
  it('não toca no armazenamento quando só os metadados mudam', async () => {
    await materialPdfEditService(
      input({ buffer: undefined, originalFileName: undefined, mimeType: undefined }),
    )

    expect(minioClient.putObject).not.toHaveBeenCalled()
    expect(removeObject).not.toHaveBeenCalled()
    expect(updateMaterial).toHaveBeenCalledTimes(1)
  })

  it('edição sem alteração nenhuma não atualiza e não registra (FR-017)', async () => {
    await materialPdfEditService(
      input({
        title:            'Título original',
        description:      DESCRICAO,
        buffer:           undefined,
        originalFileName: undefined,
        mimeType:         undefined,
      }),
    )

    expect(updateMaterial).not.toHaveBeenCalled()
    expect(createAuditLog).not.toHaveBeenCalled()
  })
})
