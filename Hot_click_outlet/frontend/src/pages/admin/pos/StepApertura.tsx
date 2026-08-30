import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import ConteoEfectivo from './ConteoEfectivo'
import { formatMontoPos } from './posHelpers'

export default function StepApertura({ onAbrir, loading }: { onAbrir: (monto: number) => void; loading: boolean }) {
  const { t } = useTranslation()
  const [monto, setMonto] = useState(0)

  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-6 pt-2">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(23,138,80,0.1)', border: '1px solid rgba(23,138,80,0.2)', color: 'var(--hc-success)' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ backgroundColor: 'rgba(23,138,80,0.2)' }}>1</span>
            <span>{t('pos.apertura.paso')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--hc-text)' }}>{t('pos.apertura.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {t('pos.apertura.subtitle')}
          </p>
        </div>

        <div className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <ConteoEfectivo label={t('pos.apertura.conteoLabel')} onTotal={setMonto} />
        </div>

        <button type="button"
          onClick={() => onAbrir(monto)}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-base transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: 'var(--hc-primary)', color: '#fff' }}>
          {etiquetaAbrirTurno(t, loading, monto)}
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--hc-muted)' }}>
          {t('pos.apertura.nota')}
        </p>
      </div>
    </div>
  )
}

function etiquetaAbrirTurno(t: TFunction, loading: boolean, monto: number) {
  if (loading) return t('pos.apertura.abriendo')
  if (monto > 0) return t('pos.apertura.abrirTurnoMonto', { amount: formatMontoPos(monto) })
  return t('pos.apertura.abrirTurno')
}
