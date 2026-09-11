// src/features/logs/hooks/useInspectionLogs.ts
import { useQuery } from '@tanstack/react-query'
import { listInspectionLogsRequest, type LogDirection } from '../api/logsApi'

interface UseInspectionLogsParams {
  direction?:     LogDirection
  context?:       string
  correlationId?: string
  tag?:           string
  page?:          number
  perPage?:       number
}

export function useInspectionLogs(params?: UseInspectionLogsParams) {
  return useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn:  () => listInspectionLogsRequest(params),
  })
}
