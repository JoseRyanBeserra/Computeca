# MI-server Backend Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a estrutura completa do back-end MI-server em TypeScript com Fastify, Prisma (PostgreSQL), Zod e Vitest, com todos os arquivos de infraestrutura, stubs de módulo e testes de fundação passando.

**Architecture:** Camadas globais com subpastas por domínio (controllers/, services/, repositories/, schemas/, routes/). Infraestrutura transversal (database/, errors/, middlewares/, utils/) na raiz de src/. Cada módulo (users, auth) tem seus próprios arquivos em cada camada.

**Tech Stack:** Node.js 20, TypeScript, Fastify, @fastify/jwt, @fastify/cookie, @fastify/cors, @fastify/rate-limit, @fastify/type-provider-zod, Prisma, PostgreSQL 16, Zod, bcryptjs, Vitest, Docker

---

## File Map

| Arquivo | Responsabilidade |
|---|---|
| `src/env.ts` | Valida todas as env vars com Zod na inicialização |
| `src/app.ts` | Instância Fastify + registro de plugins e rotas |
| `src/server.ts` | Entry point: chama `buildApp()` e faz `.listen()` |
| `src/database/prisma.ts` | Singleton do PrismaClient |
| `src/errors/app-error.ts` | Classe base de erro de negócio |
| `src/errors/error-handler.ts` | Handler global de erros do Fastify |
| `src/utils/hash.ts` | Helpers bcrypt: `hashPassword` e `comparePassword` |
| `src/middlewares/authenticate.ts` | Guard JWT: verifica token e augmenta FastifyRequest |
| `src/schemas/auth/auth.schema.ts` | Schemas Zod para login, refresh e reset de senha |
| `src/schemas/users/users.schema.ts` | Schemas Zod para criação, edição e listagem de usuários |
| `src/repositories/users/users.repository.ts` | Queries Prisma para o model User |
| `src/repositories/auth/auth.repository.ts` | Queries Prisma para RefreshToken |
| `src/repositories/audit/audit.repository.ts` | Inserção no model AuditLog |
| `src/services/auth/auth.service.ts` | Stub — implementado nas tasks do módulo de usuários |
| `src/services/users/users.service.ts` | Stub — implementado nas tasks do módulo de usuários |
| `src/controllers/auth/auth.controller.ts` | Stub — implementado nas tasks do módulo de usuários |
| `src/controllers/users/users.controller.ts` | Stub — implementado nas tasks do módulo de usuários |
| `src/routes/auth/auth.routes.ts` | Registra rotas de auth no Fastify (stub + /health) |
| `src/routes/users/users.routes.ts` | Registra rotas de users no Fastify (stub + /health) |
| `prisma/schema.prisma` | Models: User, RefreshToken, AuditLog |
| `prisma/seed.ts` | Cria Admin master na primeira execução |
| `__tests__/setup.ts` | Global setup: aponta para banco de teste e roda migrations |
| `__tests__/helpers/request.ts` | Sobe app Fastify para testes via `app.inject()` |
| `vitest.config.ts` | Configuração do Vitest |
| `Dockerfile` | Multi-stage: build → production |
| `docker-compose.yml` | API + PostgreSQL + Redis |

---

### Task 1: Inicializar o projeto

**Files:**
- Create: `MI-server/package.json`
- Create: `MI-server/tsconfig.json`
- Create: `MI-server/.gitignore`
- Create: `MI-server/.env.example`
- Create: `MI-server/.env`

- [ ] **Step 1: Criar diretório e inicializar npm**

```powershell
cd "C:\Users\ryane\Desktop\PROJETO MI"
mkdir MI-server
cd MI-server
npm init -y
```

- [ ] **Step 2: Instalar dependências de produção**

```bash
npm install fastify @fastify/jwt @fastify/cookie @fastify/cors @fastify/rate-limit @fastify/type-provider-zod @prisma/client zod bcryptjs dotenv
```

- [ ] **Step 3: Instalar dependências de desenvolvimento**

```bash
npm install -D typescript tsx tsup prisma vitest @vitest/coverage-v8 supertest @types/supertest @types/bcryptjs @types/node
```

- [ ] **Step 4: Criar tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

- [ ] **Step 5: Atualizar scripts e adicionar config do prisma seed em package.json**

Substituir a seção `"scripts"` e adicionar `"prisma"` ao `package.json`:

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsup src/server.ts --format cjs --out-dir dist",
  "start": "node dist/server.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio"
},
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 6: Criar .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
```

- [ ] **Step 7: Criar .env.example**

```env
# App
NODE_ENV=development
PORT=3333

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mi_db"

# JWT
JWT_SECRET=troque_por_segredo_forte_aqui
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_SALT_ROUNDS=12

# Admin seed
ADMIN_EMAIL=admin@dcx.ufpb.br
ADMIN_PASSWORD=troque_em_producao

# Rate limit (login)
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_DURATION_SECONDS=900
```

- [ ] **Step 8: Criar .env com valores para desenvolvimento**

```powershell
Copy-Item .env.example .env
```

Editar `.env` e definir:
```
JWT_SECRET=dev_secret_32chars_for_local_development
ADMIN_PASSWORD=admin123456
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: initialize MI-server project"
```

---

### Task 2: Prisma schema + singleton do cliente

**Files:**
- Create: `MI-server/prisma/schema.prisma`
- Create: `MI-server/src/database/prisma.ts`

- [ ] **Step 1: Inicializar Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Isso cria `prisma/schema.prisma` e `prisma/.env`. Ignorar o `.env` do Prisma — usamos o `.env` raiz.

- [ ] **Step 2: Substituir conteúdo de prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  COMMON
  INSTITUTIONALIZED
  PROFESSOR
  ADMIN
}

model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(COMMON)
  canUpload     Boolean  @default(false)
  emailVerified Boolean  @default(false)
  suspended     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]     @relation("AuditActor")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String?
  actorRole Role?
  targetId  String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  actor User? @relation("AuditActor", fields: [actorId], references: [id])
}
```

- [ ] **Step 3: Criar src/database/prisma.ts**

```typescript
// src/database/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

- [ ] **Step 4: Gerar o Prisma client**

```bash
npx prisma generate
```

Resultado esperado: `✔ Generated Prisma Client`

- [ ] **Step 5: Criar a migration inicial**

> ⚠️ PostgreSQL precisa estar rodando. Se ainda não estiver: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mi_db postgres:16-alpine`

```bash
npx prisma migrate dev --name init
```

Resultado esperado: migration criada em `prisma/migrations/` e schema aplicado ao banco.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and database singleton"
```

---

### Task 3: Validação de variáveis de ambiente

**Files:**
- Create: `MI-server/src/env.ts`
- Test: `MI-server/__tests__/env.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

Criar `__tests__/env.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should throw when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL

    await expect(() => import('../src/env')).rejects.toThrow(
      'Invalid environment variables',
    )
  })

  it('should throw when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET

    await expect(() => import('../src/env')).rejects.toThrow(
      'Invalid environment variables',
    )
  })

  it('should export valid env with defaults when required vars are present', async () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
    process.env.JWT_SECRET = 'test_secret'
    process.env.ADMIN_EMAIL = 'admin@test.com'
    process.env.ADMIN_PASSWORD = 'password123'

    const { env } = await import('../src/env')

    expect(env.PORT).toBe(3333)
    expect(env.BCRYPT_SALT_ROUNDS).toBe(12)
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('15m')
  })
})
```

- [ ] **Step 2: Confirmar que o teste falha**

```bash
npx vitest run __tests__/env.test.ts
```

Resultado esperado: FAIL — `Cannot find module '../src/env'`

- [ ] **Step 3: Criar src/env.ts**

```typescript
// src/env.ts
import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  ADMIN_PASSWORD: z
    .string()
    .min(8, 'ADMIN_PASSWORD must have at least 8 characters'),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_BLOCK_DURATION_SECONDS: z.coerce.number().default(900),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Invalid environment variables:')
  console.error(_env.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = _env.data
export type Env = typeof env
```

- [ ] **Step 4: Confirmar que o teste passa**

```bash
npx vitest run __tests__/env.test.ts
```

Resultado esperado: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/env.ts __tests__/env.test.ts
git commit -m "feat: add env validation with Zod"
```

---

### Task 4: Classes de erro

**Files:**
- Create: `MI-server/src/errors/app-error.ts`
- Create: `MI-server/src/errors/error-handler.ts`
- Test: `MI-server/__tests__/errors.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

Criar `__tests__/errors.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { AppError } from '../src/errors/app-error'

describe('AppError', () => {
  it('should create error with default statusCode 400 and code BAD_REQUEST', () => {
    const error = new AppError('Something went wrong')

    expect(error.message).toBe('Something went wrong')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.name).toBe('AppError')
    expect(error instanceof Error).toBe(true)
  })

  it('should accept custom statusCode and code', () => {
    const error = new AppError('Not found', 404, 'NOT_FOUND')

    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
  })
})
```

- [ ] **Step 2: Confirmar que o teste falha**

```bash
npx vitest run __tests__/errors.test.ts
```

Resultado esperado: FAIL — `Cannot find module '../src/errors/app-error'`

- [ ] **Step 3: Criar src/errors/app-error.ts**

```typescript
// src/errors/app-error.ts
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

- [ ] **Step 4: Confirmar que o teste passa**

```bash
npx vitest run __tests__/errors.test.ts
```

Resultado esperado: PASS (2 testes)

- [ ] **Step 5: Criar src/errors/error-handler.ts**

```typescript
// src/errors/error-handler.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from './app-error'

export function errorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(422).send({
      status: 'error',
      message: 'Validation error',
      issues: error.flatten().fieldErrors,
    })
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      status: 'error',
      message: error.message,
      code: error.code,
    })
  }

  console.error(error)
  return reply.status(500).send({
    status: 'error',
    message: 'Internal server error',
  })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/errors/ __tests__/errors.test.ts
git commit -m "feat: add AppError and global error handler"
```

---

### Task 5: Utilitário de hash

**Files:**
- Create: `MI-server/src/utils/hash.ts`
- Test: `MI-server/__tests__/utils/hash.test.ts`

- [ ] **Step 1: Escrever o teste que falha primeiro**

Criar `__tests__/utils/hash.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../../src/utils/hash'

describe('hash utility', () => {
  it('should hash a password into a different string', async () => {
    const password = 'my_secret_password'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(20)
  })

  it('should return true when comparing correct password with its hash', async () => {
    const password = 'my_secret_password'
    const hash = await hashPassword(password)

    await expect(comparePassword(password, hash)).resolves.toBe(true)
  })

  it('should return false when comparing wrong password with hash', async () => {
    const hash = await hashPassword('correct_password')

    await expect(comparePassword('wrong_password', hash)).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Confirmar que o teste falha**

```bash
npx vitest run __tests__/utils/hash.test.ts
```

Resultado esperado: FAIL — `Cannot find module '../../src/utils/hash'`

- [ ] **Step 3: Criar src/utils/hash.ts**

```typescript
// src/utils/hash.ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

- [ ] **Step 4: Confirmar que o teste passa**

```bash
npx vitest run __tests__/utils/hash.test.ts
```

Resultado esperado: PASS (3 testes)

- [ ] **Step 5: Commit**

```bash
git add src/utils/hash.ts __tests__/utils/hash.test.ts
git commit -m "feat: add bcrypt hash utility"
```

---

### Task 6: Schemas Zod

**Files:**
- Create: `MI-server/src/schemas/auth/auth.schema.ts`
- Create: `MI-server/src/schemas/users/users.schema.ts`

- [ ] **Step 1: Criar src/schemas/auth/auth.schema.ts**

```typescript
// src/schemas/auth/auth.schema.ts
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const PasswordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(8, 'Password must have at least 8 characters'),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type PasswordResetRequestInput = z.infer<typeof PasswordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof PasswordResetConfirmSchema>
```

- [ ] **Step 2: Criar src/schemas/users/users.schema.ts**

```typescript
// src/schemas/users/users.schema.ts
import { z } from 'zod'

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must have at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must have at least 8 characters'),
})

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((data) => !(data.newPassword && !data.currentPassword), {
    message: 'currentPassword is required when setting a new password',
    path: ['currentPassword'],
  })

export const ListUsersQuerySchema = z.object({
  role: z
    .enum(['COMMON', 'INSTITUTIONALIZED', 'PROFESSOR', 'ADMIN'])
    .optional(),
  suspended: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(20),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>
```

- [ ] **Step 3: Commit**

```bash
git add src/schemas/
git commit -m "feat: add Zod schemas for auth and users"
```

---

### Task 7: Repositories

**Files:**
- Create: `MI-server/src/repositories/users/users.repository.ts`
- Create: `MI-server/src/repositories/auth/auth.repository.ts`
- Create: `MI-server/src/repositories/audit/audit.repository.ts`

- [ ] **Step 1: Criar src/repositories/users/users.repository.ts**

```typescript
// src/repositories/users/users.repository.ts
import { Prisma, Role, User } from '@prisma/client'
import { prisma } from '../../database/prisma'

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  canUpload: true,
  emailVerified: true,
  suspended: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data })
}

export async function updateUser(
  id: string,
  data: Prisma.UserUpdateInput,
): Promise<User> {
  return prisma.user.update({ where: { id }, data })
}

export async function listUsers(params: {
  role?: Role
  suspended?: boolean
  page?: number
  perPage?: number
}) {
  const { role, suspended, page = 1, perPage = 20 } = params
  const where: Prisma.UserWhereInput = {}

  if (role !== undefined) where.role = role
  if (suspended !== undefined) where.suspended = suspended

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      select: USER_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total, page, perPage }
}
```

- [ ] **Step 2: Criar src/repositories/auth/auth.repository.ts**

```typescript
// src/repositories/auth/auth.repository.ts
import { RefreshToken } from '@prisma/client'
import { prisma } from '../../database/prisma'

export async function createRefreshToken(data: {
  token: string
  userId: string
  expiresAt: Date
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data })
}

export async function findRefreshToken(
  token: string,
): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { token } })
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.delete({ where: { token } })
}

export async function deleteUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}
```

- [ ] **Step 3: Criar src/repositories/audit/audit.repository.ts**

```typescript
// src/repositories/audit/audit.repository.ts
import { Prisma, Role } from '@prisma/client'
import { prisma } from '../../database/prisma'

export interface CreateAuditLogParams {
  actorId?: string
  actorRole?: Role
  targetId?: string
  action: string
  metadata?: Record<string, unknown>
}

export async function createAuditLog(
  params: CreateAuditLogParams,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      targetId: params.targetId,
      action: params.action,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/repositories/
git commit -m "feat: add repositories for users, auth and audit"
```

---

### Task 8: Stubs de services e controllers

**Files:**
- Create: `MI-server/src/services/auth/auth.service.ts`
- Create: `MI-server/src/services/users/users.service.ts`
- Create: `MI-server/src/controllers/auth/auth.controller.ts`
- Create: `MI-server/src/controllers/users/users.controller.ts`

- [ ] **Step 1: Criar src/services/auth/auth.service.ts**

```typescript
// src/services/auth/auth.service.ts
// Stub — lógica de autenticação implementada nas tasks do módulo de usuários (TASK-03)
export {}
```

- [ ] **Step 2: Criar src/services/users/users.service.ts**

```typescript
// src/services/users/users.service.ts
// Stub — lógica de usuários implementada nas tasks do módulo de usuários (TASK-05 em diante)
export {}
```

- [ ] **Step 3: Criar src/controllers/auth/auth.controller.ts**

```typescript
// src/controllers/auth/auth.controller.ts
// Stub — handlers de autenticação implementados nas tasks do módulo de usuários (TASK-03)
export {}
```

- [ ] **Step 4: Criar src/controllers/users/users.controller.ts**

```typescript
// src/controllers/users/users.controller.ts
// Stub — handlers de usuários implementados nas tasks do módulo de usuários (TASK-05 em diante)
export {}
```

- [ ] **Step 5: Commit**

```bash
git add src/services/ src/controllers/
git commit -m "chore: add service and controller stubs"
```

---

### Task 9: Middleware de autenticação JWT

**Files:**
- Create: `MI-server/src/middlewares/authenticate.ts`

- [ ] **Step 1: Criar src/middlewares/authenticate.ts**

```typescript
// src/middlewares/authenticate.ts
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../errors/app-error'

export interface JWTPayload {
  sub: string
  role: string
  canUpload: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify<JWTPayload>()
  } catch {
    throw new AppError('Token inválido ou expirado.', 401, 'UNAUTHORIZED')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/middlewares/authenticate.ts
git commit -m "feat: add JWT authenticate middleware"
```

---

### Task 10: Rotas, app.ts e server.ts

**Files:**
- Create: `MI-server/src/routes/auth/auth.routes.ts`
- Create: `MI-server/src/routes/users/users.routes.ts`
- Create: `MI-server/src/app.ts`
- Create: `MI-server/src/server.ts`

- [ ] **Step 1: Criar src/routes/auth/auth.routes.ts**

```typescript
// src/routes/auth/auth.routes.ts
import type { FastifyInstance } from 'fastify'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    module: 'auth',
    timestamp: new Date().toISOString(),
  }))
}
```

- [ ] **Step 2: Criar src/routes/users/users.routes.ts**

```typescript
// src/routes/users/users.routes.ts
import type { FastifyInstance } from 'fastify'

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    module: 'users',
    timestamp: new Date().toISOString(),
  }))
}
```

- [ ] **Step 3: Criar src/app.ts**

```typescript
// src/app.ts
import fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod'
import { env } from './env'
import { errorHandler } from './errors/error-handler'
import { authRoutes } from './routes/auth/auth.routes'
import { usersRoutes } from './routes/users/users.routes'

export function buildApp() {
  const app = fastify({
    logger: env.NODE_ENV === 'development',
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.register(fastifyCors, { origin: true })
  app.register(fastifyCookie)
  app.register(fastifyJwt, { secret: env.JWT_SECRET })
  app.register(fastifyRateLimit, { global: false })

  app.register(authRoutes, { prefix: '/auth' })
  app.register(usersRoutes, { prefix: '/users' })

  app.setErrorHandler(errorHandler)

  return app
}
```

- [ ] **Step 4: Criar src/server.ts**

```typescript
// src/server.ts
import { buildApp } from './app'
import { env } from './env'

const app = buildApp()

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`🚀 MI-server running on http://0.0.0.0:${env.PORT}`)
})
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/ src/app.ts src/server.ts
git commit -m "feat: add Fastify app, routes skeleton and server entry point"
```

---

### Task 11: Infraestrutura de testes

**Files:**
- Create: `MI-server/vitest.config.ts`
- Create: `MI-server/__tests__/setup.ts`
- Create: `MI-server/__tests__/helpers/request.ts`

- [ ] **Step 1: Criar vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './__tests__/setup.ts',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/mi_db_test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: ['src/server.ts'],
    },
  },
})
```

- [ ] **Step 2: Criar __tests__/setup.ts**

```typescript
// __tests__/setup.ts
import { execSync } from 'child_process'

export async function setup(): Promise<void> {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/mi_db_test',
    },
  })
  console.log('✅ Test database migrated')
}

export async function teardown(): Promise<void> {
  console.log('✅ Test suite complete')
}
```

- [ ] **Step 3: Criar __tests__/helpers/request.ts**

```typescript
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
```

- [ ] **Step 4: Criar banco de teste**

```powershell
docker exec mi-postgres psql -U postgres -c "CREATE DATABASE mi_db_test;"
```

Se o container não estiver rodando, criar manualmente no PostgreSQL local:
```bash
psql -U postgres -c "CREATE DATABASE mi_db_test;"
```

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts __tests__/
git commit -m "chore: add Vitest config and test infrastructure"
```

---

### Task 12: Testes de integração — startup e health routes

**Files:**
- Test: `MI-server/__tests__/app.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `__tests__/app.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { getTestApp, closeTestApp } from './helpers/request'

describe('App health', () => {
  afterAll(async () => {
    await closeTestApp()
  })

  it('GET /auth/health should return 200 with status ok', async () => {
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

  it('GET /users/health should return 200 with status ok', async () => {
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

  it('GET /unknown should return 404', async () => {
    const app = await getTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/unknown',
    })

    expect(response.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Confirmar que o teste falha**

```bash
npx vitest run __tests__/app.test.ts
```

Resultado esperado: FAIL — app não consegue iniciar sem as env vars / conexão com banco

- [ ] **Step 3: Rodar os testes (devem passar agora com infra pronta)**

```bash
npx vitest run __tests__/app.test.ts
```

Resultado esperado: PASS (3 testes)

- [ ] **Step 4: Rodar toda a suite**

```bash
npm test
```

Resultado esperado: PASS — todos os testes (env, errors, hash, app)

- [ ] **Step 5: Commit**

```bash
git add __tests__/app.test.ts
git commit -m "test: add integration tests for app health routes"
```

---

### Task 13: Seed do Admin

**Files:**
- Create: `MI-server/prisma/seed.ts`

- [ ] **Step 1: Criar prisma/seed.ts**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }

  const existing = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  })

  if (existing) {
    console.log(`✅ Admin already exists (${existing.email}) — skipping seed`)
    return
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12)
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds)

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Master',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
    },
  })

  console.log(`✅ Admin created: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Rodar o seed e verificar**

```bash
npm run db:seed
```

Resultado esperado na 1ª execução:
```
✅ Admin created: admin@dcx.ufpb.br (id: <uuid>)
```

Rodar novamente — deve pular:
```
✅ Admin already exists (admin@dcx.ufpb.br) — skipping seed
```

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add admin master seed"
```

---

### Task 14: Docker

**Files:**
- Create: `MI-server/Dockerfile`
- Create: `MI-server/docker-compose.yml`
- Create: `MI-server/.dockerignore`

- [ ] **Step 1: Criar .dockerignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
__tests__/
```

- [ ] **Step 2: Criar Dockerfile**

```dockerfile
# Stage 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2 — Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3333
CMD ["node", "dist/server.js"]
```

- [ ] **Step 3: Criar docker-compose.yml**

```yaml
version: '3.9'

services:
  api:
    build: .
    container_name: mi-server
    ports:
      - '3333:3333'
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    container_name: mi-postgres
    environment:
      POSTGRES_DB: mi_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: mi-redis
    ports:
      - '6379:6379'
    restart: unless-stopped

volumes:
  pg_data:
```

- [ ] **Step 4: Validar sintaxe do docker-compose**

```bash
docker compose config
```

Resultado esperado: configuração validada sem erros.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore
git commit -m "chore: add Dockerfile and docker-compose"
```

---

### Task 15: Verificação final

- [ ] **Step 1: Rodar toda a suite de testes**

```bash
npm test
```

Resultado esperado: todos os testes PASS

- [ ] **Step 2: Verificar se o servidor sobe em modo dev**

```bash
npm run dev
```

Resultado esperado:
```
🚀 MI-server running on http://0.0.0.0:3333
```

- [ ] **Step 3: Smoke test nas rotas de health**

```powershell
Invoke-RestMethod http://localhost:3333/auth/health
Invoke-RestMethod http://localhost:3333/users/health
```

Resultado esperado: ambas retornam `{ status: 'ok', module: '...', timestamp: '...' }`

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: MI-server scaffold complete — all tests passing"
```
