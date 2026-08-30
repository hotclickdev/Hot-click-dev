import ConteoEfectivo from './ConteoEfectivo'

export default function CierreTurnoModal({ onCancel, onCerrar, saving, onTotal }: {
  onCancel: () => void
  onCerrar: () => void
  saving: boolean
  onTotal: (total: number) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ backgroundColor: '#0c0c12', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <h2 className="text-xl font-black mb-1" style={{ color: '#fff' }}>Cerrar turno</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Contá el efectivo final de la caja antes de cerrar</p>
        </div>
        <ConteoEfectivo label="Efectivo en caja al cierre" onTotal={onTotal} />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel}
            className="py-3 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancelar
          </button>
          <button type="button" onClick={onCerrar} disabled={saving}
            className="py-3 rounded-xl text-sm font-black disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>
            {saving ? 'Cerrando…' : 'Cerrar turno'}
          </button>
        </div>
      </div>
    </div>
  )
}
