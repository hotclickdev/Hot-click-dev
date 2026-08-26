import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import CrearPedidoModal from './ordenes/CrearPedidoModal'
import VentasTab from './sistema-ventas/VentasTab'
import PedidosTab from './sistema-ventas/PedidosTab'
import { estiloBadgePendientes, estiloTab, textoConteoPedidos } from './sistema-ventas/ventasPedidosHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TextoMas from '@/components/ui/TextoMas'

const CLASE_CTA = 'inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90'
const ESTILO_CTA = { backgroundColor: 'var(--hc-primary)', color: '#fff' }

export default function SistemaVentasPedidos() {
  const [tab, setTab] = useState('pedidos')
  const [showCreate, setShowCreate] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = () => {
    setLoading(true)
    setLoadError(false)
    orderService.getAll()
      .then(({ data }) => {
        const raw = data?.data ?? data
        setOrders(Array.isArray(raw) ? raw : raw?.content ?? [])
      })
      .catch((err) => {
        console.error('[SistemaVentasPedidos] pedidos', err)
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUpdate = (id, fields) => setOrders(prev => prev.map(o => o.id === id ? { ...o, ...fields } : o))
  const handleDelete = (id) => setOrders(prev => prev.filter(o => o.id !== id))
  const handleCreated = (newOrder) => { if (newOrder?.id) setOrders(prev => [newOrder, ...prev]); else load() }

  const pendientes = orders.filter(o => o.estado === 'PENDIENTE').length

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">Inicio</TextoFlecha>
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Ventas y pedidos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {textoConteoPedidos(orders.length, pendientes)}
          </p>
        </div>
        <AccionPrincipal tab={tab} onCrearPedido={() => setShowCreate(true)} />
      </div>

      <TabsVentasPedidos tab={tab} pendientes={pendientes} onTab={setTab} />

      {tab === 'ventas'
        ? <VentasTab />
        : <PedidosTab orders={orders} loading={loading} loadError={loadError} onRetry={load} onUpdate={handleUpdate} onDelete={handleDelete} />
      }

      {showCreate && (
        <CrearPedidoModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

function AccionPrincipal({ tab, onCrearPedido }) {
  if (tab === 'ventas') {
    return (
      <Link to="/admin/pos" className={CLASE_CTA} style={ESTILO_CTA}>
        <TextoMas>Registrá una venta</TextoMas>
      </Link>
    )
  }
  return (
    <button type="button" onClick={onCrearPedido} className={CLASE_CTA} style={ESTILO_CTA}>
      <TextoMas>Creá un pedido</TextoMas>
    </button>
  )
}

function TabsVentasPedidos({ tab, pendientes, onTab }) {
  return (
    <div className="inline-flex gap-1 rounded-xl p-1 w-fit" style={{ backgroundColor: 'var(--hc-surface)' }}>
      <button type="button" onClick={() => onTab('ventas')}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={estiloTab(tab === 'ventas')}>
        Ventas
      </button>
      <button type="button" onClick={() => onTab('pedidos')}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
        style={estiloTab(tab === 'pedidos')}>
        Pedidos
        {pendientes > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={estiloBadgePendientes(tab === 'pedidos')}>
            {pendientes}
          </span>
        )}
      </button>
    </div>
  )
}
