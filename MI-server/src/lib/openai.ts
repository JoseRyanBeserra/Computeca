// src/lib/openai.ts
import OpenAI from 'openai'
import { env } from '../env'
import { ERRORS, buildError } from './errors/errors'
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { StatusCode } from '../utils/statusCode'

// O cliente é criado SOB DEMANDA, nunca no import do módulo.
//
// Instanciar no corpo do módulo obrigaria a chave a existir em toda instalação,
// inclusive nas que rodam sem IA — e `OPENAI_API_KEY` passou a ser exigida
// apenas quando `AI_FEATURES_ENABLED` é verdadeiro.
let _client: OpenAI | null = null

/**
 * Devolve o cliente da OpenAI, criando-o na primeira chamada.
 *
 * Lança `503 AI_DISABLED` quando as funcionalidades de IA estão desativadas ou
 * quando a chave não está configurada. Em operação normal esse caminho não é
 * alcançado: o middleware `requireAiEnabled` recusa antes de chegar ao service.
 */
export function getOpenAiClient(): OpenAI {
  if (!env.AI_FEATURES_ENABLED || !env.OPENAI_API_KEY) {
    throw new GeneralErrorResponse(
      StatusCode.SERVICE_UNAVAILABLE,
      buildError(ERRORS.AI.AI_DISABLED),
    )
  }

  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  }

  return _client
}
