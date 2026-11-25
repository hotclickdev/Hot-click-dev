import { describe, expect, it } from 'vitest'
import { aPedido, cambiarDia, errorDeConfig, indiceSiguiente, mensajeDeError, pinValido } from './botHelpers'
import type { ConfigBot } from './botTypes'

const config: ConfigBot = {
  nombreBot: 'Tina',
  trato: 'USTED',
  emojis: false,
  activo: true,
  horarioActivo: true,
  horario: [
    { dia: 'LUNES', abierto: true, desde: '08:00', hasta: '17:00' },
    { dia: 'MARTES', abierto: false, desde: '08:00', hasta: '17:00' },
  ],
  mensajeFueraHorario: null,
  zona: 'America/Costa_Rica',
}

describe('botHelpers', () => {
  it('acepta una configuración válida y la manda sin la zona', () => {
    const p = aPedido(config)
    expect(errorDeConfig(p)).toBeNull()
    expect('zona' in p).toBe(false)
  })

  it('rechaza nombre vacío, con símbolos o muy largo', () => {
    expect(errorDeConfig({ ...aPedido(config), nombreBot: '  ' })).toBe('bot.config.errorNombre')
    expect(errorDeConfig({ ...aPedido(config), nombreBot: '<b>Tina</b>' })).toBe('bot.config.errorNombre')
    expect(errorDeConfig({ ...aPedido(config), nombreBot: 'x'.repeat(61) })).toBe('bot.config.errorNombre')
  })

  it('rechaza un día abierto con cierre antes de la apertura, pero solo si hay horario activo', () => {
    const mal = [{ dia: 'LUNES' as const, abierto: true, desde: '17:00', hasta: '08:00' }]
    expect(errorDeConfig({ ...aPedido(config), horario: mal })).toBe('bot.config.errorHorario')
    expect(errorDeConfig({ ...aPedido(config), horario: mal, horarioActivo: false })).toBeNull()
  })

  it('rechaza un mensaje fuera de horario de más de 500 caracteres', () => {
    expect(errorDeConfig({ ...aPedido(config), mensajeFueraHorario: 'x'.repeat(501) })).toBe('bot.config.errorMensaje')
  })

  it('cambia solo el día indicado', () => {
    const h = cambiarDia(config.horario, 'MARTES', { abierto: true })
    expect(h[0].abierto).toBe(true)
    expect(h[1].abierto).toBe(true)
    expect(config.horario[1].abierto).toBe(false)
  })

  it('el PIN lleva de 4 a 6 números', () => {
    expect(pinValido('1234')).toBe(true)
    expect(pinValido('123456')).toBe(true)
    expect(pinValido('123')).toBe(false)
    expect(pinValido('1234567')).toBe(false)
    expect(pinValido('12a4')).toBe(false)
  })

  it('las flechas recorren las pestañas en círculo', () => {
    expect(indiceSiguiente(5, 'ArrowRight', 6)).toBe(0)
    expect(indiceSiguiente(0, 'ArrowLeft', 6)).toBe(5)
    expect(indiceSiguiente(2, 'Home', 6)).toBe(0)
    expect(indiceSiguiente(2, 'End', 6)).toBe(5)
    expect(indiceSiguiente(2, 'a', 6)).toBeNull()
  })

  it('muestra el mensaje del servidor solo en errores de negocio', () => {
    expect(mensajeDeError({ response: { status: 429, data: { message: 'Muchas pruebas' } } }, 'x')).toBe('Muchas pruebas')
    expect(mensajeDeError({ response: { status: 500, data: { message: 'SQL roto' } } }, 'genérico')).toBe('genérico')
    expect(mensajeDeError(null, 'genérico')).toBe('genérico')
  })
})
