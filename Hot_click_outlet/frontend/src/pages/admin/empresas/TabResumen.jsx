import { formatDateShort, formatPrice } from '@/utils/format'
import { EyeIcon, EyeOffIcon } from './empresasIcons'
import Row from './Row'
import {
  ESTADOS,
  ESTADO_COLOR,
  PLAN_COLOR,
  PLANES,
  formatNumero,
} from './empresasHelpers'

function StatsGrid({ detail }) {
  const items = [
    { label: 'Usuarios', value: formatNumero(detail.totalUsuarios), color: 'text-blue-400' },
    { label: 'Productos', value: formatNumero(detail.totalProductos), color: 'text-[var(--hc-blue-400)]' },
    { label: 'Pedidos', value: formatNumero(detail.totalPedidos), color: 'text-amber-400' },
    { label: 'Ventas', value: formatPrice(detail.totalVentas), color: 'text-green-400' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((k) => (
        <div key={k.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{k.label}</div>
        </div>
      ))}
    </div>
  )
}

function VisibilidadPanel({ selected, saving, onToggleVisibilidad }) {
  const visible = selected.visibilidadPublica
  return (
    <div className="rounded-xl p-4 space-y-2" style={{ background: visible ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${visible ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
        {visible ? 'Negocio visible al público — productos en catálogo.' : 'Negocio oculto — no aparece en catálogo.'}
      </p>
      <button
        onClick={() => onToggleVisibilidad(selected.id, !visible)}
        disabled={saving}
        className="w-full text-xs font-bold px-3 py-2 rounded-lg transition-opacity disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
        style={{ background: visible ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: visible ? '#f87171' : '#4ade80' }}
      >
        {visible ? <><EyeOffIcon /> Ocultar del catálogo</> : <><EyeIcon /> Hacer visible en catálogo</>}
      </button>
    </div>
  )
}

function PlanEstadoActions({ selected, saving, onCambiarPlan, onCambiarEstado }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Cambiar plan</p>
      <div className="flex flex-wrap gap-2">
        {PLANES.map((p) => (
          <button
            key={p}
            onClick={() => onCambiarPlan(selected.id, p)}
            disabled={saving || selected.plan === p}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${selected.plan === p ? 'ring-2 ring-offset-1 ring-[var(--hc-accent)]' : ''} ${PLAN_COLOR[p]}`}
          >
            {p}
          </button>
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: 'var(--hc-muted)' }}>Cambiar estado</p>
      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((s) => (
          <button
            key={s}
            onClick={() => onCambiarEstado(selected.id, s)}
            disabled={saving || selected.estadoEmpresa === s}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40 ${selected.estadoEmpresa === s ? 'ring-2 ring-offset-1 ring-[var(--hc-accent)]' : ''} ${ESTADO_COLOR[s]}`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function TabResumen({ selected, detail, saving, onToggleVisibilidad, onCambiarPlan, onCambiarEstado }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Row label="Correo" value={selected.correoEmpresa} />
        <Row label="Teléfono" value={selected.telefonoEmpresa || '—'} />
        <Row label="Registro" value={formatDateShort(selected.fechaRegistro)} />
        <Row label="Aprobación" value={formatDateShort(selected.fechaAprobacion)} />
      </div>

      {detail ? (
        <StatsGrid detail={detail} />
      ) : (
        <div className="py-4 text-center text-xs" style={{ color: 'var(--hc-muted)' }}>Cargando estadísticas…</div>
      )}

      <VisibilidadPanel selected={selected} saving={saving} onToggleVisibilidad={onToggleVisibilidad} />
      <PlanEstadoActions
        selected={selected}
        saving={saving}
        onCambiarPlan={onCambiarPlan}
        onCambiarEstado={onCambiarEstado}
      />
    </>
  )
}
