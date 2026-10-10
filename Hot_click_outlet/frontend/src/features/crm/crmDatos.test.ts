import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/services/api', () => ({ default: { get: (...a: unknown[]) => get(...a) } }))

import { crmDataProvider, fechaOGuion, montoOGuion, numeroOGuion, textoOGuion, tonoEstado } from './crmDatos'

describe('crmDatos', () => {
  beforeEach(() => get.mockReset())

  it('sin dato pinta «—» y nunca inventa un 0', () => {
    expect(montoOGuion(null)).toBe('—')
    expect(montoOGuion(undefined)).toBe('—')
    expect(montoOGuion(Number.NaN)).toBe('—')
    expect(montoOGuion(60000)).toContain('60')
    expect(numeroOGuion(null)).toBe('—')
    expect(numeroOGuion(0)).toBe('0')
    expect(textoOGuion('  ')).toBe('—')
    expect(fechaOGuion(null)).toBe('—')
    expect(fechaOGuion('no-es-fecha')).toBe('—')
  })

  it('getList pide /admin/crm/compras con página 0-based, tamaño y filtros permitidos', async () => {
    get.mockResolvedValue({ data: { content: [{ id: 1, lineas: [] }], totalElements: 41 } })
    const r = await crmDataProvider.getList({
      resource: 'compras',
      pagination: { currentPage: 3, pageSize: 20 },
      filters: [{ field: 'empresaId', operator: 'eq', value: 7 }, { field: 'otro', operator: 'eq', value: 'x' }],
    })
    expect(get).toHaveBeenCalledWith('/admin/crm/compras', { params: { page: 2, size: 20, empresaId: 7 } })
    expect(r.total).toBe(41)
    expect(r.data).toHaveLength(1)
  })

  it('getOne solo acepta compradores y negocios; escribir falla', async () => {
    get.mockResolvedValue({ data: { id: 5 } })
    await crmDataProvider.getOne({ resource: 'negocios', id: 5 })
    expect(get).toHaveBeenCalledWith('/admin/crm/negocios/5', { params: { page: 0, size: 10 } })
    await expect(crmDataProvider.getOne({ resource: 'usuarios', id: 1 })).rejects.toThrow()
    expect(() => crmDataProvider.deleteOne({ resource: 'compras', id: 1 })).toThrow()
  })

  it('tono del estado', () => {
    expect(tonoEstado('PAGADO')).toBe('ok')
    expect(tonoEstado('CANCELADO')).toBe('alerta')
    expect(tonoEstado('PENDIENTE')).toBe('neutro')
  })
})
