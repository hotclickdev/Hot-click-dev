import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import StepTracker from './StepTracker'
import {
  FILTERS,
  mensajeWhatsAppPedido,
  numeroWhatsAppCliente,
} from './ordenesHelpers'
import { MailIcon, NotaIcon, PackagePlaceholder, WhatsAppIcon } from './orderCardIcons'

export default function OrderCardExpanded({
  order,
  estado,
  esRetiro,
  items,
  pendingEstado,
  nota,
  guia,
  costo,
  saving,
  notifying,
  showOver,
  override,
  needsEnvioForm,
  onPending,
  onNota,
  onGuia,
  onCosto,
  onSaveEstado,
  onCancelPending,
  onSendEmail,
  onShowOver,
  onOverride,
  onApplyOverride,
  onConfirmDelete,
}) {
  const { t } = useTranslation()

  return (
    <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--hc-border)' }}>
      {estado !== 'CANCELADO' && (
        <div>
          <StepTracker
            estado={pendingEstado ?? estado}
            esRetiro={esRetiro}
            onStep={(s) => onPending(s === estado ? null : s)}
            saving={saving}
          />
          {pendingEstado && pendingEstado !== estado && (
            <>
              <p className="text-[11px] text-[var(--hc-muted)] text-center -mt-1">
                {estado} → <span className="text-[var(--hc-accent)] font-semibold">{pendingEstado}</span>
              </p>
              <textarea
                value={nota}
                onChange={(e) => onNota(e.target.value)}
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
            onChange={(e) => onGuia(e.target.value)}
            placeholder={t('adminOrders.guiaInputPh')}
            className="w-full h-10 px-3 rounded-xl text-sm text-[var(--hc-text)] placeholder:text-[var(--hc-muted)] focus:outline-none font-mono"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          />
          <div className="flex gap-2 items-center">
            <span className="text-[var(--hc-muted)] text-sm shrink-0">₡</span>
            <input
              type="number"
              value={costo}
              onChange={(e) => onCosto(e.target.value)}
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
            onClick={onSaveEstado}
            disabled={saving || (needsEnvioForm && !guia.trim())}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}
          >
            {saving ? t('adminOrders.saving') : t('adminOrders.saveChanges')}
          </button>
          <button
            onClick={onCancelPending}
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
            onClick={onSendEmail}
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
          <button onClick={() => onShowOver((v) => !v)}
            className="text-xs text-[var(--hc-muted)] hover:text-[var(--hc-muted)] transition-colors">
            {t('adminOrders.manualCorrection')}
          </button>
          {showOver && (
            <div className="flex gap-2 mt-2">
              <select
                value={override || estado}
                onChange={(e) => onOverride(e.target.value)}
                className="flex-1 h-9 px-2 rounded-xl text-sm text-[var(--hc-text)] focus:outline-none"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
              >
                {FILTERS.filter((f) => f !== 'Todos').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={onApplyOverride}
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
          onClick={onConfirmDelete}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 shrink-0"
          style={{ backgroundColor: 'rgba(248,113,113,0.10)', color: 'var(--hc-danger)', border: '1px solid rgba(248,113,113,0.25)' }}
        >
          {t('adminOrders.deleteOrder')}
        </button>
      </div>
    </div>
  )
}
