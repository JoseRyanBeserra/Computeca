// src/@types/resources/materials/pdf/index.ts
import type { MIStatus, VectorStatus } from '@prisma/client'

/** Payload interno passado do controller para o service */
export interface UploadMIInput {
  title: string
  buffer: Buffer
  originalFileName: string
  mimeType: string
  /** Habilidades BNCC — opcional; quando ausente assume-se lista vazia */
  habilidadesBncc?: string[]
  uploadedById: string
  organizationIds?: string[]
}

/** URL pré-assinada para visualização temporária */
export interface IMaterialPresignedUrl {
  url: string
  expiresInSeconds: number
}

/** Material pendente — inclui dados do autor para exibição no painel do professor */
export interface IPendingMaterial {
  id: string
  title: string
  originalFileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  status: MIStatus
  vectorStatus: VectorStatus
  habilidadesBncc: string[]
  uploadedById: string
  uploadedBy: { name: string; email: string }
  organizations: { organization: { id: string; name: string } }[]
  createdAt: Date
  updatedAt: Date
}

/** Uso de tokens OpenAI registrado por operação para observabilidade de custos */
export interface ITokenUsage {
  embeddingTokens:  number  // tokens gastos no embedding da pergunta
  promptTokens:     number  // tokens do prompt enviado ao modelo de chat
  completionTokens: number  // tokens gerados pelo modelo
  totalTokens:      number  // soma prompt + completion
}

/** Resposta do endpoint de chat RAG com IA */
export interface IMaterialChatResponse {
  answer:     string
  chunksUsed: number
  tokenUsage: ITokenUsage
}

/**
 * Resposta do endpoint de resumo por IA.
 *
 * `status` reflete o estado do cache do resumo no material:
 * - `DONE`       → `summary` preenchido (cache pronto para leitura)
 * - `PROCESSING` → outra requisição está gerando; `summary` vem `null` e o
 *                  cliente deve tentar novamente em instantes
 */
export interface IMaterialSummaryResponse {
  status:      'DONE' | 'PROCESSING'
  summary:     string | null
  generatedAt: Date | null
}

/** Material Instrucional — nunca expõe campos internos desnecessários */
export interface IUploadedMI {
  id: string
  title: string
  originalFileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  status: MIStatus
  habilidadesBncc: string[]
  uploadedById: string
  createdAt: Date
  updatedAt: Date
}
