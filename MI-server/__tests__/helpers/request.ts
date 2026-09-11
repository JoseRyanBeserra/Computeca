// __tests__/helpers/request.ts
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../src/app'

let appInstance: FastifyInstance | null = null

export async function getTestApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = buildApp()
    await appInstance.ready()
  }
  return appInstance
}

export async function closeTestApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close()
    appInstance = null
  }
}
