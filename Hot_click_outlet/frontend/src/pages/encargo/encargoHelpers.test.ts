import { describe, expect, it } from 'vitest'
import type { Encargo } from '@/services/encargoService'
import { fechaHoraEncargo, pasosDelEncargo, referenciasDelEncargo } from './encargoHelpers'

const base: Encargo = { id: 214, nombreCliente: 'María', email: 'm@x.cr', modoPrecio: 'FIJO', estado: 'PENDIENTE', tokenPublico: 't', fechaCreacion: '2026-09-22T10:14:00' }
const precio = (n: number) => `₡${n}`
const estados = (e: Partial<Encargo>) => pasosDelEncargo({ ...base, ...e }, precio).map((p) => `${p.clave}:${p.estado}`)

describe('línea de tiempo del encargo', () => {
  it('pendiente: recibida y cotización en curso', () => {
    expect(estados({})).toEqual(['recibida:hecho', 'cotizacion:actual'])
  })

  it('aprobado: espera el pago, sin inventar pasos hechos', () => {
    expect(estados({ estado: 'APROBADO', precioCotizado: 11000 })).toEqual([
      'recibida:hecho', 'cotizacion:hecho', 'pago:actual', 'produccion:pendiente', 'listo:pendiente',
    ])
  })

  it('pagado: la producción avanza según el estado de fulfillment', () => {
    const pagado = { estado: 'PAGADO', precioCotizado: 11000 }
    expect(estados({ ...pagado, estadoFulfillment: 'EN_PRODUCCION' })).toContain('produccion:actual')
    expect(estados({ ...pagado, estadoFulfillment: 'LISTO' }).slice(-2)).toEqual(['produccion:hecho', 'listo:actual'])
    expect(estados({ ...pagado, estadoFulfillment: 'ENTREGADO' }).slice(-1)).toEqual(['listo:hecho'])
  })

  it('rechazado y vencido terminan con un paso de error', () => {
    expect(estados({ estado: 'RECHAZADO', motivoRechazo: 'No hacemos ese diseño' })).toEqual(['recibida:hecho', 'rechazado:error'])
    expect(estados({ estado: 'VENCIDO', precioCotizado: 11000 }).slice(-1)).toEqual(['vencido:error'])
  })

  it('muestra solo los datos que entrega el backend', () => {
    const pasos = pasosDelEncargo({ ...base, estado: 'APROBADO', precioCotizado: 11000 }, precio)
    expect(pasos[0].detalle).toBe('22 sep · 10:14')
    expect(pasos[1].detalle).toBe('₡11000')
    expect(pasos.find((p) => p.clave === 'produccion')?.detalle).toBeUndefined()
  })
})

describe('datos del encargo', () => {
  it('fecha y hora corta; vacía si no hay fecha', () => {
    expect(fechaHoraEncargo('2026-09-22T10:14:00')).toBe('22 sep · 10:14')
    expect(fechaHoraEncargo(undefined)).toBe('')
  })

  it('junta las fotos de referencia que existen', () => {
    expect(referenciasDelEncargo({ ...base, imagenUrl1: 'a', imagenUrl3: 'c' })).toEqual(['a', 'c'])
  })
})
