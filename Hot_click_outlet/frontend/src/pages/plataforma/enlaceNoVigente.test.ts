import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import EnlaceNoVigente from './EnlaceNoVigente'

const render = (motivo: 'usado' | 'vencido' | 'noVigente') =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(EnlaceNoVigente, { motivo })))

describe('QA-122-6: enlace usado, vencido o inexistente con CTA «Iniciar sesión»', () => {
  it.each(['usado', 'vencido', 'noVigente'] as const)('%s muestra un solo botón a /login', (motivo) => {
    const html = render(motivo)
    expect(html.match(/href="\/login/g)).toHaveLength(1)
    expect(html).toContain('Iniciar sesión')
  })
  it('el usado vuelve al onboarding después de entrar', () => {
    expect(render('usado')).toContain('redirect=%2Femprendedor%2Fnegocio-rapido')
  })
})
