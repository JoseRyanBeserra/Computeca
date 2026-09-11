// __tests__/integration/users/createUser.test.ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { prisma } from '../../../src/database/prisma'

// ── Limpeza entre testes ───────────────────────────────────────────────────────
// Ordem importa: InspectionLog e AuditLog têm FK para User (sem cascade) → deletar primeiro
beforeEach(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()
  await closeTestApp()
})

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_COMMON_PAYLOAD = {
  name: 'João Silva',
  email: 'joao@example.com',
  password: 'senha12345',
}

const VALID_INSTITUTIONAL_PAYLOAD = {
  name: 'Aluno UFPB',
  email: 'aluno@dcx.ufpb.br',
  password: 'senha12345',
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('POST /users — Cadastro de Usuário', () => {
  describe('casos de sucesso', () => {
    it('deve retornar 201 ao criar usuário COMMON válido', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      expect(response.statusCode).toBe(201)
    })

    it('deve retornar role COMMON e emailVerified true para e-mail comum (RF01)', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const body = response.json()
      expect(body.role).toBe('COMMON')
      expect(body.emailVerified).toBe(true)
    })

    it('deve retornar os campos do usuário criado no body', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const body = response.json()
      expect(body).toMatchObject({
        name: 'João Silva',
        email: 'joao@example.com',
        role: 'COMMON',
        canUpload: false,
        suspended: false,
      })
      expect(body.id).toBeDefined()
      expect(body.createdAt).toBeDefined()
    })

    it('deve retornar role INSTITUTIONALIZED e emailVerified false para @dcx.ufpb.br (RF02)', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_INSTITUTIONAL_PAYLOAD,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.role).toBe('INSTITUTIONALIZED')
      expect(body.emailVerified).toBe(false)
    })

    it('deve persistir o usuário no banco de dados', async () => {
      const app = await getTestApp()

      await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const userInDb = await prisma.user.findUnique({
        where: { email: VALID_COMMON_PAYLOAD.email },
      })

      expect(userInDb).not.toBeNull()
      expect(userInDb?.name).toBe('João Silva')
    })

    it('deve gerar registro de AuditLog após o cadastro (RNF05)', async () => {
      const app = await getTestApp()

      await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const log = await prisma.auditLog.findFirst({
        where: { action: 'USER_REGISTERED' },
      })

      expect(log).not.toBeNull()
      expect(log?.action).toBe('USER_REGISTERED')
    })
  })

  describe('segurança — dados sensíveis (RNF01)', () => {
    it('nunca deve retornar passwordHash no body da resposta', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const body = response.json()
      expect(body).not.toHaveProperty('passwordHash')
    })

    it('deve armazenar a senha hasheada no banco (não em texto plano)', async () => {
      const app = await getTestApp()

      await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const userInDb = await prisma.user.findUnique({
        where: { email: VALID_COMMON_PAYLOAD.email },
      })

      expect(userInDb?.passwordHash).not.toBe(VALID_COMMON_PAYLOAD.password)
      expect(userInDb?.passwordHash).toMatch(/^\$2[ab]\$/)
    })
  })

  describe('validação de entrada — erros 422', () => {
    it('deve retornar 422 quando name está ausente', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { email: 'joao@example.com', password: 'senha123' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('deve retornar 422 quando email é inválido', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { name: 'João', email: 'nao-e-email', password: 'senha123' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('deve retornar 422 quando password tem menos de 8 caracteres', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { name: 'João', email: 'joao@example.com', password: '123' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('deve retornar 422 quando name tem menos de 2 caracteres', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { name: 'J', email: 'joao@example.com', password: 'senha123' },
      })

      expect(response.statusCode).toBe(422)
    })

    it('deve retornar 422 quando o body está completamente vazio', async () => {
      const app = await getTestApp()

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: {},
      })

      expect(response.statusCode).toBe(422)
    })
  })

  describe('conflito de e-mail — erro 409', () => {
    it('deve retornar 409 quando e-mail já está cadastrado', async () => {
      const app = await getTestApp()

      // Primeiro cadastro
      await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      // Segunda tentativa com mesmo e-mail
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve retornar code EMAIL_ALREADY_EXISTS no body do erro', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: VALID_COMMON_PAYLOAD })

      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: VALID_COMMON_PAYLOAD,
      })

      const body = response.json()
      expect(body.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('não deve criar um segundo usuário nem AuditLog no conflito', async () => {
      const app = await getTestApp()

      await app.inject({ method: 'POST', url: '/users', payload: VALID_COMMON_PAYLOAD })
      await app.inject({ method: 'POST', url: '/users', payload: VALID_COMMON_PAYLOAD })

      const usersCount = await prisma.user.count()
      const auditCount = await prisma.auditLog.count()

      expect(usersCount).toBe(1)
      expect(auditCount).toBe(1) // apenas o primeiro cadastro gerou log
    })
  })
})
