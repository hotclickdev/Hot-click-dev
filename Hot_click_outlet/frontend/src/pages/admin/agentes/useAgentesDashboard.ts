import { useCallback, useEffect, useState } from 'react'
import { agentesService } from '@/services/agentesService'
import type { AgentesInspectResult, AgentesSnapshot } from '@/types/agentes'

const VACIO: AgentesSnapshot = {
  catalogo: { repo: 'hotclickdev/Hot-click-dev', generatedFrom: [], agents: [] },
  olas: { totalOlas: 7, onMaster: 0, headline: '', note: '', olas: [] },
  inspecciones: { runs: [] },
  liveInspectAvailable: false,
}

export type AgentesDashboardState = {
  data: AgentesSnapshot
  loading: boolean
  error: string | null
  recargar: () => void
  correrI1: () => Promise<AgentesInspectResult | null>
  inspeccionando: boolean
  flash: string | null
}

/** Carga el snapshot I1 para el layout /admin/agentes. */
export function useAgentesDashboard(): AgentesDashboardState {
  const [data, setData] = useState<AgentesSnapshot>(VACIO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inspeccionando, setInspeccionando] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const recargar = useCallback(() => {
    setLoading(true)
    agentesService.snapshot()
      .then(({ data: d }) => {
        setData(d)
        setError(null)
      })
      .catch(() => setError('No se pudo cargar el registro de agentes'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    recargar() // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar
  }, [recargar])

  const correrI1 = useCallback(async (): Promise<AgentesInspectResult | null> => {
    setInspeccionando(true)
    setFlash(null)
    try {
      const { data: result } = await agentesService.correrInspector()
      const s = result.run?.summary
      setFlash(s
        ? `Listo. al día ${s.al_dia} · activar ${s.activar} · actualizar ${s.actualizar} · mejorar ${s.mejorar}.`
        : 'Inspección terminada.')
      recargar()
      return result
    } catch (err) {
      const hint = extraerHint(err)
      setFlash(hint ?? 'No se pudo correr I1 en este entorno.')
      return null
    } finally {
      setInspeccionando(false)
    }
  }, [recargar])

  return { data, loading, error, recargar, correrI1, inspeccionando, flash }
}

function extraerHint(err: unknown): string | null {
  if (typeof err !== 'object' || err == null || !('response' in err)) return null
  const response = (err as { response?: { data?: unknown } }).response
  const body = response?.data
  if (typeof body !== 'object' || body == null) return null
  const rec = body as { message?: unknown; data?: { hint?: unknown } }
  const hint = rec.data?.hint
  if (typeof hint === 'string' && hint.trim()) return hint
  return typeof rec.message === 'string' ? rec.message : null
}
