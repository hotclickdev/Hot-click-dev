import { describe, expect, it } from 'vitest'
import {
  COLOR_CHROME_CLARO,
  COLOR_CHROME_OSCURO,
  aplicarClasesTemaHtml,
  colorChromeParaTema,
  esRutaTemaPanel,
  temaEfectivoParaRuta,
} from './temaPorRuta'

function classListFake(iniciales: string[] = []) {
  const set = new Set(iniciales)
  return {
    add: (...c: string[]) => { for (const x of c) set.add(x) },
    remove: (...c: string[]) => { for (const x of c) set.delete(x) },
    toggle: (c: string, force?: boolean) => {
      const on = force ?? !set.has(c)
      if (on) set.add(c)
      else set.delete(c)
      return on
    },
    has: (c: string) => set.has(c),
  }
}

describe('temaPorRuta', () => {
  it('marca panel admin / vendedor / POS admin como tema libre', () => {
    expect(esRutaTemaPanel('/admin')).toBe(true)
    expect(esRutaTemaPanel('/admin/pos')).toBe(true)
    expect(esRutaTemaPanel('/emprendedor/productos')).toBe(true)
    expect(esRutaTemaPanel('/pyme')).toBe(true)
    expect(esRutaTemaPanel('/negocio-plus/sucursales')).toBe(true)
  })

  it('fuerza claro en marketplace, auth, tienda y pago público', () => {
    expect(esRutaTemaPanel('/')).toBe(false)
    expect(esRutaTemaPanel('/login')).toBe(false)
    expect(esRutaTemaPanel('/registro')).toBe(false)
    expect(esRutaTemaPanel('/productos')).toBe(false)
    expect(esRutaTemaPanel('/tienda/demo')).toBe(false)
    expect(esRutaTemaPanel('/pos/pago/abc')).toBe(false)
    expect(esRutaTemaPanel('/checkout')).toBe(false)
  })

  it('respeta preferencia dark solo en panel', () => {
    expect(temaEfectivoParaRuta('/admin', 'dark')).toBe('dark')
    expect(temaEfectivoParaRuta('/login', 'dark')).toBe('light')
    expect(temaEfectivoParaRuta('/emprendedor', 'light')).toBe('light')
  })

  it('mapea theme-color al --hc-bg de cada tema', () => {
    expect(colorChromeParaTema('light')).toBe(COLOR_CHROME_CLARO)
    expect(colorChromeParaTema('dark')).toBe(COLOR_CHROME_OSCURO)
    expect(COLOR_CHROME_CLARO).toBe('#F8F9FB')
    expect(COLOR_CHROME_OSCURO).toBe('#0E1116')
  })

  it('alto contraste es ortogonal al lock de ruta', () => {
    const cl = classListFake(['dark'])
    expect(aplicarClasesTemaHtml(cl as unknown as DOMTokenList, '/login', 'dark', true)).toBe('light')
    expect(cl.has('light')).toBe(true)
    expect(cl.has('dark')).toBe(false)
    expect(cl.has('high-contrast')).toBe(true)

    expect(aplicarClasesTemaHtml(cl as unknown as DOMTokenList, '/admin', 'dark', true)).toBe('dark')
    expect(cl.has('dark')).toBe(true)
    expect(cl.has('high-contrast')).toBe(true)

    aplicarClasesTemaHtml(cl as unknown as DOMTokenList, '/admin', 'dark', false)
    expect(cl.has('high-contrast')).toBe(false)
  })
})
