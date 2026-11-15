import { describe, expect, it } from 'vitest'
import { validarPasoElegirPlan, mapApiPlanToUi, requiereVerificarCorreo } from '@/prototipo/compartido/planesPageHelpers'

describe('planesPageHelpers', () => {
  const pyme = mapApiPlanToUi({ id: 2, nombre: 'PYME', precioMensual: 9900 })

  it('NP-2: Tu Plan arma la comisión y límites desde el API, sin 4% ni ₡24.900', () => {
    const plus = mapApiPlanToUi({ id: 10, nombre: 'NEGOCIO_PLUS', precioMensual: 28900, comisionPorcentaje: 6, comisionMinimaCrc: 700, maxProductos: -1, maxBodegas: -1 })
    expect(plus.precio).not.toMatch(/₡/)
    expect(plus.beneficios).toContain('Comisión 6% por venta')
    expect(plus.beneficios.join(' ')).not.toMatch(/4%|24\.900/)
    const emp = mapApiPlanToUi({ id: 8, nombre: 'EMPRENDEDOR', precioMensual: 0, comisionPorcentaje: '9.00', maxProductos: 50, maxBodegas: 1 })
    expect(emp.beneficios).toEqual(expect.arrayContaining(['Hasta 50 productos publicados', 'Comisión 9% por venta', '1 bodega']))
  })

  it('Precio activo de /admin/billing/planes: USD de precioUsd, nunca colones de precioMensual', () => {
    const plus = mapApiPlanToUi({ id: 10, nombre: 'NEGOCIO_PLUS', precioMensual: 28900, precioUsd: 49 })
    expect(plus.precio).toBe('US$49/mes')
    expect(plus.rotuloPrecio).toBeNull()
    const emp = mapApiPlanToUi({ id: 8, nombre: 'EMPRENDEDOR', precioMensual: 0, precioUsd: 9 })
    expect(emp.precio).toBe('US$9/mes')
    expect(emp.rotuloPrecio).toBe('Precio de lista')
    const sinMonto = mapApiPlanToUi({ id: 2, nombre: 'PYME', precioMensual: 12900, precioUsd: null })
    expect(sinMonto.precio).not.toMatch(/₡|12\.900|Gratis/)
    expect(sinMonto.precio).toMatch(/d[oó]lares/i)
  })

  it('NP-3: plan de pago con correo sin verificar pide el código', () => {
    expect(requiereVerificarCorreo(pyme, false)).toBe(true)
    expect(requiereVerificarCorreo(pyme, true)).toBe(false)
    // Regla previa sin cambios: depende de precioMensual legado, no del precio mostrado en USD.
    expect(requiereVerificarCorreo(mapApiPlanToUi({ id: 8, nombre: 'EMPRENDEDOR', precioMensual: 0, precioUsd: 9 }), false)).toBe(false)
  })

  it('validarPasoElegirPlan exige selección', () => {
    expect(validarPasoElegirPlan(null, 'EMPRENDEDOR')).toBe('Elegí un plan para continuar.')
  })

  it('validarPasoElegirPlan rechaza plan actual', () => {
    expect(validarPasoElegirPlan(pyme, 'PYME')).toBe('Ese ya es tu plan actual.')
  })

  it('validarPasoElegirPlan acepta plan distinto', () => {
    expect(validarPasoElegirPlan(pyme, 'EMPRENDEDOR')).toBeNull()
  })
})
