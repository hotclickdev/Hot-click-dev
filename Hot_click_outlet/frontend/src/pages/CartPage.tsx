import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useChatStore from '@/store/chatStore'
import useWishlistStore from '@/store/wishlistStore'
import usePedidoExtrasStore from '@/store/pedidoExtrasStore'
import { productService, normalizeProduct } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import AvisoVariosEmprendimientos from '@/components/comprador/AvisoVariosEmprendimientos'
import IconoFigma from '@/components/comprador/IconoFigma'
import { cantidadEmprendimientos } from '@/pages/checkout/checkoutHelpers'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import { totalesConCodigos, useCodigosPedido } from '@/pages/checkout/useCodigosPedido'
import { useEsDesktop } from '@/pages/checkout/useEsDesktop'
import { isValidEmail } from '@/utils/validators'
import type { Producto } from '@/types/producto'
import type { ItemCarrito } from '@/types/carrito'
import type { Id } from '@/types/api'
import CartEmptyState from './carrito/CartEmptyState'
import { CodigosCarrito, NotasPedido } from './carrito/CodigosNotasCarrito'
import { AsistentePedido, GuardarPorCorreo, PieCarritoMovil } from './carrito/ExtrasCarritoMovil'
import PaqueteCarritoTarjeta from './carrito/PaqueteCarritoTarjeta'
import ResumenCarrito from './carrito/ResumenCarrito'
import {
  EMAIL_GUARDADO_OCULTAR_MS,
  FALLBACK_CATALOGO_SIZE,
  emailCarritoYaCapturado,
  guardarEmailCarritoLocal,
  listaProductosDesdeRespuesta,
  paquetesDelCarrito,
  sugerenciaDeLaTienda,
  totalEnvioEstimado,
  urlWhatsApp,
} from './carrito/cartHelpers'

async function cargarSugerencias(): Promise<Producto[]> {
  const aProducto = (lista: unknown) => listaProductosDesdeRespuesta(lista)
    .map((item) => normalizeProduct(item))
    .filter((p): p is Producto => p != null)
  const { data } = await productService.getDestacados()
  const destacados = aProducto(data)
  if (destacados.length > 0) return destacados
  const { data: catalogo } = await productService.getAll(0, FALLBACK_CATALOGO_SIZE)
  return aProducto(catalogo)
}

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const total = useCartStore((s) => s.total)
  const toWhatsAppMessage = useCartStore((s) => s.toWhatsAppMessage)
  const addItem = useCartStore((s) => s.addItem)
  const token = useAuthStore((s) => s.token)
  const toggleFavorito = useWishlistStore((s) => s.toggle)
  const abrirChat = useChatStore((s) => s.open)
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const esDesktop = useEsDesktop()
  const codigos = useCodigosPedido(token)
  const notas = usePedidoExtrasStore((s) => s.notas)
  const setNotas = usePedidoExtrasStore((s) => s.setNotas)
  const reiniciarExtras = usePedidoExtrasStore((s) => s.reiniciar)
  const [sugeridos, setSugeridos] = useState<Producto[]>([])
  const [correo, setCorreo] = useState('')
  const [correoGuardado, setCorreoGuardado] = useState(false)
  // Regla original: quien ya dejó su correo en este navegador no vuelve a ver la invitación.
  const [correoYaCapturado, setCorreoYaCapturado] = useState(() => emailCarritoYaCapturado())

  useEffect(() => {
    cargarSugerencias()
      .then(setSugeridos)
      .catch((error: unknown) => {
        console.error('No se pudieron cargar sugerencias del carrito', error)
      })
  }, [])

  useEffect(() => {
    if (items.length === 0) reiniciarExtras()
  }, [items.length, reiniciarExtras])

  const paquetes = useMemo(() => paquetesDelCarrito(items), [items])
  const idsEnCarrito = useMemo(() => new Set(items.map((item) => item.id)), [items])
  const unidades = items.reduce((suma, item) => suma + item.cantidad, 0)
  const subtotal = total()
  const envio = totalEnvioEstimado(paquetes)
  const { descuento, giftCard, total: totalEstimado } = totalesConCodigos(subtotal, envio, codigos.cuponDescuento, codigos.gcSaldo)

  async function guardarCorreo() {
    if (!isValidEmail(correo)) return
    try {
      await abandonedCartService.saveAbandonedCart(items, correo)
      guardarEmailCarritoLocal(correo)
      setCorreoGuardado(true)
      setTimeout(() => {
        setCorreoGuardado(false)
        setCorreoYaCapturado(true)
      }, EMAIL_GUARDADO_OCULTAR_MS * 3)
    } catch {
      toast({ message: t('common.error'), type: 'error' })
    }
  }

  function agregarSugerencia(producto: Producto) {
    addItem(producto)
    toast({ message: t('product.added', { name: producto.nombre }), type: 'success' })
  }

  function cambiarCantidad(item: ItemCarrito, cantidad: number) {
    if (cantidad < 1) {
      quitarItem(item)
      return
    }
    updateQuantity(item.id as Id, cantidad, item.cartLineId)
  }

  function quitarItem(item: ItemCarrito) {
    removeItem(item.id as Id, item.cartLineId)
    toast({ message: t('cart.removed', { name: item.nombre }), type: 'info' })
  }

  function moverAFavoritos(item: ItemCarrito) {
    const yaGuardado = useWishlistStore.getState().items.some((guardado) => guardado.id === item.id)
    if (!yaGuardado) toggleFavorito(item)
    removeItem(item.id as Id, item.cartLineId)
  }

  function abrirWhatsAppPedido() {
    if (items.length === 0) return
    globalThis.open(urlWhatsApp(toWhatsAppMessage()), '_blank')
  }

  const continuar = () => navigate('/checkout')

  if (items.length === 0) {
    return (
      <MainLayout variante="interna" titulo={t('cart.tituloVacio')} barraInferior encabezadoEscritorio="compacto">
        <CartEmptyState destacados={sugeridos} />
      </MainLayout>
    )
  }

  const emprendimientos = cantidadEmprendimientos(items)
  const tarjetas = paquetes.map((paquete, indice) => (
    <PaqueteCarritoTarjeta
      key={paquete.clave}
      paquete={paquete}
      numero={indice + 1}
      escritorio={esDesktop}
      sugerencia={sugerenciaDeLaTienda(paquete, sugeridos, idsEnCarrito)}
      onAgregarSugerencia={agregarSugerencia}
      onCantidad={cambiarCantidad}
      onQuitar={quitarItem}
      onMoverAFavoritos={moverAFavoritos}
    />
  ))

  if (esDesktop) {
    return (
      <MainLayout variante="interna" titulo={t('cart.titulo', { count: unidades })} encabezadoEscritorio="compacto">
        <div className="mx-auto flex w-[calc(100%-4rem)] max-w-[1200px] flex-col gap-5 pb-16 pt-9">
          <h1 className="font-display text-[30px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('cart.tituloVacio')}</h1>
          <div className="flex items-start gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="flex items-center gap-[10px] leading-[normal]">
                <IconoFigma src={ICONOS_CHECKOUT.paquetesCamion} size={22} className="text-hc-blue-600" />
                <h2 className="font-display text-[18px] font-bold tracking-normal text-hc-n-900">{t('cart.paquetes', { count: paquetes.length })}</h2>
              </div>
              <AvisoVariosEmprendimientos cantidadNegocios={emprendimientos} />
              <p className="text-[13px] leading-[normal] text-hc-n-600">{t('cart.paquetesNotaEscritorio')}</p>
              {tarjetas}
            </div>
            <ResumenCarrito
              paquetes={paquetes}
              unidades={unidades}
              subtotal={subtotal}
              envio={envio}
              total={totalEstimado}
              escritorio
              onContinuar={continuar}
              descuento={descuento}
              cuponPorcentaje={codigos.cuponDescuento}
              giftCard={giftCard}
              codigosEscritorio={<CodigosCarrito codigos={codigos} conSesion={Boolean(token)} incluirGiftCard={Boolean(token)} descuentoMonto={descuento} giftCardAplicada={giftCard} />}
            />
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout variante="interna" titulo={t('cart.titulo', { count: unidades })} encabezadoEscritorio="compacto">
      <div className="flex flex-col gap-[14px] px-4 pb-[18px] pt-[14px]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 leading-[normal]">
            <IconoFigma src={ICONOS_CHECKOUT.paquetesCamion} size={20} className="text-hc-blue-600" />
            <h2 className="min-w-0 flex-1 font-display text-[16px] font-bold tracking-normal text-hc-n-900">{t('cart.paquetes', { count: paquetes.length })}</h2>
          </div>
          <p className="text-[12px] leading-4 text-hc-n-600">{t('cart.paquetesNota')}</p>
          <AvisoVariosEmprendimientos cantidadNegocios={emprendimientos} />
        </div>
        {tarjetas}
        <NotasPedido notas={notas} onCambiar={setNotas} />
        <CodigosCarrito codigos={codigos} conSesion={Boolean(token)} incluirGiftCard descuentoMonto={descuento} giftCardAplicada={giftCard} />
        <ResumenCarrito
          paquetes={paquetes}
          unidades={unidades}
          subtotal={subtotal}
          envio={envio}
          total={totalEstimado}
          escritorio={false}
          onContinuar={continuar}
          descuento={descuento}
          cuponPorcentaje={codigos.cuponDescuento}
          giftCard={giftCard}
        />
        {!token && (!correoYaCapturado || correoGuardado) && <GuardarPorCorreo correo={correo} guardado={correoGuardado} onCambiar={setCorreo} onGuardar={guardarCorreo} />}
        <AsistentePedido onPreguntar={abrirChat} />
      </div>
      <PieCarritoMovil total={totalEstimado} onContinuar={continuar} onWhatsApp={abrirWhatsAppPedido} />
    </MainLayout>
  )
}
