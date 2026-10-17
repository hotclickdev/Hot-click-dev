import { describe, expect, it } from 'vitest'
import { FECHA_POR_DEFINIR, VISTA_ESTADO, normalizarMensualidad, textoAviso } from './mensualidadApi'

describe('S4-24 próxima mensualidad', () => {
  it('monto y fecha del backend; sin fecha dice que la define HOT_CLICK', () => {
    const m = normalizarMensualidad({ data: { plan: 'Pyme', estado: 'ACTIVO', monto: 1 } })
    expect(m.monto).toBe(1)
    expect(textoAviso(m)).toContain(FECHA_POR_DEFINIR)
    expect(normalizarMensualidad({}).monto).toBeNull()
  })
  it('tres estados; Completar pago solo en pendiente y en gracia', () => {
    expect(VISTA_ESTADO.ACTIVO.conPago).toBe(false)
    expect(VISTA_ESTADO.PENDIENTE_PAGO.conPago).toBe(true)
    expect(VISTA_ESTADO.EN_GRACIA.chip).toBe('En gracia')
    expect(textoAviso(normalizarMensualidad({ estado: 'EN_GRACIA' }))).toContain('AGOTADO')
  })
})
