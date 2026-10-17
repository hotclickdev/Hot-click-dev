import { describe, expect, it } from 'vitest'
import { etiquetaPaso, normalizarReembolso, textoActualizado, totalSeleccion, validarSolicitud } from './reembolsoApi'

describe('S5-21 pedir reembolso', () => {
  it('motivo obligatorio y al menos un producto', () => {
    expect(validarSolicitud([], null)).toEqual({ items: 'Elegí al menos un producto.', motivo: 'Elegí un motivo para seguir.' })
    expect(validarSolicitud(['1'], 'NO_LLEGO')).toEqual({})
  })
  it('suma solo lo elegido, con montos del backend', () => {
    expect(totalSeleccion([{ id: '1', monto: 10 }, { id: '2', monto: 5 }], ['2'])).toBe(5)
  })
  it('«Actualizado hace N min»', () => {
    const ahora = Date.parse('2026-11-16T10:05:00Z')
    expect(textoActualizado('2026-11-16T10:00:00Z', ahora)).toBe('Actualizado hace 5 min')
    expect(textoActualizado(null)).toBeNull()
  })
  it('normaliza la solicitud con los 4 pasos', () => {
    const d = normalizarReembolso({ data: { tienda: 'Sofi', items: [], solicitud: { monto: 1, pasos: [{ clave: 'ENVIADA', fecha: '16-nov' }] } } })
    expect(d.solicitud?.pasos.map((p) => p.clave)).toEqual(['ENVIADA', 'APROBADA', 'EN_PROCESO', 'ACREDITADO'])
    expect(d.solicitud?.fechaEstimada).toBeNull()
    expect(etiquetaPaso('APROBADA', 'Sofi')).toBe('Aprobada por Sofi')
  })
})
