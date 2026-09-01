import { useCallback, useEffect, useMemo, useState } from 'react'
import useAuthStore from '@/store/authStore'
import { getGustosAffinity } from '@/services/customerMemoryService'
import {
  gustosPerfilFromAffinity,
  hasAffinityContent,
  loadGustos,
  type GustosPerfil,
} from '@/utils/gustos'
import { getOrCreateVisitorId } from '@/utils/visitorId'

type GustosSource = 'local' | 'backend'

/**
 * Perfil de gustos unificado: localStorage (anónimo) o customer_memory (logueado, read-only).
 */
export function useGustosPerfil(enabled = true) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const visitorId = useMemo(() => getOrCreateVisitorId(), [])
  const [perfil, setPerfil] = useState<GustosPerfil>(() => loadGustos())
  const [source, setSource] = useState<GustosSource>('local')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    if (!isAuthenticated) {
      setPerfil(loadGustos())
      setSource('local')
      return
    }

    let cancelled = false
    setLoading(true)

    getGustosAffinity(visitorId)
      .then((data) => {
        if (cancelled) return
        if (hasAffinityContent(data)) {
          setPerfil(gustosPerfilFromAffinity(data))
          setSource('backend')
        } else {
          setPerfil(loadGustos())
          setSource('local')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPerfil(loadGustos())
          setSource('local')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [enabled, isAuthenticated, visitorId])

  /** Recarga desde localStorage (p. ej. tras guardar chips). Ignorado si el perfil viene del backend. */
  const refreshLocal = useCallback(() => {
    if (source === 'backend' && isAuthenticated) return
    setPerfil(loadGustos())
    setSource('local')
  }, [source, isAuthenticated])

  return { perfil, source, loading, refreshLocal }
}
