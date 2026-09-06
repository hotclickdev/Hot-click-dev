import { useEffect, useRef, useState } from 'react'
import {
  cargarSdkOnvo,
  ESTILO_PAD_ONVO,
  ONVO_PUBLISHABLE_ENV,
  type OnvoPayInstance,
} from './onvoSdk'

type Props = {
  subscriptionId: string
  customerId?: string
  publishableKey?: string
  onSuccess: () => void
  onError?: (mensaje: string) => void
}

/**
 * Cobro embebido ONVO para suscripción SaaS (paymentType=subscription).
 */
export default function OnvoSuscripcionEmbed({
  subscriptionId,
  customerId,
  publishableKey,
  onSuccess,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [listo, setListo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const instanciaRef = useRef<OnvoPayInstance | null>(null)

  useEffect(() => {
    let activo = true
    const iniciar = async () => {
      try {
        const publicKey = publishableKey || ONVO_PUBLISHABLE_ENV
        if (!publicKey) {
          onError?.('Falta la clave pública de ONVO')
          return
        }
        await cargarSdkOnvo()
        if (!activo || !containerRef.current || !window.onvo) {
          onError?.('No se pudo cargar ONVO')
          return
        }
        instanciaRef.current = window.onvo.pay({
          publicKey,
          subscriptionId,
          customerId,
          paymentType: 'subscription',
          locale: 'es',
          manualSubmit: true,
          onSuccess: () => onSuccess(),
          onError: (data) => {
            const msg = data.message || 'El pago no se pudo completar'
            setError(msg)
            onError?.(msg)
          },
        })
        instanciaRef.current.render('#onvo-billing-sub-container')
        setListo(true)
      } catch {
        onError?.('Error al iniciar el cobro')
      } finally {
        if (activo) setCargando(false)
      }
    }
    void iniciar()
    return () => { activo = false }
  }, [subscriptionId, customerId, publishableKey, onSuccess, onError])

  if (cargando) {
    return <p className="text-sm text-center py-4" style={{ color: 'var(--hc-muted)' }}>Cargando pasarela…</p>
  }

  if (!listo) return null

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div
        id="onvo-billing-sub-container"
        ref={containerRef}
        className="min-h-[120px] rounded-2xl border p-3"
        style={ESTILO_PAD_ONVO}
      />
      {error ? (
        <p className="text-sm text-center text-red-500">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => instanciaRef.current?.submitPayment()}
        className="w-full min-h-11 rounded-xl font-semibold text-sm"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
      >
        Confirmar pago
      </button>
    </div>
  )
}
