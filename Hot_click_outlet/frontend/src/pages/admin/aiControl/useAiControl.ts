import { useState, useEffect, useCallback } from 'react'
import { securityService } from '@/services/securityService'
import { flagService } from '@/services/flagService'
import type { Id } from '@/types/api'
import type { AiDashboard, FlagAi } from './aiControlHelpers'

/**
 * Carga dashboard IA y toggles de flags — bit-idéntico al original.
 */
export function useAiControl() {
  const now = new Date()
  const [data, setData] = useState<AiDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [periodoAnio, setPeriodoAnio] = useState(now.getFullYear())
  const [periodoMes, setPeriodoMes] = useState(now.getMonth() + 1)

  const cargar = useCallback(async (anio: number, mes: number) => {
    setCargando(true); setError(null)
    try {
      const { data: d } = await securityService.getAiDashboard(anio, mes)
      setData(d as AiDashboard)
    } catch { setError('No se pudo cargar el panel de control de IA') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar(periodoAnio, periodoMes) }, [periodoAnio, periodoMes, cargar])

  const toggleFlag = useCallback(async (empresaId: Id, flag: FlagAi, activo: boolean) => {
    const key = `${empresaId}-${flag}`
    setToggling(key)
    try {
      await flagService.set(empresaId, flag, !activo)
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          empresas: (prev.empresas ?? []).map((e) => {
            if (e.id !== empresaId) return e
            if (flag === 'chat_publico') return { ...e, chatActivo: !activo }
            if (flag === 'copilot_emprendedor') return { ...e, copilotActivo: !activo }
            return e
          }),
        }
      })
    } catch { setError('Error al cambiar el flag') }
    finally { setToggling(null) }
  }, [])

  const toggleTodos = useCallback(async (flag: FlagAi, activar: boolean) => {
    if (!data?.empresas) return
    for (const e of data.empresas) {
      await flagService.set(e.id, flag, activar).catch((err: unknown) => {
        console.error('[useAiControl] toggleTodos', err)
      })
    }
    await cargar(periodoAnio, periodoMes)
  }, [data?.empresas, cargar, periodoAnio, periodoMes])

  return {
    now,
    data,
    cargando,
    toggling,
    error,
    periodoAnio,
    setPeriodoAnio,
    periodoMes,
    setPeriodoMes,
    toggleFlag,
    toggleTodos,
  }
}
