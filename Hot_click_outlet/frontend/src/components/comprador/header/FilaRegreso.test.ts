import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'
import FilaRegreso from './FilaRegreso'

// Sin DOM en vitest: historial mínimo para el hook de navegación.
vi.stubGlobal('window', { history: { state: null, length: 1 }, addEventListener: () => {}, removeEventListener: () => {}, navigation: undefined })

describe('BAJO 360 px: flecha adelante de las migas', () => {
  it('sin historial hacia adelante no se pinta la flecha gris deshabilitada', () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, { initialEntries: ['/tienda/qa-pyme'] }, createElement(FilaRegreso, { alineacion: 'tienda', nombreTienda: 'QA' })),
    )
    expect(html).toContain('aria-label="Volver')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('-scale-x-100')
  })
})
