import { useTranslation } from 'react-i18next'

/** Solo aparece si no se pudo abrir el turno solo. No pide conteo de billetes. */
export default function StepApertura({ onAbrir, loading }: { onAbrir: (monto: number) => void; loading: boolean }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('pos.apertura.errorAbrir')}</p>
        <button
          type="button"
          onClick={() => onAbrir(0)}
          disabled={loading}
          className="w-full rounded-2xl py-4 text-base font-black transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: 'var(--hc-primary)', color: '#fff' }}
        >
          {loading ? t('pos.apertura.abriendo') : t('pos.apertura.reintentar')}
        </button>
      </div>
    </div>
  )
}
