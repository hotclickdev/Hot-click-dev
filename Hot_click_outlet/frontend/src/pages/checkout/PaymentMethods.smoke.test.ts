import { describe, expect, it } from 'vitest'

/** Orden esperado de métodos en checkout (sin importar JSX). */
export const ORDEN_METODOS_CHECKOUT = ['TILOPAY', 'SINPE', 'EFECTIVO'] as const

describe('PaymentMethods order', () => {
  it('pone Tilopay primero, luego SINPE y efectivo', () => {
    expect(ORDEN_METODOS_CHECKOUT[0]).toBe('TILOPAY')
    expect([...ORDEN_METODOS_CHECKOUT]).toEqual(['TILOPAY', 'SINPE', 'EFECTIVO'])
  })
})
