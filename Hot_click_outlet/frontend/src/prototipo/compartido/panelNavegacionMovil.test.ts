import { describe, expect, it } from 'vitest'
import { esInicio, esRutaDeMas, itemsMas, pathEstaEnRuta, rutasBarra } from './panelNavegacionMovil'

describe('navegación móvil del panel (A4b)', () => {
  it('«Más» lista Tienda, Reportes, Equipo, Bodegas, Planes y Opciones en ese orden', () => {
    expect(itemsMas('/pyme', 'PYME').map((i) => i.etiqueta)).toEqual([
      'Tienda', 'Reportes', 'Equipo', 'Bodegas', 'Planes', 'Opciones',
    ])
  })

  it('Pyme y Negocio Plus usan rutas planas', () => {
    expect(itemsMas('/pyme', 'PYME').map((i) => i.to)).toEqual([
      '/pyme/tienda', '/pyme/reportes', '/pyme/equipo', '/pyme/bodegas', '/pyme/plan', '/pyme/opciones',
    ])
    expect(itemsMas('/negocio-plus', 'NEGOCIO_PLUS')[2].to).toBe('/negocio-plus/equipo')
  })

  it('Emprendedor cuelga Equipo, Bodegas y Planes de Opciones', () => {
    expect(itemsMas('/emprendedor', 'EMPRENDEDOR').map((i) => i.to)).toEqual([
      '/emprendedor/tienda',
      '/emprendedor/reportes',
      '/emprendedor/opciones/equipo',
      '/emprendedor/opciones/bodegas',
      '/emprendedor/opciones/plan',
      '/emprendedor/opciones',
    ])
  })

  it('las rutas de la barra salen del prefijo del plan', () => {
    expect(rutasBarra('/pyme')).toEqual({ inicio: '/pyme', pedidos: '/pyme/pedidos', productos: '/pyme/productos' })
  })

  it('Inicio solo está activo en la raíz del panel', () => {
    expect(esInicio('/pyme', '/pyme')).toBe(true)
    expect(esInicio('/pyme/', '/pyme')).toBe(true)
    expect(esInicio('/pyme/pedidos', '/pyme')).toBe(false)
  })

  it('«Más» se marca activo en sus destinos y no en las pestañas propias', () => {
    expect(esRutaDeMas('/pyme/reportes', '/pyme', 'PYME')).toBe(true)
    expect(esRutaDeMas('/emprendedor/opciones/bodegas/nueva', '/emprendedor', 'EMPRENDEDOR')).toBe(true)
    expect(esRutaDeMas('/pyme/pedidos', '/pyme', 'PYME')).toBe(false)
    expect(esRutaDeMas('/pyme/productos/nuevo', '/pyme', 'PYME')).toBe(false)
  })

  it('no confunde prefijos parecidos', () => {
    expect(pathEstaEnRuta('/pyme/pedidos-viejos', '/pyme/pedidos')).toBe(false)
    expect(pathEstaEnRuta('/pyme/pedidos/12', '/pyme/pedidos')).toBe(true)
  })
})
