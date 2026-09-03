import { describe, expect, it } from 'vitest'
import { rutaCuentaSeller, rutaSellerDesdeAdmin } from './planPaths'

describe('rutaCuentaSeller', () => {
  it('anida bajo opciones para Emprendedor', () => {
    expect(rutaCuentaSeller('EMPRENDEDOR', 'bodegas')).toBe('opciones/bodegas')
    expect(rutaCuentaSeller('EMPRENDEDOR', 'negocio')).toBe('opciones/negocio')
  })

  it('usa paths planos para PYME y Negocio Plus', () => {
    expect(rutaCuentaSeller('PYME', 'bodegas')).toBe('bodegas')
    expect(rutaCuentaSeller('NEGOCIO_PLUS', 'bodegas/nueva')).toBe('bodegas/nueva')
  })
})

describe('rutaSellerDesdeAdmin', () => {
  it('remap de bodegas según plan', () => {
    expect(rutaSellerDesdeAdmin('/admin/bodegas', '', 'EMPRENDEDOR')).toBe('/emprendedor/opciones/bodegas')
    expect(rutaSellerDesdeAdmin('/admin/bodegas', '', 'PYME')).toBe('/pyme/bodegas')
    expect(rutaSellerDesdeAdmin('/admin/bodegas', '', 'NEGOCIO_PLUS')).toBe('/negocio-plus/bodegas')
  })

  it('remap de mi-empresa según plan', () => {
    expect(rutaSellerDesdeAdmin('/admin/mi-empresa', '', 'EMPRENDEDOR')).toBe('/emprendedor/opciones/negocio')
    expect(rutaSellerDesdeAdmin('/admin/mi-empresa', '', 'PYME')).toBe('/pyme/negocio')
  })
})
