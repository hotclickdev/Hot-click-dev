import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: () => null,
  length: 0,
})

const { BarraCookies } = await import('./CookieBanner')
const { BOTTOM_BANNER_COOKIES } = await import('./cookies/posicionBannerCookies')
const { COOKIE_CONSENT_KEY, consentDesdeCategorias, getCookieConsent, setCookieConsent } = await import('@/utils/cookieConsent')

function render() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BarraCookies, { onConfigurar: () => {}, onAceptarTodo: () => {} })))
}

describe('banner de cookies compacto (boceto 14)', () => {
  it('es una región con 2 botones, ninguno rojo', () => {
    const html = render()
    expect(html).toContain('<section aria-label=')
    expect(html.match(/<button/g)).toHaveLength(2)
    expect(html).not.toMatch(/red|hc-accent/)
    expect(html).toContain('bg-hc-n-900')
    expect(html).toContain('href="/cookies"')
  })

  it('«Solo esenciales» no está en la barra (vive en la hoja)', () => {
    expect(render()).not.toMatch(/Solo esenciales|Rechazar/)
  })

  it('se apila encima de la barra inferior o del dock, con safe-area', () => {
    expect(BOTTOM_BANNER_COOKIES).toContain('75px')
    expect(BOTTOM_BANNER_COOKIES).toContain('var(--hc-dock-alto')
    expect(BOTTOM_BANNER_COOKIES).toContain('safe-area-inset-bottom')
  })

  it('solo esenciales se guarda sin análisis ni publicidad, así ningún init carga scripts', () => {
    setCookieConsent(consentDesdeCategorias(false, false))
    expect(store.has(COOKIE_CONSENT_KEY)).toBe(true)
    expect(getCookieConsent()).toMatchObject({ analytics: false, advertising: false, functional: true })
  })
})
