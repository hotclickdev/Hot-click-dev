import { afterEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('sessionStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: () => null,
  length: 0,
})

const {
  CLAVE_DECLARA_MAYORIA,
  MENSAJE_MAYORIA_EDAD,
  esErrorMayoriaEdad,
  guardarDeclaraMayoriaEdad,
  leoDeclaraMayoriaEdad,
} = await import('./mayoriaEdad')

afterEach(() => {
  store.clear()
})

describe('mayoriaEdad', () => {
  it('guarda y lee la declaración de la pestaña', () => {
    expect(leoDeclaraMayoriaEdad()).toBe(false)
    guardarDeclaraMayoriaEdad(true)
    expect(store.get(CLAVE_DECLARA_MAYORIA)).toBe('1')
    expect(leoDeclaraMayoriaEdad()).toBe(true)
    guardarDeclaraMayoriaEdad(false)
    expect(leoDeclaraMayoriaEdad()).toBe(false)
  })

  it('reconoce el mensaje del servidor', () => {
    expect(esErrorMayoriaEdad(MENSAJE_MAYORIA_EDAD)).toBe(true)
    expect(esErrorMayoriaEdad('otro error')).toBe(false)
  })
})
