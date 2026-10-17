import { describe, expect, it } from 'vitest'
import { AVISO_SIN_CONTRA_ENTREGA, cargoContraEntrega, estadoContraEntrega, negociosDelPedido, textoCargoContraEntrega } from './contraEntregaPorNegocio'
import { TEXTO_SOLO_PROPIETARIO_CE, configDesdeFormulario, leerMinimo, mensajeErrorContraEntrega } from '@/prototipo/compartido/contraEntregaConfigHelpers'

const normal = ['ENVIO_NORMAL_GAM', 'ENVIO_NORMAL_GAM']
const acepta = (minimo: number | null = null) => ({ empresaAceptaContraEntrega: true, empresaContraEntregaMinimo: minimo })

describe('S2 contra entrega por negocio', () => {
  it('se ofrece si los 2 negocios la aceptan', () => {
    expect(estadoContraEntrega([{ subtotal: 21500, items: [acepta()] }, { subtotal: 20900, items: [acepta()] }], normal, true))
      .toEqual({ disponible: true, motivo: null })
  })

  it('si uno no la acepta, se oculta para todo el pedido y se explica', () => {
    const e = estadoContraEntrega([{ subtotal: 21500, items: [acepta()] }, { subtotal: 20900, items: [{ empresaAceptaContraEntrega: false }] }], normal, true)
    expect(e).toEqual({ disponible: false, motivo: 'negocio' })
    expect(AVISO_SIN_CONTRA_ENTREGA.negocio).toContain('uno de los negocios de tu carrito no lo acepta')
  })

  it('respeta el pedido mínimo del negocio', () => {
    expect(estadoContraEntrega([{ subtotal: 5000, items: [acepta(10000)] }], ['ENVIO_NORMAL_GAM'], true).motivo).toBe('minimo')
    expect(estadoContraEntrega([{ subtotal: 15000, items: [acepta(10000)] }], ['ENVIO_NORMAL_GAM'], true).disponible).toBe(true)
  })

  it('sin config global o con envío que no es normal no se ofrece (sin aviso de negocio)', () => {
    expect(estadoContraEntrega([{ subtotal: 1, items: [acepta()] }], normal, false)).toEqual({ disponible: false, motivo: null })
    expect(estadoContraEntrega([{ subtotal: 1, items: [acepta()] }], ['ENVIO_RAPIDO'], true)).toEqual({ disponible: false, motivo: null })
  })

  it('backend actual (sin el campo por negocio): manda la config global como antes', () => {
    expect(estadoContraEntrega([{ subtotal: 1, items: [{}] }], ['ENVIO_NORMAL_GAM'], true).disponible).toBe(true)
  })

  it('el formulario del negocio lee el mínimo opcional', () => {
    expect(leerMinimo('')).toEqual({ minimo: null, error: null })
    expect(leerMinimo('₡10.000')).toEqual({ minimo: 10000, error: null })
    expect(leerMinimo('diez').error).toBeTruthy()
    expect(configDesdeFormulario(false, '5000').config).toEqual({ acepta: false, minimo: null })
  })
})


describe('cargo de contra entrega por negocio (decisión del dueño)', () => {
  const p = (bodegaId: string, empresaId?: number, empresaNombre?: string) => ({ bodegaId, empresaNombre, items: [{ empresaId }] })
  const fmt = (n: number) => `₡${n}`
  it('cuenta negocios, no bodegas', () => {
    expect(negociosDelPedido([p('1', 10), p('2', 10), p('3', 20)])).toBe(2)
    expect(negociosDelPedido([p('1', undefined, 'Sofi'), p('2', undefined, 'Sofi')])).toBe(1)
  })
  it('multiplica el monto de la config por negocio y no inventa montos', () => {
    const c = cargoContraEntrega([p('1', 10), p('2', 20)], 4000)!
    expect(c.total).toBe(8000)
    expect(textoCargoContraEntrega(c, fmt)).toBe('Envío contra entrega: ₡4000 por negocio · 2 negocios = ₡8000')
    expect(textoCargoContraEntrega(cargoContraEntrega([p('1', 10)], 4000)!, fmt)).toBe('Envío contra entrega: ₡4000 por negocio')
    expect(cargoContraEntrega([p('1', 10)], null)).toBeNull()
  })

  it('#211: mínimo 0 o mayor al tope no se manda; errores del backend', () => {
    expect(leerMinimo('0').error).toBeTruthy()
    expect(leerMinimo('100000001').error).toBeTruthy()
    expect(leerMinimo('100000000')).toEqual({ minimo: 100000000, error: null })
    const e = (status: number, code?: string) => ({ response: { status, data: { success: false, code } } })
    expect(mensajeErrorContraEntrega(e(403, 'SOLO_PROPIETARIO'), 'x')).toBe(TEXTO_SOLO_PROPIETARIO_CE)
    expect(mensajeErrorContraEntrega(e(400, 'MINIMO_INVALIDO'), 'x')).toContain('mayor a cero')
    expect(mensajeErrorContraEntrega(e(400, 'ACEPTA_INVALIDO'), 'x')).toContain('aceptás')
    expect(mensajeErrorContraEntrega(new Error('red'), 'respaldo')).toBe('respaldo')
  })
})
