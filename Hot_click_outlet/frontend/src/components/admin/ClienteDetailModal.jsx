import { fmt, fmtDate } from './clienteDetail/clienteDetailHelpers'
import { SegmentoBadge } from './clienteDetail/SegmentoBadge'
import { useClienteDetailModal } from './clienteDetail/useClienteDetailModal'

export default function ClienteDetailModal({ clienteId, onClose }) {
  const {
    cliente,
    loading,
    editMode,
    setEditMode,
    form,
    setForm,
    saving,
    deltaPoints,
    setDeltaPoints,
    handleSave,
    handleAjustarPuntos,
    SEGMENTOS,
  } = useClienteDetailModal(clienteId)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      role="presentation" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-lg h-full overflow-y-auto flex flex-col"
        style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '-4px 0 32px rgba(0,0,0,0.4)' }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>

        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b"
          style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>Ficha de cliente</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode(e => !e)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
              {editMode ? 'Cancelar' : 'Editar'}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
          </div>
        ) : cliente && (
          <div className="flex-1 p-5 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0"
                style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)' }}>
                {(cliente.nombre ?? '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>
                  {cliente.nombre} {cliente.apellidoPaterno}
                </p>
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{cliente.correo}</p>
                {cliente.telefono && (
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{cliente.telefono}</p>
                )}
                <div className="mt-2">
                  {editMode ? (
                    <select value={form.segmento} onChange={e => setForm(f => ({ ...f, segmento: e.target.value }))}
                      className="px-2 py-1 rounded-lg text-xs outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-text)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <SegmentoBadge seg={cliente.segmento} />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pedidos',     value: cliente.numPedidosHist ?? 0,         color: 'var(--hc-text)' },
                { label: 'Total',       value: `₡${fmt(cliente.totalComprasHist)}`,  color: 'var(--hc-accent)' },
                { label: 'Puntos',      value: editMode ? form.puntosFidelidad : (cliente.puntosFidelidad ?? 0), color: '#fbbf24' },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>{k.label}</p>
                  {k.label === 'Puntos' && editMode ? (
                    <input type="number" value={form.puntosFidelidad}
                      onChange={e => setForm(f => ({ ...f, puntosFidelidad: Number.parseInt(e.target.value) || 0 }))}
                      className="w-full text-center text-sm font-bold outline-none rounded-lg py-0.5"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}/>
                  ) : (
                    <p className="text-lg font-black" style={{ color: k.color }}>{k.value}</p>
                  )}
                </div>
              ))}
            </div>

            {!editMode && (
              <div className="rounded-xl p-4 space-y-2"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Ajustar puntos</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={deltaPoints}
                    onChange={e => setDeltaPoints(e.target.value)}
                    placeholder="cantidad"
                    className="flex-1 px-3 py-2 rounded-xl text-sm text-center outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
                  <button onClick={() => handleAjustarPuntos(1)}
                    className="px-3 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}>+ Sumar</button>
                  <button onClick={() => handleAjustarPuntos(-1)}
                    className="px-3 py-2 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171' }}>− Restar</button>
                </div>
              </div>
            )}

            {editMode && (
              <div>
                <label htmlFor="cliente-limite-credito" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Límite de crédito (₡)</label>
                <input id="cliente-limite-credito" type="number" min={0} value={form.limiteCredito}
                  onChange={e => setForm(f => ({ ...f, limiteCredito: Number.parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
              </div>
            )}

            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas internas</p>
              {editMode ? (
                <textarea rows={3} value={form.notasInternas}
                  onChange={e => setForm(f => ({ ...f, notasInternas: e.target.value }))}
                  placeholder="Observaciones para el equipo…"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
              ) : (
                <p className="text-sm rounded-xl p-3"
                  style={{ backgroundColor: 'var(--hc-bg)', color: cliente.notasInternas ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                  {cliente.notasInternas || 'Sin notas'}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--hc-muted)' }}>Últimos pedidos</p>
              {(cliente.pedidos ?? []).length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Sin pedidos registrados</p>
              ) : (
                <div className="space-y-2">
                  {(cliente.pedidos ?? []).map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl p-3"
                      style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <p className="text-xs font-mono" style={{ color: 'var(--hc-text)' }}>{p.numeroPedido}</p>
                        <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{fmtDate(p.fechaPedido)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: 'var(--hc-accent)' }}>₡{fmt(p.totalPedido)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>{p.estadoPedido}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editMode && (
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
