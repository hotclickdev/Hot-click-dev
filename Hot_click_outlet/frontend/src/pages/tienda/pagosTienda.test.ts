import { describe, expect, it } from 'vitest'
import { metodoPagoVigente, metodosPagoTienda, SINPE_TIENDA_DISPONIBLE } from './pagosTienda'

describe('SINPE con comprobante de la tienda (oculto hasta ONVO)', () => {
  it('apagado por defecto: sin SINPE, solo efectivo si la tienda lo acepta', () => {
    expect(SINPE_TIENDA_DISPONIBLE).toBe(false)
    expect(metodosPagoTienda(true).map((o) => o.value)).toEqual(['EFECTIVO'])
    expect(metodosPagoTienda(false)).toEqual([])
  })
  it('encendido: SINPE primero', () => {
    expect(metodosPagoTienda(true, true).map((o) => o.value)).toEqual(['SINPE_MOVIL', 'EFECTIVO'])
  })
  it('el método elegido cae al primero disponible', () => {
    const op = metodosPagoTienda(true)
    expect(metodoPagoVigente('SINPE_MOVIL', op)).toBe('EFECTIVO')
    expect(metodoPagoVigente('SINPE_MOVIL', [])).toBe('')
  })
})
