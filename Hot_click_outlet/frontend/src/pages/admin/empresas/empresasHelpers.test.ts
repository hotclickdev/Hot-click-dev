import { describe, expect, it } from 'vitest'
import {
  EMPRESA_PLATAFORMA_ID,
  ESTADOS,
  empresasOperables,
  empresaIdDesdeParam,
  esEmpresaInternaPlataforma,
  esProductoVisibleEnCatalogo,
  etiquetaPublicacionProducto,
  filtrarEmpresas,
  filtrarProductosTab,
  kpisEmpresas,
  rutaCargaMasivaEmpresa,
  rutaEnlacePdfEmpresa,
  rutaEspacioEmpresa,
  rutaImportarEmpresa,
  type EmpresaLista,
  type EmpresaProductoTab,
} from './empresasHelpers'

function emp(partial: Partial<EmpresaLista> & Pick<EmpresaLista, 'id'>): EmpresaLista {
  return {
    nombreEmpresa: 'Tienda',
    slug: `slug-${partial.id}`,
    estadoEmpresa: 'ACTIVO',
    ...partial,
  }
}

describe('esProductoVisibleEnCatalogo', () => {
  it('trata undefined como visible', () => {
    expect(esProductoVisibleEnCatalogo(undefined)).toBe(true)
  })

  it('etiqueta Publicado o Pausado como en el emprendimiento', () => {
    expect(etiquetaPublicacionProducto(true)).toBe('Publicado')
    expect(etiquetaPublicacionProducto(false)).toBe('Pausado')
  })
})

describe('ESTADOS de tienda en admin', () => {
  it('solo permite los tres estados que el backend acepta', () => {
    expect(ESTADOS).toEqual(['ACTIVO', 'SUSPENDIDO', 'INACTIVO'])
  })
})

describe('empresa interna de plataforma', () => {
  it('detecta id 1 o slug hotclick', () => {
    expect(esEmpresaInternaPlataforma(emp({ id: EMPRESA_PLATAFORMA_ID }))).toBe(true)
    expect(esEmpresaInternaPlataforma(emp({ id: 99, slug: 'hotclick' }))).toBe(true)
    expect(esEmpresaInternaPlataforma(emp({ id: 2, slug: 'otra' }))).toBe(false)
  })

  it('excluye la interna de listados, filtros y KPIs', () => {
    const lista = [
      emp({ id: 1, nombreEmpresa: 'HOTCLICK', slug: 'hotclick', estadoEmpresa: 'INACTIVO' }),
      emp({ id: 2, nombreEmpresa: 'Tienda A', estadoEmpresa: 'ACTIVO' }),
      emp({ id: 3, nombreEmpresa: 'Tienda B', estadoEmpresa: 'SUSPENDIDO' }),
    ]
    expect(empresasOperables(lista)).toHaveLength(2)
    expect(filtrarEmpresas(lista, { search: '', filtroEstado: 'ALL', filtroPlan: 'ALL' })).toHaveLength(2)
    expect(kpisEmpresas(lista)).toEqual({ total: 2, activas: 1, suspendidas: 1, pro: 0 })
  })
})

describe('espacio de un negocio', () => {
  it('arma las rutas del workspace y la carga', () => {
    expect(rutaEspacioEmpresa(22)).toBe('/admin/empresas/22')
    expect(rutaCargaMasivaEmpresa(22)).toBe('/admin/productos/carga-masiva?empresaId=22')
    expect(rutaImportarEmpresa(22)).toBe('/admin/productos/importar?empresaId=22&fuente=csv')
    expect(rutaImportarEmpresa(22, 'csv')).toBe('/admin/productos/importar?empresaId=22&fuente=csv')
    expect(rutaEnlacePdfEmpresa(22)).toBe('/admin/productos/importar?empresaId=22&fuente=url')
  })

  it('solo acepta un id numérico en el query', () => {
    expect(empresaIdDesdeParam('22')).toBe('22')
    expect(empresaIdDesdeParam('abc')).toBe('')
    expect(empresaIdDesdeParam(null)).toBe('')
  })

  it('filtra productos del tab por nombre o categoría', () => {
    const productos: EmpresaProductoTab[] = [
      { id: 1, nombre: 'Caja personalizada', categoria: 'arretes', stock: 2 },
      { id: 2, nombre: 'Vela de soya', categoria: 'hogar', stock: 1 },
    ]
    expect(filtrarProductosTab(productos, 'caja')).toHaveLength(1)
    expect(filtrarProductosTab(productos, 'hogar')).toEqual([productos[1]])
    expect(filtrarProductosTab(productos, '')).toHaveLength(2)
  })
})
