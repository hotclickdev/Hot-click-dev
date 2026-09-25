import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import { resolverRespuestaTilopay } from '@/pages/checkout/tilopayRespuestaHelpers'

/**
 * Retorno del SDK Tilopay (`/pago/tilopay/respuesta?code=&order=&description=`).
 * Confirma con el backend y redirige a éxito o cancelado.
 */
export default function TilopayRespuestaPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { search } = useLocation()
  const clearCart = useCartStore((s) => s.clearCart)
  const ran = useRef(false)
  const [mensaje, setMensaje] = useState(t('checkout.tilopayConfirming'))

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      const { destino, numeroPedido, motivo } = await resolverRespuestaTilopay(search)
      if (destino === 'exito') {
        clearCart()
        const q = numeroPedido ? `?order=${encodeURIComponent(numeroPedido)}` : ''
        navigate(`/pago/exito${q}`, { replace: true })
        return
      }
      const params = new URLSearchParams()
      if (numeroPedido) params.set('order', numeroPedido)
      if (motivo) params.set('motivo', motivo)
      setMensaje(t('checkout.tilopayConfirmFail'))
      navigate(`/pago/cancelado?${params.toString()}`, { replace: true })
    })()
  }, [search, navigate, clearCart, t])

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div
          className="inline-block w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-4"
          style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{mensaje}</p>
      </div>
    </MainLayout>
  )
}
