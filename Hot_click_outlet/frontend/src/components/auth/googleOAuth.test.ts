import { createElement, isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BotonGoogle } from './BotonGoogle'
import { iniciarGoogle } from './googleOAuth'
import { esClavePublicableClerk, pedirClaveClerk } from './clerkConfig'

describe('BotonGoogle', () => {
  it('dibuja «Continuar con Google» como botón secundario con el logo G oficial', () => {
    const html = renderToStaticMarkup(createElement(BotonGoogle, { etiqueta: 'Continuar con Google', cargando: false, onClick: () => {} }))
    expect(html).toContain('Continuar con Google')
    expect(html).toContain('data-logo="google"')
    for (const color of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) expect(html).toContain(color)
    expect(html).toContain('border-hc-n-200')
    expect(html).toContain('bg-hc-n-0')
    expect(html).toContain('h-12')
    expect(html).not.toMatch(/bg-hc-(red|accent|primary)|#E73B33/i)
  })

  it('en carga se deshabilita y cambia el logo por el spinner', () => {
    const html = renderToStaticMarkup(createElement(BotonGoogle, { etiqueta: 'Google', cargando: true, onClick: () => {} }))
    expect(html).toContain('disabled')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('data-logo="google"')
  })

  it('el clic llama al manejador', () => {
    const onClick = vi.fn()
    const el = BotonGoogle({ etiqueta: 'Google', cargando: false, onClick }) as ReactElement<{ onClick: () => void }>
    expect(isValidElement(el)).toBe(true)
    el.props.onClick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('iniciarGoogle', () => {
  it('llama a Clerk authenticateWithRedirect con oauth_google y las rutas SSO', async () => {
    const cliente = { authenticateWithRedirect: vi.fn().mockResolvedValue(undefined) }
    await iniciarGoogle(cliente, 'https://hotclick.lat')
    expect(cliente.authenticateWithRedirect).toHaveBeenCalledWith({
      strategy: 'oauth_google',
      redirectUrl: 'https://hotclick.lat/sso-callback',
      redirectUrlComplete: 'https://hotclick.lat/sso-complete',
    })
  })
})

describe('clave de Clerk en runtime', () => {
  it('acepta solo claves publicables', () => {
    expect(esClavePublicableClerk('pk_live_Y2xlcmsuaG90Y2xpY2subGF0JA==')).toBe(true)
    expect(esClavePublicableClerk('no-es-clave')).toBe(false)
    expect(esClavePublicableClerk(null)).toBe(false)
  })

  it('lee la clave de /api/public/auth-config', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: 'pk_live_abc' }) })
    await expect(pedirClaveClerk(f as unknown as typeof fetch)).resolves.toBe('pk_live_abc')
    expect(f.mock.calls[0][0]).toBe('/api/public/auth-config')
  })

  it('sin clave o con error no habilita Clerk', async () => {
    const vacio = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: null }) })
    await expect(pedirClaveClerk(vacio as unknown as typeof fetch)).resolves.toBeNull()
    const falla = vi.fn().mockRejectedValue(new Error('red'))
    await expect(pedirClaveClerk(falla as unknown as typeof fetch)).resolves.toBeNull()
  })
})
