import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { crmService } from '@/services/crmService'
import ClienteDetailModal from '@/components/admin/ClienteDetailModal'
import CrmTab from './usuarios/CrmTab'
import UsuariosHeader from './usuarios/UsuariosHeader'
import UsuariosTable from './usuarios/UsuariosTable'
import UsuarioEditModal from './usuarios/UsuarioEditModal'
import UsuariosConfirmModals from './usuarios/UsuariosConfirmModals'
import { getEstadoStr, type UsuarioAdmin } from './usuarios/usuarioHelpers'
import { obtenerUsuarios, useAdminUsersActions } from './usuarios/useAdminUsersActions'
import type { ClienteCrm } from './clientes/clientesHelpers'
import type { Id } from '@/types/api'
import type { TFunction } from 'i18next'

export default function AdminUsers() {
  const { t } = useTranslation()
  const toast = useToast()
  const [users, setUsers] = useState<UsuarioAdmin[]>([])
  const [pending, setPending] = useState<UsuarioAdmin[]>([])
  const [empresasPlan, setEmpresasPlan] = useState<Record<string, string | undefined>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  const [editUser, setEditUser] = useState<UsuarioAdmin | null>(null)
  const [editRol, setEditRol] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editPlan, setEditPlan] = useState('')
  const [saving, setSaving] = useState(false)

  const [clientes, setClientes] = useState<ClienteCrm[]>([])
  const [crmLoading, setCrmLoading] = useState(false)
  const [crmSearch, setCrmSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Id | null>(null)

  const [deleteUser, setDeleteUser] = useState<UsuarioAdmin | null>(null)
  const [blockUser, setBlockUser] = useState<UsuarioAdmin | null>(null)
  const [unblockUser, setUnblockUser] = useState<UsuarioAdmin | null>(null)
  const [restoreUser, setRestoreUser] = useState<UsuarioAdmin | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  function load() {
    setLoading(true)
    obtenerUsuarios()
      .then(({ users: lista, pending: pend, empresasPlan: planes }) => {
        setUsers(lista)
        setPending(pend)
        setEmpresasPlan(planes)
      })
      .catch((err: unknown) => { console.error(err); toast({ message: 'Error al cargar usuarios', type: 'error' }) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelado = false
    obtenerUsuarios()
      .then(({ users: lista, pending: pend, empresasPlan: planes }) => {
        if (cancelado) return
        setUsers(lista)
        setPending(pend)
        setEmpresasPlan(planes)
      })
      .catch((err: unknown) => { if (!cancelado) { console.error(err); toast({ message: 'Error al cargar usuarios', type: 'error' }) } })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  useEffect(() => {
    if (tab !== 'crm' || clientes.length > 0) return
    let cancelado = false
    crmService.listarClientes()
      .then((lista: unknown) => { if (!cancelado) setClientes(lista as ClienteCrm[]) })
      .catch((err: unknown) => { if (!cancelado) { console.error(err); toast({ message: 'Error al cargar CRM', type: 'error' }) } })
      .finally(() => { if (!cancelado) setCrmLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga CRM al entrar a la tab
  }, [tab])

  function onTab(key: string) {
    if (key === 'crm' && clientes.length === 0) setCrmLoading(true)
    setTab(key)
  }

  const {
    getPlanStr,
    approve,
    reject,
    handleDelete,
    handleBlock,
    handleUnblock,
    handleRestore,
    openEdit,
    handleSave,
  } = useAdminUsersActions({
    toast,
    empresasPlan,
    editUser,
    editRol,
    editEstado,
    editPlan,
    deleteUser,
    blockUser,
    unblockUser,
    restoreUser,
    setLoading,
    setUsers,
    setPending,
    setEmpresasPlan,
    setEditUser,
    setEditRol,
    setEditEstado,
    setEditPlan,
    setSaving,
    setDeleteUser,
    setBlockUser,
    setUnblockUser,
    setRestoreUser,
    setActionLoading,
    load,
  })

  const activeUsers = users.filter((u) => {
    const estado = getEstadoStr(u)
    return estado !== 'ELIMINADO' && estado !== 'PENDIENTE'
  })
  const deletedUsers = users.filter((u) => getEstadoStr(u) === 'ELIMINADO')

  const baseForTab = usuariosDeTab(tab, pending, deletedUsers, activeUsers)
  const displayed = search
    ? baseForTab.filter((u) =>
      (u.nombre ?? '').toLowerCase().includes(search.toLowerCase())
      || (u.correo ?? '').toLowerCase().includes(search.toLowerCase())
    )
    : baseForTab

  const tabs: [string, string][] = [
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

        {cuerpoAdminUsers({
          tab, clientes, crmSearch, setCrmSearch, setSelectedCliente, crmLoading,
          loading, displayed, getPlanStr, t, approve, reject, openEdit,
          setBlockUser, setUnblockUser, setDeleteUser, setRestoreUser,
        })}
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

function usuariosDeTab(tab: string, pending: UsuarioAdmin[], deletedUsers: UsuarioAdmin[], activeUsers: UsuarioAdmin[]): UsuarioAdmin[] {
  if (tab === 'pending') return pending
  if (tab === 'deleted') return deletedUsers
  return activeUsers
}

function cuerpoAdminUsers({
  tab, clientes, crmSearch, setCrmSearch, setSelectedCliente, crmLoading,
  loading, displayed, getPlanStr, t, approve, reject, openEdit,
  setBlockUser, setUnblockUser, setDeleteUser, setRestoreUser,
}: {
  tab: string
  clientes: ClienteCrm[]
  crmSearch: string
  setCrmSearch: Dispatch<SetStateAction<string>>
  setSelectedCliente: Dispatch<SetStateAction<Id | null>>
  crmLoading: boolean
  loading: boolean
  displayed: UsuarioAdmin[]
  getPlanStr: (u: UsuarioAdmin) => string | null | undefined
  t: TFunction
  approve: (id: Id) => void
  reject: (id: Id) => void
  openEdit: (u: UsuarioAdmin) => void
  setBlockUser: Dispatch<SetStateAction<UsuarioAdmin | null>>
  setUnblockUser: Dispatch<SetStateAction<UsuarioAdmin | null>>
  setDeleteUser: Dispatch<SetStateAction<UsuarioAdmin | null>>
  setRestoreUser: Dispatch<SetStateAction<UsuarioAdmin | null>>
}) {
  if (tab === 'crm') {
    return (
      <CrmTab
        clientes={clientes}
        crmSearch={crmSearch}
        onCrmSearch={setCrmSearch}
        onSelect={setSelectedCliente}
        loading={crmLoading}
      />
    )
  }
  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  }
  return (
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
  )
}
