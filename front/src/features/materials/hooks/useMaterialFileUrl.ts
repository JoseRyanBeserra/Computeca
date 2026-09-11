// src/features/materials/hooks/useMaterialFileUrl.ts
// Acesso temporário ao arquivo de um material, com renovação antes de expirar.
//
// Por que a renovação existe: o acesso vale 1 hora, e quando o documento é
// exibido embutido o visualizador do navegador continua buscando trechos do
// arquivo por *range request* conforme o usuário avança nas páginas. Depois da
// expiração essas buscas passam a ser recusadas e o visualizador falha
// SILENCIOSAMENTE — não há erro a que reagir. Por isso renovamos antes.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  requestMaterialFileAccess,
  type MIStatus,
} from '../api/materialsApi'
import { useAuth } from '../../../context/AuthContext'

/** Margem de segurança: renova este tanto antes da expiração. */
export const RENEWAL_MARGIN_MS = 5 * 60 * 1000

export function useMaterialFileUrl(
  materialId: string,
  materialStatus: MIStatus,
  enabled = true,
) {
  // O perfil não é parâmetro: mantê-lo fora da assinatura evita que cada ponto
  // de uso tenha de buscá-lo e repassá-lo, o que abriria espaço para a
  // pré-visualização e a tela cheia divergirem em permissão.
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['material-file-url', materialId],
    queryFn:  () => requestMaterialFileAccess(materialId, user?.role, materialStatus),
    enabled:  enabled && !!materialId,
    // Um acesso recusado por permissão não muda ao repetir.
    retry:    false,
  })

  // Instante da expiração, derivado no momento em que a resposta chega.
  const [expiresAt, setExpiresAt] = useState<number | undefined>(undefined)
  const { data, dataUpdatedAt } = query

  useEffect(() => {
    if (!data) {
      setExpiresAt(undefined)
      return
    }
    setExpiresAt(dataUpdatedAt + data.expiresInSeconds * 1000)
  }, [data, dataUpdatedAt])

  const { refetch } = query
  const renewalPending = useRef(false)

  const renew = useCallback(() => {
    renewalPending.current = false
    void refetch()
  }, [refetch])

  // Agenda a renovação e a executa apenas com a aba visível. Com a aba oculta a
  // renovação fica pendente e acontece no retorno do usuário: renovar em segundo
  // plano gastaria requisição à toa, e trocar a URL remonta o documento — o que
  // jogaria o leitor de volta à primeira página no meio de uma leitura.
  useEffect(() => {
    if (!enabled || expiresAt === undefined) return

    const delay = Math.max(0, expiresAt - RENEWAL_MARGIN_MS - Date.now())

    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        renew()
      } else {
        renewalPending.current = true
      }
    }, delay)

    function handleVisibility() {
      if (document.visibilityState === 'visible' && renewalPending.current) {
        renew()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [enabled, expiresAt, renew])

  return {
    url:       query.data?.url,
    expiresAt,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  }
}
