// src/schemas/users/usersSchema.ts
import { z } from 'zod'

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must have at least 8 characters'),
})

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((data) => !(data.newPassword && !data.currentPassword), {
    message: 'currentPassword is required when setting a new password',
    path: ['currentPassword'],
  })

export const ListUsersQuerySchema = z.object({
  role: z
    .enum(['COMMON', 'INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'])
    .optional(),
  suspended: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
})

export type CreateUserRequest = z.infer<typeof CreateUserSchema>
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>
export type ListUsersRequest = z.infer<typeof ListUsersQuerySchema>
