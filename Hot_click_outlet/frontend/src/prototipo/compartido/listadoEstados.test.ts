import { describe, expect, it } from 'vitest'
import { faseListado } from './listadoEstados'

describe('faseListado', () => {
  it('prioriza cargando sobre error y vacío', () => {
    expect(faseListado({ cargando: true, error: 'falló', cantidad: 0 })).toBe('cargando')
  })

  it('muestra error cuando ya no carga', () => {
    expect(faseListado({ cargando: false, error: 'No se pudo cargar', cantidad: 0 })).toBe('error')
  })

  it('no marca vacío con error aunque cantidad sea 0', () => {
    expect(faseListado({ cargando: false, error: 'x', cantidad: 0 })).toBe('error')
  })

  it('marca vacío sin error ni carga', () => {
    expect(faseListado({ cargando: false, error: null, cantidad: 0 })).toBe('vacio')
  })

  it('marca listo con ítems', () => {
    expect(faseListado({ cargando: false, error: null, cantidad: 3 })).toBe('listo')
  })
})
