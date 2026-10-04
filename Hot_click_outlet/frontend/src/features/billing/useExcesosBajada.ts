import { useEffect, useMemo, useState } from 'react'
import useTenantStore from '@/store/tenantStore'
import { esBajada, excesosAlBajar, type ExcesoPlan, type LimitesPlan } from './bajarPlanHelpers'
import { usoDelTenant } from './usoDelTenant'

type Entrada = {
  /** Plan elegido con sus límites; `null` mientras no se eligió ninguno. */
  destino: ({ nombre: string } & LimitesPlan) | null
  /** `true` mientras se muestra el paso de confirmar. */
  activo: boolean
  /** Cambia cada vez que se entra al paso de confirmar, para volver a pedir el uso. */
  visita: number
}

export type EstadoBajada = {
  esBajada: boolean
  cargandoUso: boolean
  excesos: ExcesoPlan[]
}

/**
 * Al entrar al paso de confirmar una bajada pide el uso real y calcula qué recursos
 * superan los límites del plan destino, para bloquear el cambio antes de tocar Confirmar.
 */
export function useExcesosBajada({ destino, activo, visita }: Entrada): EstadoBajada {
  const planActual = useTenantStore((s) => s.planNombre)
  const loadTenantUso = useTenantStore((s) => s.loadTenantUso)
  const usoProductos = useTenantStore((s) => s.usoProductos)
  const usoBodegas = useTenantStore((s) => s.usoBodegas)
  const usoCajas = useTenantStore((s) => s.usoCajas)
  const usoUsuarios = useTenantStore((s) => s.usoUsuarios)
  const [visitaCargada, setVisitaCargada] = useState<string | null>(null)

  const bajada = destino != null && esBajada(planActual, destino.nombre)
  const clave = `${destino?.nombre ?? ''}:${visita}`

  useEffect(() => {
    if (!activo || !bajada) return
    let vigente = true
    void loadTenantUso().then(() => {
      if (vigente) setVisitaCargada(clave)
    })
    return () => { vigente = false }
  }, [activo, bajada, clave, loadTenantUso])

  const cargandoUso = activo && bajada && visitaCargada !== clave

  const excesos = useMemo(() => {
    if (!destino || !bajada || cargandoUso) return []
    return excesosAlBajar(destino, usoDelTenant({ usoProductos, usoBodegas, usoCajas, usoUsuarios }))
  }, [destino, bajada, cargandoUso, usoProductos, usoBodegas, usoCajas, usoUsuarios])

  return { esBajada: bajada, cargandoUso, excesos }
}
