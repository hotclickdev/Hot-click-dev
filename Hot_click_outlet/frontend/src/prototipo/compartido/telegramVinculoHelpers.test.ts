import { describe, expect, it } from 'vitest'
import {
  fechaVinculoCorta,
  mostrarUsername,
  parseEquipoTelegram,
  parseEstadoTelegram,
  parseLinkTelegram,
} from './telegramVinculoHelpers'

describe('parseEstadoTelegram', () => {
  it('marca no configurado si la respuesta viene vacía', () => {
    expect(parseEstadoTelegram(null)).toEqual({
      configurado: false,
      vinculado: false,
      telegramUsername: null,
      fechaVinculacion: null,
    })
  })

  it('lee vinculación activa', () => {
    const r = parseEstadoTelegram({
      configurado: true,
      vinculado: true,
      telegramUsername: 'ana_cr',
      fechaVinculacion: '2026-09-03',
    })
    expect(r.configurado).toBe(true)
    expect(r.vinculado).toBe(true)
    expect(r.telegramUsername).toBe('ana_cr')
  })
})

describe('parseLinkTelegram', () => {
  it('acepta deep link de t.me', () => {
    expect(parseLinkTelegram({ deepLink: 'https://t.me/hotclick_bot?start=ABC', expiraEnMin: 10 }))
      .toEqual({ deepLink: 'https://t.me/hotclick_bot?start=ABC', expiraEnMin: 10 })
  })

  it('rechaza un link que no es Telegram', () => {
    expect(parseLinkTelegram({ deepLink: 'https://ejemplo.com/x' })).toBeNull()
  })
})

describe('parseEquipoTelegram', () => {
  it('mapea miembros con @', () => {
    const r = parseEquipoTelegram([{ usuarioId: 4, nombre: 'Ana', telegramUsername: 'ana_cr' }])
    expect(r).toEqual([{ usuarioId: '4', nombre: 'Ana', detalle: '@ana_cr' }])
  })
})

describe('mostrarUsername y fecha', () => {
  it('agrega @ si falta', () => {
    expect(mostrarUsername('ana')).toBe('@ana')
    expect(mostrarUsername('@ana')).toBe('@ana')
    expect(mostrarUsername(null)).toBe('Telegram conectado')
  })

  it('formatea fecha válida', () => {
    expect(fechaVinculoCorta('2026-09-03T12:00:00')).toMatch(/2026/)
    expect(fechaVinculoCorta('no-es-fecha')).toBeNull()
  })
})
