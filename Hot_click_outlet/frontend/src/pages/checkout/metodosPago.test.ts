import { describe, expect, it } from 'vitest'
import { metodosDisponibles } from './metodosPago'
import { PAGO_SINPE, PAGO_TARJETA, metodoProximamente } from './pagoPrincipal'

const ids = (sinpe: boolean) => metodosDisponibles(sinpe).map((m) => m.id)

describe('metodosDisponibles: SINPE sin número configurado', () => {
  it('sin ONVO ni SINPE manual (backend publica sinpeManual=false si no hay destino) no ofrece SINPE', () => {
    expect(ids(!metodoProximamente(PAGO_SINPE, false, false))).toEqual([PAGO_TARJETA])
  })
  it('con SINPE manual habilitado (destino configurado) ofrece SINPE', () => {
    expect(ids(!metodoProximamente(PAGO_SINPE, true, false))).toEqual([PAGO_SINPE, PAGO_TARJETA])
  })
  it('con ONVO ofrece SINPE', () => {
    expect(ids(!metodoProximamente(PAGO_SINPE, false, true))).toEqual([PAGO_SINPE, PAGO_TARJETA])
  })
})

describe('metodosDisponibles: parámetro obligatorio (fail-closed)', () => {
  it('omitir sinpeHabilitado es error de tipo y en runtime no ofrece SINPE', () => {
    // @ts-expect-error sinpeHabilitado es obligatorio, sin default
    expect(metodosDisponibles().map((m) => m.id)).toEqual([PAGO_TARJETA])
  })
})
