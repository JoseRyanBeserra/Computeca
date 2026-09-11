# Contrato — `PATCH /config/features/ai`

Liga e desliga a disponibilidade operacional da IA pelo painel administrativo, com efeito imediato
e sem reinício da aplicação (FR-013, nível de administração).

## Autorização

`authenticate` + `authorizeByRole(request.user.role, [ADMIN])`.

```
/** PATCH /config/features/ai — altera a disponibilidade da IA (ADMIN) */
```

## Requisição

```json
{ "enabled": false }
```

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `enabled` | `boolean` | sim | Booleano estrito; string `"false"` é rejeitada com `422` |

## Tipos e schemas

| Artefato | Nome |
|---|---|
| Tipo do body | `UpdateAiAvailabilityRequest` |
| Schema do body | `UpdateAiAvailabilityBodySchema` |
| Schema do service | `updateAiAvailabilitySchema` (body + `updatedById`) |
| Entrada do service | `UpdateAiAvailabilityServiceInput` |
| Resposta | `IFeatureAvailability` |

## Respostas

### `200 OK`

Mesmo formato de `GET /config/features`, já refletindo o novo estado.

```json
{ "ai": { "enabled": false, "manageable": true } }
```

### `409 Conflict` — instalação sem suporte a IA

Quando `AI_FEATURES_ENABLED=false`. A escrita é **recusada**, não silenciosamente ignorada
(FR-014): nada é gravado e o cache não é invalidado.

```json
{
  "status": "error",
  "message": "Esta instalação não possui suporte a IA habilitado.",
  "code": "AI_NOT_MANAGEABLE"
}
```

Por que `409` e não `503`: o `503` de `AI_DISABLED` significa "a funcionalidade de IA está
indisponível". Aqui a operação é de **configuração**, não de IA, e o que a impede é um conflito
com o estado da instalação. Códigos distintos permitem ao painel distinguir "IA desligada" de
"IA não governável aqui".

### `401` / `403`

Padrão do projeto — sem token e sem perfil `ADMIN`, respectivamente.

### `422`

`ZodError` capturado pelo `errorHandler` global quando `enabled` não é booleano.

## Efeitos colaterais

1. Grava `AppSetting["ai.enabled"] = { enabled }` com `updatedById`.
2. Invalida o cache de leitura no processo.
3. Grava `AuditLog` com `action: AI_AVAILABILITY_CHANGED` e `metadata: { de, para }` — **apenas
   quando o valor muda**.
4. Grava `InspectionLog` nos sentidos `CLIENT_TO_SERVER` e `SERVER_TO_CLIENT`, sucesso e erro.

Alterar para o valor já vigente responde `200` normalmente, mas não gera registro de auditoria.

## Testes obrigatórios

- `ADMIN` desliga e a resposta reflete `enabled: false`
- `ADMIN` religa e a resposta reflete `enabled: true`
- Após desligar, `POST /mis/:id/chat` passa a responder `503` sem reiniciar a aplicação
- `PROFESSOR` recebe `403`
- Sem token, `401`
- `{"enabled": "false"}` recebe `422`
- Com `AI_FEATURES_ENABLED=false`, recebe `409` e **nada** é gravado
- Mudança de valor gera `AuditLog`; repetição do mesmo valor não gera
