import { useTranslation } from 'react-i18next'
import { ETAPAS_ENVIO, ETAPAS_RETIRO } from './ordenesHelpers'

export default function StepTracker({ estado, esRetiro, onStep, saving }) {
  const { t } = useTranslation()
  const etapas = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const idx = etapas.findIndex((e) => e.key === estado)
  const idxSafe = idx === -1 ? 0 : idx
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {etapas.map((e, i) => {
        const done = i < idxSafe
        const current = i === idxSafe
        const clickable = !current && !saving
        const label = t(e.labelKey)
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button type="button"
                onClick={() => clickable && onStep(e.key)}
                disabled={saving}
                title={clickable ? `${t('adminOrders.changeTo')} ${label}` : label}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: done || current ? 'var(--hc-accent)' : 'transparent',
                  border: `2px solid ${done || current ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 12px color-mix(in srgb, var(--hc-accent) 50%, transparent)' : 'none',
                  cursor: clickable ? 'pointer' : 'default',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {done
                  ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current ? 'white' : 'var(--hc-border)' }} />
                }
              </button>
              <span className="text-[9px] text-center leading-tight max-w-[56px]"
                style={{ color: done || current ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: current ? 700 : 400, opacity: done || current ? 1 : 0.45 }}>
                {label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full mb-4"
                style={{ backgroundColor: i < idxSafe ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
