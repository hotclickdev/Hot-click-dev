import { useEffect, useState } from 'react'
import { productService } from '@/services/productService'
import tiendaService from '@/services/tiendaService'
import type { Producto } from '@/types/producto'
import { fuenteMasDeLaMarca, productosMasDeLaMarca, totalMasDeLaMarca, type FuenteMasDeLaMarca } from './masDeLaMarcaHelpers'

const POR_PAGINA = 8

type Estado = { clave: string; productos: Producto[]; total: number }

/**
 * Otros productos de la misma marca (o de la misma tienda si la marca no está o coincide con la tienda),
 * sin el producto actual. Si falla la API o no hay otros, devuelve lista vacía y la fila no se dibuja.
 */
export function useMasDeLaMarca(product: Producto | null): { fuente: FuenteMasDeLaMarca | null; productos: Producto[]; total: number } {
  const fuente = fuenteMasDeLaMarca(product)
  const clave = fuente && product ? `${fuente.clave}|${product.id}` : ''
  const [estado, setEstado] = useState<Estado | null>(null)

  useEffect(() => {
    if (!fuente || !product) return
    let vigente = true
    const pedir = fuente.tipo === 'marca'
      ? productService.getByMarca(fuente.marcaId, 0, POR_PAGINA).then((r) => r.data as unknown)
      : tiendaService.getProductos(fuente.slug, { size: POR_PAGINA }) as Promise<unknown>
    pedir
      .then((data) => {
        if (!vigente) return
        const productos = productosMasDeLaMarca(data, product.id)
        setEstado({ clave, productos, total: totalMasDeLaMarca(data, productos.length) })
      })
      .catch(() => { if (vigente) setEstado({ clave, productos: [], total: 0 }) })
    return () => { vigente = false }
    // `clave` resume fuente + producto; los objetos cambian de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const vigente = estado && estado.clave === clave ? estado : null
  return { fuente, productos: vigente?.productos ?? [], total: vigente?.total ?? 0 }
}
