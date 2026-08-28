import { useEffect, useState, useCallback, useMemo } from 'react'
import { securityService } from '@/services/securityService'
import { adminService } from '@/services/orderService'
import type { Id } from '@/types/api'
import GestionUserTable from './GestionUserTable'
import GestionUserForm from './GestionUserForm'
import { getRol, getEstado, ESTADO_INT, type GestionActionType, type GestionEmpresa, type GestionUser } from './gestionTabHelpers'
import type { SecurityUsuario } from './securityHelpers'

export default function GestionTab() {
  const [users, setUsers]         = useState<GestionUser[]>([])
  const [empresas, setEmpresas]   = useState<GestionEmpresa[]>([])
  const [secUsers, setSecUsers]   = useState<SecurityUsuario[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [expanded, setExpanded]   = useState<Id | null>(null)
  const [editUser, setEditUser]   = useState<GestionUser | null>(null)
  const [editRol, setEditRol]     = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [saving, setSaving]       = useState(false)
  const [actionUser, setActionUser] = useState<GestionUser | null>(null)
  const [actionType, setActionType] = useState<GestionActionType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
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
      setUsers(Array.isArray(u) ? u as GestionUser[] : ((u as { content?: GestionUser[] })?.content ?? []))
      setEmpresas(Array.isArray(e) ? e as GestionEmpresa[] : ((e as { data?: GestionEmpresa[] })?.data ?? []))
      setSecUsers(Array.isArray((s as { content?: SecurityUsuario[] })?.content) ? (s as { content: SecurityUsuario[] }).content : [])
    } catch { /* errors surfaced individually */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const empresaByCorreo = useMemo(() => {
    const map: Record<string, GestionEmpresa> = {}
    for (const e of empresas) {
      if (e.correoEmpresa) map[e.correoEmpresa.toLowerCase()] = e
    }
    return map
  }, [empresas])

  const secByCorreo = useMemo(() => {
    const map: Record<string, SecurityUsuario> = {}
    for (const s of secUsers) {
      if (s.correo) map[s.correo.toLowerCase()] = s
    }
    return map
  }, [secUsers])

  const filtered = users.filter((u) => {
    const rol = getRol(u)
    if (roleFilter !== 'ALL' && rol !== roleFilter) return false
    const q = search.toLowerCase()
    return !q || u.nombre?.toLowerCase().includes(q) || u.correo?.toLowerCase().includes(q)
  })

  const openEdit = (u: GestionUser) => {
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
        promises.push(adminService.setStatus(editUser.id, ESTADO_INT[editEstado] as unknown as string))
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

  return (
    <div className="space-y-4">

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl"
          style={{ backgroundColor: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                   color: toast.ok ? '#4ade80' : '#f87171',
                   border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--hc-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nombre o correo..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm w-64"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[['ALL','Todos'], ['EMPRENDEDOR','Emprendedores'], ['USUARIO_FINAL','Clientes'], ['ADMIN','Admin']].map(([v, l]) => (
            <button type="button" key={v} onClick={() => setRoleFilter(v)}
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

      <GestionUserTable
        loading={loading}
        filtered={filtered}
        empresaByCorreo={empresaByCorreo}
        secByCorreo={secByCorreo}
        expanded={expanded}
        onToggleExpand={setExpanded}
        onEdit={openEdit}
        onAction={(u, type) => { setActionUser(u); setActionType(type) }}
      />

      <GestionUserForm
        editUser={editUser}
        editRol={editRol}
        editEstado={editEstado}
        saving={saving}
        onEditRol={setEditRol}
        onEditEstado={setEditEstado}
        onCloseEdit={() => setEditUser(null)}
        onSave={handleSave}
        actionUser={actionUser}
        actionType={actionType}
        actionLoading={actionLoading}
        onCloseAction={() => { setActionUser(null); setActionType(null) }}
        onConfirmAction={handleAction}
      />
    </div>
  )
}
