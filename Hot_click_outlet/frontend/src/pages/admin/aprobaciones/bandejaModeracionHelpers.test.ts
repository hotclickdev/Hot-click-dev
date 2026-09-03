import { describe, expect, it } from 'vitest'
import { colasDesdeResumen, formatoColonPayout, RESUMEN_VACIO } from './bandejaModeracionHelpers'

describe('bandejaModeracionHelpers', () => {
  it('lista todas las colas con conteos del resumen', () => {
    const colas = colasDesdeResumen({
      ...RESUMEN_VACIO,
      empresas: 2,
      ofertas: 1,
      recolecciones: 3,
      sinpe: 0,
      testimonios: 4,
      payouts: 5,
      reportesProducto: 1,
      total: 16,
    })
    expect(colas).toHaveLength(7)
    expect(colas.find((c) => c.id === 'empresas')?.count).toBe(2)
    expect(colas.find((c) => c.id === 'payouts')?.to).toBe('/admin/payouts')
    expect(colas.find((c) => c.id === 'reportes')?.to).toBe('/admin/reportes-producto')
  })

  it('formatea montos en colones CR', () => {
    expect(formatoColonPayout(null)).toBe('—')
    expect(formatoColonPayout(1500)).toMatch(/1[\u00a0.]?500/)
  })
})
