import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'

function DetallePedido({ loading, error, data }) {
  if (loading) {
    return (
      <div className="flex justify-center py-10"><Spinner size="lg" /></div>
    )
  }
  if (error) {
    return (
      <p className="text-center text-[#f87171] py-8 text-sm">Error al cargar el pedido.</p>
    )
  }
  if (!data) return null

  const subtotal = data.subtotal ?? ((data.total ?? data.totalPedido ?? 0) - (data.costoEnvio ?? 0))
  const items = data.items ?? []

  return (
    <>
      <div className="rounded-xl p-3 space-y-1"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a]">Cliente</p>
        <p className="font-medium text-[#e8e8ed] text-sm">
          {data.usuarioFinal?.nombre ?? data.nombreCliente ?? '—'}
        </p>
        {data.telefono && <p className="text-xs text-[#8e8e9a]">{data.telefono}</p>}
        {data.direccionEntrega && <p className="text-xs text-[#8e8e9a]">{data.direccionEntrega}</p>}
      </div>

      {items.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a] mb-2">
            Productos ({items.length})
          </p>
          <div className="space-y-2">
            {items.map((item, i) => {
              const precio = item.precioUnitario ?? item.precio ?? 0
              const subtotalItem = precio * (item.cantidad ?? 1)
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {item.imagenUrl && (
                    <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8e8ed] truncate">
                      {item.nombreProducto ?? item.nombre ?? 'Producto'}
                    </p>
                    <p className="text-xs text-[#8e8e9a]">
                      {item.cantidad} × {formatPrice(precio)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#4ade80] shrink-0">{formatPrice(subtotalItem)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl p-3 space-y-2"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a]">Resumen</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8e8e9a]">Subtotal productos</span>
            <span className="text-[#4ade80] font-semibold">{formatPrice(subtotal)}</span>
          </div>
          {(data.costoEnvio ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-[#8e8e9a]">Costo de envío</span>
              <span className="text-amber-400 font-semibold">{formatPrice(data.costoEnvio)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="font-bold text-[#e8e8ed]">Total cobrado</span>
            <span className="font-bold text-[#4f7cff]">{formatPrice(data.total ?? data.totalPedido ?? 0)}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-1 text-xs text-[#8e8e9a]">
          {data.metodoPago && <span>Pago: <span className="text-[#e8e8ed]">{data.metodoPago}</span></span>}
          {data.metodoEnvio && <span>Envío: <span className="text-[#e8e8ed]">{data.metodoEnvio}</span></span>}
          {data.origen && <span>Canal: <span className="text-[#e8e8ed]">{data.origen}</span></span>}
        </div>
      </div>

      {data.numeroGuia && (
        <div className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <p className="text-xs font-semibold text-[#6490EA] mb-0.5">Guía de envío</p>
          <p className="text-sm text-[#e8e8ed]">{data.numeroGuia}</p>
          {data.urlTracking && (
            <a href={data.urlTracking} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#6490EA] underline mt-1 block">
              Rastrear →
            </a>
          )}
        </div>
      )}

      {data.notas && (
        <div className="rounded-xl p-3"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8e8e9a] mb-1">Notas</p>
          <p className="text-sm text-[#8e8e9a]">{data.notas}</p>
        </div>
      )}
    </>
  )
}

export default function SaleDetailModal({ pedidoId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    orderService.getById(pedidoId)
      .then((r) => { if (!cancelado) setData(r.data?.data ?? r.data) })
      .catch(() => { if (!cancelado) setError(true) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [pedidoId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="font-bold text-[#e8e8ed]">
              Pedido #{data?.numeroPedido ?? data?.id ?? pedidoId}
            </h2>
            {data?.fechaCreacion && (
              <p className="text-xs text-[#8e8e9a] mt-0.5">{formatDate(data.fechaCreacion)}</p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <DetallePedido loading={loading} error={error} data={data} />
        </div>

        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex gap-2">
            <Link to="/admin/pedidos"
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}>
              Ver en pedidos
            </Link>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
