// src/components/PdfPreview.tsx
// Pré-visualização do documento na própria tela de detalhes.
//
// O documento é exibido pelo visualizador nativo do navegador, através de um
// <object> apontando para a mesma URL pré-assinada que a abertura em tela cheia
// já usa. Nenhuma biblioteca de renderização: PDF.js buscaria o arquivo por
// fetch, e a origem do armazenamento não envia cabeçalhos CORS.
import { FileText, Loader2, AlertCircle, Lock, ExternalLink } from 'lucide-react'
import { useMaterialFileUrl } from '../features/materials/hooks/useMaterialFileUrl'
import { useIsNarrowScreen } from '../hooks/useIsNarrowScreen'
import type { MIStatus } from '../features/materials/api/materialsApi'

/** Altura do documento embutido. Também reservada durante o carregamento, para
 *  que o restante da página não salte quando o documento chega. */
const PREVIEW_HEIGHT = 'h-[32rem]'

interface PdfPreviewProps {
  materialId: string
  materialStatus: MIStatus
  onOpenFullscreen: () => void
  title?: string
}

/**
 * Falhas por permissão não melhoram ao repetir — oferecer "tentar novamente"
 * nesses casos seria enganoso.
 */
function isPermanentFailure(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 401 || status === 403 || status === 404
}

// ── Blocos de estado ──────────────────────────────────────────────────────────

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-5 space-y-3">
      <div className="flex items-center gap-2">
        <FileText size={15} className="text-teal-600 dark:text-teal-400" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Documento</h2>
      </div>
      {children}
    </div>
  )
}

function AbrirEmTelaCheia({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border border-teal-200 dark:border-teal-800
                 bg-teal-50 dark:bg-teal-950 px-4 py-2.5 text-sm font-semibold text-teal-700 dark:text-teal-300
                 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors
                 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    >
      <ExternalLink size={15} />
      {label}
    </button>
  )
}

function Aviso({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: React.ReactNode
  titulo: string
  descricao: string
  acao?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800/50 p-3.5 text-gray-600 dark:text-gray-400">
      <span className="shrink-0 mt-0.5">{icone}</span>
      <div className="space-y-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{titulo}</p>
          <p className="text-xs leading-relaxed">{descricao}</p>
        </div>
        {acao}
      </div>
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PdfPreview({
  materialId,
  materialStatus,
  onOpenFullscreen,
  title,
}: PdfPreviewProps) {
  const isNarrow = useIsNarrowScreen()

  // Em tela estreita o documento não é montado, então também não há por que
  // buscar o acesso — o arquivo não seria exibido.
  const { url, isLoading, isError, error, refetch } = useMaterialFileUrl(
    materialId,
    materialStatus,
    !isNarrow,
  )

  if (isNarrow) {
    return (
      <Moldura>
        <Aviso
          icone={<FileText size={16} />}
          titulo={title ?? 'Documento do material'}
          descricao="A leitura fica melhor em tela cheia neste tamanho de tela."
          acao={<AbrirEmTelaCheia onClick={onOpenFullscreen} label="Abrir documento" />}
        />
      </Moldura>
    )
  }

  if (isLoading) {
    return (
      <Moldura>
        <div
          className={`${PREVIEW_HEIGHT} flex items-center justify-center gap-2 rounded-xl border
                      border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50
                      text-sm text-gray-500 dark:text-gray-400`}
        >
          <Loader2 size={15} className="animate-spin text-teal-600 dark:text-teal-400" />
          Carregando documento…
        </div>
      </Moldura>
    )
  }

  if (isError || !url) {
    const permanente = isPermanentFailure(error)

    return (
      <Moldura>
        <Aviso
          icone={permanente ? <Lock size={16} /> : <AlertCircle size={16} />}
          titulo={permanente ? 'Documento indisponível' : 'Não foi possível carregar o documento'}
          descricao={
            permanente
              ? 'Este documento não está disponível para a sua conta.'
              : 'O documento não pôde ser carregado agora. Isso costuma ser temporário.'
          }
          acao={
            permanente ? undefined : (
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-xl border border-gray-300 dark:border-gray-600 px-3.5 py-2
                           text-xs font-semibold text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                           focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Tentar novamente
              </button>
            )
          }
        />
      </Moldura>
    )
  }

  return (
    <Moldura>
      <object
        data={url}
        type="application/pdf"
        aria-label={title ? `Pré-visualização de ${title}` : 'Pré-visualização do documento'}
        className={`${PREVIEW_HEIGHT} w-full rounded-xl border border-gray-200 dark:border-gray-700`}
      >
        {/* Conteúdo de fallback: renderizado pelo navegador quando ele não
            consegue exibir o PDF embutido. Declarativo, sem detecção por
            JavaScript. Não é verificável em teste — no jsdom o <object> nunca
            falha e estes filhos ficam sempre no DOM. */}
        <Aviso
          icone={<FileText size={16} />}
          titulo="Seu navegador não exibe PDF nesta página"
          descricao="Abra o documento em tela cheia para lê-lo."
          acao={<AbrirEmTelaCheia onClick={onOpenFullscreen} label="Abrir documento" />}
        />
      </object>
    </Moldura>
  )
}
