import { describe, it, expect, vi } from 'vitest'
import { cargarCatalogoCompleto, CATALOGO_LOTE, CATALOGO_MAX_LOTES, CATALOGO_CONCURRENCIA } from './useCatalogoFetch'

const pagina = (page: number, size: number, total: number) => ({
  data: {
    totalElements: total,
    content: Array.from({ length: Math.max(0, Math.min(size, total - page * size)) }, (_, i) => ({ id: page * size + i })),
  },
})

describe('cargarCatalogoCompleto', () => {
  it('trae todos los lotes, no solo la primera página (bug cat=109 → 0)', async () => {
    const getPage = vi.fn((p: number, s: number) => Promise.resolve(pagina(p, s, 155)))
    const todos = await cargarCatalogoCompleto(getPage)
    expect(todos).toHaveLength(155)
    expect(getPage).toHaveBeenCalledTimes(4)
    expect(getPage.mock.calls.every(([, s]) => s === CATALOGO_LOTE)).toBe(true)
  })

  it('una sola request si cabe en un lote o no hay totalElements', async () => {
    const getPage = vi.fn(() => Promise.resolve({ data: [{ id: 1 }] }))
    expect(await cargarCatalogoCompleto(getPage)).toHaveLength(1)
    expect(getPage).toHaveBeenCalledTimes(1)
  })

  it('respeta el techo de lotes', async () => {
    const getPage = vi.fn((p: number, s: number) => Promise.resolve(pagina(p, s, 1_000_000)))
    await cargarCatalogoCompleto(getPage)
    expect(getPage).toHaveBeenCalledTimes(CATALOGO_MAX_LOTES)
  })

  it('nunca hay más de 4 requests en vuelo y conserva el orden', async () => {
    let enVuelo = 0
    let maximo = 0
    const getPage = vi.fn(async (p: number, s: number) => {
      enVuelo++
      maximo = Math.max(maximo, enVuelo)
      await new Promise((r) => setTimeout(r, (7 - (p % 5)) * 2))
      enVuelo--
      return pagina(p, s, 500)
    })
    const todos = await cargarCatalogoCompleto(getPage)
    expect(CATALOGO_CONCURRENCIA).toBe(4)
    expect(maximo).toBeLessThanOrEqual(4)
    expect(maximo).toBe(4)
    expect(todos.map((p) => (p as { id: number }).id)).toEqual(Array.from({ length: 500 }, (_, i) => i))
  })
})
