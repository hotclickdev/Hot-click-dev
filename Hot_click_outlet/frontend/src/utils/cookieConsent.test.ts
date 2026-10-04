import { afterEach, describe, expect, it } from 'vitest'
import {
  COOKIE_CONSENT_KEY,
  VIGENCIA_CONSENTIMIENTO_MS,
  consentDesdeCategorias,
  getCookieConsent,
  parseCookieConsent,
  setCookieConsent,
} from './cookieConsent'

afterEach(() => {
  localStorage.removeItem(COOKIE_CONSENT_KEY)
})

describe('parseCookieConsent', () => {
  it('lee el formato nuevo con publicidad aparte', () => {
    const parsed = parseCookieConsent(JSON.stringify({
      analytics: true,
      advertising: false,
      functional: true,
      timestamp: 1,
    }))
    expect(parsed).toEqual({
      analytics: true,
      advertising: false,
      functional: true,
      timestamp: 1,
    })
  })

  it('si el consentimiento viejo no trae publicidad, usa el valor de análisis', () => {
    const parsed = parseCookieConsent(JSON.stringify({
      analytics: true,
      functional: true,
      timestamp: 10,
    }))
    expect(parsed?.advertising).toBe(true)
  })

  it('rechaza JSON inválido o sin análisis', () => {
    expect(parseCookieConsent('{')).toBeNull()
    expect(parseCookieConsent(JSON.stringify({ functional: true }))).toBeNull()
  })
})

describe('getCookieConsent', () => {
  it('devuelve null si venció el año', () => {
    setCookieConsent({
      ...consentDesdeCategorias(true, true),
      timestamp: Date.now() - VIGENCIA_CONSENTIMIENTO_MS - 1,
    })
    expect(getCookieConsent()).toBeNull()
  })

  it('guarda y lee el consentimiento vigente', () => {
    const value = consentDesdeCategorias(false, false)
    setCookieConsent(value)
    expect(getCookieConsent()).toMatchObject({ analytics: false, advertising: false, functional: true })
  })
})
