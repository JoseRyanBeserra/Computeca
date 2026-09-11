# Quickstart — Validação da Edição de Material

**Feature**: `005-material-edit` | **Date**: 2026-09-11

Roteiro para provar a feature de ponta a ponta. Cada cenário aponta o requisito que verifica.

---

## Pré-requisitos

- Docker Desktop em execução
- Infraestrutura no ar: `docker compose -f MI-server/docker-compose.yml up -d`
- API e front em execução
- **Uma conta `ADMIN` e uma conta `PROFESSOR`** — vários cenários dependem de comparar as duas
- Pelo menos um material `APPROVED` e um material sem descrição (anterior à feature 003)

> **Windows**: encerre o Docker Desktop pelo menu da bandeja, nunca por encerramento forçado.
>
> Esta feature **não tem migração**. Nenhuma coluna nova, nenhum `prisma migrate` — e portanto
> nenhum reinício por cliente Prisma desatualizado.

---

## Cenário 1 — Corrigir a descrição de um material publicado (US1, SC-001)

Abra os detalhes de um material aprovado como `ADMIN` e vá para a edição.

**Esperado**: o formulário abre **preenchido com os valores atuais** (FR-020).

Altere a descrição e salve.

**Esperado**:

- A tela de detalhes exibe a descrição nova
- O material **continua aprovado** e visível no acervo (FR-006)
- O documento não mudou
- Nenhuma duplicata foi criada

---

## Cenário 2 — Material sem descrição recebe uma (SC-006)

Abra a edição de um material cadastrado antes da exigência de descrição.

**Esperado**: o campo de descrição vem **vazio**, com a regra visível.

Tente salvar com 49 caracteres; depois com 50.

**Esperado**: impedido no primeiro caso, com a regra informada **antes** do envio (FR-021); aceito
no segundo. Os limites são os mesmos do cadastro — não existe regra mais frouxa pela edição.

---

## Cenário 3 — A proteção não depende da interface (FR-002, SC-003)

Este é o cenário central da permissão. Chame a rota diretamente com cada perfil:

```bash
curl -X PUT http://127.0.0.1:3333/mis/<id> \
  -H "Authorization: Bearer <token>" \
  -F "title=Teste" \
  -F "description=<descrição com pelo menos cinquenta caracteres para passar na validação>" \
  -w '\n[%{http_code}]\n'
```

| Token de | Esperado |
|---|---|
| `ADMIN` | `200` |
| `PROFESSOR` | `403` |
| `INSTITUTIONALIZED` | `403` |
| **O próprio autor do material** | `403` |
| Nenhum | `401` |

O caso do autor é o que mais surpreende, e é intencional: **autoria não dá direito de alterar**.

---

## Cenário 4 — Substituir o documento (US2, FR-009, FR-013)

Como `ADMIN`, edite um material **aprovado** e selecione um PDF diferente.

**Esperado antes do envio**: uma **confirmação explícita**, avisando que o documento atual será
apagado e que isso não tem desfazer (FR-012). Recuse a confirmação.

**Esperado**: nada é enviado.

Repita e confirme.

**Esperado**:

- Abrir o material mostra o **documento novo**
- O material **voltou para revisão** e saiu do acervo público (FR-013)
- O documento anterior **não está mais no armazenamento**

Confira a remoção pelo console do MinIO (`http://localhost:9001`) ou:

```bash
docker exec mi-minio mc ls local/<bucket> | grep <chave-anterior>
```

**Esperado**: nada encontrado.

---

## Cenário 5 — A chave é nova, nunca sobrescrita (FR-010, SC-004)

Antes de uma substituição, anote a `storageKey` do material:

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  "select \"storageKey\", \"originalFileName\", status from \"MaterialInstrucional\" where id = '<id>';"
```

Substitua o documento e consulte de novo.

**Esperado**: `storageKey` **diferente** da anterior. Se fosse a mesma, uma falha no meio da escrita
teria destruído o original sem possibilidade de volta — ver [research.md](./research.md), item 1.

---

## Cenário 6 — Arquivo inválido não destrói o que existe (FR-008)

Como `ADMIN`, tente substituir o documento por um arquivo que não é PDF, e depois por um acima do
limite de tamanho.

**Esperado**: `415` e `413` respectivamente, e em ambos os casos **o documento atual permanece
intacto e acessível**. Abrir o material continua funcionando.

---

## Cenário 7 — Os dados de IA não sobrevivem à troca (FR-014)

Escolha um material que possua resumo gerado. Substitua o documento e consulte:

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  "select summary, \"summaryStatus\", \"summaryGeneratedAt\", \"vectorStatus\" from \"MaterialInstrucional\" where id = '<id>';"
```

**Esperado**: `summary` e `summaryGeneratedAt` nulos, `summaryStatus` e `vectorStatus` em `PENDING`.

Eles descreviam o documento **antigo**. Com a IA desligada isso é invisível hoje — e é exatamente
por isso que precisa estar certo agora: o dia em que `npm run ai:backfill` rodar é o dia em que um
resumo do documento errado apareceria como legítimo.

---

## Cenário 8 — O rastro da alteração (US3, SC-002)

Depois das edições acima:

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  "select \"actorId\", \"actorRole\", action, metadata, \"createdAt\" from \"AuditLog\" where action = 'MI_UPDATED' order by \"createdAt\" desc limit 5;"
```

**Esperado**: um registro por edição, identificando quem, quando, qual material e **quais campos
mudaram, com valor anterior e novo**. A descrição anterior aparece **por inteiro**.

Agora salve uma edição **sem alterar nada** e consulte de novo.

**Esperado**: **nenhum registro novo** (FR-017).

Tente uma edição como `PROFESSOR` e outra com descrição inválida.

**Esperado**: **nenhum registro novo** em ambos os casos (FR-018).

---

## Cenário 9 — Material removido não é editável (FR-015)

Remova um material do acervo e tente editá-lo pela rota.

**Esperado**: `404`. Editar algo retirado do acervo o reintroduziria pela porta dos fundos.

---

## Cenário 10 — Nada mais mudou (FR-022, SC-007)

Percorra os fluxos existentes conferindo que seguem idênticos: cadastro pelas **duas** telas
(envio direto e envio por projeto), aprovação, rejeição, remoção, listagens, download,
pré-visualização do documento e o comportamento da área de IA conforme o interruptor da feature 001.

---

## Suíte automatizada

```bash
npm --prefix MI-server run test:unit
npm --prefix MI-server run test:integration
npm --prefix front run test
```

**Esperado**: tudo passando, sem alteração de expectativa nos testes que já existiam (SC-007).

Referências: [contratos](./contracts/), [modelo de dados](./data-model.md),
[decisões técnicas](./research.md).
