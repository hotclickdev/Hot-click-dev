import { beforeEach, describe, expect, it, vi } from 'vitest'

const almacen = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => { almacen.set(k, v) },
  removeItem: (k: string) => { almacen.delete(k) },
  clear: () => almacen.clear(),
})

const post = vi.fn(() => Promise.resolve({}))
vi.mock('./api', () => ({ default: { post: (...a: unknown[]) => post(...a), get: vi.fn() } }))

import { leerCategoriasTop, registrarVisitaCategoria, reiniciarVisitasContadas } from './categoriasTop'
import { COOKIE_CONSENT_KEY } from '@/utils/cookieConsent'

function consentir(analytics: boolean) {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ analytics, advertising: false, functional: true, timestamp: Date.now() }))
}

describe('categoriasTop', () => {
  beforeEach(() => {
    post.mockClear()
    localStorage.clear()
    reiniciarVisitasContadas()
  })

  it('lee como máximo 3 y descarta filas inválidas, conservando el orden del backend', () => {
    const r = leerCategoriasTop([
      { id: 1, nombre: 'A', visitas: 9 }, { id: 'x' }, { id: 2, nombre: 'B' }, { id: 3, nombre: 'C' }, { id: 4, nombre: 'D' },
    ])
    expect(r).toEqual([{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }, { id: 3, nombre: 'C' }])
    expect(leerCategoriasTop(null)).toEqual([])
  })

  it('sin consentimiento de análisis no cuenta nada', () => {
    expect(registrarVisitaCategoria(5)).toBe(false)
    consentir(false)
    expect(registrarVisitaCategoria(5)).toBe(false)
    expect(post).not.toHaveBeenCalled()
  })

  it('con consentimiento cuenta una vez por categoría y carga, sin datos del visitante', () => {
    consentir(true)
    expect(registrarVisitaCategoria(5)).toBe(true)
    expect(registrarVisitaCategoria(5)).toBe(false)
    expect(registrarVisitaCategoria(6)).toBe(true)
    expect(registrarVisitaCategoria(0)).toBe(false)
    expect(registrarVisitaCategoria(null)).toBe(false)
    expect(post.mock.calls).toEqual([['/public/categorias/5/visita'], ['/public/categorias/6/visita']])
  })
})
