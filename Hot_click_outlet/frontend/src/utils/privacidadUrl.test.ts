import { describe, expect, it } from 'vitest'
import { limpiarEventoPostHog, limpiarTokensProfundo, quitarTokensDeUrl } from './privacidadUrl'

const TOKEN = 'a'.repeat(64)

describe('privacidad: tokens fuera de analítica y monitoreo', () => {
  it('quita token, estadoPagoToken y cancelToken de la URL y conserva lo demás', () => {
    expect(quitarTokensDeUrl(`https://hotclick.lat/checkout/pendiente/ORD-1?token=${TOKEN}`)).toBe('https://hotclick.lat/checkout/pendiente/ORD-1')
    expect(quitarTokensDeUrl(`/p?token=${TOKEN}&utm_source=ig`)).toBe('/p?utm_source=ig')
    expect(quitarTokensDeUrl(`/p?utm_source=ig&token=${TOKEN}#x`)).toBe('/p?utm_source=ig#x')
    expect(quitarTokensDeUrl('/p?cancelToken=zz&estadoPagoToken=yy')).toBe('/p')
    expect(quitarTokensDeUrl('/p?sdkToken=keep')).toBe('/p?sdkToken=keep')
    expect(quitarTokensDeUrl('/productos/42')).toBe('/productos/42')
  })

  it('el pageview de PostHog no lleva el token', () => {
    const evento = {
      event: '$pageview',
      properties: {
        $current_url: `https://hotclick.lat/checkout/pendiente/ORD-1?token=${TOKEN}`,
        $referrer: `https://hotclick.lat/checkout/pendiente/ORD-1?token=${TOKEN}`,
        $pathname: '/checkout/pendiente/ORD-1',
        lista: [`/x?token=${TOKEN}`],
      },
      $set_once: { $initial_current_url: `https://hotclick.lat/?token=${TOKEN}` },
    }
    const limpio = limpiarEventoPostHog(evento)
    expect(JSON.stringify(limpio)).not.toContain(TOKEN)
    expect(limpio?.properties.$current_url).toBe('https://hotclick.lat/checkout/pendiente/ORD-1')
    expect(limpiarEventoPostHog(null)).toBeNull()
  })

  it('limpieza profunda no toca números ni booleanos', () => {
    expect(limpiarTokensProfundo({ a: 1, b: true, c: null, d: `?token=${TOKEN}` })).toEqual({ a: 1, b: true, c: null, d: '' })
  })
})
