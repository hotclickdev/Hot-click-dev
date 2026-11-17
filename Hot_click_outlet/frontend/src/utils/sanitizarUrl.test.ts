import { describe, expect, it } from 'vitest'
import {
  llevaTokenInvitacion,
  sanitizarEventoSentry,
  sanitizarPath,
  sanitizarUrl,
  ubicacionSegura,
} from './sanitizarUrl'
import { conUbicacionSegura } from './ga4'
import { sanitizarCapturaPosthog } from './posthog'
import { beforeSendTransaction, depurarPii, type TransactionEvent } from './sentryClient'
import type { ErrorEvent } from '@sentry/react'

const TOK = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-ab'

describe('sanitizarUrl / sanitizarPath', () => {
  it('quita el hash (#t=) siempre', () => {
    expect(sanitizarUrl(`https://hotclick.lat/equipo/invitacion#t=${TOK}`)).toBe('https://hotclick.lat/equipo/invitacion')
    expect(sanitizarUrl(`/productos?x=1#t=${TOK}`)).toBe('/productos?x=1')
  })

  it('enmascara el token en el path viejo de la SPA y descarta la query de invitación', () => {
    expect(sanitizarUrl(`/equipo/invitacion/${TOK}`)).toBe('/equipo/invitacion')
    expect(sanitizarUrl(`https://hotclick.lat/equipo/invitacion/${TOK}?t=${TOK}`)).toBe('https://hotclick.lat/equipo/invitacion')
    expect(sanitizarUrl(`/equipo/invitacion?token=${TOK}`)).toBe('/equipo/invitacion')
  })

  it('enmascara el token en las APIs viejas y no toca las nuevas', () => {
    expect(sanitizarPath(`/api/auth/equipo-invitacion/${TOK}`)).toBe('/api/auth/equipo-invitacion/[token]')
    expect(sanitizarPath(`/api/auth/equipo-invitacion/${TOK}/aceptar-cuenta-nueva`)).toBe('/api/auth/equipo-invitacion/[token]/aceptar-cuenta-nueva')
    expect(sanitizarPath(`/api/equipo-invitaciones/${TOK}/aceptar`)).toBe('/api/equipo-invitaciones/[token]/aceptar')
    expect(sanitizarPath('/api/auth/equipo-invitacion/consultar')).toBe('/api/auth/equipo-invitacion/consultar')
    expect(sanitizarPath('/api/auth/equipo-invitacion/aceptar-cuenta-nueva')).toBe('/api/auth/equipo-invitacion/aceptar-cuenta-nueva')
    expect(sanitizarPath('/api/equipo-invitaciones/aceptar')).toBe('/api/equipo-invitaciones/aceptar')
  })

  it('no altera rutas normales (conserva la query)', () => {
    expect(sanitizarUrl('/productos?categoria=3&t=ok')).toBe('/productos?categoria=3&t=ok')
    expect(sanitizarUrl('/')).toBe('/')
  })

  it('ubicacionSegura devuelve page_path y page_location sin token ni hash', () => {
    const u = ubicacionSegura({
      pathname: `/equipo/invitacion/${TOK}`, search: `?t=${TOK}`,
      href: `https://hotclick.lat/equipo/invitacion/${TOK}?t=${TOK}#t=${TOK}`,
    })
    expect(u).toEqual({ page_path: '/equipo/invitacion', page_location: 'https://hotclick.lat/equipo/invitacion' })
  })

  it('llevaTokenInvitacion detecta path viejo, query y hash', () => {
    expect(llevaTokenInvitacion(`https://x.y/equipo/invitacion/${TOK}`)).toBe(true)
    expect(llevaTokenInvitacion(`https://x.y/equipo/invitacion#t=${TOK}`)).toBe(true)
    expect(llevaTokenInvitacion(`https://x.y/equipo/invitacion?token=${TOK}`)).toBe(true)
    expect(llevaTokenInvitacion('https://x.y/equipo/invitacion')).toBe(false)
    expect(llevaTokenInvitacion('https://x.y/productos?t=1')).toBe(false)
  })
})

describe('GA4: page_path Y page_location sanitizados', () => {
  it('config y event reciben ambos; otros comandos pasan igual', () => {
    const g = globalThis as unknown as { location?: unknown }
    const antes = g.location
    g.location = { pathname: `/equipo/invitacion/${TOK}`, search: '', href: `https://hotclick.lat/equipo/invitacion/${TOK}#t=${TOK}` }
    try {
      const ev = conUbicacionSegura(['event', 'add_to_cart', { value: 1 }])[2] as Record<string, unknown>
      expect(ev.page_location).toBe('https://hotclick.lat/equipo/invitacion')
      expect(ev.page_path).toBe('/equipo/invitacion')
      expect(ev.value).toBe(1)
      const cfg = conUbicacionSegura(['config', 'G-X', { send_page_view: false }])[2] as Record<string, unknown>
      expect(cfg.page_location).toBe('https://hotclick.lat/equipo/invitacion')
      const pv = conUbicacionSegura(['event', 'page_view', { page_path: `/equipo/invitacion/${TOK}`, page_location: `https://hotclick.lat/equipo/invitacion#t=${TOK}` }])[2] as Record<string, unknown>
      expect(JSON.stringify(pv)).not.toContain(TOK)
      const js = ['js', new Date(0)]
      expect(conUbicacionSegura(js)).toBe(js)
    } finally {
      g.location = antes
    }
  })
})

describe('PostHog: $current_url y el pageview', () => {
  it('limpia $current_url, $pathname y referrers', () => {
    const cp = sanitizarCapturaPosthog({
      event: '$pageview',
      properties: {
        $current_url: `https://hotclick.lat/equipo/invitacion#t=${TOK}`,
        $pathname: `/equipo/invitacion/${TOK}`,
        $referrer: `https://hotclick.lat/equipo/invitacion/${TOK}`,
        otra: 'x',
      },
    })
    expect(JSON.stringify(cp)).not.toContain(TOK)
    expect(cp.properties.$current_url).toBe('https://hotclick.lat/equipo/invitacion')
    expect(cp.properties.otra).toBe('x')
    expect(sanitizarCapturaPosthog(null)).toBeNull()
  })
})

describe('Sentry del navegador: beforeSend, beforeSendTransaction y spans XHR', () => {
  it('sanitizarEventoSentry limpia request.url, transacción, spans y breadcrumbs', () => {
    const ev = sanitizarEventoSentry({
      request: { url: `https://hotclick.lat/equipo/invitacion/${TOK}?t=${TOK}#t=${TOK}` },
      transaction: `/equipo/invitacion/${TOK}`,
      spans: [
        { description: `POST /api/auth/equipo-invitacion/${TOK}/aceptar-cuenta-nueva`, data: { url: `/api/auth/equipo-invitacion/${TOK}`, 'http.query': `?t=${TOK}` } },
        { description: `GET https://hotclick.lat/api/equipo-invitaciones/${TOK}/aceptar?token=${TOK}` },
      ],
      breadcrumbs: [{ message: `GET /api/equipo-invitaciones/${TOK}/aceptar`, data: { url: `/equipo/invitacion/${TOK}`, to: `/equipo/invitacion/${TOK}#t=${TOK}` } }],
    })
    expect(JSON.stringify(ev)).not.toContain(TOK)
    expect(ev.spans?.[0].data).not.toHaveProperty('http.query')
  })

  it('beforeSendTransaction: pageload y spans XHR salen sin token', () => {
    const tx = {
      type: 'transaction',
      transaction: `/equipo/invitacion/${TOK}`,
      request: { url: `https://hotclick.lat/equipo/invitacion#t=${TOK}`, headers: { 'User-Agent': 'x' } },
      spans: [{ description: `POST /api/auth/equipo-invitacion/${TOK}/aceptar-cuenta-nueva`, data: { 'http.url': `https://hotclick.lat/api/auth/equipo-invitacion/${TOK}`, url: `/api/auth/equipo-invitacion/${TOK}?t=${TOK}` } }],
    } as unknown as TransactionEvent
    const out = beforeSendTransaction(tx)
    expect(out).not.toBeNull()
    expect(JSON.stringify(out)).not.toContain(TOK)
    expect(out?.request?.headers).toBeUndefined()
  })

  it('depurarPii (beforeSend) también sanitiza la URL del evento de error', () => {
    const ev = depurarPii({
      request: { url: `https://hotclick.lat/equipo/invitacion/${TOK}` },
      transaction: `/equipo/invitacion/${TOK}`,
    } as unknown as ErrorEvent)
    expect(JSON.stringify(ev)).not.toContain(TOK)
  })
})
