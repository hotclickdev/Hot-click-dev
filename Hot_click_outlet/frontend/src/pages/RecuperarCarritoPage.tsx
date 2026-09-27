import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { useToast } from '@/components/ui/Toast'
import { abandonedCartService } from '@/services/abandonedCartService'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import EncabezadoCompraSegura from '@/pages/checkout/EncabezadoCompraSegura'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import ProductoRecuperado from '@/pages/carrito/ProductoRecuperado'
import {
  estaDisponible,
  subtotalRecuperado,
  unidadesPorAgregar,
  useCarritoRecuperado,
} from '@/pages/carrito/useCarritoRecuperado'

/** Enlace del correo «Te guardamos tu pedido» (Figma `29:2036`). */
export default function RecuperarCarritoPage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const { showToast } = useToast()
  const { lineas, estado } = useCarritoRecuperado(token)
  const [retomando, setRetomando] = useState(false)

  async function continuarCompra() {
    if (!token) return
    setRetomando(true)
    const disponibles = lineas.filter(estaDisponible)
    const enCarrito = useCartStore.getState().items
    disponibles.forEach((l) => {
      const actual = enCarrito.find((i) => String(i.id) === String(l.producto.id) && !i.personalizacion)
      const faltan = unidadesPorAgregar(l, actual?.cantidad ?? 0)
      if (faltan > 0) addItem(l.producto, faltan)
    })
    try {
      await abandonedCartService.deleteAbandonedCartByToken(token)
    } catch (err) {
      console.error('[RecuperarCarrito] no se pudo descartar el carrito abandonado', err)
    }
    showToast(t('compra.recuperar.agregados', { count: disponibles.length }), 'success')
    navigate('/carrito')
  }

  if (estado === 'cargando') return <EstadoRecuperar cargando />
  if (estado === 'error') return <EstadoRecuperar />

  const todosDisponibles = lineas.every(estaDisponible)
  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura />
      <main className="mx-auto flex w-full max-w-[480px] flex-col">
        <div className="flex flex-col items-center gap-[8px] px-[16px] pb-[12px] pt-[28px] text-center">
          <span className="flex size-[64px] items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600">
            <IconoFigma src={ICONOS_COMPRA.bolsa} size={30} />
          </span>
          <h1 className="font-display text-[20px] font-bold text-hc-n-900">{t('compra.recuperar.titulo')}</h1>
          <p className="text-[14px] leading-[20px] text-hc-n-600">
            {todosDisponibles ? t('compra.recuperar.texto') : t('compra.recuperar.textoParcial')}
          </p>
        </div>
        <div className="px-[16px] pb-[8px] pt-[12px]">
          <section className="flex flex-col gap-[12px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-[16px]">
            <ul className="flex flex-col gap-[12px]">
              {lineas.map((linea) => <ProductoRecuperado key={linea.clave} linea={linea} />)}
            </ul>
            <span className="h-px w-full bg-hc-n-200" />
            <p className="flex items-center justify-between text-hc-n-900">
              <span className="text-[15px] font-semibold">{t('compra.recuperar.subtotal')}</span>
              <span className="font-display text-[17px] font-bold">{formatPrice(subtotalRecuperado(lineas))}</span>
            </p>
          </section>
        </div>
        <div className="flex flex-col gap-[10px] px-[16px] pb-[24px] pt-[14px]">
          <button
            type="button"
            onClick={() => void continuarCompra()}
            disabled={retomando}
            className="rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:opacity-50"
          >
            {t('compra.recuperar.continuar')}
          </button>
          <p className="text-center text-[12px] leading-[16px] text-hc-n-500">{t('compra.recuperar.origen')}</p>
        </div>
      </main>
    </div>
  )
}

function EstadoRecuperar({ cargando = false }: { cargando?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura />
      <main className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-[8px] px-[16px] pt-[28px] text-center">
        <span className="flex size-[64px] items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600" role={cargando ? 'status' : undefined}>
          {cargando
            ? <span className="size-[28px] animate-spin rounded-full border-[3px] border-hc-blue-100 border-t-hc-blue-600" />
            : <IconoFigma src={ICONOS_COMPRA.bolsa} size={30} />}
        </span>
        {cargando ? null : (
          <>
            <h1 className="font-display text-[20px] font-bold text-hc-n-900">{t('recuperarCarrito.notAvailable')}</h1>
            <p className="text-[14px] leading-[20px] text-hc-n-600">{t('recuperarCarrito.expired')}</p>
            <Link to="/productos" className="mt-[14px] w-full rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0">
              {t('recuperarCarrito.viewProducts')}
            </Link>
          </>
        )}
      </main>
    </div>
  )
}
