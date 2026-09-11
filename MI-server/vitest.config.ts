// vitest.config.ts — suite completa (unit + integration). Requer PostgreSQL no ar.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './__tests__/setup.ts',
    include: ['__tests__/**/*.test.ts'],
    // Testes de integração compartilham o mesmo banco (mi_db_test) e usam limpeza
    // global em beforeEach — precisam rodar em série para não interferirem entre si.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '3334',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/mi_db_test',
      JWT_SECRET: 'test_jwt_secret_at_least_32_characters_long',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      BCRYPT_SALT_ROUNDS: '4', // rounds baixos para testes rápidos
      ADMIN_EMAIL: 'admin@dcx.ufpb.br',
      ADMIN_PASSWORD: 'admin_test_password',
      OPENAI_API_KEY: 'test-openai-key',
      LOGIN_MAX_ATTEMPTS: '5',
      LOGIN_BLOCK_DURATION_SECONDS: '900',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['src/server.ts'],
    },
  },
})
