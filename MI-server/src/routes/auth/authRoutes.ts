// src/routes/auth/authRoutes.ts
import type { FastifyInstance } from 'fastify'
import { LoginSchema } from '../../schemas/auth/authSchema'
import {
  loginController,
  refreshController,
  logoutController,
} from '../../controllers/auth/authController'
import { emailVerificationController } from '../../controllers/auth/emailVerificationController'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    module: 'auth',
    timestamp: new Date().toISOString(),
  }))

  // RF — POST /auth/login — Autenticação com e-mail e senha
  app.post(
    '/login',
    {
      schema: { body: LoginSchema },
    },
    loginController,
  )

  // POST /auth/refresh — Renovação do access token via refresh token (cookie)
  app.post('/refresh', refreshController)

  // POST /auth/logout — Encerramento de sessão (invalida o refresh token no servidor)
  app.post('/logout', logoutController)

  // POST /auth/verify-email — Confirmação de e-mail institucional via código de 6 dígitos
  app.post('/verify-email', emailVerificationController)
}
