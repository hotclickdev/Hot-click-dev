import { describe, it, expect } from 'vitest'
import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import i18n from '@/i18n'
import type { Producto } from '@/types/producto'
import {
  estaAgotado,
  esProductoCotizable,
  parecidosDisponibles,
  MAX_PARECIDOS_AGOTADO,
} from './productoHelpers'
import { BotonAgotado, EtiquetaAgotado } from './ProductAgotado'

const aqui = dirname(fileURLToPath(import.meta.url))
const producto = (id: number, stock: number) => ({ id, stock, nombre: `P${id}` }) as unknown as Producto

describe('ficha agotada · helpers (Figma 44:1917)', () => {
  it('estaAgotado: solo el stock positivo cuenta como disponible', () => {
    expect(estaAgotado({ stock: 0 })).toBe(true)
    expect(estaAgotado({ stock: -2 })).toBe(true)
    expect(estaAgotado({ stock: undefined as unknown as number })).toBe(true)
    expect(estaAgotado({ stock: 1 })).toBe(false)
  })

  it('esProductoCotizable: personalizado sin precio fijo', () => {
    expect(esProductoCotizable({ esPersonalizado: true, modoPrecioPersonalizado: 'COTIZACION' })).toBe(true)
    expect(esProductoCotizable({ esPersonalizado: true, modoPrecioPersonalizado: 'FIJO' })).toBe(false)
    expect(esProductoCotizable({ esPersonalizado: false, modoPrecioPersonalizado: null })).toBe(false)
  })

  it('parecidosDisponibles: excluye el producto actual y los agotados, con tope', () => {
    const recs = [producto(1, 3), producto(2, 0), producto(3, 5), producto(4, 1)]
    expect(parecidosDisponibles(recs, 1).map((p) => p.id)).toEqual([3, 4])
    const muchos = Array.from({ length: 10 }, (_, i) => producto(i + 10, 2))
    expect(parecidosDisponibles(muchos, 99)).toHaveLength(MAX_PARECIDOS_AGOTADO)
  })
})

describe('ficha agotada · componentes', () => {
  const t = i18n.getFixedT('es')

  it('el botón de compra queda deshabilitado y dice "Agotado"', () => {
    const html = renderToStaticMarkup(createElement(BotonAgotado, { mainCTARef: createRef<HTMLButtonElement>(), t }))
    expect(html).toContain('disabled')
    expect(html).toContain('Agotado')
    expect(html).toContain('bg-hc-n-200')
  })

  it('la etiqueta usa los tokens neutros del Figma', () => {
    const html = renderToStaticMarkup(createElement(EtiquetaAgotado, { t }))
    expect(html).toContain('bg-hc-n-100')
    expect(html).toContain('text-hc-n-600')
    expect(html).toContain('Agotado')
  })

  it('ProductInfo cambia las acciones de compra por BotonAgotado y monta el aviso de reposición', () => {
    const info = readFileSync(resolve(aqui, 'ProductInfo.tsx'), 'utf8')
    expect(info).toContain('{agotado && <BotonAgotado')
    expect(info).toContain('<FormularioAvisoReposicion')
    expect(info).toContain('<AlternativasAgotado')
    expect(info).toMatch(/\{inStock && !esCotizable && \(\s*<ProductBuyActions/)
  })

  it('el aviso de reposición no usa colores hardcodeados ni textos por defecto', () => {
    const form = readFileSync(resolve(aqui, 'FormularioAvisoReposicion.tsx'), 'utf8')
    expect(form).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
    expect(form).not.toMatch(/t\('[^']+',\s*'/)
  })
})
