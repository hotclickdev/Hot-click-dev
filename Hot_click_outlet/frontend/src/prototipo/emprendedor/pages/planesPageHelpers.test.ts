import { describe, expect, it } from 'vitest'
import { validarPasoElegirPlan, mapApiPlanToUi } from '@/prototipo/compartido/planesPageHelpers'

describe('planesPageHelpers', () => {
  const pyme = mapApiPlanToUi({ id: 2, nombre: 'PYME', precioMensual: 9900 })

  it('validarPasoElegirPlan exige selección', () => {
    expect(validarPasoElegirPlan(null, 'EMPRENDEDOR')).toBe('Elegí un plan para continuar.')
  })

  it('validarPasoElegirPlan rechaza plan actual', () => {
    expect(validarPasoElegirPlan(pyme, 'PYME')).toBe('Ese ya es tu plan.')
  })

  it('ninguna tarjeta muestra montos inventados ni promesas retiradas (3-oct-2026)', () => {
    expect(pyme.precio).toBe('[PENDIENTE]')
    const todo = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS'].flatMap((n) => mapApiPlanToUi({ id: 1, nombre: n, precioMensual: 9900 }).beneficios).join(' ')
    expect(todo).not.toMatch(/₡|\d\s?%|Gratis|Hasta 20|ilimitados|sucursal|prioritario|avanzad|básic/i)
    expect(mapApiPlanToUi({ id: 1, nombre: 'EMPRENDEDOR' }).beneficios).toContain('Punto de venta con 1 caja')
  })

  it('validarPasoElegirPlan acepta plan distinto', () => {
    expect(validarPasoElegirPlan(pyme, 'EMPRENDEDOR')).toBeNull()
  })
})
