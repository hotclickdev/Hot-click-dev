import { describe, expect, it } from 'vitest'
import { etiquetaEstado, pct, resumenComision, validarEnlace } from './enlacePago'

describe('enlace de pago único', () => {
  it('acepta monto y motivo válidos y limpia separadores', () => {
    expect(validarEnlace('50.000', '  Factura tardía de octubre ')).toEqual({ ok: true, monto: 50000, motivo: 'Factura tardía de octubre' })
  })
  it('rechaza monto vacío, no numérico o fuera de rango', () => {
    for (const monto of ['', 'abc', '0', '500', '99999999', '-5']) {
      expect(validarEnlace(monto, 'motivo válido').ok).toBe(false)
    }
  })
  it('rechaza motivo corto o demasiado largo', () => {
    expect(validarEnlace('5000', 'ab').ok).toBe(false)
    expect(validarEnlace('5000', 'x'.repeat(201)).ok).toBe(false)
  })
  it('etiqueta cada estado', () => {
    expect(etiquetaEstado('CREADO').texto).toBe('Abierto')
    expect(etiquetaEstado('PAGADO').tono).toBe('ok')
    expect(etiquetaEstado('EXPIRADO').texto).toBe('Expirado')
  })
  it('resume la sincronización con ONVO', () => {
    const base = { efectivoPct: 9, enviadoPct: 9, enviadoEn: null, pendiente: false, tieneCuenta: true, ultimoError: null }
    expect(resumenComision(base).texto).toBe('Sincronizado')
    expect(resumenComision({ ...base, pendiente: true }).texto).toBe('Pendiente de sincronizar')
    expect(resumenComision({ ...base, tieneCuenta: false }).tono).toBe('neutro')
    expect(pct(7.5)).toBe('7.50 %')
    expect(pct(null)).toBe('—')
  })
})
