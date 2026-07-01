import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { crmService } from '@/services/crmService'
import ClienteDetailModal from '@/components/admin/ClienteDetailModal'

const ESTADO_NUM = { 1: 'ACTIVO', 2: 'INACTIVO', 3: 'ELIMINADO', 4: 'SUSPENDIDO', 5: 'PENDIENTE' }
const ESTADO_INT = { ACTIVO: 1, INACTIVO: 2 }

const ROLES = [
  { value: 'USUARIO_FINAL', label: 'Cliente' },
  { value: 'EMPRENDEDOR',   label: 'Emprendedor' },
  { value: 'ADMIN',         label: 'Admin' },
]

const ROLE_COLORS = { ADMIN: 'danger', EMPRENDEDOR: 'purple', USUARIO_FINAL: 'default' }
const ROLE_LABELS = { ADMIN: 'Admin', EMPRENDEDOR: 'Emprendedor', USUARIO_FINAL: 'Cliente' }

const ESTADO_BADGE = {
  ACTIVO:     'success',
  PENDIENTE:  'warning',
  INACTIVO:   'default',
  SUSPENDIDO: 'danger',
  ELIMINADO:  'danger',
}

const getEstadoStr = (u) => ESTADO_NUM[u.estado] ?? 'INACTIVO'
const getRolStr    = (u) => u.roles?.[0]?.nombreRol ?? 'USUARIO_FINAL'

export default function AdminUsers() {
  const { t } = useTranslation()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  // Edit modal
  const [editUser, setEditUser] = useState(null)
  const [editRol, setEditRol] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [saving, setSaving] = useState(false)

  // CRM
  const [clientes, setClientes]           = useState([])
  const [crmLoading, setCrmLoading]       = useState(false)
  const [crmSearch, setCrmSearch]         = useState('')
  const [selectedCliente, setSelectedCliente] = useState(null)

  // Confirm modals
  const [deleteUser, setDeleteUser]     = useState(null)
  const [blockUser, setBlockUser]       = useState(null)
  const [unblockUser, setUnblockUser]   = useState(null)
  const [restoreUser, setRestoreUser]   = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: all }, { data: pend }] = await Promise.all([
        adminService.getUsers(),
        adminService.getPendingUsers(),
      ])
      setUsers(Array.isArray(all) ? all : all.content ?? [])
      setPending(Array.isArray(pend) ? pend : pend.content ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (tab === 'crm' && clientes.length === 0) {
      setCrmLoading(true)
      crmService.listarClientes()
        .then(setClientes)
        .catch(() => {})
        .finally(() => setCrmLoading(false))
    }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Usuarios activos/inactivos/suspendidos (excluye eliminados y pendientes — pendientes van en su propia tab)
  const activeUsers   = users.filter((u) => getEstadoStr(u) !== 'ELIMINADO' && getEstadoStr(u) !== 'PENDIENTE')
  const deletedUsers  = users.filter((u) => getEstadoStr(u) === 'ELIMINADO')

  const approve = async (id) => {
    try {
      await adminService.approveUser(id, { rol: 'USUARIO_FINAL' })
      toast({ message: 'Usuario aprobado', type: 'success' })
      load()
    } catch { toast({ message: 'Error al aprobar', type: 'error' }) }
  }

  const reject = async (id) => {
    try {
      await adminService.rejectUser(id)
      toast({ message: 'Usuario rechazado', type: 'info' })
      load()
    } catch { toast({ message: 'Error al rechazar', type: 'error' }) }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setActionLoading(true)
    try {
      await adminService.deleteUser(deleteUser.id)
      toast({ message: 'Usuario eliminado', type: 'success' })
      setDeleteUser(null)
      load()
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
    finally { setActionLoading(false) }
  }

  const handleBlock = async () => {
    if (!blockUser) return
    setActionLoading(true)
    try {
      await adminService.blockUser(blockUser.id)
      toast({ message: `${blockUser.nombre ?? blockUser.correo} fue bloqueado`, type: 'info' })
      setBlockUser(null)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al bloquear', type: 'error' })
    } finally { setActionLoading(false) }
  }

  const handleUnblock = async () => {
    if (!unblockUser) return
    setActionLoading(true)
    try {
      await adminService.unblockUser(unblockUser.id)
      toast({ message: `${unblockUser.nombre ?? unblockUser.correo} fue desbloqueado`, type: 'success' })
      setUnblockUser(null)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al desbloquear', type: 'error' })
    } finally { setActionLoading(false) }
  }

  const handleRestore = async () => {
    if (!restoreUser) return
    setActionLoading(true)
    try {
      await adminService.restoreUser(restoreUser.id)
      toast({ message: `${restoreUser.nombre ?? restoreUser.correo} fue restaurado`, type: 'success' })
      setRestoreUser(null)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al restaurar', type: 'error' })
    } finally { setActionLoading(false) }
  }

  const openEdit = (u) => {
    setEditUser(u)
    setEditRol(getRolStr(u))
    setEditEstado(getEstadoStr(u))
  }

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const currentRol    = getRolStr(editUser)
      const currentEstado = getEstadoStr(editUser)
      const promises = []

      if (editRol !== currentRol) {
        promises.push(adminService.setRole(editUser.id, editRol))
      }
      if (editEstado !== currentEstado && ESTADO_INT[editEstado] != null) {
        promises.push(adminService.setStatus(editUser.id, ESTADO_INT[editEstado]))
      }

      if (promises.length === 0) { setEditUser(null); return }
      await Promise.all(promises)
      toast({ message: 'Usuario actualizado', type: 'success' })
      setEditUser(null)
      load()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al actualizar', type: 'error' })
    } finally { setSaving(false) }
  }

  const baseForTab = tab === 'pending' ? pending : tab === 'deleted' ? deletedUsers : activeUsers
  const displayed = search
    ? baseForTab.filter((u) =>
        (u.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.correo ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : baseForTab

  const tabs = [
    ['all',     `Activos (${activeUsers.length})`],
    ['pending', `Pendientes (${pending.length})`],
    ['deleted', `Eliminados (${deletedUsers.length})`],
    ['crm',     `CRM Clientes (${clientes.length})`],
  ]

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.users.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {users.length} registrados · {pending.length} {t('admin.orders.pending').toLowerCase()} · {deletedUsers.length} eliminados
            </p>
          </div>
          <ImportExportBar
            exportOnly
            data={users.map((u) => ({
              id: u.id,
              nombre: u.nombre ?? '',
              correo: u.correo ?? '',
              rol: getRolStr(u),
              estado: getEstadoStr(u),
            }))}
            columns={['id','nombre','correo','rol','estado']}
            filename="usuarios"
            sheetName="Usuarios"
          />
        </div>

        {/* Tabs + búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === key
                    ? key === 'deleted'
                      ? 'bg-red-500/80 text-white'
                      : 'bg-[#4f7cff] text-white'
                    : 'text-[#8e8e9a] hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-xl bg-[#111114] border border-white/10 text-[#e8e8ed] text-xs placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
        </div>

        {/* Banner informativo para tab eliminados */}
        {tab === 'deleted' && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-300">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            Los datos de estos usuarios se conservan en la base de datos. Podés restaurar una cuenta para que vuelva a estar activa.
          </div>
        )}

        {/* ── Tab CRM ── */}
        {tab === 'crm' && (
          crmLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
              {/* Buscador CRM */}
              <div className="p-4 border-b border-white/8">
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o teléfono…"
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  className="w-full h-9 pl-4 pr-4 rounded-xl bg-[#0a0a0d] border border-white/10 text-[#e8e8ed] text-xs placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Cliente','Segmento','Pedidos','Total','Puntos','Acciones'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {clientes
                      .filter(c => !crmSearch || [c.nombre, c.correo, c.telefono].some(f => f?.toLowerCase().includes(crmSearch.toLowerCase())))
                      .map(c => {
                        const seg = c.segmento ?? 'NUEVO'
                        const segColor = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }[seg] ?? '#A7B0BC'
                        return (
                          <tr key={c.id} className="hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelectedCliente(c.id)}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-[#e8e8ed]">{c.nombre} {c.apellidoPaterno}</p>
                              <p className="text-xs text-[#8e8e9a]">{c.correo}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ backgroundColor: `${segColor}18`, color: segColor }}>{seg}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#8e8e9a]">{c.numPedidosHist ?? 0}</td>
                            <td className="px-4 py-3 text-xs font-medium text-[#4f7cff]">
                              ₡{new Intl.NumberFormat('es-CR').format(c.totalComprasHist ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-xs font-medium" style={{ color: '#fbbf24' }}>
                              {c.puntosFidelidad ?? 0} pts
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={e => { e.stopPropagation(); setSelectedCliente(c.id) }}
                                className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">
                                Ver ficha
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
                {clientes.length === 0 && !crmLoading && (
                  <div className="text-center py-12 text-[#8e8e9a] text-sm">No hay clientes registrados</div>
                )}
              </div>
            </div>
          )
        )}

        {tab !== 'crm' && loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : tab !== 'crm' && (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/8">
                    {[t('admin.users.name'), t('admin.users.email'), t('admin.users.role'), t('admin.users.status'), t('admin.users.actions')].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayed.map((u) => {
                    const estadoStr   = getEstadoStr(u)
                    const rolStr      = getRolStr(u)
                    const isSuspended = estadoStr === 'SUSPENDIDO'
                    const isDeleted   = estadoStr === 'ELIMINADO'
                    return (
                      <tr key={u.id} className={`hover:bg-white/3 transition-colors ${isDeleted ? 'opacity-60' : isSuspended ? 'opacity-75' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isDeleted   ? 'bg-red-500/15 text-red-400' :
                              isSuspended ? 'bg-amber-500/15 text-amber-400' :
                                            'bg-[#4f7cff]/15 text-[#4f7cff]'
                            }`}>
                              {(u.nombre ?? u.correo)?.[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-[#e8e8ed] truncate block" title={u.nombre ?? ''}>{u.nombre ?? '—'}</span>
                              {isSuspended && <span className="text-[10px] text-amber-400">Bloqueado</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8e8e9a] text-xs" title={u.correo}><span className="truncate block max-w-[220px]">{u.correo}</span></td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_COLORS[rolStr] ?? 'default'}>
                            {ROLE_LABELS[rolStr] ?? rolStr}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={ESTADO_BADGE[estadoStr] ?? 'default'}>
                            {estadoStr}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">

                            {/* Usuarios eliminados: solo botón restaurar */}
                            {isDeleted && (
                              <button onClick={() => setRestoreUser(u)}
                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Restaurar
                              </button>
                            )}

                            {/* Aprobar/Rechazar para pendientes */}
                            {!isDeleted && estadoStr === 'PENDIENTE' && (
                              <>
                                <button onClick={() => approve(u.id)}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                                  {t('admin.users.approve')}
                                </button>
                                <button onClick={() => reject(u.id)}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                                  {t('admin.users.reject')}
                                </button>
                              </>
                            )}

                            {/* Editar */}
                            {!isDeleted && (
                              <button onClick={() => openEdit(u)}
                                className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">
                                {t('common.edit')}
                              </button>
                            )}

                            {/* Bloquear / Desbloquear */}
                            {!isDeleted && (
                              isSuspended ? (
                                <button onClick={() => setUnblockUser(u)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                  Desbloquear
                                </button>
                              ) : estadoStr !== 'PENDIENTE' && (
                                <button onClick={() => setBlockUser(u)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a2 2 0 114 0v4" />
                                  </svg>
                                  Bloquear
                                </button>
                              )
                            )}

                            {/* Eliminar */}
                            {!isDeleted && (
                              <button onClick={() => setDeleteUser(u)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/8 hover:bg-red-500/20 text-red-400 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {displayed.length === 0 && (
                <div className="text-center py-12 text-[#8e8e9a]">{t('common.noData')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Restaurar usuario eliminado ───────────────── */}
      <Modal open={!!restoreUser} onClose={() => setRestoreUser(null)} title="Restaurar usuario" size="sm">
        {restoreUser && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed]">{restoreUser.nombre ?? restoreUser.correo}</p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">{restoreUser.correo}</p>
                <p className="text-xs text-emerald-400 mt-2">
                  La cuenta volverá a estar activa y el usuario podrá iniciar sesión.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRestoreUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleRestore} disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-medium border border-emerald-500/30 transition-colors disabled:opacity-50">
                {actionLoading ? 'Restaurando...' : 'Restaurar cuenta'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Bloquear usuario ───────────────────────────── */}
      <Modal open={!!blockUser} onClose={() => setBlockUser(null)} title="Bloquear usuario" size="sm">
        {blockUser && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4.5 h-4.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a2 2 0 114 0v4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed]">{blockUser.nombre ?? blockUser.correo}</p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">{blockUser.correo}</p>
                <p className="text-xs text-amber-400 mt-2">
                  El usuario no podrá iniciar sesión hasta que sea desbloqueado.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBlockUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleBlock} disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-medium border border-amber-500/30 transition-colors disabled:opacity-50">
                {actionLoading ? 'Bloqueando...' : 'Bloquear'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Desbloquear usuario ────────────────────────── */}
      <Modal open={!!unblockUser} onClose={() => setUnblockUser(null)} title="Desbloquear usuario" size="sm">
        {unblockUser && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed]">{unblockUser.nombre ?? unblockUser.correo}</p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">{unblockUser.correo}</p>
                <p className="text-xs text-emerald-400 mt-2">
                  La cuenta quedará activa y el usuario podrá volver a iniciar sesión.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUnblockUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button onClick={handleUnblock} disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm font-medium border border-emerald-500/30 transition-colors disabled:opacity-50">
                {actionLoading ? 'Desbloqueando...' : 'Desbloquear'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Eliminar usuario ───────────────────────────── */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Eliminar usuario" size="sm">
        {deleteUser && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20">
              <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed]">{deleteUser.nombre ?? deleteUser.correo}</p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">{deleteUser.correo}</p>
                <p className="text-xs text-red-400 mt-2">
                  La cuenta quedará desactivada. Los datos se conservan y podés restaurarla desde la pestaña "Eliminados".
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium border border-red-500/30 transition-colors disabled:opacity-50">
                {actionLoading ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Editar usuario ─────────────────────────────── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={t('admin.users.name')} size="sm">
        {editUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="w-10 h-10 rounded-full bg-[#4f7cff]/15 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
                {(editUser.nombre ?? editUser.correo)?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed] truncate">{editUser.nombre ?? '—'}</p>
                <p className="text-xs text-[#8e8e9a] truncate">{editUser.correo}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.users.role')}</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label }) => (
                  <button key={value} onClick={() => setEditRol(value)}
                    className={`px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      editRol === value
                        ? 'bg-[#4f7cff]/15 text-white border-[#4f7cff]/40'
                        : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.users.status')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[['ACTIVO', 'Activo', 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'],
                  ['INACTIVO', 'Inactivo', 'bg-red-500/15 text-red-400 border-red-500/40']].map(([val, lbl, activeClass]) => (
                  <button key={val} onClick={() => setEditEstado(val)}
                    className={`px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      editEstado === val ? activeClass : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>
              {(editEstado === 'PENDIENTE' || editEstado === 'SUSPENDIDO') && (
                <p className="text-[10px] text-amber-400">
                  {editEstado === 'PENDIENTE'
                    ? 'Para activar este usuario usá el botón "Aprobar"'
                    : 'Para desbloquear usá el botón "Desbloquear" en la tabla'}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                {t('common.cancel')}
              </button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {selectedCliente && (
        <ClienteDetailModal
          clienteId={selectedCliente}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </>
  )
}
