import { useEffect, useState } from 'react'
import type { ProductoEmprendedor } from '@/prototipo/emprendedor/types'
import type { ProductoMock } from '@/prototipo/compartido/mock'
import { aProductoEmprendedor, cargarProductosVendedor } from './catalogoVendedorApi'

function aSeller(p: ProductoEmprendedor): ProductoMock {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precio: p.precio,
    precioCompra: p.precioCompra,
    stock: p.stock,
    estado: p.estado,
    reciente: p.recienAgregado,
    descripcion: p.descripcion,
    imagenUrl: p.imagenUrl,
    esPersonalizado: p.esPersonalizado === true,
    modoPrecioPersonalizado: p.modoPrecioPersonalizado ?? undefined,
    precioPersonalizadoMin: p.precioPersonalizadoMin,
    precioPersonalizadoMax: p.precioPersonalizadoMax,
    instruccionesPersonalizacion: p.instruccionesPersonalizacion,
  }
}

/**
 * Catálogo del vendedor en /admin: API real, sin mock de Zustand.
 */
export function useCatalogoVendedor() {
  const [productos, setProductos] = useState<ProductoEmprendedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    cargarProductosVendedor()
      .then((lista) => {
        if (!vivo) return
        setProductos(lista.map(aProductoEmprendedor))
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[catalogoVendedor]', err)
        if (!vivo) return
        setProductos([])
        setError('No se pudo cargar el catálogo.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return { productos, seller: productos.map(aSeller), cargando, error }
}
