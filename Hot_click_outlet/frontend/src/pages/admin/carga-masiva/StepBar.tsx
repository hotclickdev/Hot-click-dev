import { IconCheck } from './cargaMasivaIcons'
import type { CSSProperties } from 'react'

export default function StepBar({ step }: { step: number }) {
  const steps = ['Subir fotos', 'Completar datos', 'Guardar']
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done = step > n
        return (
          <div key={n} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                style={estiloCirculoPaso(done, active)}
              >
                {done ? <IconCheck className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="text-sm hidden sm:block"
                style={{ color: active ? 'var(--hc-text)' : 'var(--hc-muted)', fontWeight: active ? 600 : 400 }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-6 sm:w-12 flex-shrink-0 mx-1"
                style={{ background: done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function estiloCirculoPaso(done: boolean, active: boolean): CSSProperties {
  if (done) {
    return { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }
  }
  if (active) {
    return { background: 'var(--hc-accent)', border: 'none', color: '#fff' }
  }
  return { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-muted)' }
}
