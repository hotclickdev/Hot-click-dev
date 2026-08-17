export default function MotivoRechazoModal({
  motivoTexto,
  onMotivoChange,
  onCancel,
  onConfirm,
  loading,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: '#111114', border: '1px solid rgba(248,113,113,0.25)' }}
      >
        <h3 className="font-semibold text-[#e8e8ed]">Rechazar comprobante</h3>
        <p className="text-xs text-[#8e8e9a]">Indicá el motivo (opcional). Se notificará al cliente por correo.</p>
        <textarea
          value={motivoTexto}
          onChange={(e) => onMotivoChange(e.target.value)}
          placeholder="Ej: Monto incorrecto, imagen ilegible, comprobante vencido…"
          rows={3}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#e8e8ed' }}
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm border text-[#8e8e9a] hover:text-[#e8e8ed] transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
          >
            {loading ? '…' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </div>
  )
}
