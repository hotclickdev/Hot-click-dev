import { useState, useEffect, useCallback } from 'react'
import { securityService } from '@/services/securityService'
import { flagService } from '@/services/flagService'

/**
 * Carga dashboard IA y toggles de flags — bit-idéntico al original.
 */
export function useAiControl() {
  const now = new Date()
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [error, setError] = useState(null)
  const [periodoAnio, setPeriodoAnio] = useState(now.getFullYear())
  const [periodoMes, setPeriodoMes] = useState(now.getMonth() + 1)

  const cargar = useCallback(async (anio, mes) => {
    setCargando(true); setError(null)
    try {
      const { data: d } = await securityService.getAiDashboard(anio, mes)
      setData(d)
    } catch { setError('No se pudo cargar el panel de control de IA') }
    finally { setCargando(false) }
  }, [])

  useEffect(() => { cargar(periodoAnio, periodoMes) }, [periodoAnio, periodoMes, cargar])

  const toggleFlag = useCallback(async (empresaId, flag, activo) => {
    const key = `${empresaId}-${flag}`
    setToggling(key)
    try {
      await flagService.set(empresaId, flag, !activo)
      setData((prev) => ({
        ...prev,
        empresas: prev.empresas.map((e) => {
          if (e.id !== empresaId) return e
          if (flag === 'chat_publico') return { ...e, chatActivo: !activo }
          if (flag === 'copilot_emprendedor') return { ...e, copilotActivo: !activo }
          return e
        }),
      }))
    } catch { setError('Error al cambiar el flag') }
    finally { setToggling(null) }
  }, [])

  const toggleTodos = useCallback(async (flag, activar) => {
    if (!data?.empresas) return
    for (const e of data.empresas) {
      await flagService.set(e.id, flag, activar).catch(() => {})
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
