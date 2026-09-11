// src/repositories/organizations/orgInvitesRepository.ts
import { prisma } from '../../database/prisma'
import type { IOrganizationInvite } from '../../@types/organizations'

const INVITE_SELECT = {
  id:             true,
  organizationId: true,
  invitedUserId:  true,
  invitedById:    true,
  status:         true,
  createdAt:      true,
  respondedAt:    true,
  organization: { select: { name: true } },
  invitedBy:    { select: { name: true } },
} as const

export async function findInviteById(id: string): Promise<IOrganizationInvite | null> {
  return prisma.organizationInvite.findUnique({ where: { id }, select: INVITE_SELECT })
}

export async function findPendingInvite(
  organizationId: string,
  invitedUserId: string,
): Promise<{ id: string } | null> {
  return prisma.organizationInvite.findFirst({
    where:  { organizationId, invitedUserId, status: 'PENDING' },
    select: { id: true },
  })
}

export async function createInvite(params: {
  organizationId: string
  invitedUserId:  string
  invitedById:    string
}): Promise<IOrganizationInvite> {
  return prisma.organizationInvite.create({
    data:   params,
    select: INVITE_SELECT,
  })
}

export async function updateInviteStatus(
  id: string,
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED',
): Promise<void> {
  await prisma.organizationInvite.update({
    where: { id },
    data:  { status, respondedAt: new Date() },
  })
}

export async function listMyInvites(invitedUserId: string): Promise<IOrganizationInvite[]> {
  return prisma.organizationInvite.findMany({
    where:   { invitedUserId },
    select:  INVITE_SELECT,
    orderBy: { createdAt: 'desc' },
  })
}

export async function countPendingInvites(invitedUserId: string): Promise<number> {
  return prisma.organizationInvite.count({
    where: { invitedUserId, status: 'PENDING' },
  })
}
