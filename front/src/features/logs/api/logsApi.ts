// src/features/logs/api/logsApi.ts
import { api } from '../../../lib/api'

export type LogDirection = 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT'

export interface PayloadEntry {
  title:    string
  content?: unknown
}

export interface InspectionLog {
  id:            string
  correlationId: string | null
  context:       string
  direction:     LogDirection
  tag:           string | null
  payload:       PayloadEntry[] | null
  createdAt:     string
}

export interface ListLogsResponse {
  logs:    InspectionLog[]
  total:   number
  page:    number
  perPage: number
}

export async function listInspectionLogsRequest(params?: {
  direction?:     LogDirection
  context?:       string
  correlationId?: string
  tag?:           string
  page?:          number
  perPage?:       number
}): Promise<ListLogsResponse> {
  const query = new URLSearchParams()
  if (params?.direction)     query.append('direction',     params.direction)
  if (params?.context)       query.append('context',       params.context)
  if (params?.correlationId) query.append('correlationId', params.correlationId)
  if (params?.tag)           query.append('tag',           params.tag)
  if (params?.page)          query.append('page',          String(params.page))
  if (params?.perPage)       query.append('perPage',       String(params.perPage))
  const { data } = await api.get<ListLogsResponse>(`/logs?${query}`)
  return data
}
