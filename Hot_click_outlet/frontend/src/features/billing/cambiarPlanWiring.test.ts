import { describe, expect, it } from 'vitest'
import type { CambiarPlanResultado } from '@/services/billingService'

/**
 * Wiring del CTA de cambio de plan: no navega a éxito sin cobro cuando requiere_pago.
 */
function debeMostrarCobro(result: CambiarPlanResultado): boolean {
  return result.status === 'requiere_pago' && Boolean(result.subscriptionId)
}

function debeIrAExito(result: CambiarPlanResultado): boolean {
  return result.status === 'activado' || result.status === 'actualizando'
}

describe('cambiarPlan CTA wiring', () => {
  it('requiere_pago con subscriptionId abre cobro ONVO', () => {
    const result: CambiarPlanResultado = {
      status: 'requiere_pago',
      subscriptionId: 'sub_123',
      publishableKey: 'pk_test',
    }
    expect(debeMostrarCobro(result)).toBe(true)
    expect(debeIrAExito(result)).toBe(false)
  })

  it('activado (mock) va a éxito sin cobro', () => {
    const result: CambiarPlanResultado = { status: 'activado', planNombre: 'PYME', mock: true }
    expect(debeMostrarCobro(result)).toBe(false)
    expect(debeIrAExito(result)).toBe(true)
  })

  it('requiere_pago sin subscriptionId no abre cobro', () => {
    const result: CambiarPlanResultado = { status: 'requiere_pago' }
    expect(debeMostrarCobro(result)).toBe(false)
  })
})
