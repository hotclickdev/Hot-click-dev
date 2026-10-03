import { describe, expect, it } from 'vitest'
import { pasoDesdeQuery, pasoMaximoCheckout, type DatosPasos } from './pasosCheckoutHelpers'

const validadores = {
  telefono: (v: string) => (/^\+?\d{8,11}$/.test(v.replace(/\D/g, '')) ? '' : 'tel'),
  correo: (v: string) => (v.includes('@') ? '' : 'correo'),
  direccion: (v: string) => (v.trim().length >= 10 ? '' : 'dir'),
}

const base: DatosPasos = {
  conSesion: false,
  necesitaDireccion: true,
  requiereEntrega: true,
  telefono: '',
  guestEmail: 'ana@example.com',
  guestPhone: '88881234',
  nombre: 'Ana',
  direccion: 'Barrio Escalante, casa 12',
  provincia: 'San José',
  canton: 'Escazú',
}

describe('pasoDesdeQuery (R3)', () => {
  it('acepta 1, 2 o 3; lo demás es el 1', () => {
    expect(pasoDesdeQuery('2')).toBe(2)
    expect(pasoDesdeQuery('3')).toBe(3)
    expect(pasoDesdeQuery(null)).toBe(1)
    expect(pasoDesdeQuery('9')).toBe(1)
    expect(pasoDesdeQuery('2.5')).toBe(1)
    expect(pasoDesdeQuery('abc')).toBe(1)
  })
})

describe('pasoMaximoCheckout (R3)', () => {
  it('con todo completo se llega al pago', () => {
    expect(pasoMaximoCheckout(base, validadores)).toBe(3)
  })
  it('sin datos de contacto se queda en el paso 1', () => {
    expect(pasoMaximoCheckout({ ...base, guestEmail: '' }, validadores)).toBe(1)
    expect(pasoMaximoCheckout({ ...base, nombre: ' ' }, validadores)).toBe(1)
  })
  it('sin dirección se queda en la entrega', () => {
    expect(pasoMaximoCheckout({ ...base, direccion: '' }, validadores)).toBe(2)
    expect(pasoMaximoCheckout({ ...base, canton: '' }, validadores)).toBe(2)
  })
  it('retiro en tienda no pide teléfono ni dirección', () => {
    expect(pasoMaximoCheckout({ ...base, necesitaDireccion: false, requiereEntrega: false, guestPhone: '', direccion: '' }, validadores)).toBe(3)
  })
  it('con sesión solo pide teléfono si hay envío', () => {
    expect(pasoMaximoCheckout({ ...base, conSesion: true, telefono: '' }, validadores)).toBe(1)
    expect(pasoMaximoCheckout({ ...base, conSesion: true, telefono: '+50688881234' }, validadores)).toBe(3)
  })
})
