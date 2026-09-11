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

  // ── MinIO ──────────────────────────────────────────────────────────────────
  MINIO_ENDPOINT:         z.string().min(1).default('localhost'),
  MINIO_PORT:             z.coerce.number().default(9000),
  MINIO_USE_SSL:          z.string().optional().default('false').transform((v) => v === 'true'),
  MINIO_ACCESS_KEY:       z.string().min(1, 'MINIO_ACCESS_KEY is required'),
  MINIO_SECRET_KEY:       z.string().min(1, 'MINIO_SECRET_KEY is required'),
  MINIO_BUCKET:           z.string().min(1).default('materiais-instrucionais'),
  MINIO_REGION:           z.string().default('us-east-1'),
  // Endpoint público (ex: s3.dsc.rodrigor.com) para URLs pré-assinadas acessíveis pelo browser.
  // Se não definido, cai de volta para o endpoint interno.
  MINIO_PUBLIC_ENDPOINT:  z.string().optional(),
  MINIO_PUBLIC_PORT:      z.coerce.number().optional(),
  MINIO_PUBLIC_USE_SSL:   z.string().optional().default('false').transform((v) => v === 'true'),

  // ── Upload ─────────────────────────────────────────────────────────────────
  MI_MAX_FILE_SIZE_MB: z.coerce.number().default(50),

  // ── E-mail (SMTP) ──────────────────────────────────────────────────────────
  // Quando não configurado, o link de verificação é impresso no console (dev).
  SMTP_HOST:    z.string().optional(),
  SMTP_PORT:    z.coerce.number().optional(),
  SMTP_SECURE:  z.string().optional().default('false').transform((v) => v === 'true'),
  SMTP_USER:    z.string().optional(),
  SMTP_PASS:    z.string().optional(),
  SMTP_FROM:    z.string().optional().default('MI UFPB <noreply@dcx.ufpb.br>'),

  // ── Redis (BullMQ) ────────────────────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // ── Qdrant (banco de vetores) ──────────────────────────────────────────────
  QDRANT_URL:     z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),

  // ── Funcionalidades de IA ──────────────────────────────────────────────────
  // Interruptor mestre da instalação. Desativado, nada de IA existe: nem conexão
  // com Redis ou Qdrant, nem atendimento das rotas, nem exibição no front.
  // O padrão do projeto é desativado — quem clona o repositório sobe sem IA.
  AI_FEATURES_ENABLED: z.string().optional().default('false').transform((v) => v === 'true'),

  // ── OpenAI (embeddings) ────────────────────────────────────────────────────
  // Exigida apenas quando a IA está habilitada — ver o superRefine abaixo.
  OPENAI_API_KEY: z.string().optional(),

  // URL base do frontend (usada no link do e-mail de verificação)
  APP_URL: z.string().url().optional().default('http://localhost:5173'),

  // Validade do token de verificação de e-mail em horas
  EMAIL_VERIFICATION_EXPIRES_HOURS: z.coerce.number().optional().default(24),
})
  .superRefine((env, ctx) => {
    // A chave da OpenAI só é obrigatória quando a IA está ligada. Sem isso a
    // aplicação não subiria em instalações que não usam IA, contrariando a
    // premissa de que o estado desativado é o padrão do projeto.
    if (env.AI_FEATURES_ENABLED && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAI_API_KEY'],
        message: 'OPENAI_API_KEY is required when AI_FEATURES_ENABLED is true',
      })
    }
  })

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌ Invalid environment variables:')
  console.error(_env.error.flatten().fieldErrors)
  throw new Error('Invalid environment variables')
}

export const env = _env.data
export type Env = typeof env
