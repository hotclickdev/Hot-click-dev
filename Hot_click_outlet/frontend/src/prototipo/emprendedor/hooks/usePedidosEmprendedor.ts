import { useEffect, useState } from 'react'
import { PEDIDOS_DEMO } from '../data/pedidosDemo'
import { orderService } from '@/services/orderService'
import type { PedidoEmprendedor } from '../types'

type Resultado = { pedidos: PedidoEmprendedor[]; loading: boolean }

function mapearPedido(raw: Record<string, unknown>, indice: number): PedidoEmprendedor {
  const estadoRaw = String(raw.estado ?? 'PENDIENTE').toUpperCase()
  const estado: PedidoEmprendedor['estado'] =
    estadoRaw.includes('ENTREG') || estadoRaw.includes('COMPLET')
      ? 'Entregado'
      : estadoRaw.includes('ENVI')
        ? 'Enviado'
        : 'Pendiente'
  const crudos = Array.isArray(raw.detalles) ? raw.detalles : Array.isArray(raw.items) ? raw.items : []
  const items = crudos as Record<string, unknown>[]
  return {
    id: String(raw.id ?? 3000 + indice),
    cliente: String(raw.nombreCliente ?? raw.clienteNombre ?? raw.cliente ?? 'Cliente'),
    total: Number(raw.total ?? raw.montoTotal ?? 0),
    estado,
    fecha: String(raw.fecha ?? raw.fechaCreacion ?? ''),
    direccion: String(raw.direccion ?? raw.direccionEnvio ?? 'Costa Rica'),
    productos: items.map((item, i) => ({
      id: String(item.id ?? i),
      nombre: String(item.nombre ?? item.nombreProducto ?? 'Producto'),
      cantidad: Number(item.cantidad ?? 1),
      precio: Number(item.precio ?? item.precioUnitario ?? 0),
    })),
  }
}

export function usePedidosEmprendedor(): Resultado {
  const [pedidos, setPedidos] = useState(PEDIDOS_DEMO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    orderService
      .getAll()
      .then((respuesta) => {
        if (!vivo) return
        const data = respuesta.data
        const lista = Array.isArray(data) ? data : data?.content ?? []
        if (lista.length === 0) {
          setPedidos(PEDIDOS_DEMO)
          return
        }
        setPedidos(lista.map((item: Record<string, unknown>, i: number) => mapearPedido(item, i)))
      })
      .catch((err: unknown) => {
        console.error('[prototipo emprendedor] pedidos', err)
        if (vivo) setPedidos(PEDIDOS_DEMO)
      })
      .finally(() => {
        if (vivo) setLoading(false)
      })
    return () => {
      vivo = false
    }
  }, [])

  return { pedidos, loading }
}
