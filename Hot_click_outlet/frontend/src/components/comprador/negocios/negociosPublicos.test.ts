import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import i18n from '@/i18n'
import type { NegocioPublico } from '@/services/negocioService'
import { PLANES_DIRECTORIO, normalizarListaNegocios, planDesdeParam, rutaDirectorioPlan, rutaTienda } from './negociosPublicos'
import { claveBusquedaNegocios } from './useBuscarNegocios'
import InsigniaPlan from './InsigniaPlan'
import FilaNegocio from './FilaNegocio'
import { SearchPanelBody } from '@/components/ui/searchPanel/SearchPanelBody'
import type { SearchPanelModel } from '@/components/ui/searchPanel/useSearchPanel'

const luna: NegocioPublico = { slug: 'casa-luna-506', nombre: 'Casa Luna 506', logoUrl: '', categoria: 'Hogar', plan: 'PYME', productos: 8 }

describe('negocios públicos · directorio por plan', () => {
  it('tres entradas en orden: Emprendimientos, Pymes, Negocio Plus', () => {
    expect(PLANES_DIRECTORIO.map((p) => p.alias)).toEqual(['emprendimientos', 'pymes', 'negocio-plus'])
    expect(PLANES_DIRECTORIO.map((p) => i18n.t(p.nav, { lng: 'es' }))).toEqual(['Emprendimientos', 'Pymes', 'Negocio Plus'])
  })

  it('rutas: directorio filtrado y tienda por slug', () => {
    expect(rutaDirectorioPlan('pymes')).toBe('/emprendimientos?plan=pymes')
    expect(rutaTienda({ slug: 'casa luna' })).toBe('/tienda/casa%20luna')
  })

  it('planDesdeParam: solo alias conocidos', () => {
    expect(planDesdeParam('negocio-plus')?.plan).toBe('NEGOCIO_PLUS')
    expect(planDesdeParam('oro')).toBeNull()
    expect(planDesdeParam(null)).toBeNull()
  })

  it('normalizarListaNegocios descarta basura', () => {
    expect(normalizarListaNegocios(null)).toEqual([])
    expect(normalizarListaNegocios([luna, { slug: '' }, 3])).toEqual([luna])
  })

  it('clave de búsqueda sin tildes ni mayúsculas', () => {
    expect(claveBusquedaNegocios('  Café   LUNA ')).toBe('cafe luna')
  })
})

describe('negocios públicos · piezas', () => {
  const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(createElement(MemoryRouter, null, el))

  it('InsigniaPlan muestra el plan público', () => {
    expect(render(createElement(InsigniaPlan, { plan: 'NEGOCIO_PLUS' }))).toContain('Negocio Plus')
    expect(render(createElement(InsigniaPlan, { plan: 'EMPRENDEDOR' }))).toContain('Emprendimiento')
  })

  it('FilaNegocio: iniciales, nombre, plan y productos; nada de contacto', () => {
    const html = render(createElement(FilaNegocio, { negocio: luna, onElegir: () => {} }))
    expect(html).toContain('CL')
    expect(html).toContain('Casa Luna 506')
    expect(html).toContain('Pyme')
    expect(html).toContain('8 productos')
    expect(html).not.toMatch(/wa\.me|whatsapp|instagram|tel:/i)
  })

  const modelo = (parcial: Partial<SearchPanelModel>) => ({
    query: 'luna', loading: false, recent: [], productResults: [], negocioResults: [], cargandoNegocios: false,
    totalResultados: 0, sugerencias: [], selectProduct: () => {}, selectNegocio: () => {}, viewAll: () => {},
    clearRecent: () => {}, setQuery: () => {}, preguntarAsistente: () => {}, buscarConFoto: () => {}, elegirSugerencia: () => {},
    ...parcial,
  }) as unknown as SearchPanelModel

  it('buscador: grupo "Negocios" arriba de los productos', () => {
    const html = render(createElement(SearchPanelBody, modelo({ negocioResults: [luna] })))
    expect(html).toContain('Negocios')
    expect(html).toContain('Casa Luna 506')
    expect(html).not.toContain('No encontramos productos ni negocios')
  })

  it('buscador: estado vacío cuando no hay productos ni negocios', () => {
    const html = render(createElement(SearchPanelBody, modelo({ query: 'zzqx' })))
    expect(html).toContain('No encontramos productos ni negocios para “zzqx”')
    expect(html).toContain('Preguntale al asistente')
    expect(html).toContain('Buscar con una foto')
    const hostil = render(createElement(SearchPanelBody, modelo({ query: '<img src=x onerror=alert(1)>' })))
    expect(hostil).not.toContain('<img')
    expect(hostil).toContain('&lt;img')
  })

  it('buscador: mientras cargan los negocios no muestra el vacío', () => {
    const html = render(createElement(SearchPanelBody, modelo({ query: 'zzqx', cargandoNegocios: true })))
    expect(html).not.toContain('No encontramos productos ni negocios')
  })
})
