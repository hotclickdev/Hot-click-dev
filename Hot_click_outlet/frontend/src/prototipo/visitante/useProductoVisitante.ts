import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import type { Producto } from '@/types/producto'
import { productoApiAVisitante } from './useCatalogoVisitante'
import type { ProductoVisitante } from './visitanteMock'

/**
 * Ficha Visitante desde la API. Sin fallback a mocks de diseño.
 */
export function useProductoVisitante(id: string | undefined) {
  const [crudo, setCrudo] = useState<Producto | null>(null)
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    if (!id) {
      setError(true)
      setCrudo(null)
      setCargando(false)
      return
    }
    setCargando(true)
    productService.getById(id)
      .then((res) => {
        if (!vivo) return
        const producto = res.data ?? null
        if (!producto) {
          setError(true)
          setCrudo(null)
          return
        }
        setError(false)
        setCrudo(producto)
      })
      .catch((err: unknown) => {
        console.error('[productoVisitante]', err)
        if (!vivo) return
        setError(true)
        setCrudo(null)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [id])

  const vista: ProductoVisitante | null = crudo ? productoApiAVisitante(crudo) : null
  return { vista, crudo, cargando, error }
}
