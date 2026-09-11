# Quickstart — Validação da Descrição Obrigatória

**Feature**: `003-material-description` | **Date**: 2026-09-11

Roteiro para provar a feature de ponta a ponta. Cada cenário aponta o requisito que verifica.

---

## Pré-requisitos

- Docker Desktop em execução
- Infraestrutura no ar: `docker compose -f MI-server/docker-compose.yml up -d`
- Migração aplicada: `npm --prefix MI-server run db:migrate`
- API e front em execução
- Conta com permissão de upload (`INSTITUTIONALIZED`, `PROFESSOR` ou `ADMIN`)

> **Windows**: encerre o Docker Desktop pelo menu da bandeja, nunca por encerramento forçado.

---

## Cenário 1 — O acervo existente sobrevive à migração (FR-009, SC-003)

Antes de qualquer outra coisa, confirme que os materiais já cadastrados continuam íntegros:

```bash
docker exec mi-postgres psql -U postgres -d mi_db -c \
  "select count(*) total, count(description) com_descricao from \"MaterialInstrucional\";"
```

**Esperado**: `total` igual ao número de materiais antes da migração, e `com_descricao` igual a `0`.
Nenhuma linha perdida, nenhuma descrição inventada.

Abra os detalhes de um desses materiais na interface.

**Esperado**: a tela carrega normalmente e o espaço da descrição indica a ausência de forma
discreta — sem mensagem de erro, sem área vazia inexplicada.

---

## Cenário 2 — Descrição visível na tela de detalhes (FR-002, SC-001)

Cadastre um material com descrição válida e abra seus detalhes.

**Esperado**: a descrição aparece **imediatamente abaixo das habilidades BNCC** e acima da
pré-visualização do documento.

Cadastre outro com descrição contendo quebras de linha.

**Esperado**: os parágrafos são preservados na exibição.

---

## Cenário 3 — O formulário informa a regra antes da tentativa (FR-007, SC-004)

Abra a tela de envio e comece a preencher.

**Esperado**:

- O campo de descrição está marcado como obrigatório **antes** de qualquer tentativa de envio
- O contador mostra quantos caracteres faltam para o mínimo enquanto você escreve
- O botão de envio permanece bloqueado com menos de 50 caracteres
- Ao ultrapassar 2000, o contador indica o excesso e o envio volta a ser bloqueado

---

## Cenário 4 — A exigência não depende da interface (FR-006, SC-002)

Este é o cenário que distingue "obrigatório no formulário" de "obrigatório de verdade". Chame a rota
diretamente, contornando a tela:

```bash
curl -X POST http://127.0.0.1:3333/mis \
  -H "Authorization: Bearer <token>" \
  -F "file=@arquivo.pdf" \
  -F "title=Teste sem descricao" \
  -w '\n[%{http_code}]\n'
```

**Esperado**: `422`, apontando a descrição. Nenhum material é criado.

Repita com descrição de 49 caracteres, e depois com 2001.

**Esperado**: `422` nos dois casos. Com exatamente 50 e exatamente 2000, **esperado `201`** — os
limites são inclusivos.

---

## Cenário 5 — A regra vale pelo caminho da organização (FR-008)

Repita o cenário 4 pela outra rota de cadastro:

```bash
curl -X POST http://127.0.0.1:3333/organizations/<orgId>/mis \
  -H "Authorization: Bearer <token>" \
  -F "file=@arquivo.pdf" \
  -F "title=Teste" \
  -w '\n[%{http_code}]\n'
```

**Esperado**: exatamente o mesmo resultado do cenário 4. Uma regra que valesse só num dos caminhos
deixaria material sem descrição entrar pela porta lateral.

---

## Cenário 6 — Espaço em branco não é descrição (caso de borda)

Envie uma descrição composta apenas de espaços e quebras de linha.

**Esperado**: `422`. A contagem acontece **depois** de remover espaços das extremidades, então
espaço em branco vira zero caractere.

Envie também uma descrição válida cercada de espaços.

**Esperado**: `201`, e o valor gravado **sem** os espaços das pontas.

---

## Cenário 7 — Nada mais mudou (FR-010, SC-005)

Percorra os fluxos de material conferindo que seguem funcionando: upload de arquivo, habilidades
BNCC, aprovação pelo professor, exclusão, download, pré-visualização do documento e o comportamento
da área de IA conforme o interruptor da feature 001.

---

## Suíte automatizada

```bash
npm --prefix MI-server run test:unit
npm --prefix MI-server run test:integration
npm --prefix front run test
```

**Esperado**: tudo passando, sem alteração de expectativa nos testes que já existiam (SC-005).

Referências: [contratos](./contracts/), [modelo de dados](./data-model.md),
[decisões técnicas](./research.md).
