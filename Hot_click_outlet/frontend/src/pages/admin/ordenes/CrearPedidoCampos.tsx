import { useTranslation } from 'react-i18next'
import {
  ESTADOS_INICIAL,
  METODOS_ENVIO,
  METODOS_PAGO,
  type FormPedidoManual,
} from './ordenesHelpers'
import type { CSSProperties } from 'react'

export default function CrearPedidoCampos({ form, setCampo, inp }: {
  form: FormPedidoManual
  setCampo: <K extends keyof FormPedidoManual>(k: K, v: FormPedidoManual[K]) => void
  inp: CSSProperties
}) {
  const { t } = useTranslation()
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.paymentMethod')}</label>
          <select value={form.metodoPago} onChange={(e) => setCampo('metodoPago', e.target.value)}
            className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
            {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.initialStatus')}</label>
          <select value={form.estadoPedido} onChange={(e) => setCampo('estadoPedido', e.target.value)}
            className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
            {ESTADOS_INICIAL.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.shippingMethod')}</label>
        <div className="flex gap-2">
          {METODOS_ENVIO.map((m) => (
            <button type="button" key={m.value}
              onClick={() => setCampo('metodoEnvio', m.value)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-glass-bg)',
                border: `1px solid ${form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 45%, transparent)' : 'var(--hc-border)'}`,
                color: form.metodoEnvio === m.value ? 'var(--hc-accent)' : 'var(--hc-muted)',
              }}>
              {t(m.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {form.metodoEnvio === 'ENVIO_A_DOMICILIO' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.shippingCostLabel')}</label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--hc-muted)]">₡</span>
            <input
              type="number" min={0} step={500}
              value={form.costoEnvio}
              onChange={(e) => setCampo('costoEnvio', e.target.value)}
              placeholder="Ej: 4000"
              className="flex-1 h-10 px-3 rounded-xl text-sm focus:outline-none"
              style={inp}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.orderNotes')}</label>
        <textarea
          value={form.notas}
          onChange={(e) => setCampo('notas', e.target.value)}
          rows={2}
          placeholder={t('adminOrders.notesPlaceholder')}
          className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
          style={inp}
        />
      </div>
    </>
  )
}
