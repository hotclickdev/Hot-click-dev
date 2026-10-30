import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RegimenIvaCard from './RegimenIvaCard'
import { REGIMENES_IVA, normalizarRegimenIva } from './regimenIva'

describe('M4: selector de régimen de IVA', () => {
  it('sin dato o con valor raro se toma simplificado', () => {
    expect(normalizarRegimenIva(undefined)).toBe('SIMPLIFICADO')
    expect(normalizarRegimenIva('MIXTO')).toBe('SIMPLIFICADO')
    expect(normalizarRegimenIva('TRADICIONAL')).toBe('TRADICIONAL')
  })

  it('ofrece solo los dos regímenes que acepta el backend', () => {
    expect(REGIMENES_IVA.map(r => r.valor)).toEqual(['SIMPLIFICADO', 'TRADICIONAL'])
  })

  it('marca el régimen actual y habla en voseo', () => {
    const html = renderToStaticMarkup(createElement(RegimenIvaCard, { regimen: 'TRADICIONAL', canEdit: true, onGuardar: () => {} }))
    const activo = html.split('<button').filter(b => b.includes('aria-checked="true"'))
    expect(activo).toHaveLength(1)
    expect(activo[0]).toContain('Régimen tradicional')
    expect(html).toContain('Elegí el régimen')
    expect(html).not.toContain('disabled=""')
  })

  it('sin permiso los botones quedan deshabilitados', () => {
    const html = renderToStaticMarkup(createElement(RegimenIvaCard, { regimen: 'SIMPLIFICADO', canEdit: false, onGuardar: () => {} }))
    expect(html.match(/disabled=""/g)?.length).toBe(2)
  })
})
