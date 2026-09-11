# Phase 1 — Data Model: Pré-visualização do PDF na Tela de Detalhes

**Feature**: `002-pdf-preview` | **Date**: 2026-09-11

**Nenhuma entidade persistida é criada ou alterada.** Não há migração, não há campo novo, não há
registro de auditoria. Visualizar um documento não altera estado.

O que esta seção descreve é o **estado de interface** que a feature introduz — efêmero, vive apenas
enquanto a tela está aberta.

---

## Estado: acesso ao arquivo

Produzido pelo hook `useMaterialFileUrl`, consumido pelo componente de pré-visualização e pela ação
de tela cheia.

| Campo | Tipo | Significado |
|---|---|---|
| `url` | `string \| undefined` | Endereço temporário do arquivo. Indefinido enquanto carrega ou após falha. |
| `expiresAt` | `number \| undefined` | Instante da expiração, em milissegundos. Derivado de `expiresInSeconds` no momento da resposta. |
| `isLoading` | `boolean` | A primeira busca está em andamento. |
| `isError` | `boolean` | A busca falhou. |
| `error` | `unknown` | Causa da falha, para traduzir em mensagem ao usuário. |
| `refetch` | `() => void` | Nova tentativa explícita, usada pelo botão de "tentar novamente" (FR-008). |

### Origem do dado

Nenhuma rota nova. A rota usada é escolhida pela mesma regra que a tela já aplica:

| Situação do usuário e do material | Rota consultada |
|---|---|
| Perfil `PROFESSOR` ou `ADMIN` | `GET /mis/:id/review-presigned-url` |
| Material com situação `APPROVED` | `GET /mis/:id/public-presigned-url` |
| Demais casos | `GET /mis/:id/presigned-url` |

As três já existem e respondem `{ url, expiresInSeconds }`. **Nenhuma permissão é ampliada**: se a
rota recusa, a pré-visualização não aparece — exatamente como a abertura em tela cheia já se
comporta hoje.

### Ciclo de vida

```
        ┌──────────┐   busca inicial
        │ carregando│ ──────────────┐
        └──────────┘                │
              │ falha               │ sucesso
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │   erro   │          │  válido  │
        └──────────┘          └──────────┘
              │                     │
              │ tentar novamente    │ faltam 5 min para expirar
              │                     │ E a aba está visível
              └──────────┬──────────┘
                         ▼
                    (nova busca)
```

**Regra de renovação**: a nova busca é agendada para 5 minutos antes de `expiresAt` e só executa com
a aba visível. Com a aba oculta, a renovação fica pendente e acontece quando o usuário retorna —
evita requisição desperdiçada e evita remontar o documento no meio de uma leitura, o que jogaria o
leitor de volta à primeira página.

---

## Estado: largura da tela

Produzido pelo hook `useIsNarrowScreen`.

| Campo | Tipo | Significado |
|---|---|---|
| retorno | `boolean` | Verdadeiro abaixo de 768px de largura de viewport. |

Ponto de corte em **768px**, alinhado ao breakpoint `md` do Tailwind já usado no projeto.
Reavaliado em redimensionamento de janela.

Quando verdadeiro, o documento **não é montado** — não basta escondê-lo, porque o elemento no DOM
faria o navegador baixar o arquivo mesmo sem exibição (ver `research.md`, item 4).

---

## Entidades existentes — o que permanece intocado

| Entidade | Tratamento |
|---|---|
| `MaterialInstrucional` | Nenhum campo lido ou escrito além do que a tela de detalhes já consome. `storageKey`, `mimeType` e os demais permanecem como estão. |
| `AuditLog` | Nenhum registro novo. Visualizar não altera estado, e a constituição exige auditoria de **mudança de estado**. |
| `InspectionLog` | Nenhum registro novo: não há controller novo. |
| `AppSetting` | Não é consultado. A feature não é governada por interruptor. |

---

## Dado que trafega

Nenhum dado novo cruza a fronteira da API. A resposta `{ url, expiresInSeconds }` já existe e já é
tipada em `materialsApi.ts`. O arquivo em si vai do armazenamento direto ao navegador, **sem passar
pela API** — que é a razão de existir da URL pré-assinada.
