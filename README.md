# Plataforma de Gestão de Materiais Instrucionais (MI) — Campus IV UFPB

> Sistema de curadoria, gestão e disseminação de Materiais Instrucionais para a comunidade acadêmica do Campus IV da UFPB, com enriquecimento de conteúdo via Inteligência Artificial.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Funcionalidades do Acervo](#funcionalidades-do-acervo)
3. [Stack Tecnológica](#2-stack-tecnológica)
4. [Arquitetura e Infraestrutura](#3-arquitetura-e-infraestrutura)
5. [Perfis e Permissões](#4-perfis-e-permissões)
6. [Inteligência Pedagógica e IA](#5-inteligência-pedagógica-e-ia)
7. [Gestão e Auditoria](#6-gestão-e-auditoria)
8. [Log de Auditoria](#log-de-auditoria)
9. [Integração com Serviço Externo](#integração-com-serviço-externo)
10. [Cobertura de Testes](#cobertura-de-testes)
11. [Observabilidade (OpenTelemetry)](#observabilidade-opentelemetry)
12. [Como Executar — Desenvolvimento](#7-como-executar--desenvolvimento)
13. [Como Executar — Produção](#8-como-executar--produção)
14. [CI/CD](#9-cicd)

---

## 1. Visão Geral

Esta plataforma centraliza, gerencia e dissemina **Materiais Instrucionais (MIs)** produzidos no **Campus IV da UFPB**. O sistema atende professores e toda a comunidade acadêmica, oferecendo:

- Curadoria pedagógica estruturada com fluxo de aprovação docente
- Busca semântica por significado e contexto nos documentos
- Enriquecimento automático de conteúdo via Inteligência Artificial
- Controle granular de acesso por perfil de usuário

> **Legenda de status** usada nas seções abaixo: ✅ implementado · 🟡 parcial · 🕓 planejado (ainda não implementado).

---

## Funcionalidades do Acervo

O que um Material Instrucional (MI) oferece hoje, de ponta a ponta. Cada funcionalidade entregue pelo fluxo speckit tem especificação, plano e tasks em [`specs/`](specs/).

| Funcionalidade | Descrição | Spec |
| :-- | :-- | :-- |
| **Cadastro de MI** | Envio de PDF (até 50 MB, validado por *magic bytes*) com **título** (até 255) e **descrição** (50 a 2000 caracteres) obrigatórios. Pode ser feito direto (`POST /mis`) ou dentro de um projeto (`POST /organizations/:orgId/mis`) — os dois caminhos compartilham parse e validação. | [`003`](specs/003-material-description/) |
| **Habilidades BNCC** | Seleção opcional entre as **141 habilidades** da BNCC de Computação — da Educação Infantil ao Ensino Médio, com descrição integral —, todas visíveis na lista, agrupadas por etapa, com busca por código ou trecho da descrição e habilidade personalizada. Filtro por habilidade na listagem. | [`006`](specs/006-bncc-habilidades-update/) |
| **Links relacionados** | Até **10** links opcionais (nome até 60 caracteres + endereço `http`/`https`), exibidos como botões abaixo da descrição. Endereços com `javascript:`, `data:`, `file:` e `ftp:` são recusados no servidor; os botões abrem em nova aba isolada da origem (`noopener noreferrer`). | [`004`](specs/004-material-links/) |
| **Pré-visualização do PDF** | Documento embutido na tela de detalhes, com acesso por URL pré-assinada renovada antes de expirar. Em telas estreitas o PDF não é carregado. | [`002`](specs/002-pdf-preview/) |
| **Fluxo de aprovação docente** | Material enviado entra como *aguardando revisão*; Professor/Admin aprova ou rejeita. | — |
| **Edição pelo Admin** | `PUT /mis/:id` altera título, descrição, habilidades e links, e opcionalmente **substitui o PDF** (com confirmação explícita; material aprovado volta para revisão). Cada edição grava o que mudou, com valor anterior e novo. | [`005`](specs/005-material-edit/) |
| **Remoção do acervo** | *Soft delete* por Professor/Admin — o material some das listagens, mas o registro permanece. | — |
| **Projetos (organizações)** | Criação de projetos, convites por e-mail, membros e materiais vinculados ao projeto. | — |
| **Recursos de IA** | Resumo automático e chat (RAG) sobre o PDF, com interruptor global. Ver [Inteligência Pedagógica e IA](#5-inteligência-pedagógica-e-ia). | [`001`](specs/001-disable-ai-features/) |

---

## 2. Stack Tecnológica

| Camada              | Tecnologia                           |
| :------------------ | :----------------------------------- |
| **Frontend**        | React 19 + Vite + TypeScript         |
| **Backend / API**   | Node.js + Fastify + TypeScript       |
| **ORM**             | Prisma                               |
| **Banco de dados**  | PostgreSQL 16                        |
| **Filas / Jobs**    | BullMQ + Redis 7                     |
| **Busca Semântica** | Qdrant (Vector Database)             |
| **Armazenamento**   | MinIO (dev) / AWS S3 (prod)          |
| **IA**              | OpenAI (moderação, embeddings, chat) |
| **Conteinerização** | Docker + Docker Compose              |
| **CI/CD**           | GitHub Actions + GHCR                |
| **Proxy (frontend)**| Nginx                                |

---

## 3. Arquitetura e Infraestrutura

```
Internet
  └── Nginx (porta 80)   ← Serve o React SPA
  └── API Fastify (porta 3333)
        ├── PostgreSQL (externo, porta 8115 em produção)
        └── Redis (interno via Docker)
```

- **Processamento Assíncrono:** Tarefas pesadas (vetorização de PDFs) são delegadas a **Background Jobs** gerenciados com **BullMQ + Redis** (`src/workers/vectorizeWorker.ts`), mantendo a API responsiva.
- **Busca Semântica:** **Qdrant** faz a indexação vetorial dos documentos (`src/lib/qdrant.ts`), habilitando buscas por significado e contexto no chat de IA sobre os materiais.
- **Armazenamento de arquivos:** **MinIO** no desenvolvimento com transição transparente para **AWS S3** em produção (`src/lib/minio.ts`).

---

## 4. Perfis e Permissões

| Perfil                 | Permissões                                                                           | Status |
| :--------------------- | :----------------------------------------------------------------------------------- | :----- |
| **Não Logado**         | Consulta e visualização de materiais públicos apenas.                                | 🟡 Hoje a listagem (`GET /mis/public`) exige login; o visitante vê o convite para entrar. |
| **Usuário Logado**     | Consultas, favoritos, coleções personalizadas e interação com recursos de IA.        | 🟡 Consultas e IA ✅ · favoritos e coleções 🕓 |
| **Institucionalizado** | Submissão de MIs para o fluxo de aprovação docente.                                  | ✅ |
| **Professor / Admin**  | Upload direto, aprovação de submissões de terceiros e gestão completa de permissões. | ✅ Edição de materiais é exclusiva do **Admin**. |

---

## 5. Inteligência Pedagógica e IA

- ✅ **Resumo automático e chat com o PDF (RAG):** resumo gerado sob demanda e cacheado no material; chat com guardrails de *prompt injection* e moderação, respondendo a partir dos trechos recuperados no Qdrant.
- 🟡 **Análise BNCC Computação:** Identificação automática das habilidades da BNCC de Computação contempladas pelo material. *Hoje as habilidades são selecionadas manualmente no cadastro; a identificação automática por IA está planejada.*
- 🕓 **Tradução Multilíngue:** Geração automatizada de resumos em **Inglês** e **Espanhol**, preservando a integridade técnica. *O resumo atual é gerado apenas em português.*
- ✅ **Observabilidade de IA:** Rastreio de consumo de tokens por usuário e por operação, via atributos `ia.*` e `usuario.id` nos spans do OpenTelemetry (ver [Observabilidade](#observabilidade-opentelemetry)).
- ✅ **Modularidade:** Painel administrativo para habilitar ou desabilitar funcionalidades de IA sem redeploy, subordinado ao interruptor `AI_FEATURES_ENABLED`.

---

## 6. Gestão e Auditoria

- ✅ **Fluxo de Aprovação Docente:** Revisão obrigatória por professores para todo material submetido por perfis institucionalizados.
- ✅ **Auditabilidade Total:** Logs completos — quem enviou, quem aprovou, quando e o que foi alterado (a edição registra cada campo com valor anterior e novo).
- 🟡 **Métricas de Engajamento:** Dashboard com estatísticas de consumo, termos mais buscados e ranking de MIs mais acessados. *O painel administrativo já exibe totais de usuários, materiais aprovados, pendentes e projetos ativos; o registro de buscas e acessos para os rankings está planejado.*

---

## Log de Auditoria

O sistema mantém uma trilha de auditoria das ações sensíveis dos usuários.

- **O que é auditado** — ações relevantes de negócio, registradas explicitamente nos services:
  | Ação (`action`)              | Quando ocorre                                  |
  | :--------------------------- | :--------------------------------------------- |
  | `USER_REGISTERED`            | Cadastro de novo usuário                       |
  | `USER_LOGGED_IN`             | Login bem-sucedido                             |
  | `USER_PROMOTED_TO_PROFESSOR` | Admin promove usuário a Professor              |
  | `ORGANIZATION_CREATED`       | Criação de um projeto/organização              |
  | `MI_APPROVED` / `MI_REJECTED`| Revisão docente de um material instrucional    |
  | `MI_UPDATED`                 | Edição de um material pelo Admin — `metadata` guarda só os campos alterados, com `from`/`to` (título, descrição, habilidades, links, arquivo e situação) |
  | `MI_DELETED`                 | Remoção (*soft delete*) de um material         |
  | `AI_AVAILABILITY_CHANGED`    | Admin liga ou desliga os recursos de IA no painel |

- **Onde fica armazenado** — tabela **`AuditLog`** no PostgreSQL (via Prisma). Campos principais:
  `id`, `actorId` (quem fez), `actorRole`, `targetId` (alvo da ação), `action`, `metadata` (JSON com contexto), `createdAt`.
  Definição em [`MI-server/prisma/schema.prisma`](MI-server/prisma/schema.prisma) (`model AuditLog`).

- **Como foi implementado** — **service dedicado** (`createAuditLog`), invocado explicitamente dentro de cada service de negócio após a operação (não é um interceptor global). Isso garante que apenas ações significativas — e com o contexto correto (ator, alvo, metadados) — sejam registradas.

- **Classes/arquivos participantes:**
  - [`MI-server/src/repositories/audit/auditRepository.ts`](MI-server/src/repositories/audit/auditRepository.ts) — `createAuditLog`
  - [`MI-server/src/services/auth/authService.ts`](MI-server/src/services/auth/authService.ts) — login
  - [`MI-server/src/services/users/usersService.ts`](MI-server/src/services/users/usersService.ts) — cadastro
  - [`MI-server/src/services/users/setUserAsProfessorService.ts`](MI-server/src/services/users/setUserAsProfessorService.ts) — promoção
  - [`MI-server/src/services/organizations/createOrganizationService.ts`](MI-server/src/services/organizations/createOrganizationService.ts) — criação de projeto
  - [`MI-server/src/services/resources/materials/pdf/materialPdfReviewService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfReviewService.ts) — aprovação/rejeição
  - [`MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts) — edição (diff calculado por [`buildMaterialEditDiff.ts`](MI-server/src/utils/buildMaterialEditDiff.ts))
  - [`MI-server/src/services/resources/materials/pdf/materialPdfDeleteService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfDeleteService.ts) — remoção
  - [`MI-server/src/services/config/updateAiAvailabilityService.ts`](MI-server/src/services/config/updateAiAvailabilityService.ts) — interruptor de IA

> Complementarmente, há o **`InspectionLog`** (`model InspectionLog`) que rastreia o ciclo de vida das requisições HTTP (cliente→API→cliente), visível na tela administrativa `/admin/logs` do frontend.

---

## Integração com Serviço Externo

O sistema integra-se com **serviços externos reais** via SDK, todos configurados por variáveis de ambiente (nenhum segredo versionado).

### OpenAI (principal)

- **Para que é usado** — enriquecimento de conteúdo e chat com IA (RAG) sobre os PDFs dos materiais: **moderação** de conteúdo da pergunta, geração de **embeddings** (`text-embedding-3-small`) e **chat completions** para gerar a resposta a partir dos trechos recuperados.
- **Arquivos participantes:**
  - [`MI-server/src/lib/openai.ts`](MI-server/src/lib/openai.ts) — `new OpenAI({ apiKey })` (SDK `openai`)
  - [`MI-server/src/services/resources/materials/pdf/materialPdfChatService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfChatService.ts) — `openai.moderations.create`, `openai.embeddings.create`, `openai.chat.completions.create`
- **Configuração (env):** `OPENAI_API_KEY`

### MinIO / AWS S3 (armazenamento de objetos)

- **Para que é usado** — armazenamento dos arquivos PDF dos materiais e geração de URLs pré-assinadas para download.
- **Arquivos participantes:**
  - [`MI-server/src/lib/minio.ts`](MI-server/src/lib/minio.ts) — `new Client({ endPoint, ... })` (SDK `minio`)
  - [`MI-server/src/services/resources/materials/pdf/materialPdfUploadService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfUploadService.ts) — `minioClient.putObject`
  - [`MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfEditService.ts) — substituição do PDF (grava sob chave nova e só então remove o antigo)
  - [`MI-server/src/services/resources/materials/pdf/materialPdfPresignedUrlService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfPresignedUrlService.ts) — `minioPublicClient.presignedGetObject`
- **Configuração (env):** `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_REGION` (+ `MINIO_PUBLIC_*` para URLs públicas)

### Qdrant (banco vetorial)

- **Para que é usado** — indexação vetorial dos trechos dos PDFs e busca semântica por similaridade que alimenta o RAG.
- **Arquivos participantes:**
  - [`MI-server/src/lib/qdrant.ts`](MI-server/src/lib/qdrant.ts) — `new QdrantClient({ url, apiKey })` (SDK `@qdrant/js-client-rest`)
  - [`MI-server/src/services/resources/materials/pdf/materialPdfChatService.ts`](MI-server/src/services/resources/materials/pdf/materialPdfChatService.ts) — `qdrant.search`
  - [`MI-server/src/workers/vectorizeWorker.ts`](MI-server/src/workers/vectorizeWorker.ts) — `qdrant.upsert` / `qdrant.delete`
- **Configuração (env):** `QDRANT_URL`, `QDRANT_API_KEY`

> O **PostgreSQL** não é contabilizado aqui por ser infraestrutura básica do projeto.

---

## Cobertura de Testes

Relatórios de cobertura HTML commitados na pasta [`cobertura/`](cobertura/) (gerados com **Vitest + @vitest/coverage-v8**):

| Módulo       | Statements | Lines      | Relatório                                                  |
| :----------- | :--------- | :--------- | :--------------------------------------------------------- |
| **Backend**  | **86,22%** | **86,56%** | [`cobertura/backend/index.html`](cobertura/backend/index.html)   |
| **Frontend** | **85,12%** | **87,14%** | [`cobertura/frontend/index.html`](cobertura/frontend/index.html) |

Ambos os módulos atendem à meta de **≥ 85%**. Para regenerar:

```bash
# Backend (unit + integração — requer a infra Docker no ar)
cd MI-server && npx vitest run --config vitest.config.ts --coverage
cp -r coverage ../cobertura/backend

# Frontend
cd front && npx vitest run --coverage
cp -r coverage ../cobertura/frontend
```

---

## Observabilidade (OpenTelemetry)

A aplicação emite os três sinais de telemetria — **traces**, **métricas** e **logs** — via **OTLP**.

### Backend de telemetria

**Destino oficial:** o servidor central da disciplina — a mesma URL serve para ingestão e para o painel Grafana. Não é preciso subir backend nenhum: basta preencher as variáveis de ambiente. O endpoint, o nome de serviço e o token são fornecidos pela disciplina (ver [`docs/opentelemetry.md`](docs/opentelemetry.md)) e **não são versionados** — vivem apenas no `.env` local e no `.env` do portal, em produção.

> 🔒 O token **nunca** entra em commit. Ele vive no `MI-server/.env`, que está no `.gitignore`. Sem o token, a ingestão responde `401`.

**Alternativa para desenvolvimento offline:** o serviço `otel-lgtm` (imagem `grafana/otel-lgtm`) no [`MI-server/docker-compose.yml`](MI-server/docker-compose.yml) sobe a stack completa — coletor OTLP + Tempo + Loki + Prometheus + Grafana — num único container.

```bash
cd MI-server && docker compose up -d otel-lgtm
```

| Porta  | Serviço                                       |
| :----- | :-------------------------------------------- |
| `3000` | Grafana — **http://127.0.0.1:3000** (`admin` / `admin`) |
| `4317` | OTLP via gRPC                                 |
| `4318` | OTLP via HTTP — usado pela aplicação          |

Para usar a stack local, aponte `OTEL_EXPORTER_OTLP_ENDPOINT` para `http://127.0.0.1:4318` e comente o header do token.

> ⚠️ Use **`127.0.0.1:3000`**, não `localhost:3000`. O `localhost` resolve primeiro para IPv6 (`::1`), onde o relay do Docker Desktop no Windows devolve resposta vazia.

### Instrumentação automática (zero-code)

Nenhum arquivo de `src/` precisa ser alterado para gerar spans de biblioteca: o módulo de registro do OTel é carregado **antes** da aplicação, por flag de runtime.

```bash
npm run dev:otel      # API com auto-instrumentação (tsx watch)
npm run worker:otel   # worker de vetorização com auto-instrumentação
npm run start:otel    # produção — build compilado (dist/server.js)
```

Os scripts `dev`, `worker` e `start` originais continuam **sem** OTel — a telemetria é opt-in.

São instrumentados automaticamente: servidor HTTP (Fastify), driver `pg` (todas as queries do Prisma viram spans), Redis/BullMQ, clientes HTTP de saída (OpenAI, Qdrant, MinIO) e o logger Pino (cada log sai com `trace_id`/`span_id`, permitindo pular do log direto para o trace no Grafana).

> **Pino e o `pino-pretty`:** o transport `pino-pretty` roda numa worker thread, e a instrumentação do OTel só enxerga o que passa pela stream do processo principal — com ele ativo, **nenhum log chega ao Loki**. Por isso o logger desliga o transport quando `OTEL_LOGS_EXPORTER` está configurado ([`logger.ts`](MI-server/src/lib/logger.ts) e [`app.ts`](MI-server/src/app.ts)): em modo observabilidade abre-se mão do log colorido para não perder um dos três sinais.

### Configuração (env)

Todas as variáveis ficam no `.env` (modelo em [`MI-server/.env.example`](MI-server/.env.example)):

| Variável                        | Valor                           |
| :------------------------------ | :------------------------------ |
| `OTEL_SERVICE_NAME`             | fornecido pela disciplina — **não versionar** |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | fornecido pela disciplina — **não versionar** |
| `OTEL_EXPORTER_OTLP_HEADERS`    | token de ingestão — **não versionar** |
| `OTEL_EXPORTER_OTLP_PROTOCOL`   | `http/protobuf`                 |
| `OTEL_TRACES_EXPORTER`          | `otlp`                          |
| `OTEL_METRICS_EXPORTER`         | `otlp`                          |
| `OTEL_LOGS_EXPORTER`            | `otlp`                          |
| `OTEL_NODE_RESOURCE_DETECTORS`  | `host,os,process,serviceinstance,container,env` |

> ⚠️ **O `OTEL_SERVICE_NAME` precisa seguir exatamente o padrão da disciplina.** O Grafana é compartilhado entre todas as turmas, e é por esse nome que a equipe se encontra no painel. Nome fora do padrão vira "órfão" e não é localizado. O valor correto está no guia da disciplina.

Quatro detalhes que custam tempo se descobertos do jeito difícil:

- **No Windows com Docker Desktop, use `127.0.0.1` e não `localhost`** em todos os endereços de serviço (Postgres, MinIO, Redis, Qdrant). O `localhost` resolve primeiro para `::1`, e o relay IPv6 do Docker Desktop falha de forma intermitente: a conexão fica pendurada até dar timeout, **sem mensagem de erro** — o sintoma é a aplicação simplesmente parar de responder nas rotas que tocam o banco.
- **A ordem em `OTEL_NODE_RESOURCE_DETECTORS` importa — o último vence.** O `env` precisa ficar por último: se o `process` vier depois, ele sobrescreve o `service.name` com `unknown_service:node.exe` e os traces somem do filtro no Grafana. Os detectores de nuvem (GCP/AWS/Azure) foram omitidos de propósito — eles travam o boot tentando alcançar `metadata.google.internal` até dar timeout.

### Instrumentação manual (spans de negócio)

A auto-instrumentação enxerga bibliotecas, não regra de negócio. Os spans de negócio são criados pelos helpers `withSpan` / `withSpanSync` de [`MI-server/src/lib/tracing.ts`](MI-server/src/lib/tracing.ts), que também registram exceções e marcam o span como erro (aparece em vermelho na cascata).

A API do OTel é **no-op quando o SDK não está carregado** — rodar `npm run dev` ou os testes não tem custo nem efeito colateral.

| Fluxo                        | Spans                                                                                                                     |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Upload de MI**             | `mi.upload` › `validar_pdf`, `minio_put`, `validar_vinculo_orgs`, `persistir_metadados`                                   |
| **Vetorização** (worker)     | `mi.vetorizacao` › `download_pdf`, `extrair_texto`, `chunking`, `embedding_batch`, `qdrant_upsert`                        |
| **Busca semântica (RAG)**    | `mi.chat.rag` › `guardrail_injection`, `guardrail_moderacao`, `embedding_pergunta`, `busca_semantica`, `geracao_resposta` |
| **Login**                    | `auth.login` › `verificar_senha`                                                                                          |
| **Refresh token**            | `auth.refresh_token`                                                                                                      |
| **Envio de e-mail de verificação** | `auth.envio_email_verificacao` › `gerar_token`, `envio_smtp`                                                        |
| **Verificação do código**    | `auth.verificar_email`                                                                                                    |

Atributos de negócio anexados aos spans: `mi.id`, `usuario.id`, `usuario.perfil`, `mi.tamanho_bytes`, `mi.paginas`, `mi.chunks_gerados`, `busca.trechos_usados`, `busca.melhor_score`, `guardrail.bloqueado`, `auth.falha`, `auth.email_dominio` e a família `ia.*` (`ia.modelo`, `ia.tokens_prompt`, `ia.tokens_completion`, `ia.tokens_total`) — que atende ao requisito de rastreio de consumo de tokens por usuário e por operação, permitindo agregar custo de IA por `usuario.id` no Grafana.

O atributo `auth.falha` classifica **por que** uma autenticação foi recusada (`usuario_inexistente`, `senha_incorreta`, `conta_suspensa`, `email_nao_verificado`, `token_expirado`, `codigo_expirado`…). Como a API devolve deliberadamente a mesma mensagem para credencial inválida — para não revelar quais e-mails existem — esse atributo é o único lugar onde a distinção fica visível para quem opera o sistema, sem vazá-la para quem chama a API.

#### Privacidade dos atributos

Traces são exportados para um backend de observabilidade — **não são log de auditoria e não podem carregar credencial nem PII**. A regra aplicada nos fluxos de auth:

- ❌ senha, refresh token, código de verificação, e-mail completo
- ✅ `auth.email_dominio` (só o domínio, permite separar acesso institucional de externo), `usuario.id`, `usuario.perfil`

Isso é verificado por testes automatizados — [`authTracing.test.ts`](MI-server/__tests__/unit/auth/authTracing.test.ts) e [`emailVerificationTracing.test.ts`](MI-server/__tests__/unit/auth/emailVerificationTracing.test.ts) capturam todos os atributos emitidos e falham se algum valor sensível aparecer.

### Como visualizar

1. Suba a API (`npm run dev:otel`) e o worker (`npm run worker:otel`). Se estiver usando a stack local em vez do servidor da turma, suba também o `otel-lgtm`.
2. Use o sistema — faça upload de um MI, aprove-o, faça uma pergunta no chat.
3. Abra o Grafana:
   - **servidor da turma** → URL do painel indicada em [`docs/opentelemetry.md`](docs/opentelemetry.md) (leitura liberada, sem login)
   - **stack local** → <http://127.0.0.1:3000> (`admin` / `admin`)
4. **Explore** → datasource **Tempo** → **Search** por `service.name = <OTEL_SERVICE_NAME>`.
5. Clique num trace para abrir a cascata.

Para os logs, o caminho é o mesmo trocando o datasource para **Loki**, com `{service_name="<OTEL_SERVICE_NAME>"}`.

Consultas TraceQL úteis (aba **TraceQL** do Explore):

| Objetivo | Query |
| :-- | :-- |
| Todos os traces do serviço | `{resource.service.name="<OTEL_SERVICE_NAME>"}` |
| Um fluxo específico | `{span.http.route="/mis"}` |
| Vetorização (worker) | `{name=~"Vetorização.*"}` |
| Só as falhas de autenticação | `{span.auth.falha!=""}` |
| Operações lentas | `{resource.service.name="<OTEL_SERVICE_NAME>" && duration > 3s}` |
| Consumo alto de tokens de IA | `{span.ia.tokens_total > 1000}` |

> O Tempo leva de 30 s a 1 min para indexar. Busca vazia logo após a requisição é atraso de indexação, não erro.

Exemplo real da cascata de vetorização de um PDF de 5 páginas (24k caracteres, 31 chunks):

```
mi.vetorizacao  [11337 ms]  {mi.chunks_gerados: 31, job.id: 17}
├─ mi.vetorizacao.qdrant_upsert      3943 ms   ← gargalo dominante
├─ mi.vetorizacao.embedding_batch    2624 ms   {ia.tokens_embedding: 9211}
├─ mi.vetorizacao.download_pdf        129 ms
├─ mi.vetorizacao.extrair_texto       124 ms   {mi.paginas: 5, mi.caracteres: 24176}
└─ mi.vetorizacao.chunking              0 ms
```

> **Nota sobre o nome dos traces:** a auto-instrumentação sozinha nomeia o span HTTP raiz apenas com o verbo (`POST`, `GET`), porque o `instrumentation-fastify` não descobre a rota sob o loader ESM do `tsx` — o que deixa a lista de traces do Grafana ilegível, com dezenas de linhas chamadas "POST". Um hook `onRequest` em [`app.ts`](MI-server/src/app.ts) resolve: renomeia o span para `Login — POST /auth/login`, prefixando o rótulo de negócio do fluxo (mapa `ROTULOS_DE_FLUXO` em [`tracing.ts`](MI-server/src/lib/tracing.ts)), e anexa o atributo padrão `http.route` com a rota crua — então agrupamento de métricas e consultas TraceQL continuam usando o valor convencional.

Com isso a lista de traces fica autoexplicativa:

```
Vetorização de MI — mi.vetorizacao                5020 ms
Busca semântica (RAG) — POST /mis/:id/chat        6067 ms
Upload de MI — POST /mis                           896 ms
Listagem pública de MIs — GET /mis/public          777 ms
Aprovação de MI — PATCH /mis/:id/review            183 ms
Login — POST /auth/login                           117 ms
```

### Produção

A telemetria em produção é **opt-in por variável de ambiente**, e depende de duas peças além das variáveis:

1. **`start.sh`** carrega o registro do OTel (`node --require …`) **apenas quando `OTEL_EXPORTER_OTLP_ENDPOINT` está definido**. Sem o `--require`, definir as variáveis `OTEL_*` não produz efeito nenhum: o SDK nunca é carregado e nada é exportado, silenciosamente.
2. **`docker-compose.prod.yml`** precisa declarar as variáveis no bloco `environment:`. O compose só repassa para dentro do container o que está declarado ali — variáveis presentes apenas no `.env` do portal não chegam à aplicação.

Com as duas peças no lugar, basta definir no `.env` do portal as quatro variáveis abaixo, com os valores fornecidos pela disciplina:

```
OTEL_SERVICE_NAME=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=
```

Os demais (`OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER`, `OTEL_NODE_RESOURCE_DETECTORS`, `OTEL_RESOURCE_ATTRIBUTES`) já têm valor padrão correto no compose e só precisam ser definidos para sobrescrever.

O `start.sh` sobe três processos: Nginx (frontend), o **worker de vetorização** em background e a API como processo principal. Worker e API recebem a mesma flag do OTel, então ambos exportam sob o mesmo `OTEL_SERVICE_NAME`.

> O worker passou a ser iniciado em produção nesta versão. Antes, o `start.sh` subia apenas Nginx e a API, e o `npm run build` compilava só `src/server.ts` — de modo que os jobs enfileirados na aprovação de um MI ficavam parados no Redis para sempre, o material nunca saía de `vectorStatus=PENDING` e o chat com IA respondia `MI_NOT_VECTORIZED` para qualquer pergunta. O build agora gera também `dist/workers/vectorizeWorker.js`.

---

## 7. Como Executar — Desenvolvimento

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose

> ⚠️ **Não copie `node_modules` entre sistemas operacionais.** Prisma, esbuild e Tailwind baixam binários nativos do SO em que o `npm install` rodou — pastas instaladas no Windows não funcionam no Linux/macOS, e vice-versa. Ao trocar de máquina, apague `node_modules` e rode `npm install` de novo.

### Backend (MI-server)

```bash
cd MI-server

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com seus valores

# Subir a infraestrutura via Docker (PostgreSQL, MinIO e observabilidade)
docker compose up -d
# Só o essencial, sem o Grafana (imagem de alguns GB):
#   docker compose up -d db minio

# Executar migrations e seed
npm run db:migrate
npm run db:seed

# Iniciar servidor em modo desenvolvimento
npm run dev
```

> ⚠️ **Imagem do MinIO:** a imagem `minio/minio` deixou de ser publicada no Docker Hub, e o `docker compose up` falha com *pull access denied*. A mesma imagem continua disponível no Quay. Enquanto o `docker-compose.yml` não for atualizado, baixe-a e dê a ela o nome esperado:
>
> ```bash
> docker pull quay.io/minio/minio:latest
> docker tag quay.io/minio/minio:latest minio/minio:latest
> ```

O `npm run db:seed` cria o administrador inicial com o `ADMIN_EMAIL` e o `ADMIN_PASSWORD` do `.env` (só quando ainda não existe nenhum admin).

#### Ferramentas úteis

| Comando | O que faz |
| :-- | :-- |
| `npm run db:studio` | Abre o **Prisma Studio** para ver e editar o banco — o endereço aparece no terminal (padrão do Prisma 7: <http://localhost:51212>) |
| `docker ps` | Lista os containers em execução |
| `docker exec -it mi-postgres psql -U postgres -d mi_db` | Abre o `psql` dentro do container do banco |
| `docker logs -f mi-postgres` | Acompanha os logs de um container |
| Console do MinIO | <http://localhost:9001> (`minioadmin` / `minioadmin`) |

#### Testes

```bash
cd MI-server
npm run test:unit          # sem banco

# Integração: usa o banco separado mi_db_test (as migrations são aplicadas automaticamente)
docker exec mi-postgres psql -U postgres -c "CREATE DATABASE mi_db_test"   # só na primeira vez
npm run test:integration   # requer Postgres e MinIO no ar

cd ../front
npm test
```

### Funcionalidades de IA — interruptor de dois níveis

O projeto sobe **sem IA** por padrão. Chat com PDF, resumo automático e
vetorização ficam desativados, e os serviços que existem só para servi-los —
Redis (fila) e Qdrant (busca vetorial) — não são iniciados.

| Nível | Onde | Efeito | Exige reinício? |
| --- | --- | --- | --- |
| Ambiente (mestre) | `AI_FEATURES_ENABLED` no `.env` | Determina se a instalação tem IA. Desligado, nenhuma conexão é aberta, as rotas de IA recusam com `503` e o front não renderiza nada de IA | Sim |
| Administração | Painel administrativo | Liga e desliga a disponibilidade com efeito imediato, **subordinado** ao nível mestre | Não |

A disponibilidade efetiva é a conjunção dos dois. O nível de banco nunca
sobrepõe o de ambiente: com o mestre desligado, o controle do painel aparece
bloqueado e nenhuma alteração ali produz efeito.

**Para usar a IA:**

```bash
# 1. Subir também os serviços de apoio
docker compose --profile ai up -d

# 2. No .env do MI-server
AI_FEATURES_ENABLED=true
OPENAI_API_KEY=sk-...        # obrigatória apenas quando a IA está ligada

# 3. Reiniciar a aplicação e, se houver acervo acumulado, reprocessá-lo
npm run ai:backfill
```

`OPENAI_API_KEY` só é exigida quando `AI_FEATURES_ENABLED=true` — com a IA
desligada a aplicação sobe normalmente sem ela.

O código das funcionalidades de IA permanece integralmente no repositório;
nada foi removido.

A API estará disponível em `http://localhost:3333`.

### Frontend (front)

```bash
cd front

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite VITE_API_URL com o endereço da API

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## 8. Como Executar — Produção

O deploy é realizado automaticamente via GitHub Actions (ver seção CI/CD), mas também pode ser executado manualmente.

### Pré-requisitos no servidor

- Docker e Docker Compose instalados
- PostgreSQL rodando na porta `8115` com banco `eq15`

### Arquivo de ambiente

Crie `/opt/eq15/.env` no servidor com as seguintes variáveis:

```env
DATABASE_URL=postgresql://usuario:senha@host.docker.internal:8115/eq15
JWT_SECRET=segredo_forte_aqui
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
ADMIN_EMAIL=admin@dcx.ufpb.br
ADMIN_PASSWORD=senha_segura_aqui
LOGIN_MAX_ATTEMPTS=5
LOGIN_BLOCK_DURATION_SECONDS=900
API_IMAGE=ghcr.io/SEU_ORG/projeto-eq15-api:latest
WEB_IMAGE=ghcr.io/SEU_ORG/projeto-eq15-web:latest
```

### Subir os serviços

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## 9. CI/CD

O pipeline é configurado em `.github/workflows/deploy.yml` e dispara automaticamente a cada push na branch `main`.

### Etapas

```
push → main
  ├── Job build
  │     ├── Build imagem da API  → push para GHCR
  │     └── Build imagem do Web  → push para GHCR
  └── Job deploy
        ├── Copia docker-compose.prod.yml para o servidor via SCP
        ├── SSH: cria .env, pull das imagens, docker compose up -d
        └── SSH: npx prisma migrate deploy
```

### Secrets necessários no GitHub

Cadastre em **Settings → Secrets and variables → Actions**:

| Secret            | Descrição                                                                 |
| :---------------- | :------------------------------------------------------------------------ |
| `SSH_DEPLOY_KEY`  | Chave SSH privada para acesso ao servidor                                 |
| `DEPLOY_HOST`     | IP ou hostname do servidor                                                |
| `DEPLOY_USER`     | Usuário SSH (ex: `ubuntu`)                                                |
| `DB_URL`          | URL completa do PostgreSQL: `postgresql://user:senha@host.docker.internal:8115/eq15` |
| `DB_USERNAME`     | Usuário do banco de dados                                                 |
| `DB_PASSWORD`     | Senha do banco de dados                                                   |
| `JWT_SECRET`      | Segredo forte para geração de tokens JWT                                  |
| `ADMIN_EMAIL`     | E-mail do usuário administrador inicial                                   |
| `ADMIN_PASSWORD`  | Senha do usuário administrador inicial                                    |
| `VITE_API_URL`    | URL da API acessível pelo browser (ex: `http://IP_DO_SERVIDOR:3333`)     |
