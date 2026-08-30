import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { ReactNode } from 'react'
import type { UsuarioAdmin } from './usuarioHelpers'

export type UsuariosConfirmModalsProps = {
  restoreUser: UsuarioAdmin | null
  blockUser: UsuarioAdmin | null
  unblockUser: UsuarioAdmin | null
  deleteUser: UsuarioAdmin | null
  actionLoading: boolean
  onCloseRestore: () => void
  onCloseBlock: () => void
  onCloseUnblock: () => void
  onCloseDelete: () => void
  onRestore: () => void
  onBlock: () => void
  onUnblock: () => void
  onDelete: () => void
}

export default function UsuariosConfirmModals({
  restoreUser,
  blockUser,
  unblockUser,
  deleteUser,
  actionLoading,
  onCloseRestore,
  onCloseBlock,
  onCloseUnblock,
  onCloseDelete,
  onRestore,
  onBlock,
  onUnblock,
  onDelete,
}: UsuariosConfirmModalsProps) {
  const { t } = useTranslation()

  return (
    <>
      <ConfirmUserModal
        open={!!restoreUser}
        user={restoreUser}
        title="Restaurar usuario"
        tone="emerald"
        message="La cuenta volverá a estar activa y el usuario podrá iniciar sesión."
        confirmLabel={actionLoading ? 'Restaurando...' : 'Restaurar cuenta'}
        cancelLabel="Cancelar"
        loading={actionLoading}
        icon={<RestoreIcon />}
        onClose={onCloseRestore}
        onConfirm={onRestore}
      />
      <ConfirmUserModal
        open={!!blockUser}
        user={blockUser}
        title="Bloquear usuario"
        tone="amber"
        message="El usuario no podrá iniciar sesión hasta que sea desbloqueado."
        confirmLabel={actionLoading ? 'Bloqueando...' : 'Bloquear'}
        cancelLabel="Cancelar"
        loading={actionLoading}
        icon={<BlockIcon />}
        onClose={onCloseBlock}
        onConfirm={onBlock}
      />
      <ConfirmUserModal
        open={!!unblockUser}
        user={unblockUser}
        title="Desbloquear usuario"
        tone="emerald"
        message="La cuenta quedará activa y el usuario podrá volver a iniciar sesión."
        confirmLabel={actionLoading ? 'Desbloqueando...' : 'Desbloquear'}
        cancelLabel="Cancelar"
        loading={actionLoading}
        icon={<UnblockIcon />}
        onClose={onCloseUnblock}
        onConfirm={onUnblock}
      />
      <ConfirmUserModal
        open={!!deleteUser}
        user={deleteUser}
        title="Eliminar usuario"
        tone="red"
        message='La cuenta quedará desactivada. Los datos se conservan y podés restaurarla desde la pestaña "Eliminados".'
        confirmLabel={actionLoading ? t('common.loading') : t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={actionLoading}
        icon={<DeleteIcon />}
        onClose={onCloseDelete}
        onConfirm={onDelete}
      />
    </>
  )
}

const TONE = {
  emerald: {
    box: 'bg-emerald-500/8 border-emerald-500/20',
    iconWrap: 'bg-emerald-500/15',
    icon: 'text-emerald-400',
    message: 'text-emerald-400',
    confirm: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30',
  },
  amber: {
    box: 'bg-amber-500/8 border-amber-500/20',
    iconWrap: 'bg-amber-500/15',
    icon: 'text-amber-400',
    message: 'text-amber-400',
    confirm: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30',
  },
  red: {
    box: 'bg-red-500/8 border-red-500/20',
    iconWrap: 'bg-red-500/15',
    icon: 'text-red-400',
    message: 'text-red-400',
    confirm: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30',
  },
}

type ToneKey = keyof typeof TONE

function ConfirmUserModal({
  open,
  user,
  title,
  tone,
  message,
  confirmLabel,
  cancelLabel,
  loading,
  icon,
  onClose,
  onConfirm,
}: {
  open: boolean
  user: UsuarioAdmin | null
  title: string
  tone: ToneKey
  message: string
  confirmLabel: string
  cancelLabel: string
  loading: boolean
  icon: ReactNode
  onClose: () => void
  onConfirm: () => void
}) {
  const colors = TONE[tone]
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {user && (
        <div className="space-y-5">
          <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${colors.box}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colors.iconWrap}`}>
              <span className={colors.icon}>{icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#e8e8ed]">{user.nombre ?? user.correo}</p>
              <p className="text-xs text-[#8e8e9a] mt-0.5">{user.correo}</p>
              <p className={`text-xs mt-2 ${colors.message}`}>{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-white text-sm transition-colors"
            >
              {cancelLabel}
            </button>
            <button type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 h-10 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${colors.confirm}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function RestoreIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function BlockIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 11V7a2 2 0 114 0v4" />
    </svg>
  )
}

function UnblockIcon() {
  return (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  )
}
