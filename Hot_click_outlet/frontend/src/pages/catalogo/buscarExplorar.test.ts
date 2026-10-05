import { describe, expect, it } from 'vitest'
import type { Producto } from '@/types/producto'
import {
  busquedasRelacionadas, chipsEntendi, filtrarExtras, filtrarProductosConsulta, FILTROS_EXTRA_VACIOS, leerRangoPrecio,
  palabrasSignificativas, partirCoincidencia, recortarConsulta, sugerenciasBusqueda, tiendasDelCatalogo,
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
  it('si la frase no está en un producto, sugiere por cada palabra', () => {
    const regalos = [
      p(8, 'Regalo personalizado para mamá', { categoriaNombre: 'Regalos' }),
      p(9, 'Sérum facial de día', { categoriaNombre: 'Cuidado' }),
    ]
    expect(sugerenciasBusqueda('regalo para mi mamá', regalos)).toEqual(['regalos', 'regalo personalizado para mamá'])
    expect(sugerenciasBusqueda('sds zzqx', regalos)).toEqual([])
  })
})

describe('filtrarProductosConsulta', () => {
  it('encuentra por una palabra aunque el resto de la frase no esté en el catálogo', () => {
    expect(filtrarProductosConsulta(catalogo, 'regalo para mi mamá taza').map((producto) => producto.id)).toEqual([3])
  })
  it('sin una palabra del catálogo no devuelve productos', () => {
    expect(filtrarProductosConsulta(catalogo, 'sds')).toEqual([])
    expect(palabrasSignificativas('regalo para mi mamá')).toEqual(['regalo', 'mama'])
  })
  it('recorta controles y un texto enorme antes de navegar o guardar', () => {
    expect(recortarConsulta('  taza\u0000\n ')).toBe('taza')
    expect(recortarConsulta('a'.repeat(200))).toHaveLength(120)
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

describe('chipsEntendi: marca y stock', () => {
  it('suma un chip por marca filtrada y el de solo con stock', () => {
    const chips = chipsEntendi({
      search: '', categoriaNombre: null, priceMin: '', priceMax: '35000', extra: FILTROS_EXTRA_VACIOS,
      marcas: [{ id: '7', nombre: 'Sony' }], soloConStock: true,
    })
    expect(chips.map((c) => c.tipo)).toEqual(['precio', 'marca', 'stock'])
    expect(chips[1]).toMatchObject({ clave: 'marca-7', valor: '7', etiqueta: 'Sony' })
  })
})
