import { fmt } from './posCobroHelpers'

export default function PosCamposMetodo({
  metodoPago,
  montoRecibido,
  setMontoRecibido,
  vuelto,
  confirmSinpe,
  setConfirmSinpe,
}: {
  metodoPago: string
  montoRecibido: string
  setMontoRecibido: (v: string) => void
  vuelto: number | null
  confirmSinpe: string
  setConfirmSinpe: (v: string) => void
}) {
  return (
    <>
      {metodoPago === 'EFECTIVO' && (
        <div>
          <label htmlFor="pos-monto" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Monto recibido (₡)</label>
          <input id="pos-monto" type="text" autoFocus value={montoRecibido}
            onChange={e => setMontoRecibido(e.target.value)} placeholder="0"
            className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}/>
          {vuelto !== null && (
            <p className="text-sm font-bold mt-2"
              style={{ color: vuelto >= 0 ? '#34d399' : '#f87171' }}>
              {vuelto >= 0 ? `Vuelto: ₡${fmt(vuelto)}` : `Faltan ₡${fmt(Math.abs(vuelto))}`}
            </p>
          )}
        </div>
      )}

      {metodoPago === 'SINPE' && (
        <div>
          <label htmlFor="pos-sinpe-confirm" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Confirmación SINPE (opcional)</label>
          <input id="pos-sinpe-confirm" type="text" value={confirmSinpe} onChange={e => setConfirmSinpe(e.target.value)}
            placeholder="Número de confirmación"
            className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}/>
        </div>
      )}
    </>
  )
}
