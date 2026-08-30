import { useTranslation } from 'react-i18next'
import ConteoEfectivo from './ConteoEfectivo'

export default function CierreTurnoModal({ onCancel, onCerrar, saving, onTotal }: {
  onCancel: () => void
  onCerrar: () => void
  saving: boolean
  onTotal: (total: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div>
          <h2 className="text-xl font-black mb-1" style={{ color: 'var(--hc-text)' }}>{t('pos.cierreModal.title')}</h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t('pos.cierreModal.subtitle')}</p>
        </div>
        <ConteoEfectivo label={t('pos.cierreModal.conteoLabel')} onTotal={onTotal} />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel}
            className="py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
            {t('pos.cierreModal.cancelar')}
          </button>
          <button type="button" onClick={onCerrar} disabled={saving}
            className="py-3 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
            {saving ? t('pos.cierreModal.cerrando') : t('pos.cierreModal.cerrarTurno')}
          </button>
        </div>
      </div>
    </div>
  )
}
