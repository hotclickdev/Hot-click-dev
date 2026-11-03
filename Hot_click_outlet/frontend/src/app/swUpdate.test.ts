import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { aplicarSwTrasLogin, crearLimitadorChequeo, debeAplicarTrasLogin, debeAutoActualizar, marcarActualizacionEnEspera, VENTANA_ANTIBUCLE_MS, debeMostrarAvisoSw, INTERVALO_MIN_CHEQUEO_MS, posponerAvisoSw, POSPONER_AVISO_MS } from './swUpdate'

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

describe('SW · aviso «Hay una versión nueva» sin repetirse', () => {
  function memoria() {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
  }

  it('«Ahora no» lo pospone 6 h; después vuelve a avisar', () => {
    const s = memoria()
    expect(debeMostrarAvisoSw(1_000, s)).toBe(true)
    posponerAvisoSw(1_000, s)
    expect(debeMostrarAvisoSw(1_000 + 60_000, s)).toBe(false)
    expect(debeMostrarAvisoSw(1_000 + POSPONER_AVISO_MS + 1, s)).toBe(true)
  })

  it('al volver a foco chequea como mucho cada 10 min', () => {
    const toca = crearLimitadorChequeo()
    expect(toca(INTERVALO_MIN_CHEQUEO_MS)).toBe(true)
    expect(toca(INTERVALO_MIN_CHEQUEO_MS + 5_000)).toBe(false)
    expect(toca(INTERVALO_MIN_CHEQUEO_MS * 2 + 1)).toBe(true)
  })
})

describe('aplicar SW tras login (regresión: con sesión el precache viejo nunca se actualizaba)', () => {
  const memoria = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
  }

  it('debeAplicarTrasLogin: solo con versión en espera y fuera de la ventana anti-bucle', () => {
    expect(debeAplicarTrasLogin(false, null, 1000)).toBe(false)
    expect(debeAplicarTrasLogin(true, null, 1000)).toBe(true)
    expect(debeAplicarTrasLogin(true, '1000', 1000 + VENTANA_ANTIBUCLE_MS - 1)).toBe(false)
    expect(debeAplicarTrasLogin(true, '1000', 1000 + VENTANA_ANTIBUCLE_MS)).toBe(true)
  })

  it('aplica una sola vez (recargar=true) y no entra en bucle', () => {
    const store = memoria()
    const aplicar = vi.fn(() => Promise.resolve())
    marcarActualizacionEnEspera()
    expect(aplicarSwTrasLogin(5000, store, aplicar)).toBe(true)
    expect(aplicar).toHaveBeenCalledWith(true)
    marcarActualizacionEnEspera()
    expect(aplicarSwTrasLogin(6000, store, aplicar)).toBe(false)
    expect(aplicar).toHaveBeenCalledTimes(1)
  })

  it('sin versión en espera o sin storage no recarga', () => {
    const aplicar = vi.fn(() => Promise.resolve())
    marcarActualizacionEnEspera(false)
    expect(aplicarSwTrasLogin(1, memoria(), aplicar)).toBe(false)
    marcarActualizacionEnEspera()
    expect(aplicarSwTrasLogin(1, null, aplicar)).toBe(false)
    expect(aplicar).not.toHaveBeenCalled()
    marcarActualizacionEnEspera(false)
  })

  it('el login exitoso llama aplicarSwTrasLogin tras navegar y main.tsx marca la versión en espera', () => {
    const flujo = readFileSync(resolve(__dirname, '../pages/auth/useLoginFlow.ts'), 'utf8')
    expect(flujo).toMatch(/navigate\(destino, \{ replace: true \}\)\s*\n\s*setTimeout\(\(\) => \{ aplicarSwTrasLogin\(\) \}/)
    const main = readFileSync(resolve(__dirname, '../main.tsx'), 'utf8')
    expect(main).toContain('marcarActualizacionEnEspera()')
  })
})
