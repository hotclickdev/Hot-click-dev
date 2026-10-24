import { describe, it, expect, vi } from 'vitest'
import { cargarCatalogoCompleto, CATALOGO_LOTE, CATALOGO_MAX_LOTES } from './useCatalogoFetch'

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
})
