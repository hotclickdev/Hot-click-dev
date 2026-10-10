import { afterEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: () => null,
  length: 0,
})

const {
  COOKIE_CONSENT_KEY,
  VIGENCIA_CONSENTIMIENTO_MS,
  consentDesdeCategorias,
  getCookieConsent,
  parseCookieConsent,
  setCookieConsent,
} = await import('./cookieConsent')

afterEach(() => {
  store.clear()
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

  it('publicidad siempre queda en false (sin Meta Pixel), aunque el consentimiento viejo la traiga', () => {
    const parsed = parseCookieConsent(JSON.stringify({
      analytics: true,
      functional: true,
      timestamp: 10,
    }))
    expect(parsed?.advertising).toBe(false)
    expect(parseCookieConsent(JSON.stringify({ analytics: true, advertising: true }))?.advertising).toBe(false)
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
    setCookieConsent(consentDesdeCategorias(false, false))
    expect(getCookieConsent()).toMatchObject({ analytics: false, advertising: false, functional: true })
    expect(store.get(COOKIE_CONSENT_KEY)).toBeTruthy()
  })
})
