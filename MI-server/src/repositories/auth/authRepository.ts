// src/repositories/auth/authRepository.ts
import { type RefreshToken } from '@prisma/client'
import { prisma } from '../../database/prisma'

export async function createRefreshToken(data: {
  token: string
  userId: string
  expiresAt: Date
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data })
}

export async function findRefreshToken(
  token: string,
): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { token } })
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.delete({ where: { token } })
}

export async function deleteUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}
