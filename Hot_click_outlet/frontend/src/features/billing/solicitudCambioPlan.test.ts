import { describe, expect, it } from 'vitest'
import { esRequiereSolicitud, motivoSolicitudValido, requiereSolicitud, solicitudesDe } from './solicitudCambioPlan'

describe('solicitud de cambio de plan', () => {
  it('bajar de Negocio Plus a Pyme va por solicitud', () => {
    expect(requiereSolicitud('NEGOCIO_PLUS', 'PYME')).toBe(true)
  })
  it('bajar de un plan pagado a Emprendedor también va por solicitud', () => {
    expect(requiereSolicitud('NEGOCIO_PLUS', 'EMPRENDEDOR')).toBe(true)
    expect(requiereSolicitud('PYME', 'EMPRENDEDOR')).toBe(true)
  })
  it('subir, o elegir plan sin uno de pago vigente, no va por solicitud', () => {
    expect(requiereSolicitud('PYME', 'NEGOCIO_PLUS')).toBe(false)
    expect(requiereSolicitud('EMPRENDEDOR', 'PYME')).toBe(false)
    expect(requiereSolicitud(null, 'PYME')).toBe(false)
  })
  it('valida el motivo', () => {
    expect(motivoSolicitudValido('  abc ')).toBe(false)
    expect(motivoSolicitudValido('Me sobra el plan')).toBe(true)
    expect(motivoSolicitudValido('x'.repeat(501))).toBe(false)
  })
  it('detecta el 422 del backend', () => {
    expect(esRequiereSolicitud({ response: { status: 422, data: { codigo: 'CAMBIO_PLAN_REQUIERE_SOLICITUD' } } })).toBe(true)
    expect(esRequiereSolicitud({ response: { status: 409, data: { codigo: 'CAMBIO_PLAN_REQUIERE_SOLICITUD' } } })).toBe(false)
    expect(esRequiereSolicitud(new Error('x'))).toBe(false)
  })
  it('lee la lista del admin', () => {
    expect(solicitudesDe({ data: [{ id: 1 }, { nope: 1 }] })).toHaveLength(1)
    expect(solicitudesDe(null)).toEqual([])
  })
})
