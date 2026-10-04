import { describe, expect, it } from 'vitest'
import es from './es.json'
import en from './en.json'
import pt from './pt.json'

/** Nodo de un archivo de traducciones: texto, lista de textos (returnObjects) u objeto anidado. */
type Nodo = string | Nodo[] | { [clave: string]: Nodo }

/** Aplana el árbol a rutas "a.b.c" (las listas usan su índice) que terminan en texto. */
function claves(nodo: Nodo, prefijo = ''): string[] {
  if (typeof nodo === 'string') return [prefijo]
  return Object.entries(nodo).flatMap(([clave, valor]) => claves(valor, prefijo ? `${prefijo}.${clave}` : clave))
}

function valorDe(nodo: Nodo, ruta: string): Nodo | undefined {
  return ruta.split('.').reduce<Nodo | undefined>(
    (actual, parte) => (actual === undefined || typeof actual === 'string' ? undefined : (actual as Record<string, Nodo>)[parte]),
    nodo,
  )
}

function variables(texto: Nodo | undefined): string {
  if (typeof texto !== 'string') return ''
  return [...texto.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b)).join()
}

const IDIOMAS: Record<string, Nodo> = { es, en, pt }
const BASE = claves(es)

describe('paridad de claves i18n (es/en/pt)', () => {
  it.each(['en', 'pt'])('%s tiene exactamente las mismas claves que es', (idioma) => {
    const otras = new Set(claves(IDIOMAS[idioma]))
    const base = new Set(BASE)
    expect(BASE.filter((c) => !otras.has(c))).toEqual([])
    expect([...otras].filter((c) => !base.has(c))).toEqual([])
  })

  it.each(['es', 'en', 'pt'])('%s no tiene textos vacíos', (idioma) => {
    const arbol = IDIOMAS[idioma]
    const vacias = claves(arbol).filter((ruta) => {
      const valor = valorDe(arbol, ruta)
      return typeof valor !== 'string' || valor.trim() === ''
    })
    expect(vacias).toEqual([])
  })

  it.each(['en', 'pt'])('%s conserva las mismas variables {{…}} que es', (idioma) => {
    const arbol = IDIOMAS[idioma]
    expect(BASE.filter((ruta) => variables(valorDe(es, ruta)) !== variables(valorDe(arbol, ruta)))).toEqual([])
  })
})
