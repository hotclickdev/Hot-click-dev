import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { diasVisiblesPrimerMes } from '@/config/planesPrecios'

/**
 * Decide si se muestra «Primer mes gratis…». Visitante anónimo: la oferta genérica (`diasPrueba` del plan). Con sesión:
 * solo si `GET /tenant/info` dice `primerMesGratisDisponible === true` (el negocio aún no usó su mes gratis); mientras
 * esa info no carga, o si falla, no se muestra (nunca se promete gratis a quien no lo tendría). Reutiliza el store del
 * tenant: no hace un fetch por tarjeta (loadTenantInfo ya se protege contra llamadas simultáneas).
 */
export function useDiasPrimerMes(): (dias: number | undefined) => number {
  const logueado = useAuthStore((s) => !!s.token)
  const elegible = useTenantStore((s) => s.primerMesGratisDisponible)
  const cargada = useTenantStore((s) => s.loaded)
  useEffect(() => {
    if (logueado && !cargada) void useTenantStore.getState().loadTenantInfo()
  }, [logueado, cargada])
  return (dias) => diasVisiblesPrimerMes(dias, { logueado, elegible })
}
