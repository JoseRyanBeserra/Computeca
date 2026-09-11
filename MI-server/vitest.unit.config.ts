// vitest.unit.config.ts — apenas testes unitários (sem DB, sem globalSetup)
// Variáveis de ambiente carregadas automaticamente de .env.test (ver .env.test.example)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/unit/**/*.test.ts'],
    // Sem globalSetup — testes unitários não precisam de banco de dados
    // Sem env hardcoded — valores carregados de .env.test
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['src/server.ts'],
    },
  },
})
