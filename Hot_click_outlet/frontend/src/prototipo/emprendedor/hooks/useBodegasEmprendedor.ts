import { useEffect, useState } from 'react'
import { cargarBodegasVendedor } from '@/prototipo/compartido/bodegasVendedorApi'
import type { BodegaEmprendedor } from '../types'

/**
 * Bodegas reales del vendedor.
 */
export function useBodegasEmprendedor() {
  const [bodegas, setBodegas] = useState<BodegaEmprendedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    cargarBodegasVendedor()
      .then((lista) => {
        if (!vivo) return
        setBodegas(lista)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[bodegasVendedor]', err)
        if (!vivo) return
        setBodegas([])
        setError('No se pudieron cargar las bodegas.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return { bodegas, cargando, error }
}
