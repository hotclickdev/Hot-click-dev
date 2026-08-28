import { formatDateShort } from '@/utils/format'
import { ESTADO_COLOR, ESTADO_LABEL, ROL_CONFIG, ROLES_ASIGNABLES, type MiembroEquipo } from './equipoHelpers'
import TextoMas from '@/components/ui/TextoMas'
import type { Id } from '@/types/api'

export type EquipoMembersTableProps = {
  miembros: MiembroEquipo[]
  saving: boolean
  confirmId: Id | null
  onCambiarRol: (id: Id, rol: string) => void
  onConfirmId: (id: Id | null) => void
  onEliminar: (id: Id) => void
  onAgregar: () => void
}

export default function EquipoMembersTable({
  miembros,
  saving,
  confirmId,
  onCambiarRol,
  onConfirmId,
  onEliminar,
  onAgregar,
}: EquipoMembersTableProps) {
  if (miembros.length === 0) {
    return (
      <div className="p-10 text-center space-y-3">
        <div
          className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--hc-muted)' }}
          >
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Sin miembros en el equipo</p>
        <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Agregá colaboradores para que puedan gestionar productos, pedidos y configuración junto a vos.
        </p>
        <button type="button"
          onClick={onAgregar}
          className="mt-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 inline-flex items-center"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          <TextoMas>Agregar primer miembro</TextoMas>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--hc-surface-2)', borderBottom: '1px solid var(--hc-border)' }}>
              {['Nombre', 'Correo', 'Rol', 'Estado', 'Se unió', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {miembros.map((m) => (
              <tr
                key={m.id}
                style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
                className="hover:bg-[var(--hc-surface-2)] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-xs font-semibold text-[#4f7cff] shrink-0">
                      {m.nombre?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ color: 'var(--hc-text)' }}>{m.nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>{m.correo}</td>
                <td className="px-4 py-3">
                  {m.rolEnEmpresa === 'PROPIETARIO' ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROL_CONFIG.PROPIETARIO.color}`}>
                      {ROL_CONFIG.PROPIETARIO.label}
                    </span>
                  ) : (
                    <select
                      value={m.rolEnEmpresa ?? 'EDITOR'}
                      onChange={(e) => onCambiarRol(m.id, e.target.value)}
                      disabled={saving}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer disabled:opacity-50 ${ROL_CONFIG[m.rolEnEmpresa ?? '']?.color ?? 'bg-gray-500/15 text-gray-400'}`}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      {ROLES_ASIGNABLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
                        >
                          {ROL_CONFIG[r].label}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[m.estado as number] ?? ''}`}>
                    {ESTADO_LABEL[m.estado as number] ?? m.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {formatDateShort(m.fechaIngreso)}
                </td>
                <td className="px-4 py-3">
                  {m.rolEnEmpresa !== 'PROPIETARIO' && (
                    confirmId === m.id ? (
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => onEliminar(m.id)}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                        <button type="button"
                          onClick={() => onConfirmId(null)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ color: 'var(--hc-muted)' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => onConfirmId(m.id)}
                        className="text-xs px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Eliminar
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
