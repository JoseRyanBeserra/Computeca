// src/lib/tracing.ts
// Helper de instrumentação manual (OpenTelemetry).
//
// A auto-instrumentação enxerga bibliotecas (HTTP, pg, Redis), mas não conhece a
// regra de negócio. Estes wrappers criam spans nomeados pelas nossas operações
// (upload de MI, busca semântica, vetorização) com atributos de negócio.
//
// A API do OTel é no-op quando o SDK não está carregado: sem `npm run dev:otel`
// os wrappers apenas executam a função, sem custo e sem erro. Por isso é seguro
// usá-los em qualquer ambiente, inclusive nos testes.
import { SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api'

const tracer = trace.getTracer('mi-server')

/**
 * Executa `fn` dentro de um span. Em caso de exceção, registra o erro no span
 * (aparece em vermelho na cascata do Grafana) e repropaga.
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn(span)
    } catch (error) {
      recordError(span, error)
      throw error
    } finally {
      span.end()
    }
  })
}

/** Versão síncrona de `withSpan`, para trechos de CPU (validação, chunking). */
export function withSpanSync<T>(
  name: string,
  attributes: Attributes,
  fn: (span: Span) => T,
): T {
  return tracer.startActiveSpan(name, { attributes }, (span) => {
    try {
      return fn(span)
    } catch (error) {
      recordError(span, error)
      throw error
    } finally {
      span.end()
    }
  })
}

/**
 * Rótulos de negócio dos fluxos principais, indexados por `MÉTODO /rota`.
 *
 * O nome técnico (`POST /mis`) é preciso, mas exige conhecer a API para saber
 * o que está acontecendo. Prefixar com o nome do fluxo torna a lista de traces
 * do Grafana legível por quem não escreveu o código — que é o público de um
 * painel de observabilidade.
 */
const ROTULOS_DE_FLUXO: Record<string, string> = {
  'POST /mis':                  'Upload de MI',
  'PATCH /mis/:id/review':      'Aprovação de MI',
  'POST /mis/:id/chat':         'Busca semântica (RAG)',
  'GET /mis/:id/presigned-url': 'Download de MI',
  'GET /mis/public':            'Listagem pública de MIs',
  'GET /mis/pending':           'Listagem de MIs pendentes',
  'GET /mis/:id':               'Detalhe de MI',
  'POST /auth/login':           'Login',
  'POST /auth/refresh':         'Refresh de sessão',
  'POST /auth/logout':          'Logout',
  'POST /auth/verify-email':    'Verificação de e-mail',
  'POST /users':                'Cadastro de usuário',
  'POST /organizations':        'Criação de organização',
  'POST /organizations/:orgId/invites': 'Convite para organização',
}

/**
 * Renomeia o span HTTP raiz e anexa o atributo padrão `http.route`.
 *
 * A auto-instrumentação sozinha nomeia esses spans apenas com o verbo (`POST`,
 * `GET`), porque o `instrumentation-fastify` não consegue descobrir a rota sob
 * o loader ESM do tsx. Sem isso, a lista de traces no Grafana fica ilegível:
 * dezenas de linhas chamadas "POST", sem dizer qual fluxo é qual.
 *
 * O nome final fica `Upload de MI — POST /mis` quando o fluxo tem rótulo, e
 * `POST /rota` caso contrário. O `http.route` guarda sempre a rota crua, então
 * agrupamento de métricas e consultas TraceQL continuam usando o valor padrão.
 *
 * Chamada de um hook `onRequest`, quando o roteamento já aconteceu e o span
 * do servidor HTTP ainda é o span ativo.
 */
export function nomearSpanHttp(method: string, route?: string): void {
  if (!route) return

  const span = trace.getActiveSpan()
  if (!span) return

  const nomeTecnico = `${method} ${route}`
  const rotulo      = ROTULOS_DE_FLUXO[nomeTecnico]

  span.updateName(rotulo ? `${rotulo} — ${nomeTecnico}` : nomeTecnico)
  span.setAttribute('http.route', route)
}

/** Marca o span como erro e anexa a exceção. */
function recordError(span: Span, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error))
  span.recordException(err)
  span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
}
