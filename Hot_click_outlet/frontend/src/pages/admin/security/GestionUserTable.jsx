import Spinner from '@/components/ui/Spinner'
import { Card } from './securityUi'
import {
  ROL_BADGE,
  ESTADO_BADGE,
  getRol,
  getEstado,
  ROLES_CON_NEGOCIO,
} from './gestionTabHelpers'

function RolBadge({ rol }) {
  const c = ROL_BADGE[rol] ?? ROL_BADGE.USUARIO_FINAL
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}>{c.label}</span>
  )
}

function EstadoBadgeGestion({ estado }) {
  const c = ESTADO_BADGE[estado] ?? ESTADO_BADGE.INACTIVO
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}>{estado}</span>
  )
}

/**
 * Tabla de usuarios con filas expandibles — bit-idéntico al original.
 */
export default function GestionUserTable({
  loading,
  filtered,
  empresaByCorreo,
  secByCorreo,
  expanded,
  onToggleExpand,
  onEdit,
  onAction,
}) {
  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[860px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
              {['Usuario', 'Rol', 'Estado', 'Negocio', '2FA', 'Logins OK', 'Logins Fail', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const rol = getRol(u)
              const estado = getEstado(u)
              const correo = u.correo?.toLowerCase() ?? ''
              const empresa = ROLES_CON_NEGOCIO.has(rol) ? empresaByCorreo[correo] : null
              const sec = secByCorreo[correo]
              const isOpen = expanded === u.id

              return [
                <tr key={u.id}
                  tabIndex={0}
                  onClick={() => onToggleExpand(isOpen ? null : u.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onToggleExpand(isOpen ? null : u.id)
                    }
                  }}
                  className="cursor-pointer hover:bg-white/4 transition-colors"
                  style={{ borderBottom: '1px solid var(--hc-border)' }}>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: 'rgba(79,124,255,0.15)', color: '#4f7cff' }}>
                        {(u.nombre ?? u.correo)?.[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[160px]" style={{ color: 'var(--hc-text)' }}>{u.nombre ?? '—'}</p>
                        <p className="text-[10px] truncate max-w-[160px]" style={{ color: 'var(--hc-muted)' }}>{u.correo}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3"><RolBadge rol={rol} /></td>
                  <td className="px-4 py-3"><EstadoBadgeGestion estado={estado} /></td>

                  <td className="px-4 py-3">
                    {empresa ? (
                      <div>
                        <p className="font-medium truncate max-w-[140px]" style={{ color: 'var(--hc-text)' }}>{empresa.nombreEmpresa}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: empresa.estadoEmpresa === 'ACTIVO' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                   color: empresa.estadoEmpresa === 'ACTIVO' ? '#4ade80' : '#f87171' }}>
                          {empresa.estadoEmpresa} · {empresa.planSaas ?? '—'}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--hc-muted)' }}>—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {sec ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: sec.twoFactorEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                                 color: sec.twoFactorEnabled ? '#4ade80' : '#f87171' }}>
                        {sec.twoFactorEnabled ? 'Activo' : 'Inactivo'}
                      </span>
                    ) : <span style={{ color: 'var(--hc-muted)' }}>—</span>}
                  </td>

                  <td className="px-4 py-3 text-center font-bold tabular-nums" style={{ color: '#4ade80' }}>
                    {sec?.loginsExitosos ?? '—'}
                  </td>

                  <td className="px-4 py-3 text-center font-bold tabular-nums"
                    style={{ color: (sec?.loginsFallidos ?? 0) > 0 ? '#f87171' : 'var(--hc-muted)' }}>
                    {sec?.loginsFallidos ?? '—'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}>
                      {estado !== 'ELIMINADO' && (
                        <button onClick={() => onEdit(u)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                          Editar
                        </button>
                      )}
                      {estado !== 'ELIMINADO' && estado !== 'SUSPENDIDO' && estado !== 'PENDIENTE' && (
                        <button onClick={() => onAction(u, 'block')}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                          style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                          Bloquear
                        </button>
                      )}
                      {estado === 'SUSPENDIDO' && (
                        <button onClick={() => onAction(u, 'unblock')}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                          style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                          Desbloquear
                        </button>
                      )}
                      {estado === 'ELIMINADO' && (
                        <button onClick={() => onAction(u, 'restore')}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                          style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                          Restaurar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>,

                isOpen && (
                  <tr key={`${u.id}-exp`} style={{ borderBottom: '1px solid var(--hc-border)' }}>
                    <td colSpan={8} className="px-6 py-4"
                      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Datos</p>
                          <div className="space-y-1 text-xs" style={{ color: 'var(--hc-text)' }}>
                            <p><span style={{ color: 'var(--hc-muted)' }}>ID: </span>{u.id}</p>
                            <p><span style={{ color: 'var(--hc-muted)' }}>Correo: </span>{u.correo}</p>
                            <p><span style={{ color: 'var(--hc-muted)' }}>Nombre: </span>{u.nombre ?? '—'}</p>
                            {u.telefono && <p><span style={{ color: 'var(--hc-muted)' }}>Teléfono: </span>{u.telefono}</p>}
                          </div>
                        </div>

                        {sec && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Seguridad</p>
                            <div className="space-y-1 text-xs" style={{ color: 'var(--hc-text)' }}>
                              <p><span style={{ color: 'var(--hc-muted)' }}>IPs distintas: </span>{sec.ipsDistintas ?? '—'}</p>
                              <p><span style={{ color: 'var(--hc-muted)' }}>Último acceso: </span>{sec.fechaUltimoAcceso ? new Date(sec.fechaUltimoAcceso).toLocaleString('es-CR') : '—'}</p>
                              {sec.bloqueadoHasta && (
                                <p className="text-red-400">Bloqueado hasta: {new Date(sec.bloqueadoHasta).toLocaleString('es-CR')}</p>
                              )}
                              {(sec.intentosFallidos ?? 0) > 0 && (
                                <p className="text-amber-400">Intentos fallidos acum.: {sec.intentosFallidos}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {empresa && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Negocio</p>
                            <div className="space-y-1 text-xs" style={{ color: 'var(--hc-text)' }}>
                              <p><span style={{ color: 'var(--hc-muted)' }}>Nombre: </span>{empresa.nombreEmpresa}</p>
                              <p><span style={{ color: 'var(--hc-muted)' }}>Slug: </span>{empresa.slug ?? '—'}</p>
                              <p><span style={{ color: 'var(--hc-muted)' }}>Plan: </span>{empresa.planSaas ?? '—'}</p>
                              <p><span style={{ color: 'var(--hc-muted)' }}>Estado empresa: </span>{empresa.estadoEmpresa}</p>
                              {empresa.visibilidadPublica === false && (
                                <p className="text-amber-400">Tienda invisible al público</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <p className="text-center py-10 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin usuarios con ese filtro</p>
        )}
      </div>
    </Card>
  )
}
