import { ETAPAS_ENVIO, ETAPAS_RETIRO } from './nuevaVentaHelpers'

/**
 * @param {{ estado: string, esRetiro: boolean }} props
 */
export default function SaleStepTracker({ estado, esRetiro }) {
  const etapas  = esRetiro ? ETAPAS_RETIRO : ETAPAS_ENVIO
  const idx     = etapas.findIndex(e => e.key === estado)
  const idxSafe = idx === -1 ? 0 : idx
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {etapas.map((e, i) => {
        const done    = i < idxSafe
        const current = i === idxSafe
        return (
          <div key={e.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: done || current ? '#10b981' : 'transparent',
                  border: `2px solid ${done || current ? '#10b981' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                {done || current
                  ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-border)' }} />
                }
              </div>
              <span
                className="text-[9px] text-center leading-tight max-w-[56px]"
                style={{ color: done || current ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: current ? 700 : 400, opacity: done || current ? 1 : 0.4 }}
              >
                {e.label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full mb-4"
                style={{ backgroundColor: i < idxSafe ? '#10b981' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
