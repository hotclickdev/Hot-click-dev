import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_BORRADOR, borrarBorrador, guardarBorrador, leerBorrador } from './borradorCheckout'

const store = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
})

describe('borrador del checkout', () => {
  beforeEach(() => store.clear())
  it('ida y vuelta a login conserva los datos', () => {
    guardarBorrador({ nombre: 'Sofía', correo: 's@x.cr', provincia: 'San José' })
    expect(leerBorrador()).toEqual({ nombre: 'Sofía', correo: 's@x.cr', provincia: 'San José' })
  })
  it('ignora campos ajenos (nunca datos de pago)', () => {
    store.set(CLAVE_BORRADOR, JSON.stringify({ nombre: 'A', tarjeta: '4111', cvv: 1 }))
    expect(leerBorrador()).toEqual({ nombre: 'A' })
  })
  it('borrar y JSON roto', () => {
    guardarBorrador({ nombre: 'A' }); borrarBorrador()
    expect(leerBorrador()).toEqual({})
    store.set(CLAVE_BORRADOR, '{roto')
    expect(leerBorrador()).toEqual({})
  })
})
