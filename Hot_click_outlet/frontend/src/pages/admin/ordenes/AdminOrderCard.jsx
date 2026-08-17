import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatPrice } from '@/utils/format'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import EstadoBadge from './EstadoBadge'
import StepTracker from './StepTracker'
import {
  FILTERS,
  mensajeWhatsAppPedido,
  numeroWhatsAppCliente,
} from './ordenesHelpers'

export default function OrderCard({ order, onUpdate, onDelete }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [pendingEstado, setPending] = useState(null)
  const [nota, setNota] = useState('')
  const [guia, setGuia] = useState(order.numeroGuia ?? '')
  const [costo, setCosto] = useState('')
  const [showOver, setShowOver] = useState(false)
  const [override, setOverride] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const estado = order.estado ?? 'PENDIENTE'
  const esRetiro = order.metodoEnvio !== 'ENVIO_A_DOMICILIO'
  const items = order.items ?? []
  const estadoVista = pendingEstado ?? estado
  const needsEnvioForm = estadoVista === 'ENVIADO' && !esRetiro && estado === 'EN_PREPARACION'

  const saveEstado = async () => {
    if (!pendingEstado || pendingEstado === estado) return
    if (pendingEstado === 'ENVIADO' && !esRetiro) {
      if (!guia.trim()) { toast({ message: t('adminOrders.enterGuia'), type: 'error' }); return }
      setSaving(true)
      try {
        const costoNum = costo ? Number.parseInt(costo, 10) : null
        await orderService.procesarEnvio(order.id, guia.trim(), costoNum)
        toast({ message: t('adminOrders.sentNotified'), type: 'success' })
        onUpdate(order.id, { estado: 'ENVIADO', numeroGuia: guia.trim(), costoEnvio: costoNum ?? order.costoEnvio })
        setPending(null)
      } catch { toast({ message: t('adminOrders.shipError'), type: 'error' }) }
      finally { setSaving(false) }
      return
    }
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, pendingEstado, nota.trim() || null)
      toast({ message: nota.trim() ? t('adminOrders.savedNotified') : t('adminOrders.saved'), type: 'success' })
      onUpdate(order.id, { estado: pendingEstado })
      setPending(null)
      setNota('')
    } catch { toast({ message: t('adminOrders.errorSave'), type: 'error' }) }
    finally { setSaving(false) }
  }

  const sendEmail = async () => {
    setNotifying(true)
    try {
      await orderService.notificar(order.id)
      toast({ message: t('adminOrders.sent'), type: 'success' })
    } catch {
      toast({ message: t('adminOrders.errorEmail'), type: 'error' })
    } finally { setNotifying(false) }
  }

  const doDelete = async () => {
    setConfirmDelete(false)
    setSaving(true)
    try {
      await orderService.delete(order.id)
      toast({ message: t('adminOrders.deleted'), type: 'success' })
      onDelete(order.id)
    } catch { toast({ message: t('adminOrders.errorDelete'), type: 'error' }) }
    finally { setSaving(false) }
  }

  const applyOverride = async () => {
    if (!override || override === estado) return
    setSaving(true)
    try {
      await orderService.updateStatus(order.id, override)
      toast({ message: t('adminOrders.corrected'), type: 'success' })
      onUpdate(order.id, { estado: override })
      setShowOver(false)
    } catch { toast({ message: t('adminOrders.errorCorrect'), type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hc-surface-2)]"
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

      {open && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--hc-border)' }}>
          {estado !== 'CANCELADO' && (
            <div>
              <StepTracker
                estado={pendingEstado ?? estado}
                esRetiro={esRetiro}
                onStep={(s) => setPending(s === estado ? null : s)}
                saving={saving}
              />
              {pendingEstado && pendingEstado !== estado && (
                <>
                  <p className="text-[11px] text-[var(--hc-muted)] text-center -mt-1">
                    {estado} → <span className="text-[var(--hc-accent)] font-semibold">{pendingEstado}</span>
                  </p>
                  <textarea
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    rows={2}
                    placeholder={t('adminOrders.notaPlaceholder')}
                    className="w-full mt-2 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none placeholder:text-[var(--hc-muted)]"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </>
              )}
            </div>
          )}

          {needsEnvioForm && (
            <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="text-xs font-semibold text-[var(--hc-text)]">{t('adminOrders.envioSection')}</p>
              <input
                type="text"
                value={guia}
                onChange={(e) => setGuia(e.target.value)}
                placeholder={t('adminOrders.guiaInputPh')}
                className="w-full h-10 px-3 rounded-xl text-sm text-[var(--hc-text)] placeholder:text-[var(--hc-muted)] focus:outline-none font-mono"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              />
              <div className="flex gap-2 items-center">
                <span className="text-[var(--hc-muted)] text-sm shrink-0">₡</span>
                <input
                  type="number"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  placeholder={t('adminOrders.costInputPh')}
                  min={4000} max={20000} step={500}
                  className="flex-1 h-10 px-3 rounded-xl text-sm text-[var(--hc-text)] placeholder:text-[var(--hc-muted)] focus:outline-none"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                />
              </div>
            </div>
          )}

          {pendingEstado && pendingEstado !== estado && (
            <div className="flex gap-2">
              <button
                onClick={saveEstado}
                disabled={saving || (needsEnvioForm && !guia.trim())}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}
              >
                {saving ? t('adminOrders.saving') : t('adminOrders.saveChanges')}
              </button>
              <button
                onClick={() => { setPending(null); setNota('') }}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm transition-all"
                style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
              >
                {t('importExport.cancel')}
              </button>
            </div>
          )}

          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hc-muted)] mb-2">{t('adminOrders.productsSection')}</p>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: 'var(--hc-glass-bg)' }}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                      {item.imagenUrl
                        ? <img src={item.imagenUrl} alt={item.nombreProducto} className="w-full h-full object-cover" />
                        : <PackagePlaceholder className="w-5 h-5" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--hc-text)] truncate">{item.nombreProducto ?? '—'}</p>
                      <p className="text-xs text-[var(--hc-muted)]">×{item.cantidad} · {formatPrice(item.precioUnitario ?? 0)} c/u</p>
                    </div>
                    <span className="text-sm font-medium text-[var(--hc-text)] shrink-0">
                      {formatPrice((item.precioUnitario ?? 0) * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {order.clienteCorreo && order.clienteCorreo !== '—' && (
              <button
                onClick={sendEmail}
                disabled={notifying}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)' }}
              >
                <MailIcon />
                {notifying ? t('adminOrders.sending') : t('adminOrders.emailClient')}
              </button>
            )}
            {order.clienteTel && order.clienteTel !== '' && (
              <a
                href={`https://wa.me/${numeroWhatsAppCliente(order.clienteTel)}?text=${encodeURIComponent(mensajeWhatsAppPedido(order, estado))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.28)' }}
              >
                <WhatsAppIcon />
                WhatsApp cliente
              </a>
            )}
            {order.costoEnvio > 0 && (
              <span className="flex items-center text-xs text-[var(--hc-muted)] px-2">{t('adminOrders.shippingDisplay', { amount: formatPrice(order.costoEnvio) })}</span>
            )}
            {order.notas && (
              <span className="flex items-center gap-1 text-xs text-[var(--hc-muted)] px-2">
                <NotaIcon />
                {order.notas}
              </span>
            )}
          </div>

          {order.numeroGuia && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <span className="text-[#1E7F4F]">{t('adminOrders.guiaSection')}</span>
              <a href={`https://rastreo.correos.go.cr/?codigo=${order.numeroGuia}`}
                target="_blank" rel="noopener noreferrer"
                className="font-mono font-bold hover:underline flex-1" style={{ color: '#1E7F4F' }}>
                {order.numeroGuia}
              </a>
            </div>
          )}

          {estado === 'ENTREGADO' && (
            <p className="text-center text-sm text-[#1E7F4F] py-1">{t('adminOrders.orderDelivered')}</p>
          )}
          {estado === 'COMPLETADO' && (
            <p className="text-center text-sm py-1" style={{ color: 'var(--hc-accent)' }}>{t('adminOrders.orderCompleted')}</p>
          )}
          {estado === 'CANCELADO' && (
            <p className="text-center text-sm text-[#a8291f] py-1">{t('adminOrders.orderCancelled')}</p>
          )}

          <div className="pt-2 border-t flex items-start justify-between gap-4" style={{ borderColor: 'var(--hc-border)' }}>
            <div className="flex-1">
              <button onClick={() => setShowOver((v) => !v)}
                className="text-xs text-[var(--hc-muted)] hover:text-[var(--hc-muted)] transition-colors">
                {t('adminOrders.manualCorrection')}
              </button>
              {showOver && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={override || estado}
                    onChange={(e) => setOverride(e.target.value)}
                    className="flex-1 h-9 px-2 rounded-xl text-sm text-[var(--hc-text)] focus:outline-none"
                    style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    {FILTERS.filter((f) => f !== 'Todos').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={applyOverride}
                    disabled={saving || !override || override === estado}
                    className="px-4 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}
                  >
                    {saving ? '…' : t('adminOrders.apply')}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 shrink-0"
              style={{ backgroundColor: 'rgba(248,113,113,0.10)', color: 'var(--hc-danger)', border: '1px solid rgba(248,113,113,0.25)' }}
            >
              {t('adminOrders.deleteOrder')}
            </button>
          </div>
        </div>
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

function MailIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function NotaIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M5 5h14a2 2 0 012 2v12l-4-2H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </svg>
  )
}

function PackagePlaceholder({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
