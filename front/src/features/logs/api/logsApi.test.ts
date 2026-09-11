// src/features/logs/api/logsApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../lib/api', () => ({
  api: { get: vi.fn() },
}))

import { api } from '../../../lib/api'
import { listInspectionLogsRequest } from './logsApi'

const mockApi = vi.mocked(api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('logsApi', () => {
  it('sem filtros chama /logs?', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [], total: 0, page: 1, perPage: 10 } })
    await listInspectionLogsRequest()
    expect(mockApi.get).toHaveBeenCalledWith('/logs?')
  })

  it('monta a query com todos os filtros', async () => {
    mockApi.get.mockResolvedValue({ data: { logs: [], total: 0, page: 1, perPage: 10 } })
    await listInspectionLogsRequest({
      direction: 'CLIENT_TO_SERVER',
      context: 'ctrl',
      correlationId: 'cid',
      tag: 't',
      page: 3,
      perPage: 50,
    })
    const url = mockApi.get.mock.calls[0][0] as string
    expect(url).toContain('direction=CLIENT_TO_SERVER')
    expect(url).toContain('context=ctrl')
    expect(url).toContain('correlationId=cid')
    expect(url).toContain('tag=t')
    expect(url).toContain('page=3')
    expect(url).toContain('perPage=50')
  })
})
