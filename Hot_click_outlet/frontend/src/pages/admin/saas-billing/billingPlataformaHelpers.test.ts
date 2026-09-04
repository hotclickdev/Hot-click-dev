import { describe, expect, it } from 'vitest'
import {
  etiquetaComision,
  etiquetaProveedor,
  filtrarFilas,
  parsearConsola,
  type BillingFila,
} from './billingPlataformaHelpers'

function fila(partial: Partial<BillingFila> & Pick<BillingFila, 'empresaId'>): BillingFila {
  return {
    nombre: 'Tienda',
    plan: 'PYME',
    comisionPorcentaje: 4,
    precioMensual: 9900,
    estadoSuscripcion: 'ACTIVO',
    proveedor: 'ONVO',
    fallosCobro: 0,
    alertaCobro: false,
    ...partial,
  }
}

describe('parsearConsola', () => {
  it('lee empresas y KPIs del payload admin', () => {
    const out = parsearConsola({
      empresas: [{ empresaId: 10, nombre: 'Café', plan: 'PYME', proveedor: 'ONVO', alertaCobro: true, fallosCobro: 2 }],
      kpis: { total: 1, pastDue: 0, conAlertaCobro: 1, conOnvo: 1, conStripe: 0 },
    })
    expect(out.empresas).toHaveLength(1)
    expect(out.empresas[0].alertaCobro).toBe(true)
    expect(out.kpis.conAlertaCobro).toBe(1)
  })

  it('tolera payload vacío sin any', () => {
    expect(parsearConsola(null).empresas).toEqual([])
    expect(parsearConsola('x').kpis.total).toBe(0)
  })
})

describe('filtrarFilas', () => {
  const lista = [
    fila({ empresaId: 1, alertaCobro: true, fallosCobro: 1 }),
    fila({ empresaId: 2, estadoSuscripcion: 'PAST_DUE', estadoPlan: 'PAST_DUE', alertaCobro: true, proveedor: 'STRIPE' }),
    fila({ empresaId: 3, proveedor: 'NINGUNO', plan: 'EMPRENDEDOR', precioMensual: 0 }),
  ]

  it('aísla alertas, PAST_DUE y Onvo', () => {
    expect(filtrarFilas(lista, 'ALERTA')).toHaveLength(2)
    expect(filtrarFilas(lista, 'PAST_DUE').map((f) => f.empresaId)).toEqual([2])
    expect(filtrarFilas(lista, 'ONVO').map((f) => f.empresaId)).toEqual([1])
  })
})

describe('etiquetas', () => {
  it('nombra pasarela y comisión', () => {
    expect(etiquetaProveedor('AMBOS')).toBe('Onvo + Stripe')
    expect(etiquetaProveedor('NINGUNO')).toBe('Sin pasarela')
    expect(etiquetaComision(8)).toBe('8%')
  })
})
