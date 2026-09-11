# Phase 0 — Research: Desativação Global das Funcionalidades de IA

**Feature**: `001-disable-ai-features` | **Date**: 2026-09-10

Todas as incógnitas do Technical Context foram resolvidas por leitura direta do código. Não restou
nenhum `NEEDS CLARIFICATION`.

---

## 1. Superfície real da IA no código

**Decisão**: o escopo da desativação são duas rotas, um worker, um ponto de enfileiramento e uma
checagem de inicialização.

**Rationale**: varredura por `qdrant`, `openai` e `redis` em `MI-server/src` delimitou o alcance:

| Ponto | Arquivo |
|---|---|
| Rota de chat | `routes/resources/materials/pdf/materialPdfUploadRoutes.ts` → `POST /mis/:id/chat` |
| Rota de resumo | mesmo arquivo → `GET /mis/:id/summary` |
| Serviço de chat | `services/resources/materials/pdf/materialPdfChatService.ts` |
| Serviço de resumo | `services/resources/materials/pdf/materialPdfSummaryService.ts` |
| Worker | `workers/vectorizeWorker.ts` |
| Enfileiramento | `services/resources/materials/pdf/materialPdfReviewService.ts:33` |
| Coleção Qdrant | `server.ts` → `ensureQdrantCollection()` |

**Alternativas consideradas**: buscar por menções a "IA" no front sugeria uma superfície maior,
incluindo busca semântica. Descartado — ver item 2.

---

## 2. A busca da listagem não é semântica

**Decisão**: a busca textual fica inteiramente fora do escopo da feature.

**Rationale**: `GET /mis/all?search=` e `GET /mis/public?search=` resolvem no PostgreSQL via Prisma.
O Qdrant não aparece em nenhum serviço de listagem — só em chat, resumo e no worker. Não existe
busca semântica ativa a ser removida.

**Alternativas consideradas**: a descrição inicial da mudança citava "busca semântica" entre as
features a ocultar. Mantê-la no escopo teria produzido trabalho sobre código inexistente.

---

## 3. Redis não atende nenhuma finalidade além da fila de IA

**Decisão**: desligar o Redis é seguro; nenhuma proteção de segurança depende dele.

**Rationale**: os únicos consumidores no código são `lib/queue.ts` e `workers/vectorizeWorker.ts`
(a menção em `lib/tracing.ts` é um comentário sobre auto-instrumentação). O `@fastify/rate-limit`
é registrado sem store externo, portanto usa memória do processo. `LOGIN_MAX_ATTEMPTS` e
`LOGIN_BLOCK_DURATION_SECONDS` não passam por Redis.

**Alternativas consideradas**: manter o Redis no conjunto padrão "por precaução" custaria memória
sem nenhuma função com a IA desligada.

---

## 4. Forma do interruptor

**Decisão**: dois níveis — `AI_FEATURES_ENABLED` (ambiente, padrão `false`) acima de um registro
`ai.enabled` persistido em banco e editável pelo painel administrativo. A disponibilidade efetiva é
a conjunção lógica dos dois.

**Rationale**: um interruptor só de ambiente não atenderia a exigência de modularidade da
constituição (painel administrativo, sem redeploy). Um interruptor só de banco não conseguiria
evitar as conexões com Redis e Qdrant, porque elas acontecem antes de qualquer consulta e os
serviços sequer existirão no ambiente. Cada nível resolve o que o outro não alcança.

**Alternativas consideradas**:

- *Apenas variável de ambiente*: mais simples, mas abriria uma exceção à constituição logo na
  primeira feature depois de ratificá-la.
- *Apenas painel*: não satisfaz o FR-006, que proíbe até a tentativa de conexão.
- *Remover as rotas do registro quando desativado*: produziria 404, indistinguível de rota
  inexistente, e impediria o nível operacional de religar sem reinício.

---

## 5. Conexões abertas no import do módulo

**Decisão**: tornar `lib/queue.ts` e `lib/openai.ts` preguiçosos, com função de acesso que lança ou
retorna `null` quando a IA está desativada.

**Rationale**: `lib/queue.ts` hoje executa `new Queue(...)`, registra um listener de erro e chama
`waitUntilReady()` **no corpo do módulo**. Qualquer import na cadeia abre conexão com Redis, mesmo
que nenhum job seja enfileirado — exatamente o que o FR-006 proíbe. `lib/openai.ts` instancia o
cliente no import; não abre conexão, mas obriga a chave a existir.

`lib/qdrant.ts` **já é preguiçoso** (`let _client: QdrantClientInstance | null = null`), então
basta impedir a chamada de `ensureQdrantCollection()` em `server.ts`.

**Alternativas consideradas**: envolver os imports em `await import()` condicional nos pontos de
uso. Resolve, mas espalha a condição por vários arquivos em vez de concentrá-la no módulo dono do
recurso.

---

## 6. `OPENAI_API_KEY` obrigatória para a aplicação subir

**Decisão**: tornar a chave condicionalmente obrigatória — exigida apenas quando
`AI_FEATURES_ENABLED` é verdadeiro.

**Rationale**: `env.ts` declara `OPENAI_API_KEY: z.string().min(1, ...)`, e `safeParse` lança na
carga do módulo. Hoje a aplicação **não inicia** sem a chave, o que torna o FR-008 impossível de
cumprir. Verificado empiricamente: para subir o ambiente de desenvolvimento nesta sessão foi
preciso preencher a variável com um valor de fachada.

Implementação por `superRefine` no schema, anexando o erro ao campo `OPENAI_API_KEY` para preservar
a mensagem de diagnóstico já existente quando a IA está ligada.

**Alternativas consideradas**: deixar a chave opcional sempre. Rejeitado — com a IA ligada, a
ausência da chave passaria despercebida até a primeira chamada falhar em produção.

---

## 7. Forma da recusa das operações de IA

**Decisão**: middleware `requireAiEnabled`, aplicado como `preHandler` nas duas rotas, lançando
`GeneralErrorResponse(SERVICE_UNAVAILABLE, buildError(ERRORS.AI.AI_DISABLED))`.

**Rationale**: segue o padrão já estabelecido por `requireUploadPermission` — mesma assinatura,
mesmo mecanismo de erro, tratamento pelo `errorHandler` global. O `503` comunica "funcionalidade
indisponível" sem sugerir que o recurso não existe (`404`) nem que falta permissão (`403`), que é
a semântica exigida pelo FR-004. Exige acrescentar `SERVICE_UNAVAILABLE: 503` a
`utils/statusCode.ts`, que hoje não o declara.

O erro entra no catálogo sob uma chave nova `AI`, ao lado de `CHAT`, com mensagem em pt-BR e en-US
conforme a constituição.

**Alternativas consideradas**:

- *Não registrar as rotas*: produz `404`, que confunde diagnóstico e some do inventário da API.
- *Retornar `200` com corpo vazio*: mascara a indisponibilidade e leva o front a renderizar estado
  de sucesso para algo que não aconteceu.

---

## 8. Persistência do estado operacional

**Decisão**: novo model `AppSetting` (`key` como chave primária, `value` em `Json`), com a chave
`ai.enabled`. Leitura em cache de processo, invalidado na escrita.

**Rationale**: o projeto não tem nenhuma infraestrutura de configuração em banco — não há model de
settings, nem rota, nem serviço. Um par chave/valor genérico atende esta feature e a futura
extensão a outros módulos previstos na constituição, sem impor uma tabela por flag.

O cache evita uma consulta ao banco em toda requisição de material só para saber se a IA está
ligada. Como só o próprio processo escreve, invalidar na escrita é suficiente; com várias
instâncias, o pior caso é um atraso até o próximo TTL, aceitável para o SC-008 (efeito em menos de
um minuto).

**Alternativas consideradas**:

- *Coluna booleana em uma tabela de configuração dedicada*: menos flexível para os próximos módulos.
- *Ler do banco em toda requisição*: custo desnecessário num dado que muda raramente.

---

## 9. Retirada dos serviços do Docker

**Decisão**: `profiles: ["ai"]` nos serviços `redis` e `qdrant` dos dois arquivos de Compose.

**Rationale**: é o mecanismo nativo do Compose para serviços opcionais. `docker compose up -d` passa
a subir só a stack enxuta; `docker compose --profile ai up -d` devolve os dois. Nada é removido do
arquivo, coerente com o FR-009.

**Ponto de atenção**: em `docker-compose.prod.yml`, o serviço `app` declara
`depends_on: redis: {condition: service_healthy}` e o mesmo para `qdrant`. Um `depends_on` apontando
para serviço fora do profile ativo **impede a subida**. Essas duas dependências precisam sair do
`app`; a ordem de inicialização deixa de ser garantida pelo Compose e passa a ser responsabilidade
do acesso preguiçoso decidido no item 5, que já tolera indisponibilidade.

Observado também que `mi-qdrant` não tem `healthcheck` declarado no Compose de desenvolvimento,
enquanto o de produção usa `condition: service_healthy` — inconsistência preexistente que a
remoção do `depends_on` torna irrelevante.

**Alternativas consideradas**: arquivo de override (`docker-compose.ai.yml`) com `-f`. Funciona, mas
exige lembrar de dois arquivos na linha de comando; o profile é uma palavra só.

---

## 10. Como o front descobre o estado

**Decisão**: endpoint público `GET /config/features`, consumido uma vez no carregamento por um
`FeaturesContext`, exposto às telas por um hook `useFeatures()`.

**Rationale**: o front precisa do estado **antes do login**, porque visitante não logado não pode
ver vestígio de IA (FR-002). Empacotar a decisão em contexto evita que cada tela faça sua própria
consulta e concentra num lugar só a regra de renderização.

`lib/permissions.ts` permanece puro — `canUseAiChat` continua respondendo apenas sobre o perfil do
usuário. A disponibilidade da funcionalidade é uma dimensão distinta de permissão e é combinada nos
pontos de uso. Misturar as duas tornaria impossível distinguir "não pode" de "não existe".

**Alternativas consideradas**:

- *Variável de build do Vite*: exigiria rebuild do front para religar, quebrando o SC-008.
- *Deduzir do erro 503 em tempo de execução*: a interface só esconderia a IA depois de tentar usá-la.

---

## 11. Reprocessamento do acervo pendente

**Decisão**: script `MI-server/scripts/aiBackfill.ts`, exposto como `npm run ai:backfill`, que conta
os materiais `APPROVED` com `vectorStatus` em `PENDING` ou `FAILED`, informa o total, enfileira e
recusa execução quando a IA está desativada.

**Rationale**: decisão do responsável pelo projeto (FR-015), para manter o custo de tokens sob
controle consciente. Enfileirar — em vez de processar — respeita o Princípio IV e reaproveita o
worker existente sem duplicar lógica.

**Alternativas consideradas**: varredura automática na reativação, que produziria um pico de custo
não planejado; e processamento sob demanda na primeira visita, que deixaria o acervo desigual por
tempo indeterminado.
