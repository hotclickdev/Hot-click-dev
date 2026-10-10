import { describe, expect, it, vi } from 'vitest'

vi.stubEnv('VITE_META_PIXEL_ID', '1234567890')

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: () => null,
  length: 0,
})
const insertados: string[] = []
const elemento = () => ({ set src(v: string) { insertados.push(v) }, setAttribute() {}, appendChild() {}, style: {} })
vi.stubGlobal('document', {
  cookie: '',
  getElementById: () => null,
  createElement: elemento,
  head: { appendChild() {} },
  body: { appendChild() {} },
  querySelector: () => null,
  getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
})

const { consentDesdeCategorias, setCookieConsent, getCookieConsent } = await import('@/utils/cookieConsent')
const { initAnalytics } = await import('@/utils/initAnalytics')
const metaPixel = await import('@/utils/metaPixel')

describe('Meta Pixel apagado (sin publicidad)', () => {
  it('«Aceptar todas» guarda publicidad en false y no inyecta fbevents.js, aun con VITE_META_PIXEL_ID', () => {
    setCookieConsent(consentDesdeCategorias(true, true))
    expect(getCookieConsent()).toMatchObject({ analytics: true, advertising: false })
    initAnalytics()
    expect(insertados.some((s) => s.includes('facebook'))).toBe(false)
    expect((globalThis as { fbq?: unknown }).fbq).toBeUndefined()
  })

  it('el módulo no expone loader ni init', () => {
    expect(metaPixel.META_PIXEL_HABILITADO).toBe(false)
    expect('initMetaPixel' in metaPixel).toBe(false)
    expect(metaPixel.readMetaCookies()).toEqual({})
  })
})
