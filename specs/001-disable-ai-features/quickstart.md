# Quickstart — Validação da Desativação Global da IA

**Feature**: `001-disable-ai-features` | **Date**: 2026-09-10

Roteiro para provar que a feature funciona de ponta a ponta. Cada cenário aponta o critério de
sucesso da especificação que ele verifica.

---

## Pré-requisitos

- Docker Desktop em execução
- Node.js >= 20
- Dependências instaladas em `MI-server/` e `front/`
- `MI-server/.env` a partir de `.env.example`

> **Windows**: encerre o Docker Desktop pelo menu da bandeja, nunca por encerramento forçado.
> Encerramento abrupto deixa sockets órfãos em `%LOCALAPPDATA%\Docker\run` que impedem a próxima
> inicialização, e eles não podem ser removidos pelo sistema de arquivos.

---

## Cenário 1 — Ambiente enxuto sobe e opera (SC-002, SC-003)

```bash
docker compose -f MI-server/docker-compose.yml up -d
```

**Esperado**: sobem `mi-postgres`, `mi-minio` e `otel-lgtm`. **Não** sobem `mi-redis` nem
`mi-qdrant`.

```bash
docker compose -f MI-server/docker-compose.yml ps
```

Com `AI_FEATURES_ENABLED=false` no `.env`, suba a API e acompanhe o registro de inicialização:

```bash
npm --prefix MI-server run dev
```

**Esperado**:

- Linha declarando explicitamente que as funcionalidades de IA estão desativadas (FR-016)
- **Ausência** de `BullMQ: conexão com Redis estabelecida` e de `Qdrant: conexão estabelecida`
- Nenhum aviso recorrente de falha de conexão nos minutos seguintes

Compare com a linha de base medida antes da feature — a stack completa consumia cerca de 533 MiB,
dos quais Redis e Qdrant somavam ~54 MiB em repouso:

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}'
```

---

## Cenário 2 — A aplicação sobe sem chave de IA (FR-008)

Remova `OPENAI_API_KEY` do `.env` e reinicie a API.

**Esperado**: sobe normalmente. Antes desta feature, a validação de ambiente derrubava o processo
na carga do módulo.

Agora ligue `AI_FEATURES_ENABLED=true` mantendo a chave ausente.

**Esperado**: falha na inicialização, apontando `OPENAI_API_KEY` como obrigatória — a exigência
volta exatamente quando a IA é solicitada.

---

## Cenário 3 — Interface sem vestígio de IA (SC-001)

Com a IA desativada, percorra o front em `http://localhost:5173`:

| Tela | Verificar |
|---|---|
| Início, deslogado | Nenhuma ação de chat nos cards |
| Início, logado em cada perfil | Idem, inclusive para `ADMIN` |
| Detalhe do material | Sem painel de resumo, sem aviso de processamento |
| `/materials/:id/chat` pela barra de endereço | Redireciona para uma tela válida do acervo, sem erro |

Use um material que **já tenha** resumo gravado — o conteúdo permanece no banco, mas não aparece.

---

## Cenário 4 — API recusa as operações de IA (SC-004)

Obtenha um token e chame as duas rotas diretamente:

```bash
curl -s -X POST http://127.0.0.1:3333/mis/<id>/chat \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"question":"teste"}' -w '\n[%{http_code}]\n'
```

**Esperado**: `503` com `code: AI_DISABLED`. O mesmo para `GET /mis/<id>/summary`.

Sem o cabeçalho de autorização, **esperado `401`** — nunca `503`.

Confirme no registro da aplicação que nenhuma chamada ao provedor de IA foi emitida.

---

## Cenário 5 — Aprovação não enfileira (FR-005)

Com a IA desativada, aprove um material submetido.

**Esperado**: aprovação conclui, material fica disponível para consulta e download, `vectorStatus`
permanece `PENDING`, e nenhum job é criado — verificável pela ausência do Redis no ambiente.

---

## Cenário 6 — Reativação e controle pelo painel (SC-006, SC-008)

```bash
docker compose -f MI-server/docker-compose.yml --profile ai up -d
```

Ligue `AI_FEATURES_ENABLED=true`, preencha `OPENAI_API_KEY` e reinicie a API.

**Esperado**: resumo e chat voltam a aparecer nos mesmos lugares de antes.

Agora, **sem reiniciar nada**, desligue a IA pelo painel administrativo.

**Esperado**: em menos de um minuto, a interface dos usuários deixa de exibir IA e as rotas passam
a responder `503`. Religue e confirme a volta. Este é o cenário que prova o atendimento à exigência
de modularidade da constituição.

Confirme o registro em `AuditLog` com `action: AI_AVAILABILITY_CHANGED` e `metadata` contendo os
valores anterior e novo.

Com `AI_FEATURES_ENABLED=false`, o controle no painel deve aparecer **bloqueado e explicado**, e
uma chamada direta ao `PATCH` deve responder `409` sem gravar nada (FR-014).

---

## Cenário 7 — Reprocessamento do acervo pendente (SC-009)

Com a IA reativada:

```bash
npm --prefix MI-server run ai:backfill
```

**Esperado**: informa quantos materiais serão processados **antes** de iniciar, enfileira e encerra.
Os materiais aprovados durante a desativação passam a `PROCESSING` e depois a `DONE`.

Com a IA desativada, o mesmo comando **recusa a execução** com mensagem explicativa e não enfileira
nada.

---

## Cenário 8 — Nada foi removido (SC-007)

```bash
git diff --stat --diff-filter=D main...001-disable-ai-features
```

**Esperado**: saída vazia. Nenhum arquivo excluído no ramo da feature.

---

## Suíte automatizada

```bash
npm --prefix MI-server run test:unit
npm --prefix MI-server run test:integration
npm --prefix front run test
```

**Esperado**: tudo passando, com os fluxos não-IA sem nenhuma expectativa alterada (SC-005). Os
testes novos exercitam os dois estados do interruptor (FR-017).

Referências: [contratos](./contracts/), [modelo de dados](./data-model.md),
[decisões técnicas](./research.md).
