import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import EntendiChips from './EntendiChips'
import type { ChipEntendi } from './buscarExplorar'

const pintar = (chips: ChipEntendi[]) =>
  renderToStaticMarkup(createElement(EntendiChips, { chips, onQuitar: () => undefined, onAbrirFiltros: () => undefined, onLimpiar: () => undefined }))

describe('EntendiChips (Figma 26:723 y 30:1880)', () => {
  it('no repite la búsqueda como chip y muestra precio con punto de miles', () => {
    const html = pintar([
      { clave: 'busqueda', tipo: 'busqueda', valor: 'sala' },
      { clave: 'precio', tipo: 'precio', valor: '|35000' },
      { clave: 'stock', tipo: 'stock', valor: '' },
    ])
    expect(html).not.toContain('>sala<')
    expect(html).toContain('Hasta ₡35.000')
    expect(html).toContain('Solo con stock')
    expect(html).toContain('Limpiar')
  })

  it('sin chips deja solo el botón Filtros en móvil y oculta la fila en desktop', () => {
    const html = pintar([])
    expect(html).toContain('Filtros')
    expect(html).toContain('flex lg:hidden')
    expect(html).not.toContain('Entendí')
  })
})
