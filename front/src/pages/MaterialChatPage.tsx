// src/pages/MaterialChatPage.tsx
// Tela de conversa com IA sobre o conteúdo de um material instrucional aprovado.
import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bot, Send, User, FileText, Loader2,
  Calendar, HardDrive, Building2, ExternalLink, Sparkles,
} from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { getPublicPresignedUrlRequest, materialChatRequest } from '../features/materials/api/materialsApi'
import { getApiErrorMessage } from '../lib/apiError'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface ChatMaterial {
  id: string
  title: string
  uploadedBy?: { name: string }
  sizeBytes?: number
  createdAt?: string
  organizations?: { organization: { name: string } }[]
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: Date
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

const SUGGESTIONS = [
  'Faça um resumo deste documento',
  'Quais são os tópicos principais abordados?',
  'Explique os conceitos mais difíceis',
  'Liste as ideias centrais do material',
]

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                      bg-indigo-100 dark:bg-indigo-900">
        <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-white dark:bg-gray-800 border
                      border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <span className="flex gap-1 items-center h-5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full
        ${isUser
          ? 'bg-indigo-600 dark:bg-indigo-500'
          : 'bg-indigo-100 dark:bg-indigo-900'}`}
      >
        {isUser
          ? <User size={16} className="text-white" />
          : <Bot  size={16} className="text-indigo-600 dark:text-indigo-400" />}
      </div>

      {/* Balão */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm
        ${isUser
          ? 'rounded-br-sm bg-indigo-600 dark:bg-indigo-500 text-white'
          : 'rounded-bl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}
      >
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── MaterialChatPage ───────────────────────────────────────────────────────────

export function MaterialChatPage() {
  const { materialId } = useParams<{ materialId: string }>()
  const location       = useLocation()
  const navigate       = useNavigate()

  const material = location.state?.material as ChatMaterial | undefined

  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [thinking,  setThinking]  = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [opening,   setOpening]   = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function handleOpenPdf() {
    if (!materialId) return
    setOpening(true)
    setOpenError(null)
    try {
      const { url } = await getPublicPresignedUrlRequest(materialId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setOpenError(getApiErrorMessage(err))
    } finally {
      setOpening(false)
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: trimmed,
      ts:      new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const { answer } = await materialChatRequest(materialId!, trimmed)
      const aiMsg: Message = {
        id:      crypto.randomUUID(),
        role:    'assistant',
        content: answer,
        ts:      new Date(),
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errorMsg: Message = {
        id:      crypto.randomUUID(),
        role:    'assistant',
        content: `Erro ao consultar a IA: ${getApiErrorMessage(err)}`,
        ts:      new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setThinking(false)
      inputRef.current?.focus()
    }
  }, [thinking])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const orgName = material?.organizations?.[0]?.organization.name

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl h-[calc(100vh-8rem)] flex flex-col gap-4">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600
                       dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Sparkles size={15} className="text-indigo-500" />
            <span>Conversa com IA</span>
          </div>
        </div>

        {/* Área principal */}
        <div className="flex flex-1 gap-5 min-h-0">

          {/* ── Painel esquerdo: info do material ── */}
          <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800
                            bg-white dark:bg-gray-900 overflow-hidden shadow-sm">

              {/* Miniatura */}
              <div
                className="aspect-[4/3] w-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #16bcc6 100%)' }}
              >
                <FileText size={48} className="text-white/80" />
              </div>

              <div className="p-4 space-y-4">
                {/* Título */}
                <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-3">
                  {material?.title ?? 'Material instrucional'}
                </p>

                {/* Metadados */}
                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                  {material?.uploadedBy?.name && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="shrink-0 text-indigo-500" />
                      <span className="truncate">{material.uploadedBy.name}</span>
                    </div>
                  )}
                  {orgName && (
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="shrink-0 text-indigo-500" />
                      <span className="truncate">{orgName}</span>
                    </div>
                  )}
                  {material?.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="shrink-0" />
                      <span>{formatDate(material.createdAt)}</span>
                    </div>
                  )}
                  {material?.sizeBytes != null && (
                    <div className="flex items-center gap-1.5">
                      <HardDrive size={12} className="shrink-0" />
                      <span>{formatBytes(material.sizeBytes)}</span>
                    </div>
                  )}
                </div>

                {/* Botão abrir PDF */}
                <button
                  onClick={handleOpenPdf}
                  disabled={opening}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border
                             border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950
                             text-indigo-700 dark:text-indigo-300 text-sm font-medium py-2.5
                             hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors
                             disabled:opacity-60"
                >
                  {opening
                    ? <Loader2 size={14} className="animate-spin" />
                    : <ExternalLink size={14} />}
                  {opening ? 'Abrindo…' : 'Abrir PDF'}
                </button>

                {openError && (
                  <p className="text-xs text-red-500 dark:text-red-400 text-center">{openError}</p>
                )}
              </div>
            </div>

            {/* Dica de uso */}
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900
                            bg-indigo-50 dark:bg-indigo-950 p-4 text-xs text-indigo-700 dark:text-indigo-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Bot size={13} /> Como funciona?
              </p>
              <p className="text-indigo-600 dark:text-indigo-400 leading-relaxed">
                A IA leu o conteúdo deste documento e pode responder perguntas, resumir
                seções e explicar conceitos com base no texto original.
              </p>
            </div>
          </aside>

          {/* ── Painel direito: chat ── */}
          <div className="flex flex-1 flex-col min-h-0 rounded-xl border border-gray-200
                          dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shadow-sm overflow-hidden">

            {/* Cabeçalho do chat */}
            <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800
                            bg-white dark:bg-gray-900 px-5 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <Bot size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistente de IA</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Baseado em: <span className="font-medium">{material?.title ?? 'documento'}</span>
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </span>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
              {messages.length === 0 && !thinking && (
                <div className="flex flex-col items-center gap-6 py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl
                                  bg-indigo-100 dark:bg-indigo-900">
                    <Sparkles size={28} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      Olá! Estou pronto para conversar sobre este material.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                      Faça uma pergunta sobre o conteúdo do documento ou escolha uma sugestão abaixo.
                    </p>
                  </div>

                  {/* Sugestões */}
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="rounded-full border border-indigo-200 dark:border-indigo-800
                                   bg-white dark:bg-gray-900 px-4 py-2 text-sm text-indigo-700
                                   dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950
                                   transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {thinking && <ThinkingBubble />}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
              <div className="flex items-end gap-2 rounded-xl border border-gray-200 dark:border-gray-700
                              bg-gray-50 dark:bg-gray-800 px-4 py-2.5 focus-within:border-indigo-400
                              dark:focus-within:border-indigo-600 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Faça uma pergunta sobre o material… (Enter para enviar)"
                  rows={1}
                  disabled={thinking}
                  className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none
                             max-h-32 disabled:opacity-50"
                  style={{ lineHeight: '1.5rem' }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || thinking}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                             bg-indigo-600 text-white hover:bg-indigo-700 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Enviar"
                >
                  {thinking
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Send size={15} />}
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-gray-400 dark:text-gray-600">
                Enter para enviar · Shift+Enter para nova linha
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
