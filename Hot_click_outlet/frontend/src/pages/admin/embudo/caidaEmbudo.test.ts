import { describe, expect, it } from 'vitest'
import { caidaDominante, motivoMasFrecuente, textoAccion } from '@/pages/admin/embudo/caidaEmbudo'
import type { ResumenEmbudo } from '@/services/embudoService'

function resumen(parcial: Partial<ResumenEmbudo>): ResumenEmbudo {
  return {
    dias: 7,
    visita: 0,
    producto: 0,
    carrito: 0,
    checkout: 0,
    pagoIntento: 0,
    pedidosPagados: 0,
    busquedaVacia: 0,
    errorDatos: 0,
    errorEntrega: 0,
    sinComprobante: 0,
    pagoFallido: 0,
    pagoCancelado: 0,
    carritosPendientes: 0,
    carritosEmailEnviado: 0,
    ...parcial,
  }
}

describe('caida del embudo', () => {
  it('marca antes cuando vieron producto y no armaron carrito', () => {
    const r = resumen({ producto: 10, carrito: 2, pedidosPagados: 1, busquedaVacia: 4 })
    expect(caidaDominante(r)).toEqual({ fase: 'antes', personas: 8, detalle: 'producto' })
    expect(textoAccion(r).titulo).toContain('Antes')
    expect(textoAccion(r).cuerpo).toContain('4')
  })

  it('marca durante cuando el carrito no llega a pedido pagado', () => {
    const r = resumen({
      producto: 10,
      carrito: 9,
      pedidosPagados: 1,
      sinComprobante: 5,
      errorDatos: 1,
    })
    expect(caidaDominante(r)).toEqual({ fase: 'durante', personas: 8, detalle: 'carrito' })
    expect(motivoMasFrecuente(r)?.etiqueta).toBe('el comprobante SINPE')
    expect(textoAccion(r).titulo).toContain('Durante')
  })

  it('marca durante cuando abrieron checkout y no intentaron pagar, aunque haya pedidos viejos', () => {
    const r = resumen({
      producto: 1,
      carrito: 1,
      checkout: 1,
      pagoIntento: 0,
      pedidosPagados: 3,
      errorDatos: 1,
    })
    expect(caidaDominante(r)).toEqual({ fase: 'durante', personas: 1, detalle: 'checkout' })
    expect(textoAccion(r).cuerpo).toContain('abrió el checkout')
    expect(textoAccion(r).cuerpo).toContain('datos incompletos')
  })
})
