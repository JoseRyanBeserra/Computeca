// src/repositories/users/usersRepository.ts
import { type Prisma, type Role, type User } from '@prisma/client'
import { prisma } from '../../database/prisma'

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  canUpload: true,
  emailVerified: true,
  suspended: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data })
}

export async function updateUser(
  id: string,
  data: Prisma.UserUpdateInput,
): Promise<User> {
  return prisma.user.update({ where: { id }, data })
}

export async function listUsers(params: {
  role?: Role
  suspended?: boolean
  page?: number
  perPage?: number
}) {
  const { role, suspended, page = 1, perPage = 20 } = params
  const where: Prisma.UserWhereInput = {}

  if (role !== undefined) where.role = role
  if (suspended !== undefined) where.suspended = suspended

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      select: USER_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, perPage }
}
