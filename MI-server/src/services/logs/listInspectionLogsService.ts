// src/services/logs/listInspectionLogsService.ts
import { findInspectionLogs, type ListInspectionLogsResult } from '../../repositories/inspectionLog/listInspectionLogsRepository'
import { validateRequest } from '../../utils/validateRequest'
import { listInspectionLogsSchema } from '../../schemas/logs/listInspectionLogsSchema'
import { logger } from '../../lib/logger'

export async function listInspectionLogsService(input: unknown): Promise<ListInspectionLogsResult> {
  logger.info('IN - listInspectionLogsService')
  const query = validateRequest(input, listInspectionLogsSchema)
  const result = await findInspectionLogs(query)
  logger.info('OUT - listInspectionLogsService')
  return result
}
