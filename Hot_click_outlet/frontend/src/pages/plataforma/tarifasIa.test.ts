import { describe, expect, it } from 'vitest'
import { leerTarifas } from './tarifasIa'

describe('leerTarifas (panel /plataforma/ia)', () => {
  it('toma las tarifas del backend, no valores fijos del front', () => {
    const t = leerTarifas({ tarifasUsdPorMillon: {
      principal: { inputPorM: 1, outputPorM: 5, cacheLecturaPorM: 0.1, cacheEscrituraPorM: 1.25 },
      sonnet46: { inputPorM: 3, outputPorM: 15, cacheLecturaPorM: 0.3, cacheEscrituraPorM: 3.75 },
    } })
    expect(t).toEqual([
      { modelo: 'Haiku 4.5 (asistente)', inputPorM: 1, outputPorM: 5, cacheLecturaPorM: 0.1, cacheEscrituraPorM: 1.25 },
      { modelo: 'Sonnet 4.6 (incidentes)', inputPorM: 3, outputPorM: 15, cacheLecturaPorM: 0.3, cacheEscrituraPorM: 3.75 },
    ])
  })
  it('refleja un cambio de configuración (ia.precio.*)', () => {
    const t = leerTarifas({ tarifasUsdPorMillon: { principal: { inputPorM: 2, outputPorM: 8, cacheLecturaPorM: 0.2, cacheEscrituraPorM: 2.5 } } })
    expect(t).toHaveLength(1)
    expect(t[0].outputPorM).toBe(8)
  })
  it('sin datos o con datos inválidos no inventa precios', () => {
    expect(leerTarifas(null)).toEqual([])
    expect(leerTarifas({})).toEqual([])
    expect(leerTarifas({ tarifasUsdPorMillon: { principal: { inputPorM: 'x', outputPorM: 5, cacheLecturaPorM: 0.1, cacheEscrituraPorM: 1.25 } } })).toEqual([])
  })
})
