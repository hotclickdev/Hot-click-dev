import { describe, expect, it } from 'vitest'
import { PLAZO_POR_DEFINIR, chipDe, normalizarSolicitudes, textoAlerta, validarMotivoRechazo } from './solicitudesApi'

describe('S5-22 solicitudes de reembolso', () => {
  it('alerta de plazo sin inventar el plazo', () => {
    expect(textoAlerta(0)).toBeNull()
    expect(textoAlerta(1)).toContain('1 solicitud vence pronto')
    expect(textoAlerta(2)).toContain(PLAZO_POR_DEFINIR)
  })
  it('chip «Vence pronto» solo en pendientes', () => {
    const [a, b] = normalizarSolicitudes({ data: [{ id: 1, estado: 'NUEVA', vencePronto: true }, { id: 2, estado: 'ACREDITADO', vencePronto: true }] })
    expect(chipDe(a).texto).toBe('Vence pronto')
    expect(chipDe(b).texto).toBe('Acreditado')
  })
  it('rechazar pide motivo', () => {
    expect(validarMotivoRechazo('no')).toBeTruthy()
    expect(validarMotivoRechazo('El producto se usó')).toBeNull()
  })
})
