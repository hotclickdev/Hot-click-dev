import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/pages/plataforma/consola', () => ({
  consolaService: { onboardingRapido: vi.fn(() => new Promise(() => {})), marcarPasoRapido: vi.fn() },
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }))

import NegocioRapidoOnboardingPage from './NegocioRapidoOnboardingPage'

describe('NegocioRapidoOnboardingPage', () => {
  it('arranca en carga con el título del onboarding y sin CTA hasta tener el avance', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(NegocioRapidoOnboardingPage)))
    expect(html).toContain('negocioRapido.onboarding.titulo')
    expect(html).not.toContain('negocioRapido.onboarding.seguir')
    expect(html).not.toContain('bg-hc-primary px-4')
  })
})
