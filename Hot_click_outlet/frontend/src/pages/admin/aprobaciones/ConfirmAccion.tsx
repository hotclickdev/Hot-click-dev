import type { AccionAprobacion } from './aprobacionesHelpers'

export default function ConfirmAccion({
  action,
  titulo,
  detalle,
  comentario,
  onComentarioChange,
  mostrarComentario,
  onConfirm,
  onCancel,
  saving,
}: {
  action: AccionAprobacion
  titulo: string
  detalle?: string
  comentario?: string
  onComentarioChange?: (v: string) => void
  mostrarComentario?: boolean
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}) {
  const esAprobar = action === 'aprobar'
  return (
    <div className="rounded-xl p-3 space-y-2 text-center"
      style={{ backgroundColor: 'var(--hc-surface-2)', border: `1px solid ${esAprobar ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{titulo}</p>
      {detalle && <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{detalle}</p>}
      {mostrarComentario && (
        <textarea
          value={comentario}
          onChange={(evento) => onComentarioChange?.(evento.target.value)}
          placeholder="Comentario para el emprendedor (qué ajustar)..."
          rows={2}
          className="w-full px-2 py-1.5 rounded-lg text-xs resize-none"
          style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
        />
      )}
      <div className="flex gap-1.5">
        <button type="button"
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ backgroundColor: esAprobar ? '#22c55e' : '#ef4444', color: '#fff' }}
        >
          {saving ? '…' : 'Sí, confirmar'}
        </button>
        <button type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-2 py-1.5 rounded-lg text-xs disabled:opacity-50"
          style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
