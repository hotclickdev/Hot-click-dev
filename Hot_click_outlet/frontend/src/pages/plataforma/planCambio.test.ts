import { describe, expect, it } from 'vitest'
import { mensajeSuscripcion, nombrePlan, rutaSuscripcion } from './planCambio'

describe('cambio de plan', () => {
  it('el enlace abre Tu Plan del plan actual con el destino pedido', () => {
    expect(rutaSuscripcion('EMPRENDEDOR', 'PYME')).toBe('/emprendedor/opciones/plan?plan=PYME')
    expect(rutaSuscripcion('PYME', 'NEGOCIO_PLUS')).toBe('/pyme/plan?plan=NEGOCIO_PLUS')
    expect(rutaSuscripcion('NEGOCIO_PLUS', 'EMPRENDEDOR')).toBe('/negocio-plus/plan?plan=EMPRENDEDOR')
  })

  it('el mensaje de un plan de pago pide la tarjeta', () => {
    const texto = mensajeSuscripcion('Taller Luna', 'PYME', 'https://hotclick.lat/emprendedor/opciones/plan?plan=PYME')
    expect(texto).toContain('Taller Luna')
    expect(texto).toContain('PYME')
    expect(texto).toContain('registrá la tarjeta')
    expect(texto).toContain('plan=PYME')
  })

  it('bajar a Emprendedor pide confirmar, sin tarjeta', () => {
    const texto = mensajeSuscripcion('Taller Luna', 'EMPRENDEDOR', 'https://hotclick.lat/pyme/plan?plan=EMPRENDEDOR')
    expect(texto).toContain('confirmá el cambio')
    expect(texto).not.toContain('tarjeta')
    expect(nombrePlan('NEGOCIO_PLUS')).toBe('Negocio Plus')
  })
})
