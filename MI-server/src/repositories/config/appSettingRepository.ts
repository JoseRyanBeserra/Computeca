// src/repositories/config/appSettingRepository.ts
// Acesso à tabela de configuração de módulos governada pelo painel administrativo.
// Apenas queries Prisma — nenhuma regra de negócio mora aqui.
import type { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'

export interface IAppSetting {
  key: string
  value: Prisma.JsonValue
  updatedAt: Date
  updatedById: string | null
}

/** Busca uma configuração pela chave. Retorna `null` quando nunca foi gravada. */
export async function findAppSettingByKey(key: string): Promise<IAppSetting | null> {
  return prisma.appSetting.findUnique({ where: { key } })
}

export interface UpsertAppSettingInput {
  key: string
  value: Prisma.InputJsonValue
  updatedById?: string | null
}

/** Cria ou substitui uma configuração, registrando quem a alterou. */
export async function upsertAppSetting({
  key,
  value,
  updatedById = null,
}: UpsertAppSettingInput): Promise<IAppSetting> {
  return prisma.appSetting.upsert({
    where:  { key },
    create: { key, value, updatedById },
    update: { value, updatedById },
  })
}
