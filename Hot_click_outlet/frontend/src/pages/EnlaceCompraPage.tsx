import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import { BotonPago, IconoEstado } from '@/pages/pago/PiezasPago'
import recuperarBolsa from '@/assets/figma/pago/recuperar-bolsa.svg'
import { PackagePlaceholder } from '@/pages/carrito/cartIcons'
import {
  abrirEnlace,
  cargarCarritoDeEnlace,
  guardarDatosEnlace,
  limpiarDatosEnlace,
  type EnlaceAbierto,
} from '@/pages/enlace/enlaceCompra'

type Estado = 'cargando' | 'listo' | 'error'

/** Enlace de compra del bot (`/c/:codigo`): carga el carrito reservado y lleva al checkout de invitado. */
export default function EnlaceCompraPage() {
  const { t } = useTranslation()
  const { codigo } = useParams<{ codigo: string }>()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>(codigo ? 'cargando' : 'error')
  const [enlace, setEnlace] = useState<EnlaceAbierto | null>(null)

  useEffect(() => {
    if (!codigo) return
    let vigente = true
    void (async () => {
      try {
        const abierto = await abrirEnlace(codigo)
        if (!vigente) return
        const { clearCart, addItem } = useCartStore.getState()
        const cargadas = abierto
          ? await cargarCarritoDeEnlace(abierto, { vaciar: clearCart, agregar: (p, c) => addItem(p, c) })
          : 0
        if (!vigente) return
        if (!abierto || cargadas === 0) {
          limpiarDatosEnlace()
          setEstado('error')
          return
        }
        guardarDatosEnlace({ codigo, nombre: abierto.nombreCliente ?? '', telefonoMascara: abierto.telefonoMascara ?? '' })
        setEnlace(abierto)
        setEstado('listo')
      } catch {
        // 404 (inválido, vencido o ya usado) y fallos de red se ven igual: no se revela cuál fue.
        if (vigente) setEstado('error')
      }
    })()
    return () => { vigente = false }
  }, [codigo])

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

  if (estado === 'cargando') {
    return (
      <MainLayout variante="marca" marcaCentrada encabezadoEscritorio="compacto" barraInferior={false}>
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label={t('enlaceCompra.loading')}>
          <Spinner size="lg" variante="figma" />
        </div>
      </MainLayout>
    )
  }

  if (estado === 'error' || !enlace) {
    return marco(
      <>
        {cabecera(t('enlaceCompra.notAvailable'), t('enlaceCompra.expired'))}
        <div className="flex flex-col gap-[10px] px-4 pb-6 pt-[14px]">
          <BotonPago to="/productos" variante="primario">{t('enlaceCompra.viewProducts')}</BotonPago>
        </div>
      </>,
    )
  }

  const items = enlace.items
  return marco(
    <>
      {cabecera(t('enlaceCompra.title'), t('enlaceCompra.subtitle'))}

      {(enlace.precioCambio || enlace.stockCambio) && (
        <div role="alert" className="mx-4 mt-2 rounded-[12px] border border-hc-n-200 bg-hc-blue-50 p-3 text-[13px] leading-[18px] text-hc-n-900">
          {enlace.precioCambio && (
            <p>{t('enlaceCompra.precioCambio', { antes: formatPrice(enlace.totalCreado), ahora: formatPrice(enlace.totalActual) })}</p>
          )}
          {enlace.stockCambio && <p>{t('enlaceCompra.stockCambio')}</p>}
        </div>
      )}

      <section className="px-4 pb-2 pt-3">
        <div className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
          {items.map((item) => (
            <div key={item.productoId} className="flex items-center gap-3">
              {item.imagenUrl ? (
                <img src={item.imagenUrl} alt="" width={64} height={64} loading="lazy" className="size-16 shrink-0 rounded-[10px] bg-hc-n-100 object-cover" />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-[10px] bg-hc-n-100"><PackagePlaceholder /></span>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <p className="truncate text-[14px] font-medium text-hc-n-900">{item.nombre}</p>
                <p className="truncate text-[12px] text-hc-n-600">
                  {item.disponible ? `${t('enlaceCompra.quantity')} ${item.cantidad}` : t('enlaceCompra.agotado')}
                </p>
                {item.disponible && item.precioUnitario !== item.precioCreado && (
                  <p className="text-[11px] font-semibold text-hc-n-600">
                    {t('enlaceCompra.antes', { precio: formatPrice(item.precioCreado) })}
                  </p>
                )}
              </div>
              <p className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">
                {item.disponible ? formatPrice(item.precioUnitario * item.cantidad) : '—'}
              </p>
            </div>
          ))}
          <div className="h-px bg-hc-n-200" />
          <div className="flex items-center justify-between text-hc-n-900">
            <p className="text-[15px] font-semibold">{t('enlaceCompra.total')}</p>
            <p className="font-display text-[17px] font-bold">{formatPrice(enlace.totalActual)}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-[10px] px-4 pb-6 pt-[14px]">
        <BotonPago onClick={() => navigate('/checkout')} variante="primario">{t('enlaceCompra.pagar')}</BotonPago>
        <p className="text-center text-[12px] leading-4 text-hc-n-600">{t('enlaceCompra.nota')}</p>
      </div>
    </>,
  )
}
