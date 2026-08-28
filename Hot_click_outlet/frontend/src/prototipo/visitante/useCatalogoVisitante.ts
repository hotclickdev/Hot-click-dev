import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productService, normalizeProduct } from '@/services/productService'
import type { Producto } from '@/types/producto'
import { type CategoriaShop, type ProductoVisitante } from './visitanteMock'

function listaDesdeRespuesta(data: Producto[] | { content: Producto[] }): Producto[] {
  return Array.isArray(data) ? data : data.content
}

/**
 * Lista cruda del catálogo público. Vacío o error se muestran tal cual (sin mocks).
 */
export function useProductosVisitanteApi() {
  const [remotos, setRemotos] = useState<ProductoVisitante[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    productService.getAll(0, 60)
      .then((res) => {
        if (!vivo) return
        const crudos = listaDesdeRespuesta(res.data as Producto[] | { content: Producto[] })
        const lista = crudos
          .map((p) => normalizeProduct(p))
          .filter((p): p is Producto => Boolean(p))
          .map(productoApiAVisitante)
        setError(false)
        setRemotos(lista)
      })
      .catch((err: unknown) => {
        console.error('[catalogoVisitante]', err)
        if (!vivo) return
        setError(true)
        setRemotos([])
      })
    return () => { vivo = false }
  }, [])

  return {
    productos: remotos ?? [],
    cargando: remotos === null,
    error,
  }
}

/**
 * Catálogo Visitante filtrado por chip y búsqueda.
 */
export function useCatalogoVisitante(categoria: CategoriaShop, consulta: string) {
  const { productos: remotos, cargando, error } = useProductosVisitanteApi()
  const [params] = useSearchParams()
  const forzarVacio = params.get('sin') === '1'

  const productos = useMemo(() => {
    if (forzarVacio) return []
    return filtrarSobre(remotos, categoria, consulta)
  }, [remotos, categoria, consulta, forzarVacio])

  return { productos, cargando, error }
}

export function productoApiAVisitante(p: Producto): ProductoVisitante {
  return {
    id: String(p.id ?? ''),
    nombre: p.nombre ?? 'Producto',
    negocio: p.empresaNombre ?? p.empresaSlug ?? 'HotClick',
    negocioId: idNegocio(p),
    precio: Number(p.precio ?? 0),
    categoria: mapCategoria(p.categoriaNombre),
    agotado: Number(p.stock ?? 0) <= 0,
    descripcion: p.descripcion ?? '',
    imagenUrl: p.imagenUrl || undefined,
  }
}

function idNegocio(p: Producto): string {
  if (p.empresaSlug) return p.empresaSlug
  if (p.empresaId != null) return String(p.empresaId)
  return String(p.id ?? 'hotclick')
}

function mapCategoria(nombre: string | undefined): Exclude<CategoriaShop, 'Todos'> {
  const n = (nombre ?? '').toLowerCase()
  if (n.includes('ropa') || n.includes('moda')) return 'Ropa'
  if (n.includes('hogar') || n.includes('casa')) return 'Hogar'
  return 'Tecnología'
}

function filtrarSobre(
  lista: ProductoVisitante[],
  categoria: CategoriaShop,
  consulta: string,
): ProductoVisitante[] {
  const q = consulta.trim().toLowerCase()
  return lista.filter((item) => {
    if (categoria !== 'Todos' && item.categoria !== categoria) return false
    if (!q) return true
    return `${item.nombre} ${item.negocio}`.toLowerCase().includes(q)
  })
}
