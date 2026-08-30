import { PASOS, estiloCirculoPaso } from './asignarHelpers'

export default function AsignarStepper({ paso, onPaso }: { paso: number; onPaso: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {PASOS.map((label, i) => {
        const done = i < paso
        const active = i === paso
        return (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <button type="button"
              onClick={() => { if (i < paso) onPaso(i) }}
              disabled={i > paso}
              className="flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                style={estiloCirculoPaso(done, active)}>
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block" style={{ color: active ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                {label}
              </span>
            </button>
            {i < PASOS.length - 1 && (
              <div className="flex-1 h-px" style={{ backgroundColor: done ? 'rgba(16,185,129,0.3)' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
