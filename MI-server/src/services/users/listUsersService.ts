// src/services/users/listUsersService.ts
import { listUsers } from '../../repositories/users/usersRepository'
import { validateRequest } from '../../utils/validateRequest'
import { ListUsersQuerySchema } from '../../schemas/users/usersSchema'
import { logger } from '../../lib/logger'

export async function listUsersService(input: unknown) {
  logger.info('IN - listUsersService')
  const query = validateRequest(input, ListUsersQuerySchema)
  const result = await listUsers(query)
  logger.info('OUT - listUsersService')
  return result
}
