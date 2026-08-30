import { useTranslation } from 'react-i18next'
import { formatMontoPos, type PosVenta } from './posHelpers'
import { CheckIcon, PrintIcon, WhatsAppIcon } from './posIcons'
import TextoMas from '@/components/ui/TextoMas'

export default function StepRecibo({ venta, userName, onNueva }: {
  venta: PosVenta
  userName?: string | null
  onNueva: () => void
}) {
  const { t, i18n } = useTranslation()
  const localeFecha = i18n.language?.startsWith('en') ? 'en-CR' : i18n.language?.startsWith('pt') ? 'pt-BR' : 'es-CR'
  const fecha = venta?.fechaPedido
    ? new Date(venta.fechaPedido).toLocaleString(localeFecha)
    : new Date().toLocaleString(localeFecha)

  function imprimir() {
    const s = document.createElement('style')
    s.id = '__pos-print'
    s.textContent = `@media print { body > * { display:none!important } #pos-ticket { display:block!important; width:80mm; background:#fff!important; color:#000!important } }`
    document.head.appendChild(s)
    globalThis.print()
    setTimeout(() => document.getElementById('__pos-print')?.remove(), 800)
  }

  function whatsapp() {
    const items = (venta?.items ?? [])
      .map(i => t('pos.recibo.waItem', {
        nombre: i.producto?.nombreProducto ?? i.nombre ?? t('pos.recibo.producto'),
        cantidad: i.cantidad,
        subtotal: formatMontoPos(i.subtotalItem),
      }))
      .join('\n')
    const texto = [
      t('pos.recibo.waTitle'),
      t('pos.recibo.waTicket', { numero: venta?.numeroPedido ?? '—' }),
      '',
      items,
      '',
      t('pos.recibo.waTotal', { total: formatMontoPos(venta?.totalPedido) }),
      t('pos.recibo.waThanks'),
    ].join('\n')
    globalThis.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-4">
        <div id="pos-ticket" className="rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>

          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              <CheckIcon />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>{t('pos.recibo.ventaRegistrada')}</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: 'var(--hc-text)', letterSpacing: '-1px' }}>
              ₡{formatMontoPos(venta?.totalPedido)}
            </p>
          </div>

          <div className="space-y-1 text-xs mb-4" style={{ color: 'var(--hc-muted)' }}>
            <div className="flex justify-between"><span>{t('pos.recibo.ticket')}</span><span className="font-mono">{venta?.numeroPedido ?? '—'}</span></div>
            <div className="flex justify-between"><span>{t('pos.recibo.fecha')}</span><span>{fecha}</span></div>
            <div className="flex justify-between"><span>{t('pos.recibo.cajero')}</span><span>{userName}</span></div>
            <div className="flex justify-between"><span>{t('pos.recibo.metodo')}</span><span>{venta?.metodoPago}</span></div>
          </div>

          <div className="border-t pt-3 mb-3 space-y-1" style={{ borderColor: 'var(--hc-border)' }}>
            {(venta?.items ?? []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span style={{ color: 'var(--hc-text)' }}>
                  {item.producto?.nombreProducto ?? item.nombre ?? t('pos.recibo.producto')} ×{item.cantidad}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--hc-text)' }}>₡{formatMontoPos(item.subtotalItem)}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--hc-muted)' }}>
            {t('pos.recibo.gracias')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={imprimir}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
            <PrintIcon /> {t('pos.recibo.imprimir')}
          </button>
          <button type="button" onClick={whatsapp}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
            <WhatsAppIcon /> {t('pos.recibo.whatsapp')}
          </button>
          <button type="button" onClick={onNueva}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125 inline-flex items-center justify-center"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            <TextoMas>{t('pos.recibo.nueva')}</TextoMas>
          </button>
        </div>
      </div>
    </div>
  )
}
