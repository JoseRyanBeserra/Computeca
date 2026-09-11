// vitest.integration.config.ts — apenas testes de integração (requer PostgreSQL no ar)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './__tests__/setup.ts',
    include: ['__tests__/integration/**/*.test.ts'],
    // Compartilham o banco de teste e usam limpeza global — rodam em série.
    fileParallelism: false,
    // Aponta explicitamente para o banco de TESTE (mi_db_test), nunca o de desenvolvimento.
    env: {
      NODE_ENV: 'test',
      PORT: '3334',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/mi_db_test',
      JWT_SECRET: 'test_jwt_secret_at_least_32_characters_long',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      BCRYPT_SALT_ROUNDS: '4',
      ADMIN_EMAIL: 'admin@dcx.ufpb.br',
      ADMIN_PASSWORD: 'admin_test_password',
      OPENAI_API_KEY: 'test-openai-key',
      LOGIN_MAX_ATTEMPTS: '5',
      LOGIN_BLOCK_DURATION_SECONDS: '900',
    },
  },
})
