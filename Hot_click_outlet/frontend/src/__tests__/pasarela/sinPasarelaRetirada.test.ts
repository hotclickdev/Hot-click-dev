import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regresión: ONVO es el único procesador de tarjeta. La pasarela anterior se retiró por completo;
 * este test falla si su nombre vuelve a aparecer en el front (código, i18n, tests o assets públicos).
 * El término se arma por partes para que este archivo no se detecte a sí mismo.
 */
const RETIRADA = new RegExp(['tilo', 'pay'].join(''), 'i')
const RAIZ = process.cwd()
const ESTE = relative(RAIZ, __filename)

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === 'node_modules' || n === 'dist' ? [] : archivos(p)
    return /\.(ts|tsx|js|jsx|json|html|css|md)$/.test(n) ? [relative(RAIZ, p)] : []
  })
}

describe('pasarela retirada', () => {
  it.each(['src', 'tests', 'public'])('%s no la menciona', (dir) => {
    let lista: string[] = []
    try { lista = archivos(join(RAIZ, dir)) } catch { return }
    const con = lista.filter((f) => f !== ESTE && RETIRADA.test(readFileSync(join(RAIZ, f), 'utf8')))
    expect(con).toEqual([])
  })
})
