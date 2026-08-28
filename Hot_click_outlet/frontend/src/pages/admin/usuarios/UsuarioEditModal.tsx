import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PLANES, PLAN_LABELS, ROLES, type UsuarioAdmin } from './usuarioHelpers'

export type UsuarioEditModalProps = {
  editUser: UsuarioAdmin | null
  editRol: string
  editEstado: string
  editPlan: string
  saving: boolean
  title: string
  roleLabel: string
  statusLabel: string
  cancelLabel: string
  saveLabel: string
  loadingLabel: string
  onClose: () => void
  onRol: (rol: string) => void
  onEstado: (estado: string) => void
  onPlan: (plan: string) => void
  onSave: () => void
}

export default function UsuarioEditModal({
  editUser,
  editRol,
  editEstado,
  editPlan,
  saving,
  title,
  roleLabel,
  statusLabel,
  cancelLabel,
  saveLabel,
  loadingLabel,
  onClose,
  onRol,
  onEstado,
  onPlan,
  onSave,
}: UsuarioEditModalProps) {
  return (
    <Modal open={!!editUser} onClose={onClose} title={title} size="sm">
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
            <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{roleLabel}</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, label }) => (
                <button type="button"
                  key={value}
                  onClick={() => onRol(value)}
                  className={`px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    editRol === value
                      ? 'bg-[#4f7cff]/15 text-white border-[#4f7cff]/40'
                      : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {editRol === 'EMPRENDEDOR' && editUser.empresaId && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Plan del negocio</label>
              <div className="grid grid-cols-3 gap-2">
                {PLANES.map((value) => (
                  <button type="button"
                    key={value}
                    onClick={() => onPlan(value)}
                    className={`px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      editPlan === value
                        ? 'bg-[#4f7cff]/15 text-white border-[#4f7cff]/40'
                        : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {PLAN_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{statusLabel}</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['ACTIVO', 'Activo', 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'],
                  ['INACTIVO', 'Inactivo', 'bg-red-500/15 text-red-400 border-red-500/40'],
                ] as const
              ).map(([val, lbl, activeClass]) => (
                <button type="button"
                  key={val}
                  onClick={() => onEstado(val)}
                  className={`px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    editEstado === val ? activeClass : 'text-[#8e8e9a] border-white/10 hover:text-white hover:border-white/20'
                  }`}
                >
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
            <button type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors"
            >
              {cancelLabel}
            </button>
            <Button onClick={onSave} disabled={saving} className="flex-1">
              {saving ? loadingLabel : saveLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
