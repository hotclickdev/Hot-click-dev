import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  setUser: vi.fn(),
  setTag: vi.fn(),
}))

import * as Sentry from '@sentry/react'
import type { ErrorEvent } from '@sentry/react'
import { depurarPii, initSentry, redactarTexto } from './sentryClient'

describe('initSentry', () => {
  beforeEach(() => vi.mocked(Sentry.init).mockClear())

  it('sin DSN no inicializa', () => {
    expect(initSentry(undefined)).toBe(false)
    expect(initSentry('')).toBe(false)
    expect(initSentry('   ')).toBe(false)
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('con DSN inicializa con sendDefaultPii apagado', () => {
    expect(initSentry('https://clave@example.invalid/1')).toBe(true)
    const opts = vi.mocked(Sentry.init).mock.calls[0][0]!
    expect(opts.sendDefaultPii).toBe(false)
    expect(typeof opts.beforeSend).toBe('function')
  })
})

describe('depurarPii', () => {
  it('redacta correo, cédula y teléfono', () => {
    expect(redactarTexto('a ana@x.com c 1-1234-5678 t +506 8888-8888 j 3101123456')).toBe(
      'a [correo] c [cedula] t [telefono] j [cedula]',
    )
  })

  it('tapa tokens Bearer, de bot, Slack y JWT en texto libre', () => {
    const relleno = 'A'.repeat(35)
    expect(redactarTexto('Authorization: ' + 'Bear' + 'er ' + 'x'.repeat(12))).toBe('Authorization: Bearer [token]')
    expect(redactarTexto('bot 123456789:' + relleno + ' falló')).toBe('bot [token] falló')
    expect(redactarTexto('slack ' + 'xox' + 'b-0000000000-ficticio')).toBe('slack [token]')
    expect(redactarTexto('jwt ' + 'eyJ' + 'hbGc.eyJzdWIi.firma_falsa')).toBe('jwt [token]')
    const ev = depurarPii({ message: 'fallo con ' + 'bear' + 'er ' + 'y'.repeat(8) } as unknown as ErrorEvent)
    expect(ev?.message).toBe('fallo con Bearer [token]')
  })

  it('quita headers, cookies, cuerpo, query y datos de usuario', () => {
    const ev = {
      message: 'falló para ana@x.com',
      user: { id: 7, email: 'ana@x.com', ip_address: '1.2.3.4' },
      request: {
        url: 'https://h/api/x?correo=ana@x.com',
        headers: { Authorization: 'Bearer abc' },
        cookies: { sesion: 'x' },
        data: { telefono: '88888888' },
        query_string: 'correo=ana@x.com',
      },
      exception: { values: [{ value: 'cedula 112345678' }] },
      breadcrumbs: [{ message: 'tel 8888 8888', data: { correo: 'ana@x.com' } }],
      extra: { body: { email: 'ana@x.com' } },
      tags: { t: 'ana@x.com' },
    } as unknown as ErrorEvent
    const r = depurarPii(ev)!
    const json = JSON.stringify(r)
    expect(json).not.toContain('ana@x.com')
    expect(json).not.toContain('Bearer')
    expect(json).not.toContain('88888888')
    expect(json).not.toContain('112345678')
    expect(json).not.toContain('1.2.3.4')
    expect(r.user).toEqual({ id: '7' })
    expect(r.request?.headers).toBeUndefined()
    expect(r.request?.cookies).toBeUndefined()
    expect(r.request?.data).toBeUndefined()
    expect(r.request?.url).toBe('https://h/api/x')
  })
})

describe('redactarTexto credenciales adicionales', () => {
  it('tapa el token de bot dentro de la URL de Telegram', () => {
    const token = '123456789:' + 'A'.repeat(35)
    const url = 'https://api.telegram.org/' + 'bot' + token + '/sendMessage'
    const out = redactarTexto('POST ' + url)
    expect(out).toBe('POST https://api.telegram.org/bot[token]/sendMessage')
    expect(out).not.toContain(token)
  })
  it('tapa Basic auth', () => {
    expect(redactarTexto('Authorization: ' + 'Bas' + 'ic ' + 'dXN1YXJpbzpjbGF2ZQ' + '==')).toBe('Authorization: Basic [token]')
  })
  it('tapa claves sk_/pk_', () => {
    const relleno = '0'.repeat(24)
    expect(redactarTexto('k ' + 'sk' + '_live_' + relleno)).toBe('k [token]')
    expect(redactarTexto('k ' + 'sk' + '_test_' + relleno)).toBe('k [token]')
    expect(redactarTexto('k ' + 'pk' + '_live_' + relleno)).toBe('k [token]')
  })
  it('tapa tokens ghp_ de GitHub', () => {
    expect(redactarTexto('gh ' + 'gh' + 'p_' + 'Z'.repeat(36))).toBe('gh [token]')
  })
  it('tapa AKIA de AWS', () => {
    expect(redactarTexto('aws ' + 'AK' + 'IA' + 'X'.repeat(16) + ' fin')).toBe('aws [token] fin')
  })
})
