import { describe, expect, it } from 'vitest'
import { PRECIO_DESTACADO, confirmacionDestacado, contarDestacados, filtrarPorDestacado, soloPublicables, textoDesde, textoOrden } from './destacados'

const filas = [
  { id: 1, destacado: true, destacadoOrden: 2 },
  { id: 2, destacado: false },
  { id: 3, destacado: true, destacadoOrden: 1 },
]

describe('destacar negocio (admin)', () => {
  it('filtra Todos / Destacados / Sin destacar con contadores y orden', () => {
    expect(contarDestacados(filas)).toEqual({ todos: 3, destacados: 2, 'sin-destacar': 1 })
    expect(filtrarPorDestacado(filas, 'destacados').map((f) => f.id)).toEqual([3, 1])
    expect(filtrarPorDestacado(filas, 'sin-destacar').map((f) => f.id)).toEqual([2])
  })
  it('sin montos: el precio lo define HOT_CLICK', () => {
    expect(PRECIO_DESTACADO).toBe('precio a definir por HOT_CLICK')
    const c = confirmacionDestacado('Café Brumoso', true)
    expect(c.titulo).toBe('¿Destacar a Café Brumoso?')
    expect(c.texto).not.toMatch(/₡\s?\d/)
    expect(confirmacionDestacado('Café Brumoso', false).cta).toBe('Sí, quitar')
  })
  it('Desde y Orden', () => {
    expect(textoOrden({ destacadoOrden: 2 }, 3)).toBe('2 de 3')
    expect(textoOrden({})).toBeNull()
    expect(textoDesde('2026-11-14T10:00:00')).toBe('14-nov-2026')
  })
  it('en público solo aprobados y no pausados', () => {
    expect(soloPublicables([{ id: 1 }, { id: 2, pausada: true }, { id: 3, estado: 'SUSPENDIDO' }]).map((n) => n.id)).toEqual([1])
  })
})
