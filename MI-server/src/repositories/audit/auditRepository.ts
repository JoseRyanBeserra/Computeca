// src/repositories/audit/auditRepository.ts
import { type Prisma, type Role } from '@prisma/client'
import { prisma } from '../../database/prisma'

export interface CreateAuditLogParams {
  actorId?: string
  actorRole?: Role
  targetId?: string
  action: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(
  params: CreateAuditLogParams,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      targetId: params.targetId,
      action: params.action,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  })
}
