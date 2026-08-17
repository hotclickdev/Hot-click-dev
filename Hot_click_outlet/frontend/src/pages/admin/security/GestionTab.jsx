import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import { adminService } from '@/services/orderService'
import { Card } from './securityUi'

const ROLES_ADMIN = [
  { value: 'USUARIO_FINAL', label: 'Cliente'     },
  { value: 'EMPRENDEDOR',   label: 'Emprendedor' },
  { value: 'ADMIN',         label: 'Admin'       },
  { value: 'CAJERO',        label: 'Cajero'      },
  { value: 'GERENTE',       label: 'Gerente'     },
]

const ESTADO_NUM = { 1: 'ACTIVO', 2: 'INACTIVO', 3: 'ELIMINADO', 4: 'SUSPENDIDO', 5: 'PENDIENTE' }
const ESTADO_INT = { ACTIVO: 1, INACTIVO: 2 }

const ROL_BADGE = {
  ADMIN:         { label: 'Admin',        bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  EMPRENDEDOR:   { label: 'Emprendedor',  bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24' },
  CAJERO:        { label: 'Cajero',       bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  GERENTE:       { label: 'Gerente',      bg: 'rgba(96,165,250,0.12)',  text: '#60a5fa' },
  USUARIO_FINAL: { label: 'Cliente',      bg: 'rgba(142,142,154,0.12)', text: '#a1a1aa' },
}

const ESTADO_BADGE = {
  ACTIVO:     { text: '#4ade80', bg: 'rgba(34,197,94,0.12)'  },
  SUSPENDIDO: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  PENDIENTE:  { text: '#facc15', bg: 'rgba(234,179,8,0.12)'  },
  INACTIVO:   { text: '#a1a1aa', bg: 'rgba(142,142,154,0.12)'},
  ELIMINADO:  { text: '#f87171', bg: 'rgba(239,68,68,0.12)'  },
}

function getRol(u)    { return u.roles?.[0]?.nombreRol ?? 'USUARIO_FINAL' }
function getEstado(u) { return ESTADO_NUM[u.estado] ?? 'INACTIVO' }

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

export default function GestionTab() {
  const [users, setUsers]         = useState([])
  const [empresas, setEmpresas]   = useState([])
  const [secUsers, setSecUsers]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [expanded, setExpanded]   = useState(null)
  const [editUser, setEditUser]   = useState(null)
  const [editRol, setEditRol]     = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [saving, setSaving]       = useState(false)
  const [actionUser, setActionUser] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: e }, { data: s }] = await Promise.all([
        adminService.getUsers(),
        adminService.getEmpresas(),
        securityService.getUsuarios({ page: 0, size: 500 }),
      ])
      setUsers(Array.isArray(u) ? u : (u?.content ?? []))
      setEmpresas(Array.isArray(e) ? e : (e?.data ?? []))
      setSecUsers(Array.isArray(s?.content) ? s.content : [])
    } catch { /* errors surfaced individually */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  // Mapa correo → empresa (propietario = correoEmpresa del negocio)
  const empresaByCorreo = {}
  for (const e of empresas) {
    if (e.correoEmpresa) empresaByCorreo[e.correoEmpresa.toLowerCase()] = e
  }

  // Mapa correo → security metrics
  const secByCorreo = {}
  for (const s of secUsers) {
    if (s.correo) secByCorreo[s.correo.toLowerCase()] = s
  }

  const filtered = users.filter(u => {
    const rol = getRol(u)
    if (roleFilter !== 'ALL' && rol !== roleFilter) return false
    const q = search.toLowerCase()
    return !q || u.nombre?.toLowerCase().includes(q) || u.correo?.toLowerCase().includes(q)
  })

  const openEdit = (u) => {
    setEditUser(u)
    setEditRol(getRol(u))
    setEditEstado(getEstado(u))
  }

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const promises = []
      if (editRol !== getRol(editUser)) promises.push(adminService.setRole(editUser.id, editRol))
      if (editEstado !== getEstado(editUser) && ESTADO_INT[editEstado] != null)
        promises.push(adminService.setStatus(editUser.id, ESTADO_INT[editEstado]))
      if (promises.length) await Promise.all(promises)
      showToast('Usuario actualizado')
      setEditUser(null)
      load()
    } catch { showToast('Error al guardar', false) }
    finally { setSaving(false) }
  }

  const handleAction = async () => {
    if (!actionUser || !actionType) return
    setActionLoading(true)
    try {
      if (actionType === 'block')   await adminService.blockUser(actionUser.id)
      if (actionType === 'unblock') await adminService.unblockUser(actionUser.id)
      if (actionType === 'delete')  await adminService.deleteUser(actionUser.id)
      if (actionType === 'restore') await adminService.restoreUser(actionUser.id)
      showToast('Acción realizada')
      setActionUser(null); setActionType(null)
      load()
    } catch { showToast('Error al realizar acción', false) }
    finally { setActionLoading(false) }
  }

  const rolesConNegocio = new Set(['EMPRENDEDOR'])

  return (
    <div className="space-y-4">

      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl"
          style={{ backgroundColor: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                   color: toast.ok ? '#4ade80' : '#f87171',
                   border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {toast.msg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--hc-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre o correo..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm w-64"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[['ALL','Todos'], ['EMPRENDEDOR','Emprendedores'], ['USUARIO_FINAL','Clientes'], ['ADMIN','Admin']].map(([v, l]) => (
            <button key={v} onClick={() => setRoleFilter(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: roleFilter === v ? 'var(--hc-accent)' : 'var(--hc-card)',
                color: roleFilter === v ? '#fff' : 'var(--hc-muted)',
                border: '1px solid var(--hc-border)',
              }}>
              {l}
            </button>
          ))}
        </div>
        <span className="text-xs ml-auto" style={{ color: 'var(--hc-muted)' }}>{filtered.length} usuarios</span>
      </div>

      {/* Tabla */}
      {loading
        ? <div className="flex justify-center py-16"><Spinner /></div>
        : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[860px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                    {['Usuario', 'Rol', 'Estado', 'Negocio', '2FA', 'Logins OK', 'Logins Fail', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const rol     = getRol(u)
                    const estado  = getEstado(u)
                    const correo  = u.correo?.toLowerCase() ?? ''
                    const empresa = rolesConNegocio.has(rol) ? empresaByCorreo[correo] : null
                    const sec     = secByCorreo[correo]
                    const isOpen  = expanded === u.id

                    return [
                      /* Fila principal */
                      <tr key={u.id}
                        onClick={() => setExpanded(isOpen ? null : u.id)}
                        className="cursor-pointer hover:bg-white/4 transition-colors"
                        style={{ borderBottom: '1px solid var(--hc-border)' }}>

                        {/* Usuario */}
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

                        {/* Rol */}
                        <td className="px-4 py-3"><RolBadge rol={rol} /></td>

                        {/* Estado */}
                        <td className="px-4 py-3"><EstadoBadgeGestion estado={estado} /></td>

                        {/* Negocio */}
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

                        {/* 2FA */}
                        <td className="px-4 py-3">
                          {sec ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{ backgroundColor: sec.twoFactorEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
                                       color: sec.twoFactorEnabled ? '#4ade80' : '#f87171' }}>
                              {sec.twoFactorEnabled ? 'Activo' : 'Inactivo'}
                            </span>
                          ) : <span style={{ color: 'var(--hc-muted)' }}>—</span>}
                        </td>

                        {/* Logins OK */}
                        <td className="px-4 py-3 text-center font-bold tabular-nums" style={{ color: '#4ade80' }}>
                          {sec?.loginsExitosos ?? '—'}
                        </td>

                        {/* Logins Fail */}
                        <td className="px-4 py-3 text-center font-bold tabular-nums"
                          style={{ color: (sec?.loginsFallidos ?? 0) > 0 ? '#f87171' : 'var(--hc-muted)' }}>
                          {sec?.loginsFallidos ?? '—'}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            {estado !== 'ELIMINADO' && (
                              <button onClick={() => openEdit(u)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                                Editar
                              </button>
                            )}
                            {estado !== 'ELIMINADO' && estado !== 'SUSPENDIDO' && estado !== 'PENDIENTE' && (
                              <button onClick={() => { setActionUser(u); setActionType('block') }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                Bloquear
                              </button>
                            )}
                            {estado === 'SUSPENDIDO' && (
                              <button onClick={() => { setActionUser(u); setActionType('unblock') }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                                Desbloquear
                              </button>
                            )}
                            {estado === 'ELIMINADO' && (
                              <button onClick={() => { setActionUser(u); setActionType('restore') }}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80' }}>
                                Restaurar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>,

                      /* Fila expandida */
                      isOpen && (
                        <tr key={`${u.id}-exp`} style={{ borderBottom: '1px solid var(--hc-border)' }}>
                          <td colSpan={8} className="px-6 py-4"
                            style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                              {/* Datos del usuario */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Datos</p>
                                <div className="space-y-1 text-xs" style={{ color: 'var(--hc-text)' }}>
                                  <p><span style={{ color: 'var(--hc-muted)' }}>ID: </span>{u.id}</p>
                                  <p><span style={{ color: 'var(--hc-muted)' }}>Correo: </span>{u.correo}</p>
                                  <p><span style={{ color: 'var(--hc-muted)' }}>Nombre: </span>{u.nombre ?? '—'}</p>
                                  {u.telefono && <p><span style={{ color: 'var(--hc-muted)' }}>Teléfono: </span>{u.telefono}</p>}
                                </div>
                              </div>

                              {/* Métricas de seguridad */}
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

                              {/* Negocio */}
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
                      )
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

      {/* ── Modal Editar ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setEditUser(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Editar usuario</p>
              <button onClick={() => setEditUser(null)} style={{ color: 'var(--hc-muted)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                style={{ backgroundColor: 'rgba(79,124,255,0.15)', color: '#4f7cff' }}>
                {(editUser.nombre ?? editUser.correo)?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{editUser.nombre ?? '—'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>{editUser.correo}</p>
              </div>
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Rol</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES_ADMIN.map(({ value, label }) => (
                  <button key={value} onClick={() => setEditRol(value)}
                    className="px-2 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={{
                      backgroundColor: editRol === value ? 'rgba(79,124,255,0.15)' : 'transparent',
                      color: editRol === value ? '#fff' : 'var(--hc-muted)',
                      borderColor: editRol === value ? 'rgba(79,124,255,0.4)' : 'var(--hc-border)',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Estado</p>
              <div className="grid grid-cols-2 gap-2">
                {[['ACTIVO', '#4ade80', 'rgba(34,197,94,0.15)', 'rgba(34,197,94,0.4)'],
                  ['INACTIVO', '#f87171', 'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.4)']].map(([val, color, bg, border]) => (
                  <button key={val} onClick={() => setEditEstado(val)}
                    className="px-2 py-2 rounded-xl text-xs font-medium border transition-all"
                    style={{
                      backgroundColor: editEstado === val ? bg : 'transparent',
                      color: editEstado === val ? color : 'var(--hc-muted)',
                      borderColor: editEstado === val ? border : 'var(--hc-border)',
                    }}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditUser(null)}
                className="flex-1 h-10 rounded-xl text-sm transition-colors"
                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-10 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar acción ── */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => { setActionUser(null); setActionType(null) }}>
          <div className="w-full max-w-xs rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            onClick={e => e.stopPropagation()}>
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>
              {actionType === 'block'   && 'Bloquear usuario'}
              {actionType === 'unblock' && 'Desbloquear usuario'}
              {actionType === 'delete'  && 'Eliminar usuario'}
              {actionType === 'restore' && 'Restaurar usuario'}
            </p>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
              {actionUser.nombre ?? actionUser.correo}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setActionUser(null); setActionType(null) }}
                className="flex-1 h-9 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleAction} disabled={actionLoading}
                className="flex-1 h-9 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{
                  backgroundColor: actionType === 'block' || actionType === 'delete' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  color: actionType === 'block' || actionType === 'delete' ? '#f87171' : '#4ade80',
                }}>
                {actionLoading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
