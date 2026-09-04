import { describe, expect, it } from 'vitest'
import {
  DIAS_RETENCION_AUDITORIA,
  etiquetaAccion,
  listaTipos,
  paginaAuditoria,
} from './auditoriasHelpers'

describe('auditoriasHelpers', () => {
  it('etiquetaAccion mapea SINPE y deja fallback legible', () => {
    expect(etiquetaAccion('APROBAR_SINPE')).toBe('Aprobar SINPE')
    expect(etiquetaAccion('IMPERSONACION_INICIO')).toBe('Impersonar negocio')
    expect(etiquetaAccion('IMPERSONACION_FIN')).toBe('Salir impersonación')
    expect(etiquetaAccion('OTRA_COSA')).toBe('OTRA COSA')
  })

  it('paginaAuditoria unwrap ResponseDTO', () => {
    const p = paginaAuditoria({
      data: { content: [{ id: 1 }], totalElements: 1, totalPages: 1, page: 0, diasRetencion: 90 },
    })
    expect(p.content).toHaveLength(1)
    expect(p.diasRetencion).toBe(DIAS_RETENCION_AUDITORIA)
  })

  it('listaTipos tolera payload vacío', () => {
    expect(listaTipos(null)).toEqual([])
    expect(listaTipos({ data: ['A', 'B'] })).toEqual(['A', 'B'])
  })
})
