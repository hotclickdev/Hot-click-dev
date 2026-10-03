import { describe, expect, it } from 'vitest'
import { contactoVisible, direccionRetiro, horaCorta, horarioRetiro, inicialesNegocio, mesAnioCorto, urlInstagram } from './tiendaHelpers'

describe('inicialesNegocio', () => {
  it('toma las dos primeras palabras que empiezan con letra', () => {
    expect(inicialesNegocio('Casa Luna 506')).toBe('CL')
    expect(inicialesNegocio('Bruma Café')).toBe('BC')
    expect(inicialesNegocio('Taller')).toBe('T')
  })

  it('cae a los dos primeros caracteres si no hay palabras con letra', () => {
    expect(inicialesNegocio('506')).toBe('50')
    expect(inicialesNegocio('  ')).toBe('?')
  })
})

describe('mesAnioCorto', () => {
  it('formatea como el Figma ("sept. 2026")', () => {
    expect(mesAnioCorto('2026-09-14')).toBe('sept. 2026')
    expect(mesAnioCorto('2026-01-02T10:00:00')).toBe('ene. 2026')
  })

  it('devuelve null si no hay fecha válida', () => {
    expect(mesAnioCorto(null)).toBeNull()
    expect(mesAnioCorto('no-es-fecha')).toBeNull()
  })
})

describe('retiro', () => {
  it('quita los ceros y segundos de la hora', () => {
    expect(horaCorta('09:00:00')).toBe('9:00')
    expect(horaCorta('18:30')).toBe('18:30')
    expect(horaCorta(undefined)).toBe('')
  })

  it('arma el horario solo si están apertura y cierre', () => {
    expect(horarioRetiro({ horarioApertura: '09:00:00', horarioCierre: '18:00:00' })).toBe('9:00 a 18:00')
    expect(horarioRetiro({ horarioApertura: '09:00:00' })).toBe('')
  })

  it('une la dirección sin partes vacías', () => {
    expect(direccionRetiro({ direccion: 'Barrio Escalante', canton: '', provincia: 'San José' })).toBe('Barrio Escalante, San José')
  })
})

describe('urlInstagram', () => {
  it('acepta el usuario con o sin arroba', () => {
    expect(urlInstagram('@casaluna506')).toBe('https://instagram.com/casaluna506')
    expect(urlInstagram('casaluna506')).toBe('https://instagram.com/casaluna506')
  })
})

describe('contactoVisible (regla: contacto directo solo con plan PYME o NEGOCIO_PLUS)', () => {
  const datos = { whatsapp: '+506 8888-0506', instagram: ' @casaluna506 ' }

  it('con contactoDirecto del backend devuelve WhatsApp en dígitos e Instagram', () => {
    expect(contactoVisible({ ...datos, contactoDirecto: true })).toEqual({ whatsapp: '50688880506', instagram: '@casaluna506' })
  })

  it('emprendedor (false) o sin la marca: no hay contacto aunque llegue el dato', () => {
    expect(contactoVisible({ ...datos, contactoDirecto: false })).toEqual({ whatsapp: '', instagram: '' })
    expect(contactoVisible(datos)).toEqual({ whatsapp: '', instagram: '' })
    expect(contactoVisible(null)).toEqual({ whatsapp: '', instagram: '' })
  })

  it('plan pago sin datos: vacío', () => {
    expect(contactoVisible({ contactoDirecto: true, whatsapp: null, instagram: '' })).toEqual({ whatsapp: '', instagram: '' })
  })
})
