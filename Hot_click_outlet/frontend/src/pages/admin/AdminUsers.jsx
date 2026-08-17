import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { crmService } from '@/services/crmService'
import ClienteDetailModal from '@/components/admin/ClienteDetailModal'
import CrmTab from './usuarios/CrmTab'
import UsuariosHeader from './usuarios/UsuariosHeader'
import UsuariosTable from './usuarios/UsuariosTable'
import UsuarioEditModal from './usuarios/UsuarioEditModal'
import UsuariosConfirmModals from './usuarios/UsuariosConfirmModals'
import { ESTADO_INT, getEstadoStr, getRolStr, usuariosDesdeRespuestas } from './usuarios/usuarioHelpers'

async function obtenerUsuarios() {
  const [{ data: all }, { data: pend }, { data: empresas }] = await Promise.all([
    adminService.getUsers(),
    adminService.getPendingUsers(),
    adminService.getEmpresas(),
  ])
  return usuariosDesdeRespuestas(all, pend, empresas)
}

export default function AdminUsers() {
  const { t } = useTranslation()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [empresasPlan, setEmpresasPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const [editUser, setEditUser] = useState(null)
  const [editRol, setEditRol] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editPlan, setEditPlan] = useState('')
  const [saving, setSaving] = useState(false)

  const [clientes, setClientes] = useState([])
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmSearch, setCrmSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState(null)

  const [deleteUser, setDeleteUser] = useState(null)
  const [blockUser, setBlockUser] = useState(null)
  const [unblockUser, setUnblockUser] = useState(null)
  const [restoreUser, setRestoreUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  function load() {
    setLoading(true)
    obtenerUsuarios()
      .then(({ users: lista, pending: pend, empresasPlan: planes }) => {
        setUsers(lista)
        setPending(pend)
        setEmpresasPlan(planes)
      })
      .catch(() => toast({ message: 'Error al cargar usuarios', type: 'error' }))
      .finally(() => setLoading(false))
  }

  // Carga inicial una sola vez (toast no debe re-disparar el fetch).
  useEffect(() => {
    let cancelado = false
    obtenerUsuarios()
      .then(({ users: lista, pending: pend, empresasPlan: planes }) => {
        if (cancelado) return
        setUsers(lista)
        setPending(pend)
        setEmpresasPlan(planes)
      })
      .catch(() => { if (!cancelado) toast({ message: 'Error al cargar usuarios', type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  useEffect(() => {
    if (tab !== 'crm' || clientes.length > 0) return
    let cancelado = false
    crmService.listarClientes()
      .then((lista) => { if (!cancelado) setClientes(lista) })
      .catch(() => { if (!cancelado) toast({ message: 'Error al cargar CRM', type: 'error' }) })
      .finally(() => { if (!cancelado) setCrmLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga CRM al entrar a la tab
  }, [tab])

  function onTab(key) {
    if (key === 'crm' && clientes.length === 0) setCrmLoading(true)
    setTab(key)
  }

  const activeUsers = users.filter((u) => {
    const estado = getEstadoStr(u)
    return estado !== 'ELIMINADO' && estado !== 'PENDIENTE'
  })
  const deletedUsers = users.filter((u) => getEstadoStr(u) === 'ELIMINADO')

  const approve = async (id) => {
    try {
      await adminService.approveUser(id, { rol: 'USUARIO_FINAL' })
      toast({ message: 'Usuario aprobado', type: 'success' })
      load()
    } catch {
      toast({ message: 'Error al aprobar', type: 'error' })
    }
  }

  const reject = async (id) => {
    try {
      await adminService.rejectUser(id)
      toast({ message: 'Usuario rechazado', type: 'info' })
      load()
    } catch {
      toast({ message: 'Error al rechazar', type: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setActionLoading(true)
    try {
      await adminService.deleteUser(deleteUser.id)
      toast({ message: 'Usuario eliminado', type: 'success' })
      setDeleteUser(null)
      load()
    } catch {
      toast({ message: 'Error al eliminar', type: 'error' })
    } finally {
      setActionLoading(false)
    }
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
    } finally {
      setActionLoading(false)
    }
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
    } finally {
      setActionLoading(false)
    }
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
    } finally {
      setActionLoading(false)
    }
  }

  const getPlanStr = (u) => (u.empresaId ? empresasPlan[u.empresaId] : null)

  const openEdit = (u) => {
    setEditUser(u)
    setEditRol(getRolStr(u))
    setEditEstado(getEstadoStr(u))
    setEditPlan(getPlanStr(u) ?? 'EMPRENDEDOR')
  }

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const currentRol = getRolStr(editUser)
      const currentEstado = getEstadoStr(editUser)
      const currentPlan = getPlanStr(editUser)
      const promises = []

      if (editRol !== currentRol) {
        promises.push(adminService.setRole(editUser.id, editRol))
      }
      if (editEstado !== currentEstado && ESTADO_INT[editEstado] != null) {
        promises.push(adminService.setStatus(editUser.id, ESTADO_INT[editEstado]))
      }
      if (editRol === 'EMPRENDEDOR' && editUser.empresaId && editPlan !== currentPlan) {
        promises.push(adminService.setEmpresaPlan(editUser.empresaId, editPlan))
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
      toast({ message: err.response?.data?.message ?? 'Error al actualizar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const baseForTab = tab === 'pending' ? pending : tab === 'deleted' ? deletedUsers : activeUsers
  const displayed = search
    ? baseForTab.filter((u) =>
      (u.nombre ?? '').toLowerCase().includes(search.toLowerCase())
      || (u.correo ?? '').toLowerCase().includes(search.toLowerCase())
    )
    : baseForTab

  const tabs = [
    ['all', `Activos (${activeUsers.length})`],
    ['pending', `Pendientes (${pending.length})`],
    ['deleted', `Eliminados (${deletedUsers.length})`],
    ['crm', `CRM Clientes (${clientes.length})`],
  ]

  return (
    <>
      <div className="space-y-5">
        <UsuariosHeader
          title={t('admin.users.title')}
          subtitle={`${users.length} registrados · ${pending.length} ${t('admin.orders.pending').toLowerCase()} · ${deletedUsers.length} eliminados`}
          users={users}
          tabs={tabs}
          tab={tab}
          onTab={onTab}
          search={search}
          onSearch={setSearch}
        />

        {tab === 'crm' ? (
          <CrmTab
            clientes={clientes}
            crmSearch={crmSearch}
            onCrmSearch={setCrmSearch}
            onSelect={setSelectedCliente}
            loading={crmLoading}
          />
        ) : loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <UsuariosTable
            displayed={displayed}
            getPlanStr={getPlanStr}
            columnLabels={[
              t('admin.users.name'),
              t('admin.users.email'),
              t('admin.users.role'),
              t('admin.users.status'),
              t('admin.users.actions'),
            ]}
            emptyLabel={t('common.noData')}
            approveLabel={t('admin.users.approve')}
            rejectLabel={t('admin.users.reject')}
            editLabel={t('common.edit')}
            onApprove={approve}
            onReject={reject}
            onEdit={openEdit}
            onBlock={setBlockUser}
            onUnblock={setUnblockUser}
            onDelete={setDeleteUser}
            onRestore={setRestoreUser}
          />
        )}
      </div>

      <UsuariosConfirmModals
        restoreUser={restoreUser}
        blockUser={blockUser}
        unblockUser={unblockUser}
        deleteUser={deleteUser}
        actionLoading={actionLoading}
        onCloseRestore={() => setRestoreUser(null)}
        onCloseBlock={() => setBlockUser(null)}
        onCloseUnblock={() => setUnblockUser(null)}
        onCloseDelete={() => setDeleteUser(null)}
        onRestore={handleRestore}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onDelete={handleDelete}
      />

      <UsuarioEditModal
        editUser={editUser}
        editRol={editRol}
        editEstado={editEstado}
        editPlan={editPlan}
        saving={saving}
        title={t('admin.users.name')}
        roleLabel={t('admin.users.role')}
        statusLabel={t('admin.users.status')}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
        loadingLabel={t('common.loading')}
        onClose={() => setEditUser(null)}
        onRol={setEditRol}
        onEstado={setEditEstado}
        onPlan={setEditPlan}
        onSave={handleSave}
      />

      {selectedCliente && (
        <ClienteDetailModal
          clienteId={selectedCliente}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </>
  )
}
