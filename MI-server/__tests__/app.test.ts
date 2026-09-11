// __tests__/app.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from './helpers/request'

describe('App health', () => {
  afterAll(async () => {
    await closeTestApp()
  })

  it('GET /health deve retornar 200 com status ok e banco disponível', async () => {
    const app = await getTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'MI-server',
      database: 'ok',
    })
  })

  it('GET /auth/health deve retornar 200 com status ok', async () => {
    const app = await getTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/auth/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'ok',
      module: 'auth',
    })
  })

  it('GET /users/health deve retornar 200 com status ok', async () => {
    const app = await getTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/users/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      status: 'ok',
      module: 'users',
    })
  })

  it('GET /rota-inexistente deve retornar 404', async () => {
    const app = await getTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/rota-inexistente',
    })

    expect(response.statusCode).toBe(404)
  })
})
