import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import { PieCarritoMovil } from './ExtrasCarritoMovil'

const pintar = (oculto?: boolean) =>
  renderToStaticMarkup(createElement(PieCarritoMovil, { total: 1000, onContinuar: () => {}, onWhatsApp: () => {}, oculto }))

describe('BAJO 360 px: pie fijo del carrito', () => {
  it('se oculta cuando el resumen está en pantalla (no lo tapa)', () => {
    const html = pintar(true)
    expect(html).toMatch(/data-pie-carrito[^>]*class="[^"]*\bhidden\b/)
    expect(html).toContain('aria-hidden="true"')
  })
  it('visible por defecto', () => {
    const html = pintar()
    expect(html).toMatch(/class="sticky bottom-0 z-40 flex /)
    expect(html).not.toContain('aria-hidden')
  })
})
