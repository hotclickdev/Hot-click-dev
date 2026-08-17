import { useCallback } from 'react'
import { adminService } from '@/services/orderService'
import { ESTADO_INT, getEstadoStr, getRolStr, usuariosDesdeRespuestas } from './usuarioHelpers'

/**
 * Handlers usuarios admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminUsersActions(deps) {
  const {
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
  } = deps

  const getPlanStr = useCallback((u) => (u.empresaId ? empresasPlan[u.empresaId] : null), [empresasPlan])

  const approve = useCallback(async (id) => {
    try {
      await adminService.approveUser(id, { rol: 'USUARIO_FINAL' })
      toast({ message: 'Usuario aprobado', type: 'success' })
      load()
    } catch {
      toast({ message: 'Error al aprobar', type: 'error' })
    }
  }, [load, toast])

  const reject = useCallback(async (id) => {
    try {
      await adminService.rejectUser(id)
      toast({ message: 'Usuario rechazado', type: 'info' })
      load()
    } catch {
      toast({ message: 'Error al rechazar', type: 'error' })
    }
  }, [load, toast])

  const handleDelete = useCallback(async () => {
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
  }, [deleteUser, load, setActionLoading, setDeleteUser, toast])

  const handleBlock = useCallback(async () => {
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
  }, [blockUser, load, setActionLoading, setBlockUser, toast])

  const handleUnblock = useCallback(async () => {
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
  }, [load, setActionLoading, setUnblockUser, toast, unblockUser])

  const handleRestore = useCallback(async () => {
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
  }, [load, restoreUser, setActionLoading, setRestoreUser, toast])

  const openEdit = useCallback((u) => {
    setEditUser(u)
    setEditRol(getRolStr(u))
    setEditEstado(getEstadoStr(u))
    setEditPlan(getPlanStr(u) ?? 'EMPRENDEDOR')
  }, [getPlanStr, setEditEstado, setEditPlan, setEditRol, setEditUser])

  const handleSave = useCallback(async () => {
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
  }, [editEstado, editPlan, editRol, editUser, getPlanStr, load, setEditUser, setSaving, toast])

  return {
    getPlanStr,
    approve,
    reject,
    handleDelete,
    handleBlock,
    handleUnblock,
    handleRestore,
    openEdit,
    handleSave,
  }
}

/** Carga usuarios, pendientes y planes de empresa. */
export async function obtenerUsuarios() {
  const [{ data: all }, { data: pend }, { data: empresas }] = await Promise.all([
    adminService.getUsers(),
    adminService.getPendingUsers(),
    adminService.getEmpresas(),
  ])
  return usuariosDesdeRespuestas(all, pend, empresas)
}
