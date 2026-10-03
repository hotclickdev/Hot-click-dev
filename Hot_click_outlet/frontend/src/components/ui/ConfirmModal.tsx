import Modal from '@/components/ui/Modal'
import type { ReactNode } from 'react'
import { BOTON_HOJA_PRIMARIO, BOTON_HOJA_SECUNDARIO } from '@/components/ui/sistema/estilosHoja'
import { useVariantePieza, type VariantePieza } from '@/components/ui/varianteVisitante'

export type ConfirmModalProps = {
  open: boolean
  onClose?: () => void
  onConfirm?: () => void
  title?: ReactNode
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  /** ⚠️ COMPARTIDO. Sin prop: `figma` en rutas del visitante, `clasica` en paneles. */
  variante?: VariantePieza
}

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
  variante,
}: ConfirmModalProps) {
  const v = useVariantePieza(variante)
  if (v === 'figma') {
    // Visitante: hoja con botones del sistema (Figma `51:2192` / `51:2194`): secundario a la izquierda, rojo a la derecha.
    return (
      <Modal open={open} onClose={onClose} title={title} variante="figma">
        {message ? <p className="text-[14px] leading-[21px] text-hc-n-600">{message}</p> : null}
        <div className="flex gap-[10px]">
          <button type="button" onClick={onClose} disabled={loading} className={BOTON_HOJA_SECUNDARIO}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className={BOTON_HOJA_PRIMARIO}>
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </Modal>
    )
  }
  return (
    <Modal open={open} onClose={onClose} title={title} variante="clasica">
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
