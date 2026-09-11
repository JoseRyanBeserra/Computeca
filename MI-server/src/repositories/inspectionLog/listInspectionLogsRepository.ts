// src/repositories/inspectionLog/listInspectionLogsRepository.ts
import { type InspectionLogDirection, type Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'

export interface IInspectionLog {
  id:            string
  correlationId: string | null
  context:       string
  direction:     InspectionLogDirection
  tag:           string | null
  payload:       Prisma.JsonValue
  createdAt:     Date
}

export interface ListInspectionLogsParams {
  direction?:     InspectionLogDirection
  context?:       string
  correlationId?: string
  tag?:           string
  page:           number
  perPage:        number
}

export interface ListInspectionLogsResult {
  logs:    IInspectionLog[]
  total:   number
  page:    number
  perPage: number
}

const LOG_SELECT = {
  id:            true,
  correlationId: true,
  context:       true,
  direction:     true,
  tag:           true,
  payload:       true,
  createdAt:     true,
} as const

export async function findInspectionLogs(
  params: ListInspectionLogsParams,
): Promise<ListInspectionLogsResult> {
  const { direction, context, correlationId, tag, page, perPage } = params

  const where: Prisma.InspectionLogWhereInput = {}

  if (direction)     where.direction     = direction
  if (correlationId) where.correlationId = correlationId
  if (context)       where.context       = { contains: context, mode: 'insensitive' }
  if (tag)           where.tag           = tag

  const [logs, total] = await prisma.$transaction([
    prisma.inspectionLog.findMany({
      where,
      select:  LOG_SELECT,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * perPage,
      take:    perPage,
    }),
    prisma.inspectionLog.count({ where }),
  ])

  return { logs, total, page, perPage }
}
