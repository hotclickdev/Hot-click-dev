/**
 * Indicador de pasos del registro de emprendimiento.
 * @param {{ step: number }} props
 */
export default function EmprendimientoProgreso({ step }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      {['Tu negocio', 'Tu cuenta', 'Verificar'].map((label, i) => {
        const activeStepStyle = { background: 'var(--hc-primary)', color: '#fff', boxShadow: '0 0 12px rgba(231,59,51,0.4)' }
        const inactiveStepStyle = { background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }
        const stepStyle = i < step
          ? { background: 'var(--hc-success, #22c55e)', color: '#fff' }
          : (i === step ? activeStepStyle : inactiveStepStyle)
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
              style={stepStyle}>
              {i < step ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
            </div>
            <span className="text-xs font-medium" style={{ color: i === step ? 'var(--hc-text)' : 'var(--hc-muted)' }}>{label}</span>
            {i < 2 && <div className="h-px w-6 mx-1 rounded transition-all duration-500" style={{ background: step > i ? 'var(--hc-primary)' : 'var(--hc-border)' }} />}
          </div>
        )
      })}
    </div>
  )
}
