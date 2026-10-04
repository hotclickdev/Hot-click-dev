import { describe, expect, it } from 'vitest'
import { evaluarPasos, guiaObligatoriaLista, indicePasoActivo, pasoSiguiente, type HechosTour } from './tourPasos'
import { guardarPreferencia, leerPreferencias, pasoDeRuta, rutasDePasos } from './tourSellerRutas'
import { vistaTour } from './tourSellerVista'
import { enlaceWhatsapp } from './enlaceInvitacion'

const CERO: HechosTour = {
  bodegas: 0,
  productos: 0,
  metodosCobro: 0,
  tieneUbicacion: false,
  vioTienda: false,
}

describe('tour de arranque', () => {
  it('sin bodega bloquea el producto y el resto', () => {
    const pasos = evaluarPasos(CERO)
    expect(pasos.find((p) => p.id === 'bodega')?.bloqueado).toBe(false)
    expect(pasos.find((p) => p.id === 'producto')?.bloqueado).toBe(true)
    expect(pasos.find((p) => p.id === 'cobro')?.bloqueado).toBe(true)
    expect(pasoSiguiente(pasos)?.id).toBe('bodega')
    expect(indicePasoActivo(pasos)).toBe(0)
    expect(guiaObligatoriaLista(pasos)).toBe(false)
  })

  it('con bodega abre el producto y no el cobro', () => {
    const pasos = evaluarPasos({ ...CERO, bodegas: 1 })
    expect(pasos.find((p) => p.id === 'producto')?.bloqueado).toBe(false)
    expect(pasos.find((p) => p.id === 'cobro')?.bloqueado).toBe(true)
    expect(pasoSiguiente(pasos)?.id).toBe('producto')
  })

  it('la guía obligatoria no espera la tienda', () => {
    const pasos = evaluarPasos({
      bodegas: 1,
      productos: 2,
      metodosCobro: 1,
      tieneUbicacion: true,
      vioTienda: false,
    })
    expect(guiaObligatoriaLista(pasos)).toBe(true)
    expect(pasos.find((p) => p.id === 'tienda')?.bloqueado).toBe(false)
    expect(pasos.find((p) => p.id === 'tienda')?.opcional).toBe(true)
  })

  it('arma rutas distintas para emprendedor y pyme', () => {
    expect(rutasDePasos({ base: '/emprendedor', emprendedor: true }).bodega).toBe('/emprendedor/opciones/bodegas')
    expect(rutasDePasos({ base: '/pyme', emprendedor: false }).cobro).toBe('/pyme/cobro')
    expect(rutasDePasos({ base: '/negocio-plus', emprendedor: false }).producto).toBe('/negocio-plus/productos')
    expect(pasoDeRuta('/emprendedor/opciones/bodegas/nueva')).toBe('bodega')
    expect(pasoDeRuta('/pyme/productos/nuevo')).toBe('producto')
    expect(pasoDeRuta('/negocio-plus')).toBeNull()
    expect(pasoDeRuta('/negocio-plus/negocio')).toBe('negocio')
  })

  it('la vista del hook respeta ocultar y la tienda vista', () => {
    const memoria = new Map<string, string>()
    const storage = {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => { memoria.set(k, v) },
      removeItem: (k: string) => { memoria.delete(k) },
    }
    guardarPreferencia(storage, 4, 9, 'descartado', true)
    guardarPreferencia(storage, 4, 9, 'tienda', true)
    const prefs = leerPreferencias(storage, 4, 9)
    const vista = vistaTour(CERO, prefs, { base: '/pyme', emprendedor: false })
    expect(vista.oculto).toBe(true)
    expect(vista.pasos.find((p) => p.id === 'tienda')?.completo).toBe(true)
    expect(vista.pasos.find((p) => p.id === 'bodega')?.completo).toBe(false)
  })
})

describe('enlace de propietario', () => {
  it('arma WhatsApp con el teléfono y el mensaje', () => {
    const url = enlaceWhatsapp('506 8888-7777', 'https://hotclick.lat/invitacion/abc', 'Luna')
    expect(url.startsWith('https://wa.me/50688887777?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('https://hotclick.lat/invitacion/abc')
    expect(decodeURIComponent(url)).toContain('Luna')
  })

  it('sin teléfono igual abre WhatsApp para elegir el chat', () => {
    expect(enlaceWhatsapp('', 'https://hotclick.lat/invitacion/abc', 'Luna').startsWith('https://wa.me/?text=')).toBe(true)
  })
})
