import { describe, expect, it } from 'vitest'
import {
  etiquetaEstadoEncargo,
  etiquetaOrigenPedido,
  llegadaEncargo,
} from './ventaLlegada'

describe('ventaLlegada', () => {
  it('traduce el origen que guarda el pedido', () => {
    expect(etiquetaOrigenPedido(undefined)).toBe('Tienda')
    expect(etiquetaOrigenPedido('ONLINE')).toBe('Tienda')
    expect(etiquetaOrigenPedido('pos')).toBe('Caja')
    expect(etiquetaOrigenPedido('TIENDA_WEB')).toBe('Tienda del vendedor')
    expect(etiquetaOrigenPedido('QR')).toBe('Código QR')
    expect(etiquetaOrigenPedido('TELEGRAM')).toBe('Telegram')
    expect(etiquetaOrigenPedido('ASIGNACION_MANUAL')).toBe('A mano')
    expect(etiquetaOrigenPedido('DESCONOCIDO')).toBe('Otro canal')
  })

  it('dice si el encargo llegó por la ficha o ya tiene pedido', () => {
    expect(llegadaEncargo(null)).toBe('Ficha del producto')
    expect(llegadaEncargo(undefined)).toBe('Ficha del producto')
    expect(llegadaEncargo(12)).toBe('Ligada a un pedido')
  })

  it('nombra el estado del encargo', () => {
    expect(etiquetaEstadoEncargo('TODOS')).toBe('Todos')
    expect(etiquetaEstadoEncargo('PENDIENTE')).toBe('Por cotizar')
    expect(etiquetaEstadoEncargo('PENDIENTE_PAGO')).toBe('Esperando pago')
  })
})
