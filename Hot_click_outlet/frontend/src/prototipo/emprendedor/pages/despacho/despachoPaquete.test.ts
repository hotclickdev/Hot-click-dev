import { describe, expect, it } from 'vitest'
import { formatoColon } from '@/theme/formatoColon'
import {
  etapaDespacho,
  etiquetaComision,
  notaPlan,
  textoOtrosNegocios,
  usaGuiaCorreos,
  type PagoPaquete,
} from './despachoPaquete'

const PAGO: PagoPaquete = {
  venta: 29400, envio: 4000, comision: 2646, porcentaje: 9, minimo: 400, plan: 'EMPRENDEDOR', aRecibir: 30754,
}

describe('despachoPaquete', () => {
  it('clasifica el estado del paquete', () => {
    expect(etapaDespacho('PAGADO')).toBe('porDespachar')
    expect(etapaDespacho('enviado')).toBe('despachado')
    expect(etapaDespacho('CANCELADO')).toBe('cancelado')
    expect(etapaDespacho(null)).toBe('porDespachar')
  })

  it('solo pide guía de Correos en envío normal o pedidos sin método', () => {
    expect(usaGuiaCorreos('ENVIO_NORMAL_GAM')).toBe(true)
    expect(usaGuiaCorreos(null)).toBe(true)
    expect(usaGuiaCorreos('RETIRO_EN_TIENDA')).toBe(false)
    expect(usaGuiaCorreos('ENVIO_RAPIDO')).toBe(false)
  })

  it('nombra a los otros negocios del pedido', () => {
    expect(textoOtrosNegocios([])).toBeNull()
    expect(textoOtrosNegocios(['Bruma Café'])).toBe('El otro paquete del pedido lo despacha Bruma Café.')
    expect(textoOtrosNegocios(['Bruma Café', 'Taller Ceiba']))
      .toBe('Los otros 2 paquetes del pedido los despachan Bruma Café y Taller Ceiba.')
  })

  it('explica la comisión con el cálculo real', () => {
    expect(etiquetaComision(PAGO)).toBe('Comisión HotClick 9%')
    expect(notaPlan(PAGO)).toBe(
      `Plan Emprendedor: 9% por venta, mínimo ${formatoColon(400)}, pasarela incluida. `
      + `9% de ${formatoColon(29400)} = ${formatoColon(2646)}. HotClick cobró al cliente y te transfiere este monto.`,
    )
    expect(notaPlan({ ...PAGO, comision: 400 })).toContain(`Se aplicó el mínimo de ${formatoColon(400)}.`)
  })
})
