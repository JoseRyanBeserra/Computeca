# Contrato — `GET /config/features`

Informa ao cliente quais módulos estão disponíveis nesta instalação. É o que permite ao front não
renderizar nada de IA antes mesmo do login.

## Autorização

**Pública** — sem `authenticate`. Decisão consciente, registrada em JSDoc na rota.

Justificativa: o FR-002 exige que **visitante não logado** também não veja vestígio de IA. Se a
rota exigisse autenticação, o front não teria como decidir o que renderizar na tela inicial. O
corpo da resposta não expõe nada sensível — apenas se um módulo está ligado, informação que o
usuário deduziria da própria interface.

## Requisição

Sem parâmetros, sem corpo.

## Resposta `200 OK`

```json
{
  "ai": {
    "enabled": false,
    "manageable": false
  }
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `ai.enabled` | `boolean` | Disponibilidade **efetiva** (conjunção dos dois níveis). É o único campo que o front consulta para decidir renderização. |
| `ai.manageable` | `boolean` | Se o nível de ambiente permite governar a IA pelo painel. Espelha `AI_FEATURES_ENABLED`. Consumido apenas pelo painel administrativo, para apresentar o controle como bloqueado (FR-014). |

### Combinações possíveis

| `enabled` | `manageable` | Situação |
|---|---|---|
| `false` | `false` | Instalação sem IA — o caso padrão após esta feature |
| `true` | `true` | IA ligada nos dois níveis |
| `false` | `true` | Administrador desligou pelo painel |

`enabled: true` com `manageable: false` é **impossível** por construção — o nível de banco nunca
sobrepõe o de ambiente.

## Tipos

```
IFeatureAvailability   // @types/config
GetFeatureAvailabilityResponse
```

## Desempenho

Servida a partir de cache em memória do processo, invalidado a cada escrita. Não consulta o banco a
cada chamada.

## Testes obrigatórios

- Retorna `enabled: false, manageable: false` com `AI_FEATURES_ENABLED=false`, independentemente do
  que houver gravado em `ai.enabled`
- Retorna `enabled: true, manageable: true` com ambiente ligado e registro ausente
- Retorna `enabled: false, manageable: true` com ambiente ligado e registro `false`
- Responde sem token de autenticação
- Registro malformado no banco é tratado como ausente, sem erro ao cliente
