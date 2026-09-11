// src/features/organizations/api/organizationsApi.ts
import { api } from '../../../lib/api'

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface OrganizationDTO {
  id:          string
  name:        string
  description: string | null
  status:      'ACTIVE' | 'ARCHIVED'
  createdById: string
  createdAt:   string
  updatedAt:   string
}

export interface OrgListItemDTO {
  id:          string
  name:        string
  description: string | null
  status:      'ACTIVE' | 'ARCHIVED'
  myRole:      'ADMIN' | 'PROFESSOR' | 'MEMBER'
  memberCount: number
  createdAt:   string
}

export interface OrgMemberDTO {
  id:             string
  organizationId: string
  userId:         string
  role:           'ADMIN' | 'PROFESSOR' | 'MEMBER'
  joinedAt:       string
  user:           { name: string; email: string }
}

export interface OrgInviteDTO {
  id:             string
  organizationId: string
  invitedUserId:  string
  invitedById:    string
  status:         'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt:      string
  respondedAt:    string | null
  organization:   { name: string }
  invitedBy:      { name: string }
}

// ── API Calls ─────────────────────────────────────────────────────────────────

export async function createOrganizationRequest(input: {
  name: string; description?: string
}): Promise<OrganizationDTO> {
  const { data } = await api.post<OrganizationDTO>('/organizations', input)
  return data
}

export async function listMyOrganizationsRequest(): Promise<OrgListItemDTO[]> {
  const { data } = await api.get<OrgListItemDTO[]>('/organizations/mine')
  return data
}

// ── Admin: listagem de todas as organizações ──────────────────────────────────

export interface AdminOrganizationDTO {
  id:          string
  name:        string
  description: string | null
  status:      'ACTIVE' | 'ARCHIVED'
  createdById: string
  memberCount: number
  createdAt:   string
}

export interface ListAllOrganizationsResponse {
  organizations: AdminOrganizationDTO[]
  total:         number
  page:          number
  perPage:       number
}

export async function listAllOrganizationsRequest(params?: {
  status?:  'ACTIVE' | 'ARCHIVED'
  page?:    number
  perPage?: number
}): Promise<ListAllOrganizationsResponse> {
  const query = new URLSearchParams()
  if (params?.status)  query.append('status',  params.status)
  if (params?.page)    query.append('page',    String(params.page))
  if (params?.perPage) query.append('perPage', String(params.perPage))
  const { data } = await api.get<ListAllOrganizationsResponse>(`/organizations/all?${query}`)
  return data
}

export async function updateOrganizationRequest(
  orgId: string,
  input: { name?: string; description?: string },
): Promise<OrganizationDTO> {
  const { data } = await api.put<OrganizationDTO>(`/organizations/${orgId}`, input)
  return data
}

export async function archiveOrganizationRequest(orgId: string): Promise<OrganizationDTO> {
  const { data } = await api.delete<OrganizationDTO>(`/organizations/${orgId}`)
  return data
}

export async function listOrgMembersRequest(orgId: string): Promise<OrgMemberDTO[]> {
  const { data } = await api.get<OrgMemberDTO[]>(`/organizations/${orgId}/members`)
  return data
}

export async function removeMemberRequest(orgId: string, userId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/members/${userId}`)
}

export async function leaveOrganizationRequest(orgId: string): Promise<void> {
  await api.delete(`/organizations/${orgId}/leave`)
}

export async function inviteUserRequest(orgId: string, email: string): Promise<OrgInviteDTO> {
  const { data } = await api.post<OrgInviteDTO>(`/organizations/${orgId}/invites`, { email })
  return data
}

export async function cancelInviteRequest(inviteId: string): Promise<void> {
  await api.delete(`/organizations/invites/${inviteId}`)
}

export async function listMyInvitesRequest(): Promise<OrgInviteDTO[]> {
  const { data } = await api.get<OrgInviteDTO[]>('/organizations/invites/mine')
  return data
}

export async function pendingInviteCountRequest(): Promise<{ count: number }> {
  const { data } = await api.get<{ count: number }>('/organizations/invites/pending-count')
  return data
}

export async function respondInviteRequest(
  inviteId: string,
  action: 'ACCEPT' | 'REJECT',
): Promise<void> {
  await api.patch(`/organizations/invites/${inviteId}/respond`, { action })
}

// ── Materials ─────────────────────────────────────────────────────────────────

export interface OrgMaterialDTO {
  id:               string
  title:            string
  originalFileName: string
  storageKey:       string
  mimeType:         string
  sizeBytes:        number
  status:           'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  uploadedById:     string
  createdAt:        string
  updatedAt:        string
}

export interface UploadOrgMaterialPayload {
  file:   File
  title?: string
}

export async function listOrgMaterialsRequest(orgId: string): Promise<OrgMaterialDTO[]> {
  const { data } = await api.get<OrgMaterialDTO[]>(`/organizations/${orgId}/materials`)
  return data
}

export async function uploadOrgMaterialRequest(
  orgId:   string,
  payload: UploadOrgMaterialPayload,
): Promise<OrgMaterialDTO> {
  const formData = new FormData()
  formData.append('file', payload.file)
  if (payload.title?.trim()) formData.append('title', payload.title.trim())
  const { data } = await api.post<OrgMaterialDTO>(
    `/organizations/${orgId}/mis`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}
