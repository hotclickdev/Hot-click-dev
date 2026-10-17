import { describe, expect, it } from 'vitest'
import { REL_SIN_REFERRER, claveTokenEstado, ponerMetaNoReferrer, tokenEstadoPago, urlSinToken } from './privacidadToken'

function docFalso(conMeta?: string) {
  const metas: Array<{ attrs: Record<string, string>; quitado: boolean }> = []
  const crear = (attrs: Record<string, string> = {}) => {
    const m = { attrs, quitado: false }
    metas.push(m)
    return {
      getAttribute: (n: string) => m.attrs[n] ?? null,
      setAttribute: (n: string, v: string) => { m.attrs[n] = v },
      remove: () => { m.quitado = true },
    }
  }
  const existente = conMeta != null ? crear({ name: 'referrer', content: conMeta }) : null
  return {
    metas,
    doc: {
      head: { appendChild: () => undefined },
      querySelector: () => existente,
      createElement: () => crear(),
    },
  }
}

describe('S4-22 el token de estado del pago no se filtra', () => {
  it('pone meta referrer no-referrer y la quita al desmontar', () => {
    const { metas, doc } = docFalso()
    const quitar = ponerMetaNoReferrer(doc)
    expect(metas[0].attrs).toEqual({ name: 'referrer', content: 'no-referrer' })
    quitar()
    expect(metas[0].quitado).toBe(true)
  })

  it('si ya había una política, la restaura al desmontar', () => {
    const { metas, doc } = docFalso('strict-origin-when-cross-origin')
    const quitar = ponerMetaNoReferrer(doc)
    expect(metas[0].attrs.content).toBe('no-referrer')
    quitar()
    expect(metas[0].attrs.content).toBe('strict-origin-when-cross-origin')
    expect(metas[0].quitado).toBe(false)
  })

  it('lee el token de la URL, lo guarda y al refrescar lo toma del storage', () => {
    const mem = new Map<string, string>()
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
    expect(tokenEstadoPago('ORD-1', '?token=abc', storage)).toBe('abc')
    expect(mem.get(claveTokenEstado('ORD-1'))).toBe('abc')
    expect(tokenEstadoPago('ORD-1', '', storage)).toBe('abc')
    expect(tokenEstadoPago('ORD-2', '', storage)).toBeNull()
    expect(tokenEstadoPago('ORD-3', '?token=z', null)).toBe('z')
  })

  it('quita solo el token de la URL visible', () => {
    expect(urlSinToken('/checkout/pendiente/ORD-1', '?token=abc')).toBe('/checkout/pendiente/ORD-1')
    expect(urlSinToken('/checkout/pendiente/ORD-1', '?token=abc&x=1', '#r')).toBe('/checkout/pendiente/ORD-1?x=1#r')
    expect(REL_SIN_REFERRER).toBe('noopener noreferrer')
  })
})
