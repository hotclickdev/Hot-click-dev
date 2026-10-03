import { describe, expect, it } from 'vitest'
import { debeAutoActualizar } from './swUpdate'

describe('SW · auto-actualización solo para visitantes sin sesión', () => {
  it('visitante sin sesión en rutas de vitrina: se actualiza solo', () => {
    for (const ruta of ['/', '/productos', '/productos/284', '/categorias', '/emprendimientos', '/tienda/casa-luna-506', '/privacidad', '/envios', '/blog/algo']) {
      expect(debeAutoActualizar(ruta, false)).toBe(true)
    }
  })

  it('POS/caja y paneles de admin, emprendedor, Pyme y Negocio Plus: nunca se recargan solos (modo prompt)', () => {
    for (const ruta of ['/pos', '/pos/caja', '/admin', '/admin/pos', '/admin/productos', '/emprendedor', '/emprendedor/pos/caja', '/pyme/ventas', '/negocio-plus', '/negocio-plus/pos', '/caja', '/checkout/qr/abc']) {
      expect(debeAutoActualizar(ruta, false)).toBe(false)
      expect(debeAutoActualizar(ruta, true)).toBe(false)
    }
  })

  it('con sesión iniciada nunca se recarga solo, aunque esté en la vitrina', () => {
    expect(debeAutoActualizar('/', true)).toBe(false)
    expect(debeAutoActualizar('/productos', true)).toBe(false)
  })

  it('visitante con formulario o pago en curso: queda en prompt', () => {
    for (const ruta of ['/checkout', '/pago/exito', '/carrito', '/contacto', '/encargo/tok', '/cotizacion/tok', '/login', '/registro', '/tienda/casa-luna/checkout', '/tienda/casa-luna/carrito']) {
      expect(debeAutoActualizar(ruta, false)).toBe(false)
    }
  })

  it('no confunde prefijos parecidos ni se rompe con query o barra final', () => {
    expect(debeAutoActualizar('/posts', false)).toBe(true)
    expect(debeAutoActualizar('/administracion-publica', false)).toBe(true)
    expect(debeAutoActualizar('/admin/', false)).toBe(false)
    expect(debeAutoActualizar('/productos?search=sofa', false)).toBe(true)
  })
})
