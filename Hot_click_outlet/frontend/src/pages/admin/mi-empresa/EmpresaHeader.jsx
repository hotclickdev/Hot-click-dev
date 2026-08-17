import { PLAN_COLOR, ESTADO_COLOR, fechaPerfil, perfilCompletitud } from './miEmpresaHelpers'

function CompletitudCard({ form }) {
  const { checks, done, pct } = perfilCompletitud(form)
  if (pct === 100) return null
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
          Perfil {pct}% completado
        </span>
        <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{done}/{checks.length}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: pct < 60 ? '#f59e0b' : 'var(--hc-accent)' }} />
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <span key={c.label} className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: c.done ? 'rgba(34,197,94,0.1)' : 'var(--hc-surface-2)',
              color: c.done ? '#22c55e' : 'var(--hc-muted)',
              border: `1px solid ${c.done ? 'rgba(34,197,94,0.2)' : 'var(--hc-border)'}`,
            }}>
            {c.done ? '✓ ' : ''}{c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function EmpresaHeader({ empresa, isDirty, canEdit, form }) {
  return (
    <>
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi negocio</h1>
          {isDirty && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
              Cambios sin guardar
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Completá el perfil que verán tus clientes en la plataforma</p>
      </div>

      <div className="rounded-xl p-4 flex flex-wrap gap-3 items-center"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ color: 'var(--hc-text)' }}>{empresa.nombreEmpresa}</div>
          <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--hc-muted)' }}>/{empresa.slug}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PLAN_COLOR[empresa.planSaas] ?? ''}`}>
            {empresa.planSaas}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ESTADO_COLOR[empresa.estadoEmpresa] ?? ''}`}>
            {empresa.estadoEmpresa?.replace('_', ' ')}
          </span>
        </div>
        <div className="w-full grid grid-cols-2 gap-3 mt-1 text-xs" style={{ color: 'var(--hc-muted)' }}>
          <span>Registro: <strong style={{ color: 'var(--hc-text)' }}>{fechaPerfil(empresa.fechaRegistro)}</strong></span>
          {empresa.fechaAprobacion && (
            <span>Aprobación: <strong style={{ color: 'var(--hc-text)' }}>{fechaPerfil(empresa.fechaAprobacion)}</strong></span>
          )}
        </div>
        {empresa.estadoEmpresa === 'PENDIENTE_APROBACION' && (
          <div className="w-full mt-2 px-3 py-2 rounded-lg text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Tu negocio está pendiente de aprobación por el equipo de HotClick. Te notificaremos por correo cuando sea aprobado.
          </div>
        )}
      </div>

      {canEdit && <CompletitudCard form={form} />}
    </>
  )
}
