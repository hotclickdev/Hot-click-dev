import { Fragment, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import { useToast } from '@/components/ui/Toast'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { agruparPaquetes, enviosVigentes, totalesCompra } from '@/pages/checkout/paquetesCompra'
import { useCupon } from '@/pages/checkout/useCupon'
import { formatPrice } from '@/utils/format'
import type { ItemCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'
import AbandonedEmailPrompt from './carrito/AbandonedEmailPrompt'
import CampoCupon from './carrito/CampoCupon'
import CarritoVacio from './carrito/CarritoVacio'
import EncabezadoPaquetes from './carrito/EncabezadoPaquetes'
import PaqueteCarrito from './carrito/PaqueteCarrito'
import ResumenCarrito from './carrito/ResumenCarrito'
import ResumenLateral from './carrito/ResumenLateral'
import SumaMismaTienda from './carrito/SumaMismaTienda'
import { useCorreoCarritoAbandonado } from './carrito/useCorreoCarritoAbandonado'
import { useSugerenciaMismaTienda } from './carrito/useSugerenciaMismaTienda'

function useAccionesCarrito() {
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const addItem = useCartStore((s) => s.addItem)
  const favoritos = useWishlistStore()
  const toast = useToast()
  const { t } = useTranslation()

  return {
    cambiarCantidad: (item: ItemCarrito, cantidad: number) => updateQuantity(item.id as Id, cantidad, item.cartLineId),
    eliminar: (item: ItemCarrito) => {
      removeItem(item.id as Id, item.cartLineId)
      toast({ message: t('cart.removed', { name: item.nombre }), type: 'info' })
    },
    moverAFavoritos: (item: ItemCarrito) => {
      if (!favoritos.isLiked(item.id as Id)) favoritos.toggle(item)
      removeItem(item.id as Id, item.cartLineId)
      toast({ message: t('compra.carrito.movidoFavoritos', { nombre: item.nombre }), type: 'success' })
    },
    agregar: (producto: Producto) => {
      addItem(producto)
      toast({ message: t('comprador.tarjeta.agregado', { nombre: producto.nombre }), type: 'success' })
    },
  }
}

/** Carrito por paquetes: móvil Figma `28:989`, desktop `30:2268`. */
export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const acciones = useAccionesCarrito()
  const cupon = useCupon()
  const correoAbandono = useCorreoCarritoAbandonado(items, token)
  const paquetes = useMemo(() => agruparPaquetes(items), [items])
  const envios = useMemo(() => enviosVigentes(paquetes, {}), [paquetes])
  const sugerencia = useSugerenciaMismaTienda(paquetes)
  const totales = totalesCompra(paquetes, envios, cupon.cupon)
  const continuar = () => navigate('/checkout')

  if (items.length === 0) {
    return <MainLayout><CarritoVacio /></MainLayout>
  }

  function franjaSugerencia(clave: string, variante: 'movil' | 'desktop') {
    if (sugerencia?.clave !== clave) return null
    const tienda = paquetes.find((p) => p.clave === clave)?.nombre ?? ''
    const visibilidad = variante === 'movil' ? 'flex lg:hidden' : 'hidden lg:flex'
    return <SumaMismaTienda producto={sugerencia.producto} tienda={tienda} onAgregar={acciones.agregar} variante={variante} className={visibilidad} />
  }

  return (
    <MainLayout barraMovilPropia>
      <div className="min-h-screen bg-hc-n-50 pb-[96px] lg:min-h-0 lg:pb-0">
        <div className="border-b border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px] lg:hidden">
          <div className="flex items-center gap-[12px]">
            <button type="button" onClick={() => navigate(-1)} aria-label={t('compra.volver')} className="flex text-hc-n-900">
              <IconoFigma src={ICONOS_COMPRA.volver} size={22} />
            </button>
            <h1 className="min-w-0 flex-1 font-display text-[17px] font-bold text-hc-n-900">
              {t('compra.carrito.tituloMovil', { cantidad: totales.cantidadProductos })}
            </h1>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[14px] px-[16px] pb-[18px] pt-[14px] lg:gap-[20px] lg:px-[120px] lg:pb-[64px] lg:pt-[36px]">
          <h1 className="hidden font-display text-[30px] font-bold text-hc-n-900 lg:block">{t('compra.carrito.titulo')}</h1>
          <div className="flex flex-col gap-[14px] lg:flex-row lg:items-start lg:gap-[32px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[14px] lg:gap-[16px]">
              <EncabezadoPaquetes cantidadPaquetes={paquetes.length} />
              {paquetes.map((paquete) => (
                <Fragment key={paquete.clave}>
                  <PaqueteCarrito
                    paquete={paquete}
                    metodoEnvio={envios[paquete.clave]}
                    onCambiarCantidad={acciones.cambiarCantidad}
                    onEliminar={acciones.eliminar}
                    onMoverAFavoritos={acciones.moverAFavoritos}
                    sugerenciaDesktop={franjaSugerencia(paquete.clave, 'desktop')}
                  />
                  {franjaSugerencia(paquete.clave, 'movil')}
                </Fragment>
              ))}
              <div className="flex flex-col gap-[14px] lg:hidden">
                <CampoCupon cupon={cupon} />
                <ResumenCarrito paquetes={paquetes} envios={envios} totales={totales} codigoCupon={cupon.cupon?.codigo ?? null} />
              </div>
            </div>
            <div className="hidden lg:block">
              <ResumenLateral
                paquetes={paquetes}
                envios={envios}
                totales={totales}
                cupon={cupon}
                textoBoton={t('compra.carrito.continuar')}
                onBoton={continuar}
              />
            </div>
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hc-n-200 bg-hc-n-0 px-[16px] pb-[24px] pt-[12px] lg:hidden">
          <button
            type="button"
            onClick={continuar}
            className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0"
          >
            {t('compra.carrito.continuarTotal', { total: formatPrice(totales.total) })}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {correoAbandono.visible && (
          <AbandonedEmailPrompt
            email={correoAbandono.correo}
            emailSaved={correoAbandono.guardado}
            onChangeEmail={correoAbandono.setCorreo}
            onSave={correoAbandono.guardar}
            onDismiss={correoAbandono.cerrar}
          />
        )}
      </AnimatePresence>
    </MainLayout>
  )
}
