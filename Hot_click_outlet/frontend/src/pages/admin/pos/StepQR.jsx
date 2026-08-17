import { useState, useEffect, useRef } from 'react'
import QRCode from 'react-qr-code'
import { posService } from '@/services/posService'
import { formatMontoPos } from './posHelpers'
import { MetodoPagoIcon } from './posIcons'

export default function StepQR({ qrData, onConfirmSinpe, onCancelar, loadingConfirm }) {
  const { token, metodoPago, total, sinpeNumero } = qrData
  const qrUrl = `${globalThis.location.origin}/pos/pago/${token}`
  const pollRef = useRef(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (metodoPago !== 'TARJETA') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token)
        if (res?.estado === 'PAGADO') { clearInterval(pollRef.current); setPaid(true) }
        else if (res?.estado === 'EXPIRADO' || res?.estado === 'CANCELADO') clearInterval(pollRef.current)
      } catch { /* transient poll failure — retries on next tick */ }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [token, metodoPago])

  useEffect(() => { if (paid) onConfirmSinpe(null, true) }, [paid]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"
            style={{ color: metodoPago === 'SINPE' ? '#6490EA' : '#7aa3ff' }}>
            <MetodoPagoIcon iconId={metodoPago === 'SINPE' ? 'sinpe' : 'tarjeta'} className="w-4 h-4" />
            {metodoPago === 'SINPE' ? 'Pago SINPE Móvil' : 'Pago con tarjeta'}
          </p>
          <p className="text-4xl font-black tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
            ₡{formatMontoPos(total)}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-white shadow-2xl">
            <QRCode value={qrUrl} size={200} />
          </div>
        </div>

        {metodoPago === 'SINPE' && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'rgba(100,144,234,0.08)', border: '1px solid rgba(100,144,234,0.2)' }}>
            {[
              ['SINPE Móvil a:', sinpeNumero],
              ['Referencia:', (token ?? '').substring(0, 8).toUpperCase()],
              ['Monto exacto:', `₡${formatMontoPos(total)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span>
                <span className="font-bold font-mono" style={{ color: k.includes('Monto') ? '#34d399' : '#6490EA' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {metodoPago === 'TARJETA' && !paid && (
          <p className="text-center text-xs animate-pulse" style={{ color: '#7aa3ff' }}>
            ⏳ Esperando confirmación de pago…
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancelar}
            className="py-3 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            Cancelar
          </button>
          {metodoPago === 'SINPE' ? (
            <button onClick={() => onConfirmSinpe(token, false)} disabled={loadingConfirm}
              className="py-3 rounded-2xl text-sm font-black disabled:opacity-40"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}>
              {loadingConfirm ? '⏳…' : '✓ SINPE recibido'}
            </button>
          ) : (
            <div className="py-3 rounded-2xl text-xs text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
              Auto-detecta el pago
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
