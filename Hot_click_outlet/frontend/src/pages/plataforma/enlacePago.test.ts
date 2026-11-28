import { describe, expect, it } from 'vitest'
import { interruptoresDe, textoCobroNegocio, esUrlHttps, etiquetaEstado, pct, resumenComision, validarEnlace } from './enlacePago'

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
  it('solo acepta https:// como destino del botón de pago', () => {
    expect(esUrlHttps('https://checkout.onvopay.com/s/abc')).toBe(true)
    for (const url of ['http://x.test', 'javascript:alert(1)', 'data:text/html,x', '//x.test', 'no es url', '', null, undefined, 5]) {
      expect(esUrlHttps(url)).toBe(false)
    }
  })
  it('los interruptores de ONVO quedan apagados salvo un true explícito', () => {
    expect(interruptoresDe({ cobroANombreNegocio: true, enlacesPago: false })).toEqual({ cobroANombreNegocio: true, enlacesPago: false })
    for (const raro of [undefined, null, '<html>', 'true', { cobroANombreNegocio: 1, enlacesPago: 'si' }, []]) {
      expect(interruptoresDe(raro)).toEqual({ cobroANombreNegocio: false, enlacesPago: false })
    }
    expect(textoCobroNegocio(false)).toBe('Cobro a nombre del negocio: desactivado')
    expect(textoCobroNegocio(true)).toBe('Cobro a nombre del negocio: activado')
  })
})
