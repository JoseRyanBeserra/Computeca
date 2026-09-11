// src/features/organizations/api/organizationsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import { api } from '../../../lib/api'
import {
  createOrganizationRequest,
  listMyOrganizationsRequest,
  updateOrganizationRequest,
  archiveOrganizationRequest,
  listOrgMembersRequest,
  removeMemberRequest,
  leaveOrganizationRequest,
  inviteUserRequest,
  cancelInviteRequest,
  listMyInvitesRequest,
  pendingInviteCountRequest,
  respondInviteRequest,
  listOrgMaterialsRequest,
  uploadOrgMaterialRequest,
} from './organizationsApi'

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('organizationsApi', () => {
  it('createOrganizationRequest faz POST /organizations', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'o1' } })
    await createOrganizationRequest({ name: 'Alpha', description: 'x' })
    expect(mockApi.post).toHaveBeenCalledWith('/organizations', { name: 'Alpha', description: 'x' })
  })

  it('listMyOrganizationsRequest faz GET /organizations/mine', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    await listMyOrganizationsRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/mine')
  })

  it('updateOrganizationRequest faz PUT com o orgId', async () => {
    mockApi.put.mockResolvedValue({ data: {} })
    await updateOrganizationRequest('o1', { name: 'Novo' })
    expect(mockApi.put).toHaveBeenCalledWith('/organizations/o1', { name: 'Novo' })
  })

  it('archiveOrganizationRequest faz DELETE /organizations/:id', async () => {
    mockApi.delete.mockResolvedValue({ data: {} })
    await archiveOrganizationRequest('o1')
    expect(mockApi.delete).toHaveBeenCalledWith('/organizations/o1')
  })

  it('listOrgMembersRequest faz GET dos membros', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    await listOrgMembersRequest('o1')
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/o1/members')
  })

  it('removeMemberRequest faz DELETE do membro', async () => {
    mockApi.delete.mockResolvedValue({ data: undefined })
    await removeMemberRequest('o1', 'u1')
    expect(mockApi.delete).toHaveBeenCalledWith('/organizations/o1/members/u1')
  })

  it('leaveOrganizationRequest faz DELETE /leave', async () => {
    mockApi.delete.mockResolvedValue({ data: undefined })
    await leaveOrganizationRequest('o1')
    expect(mockApi.delete).toHaveBeenCalledWith('/organizations/o1/leave')
  })

  it('inviteUserRequest faz POST com o e-mail', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'i1' } })
    await inviteUserRequest('o1', 'a@b.com')
    expect(mockApi.post).toHaveBeenCalledWith('/organizations/o1/invites', { email: 'a@b.com' })
  })

  it('cancelInviteRequest faz DELETE do convite', async () => {
    mockApi.delete.mockResolvedValue({ data: undefined })
    await cancelInviteRequest('i1')
    expect(mockApi.delete).toHaveBeenCalledWith('/organizations/invites/i1')
  })

  it('listMyInvitesRequest e pendingInviteCountRequest usam os endpoints corretos', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    await listMyInvitesRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/invites/mine')

    mockApi.get.mockResolvedValue({ data: { count: 3 } })
    const res = await pendingInviteCountRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/invites/pending-count')
    expect(res.count).toBe(3)
  })

  it('respondInviteRequest faz PATCH com a ação', async () => {
    mockApi.patch.mockResolvedValue({ data: undefined })
    await respondInviteRequest('i1', 'ACCEPT')
    expect(mockApi.patch).toHaveBeenCalledWith('/organizations/invites/i1/respond', { action: 'ACCEPT' })
  })

  it('listOrgMaterialsRequest faz GET dos materiais', async () => {
    mockApi.get.mockResolvedValue({ data: [] })
    await listOrgMaterialsRequest('o1')
    expect(mockApi.get).toHaveBeenCalledWith('/organizations/o1/materials')
  })

  it('uploadOrgMaterialRequest envia FormData para a rota da org', async () => {
    mockApi.post.mockResolvedValue({ data: { id: 'm1' } })
    const file = new File(['x'], 'a.pdf')
    await uploadOrgMaterialRequest('o1', { file, title: ' Aula ' })
    const [url, formData, config] = mockApi.post.mock.calls[0]
    expect(url).toBe('/organizations/o1/mis')
    expect((formData as FormData).get('title')).toBe('Aula')
    expect(config).toMatchObject({ headers: { 'Content-Type': 'multipart/form-data' } })
  })
})
