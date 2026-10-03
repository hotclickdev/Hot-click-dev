import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'

const FIRST_VISIT_KEY = 'hc-first-visit-ts'
const DISMISSED_KEY   = 'hc-return-banner-dismissed'

type VisitInfo = {
  isReturn: boolean
  daysSince: number
}

function getVisitInfo(): VisitInfo {
  const now = Date.now()
  const first = localStorage.getItem(FIRST_VISIT_KEY)
  if (!first) {
    localStorage.setItem(FIRST_VISIT_KEY, String(now))
    return { isReturn: false, daysSince: 0 }
  }
  const daysSince = Math.floor((now - Number(first)) / (1000 * 60 * 60 * 24))
  return { isReturn: true, daysSince }
}

/**
 * Aviso de visitante recurrente (derivado de Figma: tarjeta "Recuperar carrito" `29:2036`, en versión de aviso
 * azul claro del sistema). Misma lógica de antes: solo con pedido o favoritos, se cierra por sesión.
 */
export default function ReturnVisitorBanner() {
  const [visible, setVisible] = useState(false)
  const [info, setInfo]       = useState<VisitInfo | null>(null)
  const location  = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const wishCount = useWishlistStore((s) => s.items.length)

  // Mi cuenta y sus subpantallas no lo dibujan en Figma (`28:1196`, `30:1479`).
  const hiddenPaths = ['/carrito', '/checkout', '/pago', '/perfil', '/mis-pedidos', '/wishlist']

  const oculto = hiddenPaths.some(p => location.pathname.startsWith(p))

  useEffect(() => {
    if (oculto) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return
    const visitInfo = getVisitInfo()
    if (!visitInfo.isReturn) return
    if (!cartItems.length && !wishCount) return
    setInfo(visitInfo)
    setVisible(true)
  }, [location.pathname])

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!info || oculto) return null

  const days = info.daysSince
  let greeting = `¡Volviste después de ${days} días!`
  if (days === 0) greeting = '¡Bienvenido de vuelta!'
  else if (days === 1) greeting = '¡Volviste! Te extrañamos.'

  if (!visible) return null
  const conPedido = cartItems.length > 0
  const cantidad = conPedido ? cartItems.length : wishCount
  const detalle = conPedido
    ? `Tenés ${cantidad} producto${cantidad > 1 ? 's' : ''} en el pedido.`
    : `Tenés ${cantidad} producto${cantidad > 1 ? 's' : ''} en tus favoritos.`

  return (
    <div className="mx-auto w-full max-w-[1232px] px-4 pt-3 lg:pt-4">
      <div role="status" className="flex items-center gap-[10px] rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 px-[14px] py-3 leading-[normal]">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-hc-n-0 text-hc-blue-600">
          <IconoFigma src={conPedido ? ICONOS_COMPRADOR.navPedido : ICONOS_COMPRADOR.avisoCorazon} size={18} />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-hc-n-600">
          <span className="font-semibold text-hc-n-900">{greeting}</span>{' '}{detalle}
        </p>
        <Link to={conPedido ? '/carrito' : '/wishlist'} onClick={dismiss} className="shrink-0 text-[13px] font-semibold text-hc-blue-600">
          {conPedido ? 'Ver pedido' : 'Ver favoritos'}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="relative flex size-4 shrink-0 items-center justify-center text-hc-n-600 after:absolute after:-inset-3"
        >
          <IconoFigma src={ICONOS_COMPRADOR.instalarCerrar} size={16} />
        </button>
      </div>
    </div>
  )
}
