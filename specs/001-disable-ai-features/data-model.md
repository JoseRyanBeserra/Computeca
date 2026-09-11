# Phase 1 — Data Model: Desativação Global das Funcionalidades de IA

**Feature**: `001-disable-ai-features` | **Date**: 2026-09-10

Uma entidade nova. Nenhuma entidade existente muda de forma, e nenhum dado é apagado ou reescrito
(FR-010).

---

## Entidade nova: `AppSetting`

Par chave/valor para configuração de módulos governada pelo painel administrativo. Genérica por
desenho, para atender os demais módulos previstos na constituição sem exigir uma tabela por flag.

```prisma
model AppSetting {
  key         String   @id
  value       Json
  updatedAt   DateTime @updatedAt
  updatedById String?

  updatedBy User? @relation("AppSettingEditor", fields: [updatedById], references: [id])
}
```

O model `User` recebe a relação inversa `appSettingsUpdated AppSetting[] @relation("AppSettingEditor")`.

### Chave usada por esta feature

| Chave | Formato de `value` | Padrão quando ausente | Significado |
|---|---|---|---|
| `ai.enabled` | `{ "enabled": boolean }` | `{ "enabled": true }` | Disponibilidade operacional da IA, governada pelo painel |

**Por que o padrão é `true`**: a ausência do registro significa "o administrador nunca se
pronunciou". Quem provisiona uma instalação com `AI_FEATURES_ENABLED=true` está declarando que quer
IA; exigir um segundo gesto no painel para ativá-la seria surpreendente. O padrão do **produto**
continua sendo sem IA, porque o nível de ambiente é que nasce `false` (FR-001).

### Regras de validação

- `key` — string não vazia; para esta feature, exatamente `ai.enabled`.
- `value` — objeto com a propriedade booleana `enabled`. Validado por Zod na leitura; registro
  malformado é tratado como ausente e registrado como advertência, nunca derruba a requisição.
- `updatedById` — opcional; nulo apenas para registros criados por processo automatizado.

### Migração

Migração aditiva: cria a tabela e a chave estrangeira opcional para `User`. Nenhuma linha
existente é tocada. Nenhum `seed` é necessário — a ausência do registro já tem significado
definido.

---

## Disponibilidade efetiva

Não é um campo persistido, e sim o resultado da conjunção dos dois níveis:

```
disponibilidadeEfetiva = AI_FEATURES_ENABLED && (AppSetting["ai.enabled"].enabled ?? true)
```

| `AI_FEATURES_ENABLED` | `ai.enabled` no banco | Efetiva | Situação |
|---|---|---|---|
| `false` | qualquer / ausente | **desativada** | Instalação sem IA. Sem conexões, sem rotas, sem interface. Controle do painel aparece bloqueado (FR-014). |
| `true` | ausente | **ativada** | Instalação com IA, administrador nunca se pronunciou. |
| `true` | `true` | **ativada** | Operação normal. |
| `true` | `false` | **desativada** | Administrador desligou. Conexões seguem abertas; rotas recusam; interface esconde. Reversível sem reinício. |

O nível de banco **nunca** sobrepõe o de ambiente. Com `AI_FEATURES_ENABLED=false`, gravar
`ai.enabled = true` não produz efeito algum, e a escrita é recusada (ver contrato do `PATCH`).

---

## Entidades existentes — o que permanece intocado

| Entidade | Campos de IA | Tratamento |
|---|---|---|
| `MaterialInstrucional` | `summary`, `summaryStatus`, `summaryGeneratedAt`, `vectorStatus` | Preservados com os valores atuais. Não são lidos, escritos nem exibidos enquanto a IA estiver desativada. Nenhuma migração os altera. |
| `AuditLog` | — | Ganha um valor novo no campo livre `action`: `AI_AVAILABILITY_CHANGED`. O campo é `String`, então não há mudança de forma. |
| `InspectionLog` | — | Inalterado. Os controllers novos gravam nos dois sentidos, como todos os demais. |

### Estados de processamento congelados

`VectorStatus` e `SummaryStatus` mantêm seus valores. Um material que ficou em `PROCESSING` quando a
IA foi desligada **permanece em `PROCESSING`** — o sistema não tenta concluir nem marca como
`FAILED`, conforme o caso de borda previsto na especificação. A interface não expõe esse estado
enquanto a IA estiver desativada, então o valor inconsistente não é visível a ninguém.

O comando de reprocessamento (FR-015) considera `PENDING` e `FAILED` como pendentes. `PROCESSING`
fica de fora por padrão: pode haver um job vivo, e reenfileirar duplicaria trabalho e custo.

---

## Registro de auditoria da alteração

Toda escrita em `ai.enabled` grava:

| Campo | Valor |
|---|---|
| `action` | `AI_AVAILABILITY_CHANGED` |
| `actorId` | `request.user.sub` |
| `actorRole` | `request.user.role` (sempre `ADMIN`) |
| `targetId` | `ai.enabled` |
| `metadata` | `{ "de": boolean, "para": boolean }` |

Escrita que não altera o valor (ligar o que já está ligado) **não** gera registro — auditoria
registra mudança de estado, não requisição recebida.
