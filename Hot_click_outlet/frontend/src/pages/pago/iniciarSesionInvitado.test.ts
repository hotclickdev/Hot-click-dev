import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'
import { debeRespetarRedirect, destinoPostLogin } from '@/pages/auth/authHelpers'
import IniciarSesionInvitado from './IniciarSesionInvitado'

const ENLACE = '/login?redirect=%2Fmis-pedidos'

const aqui = dirname(fileURLToPath(import.meta.url))
const leer = (rel: string) => readFileSync(resolve(aqui, rel), 'utf8')

/** Lo que hace `/login` con su query: `params.get('redirect')` y después `destinoPostLogin`. */
const destinoDesdeQuery = (query: string) => destinoPostLogin(new URLSearchParams(query).get('redirect') ?? '/')

describe('S4-19 · invitación a iniciar sesión en la confirmación de invitado', () => {
  it('muestra el texto del contrato con el enlace a /login?redirect=%2Fmis-pedidos', async () => {
    await i18n.changeLanguage('es')
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(IniciarSesionInvitado)))
    expect(html).toContain(`href="${ENLACE}"`)
    expect(html.replace(/<[^>]+>/g, '')).toBe('¿Ya tenés cuenta? Iniciá sesión para ver tus compras en «Mis pedidos»')
  })

  it('va en las dos confirmaciones de invitado (marketplace y tienda), sin preguntar si el correo existe', () => {
    const pagoExito = leer('./PagoExito.tsx')
    const tiendaExito = leer('../tienda/TiendaSuccessPage.tsx')
    expect(pagoExito).toMatch(/!token && \([\s\S]*<IniciarSesionInvitado \/>/)
    expect(tiendaExito).toContain('{!token && <IniciarSesionInvitado />}')
    expect(leer('./IniciarSesionInvitado.tsx')).not.toMatch(/Service|axios|fetch\(/)
  })
})

describe('/login respeta ?redirect= solo con rutas internas', () => {
  it('el enlace de la confirmación vuelve a /mis-pedidos', () => {
    const query = ENLACE.split('?')[1]
    expect(destinoDesdeQuery(query)).toBe('/mis-pedidos')
    expect(debeRespetarRedirect('/mis-pedidos', destinoDesdeQuery(query))).toBe(true)
  })

  it('descarta URLs externas, `//`, `/\\` y controles, también codificados', () => {
    for (const query of [
      'redirect=https%3A%2F%2Fevil.example',
      'redirect=%2F%2Fevil.example',
      'redirect=//evil.example',
      'redirect=%2F%5Cevil.example',
      'redirect=%2F%09%2Fevil.example',
      'redirect=javascript%3Aalert(1)',
      'redirect=mis-pedidos',
      'redirect=',
    ]) {
      expect(destinoDesdeQuery(query), query).toBe('/')
    }
  })
})
