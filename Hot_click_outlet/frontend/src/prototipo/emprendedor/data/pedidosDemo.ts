import type { PedidoEmprendedor } from '../types'

export const PEDIDOS_DEMO: PedidoEmprendedor[] = [
  {
    id: '3008',
    cliente: 'Ana Jiménez',
    total: 18500,
    estado: 'Pendiente',
    fecha: '26/08/2026',
    direccion: 'Heredia, CR',
    productos: [{ id: 'x200', nombre: 'Auriculares Bluetooth X200', cantidad: 1, precio: 18500 }],
  },
  {
    id: '3007',
    cliente: 'Diego Salas',
    total: 9900,
    estado: 'Entregado',
    fecha: '24/08/2026',
    direccion: 'San José, CR',
    productos: [{ id: 'oversize', nombre: 'Camiseta Oversize Negra', cantidad: 1, precio: 9900 }],
  },
]
