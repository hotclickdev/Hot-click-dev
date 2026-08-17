import { ROLES_ADMIN } from './gestionTabHelpers'

/**
 * Modales editar usuario y confirmar acción — bit-idéntico al original.
 */
export default function GestionUserForm({
  editUser,
  editRol,
  editEstado,
  saving,
  onEditRol,
  onEditEstado,
  onCloseEdit,
  onSave,
  actionUser,
  actionType,
  actionLoading,
  onCloseAction,
  onConfirmAction,
}) {
  return (
    <>
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onCloseEdit}
          onKeyDown={(e) => { if (e.key === 'Escape') onCloseEdit() }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Editar usuario</p>
              <button onClick={onCloseEdit} style={{ color: 'var(--hc-muted)' }}>
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

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Rol</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES_ADMIN.map(({ value, label }) => (
                  <button key={value} onClick={() => onEditRol(value)}
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

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Estado</p>
              <div className="grid grid-cols-2 gap-2">
                {[['ACTIVO', '#4ade80', 'rgba(34,197,94,0.15)', 'rgba(34,197,94,0.4)'],
                  ['INACTIVO', '#f87171', 'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.4)']].map(([val, color, bg, border]) => (
                  <button key={val} onClick={() => onEditEstado(val)}
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
              <button onClick={onCloseEdit}
                className="flex-1 h-10 rounded-xl text-sm transition-colors"
                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
                Cancelar
              </button>
              <button onClick={onSave} disabled={saving}
                className="flex-1 h-10 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onCloseAction}
          onKeyDown={(e) => { if (e.key === 'Escape') onCloseAction() }}>
          <div className="w-full max-w-xs rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}>
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
              <button onClick={onCloseAction}
                className="flex-1 h-9 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
                Cancelar
              </button>
              <button onClick={onConfirmAction} disabled={actionLoading}
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
    </>
  )
}
