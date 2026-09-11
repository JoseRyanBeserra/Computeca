// __tests__/integration/materials/materialEditPermission.test.ts
// FR-002 e FR-015 — quem pode editar, e o que nem o ADMIN edita.
//
// O caso que mais surpreende é o do autor do material: ele recebe 403 ao tentar
// alterar o que ele mesmo enviou. É intencional — autoria não dá direito de
// alterar. Editar o acervo é ato de curadoria, não de propriedade.
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import FormData from 'form-data'
import type { FastifyInstance } from 'fastify'
import { getTestApp, closeTestApp } from '../../helpers/request'
import { createUserAndLogin, createMaterial, cleanMaterialsDb } from '../../helpers/materials'
import { prisma } from '../../../src/database/prisma'

const DESCRICAO_VALIDA = 'd'.repeat(60)

beforeEach(async () => {
  await cleanMaterialsDb()
})

afterAll(async () => {
  await cleanMaterialsDb()
  await closeTestApp()
})

export function editForm({
  title = 'Título editado',
  description = DESCRICAO_VALIDA,
  habilidades = [] as string[],
} = {}) {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description)
  for (const h of habilidades) form.append('habilidadesBncc', h)
  return form
}

async function edit(
  app: FastifyInstance,
  materialId: string,
  token: string | null,
  form = editForm(),
) {
  return app.inject({
    method:  'PUT',
    url:     `/mis/${materialId}`,
    headers: {
      ...form.getHeaders(),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    payload: form.getBuffer(),
  })
}

describe('PUT /mis/:id — permissão (FR-002)', () => {
  it('ADMIN não é recusado', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin@test.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: admin.userId })

    const res = await edit(app, material.id, admin.accessToken)

    // A assertiva do 200 com persistência é do materialEdit.test.ts; aqui basta
    // provar que o ADMIN atravessa a barreira de autorização.
    expect(res.statusCode).not.toBe(401)
    expect(res.statusCode).not.toBe(403)
  })

  it('PROFESSOR recebe 403 — revisar não é editar', async () => {
    const app = await getTestApp()
    const professor = await createUserAndLogin('prof@test.com', 'PROFESSOR')
    const material = await createMaterial({ uploadedById: professor.userId })

    const res = await edit(app, material.id, professor.accessToken)

    expect(res.statusCode).toBe(403)
  })

  it('INSTITUTIONALIZED recebe 403', async () => {
    const app = await getTestApp()
    const user = await createUserAndLogin('inst@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: user.userId })

    const res = await edit(app, material.id, user.accessToken)

    expect(res.statusCode).toBe(403)
  })

  it('o PRÓPRIO AUTOR do material recebe 403 — autoria não dá direito de alterar', async () => {
    const app = await getTestApp()
    const autor = await createUserAndLogin('autor@test.com', 'INSTITUTIONALIZED')
    const material = await createMaterial({ uploadedById: autor.userId })

    const res = await edit(app, material.id, autor.accessToken)

    expect(res.statusCode).toBe(403)
  })

  it('sem autenticação recebe 401', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin2@test.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: admin.userId })

    const res = await edit(app, material.id, null)

    expect(res.statusCode).toBe(401)
  })

  it('perfil recusado não altera nada no material', async () => {
    const app = await getTestApp()
    const professor = await createUserAndLogin('prof2@test.com', 'PROFESSOR')
    const material = await createMaterial({
      uploadedById: professor.userId,
      title:        'Título original',
    })

    await edit(app, material.id, professor.accessToken)

    const depois = await prisma.materialInstrucional.findUniqueOrThrow({
      where: { id: material.id },
    })
    expect(depois.title).toBe('Título original')
  })
})

describe('PUT /mis/:id — material inacessível (FR-015)', () => {
  it('material removido do acervo devolve 404', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin3@test.com', 'ADMIN')
    const material = await createMaterial({ uploadedById: admin.userId })

    await prisma.materialInstrucional.update({
      where: { id: material.id },
      data:  { deletedAt: new Date(), deletedById: admin.userId },
    })

    const res = await edit(app, material.id, admin.accessToken)

    // Editar algo retirado do acervo o reintroduziria pela porta dos fundos.
    expect(res.statusCode).toBe(404)
  })

  it('material inexistente devolve 404', async () => {
    const app = await getTestApp()
    const admin = await createUserAndLogin('admin4@test.com', 'ADMIN')

    const res = await edit(app, '11111111-1111-4111-8111-111111111111', admin.accessToken)

    expect(res.statusCode).toBe(404)
  })
})
