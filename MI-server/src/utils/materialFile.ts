// src/utils/materialFile.ts
//
// Verificações e nomeação do arquivo de um Material Instrucional, compartilhadas
// por TODOS os fluxos que recebem um documento: o cadastro (`POST /mis` e
// `POST /organizations/:orgId/mis`) e a edição (`PUT /mis/:id`).
//
// Até a feature 005 isto vivia privado dentro de `materialPdfUploadService.ts`.
// A edição precisa exatamente das mesmas verificações — um arquivo que o
// cadastro recusaria não pode entrar pela porta da edição —, e a única forma de
// garantir isso sem duplicar é haver uma origem só.
//
// A duplicação de regra já custou caro neste projeto: a descrição obrigatória
// valeu por meses em apenas uma das duas telas de cadastro, e todo envio por
// projeto voltava 422 sem que nenhum teste percebesse.
import { randomUUID } from 'node:crypto'
import { env } from '../env'
import { ERRORS, buildError } from '../lib/errors/errors'
import { GeneralErrorResponse } from '../errors/GeneralErrorResponse'
import { StatusCode } from './statusCode'

/** Magic bytes do PDF: %PDF (0x25 0x50 0x44 0x46) */
export const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46])

export const ALLOWED_MIME_TYPE = 'application/pdf'

export function maxFileSizeBytes(): number {
  return env.MI_MAX_FILE_SIZE_MB * 1024 * 1024
}

/**
 * Valida que o buffer é um PDF legítimo:
 *  1. Verifica o tamanho contra o limite configurado
 *  2. Verifica os magic bytes (%PDF) — defesa contra MIME spoofing
 */
export function validatePDFBuffer(buffer: Buffer): void {
  if (buffer.length > maxFileSizeBytes()) {
    throw new GeneralErrorResponse(
      StatusCode.PAYLOAD_TOO_LARGE,
      buildError(ERRORS.ERRORS_RESOURCES.FILE_TOO_LARGE),
    )
  }

  const magic = buffer.subarray(0, 4)
  if (!magic.equals(PDF_MAGIC)) {
    throw new GeneralErrorResponse(
      StatusCode.UNSUPPORTED_MEDIA_TYPE,
      buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE),
    )
  }
}

/** Recusa o material cujo tipo declarado não é o aceito. */
export function assertAllowedMimeType(mimeType: string): void {
  if (mimeType !== ALLOWED_MIME_TYPE) {
    throw new GeneralErrorResponse(
      StatusCode.UNSUPPORTED_MEDIA_TYPE,
      buildError(ERRORS.ERRORS_RESOURCES.INVALID_FILE_TYPE),
    )
  }
}

/**
 * Sanitiza o nome do usuário para compor a chave do objeto.
 * Remove acentos e substitui caracteres especiais por hífen.
 */
export function sanitizeForStorageKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Monta a chave do objeto: `{nome-sanitizado}_{userId}_{uuid}.pdf`.
 *
 * O `randomUUID()` é o que garante que **toda** chave é nova. Na edição isso
 * não é detalhe estético: gravar o arquivo novo sob chave nova é o que mantém o
 * documento anterior íntegro até o registro já apontar para o substituto. Uma
 * sobrescrita destruiria o original antes de se saber se o novo chegou inteiro.
 */
export function buildStorageKey(userName: string, userId: string): string {
  return `${sanitizeForStorageKey(userName)}_${userId}_${randomUUID()}.pdf`
}
