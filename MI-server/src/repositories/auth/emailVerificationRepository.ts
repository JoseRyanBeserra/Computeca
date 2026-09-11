// src/repositories/auth/emailVerificationRepository.ts
import { prisma } from '../../database/prisma'

interface CreateEmailVerificationTokenInput {
  token:     string
  userId:    string
  expiresAt: Date
}

export async function createEmailVerificationToken(
  input: CreateEmailVerificationTokenInput,
): Promise<void> {
  await prisma.emailVerificationToken.create({ data: input })
}

export async function findEmailVerificationToken(token: string) {
  return prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  })
}

export async function deleteEmailVerificationToken(token: string): Promise<void> {
  await prisma.emailVerificationToken.delete({ where: { token } })
}

export async function deleteAllEmailVerificationTokensForUser(userId: string): Promise<void> {
  await prisma.emailVerificationToken.deleteMany({ where: { userId } })
}
