import { describe, expect, it } from 'vitest'
import { FECHA_POR_DEFINIR, TEXTO_PAGO_NO_DISPONIBLE, TEXTO_SOLO_PROPIETARIO_PLAN, VISTA_ESTADO, mensajeErrorMensualidad, normalizarMensualidad, textoAviso } from './mensualidadApi'

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

  it('#208: montos tal cual del API, plan null y pago fail-closed', () => {
    const m = normalizarMensualidad({ success: true, data: { plan: 'PYME', estado: 'ACTIVO', monto: 15000, fecha: '2026-11-28', porcentaje: 6.5, minimoComision: 300 } })
    expect(m).toEqual({ plan: 'PYME', estado: 'ACTIVO', monto: 15000, fecha: '2026-11-28', porcentaje: 6.5, minimoComision: 300 })
    const sinPlan = normalizarMensualidad({ data: { plan: null, estado: 'ACTIVO', monto: null, fecha: null, porcentaje: null, minimoComision: null } })
    expect(sinPlan.plan).toBeNull()
    expect(sinPlan.monto).toBeNull()
    expect(mensajeErrorMensualidad({ response: { status: 503, data: { code: 'ONVO_NO_CONFIGURADO' } } }, 'x')).toBe(TEXTO_PAGO_NO_DISPONIBLE)
    expect(TEXTO_PAGO_NO_DISPONIBLE.startsWith('Todavía no disponible')).toBe(true)
    expect(mensajeErrorMensualidad({ response: { status: 403, data: { code: 'SOLO_PROPIETARIO' } } }, 'x')).toBe(TEXTO_SOLO_PROPIETARIO_PLAN)
    expect(mensajeErrorMensualidad({ response: { status: 409, data: { code: 'PLAN_SIN_PRECIO' } } }, 'x')).toContain('no tiene un precio')
    expect(mensajeErrorMensualidad(new Error('red'), 'respaldo')).toBe('respaldo')
  })
})
