# Entrega — Observabilidade com OpenTelemetry

**Equipe:** eq15 · **Serviço:** `<OTEL_SERVICE_NAME>` · **Projeto:** Computeca — Acervo de Materiais Instrucionais, Campus IV UFPB

Documento de resposta aos exercícios/entregáveis da disciplina, cobrindo os **6 entregáveis de traces** (`docs/opentelemetry.md`) e os **4 de logs** (`docs/opentelemetry-logs.md`).

> ⚠️ **Sobre os números deste documento:** as medições e trace IDs abaixo vieram de execuções contra uma stack `grafana/otel-lgtm` local, usada durante o desenvolvimento. Ao gerar os prints finais no painel da turma, os trace IDs serão outros e as durações variam entre execuções — as proporções e conclusões se mantêm, mas **os valores absolutos precisam ser conferidos**.

---

## Ambiente

| Componente | Configuração |
| :-- | :-- |
| Backend de telemetria | Servidor central da disciplina (endpoint em `docs/opentelemetry.md`) |
| `OTEL_SERVICE_NAME` | `<OTEL_SERVICE_NAME>` |
| Protocolo | OTLP via HTTP (`http/protobuf`) |
| Autenticação | `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer <token>`, fora do git |
| Sinais ativos | Traces, métricas e logs |
| Instrumentação automática | `@opentelemetry/auto-instrumentations-node/register`, carregado por flag de runtime |
| Instrumentação manual | 25+ spans de negócio em 7 fluxos |

A aplicação é uma API **Fastify + TypeScript + Prisma**, com PostgreSQL, MinIO, Redis/BullMQ, Qdrant e OpenAI. O worker de vetorização roda como processo separado.

---

## 1. Backend no ar

A aplicação aponta para o servidor central da turma e exporta os três sinais sem nenhuma alteração de código, apenas carregando o módulo de registro antes do processo:

```
npm run dev:otel      # API
npm run worker:otel   # worker de vetorização
```

**Evidência:** Explore → Tempo, consulta `{resource.service.name="<OTEL_SERVICE_NAME>"}`, listando os traces de todos os fluxos do sistema.

> 📸 **Print 1** — lista de traces com a coluna *Service* mostrando `<OTEL_SERVICE_NAME>`.

Os três sinais foram verificados individualmente:

| Sinal | Verificação |
| :-- | :-- |
| **Traces** | Tempo indexa os traces de todos os fluxos instrumentados |
| **Métricas** | Prometheus com 83 séries — `http_server_duration_milliseconds`, `db_client_operation_duration_seconds`, `nodejs_eventloop_delay_max_seconds` |
| **Logs** | Loki recebendo logs do Pino com `trace_id` e `span_id`, correlacionados com os traces |

---

## 2. Trace de uma operação real

**Funcionalidade escolhida:** busca semântica sobre um Material Instrucional (RAG) — a operação mais complexa do sistema, que atravessa banco, OpenAI e banco vetorial numa única requisição.

**Trace:** `f787d155ec6cf97bb9adb5443acd68de` · **Duração total:** 11,50 s

```
Busca semântica (RAG) — POST /mis/:id/chat            [11503 ms]
└─ mi.chat.rag                                        [11196 ms]
   │  mi.id, usuario.id, busca.trechos_usados=5, ia.tokens_total=1660
   ├─ mi.chat.busca_semantica         7517 ms  ← etapa mais lenta
   │     busca.top_k=5, busca.score_minimo=0.3
   │     busca.total_encontrado=5, busca.melhor_score=0.466
   │  └─ POST (Qdrant)                7514 ms
   ├─ mi.chat.geracao_resposta        1904 ms
   │     ia.modelo=gpt-4o-mini, ia.tokens_prompt=1580
   │     ia.tokens_completion=62, ia.tokens_total=1642
   │  └─ chat gpt-4o-mini             1903 ms
   ├─ mi.chat.guardrail_moderacao     1111 ms
   │     guardrail.bloqueado=false
   ├─ mi.chat.embedding_pergunta       547 ms
   │     ia.modelo=text-embedding-3-small, ia.tokens_embedding=18
   ├─ mi.chat.guardrail_injection        2 ms
   └─ 6× pg.query:INSERT / SELECT      ~106 ms somados
```

### Qual etapa consome mais tempo

A **busca vetorial no Qdrant** (`mi.chat.busca_semantica`), com **7,52 s — 67% do tempo total**. Dentro dela, o span filho `POST` gerado pela auto-instrumentação mostra que praticamente todo esse tempo é a chamada HTTP ao Qdrant, não processamento local.

Duas leituras que o trace permite e o código não:

1. **Todas as etapas são sequenciais** — elas somam ~11,1 s contra os 11,2 s do span pai, ou seja, não há paralelismo. O guardrail de moderação e o embedding da pergunta são independentes entre si e poderiam rodar concorrentemente.
2. **Três chamadas à OpenAI num único pedido do usuário** — moderação (1,11 s), embedding (0,55 s) e geração (1,90 s), somando 3,56 s. O guardrail de *prompt injection*, que é regex local, custa **2 ms** — cerca de 550 vezes mais barato que o guardrail de moderação, que é uma ida à rede.

> 📸 **Print 2** — cascata completa deste trace.

---

## 3. Query SQL visível

**Trace:** `0f6541b669f86bef0f5344d3e1013e46` (Upload de MI — POST /mis)

Dentro do span manual `mi.upload.persistir_metadados` está o span gerado pela auto-instrumentação do driver `pg`:

```
pg.query:INSERT mi_db   [290 ms]
```

Atributos do span:

| Atributo | Valor |
| :-- | :-- |
| `db.system` | `postgresql` |
| `db.name` | `mi_db` |
| `db.user` | `postgres` |
| `net.peer.name` / `net.peer.port` | `127.0.0.1` / `5432` |
| `db.statement` | `INSERT INTO "public"."MaterialInstrucional" (...) VALUES (...) RETURNING ...` |

### Tabela e operação

O span representa uma operação **INSERT na tabela `MaterialInstrucional`**, do banco `mi_db`, emitida pelo Prisma através do driver `pg`. Ela persiste os metadados do Material Instrucional — título, nome original do arquivo, chave de armazenamento no MinIO, tipo MIME, tamanho em bytes, habilidades BNCC, status de revisão e autor — logo após o PDF ser gravado no object storage. A cláusula `RETURNING` é o Prisma trazendo a linha criada de volta para montar o DTO da resposta.

O aninhamento é o que dá o contexto: a query aparece **dentro** de `mi.upload.persistir_metadados`, que por sua vez está dentro de `mi.upload` — então o trace diz não só que a query rodou, mas qual etapa da regra de negócio a disparou.

O mesmo trace contém ainda um `pg.query:SELECT mi_db` (3 ms), que é um SELECT na tabela `User` buscando o nome do autor para compor a chave de armazenamento.

> 📸 **Print 3** — span `pg.query:INSERT mi_db` selecionado, com o painel de atributos mostrando `db.statement`.

**Observação sobre privacidade:** o `db.statement` mostra `$1, $2, $3…` no lugar dos valores. Isso é intencional no OpenTelemetry — queries parametrizadas não têm os valores capturados, para não vazar dado sensível para o backend de telemetria. É a mesma preocupação aplicada aos atributos de autenticação (ver seção 6).

---

## 4. Instrumentação manual

Foram adicionados **25+ spans manuais** em 7 fluxos de negócio, através dos helpers `withSpan` / `withSpanSync` de `MI-server/src/lib/tracing.ts`, que também registram exceções e marcam o span como erro.

| Fluxo | Spans manuais |
| :-- | :-- |
| **Upload de MI** | `mi.upload` › `validar_pdf`, `minio_put`, `validar_vinculo_orgs`, `persistir_metadados` |
| **Vetorização** (worker) | `mi.vetorizacao` › `download_pdf`, `extrair_texto`, `chunking`, `embedding_batch`, `qdrant_upsert` |
| **Busca semântica (RAG)** | `mi.chat.rag` › `guardrail_injection`, `guardrail_moderacao`, `embedding_pergunta`, `busca_semantica`, `geracao_resposta` |
| **Login** | `auth.login` › `verificar_senha` |
| **Refresh de sessão** | `auth.refresh_token` |
| **Envio de e-mail** | `auth.envio_email_verificacao` › `gerar_token`, `envio_smtp` |
| **Verificação de código** | `auth.verificar_email` |

As cascatas das seções 2, 3 e 5 mostram esses spans aninhados dentro dos spans HTTP e, dentro deles, os spans que a auto-instrumentação gerou para banco, HTTP de saída e object storage — os dois níveis de instrumentação convivendo na mesma árvore.

A API do OpenTelemetry é *no-op* quando o SDK não está carregado, então rodar `npm run dev` ou a suíte de testes não tem custo nem efeito colateral.

> 📸 **Print 4** — atendido pelo Print 2 (a cascata do RAG já mostra os cinco spans manuais aninhados).

---

## 5. Diagnóstico de operação lenta

### Achado principal: escritas de auditoria bloqueando a resposta

No trace do RAG (`f787d155...`) aparecem **6 spans `pg.query` de InspectionLog** — 5 INSERTs e 1 SELECT — todos **síncronos e sequenciais**, dentro do caminho da requisição.

```
pg.query:INSERT mi_db    49 ms
pg.query:INSERT mi_db    41 ms
pg.query:INSERT mi_db     6 ms
pg.query:SELECT mi_db     5 ms
pg.query:INSERT mi_db     5 ms
```

**Onde está o gargalo:** cada escrita é barata isoladamente, mas somam ~106 ms que o usuário espera sem receber nada em troca. São registros de auditoria do fluxo de IA — não fazem parte da resposta.

**O que eu faria:** mover as escritas para depois do envio da resposta ou para a fila BullMQ já existente no projeto. O `createInspectionLog` já é chamado com `.catch()` que apenas loga a falha — ou seja, o código **já trata essas escritas como não críticas**, mas ainda assim espera por elas. Bastaria não dar `await`, ou acumular os registros e gravar em lote no final.

Este é um problema que a telemetria revelou e que a leitura do código não revelaria: espalhados por 300 linhas de service, os `await createInspectionLog(...)` parecem inofensivos; na cascata, ficam visíveis como uma fileira de spans em sequência.

### Achado secundário: a busca vetorial domina o RAG

`mi.chat.busca_semantica` consumiu 7,52 s dos 11,50 s (67%). O span filho de HTTP mostra que o tempo está na chamada ao Qdrant, não no código da aplicação. Caminhos a investigar: tamanho e configuração da coleção, e o fato de a busca não estar limitada por índice de payload no filtro por `materialId`.

### Achado terciário: bcrypt é o custo real do login

No login bem-sucedido (`9fe2541bce0b05782c018cfb0e5ce3d8`), `auth.verificar_senha` levou 117 ms — trabalho de **CPU pura**, com `BCRYPT_SALT_ROUNDS=12`. No login com falha (`5f2122bbb8ca7bed8867b8dfb88f7510`), esse span é 74 ms dos 81 ms totais, ou seja, **91% do tempo**. É um custo deliberado (resistência a força bruta), mas o trace o torna mensurável — e mostra que otimizar banco no login não traria ganho algum.

> 📸 **Print 5** — cascata do RAG destacando a sequência de spans `pg.query`, ou a cascata da vetorização (`d76ea7f1ef48f86ac7e95fffefd81d8e`, 11,70 s) destacando `mi.vetorizacao.embedding_batch` com 3,32 s.

---

## 6. Atributos customizados

Os spans carregam atributos de negócio que a auto-instrumentação não teria como conhecer.

### Rastreio de consumo de tokens de IA — a família `ia.*`

No span `mi.chat.geracao_resposta`:

| Atributo | Valor |
| :-- | :-- |
| `ia.modelo` | `gpt-4o-mini` |
| `ia.tokens_prompt` | `1580` |
| `ia.tokens_completion` | `62` |
| `ia.tokens_total` | `1642` |
| `busca.trechos_usados` | `5` |

**Por que ajuda na investigação:** o projeto tem como requisito o *"rastreio detalhado de consumo de tokens por usuário e por operação para controle de custos"*. Com esses atributos no span, e `usuario.id` no span pai, o custo de IA passa a ser consultável no Grafana por usuário, por operação e por modelo — sem construir relatório nenhum. Uma consulta como `{span.ia.tokens_total > 1000}` encontra imediatamente as perguntas caras, e a comparação `ia.tokens_prompt` vs `ia.tokens_completion` (1580 contra 62) mostra que o custo está no **contexto enviado**, não na resposta gerada — o que aponta o ajuste certo: reduzir `TOP_K` ou o tamanho dos chunks, e não limitar o tamanho da resposta.

### Outros atributos de negócio

| Atributo | Onde | Para que serve |
| :-- | :-- | :-- |
| `mi.chunks_gerados` | vetorização | Correlacionar tamanho do documento com tempo de processamento |
| `mi.paginas`, `mi.caracteres` | extração de texto | Distinguir PDF pesado de PDF com muito texto |
| `busca.melhor_score` | busca semântica | Diagnosticar respostas ruins por baixa similaridade |
| `guardrail.bloqueado` | guardrails de IA | Medir taxa de bloqueio sem consultar o banco |
| `auth.falha` | login, refresh, verificação | Classificar o motivo da recusa de autenticação |
| `usuario.perfil` | login | Segmentar latência por tipo de usuário |

O `auth.falha` merece nota. A API devolve **deliberadamente a mesma mensagem** para "usuário não existe" e "senha incorreta", para não revelar quais e-mails estão cadastrados. O atributo distingue os casos (`usuario_inexistente`, `senha_incorreta`, `conta_suspensa`, `email_nao_verificado`, `token_expirado`, `codigo_expirado`) **apenas na telemetria** — quem opera o sistema consegue diagnosticar; quem chama a API não aprende nada a mais.

### Privacidade dos atributos

Traces vão para um backend de observabilidade, então foram tratados como superfície de exposição. Nos fluxos de autenticação:

- ❌ **fora dos spans:** senha, refresh token, código de verificação, e-mail completo
- ✅ **dentro:** `auth.email_dominio` (só o domínio — separa acesso institucional de externo sem identificar ninguém), `usuario.id`, `usuario.perfil`

Isso não ficou como convenção: dois arquivos de teste (`authTracing.test.ts` e `emailVerificationTracing.test.ts`) capturam todos os atributos emitidos e falham se qualquer valor sensível aparecer.

> 📸 **Print 6** — span `mi.chat.geracao_resposta` selecionado, com o painel de atributos mostrando a família `ia.*`.

---

# Parte II — Entregáveis de Logs

Respostas aos exercícios de `docs/opentelemetry-logs.md`. Todos os prints saem de **Explore → Loki** no painel da turma.

## L1. Log no Loki

A aplicação usa **Pino** como logger. Com `OTEL_LOGS_EXPORTER=otlp`, a instrumentação `@opentelemetry/instrumentation-pino` (incluída no pacote de auto-instrumentação) faz a ponte para o OTLP — os logs sobem sem código de bridge adicional.

**Consulta LogQL:**

```logql
{service_name="<OTEL_SERVICE_NAME>"}
```

> 📸 **Print L1** — linhas de log reais da aplicação filtradas por `service_name`.

**Nota técnica relevante:** o guia sugere montar o `LoggerProvider` manualmente no Node, com três pacotes extras (`@opentelemetry/api-logs`, `sdk-logs`, `exporter-logs-otlp-http`). Verificamos empiricamente que **isso não é necessário**: o módulo de registro já configura o provider de logs quando `OTEL_LOGS_EXPORTER=otlp` está definido.

Há, porém, uma condição que não está documentada e que fez os logs sumirem silenciosamente: **o transport `pino-pretty` impede a exportação**. Ele roda numa worker thread e a instrumentação só enxerga a stream do processo principal — o resultado é o sinal de logs vazio, sem nenhum erro. Por isso o logger desliga o `pino-pretty` quando `OTEL_LOGS_EXPORTER` está configurado (`src/lib/logger.ts` e `src/app.ts`).

## L2. Log estruturado

Os eventos de negócio são registrados com campos estruturados, não texto solto. Exemplo do fluxo de busca semântica (`materialPdfChatService.ts`):

```typescript
logger.info(
  {
    evento:          'rag_respondido',
    mi_id:           materialId,
    usuario_id:      userId,
    ia_modelo:       CHAT_MODEL,
    chunks_usados:   chunks.length,
    tokens_prompt:   tokenUsage.promptTokens,
    tokens_resposta: tokenUsage.completionTokens,
    tokens_total:    tokenUsage.totalTokens + tokenUsage.embeddingTokens,
  },
  'Busca semântica respondida',
)
```

Eventos estruturados disponíveis:

| `evento` | Onde | Campos de negócio |
| :-- | :-- | :-- |
| `mi_enviado` | upload de MI | `mi_id`, `mi_tamanho_bytes`, `mi_habilidades`, `usuario_id` |
| `mi_vetorizado` | worker | `mi_id`, `chunks_gerados`, `caracteres` |
| `rag_respondido` | busca semântica | `mi_id`, `usuario_id`, `ia_modelo`, `chunks_usados`, `tokens_*` |
| `login_efetuado` | login | `usuario_id`, `usuario_perfil`, `email_dominio` |
| `login_recusado` | login (WARN) | `motivo`, `usuario_id`, `email_dominio` |
| `falha_vetorizacao` | worker (ERROR) | `mi_id` + exceção |
| `erro_tratado` | qualquer controller (ERROR) | `contexto` + exceção |

**Consultas LogQL:**

```logql
{service_name="<OTEL_SERVICE_NAME>"} | json | evento="rag_respondido"
{service_name="<OTEL_SERVICE_NAME>"} | json | tokens_total > 1000
{service_name="<OTEL_SERVICE_NAME>"} | json | evento="mi_vetorizado" | line_format "{{.mi_id}} → {{.chunks_gerados}} chunks"
```

> 📸 **Print L2** — resultado de `| json | evento="rag_respondido"`, com os campos parseados visíveis.

O campo `tokens_total` é o mesmo dado que vai para o atributo de span `ia.tokens_total` (entregável 6). Ter nos dois sinais é deliberado: no trace serve para ver o custo **daquela requisição**; no log serve para **agregar** consumo por usuário ao longo do tempo.

## L3. Correlação log ↔ trace

Cada linha de log carrega `trace_id`, `span_id` e `trace_flags`, injetados automaticamente pela instrumentação do Pino. Exemplo real da saída da aplicação:

```json
{
  "level": 30,
  "trace_id": "79d6917ba19d363ecb1d76262210a691",
  "span_id": "033242fdc71e22d0",
  "trace_flags": "01",
  "evento": "rag_respondido",
  "msg": "Busca semântica respondida"
}
```

No Grafana, clicar numa linha de log que tenha `trace_id` oferece o botão para pular direto para a cascata correspondente no Tempo.

**Consulta LogQL:**

```logql
{service_name="<OTEL_SERVICE_NAME>"} | trace_id != ""
```

> 📸 **Print L3** — linha de log expandida mostrando o `trace_id` e o botão de salto para o Tempo. Idealmente, um segundo print mostrando a cascata que abriu a partir dele.

Esse é o ganho concreto de ter os três sinais no mesmo lugar: do evento de negócio (*o quê*) para a cascata (*onde e quanto tempo*) em um clique, sem procurar por timestamp.

## L4. Log de erro

Erros tratados são registrados com `logger.error` e a exceção sob a chave **`err`** — que é a chave reconhecida pelo serializer padrão do Pino, e a única que faz o tipo, a mensagem e o *stack trace* saírem estruturados.

Dois caminhos de erro instrumentados:

**1. Erro de requisição** (`src/utils/http.ts`) — todo controller passa por aqui:

```typescript
logger.error({ err: error, evento: 'erro_tratado', contexto: context }, `ERROR - ${context}`)
```

**2. Falha na vetorização** (`src/workers/vectorizeWorker.ts`) — antes de marcar o material como `FAILED`:

```typescript
logger.error(
  { err, evento: 'falha_vetorizacao', mi_id: materialId },
  'Falha ao vetorizar Material Instrucional',
)
```

**Como provocar:** o caminho mais simples é enviar um PDF corrompido — o `pdf-parse` lança `FormatError: bad XRef entry` e o log sai com a exceção completa. Um login com senha errada também gera `evento: 'login_recusado'` em nível WARN.

**Consultas LogQL:**

```logql
{service_name="<OTEL_SERVICE_NAME>"} | json | evento="erro_tratado"
{service_name="<OTEL_SERVICE_NAME>"} |= "error"
{service_name="<OTEL_SERVICE_NAME>"} | json | evento="falha_vetorizacao"
```

> 📸 **Print L4** — linha de erro expandida, mostrando o objeto `err` com tipo, mensagem e stack.

### Privacidade nos logs

O guia alerta: *"Nunca logue segredos"*. A mesma regra aplicada aos atributos de span vale nos logs — senha, token, código de verificação e e-mail completo ficam fora. O `login_recusado` registra `email_dominio`, não o endereço.

Uma exceção consciente: `sendVerificationEmailService` loga o código de verificação em nível INFO, com prefixo `[DEV]`, para permitir testar o cadastro sem SMTP configurado. **Isso precisa ser removido antes de qualquer uso real com o servidor central**, já que o log passa a sair da máquina.

---

## Resumo dos prints necessários

| # | Onde | O que precisa aparecer |
| :-- | :-- | :-- |
| 1 | Explore → Tempo → `{resource.service.name="<OTEL_SERVICE_NAME>"}` | Lista de traces com a coluna *Service* |
| 2 | Trace `f787d155ec6cf97bb9adb5443acd68de` | Cascata completa do RAG |
| 3 | Trace `0f6541b669f86bef0f5344d3e1013e46` → span `pg.query:INSERT mi_db` | Painel de atributos com `db.statement` |
| 4 | — | Atendido pelo Print 2 |
| 5 | Trace do RAG ou `d76ea7f1ef48f86ac7e95fffefd81d8e` | O span dominante da cascata |
| 6 | Trace do RAG → span `mi.chat.geracao_resposta` | Painel de atributos com `ia.tokens_*` |
| L1 | Explore → Loki → `{service_name="<OTEL_SERVICE_NAME>"}` | Linhas de log da aplicação |
| L2 | `{service_name="<OTEL_SERVICE_NAME>"} \| json \| evento="rag_respondido"` | Campos estruturados parseados |
| L3 | Linha de log expandida → botão de salto para o Tempo | `trace_id` visível e o trace aberto a partir dele |
| L4 | `{service_name="<OTEL_SERVICE_NAME>"} \| json \| evento="erro_tratado"` | Objeto `err` com tipo, mensagem e stack |

Ao abrir um trace, vale fechar o painel de query (botão **«** no topo) para a cascata ocupar a largura toda — sem isso o nome do trace aparece cortado.

---

## Apêndice — problemas encontrados durante a implementação

Registro dos pontos que não estão na documentação oficial e custaram tempo de depuração.

**1. Ordem dos detectores de recurso.** Em `OTEL_NODE_RESOURCE_DETECTORS`, o último vence. Com `env` no início da lista, o detector `process` sobrescrevia o `service.name` com `unknown_service:node.exe` e os traces sumiam do filtro no Grafana. O `env` precisa ficar por último.

**2. Detectores de nuvem travam o boot.** Os detectores de GCP/AWS/Azure tentam alcançar `metadata.google.internal` e `169.254.169.254` até dar timeout, atrasando a inicialização em máquina local. Foram omitidos da lista explicitamente.

**3. Spans HTTP sem nome de rota.** O `instrumentation-fastify` não descobre a rota sob o loader ESM do `tsx`, e todos os traces chegavam nomeados apenas `POST` ou `GET`. Resolvido com um hook `onRequest` que renomeia o span e anexa o atributo padrão `http.route`.

**4. `pino-pretty` impede a exportação de logs.** O transport roda em worker thread e a instrumentação do OTel só enxerga a stream do processo principal — o sinal de logs ficava silenciosamente vazio. O logger passa a desligar o transport quando `OTEL_LOGS_EXPORTER` está configurado.

**5. `localhost` e IPv6 no Docker Desktop (Windows).** Não tem relação com OpenTelemetry, mas derrubou o ambiente: `localhost` resolve primeiro para `::1`, e o relay IPv6 do Docker Desktop falha de forma intermitente. A conexão fica pendurada até dar timeout, **sem mensagem de erro** — o sintoma é a API parar de responder nas rotas que tocam o banco, enquanto o `psql` dentro do container funciona normalmente. Todos os endereços de serviço passaram a usar `127.0.0.1`.
