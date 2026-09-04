import { describe, expect, it } from 'vitest'
import {
  detalleUsoDesdeRespuesta,
  etiquetaLimiteAi,
  formatoTokens,
  ordenarTenants,
  rankingDesdeRespuesta,
  tonoCuotaAi,
  claseCuotaAi,
  type UsoTenantFila,
} from './usoTenantHelpers'

function fila(partial: Partial<UsoTenantFila> & Pick<UsoTenantFila, 'empresaId'>): UsoTenantFila {
  return {
    gmv: 0,
    pedidos: 0,
    gmvMes: 0,
    pedidosMes: 0,
    llamadasAi: 0,
    tokensEntrada: 0,
    tokensSalida: 0,
    tokensMes: 0,
    limiteAi: 0,
    pctCuotaAi: 0,
    costoAiUsd: 0,
    productos: 0,
    imagenes: 0,
    ...partial,
  }
}

describe('rankingDesdeRespuesta', () => {
  it('tolera payload vacío', () => {
    expect(rankingDesdeRespuesta(null).tenants).toEqual([])
    expect(rankingDesdeRespuesta({ anio: 2026, mes: 9, tenants: [{ empresaId: 2 }] }).tenants).toHaveLength(1)
  })
})

describe('detalleUsoDesdeRespuesta', () => {
  it('exige empresaId', () => {
    expect(detalleUsoDesdeRespuesta({})).toBeNull()
    expect(detalleUsoDesdeRespuesta({ empresaId: 3, gmv: 100 })?.gmv).toBe(100)
  })
})

describe('ordenarTenants', () => {
  it('ordena por GMV descendente', () => {
    const lista = [
      fila({ empresaId: 1, gmv: 10, tokensMes: 500 }),
      fila({ empresaId: 2, gmv: 90, tokensMes: 100 }),
      fila({ empresaId: 3, gmv: 40, tokensMes: 900 }),
    ]
    expect(ordenarTenants(lista, 'gmv').map((t) => t.empresaId)).toEqual([2, 3, 1])
    expect(ordenarTenants(lista, 'tokensMes').map((t) => t.empresaId)).toEqual([3, 1, 2])
  })
})

describe('etiquetas y tonos', () => {
  it('formato de límites y tokens', () => {
    expect(etiquetaLimiteAi(-1)).toBe('Ilimitado')
    expect(etiquetaLimiteAi(0)).toBe('Sin IA')
    expect(formatoTokens(1_500_000)).toBe('1.5M')
    expect(formatoTokens(2500)).toBe('2.5k')
  })

  it('tono de cuota', () => {
    expect(tonoCuotaAi(0)).toBe('muted')
    expect(tonoCuotaAi(50)).toBe('ok')
    expect(tonoCuotaAi(85)).toBe('warn')
    expect(tonoCuotaAi(100)).toBe('danger')
    expect(claseCuotaAi(100)).toContain('red')
  })
})
