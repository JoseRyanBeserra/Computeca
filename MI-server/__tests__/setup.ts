// __tests__/setup.ts
import { execSync } from 'child_process'

export async function setup(): Promise<void> {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/mi_db_test',
    },
  })
  console.log('✅ Banco de teste migrado')
}

export async function teardown(): Promise<void> {
  console.log('✅ Suite de testes finalizada')
}
