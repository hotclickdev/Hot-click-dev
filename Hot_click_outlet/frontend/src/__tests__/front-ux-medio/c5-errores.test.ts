import { describe, expect, it } from 'vitest'
import { esCancelacionWebAuthn, mensajeAmigable } from '@/utils/mensajeAmigable'
import { mensajeErrorConfigOLocal } from '@/pages/admin/configuracion/configUi'
import { leer } from './helpers'

describe('C5: sin err.message crudo en pantalla', () => {
  it('errores JS/axios caen al texto amigable', () => {
    expect(mensajeAmigable(new Error('Network Error'), 'No pudimos.')).toBe('No pudimos.')
    expect(mensajeAmigable({ message: 'Request failed with status code 500', response: { data: {} } }, 'No pudimos.')).toBe('No pudimos.')
    expect(mensajeAmigable({ response: { data: { message: 'java.lang.NullPointerException' } } }, 'No pudimos.')).toBe('No pudimos.')
    expect(mensajeErrorConfigOLocal(new TypeError('Failed to fetch'), 'Falló el 2FA')).toBe('Falló el 2FA')
  })
  it('respeta el mensaje de usuario del backend', () => {
    expect(mensajeAmigable({ response: { data: { message: 'El código venció.' } } }, 'x')).toBe('El código venció.')
    expect(mensajeAmigable({ response: { data: { error: 'Llave ya registrada' } } }, 'x')).toBe('Llave ya registrada')
  })
  it('detecta cancelación de WebAuthn por name', () => {
    expect(esCancelacionWebAuthn({ name: 'NotAllowedError', message: 'The operation either timed out or was not allowed.' })).toBe(true)
    expect(esCancelacionWebAuthn(new Error('otra cosa'))).toBe(false)
  })
  it('WebAuthnStep, AdminWebAuthnSetup y configUi no leen e.message', () => {
    for (const f of ['components/auth/WebAuthnStep.tsx', 'components/admin/AdminWebAuthnSetup.tsx', 'pages/admin/configuracion/configUi.tsx']) {
      expect(leer(f), f).not.toMatch(/\be\.message\b|err\.message\b/)
    }
  })
})
