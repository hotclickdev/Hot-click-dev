import { describe, expect, it } from 'vitest'
import { aPedidoEmprendedor, aPedidoSeller } from './pedidosVendedorApi'
import { mensajeWhatsAppPedido } from '@/pages/admin/ordenes/ordenesHelpers'
import { buildActivity } from '@/pages/admin/dashboard/dashboardHelpers'
import { etiquetaPedido } from '@/utils/numeroPedidoTienda'
import type { Pedido } from '@/types/pedido'

// Fragmento del ejemplo de GET /api/pedidos/{id} en docs/contratos/S4-20-numero-pedido-tienda.md (#194).
const nuevo: Pedido = { id: 4821, numeroPedido: 'ORD-20261016-AB12', numeroTienda: 37, estadoPedido: 'PENDIENTE' }
const viejo: Pedido = { id: 99, numeroPedido: 'ORD-20250101-ZZ99', numeroTienda: null, estado: 'ENTREGADO' }

describe('S4-20 en el panel del vendedor', () => {
  it('el mapeo conserva numeroTienda y numeroPedido hasta la vista', () => {
    const vista = aPedidoSeller(aPedidoEmprendedor(nuevo))
    expect(vista.numeroTienda).toBe(37)
    expect(etiquetaPedido(vista)).toBe('Pedido #37')
    expect(etiquetaPedido(vista)).not.toContain('4821')
  })

  it('un pedido viejo se sigue viendo con numeroPedido', () => {
    const vista = aPedidoSeller(aPedidoEmprendedor(viejo))
    expect(vista.numeroTienda).toBeNull()
    expect(etiquetaPedido(vista)).toBe('Pedido ORD-20250101-ZZ99')
  })

  it('el WhatsApp al cliente usa el número de la tienda, no el id', () => {
    const texto = mensajeWhatsAppPedido({ ...nuevo, nombreCliente: 'Ana' }, 'PENDIENTE')
    expect(texto).toContain('pedido *#37*')
    expect(texto).not.toContain('4821')
  })

  it('la actividad del dashboard no muestra el id interno', () => {
    const [venta] = buildActivity([{ id: 4821, numeroTienda: 37, estado: 'PAGADO', fechaCreacion: '2026-10-16T10:00:00' }], [])
    expect(venta.title).toBe('Nueva venta #37')
    const [sinNumero] = buildActivity([{ id: 4821, estado: 'PAGADO', fechaCreacion: '2026-10-16T10:00:00' }], [])
    expect(sinNumero.title).toBe('Nueva venta')
  })
})
