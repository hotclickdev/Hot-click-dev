import { describe, expect, it } from 'vitest'
import { errorArchivoXml, etiquetaEstado, sePuedeSubir, textoAvisoPanel, textoPeriodo, tonoEstado, MAX_BYTES_XML } from './facturaNegocio'

describe('factura del negocio a HotClick', () => {
  it('etiquetas y tonos de cada estado', () => {
    expect(etiquetaEstado('NO_APLICA')).toBe('No aplica')
    expect(etiquetaEstado('ACEPTADA')).toBe('Aceptada')
    expect(etiquetaEstado('RECIBIDA')).toBe('Recibida, pendiente de revisión de HotClick')
    expect(etiquetaEstado('OTRO')).toBe('OTRO')
    expect(tonoEstado('ACEPTADA')).toBe('ok')
    expect(tonoEstado('VENCIDA')).toBe('alerta')
    expect(tonoEstado('PENDIENTE')).toBe('azul')
    expect(tonoEstado('NO_APLICA')).toBe('neutro')
  })

  it('solo se sube en PENDIENTE, RECHAZADA o VENCIDA', () => {
    expect(['PENDIENTE', 'RECHAZADA', 'VENCIDA'].every(sePuedeSubir)).toBe(true)
    expect(['ACEPTADA', 'NO_APLICA', 'RECIBIDA'].some(sePuedeSubir)).toBe(false)
  })

  it('aviso del panel con los días que quedan', () => {
    expect(textoAvisoPanel(3)).toBe('Enviá tu factura de la quincena (te quedan 3 días)')
    expect(textoAvisoPanel(1)).toBe('Enviá tu factura de la quincena (te queda 1 día)')
    expect(textoAvisoPanel(0)).toContain('vence hoy')
  })

  it('archivo: XML de hasta 1 MB', () => {
    expect(errorArchivoXml(null)).toContain('Elegí')
    expect(errorArchivoXml({ name: 'factura.pdf', size: 10 })).toContain('.xml')
    expect(errorArchivoXml({ name: 'factura.XML', size: 0 })).toContain('vacío')
    expect(errorArchivoXml({ name: 'factura.xml', size: MAX_BYTES_XML + 1 })).toContain('1 MB')
    expect(errorArchivoXml({ name: 'factura.xml', size: 2048 })).toBeNull()
  })

  it('texto del periodo', () => {
    expect(textoPeriodo('2026-03-01', '2026-03-15')).toMatch(/^1 al 15 de marzo/)
    expect(textoPeriodo('x', 'y')).toBe('x al y')
  })
})
