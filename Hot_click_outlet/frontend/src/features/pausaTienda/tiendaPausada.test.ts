import { describe, expect, it } from 'vitest'
import { AVISO_TIENDA_PAUSADA, esTiendaPausada, infoTiendaPausada, productoTiendaPausada, productosTiendaPausada } from './tiendaPausada'
import { DIAS_GRACIA_POR_DEFINIR, normalizarEstadoTienda, textoDiasGracia, textoPedidosEnCurso } from './estadoTiendaApi'

const err410 = (data: unknown) => ({ response: { status: 410, data } })

describe('tienda pausada (410 TIENDA_PAUSADA)', () => {
  it('reconoce solo el 410 con code TIENDA_PAUSADA', () => {
    expect(esTiendaPausada(err410({ code: 'TIENDA_PAUSADA' }))).toBe(true)
    expect(esTiendaPausada(err410({ data: { code: 'TIENDA_PAUSADA' } }))).toBe(true)
    expect(esTiendaPausada(err410({ code: 'OTRA' }))).toBe(false)
    expect(esTiendaPausada({ response: { status: 404, data: { code: 'TIENDA_PAUSADA' } } })).toBe(false)
    expect(esTiendaPausada(null)).toBe(false)
  })
  it('usa lo que manda el backend y saca las redes', () => {
    const info = infoTiendaPausada<{ nombreComercial?: string; instagram?: string }>(err410({ code: 'TIENDA_PAUSADA', tienda: { nombreComercial: 'Taller Brasa', instagram: 'x' } }), 'taller')
    expect(info).toEqual({ nombreComercial: 'Taller Brasa', pausada: true })
    expect(infoTiendaPausada(err410({ code: 'TIENDA_PAUSADA' }), 'taller')).toEqual({ nombreComercial: 'taller', pausada: true })
    expect(productosTiendaPausada(err410({ code: 'TIENDA_PAUSADA' }))).toEqual([])
    expect(productosTiendaPausada(err410({ code: 'TIENDA_PAUSADA', productos: [{ id: 1 }] }))).toHaveLength(1)
    expect(productoTiendaPausada(err410({ code: 'TIENDA_PAUSADA' }))).toBeNull()
    expect(AVISO_TIENDA_PAUSADA).toBe('Esta tienda no está recibiendo pedidos por ahora.')
  })
  it('panel del vendedor: monto y gracia tal como vienen del backend', () => {
    const e = normalizarEstadoTienda({ data: { estado: 'PAUSADA', plan: 'Negocio Plus', montoMensualidad: 100, diasGracia: null, pedidosEnCurso: 2 } })
    expect(e.montoMensualidad).toBe(100)
    expect(textoDiasGracia(e.diasGracia)).toBe(DIAS_GRACIA_POR_DEFINIR)
    expect(textoDiasGracia(5)).toBe('5 días de gracia')
    expect(textoPedidosEnCurso(2)).toContain('entregarlos igual')
    expect(normalizarEstadoTienda({}).estado).toBe('ACTIVA')
    expect(normalizarEstadoTienda({}).montoMensualidad).toBeNull()
  })
})
