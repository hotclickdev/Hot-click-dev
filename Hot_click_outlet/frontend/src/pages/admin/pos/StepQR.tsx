import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import QRCode from 'react-qr-code'
import { posService } from '@/services/posService'
import { formatMontoPos, type PosQrData } from './posHelpers'
import { MetodoPagoIcon } from './posIcons'

export default function StepQR({ qrData, onConfirmSinpe, onCancelar, loadingConfirm }: {
  qrData: PosQrData
  onConfirmSinpe: (token: string | null, autoConfirmed: boolean) => void
  onCancelar: () => void
  loadingConfirm: boolean
}) {
  const { t } = useTranslation()
  const { token, metodoPago, total, sinpeNumero } = qrData
  const qrUrl = `${globalThis.location.origin}/pos/pago/${token}`
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (metodoPago !== 'TARJETA') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token) as { estado?: string }
        if (res?.estado === 'PAGADO') { clearInterval(pollRef.current as ReturnType<typeof setInterval>); setPaid(true) }
        else if (res?.estado === 'EXPIRADO' || res?.estado === 'CANCELADO') clearInterval(pollRef.current as ReturnType<typeof setInterval>)
      } catch { /* transient poll failure — retries on next tick */ }
    }, 3000)
    return () => clearInterval(pollRef.current as ReturnType<typeof setInterval>)
  }, [token, metodoPago])

  useEffect(() => { if (paid) onConfirmSinpe(null, true) }, [paid]) // eslint-disable-line react-hooks/exhaustive-deps

  const filasSinpe: { id: string; label: string; value: string; highlight: boolean }[] = [
    {
      id: 'sinpe',
      label: t('pos.qr.sinpeA'),
      value: sinpeNumero || t('pos.qr.configWhatsapp'),
      highlight: false,
    },
    {
      id: 'ref',
      label: t('pos.qr.referencia'),
      value: (token ?? '').substring(0, 8).toUpperCase(),
      highlight: false,
    },
    {
      id: 'monto',
      label: t('pos.qr.montoExacto'),
      value: `₡${formatMontoPos(total)}`,
      highlight: true,
    },
  ]

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5"
            style={{ color: metodoPago === 'SINPE' ? '#6490EA' : '#7aa3ff' }}>
            <MetodoPagoIcon iconId={metodoPago === 'SINPE' ? 'sinpe' : 'tarjeta'} className="w-4 h-4" />
            {metodoPago === 'SINPE' ? t('pos.qr.pagoSinpe') : t('pos.qr.pagoTarjeta')}
          </p>
          <p className="text-4xl font-black tabular-nums" style={{ color: 'var(--hc-text)', letterSpacing: '-1px' }}>
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
            {filasSinpe.map((fila) => (
              <div key={fila.id} className="flex justify-between text-sm">
                <span style={{ color: 'var(--hc-muted)' }}>{fila.label}</span>
                <span className="font-bold font-mono" style={{ color: fila.highlight ? '#34d399' : '#6490EA' }}>{fila.value}</span>
              </div>
            ))}
          </div>
        )}

        {metodoPago === 'TARJETA' && !paid && (
          <p className="text-center text-xs animate-pulse" style={{ color: '#7aa3ff' }}>
            {t('pos.qr.esperandoConfirmacion')}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancelar}
            className="py-3 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {t('pos.qr.cancelar')}
          </button>
          {metodoPago === 'SINPE' ? (
            <button type="button" onClick={() => onConfirmSinpe(token, false)} disabled={loadingConfirm}
              className="py-3 rounded-2xl text-sm font-black disabled:opacity-40"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}>
              {loadingConfirm ? t('pos.qr.confirmando') : t('pos.qr.sinpeRecibido')}
            </button>
          ) : (
            <div className="py-3 rounded-2xl text-xs text-center"
              style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
              {t('pos.qr.autoDetecta')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
