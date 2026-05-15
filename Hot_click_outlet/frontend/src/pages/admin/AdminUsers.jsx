import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'

// Mapeo estado int → string
const ESTADO_NUM = { 0: 'PENDIENTE', 1: 'ACTIVO', 2: 'INACTIVO' }
const ESTADO_INT = { ACTIVO: 1, INACTIVO: 2 }

const ROLES = [
  { value: 'USUARIO_FINAL', label: 'Cliente' },
  { value: 'ADMIN_CLIENTE', label: 'Admin Cliente' },
  { value: 'ADMIN_IT',      label: 'Admin IT' },
]

const ROLE_COLORS = { ADMIN_IT: 'danger', ADMIN_CLIENTE: 'purple', USUARIO_FINAL: 'default' }
const ROLE_LABELS = { ADMIN_IT: 'Admin IT', ADMIN_CLIENTE: 'Admin Cliente', USUARIO_FINAL: 'Cliente' }

// Helpers para leer la respuesta de la API
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

  // Delete modal
  const [deleteUser, setDeleteUser] = useState(null)
  const [deleting, setDeleting] = useState(false)

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
    setDeleting(true)
    try {
      await adminService.deleteUser(deleteUser.id)
      toast({ message: 'Usuario eliminado', type: 'success' })
      setDeleteUser(null)
      load()
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
    finally { setDeleting(false) }
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
      if (editEstado !== currentEstado && editEstado !== 'PENDIENTE') {
        promises.push(adminService.setStatus(editUser.id, ESTADO_INT[editEstado]))
      }

      if (promises.length === 0) {
        setEditUser(null)
        return
      }
      await Promise.all(promises)
      toast({ message: 'Usuario actualizado', type: 'success' })
      setEditUser(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al actualizar'
      toast({ message: msg, type: 'error' })
    } finally { setSaving(false) }
  }

  const base = tab === 'pending' ? pending : users
  const displayed = search
    ? base.filter((u) =>
        (u.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (u.correo ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : base

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.users.title')}</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">{users.length} registrados · {pending.length} {t('admin.orders.pending').toLowerCase()}</p>
        </div>

        {/* Tabs + búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
            {[['all', 'Todos'], ['pending', `Pendientes (${pending.length})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === key ? 'bg-[#4f7cff] text-white' : 'text-[#8e8e9a] hover:text-white'}`}>
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

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-white/8">
                    {[t('admin.users.name'), t('admin.users.email'), t('admin.users.role'), t('admin.users.status'), t('admin.users.actions')].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayed.map((u) => {
                    const estadoStr = getEstadoStr(u)
                    const rolStr    = getRolStr(u)
                    return (
                      <tr key={u.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#4f7cff]/15 flex items-center justify-center text-xs font-bold text-[#4f7cff] shrink-0">
                              {(u.nombre ?? u.correo)?.[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-[#e8e8ed] truncate max-w-[120px]">{u.nombre ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#8e8e9a] text-xs truncate max-w-[160px]">{u.correo}</td>
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_COLORS[rolStr] ?? 'default'}>
                            {ROLE_LABELS[rolStr] ?? rolStr}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={estadoStr === 'ACTIVO' ? 'success' : estadoStr === 'PENDIENTE' ? 'warning' : 'danger'}>
                            {estadoStr}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {estadoStr === 'PENDIENTE' && (
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
                            <button onClick={() => openEdit(u)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">
                              {t('common.edit')}
                            </button>
                            <button onClick={() => setDeleteUser(u)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/8 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Eliminar usuario">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                              </svg>
                            </button>
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

      {/* Modal confirmar eliminación */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Eliminar usuario" size="sm">
        {deleteUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
              <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed] truncate">{deleteUser.nombre ?? deleteUser.correo}</p>
                <p className="text-xs text-red-400">Esta acción desactivará la cuenta permanentemente.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium border border-red-500/30 transition-colors disabled:opacity-50">
                {deleting ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal editar usuario */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={t('admin.users.name')} size="sm">
        {editUser && (
          <div className="space-y-5">
            {/* Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
              <div className="w-10 h-10 rounded-full bg-[#4f7cff]/15 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
                {(editUser.nombre ?? editUser.correo)?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#e8e8ed] truncate">{editUser.nombre ?? '—'}</p>
                <p className="text-xs text-[#8e8e9a] truncate">{editUser.correo}</p>
              </div>
            </div>

            {/* Rol */}
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

            {/* Estado — solo ACTIVO/INACTIVO permitidos por el backend */}
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
              {editEstado === 'PENDIENTE' && (
                <p className="text-[10px] text-amber-400">Para activar este usuario usa el botón "Aprobar"</p>
              )}
            </div>

            {/* Botones */}
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
    </AdminLayout>
  )
}
