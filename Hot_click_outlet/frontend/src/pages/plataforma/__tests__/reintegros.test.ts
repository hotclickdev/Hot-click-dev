import { describe, expect, it } from 'vitest'
import { formatoMonto, leerReintegros, textoEstado, totalesPendientes } from '../reintegros'
import { metaRevision } from '../revisionHotClick'

const respuesta = [
  {
    empresaId: 1, negocio: 'Soda A', moneda: 'CRC', montoPendiente: 12000, montoReintegrado: 3000, cantidadPendiente: 2,
    pagos: [
      { pagoId: 10, pedido: 'HC-1', monto: 5000, moneda: 'CRC', estado: 'NO_REINTEGRADO' },
      { pagoId: 12, pedido: 'HC-3', monto: 3000, moneda: 'CRC', estado: 'REINTEGRADO', reintegradoPor: 'admin@test.invalid', nota: 'ref 9' },
    ],
  },
  { empresaId: 2, negocio: 'Tienda B', moneda: 'USD', montoPendiente: 20, montoReintegrado: 0, cantidadPendiente: 1, pagos: [] },
]

describe('saldo por reintegrar (vista admin)', () => {
  it('lee negocios, montos por moneda, pedidos y estados', () => {
    const r = leerReintegros(respuesta)
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ empresaId: 1, negocio: 'Soda A', montoPendiente: 12000, montoReintegrado: 3000, cantidadPendiente: 2 })
    expect(r[0].pagos.map((p) => [p.pedido, p.estado])).toEqual([['HC-1', 'NO_REINTEGRADO'], ['HC-3', 'REINTEGRADO']])
    expect(r[0].pagos[1]).toMatchObject({ reintegradoPor: 'admin@test.invalid', nota: 'ref 9' })
    expect(r[1].moneda).toBe('USD')
  })

  it('descarta filas inválidas y respuestas que no son listas', () => {
    expect(leerReintegros(null)).toEqual([])
    expect(leerReintegros({})).toEqual([])
    expect(leerReintegros([null, 3, { empresaId: 0 }, { empresaId: -1 }])).toEqual([])
    expect(leerReintegros([{ empresaId: 5, pagos: [{ pagoId: 0 }, null, { pagoId: 7, estado: 'otra' }] }])[0].pagos)
      .toEqual([expect.objectContaining({ pagoId: 7, estado: 'NO_REINTEGRADO', moneda: 'CRC' })])
  })

  it('formatea colones sin decimales y otras monedas con su código; no mezcla monedas en el total', () => {
    expect(formatoMonto(12000, 'CRC')).toBe('₡12.000')
    expect(formatoMonto(20, 'USD')).toBe('20 USD')
    expect(totalesPendientes(leerReintegros(respuesta))).toEqual({ CRC: 12000, USD: 20 })
  })

  it('textos del estado', () => {
    expect(textoEstado('REINTEGRADO')).toBe('Reintegrado')
    expect(textoEstado('NO_REINTEGRADO')).toBe('No reintegrado')
  })
})

describe('Revisión HotClick (vista admin)', () => {
  it('describe el negocio con conteos y la cuenta, sin datos personales', () => {
    expect(metaRevision({ productosActivos: 3, cuentaOnvo: 'ACTIVA' })).toBe('3 productos activos · cuenta ONVO activa')
    expect(metaRevision({ productosActivos: 1, cuentaOnvo: 'ACTIVA' })).toBe('1 producto activo · cuenta ONVO activa')
    expect(metaRevision({ cuentaOnvo: 'EN_APROBACION' })).toBe('0 productos activos · cuenta ONVO sin activar')
  })
})
