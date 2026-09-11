# Contrato — Recusa uniforme das operações de IA

Define como as rotas de IA respondem quando a funcionalidade está indisponível (FR-004).

## Rotas afetadas

| Rota | Descrição |
|---|---|
| `POST /mis/:id/chat` | Conversa com o documento |
| `GET /mis/:id/summary` | Resumo gerado por IA |

Ambas permanecem **registradas** na aplicação nos dois estados do interruptor. O que muda é a
resposta. Manter o registro preserva o inventário da API e permite religar sem reinício.

## Mecanismo

Middleware `requireAiEnabled`, aplicado como `preHandler` **após** `authenticate`, seguindo o
padrão de `requireUploadPermission`:

```
app.post('/:id/chat', { preHandler: [authenticate, requireAiEnabled] }, materialPdfChatController)
```

Lança `GeneralErrorResponse(StatusCode.SERVICE_UNAVAILABLE, buildError(ERRORS.AI.AI_DISABLED))`,
tratado pelo `errorHandler` global.

### Ordem dos preHandlers

`authenticate` vem primeiro deliberadamente: quem não está autenticado recebe `401`, não `503`.
A indisponibilidade de um recurso só é informada a quem teria direito de usá-lo.

## Resposta `503 Service Unavailable`

```json
{
  "status": "error",
  "message": "As funcionalidades de IA estão desativadas nesta instalação.",
  "code": "AI_DISABLED"
}
```

## Por que 503

| Código | Por que não |
|---|---|
| `404` | Diz que o recurso não existe. Ele existe e pode voltar. Confunde diagnóstico e some do inventário. |
| `403` | Diz que falta permissão. O usuário tem permissão; a funcionalidade é que está desligada. |
| `501` | Diz que nunca foi implementado. Está implementado e pode ser religado. |
| `200` com corpo vazio | Mascara a indisponibilidade e leva o front a renderizar sucesso. |

`503` comunica "temporariamente indisponível, tente mais tarde", que é exatamente o estado.

## Alterações no catálogo

`src/utils/statusCode.ts` — acrescentar (hoje o enum não declara o `503`):

```
SERVICE_UNAVAILABLE: 503
```

`src/lib/errors/errors.ts` — chave nova `AI`, ao lado de `CHAT`:

```
AI: {
  AI_DISABLED:       'AI_DISABLED',
  AI_NOT_MANAGEABLE: 'AI_NOT_MANAGEABLE',
}
```

`src/lib/errors/errorMessages.ts` — mensagens em **pt-BR e en-US**, conforme a constituição:

| Chave | pt-BR | en-US |
|---|---|---|
| `AI_DISABLED` | As funcionalidades de IA estão desativadas nesta instalação. | AI features are disabled in this installation. |
| `AI_NOT_MANAGEABLE` | Esta instalação não possui suporte a IA habilitado. | This installation does not have AI support enabled. |

## Consumo de recursos

A recusa acontece no `preHandler`, **antes** do controller. Nenhum token de IA é consumido, nenhuma
chamada externa é emitida e nenhum registro de custo é gerado (FR-007).

## Enfileiramento

O ponto em `materialPdfReviewService.ts:33` não usa este middleware — não é rota, é serviço. A
condição é aplicada diretamente: com a IA desativada, a aprovação conclui sem chamar
`vectorizeQueue.add` (FR-005). O material fica disponível com `vectorStatus` em `PENDING`.

## Testes obrigatórios

- Com IA desativada, `POST /mis/:id/chat` autenticado responde `503` com `code: AI_DISABLED`
- Com IA desativada, `GET /mis/:id/summary` autenticado responde o mesmo
- Sem token, ambas respondem `401` — nunca `503`
- Com IA ativada, ambas voltam ao comportamento original
- Com IA desativada, nenhuma chamada ao provedor de IA é emitida (cliente espionado)
- Com IA desativada, aprovar material não cria job e conclui com `201`/`200`
