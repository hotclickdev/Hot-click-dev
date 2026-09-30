import { describe, expect, it } from 'vitest'
import {
  crearReferenciaError, enlaceWhatsappSoporte, esFalloServidor, esRutaPanel, referenciaDelError,
} from './falloServidorHelpers'

describe('esFalloServidor', () => {
  it('detecta respuestas 5xx', () => {
    expect(esFalloServidor({ response: { status: 500 } })).toBe(true)
    expect(esFalloServidor({ response: { status: 503 } })).toBe(true)
  })

  it('ignora 4xx, errores de red y valores que no son errores HTTP', () => {
    expect(esFalloServidor({ response: { status: 404 } })).toBe(false)
    expect(esFalloServidor({ message: 'Network Error' })).toBe(false)
    expect(esFalloServidor(null)).toBe(false)
    expect(esFalloServidor('boom')).toBe(false)
  })
})

describe('referenciaDelError', () => {
  it('usa el X-Request-Id del backend cuando viene', () => {
    const error = { response: { status: 500, headers: { 'x-request-id': ' 3f9a0c21b7de ' } } }
    expect(referenciaDelError(error, () => 'local')).toBe('3f9a0c21b7de')
  })

  it('genera una local si no hay X-Request-Id', () => {
    expect(referenciaDelError({ response: { status: 502, headers: {} } }, () => 'local')).toBe('local')
    expect(referenciaDelError(new Error('render'), () => 'local')).toBe('local')
  })
})

describe('crearReferenciaError', () => {
  it('devuelve 8 caracteres hex', () => {
    expect(crearReferenciaError((n) => Uint8Array.from({ length: n }, (_, i) => [0xa4, 0xbe, 0xc1, 0x95][i]))).toBe('a4bec195')
    expect(crearReferenciaError()).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('enlaceWhatsappSoporte', () => {
  it('arma el enlace con el mensaje codificado', () => {
    expect(enlaceWhatsappSoporte('Ref: a b')).toBe('https://wa.me/50686667888?text=Ref%3A%20a%20b')
  })
})

describe('esRutaPanel', () => {
  it('reconoce los paneles', () => {
    expect(esRutaPanel('/admin')).toBe(true)
    expect(esRutaPanel('/admin/pedidos')).toBe(true)
    expect(esRutaPanel('/pos/pago/abc')).toBe(true)
  })

  it('deja al comprador fuera de los paneles', () => {
    expect(esRutaPanel('/')).toBe(false)
    expect(esRutaPanel('/productos/12')).toBe(false)
    expect(esRutaPanel('/tienda/casa-luna')).toBe(false)
    expect(esRutaPanel('/administracion-falsa')).toBe(false)
  })
})
