// src/repositories/inspectionLog/inspectionLogRepository.ts
import { type InspectionLogDirection, type Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'

export interface PayloadEntry {
  title: string
  content?: unknown
}

export interface CreateInspectionLogParams {
  correlationId?: string
  context:        string
  direction:      InspectionLogDirection
  tag?:           string
  payload?:       PayloadEntry[]
}

export async function createInspectionLog(
  params: CreateInspectionLogParams,
): Promise<void> {
  await prisma.inspectionLog.create({
    data: {
      correlationId: params.correlationId,
      context:       params.context,
      direction:     params.direction,
      tag:           params.tag,
      payload:       params.payload as Prisma.InputJsonValue | undefined,
    },
  })
}
