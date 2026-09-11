// src/features/materials/api/materialsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

import { api } from '../../../lib/api'
import {
  uploadMaterialRequest,
  listMyMaterialsRequest,
  getMaterialByIdRequest,
  listPublicMaterialsRequest,
  listAllMaterialsRequest,
  reviewMaterialRequest,
  materialChatRequest,
  listHabilidadesRequest,
} from './materialsApi'

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('materialsApi', () => {
  it('uploadMaterialRequest envia FormData para /mis (sem organização)', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'm1' } })
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' })

    const result = await uploadMaterialRequest({ file, title: '  Titulo  ', habilidadesBncc: ['EF01', 'EF02'] })

    expect(result).toEqual({ id: 'm1' })
    const [url, formData, config] = mockApi.post.mock.calls[0]
    expect(url).toBe('/mis')
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })
    const fd = formData as FormData
    expect(fd.get('title')).toBe('Titulo') // trim aplicado
    expect(fd.getAll('habilidadesBncc')).toEqual(['EF01', 'EF02'])
  })

  it('uploadMaterialRequest usa a rota da organização quando organizationId é passado', async () => {
    mockApi.post.mockResolvedValue({ data: {} })
    const file = new File(['x'], 'a.pdf')
    await uploadMaterialRequest({ file, organizationId: 'org1' })
    expect(mockApi.post.mock.calls[0][0]).toBe('/organizations/org1/mis')
  })

  it('listMyMaterialsRequest chama GET /mis/me', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    await listMyMaterialsRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/mis/me')
  })

  it('getMaterialByIdRequest inclui o id na URL', async () => {
    mockApi.get.mockResolvedValue({ data: { id: 'm9' } })
    await getMaterialByIdRequest('m9')
    expect(mockApi.get).toHaveBeenCalledWith('/mis/m9')
  })

  it('listPublicMaterialsRequest monta a query com paginação, habilidades e semHabilidade', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 10 } })
    await listPublicMaterialsRequest({ page: 2, perPage: 10, habilidades: ['EF01', 'EF02'], semHabilidade: true })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('page=2')
    expect(url).toContain('perPage=10')
    expect(url).toContain('habilidades=EF01')
    expect(url).toContain('habilidades=EF02')
    expect(url).toContain('semHabilidade=true')
  })

  it('listPublicMaterialsRequest inclui search na query e ignora termo vazio', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 25 } })
    await listPublicMaterialsRequest({ search: '  cálculo ' })
    expect(mockApi.get.mock.calls[0][0]).toContain(`search=${encodeURIComponent('cálculo')}`)

    await listPublicMaterialsRequest({ search: '   ' })
    expect(mockApi.get.mock.calls[1][0]).not.toContain('search=')
  })

  it('listAllMaterialsRequest filtra por status', async () => {
    mockApi.get.mockResolvedValue({ data: { materials: [], total: 0, page: 1, perPage: 10 } })
    await listAllMaterialsRequest({ status: 'APPROVED' })
    expect(mockApi.get.mock.calls[0][0]).toContain('status=APPROVED')
  })

  it('reviewMaterialRequest faz PATCH com a decisão', async () => {
    mockApi.patch.mockResolvedValue({ data: {} })
    await reviewMaterialRequest('m1', 'APPROVED')
    expect(mockApi.patch).toHaveBeenCalledWith('/mis/m1/review', { decision: 'APPROVED' })
  })

  it('materialChatRequest faz POST com a pergunta', async () => {
    mockApi.post.mockResolvedValue({ data: { answer: 'oi', chunksUsed: 2 } })
    const res = await materialChatRequest('m1', 'Qual o tema?')
    expect(mockApi.post).toHaveBeenCalledWith('/mis/m1/chat', { question: 'Qual o tema?' })
    expect(res.chunksUsed).toBe(2)
  })

  it('listHabilidadesRequest chama GET /mis/habilidades', async () => {
    mockApi.get.mockResolvedValue({ data: ['EF01'] })
    expect(await listHabilidadesRequest()).toEqual(['EF01'])
    expect(mockApi.get).toHaveBeenCalledWith('/mis/habilidades')
  })
})
