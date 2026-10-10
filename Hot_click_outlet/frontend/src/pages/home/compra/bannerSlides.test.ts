import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import type { NegocioPublico } from '@/services/negocioService'
import { SLIDES_POR_TIPO, slidesNegocios, slidesProductos } from './bannerSlides'

const neg = (slug: string, logoUrl = ''): NegocioPublico =>
  ({ slug, nombre: `Negocio ${slug}`, logoUrl, categoria: 'Café', plan: 'EMPRENDEDOR', productos: 1 } as NegocioPublico)
const prod = (id: number, empresaSlug: string, imagenUrl: string | null = `/img/${id}.jpg`) =>
  ({ id, nombre: `Producto ${id}`, empresaSlug, empresaNombre: `Negocio ${empresaSlug}`, imagenUrl, categoriaNombre: 'Hogar' } as unknown as Producto)

describe('slidesNegocios', () => {
  it('arma un slide por negocio con su nombre, su foto y el clic solo a /tienda/<slug>', () => {
    const s = slidesNegocios('Emprendimientos destacados', 'Ver tienda', [neg('bruma-cafe'), neg('luna', '/logo.png')], [prod(1, 'bruma-cafe')])
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ titulo: 'Negocio bruma-cafe', to: '/tienda/bruma-cafe', foto: '/img/1.jpg' })
    expect(s[1]).toMatchObject({ to: '/tienda/luna', foto: '/logo.png' })
  })

  it('omite negocios sin slug, no repite y respeta el tope por tipo', () => {
    const lista = [neg(''), neg('a'), neg('a'), ...Array.from({ length: 8 }, (_, i) => neg(`n${i}`))]
    const s = slidesNegocios('X', 'Ver tienda', lista, [])
    expect(s).toHaveLength(SLIDES_POR_TIPO)
    expect(new Set(s.map((x) => x.to)).size).toBe(s.length)
    expect(s[0].foto).toBeNull()
  })
})

describe('slidesProductos', () => {
  it('arma un slide por producto con foto y el clic solo a su ficha', () => {
    const s = slidesProductos('Productos destacados', 'Ver producto', [prod(7, 'a'), prod(8, 'b', null), prod(7, 'a')])
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ titulo: 'Producto 7', to: '/productos/7', foto: '/img/7.jpg', detalle: 'Negocio a · Hogar' })
  })
})
