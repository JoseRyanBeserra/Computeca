# Especificação — Estrutura do Back-end MI-server

**Projeto:** Plataforma de Gestão de Materiais Instrucionais — Campus IV UFPB  
**Data:** 2026-05-26  
**Status:** Aprovado para planejamento  

---

## 1. Visão Geral

O `MI-server` é o servidor back-end desacoplado da plataforma MI. Expõe uma API REST consumida pelo front-end React. É escrito em TypeScript, utiliza Fastify como framework HTTP, Prisma ORM com PostgreSQL como banco de dados e Zod para validação de schemas e variáveis de ambiente. Testes são gerenciados pelo Vitest.

O servidor será conteinerizado com Docker e orquestrado via docker-compose junto ao PostgreSQL e Redis (Redis reservado para uso futuro com BullMQ).

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework HTTP | Fastify |
| ORM | Prisma |
| Banco de Dados | PostgreSQL 16 |
| Validação | Zod |
| Autenticação | JWT (access token) + Refresh Token (persistido no banco) |
| Hash de Senhas | bcryptjs |
| Testes | Vitest + supertest |
| Build | tsup |
| Dev runner | tsx |
| Conteinerização | Docker (multi-stage) + docker-compose |

---

## 3. Arquitetura Interna

Organização por **camadas globais com subpastas por domínio**. Cada camada (`controllers`, `services`, `repositories`, `schemas`, `routes`) é uma pasta raiz dentro de `src/`, e cada domínio é uma subpasta dentro dela. Infraestrutura transversal (banco, erros, middlewares, utils) fica em pastas soltas na raiz de `src/`.

### 3.1 Estrutura de Pastas

```
MI-server/
├── src/
│   ├── app.ts                        # Instância Fastify + registro de plugins e rotas
│   ├── server.ts                     # Entry point: listen na porta
│   ├── env.ts                        # Validação de env vars com Zod
│   │
│   ├── controllers/
│   │   ├── auth/
│   │   │   └── auth.controller.ts
│   │   └── users/
│   │       └── users.controller.ts
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   └── auth.service.ts
│   │   └── users/
│   │       └── users.service.ts
│   │
│   ├── repositories/
│   │   ├── auth/
│   │   │   └── auth.repository.ts    # refresh tokens, password reset codes
│   │   └── users/
│   │       └── users.repository.ts
│   │
│   ├── schemas/                      # Schemas Zod de validação de entrada/saída
│   │   ├── auth/
│   │   │   └── auth.schema.ts
│   │   └── users/
│   │       └── users.schema.ts
│   │
│   ├── routes/                       # Registro de rotas Fastify por domínio
│   │   ├── auth/
│   │   │   └── auth.routes.ts
│   │   └── users/
│   │       └── users.routes.ts
│   │
│   ├── database/
│   │   └── prisma.ts                 # Singleton do PrismaClient
│   │
│   ├── errors/
│   │   ├── app-error.ts              # Classe base de erro de negócio
│   │   └── error-handler.ts         # setErrorHandler global do Fastify
│   │
│   ├── middlewares/
│   │   └── authenticate.ts          # Guard JWT: decodifica e injeta user na request
│   │
│   └── utils/
│       └── hash.ts                   # bcrypt: hash e compare
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                       # Cria Admin master na primeira execução
│
├── __tests__/
│   ├── setup.ts                      # Global setup: migrate no banco de teste
│   └── helpers/
│       └── request.ts                # Wrapper de inject do Fastify para testes
│
├── .env.example
├── .gitignore
├── Dockerfile                        # Multi-stage: build → production
├── docker-compose.yml                # API + PostgreSQL + Redis
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 4. Dependências

### 4.1 Produção

| Pacote | Função |
|---|---|
| `fastify` | Framework HTTP |
| `@fastify/jwt` | Plugin JWT (access token) |
| `@fastify/cookie` | Cookies para refresh token httpOnly |
| `@fastify/cors` | CORS |
| `@fastify/rate-limit` | Rate limiting no endpoint de login (RNF03) |
| `@prisma/client` | ORM |
| `zod` | Validação de schemas e env vars |
| `bcryptjs` | Hash de senhas |
| `dotenv` | Carregamento de `.env` |

### 4.2 Desenvolvimento / Build

| Pacote | Função |
|---|---|
| `typescript` | Compilador |
| `tsx` | Execução TS em desenvolvimento sem build |
| `tsup` | Bundler para build de produção |
| `prisma` | CLI: migrations, generate, seed |
| `vitest` | Test runner |
| `supertest` + `@types/supertest` | Testes de integração HTTP |
| `@types/bcryptjs` | Tipos para bcryptjs |

---

## 5. Prisma Schema

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

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id        String   @id @default(uuid())
  actorId   String?
  actorRole Role?
  targetId  String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  actor     User?    @relation("AuditActor", fields: [actorId], references: [id])
}
```

**Decisões:**
- `InviteLink` removido do escopo desta fase — será analisado em iteração futura.
- `AuditLog.metadata` é `Json` (JSONB no PostgreSQL), cobrindo a flexibilidade de schema por tipo de ação sem necessidade de um segundo banco.
- Logs de auditoria são imutáveis por design: nenhum endpoint de deleção ou update será exposto para essa tabela.

---

## 6. Autenticação

Estratégia: **JWT access token de curta duração + Refresh Token persistido no banco**.

```
POST /auth/login
  → access_token (expira em JWT_ACCESS_EXPIRES_IN, ex: 15m)
  → refresh_token (cookie httpOnly, expira em JWT_REFRESH_EXPIRES_IN, ex: 7d)

POST /auth/refresh
  → valida refresh_token no banco
  → emite novo access_token

POST /auth/logout
  → deleta refresh_token do banco
  → limpa cookie
```

- Access token: carregado no header `Authorization: Bearer <token>`
- Refresh token: armazenado em cookie `httpOnly; Secure; SameSite=Strict`
- Logout real: refresh token é deletado do banco, não há blocklist necessária

---

## 7. Variáveis de Ambiente

```env
# App
NODE_ENV=development
PORT=3333

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mi_db"

# JWT
JWT_SECRET=troque_por_segredo_forte
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

Todas as variáveis são validadas em `src/env.ts` via Zod na inicialização. O servidor não sobe se alguma variável obrigatória estiver ausente.

---

## 8. Estratégia de Testes

- **Testes de integração** em `__tests__/` — sobem a instância Fastify completa contra um banco PostgreSQL de teste dedicado (`mi_db_test`)
- **Testes unitários** ao lado dos services quando a lógica for complexa (ex: validação de expiração de token, regras de promoção de perfil)
- `vitest.config.ts` configura `globalSetup` apontando para `__tests__/setup.ts`, que executa `prisma migrate deploy` no banco de teste antes da suíte
- Isolamento por teste via `beforeEach` com truncate das tabelas relevantes

---

## 9. Docker

### Dockerfile (multi-stage)

```
Stage 1 (builder): instala dependências, compila TypeScript com tsup
Stage 2 (production): copia apenas o dist/ e node_modules de produção
```

### docker-compose.yml

```yaml
services:
  api:
    build: .
    ports: ["3333:3333"]
    depends_on: [db, redis]
    env_file: .env

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mi_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    # reservado para BullMQ em iteração futura

volumes:
  pg_data:
```

---

## 10. Decisões Pendentes / Fora do Escopo desta Fase

- `InviteLink` — modelo e fluxo de convites a ser analisado em iteração futura
- BullMQ / filas assíncronas — adicionado quando o módulo de e-mails for implementado
- Integração com MinIO/S3 — módulo de materiais instrucionais
- Qdrant (busca semântica) — módulo de busca
- Observabilidade de IA (tokens por usuário) — módulo de IA
