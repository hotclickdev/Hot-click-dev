import { describe, expect, it } from 'vitest'
import { diversificarDescubri } from './diversificarDescubri'

const p = (id: number, negocio: string | null, categoria: number | null) => ({
  id, empresaSlug: negocio, categoriaId: categoria ?? undefined,
})
const ids = (xs: { id: unknown }[]) => xs.map((x) => x.id)
const negocios = (xs: { empresaSlug?: string | null }[]) => xs.map((x) => x.empresaSlug)

describe('diversificarDescubri', () => {
  it('pone a lo sumo un producto por negocio en la primera ronda', () => {
    const out = diversificarDescubri([p(1, 'a', 1), p(2, 'a', 2), p(3, 'a', 3), p(4, 'b', 4), p(5, 'c', 5)])
    expect(negocios(out.slice(0, 3))).toEqual(['a', 'b', 'c'])
  })

  it('no repite categoría entre los primeros 3 si otro negocio lo permite', () => {
    const out = diversificarDescubri([p(1, 'a', 1), p(2, 'b', 1), p(3, 'c', 1), p(4, 'd', 2), p(5, 'e', 3)])
    expect(ids(out.slice(0, 3))).toEqual([1, 4, 5])
    expect(ids(out)).toEqual([1, 4, 5, 2, 3])
  })

  it('después alterna negocios en round-robin respetando la relevancia dentro de cada uno', () => {
    const out = diversificarDescubri([p(1, 'a', 1), p(2, 'a', 1), p(3, 'a', 1), p(4, 'b', 2), p(5, 'b', 2), p(6, 'c', 3)])
    expect(ids(out)).toEqual([1, 4, 6, 2, 5, 3])
  })

  it('con pocas categorías repite antes que dejar huecos', () => {
    const out = diversificarDescubri([p(1, 'a', 1), p(2, 'b', 1), p(3, 'c', 1)])
    expect(ids(out)).toEqual([1, 2, 3])
  })

  it('con un solo negocio conserva el orden original', () => {
    const lista = [p(1, 'a', 1), p(2, 'a', 1), p(3, 'a', 2)]
    expect(ids(diversificarDescubri(lista))).toEqual([1, 2, 3])
  })

  it('productos sin negocio o sin categoría no se agrupan ni bloquean', () => {
    const out = diversificarDescubri([p(1, null, null), p(2, null, null), p(3, 'a', 1), p(4, 'a', 1)])
    expect(ids(out)).toEqual([1, 2, 3, 4])
  })

  it('es determinista, no pierde ni duplica, y tolera lista vacía', () => {
    const lista = [p(1, 'a', 1), p(2, 'b', 1), p(3, 'a', 2), p(4, 'c', 1), p(5, 'b', 3)]
    const a = diversificarDescubri(lista)
    expect(ids(diversificarDescubri(lista))).toEqual(ids(a))
    expect([...ids(a)].sort((x, y) => Number(x) - Number(y))).toEqual([1, 2, 3, 4, 5])
    expect(diversificarDescubri([])).toEqual([])
  })
})
