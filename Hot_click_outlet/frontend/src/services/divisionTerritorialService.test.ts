import { describe, expect, it, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }))

const SJ = [{ codigo: '1', nombre: 'San José', cantones: [] }]

describe('divisionTerritorialService (QA-114-2)', () => {
  beforeEach(() => { vi.resetModules(); get.mockReset() })

  it('acepta la lista ya desenvuelta por el interceptor', async () => {
    get.mockResolvedValue({ data: SJ })
    const { cargarDivisionTerritorial } = await import('./divisionTerritorialService')
    await expect(cargarDivisionTerritorial()).resolves.toEqual(SJ)
  })

  it('acepta también el sobre {data}', async () => {
    const { extraerCatalogo } = await import('./divisionTerritorialService')
    expect(extraerCatalogo({ success: true, data: SJ })).toEqual(SJ)
  })

  it('catálogo vacío sigue siendo error', async () => {
    get.mockResolvedValue({ data: [] })
    const { cargarDivisionTerritorial } = await import('./divisionTerritorialService')
    await expect(cargarDivisionTerritorial()).rejects.toThrow('catálogo vacío')
  })
})
