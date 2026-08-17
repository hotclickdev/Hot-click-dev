import Modal from '@/components/ui/Modal'

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Sí, confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{message}</p>
        <div className="flex gap-3">
          <button type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: danger ? '#ef4444' : 'var(--hc-accent)', color: '#fff' }}
          >
            {loading ? 'Procesando…' : confirmLabel}
          </button>
          <button type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
