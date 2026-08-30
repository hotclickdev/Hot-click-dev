import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice } from '@/utils/format'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import EstadoBadge from './EstadoBadge'
import OrderCardExpanded from './OrderCardExpanded'
import { useAdminOrderCardActions } from './useAdminOrderCardActions'
import { mensajeWhatsAppPedido, numeroWhatsAppCliente } from './ordenesHelpers'
import { WhatsAppIcon } from './orderCardIcons'
import type { Id } from '@/types/api'
import type { Pedido } from '@/types/pedido'

export default function OrderCard({ order, onUpdate, onDelete }: {
  order: Pedido
  onUpdate: (id: Id, fields: Partial<Pedido>) => void
  onDelete: (id: Id) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [pendingEstado, setPending] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [guia, setGuia] = useState(order.numeroGuia ?? '')
  const [costo, setCosto] = useState('')
  const [showOver, setShowOver] = useState(false)
  const [override, setOverride] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const estado = order.estado ?? 'PENDIENTE'
  const esRetiro = order.metodoEnvio !== 'ENVIO_A_DOMICILIO'
  const items = order.items ?? []
  const needsEnvioForm = (pendingEstado ?? estado) === 'ENVIADO' && !esRetiro && estado === 'EN_PREPARACION'

  const { saveEstado, sendEmail, doDelete, applyOverride } = useAdminOrderCardActions({
    t,
    toast,
    order,
    estado,
    esRetiro,
    pendingEstado,
    nota,
    guia,
    costo,
    override,
    onUpdate,
    onDelete,
    setSaving,
    setNotifying,
    setPending,
    setNota,
    setShowOver,
    setConfirmDelete,
  })

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>

      <div className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--hc-surface-2)]">
        <button type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 flex flex-wrap items-center gap-3 px-2 py-2 text-left"
        >
          <div className="min-w-[110px]">
            <p className="text-xs font-mono text-[var(--hc-muted)]">#{order.id}</p>
            <p className="text-[11px] text-[var(--hc-muted)] mt-0.5">
              {order.fechaCreacion ? formatDate(order.fechaCreacion) : '—'}
            </p>
          </div>
          <div className="flex-1 min-w-[140px]">
            <p className="text-sm font-medium text-[var(--hc-text)] truncate" title={order.nombreCliente ?? ''}>
              {order.nombreCliente ?? '—'}
            </p>
            <p className="text-[11px] text-[var(--hc-muted)] truncate" title={order.clienteCorreo ?? ''}>{order.clienteCorreo ?? ''}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-[var(--hc-muted)]">
              {esRetiro ? t('adminOrders.pickupBadge') : t('adminOrders.deliveryBadge')}
            </span>
            {order.metodoPago && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.25)' }}>
                {order.metodoPago}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-[var(--hc-text)] min-w-[80px] text-right">
            {formatPrice(order.total ?? 0)}
          </span>
          <EstadoBadge estado={estado} />
          <svg className="w-4 h-4 shrink-0 transition-transform"
            style={{ color: 'var(--hc-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {order.clienteTel && (
          <a
            href={`https://wa.me/${numeroWhatsAppCliente(order.clienteTel)}?text=${encodeURIComponent(mensajeWhatsAppPedido(order, estado))}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp cliente"
            className="shrink-0 p-2 rounded-lg mr-2"
            style={{ backgroundColor: '#e2f1e8', color: '#1E7F4F' }}
          >
            <WhatsAppIcon />
          </a>
        )}
      </div>

      {open && (
        <OrderCardExpanded
          order={order}
          estado={estado}
          esRetiro={esRetiro}
          items={items}
          pendingEstado={pendingEstado}
          nota={nota}
          guia={guia}
          costo={costo}
          saving={saving}
          notifying={notifying}
          showOver={showOver}
          override={override}
          needsEnvioForm={needsEnvioForm}
          onPending={setPending}
          onNota={setNota}
          onGuia={setGuia}
          onCosto={setCosto}
          onSaveEstado={saveEstado}
          onCancelPending={() => { setPending(null); setNota('') }}
          onSendEmail={sendEmail}
          onShowOver={setShowOver}
          onOverride={setOverride}
          onApplyOverride={applyOverride}
          onConfirmDelete={() => setConfirmDelete(true)}
        />
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Eliminar pedido"
        message={`¿Eliminar el pedido #${order.id}? Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
