import { describe, expect, it } from 'vitest'
import { anchoBarra, errorDeRango, pasosEmbudo, rangoPorDefecto, aPedido, cambiarDia, cupoAgotado, porcentajeCupo, errorDeConfig, indiceSiguiente, mensajeDeError, pinValido, PESTANAS, PESTANAS_PLATAFORMA } from './botHelpers'
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

  it('calcula el porcentaje del cupo y cuándo se agotó', () => {
    expect(porcentajeCupo(50, 100)).toBe(50)
    expect(porcentajeCupo(150, 100)).toBe(100)
    expect(porcentajeCupo(5, -1)).toBeNull()
    expect(porcentajeCupo(5, null)).toBeNull()
    expect(cupoAgotado(100, 100)).toBe(true)
    expect(cupoAgotado(99, 100)).toBe(false)
    expect(cupoAgotado(999, -1)).toBe(false)
    expect(cupoAgotado(999, null)).toBe(false)
  })
})

describe('métricas del bot: ayudas', () => {
  it('el rango por defecto son los últimos 30 días', () => {
    expect(rangoPorDefecto(new Date(2026, 11, 10))).toEqual({ desde: '2026-11-11', hasta: '2026-12-10' })
  })

  it('valida el rango igual que el servidor', () => {
    expect(errorDeRango('2026-12-01', '2026-12-10')).toBeNull()
    expect(errorDeRango('', '2026-12-10')).toBe('bot.metricas.rangoIncompleto')
    expect(errorDeRango('2026-12-10', '2026-12-01')).toBe('bot.metricas.rangoInvalido')
    expect(errorDeRango('2025-01-01', '2026-12-10')).toBe('bot.metricas.rangoLargo')
  })

  it('las barras del embudo son proporcionales al paso más grande', () => {
    expect(anchoBarra(5, 10)).toBe(50)
    expect(anchoBarra(0, 10)).toBe(0)
    expect(anchoBarra(1, 1000)).toBe(2)
    expect(anchoBarra(3, 0)).toBe(0)
    expect(pasosEmbudo({ conversaciones: 4, enlacesCreados: 3, enlacesAbiertos: 2, enlacesPagados: 1 }).map((p) => p.valor))
      .toEqual([4, 3, 2, 1])
  })
})

describe('pestañas del bot en la consola de plataforma', () => {
  it('solo ofrece las que la API permite al ADMIN sin negocio', () => {
    expect(PESTANAS_PLATAFORMA).toEqual(['conocimiento', 'canales', 'leads', 'metricas'])
    for (const p of PESTANAS_PLATAFORMA) expect(PESTANAS).toContain(p)
    for (const p of ['config', 'equipo', 'simulador', 'campanas'] as const) expect(PESTANAS_PLATAFORMA).not.toContain(p)
  })
})
