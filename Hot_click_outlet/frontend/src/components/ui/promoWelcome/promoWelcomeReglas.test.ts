import { describe, expect, it } from 'vitest'
import { debeMostrarPromo, PAGINAS_ANTES_DE_PROMO } from './promoWelcomeReglas'

const AHORA = Date.UTC(2026, 8, 25)
const DIA = 24 * 60 * 60 * 1000

describe('debeMostrarPromo', () => {
  it('no aparece en las primeras páginas de la visita', () => {
    for (let paginas = 1; paginas < PAGINAS_ANTES_DE_PROMO; paginas++) {
      expect(debeMostrarPromo({ paginasVistas: paginas, pathname: '/', ultimaVezVisto: null, ahora: AHORA })).toBe(false)
    }
  })

  it('aparece a partir de la tercera página si nunca se vio', () => {
    expect(debeMostrarPromo({ paginasVistas: 3, pathname: '/productos', ultimaVezVisto: null, ahora: AHORA })).toBe(true)
  })

  it('nunca interrumpe carrito, checkout ni pago', () => {
    for (const pathname of ['/carrito', '/checkout', '/checkout/qr', '/pago/exito']) {
      expect(debeMostrarPromo({ paginasVistas: 9, pathname, ultimaVezVisto: null, ahora: AHORA })).toBe(false)
    }
  })

  it('respeta los 7 días de pausa después de cerrarlo', () => {
    expect(debeMostrarPromo({ paginasVistas: 5, pathname: '/', ultimaVezVisto: AHORA - 6 * DIA, ahora: AHORA })).toBe(false)
    expect(debeMostrarPromo({ paginasVistas: 5, pathname: '/', ultimaVezVisto: AHORA - 7 * DIA, ahora: AHORA })).toBe(true)
  })
})
