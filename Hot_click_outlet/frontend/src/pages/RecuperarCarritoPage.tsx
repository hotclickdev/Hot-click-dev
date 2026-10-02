import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import { abandonedCartService } from '@/services/abandonedCartService'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import { BotonPago, IconoEstado } from '@/pages/pago/PiezasPago'
import recuperarBolsa from '@/assets/figma/pago/recuperar-bolsa.svg'
import { PackagePlaceholder } from '@/pages/carrito/cartIcons'
import type { ItemCarritoAbandonado } from '@/types/carrito'
import type { Producto } from '@/types/producto'

type ItemRecuperado = ItemCarritoAbandonado & { empresaNombre?: string; stock?: number }

/** Enlace del correo "Te guardamos tu pedido": Figma `29:2036` (móvil). Sin frame de escritorio: misma columna centrada. */
export default function RecuperarCarritoPage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast   = useToast()

  const [items,   setItems]   = useState<ItemRecuperado[]>([])
  // Sin token no hay nada que pedir: se arranca en error, sin setState dentro del efecto.
  const [loading, setLoading] = useState(Boolean(token))
  const [error,   setError]   = useState(!token)
  const [adding,  setAdding]  = useState(false)

  useEffect(() => {
    if (!token) return
    abandonedCartService.getAbandonedCart(token)
      .then(({ data }) => {
        // `api` ya desenvuelve el ResponseDTO: llega { id, status, items }. Se acepta también el sobre sin desenvolver.
        const body = data as { items?: ItemRecuperado[]; data?: { items?: ItemRecuperado[] } }
        setItems(body?.items ?? body?.data?.items ?? [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  const total = items.reduce(
    (sum, i) => sum + (i.precio ?? 0) * (i.cantidad ?? 1), 0
  )

  const handleRestore = async () => {
    if (!token) return
    setAdding(true)
    items.forEach((item) =>
      addItem({
        id:        item.productoId,
        nombre:    item.nombre,
        precio:    item.precio,
        imagenUrl: item.imagenUrl,
        stock:     99,
        cantidad:  item.cantidad,
      } as unknown as Producto)
    )
    try {
      await abandonedCartService.deleteAbandonedCartByToken(token)
    } catch (err) {
      console.error('[RecuperarCarrito] no se pudo descartar el carrito abandonado', err)
    }
    toast({ message: t('recuperarCarrito.addedToast', { count: items.length }), type: 'success' })
    navigate('/carrito')
  }

  const marco = (hijos: React.ReactNode) => (
    <MainLayout variante="marca" marcaCentrada encabezadoEscritorio="compacto" barraInferior={false}>
      <div className="mx-auto flex w-full max-w-[480px] flex-col lg:py-10">{hijos}</div>
    </MainLayout>
  )

  const cabecera = (titulo: string, texto: string) => (
    <div className="flex flex-col items-center gap-2 px-4 pb-3 pt-7 text-center leading-[normal]">
      <IconoEstado src={recuperarBolsa} tamano={30} circulo={64} clase="bg-hc-blue-50 text-hc-blue-600" />
      <h1 className="font-display text-[20px] font-bold leading-[25px] tracking-normal text-hc-n-900">{titulo}</h1>
      <p className="text-[14px] leading-5 text-hc-n-600">{texto}</p>
    </div>
  )

  if (loading) {
    return (
      <MainLayout variante="marca" marcaCentrada encabezadoEscritorio="compacto" barraInferior={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (error || items.length === 0) {
    return marco(
      <>
        {cabecera(t('recuperarCarrito.notAvailable'), t('recuperarCarrito.expired'))}
        <div className="flex flex-col gap-[10px] px-4 pb-6 pt-[14px]">
          <BotonPago to="/productos" variante="primario">{t('recuperarCarrito.viewProducts')}</BotonPago>
        </div>
      </>,
    )
  }

  return marco(
    <>
      {cabecera(t('recuperarCarrito.title'), t('recuperarCarrito.subtitle'))}

      <section className="px-4 pb-2 pt-3">
        <div className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
          {items.map((item, i) => {
            const cantidad = item.cantidad ?? 1
            const detalle = [item.empresaNombre, `${t('recuperarCarrito.quantity')} ${cantidad}`].filter(Boolean).join(' · ')
            return (
              <div key={`${item.productoId ?? item.nombre}-${i}`} className="flex items-center gap-3">
                {item.imagenUrl ? (
                  <img src={item.imagenUrl} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-[10px] bg-hc-n-100 object-cover" />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-hc-n-100"><PackagePlaceholder /></span>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <p className="truncate text-[14px] font-medium text-hc-n-900">{item.nombre}</p>
                  <p className="truncate text-[12px] text-hc-n-500">{detalle}</p>
                  {item.stock != null && item.stock > 0 && <p className="text-[11px] font-semibold text-hc-success">{t('recuperarCarrito.disponible', { count: item.stock })}</p>}
                </div>
                <p className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">{formatPrice((item.precio ?? 0) * cantidad)}</p>
              </div>
            )
          })}
          <div className="h-px bg-hc-n-200" />
          <div className="flex items-center justify-between text-hc-n-900">
            <p className="text-[15px] font-semibold">{t('recuperarCarrito.total')}</p>
            <p className="font-display text-[17px] font-bold">{formatPrice(total)}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-[10px] px-4 pb-6 pt-[14px]">
        <BotonPago onClick={() => void handleRestore()} disabled={adding} variante="primario">
          {adding ? t('recuperarCarrito.adding') : t('recuperarCarrito.restore')}
        </BotonPago>
        <p className="text-center text-[12px] leading-4 text-hc-n-500">{t('recuperarCarrito.nota')}</p>
        <Link to="/productos" className="text-center text-[13px] font-semibold leading-[normal] text-hc-blue-600">{t('recuperarCarrito.exploreNew')}</Link>
      </div>
    </>,
  )
}
