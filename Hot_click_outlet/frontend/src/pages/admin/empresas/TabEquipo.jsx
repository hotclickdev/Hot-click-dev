import { formatDateShort } from '@/utils/format'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import { ESTADO_COLOR_USUARIO, ESTADO_LABEL_USUARIO, ROL_CONFIG } from './empresasHelpers'

function MiembroRow({ miembro }) {
  const rol = ROL_CONFIG[miembro.rol]
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <div className="w-9 h-9 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
        {miembro.nombre?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{miembro.nombre.trim()}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rol?.color ?? 'bg-gray-500/15 text-gray-400'}`}>
            {rol?.label ?? miembro.rol}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{miembro.correo}</p>
        {miembro.telefono && miembro.telefono !== '00000000' && (
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{miembro.telefono}</p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>Se unió {formatDateShort(miembro.fechaIngreso)}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR_USUARIO[miembro.estado] ?? ''}`}>
        {ESTADO_LABEL_USUARIO[miembro.estado] ?? miembro.estado}
      </span>
    </div>
  )
}

export default function TabEquipo({ loading, equipo }) {
  if (loading) return <TabLoader />
  if (!equipo || equipo.length === 0) return <TabEmpty text="Sin miembros de equipo" />
  return (
    <div className="space-y-2">
      {equipo.map((m) => <MiembroRow key={m.id} miembro={m} />)}
    </div>
  )
}
