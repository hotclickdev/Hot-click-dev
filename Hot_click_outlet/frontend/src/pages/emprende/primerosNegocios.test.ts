import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import pt from '@/i18n/locales/pt.json'
import { limiteCupo, primerosNegocios } from './primerosNegocios'

/** Traductor mínimo sobre un JSON de locales: resuelve la ruta y rellena {{variables}}. */
function traductor(arbol: unknown) {
  return (key: string, opts: Record<string, unknown> = {}): string => {
    const texto = key.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], arbol)
    if (typeof texto !== 'string') throw new Error(`falta la clave ${key}`)
    return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, v: string) => String(opts[v] ?? `{{${v}}}`))
  }
}

describe('limiteCupo', () => {
  it('toma el límite del backend solo si es un entero positivo', () => {
    expect(limiteCupo({ limite: 25 })).toBe(25)
    expect(limiteCupo({ limite: 70 })).toBe(70)
    for (const malo of [0, -3, 2.5, Number.NaN]) expect(limiteCupo({ limite: malo })).toBeNull()
    expect(limiteCupo(null)).toBeNull()
    expect(limiteCupo(undefined)).toBeNull()
  })
})

describe('primerosNegocios: el número sale del backend, no del texto', () => {
  const t = traductor(es)

  it('usa el límite configurado (no 70 fijo)', () => {
    expect(primerosNegocios({ limite: 25 }, t)).toBe('los primeros 25 negocios')
    expect(primerosNegocios({ limite: 120 }, t)).toBe('los primeros 120 negocios')
  })

  it('sin dato (cargando, error o límite inválido) no inventa una cifra', () => {
    for (const cupo of [null, undefined, { limite: 0 }, { limite: -1 }]) {
      const texto = primerosNegocios(cupo, t)
      expect(texto).toBe('los primeros negocios')
      expect(texto).not.toMatch(/\d/)
    }
  })

  it('funciona igual en en y pt', () => {
    expect(primerosNegocios({ limite: 25 }, traductor(en))).toBe('the first 25 businesses')
    expect(primerosNegocios({ limite: 25 }, traductor(pt))).toBe('os primeiros 25 negócios')
    expect(primerosNegocios(null, traductor(en))).not.toMatch(/\d/)
    expect(primerosNegocios(null, traductor(pt))).not.toMatch(/\d/)
  })
})

describe('regresión: los locales no traen el cupo fijo', () => {
  const FIJO = /primeros 70|first 70|primeiros 70|70 negocios|70 businesses|70 negócios/i
  it.each([['es', es], ['en', en], ['pt', pt]])('%s no menciona «70 negocios»', (_idioma, arbol) => {
    expect(JSON.stringify(arbol)).not.toMatch(FIJO)
  })

  it('los textos con cupo reciben {{primeros}} y se rellenan con el límite del backend', () => {
    const t = traductor(es)
    const primeros = primerosNegocios({ limite: 25 }, t)
    for (const clave of ['emprende.sub', 'emprende.heroPrecioLinea', 'emprende.metaDescription', 'pyme.comparativaNota']) {
      const texto = t(clave, { primeros, comision: 9 })
      expect(texto, clave).toContain('los primeros 25 negocios')
      expect(texto, clave).not.toContain('70')
    }
  })
})
