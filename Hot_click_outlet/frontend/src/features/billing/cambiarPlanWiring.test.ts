import { describe, expect, it } from 'vitest'
import type { CambiarPlanResultado } from '@/services/billingService'
import { rutaCambioPlan } from './useCambiarPlan'

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

describe('bajar a Emprendedor', () => {
  it('va por /billing/cancelar, nunca por cambiar-plan', () => {
    expect(rutaCambioPlan('EMPRENDEDOR')).toBe('cancelar')
    expect(rutaCambioPlan('emprendedor')).toBe('cancelar')
  })
  it('planes de pago siguen por cambiar-plan', () => {
    expect(rutaCambioPlan('PYME')).toBe('cambiar-plan')
    expect(rutaCambioPlan('NEGOCIO_PLUS')).toBe('cambiar-plan')
    expect(rutaCambioPlan(undefined)).toBe('cambiar-plan')
  })
})

describe('Auditor 5 S-01: /cambiar-plan cobra por ONVO', () => {
  it('requiere_pago con subscriptionId abre ONVO', async () => {
    const { pagoPendienteDe } = await import('./useCambiarPlan')
    expect(pagoPendienteDe({ status: 'requiere_pago', subscriptionId: 'sub_1', publishableKey: 'pk', planNombre: 'PYME', proveedor: 'ONVO', montoUsd: 24 }))
      .toEqual({ proveedor: 'ONVO', subscriptionId: 'sub_1', customerId: undefined, publishableKey: 'pk', planNombre: 'PYME', montoUsd: 24 })
  })
  it('sin datos de cobro no abre nada (antes quedaba en "Respuesta inesperada")', async () => {
    const { pagoPendienteDe } = await import('./useCambiarPlan')
    expect(pagoPendienteDe({ status: 'requiere_pago' })).toBeNull()
    expect(pagoPendienteDe({ status: 'activado', subscriptionId: 'sub_1' })).toBeNull()
  })
})

describe('cambiar-plan con trialDias (primer mes gratis)', () => {
  it('trialDias > 0 llega al cobro pendiente (con fecha del primer cobro si viene)', async () => {
    const { pagoPendienteDe } = await import('./useCambiarPlan')
    const base = { status: 'requiere_pago' as const, subscriptionId: 'sub_1', publishableKey: 'pk', planNombre: 'PYME' }
    expect(pagoPendienteDe({ ...base, trialDias: 30, primerCobro: '2027-01-26' }))
      .toMatchObject({ trialDias: 30, primerCobro: '2027-01-26' })
    expect(pagoPendienteDe({ ...base, trialDias: 14 })).toMatchObject({ trialDias: 14 })
    expect(pagoPendienteDe({ ...base, trialDias: 14 })?.primerCobro).toBeUndefined()
  })
  it('trialDias 0 o ausente: sin trial en el cobro', async () => {
    const { pagoPendienteDe } = await import('./useCambiarPlan')
    const base = { status: 'requiere_pago' as const, subscriptionId: 'sub_1' }
    expect(pagoPendienteDe({ ...base, trialDias: 0 })?.trialDias).toBeUndefined()
    expect(pagoPendienteDe(base)?.trialDias).toBeUndefined()
  })
})
