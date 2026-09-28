import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import {
  busquedasRelacionadas, chipsEntendi, filtrarExtras, FILTROS_EXTRA_VACIOS, leerRangoPrecio,
  partirCoincidencia, sugerenciasBusqueda, tiendasDelCatalogo,
} from './buscarExplorar'

const p = (id: number, nombre: string, extra: Partial<Producto> = {}): Producto =>
  ({ id, nombre, precio: 1000, stock: 5, categoriaNombre: 'Hogar', empresaNombre: 'Casa Luna 506', ...extra }) as Producto

const catalogo = [
  p(1, 'Sofá de sala dos plazas'),
  p(2, 'Sillón de sala verde', { empresaNombre: 'Bruma Café', bodegaPermiteRetiro: true }),
  p(3, 'Taza personalizada con nombre', { esPersonalizado: true }),
  p(4, 'Auriculares over-ear', { categoriaNombre: 'Tecnología', empresaNombre: 'Taller Ceiba' }),
]

describe('filtrarExtras', () => {
  it('sin filtros devuelve la misma lista', () => {
    expect(filtrarExtras(catalogo, FILTROS_EXTRA_VACIOS)).toBe(catalogo)
  })
  it('filtra por tienda, hecho a pedido y retiro', () => {
    expect(filtrarExtras(catalogo, { ...FILTROS_EXTRA_VACIOS, tiendas: new Set(['Bruma Café']) }).map((x) => x.id)).toEqual([2])
    expect(filtrarExtras(catalogo, { ...FILTROS_EXTRA_VACIOS, hechoAPedido: true }).map((x) => x.id)).toEqual([3])
    expect(filtrarExtras(catalogo, { ...FILTROS_EXTRA_VACIOS, retiroEnTienda: true }).map((x) => x.id)).toEqual([2])
  })
})

describe('tiendasDelCatalogo', () => {
  it('cuenta productos por tienda de mayor a menor', () => {
    expect(tiendasDelCatalogo(catalogo)).toEqual([
      { nombre: 'Casa Luna 506', cantidad: 2 },
      { nombre: 'Bruma Café', cantidad: 1 },
      { nombre: 'Taller Ceiba', cantidad: 1 },
    ])
  })
})

describe('chipsEntendi', () => {
  it('arma un chip por cada cosa interpretada', () => {
    const chips = chipsEntendi({
      search: ' sala ', categoriaNombre: 'Hogar', priceMin: '', priceMax: '35000',
      extra: { tiendas: new Set(['Bruma Café']), hechoAPedido: true, retiroEnTienda: false },
    })
    expect(chips.map((c) => c.tipo)).toEqual(['busqueda', 'categoria', 'precio', 'tienda', 'pedido'])
    expect(chips[0].valor).toBe('sala')
    expect(leerRangoPrecio(chips[2].valor)).toEqual({ desde: null, hasta: 35000 })
  })
  it('sin filtros no hay chips', () => {
    expect(chipsEntendi({ search: '', categoriaNombre: null, priceMin: '', priceMax: '', extra: FILTROS_EXTRA_VACIOS })).toEqual([])
  })
})

describe('sugerenciasBusqueda', () => {
  it('sugiere categorías y nombres que contienen la consulta, sin acentos', () => {
    expect(sugerenciasBusqueda('sala', catalogo)).toEqual(['sofá de sala dos', 'sillón de sala verde'])
    expect(sugerenciasBusqueda('tecno', catalogo)).toEqual(['tecnología'])
  })
  it('no sugiere con menos de 2 letras', () => {
    expect(sugerenciasBusqueda('s', catalogo)).toEqual([])
  })
})

describe('partirCoincidencia', () => {
  it('resalta aunque la consulta no tenga acento', () => {
    expect(partirCoincidencia('Sillón verde', 'sillon')).toEqual({ antes: '', coincidencia: 'Sillón', despues: ' verde' })
    expect(partirCoincidencia('Sofá', 'mesa')).toEqual({ antes: 'Sofá', coincidencia: '', despues: '' })
  })
})

describe('busquedasRelacionadas', () => {
  it('propone categorías y palabras de lo encontrado sin repetir la consulta', () => {
    expect(busquedasRelacionadas('sala', catalogo.slice(0, 2))).toEqual(['hogar', 'sofá', 'plazas', 'sillón'])
  })
})
