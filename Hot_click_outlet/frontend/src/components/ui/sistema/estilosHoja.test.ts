import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { VELO_HOJA } from './estilosHoja'

const raiz = path.resolve(__dirname, '../../../..')
const tokens = readFileSync(path.join(raiz, 'src/styles/hotclick-tokens.css'), 'utf8')
const hoja = readFileSync(path.join(raiz, 'src/components/comprador/HojaInferior.tsx'), 'utf8')

describe('velo de la hoja inferior', () => {
  it('usa el token --hc-overlay y no un relleno opaco', () => {
    expect(VELO_HOJA).toBe('bg-[var(--hc-overlay)]')
    expect(hoja).toContain('VELO_HOJA')
    expect(hoja).not.toMatch(/'bg-hc-n-900'/)
  })

  it('--hc-overlay es semitransparente en claro y oscuro', () => {
    const valores = [...tokens.matchAll(/--hc-overlay:\s*rgba\([^)]*,\s*([\d.]+)\)/g)].map((m) => Number(m[1]))
    expect(valores.length).toBeGreaterThanOrEqual(2)
    for (const a of valores) expect(a).toBeLessThan(1)
  })
})
