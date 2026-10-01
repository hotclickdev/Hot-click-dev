import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { formatPrice } from '@/utils/format'
import { useTranslation } from 'react-i18next'
import HojaInferior from '@/components/comprador/HojaInferior'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import { BOTON_HOJA_PRIMARIO, BOTON_HOJA_SECUNDARIO, TITULO_HOJA } from '@/components/ui/sistema/estilosHoja'
import type { ItemCarrito, ItemWishlist } from '@/types/carrito'

const SESSION_KEY = 'hc-exit-intent-shown'
const DELAY_BEFORE_ARMED_MS = 5000
const BLOCKED_PATHS = [
  '/checkout',
  '/pago/exito',
  '/pago/cancelado',
  '/carrito',
  '/visitante/checkout',
  '/visitante/compra-confirmada',
  '/visitante/pago-fallido',
]
const CART_EXIT_DELAY_MS = 5 * 60 * 1000

export default function ExitIntentModal() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const armed = useRef(false)
  const prevPathnameRef = useRef<string | null>(null)
  const cartExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { pathname } = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const cartTotal = useCartStore((s) => s.total)
  const wishItems = useWishlistStore((s) => s.items)

  // Disparador: 5 min después de salir de /carrito
  useEffect(() => {
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname

    const leftCart = prev === '/carrito'
    const safeRoute = !BLOCKED_PATHS.some(p => pathname.startsWith(p))

    // Si el usuario vuelve al carrito o llega a checkout, cancelar el timer
    if (pathname === '/carrito' || pathname.startsWith('/checkout') || pathname.startsWith('/pago')) {
      clearTimeout(cartExitTimerRef.current ?? undefined)
      return
    }

    if (!leftCart || !safeRoute) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (!cartItems.length) return

    cartExitTimerRef.current = setTimeout(() => {
      if (!sessionStorage.getItem(SESSION_KEY) && cartItems.length > 0) {
        sessionStorage.setItem(SESSION_KEY, '1')
        setOpen(true)
      }
    }, CART_EXIT_DELAY_MS)

    return () => clearTimeout(cartExitTimerRef.current ?? undefined)
  }, [pathname])

  // Disparadores existentes: cursor sale del viewport (desktop) + inactividad (mobile)
  useEffect(() => {
    if (BLOCKED_PATHS.some(p => pathname.startsWith(p))) return
    if (sessionStorage.getItem(SESSION_KEY)) return
    if (!cartItems.length && !wishItems.length) return

    const armTimer = setTimeout(() => { armed.current = true }, DELAY_BEFORE_ARMED_MS)

    const trigger = () => {
      if (!armed.current || sessionStorage.getItem(SESSION_KEY)) return
      sessionStorage.setItem(SESSION_KEY, '1')
      setOpen(true)
    }

    // Desktop: cursor exits from top of viewport
    const onMouseLeave = (e: MouseEvent) => { if (e.clientY <= 10) trigger() }

    // Mobile: 3 min idle
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const resetIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(trigger, 3 * 60 * 1000)
    }
    const touchEvents = ['touchstart', 'touchend']
    touchEvents.forEach((ev) => document.addEventListener(ev, resetIdle, { passive: true }))
    resetIdle()

    document.addEventListener('mouseleave', onMouseLeave)
    return () => {
      clearTimeout(armTimer)
      clearTimeout(idleTimer)
      document.removeEventListener('mouseleave', onMouseLeave)
      touchEvents.forEach((ev) => document.removeEventListener(ev, resetIdle))
    }
  }, [cartItems.length, wishItems.length])

  const hasCart = cartItems.length > 0
  const preview: Array<ItemCarrito | ItemWishlist> = hasCart ? cartItems : wishItems
  const primero = preview[0]
  const resto = preview.length - 1
  const cantidadPrimero = hasCart ? (primero as ItemCarrito).cantidad : null
  const tienda = hasCart ? (primero as ItemCarrito).empresaNombre : null
  const detalle = [tienda, cantidadPrimero ? t('exitIntent.unit', { count: cantidadPrimero }) : null].filter(Boolean).join(' · ')
  const cerrar = () => setOpen(false)

  return (
    <HojaInferior
      abierta={open && Boolean(primero)}
      onCerrar={cerrar}
      titulo={(
        <div className="flex items-center gap-2">
          <img src={ICONOS_ESTADOS.salidaPedido} alt="" width={24} height={24} className="block size-6 shrink-0" />
          <h2 className={TITULO_HOJA}>{hasCart ? t('exitIntent.title') : t('exitIntent.wishTitle')}</h2>
        </div>
      )}
    >
      {primero && (
        <>
          <p className="text-[12px] leading-4 text-hc-n-600">
            {hasCart ? t('exitIntent.cartHas') : t('exitIntent.wishHas')} {preview.length} {t('exitIntent.item', { count: preview.length })}
          </p>
          <div className="flex items-center gap-3 rounded-[14px] bg-hc-n-50 p-[10px]">
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-hc-n-100">
              {primero.imagenUrl && <img src={primero.imagenUrl} alt="" className="size-full object-cover" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="truncate text-[14px] font-medium leading-4 text-hc-n-900">{primero.nombre}</p>
              {detalle && <p className="truncate text-[12px] leading-[14px] text-hc-n-500">{detalle}</p>}
            </div>
            <p className="shrink-0 font-display text-[15px] font-bold leading-[19px] tracking-normal text-hc-n-900">{formatPrice(primero.precio)}</p>
          </div>
          {resto > 0 && <p className="text-[11px] leading-[15px] text-hc-n-500">{t('exitIntent.more', { count: resto })}</p>}
          {hasCart && (
            <div className="flex items-start justify-between leading-[normal]">
              <span className="text-[13px] text-hc-n-600">{t('exitIntent.total')}</span>
              <span className="font-display text-[14px] font-semibold leading-[18px] tracking-normal text-hc-n-900">{formatPrice(cartTotal())}</span>
            </div>
          )}
          <div className="flex gap-[10px]">
            <button type="button" onClick={cerrar} className={BOTON_HOJA_SECUNDARIO}>{t('exitIntent.continue')}</button>
            <Link to={hasCart ? '/carrito' : '/wishlist'} onClick={cerrar} className={BOTON_HOJA_PRIMARIO}>
              {hasCart ? t('exitIntent.checkout') : t('exitIntent.viewWishlist')}
            </Link>
          </div>
        </>
      )}
    </HojaInferior>
  )
}
