import { describe, expect, it } from 'vitest'
import { normalizeProduct } from '@/services/productService'
import type { Producto, ProductoBackend } from '@/types/producto'
import { claveCategoria, claveNegocio, diversificarDescubri } from './diversificarDescubri'
import respuesta from './__fixtures__/productosApiDescubri.json'

/**
 * QA-PROD-5: fixture con la forma real de GET /api/productos (envoltorio success/data, `categoria` anidada,
 * `empresaSlug`/`empresaId` planos, el feed ordenado por negocio). Se recorta de producción del 10-oct-2026.
 */
const mazo = () => (respuesta.data.content as unknown as ProductoBackend[])
  .map((p) => normalizeProduct(p))
  .filter((p): p is Producto => !!p && !!p.imagenUrl && (p.stock ?? 0) > 0)

describe('diversificarDescubri con el feed real de /api/productos', () => {
  it('el feed viene agrupado por negocio (por eso hace falta diversificar)', () => {
    const negocios = mazo().slice(0, 6).map((p) => claveNegocio(p))
    expect(new Set(negocios).size).toBe(1)
  })

  it('el mapeo conserva negocio y categoría del payload', () => {
    const p = mazo()[0]
    expect(p.empresaSlug).toBeTruthy()
    expect(claveCategoria(p)).toMatch(/^i:\d+$/)
  })

  it('los primeros resultados son de negocios distintos y sin categoría repetida en los 3 primeros', () => {
    const lista = mazo()
    const negociosDistintos = new Set(lista.map((p) => claveNegocio(p))).size
    const primeros = diversificarDescubri(lista).slice(0, negociosDistintos)
    expect(new Set(primeros.map((p) => claveNegocio(p))).size).toBe(negociosDistintos)
    expect(new Set(primeros.slice(0, 3).map((p) => claveCategoria(p))).size).toBe(3)
  })
})
