import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import type { NegocioDestacado } from '@/services/negocioService'
import {
  MAX_POR_BLOQUE, anterior, armarBloques, detalleNegocio, direccionSwipe, iniciales, siguiente,
} from './bannerSlides'

const neg = (slug: string, extra: Partial<NegocioDestacado> = {}): NegocioDestacado =>
  ({ slug, nombre: `Negocio ${slug}`, categoria: 'Café', provincia: 'Cartago', logoUrl: '', fotoPortada: '', ...extra })
const prod = (id: number, empresaSlug: string, imagenUrl: string | null = `/img/${id}.jpg`) =>
  ({ id, nombre: `Producto ${id}`, empresaSlug, empresaNombre: `Negocio ${empresaSlug}`, imagenUrl, precio: 12900 } as unknown as Producto)
const catalogo = Array.from({ length: 10 }, (_, i) => prod(100 + i, `c${i}`))

describe('armarBloques', () => {
  it('con datos completos arma exactamente 3 bloques (3 puntos) sin importar cuántos elementos tenga cada uno', () => {
    const b = armarBloques([prod(1, 'x'), prod(2, 'y')], [neg('a'), neg('b'), neg('c')], catalogo)
    expect(b.map((x) => x.tipo)).toEqual(['descubri', 'negocio', 'producto'])
    expect(b[0].elementos).toHaveLength(1)
  })

  it('D3: con 5 productos destacados muestra 5; con 7 muestra 5', () => {
    const cinco = armarBloques(Array.from({ length: 5 }, (_, i) => prod(i + 1, `p${i}`)), [], catalogo)
    expect(cinco.find((x) => x.tipo === 'producto')?.elementos).toHaveLength(5)
    const siete = armarBloques(Array.from({ length: 7 }, (_, i) => prod(i + 1, `p${i}`)), Array.from({ length: 7 }, (_, i) => neg(`n${i}`)), catalogo)
    expect(siete.find((x) => x.tipo === 'producto')?.elementos).toHaveLength(MAX_POR_BLOQUE)
    expect(siete.find((x) => x.tipo === 'negocio')?.elementos).toHaveLength(MAX_POR_BLOQUE)
  })

  it('nada se repite en el ciclo: un negocio en las dos listas y un producto en destacados y catálogo', () => {
    const dup = prod(100, 'c0')
    const b = armarBloques([dup, dup, prod(2, 'z')], [neg('z'), neg('z'), neg('w')], catalogo)
    const destinos = b.flatMap((x) => x.elementos.map((e) => e.to))
    expect(new Set(destinos).size).toBe(destinos.length)
    const fotosDescubri = b[0].fotos ?? []
    expect(fotosDescubri).not.toContain('/img/100.jpg')
    expect(fotosDescubri).toHaveLength(2)
  })

  it('D2: un negocio del bloque 2 no aparece como dueño de un producto del bloque 3', () => {
    const b = armarBloques([prod(1, 'a'), prod(2, 'b')], [neg('a')], catalogo)
    expect(b[2].elementos.map((e) => e.to)).toEqual(['/productos/2'])
  })

  it('D2: si excluir deja vacío el bloque 3 se relaja la regla (excepción documentada)', () => {
    const b = armarBloques([prod(1, 'a')], [neg('a')], catalogo)
    expect(b.map((x) => x.tipo)).toEqual(['descubri', 'negocio', 'producto'])
    expect(b[2].elementos[0].to).toBe('/productos/1')
  })

  it('sin foto: producto y negocio quedan con foto null (placeholder), nunca se descartan', () => {
    const b = armarBloques([prod(1, 'x', null)], [neg('a')], catalogo)
    expect(b[1].elementos[0].foto).toBeNull()
    expect(b[2].elementos[0].foto).toBeNull()
  })

  it('negocio: logo primero y después la foto de portada', () => {
    const b = armarBloques([], [neg('a', { logoUrl: '/logo.png', fotoPortada: '/p.jpg' }), neg('b', { fotoPortada: '/p2.jpg' })], catalogo)
    expect(b[1].elementos.map((e) => e.foto)).toEqual(['/logo.png', '/p2.jpg'])
  })

  it('0 destacados: solo Descubrí; 0 catálogo: sin carrusel; 1 bloque vacío: 2 bloques', () => {
    expect(armarBloques([], [], catalogo).map((x) => x.tipo)).toEqual(['descubri'])
    expect(armarBloques([], [], [])).toEqual([])
    expect(armarBloques([prod(1, 'x')], [], catalogo).map((x) => x.tipo)).toEqual(['descubri', 'producto'])
    expect(armarBloques([], [neg('a')], catalogo).map((x) => x.tipo)).toEqual(['descubri', 'negocio'])
  })

  it('solo enlaza a /descubri, /tienda/<slug> o /productos/<id>', () => {
    const b = armarBloques([prod(1, 'x')], [neg('a b')], catalogo)
    for (const e of b.flatMap((x) => x.elementos)) expect(e.to).toMatch(/^\/(descubri|tienda\/[^/]+|productos\/\d+)$/)
  })

  it('detalle del producto: negocio · precio real', () => {
    const b = armarBloques([prod(1, 'x')], [], catalogo)
    expect(b[1].elementos[0].detalle).toMatch(/^Negocio x · ₡\s?12[.\s ]?900$/)
  })
})

describe('detalleNegocio', () => {
  it('categoría · provincia, solo uno si falta el otro y vacío si faltan los dos', () => {
    expect(detalleNegocio({ categoria: 'Café', provincia: 'Cartago' })).toBe('Café · Cartago')
    expect(detalleNegocio({ categoria: '', provincia: 'Cartago' })).toBe('Cartago')
    expect(detalleNegocio({ categoria: ' ', provincia: '' })).toBe('')
  })
})

describe('navegación', () => {
  const b = armarBloques([prod(1, 'x'), prod(2, 'y')], [neg('a'), neg('b'), neg('c')], catalogo)
  it('elementos del bloque → siguiente bloque → del último vuelve al primero', () => {
    const recorrido = [{ bloque: 0, elemento: 0 }]
    for (let i = 0; i < 6; i++) recorrido.push(siguiente(b, recorrido[recorrido.length - 1]))
    expect(recorrido).toEqual([
      { bloque: 0, elemento: 0 }, { bloque: 1, elemento: 0 }, { bloque: 1, elemento: 1 }, { bloque: 1, elemento: 2 },
      { bloque: 2, elemento: 0 }, { bloque: 2, elemento: 1 }, { bloque: 0, elemento: 0 },
    ])
    expect(anterior(b, { bloque: 0, elemento: 0 })).toEqual({ bloque: 2, elemento: 1 })
    expect(anterior(b, { bloque: 1, elemento: 0 })).toEqual({ bloque: 0, elemento: 0 })
  })

  it('swipe: umbral de 40 px y más horizontal que vertical', () => {
    expect(direccionSwipe(-41, 5)).toBe(1)
    expect(direccionSwipe(45, 10)).toBe(-1)
    expect(direccionSwipe(-39, 0)).toBe(0)
    expect(direccionSwipe(-60, 80)).toBe(0)
  })
})

describe('iniciales', () => {
  it('1 o 2 iniciales en mayúscula', () => {
    expect(iniciales('Jabonería Monteverde')).toBe('JM')
    expect(iniciales('jabón de avena')).toBe('JD')
    expect(iniciales('Bruma')).toBe('B')
    expect(iniciales('  ')).toBe('H')
  })
})
