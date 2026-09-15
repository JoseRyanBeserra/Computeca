// src/@types/resources/materials/pdf/index.ts
import type { MIStatus, VectorStatus } from '@prisma/client'

/** Link relacionado ao material: exibido pelo rótulo, aberto pelo endereço. */
export interface IMaterialLink {
  label: string
  url: string
}

/** Payload interno passado do controller para o service */
export interface UploadMIInput {
  title: string
  /** Descrição do material — obrigatória no cadastro, 50 a 2000 caracteres */
  description: string
  buffer: Buffer
  originalFileName: string
  mimeType: string
  /** Habilidades BNCC — opcional; quando ausente assume-se lista vazia */
  habilidadesBncc?: string[]
  /** Links relacionados — opcionais; quando ausentes assume-se lista vazia */
  relatedLinks?: IMaterialLink[]
  uploadedById: string
  organizationIds?: string[]
}

/**
 * Payload interno da edição de material, passado do controller para o service.
 *
 * `buffer` opcional é o que expressa "não trocar o documento": ausente significa
 * manter o arquivo atual. Os três campos de arquivo andam juntos — ou vêm todos,
 * ou nenhum vem.
 */
export interface EditMIInput {
  materialId: string
  title: string
  description: string
  habilidadesBncc?: string[]
  /** Conjunto completo dos links: ausente equivale a lista vazia, como as habilidades */
  relatedLinks?: IMaterialLink[]
  /** Ausente = manter o documento atual */
  buffer?: Buffer
  originalFileName?: string
  mimeType?: string
  editedById: string
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
  /** `null` quando o material foi cadastrado antes da exigência de descrição */
  description?: string | null
  originalFileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  status: MIStatus
  vectorStatus?: VectorStatus // omitido nas respostas quando a IA esta desativada (FR-017)
  habilidadesBncc: string[]
  /** Sempre presente: material sem links devolve `[]`, nunca `null` */
  relatedLinks: IMaterialLink[]
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
  /** `null` quando o material foi cadastrado antes da exigência de descrição */
  description?: string | null
  originalFileName: string
  storageKey: string
  mimeType: string
  sizeBytes: number
  status: MIStatus
  habilidadesBncc: string[]
  /**
   * Presente — e nunca `null` — onde o material é criado, lido ou editado.
   * Opcional porque, como `description`, as respostas de revisão e das listagens
   * resumidas não o selecionam.
   */
  relatedLinks?: IMaterialLink[]
  uploadedById: string
  createdAt: Date
  updatedAt: Date
}
