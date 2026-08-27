import { useEffect, useState } from 'react'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'
import { mapearProductoApi } from '../mapearProducto'
import { productService } from '@/services/productService'
import type { ProductoEmprendedor } from '../types'

type Resultado = {
  productos: ProductoEmprendedor[]
  loading: boolean
  error: string | null
  desdeApi: boolean
  recargar: () => void
}

function extraerLista(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown[] }).content)) {
    return (data as { content: unknown[] }).content
  }
  return []
}

/**
 * Catálogo admin si hay sesión; si no, mock Figma.
 */
export function useCatalogoEmprendedor(): Resultado {
  const [productos, setProductos] = useState(PRODUCTOS_DEMO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [desdeApi, setDesdeApi] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    productService
      .adminGetAll(0, 50)
      .then((respuesta) => {
        if (!vivo) return
        const lista = extraerLista(respuesta.data).map((item, indice) =>
          mapearProductoApi(item as Record<string, unknown>, indice),
        )
        if (lista.length === 0) {
          setProductos([])
          setDesdeApi(true)
          return
        }
        setProductos(lista)
        setDesdeApi(true)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[prototipo emprendedor] productos', err)
        if (!vivo) return
        setProductos(PRODUCTOS_DEMO)
        setDesdeApi(false)
        setError(null)
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [tick])

  return { productos, loading, error, desdeApi, recargar: () => setTick((n) => n + 1) }
}
