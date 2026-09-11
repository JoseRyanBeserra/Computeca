// src/context/FeaturesContext.tsx
// Disponibilidade dos módulos, consultada uma única vez no carregamento.
//
// Concentra num lugar só a decisão de renderização. `lib/permissions.ts`
// permanece puro: ele responde sobre o PERFIL do usuário, enquanto isto responde
// sobre a EXISTÊNCIA da funcionalidade. Misturar os dois tornaria impossível
// distinguir "não pode" de "não existe".
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  getFeatureAvailabilityRequest,
  type FeatureAvailability,
} from '../features/config/api/configApi'

/**
 * Padrão seguro: enquanto a consulta não responde, e se ela falhar, a IA é
 * tratada como desativada. Esconder a mais é preferível a piscar na tela um
 * recurso que talvez não exista.
 */
const DEFAULT_AVAILABILITY: FeatureAvailability = {
  ai: { enabled: false, manageable: false },
}

export interface FeaturesContextValue extends FeatureAvailability {
  /** A consulta inicial ainda está em andamento. */
  loading: boolean
  /** Reconsulta a disponibilidade — usado após o painel alterar o estado. */
  refresh: () => Promise<void>
}

export const FeaturesContext = createContext<FeaturesContextValue>({
  ...DEFAULT_AVAILABILITY,
  loading: true,
  refresh: async () => {},
})

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureAvailability>(DEFAULT_AVAILABILITY)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setFeatures(await getFeatureAvailabilityRequest())
    } catch {
      // Falha de rede mantém o padrão seguro (tudo desativado).
      setFeatures(DEFAULT_AVAILABILITY)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getFeatureAvailabilityRequest()
      .then((data) => {
        if (!cancelled) setFeatures(data)
      })
      .catch(() => {
        if (!cancelled) setFeatures(DEFAULT_AVAILABILITY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FeaturesContext.Provider value={{ ...features, loading, refresh }}>
      {children}
    </FeaturesContext.Provider>
  )
}
