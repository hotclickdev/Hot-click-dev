import { useState } from 'react'
import { formatDateShort, formatPrice } from '@/utils/format'
import { PencilIcon } from './empresasIcons'
import EstadoBadge from './EstadoBadge'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import { ESTADOS_PEDIDO, type EmpresaPedidoTab } from './empresasHelpers'
import type { Id } from '@/types/api'

function PedidoEditor({
  pedido,
  saving,
  onCambiarEstado,
  onAsignarGuia,
}: {
  pedido: EmpresaPedidoTab
  saving: boolean
  onCambiarEstado: (id: Id, estado: string) => void
  onAsignarGuia: (id: Id, numeroGuia: string) => void
}) {
  const [estado, setEstado] = useState(pedido.estado ?? 'PENDIENTE')
  const [guia, setGuia] = useState('')
  const inputCls = 'min-h-11 w-full rounded-lg px-3 text-sm'
  const inputStyle = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }
  const btnCls = 'min-h-11 px-3 rounded-lg text-xs font-semibold disabled:opacity-50 shrink-0'

  return (
    <div className="mt-2 pt-2 space-y-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <div className="flex items-center gap-2">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          {ESTADOS_PEDIDO.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <button
          type="button"
          disabled={saving || estado === pedido.estado}
          onClick={() => onCambiarEstado(pedido.id, estado)}
          className={btnCls}
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          Guardar
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={guia}
          onChange={(e) => setGuia(e.target.value)}
          placeholder="Número de guía de envío"
          className={inputCls}
          style={inputStyle}
        />
        <button
          type="button"
          disabled={saving || !guia.trim()}
          onClick={() => onAsignarGuia(pedido.id, guia.trim())}
          className={btnCls}
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
        >
          Asignar guía
        </button>
      </div>
    </div>
  )
}

function PedidoRow({
  pedido,
  saving,
  onCambiarEstado,
  onAsignarGuia,
}: {
  pedido: EmpresaPedidoTab
  saving: boolean
  onCambiarEstado: (id: Id, estado: string) => void
  onAsignarGuia: (id: Id, numeroGuia: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--hc-text)' }}>#{pedido.id}</span>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{pedido.cliente}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>{pedido.metodoPago} · {formatDateShort(pedido.fecha)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {formatPrice(pedido.total)}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Editar pedido"
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
          >
            <PencilIcon />
          </button>
        </div>
      </div>
      {open && (
        <PedidoEditor
          pedido={pedido}
          saving={saving}
          onCambiarEstado={onCambiarEstado}
          onAsignarGuia={onAsignarGuia}
        />
      )}
    </div>
  )
}

export default function TabPedidos({
  loading,
  pedidos,
  savingPedidoId,
  onCambiarEstadoPedido,
  onAsignarGuiaPedido,
}: {
  loading: boolean
  pedidos: EmpresaPedidoTab[] | null
  savingPedidoId: Id | null
  onCambiarEstadoPedido: (id: Id, estado: string) => void
  onAsignarGuiaPedido: (id: Id, numeroGuia: string) => void
}) {
  if (loading) return <TabLoader />
  if (!pedidos || pedidos.length === 0) return <TabEmpty text="Sin pedidos aún" />
  return (
    <div className="space-y-2">
      {pedidos.map((p) => (
        <PedidoRow
          key={p.id}
          pedido={p}
          saving={savingPedidoId === p.id}
          onCambiarEstado={onCambiarEstadoPedido}
          onAsignarGuia={onAsignarGuiaPedido}
        />
      ))}
    </div>
  )
}
