import { IconCheck } from './cargaMasivaIcons'

export default function StepBar({ step }) {
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
                style={{
                  background: done ? 'rgba(16,185,129,0.2)' : active ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
                  border: done ? '1px solid rgba(16,185,129,0.4)' : active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: done ? '#34d399' : active ? '#fff' : 'var(--hc-muted)',
                }}
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
