// __tests__/helpers/materials.ts
// Helpers compartilhados para os testes funcionais de Materiais Instrucionais.
import { randomUUID } from 'node:crypto'
import { getTestApp } from './request'
import { prisma } from '../../src/database/prisma'

type Role = 'ADMIN' | 'PROFESSOR' | 'INSTITUTIONALIZED' | 'COMMON'

/** Cria um usuário (via endpoint), ajusta o papel e faz login. Retorna token + id. */
export async function createUserAndLogin(
  email: string,
  role: Role = 'COMMON',
): Promise<{ accessToken: string; userId: string }> {
  const app = await getTestApp()
  const password = 'senha12345'

  await app.inject({
    method:  'POST',
    url:     '/users',
    payload: { name: 'Test User', email, password },
  })

  if (role !== 'COMMON') {
    await prisma.user.update({ where: { email }, data: { role } })
  }

  const loginRes = await app.inject({
    method:  'POST',
    url:     '/auth/login',
    payload: { email, password },
  })

  const user = await prisma.user.findUniqueOrThrow({ where: { email } })

  return { accessToken: loginRes.json().accessToken as string, userId: user.id }
}

interface CreateMaterialOpts {
  uploadedById:     string
  title?:           string
  status?:          'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  habilidadesBncc?: string[]
}

/** Insere um Material Instrucional diretamente no banco (sem passar pelo MinIO). */
export async function createMaterial(opts: CreateMaterialOpts) {
  return prisma.materialInstrucional.create({
    data: {
      title:            opts.title ?? 'Material de Teste',
      originalFileName: 'arquivo.pdf',
      storageKey:       `key-${randomUUID()}`,
      mimeType:         'application/pdf',
      sizeBytes:        1024,
      status:           opts.status ?? 'APPROVED',
      habilidadesBncc:  opts.habilidadesBncc ?? [],
      uploadedById:     opts.uploadedById,
    },
  })
}

/** Limpa todas as tabelas relevantes, respeitando as FKs. */
export async function cleanMaterialsDb(): Promise<void> {
  await prisma.inspectionLog.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.materialInstrucionalOrganization.deleteMany()
  await prisma.materialInstrucional.deleteMany()
  await prisma.organizationMember.deleteMany()
  await prisma.organizationInvite.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.emailVerificationToken.deleteMany()
  await prisma.user.deleteMany()
}
