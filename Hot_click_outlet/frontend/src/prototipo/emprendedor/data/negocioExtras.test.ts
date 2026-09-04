import { beforeEach, describe, expect, it } from 'vitest'
import { guardarExtrasLocal, leerExtrasLocal, limpiarExtrasLocal } from './negocioExtras'

const CLAVE = 'hc-emp-negocio-extras-v1'
const store = new Map<string, string>()
const memoryStorage: Storage = {
  get length() { return store.size },
  clear: () => store.clear(),
  getItem: (k) => store.get(k) ?? null,
  key: (i) => [...store.keys()][i] ?? null,
  removeItem: (k) => { store.delete(k) },
  setItem: (k, v) => { store.set(k, String(v)) },
}
Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })

beforeEach(() => {
  store.clear()
})

describe('negocioExtras localStorage', () => {
  it('leerExtrasLocal devuelve vacío si no hay cache', () => {
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })

  it('guardar y leer redondean categoria, instagram y zona', () => {
    guardarExtrasLocal({ categoria: 'Ropa', instagram: '@local', zona: 'GAM' })
    expect(leerExtrasLocal()).toEqual({
      categoria: 'Ropa',
      instagram: '@local',
      zona: 'GAM',
    })
  })

  it('limpiarExtrasLocal borra el cache tras un PUT exitoso', () => {
    guardarExtrasLocal({ categoria: 'Ropa', instagram: '@local', zona: 'GAM' })
    limpiarExtrasLocal()
    expect(localStorage.getItem(CLAVE)).toBeNull()
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })

  it('leerExtrasLocal aguanta JSON inválido', () => {
    localStorage.setItem(CLAVE, '{no-json')
    expect(leerExtrasLocal()).toEqual({ categoria: '', instagram: '', zona: '' })
  })
})
