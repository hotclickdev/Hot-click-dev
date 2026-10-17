import { describe, expect, it } from 'vitest'
import { PLAZO_POR_DEFINIR, etiquetaPaso, mensajeErrorReembolso, normalizarReembolso, textoActualizado, textoPlazo, totalSeleccion, validarSolicitud } from './reembolsoApi'

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

  it('#202: sin fechaLimite no se inventa el plazo; 501 y códigos traducidos', () => {
    expect(textoPlazo(null)).toBe(PLAZO_POR_DEFINIR)
    expect(textoPlazo('15-nov-2026')).toBe('podés pedirlo hasta el 15-nov-2026')
    expect(mensajeErrorReembolso({ response: { status: 501, data: { code: 'PENDIENTE_DECISION_DUENO' } } }, 'x')).toMatch(/^Todavía no disponible/)
    expect(mensajeErrorReembolso({ response: { status: 403, data: { code: 'SIN_ACCESO_PEDIDO' } } }, 'x')).toBe('Este pedido no está en tu cuenta.')
    expect(mensajeErrorReembolso(new Error('red'), 'respaldo')).toBe('respaldo')
  })
})
