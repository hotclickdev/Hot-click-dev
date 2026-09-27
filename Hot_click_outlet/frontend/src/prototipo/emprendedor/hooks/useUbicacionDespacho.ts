import { useEffect, useState } from 'react'
import { cargarEstadoUbicacionDespacho } from '@/prototipo/compartido/bodegasVendedorApi'
import type { EstadoUbicacionDespacho } from '@/prototipo/compartido/ubicacionDespachoEstado'

/**
 * Estado de la ubicación de despacho del negocio en sesión. `estado` queda en
 * null mientras carga o si falla (el error se registra en consola).
 */
export function useUbicacionDespacho() {
  const [estado, setEstado] = useState<EstadoUbicacionDespacho | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    cargarEstadoUbicacionDespacho()
      .then((respuesta) => {
        if (vivo) setEstado(respuesta)
      })
      .catch((err: unknown) => {
        console.error('[ubicacionDespacho]', err)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return { estado, cargando }
}
