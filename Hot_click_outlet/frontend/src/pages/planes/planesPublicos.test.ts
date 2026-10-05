import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import FooterComprador from '@/components/comprador/FooterComprador'
import TarjetaPlanPublico from './TarjetaPlanPublico'
import { detallePlan, textosPlan } from './planesPublicos'

function html(ruta: string, nodo: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(
    createElement(I18nextProvider, { i18n }, createElement(MemoryRouter, { initialEntries: [ruta] }, nodo)),
  )
}

describe('comparativa de planes', () => {
  it('separa el precio del resto de lo incluido', () => {
    expect(detallePlan(['Hasta 50 productos', '₡0/mes'])).toEqual({
      precio: '₡0/mes',
      incluye: ['Hasta 50 productos'],
    })
    expect(detallePlan([])).toEqual({ precio: '', incluye: [] })
  })

  it('descarta puntos que no son texto', () => {
    expect(textosPlan(['a', 1, '', null])).toEqual(['a'])
    expect(textosPlan(null)).toEqual([])
  })

  it('cada tarjeta abre su landing y su alta', async () => {
    await i18n.changeLanguage('es')
    const marcado = html('/', createElement('div', null,
      createElement(TarjetaPlanPublico, { alias: 'emprendimientos' }),
      createElement(TarjetaPlanPublico, { alias: 'pymes' }),
      createElement(TarjetaPlanPublico, { alias: 'negocio-plus' }),
    ))
    expect(marcado).toContain('₡0/mes')
    expect(marcado).toContain('href="/emprende"')
    expect(marcado).toContain('href="/para-pymes"')
    expect(marcado).toContain('href="/negocio-plus-plan"')
    expect(marcado).toContain('href="/registro-empresa?plan=pyme"')
    expect(marcado).toContain('Conocer Negocio Plus')
  })

  it('el pie del directorio abre el plan del chip', async () => {
    await i18n.changeLanguage('es')
    expect(html('/emprendimientos', createElement(FooterComprador))).toContain('href="/planes"')
    expect(html('/emprendimientos?plan=emprendimientos', createElement(FooterComprador))).toContain('sin mensualidad')
    const pymes = html('/emprendimientos?plan=pymes', createElement(FooterComprador))
    expect(pymes).toContain('href="/para-pymes"')
    expect(pymes).not.toContain('sin mensualidad')
    expect(html('/emprendimientos?plan=negocio-plus', createElement(FooterComprador))).toContain('href="/negocio-plus-plan"')
  })
})
