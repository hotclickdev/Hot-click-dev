import { useEffect, useState } from 'react'
import { BODEGAS_DEMO } from '../data/bodegasDemo'
import { warehouseService } from '@/services/orderService'
import type { BodegaEmprendedor } from '../types'

type Resultado = { bodegas: BodegaEmprendedor[]; loading: boolean }

export function useBodegasEmprendedor(): Resultado {
  const [bodegas, setBodegas] = useState(BODEGAS_DEMO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    warehouseService
      .getAll()
      .then((respuesta) => {
        if (!vivo) return
        const lista = Array.isArray(respuesta.data) ? respuesta.data : respuesta.data?.content ?? []
        if (lista.length === 0) {
          setBodegas(BODEGAS_DEMO)
          return
        }
        setBodegas(
          lista.map((item: Record<string, unknown>, i: number) => ({
            id: String(item.id ?? i),
            nombre: String(item.nombreBodega ?? item.nombre ?? 'Bodega'),
            ubicacion: String(item.direccionExacta ?? item.provincia ?? 'Costa Rica'),
            productos: Number(item.cantidadProductos ?? 0),
            principal: i === 0,
          })),
        )
      })
      .catch((err: unknown) => {
        console.error('[prototipo emprendedor] bodegas', err)
        if (vivo) setBodegas(BODEGAS_DEMO)
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  return { bodegas, loading }
}
