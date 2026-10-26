import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Andrés decidió eliminar el editor de cotizaciones sin ruta (pages/admin/nueva-cotizacion).
// Este chequeo falla si el directorio vuelve o si queda algún import a lo borrado.
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|jsx?|mjs)$/.test(n) ? [p] : []
  })
}

const PROHIBIDOS = [/nueva-cotizacion/, /nuevaCotizacionUi/, /montoCotizacionUnidad/, /cotizacionClienteService/]

describe('editor de cotizaciones eliminado', () => {
  it('el directorio nueva-cotizacion ya no existe', () => {
    expect(existsSync(path.join(src, 'pages/admin/nueva-cotizacion'))).toBe(false)
  })

  it('ningún archivo de src referencia lo borrado', () => {
    const yo = fileURLToPath(import.meta.url)
    const hallazgos = archivos(src)
      .filter((f) => path.resolve(f) !== path.resolve(yo))
      .flatMap((f) => {
        const txt = readFileSync(f, 'utf8')
        return PROHIBIDOS.filter((r) => r.test(txt)).map((r) => `${path.relative(src, f)} → ${r}`)
      })
    expect(hallazgos).toEqual([])
  })
})
