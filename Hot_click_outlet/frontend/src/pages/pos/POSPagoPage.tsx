import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { posService } from '@/services/posService'
import TrustGlyph from '@/components/ui/TrustGlyph'

const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

type QrPagoItem = {
  nombre?: string
  nombreProducto?: string
  cantidad?: number
  precioUnitario?: number
}

type QrPagoInfo = {
  estado?: string
  total?: number
  empresaNombre?: string
  logoUrl?: string
  metodoPago?: string
  sinpeNumero?: string
  sinpeRef?: string
  items?: QrPagoItem[]
}

export default function POSPagoPage() {
  const { token }      = useParams()
  const [params]       = useSearchParams()
  const resultado      = params.get('resultado')

  const [info, setInfo]         = useState<QrPagoInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [paying, setPaying]     = useState(false)
  const [estado, setEstado]     = useState<string | null>(null)
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    posService.infoQrSesion(token as string)
      .then((data: unknown) => { const infoData = data as QrPagoInfo; setInfo(infoData); setEstado(infoData.estado ?? null) })
      .catch(() => setError('QR no encontrado o expirado'))
      .finally(() => setLoading(false))
  }, [token])

  // Poll when resultado=exito (returned from Stripe)
  useEffect(() => {
    if (resultado !== 'exito') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token as string) as { estado?: string }
        if (res?.estado === 'PAGADO') {
          clearInterval(pollRef.current as ReturnType<typeof setInterval>)
          setEstado('PAGADO')
        }
      } catch { /* transient poll failure — retries on next tick */ }
    }, 2000)
    return () => clearInterval(pollRef.current as ReturnType<typeof setInterval>)
  }, [resultado, token])

  const handleStripe = async () => {
    setPaying(true)
    try {
      const res = await posService.iniciarStripeQr(token as string) as { checkoutUrl?: string }
      if (res?.checkoutUrl) globalThis.location.href = res.checkoutUrl
    } catch {
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="hc-sistema-theme min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 animate-pulse"
          style={{ background: 'var(--hc-accent)' }} />
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="text-center max-w-xs">
        <div className="mb-4 flex justify-center" style={{ color: '#fbbf24' }}>
          <TrustGlyph tipo="alerta" className="w-12 h-12" />
        </div>
        <p className="font-bold text-[var(--hc-text)] mb-2">QR inválido o expirado</p>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Este código de pago ya no es válido. Solicita uno nuevo al cajero.
        </p>
      </div>
    </div>
  )

  if (estado === 'PAGADO') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="text-center max-w-xs">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
          <TrustGlyph tipo="check" className="w-10 h-10" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#34d399' }}>Pago completado</p>
        <p className="text-3xl font-black tabular-nums mb-1" style={{ color: 'var(--hc-text)' }}>₡{fmt(info?.total)}</p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
          {info?.empresaNombre} · Gracias por tu compra
        </p>
        <div className="rounded-2xl p-4 text-left space-y-1.5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          {(info?.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'var(--hc-text)' }}>
                {item.nombre ?? item.nombreProducto} ×{item.cantidad}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--hc-text)' }}>
                ₡{fmt((item.precioUnitario ?? 0) * (item.cantidad ?? 1))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const isSinpe = info?.metodoPago === 'SINPE'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="w-full max-w-sm">

        {/* Header empresa */}
        <div className="text-center mb-6">
          {info?.logoUrl && (
            <img src={info.logoUrl} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover" />
          )}
          <p className="font-bold text-[var(--hc-text)]">{info?.empresaNombre}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
            {isSinpe ? 'Pago por SINPE Móvil' : 'Pago con tarjeta'}
          </p>
        </div>

        {/* Total */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--hc-muted)' }}>Total a pagar</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: 'var(--hc-text)', letterSpacing: '-2px' }}>
            ₡{fmt(info?.total)}
          </p>
        </div>

        {/* Productos */}
        <div className="rounded-2xl p-4 mb-5 space-y-2"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          {(info?.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'var(--hc-text)' }}>
                {item.nombre ?? item.nombreProducto} ×{item.cantidad}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--hc-text)' }}>
                ₡{fmt((item.precioUnitario ?? 0) * (item.cantidad ?? 1))}
              </span>
            </div>
          ))}
        </div>

        {/* SINPE instructions */}
        {isSinpe && (
          <div className="rounded-2xl p-5 space-y-3 mb-5"
            style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#6490EA' }}>
              Instrucciones SINPE Móvil
            </p>
            <ol className="text-sm space-y-2" style={{ color: 'var(--hc-text)' }}>
              <li>1. Abrí SINPE Móvil en tu banco</li>
              <li>2. Ingresá este número: <strong className="font-mono">{info.sinpeNumero}</strong></li>
              <li>3. Monto exacto: <strong style={{ color: 'var(--hc-success)' }}>₡{fmt(info.total)}</strong></li>
              <li>4. En descripción escribí: <strong className="font-mono">{info.sinpeRef}</strong></li>
            </ol>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--hc-muted)' }}>
              El cajero confirmará tu pago al recibirlo
            </p>
          </div>
        )}

        {/* Stripe button */}
        {!isSinpe && (
          <button type="button"
            onClick={handleStripe}
            disabled={paying}
            className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-50"
            style={{ background: 'var(--hc-accent)', color: '#fff',
              boxShadow: '0 8px 24px rgba(23,71,168,0.35)' }}>
            {paying ? 'Redirigiendo…' : 'Pagar con tarjeta'}
          </button>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'var(--hc-muted)' }}>
          HotClick · Pago seguro
        </p>
      </div>
    </div>
  )
}
