/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Configuração dedicada de testes — usa apenas o plugin do React (o Tailwind
// não é necessário no ambiente de teste) e o ambiente jsdom para componentes.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      // Excluídos: ponto de entrada, tipos puros e arquivos de teste/config.
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/**/*.d.ts',
      ],
    },
  },
})
