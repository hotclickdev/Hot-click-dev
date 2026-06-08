import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { posService } from '@/services/posService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

export default function POSPagoPage() {
  const { token }      = useParams()
  const [params]       = useSearchParams()
  const resultado      = params.get('resultado')

  const [info, setInfo]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [paying, setPaying]     = useState(false)
  const [estado, setEstado]     = useState(null)
  const pollRef                 = useRef(null)

  useEffect(() => {
    posService.infoQrSesion(token)
      .then(data => { setInfo(data); setEstado(data.estado) })
      .catch(() => setError('QR no encontrado o expirado'))
      .finally(() => setLoading(false))
  }, [token])

  // Poll when resultado=exito (returned from Stripe)
  useEffect(() => {
    if (resultado !== 'exito') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token)
        if (res?.estado === 'PAGADO') {
          clearInterval(pollRef.current)
          setEstado('PAGADO')
        }
      } catch {}
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [resultado, token])

  const handleStripe = async () => {
    setPaying(true)
    try {
      const res = await posService.iniciarStripeQr(token)
      if (res?.checkoutUrl) window.location.href = res.checkoutUrl
    } catch {
      setPaying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#08080c' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 animate-pulse"
          style={{ background: 'linear-gradient(135deg,#4f7cff,#7c3aed)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#08080c' }}>
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-bold text-white mb-2">QR inválido o expirado</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Este código de pago ya no es válido. Solicita uno nuevo al cajero.
        </p>
      </div>
    </div>
  )

  if (estado === 'PAGADO') return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#08080c' }}>
      <div className="text-center max-w-xs">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center text-4xl"
          style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
          ✓
        </div>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#34d399' }}>Pago completado</p>
        <p className="text-3xl font-black tabular-nums mb-1" style={{ color: '#fff' }}>₡{fmt(info?.total)}</p>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {info?.empresaNombre} · Gracias por tu compra
        </p>
        <div className="rounded-2xl p-4 text-left space-y-1.5"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(info?.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {item.nombre ?? item.nombreProducto} ×{item.cantidad}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>
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
      style={{ backgroundColor: '#08080c', fontFamily: "'Inter', sans-serif" }}>
      <div className="w-full max-w-sm">

        {/* Header empresa */}
        <div className="text-center mb-6">
          {info?.logoUrl && (
            <img src={info.logoUrl} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover" />
          )}
          <p className="font-bold text-white">{info?.empresaNombre}</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isSinpe ? 'Pago por SINPE Móvil' : 'Pago con tarjeta'}
          </p>
        </div>

        {/* Total */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Total a pagar</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: '#fff', letterSpacing: '-2px' }}>
            ₡{fmt(info?.total)}
          </p>
        </div>

        {/* Productos */}
        <div className="rounded-2xl p-4 mb-5 space-y-2"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(info?.items ?? []).map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                {item.nombre ?? item.nombreProducto} ×{item.cantidad}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: '#e8e8ed' }}>
                ₡{fmt((item.precioUnitario ?? 0) * (item.cantidad ?? 1))}
              </span>
            </div>
          ))}
        </div>

        {/* SINPE instructions */}
        {isSinpe && (
          <div className="rounded-2xl p-5 space-y-3 mb-5"
            style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#60a5fa' }}>
              Instrucciones SINPE Móvil
            </p>
            <ol className="text-sm space-y-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <li>1. Abrí SINPE Móvil en tu banco</li>
              <li>2. Ingresá este número: <strong className="text-white font-mono">{info.sinpeNumero}</strong></li>
              <li>3. Monto exacto: <strong style={{ color: '#34d399' }}>₡{fmt(info.total)}</strong></li>
              <li>4. En descripción escribí: <strong className="text-white font-mono">{info.sinpeRef}</strong></li>
            </ol>
            <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
              El cajero confirmará tu pago al recibirlo
            </p>
          </div>
        )}

        {/* Stripe button */}
        {!isSinpe && (
          <button
            onClick={handleStripe}
            disabled={paying}
            className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#4f7cff,#7c3aed)', color: '#fff',
              boxShadow: '0 8px 24px rgba(79,124,255,0.35)' }}>
            {paying ? '⏳ Redirigiendo…' : '💳 Pagar con tarjeta'}
          </button>
        )}

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
          HOTCLICK · Pago seguro
        </p>
      </div>
    </div>
  )
}
